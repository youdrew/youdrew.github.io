class Ge{constructor(){this.header=document.querySelector("header"),this.menuIcon=document.getElementById("menu_icon"),this.navTriggerZone=50,this.showNavTimeout=null,this.lastMouseEvent=null,this.mouseMoveScheduled=!1,this.mediaQuery=null,this.currentMode=null,this.navLinks=null,this.onMouseMove=this.onMouseMove.bind(this),this.onHeaderEnter=this.onHeaderEnter.bind(this),this.onHeaderLeave=this.onHeaderLeave.bind(this),this.onMenuIconClick=this.onMenuIconClick.bind(this),this.onNavLinkClick=this.onNavLinkClick.bind(this),this.onKeydown=this.onKeydown.bind(this),this.onBreakpointChange=this.onBreakpointChange.bind(this),this.init()}init(){this.header&&(this.mediaQuery=window.matchMedia("(min-width: 1099px)"),this.mediaQuery.addEventListener("change",this.onBreakpointChange),this.applyMode(this.mediaQuery.matches?"desktop":"mobile"))}onBreakpointChange(e){this.applyMode(e.matches?"desktop":"mobile")}applyMode(e){e!==this.currentMode&&(this.teardown(),this.currentMode=e,e==="desktop"?this.bindDesktop():this.bindMobile())}teardown(){document.removeEventListener("mousemove",this.onMouseMove),this.header.removeEventListener("mouseenter",this.onHeaderEnter),this.header.removeEventListener("mouseleave",this.onHeaderLeave),document.removeEventListener("keydown",this.onKeydown),this.menuIcon&&this.menuIcon.removeEventListener("click",this.onMenuIconClick),this.navLinks&&this.navLinks.forEach(e=>e.removeEventListener("click",this.onNavLinkClick)),clearTimeout(this.showNavTimeout),this.showNavTimeout=null,this.header.classList.remove("show_menu","menu-open"),document.body.style.overflow=""}bindDesktop(){document.addEventListener("mousemove",this.onMouseMove),this.header.addEventListener("mouseenter",this.onHeaderEnter),this.header.addEventListener("mouseleave",this.onHeaderLeave)}bindMobile(){this.menuIcon&&(this.menuIcon.addEventListener("click",this.onMenuIconClick),this.navLinks=this.header.querySelectorAll("nav ul li a"),this.navLinks.forEach(e=>e.addEventListener("click",this.onNavLinkClick)),document.addEventListener("keydown",this.onKeydown))}openMenu(){this.header.classList.add("menu-open"),this.menuIcon.setAttribute("aria-expanded","true"),this.menuIcon.setAttribute("aria-label","Close menu"),document.body.style.overflow="hidden"}closeMenu(){this.header.classList.remove("menu-open"),this.menuIcon&&(this.menuIcon.setAttribute("aria-expanded","false"),this.menuIcon.setAttribute("aria-label","Open menu")),document.body.style.overflow=""}onMenuIconClick(e){e.preventDefault(),this.header.classList.contains("menu-open")?this.closeMenu():this.openMenu()}onNavLinkClick(){this.closeMenu()}onKeydown(e){e.key==="Escape"&&this.header.classList.contains("menu-open")&&this.closeMenu()}onMouseMove(e){this.lastMouseEvent=e,!this.mouseMoveScheduled&&(this.mouseMoveScheduled=!0,requestAnimationFrame(()=>{this.mouseMoveScheduled=!1,this.processMouseMove(this.lastMouseEvent)}))}processMouseMove(e){if(e){if(e.pageX<=this.navTriggerZone){clearTimeout(this.showNavTimeout),this.header.classList.add("show_menu");return}clearTimeout(this.showNavTimeout),this.showNavTimeout=setTimeout(()=>{const t=this.header.getBoundingClientRect();e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom||this.header.classList.remove("show_menu")},300)}}onHeaderEnter(){clearTimeout(this.showNavTimeout)}onHeaderLeave(){this.showNavTimeout=setTimeout(()=>{this.header.classList.remove("show_menu")},300)}}const Ve=`#define time iTime

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
}`,$e=`// artifact-at-sea.wgsl — WebGPU twin of artifact-at-sea.glsl, used only for
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
`,Ye="(min-width: 1099px)",Xe="(prefers-reduced-motion: reduce)",Ke=8e3,Ze=30,Qe=3.4,Je=1.3,we=.55,xe=1100,Ee=1,et=3,tt=1.7;function nt(){return/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className||"")}function Z(i){return Math.max(0,Math.min(1,i))}function re(i){return i*i*(3-2*i)}const it=`#version 300 es
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
${Ve}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class at{constructor(){nt()&&(this.mq=window.matchMedia(Ye),this.reduce=window.matchMedia(Xe),this.dyn=window.matchMedia("(dynamic-range: high)"),this.canvas=null,this.gl=null,this.gpu=null,this.backend="webgl",this.ready=!1,this.initPromise=null,this.hdrFish=1,this.hdrSea=1,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=Ee,this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.onDynChange=this.onDynChange.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.dyn.addEventListener("change",this.onDynChange),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}onDynChange(){this.canvas&&(this.disable(),this.apply())}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e),this.canvas=e,this.ready=!1,this.initPromise=this.initBackend().then(t=>t?this.canvas?(this.ready=!0,this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle(),!0):(this.destroyGpu(),!1):(this.disable(),!1))}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null,this.destroyGpu(),this.ready=!1}async initBackend(){if(this.dyn.matches&&!!navigator.gpu){try{if(await this.buildGpu())return this.backend="webgpu",this.hdrFish=et,this.hdrSea=tt,!0}catch(t){console.warn("[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:",t)}this.destroyGpu(),this.freshCanvas()}return this.canvas?(this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.buildGl()):!1}freshCanvas(){if(!this.canvas)return;const e=this.canvas.cloneNode(!1);this.canvas.replaceWith(e),this.canvas=e}destroyGpu(){if(!this.gpu)return;const e=this.gpu;this.gpu=null;try{e.device.destroy()}catch{}}async buildGpu(){const e=await navigator.gpu.requestAdapter();if(!e)return!1;const t=await e.requestDevice(),n=this.canvas&&this.canvas.getContext("webgpu");if(!n)return t.destroy(),!1;n.configure({device:t,format:"rgba16float",colorSpace:"srgb",toneMapping:{mode:"extended"},alphaMode:"premultiplied"});const s=typeof n.getConfiguration=="function"?n.getConfiguration():null;if(!s||!s.toneMapping||s.toneMapping.mode!=="extended")return t.destroy(),!1;const a=t.createShaderModule({code:$e}),r=await a.getCompilationInfo();if(r.messages.some(u=>u.type==="error")){for(const u of r.messages)console.warn("[idle-ocean] wgsl "+u.lineNum+":"+u.linePos+" "+u.message);return t.destroy(),!1}const l=t.createRenderPipeline({layout:"auto",vertex:{module:a,entryPoint:"vmain"},fragment:{module:a,entryPoint:"fmain",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}}),c=t.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=t.createBindGroup({layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}}]});return this.gpu={device:t,ctx:n,pipeline:l,ubuf:c,bind:o,u:new Float32Array(16)},t.lost.then(u=>{this.gpu&&this.canvas&&(console.warn("[idle-ocean] WebGPU device lost ("+u.reason+"), falling back to WebGL"),this.gpu=null,this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.freshCanvas(),this.buildGl()?this.resize():this.disable())}),!0}buildGl(){const e=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1});if(!e)return!1;this.gl=e;const t=(l,c)=>{const o=e.createShader(l);return e.shaderSource(o,c),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)?o:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(o)),null)},n=t(e.VERTEX_SHADER,it),s=t(e.FRAGMENT_SHADER,st);if(!n||!s)return!1;const a=e.createProgram();if(e.attachShader(a,n),e.attachShader(a,s),e.bindAttribLocation(a,0,"p"),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(a)),!1;e.useProgram(a),this.prog=a;const r=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(a,"iResolution"),this.uTime=e.getUniformLocation(a,"iTime"),this.uReveal=e.getUniformLocation(a,"uReveal"),this.uOpaque=e.getUniformLocation(a,"uOpaqueMax"),this.uMode=e.getUniformLocation(a,"uMode"),this.uDir=e.getUniformLocation(a,"uDir"),this.uDrain=e.getUniformLocation(a,"uDrain"),this.uMouse=e.getUniformLocation(a,"uMouse"),this.uHdrFish=e.getUniformLocation(a,"uHdrFish"),this.uHdrSea=e.getUniformLocation(a,"uHdrSea"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let t=Math.round(window.innerWidth*e*we),n=Math.round(window.innerHeight*e*we);const s=Math.max(t,n);if(s>xe){const a=xe/s;t=Math.round(t*a),n=Math.round(n*a)}t=Math.max(1,t),n=Math.max(1,n),(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.gl&&this.gl.viewport(0,0,t,n))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},Ke))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const t=Math.random()*Math.PI*2;this.dir=[Math.cos(t),Math.sin(t)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e-this.lastTick<1e3/Ze))return;const t=(e-this.lastTick)/1e3;if(this.lastTick=e,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+t/Qe),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+t/Je),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.renderFrame(e),this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){if(!this.ready||!this.canvas)return;const t=((e||performance.now())-this.startTime)/1e3;if(this.backend==="webgpu"&&this.gpu){this.renderGpu(t);return}const n=this.gl;n&&(n.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),n.uniform1f(this.uTime,t),n.uniform1f(this.uReveal,re(Z(this.reveal))),n.uniform1f(this.uOpaque,this.opaqueMax),n.uniform1f(this.uMode,this.mode),n.uniform2f(this.uDir,this.dir[0],this.dir[1]),n.uniform1f(this.uDrain,re(Z(this.drain))),n.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),n.uniform1f(this.uHdrFish,this.hdrFish),n.uniform1f(this.uHdrSea,this.hdrSea),n.drawArrays(n.TRIANGLES,0,3))}renderGpu(e){const{device:t,ctx:n,pipeline:s,ubuf:a,bind:r,u:l}=this.gpu;l[0]=this.canvas.width,l[1]=this.canvas.height,l[2]=1,l[3]=e,l[4]=re(Z(this.reveal)),l[5]=this.opaqueMax,l[6]=this.mode,l[7]=re(Z(this.drain)),l[8]=this.dir[0],l[9]=this.dir[1],l[10]=this.mouse[0],l[11]=this.mouse[1],l[12]=this.hdrFish,l[13]=this.hdrSea,t.queue.writeBuffer(a,0,l);const c=t.createCommandEncoder(),o=c.beginRenderPass({colorAttachments:[{view:n.getCurrentTexture().createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]});o.setPipeline(s),o.setBindGroup(0,r),o.draw(3),o.end(),t.queue.submit([c.finish()])}debugSet(e={}){this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=Z(e.reveal)),typeof e.drain=="number"&&(this.drain=Z(e.drain)),typeof e.hdrFish=="number"&&(this.hdrFish=e.hdrFish),typeof e.hdrSea=="number"&&(this.hdrSea=e.hdrSea),this.startTime||(this.startTime=performance.now());const t=()=>{this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now())};return this.ready?t():this.initPromise&&this.initPromise.then(n=>{n&&this.paused&&t()}),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode,backend:this.backend,hdrFish:this.hdrFish,hdrSea:this.hdrSea}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=Ee,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}function ot(i,e){let t=0,n="";for(const s of i){const a=s.codePointAt(0),r=a>=12288&&a<=12351||a>=13312&&a<=40959||a>=65280&&a<=65519;if(t+=r?1:.5,t>e)return n.replace(/\s+$/,"")+"…";n+=s}return n}function Pe(i,e,t={}){let n=(i||"").trim();const s=n.search(/[（(]/);s>4&&(n=n.slice(0,s));const a=n.indexOf(" · ");if(a>0&&(n=n.slice(0,a)),e!=="quote"&&e!=="cite"){const r=n.indexOf(" — ");r>0&&(n=n.slice(0,r))}if(n=n.trim(),t.short){const r=n.search(/[，,]/);r>1&&(n=n.slice(0,r)),n=ot(n,15)}return n}const Se=160,le=[1,1.25,1.5,2],Re="daily-audio-rate";function he(i){if(!isFinite(i)||i<0)return"--:--";const e=Math.floor(i/60),t=Math.floor(i%60);return`${e}:${String(t).padStart(2,"0")}`}function rt(){try{const i=parseFloat(localStorage.getItem(Re));return le.includes(i)?i:1}catch{return 1}}function lt(i){try{localStorage.setItem(Re,String(i))}catch{}}function ct(i){let e=i.nextElementSibling;for(let t=0;e&&t<4;t++){if(/^H[1-6]$/.test(e.tagName)||e.querySelector("audio"))return null;if(e.matches('details.callout[data-callout="note"]')){const n=e.querySelector("summary");if(n&&/跟读/.test(n.textContent||""))return e}e=e.nextElementSibling}return null}function dt(i){let e=i.previousElementSibling;for(;e;){if(/^H[1-6]$/.test(e.tagName))return(e.textContent||"").trim();e=e.previousElementSibling}return""}const ht=10;function ut(i){const e=i.match(/[A-Za-z][A-Za-z0-9-]{2,}/g)||[],t=i.match(/[一-鿿]{2,}/g)||[];return new Set([...e,...t].map(n=>n.toLowerCase()))}function ft(i,e){const t=ut(i);let n=-1,s=0,a=0;if(e.forEach((c,o)=>{const u=c.toLowerCase();let b=0,f=1/0;t.forEach(x=>{const S=u.indexOf(x);S!==-1&&(b+=x.length,S<f&&(f=S))}),b>s&&(s=b,n=o,a=f===1/0?0:f)}),s<ht)return{para:-1,offset:0};const r=e[n];let l=a;for(;l>0&&!/[。！？!?；;\n]/.test(r[l-1]);)l--;return{para:n,offset:l}}const pt='<svg class="daily-player__ic-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 4.3a1 1 0 0 1 1.53-.85l12 7.7a1 1 0 0 1 0 1.7l-12 7.7a1 1 0 0 1-1.53-.85Z"/></svg>',mt='<svg class="daily-player__ic-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/></svg>',Le='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 4.3a1 1 0 0 1 1.53-.85l12 7.7a1 1 0 0 1 0 1.7l-12 7.7a1 1 0 0 1-1.53-.85Z"/></svg>',vt='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/></svg>';function gt(i){const e=(i&&i.textContent||"").trim(),t=(e.match(/@[A-Za-z0-9_]+/)||[])[0];return t?`X · ${t}`:/hacker\s*news|ycombinator|buzzing/i.test(e)?"Hacker News":/marktechpost/i.test(e)?"MarkTechPost":e.split(/[（(：:]/)[0].trim().slice(0,22)||"来源"}class yt{constructor(e,t,n){this.audio=e,this.registry=n,this.dragging=!1,this.pendingMeta=null;const s=dt(t),a=ct(t);if(this.root=document.createElement("section"),this.root.className="daily-audio",this.el=document.createElement("div"),this.el.className="daily-player",this.el.dataset.state="idle",this.el.innerHTML=`<button type="button" class="daily-player__btn" aria-label="播放">${pt}${mt}</button><div class="daily-player__main"><div class="daily-player__meta"><span class="daily-player__label"></span><span class="daily-player__time"><span class="daily-player__cur">0:00</span> / <span class="daily-player__dur">--:--</span></span></div><input class="daily-player__seek" type="range" min="0" max="1000" step="1" value="0" aria-label="播放进度"></div><div class="daily-player__side"><button type="button" class="daily-player__rate" aria-label="播放速度">1×</button></div>`,this.root.appendChild(this.el),this.el.querySelector(".daily-player__label").textContent=s?`${s} · 语音速览`:"本节语音",this.panel=null,this.paras=[],a){this.panel=document.createElement("div"),this.panel.className="daily-transcript",this.panel.hidden=!0;const r=document.createElement("p");r.className="daily-transcript__hint",r.textContent="跟读文稿 · 点击任意段落，从那里开始朗读",this.panel.appendChild(r);const l=a.querySelector(".callout-content");for(;l&&l.firstChild;)this.panel.appendChild(l.firstChild);a.remove(),this.root.appendChild(this.panel),this.tsBtn=document.createElement("button"),this.tsBtn.type="button",this.tsBtn.className="daily-player__ts",this.tsBtn.setAttribute("aria-expanded","false"),this.tsBtn.textContent="文稿",this.el.querySelector(".daily-player__side").appendChild(this.tsBtn)}if(t.replaceWith(this.root),e.removeAttribute("controls"),e.preload="metadata",this.root.appendChild(e),this.panel){this.paras=Array.from(this.panel.querySelectorAll("p:not(.daily-transcript__hint)")).filter(o=>o.textContent.trim());const r=this.paras.map(o=>Math.max(1,o.textContent.trim().length)),l=r.reduce((o,u)=>o+u,0);let c=0;this.ends=r.map(o=>(c+=o)/l),this.current=-1,this.paras.forEach((o,u)=>{o.classList.add("transcript-para"),o.setAttribute("title","点击从这一段开始播放"),o.addEventListener("click",()=>this.seekToPara(u))})}this.bind(),this.applyRate(rt()),this.itemsByPara=[],this.activeItemBtn=null,this.paras.length&&this.attachItemButtons()}attachItemButtons(){const e=[];let t=this.root.nextElementSibling;for(;t&&!/^H[1-6]$/.test(t.tagName);)t.matches&&t.matches("details.callout")&&!t.querySelector("audio")&&e.push(t),t=t.nextElementSibling;const n=this.paras.map(a=>a.textContent);let s=0;e.forEach(a=>{const r=a.querySelector("summary");if(!r)return;a.classList.add("daily-item");const l=ft(r.textContent||"",n),c=l.para===-1?s:l.para;l.para!==-1&&(s=l.para,(this.itemsByPara[l.para]||(this.itemsByPara[l.para]=[])).push(a));const o=l.para===-1?this.paraStartF(c):this.paraFrac(c,l.offset),u=document.createElement("button");u.type="button",u.className="daily-item-play",u.dataset.para=String(c),u.setAttribute("aria-label","从这条开始朗读"),u.setAttribute("title","从这条开始朗读"),u.innerHTML=Le,u.addEventListener("click",p=>{if(p.preventDefault(),p.stopPropagation(),this.activeItemBtn===u)if(this.audio.paused){const w=this.audio.play();w&&w.catch&&w.catch(()=>{})}else this.audio.pause();else this.setActiveItemBtn(u),this.seekToFrac(o)});const b=r.querySelector(".callout-title-inner");if(b){const p=b.textContent.trim(),w=Pe(p,a.dataset.callout||"",{short:!1});w&&w!==p&&(b.textContent=w,b.setAttribute("title",p))}const f=document.createElement("div");f.className="daily-item-main";const x=document.createElement("div");x.className="daily-item-headrow",b&&x.appendChild(b),x.appendChild(u),f.appendChild(x);const S=a.querySelector(".callout-content"),I=S&&S.querySelector("p");if(I){const p=I.textContent.split(/\u{1F517}/u)[0].trim();if(p){const w=document.createElement("span");w.className="daily-item-dek",w.textContent=p,f.appendChild(w)}}const D=S?S.querySelectorAll("a[href]"):[],_=D.length?D[D.length-1]:null;if(_){const p=document.createElement("span");p.className="daily-item-src",p.textContent=gt(_),f.appendChild(p)}const v=a.dataset.tocNumber;if(v){const p=document.createElement("span");p.className="daily-item-no",p.textContent=v,r.appendChild(p)}r.appendChild(f)})}bind(){const e=n=>this.el.querySelector(n);this.btn=e(".daily-player__btn"),this.seek=e(".daily-player__seek"),this.cur=e(".daily-player__cur"),this.dur=e(".daily-player__dur"),this.rateBtn=e(".daily-player__rate");const t=this.audio;this.btn.addEventListener("click",()=>{if(t.paused){const n=t.play();n&&n.catch&&n.catch(()=>{})}else t.pause()}),this.rateBtn.addEventListener("click",()=>{const n=le[(le.indexOf(t.playbackRate)+1)%le.length]||1;lt(n),this.registry.forEach(s=>s.applyRate(n))}),this.tsBtn&&this.tsBtn.addEventListener("click",()=>this.setPanel(this.panel.hidden)),this.seek.addEventListener("input",()=>{this.dragging=!0,this.paintSeek(Number(this.seek.value)/1e3)}),this.seek.addEventListener("change",()=>{this.dragging=!1,this.clearActiveItemBtn();const n=Number(this.seek.value)/1e3;this.ensureMetadata(()=>{t.currentTime=n*t.duration})}),t.addEventListener("loadedmetadata",()=>{this.dur.textContent=he(t.duration)}),t.addEventListener("durationchange",()=>{this.dur.textContent=he(t.duration)}),t.addEventListener("timeupdate",()=>{!this.dragging&&isFinite(t.duration)&&t.duration>0&&this.paintSeek(t.currentTime/t.duration),this.syncPara()}),t.addEventListener("seeked",()=>this.syncPara()),t.addEventListener("play",()=>this.onPlay()),t.addEventListener("pause",()=>{this.el.dataset.state="paused",this.btn.setAttribute("aria-label","播放"),this.setItemsLit(!1),this.activeItemBtn&&this.setItemBtnState(this.activeItemBtn,!1)}),t.addEventListener("ended",()=>{this.el.dataset.state="idle",this.btn.setAttribute("aria-label","播放"),this.setCurrentPara(-1,!1),this.clearActiveItemBtn()})}onPlay(){this.el.dataset.state="playing",this.btn.setAttribute("aria-label","暂停"),this.registry.forEach(e=>{e!==this&&!e.audio.paused&&e.audio.pause()}),this.setItemsLit(!0),this.activeItemBtn&&this.setItemBtnState(this.activeItemBtn,!0)}setItemsLit(e){(this.itemsByPara[this.current]||[]).forEach(t=>t.classList.toggle("is-reading-item",e))}setItemBtnState(e,t){if(!e)return;e.innerHTML=t?vt:Le;const n=t?"暂停朗读":"从这条开始朗读";e.setAttribute("aria-label",n),e.setAttribute("title",n),e.classList.toggle("is-playing",t)}setActiveItemBtn(e){this.activeItemBtn&&this.activeItemBtn!==e&&this.setItemBtnState(this.activeItemBtn,!1),this.activeItemBtn=e}clearActiveItemBtn(){this.activeItemBtn&&this.setItemBtnState(this.activeItemBtn,!1),this.activeItemBtn=null}setPanel(e){this.panel&&(this.panel.hidden=!e,this.tsBtn.setAttribute("aria-expanded",e?"true":"false"))}applyRate(e){this.audio.playbackRate=e,this.audio.defaultPlaybackRate=e,this.rateBtn&&(this.rateBtn.textContent=`${e}×`)}paintSeek(e){const t=Math.max(0,Math.min(1,e));this.seek.value=String(Math.round(t*1e3)),this.seek.style.setProperty("--p",`${t*100}%`),isFinite(this.audio.duration)&&this.audio.duration>0&&(this.cur.textContent=he(t*this.audio.duration))}ensureMetadata(e){const t=this.audio;if(t.readyState>=1&&isFinite(t.duration)&&t.duration>0){e();return}this.pendingMeta&&t.removeEventListener("loadedmetadata",this.pendingMeta),this.pendingMeta=()=>{this.pendingMeta=null,e()},t.addEventListener("loadedmetadata",this.pendingMeta,{once:!0}),t.preload="metadata",t.load()}paraStartF(e){return e<=0?0:this.ends[e-1]}paraFrac(e,t){const n=this.paraStartF(e),s=this.ends[e],a=Math.max(1,(this.paras[e]?this.paras[e].textContent:"").length),r=Math.min(1,Math.max(0,t/a));return n+r*(s-n)}seekToFrac(e){this.ensureMetadata(()=>{this.audio.currentTime=Math.max(0,e)*this.audio.duration+.01;const t=this.audio.play();t&&t.catch&&t.catch(()=>{})})}seekToPara(e){this.seekToFrac(this.paraStartF(e))}syncPara(){if(!this.paras.length)return;const e=this.audio.duration;if(!isFinite(e)||e<=0)return;const t=this.audio.currentTime/e;let n=this.ends.findIndex(s=>t<s);n===-1&&(n=this.paras.length-1),this.setCurrentPara(n,!this.audio.paused)}setCurrentPara(e,t){if(e===this.current)return;const n=this.paras[this.current];n&&n.classList.remove("is-reading"),(this.itemsByPara[this.current]||[]).forEach(r=>r.classList.remove("is-reading-item")),this.current=e;const s=this.paras[e];if(!s)return;s.classList.add("is-reading"),this.setItemsLit(!this.audio.paused);const a=n||this.panel;t&&a&&this.nearViewport(a)&&s.scrollIntoView({block:"nearest",behavior:"smooth"})}nearViewport(e){const t=e.getBoundingClientRect(),n=window.innerHeight||document.documentElement.clientHeight||0;return t.bottom>-Se&&t.top<n+Se}}class bt{constructor(){if(!document.body.classList.contains("type-daily-feed"))return;const e=[];Array.from(document.querySelectorAll(".content audio")).forEach(t=>{const n=t.closest("details.callout, div.callout");n&&e.push(new yt(t,n,e))})}}function wt(){const i=document.querySelector(".signal");if(!i)return;const e=(i.getAttribute("data-audiobase")||"").replace(/\/$/,""),t=new Audio;let n=null,s=[],a=0,r=null;const l=v=>`${e}/${v}.m4a`,c=v=>Array.from(i.querySelectorAll(`[data-id="${CSS.escape(v)}"]`)),o=(v,p)=>c(v).forEach(w=>w.classList.toggle("playing",p));function u(v){const p=v==="featured"?"#sec-featured .has-audio":`#sec-${v} .drow.has-audio`,w=[],O={};return i.querySelectorAll(p).forEach(Q=>{const W=Q.dataset.id;W&&!O[W]&&(O[W]=1,w.push(W))}),w}function b(){i.querySelectorAll(".secplay").forEach(v=>{const p=r&&v.dataset.scope===r;v.classList.toggle("playing",p);const w=v.querySelector(".t");w&&(w.textContent=p?"暂停":"连播")})}function f(v){n&&o(n,!1),n=v,o(v,!0),t.src=l(v);const p=t.play();p&&p.catch&&p.catch(()=>{})}function x(v){s=u(v),a=0,r=v,b(),s.length&&f(s[0])}function S(){r=null,s=[],b(),t.pause(),n&&(o(n,!1),n=null)}t.addEventListener("ended",()=>{if(r&&(a++,a<s.length)){f(s[a]);return}r=null,b(),n&&(o(n,!1),n=null)}),i.querySelectorAll(".pkey").forEach(v=>{v.addEventListener("click",p=>{p.preventDefault(),p.stopPropagation();const w=v.dataset.id;if(n===w&&!t.paused){t.pause(),o(w,!1),n=null,r=null,b();return}r=null,b(),f(w)})}),i.querySelectorAll(".secplay").forEach(v=>{v.addEventListener("click",()=>{const p=v.dataset.scope;if(r===p&&!t.paused){S();return}x(p)})}),i.querySelectorAll(".mcard").forEach(v=>{v.addEventListener("click",p=>{p.target.closest(".pkey")||p.target.closest("a")||v.classList.toggle("open")})}),i.querySelectorAll(".drow").forEach(v=>{const p=v.querySelector(".drow__head");p&&p.addEventListener("click",w=>{w.target.closest(".pkey")||w.target.closest("a")||v.classList.toggle("open")})});const I=[].slice.call(i.querySelectorAll(".dpill")),D=v=>{const p=v.getBoundingClientRect().top+window.pageYOffset-70;window.scrollTo({top:Math.max(0,p),behavior:"smooth"})};function _(v,p){i.setAttribute("data-view",v),I.forEach(w=>w.classList.toggle("active",w.dataset.sec===p))}if(I.forEach(v=>{v.addEventListener("click",p=>{p.preventDefault();const w=v.dataset.sec;if(w==="featured")_("featured","featured"),D(i);else{_("news",w);const O=i.querySelector("#sec-"+w);O&&D(O)}})}),(i.getAttribute("data-view")||"featured")==="featured")_("featured","featured");else{const v=i.querySelector(".dpaper .dsec");_("news",v?v.id.replace("sec-",""):null)}}class xt{constructor(){this.init()}init(){document.addEventListener("mouseover",e=>{e.target.tagName==="A"&&this.showTooltip(e.target)}),document.addEventListener("mouseout",e=>{e.target.tagName==="A"&&this.hideTooltip()})}showTooltip(e){const t=e.getAttribute("data-title");if(!t||t==="")return;const n=document.createElement("span");n.className="tooltip",n.textContent=t,e.parentNode.insertBefore(n,e.nextSibling);const s=n.offsetWidth,a=e.offsetWidth,r=e.offsetHeight+3+4;let l=s;s<a&&(l=a,n.style.width=l+"px");const c=-(l-a)/2;n.style.left=c+"px",n.style.bottom=r+"px",setTimeout(()=>{n.style.opacity="1"},10)}hideTooltip(){document.querySelectorAll(".tooltip").forEach(t=>{t.remove()})}}class Et{constructor(){this.mapElement=document.getElementById("map"),this.init()}init(){this.mapElement&&(this.adjustMapLayout(),window.addEventListener("resize",()=>{this.adjustMapLayout()}))}adjustMapLayout(){const e=document.querySelector("header"),t=window.innerHeight,n=window.innerWidth;if(!e)return;const s=e.offsetWidth+50,a=this.mapElement.offsetWidth;this.mapElement.style.maxWidth=a+"px",this.mapElement.style.height=t+"px",n>1100?this.mapElement.style.marginLeft=s+"px":this.mapElement.style.marginLeft="0"}}class St{constructor(){this.overlay=null,this.zoomImg=null,this.hint=null,this.scale=1,this.minScale=.2,this.maxScale=6,this.lastPos={x:0,y:0},this.origin={x:0,y:0},this.dragging=!1,this.wheelTimeout=null,this.init()}init(){this.bindImages(),new MutationObserver(t=>{for(let n=0;n<t.length;n++)if(t[n].addedNodes.length){this.bindImages();break}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}buildOverlay(){this.overlay=document.createElement("div"),this.overlay.id="image-zoom-overlay",this.overlay.className="fade-in",this.overlay.innerHTML=`
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `,document.body.appendChild(this.overlay),this.zoomImg=this.overlay.querySelector(".image-zoom-img"),this.hint=this.overlay.querySelector(".image-zoom-hint"),this.bindOverlayEvents()}openOverlay(e){this.overlay||this.buildOverlay(),this.overlay.style.display="flex",this.zoomImg.src=e,this.scale=1,this.lastPos.x=0,this.lastPos.y=0,this.applyTransform(),this.hint&&(this.hint.style.opacity="1",this.hint.style.transition="opacity .5s",clearTimeout(this.hint._hideTimer),this.hint._hideTimer=setTimeout(()=>{this.hint.style.opacity="0"},3e3))}closeOverlay(){this.overlay&&(this.overlay.style.display="none",this.zoomImg.src="")}applyTransform(){this.zoomImg.style.transform=`translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`}onWheel(e){e.preventDefault();const t=this.zoomImg.getBoundingClientRect(),n=e.clientX-t.left-t.width/2,s=e.clientY-t.top-t.height/2,a=e.deltaY>0?-.12:.12,r=Math.max(this.minScale,Math.min(this.maxScale,this.scale+a)),l=r/this.scale;this.lastPos.x=(this.lastPos.x+n)*l-n,this.lastPos.y=(this.lastPos.y+s)*l-s,this.scale=r,this.applyTransform(),this.hint&&(this.hint.style.opacity="0.3",clearTimeout(this.wheelTimeout),this.wheelTimeout=setTimeout(()=>{this.hint.style.opacity="1"},400))}onMouseDown(e){e.button===0&&(this.dragging=!0,this.origin.x=e.clientX,this.origin.y=e.clientY,this.overlay.style.cursor="grabbing")}onMouseMove(e){if(!this.dragging)return;const t=e.clientX-this.origin.x,n=e.clientY-this.origin.y;this.origin.x=e.clientX,this.origin.y=e.clientY,this.lastPos.x+=t,this.lastPos.y+=n,this.applyTransform()}onMouseUp(){this.dragging=!1,this.overlay&&(this.overlay.style.cursor="default")}onDblClick(){this.closeOverlay()}onKey(e){e.key==="Escape"&&this.overlay&&this.overlay.style.display==="flex"&&this.closeOverlay()}bindOverlayEvents(){this.zoomImg.addEventListener("wheel",e=>this.onWheel(e),{passive:!1}),this.zoomImg.addEventListener("mousedown",e=>this.onMouseDown(e)),this.zoomImg.addEventListener("dblclick",()=>this.onDblClick()),window.addEventListener("mousemove",e=>this.onMouseMove(e)),window.addEventListener("mouseup",()=>this.onMouseUp()),window.addEventListener("keydown",e=>this.onKey(e)),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.closeOverlay()})}bindImages(){const e="article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img";document.querySelectorAll(e).forEach(n=>{n.classList.contains("image-zoomable")||(n.classList.add("image-zoomable"),n.style.cursor="zoom-in",n.addEventListener("click",()=>{this.openOverlay(n.getAttribute("data-origin")||n.src)}))})}}class Lt{constructor(){this.initializeEmbeds()}initializeEmbeds(){this.processTextNodes(document.body),this.processCodeBlocks(),this.processMarkdownSyntax()}processTextNodes(e){["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(e.tagName)||(e.nodeType===Node.TEXT_NODE?this.processTextNode(e):Array.from(e.childNodes).forEach(t=>{this.processTextNodes(t)}))}processTextNode(e){const t=e.textContent,n=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let s;const a=[];for(;(s=n.exec(t))!==null;)a.push({fullMatch:s[0],shaderID:s[1],index:s.index});a.length>0&&this.replaceWithIframes(e,a)}processCodeBlocks(){document.querySelectorAll("code, pre").forEach(t=>{const n=t.textContent,s=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let a;for(;(a=s.exec(n))!==null;){const r=n.trim();if(r===a[0]||r===a[0].replace(/\?.*$/,"")){this.replaceElementWithIframe(t,a[1]);break}}})}replaceWithIframes(e,t){const n=e.parentNode;if(!n)return;const s=e.textContent,a=[];let r=0;t.sort((c,o)=>o.index-c.index),t.reverse().forEach(c=>{c.index>r&&a.unshift({type:"text",content:s.substring(r,c.index)}),a.unshift({type:"iframe",shaderID:c.shaderID,originalURL:c.fullMatch}),r=c.index+c.fullMatch.length}),r<s.length&&a.unshift({type:"text",content:s.substring(r)});const l=[];a.forEach(c=>{if(c.type==="text"&&c.content.trim())l.push(document.createTextNode(c.content));else if(c.type==="iframe"){const o=this.createShaderToyEmbed(c.shaderID,c.originalURL);l.push(o)}}),l.forEach(c=>{n.insertBefore(c,e)}),n.removeChild(e)}replaceElementWithIframe(e,t){const n=this.createShaderToyEmbed(t);e.parentNode.replaceChild(n,e)}createShaderToyEmbed(e,t=null){const n=document.createElement("div");n.className="shadertoy-embed-container",n.style.cssText=`
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
        `;const a=document.createElement("div");a.style.cssText=`
            display: flex;
            align-items: center;
            gap: 10px;
        `;const r=document.createElement("span");r.innerHTML="🎨",r.style.cssText=`
            font-size: 20px;
            filter: drop-shadow(0 0 5px rgba(255,215,0,0.5));
        `;const l=document.createElement("span");l.textContent=`ShaderToy: ${e}`,l.style.cssText=`
            color: #ffd700;
            font-weight: bold;
            font-size: 16px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        `,a.appendChild(r),a.appendChild(l);const c=document.createElement("div");c.style.cssText=`
            display: flex;
            gap: 8px;
        `;const o=document.createElement("a");o.href=t||`https://www.shadertoy.com/view/${e}`,o.target="_blank",o.innerHTML="🔗 Open in ShaderToy",o.style.cssText=`
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
        `,o.addEventListener("mouseenter",()=>{o.style.background="#66b3ff",o.style.color="#000",o.style.transform="translateY(-1px)"}),o.addEventListener("mouseleave",()=>{o.style.background="rgba(102,179,255,0.1)",o.style.color="#66b3ff",o.style.transform="translateY(0)"}),c.appendChild(o),s.appendChild(a),s.appendChild(c);const u=document.createElement("div");u.style.cssText=`
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 50%; /* 2:1 aspect ratio */
            border-radius: 8px;
            overflow: hidden;
            background: #000;
        `;const b=document.createElement("iframe");b.src=`https://www.shadertoy.com/embed/${e}?gui=true&t=10&paused=false&muted=false`,b.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `,b.allowFullscreen=!0,b.loading="lazy";const f=document.createElement("div");f.innerHTML=`
            <div style="text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #ffd700; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
                <div style="color: #999; font-size: 14px;">Loading ShaderToy...</div>
            </div>
        `,f.style.cssText=`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
        `;const x=document.createElement("style");return x.textContent=`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `,document.head.appendChild(x),b.addEventListener("load",()=>{f.style.display="none"}),u.appendChild(b),u.appendChild(f),n.appendChild(s),n.appendChild(u),n}processMarkdownSyntax(){const e=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(s){var r;const a=(r=s.parentElement)==null?void 0:r.tagName;return["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(a)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[];let n;for(;n=e.nextNode();)t.push(n);t.forEach(s=>{const a=s.textContent,r=/\[(shader|shadertoy):(\w+)\]/g;let l;const c=[];for(;(l=r.exec(a))!==null;)c.push({fullMatch:l[0],shaderID:l[2],index:l.index});c.length>0&&this.replaceMarkdownSyntax(s,c)})}replaceMarkdownSyntax(e,t){const n=e.parentNode;if(!n)return;const s=e.textContent,a=[];let r=0;t.sort((c,o)=>o.index-c.index),t.reverse().forEach(c=>{c.index>r&&a.unshift({type:"text",content:s.substring(r,c.index)}),a.unshift({type:"iframe",shaderID:c.shaderID,originalURL:null}),r=c.index+c.fullMatch.length}),r<s.length&&a.unshift({type:"text",content:s.substring(r)});const l=[];a.forEach(c=>{if(c.type==="text"&&c.content.trim())l.push(document.createTextNode(c.content));else if(c.type==="iframe"){const o=this.createShaderToyEmbed(c.shaderID,c.originalURL);l.push(o)}}),l.forEach(c=>{n.insertBefore(c,e)}),n.removeChild(e)}}class Ct{constructor(){this.init()}init(){const e=document.querySelector(".content");if(!e)return;e.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(n=>{const s=document.createElement("span");s.className="collapse-button",n.insertBefore(s,n.firstChild),s.addEventListener("click",a=>{a.stopPropagation(),this.toggleCollapse(n)})})}toggleCollapse(e){const t=parseInt(e.tagName[1]);let n=e.nextElementSibling;e.classList.toggle("collapsed");const s=e.classList.contains("collapsed");for(;n&&!(n.tagName&&n.tagName.match(/^H[1-6]$/)&&parseInt(n.tagName[1])<=t);)n.style.display=s?"none":"",n=n.nextElementSibling}}class kt{constructor(){this.init()}init(){this.initCodeBlockExpansion(),new MutationObserver(t=>{let n=!1;t.forEach(s=>{s.addedNodes.length>0&&s.addedNodes.forEach(a=>{a.nodeType===1&&(a.matches("figure.highlight")||a.querySelector("figure.highlight"))&&(n=!0)})}),n&&setTimeout(()=>this.initCodeBlockExpansion(),100)}).observe(document.body,{childList:!0,subtree:!0})}initCodeBlockExpansion(){document.querySelectorAll("figure.highlight").forEach(t=>{if(t.closest(".code-block-container"))return;const n=t.querySelector("table");if(n){const o=n.querySelector("td.code");if(o){const u=document.createElement("pre");u.className="code",u.innerHTML=o.innerHTML,t.innerHTML="",t.appendChild(u)}}const s=t.querySelector("pre.code");if(!s)return;const a=s.scrollHeight,r=400,l=document.createElement("div");l.className="code-buttons";const c=document.createElement("button");if(c.className="copy-code-button",c.textContent="复制代码",c.addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),this.copyCodeToClipboard(s,c)}),l.appendChild(c),a>r){const o=document.createElement("div");o.className="code-block-container collapsed",t.parentNode.insertBefore(o,t),o.appendChild(t);const u=document.createElement("button");u.className="expand-button",u.textContent="展开代码",l.appendChild(u),o.appendChild(l),u.addEventListener("click",()=>{o.classList.contains("collapsed")&&this.showFullscreenCode(t)})}else{const o=document.createElement("div");o.className="code-block-container",t.parentNode.insertBefore(o,t),o.appendChild(t),o.appendChild(l)}})}showFullscreenCode(e){const t=document.createElement("div");t.className="code-fullscreen-modal active";const n=document.createElement("div");n.className="code-fullscreen-content";const a=(e.closest(".code-block-container")||e).cloneNode(!0);a.querySelectorAll(".code-buttons, .copy-code-button, .expand-button").forEach(f=>{f.parentNode&&f.parentNode.removeChild(f)});const l=a.classList.contains("code-block-container")?a:a.querySelector(".code-block-container");l&&(l.classList.remove("collapsed"),l.style.margin="0");const c=(l||a).querySelector("pre.code");c&&(c.scrollTop=0),n.appendChild(a);const o=document.createElement("button");o.className="close-fullscreen",o.textContent="关闭",n.appendChild(o),t.appendChild(n),document.body.appendChild(t),document.body.style.overflow="hidden";const u=()=>{document.body.removeChild(t),document.body.style.overflow=""};o.addEventListener("click",u),t.addEventListener("click",f=>{f.target===t&&u()});const b=f=>{f.key==="Escape"&&(u(),document.removeEventListener("keydown",b))};document.addEventListener("keydown",b)}copyCodeToClipboard(e,t){const n=e.textContent||e.innerText;navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(n).then(()=>{this.showCopySuccess(t)}).catch(s=>{console.error("复制失败:",s),this.fallbackCopy(n,t)}):this.fallbackCopy(n,t)}fallbackCopy(e,t){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="2em",n.style.height="2em",n.style.padding="0",n.style.border="none",n.style.outline="none",n.style.boxShadow="none",n.style.background="transparent",document.body.appendChild(n),n.focus(),n.select();try{document.execCommand("copy")&&this.showCopySuccess(t)}catch(s){console.error("复制失败:",s)}document.body.removeChild(n)}showCopySuccess(e){const t=e.textContent;e.classList.add("copied"),e.textContent="已复制 ✓",setTimeout(()=>{e.classList.remove("copied"),e.textContent=t},2e3)}}const Ce=1.2,ke=1.15,At=.2,Mt=50,Tt="canvas-arrow-modal-";let Ae=0;class It{constructor(){const e=document.querySelectorAll(".canvas-embed:not(.canvas-embed--error)");if(e.length)for(const t of e)this.attach(t)}attach(e){e.setAttribute("role","button"),e.setAttribute("tabindex","0"),e.setAttribute("aria-label","点击放大查看画布"),e.addEventListener("click",t=>{t.target.closest("a")||(t.preventDefault(),this.openModal(e))}),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.openModal(e))})}openModal(e){const t=e.querySelector(".canvas-svg");if(!t)return;const n=t.cloneNode(!0);Pt(n),n.classList.add("canvas-modal__svg");const s=document.createElement("div");s.className="canvas-modal",s.innerHTML=`
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
    `,s.querySelector(".canvas-modal__viewport").appendChild(n),document.body.appendChild(s),document.body.classList.add("canvas-modal-open");const a=new Rt(n),r=c=>{c.key==="Escape"&&l()},l=()=>{a.destroy(),s.remove(),document.body.classList.remove("canvas-modal-open"),document.removeEventListener("keydown",r)};s.querySelector(".canvas-modal__close").addEventListener("click",l),s.querySelector(".canvas-modal__overlay").addEventListener("click",l),document.addEventListener("keydown",r),s.querySelectorAll(".canvas-modal__btn").forEach(c=>{c.addEventListener("click",()=>{const o=c.dataset.action;o==="zoom-in"?a.zoomBy(Ce):o==="zoom-out"?a.zoomBy(1/Ce):o==="reset"&&a.reset()})})}}function Pt(i){const e=i.querySelector("#canvas-arrow");if(!e)return;Ae+=1;const t=`${Tt}${Ae}`;e.id=t,i.querySelectorAll("[marker-end]").forEach(n=>{n.setAttribute("marker-end",`url(#${t})`)})}class Rt{constructor(e){this.svg=e;const t=e.viewBox.baseVal;this.original={x:t.x,y:t.y,w:t.width,h:t.height},this.state={...this.original},this.pointers=new Map,this.pinch=null,this.svg.style.cursor="grab",this.svg.style.touchAction="none",this.onWheel=this.onWheel.bind(this),this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.svg.addEventListener("wheel",this.onWheel,{passive:!1}),this.svg.addEventListener("pointerdown",this.onPointerDown),this.svg.addEventListener("pointermove",this.onPointerMove),this.svg.addEventListener("pointerup",this.onPointerUp),this.svg.addEventListener("pointercancel",this.onPointerUp)}setViewBox(){const{x:e,y:t,w:n,h:s}=this.state;this.svg.setAttribute("viewBox",`${e} ${t} ${n} ${s}`)}currentScale(){return this.original.w/this.state.w}zoomBy(e,t,n){const s=this.currentScale()*e;s<At||s>Mt||(t==null&&(t=this.state.x+this.state.w/2),n==null&&(n=this.state.y+this.state.h/2),this.state.x=t-(t-this.state.x)/e,this.state.y=n-(n-this.state.y)/e,this.state.w/=e,this.state.h/=e,this.setViewBox())}pan(e,t){this.state.x-=e,this.state.y-=t,this.setViewBox()}reset(){this.state={...this.original},this.setViewBox()}screenToSvg(e,t){const n=this.svg.createSVGPoint();n.x=e,n.y=t;const s=this.svg.getScreenCTM();return s?n.matrixTransform(s.inverse()):{x:0,y:0}}onWheel(e){e.preventDefault();const t=e.deltaY<0?ke:1/ke,{x:n,y:s}=this.screenToSvg(e.clientX,e.clientY);this.zoomBy(t,n,s)}onPointerDown(e){e.target.closest("a")||(this.svg.setPointerCapture(e.pointerId),this.pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,svg:this.screenToSvg(e.clientX,e.clientY)}),this.pointers.size===2?this.pinch=this.computePinch():this.pointers.size===1&&(this.svg.style.cursor="grabbing"))}onPointerMove(e){const t=this.pointers.get(e.pointerId);if(t){if(t.clientX=e.clientX,t.clientY=e.clientY,this.pointers.size===2&&this.pinch){const n=this.computePinch(),s=n.dist/this.pinch.dist;if(s>0&&Number.isFinite(s)){const a=this.screenToSvg(n.cx,n.cy);this.zoomBy(s,a.x,a.y)}this.pinch=n}else if(this.pointers.size===1){const n=this.screenToSvg(e.clientX,e.clientY);this.pan(n.x-t.svg.x,n.y-t.svg.y)}}}onPointerUp(e){this.pointers.delete(e.pointerId),this.pointers.size<2&&(this.pinch=null),this.pointers.size===0&&(this.svg.style.cursor="grab")}computePinch(){const[e,t]=[...this.pointers.values()],n=t.clientX-e.clientX,s=t.clientY-e.clientY;return{dist:Math.hypot(n,s),cx:(e.clientX+t.clientX)/2,cy:(e.clientY+t.clientY)/2}}destroy(){this.svg.removeEventListener("wheel",this.onWheel),this.svg.removeEventListener("pointerdown",this.onPointerDown),this.svg.removeEventListener("pointermove",this.onPointerMove),this.svg.removeEventListener("pointerup",this.onPointerUp),this.svg.removeEventListener("pointercancel",this.onPointerUp)}}const ue={en:{Home:"Home",Daily:"Daily",Archives:"Archives",About:"About",Portfolio:"Portfolio",Bilibili:"Bilibili",GitHub:"GitHub",Instagram:"Instagram",Douban:"Douban",Email:"Email",RSS:"RSS",Language:"Language",Copyright:"Copyright","Powered by":"Powered by","Modified based on":"Modified based on",theme:"theme","Mainly maintained using AI":"Mainly maintained using AI","Older Posts":"Older Posts","Newer Posts":"Newer Posts",Comments:"Comments","Switch to Chinese":"Switch to Chinese","Switch to English":"Switch to English","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"Switched to English",articleLanguageSwitched:"Switched to English version","tag-graph-hint":"Click tag to explore · Scroll to zoom · Drag to rearrange"},"zh-CN":{Home:"首页",Daily:"资讯",Archives:"归档",About:"关于",Portfolio:"作品集",Bilibili:"哔哩哔哩",GitHub:"GitHub",Instagram:"Instagram",Douban:"豆瓣",Email:"邮箱",RSS:"RSS",Language:"语言",Copyright:"版权所有","Powered by":"技术支持","Modified based on":"基于",theme:"主题","Mainly maintained using AI":"主要使用AI来维护","Older Posts":"上一页","Newer Posts":"下一页",Comments:"留言","Switch to Chinese":"切换至中文","Switch to English":"切换至英文","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"已切换至中文",articleLanguageSwitched:"已切换至中文版本","tag-graph-hint":"点击标签探索 · 滚轮缩放 · 拖拽移动"}},Nt=()=>(navigator.language||navigator.userLanguage).startsWith("zh")?"zh-CN":"en",Ne=()=>localStorage.getItem("siteLanguage")||Nt(),zt=()=>{const i=document.cookie.match(/(?:^|;\s*)lang_pref=([^;]+)/);return i?i[1]:null},_t=i=>{document.cookie="lang_pref="+i+"; path=/; max-age=31536000; samesite=lax"},ze=()=>{const i=document.querySelector('meta[name="article:lang"]');return i?i.content:window.location.pathname.includes(".zh-CN")?"zh-CN":"en"},_e=i=>{const e=document.querySelector(`link[rel="alternate"][hreflang="${i}"]`);if(!e)return null;const t=new URL(e.href,window.location.origin);return window.location.origin+t.pathname+t.search+t.hash},De=i=>{document.querySelectorAll(".lang-switch__opt").forEach(e=>{e.setAttribute("aria-pressed",e.getAttribute("data-lang")===i?"true":"false")})},fe=i=>{const e=ue[i];if(!e){console.warn("Language data not available for:",i);return}document.documentElement.lang=i,document.querySelectorAll("nav ul li a").forEach(c=>{const o=c.getAttribute("data-i18n-key");o&&e[o]&&(c.textContent=e[o])}),document.querySelectorAll("[data-i18n]").forEach(c=>{const o=c.getAttribute("data-i18n");e[o]&&(c.textContent=e[o])}),document.querySelectorAll("[data-title]").forEach(c=>{const o=c.getAttribute("data-title");e[o]&&c.setAttribute("data-title",e[o])});const a=document.querySelector(".pagination .extend.prev"),r=document.querySelector(".pagination .extend.next");a&&(a.textContent=e["Older Posts"]||a.textContent),r&&(r.textContent=e["Newer Posts"]||r.textContent),localStorage.setItem("siteLanguage",i),document.querySelectorAll("[data-i18n-tag]").forEach(c=>{const o=c.getAttribute("data-i18n-tag");if(i==="zh-CN"){const u=window.tagTranslations&&window.tagTranslations[o];u&&(c.textContent=u)}else c.textContent=o}),De(i)},Dt=i=>{const e=document.querySelector(".lang-notification");e&&e.remove();const t=document.createElement("div");t.className="lang-notification",t.textContent=i,document.body.appendChild(t),setTimeout(()=>{t.classList.add("show")},10),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},2e3)},qe=i=>{if(_t(i),i===ze()){localStorage.setItem("siteLanguage",i),fe(i);return}const e=_e(i);if(e){localStorage.setItem("siteLanguage",i),window.location.href=e;return}fe(i);const t=ue[i]?ue[i].languageSwitched:"Language switched";Dt(t)},qt=()=>{const i=Ne()==="zh-CN"?"en":"zh-CN";qe(i)},Ft=()=>{document.querySelectorAll(".lang-switch__opt").forEach(i=>{i.addEventListener("click",e=>{e.preventDefault(),qe(i.getAttribute("data-lang"))})}),De(Ne())},Me=()=>{const i=ze(),e=zt();if(fe(e||i),e&&e!==i){const t=_e(e),n=t&&new URL(t,window.location.origin).pathname;n&&n!==window.location.pathname&&window.location.replace(t)}};function Ot(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Me):Me(),window.addEventListener("load",()=>{const i=document.getElementById("langSwitch");i&&i.addEventListener("click",e=>{e.preventDefault(),qt()}),Ft()})}function Ht(){const i=document.getElementById("tag-graph"),e=document.getElementById("tag-graph-container"),t=window.__TAG_GRAPH_DATA__;if(!i||!t||!t.nodes||t.nodes.length===0)return;const n=document.createElement("div");n.className="graph-loading",n.textContent="Loading",i.parentNode.appendChild(n);const s=t.archiveFilterTags||[],a={};s.forEach(function(d){a[d]=!0});function r(d){return String(d||"").replace(/-/g," ").replace(/\s+/g," ").trim().toLowerCase()}const l={};t.links.forEach(function(d){l[d.source]=(l[d.source]||0)+1,l[d.target]=(l[d.target]||0)+1});let c=1;t.nodes.forEach(function(d){const h=d.value||0;h>c&&(c=h)}),t.nodes.forEach(function(d){const h=d.value||0;d.symbolSize=Math.max(12,Math.min(70,12+h*(58/c)))});const o={};t.nodes.forEach(function(d){o[d.name]=[]});function u(d,h){!o[d]||!o[h]||d===h||(o[d].indexOf(h)===-1&&o[d].push(h),o[h].indexOf(d)===-1&&o[h].push(d))}t.links.forEach(function(d){u(d.source,d.target)});const b={};t.nodes.forEach(function(d){const h=r(d.name);b[h]||(b[h]=[]),b[h].push(d.name)}),Object.keys(b).forEach(function(d){const h=b[d];if(!(h.length<2))for(let y=0;y<h.length;y++)for(let C=y+1;C<h.length;C++)u(h[y],h[C])});const f={},x=[];s.forEach(function(d){o[d]!==void 0&&(f[d]=0,x.push(d))});let S=0;for(;S<x.length;){const d=x[S++];(o[d]||[]).forEach(function(h){f[h]===void 0&&(f[h]=f[d]+1,x.push(h))})}Object.keys(f).forEach(function(d){});const I=[{h:260,s:62,l:50},{h:15,s:80,l:55},{h:160,s:60,l:42},{h:220,s:72,l:52},{h:340,s:70,l:52},{h:45,s:85,l:50},{h:190,s:70,l:45},{h:90,s:55,l:45},{h:290,s:60,l:50},{h:30,s:75,l:48},{h:130,s:50,l:42},{h:0,s:70,l:55}];function D(d,h,y){return"hsl("+Math.round(d)+", "+Math.round(h)+"%, "+Math.round(y)+"%)"}const _={},v={},p=t.nodes.filter(function(d){return a[d.name]});p.sort(function(d,h){return h.value-d.value}),p.forEach(function(d,h){const y=I[h%I.length];v[d.name]=y,_[d.name]=D(y.h,y.s,y.l)});const w={};s.forEach(function(d){if(o[d]===void 0)return;const h={};h[d]=0;const y=[d];let C=0;for(;C<y.length;){const z=y[C++];(o[z]||[]).forEach(function(T){h[T]===void 0&&(h[T]=h[z]+1,y.push(T))})}w[d]=h});const O=t.nodes.filter(function(d){return!a[d.name]});let Q=1;O.forEach(function(d){let h=1/0;s.forEach(function(y){if(!w[y])return;const C=w[y][d.name];C!==void 0&&C<h&&(h=C)}),h<1/0&&h>Q&&(Q=h)}),O.forEach(function(d){const h=[];let y=0;if(s.forEach(function(m){if(!w[m]||!v[m])return;let E=w[m][d.name];if(E===void 0)return;E===0&&(E=.5);const A=1/(E*E);h.push({ft:m,w:A}),y+=A}),y===0){_[d.name]="hsl(0, 0%, 82%)";return}let C=0,z=0,T=0,L=0;h.forEach(function(m){const E=m.w/y,A=v[m.ft],F=A.h*Math.PI/180;C+=Math.sin(F)*E,z+=Math.cos(F)*E,T+=A.s*E,L+=A.l*E});let P=Math.atan2(C,z)*180/Math.PI;P<0&&(P+=360);let H=T,B=L,g=1/0;h.forEach(function(m){const E=w[m.ft][d.name];E<g&&(g=E)});let k=(g-1)/Math.max(Q-1,1);k=Math.max(0,Math.min(1,k));const N=Math.pow(k,.85),R=32,M=1-N*.35;H=Math.max(R,H*M),B=B+N*(82-B)*.78,_[d.name]=D(P,H,B)});const W=t.tagTranslations||{},ne={};Object.keys(W).forEach(function(d){ne[d]=W[d];const h=d.replace(/-/g," ");h!==d&&(ne[h]=W[d])});function ie(d){return(typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en")==="zh-CN"&&ne[d]?ne[d]:d}const ve=e.getBoundingClientRect(),j=ve.width||500,G=ve.height||400,ge=Math.min(j,G)*.28;p.forEach(function(d,h){const y=2*Math.PI*h/Math.max(p.length,1)-Math.PI/2;d.x=j/2+ge*Math.cos(y),d.y=G/2+ge*Math.sin(y)});const ye=Math.min(j,G)*.45;O.forEach(function(d,h){const y=2*Math.PI*h/Math.max(O.length,1);d.x=j/2+ye*Math.cos(y),d.y=G/2+ye*Math.sin(y)});const Be=60,q=t.nodes;for(let d=0;d<15;d++)for(let h=0;h<q.length;h++)for(let y=h+1;y<q.length;y++){const C=q[y].x-q[h].x,z=q[y].y-q[h].y,T=Math.sqrt(C*C+z*z),L=Be+(q[h].symbolSize+q[y].symbolSize)/2;if(T<L){const P=(L-T)/2,H=T>.1?C/T:Math.random()-.5,B=T>.1?z/T:Math.random()-.5;q[h].x-=H*P,q[h].y-=B*P,q[y].x+=H*P,q[y].y+=B*P}}let J=1,ee=[j/2,G/2];if(p.length>0){let d=1/0,h=-1/0,y=1/0,C=-1/0;p.forEach(function(L){const P=(L.symbolSize||20)/2+50;L.x-P<d&&(d=L.x-P),L.x+P>h&&(h=L.x+P),L.y-P<y&&(y=L.y-P),L.y+P>C&&(C=L.y+P)});const z=h-d,T=C-y;if(z>0&&T>0){const L=j/z,P=G/T;J=Math.min(L,P,1.5)*.8,J<.3&&(J=.3),ee=[(d+h)/2,(y+C)/2]}}t.nodes.forEach(function(d){d.itemStyle={color:_[d.name],borderColor:"#fff",borderWidth:1.5,shadowBlur:5,shadowColor:"rgba(0, 0, 0, 0.06)"},d.label={show:!0,formatter:function(){return ie(d.name)},fontSize:Math.max(10,Math.min(15,9+(l[d.name]||0)*.5)),color:"#555",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}});const V=e.querySelector(".tag-graph-hint");let be=null,ce=!1;function We(){ce||(ce=!0,V.classList.add("visible"),clearTimeout(be),be=setTimeout(function(){V.classList.remove("visible"),ce=!1},3e3))}e.addEventListener("mouseenter",We);const $=document.createElement("script");$.src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",$.integrity="sha384-Mx5lkUEQPM1pOJCwFtUICyX45KNojXbkWdYhkKUKsbv391mavbfoAmONbzkgYPzR",$.crossOrigin="anonymous",$.onload=function(){je()},$.onerror=function(){n.textContent="Failed to load chart library",n.style.color="#c44"},document.head.appendChild($);function Ue(d){return d<10?750:d<20?1200:d<40?1650:2100}function je(){n.parentNode&&n.parentNode.removeChild(n);const d=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window,h=echarts.init(i),y={backgroundColor:"transparent",tooltip:{show:!0,enterable:!0,confine:!0,backgroundColor:"rgba(255, 255, 255, 0.97)",borderColor:"#e8e8e8",borderWidth:1,padding:[10,14],textStyle:{color:"#4b4848",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:13},extraCssText:"border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); max-height: 260px; overflow-y: auto;",formatter:function(g){function k(R){return String(R??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function N(R,M){const m=k(R),E=k(M),A='style="display:block;color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;text-decoration:none;"';return E?'<a href="'+E+'" '+A+">• "+m+"</a>":"<div "+A+">• "+m+"</div>"}if(g.dataType==="node"){const R=ie(g.name);let M='<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:'+(_[g.name]||"#795da3")+'">'+k(R)+"</div>";M+='<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 '+g.value+" article"+(g.value>1?"s":"")+"</div>";const m=t.postTitles&&t.postTitles[g.name];return m&&m.length>0&&(M+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">',m.forEach(function(E){typeof E=="string"?M+=N(E,""):M+=N(E.title,E.path)}),M+="</div>"),M}if(g.dataType==="edge"){const R=g.data.source,M=g.data.target;let m='<span style="font-weight:600">'+k(ie(R))+'</span> <span style="color:#bbb">↔</span> <span style="font-weight:600">'+k(ie(M))+"</span>";m+='<br/><span style="color:#999;font-size:12px">📄 '+g.data.value+" article"+(g.data.value>1?"s":"")+"</span>";const E=[R,M].sort().join("	"),A=t.linkPosts&&t.linkPosts[E];return A&&A.length>0&&(m+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;margin-top:5px;">',A.forEach(function(F){m+=N(F.title,F.path)}),m+="</div>"),m}}},animationDuration:1500,animationEasingUpdate:"quinticInOut",series:[{type:"graph",layout:"force",data:t.nodes,links:t.links,roam:!1,draggable:!d,force:{repulsion:Ue(t.nodes.length),edgeLength:[150,450],gravity:.12,friction:.6,layoutAnimation:!0},emphasis:{focus:"adjacency",blurScope:"global",itemStyle:{shadowBlur:20,shadowColor:"rgba(121, 93, 163, 0.45)",borderWidth:2,borderColor:"#fff"},lineStyle:{width:3,opacity:.85},label:{show:!0,fontSize:14,fontWeight:"bold",color:"#333"}},label:{position:"right",distance:6},lineStyle:{color:"#d0d0d0",width:1.5,curveness:0,opacity:.35},scaleLimit:{min:.3,max:4},zoom:J,center:ee}]};h.setOption(y);let C=!1,z=!1;if(p.length>0){const g=function(){if(z)return;if(C){z=!0,h.off("finished",g);return}const k=h.getModel(),N=k&&k.getSeriesByIndex&&k.getSeriesByIndex(0),R=N&&N.getGraph&&N.getGraph();let M=1/0,m=-1/0,E=1/0,A=-1/0,F=0;if(p.forEach(function(ae){const de=R&&R.getNodeByName&&R.getNodeByName(ae.name),oe=de&&de.getLayout&&de.getLayout();let X,K;oe&&oe.length>=2?(X=oe[0],K=oe[1]):(X=ae.x||0,K=ae.y||0);const U=(ae.symbolSize||20)/2+50;X-U<M&&(M=X-U),X+U>m&&(m=X+U),K-U<E&&(E=K-U),K+U>A&&(A=K+U),F++}),F===0)return;const te=m-M,se=A-E;if(te<=0||se<=0)return;let Y=Math.min(j/te,G/se,1.5)*.8;Y<.3&&(Y=.3),z=!0,T=Y,L=[(M+m)/2,(E+A)/2],h.setOption({series:[{zoom:Y,center:L.slice()}]}),h.off("finished",g)};h.on("finished",g)}h.on("click",function(g){g.dataType==="node"&&t.tagPaths&&t.tagPaths[g.name]&&(window.location.href=t.tagPaths[g.name])}),h.on("mouseover",function(g){(g.dataType==="node"||g.dataType==="edge")&&(i.style.cursor="pointer")}),h.on("mouseout",function(){i.style.cursor="default"});let T=J||1,L=ee?[ee[0],ee[1]]:[0,0];if(!d){const g=e||i;g.addEventListener("wheel",function(m){m.preventDefault()},{passive:!1}),g.addEventListener("touchmove",function(m){m.touches.length>=2&&m.preventDefault()},{passive:!1});const k=h.getZr();k.on("mousewheel",function(m){m.event.preventDefault(),m.event.stopPropagation(),C=!0;const E=m.wheelDelta>0?1.08:1/1.08;let A=T*E;A<.3&&(A=.3),A>4&&(A=4),T=A,h.setOption({series:[{zoom:T}]})});let N=!1,R=[0,0],M=[0,0];k.on("mousedown",function(m){m.target||(N=!0,C=!0,R=[m.event.clientX,m.event.clientY],M=[L[0],L[1]],i.style.cursor="grabbing")}),k.on("mousemove",function(m){if(N){const E=m.event.clientX-R[0],A=m.event.clientY-R[1],F=i.clientWidth,te=i.clientHeight,se=F/T,Y=te/T;L[0]=M[0]-E*(se/F),L[1]=M[1]-A*(Y/te),h.setOption({series:[{center:[L[0],L[1]]}]})}}),k.on("mouseup",function(){N&&(N=!1,i.style.cursor="default")}),k.on("globalout",function(){N&&(N=!1,i.style.cursor="default")})}if(d){const g=document.createElement("button");g.type="button",g.className="tag-graph-fs-btn",g.setAttribute("aria-label","Fullscreen"),g.innerHTML='<svg class="tag-graph-fs-ic tag-graph-fs-ic--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg><svg class="tag-graph-fs-ic tag-graph-fs-ic--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',e.appendChild(g);let k=!1;const N=function(){if(!V)return;const m=typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en";V.textContent=m==="zh-CN"?"双指缩放 · 拖动平移 · 点按进入标签":"Pinch to zoom · Drag to pan · Tap a tag",V.classList.add("visible"),setTimeout(function(){V.classList.remove("visible")},2600)},R=function(){k=!0,e.classList.add("tag-graph-fullscreen"),g.classList.add("is-fullscreen"),g.setAttribute("aria-label","Exit fullscreen"),document.body.style.overflow="hidden",document.body.classList.add("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!0}]}),N()})},M=function(){k=!1,e.classList.remove("tag-graph-fullscreen"),g.classList.remove("is-fullscreen"),g.setAttribute("aria-label","Fullscreen"),document.body.style.overflow="",document.body.classList.remove("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!1,zoom:T,center:L.slice()}]})})};g.addEventListener("click",function(m){m.preventDefault(),m.stopPropagation(),k?M():R()}),document.addEventListener("keydown",function(m){m.key==="Escape"&&k&&M()})}let P;window.addEventListener("resize",function(){clearTimeout(P),P=setTimeout(function(){h.resize()},150)});function H(){h.setOption({series:[{data:t.nodes}]})}window.addEventListener("storage",function(g){g.key==="siteLanguage"&&H()});const B=localStorage.setItem;localStorage.setItem=function(g,k){B.call(localStorage,g,k),g==="siteLanguage"&&setTimeout(H,50)}}}function Bt(i){if(i.querySelector("audio"))return!1;const e=i.querySelector("summary");return!(!e||/跟读|本节语音/.test(e.textContent||"")||i.parentElement&&i.parentElement.closest("details.callout"))}function Wt(i,e={}){const t=e.includeCallouts?"h1, h2, h3, h4, h5, h6, details.callout--foldable":"h1, h2, h3, h4, h5, h6",n=Array.from(i.querySelectorAll(t)),s=[];let a=1;const r=[];return n.forEach(l=>{const c=/^H[1-6]$/.test(l.tagName);let o,u,b=!1;if(c)o=parseInt(l.tagName[1],10),a=o,u=l.textContent;else{if(!Bt(l))return;o=a+1,b=!0;const I=l.querySelector("summary");if(u=Pe(I.textContent||"",l.getAttribute("data-callout")||"",{short:!0}),!u)return}let f=1;for(;s.length&&s[s.length-1].level>=o;){const I=s.pop();I.level===o&&(f=I.n+1)}s.push({level:o,n:f});const x=r.length;l.id||(l.id=b?`toc-item-${x}`:`heading-${x}`);const S=s.map(I=>I.n).join(".");l.dataset.tocNumber=S,r.push({element:l,level:o,index:x,id:l.id,text:u,number:S,virtual:b})}),r}function Ut(i){const e=document.createElement("aside");e.className="toc-drawer",e.innerHTML='<div class="toc-header"><span class="toc-title"></span><div class="toc-header__actions"><button type="button" class="toc-foldall"></button><button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button></div></div><div class="toc-content"><div class="toc-list"></div></div>',document.body.appendChild(e);const t=e.querySelector(".toc-list"),n=i.map(s=>{const a=document.createElement("div");if(a.className=s.virtual?"toc-item toc-item--virtual":"toc-item",a.setAttribute("data-level",String(s.level)),a.setAttribute("data-index",String(s.index)),!s.virtual){const l=document.createElement("div");l.className="toc-collapse-btn",a.appendChild(l)}const r=document.createElement("span");return r.className="toc-item-text",r.style.cursor="pointer",r.innerHTML=`<span class="toc-number">${s.number}.</span> `,r.appendChild(document.createTextNode(s.text)),r.setAttribute("title",s.text),s.element.classList.contains("collapsed")&&a.classList.add("collapsed"),a.appendChild(r),t.appendChild(a),a});return{container:e,items:n}}const Fe="toc-panel-state";function Oe(){try{const i=localStorage.getItem(Fe);if(!i)return null;const e=JSON.parse(i);return!e||typeof e!="object"?null:e}catch{return null}}function jt(i){try{const t={...Oe()||{},...i};localStorage.setItem(Fe,JSON.stringify(t))}catch{}}function Gt(){return(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?"zh":"en"}const Vt={zh:{title:"目录",open:"目录",hide:"收起目录",show:"打开目录"},en:{title:"Contents",open:"TOC",hide:"Hide contents",show:"Show contents"}};function $t(i){const e=i.querySelector(".toc-content"),t=i.querySelector(".toc-item.toc-reading");!e||!t||(e.scrollTop=t.offsetTop-e.clientHeight/2+t.offsetHeight/2)}function Yt(i){const e=Vt[Gt()],t=i.querySelector(".toc-title");t&&(t.textContent=e.title),i.setAttribute("aria-label",e.title);const n=i.querySelector(".toc-close-btn");n&&(n.setAttribute("aria-label",e.hide),n.setAttribute("title",e.hide));const s=document.createElement("button");s.type="button",s.className="toc-tab",s.setAttribute("aria-label",e.show),s.innerHTML='<span class="toc-tab__icon" aria-hidden="true"></span><span class="toc-tab__text">'+e.open+"</span>",document.body.appendChild(s);const a=document.createElement("div");a.className="toc-scrim",document.body.appendChild(a);function r(o,u){i.classList.toggle("is-open",o),s.classList.toggle("is-hidden",o),a.classList.toggle("is-visible",o),document.body.classList.toggle("toc-drawer-open",o),o&&$t(i),u&&jt({hidden:!o})}s.addEventListener("click",()=>r(!0,!0)),a.addEventListener("click",()=>r(!1,!0)),n&&n.addEventListener("click",o=>{o.stopPropagation(),r(!1,!0)}),document.addEventListener("keydown",o=>{o.key==="Escape"&&i.classList.contains("is-open")&&r(!1,!1)});const l=Oe(),c=window.matchMedia("(min-width: 1100px)").matches;return r(c&&!!l&&l.hidden===!1,!1),{setOpen:r}}function me(i,e,t){for(let n=e+1;n<i.length&&!(parseInt(i[n].getAttribute("data-level")||"1",10)<=t);n+=1)i[n].classList.add("toc-hidden")}function He(i,e,t){for(let n=e+1;n<i.length;n+=1){const s=parseInt(i[n].getAttribute("data-level")||"1",10);if(s<=t)break;if(s===t+1)i[n].classList.remove("toc-hidden");else{let a=!0;for(let r=n-1;r>e;r-=1){const l=parseInt(i[r].getAttribute("data-level")||"1",10);if(l<s&&i[r].classList.contains("collapsed")){a=!1;break}if(l<=t)break}a&&i[n].classList.remove("toc-hidden")}}}function Xt(i){const e=parseInt(i.tagName.charAt(1),10);let t=i.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t=t.nextElementSibling;continue}t.style.display="none",t=t.nextElementSibling}}function Kt(i){const e=parseInt(i.tagName.charAt(1),10);let t=i.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t.style.display="",t=t.nextElementSibling;continue}t.style.display="",t=t.nextElementSibling}}function pe(i,e,t){const n=e[t],s=i[t]&&i[t].element;if(!n||!s)return;const a=parseInt(n.getAttribute("data-level")||"1",10);!n.classList.contains("collapsed")?(n.classList.add("collapsed"),me(e,t,a),s.classList.contains("collapsed")||(s.classList.add("collapsed"),Xt(s))):(n.classList.remove("collapsed"),He(e,t,a),s.classList.contains("collapsed")&&(s.classList.remove("collapsed"),Kt(s)))}function Zt(i,e,t){e.forEach((n,s)=>{if(n.classList.contains("toc-item--virtual")||!n.querySelector(".toc-collapse-btn"))return;const a=n.classList.contains("collapsed");t?!a&&!n.classList.contains("toc-hidden")&&pe(i,e,s):a&&pe(i,e,s)})}function Qt(i,e,t){const n=e[t],s=i[t]&&i[t].element;if(!n||!s)return;const a=parseInt(n.getAttribute("data-level")||"1",10),r=s.classList.contains("collapsed");r&&!n.classList.contains("collapsed")?(n.classList.add("collapsed"),me(e,t,a)):!r&&n.classList.contains("collapsed")&&(n.classList.remove("collapsed"),He(e,t,a))}function Jt(i,e){e.forEach((s,a)=>{if(s.classList.contains("collapsed")){const r=parseInt(s.getAttribute("data-level")||"1",10);me(e,a,r)}}),e.forEach((s,a)=>{const r=s.querySelector(".toc-collapse-btn");r&&r.addEventListener("click",l=>{l.stopPropagation(),pe(i,e,a)})});const t=new Map;i.forEach((s,a)=>t.set(s.element,a));const n=new MutationObserver(s=>{s.forEach(a=>{if(a.type!=="attributes"||a.attributeName!=="class")return;const r=t.get(a.target);r!==void 0&&Qt(i,e,r)})});return i.forEach(s=>{n.observe(s.element,{attributes:!0,attributeFilter:["class"]})}),{observer:n}}const Te={1:{passed:"rgba(128,128,128,0.1)",reading:"rgba(66,153,225,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(66,153,225,0.25)"},2:{passed:"rgba(128,128,128,0.1)",reading:"rgba(49,130,206,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(49,130,206,0.25)"},3:{passed:"rgba(128,128,128,0.1)",reading:"rgba(44,82,130,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(44,82,130,0.25)"},4:{passed:"rgba(128,128,128,0.1)",reading:"rgba(42,67,101,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(42,67,101,0.25)"},5:{passed:"rgba(128,128,128,0.1)",reading:"rgba(26,54,93,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(26,54,93,0.25)"},6:{passed:"rgba(128,128,128,0.1)",reading:"rgba(21,62,117,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(21,62,117,0.25)"}};function en(i,e){if(!i.length)return{destroy(){}};const t=new Array(i.length).fill("coming"),n=new Set;let s=-1;const a=new Map;i.forEach((f,x)=>a.set(f.element,x));function r(){e.forEach((f,x)=>{const S=parseInt(f.getAttribute("data-level")||"1",10),I=Te[S]||Te[1],D=t[x];f.classList.remove("toc-passed","toc-reading","toc-coming"),f.style.boxShadow="",f.style.transform="",f.style.fontWeight="",x===s?(f.classList.add("toc-reading"),f.style.backgroundColor=I.active,f.style.opacity="1",f.style.fontWeight="600",f.style.boxShadow="inset 0 0 0 2px rgba(66,153,225,0.3)",f.style.transform="scale(1.02)",f.style.transition="all 0.2s ease"):D==="reading"?(f.classList.add("toc-reading"),f.style.backgroundColor=I.reading,f.style.opacity="1",f.style.fontWeight="600"):D==="passed"?(f.classList.add("toc-passed"),f.style.backgroundColor=I.passed,f.style.opacity="0.7"):(f.classList.add("toc-coming"),f.style.backgroundColor=I.coming,f.style.opacity="0.5")})}function l(){const f=window.innerHeight/2;let x=-1;n.forEach(S=>{const I=i[S].element.getBoundingClientRect();I.top<=f&&I.bottom>=f&&(x=S)}),x!==s&&(s=x,r())}let c=null;function o(){c||(c=requestAnimationFrame(()=>{c=null,l()}))}const u=new IntersectionObserver(f=>{f.forEach(x=>{const S=a.get(x.target);S!==void 0&&(x.isIntersecting?(n.add(S),t[S]="reading"):(n.delete(S),t[S]=x.boundingClientRect.bottom<0?"passed":"coming"))}),l(),r()});i.forEach(f=>u.observe(f.element)),window.addEventListener("scroll",o,{passive:!0}),window.addEventListener("resize",o,{passive:!0}),r();function b(){u.disconnect(),window.removeEventListener("scroll",o),window.removeEventListener("resize",o),c&&cancelAnimationFrame(c)}return{destroy:b,refresh:()=>{l(),r()}}}const tn='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 18.59 8.83 20 12 16.83 15.17 20l1.41-1.41L12 14zM16.59 5.41 15.17 4 12 7.17 8.83 4 7.41 5.41 12 10z"/></svg>',nn='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5.83 15.17 9l1.41-1.41L12 3 7.42 7.59 8.83 9zm0 12.34L8.83 15l-1.41 1.4L12 21l4.58-4.6L15.17 15z"/></svg>';function sn(i){return!i.classList.contains("toc-item--virtual")&&!!i.querySelector(".toc-collapse-btn")}function an(){const i=document.querySelector(".content");if(!i||i.classList.contains("archives"))return null;const e=document.body;if(e.classList.contains("path-about-index-html")||e.classList.contains("layout-about"))return null;const t=document.querySelector("section.main[data-toc]");return t&&t.getAttribute("data-toc")==="false"?null:i}function on(){const i=an();if(!i)return;const e=Wt(i,{includeCallouts:document.body.classList.contains("type-daily-feed")});if(!e.length)return;const{container:t,items:n}=Ut(e);Jt(e,n);const s=en(e,n);Yt(t);const a=t.querySelector(".toc-foldall"),r=n.filter(sn);if(a&&r.length){const c=(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?{collapse:"全部折叠",expand:"全部展开"}:{collapse:"Collapse all",expand:"Expand all"},o=()=>{const u=r.some(b=>!b.classList.contains("collapsed"));a.innerHTML=u?tn:nn,a.setAttribute("aria-label",u?c.collapse:c.expand),a.setAttribute("title",u?c.collapse:c.expand)};a.addEventListener("click",()=>{const u=r.some(b=>!b.classList.contains("collapsed"));Zt(e,n,u),o()}),o()}else a&&a.remove();n.forEach((l,c)=>{const o=l.querySelector(".toc-item-text");o&&o.addEventListener("click",()=>{const u=e[c];!u||!u.element||(u.virtual&&u.element.tagName==="DETAILS"&&!u.element.open&&(u.element.open=!0),u.element.scrollIntoView({behavior:"smooth",block:u.virtual?"start":"center"}),setTimeout(()=>s.refresh(),300))})})}function Ie(){new Ge,new at,new xt,document.getElementById("map")&&new Et,new St,setTimeout(()=>{new Lt},500),new Ct,new kt,new It,Ot(),on(),new bt,wt(),document.getElementById("tag-graph")&&Ht()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ie):Ie();
