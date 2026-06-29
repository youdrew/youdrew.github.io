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
 * 调试：实例挂在 window.__idleOcean，debugSet({reveal,drain,mouse,...}) 可定格。
 */
import shaderBody from './artifact-at-sea.glsl?raw';

const DESKTOP = '(min-width: 1099px)';
const REDUCE = '(prefers-reduced-motion: reduce)';
const IDLE_MS = 8000;
const FPS = 30;
const REVEAL_IN = 3.4; // 涌入（秒）
const DRAIN_TIME = 1.3; // 光标让海水涟漪散开（秒）
const RES_SCALE = 0.55; // 渲染分辨率系数（性能）
const MAX_SIDE = 1100; // 缓冲区最长边上限
const OPAQUE_DEFAULT = 1.0; // 1.0=不透明屏保；~0.6=半透明薄纱

function isHome() {
  return /index-html$/.test(document.body.className || '');
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

    this.canvas = null;
    this.gl = null;
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

    this.mq.addEventListener('change', this.apply);
    this.reduce.addEventListener('change', this.apply);
    this.apply();

    window.__idleOcean = this;
  }

  apply() {
    const want = this.mq.matches && !this.reduce.matches;
    if (want && !this.canvas) this.enable();
    else if (!want && this.canvas) this.disable();
  }

  enable() {
    const cv = document.createElement('canvas');
    cv.className = 'idle-ocean';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.visibility = 'hidden';
    document.body.appendChild(cv);

    const gl = cv.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      cv.remove();
      return;
    }
    this.canvas = cv;
    this.gl = gl;

    if (!this.build()) {
      this.disable();
      return;
    }
    this.resize();

    window.addEventListener('mousemove', this.onActivity, { passive: true });
    window.addEventListener('wheel', this.onActivity, { passive: true });
    window.addEventListener('keydown', this.onActivity);
    window.addEventListener('pointerdown', this.onActivity, { passive: true });
    window.addEventListener('touchstart', this.onActivity, { passive: true });
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.scheduleIdle();
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
  }

  build() {
    const gl = this.gl;
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
      this.gl.viewport(0, 0, w, h);
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
    const gl = this.gl;
    if (!gl) return;
    gl.uniform3f(this.uRes, this.canvas.width, this.canvas.height, 1.0);
    gl.uniform1f(this.uTime, ((now || performance.now()) - this.startTime) / 1000);
    gl.uniform1f(this.uReveal, easeInOut(clamp01(this.reveal)));
    gl.uniform1f(this.uOpaque, this.opaqueMax);
    gl.uniform1f(this.uMode, this.mode);
    gl.uniform2f(this.uDir, this.dir[0], this.dir[1]);
    gl.uniform1f(this.uDrain, easeInOut(clamp01(this.drain)));
    gl.uniform2f(this.uMouse, this.mouse[0], this.mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
    if (!this.startTime) this.startTime = performance.now();
    this.resize();
    this.canvas.style.visibility = 'visible';
    this.renderFrame(performance.now());
    return { reveal: this.reveal, drain: this.drain, opaqueMax: this.opaqueMax, mode: this.mode };
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
