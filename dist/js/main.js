class Ge{constructor(){this.header=document.querySelector("header"),this.menuIcon=document.getElementById("menu_icon"),this.navTriggerZone=50,this.showNavTimeout=null,this.lastMouseEvent=null,this.mouseMoveScheduled=!1,this.mediaQuery=null,this.currentMode=null,this.navLinks=null,this.onMouseMove=this.onMouseMove.bind(this),this.onHeaderEnter=this.onHeaderEnter.bind(this),this.onHeaderLeave=this.onHeaderLeave.bind(this),this.onMenuIconClick=this.onMenuIconClick.bind(this),this.onNavLinkClick=this.onNavLinkClick.bind(this),this.onKeydown=this.onKeydown.bind(this),this.onBreakpointChange=this.onBreakpointChange.bind(this),this.init()}init(){this.header&&(this.mediaQuery=window.matchMedia("(min-width: 1099px)"),this.mediaQuery.addEventListener("change",this.onBreakpointChange),this.applyMode(this.mediaQuery.matches?"desktop":"mobile"))}onBreakpointChange(e){this.applyMode(e.matches?"desktop":"mobile")}applyMode(e){e!==this.currentMode&&(this.teardown(),this.currentMode=e,e==="desktop"?this.bindDesktop():this.bindMobile())}teardown(){document.removeEventListener("mousemove",this.onMouseMove),this.header.removeEventListener("mouseenter",this.onHeaderEnter),this.header.removeEventListener("mouseleave",this.onHeaderLeave),document.removeEventListener("keydown",this.onKeydown),this.menuIcon&&this.menuIcon.removeEventListener("click",this.onMenuIconClick),this.navLinks&&this.navLinks.forEach(e=>e.removeEventListener("click",this.onNavLinkClick)),clearTimeout(this.showNavTimeout),this.showNavTimeout=null,this.header.classList.remove("show_menu","menu-open"),document.body.style.overflow=""}bindDesktop(){document.addEventListener("mousemove",this.onMouseMove),this.header.addEventListener("mouseenter",this.onHeaderEnter),this.header.addEventListener("mouseleave",this.onHeaderLeave)}bindMobile(){this.menuIcon&&(this.menuIcon.addEventListener("click",this.onMenuIconClick),this.navLinks=this.header.querySelectorAll("nav ul li a"),this.navLinks.forEach(e=>e.addEventListener("click",this.onNavLinkClick)),document.addEventListener("keydown",this.onKeydown))}openMenu(){this.header.classList.add("menu-open"),this.menuIcon.setAttribute("aria-expanded","true"),this.menuIcon.setAttribute("aria-label","Close menu"),document.body.style.overflow="hidden"}closeMenu(){this.header.classList.remove("menu-open"),this.menuIcon&&(this.menuIcon.setAttribute("aria-expanded","false"),this.menuIcon.setAttribute("aria-label","Open menu")),document.body.style.overflow=""}onMenuIconClick(e){e.preventDefault(),this.header.classList.contains("menu-open")?this.closeMenu():this.openMenu()}onNavLinkClick(){this.closeMenu()}onKeydown(e){e.key==="Escape"&&this.header.classList.contains("menu-open")&&this.closeMenu()}onMouseMove(e){this.lastMouseEvent=e,!this.mouseMoveScheduled&&(this.mouseMoveScheduled=!0,requestAnimationFrame(()=>{this.mouseMoveScheduled=!1,this.processMouseMove(this.lastMouseEvent)}))}processMouseMove(e){if(e){if(e.pageX<=this.navTriggerZone){clearTimeout(this.showNavTimeout),this.header.classList.add("show_menu");return}clearTimeout(this.showNavTimeout),this.showNavTimeout=setTimeout(()=>{const t=this.header.getBoundingClientRect();e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom||this.header.classList.remove("show_menu")},300)}}onHeaderEnter(){clearTimeout(this.showNavTimeout)}onHeaderLeave(){this.showNavTimeout=setTimeout(()=>{this.header.classList.remove("show_menu")},300)}}const $e=`#define time iTime

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
// HDR emission buckets — the parts of the pixel that are fish light vs sea
// glow. In SDR both ride inside \`color\` untouched; when the canvas has real
// HDR headroom, mainImage lifts them past SDR white (uHdrFish / uHdrSea are
// display-luminance multiples, 1.0 = plain SDR) so only the little whale
// reaches the display's peak and the sea keeps a softer fluorescent shelf.
vec3 gFish;
vec3 gSea;

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
mat2 rot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
// Tiny whale: body along x (head +x, tail -x), flukes flat in the xz plane.
// A dorsoventral travelling wave (amplitude growing toward the tail) plus a
// fluke that pitches on the beat make it swim in place. Returns a signed
// distance scaled by s, shrunk a bit since the swim warp bends space.
float whale(vec3 p, float s) {
  p /= s;
  // spine wave — the head barely nods, the tail sweeps up and down
  float beat = time * 2.4;
  float tailness = smoothstep(0.6, -1.6, p.x);
  p.y -= (0.04 + 0.28 * tailness * tailness) * sin(p.x * 1.4 - beat);
  // blunt head flowing into a full chest, tapering into the tail stock
  float d = sdEllip(p - vec3(0.52, 0.02, 0.0), vec3(0.60, 0.38, 0.40));
  d = smin(d, sdEllip(p - vec3(-0.15, 0.0, 0.0), vec3(0.82, 0.33, 0.34)), 0.22);
  d = smin(d, sdEllip(p - vec3(-0.98, 0.04, 0.0), vec3(0.48, 0.13, 0.11)), 0.14);
  // flukes: a swept-back crescent with a trailing notch, pitching on the beat
  vec3 q = p - vec3(-1.42, 0.06, 0.0);
  q.xy = rot2(0.5 * cos(beat + 2.1)) * q.xy;
  q.x += abs(q.z) * 0.45;
  float fl = sdEllip(q, vec3(0.26, 0.04, 0.50));
  fl = max(fl, -sdEllip(q - vec3(-0.30, 0.0, 0.0), vec3(0.18, 0.30, 0.18)));
  d = smin(d, fl, 0.10);
  // pectoral fins: mirrored flat blades, swept back with a slight droop
  vec3 f = vec3(p.x - 0.30, p.y + 0.20, abs(p.z) - 0.28);
  f.xz = rot2(0.85) * f.xz;
  f.yz = rot2(-0.28) * f.yz;
  d = smin(d, sdEllip(f, vec3(0.12, 0.035, 0.26)), 0.07);
  // small raked dorsal fin
  vec3 g = p - vec3(-0.62, 0.32, 0.0);
  g.x += g.y * 0.9;
  d = smin(d, sdEllip(g, vec3(0.16, 0.14, 0.035)), 0.05);
  return d * s * 0.72;
}
void artifact(vec3 p, inout float curDist, inout vec3 glowColor, inout int id) {
    p -= artifactOffset;
    p = artifactRotation * p;
    float dist = whale(p, 0.15);
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
// 360° halo for the artifact light: a pure function of the ray's closest
// approach to the light centre, so the bloom stays perfectly round no matter
// how the whale is shaped or how the marcher steps (the old per-step SDF glow
// picked up the body's elongation as two sideways rays). maxDepth softly
// occludes the halo when geometry sits in front of the light.
vec3 artifactHalo(vec3 eye, vec3 ray, float maxDepth) {
    vec3 toC = artifactOffset - eye;
    float tC = dot(toC, ray);
    if (tC < 0.0) return vec3(0.0);
    float b2 = dot(toC, toC) - tC * tC; // squared distance ray<->light centre
    float occ = smoothstep(-0.6, 0.3, maxDepth - tC);
    // Wider halo: softer gaussian falloff (2.4 → 1.0) and a larger far-field
    // constant (0.06 → 0.18) so the light blooms further into the scene instead
    // of staying a tight hot core.
    float halo = 0.040 / (b2 + 0.6) + 0.32 * exp(-b2 * 0.3);
    return vec3(0.75, 0.55, 0.45) * halo * occ * flicker;
}
void marchObjects(vec3 eye, vec3 ray, float wDepth, inout vec4 color) {
    float dist = 0.0;
    int id;
    vec3 rayPos = eye;
    float depth = 0.0;
    for (int i = 0; i < 100; i++) {
        dist = objects(rayPos, color.rgb, id);
        depth = distance(rayPos, eye);
        if (depth > wDepth) {
            break;
        }
        if (dist < 0.01) {
            vec3 normal = objectsNormal(rayPos, 0.01);
            color = vec4(objectsColor(id, normal, ray), depth);
            color.rgb += artifactHalo(eye, ray, depth);
            gFish = color.rgb; // the fish body and its halo are the emission
            gSea = vec3(0.0);  // the opaque hit covered any water behind it
            return;
        }

        rayPos += ray * dist;
    }
    vec3 halo = artifactHalo(eye, ray, min(depth, wDepth));
    color.rgb += halo;
    gFish += halo;
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
        color += artifactHalo(p, refl, CAM_FAR) * 0.35; // the glow mirrors too
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
            gSea = color.rgb; // reflections, light pool and sheen: sea glow
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
    gFish = vec3(0.0);
    gSea = vec3(0.0);

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
    //   uHdrFish/uHdrSea : HDR luminance multiples for the emission buckets
    //                      (1.0 on SDR; >1 only on an extended-range canvas).
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

    // --- HDR compose -------------------------------------------------------
    // The canvas stores extended-sRGB encoded values, so multiplying an
    // encoded bucket by k lifts its display luminance by ~k^2.4. uHdrFish /
    // uHdrSea arrive as luminance multiples (1.0 in SDR, so this whole block
    // is a no-op there): the whale overdrives to the display's peak while the
    // sea only re-adds its luminous part — dark water must stay dark, only
    // the glints and the light pool fluoresce (荧光海), one shelf below the fish.
    float kF = pow(max(uHdrFish, 1.0), 1.0 / 2.4);
    float kS = pow(max(uHdrSea, 1.0), 1.0 / 2.4);
    float seaW = smoothstep(0.04, 0.30, dot(gSea, vec3(0.299, 0.587, 0.114)));
    col += gFish * 1.12 * (kF - 1.0) + gSea * 1.12 * (kS - 1.0) * seaW;

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
}`,Ve=`// artifact-at-sea.wgsl — WebGPU twin of artifact-at-sea.glsl, used only for
// the HDR path (rgba16float canvas + toneMapping "extended"; idle-ocean.js
// falls back to the GLSL/WebGL2 build everywhere else). Keep the two in sync:
// any scene change in the .glsl must be mirrored here 1:1.
//
// Canvas values are extended-sRGB encoded: 1.0 is SDR white, values above it
// spend the display's HDR headroom (an encoded multiplier k reads as ~k^2.4
// in luminance). WGSL quirks vs the GLSL: params are immutable (locals copy
// them), multi-component swizzles can't be assigned, \`loop\` is reserved, and
// ss() replaces smoothstep so reversed edges keep GLSL semantics.

struct U {
  res   : vec4f, // xy = resolution (px), z = 1, w = iTime (s)
  phase : vec4f, // x uReveal, y uOpaqueMax, z uMode, w uDrain
  aim   : vec4f, // xy = uDir, zw = uMouse
  hdr   : vec4f, // x uHdrFish, y uHdrSea (display-luminance multiples, 1 = SDR)
};
@group(0) @binding(0) var<uniform> uni : U;

const CAM_FAR : f32 = 20.0;
const BACKGROUND : vec3f = vec3f(0.1, 0.1, 0.13);
const WATER_MARCH_ITERATIONS : i32 = 12;
const WATER_NORMAL_ITERATIONS : i32 = 39;
const PI : f32 = 3.14159265359;
const NUM_PARTICLES : i32 = 20;

var<private> ppos : array<vec4f, 20>;
var<private> artifactOffset : vec3f;
var<private> artifactRotation : mat3x3f;
var<private> flicker : f32;
var<private> camFwd : vec3f;
var<private> camUp : vec3f;
// HDR emission buckets — see the .glsl for the full story.
var<private> gFish : vec3f;
var<private> gSea : vec3f;
var<private> time : f32;

// GLSL-parity smoothstep: keeps working with reversed edges.
fn ss(e0 : f32, e1 : f32, x : f32) -> f32 {
  let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
fn rand(n : f32) -> f32 { return fract(sin(n) * 43758.5453123); }
fn hash(n : f32) -> f32 { return fract(sin(n) * 1e4); }
fn noise(x : f32) -> f32 {
  let i = floor(x);
  let f = fract(x);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), u);
}
fn viewMatrix(dir : vec3f, up : vec3f) -> mat4x4f {
  let f = normalize(dir);
  let s = normalize(cross(f, up));
  let u = cross(s, f);
  return mat4x4f(vec4f(s, 0.0), vec4f(u, 0.0), vec4f(-f, 0.0), vec4f(0.0, 0.0, 0.0, 1.0));
}
fn rotationAlign(d : vec3f, z : vec3f) -> mat3x3f {
  let v = cross(z, d);
  let c = dot(z, d);
  let k = 1.0 / (1.0 + c);
  return mat3x3f(
    vec3f(v.x * v.x * k + c,   v.y * v.x * k - v.z, v.z * v.x * k + v.y),
    vec3f(v.x * v.y * k + v.z, v.y * v.y * k + c,   v.z * v.y * k - v.x),
    vec3f(v.x * v.z * k - v.y, v.y * v.z * k + v.x, v.z * v.z * k + c));
}
fn intersectPlane(origin : vec3f, direction : vec3f, planePoint : vec3f, normal : vec3f) -> f32 {
  return clamp(dot(planePoint - origin, normal) / dot(direction, normal), -1.0, 9991999.0);
}
fn calcRay(uv0 : vec2f, fov : f32, aspect : f32) -> vec3f {
  let uv = uv0 * 2.0 - 1.0;
  let d = 1.0 / tan(radians(fov) * 0.5);
  return normalize(vec3f(aspect * uv.x, uv.y, d));
}
fn getWave(position : vec2f, dir : vec2f, speed : f32, frequency : f32, timeshift : f32) -> vec2f {
  let x = dot(dir, position) * frequency + timeshift * speed;
  let wave = exp(sin(x) - 1.0);
  let dist = wave * cos(x);
  return vec2f(wave, -dist);
}
fn heightmap(worldPos : vec2f, iterations : i32) -> f32 {
  let scale = 0.13;
  var p = worldPos * scale;
  let p2 = (artifactOffset.xz - vec2f(0.0, 1.0)) * scale;
  var d = clamp(length(p2 - p) / 0.8, 0.0, 1.0);
  d = (1.0 - ss(0.0, 1.0, d)) * 0.8;
  var angle = 0.0;
  var freq = 5.0;
  var speed = 2.0;
  var weight = 1.9;
  var wave = 0.0;
  var waveScale = 0.0;
  for (var i = 0; i < iterations; i++) {
    let dir = vec2f(cos(angle), sin(angle));
    let res = getWave(p, dir, speed, freq, time);
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
fn waterNormal(p : vec2f, eps : f32) -> vec3f {
  let h = vec2f(eps, 0.0);
  return normalize(vec3f(
    heightmap(p - h.xy, WATER_NORMAL_ITERATIONS) - heightmap(p + h.xy, WATER_NORMAL_ITERATIONS),
    2.0 * eps,
    heightmap(p - h.yx, WATER_NORMAL_ITERATIONS) - heightmap(p + h.yx, WATER_NORMAL_ITERATIONS)));
}
fn smin(a : f32, b : f32, k : f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
fn sdEllip(p : vec3f, r : vec3f) -> f32 {
  let k0 = length(p / r);
  let k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}
fn rot2(a : f32) -> mat2x2f {
  let c = cos(a);
  let s = sin(a);
  return mat2x2f(vec2f(c, -s), vec2f(s, c));
}
// Tiny whale: body along x (head +x, tail -x), flukes flat in the xz plane.
// A dorsoventral travelling wave plus a fluke that pitches on the beat make
// it swim in place; the result shrinks a bit since the warp bends space.
fn whale(p0 : vec3f, s : f32) -> f32 {
  var p = p0 / s;
  // spine wave — the head barely nods, the tail sweeps up and down
  let beat = time * 2.4;
  let tailness = ss(0.6, -1.6, p.x);
  p.y = p.y - (0.04 + 0.28 * tailness * tailness) * sin(p.x * 1.4 - beat);
  // blunt head flowing into a full chest, tapering into the tail stock
  var d = sdEllip(p - vec3f(0.52, 0.02, 0.0), vec3f(0.60, 0.38, 0.40));
  d = smin(d, sdEllip(p - vec3f(-0.15, 0.0, 0.0), vec3f(0.82, 0.33, 0.34)), 0.22);
  d = smin(d, sdEllip(p - vec3f(-0.98, 0.04, 0.0), vec3f(0.48, 0.13, 0.11)), 0.14);
  // flukes: a swept-back crescent with a trailing notch, pitching on the beat
  var q = p - vec3f(-1.42, 0.06, 0.0);
  let qxy = rot2(0.5 * cos(beat + 2.1)) * q.xy;
  q = vec3f(qxy.x, qxy.y, q.z);
  q.x = q.x + abs(q.z) * 0.45;
  var fl = sdEllip(q, vec3f(0.26, 0.04, 0.50));
  fl = max(fl, -sdEllip(q - vec3f(-0.30, 0.0, 0.0), vec3f(0.18, 0.30, 0.18)));
  d = smin(d, fl, 0.10);
  // pectoral fins: mirrored flat blades, swept back with a slight droop
  var f = vec3f(p.x - 0.30, p.y + 0.20, abs(p.z) - 0.28);
  let fxz = rot2(0.85) * f.xz;
  f = vec3f(fxz.x, f.y, fxz.y);
  let fyz = rot2(-0.28) * f.yz;
  f = vec3f(f.x, fyz.x, fyz.y);
  d = smin(d, sdEllip(f, vec3f(0.12, 0.035, 0.26)), 0.07);
  // small raked dorsal fin
  var g = p - vec3f(-0.62, 0.32, 0.0);
  g.x = g.x + g.y * 0.9;
  d = smin(d, sdEllip(g, vec3f(0.16, 0.14, 0.035)), 0.05);
  return d * s * 0.72;
}
fn artifact(p0 : vec3f, curDist : ptr<function, f32>, id : ptr<function, i32>) {
  var p = p0 - artifactOffset;
  p = artifactRotation * p;
  let dist = whale(p, 0.15);
  if (dist < *curDist) {
    *curDist = dist;
    *id = 1;
  }
}
fn particles(p : vec3f, curDist : ptr<function, f32>, id : ptr<function, i32>) {
  // (the GLSL keeps a disabled per-particle glow branch; only the hit test matters)
  for (var i = 0; i < NUM_PARTICLES; i++) {
    let dist = length(p - ppos[i].xyz) - 0.005;
    if (dist < *curDist) {
      *curDist = dist;
      *id = 2;
    }
  }
}
fn objects(p : vec3f, objId : ptr<function, i32>) -> f32 {
  var dist = CAM_FAR;
  artifact(p, &dist, objId);
  particles(p, &dist, objId);
  return dist;
}
fn artifactDist(p0 : vec3f) -> f32 {
  var p = p0 - artifactOffset;
  p = artifactRotation * p;
  return whale(p, 0.15);
}
fn objectsNormal(p : vec3f, eps : f32) -> vec3f {
  let h = vec2f(eps, 0.0);
  return normalize(vec3f(
    artifactDist(p + h.xyy) - artifactDist(p - h.xyy),
    artifactDist(p + h.yxy) - artifactDist(p - h.yxy),
    artifactDist(p + h.yyx) - artifactDist(p - h.yyx)));
}
fn objectsColor(id : i32, normal : vec3f, ray : vec3f) -> vec3f {
  if (id == 1) { // artifact
    let l = dot(normal, normalize(vec3f(0.0, 1.0, 0.5)));
    let hl = mix(0.8, 1.5, l * 0.5 + 0.5);
    return vec3f(0.85, 0.65, 0.55) * hl * flicker;
  }
  if (id == 2) {
    return vec3f(0.85, 0.65, 0.55) * 1.5;
  }
  return vec3f(1.0, 1.0, 0.0); // shouldn't happen
}
// 360° halo for the artifact light — see the .glsl for the derivation.
fn artifactHalo(eye : vec3f, ray : vec3f, maxDepth : f32) -> vec3f {
  let toC = artifactOffset - eye;
  let tC = dot(toC, ray);
  if (tC < 0.0) { return vec3f(0.0); }
  let b2 = dot(toC, toC) - tC * tC; // squared distance ray<->light centre
  let occ = ss(-0.6, 0.3, maxDepth - tC);
  // Wider halo (matches the .glsl): softer gaussian falloff and a larger
  // far-field constant so the light blooms instead of staying a hot core.
  let halo = 0.040 / (b2 + 0.6) + 0.32 * exp(-b2 * 0.3);
  return vec3f(0.75, 0.55, 0.45) * halo * occ * flicker;
}
fn marchObjects(eye : vec3f, ray : vec3f, wDepth : f32, color : ptr<function, vec4f>) {
  var dist = 0.0;
  var id = 0;
  var rayPos = eye;
  var depth = 0.0;
  var c = *color;
  for (var i = 0; i < 100; i++) {
    dist = objects(rayPos, &id);
    depth = distance(rayPos, eye);
    if (depth > wDepth) {
      break;
    }
    if (dist < 0.01) {
      let normal = objectsNormal(rayPos, 0.01);
      c = vec4f(objectsColor(id, normal, ray), depth);
      c = vec4f(c.rgb + artifactHalo(eye, ray, depth), c.w);
      gFish = c.rgb; // the fish body and its halo are the emission
      gSea = vec3f(0.0);
      *color = c;
      return;
    }
    rayPos += ray * dist;
  }
  let halo = artifactHalo(eye, ray, min(depth, wDepth));
  c = vec4f(c.rgb + halo, c.w);
  gFish += halo;
  *color = c;
}
fn waterColor(ray : vec3f, normal : vec3f, p : vec3f) -> vec3f {
  var color = vec3f(0.0);
  let fogDist = length(p - vec3f(0.0, 0.0, -6.0));
  var dist = 0.0;
  var objId = 0;
  let refl = reflect(ray, normal);
  var rayPos = p + refl * dist;
  let dir = normalize(artifactOffset - p);
  if (length(p.xz - artifactOffset.xz) < 8.5 && dot(refl, dir) > -0.25) { // hacky reflection gate
    for (var i = 0; i < 40; i++) {
      dist = objects(rayPos, &objId);
      if (dist < 0.01) {
        let objNormal = objectsNormal(rayPos, 0.001);
        color = objectsColor(objId, objNormal, rayPos);
        break;
      }
      rayPos += refl * dist;
    }
    color += artifactHalo(p, refl, CAM_FAR) * 0.35; // the glow mirrors too
  }
  let fresnel = 0.04 + 0.9 * pow(1.0 - max(0.0, dot(-normal, ray)), 7.0);
  let lightOffset = artifactOffset - p;
  let d = length(lightOffset);
  let r = 14.0;
  var atten = clamp(1.0 - (d * d) / (r * r), 0.0, 1.0);
  atten *= atten;
  let pointLight = vec3f(0.75, 0.55, 0.45) * atten * (1.0 + fresnel) * 0.07;
  let ambient = vec3f(dot(normal, normalize(vec3f(0.0, 1.0, 0.5)))) * max(fresnel, 0.06) * vec3f(0.1, 0.5, 1.0) * 0.85;
  let fog = ss(25.0, 6.0, fogDist) / (fogDist * 0.1);
  return color + (pointLight + ambient) * fog;
}
fn marchWater(eye : vec3f, ray : vec3f, color : ptr<function, vec4f>) {
  let planeNorm = vec3f(0.0, 1.0, 0.0);
  let depth = 3.0;
  let ceilDist = intersectPlane(eye, ray, vec3f(0.0), planeNorm);
  if (dot(planeNorm, ray) > -0.05) {
    *color = vec4f(vec3f(0.0), CAM_FAR);
    return;
  }
  var height = 0.0;
  var rayPos = eye + ray * ceilDist;
  for (var i = 0; i < 80; i++) {
    height = heightmap(rayPos.xz, WATER_MARCH_ITERATIONS) * depth - depth;
    if (rayPos.y - height < 0.1) {
      let w = distance(rayPos, eye);
      let normPos = eye + ray * w;
      let normal = waterNormal(normPos.xz, 0.005);
      let rgb = waterColor(ray, normal, normPos);
      gSea = rgb; // reflections, light pool and sheen: sea glow
      *color = vec4f(rgb, w);
      return;
    }
    rayPos += ray * (rayPos.y - height);
  }
}
fn march(uv : vec2f, camPos : vec3f) -> vec3f {
  let vm = viewMatrix(camFwd, camUp);
  let ray = (vm * vec4f(calcRay(uv, 80.0, uni.res.x / uni.res.y), 1.0)).xyz;
  var color = vec4f(BACKGROUND, CAM_FAR);
  marchWater(camPos, ray, &color);
  let wDepth = color.w;
  marchObjects(camPos, ray, wDepth, &color);
  return color.rgb;
}
fn mainImage(fragCoord : vec2f) -> vec4f {
  let iResolution = uni.res;
  let uReveal = uni.phase.x;
  let uOpaqueMax = uni.phase.y;
  let uMode = uni.phase.z;
  let uDrain = uni.phase.w;
  let uDir = uni.aim.xy;
  let uMouse = uni.aim.zw;
  let uHdrFish = uni.hdr.x;
  let uHdrSea = uni.hdr.y;

  let uv = fragCoord / iResolution.xy;
  gFish = vec3f(0.0);
  gSea = vec3f(0.0);

  // simulate particles
  let emitR = 1.7;
  for (var i = 0; i < NUM_PARTICLES; i++) {
    let t = time * 0.035 + f32(i) * 0.07;
    let gen = floor(t);
    let cycle = fract(t); // \`loop\` is reserved in WGSL
    let pR = rand(gen + f32(i)) * emitR;
    let pA = rand(f32(i)) * PI * 2.0;
    let pxz = vec2f(cos(pA), sin(pA)) * pR + vec2f(0.0, -5.2);
    let h = mix(3.0, 2.3, abs(pR) / emitR);
    ppos[i] = vec4f(pxz.x, mix(-3.5, h, sqrt(cycle)), pxz.y, 0.0);
  }

  // the scene's little whale: a slow turn so it drifts, not spins
  let t = time * 0.16;
  let s = sin(t);
  let c = cos(t);
  artifactRotation = mat3x3f(vec3f(c, 0.0, s), vec3f(0.0, 1.0, 0.0), vec3f(-s, 0.0, c));
  artifactRotation = artifactRotation * rotationAlign(vec3f(0.0, 1.0, 0.0), vec3f(sin(t) * 0.2, 1.0, cos(t) * 0.2 + 0.3));
  artifactOffset = vec3f(sin(time) * 0.4, cos(time * 0.5) * 0.3 - 1.7, -6.0);
  flicker = mix(1.0, 1.1, sin(time * 2.0) * 0.5 + 0.5) + noise(time * 4.0) * -0.1 + 0.05;

  // camera animation
  camFwd = vec3f(0.0, 0.7 + noise(time * 0.8 + 4.0) * 0.08 - 0.04, 1.0);
  camUp = vec3f(noise(time * 1.2) * 0.02 - 0.01, 1.0, 0.0);

  // scene
  var color = march(uv, vec3f(0.0, 1.9, 1.0));

  // vignette
  color -= vec3f((length(uv - 0.5) - 0.3) * 0.05);

  // --- Full-page idle "tide" — mirrors the .glsl overlay ------------------
  let cc = uv - 0.5;
  let aspect = iResolution.x / iResolution.y;

  var field = 0.0;
  if (uMode < 0.5) {
    field = 0.5 + dot(cc, uDir) * 0.92; // sweep from a random direction
  } else if (uMode < 1.5) {
    field = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)) * 2.0; // all sides
  } else {
    field = length(cc * vec2f(aspect, 1.0)) / (0.5 * length(vec2f(aspect, 1.0))); // centre
  }
  field += 0.05 * sin((uv.x + uv.y) * 9.0 + time * 1.10)
         + 0.03 * sin((uv.x - uv.y) * 16.0 - time * 0.70);

  let front = uReveal * 1.22 - 0.11;
  let washed = ss(front + 0.12, front - 0.06, field);
  let foam = ss(0.05, 0.0, abs(field - front)) * washed;
  let settle = ss(0.0, 0.55, uReveal);

  var col = color * 1.12;
  col += vec3f(0.80, 0.90, 1.0) * foam * 0.22 * (1.0 - uReveal * 0.5);

  // --- HDR compose — mirrors the .glsl -------------------------------------
  let kF = pow(max(uHdrFish, 1.0), 1.0 / 2.4);
  let kS = pow(max(uHdrSea, 1.0), 1.0 / 2.4);
  let seaW = ss(0.04, 0.30, dot(gSea, vec3f(0.299, 0.587, 0.114)));
  col += gFish * 1.12 * (kF - 1.0) + gSea * 1.12 * (kS - 1.0) * seaW;

  var waterA = clamp(washed * settle, 0.0, 1.0);

  let mrel = (uv - uMouse) * vec2f(aspect, 1.0);
  let dM = length(mrel);
  let warp = 0.07 * sin(uv.x * 13.0 + time * 0.7)
           + 0.06 * sin(uv.y * 17.0 - time * 0.5)
           + 0.04 * sin((uv.x + uv.y) * 9.0 + time * 0.9);
  let cut = ss(0.09, -0.09, dM - uDrain * 2.3 + warp); // 1 cleared -> 0 water
  waterA *= (1.0 - cut);

  let alpha = waterA * uOpaqueMax;
  return vec4f(col, clamp(alpha, 0.0, 1.0));
}

@vertex
fn vmain(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4f {
  var p = vec2f(-1.0, -1.0);
  if (vi == 1u) { p = vec2f(3.0, -1.0); }
  if (vi == 2u) { p = vec2f(-1.0, 3.0); }
  return vec4f(p, 0.0, 1.0);
}

@fragment
fn fmain(@builtin(position) pos : vec4f) -> @location(0) vec4f {
  time = uni.res.w;
  // WebGPU fragCoord is y-down; the GLSL scene expects GL's y-up origin.
  let fragCoord = vec2f(pos.x, uni.res.y - pos.y);
  let c = mainImage(fragCoord);
  // The vignette can push the sky slightly negative; an 8-bit canvas clamps
  // that for free but float16 would hand the compositor out-of-gamut values.
  let rgb = max(c.rgb, vec3f(0.0));
  return vec4f(rgb * c.a, c.a); // premultiplied-alpha canvas
}
`,Ye="(min-width: 1099px)",Xe="(prefers-reduced-motion: reduce)",Ke=8e3,Ze=30,Qe=3.4,Je=1.3,ve=.55,ge=1100,ye=1,et=3,tt=1.7;function nt(){return/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className||"")}function X(o){return Math.max(0,Math.min(1,o))}function ne(o){return o*o*(3-2*o)}const it=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,st=`#version 300 es
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
${$e}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class ot{constructor(){nt()&&(this.mq=window.matchMedia(Ye),this.reduce=window.matchMedia(Xe),this.dyn=window.matchMedia("(dynamic-range: high)"),this.canvas=null,this.gl=null,this.gpu=null,this.backend="webgl",this.ready=!1,this.initPromise=null,this.hdrFish=1,this.hdrSea=1,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=ye,this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.onDynChange=this.onDynChange.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.dyn.addEventListener("change",this.onDynChange),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}onDynChange(){this.canvas&&(this.disable(),this.apply())}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e),this.canvas=e,this.ready=!1,this.initPromise=this.initBackend().then(t=>t?this.canvas?(this.ready=!0,this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle(),!0):(this.destroyGpu(),!1):(this.disable(),!1))}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null,this.destroyGpu(),this.ready=!1}async initBackend(){if(this.dyn.matches&&!!navigator.gpu){try{if(await this.buildGpu())return this.backend="webgpu",this.hdrFish=et,this.hdrSea=tt,!0}catch(t){console.warn("[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:",t)}this.destroyGpu(),this.freshCanvas()}return this.canvas?(this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.buildGl()):!1}freshCanvas(){if(!this.canvas)return;const e=this.canvas.cloneNode(!1);this.canvas.replaceWith(e),this.canvas=e}destroyGpu(){if(!this.gpu)return;const e=this.gpu;this.gpu=null;try{e.device.destroy()}catch{}}async buildGpu(){const e=await navigator.gpu.requestAdapter();if(!e)return!1;const t=await e.requestDevice(),n=this.canvas&&this.canvas.getContext("webgpu");if(!n)return t.destroy(),!1;n.configure({device:t,format:"rgba16float",colorSpace:"srgb",toneMapping:{mode:"extended"},alphaMode:"premultiplied"});const s=typeof n.getConfiguration=="function"?n.getConfiguration():null;if(!s||!s.toneMapping||s.toneMapping.mode!=="extended")return t.destroy(),!1;const i=t.createShaderModule({code:Ve}),a=await i.getCompilationInfo();if(a.messages.some(p=>p.type==="error")){for(const p of a.messages)console.warn("[idle-ocean] wgsl "+p.lineNum+":"+p.linePos+" "+p.message);return t.destroy(),!1}const r=t.createRenderPipeline({layout:"auto",vertex:{module:i,entryPoint:"vmain"},fragment:{module:i,entryPoint:"fmain",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}}),d=t.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=t.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:d}}]});return this.gpu={device:t,ctx:n,pipeline:r,ubuf:d,bind:l,u:new Float32Array(16)},t.lost.then(p=>{this.gpu&&this.canvas&&(console.warn("[idle-ocean] WebGPU device lost ("+p.reason+"), falling back to WebGL"),this.gpu=null,this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.freshCanvas(),this.buildGl()?this.resize():this.disable())}),!0}buildGl(){const e=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1});if(!e)return!1;this.gl=e;const t=(r,d)=>{const l=e.createShader(r);return e.shaderSource(l,d),e.compileShader(l),e.getShaderParameter(l,e.COMPILE_STATUS)?l:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(l)),null)},n=t(e.VERTEX_SHADER,it),s=t(e.FRAGMENT_SHADER,st);if(!n||!s)return!1;const i=e.createProgram();if(e.attachShader(i,n),e.attachShader(i,s),e.bindAttribLocation(i,0,"p"),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(i)),!1;e.useProgram(i),this.prog=i;const a=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,a),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(i,"iResolution"),this.uTime=e.getUniformLocation(i,"iTime"),this.uReveal=e.getUniformLocation(i,"uReveal"),this.uOpaque=e.getUniformLocation(i,"uOpaqueMax"),this.uMode=e.getUniformLocation(i,"uMode"),this.uDir=e.getUniformLocation(i,"uDir"),this.uDrain=e.getUniformLocation(i,"uDrain"),this.uMouse=e.getUniformLocation(i,"uMouse"),this.uHdrFish=e.getUniformLocation(i,"uHdrFish"),this.uHdrSea=e.getUniformLocation(i,"uHdrSea"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let t=Math.round(window.innerWidth*e*ve),n=Math.round(window.innerHeight*e*ve);const s=Math.max(t,n);if(s>ge){const i=ge/s;t=Math.round(t*i),n=Math.round(n*i)}t=Math.max(1,t),n=Math.max(1,n),(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.gl&&this.gl.viewport(0,0,t,n))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},Ke))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const t=Math.random()*Math.PI*2;this.dir=[Math.cos(t),Math.sin(t)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e-this.lastTick<1e3/Ze))return;const t=(e-this.lastTick)/1e3;if(this.lastTick=e,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+t/Qe),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+t/Je),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.renderFrame(e),this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){if(!this.ready||!this.canvas)return;const t=((e||performance.now())-this.startTime)/1e3;if(this.backend==="webgpu"&&this.gpu){this.renderGpu(t);return}const n=this.gl;n&&(n.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),n.uniform1f(this.uTime,t),n.uniform1f(this.uReveal,ne(X(this.reveal))),n.uniform1f(this.uOpaque,this.opaqueMax),n.uniform1f(this.uMode,this.mode),n.uniform2f(this.uDir,this.dir[0],this.dir[1]),n.uniform1f(this.uDrain,ne(X(this.drain))),n.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),n.uniform1f(this.uHdrFish,this.hdrFish),n.uniform1f(this.uHdrSea,this.hdrSea),n.drawArrays(n.TRIANGLES,0,3))}renderGpu(e){const{device:t,ctx:n,pipeline:s,ubuf:i,bind:a,u:r}=this.gpu;r[0]=this.canvas.width,r[1]=this.canvas.height,r[2]=1,r[3]=e,r[4]=ne(X(this.reveal)),r[5]=this.opaqueMax,r[6]=this.mode,r[7]=ne(X(this.drain)),r[8]=this.dir[0],r[9]=this.dir[1],r[10]=this.mouse[0],r[11]=this.mouse[1],r[12]=this.hdrFish,r[13]=this.hdrSea,t.queue.writeBuffer(i,0,r);const d=t.createCommandEncoder(),l=d.beginRenderPass({colorAttachments:[{view:n.getCurrentTexture().createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]});l.setPipeline(s),l.setBindGroup(0,a),l.draw(3),l.end(),t.queue.submit([d.finish()])}debugSet(e={}){this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=X(e.reveal)),typeof e.drain=="number"&&(this.drain=X(e.drain)),typeof e.hdrFish=="number"&&(this.hdrFish=e.hdrFish),typeof e.hdrSea=="number"&&(this.hdrSea=e.hdrSea),this.startTime||(this.startTime=performance.now());const t=()=>{this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now())};return this.ready?t():this.initPromise&&this.initPromise.then(n=>{n&&this.paused&&t()}),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode,backend:this.backend,hdrFish:this.hdrFish,hdrSea:this.hdrSea}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=ye,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}function at(){const o=document.querySelector(".signal");if(!o)return;const e=(o.getAttribute("data-audiobase")||"").replace(/\/$/,""),t=new Audio;let n=null,s=[],i=0,a=null;const r=v=>`${e}/${v}.m4a`,d=v=>Array.from(o.querySelectorAll(`[data-id="${CSS.escape(v)}"]`)),l=(v,b)=>d(v).forEach(S=>S.classList.toggle("playing",b));function p(v){const b=v==="featured"?"#sec-featured .has-audio":`#sec-${v} .drow.has-audio`,S=[],O={};return o.querySelectorAll(b).forEach(K=>{const F=K.dataset.id;F&&!O[F]&&(O[F]=1,S.push(F))}),S}function m(){o.querySelectorAll(".secplay").forEach(v=>{const b=a&&v.dataset.scope===a;v.classList.toggle("playing",b);const S=v.querySelector(".t");S&&(S.textContent=b?"暂停":"连播")})}function u(v){n&&l(n,!1),n=v,l(v,!0),t.src=r(v);const b=t.play();b&&b.catch&&b.catch(()=>{})}function y(v){s=p(v),i=0,a=v,m(),s.length&&u(s[0])}function T(){a=null,s=[],m(),t.pause(),n&&(l(n,!1),n=null)}t.addEventListener("ended",()=>{if(a&&(i++,i<s.length)){u(s[i]);return}a=null,m(),n&&(l(n,!1),n=null)}),o.querySelectorAll(".pkey").forEach(v=>{v.addEventListener("click",b=>{b.preventDefault(),b.stopPropagation();const S=v.dataset.id;if(n===S&&!t.paused){t.pause(),l(S,!1),n=null,a=null,m();return}a=null,m(),u(S)})}),o.querySelectorAll(".secplay").forEach(v=>{v.addEventListener("click",()=>{const b=v.dataset.scope;if(a===b&&!t.paused){T();return}y(b)})}),o.querySelectorAll(".mcard").forEach(v=>{v.addEventListener("click",b=>{b.target.closest(".pkey")||b.target.closest("a")||v.classList.toggle("open")})}),o.querySelectorAll(".drow").forEach(v=>{const b=v.querySelector(".drow__head");b&&b.addEventListener("click",S=>{S.target.closest(".pkey")||S.target.closest("a")||v.classList.toggle("open")})});const x=[].slice.call(o.querySelectorAll(".dpill")),_=v=>{const b=v.getBoundingClientRect().top+window.pageYOffset-70;window.scrollTo({top:Math.max(0,b),behavior:"smooth"})};function H(v,b){o.setAttribute("data-view",v),x.forEach(S=>S.classList.toggle("active",S.dataset.sec===b))}if(x.forEach(v=>{v.addEventListener("click",b=>{b.preventDefault();const S=v.dataset.sec;if(S==="featured")H("featured","featured"),_(o);else{H("news",S);const O=o.querySelector("#sec-"+S);O&&_(O)}})}),(o.getAttribute("data-view")||"featured")==="featured")H("featured","featured");else{const v=o.querySelector(".dpaper .dsec");H("news",v?v.id.replace("sec-",""):null)}}class rt{constructor(){this.init()}init(){document.addEventListener("mouseover",e=>{e.target.tagName==="A"&&this.showTooltip(e.target)}),document.addEventListener("mouseout",e=>{e.target.tagName==="A"&&this.hideTooltip()})}showTooltip(e){const t=e.getAttribute("data-title");if(!t||t==="")return;const n=document.createElement("span");n.className="tooltip",n.textContent=t,e.parentNode.insertBefore(n,e.nextSibling);const s=n.offsetWidth,i=e.offsetWidth,a=e.offsetHeight+3+4;let r=s;s<i&&(r=i,n.style.width=r+"px");const d=-(r-i)/2;n.style.left=d+"px",n.style.bottom=a+"px",setTimeout(()=>{n.style.opacity="1"},10)}hideTooltip(){document.querySelectorAll(".tooltip").forEach(t=>{t.remove()})}}class lt{constructor(){this.mapElement=document.getElementById("map"),this.init()}init(){this.mapElement&&(this.adjustMapLayout(),window.addEventListener("resize",()=>{this.adjustMapLayout()}))}adjustMapLayout(){const e=document.querySelector("header"),t=window.innerHeight,n=window.innerWidth;if(!e)return;const s=e.offsetWidth+50,i=this.mapElement.offsetWidth;this.mapElement.style.maxWidth=i+"px",this.mapElement.style.height=t+"px",n>1100?this.mapElement.style.marginLeft=s+"px":this.mapElement.style.marginLeft="0"}}class ct{constructor(){this.overlay=null,this.zoomImg=null,this.hint=null,this.scale=1,this.minScale=.2,this.maxScale=6,this.lastPos={x:0,y:0},this.origin={x:0,y:0},this.dragging=!1,this.wheelTimeout=null,this.init()}init(){this.bindImages(),new MutationObserver(t=>{for(let n=0;n<t.length;n++)if(t[n].addedNodes.length){this.bindImages();break}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}buildOverlay(){this.overlay=document.createElement("div"),this.overlay.id="image-zoom-overlay",this.overlay.className="fade-in",this.overlay.innerHTML=`
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `,document.body.appendChild(this.overlay),this.zoomImg=this.overlay.querySelector(".image-zoom-img"),this.hint=this.overlay.querySelector(".image-zoom-hint"),this.bindOverlayEvents()}openOverlay(e){this.overlay||this.buildOverlay(),this.overlay.style.display="flex",this.zoomImg.src=e,this.scale=1,this.lastPos.x=0,this.lastPos.y=0,this.applyTransform(),this.hint&&(this.hint.style.opacity="1",this.hint.style.transition="opacity .5s",clearTimeout(this.hint._hideTimer),this.hint._hideTimer=setTimeout(()=>{this.hint.style.opacity="0"},3e3))}closeOverlay(){this.overlay&&(this.overlay.style.display="none",this.zoomImg.src="")}applyTransform(){this.zoomImg.style.transform=`translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`}onWheel(e){e.preventDefault();const t=this.zoomImg.getBoundingClientRect(),n=e.clientX-t.left-t.width/2,s=e.clientY-t.top-t.height/2,i=e.deltaY>0?-.12:.12,a=Math.max(this.minScale,Math.min(this.maxScale,this.scale+i)),r=a/this.scale;this.lastPos.x=(this.lastPos.x+n)*r-n,this.lastPos.y=(this.lastPos.y+s)*r-s,this.scale=a,this.applyTransform(),this.hint&&(this.hint.style.opacity="0.3",clearTimeout(this.wheelTimeout),this.wheelTimeout=setTimeout(()=>{this.hint.style.opacity="1"},400))}onMouseDown(e){e.button===0&&(this.dragging=!0,this.origin.x=e.clientX,this.origin.y=e.clientY,this.overlay.style.cursor="grabbing")}onMouseMove(e){if(!this.dragging)return;const t=e.clientX-this.origin.x,n=e.clientY-this.origin.y;this.origin.x=e.clientX,this.origin.y=e.clientY,this.lastPos.x+=t,this.lastPos.y+=n,this.applyTransform()}onMouseUp(){this.dragging=!1,this.overlay&&(this.overlay.style.cursor="default")}onDblClick(){this.closeOverlay()}onKey(e){e.key==="Escape"&&this.overlay&&this.overlay.style.display==="flex"&&this.closeOverlay()}bindOverlayEvents(){this.zoomImg.addEventListener("wheel",e=>this.onWheel(e),{passive:!1}),this.zoomImg.addEventListener("mousedown",e=>this.onMouseDown(e)),this.zoomImg.addEventListener("dblclick",()=>this.onDblClick()),window.addEventListener("mousemove",e=>this.onMouseMove(e)),window.addEventListener("mouseup",()=>this.onMouseUp()),window.addEventListener("keydown",e=>this.onKey(e)),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.closeOverlay()})}bindImages(){const e="article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img";document.querySelectorAll(e).forEach(n=>{n.classList.contains("image-zoomable")||(n.classList.add("image-zoomable"),n.style.cursor="zoom-in",n.addEventListener("click",()=>{this.openOverlay(n.getAttribute("data-origin")||n.src)}))})}}class dt{constructor(){this.initializeEmbeds()}initializeEmbeds(){this.processTextNodes(document.body),this.processCodeBlocks(),this.processMarkdownSyntax()}processTextNodes(e){["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(e.tagName)||(e.nodeType===Node.TEXT_NODE?this.processTextNode(e):Array.from(e.childNodes).forEach(t=>{this.processTextNodes(t)}))}processTextNode(e){const t=e.textContent,n=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let s;const i=[];for(;(s=n.exec(t))!==null;)i.push({fullMatch:s[0],shaderID:s[1],index:s.index});i.length>0&&this.replaceWithIframes(e,i)}processCodeBlocks(){document.querySelectorAll("code, pre").forEach(t=>{const n=t.textContent,s=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let i;for(;(i=s.exec(n))!==null;){const a=n.trim();if(a===i[0]||a===i[0].replace(/\?.*$/,"")){this.replaceElementWithIframe(t,i[1]);break}}})}replaceWithIframes(e,t){const n=e.parentNode;if(!n)return;const s=e.textContent,i=[];let a=0;t.sort((d,l)=>l.index-d.index),t.reverse().forEach(d=>{d.index>a&&i.unshift({type:"text",content:s.substring(a,d.index)}),i.unshift({type:"iframe",shaderID:d.shaderID,originalURL:d.fullMatch}),a=d.index+d.fullMatch.length}),a<s.length&&i.unshift({type:"text",content:s.substring(a)});const r=[];i.forEach(d=>{if(d.type==="text"&&d.content.trim())r.push(document.createTextNode(d.content));else if(d.type==="iframe"){const l=this.createShaderToyEmbed(d.shaderID,d.originalURL);r.push(l)}}),r.forEach(d=>{n.insertBefore(d,e)}),n.removeChild(e)}replaceElementWithIframe(e,t){const n=this.createShaderToyEmbed(t);e.parentNode.replaceChild(n,e)}createShaderToyEmbed(e,t=null){const n=document.createElement("div");n.className="shadertoy-embed-container",n.style.cssText=`
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
        `,n.addEventListener("mouseenter",()=>{n.style.transform="translateY(-3px)",n.style.boxShadow="0 12px 35px rgba(0,0,0,0.4)"}),n.addEventListener("mouseleave",()=>{n.style.transform="translateY(0)",n.style.boxShadow="0 8px 25px rgba(0,0,0,0.3)"});const s=document.createElement("div");s.className="shadertoy-embed-header",s.style.cssText=`
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        `;const i=document.createElement("div");i.style.cssText=`
            display: flex;
            align-items: center;
            gap: 10px;
        `;const a=document.createElement("span");a.innerHTML="🎨",a.style.cssText=`
            font-size: 20px;
            filter: drop-shadow(0 0 5px rgba(255,215,0,0.5));
        `;const r=document.createElement("span");r.textContent=`ShaderToy: ${e}`,r.style.cssText=`
            color: #ffd700;
            font-weight: bold;
            font-size: 16px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        `,i.appendChild(a),i.appendChild(r);const d=document.createElement("div");d.style.cssText=`
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
        `,l.addEventListener("mouseenter",()=>{l.style.background="#66b3ff",l.style.color="#000",l.style.transform="translateY(-1px)"}),l.addEventListener("mouseleave",()=>{l.style.background="rgba(102,179,255,0.1)",l.style.color="#66b3ff",l.style.transform="translateY(0)"}),d.appendChild(l),s.appendChild(i),s.appendChild(d);const p=document.createElement("div");p.style.cssText=`
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 50%; /* 2:1 aspect ratio */
            border-radius: 8px;
            overflow: hidden;
            background: #000;
        `;const m=document.createElement("iframe");m.src=`https://www.shadertoy.com/embed/${e}?gui=true&t=10&paused=false&muted=false`,m.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `,m.allowFullscreen=!0,m.loading="lazy";const u=document.createElement("div");u.innerHTML=`
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
        `;const y=document.createElement("style");return y.textContent=`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `,document.head.appendChild(y),m.addEventListener("load",()=>{u.style.display="none"}),p.appendChild(m),p.appendChild(u),n.appendChild(s),n.appendChild(p),n}processMarkdownSyntax(){const e=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(s){var a;const i=(a=s.parentElement)==null?void 0:a.tagName;return["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(i)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[];let n;for(;n=e.nextNode();)t.push(n);t.forEach(s=>{const i=s.textContent,a=/\[(shader|shadertoy):(\w+)\]/g;let r;const d=[];for(;(r=a.exec(i))!==null;)d.push({fullMatch:r[0],shaderID:r[2],index:r.index});d.length>0&&this.replaceMarkdownSyntax(s,d)})}replaceMarkdownSyntax(e,t){const n=e.parentNode;if(!n)return;const s=e.textContent,i=[];let a=0;t.sort((d,l)=>l.index-d.index),t.reverse().forEach(d=>{d.index>a&&i.unshift({type:"text",content:s.substring(a,d.index)}),i.unshift({type:"iframe",shaderID:d.shaderID,originalURL:null}),a=d.index+d.fullMatch.length}),a<s.length&&i.unshift({type:"text",content:s.substring(a)});const r=[];i.forEach(d=>{if(d.type==="text"&&d.content.trim())r.push(document.createTextNode(d.content));else if(d.type==="iframe"){const l=this.createShaderToyEmbed(d.shaderID,d.originalURL);r.push(l)}}),r.forEach(d=>{n.insertBefore(d,e)}),n.removeChild(e)}}function be(o){return!!o.tagName&&/^H[1-6]$/.test(o.tagName)}function we(o){return parseInt(o.tagName.charAt(1),10)}function ht(o){return!o||typeof o.closest!="function"?!1:!!o.closest('a, button, input, textarea, select, summary, [contenteditable="true"]')}function de(o){if(!be(o))return;const e=we(o),t=o.classList.contains("collapsed")?[e]:[];let n=o.nextElementSibling;for(;n;){if(be(n)){const s=we(n);if(s<=e)break;for(;t.length&&t[t.length-1]>=s;)t.pop();n.style.display=t.length?"none":"",n.classList.contains("collapsed")&&t.push(s)}else n.classList&&n.classList.contains("tags")?n.style.display="":n.style.display=t.length?"none":"";n=n.nextElementSibling}}class ut{constructor(){this.init()}init(){const e=document.querySelector(".content");if(!e)return;e.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(n=>{n.classList.add("collapsible-heading");const s=document.createElement("span");s.className="collapse-button",n.insertBefore(s,n.firstChild),s.addEventListener("click",i=>{i.stopPropagation(),this.toggleCollapse(n)}),n.addEventListener("click",i=>{ht(i.target)||this.toggleCollapse(n)})})}toggleCollapse(e){e.classList.toggle("collapsed"),de(e)}}class ft{constructor(){this.init()}init(){this.initCodeBlockExpansion(),new MutationObserver(t=>{let n=!1;t.forEach(s=>{s.addedNodes.length>0&&s.addedNodes.forEach(i=>{i.nodeType===1&&(i.matches("figure.highlight")||i.querySelector("figure.highlight"))&&(n=!0)})}),n&&setTimeout(()=>this.initCodeBlockExpansion(),100)}).observe(document.body,{childList:!0,subtree:!0})}initCodeBlockExpansion(){document.querySelectorAll("figure.highlight").forEach(t=>{if(t.closest(".code-block-container"))return;const n=t.querySelector("table");if(n){const l=n.querySelector("td.code");if(l){const p=document.createElement("pre");p.className="code",p.innerHTML=l.innerHTML,t.innerHTML="",t.appendChild(p)}}const s=t.querySelector("pre.code");if(!s)return;const i=s.scrollHeight,a=400,r=document.createElement("div");r.className="code-buttons";const d=document.createElement("button");if(d.className="copy-code-button",d.textContent="复制代码",d.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),this.copyCodeToClipboard(s,d)}),r.appendChild(d),i>a){const l=document.createElement("div");l.className="code-block-container collapsed",t.parentNode.insertBefore(l,t),l.appendChild(t);const p=document.createElement("button");p.className="expand-button",p.textContent="展开代码",r.appendChild(p),l.appendChild(r),p.addEventListener("click",()=>{l.classList.contains("collapsed")&&this.showFullscreenCode(t)})}else{const l=document.createElement("div");l.className="code-block-container",t.parentNode.insertBefore(l,t),l.appendChild(t),l.appendChild(r)}})}showFullscreenCode(e){const t=document.createElement("div");t.className="code-fullscreen-modal active";const n=document.createElement("div");n.className="code-fullscreen-content";const i=(e.closest(".code-block-container")||e).cloneNode(!0);i.querySelectorAll(".code-buttons, .copy-code-button, .expand-button").forEach(u=>{u.parentNode&&u.parentNode.removeChild(u)});const r=i.classList.contains("code-block-container")?i:i.querySelector(".code-block-container");r&&(r.classList.remove("collapsed"),r.style.margin="0");const d=(r||i).querySelector("pre.code");d&&(d.scrollTop=0),n.appendChild(i);const l=document.createElement("button");l.className="close-fullscreen",l.textContent="关闭",n.appendChild(l),t.appendChild(n),document.body.appendChild(t),document.body.style.overflow="hidden";const p=()=>{document.body.removeChild(t),document.body.style.overflow=""};l.addEventListener("click",p),t.addEventListener("click",u=>{u.target===t&&p()});const m=u=>{u.key==="Escape"&&(p(),document.removeEventListener("keydown",m))};document.addEventListener("keydown",m)}copyCodeToClipboard(e,t){const n=e.textContent||e.innerText;navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(n).then(()=>{this.showCopySuccess(t)}).catch(s=>{console.error("复制失败:",s),this.fallbackCopy(n,t)}):this.fallbackCopy(n,t)}fallbackCopy(e,t){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="2em",n.style.height="2em",n.style.padding="0",n.style.border="none",n.style.outline="none",n.style.boxShadow="none",n.style.background="transparent",document.body.appendChild(n),n.focus(),n.select();try{document.execCommand("copy")&&this.showCopySuccess(t)}catch(s){console.error("复制失败:",s)}document.body.removeChild(n)}showCopySuccess(e){const t=e.textContent;e.classList.add("copied"),e.textContent="已复制 ✓",setTimeout(()=>{e.classList.remove("copied"),e.textContent=t},2e3)}}const xe=1.2,Ee=1.15,pt=.2,mt=50,vt="canvas-arrow-modal-",gt=4,yt="canvas-layout:v1";let Se=0;function Le(){return(document.documentElement.lang||"").toLowerCase().startsWith("zh")?{open:"点击放大查看画布",close:"关闭",hint:"拖动节点 · 拖动画布 · 滚轮缩放",zoomOut:"缩小",resetView:"重置视图",zoomIn:"放大",resetLayout:"恢复节点原始位置",resetLayoutText:"复原节点"}:{open:"Open interactive canvas",close:"Close",hint:"Drag nodes · Pan canvas · Scroll to zoom",zoomOut:"Zoom out",resetView:"Reset view",zoomIn:"Zoom in",resetLayout:"Restore original node positions",resetLayoutText:"Reset nodes"}}class bt{constructor(){const e=document.querySelectorAll(".canvas-embed:not(.canvas-embed--error)");if(e.length)for(const t of e)this.attach(t)}attach(e){const t=Le();e.setAttribute("role","button"),e.setAttribute("tabindex","0"),e.setAttribute("aria-label",t.open),e.addEventListener("click",n=>{n.target.closest("a")||(n.preventDefault(),this.openModal(e))}),e.addEventListener("keydown",n=>{n.target.closest("a")||(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),this.openModal(e))})}openModal(e){const t=e.querySelector(".canvas-svg");if(!t)return;const n=Le(),s=t.cloneNode(!0);xt(s),s.classList.add("canvas-modal__svg");const i=document.createElement("div");i.className="canvas-modal",i.innerHTML=`
      <div class="canvas-modal__overlay" aria-hidden="true"></div>
      <div class="canvas-modal__inner" role="dialog" aria-modal="true" aria-label="${n.open}">
        <button class="canvas-modal__close" type="button" aria-label="${n.close}">×</button>
        <div class="canvas-modal__viewport"></div>
        <div class="canvas-modal__hint" aria-hidden="true">${n.hint}</div>
        <div class="canvas-modal__controls">
          <button class="canvas-modal__btn" data-action="zoom-out" type="button" aria-label="${n.zoomOut}">−</button>
          <button class="canvas-modal__btn" data-action="reset" type="button" aria-label="${n.resetView}">↺</button>
          <button class="canvas-modal__btn" data-action="zoom-in" type="button" aria-label="${n.zoomIn}">+</button>
          <button class="canvas-modal__btn canvas-modal__btn--wide" data-action="reset-layout" type="button" aria-label="${n.resetLayout}">${n.resetLayoutText}</button>
        </div>
      </div>
    `,i.querySelector(".canvas-modal__viewport").appendChild(s),document.body.appendChild(i),document.body.classList.add("canvas-modal-open");const a=wt(e,s),r=new St(s,a),d=i.querySelector(".canvas-modal__close");d.focus();const l=m=>{if(m.key==="Escape"){p();return}if(m.key!=="Tab")return;const u=Array.from(i.querySelectorAll("button, a[href]")).filter(x=>!x.hasAttribute("disabled")&&x.getClientRects().length>0);if(!u.length)return;const y=u[0],T=u[u.length-1];m.shiftKey&&document.activeElement===y?(m.preventDefault(),T.focus()):!m.shiftKey&&document.activeElement===T&&(m.preventDefault(),y.focus())},p=()=>{r.destroy(),i.remove(),document.body.classList.remove("canvas-modal-open"),document.removeEventListener("keydown",l),e.focus({preventScroll:!0})};d.addEventListener("click",p),i.querySelector(".canvas-modal__overlay").addEventListener("click",p),document.addEventListener("keydown",l),i.querySelectorAll(".canvas-modal__btn").forEach(m=>{m.addEventListener("click",()=>{const u=m.dataset.action;u==="zoom-in"?r.zoomBy(xe):u==="zoom-out"?r.zoomBy(1/xe):u==="reset"?r.reset():u==="reset-layout"&&r.resetLayout()})})}}function wt(o,e){const t=o.dataset.canvasSlug||"canvas",n=e.dataset.canvasRevision||"legacy";return`${yt}:${t}:${n}`}function xt(o){const e=o.querySelector("marker[id]");if(!e)return;Se+=1;const t=e.id,n=`${vt}${Se}`;e.id=n,o.querySelectorAll("[marker-end]").forEach(s=>{s.getAttribute("marker-end")===`url(#${t})`&&s.setAttribute("marker-end",`url(#${n})`)})}class Et{constructor(e,t){this.svg=e,this.storageKey=t,this.nodes=new Map,this.edges=[],this.connections=new Map;const n=e.viewBox.baseVal;this.maxStoredOffset=Math.max(n.width,n.height)*4,e.querySelectorAll(".canvas-node[data-id]").forEach(s=>{const i=s.dataset.id;!i||this.nodes.has(i)||(this.nodes.set(i,{id:i,element:s,x:ie(s.dataset.x),y:ie(s.dataset.y),width:ie(s.dataset.width,200),height:ie(s.dataset.height,80),dx:0,dy:0,baseTransform:s.getAttribute("transform")||""}),this.connections.set(i,[]))}),e.querySelectorAll(".canvas-edge-group[data-from-node][data-to-node]").forEach(s=>{const i={element:s,fromNode:s.dataset.fromNode,toNode:s.dataset.toNode,fromSide:s.dataset.fromSide||"right",toSide:s.dataset.toSide||"left"};!this.nodes.has(i.fromNode)||!this.nodes.has(i.toNode)||(this.edges.push(i),this.connections.get(i.fromNode).push(i),this.connections.get(i.toNode).push(i))}),this.removeStaleLayouts(),this.restore(),this.updateEdges(this.edges)}beginDrag(e){const t=this.nodes.get(e.dataset.id);if(!t)return null;const n=this.dragRecords(t).map(s=>({record:s,dx:s.dx,dy:s.dy}));return t.element.classList.add("is-dragging"),{primary:t,records:n}}dragRecords(e){if(!e.element.classList.contains("canvas-node--group"))return[e];const t=e.x+e.dx,n=e.y+e.dy,s=t+e.width,i=n+e.height,a=[e];return this.nodes.forEach(r=>{if(r===e)return;const d=r.x+r.dx+r.width/2,l=r.y+r.dy+r.height/2;d>=t&&d<=s&&l>=n&&l<=i&&a.push(r)}),a}moveDrag(e,t,n){const s=new Set;e.records.forEach(i=>{this.setOffset(i.record,i.dx+t,i.dy+n),this.connections.get(i.record.id).forEach(a=>s.add(a))}),this.updateEdges(s)}finishDrag(e,t){e&&(t&&this.moveDrag(e,0,0),e.primary.element.classList.remove("is-dragging"),t||this.persist())}setOffset(e,t,n){e.dx=t,e.dy=n;const s=t||n?`translate(${D(t)} ${D(n)})`:"",i=[e.baseTransform,s].filter(Boolean).join(" ");i?e.element.setAttribute("transform",i):e.element.removeAttribute("transform")}updateEdges(e){e.forEach(t=>{const n=this.nodes.get(t.fromNode),s=this.nodes.get(t.toNode),i=Ce(n,t.fromSide),a=Ce(s,t.toSide),r=Math.max(40,Math.hypot(a.x-i.x,a.y-i.y)/3),d=ke(t.fromSide,r),l=ke(t.toSide,r),p=t.element.querySelector(".canvas-edge");p&&p.setAttribute("d",`M ${D(i.x)} ${D(i.y)} C ${D(i.x+d.dx)} ${D(i.y+d.dy)}, ${D(a.x+l.dx)} ${D(a.y+l.dy)}, ${D(a.x)} ${D(a.y)}`);const m=t.element.querySelector(".canvas-edge__label");m&&(m.setAttribute("x",D((i.x+a.x)/2)),m.setAttribute("y",D((i.y+a.y)/2)))})}reset(){this.nodes.forEach(e=>this.setOffset(e,0,0)),this.updateEdges(this.edges);try{localStorage.removeItem(this.storageKey)}catch{}}restore(){let e;try{e=JSON.parse(localStorage.getItem(this.storageKey))}catch{return}Array.isArray(e)&&e.forEach(t=>{if(!Array.isArray(t)||t.length!==3)return;const n=this.nodes.get(String(t[0])),s=Number(t[1]),i=Number(t[2]);!n||!Number.isFinite(s)||!Number.isFinite(i)||Math.abs(s)>this.maxStoredOffset||Math.abs(i)>this.maxStoredOffset||this.setOffset(n,s,i)})}removeStaleLayouts(){const e=this.storageKey.lastIndexOf(":"),t=this.storageKey.slice(0,e+1);try{for(let n=localStorage.length-1;n>=0;n-=1){const s=localStorage.key(n);s&&s!==this.storageKey&&s.startsWith(t)&&localStorage.removeItem(s)}}catch{}}persist(){const e=[];this.nodes.forEach(t=>{(t.dx||t.dy)&&e.push([t.id,D(t.dx),D(t.dy)])});try{e.length?localStorage.setItem(this.storageKey,JSON.stringify(e)):localStorage.removeItem(this.storageKey)}catch{}}}class St{constructor(e,t){this.svg=e;const n=e.viewBox.baseVal;this.original={x:n.x,y:n.y,w:n.width,h:n.height},this.state={...this.original},this.scene=new Et(e,t),this.pointers=new Map,this.pinch=null,this.mode=null,this.primaryPointerId=null,this.drag=null,this.didDrag=!1,this.suppressClick=!1,this.svg.style.cursor="grab",this.svg.style.touchAction="none",this.onWheel=this.onWheel.bind(this),this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.onPointerCancel=this.onPointerCancel.bind(this),this.onClick=this.onClick.bind(this),this.onDragStart=this.onDragStart.bind(this),this.svg.addEventListener("wheel",this.onWheel,{passive:!1}),this.svg.addEventListener("pointerdown",this.onPointerDown),window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.onPointerCancel),this.svg.addEventListener("click",this.onClick,!0),this.svg.addEventListener("dragstart",this.onDragStart)}setViewBox(){const{x:e,y:t,w:n,h:s}=this.state;this.svg.setAttribute("viewBox",`${e} ${t} ${n} ${s}`)}currentScale(){return this.original.w/this.state.w}zoomBy(e,t,n){const s=this.currentScale(),a=Math.min(mt,Math.max(pt,s*e))/s;!Number.isFinite(a)||Math.abs(a-1)<1e-4||(t==null&&(t=this.state.x+this.state.w/2),n==null&&(n=this.state.y+this.state.h/2),this.state.x=t-(t-this.state.x)/a,this.state.y=n-(n-this.state.y)/a,this.state.w/=a,this.state.h/=a,this.setViewBox())}pan(e,t){this.state.x-=e,this.state.y-=t,this.setViewBox()}reset(){this.state={...this.original},this.setViewBox()}resetLayout(){this.scene.reset(),this.reset()}screenToSvg(e,t){const n=this.svg.createSVGPoint();n.x=e,n.y=t;const s=this.svg.getScreenCTM();return s?n.matrixTransform(s.inverse()):{x:0,y:0}}onWheel(e){e.preventDefault();const t=e.deltaY<0?Ee:1/Ee,{x:n,y:s}=this.screenToSvg(e.clientX,e.clientY);this.zoomBy(t,n,s)}onPointerDown(e){if(e.pointerType==="mouse"&&e.button!==0)return;const t=this.screenToSvg(e.clientX,e.clientY);if(this.pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,startClientX:e.clientX,startClientY:e.clientY,anchor:t,captured:!1}),this.pointers.size===2)this.finishNodeDrag(!0),this.mode="pinch",this.suppressClick=!0,this.pointers.forEach((n,s)=>this.capturePointer(s,n)),this.pinch=this.computePinch();else if(this.pointers.size===1){const n=e.target.closest(".canvas-node[data-id]");this.primaryPointerId=e.pointerId,this.didDrag=!1,this.drag=n?this.scene.beginDrag(n):null,this.mode=this.drag?"node":"pan",this.drag||(this.svg.style.cursor="grabbing")}}onPointerMove(e){const t=this.pointers.get(e.pointerId);if(t){if(t.clientX=e.clientX,t.clientY=e.clientY,this.pointers.size===2&&this.pinch){const n=this.computePinch(),s=n.dist/this.pinch.dist;if(s>0&&Number.isFinite(s)){const i=this.screenToSvg(this.pinch.cx,this.pinch.cy);this.zoomBy(s,i.x,i.y);const a=this.screenToSvg(n.cx,n.cy);this.pan(a.x-i.x,a.y-i.y)}this.pinch=n}else if(this.pointers.size===1&&e.pointerId===this.primaryPointerId){if(Math.hypot(e.clientX-t.startClientX,e.clientY-t.startClientY)<gt)return;this.didDrag=!0,this.capturePointer(e.pointerId,t);const s=this.screenToSvg(e.clientX,e.clientY);this.mode==="node"&&this.drag?(this.scene.moveDrag(this.drag,s.x-t.anchor.x,s.y-t.anchor.y),this.suppressClick=!0):this.mode==="pan"&&this.pan(s.x-t.anchor.x,s.y-t.anchor.y)}}}onPointerUp(e){if(this.pointers.has(e.pointerId)){if(this.pointers.delete(e.pointerId),e.pointerId===this.primaryPointerId&&this.finishNodeDrag(!1),this.pointers.size>=2){this.pinch=this.computePinch(),this.mode="pinch";return}if(this.pinch=null,this.pointers.size===1){const[t,n]=this.pointers.entries().next().value;n.startClientX=n.clientX,n.startClientY=n.clientY,n.anchor=this.screenToSvg(n.clientX,n.clientY),this.primaryPointerId=t,this.mode="pan",this.svg.style.cursor="grabbing";return}this.mode=null,this.primaryPointerId=null,this.svg.style.cursor="grab",this.suppressClick&&window.setTimeout(()=>{this.suppressClick=!1},0)}}onPointerCancel(e){if(this.pointers.has(e.pointerId)){if(this.pointers.delete(e.pointerId),e.pointerId===this.primaryPointerId&&this.finishNodeDrag(!0),this.pinch=this.pointers.size>=2?this.computePinch():null,this.pointers.size>=2){this.mode="pinch";return}if(this.pointers.size===1){const[t,n]=this.pointers.entries().next().value;n.startClientX=n.clientX,n.startClientY=n.clientY,n.anchor=this.screenToSvg(n.clientX,n.clientY),this.primaryPointerId=t,this.mode="pan",this.svg.style.cursor="grabbing";return}this.pointers.size===0&&(this.mode=null,this.primaryPointerId=null,this.svg.style.cursor="grab",this.suppressClick=!1)}}finishNodeDrag(e){this.drag&&(this.scene.finishDrag(this.drag,e||!this.didDrag),this.drag=null)}capturePointer(e,t){if(!(!t||t.captured))try{this.svg.setPointerCapture(e),t.captured=!0}catch{}}onClick(e){this.suppressClick&&(e.preventDefault(),e.stopPropagation(),this.suppressClick=!1)}onDragStart(e){e.preventDefault()}computePinch(){const[e,t]=[...this.pointers.values()],n=t.clientX-e.clientX,s=t.clientY-e.clientY;return{dist:Math.hypot(n,s),cx:(e.clientX+t.clientX)/2,cy:(e.clientY+t.clientY)/2}}destroy(){this.finishNodeDrag(!0),this.svg.removeEventListener("wheel",this.onWheel),this.svg.removeEventListener("pointerdown",this.onPointerDown),window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.onPointerCancel),this.svg.removeEventListener("click",this.onClick,!0),this.svg.removeEventListener("dragstart",this.onDragStart)}}function ie(o,e=0){const t=Number(o);return Number.isFinite(t)?t:e}function D(o){return Math.round(o*100)/100}function Ce(o,e){const t=o.x+o.dx,n=o.y+o.dy;return e==="top"?{x:t+o.width/2,y:n}:e==="bottom"?{x:t+o.width/2,y:n+o.height}:e==="left"?{x:t,y:n+o.height/2}:{x:t+o.width,y:n+o.height/2}}function ke(o,e){return o==="left"?{dx:-e,dy:0}:o==="top"?{dx:0,dy:-e}:o==="bottom"?{dx:0,dy:e}:{dx:e,dy:0}}const re={en:{Home:"Home",Daily:"Daily",Archives:"Archives",About:"About",Portfolio:"Portfolio",Bilibili:"Bilibili",GitHub:"GitHub",Instagram:"Instagram",Douban:"Douban",Email:"Email",RSS:"RSS",Language:"Language",Copyright:"Copyright","Powered by":"Powered by","Modified based on":"Modified based on",theme:"theme","Mainly maintained using AI":"Mainly maintained using AI","Older Posts":"Older Posts","Newer Posts":"Newer Posts",Comments:"Comments","Switch to Chinese":"Switch to Chinese","Switch to English":"Switch to English","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"Switched to English",articleLanguageSwitched:"Switched to English version","tag-graph-hint":"Click tag to explore · Scroll to zoom · Drag to rearrange"},"zh-CN":{Home:"首页",Daily:"资讯",Archives:"归档",About:"关于",Portfolio:"作品集",Bilibili:"哔哩哔哩",GitHub:"GitHub",Instagram:"Instagram",Douban:"豆瓣",Email:"邮箱",RSS:"RSS",Language:"语言",Copyright:"版权所有","Powered by":"技术支持","Modified based on":"基于",theme:"主题","Mainly maintained using AI":"主要使用AI来维护","Older Posts":"上一页","Newer Posts":"下一页",Comments:"留言","Switch to Chinese":"切换至中文","Switch to English":"切换至英文","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"已切换至中文",articleLanguageSwitched:"已切换至中文版本","tag-graph-hint":"点击标签探索 · 滚轮缩放 · 拖拽移动"}},Lt=()=>(navigator.language||navigator.userLanguage).startsWith("zh")?"zh-CN":"en",Re=()=>localStorage.getItem("siteLanguage")||Lt(),Ct=()=>{const o=document.cookie.match(/(?:^|;\s*)lang_pref=([^;]+)/);return o?o[1]:null},kt=o=>{document.cookie="lang_pref="+o+"; path=/; max-age=31536000; samesite=lax"},Pe=()=>{const o=document.querySelector('meta[name="article:lang"]');return o?o.content:window.location.pathname.includes(".zh-CN")?"zh-CN":"en"},ze=o=>{const e=document.querySelector(`link[rel="alternate"][hreflang="${o}"]`);if(!e)return null;const t=new URL(e.href,window.location.origin);return window.location.origin+t.pathname+t.search+t.hash},Ne=o=>{document.querySelectorAll(".lang-switch__opt").forEach(e=>{e.setAttribute("aria-pressed",e.getAttribute("data-lang")===o?"true":"false")})},le=o=>{const e=re[o];if(!e){console.warn("Language data not available for:",o);return}document.documentElement.lang=o,document.querySelectorAll("nav ul li a").forEach(d=>{const l=d.getAttribute("data-i18n-key");l&&e[l]&&(d.textContent=e[l])}),document.querySelectorAll("[data-i18n]").forEach(d=>{const l=d.getAttribute("data-i18n");e[l]&&(d.textContent=e[l])}),document.querySelectorAll("[data-title]").forEach(d=>{const l=d.getAttribute("data-title");e[l]&&d.setAttribute("data-title",e[l])});const i=document.querySelector(".pagination .extend.prev"),a=document.querySelector(".pagination .extend.next");i&&(i.textContent=e["Older Posts"]||i.textContent),a&&(a.textContent=e["Newer Posts"]||a.textContent),localStorage.setItem("siteLanguage",o),document.querySelectorAll("[data-i18n-tag]").forEach(d=>{const l=d.getAttribute("data-i18n-tag");if(o==="zh-CN"){const p=window.tagTranslations&&window.tagTranslations[l];p&&(d.textContent=p)}else d.textContent=l}),Ne(o)},Mt=o=>{const e=document.querySelector(".lang-notification");e&&e.remove();const t=document.createElement("div");t.className="lang-notification",t.textContent=o,document.body.appendChild(t),setTimeout(()=>{t.classList.add("show")},10),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},2e3)},De=o=>{if(kt(o),o===Pe()){localStorage.setItem("siteLanguage",o),le(o);return}const e=ze(o);if(e){localStorage.setItem("siteLanguage",o),window.location.href=e;return}le(o);const t=re[o]?re[o].languageSwitched:"Language switched";Mt(t)},At=()=>{const o=Re()==="zh-CN"?"en":"zh-CN";De(o)},Tt=()=>{document.querySelectorAll(".lang-switch__opt").forEach(o=>{o.addEventListener("click",e=>{e.preventDefault(),De(o.getAttribute("data-lang"))})}),Ne(Re())},Me=()=>{const o=Pe(),e=Ct();if(le(e||o),e&&e!==o){const t=ze(e),n=t&&new URL(t,window.location.origin).pathname;n&&n!==window.location.pathname&&window.location.replace(t)}};function It(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Me):Me(),window.addEventListener("load",()=>{const o=document.getElementById("langSwitch");o&&o.addEventListener("click",e=>{e.preventDefault(),At()}),Tt()})}function Rt(){const o=document.getElementById("tag-graph"),e=document.getElementById("tag-graph-container"),t=window.__TAG_GRAPH_DATA__;if(!o||!e||!t||!t.nodes||t.nodes.length===0)return;function n(c,h,f){return Math.max(h,Math.min(f,c))}function s(c){const h=n((c-40)/58,0,1),f=Math.max(0,Math.log2(Math.max(c,98)/98));return n(1+h*.12+f*.15,1,1.5)}const i=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window;function a(){if(i)return;let c=480;window.matchMedia&&window.matchMedia("(max-width: 480px)").matches?c=420:window.matchMedia&&window.matchMedia("(max-width: 768px)").matches&&(c=440);const h=Math.round(c*s(t.nodes.length));e.style.height=h+"px"}a();const r=document.createElement("div");r.className="graph-loading",r.textContent="Loading",o.parentNode.appendChild(r);const d=t.archiveFilterTags||[],l={};d.forEach(function(c){l[c]=!0});function p(c){return String(c||"").replace(/-/g," ").replace(/\s+/g," ").trim().toLowerCase()}const m={};t.links.forEach(function(c){m[c.source]=(m[c.source]||0)+1,m[c.target]=(m[c.target]||0)+1});let u=1;t.nodes.forEach(function(c){const h=c.value||0;h>u&&(u=h)}),t.nodes.forEach(function(c){const h=c.value||0;c.symbolSize=Math.max(12,Math.min(70,12+h*(58/u)))});const y={};t.nodes.forEach(function(c){y[c.name]=[]});function T(c,h){!y[c]||!y[h]||c===h||(y[c].indexOf(h)===-1&&y[c].push(h),y[h].indexOf(c)===-1&&y[h].push(c))}t.links.forEach(function(c){T(c.source,c.target)});const x={};t.nodes.forEach(function(c){const h=p(c.name);x[h]||(x[h]=[]),x[h].push(c.name)}),Object.keys(x).forEach(function(c){const h=x[c];if(!(h.length<2))for(let f=0;f<h.length;f++)for(let w=f+1;w<h.length;w++)T(h[f],h[w])});const _={},H=[];d.forEach(function(c){y[c]!==void 0&&(_[c]=0,H.push(c))});let v=0;for(;v<H.length;){const c=H[v++];(y[c]||[]).forEach(function(h){_[h]===void 0&&(_[h]=_[c]+1,H.push(h))})}Object.keys(_).forEach(function(c){});const b=[{h:260,s:62,l:50},{h:15,s:80,l:55},{h:160,s:60,l:42},{h:220,s:72,l:52},{h:340,s:70,l:52},{h:45,s:85,l:50},{h:190,s:70,l:45},{h:90,s:55,l:45},{h:290,s:60,l:50},{h:30,s:75,l:48},{h:130,s:50,l:42},{h:0,s:70,l:55}];function S(c,h,f){return"hsl("+Math.round(c)+", "+Math.round(h)+"%, "+Math.round(f)+"%)"}const O={},K={},F=t.nodes.filter(function(c){return l[c.name]});F.sort(function(c,h){return h.value-c.value}),F.forEach(function(c,h){const f=b[h%b.length];K[c.name]=f,O[c.name]=S(f.h,f.s,f.l)});const G={};d.forEach(function(c){if(y[c]===void 0)return;const h={};h[c]=0;const f=[c];let w=0;for(;w<f.length;){const z=f[w++];(y[z]||[]).forEach(function(I){h[I]===void 0&&(h[I]=h[z]+1,f.push(I))})}G[c]=h});const J=t.nodes.filter(function(c){return!l[c.name]});let se=1;J.forEach(function(c){let h=1/0;d.forEach(function(f){if(!G[f])return;const w=G[f][c.name];w!==void 0&&w<h&&(h=w)}),h<1/0&&h>se&&(se=h)}),J.forEach(function(c){const h=[];let f=0;if(d.forEach(function(C){if(!G[C]||!K[C])return;let E=G[C][c.name];if(E===void 0)return;E===0&&(E=.5);const k=1/(E*E);h.push({ft:C,w:k}),f+=k}),f===0){O[c.name]="hsl(0, 0%, 82%)";return}let w=0,z=0,I=0,M=0;h.forEach(function(C){const E=C.w/f,k=K[C.ft],j=k.h*Math.PI/180;w+=Math.sin(j)*E,z+=Math.cos(j)*E,I+=k.s*E,M+=k.l*E});let A=Math.atan2(w,z)*180/Math.PI;A<0&&(A+=360);let B=I,W=M,g=1/0;h.forEach(function(C){const E=G[C.ft][c.name];E<g&&(g=E)});let L=(g-1)/Math.max(se-1,1);L=Math.max(0,Math.min(1,L));const N=Math.pow(L,.85),R=32,P=1-N*.35;B=Math.max(R,B*P),W=W+N*(82-W)*.78,O[c.name]=S(A,B,W)});const oe=t.tagTranslations||{},ee={};Object.keys(oe).forEach(function(c){ee[c]=oe[c];const h=c.replace(/-/g," ");h!==c&&(ee[h]=oe[c])});function te(c){return(typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en")==="zh-CN"&&ee[c]?ee[c]:c}const ue=e.getBoundingClientRect(),U=ue.width||500,$=ue.height||400,fe=Math.min(U,$)*.28;F.forEach(function(c,h){const f=2*Math.PI*h/Math.max(F.length,1)-Math.PI/2;c.x=U/2+fe*Math.cos(f),c.y=$/2+fe*Math.sin(f)});const pe=Math.min(U,$)*.45;J.forEach(function(c,h){const f=2*Math.PI*h/Math.max(J.length,1);c.x=U/2+pe*Math.cos(f),c.y=$/2+pe*Math.sin(f)});const Fe=60,q=t.nodes;for(let c=0;c<15;c++)for(let h=0;h<q.length;h++)for(let f=h+1;f<q.length;f++){const w=q[f].x-q[h].x,z=q[f].y-q[h].y,I=Math.sqrt(w*w+z*z),M=Fe+(q[h].symbolSize+q[f].symbolSize)/2;if(I<M){const A=(M-I)/2,B=I>.1?w/I:Math.random()-.5,W=I>.1?z/I:Math.random()-.5;q[h].x-=B*A,q[h].y-=W*A,q[f].x+=B*A,q[f].y+=W*A}}let Z=1,Q=[U/2,$/2];if(F.length>0){let c=1/0,h=-1/0,f=1/0,w=-1/0;F.forEach(function(M){const A=(M.symbolSize||20)/2+50;M.x-A<c&&(c=M.x-A),M.x+A>h&&(h=M.x+A),M.y-A<f&&(f=M.y-A),M.y+A>w&&(w=M.y+A)});const z=h-c,I=w-f;if(z>0&&I>0){const M=U/z,A=$/I;Z=Math.min(M,A,1.5)*.8,Z<.3&&(Z=.3),Q=[(c+h)/2,(f+w)/2]}}t.nodes.forEach(function(c){c.itemStyle={color:O[c.name],borderColor:"#fff",borderWidth:1.5,shadowBlur:5,shadowColor:"rgba(0, 0, 0, 0.06)"},c.label={show:!0,formatter:function(){return te(c.name)},fontSize:Math.max(10,Math.min(15,9+(m[c.name]||0)*.5)),color:"#555",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}});const V=e.querySelector(".tag-graph-hint");let me=null,ae=!1;function He(){ae||(ae=!0,V.classList.add("visible"),clearTimeout(me),me=setTimeout(function(){V.classList.remove("visible"),ae=!1},3e3))}e.addEventListener("mouseenter",He);const Y=document.createElement("script");Y.src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",Y.integrity="sha384-Mx5lkUEQPM1pOJCwFtUICyX45KNojXbkWdYhkKUKsbv391mavbfoAmONbzkgYPzR",Y.crossOrigin="anonymous",Y.onload=function(){je()},Y.onerror=function(){r.textContent="Failed to load chart library",r.style.color="#c44"},document.head.appendChild(Y);function Be(c){const h=n((c-1)/39,0,1);return Math.round(700+h*1050)}function We(c){return c<10?750:c<20?1200:c<40?1650:2100}function Ue(c){const h=s(c);let f=Be(c);return c>98&&(f=Math.max(1500,f-100*Math.log2(c/98))),{repulsion:Math.round(f),edgeLength:[Math.round(190*h),Math.round(520*h)],gravity:Math.max(.06,.075/h),friction:.24}}function je(){r.parentNode&&r.parentNode.removeChild(r);const c=Math.sqrt(s(t.nodes.length));let h=i?Z:Z/c;!i&&U<480?h=Math.max(h,.95/c):!i&&U<720&&(h=Math.max(h,.6/c));const f=echarts.init(o),w=Ue(t.nodes.length),z={backgroundColor:"transparent",tooltip:{show:!0,enterable:!0,confine:!0,backgroundColor:"rgba(255, 255, 255, 0.97)",borderColor:"#e8e8e8",borderWidth:1,padding:[10,14],textStyle:{color:"#4b4848",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:13},extraCssText:"border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); max-height: 260px; overflow-y: auto;",formatter:function(g){function L(R){return String(R??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function N(R,P){const C=L(R),E=L(P),k='style="display:block;color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;text-decoration:none;"';return E?'<a href="'+E+'" '+k+">• "+C+"</a>":"<div "+k+">• "+C+"</div>"}if(g.dataType==="node"){const R=te(g.name);let P='<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:'+(O[g.name]||"#795da3")+'">'+L(R)+"</div>";P+='<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 '+g.value+" article"+(g.value>1?"s":"")+"</div>";const C=t.postTitles&&t.postTitles[g.name];return C&&C.length>0&&(P+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">',C.forEach(function(E){typeof E=="string"?P+=N(E,""):P+=N(E.title,E.path)}),P+="</div>"),P}if(g.dataType==="edge"){const R=g.data.source,P=g.data.target;let C='<span style="font-weight:600">'+L(te(R))+'</span> <span style="color:#bbb">↔</span> <span style="font-weight:600">'+L(te(P))+"</span>";C+='<br/><span style="color:#999;font-size:12px">📄 '+g.data.value+" article"+(g.data.value>1?"s":"")+"</span>";const E=[R,P].sort().join("	"),k=t.linkPosts&&t.linkPosts[E];return k&&k.length>0&&(C+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;margin-top:5px;">',k.forEach(function(j){C+=N(j.title,j.path)}),C+="</div>"),C}}},animationDuration:1500,animationEasingUpdate:"quinticInOut",series:[{type:"graph",layout:"force",data:t.nodes,links:t.links,roam:!i,draggable:!i,force:{repulsion:i?We(t.nodes.length):w.repulsion,edgeLength:i?[150,450]:w.edgeLength,gravity:i?.12:w.gravity,friction:i?.6:w.friction,layoutAnimation:!0},emphasis:{focus:"adjacency",blurScope:"global",itemStyle:{shadowBlur:20,shadowColor:"rgba(121, 93, 163, 0.45)",borderWidth:2,borderColor:"#fff"},lineStyle:{width:3,opacity:.85},label:{show:!0,fontSize:14,fontWeight:"bold",color:"#333"}},label:{position:"right",distance:6},lineStyle:{color:"#d0d0d0",width:1.5,curveness:0,opacity:.35},scaleLimit:{min:.3,max:4},zoom:h,center:Q}]};let I=h||1,M=Q?[Q[0],Q[1]]:[0,0];if(f.setOption(z),f.on("graphroam",function(){const g=f.getModel(),L=g&&g.getSeriesByIndex&&g.getSeriesByIndex(0),N=L&&L.get&&L.get("zoom"),R=L&&L.get&&L.get("center");Number.isFinite(N)&&(I=N),R&&R.length>=2&&(M=[R[0],R[1]])}),f.on("click",function(g){g.dataType==="node"&&t.tagPaths&&t.tagPaths[g.name]&&(window.location.href=t.tagPaths[g.name])}),f.on("mouseover",function(g){(g.dataType==="node"||g.dataType==="edge")&&(o.style.cursor="pointer")}),f.on("mouseout",function(){o.style.cursor="default"}),i){const g=document.createElement("button");g.type="button",g.className="tag-graph-fs-btn",g.setAttribute("aria-label","Fullscreen"),g.innerHTML='<svg class="tag-graph-fs-ic tag-graph-fs-ic--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg><svg class="tag-graph-fs-ic tag-graph-fs-ic--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',e.appendChild(g);let L=!1,N=I,R=M.slice();const P=function(){if(!V)return;const k=typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en";V.textContent=k==="zh-CN"?"双指缩放 · 拖动平移 · 点按进入标签":"Pinch to zoom · Drag to pan · Tap a tag",V.classList.add("visible"),setTimeout(function(){V.classList.remove("visible")},2600)},C=function(){N=I,R=M.slice(),L=!0,e.classList.add("tag-graph-fullscreen"),g.classList.add("is-fullscreen"),g.setAttribute("aria-label","Exit fullscreen"),document.body.style.overflow="hidden",document.body.classList.add("tag-graph-fs-active"),requestAnimationFrame(function(){f.resize(),f.setOption({series:[{roam:!0}]}),P()})},E=function(){const k=N,j=R.slice();I=k,M=j.slice(),L=!1,e.classList.remove("tag-graph-fullscreen"),g.classList.remove("is-fullscreen"),g.setAttribute("aria-label","Fullscreen"),document.body.style.overflow="",document.body.classList.remove("tag-graph-fs-active"),requestAnimationFrame(function(){f.resize(),f.setOption({series:[{roam:!1,zoom:k,center:j}]})})};g.addEventListener("click",function(k){k.preventDefault(),k.stopPropagation(),L?E():C()}),document.addEventListener("keydown",function(k){k.key==="Escape"&&L&&E()})}let A;window.addEventListener("resize",function(){clearTimeout(A),A=setTimeout(function(){a(),f.resize()},150)});function B(){f.setOption({series:[{data:t.nodes}]})}window.addEventListener("storage",function(g){g.key==="siteLanguage"&&B()});const W=localStorage.setItem;localStorage.setItem=function(g,L){const N=g==="siteLanguage"?localStorage.getItem(g):null;W.call(localStorage,g,L),g==="siteLanguage"&&String(L)!==N&&setTimeout(B,50)}}}function Pt(o,e){let t=0,n="";for(const s of o){const i=s.codePointAt(0),a=i>=12288&&i<=12351||i>=13312&&i<=40959||i>=65280&&i<=65519;if(t+=a?1:.5,t>e)return n.replace(/\s+$/,"")+"…";n+=s}return n}function zt(o,e,t={}){let n=(o||"").trim();const s=n.search(/[（(]/);s>4&&(n=n.slice(0,s));const i=n.indexOf(" · ");if(i>0&&(n=n.slice(0,i)),e!=="quote"&&e!=="cite"){const a=n.indexOf(" — ");a>0&&(n=n.slice(0,a))}if(n=n.trim(),t.short){const a=n.search(/[，,]/);a>1&&(n=n.slice(0,a)),n=Pt(n,15)}return n}function Nt(o){if(o.querySelector("audio"))return!1;const e=o.querySelector("summary");return!(!e||/跟读|本节语音/.test(e.textContent||"")||o.parentElement&&o.parentElement.closest("details.callout"))}function Dt(o,e={}){const t=e.includeCallouts?"h1, h2, h3, h4, h5, h6, details.callout--foldable":"h1, h2, h3, h4, h5, h6",n=Array.from(o.querySelectorAll(t)),s=[];let i=1;const a=[];return n.forEach(r=>{const d=/^H[1-6]$/.test(r.tagName);let l,p,m=!1;if(d)l=parseInt(r.tagName[1],10),i=l,p=r.textContent;else{if(!Nt(r))return;l=i+1,m=!0;const x=r.querySelector("summary");if(p=zt(x.textContent||"",r.getAttribute("data-callout")||"",{short:!0}),!p)return}let u=1;for(;s.length&&s[s.length-1].level>=l;){const x=s.pop();x.level===l&&(u=x.n+1)}s.push({level:l,n:u});const y=a.length;r.id||(r.id=m?`toc-item-${y}`:`heading-${y}`);const T=s.map(x=>x.n).join(".");r.dataset.tocNumber=T,a.push({element:r,level:l,index:y,id:r.id,text:p,number:T,virtual:m})}),a}function qt(o){const e=document.createElement("aside");e.className="toc-drawer",e.innerHTML='<div class="toc-header"><span class="toc-title"></span><div class="toc-header__actions"><button type="button" class="toc-fold-control toc-collapse-all"></button><button type="button" class="toc-fold-control toc-expand-all"></button><button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button></div></div><div class="toc-content"><div class="toc-list"></div></div>',document.body.appendChild(e);const t=e.querySelector(".toc-list"),n=o.map(s=>{const i=document.createElement("div");if(i.className=s.virtual?"toc-item toc-item--virtual":"toc-item",i.setAttribute("data-level",String(s.level)),i.setAttribute("data-index",String(s.index)),!s.virtual){const r=document.createElement("div");r.className="toc-collapse-btn",i.appendChild(r)}const a=document.createElement("span");return a.className="toc-item-text",a.style.cursor="pointer",a.innerHTML=`<span class="toc-number">${s.number}.</span> `,a.appendChild(document.createTextNode(s.text)),a.setAttribute("title",s.text),s.element.classList.contains("collapsed")&&i.classList.add("collapsed"),i.appendChild(a),t.appendChild(i),i});return{container:e,items:n}}const qe="toc-panel-state";function _e(){try{const o=localStorage.getItem(qe);if(!o)return null;const e=JSON.parse(o);return!e||typeof e!="object"?null:e}catch{return null}}function _t(o){try{const t={..._e()||{},...o};localStorage.setItem(qe,JSON.stringify(t))}catch{}}function Ot(){return(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?"zh":"en"}const Ft={zh:{title:"目录",open:"目录",hide:"收起目录",show:"打开目录"},en:{title:"Contents",open:"TOC",hide:"Hide contents",show:"Show contents"}};function Ht(o){const e=o.querySelector(".toc-content"),t=o.querySelector(".toc-item.toc-reading");!e||!t||(e.scrollTop=t.offsetTop-e.clientHeight/2+t.offsetHeight/2)}function Bt(o){const e=Ft[Ot()],t=o.querySelector(".toc-title");t&&(t.textContent=e.title),o.setAttribute("aria-label",e.title);const n=o.querySelector(".toc-close-btn");n&&(n.setAttribute("aria-label",e.hide),n.setAttribute("title",e.hide));const s=document.createElement("button");s.type="button",s.className="toc-tab",s.setAttribute("aria-label",e.show),s.innerHTML='<span class="toc-tab__icon" aria-hidden="true"></span><span class="toc-tab__text">'+e.open+"</span>",document.body.appendChild(s);const i=document.createElement("div");i.className="toc-scrim",document.body.appendChild(i);function a(l,p){o.classList.toggle("is-open",l),s.classList.toggle("is-hidden",l),i.classList.toggle("is-visible",l),document.body.classList.toggle("toc-drawer-open",l),l&&Ht(o),p&&_t({hidden:!l})}s.addEventListener("click",()=>a(!0,!0)),i.addEventListener("click",()=>a(!1,!0)),n&&n.addEventListener("click",l=>{l.stopPropagation(),a(!1,!0)}),document.addEventListener("keydown",l=>{l.key==="Escape"&&o.classList.contains("is-open")&&a(!1,!1)});const r=_e(),d=window.matchMedia("(min-width: 1100px)").matches;return a(d&&!!r&&r.hidden===!1,!1),{setOpen:a}}function he(o,e,t){for(let n=e+1;n<o.length&&!(parseInt(o[n].getAttribute("data-level")||"1",10)<=t);n+=1)o[n].classList.add("toc-hidden")}function Oe(o,e,t){for(let n=e+1;n<o.length;n+=1){const s=parseInt(o[n].getAttribute("data-level")||"1",10);if(s<=t)break;if(s===t+1)o[n].classList.remove("toc-hidden");else{let i=!0;for(let a=n-1;a>e;a-=1){const r=parseInt(o[a].getAttribute("data-level")||"1",10);if(r<s&&o[a].classList.contains("collapsed")){i=!1;break}if(r<=t)break}i&&o[n].classList.remove("toc-hidden")}}}function ce(o,e,t){const n=e[t],s=o[t]&&o[t].element;if(!n||!s)return;const i=parseInt(n.getAttribute("data-level")||"1",10);!n.classList.contains("collapsed")?(n.classList.add("collapsed"),he(e,t,i),s.classList.add("collapsed")):(n.classList.remove("collapsed"),Oe(e,t,i),s.classList.remove("collapsed")),de(s)}function Ae(o,e,t){e.forEach((n,s)=>{if(n.classList.contains("toc-item--virtual")||!n.querySelector(".toc-collapse-btn"))return;const i=n.classList.contains("collapsed");t?i||ce(o,e,s):i&&ce(o,e,s)})}function Wt(o,e,t){const n=e[t],s=o[t]&&o[t].element;if(!n||!s)return;const i=parseInt(n.getAttribute("data-level")||"1",10),a=s.classList.contains("collapsed");a&&!n.classList.contains("collapsed")?(n.classList.add("collapsed"),he(e,t,i)):!a&&n.classList.contains("collapsed")&&(n.classList.remove("collapsed"),Oe(e,t,i)),de(s)}function Ut(o,e,t=null){e.forEach((i,a)=>{if(i.classList.contains("collapsed")){const r=parseInt(i.getAttribute("data-level")||"1",10);he(e,a,r)}}),e.forEach((i,a)=>{const r=i.querySelector(".toc-collapse-btn");r&&r.addEventListener("click",d=>{d.stopPropagation(),ce(o,e,a),t&&t()})});const n=new Map;o.forEach((i,a)=>n.set(i.element,a));const s=new MutationObserver(i=>{let a=!1;i.forEach(r=>{if(r.type!=="attributes"||r.attributeName!=="class")return;const d=n.get(r.target);d!==void 0&&(Wt(o,e,d),a=!0)}),a&&t&&t()});return o.forEach(i=>{s.observe(i.element,{attributes:!0,attributeFilter:["class"]})}),{observer:s}}const Te={1:{passed:"rgba(128,128,128,0.1)",reading:"rgba(66,153,225,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(66,153,225,0.25)"},2:{passed:"rgba(128,128,128,0.1)",reading:"rgba(49,130,206,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(49,130,206,0.25)"},3:{passed:"rgba(128,128,128,0.1)",reading:"rgba(44,82,130,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(44,82,130,0.25)"},4:{passed:"rgba(128,128,128,0.1)",reading:"rgba(42,67,101,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(42,67,101,0.25)"},5:{passed:"rgba(128,128,128,0.1)",reading:"rgba(26,54,93,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(26,54,93,0.25)"},6:{passed:"rgba(128,128,128,0.1)",reading:"rgba(21,62,117,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(21,62,117,0.25)"}};function jt(o,e){if(!o.length)return{destroy(){}};const t=new Array(o.length).fill("coming"),n=new Set;let s=-1;const i=new Map;o.forEach((u,y)=>i.set(u.element,y));function a(){e.forEach((u,y)=>{const T=parseInt(u.getAttribute("data-level")||"1",10),x=Te[T]||Te[1],_=t[y];u.classList.remove("toc-passed","toc-reading","toc-coming"),u.style.boxShadow="",u.style.transform="",u.style.fontWeight="",y===s?(u.classList.add("toc-reading"),u.style.backgroundColor=x.active,u.style.opacity="1",u.style.fontWeight="600",u.style.boxShadow="inset 0 0 0 2px rgba(66,153,225,0.3)",u.style.transform="scale(1.02)",u.style.transition="all 0.2s ease"):_==="reading"?(u.classList.add("toc-reading"),u.style.backgroundColor=x.reading,u.style.opacity="1",u.style.fontWeight="600"):_==="passed"?(u.classList.add("toc-passed"),u.style.backgroundColor=x.passed,u.style.opacity="0.7"):(u.classList.add("toc-coming"),u.style.backgroundColor=x.coming,u.style.opacity="0.5")})}function r(){const u=window.innerHeight/2;let y=-1;n.forEach(T=>{const x=o[T].element.getBoundingClientRect();x.top<=u&&x.bottom>=u&&(y=T)}),y!==s&&(s=y,a())}let d=null;function l(){d||(d=requestAnimationFrame(()=>{d=null,r()}))}const p=new IntersectionObserver(u=>{u.forEach(y=>{const T=i.get(y.target);T!==void 0&&(y.isIntersecting?(n.add(T),t[T]="reading"):(n.delete(T),t[T]=y.boundingClientRect.bottom<0?"passed":"coming"))}),r(),a()});o.forEach(u=>p.observe(u.element)),window.addEventListener("scroll",l,{passive:!0}),window.addEventListener("resize",l,{passive:!0}),a();function m(){p.disconnect(),window.removeEventListener("scroll",l),window.removeEventListener("resize",l),d&&cancelAnimationFrame(d)}return{destroy:m,refresh:()=>{r(),a()}}}const Gt='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 18.59 8.83 20 12 16.83 15.17 20l1.41-1.41L12 14zM16.59 5.41 15.17 4 12 7.17 8.83 4 7.41 5.41 12 10z"/></svg>',$t='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5.83 15.17 9l1.41-1.41L12 3 7.42 7.59 8.83 9zm0 12.34L8.83 15l-1.41 1.4L12 21l4.58-4.6L15.17 15z"/></svg>';function Vt(o){return!o.classList.contains("toc-item--virtual")&&!!o.querySelector(".toc-collapse-btn")}function Yt(){const o=document.querySelector(".content");if(!o||o.classList.contains("archives"))return null;const e=document.body;if(e.classList.contains("path-about-index-html")||e.classList.contains("layout-about"))return null;const t=document.querySelector("section.main[data-toc]");return t&&t.getAttribute("data-toc")==="false"?null:o}function Xt(){const o=Yt();if(!o)return;const e=Dt(o,{includeCallouts:document.body.classList.contains("type-daily-feed")});if(!e.length)return;const{container:t,items:n}=qt(e),s=t.querySelector(".toc-collapse-all"),i=t.querySelector(".toc-expand-all"),a=n.filter(Vt);let r=null;if(s&&i&&a.length){const p=(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?{collapse:"全部折叠",expand:"全部展开"}:{collapse:"Collapse all",expand:"Expand all"};s.innerHTML=Gt,s.setAttribute("aria-label",p.collapse),s.setAttribute("title",p.collapse),i.innerHTML=$t,i.setAttribute("aria-label",p.expand),i.setAttribute("title",p.expand),r=()=>{const m=a.filter(u=>u.classList.contains("collapsed")).length;s.disabled=m===a.length,i.disabled=m===0},s.addEventListener("click",()=>{Ae(e,n,!0),r()}),i.addEventListener("click",()=>{Ae(e,n,!1),r()})}else s&&s.remove(),i&&i.remove();Ut(e,n,r),r&&r();const d=jt(e,n);Bt(t),n.forEach((l,p)=>{const m=l.querySelector(".toc-item-text");m&&m.addEventListener("click",()=>{const u=e[p];!u||!u.element||(u.virtual&&u.element.tagName==="DETAILS"&&!u.element.open&&(u.element.open=!0),u.element.scrollIntoView({behavior:"smooth",block:u.virtual?"start":"center"}),setTimeout(()=>d.refresh(),300))})})}function Ie(){new Ge,new ot,new rt,document.getElementById("map")&&new lt,new ct,setTimeout(()=>{new dt},500),new ut,new ft,new bt,It(),Xt(),at(),document.getElementById("tag-graph")&&Rt()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ie):Ie();
