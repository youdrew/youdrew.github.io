class je{constructor(){this.header=document.querySelector("header"),this.menuIcon=document.getElementById("menu_icon"),this.navTriggerZone=50,this.showNavTimeout=null,this.lastMouseEvent=null,this.mouseMoveScheduled=!1,this.mediaQuery=null,this.currentMode=null,this.navLinks=null,this.onMouseMove=this.onMouseMove.bind(this),this.onHeaderEnter=this.onHeaderEnter.bind(this),this.onHeaderLeave=this.onHeaderLeave.bind(this),this.onMenuIconClick=this.onMenuIconClick.bind(this),this.onNavLinkClick=this.onNavLinkClick.bind(this),this.onKeydown=this.onKeydown.bind(this),this.onBreakpointChange=this.onBreakpointChange.bind(this),this.init()}init(){this.header&&(this.mediaQuery=window.matchMedia("(min-width: 1099px)"),this.mediaQuery.addEventListener("change",this.onBreakpointChange),this.applyMode(this.mediaQuery.matches?"desktop":"mobile"))}onBreakpointChange(e){this.applyMode(e.matches?"desktop":"mobile")}applyMode(e){e!==this.currentMode&&(this.teardown(),this.currentMode=e,e==="desktop"?this.bindDesktop():this.bindMobile())}teardown(){document.removeEventListener("mousemove",this.onMouseMove),this.header.removeEventListener("mouseenter",this.onHeaderEnter),this.header.removeEventListener("mouseleave",this.onHeaderLeave),document.removeEventListener("keydown",this.onKeydown),this.menuIcon&&this.menuIcon.removeEventListener("click",this.onMenuIconClick),this.navLinks&&this.navLinks.forEach(e=>e.removeEventListener("click",this.onNavLinkClick)),clearTimeout(this.showNavTimeout),this.showNavTimeout=null,this.header.classList.remove("show_menu","menu-open"),document.body.style.overflow=""}bindDesktop(){document.addEventListener("mousemove",this.onMouseMove),this.header.addEventListener("mouseenter",this.onHeaderEnter),this.header.addEventListener("mouseleave",this.onHeaderLeave)}bindMobile(){this.menuIcon&&(this.menuIcon.addEventListener("click",this.onMenuIconClick),this.navLinks=this.header.querySelectorAll("nav ul li a"),this.navLinks.forEach(e=>e.addEventListener("click",this.onNavLinkClick)),document.addEventListener("keydown",this.onKeydown))}openMenu(){this.header.classList.add("menu-open"),this.menuIcon.setAttribute("aria-expanded","true"),this.menuIcon.setAttribute("aria-label","Close menu"),document.body.style.overflow="hidden"}closeMenu(){this.header.classList.remove("menu-open"),this.menuIcon&&(this.menuIcon.setAttribute("aria-expanded","false"),this.menuIcon.setAttribute("aria-label","Open menu")),document.body.style.overflow=""}onMenuIconClick(e){e.preventDefault(),this.header.classList.contains("menu-open")?this.closeMenu():this.openMenu()}onNavLinkClick(){this.closeMenu()}onKeydown(e){e.key==="Escape"&&this.header.classList.contains("menu-open")&&this.closeMenu()}onMouseMove(e){this.lastMouseEvent=e,!this.mouseMoveScheduled&&(this.mouseMoveScheduled=!0,requestAnimationFrame(()=>{this.mouseMoveScheduled=!1,this.processMouseMove(this.lastMouseEvent)}))}processMouseMove(e){if(e){if(e.pageX<=this.navTriggerZone){clearTimeout(this.showNavTimeout),this.header.classList.add("show_menu");return}clearTimeout(this.showNavTimeout),this.showNavTimeout=setTimeout(()=>{const t=this.header.getBoundingClientRect();e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom||this.header.classList.remove("show_menu")},300)}}onHeaderEnter(){clearTimeout(this.showNavTimeout)}onHeaderLeave(){this.showNavTimeout=setTimeout(()=>{this.header.classList.remove("show_menu")},300)}}const Ge=`#define time iTime

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
}`,Ye=`// artifact-at-sea.wgsl — WebGPU twin of artifact-at-sea.glsl, used only for
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
`,Ve="(min-width: 1099px)",Xe="(prefers-reduced-motion: reduce)",$e=8e3,Ke=30,Ze=3.4,Qe=1.3,Ee=.55,Le=1100,Se=1,Je=3,et=1.7;function tt(){return/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className||"")}function Q(s){return Math.max(0,Math.min(1,s))}function re(s){return s*s*(3-2*s)}const nt=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,it=`#version 300 es
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
${Ge}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class st{constructor(){tt()&&(this.mq=window.matchMedia(Ve),this.reduce=window.matchMedia(Xe),this.dyn=window.matchMedia("(dynamic-range: high)"),this.canvas=null,this.gl=null,this.gpu=null,this.backend="webgl",this.ready=!1,this.initPromise=null,this.hdrFish=1,this.hdrSea=1,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=Se,this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.onDynChange=this.onDynChange.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.dyn.addEventListener("change",this.onDynChange),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}onDynChange(){this.canvas&&(this.disable(),this.apply())}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e),this.canvas=e,this.ready=!1,this.initPromise=this.initBackend().then(t=>t?this.canvas?(this.ready=!0,this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle(),!0):(this.destroyGpu(),!1):(this.disable(),!1))}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null,this.destroyGpu(),this.ready=!1}async initBackend(){if(this.dyn.matches&&!!navigator.gpu){try{if(await this.buildGpu())return this.backend="webgpu",this.hdrFish=Je,this.hdrSea=et,!0}catch(t){console.warn("[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:",t)}this.destroyGpu(),this.freshCanvas()}return this.canvas?(this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.buildGl()):!1}freshCanvas(){if(!this.canvas)return;const e=this.canvas.cloneNode(!1);this.canvas.replaceWith(e),this.canvas=e}destroyGpu(){if(!this.gpu)return;const e=this.gpu;this.gpu=null;try{e.device.destroy()}catch{}}async buildGpu(){const e=await navigator.gpu.requestAdapter();if(!e)return!1;const t=await e.requestDevice(),n=this.canvas&&this.canvas.getContext("webgpu");if(!n)return t.destroy(),!1;n.configure({device:t,format:"rgba16float",colorSpace:"srgb",toneMapping:{mode:"extended"},alphaMode:"premultiplied"});const i=typeof n.getConfiguration=="function"?n.getConfiguration():null;if(!i||!i.toneMapping||i.toneMapping.mode!=="extended")return t.destroy(),!1;const o=t.createShaderModule({code:Ye}),a=await o.getCompilationInfo();if(a.messages.some(p=>p.type==="error")){for(const p of a.messages)console.warn("[idle-ocean] wgsl "+p.lineNum+":"+p.linePos+" "+p.message);return t.destroy(),!1}const r=t.createRenderPipeline({layout:"auto",vertex:{module:o,entryPoint:"vmain"},fragment:{module:o,entryPoint:"fmain",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}}),l=t.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=t.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:l}}]});return this.gpu={device:t,ctx:n,pipeline:r,ubuf:l,bind:c,u:new Float32Array(16)},t.lost.then(p=>{this.gpu&&this.canvas&&(console.warn("[idle-ocean] WebGPU device lost ("+p.reason+"), falling back to WebGL"),this.gpu=null,this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.freshCanvas(),this.buildGl()?this.resize():this.disable())}),!0}buildGl(){const e=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1});if(!e)return!1;this.gl=e;const t=(r,l)=>{const c=e.createShader(r);return e.shaderSource(c,l),e.compileShader(c),e.getShaderParameter(c,e.COMPILE_STATUS)?c:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(c)),null)},n=t(e.VERTEX_SHADER,nt),i=t(e.FRAGMENT_SHADER,it);if(!n||!i)return!1;const o=e.createProgram();if(e.attachShader(o,n),e.attachShader(o,i),e.bindAttribLocation(o,0,"p"),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(o)),!1;e.useProgram(o),this.prog=o;const a=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,a),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(o,"iResolution"),this.uTime=e.getUniformLocation(o,"iTime"),this.uReveal=e.getUniformLocation(o,"uReveal"),this.uOpaque=e.getUniformLocation(o,"uOpaqueMax"),this.uMode=e.getUniformLocation(o,"uMode"),this.uDir=e.getUniformLocation(o,"uDir"),this.uDrain=e.getUniformLocation(o,"uDrain"),this.uMouse=e.getUniformLocation(o,"uMouse"),this.uHdrFish=e.getUniformLocation(o,"uHdrFish"),this.uHdrSea=e.getUniformLocation(o,"uHdrSea"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let t=Math.round(window.innerWidth*e*Ee),n=Math.round(window.innerHeight*e*Ee);const i=Math.max(t,n);if(i>Le){const o=Le/i;t=Math.round(t*o),n=Math.round(n*o)}t=Math.max(1,t),n=Math.max(1,n),(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.gl&&this.gl.viewport(0,0,t,n))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},$e))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const t=Math.random()*Math.PI*2;this.dir=[Math.cos(t),Math.sin(t)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e-this.lastTick<1e3/Ke))return;const t=(e-this.lastTick)/1e3;if(this.lastTick=e,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+t/Ze),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+t/Qe),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.renderFrame(e),this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){if(!this.ready||!this.canvas)return;const t=((e||performance.now())-this.startTime)/1e3;if(this.backend==="webgpu"&&this.gpu){this.renderGpu(t);return}const n=this.gl;n&&(n.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),n.uniform1f(this.uTime,t),n.uniform1f(this.uReveal,re(Q(this.reveal))),n.uniform1f(this.uOpaque,this.opaqueMax),n.uniform1f(this.uMode,this.mode),n.uniform2f(this.uDir,this.dir[0],this.dir[1]),n.uniform1f(this.uDrain,re(Q(this.drain))),n.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),n.uniform1f(this.uHdrFish,this.hdrFish),n.uniform1f(this.uHdrSea,this.hdrSea),n.drawArrays(n.TRIANGLES,0,3))}renderGpu(e){const{device:t,ctx:n,pipeline:i,ubuf:o,bind:a,u:r}=this.gpu;r[0]=this.canvas.width,r[1]=this.canvas.height,r[2]=1,r[3]=e,r[4]=re(Q(this.reveal)),r[5]=this.opaqueMax,r[6]=this.mode,r[7]=re(Q(this.drain)),r[8]=this.dir[0],r[9]=this.dir[1],r[10]=this.mouse[0],r[11]=this.mouse[1],r[12]=this.hdrFish,r[13]=this.hdrSea,t.queue.writeBuffer(o,0,r);const l=t.createCommandEncoder(),c=l.beginRenderPass({colorAttachments:[{view:n.getCurrentTexture().createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]});c.setPipeline(i),c.setBindGroup(0,a),c.draw(3),c.end(),t.queue.submit([l.finish()])}debugSet(e={}){this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=Q(e.reveal)),typeof e.drain=="number"&&(this.drain=Q(e.drain)),typeof e.hdrFish=="number"&&(this.hdrFish=e.hdrFish),typeof e.hdrSea=="number"&&(this.hdrSea=e.hdrSea),this.startTime||(this.startTime=performance.now());const t=()=>{this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now())};return this.ready?t():this.initPromise&&this.initPromise.then(n=>{n&&this.paused&&t()}),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode,backend:this.backend,hdrFish:this.hdrFish,hdrSea:this.hdrSea}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=Se,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}const Ce=160;function ot(s){const e=s.closest("details.callout, div.callout");if(!e)return null;let t=e.nextElementSibling;for(let n=0;t&&n<4;n++){if(/^H[1-6]$/.test(t.tagName)||t.querySelector("audio"))return null;if(t.matches('details.callout[data-callout="note"]')){const i=t.querySelector("summary");if(i&&/跟读/.test(i.textContent||""))return t}t=t.nextElementSibling}return null}class at{constructor(e,t){if(this.audio=e,this.transcript=t,this.host=e.closest("details.callout, div.callout"),this.paras=Array.from(t.querySelectorAll(".callout-content > p")).filter(a=>a.textContent.trim()),!this.paras.length)return;const n=this.paras.map(a=>Math.max(1,a.textContent.trim().length)),i=n.reduce((a,r)=>a+r,0);let o=0;this.ends=n.map(a=>(o+=a)/i),this.current=-1,this.pendingSeekHandler=null,this.paras.forEach((a,r)=>{a.classList.add("transcript-para"),a.setAttribute("title","点击从这一段开始播放"),a.addEventListener("click",()=>this.seekTo(r))}),e.addEventListener("timeupdate",()=>this.sync()),e.addEventListener("seeked",()=>this.sync()),e.addEventListener("play",()=>this.onPlay()),e.addEventListener("pause",()=>this.onPause()),e.addEventListener("ended",()=>this.onEnded())}onPlay(){this.host&&this.host.classList.add("is-playing"),this.transcript.tagName==="DETAILS"&&(this.transcript.open=!0),this.transcript.classList.add("is-following")}onPause(){this.host&&this.host.classList.remove("is-playing")}onEnded(){this.onPause(),this.transcript.classList.remove("is-following"),this.setCurrent(-1,!1)}sync(){const e=this.audio.duration;if(!isFinite(e)||e<=0)return;const t=this.audio.currentTime/e;let n=this.ends.findIndex(i=>t<i);n===-1&&(n=this.paras.length-1),this.setCurrent(n,!this.audio.paused)}setCurrent(e,t){if(e===this.current)return;const n=this.paras[this.current];n&&n.classList.remove("is-reading"),this.current=e;const i=this.paras[e];if(!i)return;i.classList.add("is-reading");const o=n||this.transcript;t&&this.nearViewport(o)&&i.scrollIntoView({block:"nearest",behavior:"smooth"})}nearViewport(e){const t=e.getBoundingClientRect(),n=window.innerHeight||document.documentElement.clientHeight||0;return t.bottom>-Ce&&t.top<n+Ce}seekTo(e){const t=e===0?0:this.ends[e-1],n=this.audio,i=()=>{n.currentTime=t*n.duration+.01;const o=n.play();o&&o.catch&&o.catch(()=>{})};if(n.readyState>=1&&isFinite(n.duration)&&n.duration>0){i();return}this.pendingSeekHandler&&n.removeEventListener("loadedmetadata",this.pendingSeekHandler),this.pendingSeekHandler=()=>{this.pendingSeekHandler=null,i()},n.addEventListener("loadedmetadata",this.pendingSeekHandler,{once:!0}),n.preload="metadata",n.load()}}class rt{constructor(){if(!document.body.classList.contains("type-daily-feed"))return;const e=Array.from(document.querySelectorAll(".content audio"));e.forEach(t=>{const n=ot(t);n&&new at(t,n),t.addEventListener("play",()=>{e.forEach(i=>{i!==t&&!i.paused&&i.pause()})})})}}class lt{constructor(){this.init()}init(){document.addEventListener("mouseover",e=>{e.target.tagName==="A"&&this.showTooltip(e.target)}),document.addEventListener("mouseout",e=>{e.target.tagName==="A"&&this.hideTooltip()})}showTooltip(e){const t=e.getAttribute("data-title");if(!t||t==="")return;const n=document.createElement("span");n.className="tooltip",n.textContent=t,e.parentNode.insertBefore(n,e.nextSibling);const i=n.offsetWidth,o=e.offsetWidth,a=e.offsetHeight+3+4;let r=i;i<o&&(r=o,n.style.width=r+"px");const l=-(r-o)/2;n.style.left=l+"px",n.style.bottom=a+"px",setTimeout(()=>{n.style.opacity="1"},10)}hideTooltip(){document.querySelectorAll(".tooltip").forEach(t=>{t.remove()})}}class ct{constructor(){this.mapElement=document.getElementById("map"),this.init()}init(){this.mapElement&&(this.adjustMapLayout(),window.addEventListener("resize",()=>{this.adjustMapLayout()}))}adjustMapLayout(){const e=document.querySelector("header"),t=window.innerHeight,n=window.innerWidth;if(!e)return;const i=e.offsetWidth+50,o=this.mapElement.offsetWidth;this.mapElement.style.maxWidth=o+"px",this.mapElement.style.height=t+"px",n>1100?this.mapElement.style.marginLeft=i+"px":this.mapElement.style.marginLeft="0"}}class dt{constructor(){this.overlay=null,this.zoomImg=null,this.hint=null,this.scale=1,this.minScale=.2,this.maxScale=6,this.lastPos={x:0,y:0},this.origin={x:0,y:0},this.dragging=!1,this.wheelTimeout=null,this.init()}init(){this.bindImages(),new MutationObserver(t=>{for(let n=0;n<t.length;n++)if(t[n].addedNodes.length){this.bindImages();break}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}buildOverlay(){this.overlay=document.createElement("div"),this.overlay.id="image-zoom-overlay",this.overlay.className="fade-in",this.overlay.innerHTML=`
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `,document.body.appendChild(this.overlay),this.zoomImg=this.overlay.querySelector(".image-zoom-img"),this.hint=this.overlay.querySelector(".image-zoom-hint"),this.bindOverlayEvents()}openOverlay(e){this.overlay||this.buildOverlay(),this.overlay.style.display="flex",this.zoomImg.src=e,this.scale=1,this.lastPos.x=0,this.lastPos.y=0,this.applyTransform(),this.hint&&(this.hint.style.opacity="1",this.hint.style.transition="opacity .5s",clearTimeout(this.hint._hideTimer),this.hint._hideTimer=setTimeout(()=>{this.hint.style.opacity="0"},3e3))}closeOverlay(){this.overlay&&(this.overlay.style.display="none",this.zoomImg.src="")}applyTransform(){this.zoomImg.style.transform=`translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`}onWheel(e){e.preventDefault();const t=this.zoomImg.getBoundingClientRect(),n=e.clientX-t.left-t.width/2,i=e.clientY-t.top-t.height/2,o=e.deltaY>0?-.12:.12,a=Math.max(this.minScale,Math.min(this.maxScale,this.scale+o)),r=a/this.scale;this.lastPos.x=(this.lastPos.x+n)*r-n,this.lastPos.y=(this.lastPos.y+i)*r-i,this.scale=a,this.applyTransform(),this.hint&&(this.hint.style.opacity="0.3",clearTimeout(this.wheelTimeout),this.wheelTimeout=setTimeout(()=>{this.hint.style.opacity="1"},400))}onMouseDown(e){e.button===0&&(this.dragging=!0,this.origin.x=e.clientX,this.origin.y=e.clientY,this.overlay.style.cursor="grabbing")}onMouseMove(e){if(!this.dragging)return;const t=e.clientX-this.origin.x,n=e.clientY-this.origin.y;this.origin.x=e.clientX,this.origin.y=e.clientY,this.lastPos.x+=t,this.lastPos.y+=n,this.applyTransform()}onMouseUp(){this.dragging=!1,this.overlay&&(this.overlay.style.cursor="default")}onDblClick(){this.closeOverlay()}onKey(e){e.key==="Escape"&&this.overlay&&this.overlay.style.display==="flex"&&this.closeOverlay()}bindOverlayEvents(){this.zoomImg.addEventListener("wheel",e=>this.onWheel(e),{passive:!1}),this.zoomImg.addEventListener("mousedown",e=>this.onMouseDown(e)),this.zoomImg.addEventListener("dblclick",()=>this.onDblClick()),window.addEventListener("mousemove",e=>this.onMouseMove(e)),window.addEventListener("mouseup",()=>this.onMouseUp()),window.addEventListener("keydown",e=>this.onKey(e)),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.closeOverlay()})}bindImages(){const e="article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img";document.querySelectorAll(e).forEach(n=>{n.classList.contains("image-zoomable")||(n.classList.add("image-zoomable"),n.style.cursor="zoom-in",n.addEventListener("click",()=>{this.openOverlay(n.getAttribute("data-origin")||n.src)}))})}}class ht{constructor(){this.initializeEmbeds()}initializeEmbeds(){this.processTextNodes(document.body),this.processCodeBlocks(),this.processMarkdownSyntax()}processTextNodes(e){["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(e.tagName)||(e.nodeType===Node.TEXT_NODE?this.processTextNode(e):Array.from(e.childNodes).forEach(t=>{this.processTextNodes(t)}))}processTextNode(e){const t=e.textContent,n=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let i;const o=[];for(;(i=n.exec(t))!==null;)o.push({fullMatch:i[0],shaderID:i[1],index:i.index});o.length>0&&this.replaceWithIframes(e,o)}processCodeBlocks(){document.querySelectorAll("code, pre").forEach(t=>{const n=t.textContent,i=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let o;for(;(o=i.exec(n))!==null;){const a=n.trim();if(a===o[0]||a===o[0].replace(/\?.*$/,"")){this.replaceElementWithIframe(t,o[1]);break}}})}replaceWithIframes(e,t){const n=e.parentNode;if(!n)return;const i=e.textContent,o=[];let a=0;t.sort((l,c)=>c.index-l.index),t.reverse().forEach(l=>{l.index>a&&o.unshift({type:"text",content:i.substring(a,l.index)}),o.unshift({type:"iframe",shaderID:l.shaderID,originalURL:l.fullMatch}),a=l.index+l.fullMatch.length}),a<i.length&&o.unshift({type:"text",content:i.substring(a)});const r=[];o.forEach(l=>{if(l.type==="text"&&l.content.trim())r.push(document.createTextNode(l.content));else if(l.type==="iframe"){const c=this.createShaderToyEmbed(l.shaderID,l.originalURL);r.push(c)}}),r.forEach(l=>{n.insertBefore(l,e)}),n.removeChild(e)}replaceElementWithIframe(e,t){const n=this.createShaderToyEmbed(t);e.parentNode.replaceChild(n,e)}createShaderToyEmbed(e,t=null){const n=document.createElement("div");n.className="shadertoy-embed-container",n.style.cssText=`
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
        `,n.addEventListener("mouseenter",()=>{n.style.transform="translateY(-3px)",n.style.boxShadow="0 12px 35px rgba(0,0,0,0.4)"}),n.addEventListener("mouseleave",()=>{n.style.transform="translateY(0)",n.style.boxShadow="0 8px 25px rgba(0,0,0,0.3)"});const i=document.createElement("div");i.className="shadertoy-embed-header",i.style.cssText=`
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        `;const o=document.createElement("div");o.style.cssText=`
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
        `,o.appendChild(a),o.appendChild(r);const l=document.createElement("div");l.style.cssText=`
            display: flex;
            gap: 8px;
        `;const c=document.createElement("a");c.href=t||`https://www.shadertoy.com/view/${e}`,c.target="_blank",c.innerHTML="🔗 Open in ShaderToy",c.style.cssText=`
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
        `,c.addEventListener("mouseenter",()=>{c.style.background="#66b3ff",c.style.color="#000",c.style.transform="translateY(-1px)"}),c.addEventListener("mouseleave",()=>{c.style.background="rgba(102,179,255,0.1)",c.style.color="#66b3ff",c.style.transform="translateY(0)"}),l.appendChild(c),i.appendChild(o),i.appendChild(l);const p=document.createElement("div");p.style.cssText=`
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
        `,y.allowFullscreen=!0,y.loading="lazy";const f=document.createElement("div");f.innerHTML=`
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
        `;const L=document.createElement("style");return L.textContent=`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `,document.head.appendChild(L),y.addEventListener("load",()=>{f.style.display="none"}),p.appendChild(y),p.appendChild(f),n.appendChild(i),n.appendChild(p),n}processMarkdownSyntax(){const e=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(i){var a;const o=(a=i.parentElement)==null?void 0:a.tagName;return["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(o)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[];let n;for(;n=e.nextNode();)t.push(n);t.forEach(i=>{const o=i.textContent,a=/\[(shader|shadertoy):(\w+)\]/g;let r;const l=[];for(;(r=a.exec(o))!==null;)l.push({fullMatch:r[0],shaderID:r[2],index:r.index});l.length>0&&this.replaceMarkdownSyntax(i,l)})}replaceMarkdownSyntax(e,t){const n=e.parentNode;if(!n)return;const i=e.textContent,o=[];let a=0;t.sort((l,c)=>c.index-l.index),t.reverse().forEach(l=>{l.index>a&&o.unshift({type:"text",content:i.substring(a,l.index)}),o.unshift({type:"iframe",shaderID:l.shaderID,originalURL:null}),a=l.index+l.fullMatch.length}),a<i.length&&o.unshift({type:"text",content:i.substring(a)});const r=[];o.forEach(l=>{if(l.type==="text"&&l.content.trim())r.push(document.createTextNode(l.content));else if(l.type==="iframe"){const c=this.createShaderToyEmbed(l.shaderID,l.originalURL);r.push(c)}}),r.forEach(l=>{n.insertBefore(l,e)}),n.removeChild(e)}}class ft{constructor(){this.init()}init(){const e=document.querySelector(".content");if(!e)return;e.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(n=>{const i=document.createElement("span");i.className="collapse-button",n.insertBefore(i,n.firstChild),i.addEventListener("click",o=>{o.stopPropagation(),this.toggleCollapse(n)})})}toggleCollapse(e){const t=parseInt(e.tagName[1]);let n=e.nextElementSibling;e.classList.toggle("collapsed");const i=e.classList.contains("collapsed");for(;n&&!(n.tagName&&n.tagName.match(/^H[1-6]$/)&&parseInt(n.tagName[1])<=t);)n.style.display=i?"none":"",n=n.nextElementSibling}}class ut{constructor(){this.init()}init(){this.initCodeBlockExpansion(),new MutationObserver(t=>{let n=!1;t.forEach(i=>{i.addedNodes.length>0&&i.addedNodes.forEach(o=>{o.nodeType===1&&(o.matches("figure.highlight")||o.querySelector("figure.highlight"))&&(n=!0)})}),n&&setTimeout(()=>this.initCodeBlockExpansion(),100)}).observe(document.body,{childList:!0,subtree:!0})}initCodeBlockExpansion(){document.querySelectorAll("figure.highlight").forEach(t=>{if(t.closest(".code-block-container"))return;const n=t.querySelector("table");if(n){const c=n.querySelector("td.code");if(c){const p=document.createElement("pre");p.className="code",p.innerHTML=c.innerHTML,t.innerHTML="",t.appendChild(p)}}const i=t.querySelector("pre.code");if(!i)return;const o=i.scrollHeight,a=400,r=document.createElement("div");r.className="code-buttons";const l=document.createElement("button");if(l.className="copy-code-button",l.textContent="复制代码",l.addEventListener("click",c=>{c.preventDefault(),c.stopPropagation(),this.copyCodeToClipboard(i,l)}),r.appendChild(l),o>a){const c=document.createElement("div");c.className="code-block-container collapsed",t.parentNode.insertBefore(c,t),c.appendChild(t);const p=document.createElement("button");p.className="expand-button",p.textContent="展开代码",r.appendChild(p),c.appendChild(r),p.addEventListener("click",()=>{c.classList.contains("collapsed")&&this.showFullscreenCode(t)})}else{const c=document.createElement("div");c.className="code-block-container",t.parentNode.insertBefore(c,t),c.appendChild(t),c.appendChild(r)}})}showFullscreenCode(e){const t=document.createElement("div");t.className="code-fullscreen-modal active";const n=document.createElement("div");n.className="code-fullscreen-content";const o=(e.closest(".code-block-container")||e).cloneNode(!0);o.querySelectorAll(".code-buttons, .copy-code-button, .expand-button").forEach(f=>{f.parentNode&&f.parentNode.removeChild(f)});const r=o.classList.contains("code-block-container")?o:o.querySelector(".code-block-container");r&&(r.classList.remove("collapsed"),r.style.margin="0");const l=(r||o).querySelector("pre.code");l&&(l.scrollTop=0),n.appendChild(o);const c=document.createElement("button");c.className="close-fullscreen",c.textContent="关闭",n.appendChild(c),t.appendChild(n),document.body.appendChild(t),document.body.style.overflow="hidden";const p=()=>{document.body.removeChild(t),document.body.style.overflow=""};c.addEventListener("click",p),t.addEventListener("click",f=>{f.target===t&&p()});const y=f=>{f.key==="Escape"&&(p(),document.removeEventListener("keydown",y))};document.addEventListener("keydown",y)}copyCodeToClipboard(e,t){const n=e.textContent||e.innerText;navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(n).then(()=>{this.showCopySuccess(t)}).catch(i=>{console.error("复制失败:",i),this.fallbackCopy(n,t)}):this.fallbackCopy(n,t)}fallbackCopy(e,t){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="2em",n.style.height="2em",n.style.padding="0",n.style.border="none",n.style.outline="none",n.style.boxShadow="none",n.style.background="transparent",document.body.appendChild(n),n.focus(),n.select();try{document.execCommand("copy")&&this.showCopySuccess(t)}catch(i){console.error("复制失败:",i)}document.body.removeChild(n)}showCopySuccess(e){const t=e.textContent;e.classList.add("copied"),e.textContent="已复制 ✓",setTimeout(()=>{e.classList.remove("copied"),e.textContent=t},2e3)}}const ke=1.2,Me=1.15,pt=.2,mt=50,vt="canvas-arrow-modal-";let Te=0;class gt{constructor(){const e=document.querySelectorAll(".canvas-embed:not(.canvas-embed--error)");if(e.length)for(const t of e)this.attach(t)}attach(e){e.setAttribute("role","button"),e.setAttribute("tabindex","0"),e.setAttribute("aria-label","点击放大查看画布"),e.addEventListener("click",t=>{t.target.closest("a")||(t.preventDefault(),this.openModal(e))}),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.openModal(e))})}openModal(e){const t=e.querySelector(".canvas-svg");if(!t)return;const n=t.cloneNode(!0);yt(n),n.classList.add("canvas-modal__svg");const i=document.createElement("div");i.className="canvas-modal",i.innerHTML=`
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
    `,i.querySelector(".canvas-modal__viewport").appendChild(n),document.body.appendChild(i),document.body.classList.add("canvas-modal-open");const o=new wt(n),a=l=>{l.key==="Escape"&&r()},r=()=>{o.destroy(),i.remove(),document.body.classList.remove("canvas-modal-open"),document.removeEventListener("keydown",a)};i.querySelector(".canvas-modal__close").addEventListener("click",r),i.querySelector(".canvas-modal__overlay").addEventListener("click",r),document.addEventListener("keydown",a),i.querySelectorAll(".canvas-modal__btn").forEach(l=>{l.addEventListener("click",()=>{const c=l.dataset.action;c==="zoom-in"?o.zoomBy(ke):c==="zoom-out"?o.zoomBy(1/ke):c==="reset"&&o.reset()})})}}function yt(s){const e=s.querySelector("#canvas-arrow");if(!e)return;Te+=1;const t=`${vt}${Te}`;e.id=t,s.querySelectorAll("[marker-end]").forEach(n=>{n.setAttribute("marker-end",`url(#${t})`)})}class wt{constructor(e){this.svg=e;const t=e.viewBox.baseVal;this.original={x:t.x,y:t.y,w:t.width,h:t.height},this.state={...this.original},this.pointers=new Map,this.pinch=null,this.svg.style.cursor="grab",this.svg.style.touchAction="none",this.onWheel=this.onWheel.bind(this),this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.svg.addEventListener("wheel",this.onWheel,{passive:!1}),this.svg.addEventListener("pointerdown",this.onPointerDown),this.svg.addEventListener("pointermove",this.onPointerMove),this.svg.addEventListener("pointerup",this.onPointerUp),this.svg.addEventListener("pointercancel",this.onPointerUp)}setViewBox(){const{x:e,y:t,w:n,h:i}=this.state;this.svg.setAttribute("viewBox",`${e} ${t} ${n} ${i}`)}currentScale(){return this.original.w/this.state.w}zoomBy(e,t,n){const i=this.currentScale()*e;i<pt||i>mt||(t==null&&(t=this.state.x+this.state.w/2),n==null&&(n=this.state.y+this.state.h/2),this.state.x=t-(t-this.state.x)/e,this.state.y=n-(n-this.state.y)/e,this.state.w/=e,this.state.h/=e,this.setViewBox())}pan(e,t){this.state.x-=e,this.state.y-=t,this.setViewBox()}reset(){this.state={...this.original},this.setViewBox()}screenToSvg(e,t){const n=this.svg.createSVGPoint();n.x=e,n.y=t;const i=this.svg.getScreenCTM();return i?n.matrixTransform(i.inverse()):{x:0,y:0}}onWheel(e){e.preventDefault();const t=e.deltaY<0?Me:1/Me,{x:n,y:i}=this.screenToSvg(e.clientX,e.clientY);this.zoomBy(t,n,i)}onPointerDown(e){e.target.closest("a")||(this.svg.setPointerCapture(e.pointerId),this.pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,svg:this.screenToSvg(e.clientX,e.clientY)}),this.pointers.size===2?this.pinch=this.computePinch():this.pointers.size===1&&(this.svg.style.cursor="grabbing"))}onPointerMove(e){const t=this.pointers.get(e.pointerId);if(t){if(t.clientX=e.clientX,t.clientY=e.clientY,this.pointers.size===2&&this.pinch){const n=this.computePinch(),i=n.dist/this.pinch.dist;if(i>0&&Number.isFinite(i)){const o=this.screenToSvg(n.cx,n.cy);this.zoomBy(i,o.x,o.y)}this.pinch=n}else if(this.pointers.size===1){const n=this.screenToSvg(e.clientX,e.clientY);this.pan(n.x-t.svg.x,n.y-t.svg.y)}}}onPointerUp(e){this.pointers.delete(e.pointerId),this.pointers.size<2&&(this.pinch=null),this.pointers.size===0&&(this.svg.style.cursor="grab")}computePinch(){const[e,t]=[...this.pointers.values()],n=t.clientX-e.clientX,i=t.clientY-e.clientY;return{dist:Math.hypot(n,i),cx:(e.clientX+t.clientX)/2,cy:(e.clientY+t.clientY)/2}}destroy(){this.svg.removeEventListener("wheel",this.onWheel),this.svg.removeEventListener("pointerdown",this.onPointerDown),this.svg.removeEventListener("pointermove",this.onPointerMove),this.svg.removeEventListener("pointerup",this.onPointerUp),this.svg.removeEventListener("pointercancel",this.onPointerUp)}}const ue={en:{Home:"Home",Daily:"Daily",Archives:"Archives",About:"About",Portfolio:"Portfolio",Bilibili:"Bilibili",GitHub:"GitHub",Instagram:"Instagram",Douban:"Douban",Email:"Email",RSS:"RSS",Language:"Language",Copyright:"Copyright","Powered by":"Powered by","Modified based on":"Modified based on",theme:"theme","Mainly maintained using AI":"Mainly maintained using AI","Older Posts":"Older Posts","Newer Posts":"Newer Posts",Comments:"Comments","Switch to Chinese":"Switch to Chinese","Switch to English":"Switch to English","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"Switched to English",articleLanguageSwitched:"Switched to English version","tag-graph-hint":"Click tag to explore · Scroll to zoom · Drag to rearrange"},"zh-CN":{Home:"首页",Daily:"每日资讯",Archives:"归档",About:"关于",Portfolio:"作品集",Bilibili:"哔哩哔哩",GitHub:"GitHub",Instagram:"Instagram",Douban:"豆瓣",Email:"邮箱",RSS:"RSS",Language:"语言",Copyright:"版权所有","Powered by":"技术支持","Modified based on":"基于",theme:"主题","Mainly maintained using AI":"主要使用AI来维护","Older Posts":"上一页","Newer Posts":"下一页",Comments:"留言","Switch to Chinese":"切换至中文","Switch to English":"切换至英文","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"已切换至中文",articleLanguageSwitched:"已切换至中文版本","tag-graph-hint":"点击标签探索 · 滚轮缩放 · 拖拽移动"}},bt=()=>(navigator.language||navigator.userLanguage).startsWith("zh")?"zh-CN":"en",Ie=()=>localStorage.getItem("siteLanguage")||bt(),xt=()=>{const s=document.cookie.match(/(?:^|;\s*)lang_pref=([^;]+)/);return s?s[1]:null},Et=s=>{document.cookie="lang_pref="+s+"; path=/; max-age=31536000; samesite=lax"},Pe=()=>{const s=document.querySelector('meta[name="article:lang"]');return s?s.content:window.location.pathname.includes(".zh-CN")?"zh-CN":"en"},Ne=s=>{const e=document.querySelector(`link[rel="alternate"][hreflang="${s}"]`);if(!e)return null;const t=new URL(e.href,window.location.origin);return window.location.origin+t.pathname+t.search+t.hash},De=s=>{const e=window.location.pathname;if(s==="zh-CN")return e.startsWith("/zh-CN/")||e==="/zh-CN"?null:window.location.origin+"/zh-CN"+e+window.location.search+window.location.hash;if(!e.startsWith("/zh-CN/")&&e!=="/zh-CN")return null;const t=e.replace(/^\/zh-CN(?=\/|$)/,"")||"/";return window.location.origin+t+window.location.search+window.location.hash},He=s=>{document.querySelectorAll(".lang-switch__opt").forEach(e=>{e.setAttribute("aria-pressed",e.getAttribute("data-lang")===s?"true":"false")})},pe=s=>{const e=ue[s];if(!e){console.warn("Language data not available for:",s);return}document.documentElement.lang=s,document.querySelectorAll("nav ul li a").forEach(l=>{const c=l.getAttribute("data-i18n-key");c&&e[c]&&(l.textContent=e[c])}),document.querySelectorAll("[data-i18n]").forEach(l=>{const c=l.getAttribute("data-i18n");e[c]&&(l.textContent=e[c])}),document.querySelectorAll("[data-title]").forEach(l=>{const c=l.getAttribute("data-title");e[c]&&l.setAttribute("data-title",e[c])});const o=document.querySelector(".pagination .extend.prev"),a=document.querySelector(".pagination .extend.next");o&&(o.textContent=e["Older Posts"]||o.textContent),a&&(a.textContent=e["Newer Posts"]||a.textContent),localStorage.setItem("siteLanguage",s),document.querySelectorAll("[data-i18n-tag]").forEach(l=>{const c=l.getAttribute("data-i18n-tag");if(s==="zh-CN"){const p=window.tagTranslations&&window.tagTranslations[c];p&&(l.textContent=p)}else l.textContent=c}),He(s)},Lt=s=>{const e=document.querySelector(".lang-notification");e&&e.remove();const t=document.createElement("div");t.className="lang-notification",t.textContent=s,document.body.appendChild(t),setTimeout(()=>{t.classList.add("show")},10),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},2e3)},qe=s=>{if(Et(s),s===Pe()){localStorage.setItem("siteLanguage",s),pe(s);return}const e=Ne(s)||De(s);if(e){localStorage.setItem("siteLanguage",s),window.location.href=e;return}pe(s);const t=ue[s]?ue[s].languageSwitched:"Language switched";Lt(t)},St=()=>{const s=Ie()==="zh-CN"?"en":"zh-CN";qe(s)},Ct=()=>{document.querySelectorAll(".lang-switch__opt").forEach(s=>{s.addEventListener("click",e=>{e.preventDefault(),qe(s.getAttribute("data-lang"))})}),He(Ie())},Ae=()=>{const s=Pe(),e=xt();if(pe(e||s),e&&e!==s){const t=Ne(e)||De(e);t&&window.location.replace(t)}};function kt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ae):Ae(),window.addEventListener("load",()=>{const s=document.getElementById("langSwitch");s&&s.addEventListener("click",e=>{e.preventDefault(),St()}),Ct()})}function Mt(){const s=document.getElementById("tag-graph"),e=document.getElementById("tag-graph-container"),t=window.__TAG_GRAPH_DATA__;if(!s||!t||!t.nodes||t.nodes.length===0)return;const n=document.createElement("div");n.className="graph-loading",n.textContent="Loading",s.parentNode.appendChild(n);const i=t.archiveFilterTags||[],o={};i.forEach(function(d){o[d]=!0});function a(d){return String(d||"").replace(/-/g," ").replace(/\s+/g," ").trim().toLowerCase()}const r={};t.links.forEach(function(d){r[d.source]=(r[d.source]||0)+1,r[d.target]=(r[d.target]||0)+1});let l=1;t.nodes.forEach(function(d){const h=d.value||0;h>l&&(l=h)}),t.nodes.forEach(function(d){const h=d.value||0;d.symbolSize=Math.max(12,Math.min(70,12+h*(58/l)))});const c={};t.nodes.forEach(function(d){c[d.name]=[]});function p(d,h){!c[d]||!c[h]||d===h||(c[d].indexOf(h)===-1&&c[d].push(h),c[h].indexOf(d)===-1&&c[h].push(d))}t.links.forEach(function(d){p(d.source,d.target)});const y={};t.nodes.forEach(function(d){const h=a(d.name);y[h]||(y[h]=[]),y[h].push(d.name)}),Object.keys(y).forEach(function(d){const h=y[d];if(!(h.length<2))for(let v=0;v<h.length;v++)for(let b=v+1;b<h.length;b++)p(h[v],h[b])});const f={},L=[];i.forEach(function(d){c[d]!==void 0&&(f[d]=0,L.push(d))});let A=0;for(;A<L.length;){const d=L[A++];(c[d]||[]).forEach(function(h){f[h]===void 0&&(f[h]=f[d]+1,L.push(h))})}Object.keys(f).forEach(function(d){});const k=[{h:260,s:62,l:50},{h:15,s:80,l:55},{h:160,s:60,l:42},{h:220,s:72,l:52},{h:340,s:70,l:52},{h:45,s:85,l:50},{h:190,s:70,l:45},{h:90,s:55,l:45},{h:290,s:60,l:50},{h:30,s:75,l:48},{h:130,s:50,l:42},{h:0,s:70,l:55}];function R(d,h,v){return"hsl("+Math.round(d)+", "+Math.round(h)+"%, "+Math.round(v)+"%)"}const H={},F={},I=t.nodes.filter(function(d){return o[d.name]});I.sort(function(d,h){return h.value-d.value}),I.forEach(function(d,h){const v=k[h%k.length];F[d.name]=v,H[d.name]=R(v.h,v.s,v.l)});const N={};i.forEach(function(d){if(c[d]===void 0)return;const h={};h[d]=0;const v=[d];let b=0;for(;b<v.length;){const P=v[b++];(c[P]||[]).forEach(function(C){h[C]===void 0&&(h[C]=h[P]+1,v.push(C))})}N[d]=h});const _=t.nodes.filter(function(d){return!o[d.name]});let O=1;_.forEach(function(d){let h=1/0;i.forEach(function(v){if(!N[v])return;const b=N[v][d.name];b!==void 0&&b<h&&(h=b)}),h<1/0&&h>O&&(O=h)}),_.forEach(function(d){const h=[];let v=0;if(i.forEach(function(u){if(!N[u]||!F[u])return;let g=N[u][d.name];if(g===void 0)return;g===0&&(g=.5);const E=1/(g*g);h.push({ft:u,w:E}),v+=E}),v===0){H[d.name]="hsl(0, 0%, 82%)";return}let b=0,P=0,C=0,w=0;h.forEach(function(u){const g=u.w/v,E=F[u.ft],q=E.h*Math.PI/180;b+=Math.sin(q)*g,P+=Math.cos(q)*g,C+=E.s*g,w+=E.l*g});let M=Math.atan2(b,P)*180/Math.PI;M<0&&(M+=360);let W=C,B=w,m=1/0;h.forEach(function(u){const g=N[u.ft][d.name];g<m&&(m=g)});let x=(m-1)/Math.max(O-1,1);x=Math.max(0,Math.min(1,x));const z=Math.pow(x,.85),T=32,S=1-z*.35;W=Math.max(T,W*S),B=B+z*(82-B)*.78,H[d.name]=R(M,W,B)});const J=t.tagTranslations||{},Y={};Object.keys(J).forEach(function(d){Y[d]=J[d];const h=d.replace(/-/g," ");h!==d&&(Y[h]=J[d])});function ie(d){return(typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en")==="zh-CN"&&Y[d]?Y[d]:d}const ye=e.getBoundingClientRect(),j=ye.width||500,G=ye.height||400,we=Math.min(j,G)*.28;I.forEach(function(d,h){const v=2*Math.PI*h/Math.max(I.length,1)-Math.PI/2;d.x=j/2+we*Math.cos(v),d.y=G/2+we*Math.sin(v)});const be=Math.min(j,G)*.45;_.forEach(function(d,h){const v=2*Math.PI*h/Math.max(_.length,1);d.x=j/2+be*Math.cos(v),d.y=G/2+be*Math.sin(v)});const Oe=60,D=t.nodes;for(let d=0;d<15;d++)for(let h=0;h<D.length;h++)for(let v=h+1;v<D.length;v++){const b=D[v].x-D[h].x,P=D[v].y-D[h].y,C=Math.sqrt(b*b+P*P),w=Oe+(D[h].symbolSize+D[v].symbolSize)/2;if(C<w){const M=(w-C)/2,W=C>.1?b/C:Math.random()-.5,B=C>.1?P/C:Math.random()-.5;D[h].x-=W*M,D[h].y-=B*M,D[v].x+=W*M,D[v].y+=B*M}}let ee=1,te=[j/2,G/2];if(I.length>0){let d=1/0,h=-1/0,v=1/0,b=-1/0;I.forEach(function(w){const M=(w.symbolSize||20)/2+50;w.x-M<d&&(d=w.x-M),w.x+M>h&&(h=w.x+M),w.y-M<v&&(v=w.y-M),w.y+M>b&&(b=w.y+M)});const P=h-d,C=b-v;if(P>0&&C>0){const w=j/P,M=G/C;ee=Math.min(w,M,1.5)*.8,ee<.3&&(ee=.3),te=[(d+h)/2,(v+b)/2]}}t.nodes.forEach(function(d){d.itemStyle={color:H[d.name],borderColor:"#fff",borderWidth:1.5,shadowBlur:5,shadowColor:"rgba(0, 0, 0, 0.06)"},d.label={show:!0,formatter:function(){return ie(d.name)},fontSize:Math.max(10,Math.min(15,9+(r[d.name]||0)*.5)),color:"#555",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}});const V=e.querySelector(".tag-graph-hint");let xe=null,ce=!1;function We(){ce||(ce=!0,V.classList.add("visible"),clearTimeout(xe),xe=setTimeout(function(){V.classList.remove("visible"),ce=!1},3e3))}e.addEventListener("mouseenter",We);const X=document.createElement("script");X.src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",X.integrity="sha384-Mx5lkUEQPM1pOJCwFtUICyX45KNojXbkWdYhkKUKsbv391mavbfoAmONbzkgYPzR",X.crossOrigin="anonymous",X.onload=function(){Ue()},X.onerror=function(){n.textContent="Failed to load chart library",n.style.color="#c44"},document.head.appendChild(X);function Be(d){return d<10?750:d<20?1200:d<40?1650:2100}function Ue(){n.parentNode&&n.parentNode.removeChild(n);const d=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window,h=echarts.init(s),v={backgroundColor:"transparent",tooltip:{show:!0,enterable:!0,confine:!0,backgroundColor:"rgba(255, 255, 255, 0.97)",borderColor:"#e8e8e8",borderWidth:1,padding:[10,14],textStyle:{color:"#4b4848",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:13},extraCssText:"border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); max-height: 260px; overflow-y: auto;",formatter:function(m){function x(T){return String(T??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function z(T,S){const u=x(T),g=x(S),E='style="display:block;color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;text-decoration:none;"';return g?'<a href="'+g+'" '+E+">• "+u+"</a>":"<div "+E+">• "+u+"</div>"}if(m.dataType==="node"){const T=ie(m.name);let S='<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:'+(H[m.name]||"#795da3")+'">'+x(T)+"</div>";S+='<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 '+m.value+" article"+(m.value>1?"s":"")+"</div>";const u=t.postTitles&&t.postTitles[m.name];return u&&u.length>0&&(S+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">',u.forEach(function(g){typeof g=="string"?S+=z(g,""):S+=z(g.title,g.path)}),S+="</div>"),S}if(m.dataType==="edge"){const T=m.data.source,S=m.data.target;let u='<span style="font-weight:600">'+x(ie(T))+'</span> <span style="color:#bbb">↔</span> <span style="font-weight:600">'+x(ie(S))+"</span>";u+='<br/><span style="color:#999;font-size:12px">📄 '+m.data.value+" article"+(m.data.value>1?"s":"")+"</span>";const g=[T,S].sort().join("	"),E=t.linkPosts&&t.linkPosts[g];return E&&E.length>0&&(u+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;margin-top:5px;">',E.forEach(function(q){u+=z(q.title,q.path)}),u+="</div>"),u}}},animationDuration:1500,animationEasingUpdate:"quinticInOut",series:[{type:"graph",layout:"force",data:t.nodes,links:t.links,roam:!1,draggable:!d,force:{repulsion:Be(t.nodes.length),edgeLength:[150,450],gravity:.12,friction:.6,layoutAnimation:!0},emphasis:{focus:"adjacency",blurScope:"global",itemStyle:{shadowBlur:20,shadowColor:"rgba(121, 93, 163, 0.45)",borderWidth:2,borderColor:"#fff"},lineStyle:{width:3,opacity:.85},label:{show:!0,fontSize:14,fontWeight:"bold",color:"#333"}},label:{position:"right",distance:6},lineStyle:{color:"#d0d0d0",width:1.5,curveness:0,opacity:.35},scaleLimit:{min:.3,max:4},zoom:ee,center:te}]};h.setOption(v);let b=!1,P=!1;if(I.length>0){const m=function(){if(P)return;if(b){P=!0,h.off("finished",m);return}const x=h.getModel(),z=x&&x.getSeriesByIndex&&x.getSeriesByIndex(0),T=z&&z.getGraph&&z.getGraph();let S=1/0,u=-1/0,g=1/0,E=-1/0,q=0;if(I.forEach(function(oe){const de=T&&T.getNodeByName&&T.getNodeByName(oe.name),ae=de&&de.getLayout&&de.getLayout();let K,Z;ae&&ae.length>=2?(K=ae[0],Z=ae[1]):(K=oe.x||0,Z=oe.y||0);const U=(oe.symbolSize||20)/2+50;K-U<S&&(S=K-U),K+U>u&&(u=K+U),Z-U<g&&(g=Z-U),Z+U>E&&(E=Z+U),q++}),q===0)return;const ne=u-S,se=E-g;if(ne<=0||se<=0)return;let $=Math.min(j/ne,G/se,1.5)*.8;$<.3&&($=.3),P=!0,C=$,w=[(S+u)/2,(g+E)/2],h.setOption({series:[{zoom:$,center:w.slice()}]}),h.off("finished",m)};h.on("finished",m)}h.on("click",function(m){m.dataType==="node"&&t.tagPaths&&t.tagPaths[m.name]&&(window.location.href=t.tagPaths[m.name])}),h.on("mouseover",function(m){(m.dataType==="node"||m.dataType==="edge")&&(s.style.cursor="pointer")}),h.on("mouseout",function(){s.style.cursor="default"});let C=ee||1,w=te?[te[0],te[1]]:[0,0];if(!d){const m=e||s;m.addEventListener("wheel",function(u){u.preventDefault()},{passive:!1}),m.addEventListener("touchmove",function(u){u.touches.length>=2&&u.preventDefault()},{passive:!1});const x=h.getZr();x.on("mousewheel",function(u){u.event.preventDefault(),u.event.stopPropagation(),b=!0;const g=u.wheelDelta>0?1.08:1/1.08;let E=C*g;E<.3&&(E=.3),E>4&&(E=4),C=E,h.setOption({series:[{zoom:C}]})});let z=!1,T=[0,0],S=[0,0];x.on("mousedown",function(u){u.target||(z=!0,b=!0,T=[u.event.clientX,u.event.clientY],S=[w[0],w[1]],s.style.cursor="grabbing")}),x.on("mousemove",function(u){if(z){const g=u.event.clientX-T[0],E=u.event.clientY-T[1],q=s.clientWidth,ne=s.clientHeight,se=q/C,$=ne/C;w[0]=S[0]-g*(se/q),w[1]=S[1]-E*($/ne),h.setOption({series:[{center:[w[0],w[1]]}]})}}),x.on("mouseup",function(){z&&(z=!1,s.style.cursor="default")}),x.on("globalout",function(){z&&(z=!1,s.style.cursor="default")})}if(d){const m=document.createElement("button");m.type="button",m.className="tag-graph-fs-btn",m.setAttribute("aria-label","Fullscreen"),m.innerHTML='<svg class="tag-graph-fs-ic tag-graph-fs-ic--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg><svg class="tag-graph-fs-ic tag-graph-fs-ic--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',e.appendChild(m);let x=!1;const z=function(){if(!V)return;const u=typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en";V.textContent=u==="zh-CN"?"双指缩放 · 拖动平移 · 点按进入标签":"Pinch to zoom · Drag to pan · Tap a tag",V.classList.add("visible"),setTimeout(function(){V.classList.remove("visible")},2600)},T=function(){x=!0,e.classList.add("tag-graph-fullscreen"),m.classList.add("is-fullscreen"),m.setAttribute("aria-label","Exit fullscreen"),document.body.style.overflow="hidden",document.body.classList.add("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!0}]}),z()})},S=function(){x=!1,e.classList.remove("tag-graph-fullscreen"),m.classList.remove("is-fullscreen"),m.setAttribute("aria-label","Fullscreen"),document.body.style.overflow="",document.body.classList.remove("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!1,zoom:C,center:w.slice()}]})})};m.addEventListener("click",function(u){u.preventDefault(),u.stopPropagation(),x?S():T()}),document.addEventListener("keydown",function(u){u.key==="Escape"&&x&&S()})}let M;window.addEventListener("resize",function(){clearTimeout(M),M=setTimeout(function(){h.resize()},150)});function W(){h.setOption({series:[{data:t.nodes}]})}window.addEventListener("storage",function(m){m.key==="siteLanguage"&&W()});const B=localStorage.setItem;localStorage.setItem=function(m,x){B.call(localStorage,m,x),m==="siteLanguage"&&setTimeout(W,50)}}}function Tt(s){const e=s.querySelectorAll("h1, h2, h3, h4, h5, h6"),t=[0,0,0,0,0,0],n=[];return Array.from(e).map((i,o)=>{const a=parseInt(i.tagName[1],10);t[a-1]+=1;for(let r=a;r<6;r+=1)t[r]=0;for(;n.length>a-1;)n.pop();return n.push(t[a-1]),i.id||(i.id=`heading-${o}`),{element:i,level:a,index:o,id:i.id,text:i.textContent,number:n.join(".")}})}const _e="toc-panel-state";function me(){try{const s=localStorage.getItem(_e);if(!s)return null;const e=JSON.parse(s);return!e||typeof e!="object"?null:e}catch{return null}}function ve(s){try{const t={...me()||{},...s};localStorage.setItem(_e,JSON.stringify(t))}catch{}}function At(s){const e=me();if(!e)return;const t=window.innerWidth,n=window.innerHeight,i=200,o=150;if(typeof e.width=="number"&&typeof e.height=="number"){const a=Math.max(i,Math.min(e.width,t)),r=Math.max(o,Math.min(e.height,n));s.style.width=`${a}px`,s.style.height=`${r}px`}if(typeof e.left=="number"&&typeof e.top=="number"){const a=s.getBoundingClientRect(),r=s.style.width?parseFloat(s.style.width):a.width,l=s.style.height?parseFloat(s.style.height):a.height,c=Math.max(0,Math.min(e.left,t-r)),p=Math.max(0,Math.min(e.top,n-l));s.style.left=`${c}px`,s.style.top=`${p}px`,s.style.right="auto",s.style.bottom="auto"}}function zt(s){const e=document.createElement("div");e.className="toc-container",e.innerHTML='<div class="toc-header"><span class="toc-title"></span><button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button></div><div class="toc-content"><div class="toc-list"></div></div>',document.body.appendChild(e);const t=e.querySelector(".toc-list"),n=s.map(i=>{const o=document.createElement("div");o.className="toc-item",o.setAttribute("data-level",String(i.level)),o.setAttribute("data-index",String(i.index));const a=document.createElement("div");a.className="toc-collapse-btn";const r=document.createElement("span");return r.className="toc-item-text",r.style.cursor="pointer",r.innerHTML=`<span class="toc-number">${i.number}.</span> `,r.appendChild(document.createTextNode(i.text)),i.element.classList.contains("collapsed")&&o.classList.add("collapsed"),o.appendChild(a),o.appendChild(r),t.appendChild(o),o});return At(e),{container:e,items:n}}function Rt(){return(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?"zh":"en"}const It={zh:{title:"目录",open:"目录",hide:"隐藏目录",show:"显示目录"},en:{title:"Contents",open:"Contents",hide:"Hide contents",show:"Show contents"}};function Pt(s){const e=It[Rt()],t=s.querySelector(".toc-title");t&&(t.textContent=e.title);const n=s.querySelector(".toc-close-btn");n&&(n.setAttribute("aria-label",e.hide),n.setAttribute("title",e.hide));const i=document.createElement("button");i.type="button",i.className="toc-reopen",i.setAttribute("aria-label",e.show),i.innerHTML='<span class="toc-reopen__icon" aria-hidden="true"></span><span>'+e.open+"</span>",document.body.appendChild(i);function o(r,l){s.style.display=r?"none":"",i.classList.toggle("is-visible",r),l&&ve({hidden:r})}n&&n.addEventListener("click",r=>{r.stopPropagation(),o(!0,!0)}),i.addEventListener("click",()=>o(!1,!0));const a=me();a&&a.hidden&&o(!0,!1)}function ge(s,e,t){for(let n=e+1;n<s.length&&!(parseInt(s[n].getAttribute("data-level")||"1",10)<=t);n+=1)s[n].classList.add("toc-hidden")}function Fe(s,e,t){for(let n=e+1;n<s.length;n+=1){const i=parseInt(s[n].getAttribute("data-level")||"1",10);if(i<=t)break;if(i===t+1)s[n].classList.remove("toc-hidden");else{let o=!0;for(let a=n-1;a>e;a-=1){const r=parseInt(s[a].getAttribute("data-level")||"1",10);if(r<i&&s[a].classList.contains("collapsed")){o=!1;break}if(r<=t)break}o&&s[n].classList.remove("toc-hidden")}}}function Nt(s){const e=parseInt(s.tagName.charAt(1),10);let t=s.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t=t.nextElementSibling;continue}t.style.display="none",t=t.nextElementSibling}}function Dt(s){const e=parseInt(s.tagName.charAt(1),10);let t=s.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t.style.display="",t=t.nextElementSibling;continue}t.style.display="",t=t.nextElementSibling}}function Ht(s,e,t){const n=e[t],i=s[t]&&s[t].element;if(!n||!i)return;const o=parseInt(n.getAttribute("data-level")||"1",10);!n.classList.contains("collapsed")?(n.classList.add("collapsed"),ge(e,t,o),i.classList.contains("collapsed")||(i.classList.add("collapsed"),Nt(i))):(n.classList.remove("collapsed"),Fe(e,t,o),i.classList.contains("collapsed")&&(i.classList.remove("collapsed"),Dt(i)))}function qt(s,e,t){const n=e[t],i=s[t]&&s[t].element;if(!n||!i)return;const o=parseInt(n.getAttribute("data-level")||"1",10),a=i.classList.contains("collapsed");a&&!n.classList.contains("collapsed")?(n.classList.add("collapsed"),ge(e,t,o)):!a&&n.classList.contains("collapsed")&&(n.classList.remove("collapsed"),Fe(e,t,o))}function _t(s,e){e.forEach((i,o)=>{if(i.classList.contains("collapsed")){const a=parseInt(i.getAttribute("data-level")||"1",10);ge(e,o,a)}}),e.forEach((i,o)=>{const a=i.querySelector(".toc-collapse-btn");a&&a.addEventListener("click",r=>{r.stopPropagation(),Ht(s,e,o)})});const t=new Map;s.forEach((i,o)=>t.set(i.element,o));const n=new MutationObserver(i=>{i.forEach(o=>{if(o.type!=="attributes"||o.attributeName!=="class")return;const a=t.get(o.target);a!==void 0&&qt(s,e,a)})});return s.forEach(i=>{n.observe(i.element,{attributes:!0,attributeFilter:["class"]})}),{observer:n}}function Ft(s,e,t){const n=s.clientX,i=s.clientY,o=e.getBoundingClientRect(),a=o.left,r=o.top,l=o.width,c=o.height;let p=!1,y=null;function f(){p=!1;const k=y;if(!k)return;const R=window.innerWidth,H=window.innerHeight,F=Math.max(0,Math.min(a+(k.clientX-n),R-l)),I=Math.max(0,Math.min(r+(k.clientY-i),H-c));e.style.left=`${F}px`,e.style.top=`${I}px`,e.style.right="auto",e.style.bottom="auto"}function L(k){y=k,p||(p=!0,requestAnimationFrame(f))}function A(){document.removeEventListener("mousemove",L),document.removeEventListener("mouseup",A),t.dragging=!1;const k=e.getBoundingClientRect();ve({left:k.left,top:k.top})}t.dragging=!0,document.addEventListener("mousemove",L),document.addEventListener("mouseup",A),s.preventDefault()}const le=8,he=200,fe=150;function Ot(s,e){s.addEventListener("mousemove",t=>{if(e.dragging||e.resizing)return;const n=s.getBoundingClientRect(),i=t.clientX-n.left,o=t.clientY-n.top;let a="move",r="";const l=i<=le,c=i>=n.width-le,p=o<=le,y=o>=n.height-le;p&&l?(a="nw-resize",r="nw"):p&&c?(a="ne-resize",r="ne"):y&&l?(a="sw-resize",r="sw"):y&&c?(a="se-resize",r="se"):l?(a="w-resize",r="w"):c?(a="e-resize",r="e"):p?(a="n-resize",r="n"):y&&(a="s-resize",r="s"),s.style.cursor=a,e.resizeDirection=r;const f=s.querySelector(".toc-header");f&&(f.style.cursor=r?a:"")}),s.addEventListener("mouseleave",()=>{if(!e.dragging&&!e.resizing){s.style.cursor="default",e.resizeDirection="";const t=s.querySelector(".toc-header");t&&(t.style.cursor="")}})}function Wt(s,e,t){const n=t.resizeDirection;if(!n)return;const i=s.clientX,o=s.clientY,a=e.getBoundingClientRect(),r=a.left,l=a.top,c=a.width,p=a.height;let y=!1,f=null;function L(){y=!1;const R=f;if(!R)return;const H=R.clientX-i,F=R.clientY-o;let I=c,N=p,_=r,O=l;n.includes("e")&&(I=c+H),n.includes("w")&&(I=c-H,_=r+H),n.includes("s")&&(N=p+F),n.includes("n")&&(N=p-F,O=l+F),I<he&&(n.includes("w")&&(_=r+c-he),I=he),N<fe&&(n.includes("n")&&(O=l+p-fe),N=fe);const J=window.innerWidth,Y=window.innerHeight;_=Math.max(0,Math.min(_,J-I)),O=Math.max(0,Math.min(O,Y-N)),e.style.width=`${I}px`,e.style.height=`${N}px`,e.style.left=`${_}px`,e.style.top=`${O}px`,e.style.right="auto",e.style.bottom="auto"}function A(R){f=R,y||(y=!0,requestAnimationFrame(L))}function k(){document.removeEventListener("mousemove",A),document.removeEventListener("mouseup",k),t.resizing=!1,t.resizeDirection="";const R=e.getBoundingClientRect();ve({left:R.left,top:R.top,width:R.width,height:R.height})}t.resizing=!0,document.addEventListener("mousemove",A),document.addEventListener("mouseup",k),s.preventDefault()}const ze={1:{passed:"rgba(128,128,128,0.1)",reading:"rgba(66,153,225,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(66,153,225,0.25)"},2:{passed:"rgba(128,128,128,0.1)",reading:"rgba(49,130,206,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(49,130,206,0.25)"},3:{passed:"rgba(128,128,128,0.1)",reading:"rgba(44,82,130,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(44,82,130,0.25)"},4:{passed:"rgba(128,128,128,0.1)",reading:"rgba(42,67,101,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(42,67,101,0.25)"},5:{passed:"rgba(128,128,128,0.1)",reading:"rgba(26,54,93,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(26,54,93,0.25)"},6:{passed:"rgba(128,128,128,0.1)",reading:"rgba(21,62,117,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(21,62,117,0.25)"}};function Bt(s,e){if(!s.length)return{destroy(){}};const t=new Array(s.length).fill("coming"),n=new Set;let i=-1;const o=new Map;s.forEach((f,L)=>o.set(f.element,L));function a(){e.forEach((f,L)=>{const A=parseInt(f.getAttribute("data-level")||"1",10),k=ze[A]||ze[1],R=t[L];f.classList.remove("toc-passed","toc-reading","toc-coming"),f.style.boxShadow="",f.style.transform="",f.style.fontWeight="",L===i?(f.classList.add("toc-reading"),f.style.backgroundColor=k.active,f.style.opacity="1",f.style.fontWeight="600",f.style.boxShadow="inset 0 0 0 2px rgba(66,153,225,0.3)",f.style.transform="scale(1.02)",f.style.transition="all 0.2s ease"):R==="reading"?(f.classList.add("toc-reading"),f.style.backgroundColor=k.reading,f.style.opacity="1",f.style.fontWeight="600"):R==="passed"?(f.classList.add("toc-passed"),f.style.backgroundColor=k.passed,f.style.opacity="0.7"):(f.classList.add("toc-coming"),f.style.backgroundColor=k.coming,f.style.opacity="0.5")})}function r(){const f=window.innerHeight/2;let L=-1;n.forEach(A=>{const k=s[A].element.getBoundingClientRect();k.top<=f&&k.bottom>=f&&(L=A)}),L!==i&&(i=L,a())}let l=null;function c(){l||(l=requestAnimationFrame(()=>{l=null,r()}))}const p=new IntersectionObserver(f=>{f.forEach(L=>{const A=o.get(L.target);A!==void 0&&(L.isIntersecting?(n.add(A),t[A]="reading"):(n.delete(A),t[A]=L.boundingClientRect.bottom<0?"passed":"coming"))}),r(),a()});s.forEach(f=>p.observe(f.element)),window.addEventListener("scroll",c,{passive:!0}),window.addEventListener("resize",c,{passive:!0}),a();function y(){p.disconnect(),window.removeEventListener("scroll",c),window.removeEventListener("resize",c),l&&cancelAnimationFrame(l)}return{destroy:y,refresh:()=>{r(),a()}}}function Ut(){const s=document.querySelector(".content");if(!s||s.classList.contains("archives"))return null;const e=document.body;if(e.classList.contains("path-about-index-html")||e.classList.contains("layout-about"))return null;const t=document.querySelector("section.main[data-toc]");return t&&t.getAttribute("data-toc")==="false"?null:s}function jt(s){return s.classList.contains("toc-collapse-btn")||s.classList.contains("toc-item-text")||s.closest(".toc-collapse-btn")||s.closest(".toc-item-text")||s.closest(".toc-close-btn")}function Gt(){const s=Ut();if(!s)return;const e=Tt(s);if(!e.length)return;const{container:t,items:n}=zt(e);Pt(t),_t(e,n);const i={dragging:!1,resizing:!1,resizeDirection:""};Ot(t,i),t.addEventListener("mousedown",a=>{jt(a.target)||(i.resizeDirection?Wt(a,t,i):Ft(a,t,i))});const o=Bt(e,n);n.forEach((a,r)=>{const l=a.querySelector(".toc-item-text");l&&l.addEventListener("click",()=>{const c=e[r]&&e[r].element;c&&(c.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>o.refresh(),300))})})}function Re(){new je,new st,new rt,new lt,document.getElementById("map")&&new ct,new dt,setTimeout(()=>{new ht},500),new ft,new ut,new gt,kt(),Gt(),document.getElementById("tag-graph")&&Mt()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Re):Re();
