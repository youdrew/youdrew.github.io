class Ue{constructor(){this.header=document.querySelector("header"),this.menuIcon=document.getElementById("menu_icon"),this.navTriggerZone=50,this.showNavTimeout=null,this.lastMouseEvent=null,this.mouseMoveScheduled=!1,this.mediaQuery=null,this.currentMode=null,this.navLinks=null,this.onMouseMove=this.onMouseMove.bind(this),this.onHeaderEnter=this.onHeaderEnter.bind(this),this.onHeaderLeave=this.onHeaderLeave.bind(this),this.onMenuIconClick=this.onMenuIconClick.bind(this),this.onNavLinkClick=this.onNavLinkClick.bind(this),this.onKeydown=this.onKeydown.bind(this),this.onBreakpointChange=this.onBreakpointChange.bind(this),this.init()}init(){this.header&&(this.mediaQuery=window.matchMedia("(min-width: 1099px)"),this.mediaQuery.addEventListener("change",this.onBreakpointChange),this.applyMode(this.mediaQuery.matches?"desktop":"mobile"))}onBreakpointChange(e){this.applyMode(e.matches?"desktop":"mobile")}applyMode(e){e!==this.currentMode&&(this.teardown(),this.currentMode=e,e==="desktop"?this.bindDesktop():this.bindMobile())}teardown(){document.removeEventListener("mousemove",this.onMouseMove),this.header.removeEventListener("mouseenter",this.onHeaderEnter),this.header.removeEventListener("mouseleave",this.onHeaderLeave),document.removeEventListener("keydown",this.onKeydown),this.menuIcon&&this.menuIcon.removeEventListener("click",this.onMenuIconClick),this.navLinks&&this.navLinks.forEach(e=>e.removeEventListener("click",this.onNavLinkClick)),clearTimeout(this.showNavTimeout),this.showNavTimeout=null,this.header.classList.remove("show_menu","menu-open"),document.body.style.overflow=""}bindDesktop(){document.addEventListener("mousemove",this.onMouseMove),this.header.addEventListener("mouseenter",this.onHeaderEnter),this.header.addEventListener("mouseleave",this.onHeaderLeave)}bindMobile(){this.menuIcon&&(this.menuIcon.addEventListener("click",this.onMenuIconClick),this.navLinks=this.header.querySelectorAll("nav ul li a"),this.navLinks.forEach(e=>e.addEventListener("click",this.onNavLinkClick)),document.addEventListener("keydown",this.onKeydown))}openMenu(){this.header.classList.add("menu-open"),this.menuIcon.setAttribute("aria-expanded","true"),this.menuIcon.setAttribute("aria-label","Close menu"),document.body.style.overflow="hidden"}closeMenu(){this.header.classList.remove("menu-open"),this.menuIcon&&(this.menuIcon.setAttribute("aria-expanded","false"),this.menuIcon.setAttribute("aria-label","Open menu")),document.body.style.overflow=""}onMenuIconClick(e){e.preventDefault(),this.header.classList.contains("menu-open")?this.closeMenu():this.openMenu()}onNavLinkClick(){this.closeMenu()}onKeydown(e){e.key==="Escape"&&this.header.classList.contains("menu-open")&&this.closeMenu()}onMouseMove(e){this.lastMouseEvent=e,!this.mouseMoveScheduled&&(this.mouseMoveScheduled=!0,requestAnimationFrame(()=>{this.mouseMoveScheduled=!1,this.processMouseMove(this.lastMouseEvent)}))}processMouseMove(e){if(e){if(e.pageX<=this.navTriggerZone){clearTimeout(this.showNavTimeout),this.header.classList.add("show_menu");return}clearTimeout(this.showNavTimeout),this.showNavTimeout=setTimeout(()=>{const t=this.header.getBoundingClientRect();e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom||this.header.classList.remove("show_menu")},300)}}onHeaderEnter(){clearTimeout(this.showNavTimeout)}onHeaderLeave(){this.showNavTimeout=setTimeout(()=>{this.header.classList.remove("show_menu")},300)}}const je=`#define time iTime

const float CAM_FAR = 20.0;
const vec3 BACKGROUND = vec3(0.1, 0.1, 0.13);
const int WATER_MARCH_ITERATIONS = 12;
const int WATER_NORMAL_ITERATIONS = 39;
const float PI = 3.14159265359;

const int NUM_PARTICLES = 20;
vec4 ppos[NUM_PARTICLES];

// calculated per fragment
vec3 artifactOffset;
mat3 artifactRotation;
float flicker;
vec3 camFwd;
vec3 camUp;

float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}
float hash(float n) { return fract(sin(n) * 1e4); }
float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}
mat4 viewMatrix (vec3 dir, vec3 up) { 
    vec3 f = normalize(dir);
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat4(
        vec4( s,   0.0),
        vec4( u,   0.0),
        vec4(-f,   0.0),
        vec4( 0.0, 0.0, 0.0, 1)
    );
}
mat3 rotationAlign(vec3 d, vec3 z) {
    vec3  v = cross(z, d);
    float c = dot(z, d);
    float k = 1.0/(1.0+c);
    return mat3(v.x*v.x*k + c,     v.y*v.x*k - v.z,    v.z*v.x*k + v.y,
                v.x*v.y*k + v.z,   v.y*v.y*k + c,      v.z*v.y*k - v.x,
                v.x*v.z*k - v.y,   v.y*v.z*k + v.x,    v.z*v.z*k + c    );
}
float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal) { 
    return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0); 
}
vec3 calcRay(vec2 uv, float fov, float aspect) {
    uv = uv * 2.0 - 1.0;
    float d = 1.0 / tan(radians(fov) * 0.5);
    return normalize(vec3(aspect * uv.x, uv.y, d));
}
vec2 getWave(vec2 position, vec2 dir, float speed, float frequency, float timeshift) {
    float x = dot(dir, position) * frequency + timeshift * speed;
    float wave = exp(sin(x) - 1.0);
    float dist = wave * cos(x);
    return vec2(wave, -dist);
}
float heightmap(vec2 worldPos, int iterations) {
    const float scale = 0.13;
    vec2 p = worldPos * scale;
    vec2 p2 = (artifactOffset.xz - vec2(0.0, 1.0)) * scale;
    float d = clamp(length(p2 - p) / 0.8, 0.0, 1.0);
    d = (1.0 - smoothstep(0.0, 1.0, d)) * 0.8;
    float angle     = 0.0;
    float freq      = 5.0;
    float speed     = 2.0;
    float weight    = 1.9;
    float wave      = 0.0;
    float waveScale = 0.0;
    vec2 dir;
    vec2 res;
    for (int i = 0; i < iterations; i++) {
        dir = vec2(cos(angle), sin(angle));
        res = getWave(p, dir, speed, freq, time);
        p += dir * res.y * weight * 0.05;
        wave += res.x * weight - d;
        angle += 12.0;
        waveScale += weight;
        weight = mix(weight, 0.0, 0.2);
        freq *= 1.18;
        speed *= 1.06;
    }
    return wave / waveScale;
}
vec3 waterNormal(vec2 p, float eps) {
    vec2 h = vec2(eps, 0.0);
    #define i WATER_NORMAL_ITERATIONS
    return normalize(vec3(heightmap(p - h.xy, i) - heightmap(p + h.xy, i),
                          2.0 * eps,
                          heightmap(p - h.yx, i) - heightmap(p + h.yx, i)));
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
float sdEllip(vec3 p, vec3 r) {
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/max(k1, 1e-4);
}
// Tiny whale, seen top-down by the camera: body along x (head +x, tail -x),
// flat tail flukes spread in the xz plane. Returns a signed distance scaled by s.
float whale(vec3 p, float s) {
  p /= s;
  float body = sdEllip(p, vec3(1.0, 0.42, 0.40));
  float head = sdEllip(p - vec3(0.62, 0.0, 0.0), vec3(0.5, 0.40, 0.38));
  float d = smin(body, head, 0.30);
  float fl = sdEllip(p - vec3(-1.05, 0.0, 0.0), vec3(0.34, 0.06, 0.52));
  d = smin(d, fl, 0.10);
  return d * s;
}
void artifact(vec3 p, inout float curDist, inout vec3 glowColor, inout int id) {
    p -= artifactOffset;
    p = artifactRotation * p;
    float dist = whale(p, 0.15);
    const float glowDist = 1.0;
    if (dist < glowDist) {
        float d = dist + rand(dist) * 1.7;
        glowColor += vec3(0.75, 0.55, 0.45) * clamp(1.0 - pow((d / glowDist), 5.0), 0.0, 1.0) * 0.035 * flicker; // glow
    }
    if (dist < curDist) {
        curDist = dist;
        id = 1;
    }
}
void particles(vec3 p, inout float curDist, inout vec3 glowColor, inout int id) {
    float t;
    float angle;
    float radius;
    float dist = CAM_FAR;
    const float glowDist = 0.2;
    for (int i = 0; i < NUM_PARTICLES; i++) {
        dist = length(p - ppos[i].xyz) - 0.005;
        if (dist < glowDist && false) {
            float d = dist + rand(dist) * 0.5;
            glowColor += clamp(1.0 - d / glowDist, 0.0, 1.0) * 0.005;
        }
        if (dist < curDist) {
            curDist = dist;
            id = 2;
        }
    }
}
float objects(vec3 p, inout vec3 glowColor, inout int objId) {
    float dist = CAM_FAR;
    artifact(p, dist, glowColor, objId);
    particles(p, dist, glowColor, objId);
    return dist;
}
float artifactDist(vec3 p) {
    p -= artifactOffset;
    p = artifactRotation * p;
    return whale(p, 0.15);
}
vec3 objectsNormal(vec3 p, float eps) {
    vec2 h = vec2(eps, 0);
    #define f artifactDist
    return normalize(vec3(f(p + h.xyy) - f(p - h.xyy),
                          f(p + h.yxy) - f(p - h.yxy),
                          f(p + h.yyx) - f(p - h.yyx)));
}
vec3 objectsColor(int id, vec3 normal, vec3 ray) {
    if (id == 1) { // artifact
        float l = dot(normal, normalize(vec3(0.0, 1.0, 0.5)));
        float hl = mix(0.8, 1.5, l * 0.5 + 0.5);
        return vec3(0.85, 0.65, 0.55) * hl * flicker;
    }
    if (id == 2) {
        return vec3(0.85, 0.65, 0.55) * 1.5;
    }
    return vec3(1.0, 1.0, 0.0); // shouldn't happen
}
void marchObjects(vec3 eye, vec3 ray, float wDepth, inout vec4 color) {
    float dist = 0.0;
    int id;
    vec3 rayPos = eye + ray * dist;
    vec3 c;
    float depth = CAM_FAR;
    vec3 glowColor = vec3(0.0);
    for (int i = 0; i < 100; i++) {
        dist = objects(rayPos, color.rgb, id);
        depth = distance(rayPos, eye);
        if (depth > wDepth) {
            break;
        }
        if (dist < 0.01) {
            vec3 normal = objectsNormal(rayPos, 0.01);
            color = vec4(objectsColor(id, normal, ray), depth);
            return;
        }
        rayPos += ray * dist;
    }
}
vec3 waterColor(vec3 ray, vec3 normal, vec3 p) {
    vec3 color = vec3(0.0);
    float fogDist = length(p - vec3(0.0, 0.0, -6.));
    float dist = 0.0;
    int objId = 0;
    vec3 refl = reflect(ray, normal);
    vec3 rayPos = p + refl * dist;
    vec3 dir = normalize(artifactOffset - p);
    if (length(p.xz - artifactOffset.xz) < 8.5 && dot(refl, dir) > -0.25) { // hacky but this way we aren't reflecting on every single fragment
        for (int i = 0; i < 40; i++) {
            dist = objects(rayPos, color, objId);
            if (dist < 0.01) {
                vec3 objNormal = objectsNormal(rayPos, 0.001);
                color = objectsColor(objId, objNormal, rayPos);
                break;
            }
            rayPos += refl * dist;    
        }
    }
    float fresnel = (0.04 + 0.9 * (pow(1.0 - max(0.0, dot(-normal, ray)), 7.0)));
    vec3 lightOffset = artifactOffset - p;
    float d = length(lightOffset);
    const float r = 14.0;
    float atten = clamp(1.0 - (d*d) / (r*r), 0.0, 1.0);
    atten *= atten;
    vec3 point = vec3(0.75, 0.55, 0.45) * atten * (1.0 + fresnel) * 0.07;
    vec3 ambient = vec3(dot(normal, normalize(vec3(0.0, 1.0, 0.5)))) * max(fresnel, 0.06) * vec3(0.1, 0.5, 1.0) * 0.85;
    float fog = smoothstep(25.0, 6.0, fogDist) / (fogDist * 0.1);
   
    return color + (point + ambient) * fog;
}
void marchWater(vec3 eye, vec3 ray, inout vec4 color) {
    const vec3 planeNorm = vec3(0.0, 1.0, 0.0);
    const float depth = 3.0;
    float ceilDist = intersectPlane(eye, ray, vec3(0.0, 0.0, 0.0), planeNorm);
    vec3 normal = vec3(0.0);
    if (dot(planeNorm, ray) > -0.05) {
        normal = vec3(0.0);
        color = vec4(vec3(0.0), CAM_FAR);
        return;
    }
    float height = 0.0;
    vec3 rayPos = eye + ray * ceilDist;
    for (int i = 0; i < 80; i++) {
        height = heightmap(rayPos.xz, WATER_MARCH_ITERATIONS) * depth - depth;
        if (rayPos.y - height < 0.1) {
            color.w = distance(rayPos, eye);
            vec3 normPos = (eye + ray * color.w);
            normal = waterNormal(normPos.xz, 0.005);
            color.rgb = waterColor(ray, normal, normPos);
            return;
        }
        rayPos += ray * (rayPos.y - height);
    }
}
vec3 march(vec2 uv, vec3 camPos) {
    mat4 vm = viewMatrix(camFwd, camUp);
    vec3 ray = (vm * vec4(calcRay(uv, 80.0, iResolution.x / iResolution.y), 1.0)).xyz;
    vec4 color = vec4(BACKGROUND, CAM_FAR);
    marchWater(camPos, ray, color);
    marchObjects(camPos, ray, color.w, color);
    return color.rgb;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // simulate  particles
    float pR;
    float pA;
    float gen;
    float t;
    float loop;
    float height;
    vec4 p;
    const float emitR = 1.7;
    for (int i = 0; i < NUM_PARTICLES; i++) {
        t = time * 0.035 + float(i) * 0.07;
        gen = floor(t);
        loop = fract(t);
        pR = rand(gen + float(i)) * emitR;
        pA = rand(float(i)) * PI * 2.0;
        p.xz = vec2(cos(pA), sin(pA)) * pR + vec2(0.0, -5.2);
        height = mix(3.0, 2.3, (abs(pR) / emitR));
        p.y = mix(-3.5, height, sqrt(loop));
        //p.w = cos(loop * PI * 2.0) * min(1.0, 1.0 - (loop / 0.9)); // not currently used :(
        ppos[i] = p;
    }
    
    // the scene's little whale: a slow turn so it drifts, not spins
    t = time * 0.16;
    float s = sin(t);
    float c = cos(t);
    artifactRotation = mat3x3(c,0,s,
                              0,1,0,
                             -s,0,c);
    artifactRotation *= rotationAlign(vec3(0.0, 1.0, 0.0), vec3(sin(t) * 0.2, 1.0, cos(t) * 0.2 + 0.3));
    artifactOffset = vec3(sin(time) * 0.4, cos(time * 0.5) * 0.3 - 1.7, -6.);
    flicker = mix(1.0, 1.1, sin(time * 2.0) * 0.5 + 0.5) + noise(time * 4.0) * -0.1 + 0.05;

    // camera animation
    camFwd = vec3(0.0, 0.7 + noise(time * 0.8 + 4.0) * 0.08 - 0.04, 1.0);
    camUp = vec3(noise(time * 1.2) * 0.02 - 0.01, 1.0, 0.0);

    // scene
    vec3 color = march(uv, vec3(0.0, 1.9, 1.0));

    // vignette
    color -= (length(uv - 0.5) - 0.3) * 0.05;

    // --- Full-page idle "tide": entrance wash-in, then ripple-disperse --------
    // Driven by idle-ocean.js:
    //   uReveal [0,1] : entrance fill.
    //   uMode / uDir  : entrance shape — random direction / all sides / centre.
    //   uOpaqueMax    : 1.0 opaque screensaver, ~0.6 translucent veil.
    //   uDrain [0,1]  : the cursor disperses the water in spreading ripples.
    //   uMouse        : live cursor in uv (origin bottom-left).
    vec2 cc = uv - 0.5;
    float aspect = iResolution.x / iResolution.y;

    // entrance field — where the tide enters from
    float field;
    if (uMode < 0.5) {
      field = 0.5 + dot(cc, uDir) * 0.92;                              // sweep from a random direction
    } else if (uMode < 1.5) {
      field = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)) * 2.0; // close in from all sides
    } else {
      field = length(cc * vec2(aspect, 1.0)) / (0.5 * length(vec2(aspect, 1.0))); // bloom from centre
    }
    field += 0.05 * sin((uv.x + uv.y) * 9.0 + iTime * 1.10)
           + 0.03 * sin((uv.x - uv.y) * 16.0 - iTime * 0.70);

    float front = uReveal * 1.22 - 0.11;
    float washed = smoothstep(front + 0.12, front - 0.06, field);
    float foam = smoothstep(0.05, 0.0, abs(field - front)) * washed;
    float settle = smoothstep(0.0, 0.55, uReveal);

    vec3 col = color * 1.12;
    col += vec3(0.80, 0.90, 1.0) * foam * 0.22 * (1.0 - uReveal * 0.5);

    float waterA = clamp(washed * settle, 0.0, 1.0);   // water coverage before draining

    // The cursor dissolves the water away from uMouse with a soft, organic
    // wave-warped edge — no concentric rings, no foam, no star at the cursor.
    // The clearing reaches the corners at uDrain=1 so the whole page clears.
    vec2 mrel = (uv - uMouse) * vec2(aspect, 1.0);
    float dM = length(mrel);
    // organic 2D swell on the dissolve edge: incommensurate x/y frequencies, so
    // the boundary laps like water instead of forming rings/petals at the cursor
    float warp = 0.07 * sin(uv.x * 13.0 + iTime * 0.7)
               + 0.06 * sin(uv.y * 17.0 - iTime * 0.5)
               + 0.04 * sin((uv.x + uv.y) * 9.0 + iTime * 0.9);
    float cut = smoothstep(0.09, -0.09, dM - uDrain * 2.3 + warp); // 1 cleared -> 0 water
    waterA *= (1.0 - cut);

    float alpha = waterA * uOpaqueMax;
    fragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}`,Ye="(min-width: 1099px)",Xe="(prefers-reduced-motion: reduce)",Ve=8e3,$e=30,Ge=3.4,Ke=1.3,xe=.55,Ee=1100,Le=1;function Ze(){return/index-html$/.test(document.body.className||"")}function ae(i){return Math.max(0,Math.min(1,i))}function Ce(i){return i*i*(3-2*i)}const Qe=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,Je=`#version 300 es
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
${je}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class et{constructor(){Ze()&&(this.mq=window.matchMedia(Ye),this.reduce=window.matchMedia(Xe),this.canvas=null,this.gl=null,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=Le,this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e);const t=e.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1});if(!t){e.remove();return}if(this.canvas=e,this.gl=t,!this.build()){this.disable();return}this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle()}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null}build(){const e=this.gl,t=(d,r)=>{const l=e.createShader(d);return e.shaderSource(l,r),e.compileShader(l),e.getShaderParameter(l,e.COMPILE_STATUS)?l:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(l)),null)},n=t(e.VERTEX_SHADER,Qe),o=t(e.FRAGMENT_SHADER,Je);if(!n||!o)return!1;const s=e.createProgram();if(e.attachShader(s,n),e.attachShader(s,o),e.bindAttribLocation(s,0,"p"),e.linkProgram(s),!e.getProgramParameter(s,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(s)),!1;e.useProgram(s),this.prog=s;const a=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,a),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(s,"iResolution"),this.uTime=e.getUniformLocation(s,"iTime"),this.uReveal=e.getUniformLocation(s,"uReveal"),this.uOpaque=e.getUniformLocation(s,"uOpaqueMax"),this.uMode=e.getUniformLocation(s,"uMode"),this.uDir=e.getUniformLocation(s,"uDir"),this.uDrain=e.getUniformLocation(s,"uDrain"),this.uMouse=e.getUniformLocation(s,"uMouse"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let t=Math.round(window.innerWidth*e*xe),n=Math.round(window.innerHeight*e*xe);const o=Math.max(t,n);if(o>Ee){const s=Ee/o;t=Math.round(t*s),n=Math.round(n*s)}t=Math.max(1,t),n=Math.max(1,n),(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.gl.viewport(0,0,t,n))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},Ve))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const t=Math.random()*Math.PI*2;this.dir=[Math.cos(t),Math.sin(t)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e-this.lastTick<1e3/$e))return;const t=(e-this.lastTick)/1e3;if(this.lastTick=e,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+t/Ge),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+t/Ke),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.renderFrame(e),this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){const t=this.gl;t&&(t.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),t.uniform1f(this.uTime,((e||performance.now())-this.startTime)/1e3),t.uniform1f(this.uReveal,Ce(ae(this.reveal))),t.uniform1f(this.uOpaque,this.opaqueMax),t.uniform1f(this.uMode,this.mode),t.uniform2f(this.uDir,this.dir[0],this.dir[1]),t.uniform1f(this.uDrain,Ce(ae(this.drain))),t.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),t.drawArrays(t.TRIANGLES,0,3))}debugSet(e={}){return this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=ae(e.reveal)),typeof e.drain=="number"&&(this.drain=ae(e.drain)),this.startTime||(this.startTime=performance.now()),this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now()),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=Le,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}class tt{constructor(){this.init()}init(){document.addEventListener("mouseover",e=>{e.target.tagName==="A"&&this.showTooltip(e.target)}),document.addEventListener("mouseout",e=>{e.target.tagName==="A"&&this.hideTooltip()})}showTooltip(e){const t=e.getAttribute("data-title");if(!t||t==="")return;const n=document.createElement("span");n.className="tooltip",n.textContent=t,e.parentNode.insertBefore(n,e.nextSibling);const o=n.offsetWidth,s=e.offsetWidth,a=e.offsetHeight+3+4;let d=o;o<s&&(d=s,n.style.width=d+"px");const r=-(d-s)/2;n.style.left=r+"px",n.style.bottom=a+"px",setTimeout(()=>{n.style.opacity="1"},10)}hideTooltip(){document.querySelectorAll(".tooltip").forEach(t=>{t.remove()})}}class nt{constructor(){this.mapElement=document.getElementById("map"),this.init()}init(){this.mapElement&&(this.adjustMapLayout(),window.addEventListener("resize",()=>{this.adjustMapLayout()}))}adjustMapLayout(){const e=document.querySelector("header"),t=window.innerHeight,n=window.innerWidth;if(!e)return;const o=e.offsetWidth+50,s=this.mapElement.offsetWidth;this.mapElement.style.maxWidth=s+"px",this.mapElement.style.height=t+"px",n>1100?this.mapElement.style.marginLeft=o+"px":this.mapElement.style.marginLeft="0"}}class it{constructor(){this.overlay=null,this.zoomImg=null,this.hint=null,this.scale=1,this.minScale=.2,this.maxScale=6,this.lastPos={x:0,y:0},this.origin={x:0,y:0},this.dragging=!1,this.wheelTimeout=null,this.init()}init(){this.bindImages(),new MutationObserver(t=>{for(let n=0;n<t.length;n++)if(t[n].addedNodes.length){this.bindImages();break}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}buildOverlay(){this.overlay=document.createElement("div"),this.overlay.id="image-zoom-overlay",this.overlay.className="fade-in",this.overlay.innerHTML=`
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `,document.body.appendChild(this.overlay),this.zoomImg=this.overlay.querySelector(".image-zoom-img"),this.hint=this.overlay.querySelector(".image-zoom-hint"),this.bindOverlayEvents()}openOverlay(e){this.overlay||this.buildOverlay(),this.overlay.style.display="flex",this.zoomImg.src=e,this.scale=1,this.lastPos.x=0,this.lastPos.y=0,this.applyTransform(),this.hint&&(this.hint.style.opacity="1",this.hint.style.transition="opacity .5s",clearTimeout(this.hint._hideTimer),this.hint._hideTimer=setTimeout(()=>{this.hint.style.opacity="0"},3e3))}closeOverlay(){this.overlay&&(this.overlay.style.display="none",this.zoomImg.src="")}applyTransform(){this.zoomImg.style.transform=`translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`}onWheel(e){e.preventDefault();const t=this.zoomImg.getBoundingClientRect(),n=e.clientX-t.left-t.width/2,o=e.clientY-t.top-t.height/2,s=e.deltaY>0?-.12:.12,a=Math.max(this.minScale,Math.min(this.maxScale,this.scale+s)),d=a/this.scale;this.lastPos.x=(this.lastPos.x+n)*d-n,this.lastPos.y=(this.lastPos.y+o)*d-o,this.scale=a,this.applyTransform(),this.hint&&(this.hint.style.opacity="0.3",clearTimeout(this.wheelTimeout),this.wheelTimeout=setTimeout(()=>{this.hint.style.opacity="1"},400))}onMouseDown(e){e.button===0&&(this.dragging=!0,this.origin.x=e.clientX,this.origin.y=e.clientY,this.overlay.style.cursor="grabbing")}onMouseMove(e){if(!this.dragging)return;const t=e.clientX-this.origin.x,n=e.clientY-this.origin.y;this.origin.x=e.clientX,this.origin.y=e.clientY,this.lastPos.x+=t,this.lastPos.y+=n,this.applyTransform()}onMouseUp(){this.dragging=!1,this.overlay&&(this.overlay.style.cursor="default")}onDblClick(){this.closeOverlay()}onKey(e){e.key==="Escape"&&this.overlay&&this.overlay.style.display==="flex"&&this.closeOverlay()}bindOverlayEvents(){this.zoomImg.addEventListener("wheel",e=>this.onWheel(e),{passive:!1}),this.zoomImg.addEventListener("mousedown",e=>this.onMouseDown(e)),this.zoomImg.addEventListener("dblclick",()=>this.onDblClick()),window.addEventListener("mousemove",e=>this.onMouseMove(e)),window.addEventListener("mouseup",()=>this.onMouseUp()),window.addEventListener("keydown",e=>this.onKey(e)),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.closeOverlay()})}bindImages(){const e="article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img";document.querySelectorAll(e).forEach(n=>{n.classList.contains("image-zoomable")||(n.classList.add("image-zoomable"),n.style.cursor="zoom-in",n.addEventListener("click",()=>{this.openOverlay(n.getAttribute("data-origin")||n.src)}))})}}class ot{constructor(){this.initializeEmbeds()}initializeEmbeds(){this.processTextNodes(document.body),this.processCodeBlocks(),this.processMarkdownSyntax()}processTextNodes(e){["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(e.tagName)||(e.nodeType===Node.TEXT_NODE?this.processTextNode(e):Array.from(e.childNodes).forEach(t=>{this.processTextNodes(t)}))}processTextNode(e){const t=e.textContent,n=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let o;const s=[];for(;(o=n.exec(t))!==null;)s.push({fullMatch:o[0],shaderID:o[1],index:o.index});s.length>0&&this.replaceWithIframes(e,s)}processCodeBlocks(){document.querySelectorAll("code, pre").forEach(t=>{const n=t.textContent,o=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let s;for(;(s=o.exec(n))!==null;){const a=n.trim();if(a===s[0]||a===s[0].replace(/\?.*$/,"")){this.replaceElementWithIframe(t,s[1]);break}}})}replaceWithIframes(e,t){const n=e.parentNode;if(!n)return;const o=e.textContent,s=[];let a=0;t.sort((r,l)=>l.index-r.index),t.reverse().forEach(r=>{r.index>a&&s.unshift({type:"text",content:o.substring(a,r.index)}),s.unshift({type:"iframe",shaderID:r.shaderID,originalURL:r.fullMatch}),a=r.index+r.fullMatch.length}),a<o.length&&s.unshift({type:"text",content:o.substring(a)});const d=[];s.forEach(r=>{if(r.type==="text"&&r.content.trim())d.push(document.createTextNode(r.content));else if(r.type==="iframe"){const l=this.createShaderToyEmbed(r.shaderID,r.originalURL);d.push(l)}}),d.forEach(r=>{n.insertBefore(r,e)}),n.removeChild(e)}replaceElementWithIframe(e,t){const n=this.createShaderToyEmbed(t);e.parentNode.replaceChild(n,e)}createShaderToyEmbed(e,t=null){const n=document.createElement("div");n.className="shadertoy-embed-container",n.style.cssText=`
            margin: 25px auto;
            max-width: 800px;
            padding: 15px;
            border: 2px solid #444;
            border-radius: 12px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        `,n.addEventListener("mouseenter",()=>{n.style.transform="translateY(-3px)",n.style.boxShadow="0 12px 35px rgba(0,0,0,0.4)"}),n.addEventListener("mouseleave",()=>{n.style.transform="translateY(0)",n.style.boxShadow="0 8px 25px rgba(0,0,0,0.3)"});const o=document.createElement("div");o.className="shadertoy-embed-header",o.style.cssText=`
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        `;const s=document.createElement("div");s.style.cssText=`
            display: flex;
            align-items: center;
            gap: 10px;
        `;const a=document.createElement("span");a.innerHTML="🎨",a.style.cssText=`
            font-size: 20px;
            filter: drop-shadow(0 0 5px rgba(255,215,0,0.5));
        `;const d=document.createElement("span");d.textContent=`ShaderToy: ${e}`,d.style.cssText=`
            color: #ffd700;
            font-weight: bold;
            font-size: 16px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        `,s.appendChild(a),s.appendChild(d);const r=document.createElement("div");r.style.cssText=`
            display: flex;
            gap: 8px;
        `;const l=document.createElement("a");l.href=t||`https://www.shadertoy.com/view/${e}`,l.target="_blank",l.innerHTML="🔗 Open in ShaderToy",l.style.cssText=`
            color: #66b3ff;
            text-decoration: none;
            font-size: 13px;
            padding: 6px 12px;
            border: 1px solid #66b3ff;
            border-radius: 6px;
            background: rgba(102,179,255,0.1);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        `,l.addEventListener("mouseenter",()=>{l.style.background="#66b3ff",l.style.color="#000",l.style.transform="translateY(-1px)"}),l.addEventListener("mouseleave",()=>{l.style.background="rgba(102,179,255,0.1)",l.style.color="#66b3ff",l.style.transform="translateY(0)"}),r.appendChild(l),o.appendChild(s),o.appendChild(r);const g=document.createElement("div");g.style.cssText=`
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 50%; /* 2:1 aspect ratio */
            border-radius: 8px;
            overflow: hidden;
            background: #000;
        `;const y=document.createElement("iframe");y.src=`https://www.shadertoy.com/embed/${e}?gui=true&t=10&paused=false&muted=false`,y.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `,y.allowFullscreen=!0,y.loading="lazy";const u=document.createElement("div");u.innerHTML=`
            <div style="text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #ffd700; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
                <div style="color: #999; font-size: 14px;">Loading ShaderToy...</div>
            </div>
        `,u.style.cssText=`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
        `;const L=document.createElement("style");return L.textContent=`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `,document.head.appendChild(L),y.addEventListener("load",()=>{u.style.display="none"}),g.appendChild(y),g.appendChild(u),n.appendChild(o),n.appendChild(g),n}processMarkdownSyntax(){const e=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(o){var a;const s=(a=o.parentElement)==null?void 0:a.tagName;return["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(s)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[];let n;for(;n=e.nextNode();)t.push(n);t.forEach(o=>{const s=o.textContent,a=/\[(shader|shadertoy):(\w+)\]/g;let d;const r=[];for(;(d=a.exec(s))!==null;)r.push({fullMatch:d[0],shaderID:d[2],index:d.index});r.length>0&&this.replaceMarkdownSyntax(o,r)})}replaceMarkdownSyntax(e,t){const n=e.parentNode;if(!n)return;const o=e.textContent,s=[];let a=0;t.sort((r,l)=>l.index-r.index),t.reverse().forEach(r=>{r.index>a&&s.unshift({type:"text",content:o.substring(a,r.index)}),s.unshift({type:"iframe",shaderID:r.shaderID,originalURL:null}),a=r.index+r.fullMatch.length}),a<o.length&&s.unshift({type:"text",content:o.substring(a)});const d=[];s.forEach(r=>{if(r.type==="text"&&r.content.trim())d.push(document.createTextNode(r.content));else if(r.type==="iframe"){const l=this.createShaderToyEmbed(r.shaderID,r.originalURL);d.push(l)}}),d.forEach(r=>{n.insertBefore(r,e)}),n.removeChild(e)}}class st{constructor(){this.init()}init(){const e=document.querySelector(".content");if(!e)return;e.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(n=>{const o=document.createElement("span");o.className="collapse-button",n.insertBefore(o,n.firstChild),o.addEventListener("click",s=>{s.stopPropagation(),this.toggleCollapse(n)})})}toggleCollapse(e){const t=parseInt(e.tagName[1]);let n=e.nextElementSibling;e.classList.toggle("collapsed");const o=e.classList.contains("collapsed");for(;n&&!(n.tagName&&n.tagName.match(/^H[1-6]$/)&&parseInt(n.tagName[1])<=t);)n.style.display=o?"none":"",n=n.nextElementSibling}}class at{constructor(){this.init()}init(){this.initCodeBlockExpansion(),new MutationObserver(t=>{let n=!1;t.forEach(o=>{o.addedNodes.length>0&&o.addedNodes.forEach(s=>{s.nodeType===1&&(s.matches("figure.highlight")||s.querySelector("figure.highlight"))&&(n=!0)})}),n&&setTimeout(()=>this.initCodeBlockExpansion(),100)}).observe(document.body,{childList:!0,subtree:!0})}initCodeBlockExpansion(){document.querySelectorAll("figure.highlight").forEach(t=>{if(t.closest(".code-block-container"))return;const n=t.querySelector("table");if(n){const l=n.querySelector("td.code");if(l){const g=document.createElement("pre");g.className="code",g.innerHTML=l.innerHTML,t.innerHTML="",t.appendChild(g)}}const o=t.querySelector("pre.code");if(!o)return;const s=o.scrollHeight,a=400,d=document.createElement("div");d.className="code-buttons";const r=document.createElement("button");if(r.className="copy-code-button",r.textContent="复制代码",r.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),this.copyCodeToClipboard(o,r)}),d.appendChild(r),s>a){const l=document.createElement("div");l.className="code-block-container collapsed",t.parentNode.insertBefore(l,t),l.appendChild(t);const g=document.createElement("button");g.className="expand-button",g.textContent="展开代码",d.appendChild(g),l.appendChild(d),g.addEventListener("click",()=>{l.classList.contains("collapsed")&&this.showFullscreenCode(t)})}else{const l=document.createElement("div");l.className="code-block-container",t.parentNode.insertBefore(l,t),l.appendChild(t),l.appendChild(d)}})}showFullscreenCode(e){const t=document.createElement("div");t.className="code-fullscreen-modal active";const n=document.createElement("div");n.className="code-fullscreen-content";const s=(e.closest(".code-block-container")||e).cloneNode(!0);s.querySelectorAll(".code-buttons, .copy-code-button, .expand-button").forEach(u=>{u.parentNode&&u.parentNode.removeChild(u)});const d=s.classList.contains("code-block-container")?s:s.querySelector(".code-block-container");d&&(d.classList.remove("collapsed"),d.style.margin="0");const r=(d||s).querySelector("pre.code");r&&(r.scrollTop=0),n.appendChild(s);const l=document.createElement("button");l.className="close-fullscreen",l.textContent="关闭",n.appendChild(l),t.appendChild(n),document.body.appendChild(t),document.body.style.overflow="hidden";const g=()=>{document.body.removeChild(t),document.body.style.overflow=""};l.addEventListener("click",g),t.addEventListener("click",u=>{u.target===t&&g()});const y=u=>{u.key==="Escape"&&(g(),document.removeEventListener("keydown",y))};document.addEventListener("keydown",y)}copyCodeToClipboard(e,t){const n=e.textContent||e.innerText;navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(n).then(()=>{this.showCopySuccess(t)}).catch(o=>{console.error("复制失败:",o),this.fallbackCopy(n,t)}):this.fallbackCopy(n,t)}fallbackCopy(e,t){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="2em",n.style.height="2em",n.style.padding="0",n.style.border="none",n.style.outline="none",n.style.boxShadow="none",n.style.background="transparent",document.body.appendChild(n),n.focus(),n.select();try{document.execCommand("copy")&&this.showCopySuccess(t)}catch(o){console.error("复制失败:",o)}document.body.removeChild(n)}showCopySuccess(e){const t=e.textContent;e.classList.add("copied"),e.textContent="已复制 ✓",setTimeout(()=>{e.classList.remove("copied"),e.textContent=t},2e3)}}const Me=1.2,Se=1.15,rt=.2,lt=50,ct="canvas-arrow-modal-";let Te=0;class dt{constructor(){const e=document.querySelectorAll(".canvas-embed:not(.canvas-embed--error)");if(e.length)for(const t of e)this.attach(t)}attach(e){e.setAttribute("role","button"),e.setAttribute("tabindex","0"),e.setAttribute("aria-label","点击放大查看画布"),e.addEventListener("click",t=>{t.target.closest("a")||(t.preventDefault(),this.openModal(e))}),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.openModal(e))})}openModal(e){const t=e.querySelector(".canvas-svg");if(!t)return;const n=t.cloneNode(!0);ht(n),n.classList.add("canvas-modal__svg");const o=document.createElement("div");o.className="canvas-modal",o.innerHTML=`
      <div class="canvas-modal__overlay" aria-hidden="true"></div>
      <div class="canvas-modal__inner" role="dialog" aria-modal="true">
        <button class="canvas-modal__close" type="button" aria-label="关闭">×</button>
        <div class="canvas-modal__viewport"></div>
        <div class="canvas-modal__controls">
          <button class="canvas-modal__btn" data-action="zoom-out" type="button" aria-label="缩小">−</button>
          <button class="canvas-modal__btn" data-action="reset" type="button" aria-label="重置">↺</button>
          <button class="canvas-modal__btn" data-action="zoom-in" type="button" aria-label="放大">+</button>
        </div>
      </div>
    `,o.querySelector(".canvas-modal__viewport").appendChild(n),document.body.appendChild(o),document.body.classList.add("canvas-modal-open");const s=new ut(n),a=r=>{r.key==="Escape"&&d()},d=()=>{s.destroy(),o.remove(),document.body.classList.remove("canvas-modal-open"),document.removeEventListener("keydown",a)};o.querySelector(".canvas-modal__close").addEventListener("click",d),o.querySelector(".canvas-modal__overlay").addEventListener("click",d),document.addEventListener("keydown",a),o.querySelectorAll(".canvas-modal__btn").forEach(r=>{r.addEventListener("click",()=>{const l=r.dataset.action;l==="zoom-in"?s.zoomBy(Me):l==="zoom-out"?s.zoomBy(1/Me):l==="reset"&&s.reset()})})}}function ht(i){const e=i.querySelector("#canvas-arrow");if(!e)return;Te+=1;const t=`${ct}${Te}`;e.id=t,i.querySelectorAll("[marker-end]").forEach(n=>{n.setAttribute("marker-end",`url(#${t})`)})}class ut{constructor(e){this.svg=e;const t=e.viewBox.baseVal;this.original={x:t.x,y:t.y,w:t.width,h:t.height},this.state={...this.original},this.pointers=new Map,this.pinch=null,this.svg.style.cursor="grab",this.svg.style.touchAction="none",this.onWheel=this.onWheel.bind(this),this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.svg.addEventListener("wheel",this.onWheel,{passive:!1}),this.svg.addEventListener("pointerdown",this.onPointerDown),this.svg.addEventListener("pointermove",this.onPointerMove),this.svg.addEventListener("pointerup",this.onPointerUp),this.svg.addEventListener("pointercancel",this.onPointerUp)}setViewBox(){const{x:e,y:t,w:n,h:o}=this.state;this.svg.setAttribute("viewBox",`${e} ${t} ${n} ${o}`)}currentScale(){return this.original.w/this.state.w}zoomBy(e,t,n){const o=this.currentScale()*e;o<rt||o>lt||(t==null&&(t=this.state.x+this.state.w/2),n==null&&(n=this.state.y+this.state.h/2),this.state.x=t-(t-this.state.x)/e,this.state.y=n-(n-this.state.y)/e,this.state.w/=e,this.state.h/=e,this.setViewBox())}pan(e,t){this.state.x-=e,this.state.y-=t,this.setViewBox()}reset(){this.state={...this.original},this.setViewBox()}screenToSvg(e,t){const n=this.svg.createSVGPoint();n.x=e,n.y=t;const o=this.svg.getScreenCTM();return o?n.matrixTransform(o.inverse()):{x:0,y:0}}onWheel(e){e.preventDefault();const t=e.deltaY<0?Se:1/Se,{x:n,y:o}=this.screenToSvg(e.clientX,e.clientY);this.zoomBy(t,n,o)}onPointerDown(e){e.target.closest("a")||(this.svg.setPointerCapture(e.pointerId),this.pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,svg:this.screenToSvg(e.clientX,e.clientY)}),this.pointers.size===2?this.pinch=this.computePinch():this.pointers.size===1&&(this.svg.style.cursor="grabbing"))}onPointerMove(e){const t=this.pointers.get(e.pointerId);if(t){if(t.clientX=e.clientX,t.clientY=e.clientY,this.pointers.size===2&&this.pinch){const n=this.computePinch(),o=n.dist/this.pinch.dist;if(o>0&&Number.isFinite(o)){const s=this.screenToSvg(n.cx,n.cy);this.zoomBy(o,s.x,s.y)}this.pinch=n}else if(this.pointers.size===1){const n=this.screenToSvg(e.clientX,e.clientY);this.pan(n.x-t.svg.x,n.y-t.svg.y)}}}onPointerUp(e){this.pointers.delete(e.pointerId),this.pointers.size<2&&(this.pinch=null),this.pointers.size===0&&(this.svg.style.cursor="grab")}computePinch(){const[e,t]=[...this.pointers.values()],n=t.clientX-e.clientX,o=t.clientY-e.clientY;return{dist:Math.hypot(n,o),cx:(e.clientX+t.clientX)/2,cy:(e.clientY+t.clientY)/2}}destroy(){this.svg.removeEventListener("wheel",this.onWheel),this.svg.removeEventListener("pointerdown",this.onPointerDown),this.svg.removeEventListener("pointermove",this.onPointerMove),this.svg.removeEventListener("pointerup",this.onPointerUp),this.svg.removeEventListener("pointercancel",this.onPointerUp)}}const ue={en:{Home:"Home",Archives:"Archives",About:"About",Portfolio:"Portfolio",Bilibili:"Bilibili",GitHub:"GitHub",Instagram:"Instagram",Douban:"Douban",Email:"Email",RSS:"RSS",Language:"Language",Copyright:"Copyright","Powered by":"Powered by","Modified based on":"Modified based on",theme:"theme","Mainly maintained using AI":"Mainly maintained using AI","Older Posts":"Older Posts","Newer Posts":"Newer Posts",Comments:"Comments","Switch to Chinese":"Switch to Chinese","Switch to English":"Switch to English","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"Switched to English",articleLanguageSwitched:"Switched to English version","tag-graph-hint":"Click tag to explore · Scroll to zoom · Drag to rearrange"},"zh-CN":{Home:"首页",Archives:"归档",About:"关于",Portfolio:"作品集",Bilibili:"哔哩哔哩",GitHub:"GitHub",Instagram:"Instagram",Douban:"豆瓣",Email:"邮箱",RSS:"RSS",Language:"语言",Copyright:"版权所有","Powered by":"技术支持","Modified based on":"基于",theme:"主题","Mainly maintained using AI":"主要使用AI来维护","Older Posts":"上一页","Newer Posts":"下一页",Comments:"留言","Switch to Chinese":"切换至中文","Switch to English":"切换至英文","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"已切换至中文",articleLanguageSwitched:"已切换至中文版本","tag-graph-hint":"点击标签探索 · 滚轮缩放 · 拖拽移动"}},ft=()=>(navigator.language||navigator.userLanguage).startsWith("zh")?"zh-CN":"en",Ne=()=>localStorage.getItem("siteLanguage")||ft(),mt=()=>{const i=document.cookie.match(/(?:^|;\s*)lang_pref=([^;]+)/);return i?i[1]:null},pt=i=>{document.cookie="lang_pref="+i+"; path=/; max-age=31536000; samesite=lax"},ze=()=>{const i=document.querySelector('meta[name="article:lang"]');return i?i.content:window.location.pathname.includes(".zh-CN")?"zh-CN":"en"},Pe=i=>{const e=document.querySelector(`link[rel="alternate"][hreflang="${i}"]`);if(!e)return null;const t=new URL(e.href,window.location.origin);return window.location.origin+t.pathname+t.search+t.hash},Re=i=>{const e=window.location.pathname;if(i==="zh-CN")return e.startsWith("/zh-CN/")||e==="/zh-CN"?null:window.location.origin+"/zh-CN"+e+window.location.search+window.location.hash;if(!e.startsWith("/zh-CN/")&&e!=="/zh-CN")return null;const t=e.replace(/^\/zh-CN(?=\/|$)/,"")||"/";return window.location.origin+t+window.location.search+window.location.hash},De=i=>{document.querySelectorAll(".lang-switch__opt").forEach(e=>{e.setAttribute("aria-pressed",e.getAttribute("data-lang")===i?"true":"false")})},fe=i=>{const e=ue[i];if(!e){console.warn("Language data not available for:",i);return}document.documentElement.lang=i,document.querySelectorAll("nav ul li a").forEach(r=>{const l=r.getAttribute("data-i18n-key");l&&e[l]&&(r.textContent=e[l])}),document.querySelectorAll("[data-i18n]").forEach(r=>{const l=r.getAttribute("data-i18n");e[l]&&(r.textContent=e[l])}),document.querySelectorAll("[data-title]").forEach(r=>{const l=r.getAttribute("data-title");e[l]&&r.setAttribute("data-title",e[l])});const s=document.querySelector(".pagination .extend.prev"),a=document.querySelector(".pagination .extend.next");s&&(s.textContent=e["Older Posts"]||s.textContent),a&&(a.textContent=e["Newer Posts"]||a.textContent),localStorage.setItem("siteLanguage",i),document.querySelectorAll("[data-i18n-tag]").forEach(r=>{const l=r.getAttribute("data-i18n-tag");if(i==="zh-CN"){const g=window.tagTranslations&&window.tagTranslations[l];g&&(r.textContent=g)}else r.textContent=l}),De(i)},gt=i=>{const e=document.querySelector(".lang-notification");e&&e.remove();const t=document.createElement("div");t.className="lang-notification",t.textContent=i,document.body.appendChild(t),setTimeout(()=>{t.classList.add("show")},10),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},2e3)},_e=i=>{if(pt(i),i===ze()){localStorage.setItem("siteLanguage",i),fe(i);return}const e=Pe(i)||Re(i);if(e){localStorage.setItem("siteLanguage",i),window.location.href=e;return}fe(i);const t=ue[i]?ue[i].languageSwitched:"Language switched";gt(t)},vt=()=>{const i=Ne()==="zh-CN"?"en":"zh-CN";_e(i)},yt=()=>{document.querySelectorAll(".lang-switch__opt").forEach(i=>{i.addEventListener("click",e=>{e.preventDefault(),_e(i.getAttribute("data-lang"))})}),De(Ne())},Ae=()=>{const i=ze(),e=mt();if(fe(e||i),e&&e!==i){const t=Pe(e)||Re(e);t&&window.location.replace(t)}};function wt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ae):Ae(),window.addEventListener("load",()=>{const i=document.getElementById("langSwitch");i&&i.addEventListener("click",e=>{e.preventDefault(),vt()}),yt()})}function bt(){const i=document.getElementById("tag-graph"),e=document.getElementById("tag-graph-container"),t=window.__TAG_GRAPH_DATA__;if(!i||!t||!t.nodes||t.nodes.length===0)return;const n=document.createElement("div");n.className="graph-loading",n.textContent="Loading",i.parentNode.appendChild(n);const o=t.archiveFilterTags||[],s={};o.forEach(function(c){s[c]=!0});function a(c){return String(c||"").replace(/-/g," ").replace(/\s+/g," ").trim().toLowerCase()}const d={};t.links.forEach(function(c){d[c.source]=(d[c.source]||0)+1,d[c.target]=(d[c.target]||0)+1});let r=1;t.nodes.forEach(function(c){const h=c.value||0;h>r&&(r=h)}),t.nodes.forEach(function(c){const h=c.value||0;c.symbolSize=Math.max(12,Math.min(70,12+h*(58/r)))});const l={};t.nodes.forEach(function(c){l[c.name]=[]});function g(c,h){!l[c]||!l[h]||c===h||(l[c].indexOf(h)===-1&&l[c].push(h),l[h].indexOf(c)===-1&&l[h].push(c))}t.links.forEach(function(c){g(c.source,c.target)});const y={};t.nodes.forEach(function(c){const h=a(c.name);y[h]||(y[h]=[]),y[h].push(c.name)}),Object.keys(y).forEach(function(c){const h=y[c];if(!(h.length<2))for(let p=0;p<h.length;p++)for(let b=p+1;b<h.length;b++)g(h[p],h[b])});const u={},L=[];o.forEach(function(c){l[c]!==void 0&&(u[c]=0,L.push(c))});let k=0;for(;k<L.length;){const c=L[k++];(l[c]||[]).forEach(function(h){u[h]===void 0&&(u[h]=u[c]+1,L.push(h))})}Object.keys(u).forEach(function(c){});const S=[{h:260,s:62,l:50},{h:15,s:80,l:55},{h:160,s:60,l:42},{h:220,s:72,l:52},{h:340,s:70,l:52},{h:45,s:85,l:50},{h:190,s:70,l:45},{h:90,s:55,l:45},{h:290,s:60,l:50},{h:30,s:75,l:48},{h:130,s:50,l:42},{h:0,s:70,l:55}];function N(c,h,p){return"hsl("+Math.round(c)+", "+Math.round(h)+"%, "+Math.round(p)+"%)"}const _={},H={},z=t.nodes.filter(function(c){return s[c.name]});z.sort(function(c,h){return h.value-c.value}),z.forEach(function(c,h){const p=S[h%S.length];H[c.name]=p,_[c.name]=N(p.h,p.s,p.l)});const R={};o.forEach(function(c){if(l[c]===void 0)return;const h={};h[c]=0;const p=[c];let b=0;for(;b<p.length;){const P=p[b++];(l[P]||[]).forEach(function(M){h[M]===void 0&&(h[M]=h[P]+1,p.push(M))})}R[c]=h});const O=t.nodes.filter(function(c){return!s[c.name]});let F=1;O.forEach(function(c){let h=1/0;o.forEach(function(p){if(!R[p])return;const b=R[p][c.name];b!==void 0&&b<h&&(h=b)}),h<1/0&&h>F&&(F=h)}),O.forEach(function(c){const h=[];let p=0;if(o.forEach(function(f){if(!R[f]||!H[f])return;let v=R[f][c.name];if(v===void 0)return;v===0&&(v=.5);const E=1/(v*v);h.push({ft:f,w:E}),p+=E}),p===0){_[c.name]="hsl(0, 0%, 82%)";return}let b=0,P=0,M=0,w=0;h.forEach(function(f){const v=f.w/p,E=H[f.ft],q=E.h*Math.PI/180;b+=Math.sin(q)*v,P+=Math.cos(q)*v,M+=E.s*v,w+=E.l*v});let T=Math.atan2(b,P)*180/Math.PI;T<0&&(T+=360);let B=M,W=w,m=1/0;h.forEach(function(f){const v=R[f.ft][c.name];v<m&&(m=v)});let x=(m-1)/Math.max(F-1,1);x=Math.max(0,Math.min(1,x));const I=Math.pow(x,.85),A=32,C=1-I*.35;B=Math.max(A,B*C),W=W+I*(82-W)*.78,_[c.name]=N(T,B,W)});const Q=t.tagTranslations||{},X={};Object.keys(Q).forEach(function(c){X[c]=Q[c];const h=c.replace(/-/g," ");h!==c&&(X[h]=Q[c])});function ne(c){return(typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en")==="zh-CN"&&X[c]?X[c]:c}const ve=e.getBoundingClientRect(),j=ve.width||500,Y=ve.height||400,ye=Math.min(j,Y)*.28;z.forEach(function(c,h){const p=2*Math.PI*h/Math.max(z.length,1)-Math.PI/2;c.x=j/2+ye*Math.cos(p),c.y=Y/2+ye*Math.sin(p)});const we=Math.min(j,Y)*.45;O.forEach(function(c,h){const p=2*Math.PI*h/Math.max(O.length,1);c.x=j/2+we*Math.cos(p),c.y=Y/2+we*Math.sin(p)});const He=60,D=t.nodes;for(let c=0;c<15;c++)for(let h=0;h<D.length;h++)for(let p=h+1;p<D.length;p++){const b=D[p].x-D[h].x,P=D[p].y-D[h].y,M=Math.sqrt(b*b+P*P),w=He+(D[h].symbolSize+D[p].symbolSize)/2;if(M<w){const T=(w-M)/2,B=M>.1?b/M:Math.random()-.5,W=M>.1?P/M:Math.random()-.5;D[h].x-=B*T,D[h].y-=W*T,D[p].x+=B*T,D[p].y+=W*T}}let J=1,ee=[j/2,Y/2];if(z.length>0){let c=1/0,h=-1/0,p=1/0,b=-1/0;z.forEach(function(w){const T=(w.symbolSize||20)/2+50;w.x-T<c&&(c=w.x-T),w.x+T>h&&(h=w.x+T),w.y-T<p&&(p=w.y-T),w.y+T>b&&(b=w.y+T)});const P=h-c,M=b-p;if(P>0&&M>0){const w=j/P,T=Y/M;J=Math.min(w,T,1.5)*.8,J<.3&&(J=.3),ee=[(c+h)/2,(p+b)/2]}}t.nodes.forEach(function(c){c.itemStyle={color:_[c.name],borderColor:"#fff",borderWidth:1.5,shadowBlur:5,shadowColor:"rgba(0, 0, 0, 0.06)"},c.label={show:!0,formatter:function(){return ne(c.name)},fontSize:Math.max(10,Math.min(15,9+(d[c.name]||0)*.5)),color:"#555",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}});const V=e.querySelector(".tag-graph-hint");let be=null,le=!1;function Fe(){le||(le=!0,V.classList.add("visible"),clearTimeout(be),be=setTimeout(function(){V.classList.remove("visible"),le=!1},3e3))}e.addEventListener("mouseenter",Fe);const $=document.createElement("script");$.src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",$.integrity="sha384-Mx5lkUEQPM1pOJCwFtUICyX45KNojXbkWdYhkKUKsbv391mavbfoAmONbzkgYPzR",$.crossOrigin="anonymous",$.onload=function(){We()},$.onerror=function(){n.textContent="Failed to load chart library",n.style.color="#c44"},document.head.appendChild($);function Be(c){return c<10?750:c<20?1200:c<40?1650:2100}function We(){n.parentNode&&n.parentNode.removeChild(n);const c=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window,h=echarts.init(i),p={backgroundColor:"transparent",tooltip:{show:!0,enterable:!0,confine:!0,backgroundColor:"rgba(255, 255, 255, 0.97)",borderColor:"#e8e8e8",borderWidth:1,padding:[10,14],textStyle:{color:"#4b4848",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:13},extraCssText:"border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); max-height: 260px; overflow-y: auto;",formatter:function(m){function x(A){return String(A??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function I(A,C){const f=x(A),v=x(C),E='style="display:block;color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;text-decoration:none;"';return v?'<a href="'+v+'" '+E+">• "+f+"</a>":"<div "+E+">• "+f+"</div>"}if(m.dataType==="node"){const A=ne(m.name);let C='<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:'+(_[m.name]||"#795da3")+'">'+x(A)+"</div>";C+='<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 '+m.value+" article"+(m.value>1?"s":"")+"</div>";const f=t.postTitles&&t.postTitles[m.name];return f&&f.length>0&&(C+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">',f.forEach(function(v){typeof v=="string"?C+=I(v,""):C+=I(v.title,v.path)}),C+="</div>"),C}if(m.dataType==="edge"){const A=m.data.source,C=m.data.target;let f='<span style="font-weight:600">'+x(ne(A))+'</span> <span style="color:#bbb">↔</span> <span style="font-weight:600">'+x(ne(C))+"</span>";f+='<br/><span style="color:#999;font-size:12px">📄 '+m.data.value+" article"+(m.data.value>1?"s":"")+"</span>";const v=[A,C].sort().join("	"),E=t.linkPosts&&t.linkPosts[v];return E&&E.length>0&&(f+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;margin-top:5px;">',E.forEach(function(q){f+=I(q.title,q.path)}),f+="</div>"),f}}},animationDuration:1500,animationEasingUpdate:"quinticInOut",series:[{type:"graph",layout:"force",data:t.nodes,links:t.links,roam:!1,draggable:!c,force:{repulsion:Be(t.nodes.length),edgeLength:[150,450],gravity:.12,friction:.6,layoutAnimation:!0},emphasis:{focus:"adjacency",blurScope:"global",itemStyle:{shadowBlur:20,shadowColor:"rgba(121, 93, 163, 0.45)",borderWidth:2,borderColor:"#fff"},lineStyle:{width:3,opacity:.85},label:{show:!0,fontSize:14,fontWeight:"bold",color:"#333"}},label:{position:"right",distance:6},lineStyle:{color:"#d0d0d0",width:1.5,curveness:0,opacity:.35},scaleLimit:{min:.3,max:4},zoom:J,center:ee}]};h.setOption(p);let b=!1,P=!1;if(z.length>0){const m=function(){if(P)return;if(b){P=!0,h.off("finished",m);return}const x=h.getModel(),I=x&&x.getSeriesByIndex&&x.getSeriesByIndex(0),A=I&&I.getGraph&&I.getGraph();let C=1/0,f=-1/0,v=1/0,E=-1/0,q=0;if(z.forEach(function(oe){const ce=A&&A.getNodeByName&&A.getNodeByName(oe.name),se=ce&&ce.getLayout&&ce.getLayout();let K,Z;se&&se.length>=2?(K=se[0],Z=se[1]):(K=oe.x||0,Z=oe.y||0);const U=(oe.symbolSize||20)/2+50;K-U<C&&(C=K-U),K+U>f&&(f=K+U),Z-U<v&&(v=Z-U),Z+U>E&&(E=Z+U),q++}),q===0)return;const te=f-C,ie=E-v;if(te<=0||ie<=0)return;let G=Math.min(j/te,Y/ie,1.5)*.8;G<.3&&(G=.3),P=!0,M=G,w=[(C+f)/2,(v+E)/2],h.setOption({series:[{zoom:G,center:w.slice()}]}),h.off("finished",m)};h.on("finished",m)}h.on("click",function(m){m.dataType==="node"&&t.tagPaths&&t.tagPaths[m.name]&&(window.location.href=t.tagPaths[m.name])}),h.on("mouseover",function(m){(m.dataType==="node"||m.dataType==="edge")&&(i.style.cursor="pointer")}),h.on("mouseout",function(){i.style.cursor="default"});let M=J||1,w=ee?[ee[0],ee[1]]:[0,0];if(!c){const m=e||i;m.addEventListener("wheel",function(f){f.preventDefault()},{passive:!1}),m.addEventListener("touchmove",function(f){f.touches.length>=2&&f.preventDefault()},{passive:!1});const x=h.getZr();x.on("mousewheel",function(f){f.event.preventDefault(),f.event.stopPropagation(),b=!0;const v=f.wheelDelta>0?1.08:1/1.08;let E=M*v;E<.3&&(E=.3),E>4&&(E=4),M=E,h.setOption({series:[{zoom:M}]})});let I=!1,A=[0,0],C=[0,0];x.on("mousedown",function(f){f.target||(I=!0,b=!0,A=[f.event.clientX,f.event.clientY],C=[w[0],w[1]],i.style.cursor="grabbing")}),x.on("mousemove",function(f){if(I){const v=f.event.clientX-A[0],E=f.event.clientY-A[1],q=i.clientWidth,te=i.clientHeight,ie=q/M,G=te/M;w[0]=C[0]-v*(ie/q),w[1]=C[1]-E*(G/te),h.setOption({series:[{center:[w[0],w[1]]}]})}}),x.on("mouseup",function(){I&&(I=!1,i.style.cursor="default")}),x.on("globalout",function(){I&&(I=!1,i.style.cursor="default")})}if(c){const m=document.createElement("button");m.type="button",m.className="tag-graph-fs-btn",m.setAttribute("aria-label","Fullscreen"),m.innerHTML='<svg class="tag-graph-fs-ic tag-graph-fs-ic--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg><svg class="tag-graph-fs-ic tag-graph-fs-ic--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',e.appendChild(m);let x=!1;const I=function(){if(!V)return;const f=typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en";V.textContent=f==="zh-CN"?"双指缩放 · 拖动平移 · 点按进入标签":"Pinch to zoom · Drag to pan · Tap a tag",V.classList.add("visible"),setTimeout(function(){V.classList.remove("visible")},2600)},A=function(){x=!0,e.classList.add("tag-graph-fullscreen"),m.classList.add("is-fullscreen"),m.setAttribute("aria-label","Exit fullscreen"),document.body.style.overflow="hidden",document.body.classList.add("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!0}]}),I()})},C=function(){x=!1,e.classList.remove("tag-graph-fullscreen"),m.classList.remove("is-fullscreen"),m.setAttribute("aria-label","Fullscreen"),document.body.style.overflow="",document.body.classList.remove("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!1,zoom:M,center:w.slice()}]})})};m.addEventListener("click",function(f){f.preventDefault(),f.stopPropagation(),x?C():A()}),document.addEventListener("keydown",function(f){f.key==="Escape"&&x&&C()})}let T;window.addEventListener("resize",function(){clearTimeout(T),T=setTimeout(function(){h.resize()},150)});function B(){h.setOption({series:[{data:t.nodes}]})}window.addEventListener("storage",function(m){m.key==="siteLanguage"&&B()});const W=localStorage.setItem;localStorage.setItem=function(m,x){W.call(localStorage,m,x),m==="siteLanguage"&&setTimeout(B,50)}}}function xt(i){const e=i.querySelectorAll("h1, h2, h3, h4, h5, h6"),t=[0,0,0,0,0,0],n=[];return Array.from(e).map((o,s)=>{const a=parseInt(o.tagName[1],10);t[a-1]+=1;for(let d=a;d<6;d+=1)t[d]=0;for(;n.length>a-1;)n.pop();return n.push(t[a-1]),o.id||(o.id=`heading-${s}`),{element:o,level:a,index:s,id:o.id,text:o.textContent,number:n.join(".")}})}const qe="toc-panel-state";function me(){try{const i=localStorage.getItem(qe);if(!i)return null;const e=JSON.parse(i);return!e||typeof e!="object"?null:e}catch{return null}}function pe(i){try{const t={...me()||{},...i};localStorage.setItem(qe,JSON.stringify(t))}catch{}}function Et(i){const e=me();if(!e)return;const t=window.innerWidth,n=window.innerHeight,o=200,s=150;if(typeof e.width=="number"&&typeof e.height=="number"){const a=Math.max(o,Math.min(e.width,t)),d=Math.max(s,Math.min(e.height,n));i.style.width=`${a}px`,i.style.height=`${d}px`}if(typeof e.left=="number"&&typeof e.top=="number"){const a=i.getBoundingClientRect(),d=i.style.width?parseFloat(i.style.width):a.width,r=i.style.height?parseFloat(i.style.height):a.height,l=Math.max(0,Math.min(e.left,t-d)),g=Math.max(0,Math.min(e.top,n-r));i.style.left=`${l}px`,i.style.top=`${g}px`,i.style.right="auto",i.style.bottom="auto"}}function Lt(i){const e=document.createElement("div");e.className="toc-container",e.innerHTML='<div class="toc-header"><span class="toc-title"></span><button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button></div><div class="toc-content"><div class="toc-list"></div></div>',document.body.appendChild(e);const t=e.querySelector(".toc-list"),n=i.map(o=>{const s=document.createElement("div");s.className="toc-item",s.setAttribute("data-level",String(o.level)),s.setAttribute("data-index",String(o.index));const a=document.createElement("div");a.className="toc-collapse-btn";const d=document.createElement("span");return d.className="toc-item-text",d.style.cursor="pointer",d.innerHTML=`<span class="toc-number">${o.number}.</span> `,d.appendChild(document.createTextNode(o.text)),o.element.classList.contains("collapsed")&&s.classList.add("collapsed"),s.appendChild(a),s.appendChild(d),t.appendChild(s),s});return Et(e),{container:e,items:n}}function Ct(){return(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?"zh":"en"}const Mt={zh:{title:"目录",open:"目录",hide:"隐藏目录",show:"显示目录"},en:{title:"Contents",open:"Contents",hide:"Hide contents",show:"Show contents"}};function St(i){const e=Mt[Ct()],t=i.querySelector(".toc-title");t&&(t.textContent=e.title);const n=i.querySelector(".toc-close-btn");n&&(n.setAttribute("aria-label",e.hide),n.setAttribute("title",e.hide));const o=document.createElement("button");o.type="button",o.className="toc-reopen",o.setAttribute("aria-label",e.show),o.innerHTML='<span class="toc-reopen__icon" aria-hidden="true"></span><span>'+e.open+"</span>",document.body.appendChild(o);function s(d,r){i.style.display=d?"none":"",o.classList.toggle("is-visible",d),r&&pe({hidden:d})}n&&n.addEventListener("click",d=>{d.stopPropagation(),s(!0,!0)}),o.addEventListener("click",()=>s(!1,!0));const a=me();a&&a.hidden&&s(!0,!1)}function ge(i,e,t){for(let n=e+1;n<i.length&&!(parseInt(i[n].getAttribute("data-level")||"1",10)<=t);n+=1)i[n].classList.add("toc-hidden")}function Oe(i,e,t){for(let n=e+1;n<i.length;n+=1){const o=parseInt(i[n].getAttribute("data-level")||"1",10);if(o<=t)break;if(o===t+1)i[n].classList.remove("toc-hidden");else{let s=!0;for(let a=n-1;a>e;a-=1){const d=parseInt(i[a].getAttribute("data-level")||"1",10);if(d<o&&i[a].classList.contains("collapsed")){s=!1;break}if(d<=t)break}s&&i[n].classList.remove("toc-hidden")}}}function Tt(i){const e=parseInt(i.tagName.charAt(1),10);let t=i.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t=t.nextElementSibling;continue}t.style.display="none",t=t.nextElementSibling}}function At(i){const e=parseInt(i.tagName.charAt(1),10);let t=i.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t.style.display="",t=t.nextElementSibling;continue}t.style.display="",t=t.nextElementSibling}}function kt(i,e,t){const n=e[t],o=i[t]&&i[t].element;if(!n||!o)return;const s=parseInt(n.getAttribute("data-level")||"1",10);!n.classList.contains("collapsed")?(n.classList.add("collapsed"),ge(e,t,s),o.classList.contains("collapsed")||(o.classList.add("collapsed"),Tt(o))):(n.classList.remove("collapsed"),Oe(e,t,s),o.classList.contains("collapsed")&&(o.classList.remove("collapsed"),At(o)))}function It(i,e,t){const n=e[t],o=i[t]&&i[t].element;if(!n||!o)return;const s=parseInt(n.getAttribute("data-level")||"1",10),a=o.classList.contains("collapsed");a&&!n.classList.contains("collapsed")?(n.classList.add("collapsed"),ge(e,t,s)):!a&&n.classList.contains("collapsed")&&(n.classList.remove("collapsed"),Oe(e,t,s))}function Nt(i,e){e.forEach((o,s)=>{if(o.classList.contains("collapsed")){const a=parseInt(o.getAttribute("data-level")||"1",10);ge(e,s,a)}}),e.forEach((o,s)=>{const a=o.querySelector(".toc-collapse-btn");a&&a.addEventListener("click",d=>{d.stopPropagation(),kt(i,e,s)})});const t=new Map;i.forEach((o,s)=>t.set(o.element,s));const n=new MutationObserver(o=>{o.forEach(s=>{if(s.type!=="attributes"||s.attributeName!=="class")return;const a=t.get(s.target);a!==void 0&&It(i,e,a)})});return i.forEach(o=>{n.observe(o.element,{attributes:!0,attributeFilter:["class"]})}),{observer:n}}function zt(i,e,t){const n=i.clientX,o=i.clientY,s=e.getBoundingClientRect(),a=s.left,d=s.top,r=s.width,l=s.height;let g=!1,y=null;function u(){g=!1;const S=y;if(!S)return;const N=window.innerWidth,_=window.innerHeight,H=Math.max(0,Math.min(a+(S.clientX-n),N-r)),z=Math.max(0,Math.min(d+(S.clientY-o),_-l));e.style.left=`${H}px`,e.style.top=`${z}px`,e.style.right="auto",e.style.bottom="auto"}function L(S){y=S,g||(g=!0,requestAnimationFrame(u))}function k(){document.removeEventListener("mousemove",L),document.removeEventListener("mouseup",k),t.dragging=!1;const S=e.getBoundingClientRect();pe({left:S.left,top:S.top})}t.dragging=!0,document.addEventListener("mousemove",L),document.addEventListener("mouseup",k),i.preventDefault()}const re=8,de=200,he=150;function Pt(i,e){i.addEventListener("mousemove",t=>{if(e.dragging||e.resizing)return;const n=i.getBoundingClientRect(),o=t.clientX-n.left,s=t.clientY-n.top;let a="move",d="";const r=o<=re,l=o>=n.width-re,g=s<=re,y=s>=n.height-re;g&&r?(a="nw-resize",d="nw"):g&&l?(a="ne-resize",d="ne"):y&&r?(a="sw-resize",d="sw"):y&&l?(a="se-resize",d="se"):r?(a="w-resize",d="w"):l?(a="e-resize",d="e"):g?(a="n-resize",d="n"):y&&(a="s-resize",d="s"),i.style.cursor=a,e.resizeDirection=d;const u=i.querySelector(".toc-header");u&&(u.style.cursor=d?a:"")}),i.addEventListener("mouseleave",()=>{if(!e.dragging&&!e.resizing){i.style.cursor="default",e.resizeDirection="";const t=i.querySelector(".toc-header");t&&(t.style.cursor="")}})}function Rt(i,e,t){const n=t.resizeDirection;if(!n)return;const o=i.clientX,s=i.clientY,a=e.getBoundingClientRect(),d=a.left,r=a.top,l=a.width,g=a.height;let y=!1,u=null;function L(){y=!1;const N=u;if(!N)return;const _=N.clientX-o,H=N.clientY-s;let z=l,R=g,O=d,F=r;n.includes("e")&&(z=l+_),n.includes("w")&&(z=l-_,O=d+_),n.includes("s")&&(R=g+H),n.includes("n")&&(R=g-H,F=r+H),z<de&&(n.includes("w")&&(O=d+l-de),z=de),R<he&&(n.includes("n")&&(F=r+g-he),R=he);const Q=window.innerWidth,X=window.innerHeight;O=Math.max(0,Math.min(O,Q-z)),F=Math.max(0,Math.min(F,X-R)),e.style.width=`${z}px`,e.style.height=`${R}px`,e.style.left=`${O}px`,e.style.top=`${F}px`,e.style.right="auto",e.style.bottom="auto"}function k(N){u=N,y||(y=!0,requestAnimationFrame(L))}function S(){document.removeEventListener("mousemove",k),document.removeEventListener("mouseup",S),t.resizing=!1,t.resizeDirection="";const N=e.getBoundingClientRect();pe({left:N.left,top:N.top,width:N.width,height:N.height})}t.resizing=!0,document.addEventListener("mousemove",k),document.addEventListener("mouseup",S),i.preventDefault()}const ke={1:{passed:"rgba(128,128,128,0.1)",reading:"rgba(66,153,225,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(66,153,225,0.25)"},2:{passed:"rgba(128,128,128,0.1)",reading:"rgba(49,130,206,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(49,130,206,0.25)"},3:{passed:"rgba(128,128,128,0.1)",reading:"rgba(44,82,130,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(44,82,130,0.25)"},4:{passed:"rgba(128,128,128,0.1)",reading:"rgba(42,67,101,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(42,67,101,0.25)"},5:{passed:"rgba(128,128,128,0.1)",reading:"rgba(26,54,93,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(26,54,93,0.25)"},6:{passed:"rgba(128,128,128,0.1)",reading:"rgba(21,62,117,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(21,62,117,0.25)"}};function Dt(i,e){if(!i.length)return{destroy(){}};const t=new Array(i.length).fill("coming"),n=new Set;let o=-1;const s=new Map;i.forEach((u,L)=>s.set(u.element,L));function a(){e.forEach((u,L)=>{const k=parseInt(u.getAttribute("data-level")||"1",10),S=ke[k]||ke[1],N=t[L];u.classList.remove("toc-passed","toc-reading","toc-coming"),u.style.boxShadow="",u.style.transform="",u.style.fontWeight="",L===o?(u.classList.add("toc-reading"),u.style.backgroundColor=S.active,u.style.opacity="1",u.style.fontWeight="600",u.style.boxShadow="inset 0 0 0 2px rgba(66,153,225,0.3)",u.style.transform="scale(1.02)",u.style.transition="all 0.2s ease"):N==="reading"?(u.classList.add("toc-reading"),u.style.backgroundColor=S.reading,u.style.opacity="1",u.style.fontWeight="600"):N==="passed"?(u.classList.add("toc-passed"),u.style.backgroundColor=S.passed,u.style.opacity="0.7"):(u.classList.add("toc-coming"),u.style.backgroundColor=S.coming,u.style.opacity="0.5")})}function d(){const u=window.innerHeight/2;let L=-1;n.forEach(k=>{const S=i[k].element.getBoundingClientRect();S.top<=u&&S.bottom>=u&&(L=k)}),L!==o&&(o=L,a())}let r=null;function l(){r||(r=requestAnimationFrame(()=>{r=null,d()}))}const g=new IntersectionObserver(u=>{u.forEach(L=>{const k=s.get(L.target);k!==void 0&&(L.isIntersecting?(n.add(k),t[k]="reading"):(n.delete(k),t[k]=L.boundingClientRect.bottom<0?"passed":"coming"))}),d(),a()});i.forEach(u=>g.observe(u.element)),window.addEventListener("scroll",l,{passive:!0}),window.addEventListener("resize",l,{passive:!0}),a();function y(){g.disconnect(),window.removeEventListener("scroll",l),window.removeEventListener("resize",l),r&&cancelAnimationFrame(r)}return{destroy:y,refresh:()=>{d(),a()}}}function _t(){const i=document.querySelector(".content");if(!i||i.classList.contains("archives"))return null;const e=document.body;if(e.classList.contains("path-about-index-html")||e.classList.contains("layout-about"))return null;const t=document.querySelector("section.main[data-toc]");return t&&t.getAttribute("data-toc")==="false"?null:i}function qt(i){return i.classList.contains("toc-collapse-btn")||i.classList.contains("toc-item-text")||i.closest(".toc-collapse-btn")||i.closest(".toc-item-text")||i.closest(".toc-close-btn")}function Ot(){const i=_t();if(!i)return;const e=xt(i);if(!e.length)return;const{container:t,items:n}=Lt(e);St(t),Nt(e,n);const o={dragging:!1,resizing:!1,resizeDirection:""};Pt(t,o),t.addEventListener("mousedown",a=>{qt(a.target)||(o.resizeDirection?Rt(a,t,o):zt(a,t,o))});const s=Dt(e,n);n.forEach((a,d)=>{const r=a.querySelector(".toc-item-text");r&&r.addEventListener("click",()=>{const l=e[d]&&e[d].element;l&&(l.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>s.refresh(),300))})})}function Ie(){new Ue,new et,new tt,document.getElementById("map")&&new nt,new it,setTimeout(()=>{new ot},500),new st,new at,new dt,wt(),Ot(),document.getElementById("tag-graph")&&bt()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ie):Ie();
