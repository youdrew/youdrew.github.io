/**
 * 首页「空闲海潮」—— 桌面端首页静置约 8s 后，海洋 shader 涌过整页（提示「这里有
 * 内容/导航」），用户一动就让海水以水波涟漪的方式散开、露出页面。
 *
 * 编排（相位机）：idle → reveal → hold → drain → idle
 *   - reveal：静置 IDLE_MS 后涌入。每次随机一种来潮方式(pickEntrance)：随机方向
 *     横扫 / 四面包抄 / 中心绽放，波形渐入、越来越明显。
 *   - hold：涨满后静止（海浪仍在动），等用户回来。
 *   - drain：任意操作触发。以光标为中心荡开一圈圈水波涟漪，水随之散开，约
 *     DRAIN_TIME 退尽整页，然后停渲染。
 *   - prefers-reduced-motion 时整段关闭；全屏 raymarch 较贵，故降分辨率 + 限帧 +
 *     退尽即停。
 *
 * 着色器取自「Artifact at Sea」(原色·夜海)；相位由这些 uniform 驱动：
 *   uReveal / uMode / uDir / uOpaqueMax / uDrain / uMouse（见 glsl 末尾）。
 *
 * HDR：HDR 屏 + WebGPU 可用时改走 artifact-at-sea.wgsl（rgba16float 画布 +
 * toneMapping "extended"，Chrome 129+ / Safari 26.2+）——小鲸鱼直冲显示器
 * 峰值亮度，海面萤光抬到次一档（uHdrFish/uHdrSea）；其余环境走 WebGL2 +
 * GLSL 的 SDR 路径，构图与色彩完全一致，寓意不变。
 *
 * 调试：实例挂在 window.__idleOcean，debugSet({reveal,drain,mouse,...}) 可定格。
 */
import shaderBody from './artifact-at-sea.glsl?raw';
import wgslSource from './artifact-at-sea.wgsl?raw';

const DESKTOP = '(min-width: 1099px)';
const REDUCE = '(prefers-reduced-motion: reduce)';
const IDLE_MS = 8000;
const FPS = 30;
const REVEAL_IN = 3.4; // 涌入（秒）
const DRAIN_TIME = 1.3; // 光标让海水涟漪散开（秒）
const RES_SCALE = 0.55; // 渲染分辨率系数（性能）
const MAX_SIDE = 1100; // 缓冲区最长边上限
const OPAQUE_DEFAULT = 1.0; // 1.0=不透明屏保；~0.6=半透明薄纱
// HDR 亮度倍数（相对 SDR 白）。鲸鱼直冲峰值（超出显示器能力会截在其峰值上），
// 海面萤光抬到次一档；只在 WebGPU extended 画布上生效，SDR 恒为 1。
const HDR_FISH = 3.0;
const HDR_SEA = 1.7;

function isHome() {
  // Exactly / and /zh-CN/ (body classes path-index-html / path-zh-CN-index-html).
  // A bare /index-html$/ also matched every pretty-URL directory index
  // (archives, /daily/, …), leaking the screensaver onto reading pages.
  return /(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className || '');
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function easeInOut(x) {
  return x * x * (3.0 - 2.0 * x);
}

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform vec3 iResolution;
uniform float iTime;
uniform float uReveal;
uniform float uOpaqueMax;
uniform float uMode;
uniform vec2 uDir;
uniform float uDrain;
uniform vec2 uMouse;
uniform float uHdrFish;
uniform float uHdrSea;
out vec4 _stColor;
${shaderBody}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;

export class IdleOcean {
  constructor() {
    if (!isHome()) return;

    this.mq = window.matchMedia(DESKTOP);
    this.reduce = window.matchMedia(REDUCE);
    this.dyn = window.matchMedia('(dynamic-range: high)');

    this.canvas = null;
    this.gl = null;
    this.gpu = null; // WebGPU 状态 {device, ctx, pipeline, ubuf, bind, u}
    this.backend = 'webgl'; // 'webgl' | 'webgpu'
    this.ready = false;
    this.initPromise = null;
    this.hdrFish = 1.0; // 传给 shader 的亮度倍数（SDR 恒 1）
    this.hdrSea = 1.0;
    this.prog = null;
    this.raf = null;
    this.running = false;
    this.startTime = 0;
    this.lastTick = 0;
    this.idleTimer = null;

    this.phase = 'idle'; // idle | reveal | hold | drain
    this.reveal = 0; // 涌入进度 0..1
    this.drain = 0; // 散开进度 0..1
    this.opaqueMax = OPAQUE_DEFAULT;
    this.mode = 0; // 来潮方式：0=随机方向 1=四面包抄 2=中心绽放
    this.dir = [1, 0]; // 单位向量（mode 0 的来潮方向）
    this.mouse = [0.5, 0.5]; // 光标 uv（原点左下，与 gl_FragCoord 一致）
    this.paused = false; // 调试定格时为 true

    this.onActivity = this.onActivity.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.tick = this.tick.bind(this);
    this.apply = this.apply.bind(this);
    this.onDynChange = this.onDynChange.bind(this);

    this.mq.addEventListener('change', this.apply);
    this.reduce.addEventListener('change', this.apply);
    this.dyn.addEventListener('change', this.onDynChange);
    this.apply();

    window.__idleOcean = this;
  }

  apply() {
    const want = this.mq.matches && !this.reduce.matches;
    if (want && !this.canvas) this.enable();
    else if (!want && this.canvas) this.disable();
  }

  // 显示器 HDR 能力变化（如窗口被拖到另一块屏）：整套后端重建。
  onDynChange() {
    if (this.canvas) {
      this.disable();
      this.apply();
    }
  }

  enable() {
    const cv = document.createElement('canvas');
    cv.className = 'idle-ocean';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.visibility = 'hidden';
    document.body.appendChild(cv);
    this.canvas = cv;
    this.ready = false;

    // 画布一旦 getContext 就锁定类型，所以先异步挑后端（HDR→WebGPU，否则
    // WebGL2）；就绪前不挂事件、不启相位机，避免半初始化状态被触发。
    this.initPromise = this.initBackend().then((ok) => {
      if (!ok) {
        this.disable();
        return false;
      }
      if (!this.canvas) {
        // disable() 在初始化途中被调用过（如视口变窄）——清干净就走。
        this.destroyGpu();
        return false;
      }
      this.ready = true;
      this.resize();

      window.addEventListener('mousemove', this.onActivity, { passive: true });
      window.addEventListener('wheel', this.onActivity, { passive: true });
      window.addEventListener('keydown', this.onActivity);
      window.addEventListener('pointerdown', this.onActivity, { passive: true });
      window.addEventListener('touchstart', this.onActivity, { passive: true });
      window.addEventListener('resize', this.onResize);
      document.addEventListener('visibilitychange', this.onVisibility);

      this.scheduleIdle();
      return true;
    });
  }

  disable() {
    this.stop();
    clearTimeout(this.idleTimer);
    window.removeEventListener('mousemove', this.onActivity);
    window.removeEventListener('wheel', this.onActivity);
    window.removeEventListener('keydown', this.onActivity);
    window.removeEventListener('pointerdown', this.onActivity);
    window.removeEventListener('touchstart', this.onActivity);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.canvas) this.canvas.remove();
    this.canvas = null;
    this.gl = null;
    this.destroyGpu();
    this.ready = false;
  }

  // 后端选择：HDR 屏 + WebGPU 才走 HDR；其余（含 WebGPU 初始化失败、浏览器
  // 忽略 extended toneMapping）一律回退 WebGL2 SDR，画面一致只是没有峰值。
  async initBackend() {
    const wantHdr = this.dyn.matches && !!navigator.gpu;
    if (wantHdr) {
      try {
        if (await this.buildGpu()) {
          this.backend = 'webgpu';
          this.hdrFish = HDR_FISH;
          this.hdrSea = HDR_SEA;
          return true;
        }
      } catch (e) {
        console.warn('[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:', e);
      }
      this.destroyGpu();
      this.freshCanvas(); // getContext('webgpu') 已锁定旧画布，换一块再回退
    }
    if (!this.canvas) return false;
    this.backend = 'webgl';
    this.hdrFish = 1.0;
    this.hdrSea = 1.0;
    return this.buildGl();
  }

  /** 画布被某种 context 锁定后换不了类型；克隆一块顶上。 */
  freshCanvas() {
    if (!this.canvas) return;
    const cv = this.canvas.cloneNode(false);
    this.canvas.replaceWith(cv);
    this.canvas = cv;
  }

  destroyGpu() {
    if (!this.gpu) return;
    const g = this.gpu;
    this.gpu = null; // 先置空，免得 device.lost 处理器把主动销毁当意外丢失
    try {
      g.device.destroy();
    } catch {
      /* already lost */
    }
  }

  // ---- WebGPU（HDR）后端 ---------------------------------------------------
  async buildGpu() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    const device = await adapter.requestDevice();
    const ctx = this.canvas && this.canvas.getContext('webgpu');
    if (!ctx) {
      device.destroy();
      return false;
    }
    ctx.configure({
      device,
      format: 'rgba16float', // float16 才装得下 >1 的扩展 sRGB 值
      colorSpace: 'srgb',
      toneMapping: { mode: 'extended' }, // 关键：解锁显示器的 HDR 余量
      alphaMode: 'premultiplied',
    });
    // 老浏览器会静默忽略不认识的 toneMapping——那 HDR 就无从谈起，退回 WebGL。
    const cfg = typeof ctx.getConfiguration === 'function' ? ctx.getConfiguration() : null;
    if (!cfg || !cfg.toneMapping || cfg.toneMapping.mode !== 'extended') {
      device.destroy();
      return false;
    }
    const module = device.createShaderModule({ code: wgslSource });
    const info = await module.getCompilationInfo();
    if (info.messages.some((m) => m.type === 'error')) {
      for (const m of info.messages) {
        console.warn('[idle-ocean] wgsl ' + m.lineNum + ':' + m.linePos + ' ' + m.message);
      }
      device.destroy();
      return false;
    }
    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vmain' },
      fragment: { module, entryPoint: 'fmain', targets: [{ format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' },
    });
    const ubuf = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ubuf } }],
    });
    this.gpu = { device, ctx, pipeline, ubuf, bind, u: new Float32Array(16) };
    device.lost.then((lost) => {
      // 设备意外丢失（驱动重置等）：换 WebGL/SDR 接着放，别留一块死画布。
      if (this.gpu && this.canvas) {
        console.warn(
          '[idle-ocean] WebGPU device lost (' + lost.reason + '), falling back to WebGL'
        );
        this.gpu = null;
        this.backend = 'webgl';
        this.hdrFish = 1.0;
        this.hdrSea = 1.0;
        this.freshCanvas();
        if (this.buildGl()) this.resize();
        else this.disable();
      }
    });
    return true;
  }

  // ---- WebGL2（SDR）后端 ---------------------------------------------------
  buildGl() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return false;
    this.gl = gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[idle-ocean] shader compile failed:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[idle-ocean] program link failed:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(prog, 'iResolution');
    this.uTime = gl.getUniformLocation(prog, 'iTime');
    this.uReveal = gl.getUniformLocation(prog, 'uReveal');
    this.uOpaque = gl.getUniformLocation(prog, 'uOpaqueMax');
    this.uMode = gl.getUniformLocation(prog, 'uMode');
    this.uDir = gl.getUniformLocation(prog, 'uDir');
    this.uDrain = gl.getUniformLocation(prog, 'uDrain');
    this.uMouse = gl.getUniformLocation(prog, 'uMouse');
    this.uHdrFish = gl.getUniformLocation(prog, 'uHdrFish');
    this.uHdrSea = gl.getUniformLocation(prog, 'uHdrSea');
    return true;
  }

  resize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = Math.round(window.innerWidth * dpr * RES_SCALE);
    let h = Math.round(window.innerHeight * dpr * RES_SCALE);
    const longest = Math.max(w, h);
    if (longest > MAX_SIDE) {
      const k = MAX_SIDE / longest;
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    w = Math.max(1, w);
    h = Math.max(1, h);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (this.gl) this.gl.viewport(0, 0, w, h);
      // WebGPU 在 getCurrentTexture 时自动跟随画布尺寸，无需处理
    }
  }

  scheduleIdle() {
    clearTimeout(this.idleTimer);
    if (document.hidden || this.paused) return;
    this.idleTimer = setTimeout(() => {
      // Only kick off an entrance if nothing is currently on screen.
      if (this.phase === 'idle') {
        this.pickEntrance();
        this.reveal = 0;
        this.drain = 0;
        this.phase = 'reveal';
        this.start();
      }
    }, IDLE_MS);
  }

  // Re-roll how the tide enters: a random sweep direction, closing in from all
  // sides, or blooming from the centre — so each idle surges in differently.
  pickEntrance() {
    const r = Math.random();
    this.mode = r < 0.34 ? 0 : r < 0.67 ? 1 : 2;
    const a = Math.random() * Math.PI * 2;
    this.dir = [Math.cos(a), Math.sin(a)];
  }

  onActivity(e) {
    if (this.paused) return;
    if (e && typeof e.clientX === 'number') {
      this.mouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
    }
    // Ocean is up (washing in or held) → disperse it from the cursor.
    if (this.phase === 'reveal' || this.phase === 'hold') {
      this.phase = 'drain';
      this.start();
    }
    // While draining, keep the cursor fresh so the ripples spread from it.
    this.scheduleIdle();
  }

  onResize() {
    if (this.running) this.resize();
  }

  onVisibility() {
    if (document.hidden) {
      this.phase = 'idle';
      this.reveal = 0;
      this.drain = 0;
      if (this.canvas) this.canvas.style.visibility = 'hidden';
      this.stop();
      clearTimeout(this.idleTimer);
    } else {
      this.scheduleIdle();
    }
  }

  start() {
    if (this.running || this.paused) return;
    this.running = true;
    if (!this.startTime) this.startTime = performance.now();
    if (this.canvas) this.canvas.style.visibility = 'visible';
    this.lastTick = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  tick(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    if (now - this.lastTick < 1000 / FPS) return;
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    if (this.phase === 'reveal') {
      this.reveal = Math.min(1, this.reveal + dt / REVEAL_IN);
      if (this.reveal >= 1) this.phase = 'hold';
    } else if (this.phase === 'drain') {
      this.drain = Math.min(1, this.drain + dt / DRAIN_TIME);
      if (this.drain >= 1) {
        // Fully dispersed — reset and park the loop.
        this.phase = 'idle';
        this.reveal = 0;
        this.drain = 0;
        this.renderFrame(now);
        if (this.canvas) this.canvas.style.visibility = 'hidden';
        this.stop();
        return;
      }
    }
    // 'hold' just keeps rendering (the waves drift) until activity arrives.

    this.renderFrame(now);
  }

  renderFrame(now) {
    if (!this.ready || !this.canvas) return;
    const t = ((now || performance.now()) - this.startTime) / 1000;
    if (this.backend === 'webgpu' && this.gpu) {
      this.renderGpu(t);
      return;
    }
    const gl = this.gl;
    if (!gl) return;
    gl.uniform3f(this.uRes, this.canvas.width, this.canvas.height, 1.0);
    gl.uniform1f(this.uTime, t);
    gl.uniform1f(this.uReveal, easeInOut(clamp01(this.reveal)));
    gl.uniform1f(this.uOpaque, this.opaqueMax);
    gl.uniform1f(this.uMode, this.mode);
    gl.uniform2f(this.uDir, this.dir[0], this.dir[1]);
    gl.uniform1f(this.uDrain, easeInOut(clamp01(this.drain)));
    gl.uniform2f(this.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.uHdrFish, this.hdrFish);
    gl.uniform1f(this.uHdrSea, this.hdrSea);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  renderGpu(t) {
    const { device, ctx, pipeline, ubuf, bind, u } = this.gpu;
    u[0] = this.canvas.width;
    u[1] = this.canvas.height;
    u[2] = 1.0;
    u[3] = t;
    u[4] = easeInOut(clamp01(this.reveal));
    u[5] = this.opaqueMax;
    u[6] = this.mode;
    u[7] = easeInOut(clamp01(this.drain));
    u[8] = this.dir[0];
    u[9] = this.dir[1];
    u[10] = this.mouse[0];
    u[11] = this.mouse[1];
    u[12] = this.hdrFish;
    u[13] = this.hdrSea;
    device.queue.writeBuffer(ubuf, 0, u);
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bind);
    pass.draw(3);
    pass.end();
    device.queue.submit([enc.finish()]);
  }

  /** Debug: freeze any stage and draw one frame. Pass {reveal,drain,mouse,opaqueMax,mode,dir}. */
  debugSet(opts = {}) {
    this.paused = true;
    clearTimeout(this.idleTimer);
    this.stop();
    if (!this.canvas) this.enable();
    if (typeof opts.opaqueMax === 'number') this.opaqueMax = opts.opaqueMax;
    if (typeof opts.mode === 'number') this.mode = opts.mode;
    if (Array.isArray(opts.dir)) this.dir = opts.dir;
    if (Array.isArray(opts.mouse)) this.mouse = opts.mouse;
    if (typeof opts.reveal === 'number') this.reveal = clamp01(opts.reveal);
    if (typeof opts.drain === 'number') this.drain = clamp01(opts.drain);
    if (typeof opts.hdrFish === 'number') this.hdrFish = opts.hdrFish;
    if (typeof opts.hdrSea === 'number') this.hdrSea = opts.hdrSea;
    if (!this.startTime) this.startTime = performance.now();
    const draw = () => {
      this.resize();
      this.canvas.style.visibility = 'visible';
      this.renderFrame(performance.now());
    };
    if (this.ready) draw();
    else if (this.initPromise) {
      this.initPromise.then((ok) => {
        if (ok && this.paused) draw();
      });
    }
    return {
      reveal: this.reveal,
      drain: this.drain,
      opaqueMax: this.opaqueMax,
      mode: this.mode,
      backend: this.backend,
      hdrFish: this.hdrFish,
      hdrSea: this.hdrSea,
    };
  }

  /** Debug: leave frozen mode and go back to the live idle loop. */
  reset() {
    this.paused = false;
    this.phase = 'idle';
    this.reveal = 0;
    this.drain = 0;
    this.opaqueMax = OPAQUE_DEFAULT;
    if (this.canvas) this.canvas.style.visibility = 'hidden';
    this.stop();
    this.scheduleIdle();
  }
}
