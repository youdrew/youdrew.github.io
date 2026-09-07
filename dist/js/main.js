const pe="modulepreload",me=function(o){return"/"+o},U={},ve=function(e,n,t){if(!n||n.length===0)return e();const s=document.getElementsByTagName("link");return Promise.all(n.map(i=>{if(i=me(i),i in U)return;U[i]=!0;const a=i.endsWith(".css"),l=a?'[rel="stylesheet"]':"";if(!!t)for(let h=s.length-1;h>=0;h--){const f=s[h];if(f.href===i&&(!a||f.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${i}"]${l}`))return;const r=document.createElement("link");if(r.rel=a?"stylesheet":pe,a||(r.as="script",r.crossOrigin=""),r.href=i,document.head.appendChild(r),a)return new Promise((h,f)=>{r.addEventListener("load",h),r.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${i}`)))})})).then(()=>e()).catch(i=>{const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=i,window.dispatchEvent(a),!a.defaultPrevented)throw i})};class ge{constructor(){this.header=document.querySelector("header"),this.menuIcon=document.getElementById("menu_icon"),this.navTriggerZone=50,this.showNavTimeout=null,this.lastMouseEvent=null,this.mouseMoveScheduled=!1,this.mediaQuery=null,this.currentMode=null,this.navLinks=null,this.onMouseMove=this.onMouseMove.bind(this),this.onHeaderEnter=this.onHeaderEnter.bind(this),this.onHeaderLeave=this.onHeaderLeave.bind(this),this.onMenuIconClick=this.onMenuIconClick.bind(this),this.onNavLinkClick=this.onNavLinkClick.bind(this),this.onKeydown=this.onKeydown.bind(this),this.onBreakpointChange=this.onBreakpointChange.bind(this),this.init()}init(){this.header&&(this.mediaQuery=window.matchMedia("(min-width: 1099px)"),this.mediaQuery.addEventListener("change",this.onBreakpointChange),this.applyMode(this.mediaQuery.matches?"desktop":"mobile"))}onBreakpointChange(e){this.applyMode(e.matches?"desktop":"mobile")}applyMode(e){e!==this.currentMode&&(this.teardown(),this.currentMode=e,e==="desktop"?this.bindDesktop():this.bindMobile())}teardown(){document.removeEventListener("mousemove",this.onMouseMove),this.header.removeEventListener("mouseenter",this.onHeaderEnter),this.header.removeEventListener("mouseleave",this.onHeaderLeave),document.removeEventListener("keydown",this.onKeydown),this.menuIcon&&this.menuIcon.removeEventListener("click",this.onMenuIconClick),this.navLinks&&this.navLinks.forEach(e=>e.removeEventListener("click",this.onNavLinkClick)),clearTimeout(this.showNavTimeout),this.showNavTimeout=null,this.header.classList.remove("show_menu","menu-open"),document.body.style.overflow=""}bindDesktop(){document.addEventListener("mousemove",this.onMouseMove),this.header.addEventListener("mouseenter",this.onHeaderEnter),this.header.addEventListener("mouseleave",this.onHeaderLeave)}bindMobile(){this.menuIcon&&(this.menuIcon.addEventListener("click",this.onMenuIconClick),this.navLinks=this.header.querySelectorAll("nav ul li a"),this.navLinks.forEach(e=>e.addEventListener("click",this.onNavLinkClick)),document.addEventListener("keydown",this.onKeydown))}openMenu(){this.header.classList.add("menu-open"),this.menuIcon.setAttribute("aria-expanded","true"),this.menuIcon.setAttribute("aria-label","Close menu"),document.body.style.overflow="hidden"}closeMenu(){this.header.classList.remove("menu-open"),this.menuIcon&&(this.menuIcon.setAttribute("aria-expanded","false"),this.menuIcon.setAttribute("aria-label","Open menu")),document.body.style.overflow=""}onMenuIconClick(e){e.preventDefault(),this.header.classList.contains("menu-open")?this.closeMenu():this.openMenu()}onNavLinkClick(){this.closeMenu()}onKeydown(e){e.key==="Escape"&&this.header.classList.contains("menu-open")&&this.closeMenu()}onMouseMove(e){this.lastMouseEvent=e,!this.mouseMoveScheduled&&(this.mouseMoveScheduled=!0,requestAnimationFrame(()=>{this.mouseMoveScheduled=!1,this.processMouseMove(this.lastMouseEvent)}))}processMouseMove(e){if(e){if(e.pageX<=this.navTriggerZone){clearTimeout(this.showNavTimeout),this.header.classList.add("show_menu");return}clearTimeout(this.showNavTimeout),this.showNavTimeout=setTimeout(()=>{const n=this.header.getBoundingClientRect();e.clientX>=n.left&&e.clientX<=n.right&&e.clientY>=n.top&&e.clientY<=n.bottom||this.header.classList.remove("show_menu")},300)}}onHeaderEnter(){clearTimeout(this.showNavTimeout)}onHeaderLeave(){this.showNavTimeout=setTimeout(()=>{this.header.classList.remove("show_menu")},300)}}const ye=`#define time iTime

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
}`,be=`// artifact-at-sea.wgsl — WebGPU twin of artifact-at-sea.glsl, used only for
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
`,we="(min-width: 1099px)",xe="(prefers-reduced-motion: reduce)",Ee=8e3,Se=30,Le=3.4,Ce=1.3,$=.55,G=1100,j=1,ke=3,Ae=1.7;function Te(){return/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className||"")}function L(o){return Math.max(0,Math.min(1,o))}function T(o){return o*o*(3-2*o)}const Me=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,Re=`#version 300 es
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
${ye}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class Ie{constructor(){Te()&&(this.mq=window.matchMedia(we),this.reduce=window.matchMedia(xe),this.dyn=window.matchMedia("(dynamic-range: high)"),this.canvas=null,this.gl=null,this.gpu=null,this.backend="webgl",this.ready=!1,this.initPromise=null,this.hdrFish=1,this.hdrSea=1,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=j,this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.onDynChange=this.onDynChange.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.dyn.addEventListener("change",this.onDynChange),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}onDynChange(){this.canvas&&(this.disable(),this.apply())}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e),this.canvas=e,this.ready=!1,this.initPromise=this.initBackend().then(n=>n?this.canvas?(this.ready=!0,this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle(),!0):(this.destroyGpu(),!1):(this.disable(),!1))}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null,this.destroyGpu(),this.ready=!1}async initBackend(){if(this.dyn.matches&&!!navigator.gpu){try{if(await this.buildGpu())return this.backend="webgpu",this.hdrFish=ke,this.hdrSea=Ae,!0}catch(n){console.warn("[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:",n)}this.destroyGpu(),this.freshCanvas()}return this.canvas?(this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.buildGl()):!1}freshCanvas(){if(!this.canvas)return;const e=this.canvas.cloneNode(!1);this.canvas.replaceWith(e),this.canvas=e}destroyGpu(){if(!this.gpu)return;const e=this.gpu;this.gpu=null;try{e.device.destroy()}catch{}}async buildGpu(){const e=await navigator.gpu.requestAdapter();if(!e)return!1;const n=await e.requestDevice(),t=this.canvas&&this.canvas.getContext("webgpu");if(!t)return n.destroy(),!1;t.configure({device:n,format:"rgba16float",colorSpace:"srgb",toneMapping:{mode:"extended"},alphaMode:"premultiplied"});const s=typeof t.getConfiguration=="function"?t.getConfiguration():null;if(!s||!s.toneMapping||s.toneMapping.mode!=="extended")return n.destroy(),!1;const i=n.createShaderModule({code:be}),a=await i.getCompilationInfo();if(a.messages.some(h=>h.type==="error")){for(const h of a.messages)console.warn("[idle-ocean] wgsl "+h.lineNum+":"+h.linePos+" "+h.message);return n.destroy(),!1}const l=n.createRenderPipeline({layout:"auto",vertex:{module:i,entryPoint:"vmain"},fragment:{module:i,entryPoint:"fmain",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}}),c=n.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),r=n.createBindGroup({layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}}]});return this.gpu={device:n,ctx:t,pipeline:l,ubuf:c,bind:r,u:new Float32Array(16)},n.lost.then(h=>{this.gpu&&this.canvas&&(console.warn("[idle-ocean] WebGPU device lost ("+h.reason+"), falling back to WebGL"),this.gpu=null,this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.freshCanvas(),this.buildGl()?this.resize():this.disable())}),!0}buildGl(){const e=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1});if(!e)return!1;this.gl=e;const n=(l,c)=>{const r=e.createShader(l);return e.shaderSource(r,c),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(r)),null)},t=n(e.VERTEX_SHADER,Me),s=n(e.FRAGMENT_SHADER,Re);if(!t||!s)return!1;const i=e.createProgram();if(e.attachShader(i,t),e.attachShader(i,s),e.bindAttribLocation(i,0,"p"),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(i)),!1;e.useProgram(i),this.prog=i;const a=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,a),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(i,"iResolution"),this.uTime=e.getUniformLocation(i,"iTime"),this.uReveal=e.getUniformLocation(i,"uReveal"),this.uOpaque=e.getUniformLocation(i,"uOpaqueMax"),this.uMode=e.getUniformLocation(i,"uMode"),this.uDir=e.getUniformLocation(i,"uDir"),this.uDrain=e.getUniformLocation(i,"uDrain"),this.uMouse=e.getUniformLocation(i,"uMouse"),this.uHdrFish=e.getUniformLocation(i,"uHdrFish"),this.uHdrSea=e.getUniformLocation(i,"uHdrSea"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let n=Math.round(window.innerWidth*e*$),t=Math.round(window.innerHeight*e*$);const s=Math.max(n,t);if(s>G){const i=G/s;n=Math.round(n*i),t=Math.round(t*i)}n=Math.max(1,n),t=Math.max(1,t),(this.canvas.width!==n||this.canvas.height!==t)&&(this.canvas.width=n,this.canvas.height=t,this.gl&&this.gl.viewport(0,0,n,t))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},Ee))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const n=Math.random()*Math.PI*2;this.dir=[Math.cos(n),Math.sin(n)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e-this.lastTick<1e3/Se))return;const n=(e-this.lastTick)/1e3;if(this.lastTick=e,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+n/Le),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+n/Ce),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.renderFrame(e),this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){if(!this.ready||!this.canvas)return;const n=((e||performance.now())-this.startTime)/1e3;if(this.backend==="webgpu"&&this.gpu){this.renderGpu(n);return}const t=this.gl;t&&(t.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),t.uniform1f(this.uTime,n),t.uniform1f(this.uReveal,T(L(this.reveal))),t.uniform1f(this.uOpaque,this.opaqueMax),t.uniform1f(this.uMode,this.mode),t.uniform2f(this.uDir,this.dir[0],this.dir[1]),t.uniform1f(this.uDrain,T(L(this.drain))),t.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),t.uniform1f(this.uHdrFish,this.hdrFish),t.uniform1f(this.uHdrSea,this.hdrSea),t.drawArrays(t.TRIANGLES,0,3))}renderGpu(e){const{device:n,ctx:t,pipeline:s,ubuf:i,bind:a,u:l}=this.gpu;l[0]=this.canvas.width,l[1]=this.canvas.height,l[2]=1,l[3]=e,l[4]=T(L(this.reveal)),l[5]=this.opaqueMax,l[6]=this.mode,l[7]=T(L(this.drain)),l[8]=this.dir[0],l[9]=this.dir[1],l[10]=this.mouse[0],l[11]=this.mouse[1],l[12]=this.hdrFish,l[13]=this.hdrSea,n.queue.writeBuffer(i,0,l);const c=n.createCommandEncoder(),r=c.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]});r.setPipeline(s),r.setBindGroup(0,a),r.draw(3),r.end(),n.queue.submit([c.finish()])}debugSet(e={}){this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=L(e.reveal)),typeof e.drain=="number"&&(this.drain=L(e.drain)),typeof e.hdrFish=="number"&&(this.hdrFish=e.hdrFish),typeof e.hdrSea=="number"&&(this.hdrSea=e.hdrSea),this.startTime||(this.startTime=performance.now());const n=()=>{this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now())};return this.ready?n():this.initPromise&&this.initPromise.then(t=>{t&&this.paused&&n()}),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode,backend:this.backend,hdrFish:this.hdrFish,hdrSea:this.hdrSea}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=j,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}function Pe(){const o=document.querySelector(".signal");if(!o)return;const e=o.querySelector(".dnav__center");document.addEventListener("click",u=>{e!=null&&e.open&&!e.contains(u.target)&&(e.open=!1)}),document.addEventListener("keydown",u=>{var p;u.key==="Escape"&&(e!=null&&e.open)&&(e.open=!1,(p=e.querySelector("summary"))==null||p.focus())});const n=(o.getAttribute("data-audiobase")||"").replace(/\/$/,""),t=new Audio;t.hidden=!0,t.preload="none",t.dataset.signalPlayer="",o.append(t);const s=window.speechSynthesis,i=o.querySelector(".signal__audio-status");let a=!1,l=0;const c=u=>{i&&(i.textContent=u)};let r=null,h=[],f=0,d=null;const m=u=>{var p;return((p=b(u).find(v=>v.dataset.audio))==null?void 0:p.dataset.audio)||`${n}/${u}.m4a`},b=u=>Array.from(o.querySelectorAll(`[data-id="${CSS.escape(u)}"]`)),y=(u,p)=>b(u).forEach(v=>v.classList.toggle("playing",p));function C(u){const p=u==="featured"?"#sec-featured .has-audio":`#sec-${u} .drow.has-audio`,v=[],g={};return o.querySelectorAll(p).forEach(x=>{const E=x.dataset.id;E&&!g[E]&&(g[E]=1,v.push(E))}),v}function k(){o.querySelectorAll(".secplay").forEach(u=>{const p=d&&u.dataset.scope===d;u.setAttribute("aria-pressed",String(!!p)),u.classList.toggle("playing",p);const v=u.querySelector(".t");v&&(v.textContent=p?"暂停":"连播")})}function q(){l++,a&&s&&s.cancel(),a=!1}function R(u){q(),t.pause(),r&&y(r,!1),r=u,y(u,!0),c(""),t.src=m(u);const p=l,v=t.play();v&&v.catch&&v.catch(g=>{p!==l||r!==u||g.name==="AbortError"||g.name==="NotAllowedError"&&(S(),c("浏览器暂未允许播放，请再点一次朗读。"))})}t.addEventListener("error",()=>{var W,B;if(!r||a)return;if(!s||!window.SpeechSynthesisUtterance){S(),c("这条语音暂时不可用，请稍后重试。");return}const u=b(r).find(I=>I.matches("article")),p=((W=u==null?void 0:u.querySelector(".drow__title, .mcard__t"))==null?void 0:W.textContent)||"",v=((B=u==null?void 0:u.querySelector(".drow__dek, .mcard__detail p"))==null?void 0:B.textContent)||"",g=new window.SpeechSynthesisUtterance(`${p}。${v}`);g.lang="zh-CN",g.rate=1.05;const x=s.getVoices().find(I=>/^zh[-_]CN/i.test(I.lang));x&&(g.voice=x);const E=l;a=!0,c("正在使用浏览器语音朗读。"),g.onend=()=>{E===l&&(a=!1,O())},g.onerror=()=>{E===l&&(S(),c("语音播放失败，请稍后重试。"))},s.speak(g)});function fe(u){h=C(u),f=0,d=h.length?u:null,k(),h.length&&R(h[0])}function S(){q(),d=null,h=[],k(),t.pause(),r&&(y(r,!1),r=null)}function O(){if(d&&(f++,f<h.length)){R(h[f]);return}d=null,k(),r&&(y(r,!1),r=null)}t.addEventListener("ended",O),window.addEventListener("pagehide",S),o.querySelectorAll(".pkey").forEach(u=>{u.addEventListener("click",p=>{p.preventDefault(),p.stopPropagation();const v=u.dataset.id;if(r===v&&(!t.paused||a)){S(),c("");return}d=null,k(),R(v)})}),o.querySelectorAll(".secplay").forEach(u=>{u.addEventListener("click",()=>{const p=u.dataset.scope;if(d===p&&(!t.paused||a)){S();return}fe(p)})});const A=[].slice.call(o.querySelectorAll(".dpill"));function H(u,p=!1){var v;if(A.some(g=>g.dataset.sec===u)||(u=(v=A[0])==null?void 0:v.dataset.sec),o.setAttribute("data-view",u==="featured"?"featured":"news"),A.forEach(g=>{const x=g.dataset.sec===u;g.classList.toggle("active",x),x?g.setAttribute("aria-current","page"):g.removeAttribute("aria-current")}),o.querySelectorAll(".dpaper .dsec").forEach(g=>{g.hidden=g.id!==`sec-${u}`}),p){const g=o.getBoundingClientRect().top+window.pageYOffset-80;window.scrollTo({top:Math.max(0,g),behavior:"smooth"})}}A.forEach(u=>{u.addEventListener("click",p=>{p.preventDefault();const v=u.dataset.sec;window.history.replaceState(null,"",`#sec-${v}`),H(v,!0)})});const F=()=>H(window.location.hash.replace(/^#sec-/,""));window.addEventListener("hashchange",F),F()}class Ne{constructor(){this.init()}init(){document.addEventListener("mouseover",e=>{e.target.tagName==="A"&&this.showTooltip(e.target)}),document.addEventListener("mouseout",e=>{e.target.tagName==="A"&&this.hideTooltip()})}showTooltip(e){const n=e.getAttribute("data-title");if(!n||n==="")return;const t=document.createElement("span");t.className="tooltip",t.textContent=n,e.parentNode.insertBefore(t,e.nextSibling);const s=t.offsetWidth,i=e.offsetWidth,a=e.offsetHeight+3+4;let l=s;s<i&&(l=i,t.style.width=l+"px");const c=-(l-i)/2;t.style.left=c+"px",t.style.bottom=a+"px",setTimeout(()=>{t.style.opacity="1"},10)}hideTooltip(){document.querySelectorAll(".tooltip").forEach(n=>{n.remove()})}}class De{constructor(){this.mapElement=document.getElementById("map"),this.init()}init(){this.mapElement&&(this.adjustMapLayout(),window.addEventListener("resize",()=>{this.adjustMapLayout()}))}adjustMapLayout(){const e=document.querySelector("header"),n=window.innerHeight,t=window.innerWidth;if(!e)return;const s=e.offsetWidth+50,i=this.mapElement.offsetWidth;this.mapElement.style.maxWidth=i+"px",this.mapElement.style.height=n+"px",t>1100?this.mapElement.style.marginLeft=s+"px":this.mapElement.style.marginLeft="0"}}class ze{constructor(){this.overlay=null,this.zoomImg=null,this.hint=null,this.scale=1,this.minScale=.2,this.maxScale=6,this.lastPos={x:0,y:0},this.origin={x:0,y:0},this.dragging=!1,this.wheelTimeout=null,this.init()}init(){this.bindImages(),new MutationObserver(n=>{for(let t=0;t<n.length;t++)if(n[t].addedNodes.length){this.bindImages();break}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}buildOverlay(){this.overlay=document.createElement("div"),this.overlay.id="image-zoom-overlay",this.overlay.className="fade-in",this.overlay.innerHTML=`
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `,document.body.appendChild(this.overlay),this.zoomImg=this.overlay.querySelector(".image-zoom-img"),this.hint=this.overlay.querySelector(".image-zoom-hint"),this.bindOverlayEvents()}openOverlay(e){this.overlay||this.buildOverlay(),this.overlay.style.display="flex",this.zoomImg.src=e,this.scale=1,this.lastPos.x=0,this.lastPos.y=0,this.applyTransform(),this.hint&&(this.hint.style.opacity="1",this.hint.style.transition="opacity .5s",clearTimeout(this.hint._hideTimer),this.hint._hideTimer=setTimeout(()=>{this.hint.style.opacity="0"},3e3))}closeOverlay(){this.overlay&&(this.overlay.style.display="none",this.zoomImg.src="")}applyTransform(){this.zoomImg.style.transform=`translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`}onWheel(e){e.preventDefault();const n=this.zoomImg.getBoundingClientRect(),t=e.clientX-n.left-n.width/2,s=e.clientY-n.top-n.height/2,i=e.deltaY>0?-.12:.12,a=Math.max(this.minScale,Math.min(this.maxScale,this.scale+i)),l=a/this.scale;this.lastPos.x=(this.lastPos.x+t)*l-t,this.lastPos.y=(this.lastPos.y+s)*l-s,this.scale=a,this.applyTransform(),this.hint&&(this.hint.style.opacity="0.3",clearTimeout(this.wheelTimeout),this.wheelTimeout=setTimeout(()=>{this.hint.style.opacity="1"},400))}onMouseDown(e){e.button===0&&(this.dragging=!0,this.origin.x=e.clientX,this.origin.y=e.clientY,this.overlay.style.cursor="grabbing")}onMouseMove(e){if(!this.dragging)return;const n=e.clientX-this.origin.x,t=e.clientY-this.origin.y;this.origin.x=e.clientX,this.origin.y=e.clientY,this.lastPos.x+=n,this.lastPos.y+=t,this.applyTransform()}onMouseUp(){this.dragging=!1,this.overlay&&(this.overlay.style.cursor="default")}onDblClick(){this.closeOverlay()}onKey(e){e.key==="Escape"&&this.overlay&&this.overlay.style.display==="flex"&&this.closeOverlay()}bindOverlayEvents(){this.zoomImg.addEventListener("wheel",e=>this.onWheel(e),{passive:!1}),this.zoomImg.addEventListener("mousedown",e=>this.onMouseDown(e)),this.zoomImg.addEventListener("dblclick",()=>this.onDblClick()),window.addEventListener("mousemove",e=>this.onMouseMove(e)),window.addEventListener("mouseup",()=>this.onMouseUp()),window.addEventListener("keydown",e=>this.onKey(e)),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.closeOverlay()})}bindImages(){const e="article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img";document.querySelectorAll(e).forEach(t=>{t.classList.contains("image-zoomable")||(t.classList.add("image-zoomable"),t.style.cursor="zoom-in",t.addEventListener("click",()=>{this.openOverlay(t.getAttribute("data-origin")||t.src)}))})}}class _e{constructor(){this.initializeEmbeds()}initializeEmbeds(){this.processTextNodes(document.body),this.processCodeBlocks(),this.processMarkdownSyntax()}processTextNodes(e){["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(e.tagName)||(e.nodeType===Node.TEXT_NODE?this.processTextNode(e):Array.from(e.childNodes).forEach(n=>{this.processTextNodes(n)}))}processTextNode(e){const n=e.textContent,t=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let s;const i=[];for(;(s=t.exec(n))!==null;)i.push({fullMatch:s[0],shaderID:s[1],index:s.index});i.length>0&&this.replaceWithIframes(e,i)}processCodeBlocks(){document.querySelectorAll("code, pre").forEach(n=>{const t=n.textContent,s=/https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;let i;for(;(i=s.exec(t))!==null;){const a=t.trim();if(a===i[0]||a===i[0].replace(/\?.*$/,"")){this.replaceElementWithIframe(n,i[1]);break}}})}replaceWithIframes(e,n){const t=e.parentNode;if(!t)return;const s=e.textContent,i=[];let a=0;n.sort((c,r)=>r.index-c.index),n.reverse().forEach(c=>{c.index>a&&i.unshift({type:"text",content:s.substring(a,c.index)}),i.unshift({type:"iframe",shaderID:c.shaderID,originalURL:c.fullMatch}),a=c.index+c.fullMatch.length}),a<s.length&&i.unshift({type:"text",content:s.substring(a)});const l=[];i.forEach(c=>{if(c.type==="text"&&c.content.trim())l.push(document.createTextNode(c.content));else if(c.type==="iframe"){const r=this.createShaderToyEmbed(c.shaderID,c.originalURL);l.push(r)}}),l.forEach(c=>{t.insertBefore(c,e)}),t.removeChild(e)}replaceElementWithIframe(e,n){const t=this.createShaderToyEmbed(n);e.parentNode.replaceChild(t,e)}createShaderToyEmbed(e,n=null){const t=document.createElement("div");t.className="shadertoy-embed-container",t.style.cssText=`
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
        `,t.addEventListener("mouseenter",()=>{t.style.transform="translateY(-3px)",t.style.boxShadow="0 12px 35px rgba(0,0,0,0.4)"}),t.addEventListener("mouseleave",()=>{t.style.transform="translateY(0)",t.style.boxShadow="0 8px 25px rgba(0,0,0,0.3)"});const s=document.createElement("div");s.className="shadertoy-embed-header",s.style.cssText=`
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
        `;const l=document.createElement("span");l.textContent=`ShaderToy: ${e}`,l.style.cssText=`
            color: #ffd700;
            font-weight: bold;
            font-size: 16px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        `,i.appendChild(a),i.appendChild(l);const c=document.createElement("div");c.style.cssText=`
            display: flex;
            gap: 8px;
        `;const r=document.createElement("a");r.href=n||`https://www.shadertoy.com/view/${e}`,r.target="_blank",r.innerHTML="🔗 Open in ShaderToy",r.style.cssText=`
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
        `,r.addEventListener("mouseenter",()=>{r.style.background="#66b3ff",r.style.color="#000",r.style.transform="translateY(-1px)"}),r.addEventListener("mouseleave",()=>{r.style.background="rgba(102,179,255,0.1)",r.style.color="#66b3ff",r.style.transform="translateY(0)"}),c.appendChild(r),s.appendChild(i),s.appendChild(c);const h=document.createElement("div");h.style.cssText=`
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 50%; /* 2:1 aspect ratio */
            border-radius: 8px;
            overflow: hidden;
            background: #000;
        `;const f=document.createElement("iframe");f.src=`https://www.shadertoy.com/embed/${e}?gui=true&t=10&paused=false&muted=false`,f.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `,f.allowFullscreen=!0,f.loading="lazy";const d=document.createElement("div");d.innerHTML=`
            <div style="text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #ffd700; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
                <div style="color: #999; font-size: 14px;">Loading ShaderToy...</div>
            </div>
        `,d.style.cssText=`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
        `;const m=document.createElement("style");return m.textContent=`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `,document.head.appendChild(m),f.addEventListener("load",()=>{d.style.display="none"}),h.appendChild(f),h.appendChild(d),t.appendChild(s),t.appendChild(h),t}processMarkdownSyntax(){const e=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(s){var a;const i=(a=s.parentElement)==null?void 0:a.tagName;return["SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS"].includes(i)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),n=[];let t;for(;t=e.nextNode();)n.push(t);n.forEach(s=>{const i=s.textContent,a=/\[(shader|shadertoy):(\w+)\]/g;let l;const c=[];for(;(l=a.exec(i))!==null;)c.push({fullMatch:l[0],shaderID:l[2],index:l.index});c.length>0&&this.replaceMarkdownSyntax(s,c)})}replaceMarkdownSyntax(e,n){const t=e.parentNode;if(!t)return;const s=e.textContent,i=[];let a=0;n.sort((c,r)=>r.index-c.index),n.reverse().forEach(c=>{c.index>a&&i.unshift({type:"text",content:s.substring(a,c.index)}),i.unshift({type:"iframe",shaderID:c.shaderID,originalURL:null}),a=c.index+c.fullMatch.length}),a<s.length&&i.unshift({type:"text",content:s.substring(a)});const l=[];i.forEach(c=>{if(c.type==="text"&&c.content.trim())l.push(document.createTextNode(c.content));else if(c.type==="iframe"){const r=this.createShaderToyEmbed(c.shaderID,c.originalURL);l.push(r)}}),l.forEach(c=>{t.insertBefore(c,e)}),t.removeChild(e)}}function V(o){return!!o.tagName&&/^H[1-6]$/.test(o.tagName)}function Y(o){return parseInt(o.tagName.charAt(1),10)}function qe(o){return!o||typeof o.closest!="function"?!1:!!o.closest('a, button, input, textarea, select, summary, [contenteditable="true"]')}function z(o){if(!V(o))return;const e=Y(o),n=o.classList.contains("collapsed")?[e]:[];let t=o.nextElementSibling;for(;t;){if(V(t)){const s=Y(t);if(s<=e)break;for(;n.length&&n[n.length-1]>=s;)n.pop();t.style.display=n.length?"none":"",t.classList.contains("collapsed")&&n.push(s)}else t.classList&&t.classList.contains("tags")?t.style.display="":t.style.display=n.length?"none":"";t=t.nextElementSibling}}class Oe{constructor(){this.init()}init(){const e=document.querySelector(".content");if(!e)return;e.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(t=>{t.classList.add("collapsible-heading");const s=document.createElement("span");s.className="collapse-button",t.insertBefore(s,t.firstChild),s.addEventListener("click",i=>{i.stopPropagation(),this.toggleCollapse(t)}),t.addEventListener("click",i=>{qe(i.target)||this.toggleCollapse(t)})})}toggleCollapse(e){e.classList.toggle("collapsed"),z(e)}}class He{constructor(){this.init()}init(){this.initCodeBlockExpansion(),new MutationObserver(n=>{let t=!1;n.forEach(s=>{s.addedNodes.length>0&&s.addedNodes.forEach(i=>{i.nodeType===1&&(i.matches("figure.highlight")||i.querySelector("figure.highlight"))&&(t=!0)})}),t&&setTimeout(()=>this.initCodeBlockExpansion(),100)}).observe(document.body,{childList:!0,subtree:!0})}initCodeBlockExpansion(){document.querySelectorAll("figure.highlight").forEach(n=>{if(n.closest(".code-block-container"))return;const t=n.querySelector("table");if(t){const r=t.querySelector("td.code");if(r){const h=document.createElement("pre");h.className="code",h.innerHTML=r.innerHTML,n.innerHTML="",n.appendChild(h)}}const s=n.querySelector("pre.code");if(!s)return;const i=s.scrollHeight,a=400,l=document.createElement("div");l.className="code-buttons";const c=document.createElement("button");if(c.className="copy-code-button",c.textContent="复制代码",c.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),this.copyCodeToClipboard(s,c)}),l.appendChild(c),i>a){const r=document.createElement("div");r.className="code-block-container collapsed",n.parentNode.insertBefore(r,n),r.appendChild(n);const h=document.createElement("button");h.className="expand-button",h.textContent="展开代码",l.appendChild(h),r.appendChild(l),h.addEventListener("click",()=>{r.classList.contains("collapsed")&&this.showFullscreenCode(n)})}else{const r=document.createElement("div");r.className="code-block-container",n.parentNode.insertBefore(r,n),r.appendChild(n),r.appendChild(l)}})}showFullscreenCode(e){const n=document.createElement("div");n.className="code-fullscreen-modal active";const t=document.createElement("div");t.className="code-fullscreen-content";const i=(e.closest(".code-block-container")||e).cloneNode(!0);i.querySelectorAll(".code-buttons, .copy-code-button, .expand-button").forEach(d=>{d.parentNode&&d.parentNode.removeChild(d)});const l=i.classList.contains("code-block-container")?i:i.querySelector(".code-block-container");l&&(l.classList.remove("collapsed"),l.style.margin="0");const c=(l||i).querySelector("pre.code");c&&(c.scrollTop=0),t.appendChild(i);const r=document.createElement("button");r.className="close-fullscreen",r.textContent="关闭",t.appendChild(r),n.appendChild(t),document.body.appendChild(n),document.body.style.overflow="hidden";const h=()=>{document.body.removeChild(n),document.body.style.overflow=""};r.addEventListener("click",h),n.addEventListener("click",d=>{d.target===n&&h()});const f=d=>{d.key==="Escape"&&(h(),document.removeEventListener("keydown",f))};document.addEventListener("keydown",f)}copyCodeToClipboard(e,n){const t=e.textContent||e.innerText;navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(t).then(()=>{this.showCopySuccess(n)}).catch(s=>{console.error("复制失败:",s),this.fallbackCopy(t,n)}):this.fallbackCopy(t,n)}fallbackCopy(e,n){const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.width="2em",t.style.height="2em",t.style.padding="0",t.style.border="none",t.style.outline="none",t.style.boxShadow="none",t.style.background="transparent",document.body.appendChild(t),t.focus(),t.select();try{document.execCommand("copy")&&this.showCopySuccess(n)}catch(s){console.error("复制失败:",s)}document.body.removeChild(t)}showCopySuccess(e){const n=e.textContent;e.classList.add("copied"),e.textContent="已复制 ✓",setTimeout(()=>{e.classList.remove("copied"),e.textContent=n},2e3)}}const X=1.2,K=1.15,Fe=.2,We=50,Be="canvas-arrow-modal-",Ue=4,$e="canvas-layout:v1";let Z=0;function J(){return(document.documentElement.lang||"").toLowerCase().startsWith("zh")?{open:"点击放大查看画布",close:"关闭",hint:"拖动节点 · 拖动画布 · 滚轮缩放",zoomOut:"缩小",resetView:"重置视图",zoomIn:"放大",resetLayout:"恢复节点原始位置",resetLayoutText:"复原节点"}:{open:"Open interactive canvas",close:"Close",hint:"Drag nodes · Pan canvas · Scroll to zoom",zoomOut:"Zoom out",resetView:"Reset view",zoomIn:"Zoom in",resetLayout:"Restore original node positions",resetLayoutText:"Reset nodes"}}class Ge{constructor(){const e=document.querySelectorAll(".canvas-embed:not(.canvas-embed--error)");if(e.length)for(const n of e)this.attach(n)}attach(e){const n=J();e.setAttribute("role","button"),e.setAttribute("tabindex","0"),e.setAttribute("aria-label",n.open),e.addEventListener("click",t=>{t.target.closest("a")||(t.preventDefault(),this.openModal(e))}),e.addEventListener("keydown",t=>{t.target.closest("a")||(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.openModal(e))})}openModal(e){const n=e.querySelector(".canvas-svg");if(!n)return;const t=J(),s=n.cloneNode(!0);Ve(s),s.classList.add("canvas-modal__svg");const i=document.createElement("div");i.className="canvas-modal",i.innerHTML=`
      <div class="canvas-modal__overlay" aria-hidden="true"></div>
      <div class="canvas-modal__inner" role="dialog" aria-modal="true" aria-label="${t.open}">
        <button class="canvas-modal__close" type="button" aria-label="${t.close}">×</button>
        <div class="canvas-modal__viewport"></div>
        <div class="canvas-modal__hint" aria-hidden="true">${t.hint}</div>
        <div class="canvas-modal__controls">
          <button class="canvas-modal__btn" data-action="zoom-out" type="button" aria-label="${t.zoomOut}">−</button>
          <button class="canvas-modal__btn" data-action="reset" type="button" aria-label="${t.resetView}">↺</button>
          <button class="canvas-modal__btn" data-action="zoom-in" type="button" aria-label="${t.zoomIn}">+</button>
          <button class="canvas-modal__btn canvas-modal__btn--wide" data-action="reset-layout" type="button" aria-label="${t.resetLayout}">${t.resetLayoutText}</button>
        </div>
      </div>
    `,i.querySelector(".canvas-modal__viewport").appendChild(s),document.body.appendChild(i),document.body.classList.add("canvas-modal-open");const a=je(e,s),l=new Xe(s,a),c=i.querySelector(".canvas-modal__close");c.focus();const r=f=>{if(f.key==="Escape"){h();return}if(f.key!=="Tab")return;const d=Array.from(i.querySelectorAll("button, a[href]")).filter(y=>!y.hasAttribute("disabled")&&y.getClientRects().length>0);if(!d.length)return;const m=d[0],b=d[d.length-1];f.shiftKey&&document.activeElement===m?(f.preventDefault(),b.focus()):!f.shiftKey&&document.activeElement===b&&(f.preventDefault(),m.focus())},h=()=>{l.destroy(),i.remove(),document.body.classList.remove("canvas-modal-open"),document.removeEventListener("keydown",r),e.focus({preventScroll:!0})};c.addEventListener("click",h),i.querySelector(".canvas-modal__overlay").addEventListener("click",h),document.addEventListener("keydown",r),i.querySelectorAll(".canvas-modal__btn").forEach(f=>{f.addEventListener("click",()=>{const d=f.dataset.action;d==="zoom-in"?l.zoomBy(X):d==="zoom-out"?l.zoomBy(1/X):d==="reset"?l.reset():d==="reset-layout"&&l.resetLayout()})})}}function je(o,e){const n=o.dataset.canvasSlug||"canvas",t=e.dataset.canvasRevision||"legacy";return`${$e}:${n}:${t}`}function Ve(o){const e=o.querySelector("marker[id]");if(!e)return;Z+=1;const n=e.id,t=`${Be}${Z}`;e.id=t,o.querySelectorAll("[marker-end]").forEach(s=>{s.getAttribute("marker-end")===`url(#${n})`&&s.setAttribute("marker-end",`url(#${t})`)})}class Ye{constructor(e,n){this.svg=e,this.storageKey=n,this.nodes=new Map,this.edges=[],this.connections=new Map;const t=e.viewBox.baseVal;this.maxStoredOffset=Math.max(t.width,t.height)*4,e.querySelectorAll(".canvas-node[data-id]").forEach(s=>{const i=s.dataset.id;!i||this.nodes.has(i)||(this.nodes.set(i,{id:i,element:s,x:M(s.dataset.x),y:M(s.dataset.y),width:M(s.dataset.width,200),height:M(s.dataset.height,80),dx:0,dy:0,baseTransform:s.getAttribute("transform")||""}),this.connections.set(i,[]))}),e.querySelectorAll(".canvas-edge-group[data-from-node][data-to-node]").forEach(s=>{const i={element:s,fromNode:s.dataset.fromNode,toNode:s.dataset.toNode,fromSide:s.dataset.fromSide||"right",toSide:s.dataset.toSide||"left"};!this.nodes.has(i.fromNode)||!this.nodes.has(i.toNode)||(this.edges.push(i),this.connections.get(i.fromNode).push(i),this.connections.get(i.toNode).push(i))}),this.removeStaleLayouts(),this.restore(),this.updateEdges(this.edges)}beginDrag(e){const n=this.nodes.get(e.dataset.id);if(!n)return null;const t=this.dragRecords(n).map(s=>({record:s,dx:s.dx,dy:s.dy}));return n.element.classList.add("is-dragging"),{primary:n,records:t}}dragRecords(e){if(!e.element.classList.contains("canvas-node--group"))return[e];const n=e.x+e.dx,t=e.y+e.dy,s=n+e.width,i=t+e.height,a=[e];return this.nodes.forEach(l=>{if(l===e)return;const c=l.x+l.dx+l.width/2,r=l.y+l.dy+l.height/2;c>=n&&c<=s&&r>=t&&r<=i&&a.push(l)}),a}moveDrag(e,n,t){const s=new Set;e.records.forEach(i=>{this.setOffset(i.record,i.dx+n,i.dy+t),this.connections.get(i.record.id).forEach(a=>s.add(a))}),this.updateEdges(s)}finishDrag(e,n){e&&(n&&this.moveDrag(e,0,0),e.primary.element.classList.remove("is-dragging"),n||this.persist())}setOffset(e,n,t){e.dx=n,e.dy=t;const s=n||t?`translate(${w(n)} ${w(t)})`:"",i=[e.baseTransform,s].filter(Boolean).join(" ");i?e.element.setAttribute("transform",i):e.element.removeAttribute("transform")}updateEdges(e){e.forEach(n=>{const t=this.nodes.get(n.fromNode),s=this.nodes.get(n.toNode),i=Q(t,n.fromSide),a=Q(s,n.toSide),l=Math.max(40,Math.hypot(a.x-i.x,a.y-i.y)/3),c=ee(n.fromSide,l),r=ee(n.toSide,l),h=n.element.querySelector(".canvas-edge");h&&h.setAttribute("d",`M ${w(i.x)} ${w(i.y)} C ${w(i.x+c.dx)} ${w(i.y+c.dy)}, ${w(a.x+r.dx)} ${w(a.y+r.dy)}, ${w(a.x)} ${w(a.y)}`);const f=n.element.querySelector(".canvas-edge__label");f&&(f.setAttribute("x",w((i.x+a.x)/2)),f.setAttribute("y",w((i.y+a.y)/2)))})}reset(){this.nodes.forEach(e=>this.setOffset(e,0,0)),this.updateEdges(this.edges);try{localStorage.removeItem(this.storageKey)}catch{}}restore(){let e;try{e=JSON.parse(localStorage.getItem(this.storageKey))}catch{return}Array.isArray(e)&&e.forEach(n=>{if(!Array.isArray(n)||n.length!==3)return;const t=this.nodes.get(String(n[0])),s=Number(n[1]),i=Number(n[2]);!t||!Number.isFinite(s)||!Number.isFinite(i)||Math.abs(s)>this.maxStoredOffset||Math.abs(i)>this.maxStoredOffset||this.setOffset(t,s,i)})}removeStaleLayouts(){const e=this.storageKey.lastIndexOf(":"),n=this.storageKey.slice(0,e+1);try{for(let t=localStorage.length-1;t>=0;t-=1){const s=localStorage.key(t);s&&s!==this.storageKey&&s.startsWith(n)&&localStorage.removeItem(s)}}catch{}}persist(){const e=[];this.nodes.forEach(n=>{(n.dx||n.dy)&&e.push([n.id,w(n.dx),w(n.dy)])});try{e.length?localStorage.setItem(this.storageKey,JSON.stringify(e)):localStorage.removeItem(this.storageKey)}catch{}}}class Xe{constructor(e,n){this.svg=e;const t=e.viewBox.baseVal;this.original={x:t.x,y:t.y,w:t.width,h:t.height},this.state={...this.original},this.scene=new Ye(e,n),this.pointers=new Map,this.pinch=null,this.mode=null,this.primaryPointerId=null,this.drag=null,this.didDrag=!1,this.suppressClick=!1,this.svg.style.cursor="grab",this.svg.style.touchAction="none",this.onWheel=this.onWheel.bind(this),this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.onPointerCancel=this.onPointerCancel.bind(this),this.onClick=this.onClick.bind(this),this.onDragStart=this.onDragStart.bind(this),this.svg.addEventListener("wheel",this.onWheel,{passive:!1}),this.svg.addEventListener("pointerdown",this.onPointerDown),window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.onPointerCancel),this.svg.addEventListener("click",this.onClick,!0),this.svg.addEventListener("dragstart",this.onDragStart)}setViewBox(){const{x:e,y:n,w:t,h:s}=this.state;this.svg.setAttribute("viewBox",`${e} ${n} ${t} ${s}`)}currentScale(){return this.original.w/this.state.w}zoomBy(e,n,t){const s=this.currentScale(),a=Math.min(We,Math.max(Fe,s*e))/s;!Number.isFinite(a)||Math.abs(a-1)<1e-4||(n==null&&(n=this.state.x+this.state.w/2),t==null&&(t=this.state.y+this.state.h/2),this.state.x=n-(n-this.state.x)/a,this.state.y=t-(t-this.state.y)/a,this.state.w/=a,this.state.h/=a,this.setViewBox())}pan(e,n){this.state.x-=e,this.state.y-=n,this.setViewBox()}reset(){this.state={...this.original},this.setViewBox()}resetLayout(){this.scene.reset(),this.reset()}screenToSvg(e,n){const t=this.svg.createSVGPoint();t.x=e,t.y=n;const s=this.svg.getScreenCTM();return s?t.matrixTransform(s.inverse()):{x:0,y:0}}onWheel(e){e.preventDefault();const n=e.deltaY<0?K:1/K,{x:t,y:s}=this.screenToSvg(e.clientX,e.clientY);this.zoomBy(n,t,s)}onPointerDown(e){if(e.pointerType==="mouse"&&e.button!==0)return;const n=this.screenToSvg(e.clientX,e.clientY);if(this.pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,startClientX:e.clientX,startClientY:e.clientY,anchor:n,captured:!1}),this.pointers.size===2)this.finishNodeDrag(!0),this.mode="pinch",this.suppressClick=!0,this.pointers.forEach((t,s)=>this.capturePointer(s,t)),this.pinch=this.computePinch();else if(this.pointers.size===1){const t=e.target.closest(".canvas-node[data-id]");this.primaryPointerId=e.pointerId,this.didDrag=!1,this.drag=t?this.scene.beginDrag(t):null,this.mode=this.drag?"node":"pan",this.drag||(this.svg.style.cursor="grabbing")}}onPointerMove(e){const n=this.pointers.get(e.pointerId);if(n){if(n.clientX=e.clientX,n.clientY=e.clientY,this.pointers.size===2&&this.pinch){const t=this.computePinch(),s=t.dist/this.pinch.dist;if(s>0&&Number.isFinite(s)){const i=this.screenToSvg(this.pinch.cx,this.pinch.cy);this.zoomBy(s,i.x,i.y);const a=this.screenToSvg(t.cx,t.cy);this.pan(a.x-i.x,a.y-i.y)}this.pinch=t}else if(this.pointers.size===1&&e.pointerId===this.primaryPointerId){if(Math.hypot(e.clientX-n.startClientX,e.clientY-n.startClientY)<Ue)return;this.didDrag=!0,this.capturePointer(e.pointerId,n);const s=this.screenToSvg(e.clientX,e.clientY);this.mode==="node"&&this.drag?(this.scene.moveDrag(this.drag,s.x-n.anchor.x,s.y-n.anchor.y),this.suppressClick=!0):this.mode==="pan"&&this.pan(s.x-n.anchor.x,s.y-n.anchor.y)}}}onPointerUp(e){if(this.pointers.has(e.pointerId)){if(this.pointers.delete(e.pointerId),e.pointerId===this.primaryPointerId&&this.finishNodeDrag(!1),this.pointers.size>=2){this.pinch=this.computePinch(),this.mode="pinch";return}if(this.pinch=null,this.pointers.size===1){const[n,t]=this.pointers.entries().next().value;t.startClientX=t.clientX,t.startClientY=t.clientY,t.anchor=this.screenToSvg(t.clientX,t.clientY),this.primaryPointerId=n,this.mode="pan",this.svg.style.cursor="grabbing";return}this.mode=null,this.primaryPointerId=null,this.svg.style.cursor="grab",this.suppressClick&&window.setTimeout(()=>{this.suppressClick=!1},0)}}onPointerCancel(e){if(this.pointers.has(e.pointerId)){if(this.pointers.delete(e.pointerId),e.pointerId===this.primaryPointerId&&this.finishNodeDrag(!0),this.pinch=this.pointers.size>=2?this.computePinch():null,this.pointers.size>=2){this.mode="pinch";return}if(this.pointers.size===1){const[n,t]=this.pointers.entries().next().value;t.startClientX=t.clientX,t.startClientY=t.clientY,t.anchor=this.screenToSvg(t.clientX,t.clientY),this.primaryPointerId=n,this.mode="pan",this.svg.style.cursor="grabbing";return}this.pointers.size===0&&(this.mode=null,this.primaryPointerId=null,this.svg.style.cursor="grab",this.suppressClick=!1)}}finishNodeDrag(e){this.drag&&(this.scene.finishDrag(this.drag,e||!this.didDrag),this.drag=null)}capturePointer(e,n){if(!(!n||n.captured))try{this.svg.setPointerCapture(e),n.captured=!0}catch{}}onClick(e){this.suppressClick&&(e.preventDefault(),e.stopPropagation(),this.suppressClick=!1)}onDragStart(e){e.preventDefault()}computePinch(){const[e,n]=[...this.pointers.values()],t=n.clientX-e.clientX,s=n.clientY-e.clientY;return{dist:Math.hypot(t,s),cx:(e.clientX+n.clientX)/2,cy:(e.clientY+n.clientY)/2}}destroy(){this.finishNodeDrag(!0),this.svg.removeEventListener("wheel",this.onWheel),this.svg.removeEventListener("pointerdown",this.onPointerDown),window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.onPointerCancel),this.svg.removeEventListener("click",this.onClick,!0),this.svg.removeEventListener("dragstart",this.onDragStart)}}function M(o,e=0){const n=Number(o);return Number.isFinite(n)?n:e}function w(o){return Math.round(o*100)/100}function Q(o,e){const n=o.x+o.dx,t=o.y+o.dy;return e==="top"?{x:n+o.width/2,y:t}:e==="bottom"?{x:n+o.width/2,y:t+o.height}:e==="left"?{x:n,y:t+o.height/2}:{x:n+o.width,y:t+o.height/2}}function ee(o,e){return o==="left"?{dx:-e,dy:0}:o==="top"?{dx:0,dy:-e}:o==="bottom"?{dx:0,dy:e}:{dx:e,dy:0}}const P={en:{Home:"Home",Daily:"Daily",Archives:"Archives",About:"About",Portfolio:"Portfolio",Bilibili:"Bilibili",GitHub:"GitHub",Instagram:"Instagram",Douban:"Douban",Email:"Email",RSS:"RSS",Language:"Language",Copyright:"Copyright","Powered by":"Powered by","Modified based on":"Modified based on",theme:"theme","Mainly maintained using AI":"Mainly maintained using AI","Older Posts":"Older Posts","Newer Posts":"Newer Posts",Comments:"Comments","Switch to Chinese":"Switch to Chinese","Switch to English":"Switch to English","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"Switched to English",articleLanguageSwitched:"Switched to English version","tag-graph-hint":"Click tag to explore · Scroll to zoom · Drag to rearrange"},"zh-CN":{Home:"首页",Daily:"资讯",Archives:"归档",About:"关于",Portfolio:"作品集",Bilibili:"哔哩哔哩",GitHub:"GitHub",Instagram:"Instagram",Douban:"豆瓣",Email:"邮箱",RSS:"RSS",Language:"语言",Copyright:"版权所有","Powered by":"技术支持","Modified based on":"基于",theme:"主题","Mainly maintained using AI":"主要使用AI来维护","Older Posts":"上一页","Newer Posts":"下一页",Comments:"留言","Switch to Chinese":"切换至中文","Switch to English":"切换至英文","View Chinese Version":"查看中文版","View English Version":"View English Version",languageSwitched:"已切换至中文",articleLanguageSwitched:"已切换至中文版本","tag-graph-hint":"点击标签探索 · 滚轮缩放 · 拖拽移动"}},Ke=()=>(navigator.language||navigator.userLanguage).startsWith("zh")?"zh-CN":"en",oe=()=>localStorage.getItem("siteLanguage")||Ke(),Ze=()=>{const o=document.cookie.match(/(?:^|;\s*)lang_pref=([^;]+)/);return o?o[1]:null},Je=o=>{document.cookie="lang_pref="+o+"; path=/; max-age=31536000; samesite=lax"},ae=()=>{const o=document.querySelector('meta[name="article:lang"]');return o?o.content:window.location.pathname.includes(".zh-CN")?"zh-CN":"en"},re=o=>{const e=document.querySelector(`link[rel="alternate"][hreflang="${o}"]`);if(!e)return null;const n=new URL(e.href,window.location.origin);return window.location.origin+n.pathname+n.search+n.hash},le=o=>{document.querySelectorAll(".lang-switch__opt").forEach(e=>{e.setAttribute("aria-pressed",e.getAttribute("data-lang")===o?"true":"false")})},N=o=>{const e=P[o];if(!e){console.warn("Language data not available for:",o);return}document.documentElement.lang=o,document.querySelectorAll("nav ul li a").forEach(c=>{const r=c.getAttribute("data-i18n-key");r&&e[r]&&(c.textContent=e[r])}),document.querySelectorAll("[data-i18n]").forEach(c=>{const r=c.getAttribute("data-i18n");e[r]&&(c.textContent=e[r])}),document.querySelectorAll("[data-title]").forEach(c=>{const r=c.getAttribute("data-title");e[r]&&c.setAttribute("data-title",e[r])});const i=document.querySelector(".pagination .extend.prev"),a=document.querySelector(".pagination .extend.next");i&&(i.textContent=e["Older Posts"]||i.textContent),a&&(a.textContent=e["Newer Posts"]||a.textContent),localStorage.setItem("siteLanguage",o),document.querySelectorAll("[data-i18n-tag]").forEach(c=>{const r=c.getAttribute("data-i18n-tag");if(o==="zh-CN"){const h=window.tagTranslations&&window.tagTranslations[r];h&&(c.textContent=h)}else c.textContent=r}),le(o)},Qe=o=>{const e=document.querySelector(".lang-notification");e&&e.remove();const n=document.createElement("div");n.className="lang-notification",n.textContent=o,document.body.appendChild(n),setTimeout(()=>{n.classList.add("show")},10),setTimeout(()=>{n.classList.remove("show"),setTimeout(()=>{n.parentNode&&n.parentNode.removeChild(n)},300)},2e3)},ce=o=>{if(Je(o),o===ae()){localStorage.setItem("siteLanguage",o),N(o);return}const e=re(o);if(e){localStorage.setItem("siteLanguage",o),window.location.href=e;return}N(o);const n=P[o]?P[o].languageSwitched:"Language switched";Qe(n)},et=()=>{const o=oe()==="zh-CN"?"en":"zh-CN";ce(o)},tt=()=>{document.querySelectorAll(".lang-switch__opt").forEach(o=>{o.addEventListener("click",e=>{e.preventDefault(),ce(o.getAttribute("data-lang"))})}),le(oe())},te=()=>{const o=ae(),e=Ze();if(N(e||o),e&&e!==o){const n=re(e),t=n&&new URL(n,window.location.origin).pathname;t&&t!==window.location.pathname&&window.location.replace(n)}};function nt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",te):te(),window.addEventListener("load",()=>{const o=document.getElementById("langSwitch");o&&o.addEventListener("click",e=>{e.preventDefault(),et()}),tt()})}function it(o,e){let n=0,t="";for(const s of o){const i=s.codePointAt(0),a=i>=12288&&i<=12351||i>=13312&&i<=40959||i>=65280&&i<=65519;if(n+=a?1:.5,n>e)return t.replace(/\s+$/,"")+"…";t+=s}return t}function st(o,e,n={}){let t=(o||"").trim();const s=t.search(/[（(]/);s>4&&(t=t.slice(0,s));const i=t.indexOf(" · ");if(i>0&&(t=t.slice(0,i)),e!=="quote"&&e!=="cite"){const a=t.indexOf(" — ");a>0&&(t=t.slice(0,a))}if(t=t.trim(),n.short){const a=t.search(/[，,]/);a>1&&(t=t.slice(0,a)),t=it(t,15)}return t}function ot(o){if(o.querySelector("audio"))return!1;const e=o.querySelector("summary");return!(!e||/跟读|本节语音/.test(e.textContent||"")||o.parentElement&&o.parentElement.closest("details.callout"))}function at(o,e={}){const n=e.includeCallouts?"h1, h2, h3, h4, h5, h6, details.callout--foldable":"h1, h2, h3, h4, h5, h6",t=Array.from(o.querySelectorAll(n)),s=[];let i=1;const a=[];return t.forEach(l=>{const c=/^H[1-6]$/.test(l.tagName);let r,h,f=!1;if(c)r=parseInt(l.tagName[1],10),i=r,h=l.textContent;else{if(!ot(l))return;r=i+1,f=!0;const y=l.querySelector("summary");if(h=st(y.textContent||"",l.getAttribute("data-callout")||"",{short:!0}),!h)return}let d=1;for(;s.length&&s[s.length-1].level>=r;){const y=s.pop();y.level===r&&(d=y.n+1)}s.push({level:r,n:d});const m=a.length;l.id||(l.id=f?`toc-item-${m}`:`heading-${m}`);const b=s.map(y=>y.n).join(".");l.dataset.tocNumber=b,a.push({element:l,level:r,index:m,id:l.id,text:h,number:b,virtual:f})}),a}function rt(o){const e=document.createElement("aside");e.className="toc-drawer",e.innerHTML='<div class="toc-header"><span class="toc-title"></span><div class="toc-header__actions"><button type="button" class="toc-fold-control toc-collapse-all"></button><button type="button" class="toc-fold-control toc-expand-all"></button><button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button></div></div><div class="toc-content"><div class="toc-list"></div></div>',document.body.appendChild(e);const n=e.querySelector(".toc-list"),t=o.map(s=>{const i=document.createElement("div");if(i.className=s.virtual?"toc-item toc-item--virtual":"toc-item",i.setAttribute("data-level",String(s.level)),i.setAttribute("data-index",String(s.index)),!s.virtual){const l=document.createElement("div");l.className="toc-collapse-btn",i.appendChild(l)}const a=document.createElement("span");return a.className="toc-item-text",a.style.cursor="pointer",a.innerHTML=`<span class="toc-number">${s.number}.</span> `,a.appendChild(document.createTextNode(s.text)),a.setAttribute("title",s.text),s.element.classList.contains("collapsed")&&i.classList.add("collapsed"),i.appendChild(a),n.appendChild(i),i});return{container:e,items:t}}const de="toc-panel-state";function he(){try{const o=localStorage.getItem(de);if(!o)return null;const e=JSON.parse(o);return!e||typeof e!="object"?null:e}catch{return null}}function lt(o){try{const n={...he()||{},...o};localStorage.setItem(de,JSON.stringify(n))}catch{}}function ct(){return(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?"zh":"en"}const dt={zh:{title:"目录",open:"目录",hide:"收起目录",show:"打开目录"},en:{title:"Contents",open:"TOC",hide:"Hide contents",show:"Show contents"}};function ht(o){const e=o.querySelector(".toc-content"),n=o.querySelector(".toc-item.toc-reading");!e||!n||(e.scrollTop=n.offsetTop-e.clientHeight/2+n.offsetHeight/2)}function ut(o){const e=dt[ct()],n=o.querySelector(".toc-title");n&&(n.textContent=e.title),o.setAttribute("aria-label",e.title);const t=o.querySelector(".toc-close-btn");t&&(t.setAttribute("aria-label",e.hide),t.setAttribute("title",e.hide));const s=document.createElement("button");s.type="button",s.className="toc-tab",s.setAttribute("aria-label",e.show),s.innerHTML='<span class="toc-tab__icon" aria-hidden="true"></span><span class="toc-tab__text">'+e.open+"</span>",document.body.appendChild(s);const i=document.createElement("div");i.className="toc-scrim",document.body.appendChild(i);function a(r,h){o.classList.toggle("is-open",r),s.classList.toggle("is-hidden",r),i.classList.toggle("is-visible",r),document.body.classList.toggle("toc-drawer-open",r),r&&ht(o),h&&lt({hidden:!r})}s.addEventListener("click",()=>a(!0,!0)),i.addEventListener("click",()=>a(!1,!0)),t&&t.addEventListener("click",r=>{r.stopPropagation(),a(!1,!0)}),document.addEventListener("keydown",r=>{r.key==="Escape"&&o.classList.contains("is-open")&&a(!1,!1)});const l=he(),c=window.matchMedia("(min-width: 1100px)").matches;return a(c&&!!l&&l.hidden===!1,!1),{setOpen:a}}function _(o,e,n){for(let t=e+1;t<o.length&&!(parseInt(o[t].getAttribute("data-level")||"1",10)<=n);t+=1)o[t].classList.add("toc-hidden")}function ue(o,e,n){for(let t=e+1;t<o.length;t+=1){const s=parseInt(o[t].getAttribute("data-level")||"1",10);if(s<=n)break;if(s===n+1)o[t].classList.remove("toc-hidden");else{let i=!0;for(let a=t-1;a>e;a-=1){const l=parseInt(o[a].getAttribute("data-level")||"1",10);if(l<s&&o[a].classList.contains("collapsed")){i=!1;break}if(l<=n)break}i&&o[t].classList.remove("toc-hidden")}}}function D(o,e,n){const t=e[n],s=o[n]&&o[n].element;if(!t||!s)return;const i=parseInt(t.getAttribute("data-level")||"1",10);!t.classList.contains("collapsed")?(t.classList.add("collapsed"),_(e,n,i),s.classList.add("collapsed")):(t.classList.remove("collapsed"),ue(e,n,i),s.classList.remove("collapsed")),z(s)}function ne(o,e,n){e.forEach((t,s)=>{if(t.classList.contains("toc-item--virtual")||!t.querySelector(".toc-collapse-btn"))return;const i=t.classList.contains("collapsed");n?i||D(o,e,s):i&&D(o,e,s)})}function ft(o,e,n){const t=e[n],s=o[n]&&o[n].element;if(!t||!s)return;const i=parseInt(t.getAttribute("data-level")||"1",10),a=s.classList.contains("collapsed");a&&!t.classList.contains("collapsed")?(t.classList.add("collapsed"),_(e,n,i)):!a&&t.classList.contains("collapsed")&&(t.classList.remove("collapsed"),ue(e,n,i)),z(s)}function pt(o,e,n=null){e.forEach((i,a)=>{if(i.classList.contains("collapsed")){const l=parseInt(i.getAttribute("data-level")||"1",10);_(e,a,l)}}),e.forEach((i,a)=>{const l=i.querySelector(".toc-collapse-btn");l&&l.addEventListener("click",c=>{c.stopPropagation(),D(o,e,a),n&&n()})});const t=new Map;o.forEach((i,a)=>t.set(i.element,a));const s=new MutationObserver(i=>{let a=!1;i.forEach(l=>{if(l.type!=="attributes"||l.attributeName!=="class")return;const c=t.get(l.target);c!==void 0&&(ft(o,e,c),a=!0)}),a&&n&&n()});return o.forEach(i=>{s.observe(i.element,{attributes:!0,attributeFilter:["class"]})}),{observer:s}}const ie={1:{passed:"rgba(128,128,128,0.1)",reading:"rgba(66,153,225,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(66,153,225,0.25)"},2:{passed:"rgba(128,128,128,0.1)",reading:"rgba(49,130,206,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(49,130,206,0.25)"},3:{passed:"rgba(128,128,128,0.1)",reading:"rgba(44,82,130,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(44,82,130,0.25)"},4:{passed:"rgba(128,128,128,0.1)",reading:"rgba(42,67,101,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(42,67,101,0.25)"},5:{passed:"rgba(128,128,128,0.1)",reading:"rgba(26,54,93,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(26,54,93,0.25)"},6:{passed:"rgba(128,128,128,0.1)",reading:"rgba(21,62,117,0.15)",coming:"rgba(200,200,200,0.05)",active:"rgba(21,62,117,0.25)"}};function mt(o,e){if(!o.length)return{destroy(){}};const n=new Array(o.length).fill("coming"),t=new Set;let s=-1;const i=new Map;o.forEach((d,m)=>i.set(d.element,m));function a(){e.forEach((d,m)=>{const b=parseInt(d.getAttribute("data-level")||"1",10),y=ie[b]||ie[1],C=n[m];d.classList.remove("toc-passed","toc-reading","toc-coming"),d.style.boxShadow="",d.style.transform="",d.style.fontWeight="",m===s?(d.classList.add("toc-reading"),d.style.backgroundColor=y.active,d.style.opacity="1",d.style.fontWeight="600",d.style.boxShadow="inset 0 0 0 2px rgba(66,153,225,0.3)",d.style.transform="scale(1.02)",d.style.transition="all 0.2s ease"):C==="reading"?(d.classList.add("toc-reading"),d.style.backgroundColor=y.reading,d.style.opacity="1",d.style.fontWeight="600"):C==="passed"?(d.classList.add("toc-passed"),d.style.backgroundColor=y.passed,d.style.opacity="0.7"):(d.classList.add("toc-coming"),d.style.backgroundColor=y.coming,d.style.opacity="0.5")})}function l(){const d=window.innerHeight/2;let m=-1;t.forEach(b=>{const y=o[b].element.getBoundingClientRect();y.top<=d&&y.bottom>=d&&(m=b)}),m!==s&&(s=m,a())}let c=null;function r(){c||(c=requestAnimationFrame(()=>{c=null,l()}))}const h=new IntersectionObserver(d=>{d.forEach(m=>{const b=i.get(m.target);b!==void 0&&(m.isIntersecting?(t.add(b),n[b]="reading"):(t.delete(b),n[b]=m.boundingClientRect.bottom<0?"passed":"coming"))}),l(),a()});o.forEach(d=>h.observe(d.element)),window.addEventListener("scroll",r,{passive:!0}),window.addEventListener("resize",r,{passive:!0}),a();function f(){h.disconnect(),window.removeEventListener("scroll",r),window.removeEventListener("resize",r),c&&cancelAnimationFrame(c)}return{destroy:f,refresh:()=>{l(),a()}}}const vt='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 18.59 8.83 20 12 16.83 15.17 20l1.41-1.41L12 14zM16.59 5.41 15.17 4 12 7.17 8.83 4 7.41 5.41 12 10z"/></svg>',gt='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5.83 15.17 9l1.41-1.41L12 3 7.42 7.59 8.83 9zm0 12.34L8.83 15l-1.41 1.4L12 21l4.58-4.6L15.17 15z"/></svg>';function yt(o){return!o.classList.contains("toc-item--virtual")&&!!o.querySelector(".toc-collapse-btn")}function bt(){const o=document.querySelector(".content");if(!o||o.classList.contains("archives"))return null;const e=document.body;if(e.classList.contains("path-about-index-html")||e.classList.contains("layout-about"))return null;const n=document.querySelector("section.main[data-toc]");return n&&n.getAttribute("data-toc")==="false"?null:o}function wt(){const o=bt();if(!o)return;const e=at(o,{includeCallouts:document.body.classList.contains("type-daily-feed")});if(!e.length)return;const{container:n,items:t}=rt(e),s=n.querySelector(".toc-collapse-all"),i=n.querySelector(".toc-expand-all"),a=t.filter(yt);let l=null;if(s&&i&&a.length){const h=(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("zh")===0?{collapse:"全部折叠",expand:"全部展开"}:{collapse:"Collapse all",expand:"Expand all"};s.innerHTML=vt,s.setAttribute("aria-label",h.collapse),s.setAttribute("title",h.collapse),i.innerHTML=gt,i.setAttribute("aria-label",h.expand),i.setAttribute("title",h.expand),l=()=>{const f=a.filter(d=>d.classList.contains("collapsed")).length;s.disabled=f===a.length,i.disabled=f===0},s.addEventListener("click",()=>{ne(e,t,!0),l()}),i.addEventListener("click",()=>{ne(e,t,!1),l()})}else s&&s.remove(),i&&i.remove();pt(e,t,l),l&&l();const c=mt(e,t);ut(n),t.forEach((r,h)=>{const f=r.querySelector(".toc-item-text");f&&f.addEventListener("click",()=>{const d=e[h];!d||!d.element||(d.virtual&&d.element.tagName==="DETAILS"&&!d.element.open&&(d.element.open=!0),d.element.scrollIntoView({behavior:"smooth",block:d.virtual?"start":"center"}),setTimeout(()=>c.refresh(),300))})})}function se(){if(new ge,new Ie,new Ne,document.getElementById("map")&&new De,new ze,setTimeout(()=>{new _e},500),new Oe,new He,new Ge,nt(),wt(),Pe(),document.getElementById("tag-graph")){const o=document.getElementById("tag-graph"),e=()=>ve(()=>import("./tag-graph-d76c47cd.js"),[]).then(({initTagGraph:n})=>n()).catch(n=>{console.error("Knowledge map failed to load",n),o.textContent=document.documentElement.lang==="zh-CN"?"知识地图加载失败，请刷新重试。下方文章仍可浏览。":"Map unavailable. Please reload, or browse the articles below."});if("IntersectionObserver"in window){const n=new IntersectionObserver(t=>{t.some(s=>s.isIntersecting)&&(n.disconnect(),e())},{rootMargin:"200px"});n.observe(o)}else e()}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",se):se();
