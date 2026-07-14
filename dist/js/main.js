class Fe{constructor(){this.header=document.querySelector("header"),this.menuIcon=document.getElementById("menu_icon"),this.navTriggerZone=50,this.showNavTimeout=null,this.lastMouseEvent=null,this.mouseMoveScheduled=!1,this.mediaQuery=null,this.currentMode=null,this.navLinks=null,this.onMouseMove=this.onMouseMove.bind(this),this.onHeaderEnter=this.onHeaderEnter.bind(this),this.onHeaderLeave=this.onHeaderLeave.bind(this),this.onMenuIconClick=this.onMenuIconClick.bind(this),this.onNavLinkClick=this.onNavLinkClick.bind(this),this.onKeydown=this.onKeydown.bind(this),this.onBreakpointChange=this.onBreakpointChange.bind(this),this.init()}init(){this.header&&(this.mediaQuery=window.matchMedia("(min-width: 1099px)"),this.mediaQuery.addEventListener("change",this.onBreakpointChange),this.applyMode(this.mediaQuery.matches?"desktop":"mobile"))}onBreakpointChange(e){this.applyMode(e.matches?"desktop":"mobile")}applyMode(e){e!==this.currentMode&&(this.teardown(),this.currentMode=e,e==="desktop"?this.bindDesktop():this.bindMobile())}teardown(){document.removeEventListener("mousemove",this.onMouseMove),this.header.removeEventListener("mouseenter",this.onHeaderEnter),this.header.removeEventListener("mouseleave",this.onHeaderLeave),document.removeEventListener("keydown",this.onKeydown),this.menuIcon&&this.menuIcon.removeEventListener("click",this.onMenuIconClick),this.navLinks&&this.navLinks.forEach(e=>e.removeEventListener("click",this.onNavLinkClick)),clearTimeout(this.showNavTimeout),this.showNavTimeout=null,this.header.classList.remove("show_menu","menu-open"),document.body.style.overflow=""}bindDesktop(){document.addEventListener("mousemove",this.onMouseMove),this.header.addEventListener("mouseenter",this.onHeaderEnter),this.header.addEventListener("mouseleave",this.onHeaderLeave)}bindMobile(){this.menuIcon&&(this.menuIcon.addEventListener("click",this.onMenuIconClick),this.navLinks=this.header.querySelectorAll("nav ul li a"),this.navLinks.forEach(e=>e.addEventListener("click",this.onNavLinkClick)),document.addEventListener("keydown",this.onKeydown))}openMenu(){this.header.classList.add("menu-open"),this.menuIcon.setAttribute("aria-expanded","true"),this.menuIcon.setAttribute("aria-label","Close menu"),document.body.style.overflow="hidden"}closeMenu(){this.header.classList.remove("menu-open"),this.menuIcon&&(this.menuIcon.setAttribute("aria-expanded","false"),this.menuIcon.setAttribute("aria-label","Open menu")),document.body.style.overflow=""}onMenuIconClick(e){e.preventDefault(),this.header.classList.contains("menu-open")?this.closeMenu():this.openMenu()}onNavLinkClick(){this.closeMenu()}onKeydown(e){e.key==="Escape"&&this.header.classList.contains("menu-open")&&this.closeMenu()}onMouseMove(e){this.lastMouseEvent=e,!this.mouseMoveScheduled&&(this.mouseMoveScheduled=!0,requestAnimationFrame(()=>{this.mouseMoveScheduled=!1,this.processMouseMove(this.lastMouseEvent)}))}processMouseMove(e){if(e){if(e.pageX<=this.navTriggerZone){clearTimeout(this.showNavTimeout),this.header.classList.add("show_menu");return}clearTimeout(this.showNavTimeout),this.showNavTimeout=setTimeout(()=>{const t=this.header.getBoundingClientRect();e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom||this.header.classList.remove("show_menu")},300)}}onHeaderEnter(){clearTimeout(this.showNavTimeout)}onHeaderLeave(){this.showNavTimeout=setTimeout(()=>{this.header.classList.remove("show_menu")},300)}}const He=`#define time iTime

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
}`,We=`// artifact-at-sea.wgsl — WebGPU twin of artifact-at-sea.glsl, used only for
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
`,Be="(min-width: 1099px)",Ue="(prefers-reduced-motion: reduce)",je=8e3,Ge=30,Ve=3.4,Ye=1.3,ye=.55,be=1100,we=1,Xe=3,$e=1.7;function Ke(){return/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className||"")}function Z(s){return Math.max(0,Math.min(1,s))}function re(s){return s*s*(3-2*s)}const Ze=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,Qe=`#version 300 es
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
${He}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class Je{constructor(){Ke()&&(this.mq=window.matchMedia(Be),this.reduce=window.matchMedia(Ue),this.dyn=window.matchMedia("(dynamic-range: high)"),this.canvas=null,this.gl=null,this.gpu=null,this.backend="webgl",this.ready=!1,this.initPromise=null,this.hdrFish=1,this.hdrSea=1,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=we,this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.onDynChange=this.onDynChange.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.dyn.addEventListener("change",this.onDynChange),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}onDynChange(){this.canvas&&(this.disable(),this.apply())}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e),this.canvas=e,this.ready=!1,this.initPromise=this.initBackend().then(t=>t?this.canvas?(this.ready=!0,this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle(),!0):(this.destroyGpu(),!1):(this.disable(),!1))}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null,this.destroyGpu(),this.ready=!1}async initBackend(){if(this.dyn.matches&&!!navigator.gpu){try{if(await this.buildGpu())return this.backend="webgpu",this.hdrFish=Xe,this.hdrSea=$e,!0}catch(t){console.warn("[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:",t)}this.destroyGpu(),this.freshCanvas()}return this.canvas?(this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.buildGl()):!1}freshCanvas(){if(!this.canvas)return;const e=this.canvas.cloneNode(!1);this.canvas.replaceWith(e),this.canvas=e}destroyGpu(){if(!this.gpu)return;const e=this.gpu;this.gpu=null;try{e.device.destroy()}catch{}}async buildGpu(){const e=await navigator.gpu.requestAdapter();if(!e)return!1;const t=await e.requestDevice(),n=this.canvas&&this.canvas.getContext("webgpu");if(!n)return t.destroy(),!1;n.configure({device:t,format:"rgba16float",colorSpace:"srgb",toneMapping:{mode:"extended"},alphaMode:"premultiplied"});const i=typeof n.getConfiguration=="function"?n.getConfiguration():null;if(!i||!i.toneMapping||i.toneMapping.mode!=="extended")return t.destroy(),!1;const o=t.createShaderModule({code:We}),r=await o.getCompilationInfo();if(r.messages.some(f=>f.type==="error")){for(const f of r.messages)console.warn("[idle-ocean] wgsl "+f.lineNum+":"+f.linePos+" "+f.message);return t.destroy(),!1}const d=t.createRenderPipeline({layout:"auto",vertex:{module:o,entryPoint:"vmain"},fragment:{module:o,entryPoint:"fmain",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}}),l=t.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=t.createBindGroup({layout:d.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:l}}]});return this.gpu={device:t,ctx:n,pipeline:d,ubuf:l,bind:a,u:new Float32Array(16)},t.lost.then(f=>{this.gpu&&this.canvas&&(console.warn("[idle-ocean] WebGPU device lost ("+f.reason+"), falling back to WebGL"),this.gpu=null,this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.freshCanvas(),this.buildGl()?this.resize():this.disable())}),!0}buildGl(){const e=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1});if(!e)return!1;this.gl=e;const t=(d,l)=>{const a=e.createShader(d);return e.shaderSource(a,l),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(a)),null)},n=t(e.VERTEX_SHADER,Ze),i=t(e.FRAGMENT_SHADER,Qe);if(!n||!i)return!1;const o=e.createProgram();if(e.attachShader(o,n),e.attachShader(o,i),e.bindAttribLocation(o,0,"p"),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(o)),!1;e.useProgram(o),this.prog=o;const r=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(o,"iResolution"),this.uTime=e.getUniformLocation(o,"iTime"),this.uReveal=e.getUniformLocation(o,"uReveal"),this.uOpaque=e.getUniformLocation(o,"uOpaqueMax"),this.uMode=e.getUniformLocation(o,"uMode"),this.uDir=e.getUniformLocation(o,"uDir"),this.uDrain=e.getUniformLocation(o,"uDrain"),this.uMouse=e.getUniformLocation(o,"uMouse"),this.uHdrFish=e.getUniformLocation(o,"uHdrFish"),this.uHdrSea=e.getUniformLocation(o,"uHdrSea"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let t=Math.round(window.innerWidth*e*ye),n=Math.round(window.innerHeight*e*ye);const i=Math.max(t,n);if(i>be){const o=be/i;t=Math.round(t*o),n=Math.round(n*o)}t=Math.max(1,t),n=Math.max(1,n),(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.gl&&this.gl.viewport(0,0,t,n))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},je))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const t=Math.random()*Math.PI*2;this.dir=[Math.cos(t),Math.sin(t)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e-this.lastTick<1e3/Ge))return;const t=(e-this.lastTick)/1e3;if(this.lastTick=e,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+t/Ve),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+t/Ye),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.renderFrame(e),this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){if(!this.ready||!this.canvas)return;const t=((e||performance.now())-this.startTime)/1e3;if(this.backend==="webgpu"&&this.gpu){this.renderGpu(t);return}const n=this.gl;n&&(n.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),n.uniform1f(this.uTime,t),n.uniform1f(this.uReveal,re(Z(this.reveal))),n.uniform1f(this.uOpaque,this.opaqueMax),n.uniform1f(this.uMode,this.mode),n.uniform2f(this.uDir,this.dir[0],this.dir[1]),n.uniform1f(this.uDrain,re(Z(this.drain))),n.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),n.uniform1f(this.uHdrFish,this.hdrFish),n.uniform1f(this.uHdrSea,this.hdrSea),n.drawArrays(n.TRIANGLES,0,3))}renderGpu(e){const{device:t,ctx:n,pipeline:i,ubuf:o,bind:r,u:d}=this.gpu;d[0]=this.canvas.width,d[1]=this.canvas.height,d[2]=1,d[3]=e,d[4]=re(Z(this.reveal)),d[5]=this.opaqueMax,d[6]=this.mode,d[7]=re(Z(this.drain)),d[8]=this.dir[0],d[9]=this.dir[1],d[10]=this.mouse[0],d[11]=this.mouse[1],d[12]=this.hdrFish,d[13]=this.hdrSea,t.queue.writeBuffer(o,0,d);const l=t.createCommandEncoder(),a=l.beginRenderPass({colorAttachments:[{view:n.getCurrentTexture().createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]});a.setPipeline(i),a.setBindGroup(0,r),a.draw(3),a.end(),t.queue.submit([l.finish()])}debugSet(e={}){this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=Z(e.reveal)),typeof e.drain=="number"&&(this.drain=Z(e.drain)),typeof e.hdrFish=="number"&&(this.hdrFish=e.hdrFish),typeof e.hdrSea=="number"&&(this.hdrSea=e.hdrSea),this.startTime||(this.startTime=performance.now());const t=()=>{this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now())};return this.ready?t():this.initPromise&&this.initPromise.then(n=>{n&&this.paused&&t()}),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode,backend:this.backend,hdrFish:this.hdrFish,hdrSea:this.hdrSea}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=we,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}function et(){const s=document.querySelector(".signal");if(!s)return;const e=(s.getAttribute("data-audiobase")||"").replace(/\/$/,""),t=new Audio;let n=null,i=[],o=0,r=null;const d=m=>`${e}/${m}.m4a`,l=m=>Array.from(s.querySelectorAll(`[data-id="${CSS.escape(m)}"]`)),a=(m,y)=>l(m).forEach(x=>x.classList.toggle("playing",y));function f(m){const y=m==="featured"?"#sec-featured .has-audio":`#sec-${m} .drow.has-audio`,x=[],O={};return s.querySelectorAll(y).forEach(Q=>{const B=Q.dataset.id;B&&!O[B]&&(O[B]=1,x.push(B))}),x}function w(){s.querySelectorAll(".secplay").forEach(m=>{const y=r&&m.dataset.scope===r;m.classList.toggle("playing",y);const x=m.querySelector(".t");x&&(x.textContent=y?"暂停":"连播")})}function u(m){n&&a(n,!1),n=m,a(m,!0),t.src=d(m);const y=t.play();y&&y.catch&&y.catch(()=>{})}function S(m){i=f(m),o=0,r=m,w(),i.length&&u(i[0])}function P(){r=null,i=[],w(),t.pause(),n&&(a(n,!1),n=null)}t.addEventListener("ended",()=>{if(r&&(o++,o<i.length)){u(i[o]);return}r=null,w(),n&&(a(n,!1),n=null)}),s.querySelectorAll(".pkey").forEach(m=>{m.addEventListener("click",y=>{y.preventDefault(),y.stopPropagation();const x=m.dataset.id;if(n===x&&!t.paused){t.pause(),a(x,!1),n=null,r=null,w();return}r=null,w(),u(x)})}),s.querySelectorAll(".secplay").forEach(m=>{m.addEventListener("click",()=>{const y=m.dataset.scope;if(r===y&&!t.paused){P();return}S(y)})}),s.querySelectorAll(".mcard").forEach(m=>{m.addEventListener("click",y=>{y.target.closest(".pkey")||y.target.closest("a")||m.classList.toggle("open")})}),s.querySelectorAll(".drow").forEach(m=>{const y=m.querySelector(".drow__head");y&&y.addEventListener("click",x=>{x.target.closest(".pkey")||x.target.closest("a")||m.classList.toggle("open")})});const R=[].slice.call(s.querySelectorAll(".dpill")),W=m=>{const y=m.getBoundingClientRect().top+window.pageYOffset-70;window.scrollTo({top:Math.max(0,y),behavior:"smooth"})};function _(m,y){s.setAttribute("data-view",m),R.forEach(x=>x.classList.toggle("active",x.dataset.sec===y))}if(R.forEach(m=>{m.addEventListener("click",y=>{y.preventDefault();const x=m.dataset.sec;if(x==="featured")_("featured","featured"),W(s);else{_("news",x);const O=s.querySelector("#sec-"+x);O&&W(O)}})}),(s.getAttribute("data-view")||"featured")==="featured")_("featured","featured");else{const m=s.querySelector(".dpaper .dsec");_("news",m?m.id.replace("sec-",""):null)}}class tt{constructor(){this.init()}init(){document.addEventListener("mouseover",e=>{e.target.tagName==="A"&&this.showTooltip(e.target)}),document.addEventListener("mouseout",e=>{e.target.tagName==="A"&&this.hideTooltip()})}showTooltip(e){const t=e.getAttribute("data-title");if(!t||t==="")return;const n=document.createElement("span");n.className="tooltip",n.textContent=t,e.parentNode.insertBefore(n,e.nextSibling);const i=n.offsetWidth,o=e.offsetWidth,r=e.offsetHeight+3+4;let d=i;i<o&&(d=o,n.style.width=d+"px");const l=-(d-o)/2;n.style.left=l+"px",n.style.bottom=r+"px",setTimeout(()=>{n.style.opacity="1"},10)}hideTooltip(){document.querySelectorAll(".tooltip").forEach(t=>{t.remove()})}}class nt{constructor(){this.mapElement=document.getElementById("map"),this.init()}init(){this.mapElement&&(this.adjustMapLayout(),window.addEventListener("resize",()=>{this.adjustMapLayout()}))}adjustMapLayout(){const e=document.querySelector("header"),t=window.innerHeight,n=window.innerWidth;if(!e)return;const i=e.offsetWidth+50,o=this.mapElement.offsetWidth;this.mapElement.style.maxWidth=o+"px",this.mapElement.style.height=t+"px",n>1100?this.mapElement.style.marginLeft=i+"px":this.mapElement.style.marginLeft="0"}}class it{constructor(){this.overlay=null,this.zoomImg=null,this.hint=null,this.scale=1,this.minScale=.2,this.maxScale=6,this.lastPos={x:0,y:0},this.origin={x:0,y:0},this.dragging=!1,this.wheelTimeout=null,this.init()}init(){this.bindImages(),new MutationObserver(t=>{for(let n=0;n<t.length;n++)if(t[n].addedNodes.length){this.bindImages();break}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}buildOverlay(){this.overlay=document.createElement("div"),this.overlay.id="image-zoom-overlay",this.overlay.className="fade-in",this.overlay.innerHTML=`
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `,document.body.appendChild(this.overlay),this.zoomImg=this.overlay.querySelector(".image-zoom-img"),this.hint=this.overlay.querySelector(".image-zoom-hint"),this.bindOverlayEvents()}openOverlay(e){this.overlay||this.buildOverlay(),this.overlay.style.display="flex",this.zoomImg.src=e,this.scale=1,this.lastPos.x=0,this.lastPos.y=0,this.applyTransform(),this.hint&&(this.hint.style.opacity="1",this.hint.style.transition="opacity .5s",clearTimeout(this.hint._hideTimer),this.hint._hideTimer=setTimeout(()=>{this.hint.style.opacity="0"},3e3))}closeOverlay(){this.overlay&&(this.overlay.style.display="none",this.zoomImg.src="")}applyTransform(){this.zoomImg.style.transform=`translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`}onWheel(e){e.preventDefault();const t=this.zoomImg.getBoundingClientRect(),n=e.clientX-t.left-t.width/2,i=e.clientY-t.top-t.height/2,o=e.deltaY>0?-.12:.12,r=Math.max(this.minScale,Math.min(this.maxScale,this.scale+o)),d=r/this.scale;this.lastPos.x=(this.lastPos.x+n)*d-n,this.lastPos.y=(this.lastPos.y+i)*d-i,this.scale=r,this.applyTransform(),this.hint&&(this.hint.style.opacity="0.3",clearTimeout(this.wheelTimeout),this.wheelTimeout=setTimeout(()=>{this.hint.style.opacity="1"},400))}onMouseDown(e){e.button===0&&(this.dragging=!0,this.origin.x=e.clientX,this.origin.y=e.clientY,this.overlay.style.cursor="grabbing")}onMouseMove(e){if(!this.dragging)return;const t=e.clientX-this.origin.x,n=e.clientY-this.origin.y;this.origin.x=e.clientX,this.origin.y=e.clientY,this.lastPos.x+=t,this.lastPos.y+=n,this.applyTransform()}onMouseUp(){this.dragging=!1,this.overlay&&(this.overlay.style.cursor="default")}onDblClick(){this.closeOverlay()}onKey(e){e.key==="Escape"&&this.overlay&&this.overlay.style.display==="flex"&&this.closeOverlay()}bindOverlayEvents(){this.zoomImg.addEventListener("wheel",e=>this.onWheel(e),{passive:!1}),this.zoomImg.addEventListener("mousedown",e=>this.onMouseDown(e)),this.zoomImg.addEventListener("dblclick",()=>this.onDblClick()),window.addEventListener("mousemove",e=>this.onMouseMove(e)),window.addEventListener("mouseup",()=>this.onMouseUp()),window.addEventListener("keydown",e=>this.onKey(e)),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.closeOverlay()})}bindImages(){const e="article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img";document.querySelectorAll(e).forEach(n=>{n.classList.contains("image-zoomable")||(n.classList.add("image-zoomable"),n.style.cursor="zoom-in",n.addEventListener("click",()=>{this.openOverlay(n.getAttribute("data-origin")||n.src)}))})}}class st{constructor(){this.initializeEmbeds()}initializeEmbeds(){this.processTextNodes(document.body),this.processCodeBlocks(),this.processMarkdownSyntax()}processTextNodes(e){["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(e.tagName)||(e.nodeType===Node.TEXT_NODE?this.processTextNode(e):Array.from(e.childNodes).forEach(t=>{this.processTextNodes(t)}))}processTextNode(e){const t=e.textContent,n=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let i;const o=[];for(;(i=n.exec(t))!==null;)o.push({fullMatch:i[0],shaderID:i[1],index:i.index});o.length>0&&this.replaceWithIframes(e,o)}processCodeBlocks(){document.querySelectorAll("code, pre").forEach(t=>{const n=t.textContent,i=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let o;for(;(o=i.exec(n))!==null;){const r=n.trim();if(r===o[0]||r===o[0].replace(/\?.*$/,"")){this.replaceElementWithIframe(t,o[1]);break}}})}replaceWithIframes(e,t){const n=e.parentNode;if(!n)return;const i=e.textContent,o=[];let r=0;t.sort((l,a)=>a.index-l.index),t.reverse().forEach(l=>{l.index>r&&o.unshift({type:"text",content:i.substring(r,l.index)}),o.unshift({type:"iframe",shaderID:l.shaderID,originalURL:l.fullMatch}),r=l.index+l.fullMatch.length}),r<i.length&&o.unshift({type:"text",content:i.substring(r)});const d=[];o.forEach(l=>{if(l.type==="text"&&l.content.trim())d.push(document.createTextNode(l.content));else if(l.type==="iframe"){const a=this.createShaderToyEmbed(l.shaderID,l.originalURL);d.push(a)}}),d.forEach(l=>{n.insertBefore(l,e)}),n.removeChild(e)}replaceElementWithIframe(e,t){const n=this.createShaderToyEmbed(t);e.parentNode.replaceChild(n,e)}createShaderToyEmbed(e,t=null){const n=document.createElement("div");n.className="shadertoy-embed-container",n.style.cssText=`
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
        `;const r=document.createElement("span");r.innerHTML="🎨",r.style.cssText=`
            font-size: 20px;
            filter: drop-shadow(0 0 5px rgba(255,215,0,0.5));
        `;const d=document.createElement("span");d.textContent=`ShaderToy: ${e}`,d.style.cssText=`
            color: #ffd700;
            font-weight: bold;
            font-size: 16px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        `,o.appendChild(r),o.appendChild(d);const l=document.createElement("div");l.style.cssText=`
            display: flex;
            gap: 8px;
        `;const a=document.createElement("a");a.href=t||`https://www.shadertoy.com/view/${e}`,a.target="_blank",a.innerHTML="🔗 Open in ShaderToy",a.style.cssText=`
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
        `,a.addEventListener("mouseenter",()=>{a.style.background="#66b3ff",a.style.color="#000",a.style.transform="translateY(-1px)"}),a.addEventListener("mouseleave",()=>{a.style.background="rgba(102,179,255,0.1)",a.style.color="#66b3ff",a.style.transform="translateY(0)"}),l.appendChild(a),i.appendChild(o),i.appendChild(l);const f=document.createElement("div");f.style.cssText=`
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 50%; /* 2:1 aspect ratio */
            border-radius: 8px;
            overflow: hidden;
            background: #000;
        `;const w=document.createElement("iframe");w.src=`https://www.shadertoy.com/embed/${e}?gui=true&t=10&paused=false&muted=false`,w.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `,w.allowFullscreen=!0,w.loading="lazy";const u=document.createElement("div");u.innerHTML=`
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
        `;const S=document.createElement("style");return S.textContent=`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `,document.head.appendChild(S),w.addEventListener("load",()=>{u.style.display="none"}),f.appendChild(w),f.appendChild(u),n.appendChild(i),n.appendChild(f),n}processMarkdownSyntax(){const e=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(i){var r;const o=(r=i.parentElement)==null?void 0:r.tagName;return["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(o)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[];let n;for(;n=e.nextNode();)t.push(n);t.forEach(i=>{const o=i.textContent,r=/\[(shader|shadertoy):(\w+)\]/g;let d;const l=[];for(;(d=r.exec(o))!==null;)l.push({fullMatch:d[0],shaderID:d[2],index:d.index});l.length>0&&this.replaceMarkdownSyntax(i,l)})}replaceMarkdownSyntax(e,t){const n=e.parentNode;if(!n)return;const i=e.textContent,o=[];let r=0;t.sort((l,a)=>a.index-l.index),t.reverse().forEach(l=>{l.index>r&&o.unshift({type:"text",content:i.substring(r,l.index)}),o.unshift({type:"iframe",shaderID:l.shaderID,originalURL:null}),r=l.index+l.fullMatch.length}),r<i.length&&o.unshift({type:"text",content:i.substring(r)});const d=[];o.forEach(l=>{if(l.type==="text"&&l.content.trim())d.push(document.createTextNode(l.content));else if(l.type==="iframe"){const a=this.createShaderToyEmbed(l.shaderID,l.originalURL);d.push(a)}}),d.forEach(l=>{n.insertBefore(l,e)}),n.removeChild(e)}}class ot{constructor(){this.init()}init(){const e=document.querySelector(".content");if(!e)return;e.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(n=>{const i=document.createElement("span");i.className="collapse-button",n.insertBefore(i,n.firstChild),i.addEventListener("click",o=>{o.stopPropagation(),this.toggleCollapse(n)})})}toggleCollapse(e){const t=parseInt(e.tagName[1]);let n=e.nextElementSibling;e.classList.toggle("collapsed");const i=e.classList.contains("collapsed");for(;n&&!(n.tagName&&n.tagName.match(/^H[1-6]$/)&&parseInt(n.tagName[1])<=t);)n.style.display=i?"none":"",n=n.nextElementSibling}}class at{constructor(){this.init()}init(){this.initCodeBlockExpansion(),new MutationObserver(t=>{let n=!1;t.forEach(i=>{i.addedNodes.length>0&&i.addedNodes.forEach(o=>{o.nodeType===1&&(o.matches("figure.highlight")||o.querySelector("figure.highlight"))&&(n=!0)})}),n&&setTimeout(()=>this.initCodeBlockExpansion(),100)}).observe(document.body,{childList:!0,subtree:!0})}initCodeBlockExpansion(){document.querySelectorAll("figure.highlight").forEach(t=>{if(t.closest(".code-block-container"))return;const n=t.querySelector("table");if(n){const a=n.querySelector("td.code");if(a){const f=document.createElement("pre");f.className="code",f.innerHTML=a.innerHTML,t.innerHTML="",t.appendChild(f)}}const i=t.querySelector("pre.code");if(!i)return;const o=i.scrollHeight,r=400,d=document.createElement("div");d.className="code-buttons";const l=document.createElement("button");if(l.className="copy-code-button",l.textContent="复制代码",l.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),this.copyCodeToClipboard(i,l)}),d.appendChild(l),o>r){const a=document.createElement("div");a.className="code-block-container collapsed",t.parentNode.insertBefore(a,t),a.appendChild(t);const f=document.createElement("button");f.className="expand-button",f.textContent="展开代码",d.appendChild(f),a.appendChild(d),f.addEventListener("click",()=>{a.classList.contains("collapsed")&&this.showFullscreenCode(t)})}else{const a=document.createElement("div");a.className="code-block-container",t.parentNode.insertBefore(a,t),a.appendChild(t),a.appendChild(d)}})}showFullscreenCode(e){const t=document.createElement("div");t.className="code-fullscreen-modal active";const n=document.createElement("div");n.className="code-fullscreen-content";const o=(e.closest(".code-block-container")||e).cloneNode(!0);o.querySelectorAll(".code-buttons, .copy-code-button, .expand-button").forEach(u=>{u.parentNode&&u.parentNode.removeChild(u)});const d=o.classList.contains("code-block-container")?o:o.querySelector(".code-block-container");d&&(d.classList.remove("collapsed"),d.style.margin="0");const l=(d||o).querySelector("pre.code");l&&(l.scrollTop=0),n.appendChild(o);const a=document.createElement("button");a.className="close-fullscreen",a.textContent="关闭",n.appendChild(a),t.appendChild(n),document.body.appendChild(t),document.body.style.overflow="hidden";const f=()=>{document.body.removeChild(t),document.body.style.overflow=""};a.addEventListener("click",f),t.addEventListener("click",u=>{u.target===t&&f()});const w=u=>{u.key==="Escape"&&(f(),document.removeEventListener("keydown",w))};document.addEventListener("keydown",w)}copyCodeToClipboard(e,t){const n=e.textContent||e.innerText;navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(n).then(()=>{this.showCopySuccess(t)}).catch(i=>{console.error("复制失败:",i),this.fallbackCopy(n,t)}):this.fallbackCopy(n,t)}fallbackCopy(e,t){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="2em",n.style.height="2em",n.style.padding="0",n.style.border="none",n.style.outline="none",n.style.boxShadow="none",n.style.background="transparent",document.body.appendChild(n),n.focus(),n.select();try{document.execCommand("copy")&&this.showCopySuccess(t)}catch(i){console.error("复制失败:",i)}document.body.removeChild(n)}showCopySuccess(e){const t=e.textContent;e.classList.add("copied"),e.textContent="已复制 ✓",setTimeout(()=>{e.classList.remove("copied"),e.textContent=t},2e3)}}const xe=1.2,Ee=1.15,rt=.2,lt=50,ct="canvas-arrow-modal-";let Se=0;class dt{constructor(){const e=document.querySelectorAll(".canvas-embed:not(.canvas-embed--error)");if(e.length)for(const t of e)this.attach(t)}attach(e){e.setAttribute("role","button"),e.setAttribute("tabindex","0"),e.setAttribute("aria-label","点击放大查看画布"),e.addEventListener("click",t=>{t.target.closest("a")||(t.preventDefault(),this.openModal(e))}),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.openModal(e))})}openModal(e){const t=e.querySelector(".canvas-svg");if(!t)return;const n=t.cloneNode(!0);ht(n),n.classList.add("canvas-modal__svg");const i=document.createElement("div");i.className="canvas-modal",i.innerHTML=`
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
    `,i.querySelector(".canvas-modal__viewport").appendChild(n),document.body.appendChild(i),document.body.classList.add("canvas-modal-open");const o=new ft(n),r=l=>{l.key==="Escape"&&d()},d=()=>{o.destroy(),i.remove(),document.body.classList.remove("canvas-modal-open"),document.removeEventListener("keydown",r)};i.querySelector(".canvas-modal__close").addEventListener("click",d),i.querySelector(".canvas-modal__overlay").addEventListener("click",d),document.addEventListener("keydown",r),i.querySelectorAll(".canvas-modal__btn").forEach(l=>{l.addEventListener("click",()=>{const a=l.dataset.action;a==="zoom-in"?o.zoomBy(xe):a==="zoom-out"?o.zoomBy(1/xe):a==="reset"&&o.reset()})})}}function ht(s){const e=s.querySelector("#canvas-arrow");if(!e)return;Se+=1;const t=`${ct}${Se}`;e.id=t,s.querySelectorAll("[marker-end]").forEach(n=>{n.setAttribute("marker-end",`url(#${t})`)})}class ft{constructor(e){this.svg=e;const t=e.viewBox.baseVal;this.original={x:t.x,y:t.y,w:t.width,h:t.height},this.state={...this.original},this.pointers=new Map,this.pinch=null,this.svg.style.cursor="grab",this.svg.style.touchAction="none",this.onWheel=this.onWheel.bind(this),this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.svg.addEventListener("wheel",this.onWheel,{passive:!1}),this.svg.addEventListener("pointerdown",this.onPointerDown),this.svg.addEventListener("pointermove",this.onPointerMove),this.svg.addEventListener("pointerup",this.onPointerUp),this.svg.addEventListener("pointercancel",this.onPointerUp)}setViewBox(){const{x:e,y:t,w:n,h:i}=this.state;this.svg.setAttribute("viewBox",`${e} ${t} ${n} ${i}`)}currentScale(){return this.original.w/this.state.w}zoomBy(e,t,n){const i=this.currentScale()*e;i<rt||i>lt||(t==null&&(t=this.state.x+this.state.w/2),n==null&&(n=this.state.y+this.state.h/2),this.state.x=t-(t-this.state.x)/e,this.state.y=n-(n-this.state.y)/e,this.state.w/=e,this.state.h/=e,this.setViewBox())}pan(e,t){this.state.x-=e,this.state.y-=t,this.setViewBox()}reset(){this.state={...this.original},this.setViewBox()}screenToSvg(e,t){const n=this.svg.createSVGPoint();n.x=e,n.y=t;const i=this.svg.getScreenCTM();return i?n.matrixTransform(i.inverse()):{x:0,y:0}}onWheel(e){e.preventDefault();const t=e.deltaY<0?Ee:1/Ee,{x:n,y:i}=this.screenToSvg(e.clientX,e.clientY);this.zoomBy(t,n,i)}onPointerDown(e){e.target.closest("a")||(this.svg.setPointerCapture(e.pointerId),this.pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,svg:this.screenToSvg(e.clientX,e.clientY)}),this.pointers.size===2?this.pinch=this.computePinch():this.pointers.size===1&&(this.svg.style.cursor="grabbing"))}onPointerMove(e){const t=this.pointers.get(e.pointerId);if(t){if(t.clientX=e.clientX,t.clientY=e.clientY,this.pointers.size===2&&this.pinch){const n=this.computePinch(),i=n.dist/this.pinch.dist;if(i>0&&Number.isFinite(i)){const o=this.screenToSvg(n.cx,n.cy);this.zoomBy(i,o.x,o.y)}this.pinch=n}else if(this.pointers.size===1){const n=this.screenToSvg(e.clientX,e.clientY);this.pan(n.x-t.svg.x,n.y-t.svg.y)}}}onPointerUp(e){this.pointers.delete(e.pointerId),this.pointers.size<2&&(this.pinch=null),this.pointers.size===0&&(this.svg.style.cursor="grab")}computePinch(){const[e,t]=[...this.pointers.values()],n=t.clientX-e.clientX,i=t.clientY-e.clientY;return{dist:Math.hypot(n,i),cx:(e.clientX+t.clientX)/2,cy:(e.clientY+t.clientY)/2}}destroy(){this.svg.removeEventListener("wheel",this.onWheel),this.svg.removeEventListener("pointerdown",this.onPointerDown),this.svg.removeEventListener("pointermove",this.onPointerMove),this.svg.removeEventListener("pointerup",this.onPointerUp),this.svg.removeEventListener("pointercancel",this.onPointerUp)}}const de={en:{Home:"Home",Daily:"Daily",Archives:"Archives",About:"About",Portfolio:"Portfolio",Bilibili:"Bilibili",GitHub:"GitHub",Instagram:"Instagram",Douban:"Douban",Email:"Email",RSS:"RSS",Language:"Language",Copyright:"Copyright","Powered by":"Powered by","Modified based on":"Modified based on",theme:"theme","Mainly maintained using AI":"Mainly maintained using AI","Older Posts":"Older Posts","Newer Posts":"Newer Posts",Comments:"Comments","Switch to Chinese":"Switch to Chinese","Switch to English":"Switch to English","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"Switched to English",articleLanguageSwitched:"Switched to English version","tag-graph-hint":"Click tag to explore · Scroll to zoom · Drag to rearrange"},"zh-CN":{Home:"首页",Daily:"资讯",Archives:"归档",About:"关于",Portfolio:"作品集",Bilibili:"哔哩哔哩",GitHub:"GitHub",Instagram:"Instagram",Douban:"豆瓣",Email:"邮箱",RSS:"RSS",Language:"语言",Copyright:"版权所有","Powered by":"技术支持","Modified based on":"基于",theme:"主题","Mainly maintained using AI":"主要使用AI来维护","Older Posts":"上一页","Newer Posts":"下一页",Comments:"留言","Switch to Chinese":"切换至中文","Switch to English":"切换至英文","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"已切换至中文",articleLanguageSwitched:"已切换至中文版本","tag-graph-hint":"点击标签探索 · 滚轮缩放 · 拖拽移动"}},ut=()=>(navigator.language||navigator.userLanguage).startsWith("zh")?"zh-CN":"en",Me=()=>localStorage.getItem("siteLanguage")||ut(),pt=()=>{const s=document.cookie.match(/(?:^|;\s*)lang_pref=([^;]+)/);return s?s[1]:null},mt=s=>{document.cookie="lang_pref="+s+"; path=/; max-age=31536000; samesite=lax"},Ae=()=>{const s=document.querySelector('meta[name="article:lang"]');return s?s.content:window.location.pathname.includes(".zh-CN")?"zh-CN":"en"},Te=s=>{const e=document.querySelector(`link[rel="alternate"][hreflang="${s}"]`);if(!e)return null;const t=new URL(e.href,window.location.origin);return window.location.origin+t.pathname+t.search+t.hash},Ie=s=>{document.querySelectorAll(".lang-switch__opt").forEach(e=>{e.setAttribute("aria-pressed",e.getAttribute("data-lang")===s?"true":"false")})},he=s=>{const e=de[s];if(!e){console.warn("Language data not available for:",s);return}document.documentElement.lang=s,document.querySelectorAll("nav ul li a").forEach(l=>{const a=l.getAttribute("data-i18n-key");a&&e[a]&&(l.textContent=e[a])}),document.querySelectorAll("[data-i18n]").forEach(l=>{const a=l.getAttribute("data-i18n");e[a]&&(l.textContent=e[a])}),document.querySelectorAll("[data-title]").forEach(l=>{const a=l.getAttribute("data-title");e[a]&&l.setAttribute("data-title",e[a])});const o=document.querySelector(".pagination .extend.prev"),r=document.querySelector(".pagination .extend.next");o&&(o.textContent=e["Older Posts"]||o.textContent),r&&(r.textContent=e["Newer Posts"]||r.textContent),localStorage.setItem("siteLanguage",s),document.querySelectorAll("[data-i18n-tag]").forEach(l=>{const a=l.getAttribute("data-i18n-tag");if(s==="zh-CN"){const f=window.tagTranslations&&window.tagTranslations[a];f&&(l.textContent=f)}else l.textContent=a}),Ie(s)},vt=s=>{const e=document.querySelector(".lang-notification");e&&e.remove();const t=document.createElement("div");t.className="lang-notification",t.textContent=s,document.body.appendChild(t),setTimeout(()=>{t.classList.add("show")},10),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},2e3)},Re=s=>{if(mt(s),s===Ae()){localStorage.setItem("siteLanguage",s),he(s);return}const e=Te(s);if(e){localStorage.setItem("siteLanguage",s),window.location.href=e;return}he(s);const t=de[s]?de[s].languageSwitched:"Language switched";vt(t)},gt=()=>{const s=Me()==="zh-CN"?"en":"zh-CN";Re(s)},yt=()=>{document.querySelectorAll(".lang-switch__opt").forEach(s=>{s.addEventListener("click",e=>{e.preventDefault(),Re(s.getAttribute("data-lang"))})}),Ie(Me())},Le=()=>{const s=Ae(),e=pt();if(he(e||s),e&&e!==s){const t=Te(e),n=t&&new URL(t,window.location.origin).pathname;n&&n!==window.location.pathname&&window.location.replace(t)}};function bt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Le):Le(),window.addEventListener("load",()=>{const s=document.getElementById("langSwitch");s&&s.addEventListener("click",e=>{e.preventDefault(),gt()}),yt()})}function wt(){const s=document.getElementById("tag-graph"),e=document.getElementById("tag-graph-container"),t=window.__TAG_GRAPH_DATA__;if(!s||!t||!t.nodes||t.nodes.length===0)return;const n=document.createElement("div");n.className="graph-loading",n.textContent="Loading",s.parentNode.appendChild(n);const i=t.archiveFilterTags||[],o={};i.forEach(function(c){o[c]=!0});function r(c){return String(c||"").replace(/-/g," ").replace(/\s+/g," ").trim().toLowerCase()}const d={};t.links.forEach(function(c){d[c.source]=(d[c.source]||0)+1,d[c.target]=(d[c.target]||0)+1});let l=1;t.nodes.forEach(function(c){const h=c.value||0;h>l&&(l=h)}),t.nodes.forEach(function(c){const h=c.value||0;c.symbolSize=Math.max(12,Math.min(70,12+h*(58/l)))});const a={};t.nodes.forEach(function(c){a[c.name]=[]});function f(c,h){!a[c]||!a[h]||c===h||(a[c].indexOf(h)===-1&&a[c].push(h),a[h].indexOf(c)===-1&&a[h].push(c))}t.links.forEach(function(c){f(c.source,c.target)});const w={};t.nodes.forEach(function(c){const h=r(c.name);w[h]||(w[h]=[]),w[h].push(c.name)}),Object.keys(w).forEach(function(c){const h=w[c];if(!(h.length<2))for(let g=0;g<h.length;g++)for(let L=g+1;L<h.length;L++)f(h[g],h[L])});const u={},S=[];i.forEach(function(c){a[c]!==void 0&&(u[c]=0,S.push(c))});let P=0;for(;P<S.length;){const c=S[P++];(a[c]||[]).forEach(function(h){u[h]===void 0&&(u[h]=u[c]+1,S.push(h))})}Object.keys(u).forEach(function(c){});const R=[{h:260,s:62,l:50},{h:15,s:80,l:55},{h:160,s:60,l:42},{h:220,s:72,l:52},{h:340,s:70,l:52},{h:45,s:85,l:50},{h:190,s:70,l:45},{h:90,s:55,l:45},{h:290,s:60,l:50},{h:30,s:75,l:48},{h:130,s:50,l:42},{h:0,s:70,l:55}];function W(c,h,g){return"hsl("+Math.round(c)+", "+Math.round(h)+"%, "+Math.round(g)+"%)"}const _={},m={},y=t.nodes.filter(function(c){return o[c.name]});y.sort(function(c,h){return h.value-c.value}),y.forEach(function(c,h){const g=R[h%R.length];m[c.name]=g,_[c.name]=W(g.h,g.s,g.l)});const x={};i.forEach(function(c){if(a[c]===void 0)return;const h={};h[c]=0;const g=[c];let L=0;for(;L<g.length;){const N=g[L++];(a[N]||[]).forEach(function(A){h[A]===void 0&&(h[A]=h[N]+1,g.push(A))})}x[c]=h});const O=t.nodes.filter(function(c){return!o[c.name]});let Q=1;O.forEach(function(c){let h=1/0;i.forEach(function(g){if(!x[g])return;const L=x[g][c.name];L!==void 0&&L<h&&(h=L)}),h<1/0&&h>Q&&(Q=h)}),O.forEach(function(c){const h=[];let g=0;if(i.forEach(function(p){if(!x[p]||!m[p])return;let b=x[p][c.name];if(b===void 0)return;b===0&&(b=.5);const k=1/(b*b);h.push({ft:p,w:k}),g+=k}),g===0){_[c.name]="hsl(0, 0%, 82%)";return}let L=0,N=0,A=0,E=0;h.forEach(function(p){const b=p.w/g,k=m[p.ft],q=k.h*Math.PI/180;L+=Math.sin(q)*b,N+=Math.cos(q)*b,A+=k.s*b,E+=k.l*b});let T=Math.atan2(L,N)*180/Math.PI;T<0&&(T+=360);let F=A,H=E,v=1/0;h.forEach(function(p){const b=x[p.ft][c.name];b<v&&(v=b)});let C=(v-1)/Math.max(Q-1,1);C=Math.max(0,Math.min(1,C));const z=Math.pow(C,.85),I=32,M=1-z*.35;F=Math.max(I,F*M),H=H+z*(82-H)*.78,_[c.name]=W(T,F,H)});const B=t.tagTranslations||{},ne={};Object.keys(B).forEach(function(c){ne[c]=B[c];const h=c.replace(/-/g," ");h!==c&&(ne[h]=B[c])});function ie(c){return(typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en")==="zh-CN"&&ne[c]?ne[c]:c}const pe=e.getBoundingClientRect(),j=pe.width||500,G=pe.height||400,me=Math.min(j,G)*.28;y.forEach(function(c,h){const g=2*Math.PI*h/Math.max(y.length,1)-Math.PI/2;c.x=j/2+me*Math.cos(g),c.y=G/2+me*Math.sin(g)});const ve=Math.min(j,G)*.45;O.forEach(function(c,h){const g=2*Math.PI*h/Math.max(O.length,1);c.x=j/2+ve*Math.cos(g),c.y=G/2+ve*Math.sin(g)});const De=60,D=t.nodes;for(let c=0;c<15;c++)for(let h=0;h<D.length;h++)for(let g=h+1;g<D.length;g++){const L=D[g].x-D[h].x,N=D[g].y-D[h].y,A=Math.sqrt(L*L+N*N),E=De+(D[h].symbolSize+D[g].symbolSize)/2;if(A<E){const T=(E-A)/2,F=A>.1?L/A:Math.random()-.5,H=A>.1?N/A:Math.random()-.5;D[h].x-=F*T,D[h].y-=H*T,D[g].x+=F*T,D[g].y+=H*T}}let J=1,ee=[j/2,G/2];if(y.length>0){let c=1/0,h=-1/0,g=1/0,L=-1/0;y.forEach(function(E){const T=(E.symbolSize||20)/2+50;E.x-T<c&&(c=E.x-T),E.x+T>h&&(h=E.x+T),E.y-T<g&&(g=E.y-T),E.y+T>L&&(L=E.y+T)});const N=h-c,A=L-g;if(N>0&&A>0){const E=j/N,T=G/A;J=Math.min(E,T,1.5)*.8,J<.3&&(J=.3),ee=[(c+h)/2,(g+L)/2]}}t.nodes.forEach(function(c){c.itemStyle={color:_[c.name],borderColor:"#fff",borderWidth:1.5,shadowBlur:5,shadowColor:"rgba(0, 0, 0, 0.06)"},c.label={show:!0,formatter:function(){return ie(c.name)},fontSize:Math.max(10,Math.min(15,9+(d[c.name]||0)*.5)),color:"#555",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}});const V=e.querySelector(".tag-graph-hint");let ge=null,le=!1;function qe(){le||(le=!0,V.classList.add("visible"),clearTimeout(ge),ge=setTimeout(function(){V.classList.remove("visible"),le=!1},3e3))}e.addEventListener("mouseenter",qe);const Y=document.createElement("script");Y.src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",Y.integrity="sha384-Mx5lkUEQPM1pOJCwFtUICyX45KNojXbkWdYhkKUKsbv391mavbfoAmONbzkgYPzR",Y.crossOrigin="anonymous",Y.onload=function(){Oe()},Y.onerror=function(){n.textContent="Failed to load chart library",n.style.color="#c44"},document.head.appendChild(Y);function _e(c){return c<10?750:c<20?1200:c<40?1650:2100}function Oe(){n.parentNode&&n.parentNode.removeChild(n);const c=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window,h=echarts.init(s),g={backgroundColor:"transparent",tooltip:{show:!0,enterable:!0,confine:!0,backgroundColor:"rgba(255, 255, 255, 0.97)",borderColor:"#e8e8e8",borderWidth:1,padding:[10,14],textStyle:{color:"#4b4848",fontFamily:'"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:13},extraCssText:"border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); max-height: 260px; overflow-y: auto;",formatter:function(v){function C(I){return String(I??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function z(I,M){const p=C(I),b=C(M),k='style="display:block;color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;text-decoration:none;"';return b?'<a href="'+b+'" '+k+">• "+p+"</a>":"<div "+k+">• "+p+"</div>"}if(v.dataType==="node"){const I=ie(v.name);let M='<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:'+(_[v.name]||"#795da3")+'">'+C(I)+"</div>";M+='<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 '+v.value+" article"+(v.value>1?"s":"")+"</div>";const p=t.postTitles&&t.postTitles[v.name];return p&&p.length>0&&(M+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">',p.forEach(function(b){typeof b=="string"?M+=z(b,""):M+=z(b.title,b.path)}),M+="</div>"),M}if(v.dataType==="edge"){const I=v.data.source,M=v.data.target;let p='<span style="font-weight:600">'+C(ie(I))+'</span> <span style="color:#bbb">↔</span> <span style="font-weight:600">'+C(ie(M))+"</span>";p+='<br/><span style="color:#999;font-size:12px">📄 '+v.data.value+" article"+(v.data.value>1?"s":"")+"</span>";const b=[I,M].sort().join("	"),k=t.linkPosts&&t.linkPosts[b];return k&&k.length>0&&(p+='<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;margin-top:5px;">',k.forEach(function(q){p+=z(q.title,q.path)}),p+="</div>"),p}}},animationDuration:1500,animationEasingUpdate:"quinticInOut",series:[{type:"graph",layout:"force",data:t.nodes,links:t.links,roam:!1,draggable:!c,force:{repulsion:_e(t.nodes.length),edgeLength:[150,450],gravity:.12,friction:.6,layoutAnimation:!0},emphasis:{focus:"adjacency",blurScope:"global",itemStyle:{shadowBlur:20,shadowColor:"rgba(121, 93, 163, 0.45)",borderWidth:2,borderColor:"#fff"},lineStyle:{width:3,opacity:.85},label:{show:!0,fontSize:14,fontWeight:"bold",color:"#333"}},label:{position:"right",distance:6},lineStyle:{color:"#d0d0d0",width:1.5,curveness:0,opacity:.35},scaleLimit:{min:.3,max:4},zoom:J,center:ee}]};h.setOption(g);let L=!1,N=!1;if(y.length>0){const v=function(){if(N)return;if(L){N=!0,h.off("finished",v);return}const C=h.getModel(),z=C&&C.getSeriesByIndex&&C.getSeriesByIndex(0),I=z&&z.getGraph&&z.getGraph();let M=1/0,p=-1/0,b=1/0,k=-1/0,q=0;if(y.forEach(function(oe){const ce=I&&I.getNodeByName&&I.getNodeByName(oe.name),ae=ce&&ce.getLayout&&ce.getLayout();let $,K;ae&&ae.length>=2?($=ae[0],K=ae[1]):($=oe.x||0,K=oe.y||0);const U=(oe.symbolSize||20)/2+50;$-U<M&&(M=$-U),$+U>p&&(p=$+U),K-U<b&&(b=K-U),K+U>k&&(k=K+U),q++}),q===0)return;const te=p-M,se=k-b;if(te<=0||se<=0)return;let X=Math.min(j/te,G/se,1.5)*.8;X<.3&&(X=.3),N=!0,A=X,E=[(M+p)/2,(b+k)/2],h.setOption({series:[{zoom:X,center:E.slice()}]}),h.off("finished",v)};h.on("finished",v)}h.on("click",function(v){v.dataType==="node"&&t.tagPaths&&t.tagPaths[v.name]&&(window.location.href=t.tagPaths[v.name])}),h.on("mouseover",function(v){(v.dataType==="node"||v.dataType==="edge")&&(s.style.cursor="pointer")}),h.on("mouseout",function(){s.style.cursor="default"});let A=J||1,E=ee?[ee[0],ee[1]]:[0,0];if(!c){const v=e||s;v.addEventListener("wheel",function(p){p.preventDefault()},{passive:!1}),v.addEventListener("touchmove",function(p){p.touches.length>=2&&p.preventDefault()},{passive:!1});const C=h.getZr();C.on("mousewheel",function(p){p.event.preventDefault(),p.event.stopPropagation(),L=!0;const b=p.wheelDelta>0?1.08:1/1.08;let k=A*b;k<.3&&(k=.3),k>4&&(k=4),A=k,h.setOption({series:[{zoom:A}]})});let z=!1,I=[0,0],M=[0,0];C.on("mousedown",function(p){p.target||(z=!0,L=!0,I=[p.event.clientX,p.event.clientY],M=[E[0],E[1]],s.style.cursor="grabbing")}),C.on("mousemove",function(p){if(z){const b=p.event.clientX-I[0],k=p.event.clientY-I[1],q=s.clientWidth,te=s.clientHeight,se=q/A,X=te/A;E[0]=M[0]-b*(se/q),E[1]=M[1]-k*(X/te),h.setOption({series:[{center:[E[0],E[1]]}]})}}),C.on("mouseup",function(){z&&(z=!1,s.style.cursor="default")}),C.on("globalout",function(){z&&(z=!1,s.style.cursor="default")})}if(c){const v=document.createElement("button");v.type="button",v.className="tag-graph-fs-btn",v.setAttribute("aria-label","Fullscreen"),v.innerHTML='<svg class="tag-graph-fs-ic tag-graph-fs-ic--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg><svg class="tag-graph-fs-ic tag-graph-fs-ic--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',e.appendChild(v);let C=!1;const z=function(){if(!V)return;const p=typeof localStorage<"u"&&localStorage.getItem("siteLanguage")||"en";V.textContent=p==="zh-CN"?"双指缩放 · 拖动平移 · 点按进入标签":"Pinch to zoom · Drag to pan · Tap a tag",V.classList.add("visible"),setTimeout(function(){V.classList.remove("visible")},2600)},I=function(){C=!0,e.classList.add("tag-graph-fullscreen"),v.classList.add("is-fullscreen"),v.setAttribute("aria-label","Exit fullscreen"),document.body.style.overflow="hidden",document.body.classList.add("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!0}]}),z()})},M=function(){C=!1,e.classList.remove("tag-graph-fullscreen"),v.classList.remove("is-fullscreen"),v.setAttribute("aria-label","Fullscreen"),document.body.style.overflow="",document.body.classList.remove("tag-graph-fs-active"),requestAnimationFrame(function(){h.resize(),h.setOption({series:[{roam:!1,zoom:A,center:E.slice()}]})})};v.addEventListener("click",function(p){p.preventDefault(),p.stopPropagation(),C?M():I()}),document.addEventListener("keydown",function(p){p.key==="Escape"&&C&&M()})}let T;window.addEventListener("resize",function(){clearTimeout(T),T=setTimeout(function(){h.resize()},150)});function F(){h.setOption({series:[{data:t.nodes}]})}window.addEventListener("storage",function(v){v.key==="siteLanguage"&&F()});const H=localStorage.setItem;localStorage.setItem=function(v,C){H.call(localStorage,v,C),v==="siteLanguage"&&setTimeout(F,50)}}}function xt(s,e){let t=0,n="";for(const i of s){const o=i.codePointAt(0),r=o>=12288&&o<=12351||o>=13312&&o<=40959||o>=65280&&o<=65519;if(t+=r?1:.5,t>e)return n.replace(/\s+$/,"")+"…";n+=i}return n}function Et(s,e,t={}){let n=(s||"").trim();const i=n.search(/[（(]/);i>4&&(n=n.slice(0,i));const o=n.indexOf(" · ");if(o>0&&(n=n.slice(0,o)),e!=="quote"&&e!=="cite"){const r=n.indexOf(" — ");r>0&&(n=n.slice(0,r))}if(n=n.trim(),t.short){const r=n.search(/[，,]/);r>1&&(n=n.slice(0,r)),n=xt(n,15)}return n}function St(s){if(s.querySelector("audio"))return!1;const e=s.querySelector("summary");return!(!e||/跟读|本节语音/.test(e.textContent||"")||s.parentElement&&s.parentElement.closest("details.callout"))}function Lt(s,e={}){const t=e.includeCallouts?"h1, h2, h3, h4, h5, h6, details.callout--foldable":"h1, h2, h3, h4, h5, h6",n=Array.from(s.querySelectorAll(t)),i=[];let o=1;const r=[];return n.forEach(d=>{const l=/^H[1-6]$/.test(d.tagName);let a,f,w=!1;if(l)a=parseInt(d.tagName[1],10),o=a,f=d.textContent;else{if(!St(d))return;a=o+1,w=!0;const R=d.querySelector("summary");if(f=Et(R.textContent||"",d.getAttribute("data-callout")||"",{short:!0}),!f)return}let u=1;for(;i.length&&i[i.length-1].level>=a;){const R=i.pop();R.level===a&&(u=R.n+1)}i.push({level:a,n:u});const S=r.length;d.id||(d.id=w?`toc-item-${S}`:`heading-${S}`);const P=i.map(R=>R.n).join(".");d.dataset.tocNumber=P,r.push({element:d,level:a,index:S,id:d.id,text:f,number:P,virtual:w})}),r}function Ct(s){const e=document.createElement("aside");e.className="toc-drawer",e.innerHTML='<div class="toc-header"><span class="toc-title"></span><div class="toc-header__actions"><button type="button" class="toc-foldall"></button><button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button></div></div><div class="toc-content"><div class="toc-list"></div></div>',document.body.appendChild(e);const t=e.querySelector(".toc-list"),n=s.map(i=>{const o=document.createElement("div");if(o.className=i.virtual?"toc-item toc-item--virtual":"toc-item",o.setAttribute("data-level",String(i.level)),o.setAttribute("data-index",String(i.index)),!i.virtual){const d=document.createElement("div");d.className="toc-collapse-btn",o.appendChild(d)}const r=document.createElement("span");return r.className="toc-item-text",r.style.cursor="pointer",r.innerHTML=`<span class="toc-number">${i.number}.</span> `,r.appendChild(document.createTextNode(i.text)),r.setAttribute("title",i.text),i.element.classList.contains("collapsed")&&o.classList.add("collapsed"),o.appendChild(r),t.appendChild(o),o});return{container:e,items:n}}const ze="toc-panel-state";function Pe(){try{const s=localStorage.getItem(ze);if(!s)return null;const e=JSON.parse(s);return!e||typeof e!="object"?null:e}catch{return null}}function kt(s){try{const t={...Pe()||{},...s};localStorage.setItem(ze,JSON.stringify(t))}catch{}}function Mt(){return(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?"zh":"en"}const At={zh:{title:"目录",open:"目录",hide:"收起目录",show:"打开目录"},en:{title:"Contents",open:"TOC",hide:"Hide contents",show:"Show contents"}};function Tt(s){const e=s.querySelector(".toc-content"),t=s.querySelector(".toc-item.toc-reading");!e||!t||(e.scrollTop=t.offsetTop-e.clientHeight/2+t.offsetHeight/2)}function It(s){const e=At[Mt()],t=s.querySelector(".toc-title");t&&(t.textContent=e.title),s.setAttribute("aria-label",e.title);const n=s.querySelector(".toc-close-btn");n&&(n.setAttribute("aria-label",e.hide),n.setAttribute("title",e.hide));const i=document.createElement("button");i.type="button",i.className="toc-tab",i.setAttribute("aria-label",e.show),i.innerHTML='<span class="toc-tab__icon" aria-hidden="true"></span><span class="toc-tab__text">'+e.open+"</span>",document.body.appendChild(i);const o=document.createElement("div");o.className="toc-scrim",document.body.appendChild(o);function r(a,f){s.classList.toggle("is-open",a),i.classList.toggle("is-hidden",a),o.classList.toggle("is-visible",a),document.body.classList.toggle("toc-drawer-open",a),a&&Tt(s),f&&kt({hidden:!a})}i.addEventListener("click",()=>r(!0,!0)),o.addEventListener("click",()=>r(!1,!0)),n&&n.addEventListener("click",a=>{a.stopPropagation(),r(!1,!0)}),document.addEventListener("keydown",a=>{a.key==="Escape"&&s.classList.contains("is-open")&&r(!1,!1)});const d=Pe(),l=window.matchMedia("(min-width: 1100px)").matches;return r(l&&!!d&&d.hidden===!1,!1),{setOpen:r}}function ue(s,e,t){for(let n=e+1;n<s.length&&!(parseInt(s[n].getAttribute("data-level")||"1",10)<=t);n+=1)s[n].classList.add("toc-hidden")}function Ne(s,e,t){for(let n=e+1;n<s.length;n+=1){const i=parseInt(s[n].getAttribute("data-level")||"1",10);if(i<=t)break;if(i===t+1)s[n].classList.remove("toc-hidden");else{let o=!0;for(let r=n-1;r>e;r-=1){const d=parseInt(s[r].getAttribute("data-level")||"1",10);if(d<i&&s[r].classList.contains("collapsed")){o=!1;break}if(d<=t)break}o&&s[n].classList.remove("toc-hidden")}}}function Rt(s){const e=parseInt(s.tagName.charAt(1),10);let t=s.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t=t.nextElementSibling;continue}t.style.display="none",t=t.nextElementSibling}}function zt(s){const e=parseInt(s.tagName.charAt(1),10);let t=s.nextElementSibling;for(;t&&!(t.tagName&&/^H[1-6]$/.test(t.tagName)&&parseInt(t.tagName.charAt(1),10)<=e);){if(t.classList&&t.classList.contains("tags")){t.style.display="",t=t.nextElementSibling;continue}t.style.display="",t=t.nextElementSibling}}function fe(s,e,t){const n=e[t],i=s[t]&&s[t].element;if(!n||!i)return;const o=parseInt(n.getAttribute("data-level")||"1",10);!n.classList.contains("collapsed")?(n.classList.add("collapsed"),ue(e,t,o),i.classList.contains("collapsed")||(i.classList.add("collapsed"),Rt(i))):(n.classList.remove("collapsed"),Ne(e,t,o),i.classList.contains("collapsed")&&(i.classList.remove("collapsed"),zt(i)))}function Pt(s,e,t){e.forEach((n,i)=>{if(n.classList.contains("toc-item--virtual")||!n.querySelector(".toc-collapse-btn"))return;const o=n.classList.contains("collapsed");t?!o&&!n.classList.contains("toc-hidden")&&fe(s,e,i):o&&fe(s,e,i)})}function Nt(s,e,t){const n=e[t],i=s[t]&&s[t].element;if(!n||!i)return;const o=parseInt(n.getAttribute("data-level")||"1",10),r=i.classList.contains("collapsed");r&&!n.classList.contains("collapsed")?(n.classList.add("collapsed"),ue(e,t,o)):!r&&n.classList.contains("collapsed")&&(n.classList.remove("collapsed"),Ne(e,t,o))}function Dt(s,e){e.forEach((i,o)=>{if(i.classList.contains("collapsed")){const r=parseInt(i.getAttribute("data-level")||"1",10);ue(e,o,r)}}),e.forEach((i,o)=>{const r=i.querySelector(".toc-collapse-btn");r&&r.addEventListener("click",d=>{d.stopPropagation(),fe(s,e,o)})});const t=new Map;s.forEach((i,o)=>t.set(i.element,o));const n=new MutationObserver(i=>{i.forEach(o=>{if(o.type!=="attributes"||o.attributeName!=="class")return;const r=t.get(o.target);r!==void 0&&Nt(s,e,r)})});return s.forEach(i=>{n.observe(i.element,{attributes:!0,attributeFilter:["class"]})}),{observer:n}}const Ce={1:{passed:"rgba(128,128,128,0.1)",reading:"rgba(66,153,225,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(66,153,225,0.25)"},2:{passed:"rgba(128,128,128,0.1)",reading:"rgba(49,130,206,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(49,130,206,0.25)"},3:{passed:"rgba(128,128,128,0.1)",reading:"rgba(44,82,130,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(44,82,130,0.25)"},4:{passed:"rgba(128,128,128,0.1)",reading:"rgba(42,67,101,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(42,67,101,0.25)"},5:{passed:"rgba(128,128,128,0.1)",reading:"rgba(26,54,93,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(26,54,93,0.25)"},6:{passed:"rgba(128,128,128,0.1)",reading:"rgba(21,62,117,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(21,62,117,0.25)"}};function qt(s,e){if(!s.length)return{destroy(){}};const t=new Array(s.length).fill("coming"),n=new Set;let i=-1;const o=new Map;s.forEach((u,S)=>o.set(u.element,S));function r(){e.forEach((u,S)=>{const P=parseInt(u.getAttribute("data-level")||"1",10),R=Ce[P]||Ce[1],W=t[S];u.classList.remove("toc-passed","toc-reading","toc-coming"),u.style.boxShadow="",u.style.transform="",u.style.fontWeight="",S===i?(u.classList.add("toc-reading"),u.style.backgroundColor=R.active,u.style.opacity="1",u.style.fontWeight="600",u.style.boxShadow="inset 0 0 0 2px rgba(66,153,225,0.3)",u.style.transform="scale(1.02)",u.style.transition="all 0.2s ease"):W==="reading"?(u.classList.add("toc-reading"),u.style.backgroundColor=R.reading,u.style.opacity="1",u.style.fontWeight="600"):W==="passed"?(u.classList.add("toc-passed"),u.style.backgroundColor=R.passed,u.style.opacity="0.7"):(u.classList.add("toc-coming"),u.style.backgroundColor=R.coming,u.style.opacity="0.5")})}function d(){const u=window.innerHeight/2;let S=-1;n.forEach(P=>{const R=s[P].element.getBoundingClientRect();R.top<=u&&R.bottom>=u&&(S=P)}),S!==i&&(i=S,r())}let l=null;function a(){l||(l=requestAnimationFrame(()=>{l=null,d()}))}const f=new IntersectionObserver(u=>{u.forEach(S=>{const P=o.get(S.target);P!==void 0&&(S.isIntersecting?(n.add(P),t[P]="reading"):(n.delete(P),t[P]=S.boundingClientRect.bottom<0?"passed":"coming"))}),d(),r()});s.forEach(u=>f.observe(u.element)),window.addEventListener("scroll",a,{passive:!0}),window.addEventListener("resize",a,{passive:!0}),r();function w(){f.disconnect(),window.removeEventListener("scroll",a),window.removeEventListener("resize",a),l&&cancelAnimationFrame(l)}return{destroy:w,refresh:()=>{d(),r()}}}const _t='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 18.59 8.83 20 12 16.83 15.17 20l1.41-1.41L12 14zM16.59 5.41 15.17 4 12 7.17 8.83 4 7.41 5.41 12 10z"/></svg>',Ot='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5.83 15.17 9l1.41-1.41L12 3 7.42 7.59 8.83 9zm0 12.34L8.83 15l-1.41 1.4L12 21l4.58-4.6L15.17 15z"/></svg>';function Ft(s){return!s.classList.contains("toc-item--virtual")&&!!s.querySelector(".toc-collapse-btn")}function Ht(){const s=document.querySelector(".content");if(!s||s.classList.contains("archives"))return null;const e=document.body;if(e.classList.contains("path-about-index-html")||e.classList.contains("layout-about"))return null;const t=document.querySelector("section.main[data-toc]");return t&&t.getAttribute("data-toc")==="false"?null:s}function Wt(){const s=Ht();if(!s)return;const e=Lt(s,{includeCallouts:document.body.classList.contains("type-daily-feed")});if(!e.length)return;const{container:t,items:n}=Ct(e);Dt(e,n);const i=qt(e,n);It(t);const o=t.querySelector(".toc-foldall"),r=n.filter(Ft);if(o&&r.length){const l=(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?{collapse:"全部折叠",expand:"全部展开"}:{collapse:"Collapse all",expand:"Expand all"},a=()=>{const f=r.some(w=>!w.classList.contains("collapsed"));o.innerHTML=f?_t:Ot,o.setAttribute("aria-label",f?l.collapse:l.expand),o.setAttribute("title",f?l.collapse:l.expand)};o.addEventListener("click",()=>{const f=r.some(w=>!w.classList.contains("collapsed"));Pt(e,n,f),a()}),a()}else o&&o.remove();n.forEach((d,l)=>{const a=d.querySelector(".toc-item-text");a&&a.addEventListener("click",()=>{const f=e[l];!f||!f.element||(f.virtual&&f.element.tagName==="DETAILS"&&!f.element.open&&(f.element.open=!0),f.element.scrollIntoView({behavior:"smooth",block:f.virtual?"start":"center"}),setTimeout(()=>i.refresh(),300))})})}function ke(){new Fe,new Je,new tt,document.getElementById("map")&&new nt,new it,setTimeout(()=>{new st},500),new ot,new at,new dt,bt(),Wt(),et(),document.getElementById("tag-graph")&&wt()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ke):ke();
