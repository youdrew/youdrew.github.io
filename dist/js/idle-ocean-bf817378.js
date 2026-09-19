const W=`#define time iTime

const float CAM_FAR = 20.0;
const vec3 BACKGROUND = vec3(0.1, 0.1, 0.13);
const int WATER_MARCH_ITERATIONS = 12;
const int WATER_NORMAL_ITERATIONS = 39;
const float PI = 3.14159265359;

const int NUM_PARTICLES = 20;
const float WHALE_SCALE = 0.20;
const float WHALE_BOUND = 0.65; // includes the animated flukes, fins and hit tolerance

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
float gWhaleHit; // primary-ray body coverage only; excludes halo, particles and reflections

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
  // Head is +x, tail is -x: +beat makes constant-phase points travel toward
  // the tail. The previous -beat sent the body wave in the opposite direction.
  vec3 unbent = p;
  float beat = time * 2.0;
  float tailness = smoothstep(0.6, -1.6, p.x);
  p.y -= (0.04 + 0.28 * tailness * tailness) * sin((p.x - 0.6) * 1.4 + beat);
  // blunt head flowing into a full chest, tapering into the tail stock
  float d = sdEllip(p - vec3(0.60, 0.03, 0.0), vec3(0.72, 0.30, 0.34));
  d = smin(d, sdEllip(p - vec3(-0.15, 0.0, 0.0), vec3(0.96, 0.31, 0.32)), 0.20);
  d = smin(d, sdEllip(p - vec3(-1.10, 0.06, 0.0), vec3(0.58, 0.13, 0.13)), 0.12);
  // flukes: a swept-back crescent with a trailing notch, pitching on the beat
  // Attach the flukes to the same wave's displacement and tangent. Start from
  // unbent space so their pitch is not applied on top of the body warp twice.
  float tailPhase = (-1.68 - 0.6) * 1.4 + beat;
  float tailLift = 0.32 * sin(tailPhase);
  float tailSlope = 0.32 * 1.4 * cos(tailPhase);
  vec3 q = unbent - vec3(-1.68, 0.08 + tailLift, 0.0);
  q.xy = rot2(atan(tailSlope)) * q.xy;
  q.x += abs(q.z) * 0.60;
  float fl = sdEllip(q, vec3(0.30, 0.07, 0.85));
  fl = max(fl, -sdEllip(q - vec3(-0.36, 0.0, 0.0), vec3(0.24, 0.30, 0.28)));
  d = smin(d, fl, 0.08);
  // pectoral fins: mirrored flat blades, swept back with a slight droop
  vec3 f = vec3(p.x - 0.08, p.y + 0.19, abs(p.z) - 0.55);
  f.xz = rot2(0.65) * f.xz;
  f.yz = rot2(-0.35) * f.yz;
  d = smin(d, sdEllip(f, vec3(0.16, 0.065, 0.56)), 0.07);
  // small raked dorsal fin
  vec3 g = p - vec3(-0.54, 0.36, 0.0);
  g.x += g.y * 0.9;
  d = smin(d, sdEllip(g, vec3(0.17, 0.18, 0.065)), 0.05);
  return d * s * 0.72;
}
void artifact(vec3 p, inout float curDist, inout vec3 glowColor, inout int id) {
    p -= artifactOffset;
    p = artifactRotation * p;
    float dist = whale(p, WHALE_SCALE);
    if (dist < curDist) {
        curDist = dist;
        id = 1;
    }
}
float objects(vec3 p, inout vec3 glowColor, inout int objId) {
    float dist = CAM_FAR;
    artifact(p, dist, glowColor, objId);
    return dist;
}
float artifactDist(vec3 p) {
    p -= artifactOffset;
    p = artifactRotation * p;
    return whale(p, WHALE_SCALE);
}
vec3 objectsNormal(vec3 p, float eps) {
    vec2 h = vec2(eps, 0);
    #define f artifactDist
    return normalize(vec3(f(p + h.xyy) - f(p - h.xyy),
                          f(p + h.yxy) - f(p - h.yxy),
                          f(p + h.yyx) - f(p - h.yyx)));
}
// All variants emit light over the entire body. These are emission colours,
// not a painted blue back / pale belly; the halo and water light share the hue.
vec3 lightTint() {
    if (uLightStyle < 0.5) return vec3(0.75, 0.55, 0.45);
    if (uLightStyle < 1.5) return vec3(0.22, 0.60, 1.0);
    return vec3(0.08, 0.32, 1.0);
}
vec3 lightCore() {
    if (uLightStyle < 0.5) return vec3(1.10, 1.00, 0.85);
    if (uLightStyle < 1.5) return vec3(0.72, 1.08, 1.45);
    return vec3(0.32, 0.66, 1.65);
}
vec3 objectsColor(int id, vec3 normal) {
    if (id == 1) { // artifact
        float l = dot(normal, normalize(vec3(0.0, 1.0, 0.5)));
        return lightCore() * (0.95 + 0.12 * max(l, 0.0)) * flicker;
    }
    return vec3(1.0, 1.0, 0.0); // shouldn't happen
}
// Soft, additive sparks: one ray test per spark instead of twenty SDF tests
// at every marching step. They fade into the sea without leaving dark dots.
// The nearest solid surface (whale or water) occludes light behind it.
vec3 stardustGlow(vec3 eye, vec3 ray, float maxDepth) {
    float glow = 0.0;
    for (int i = 0; i < NUM_PARTICLES; i++) {
        vec4 spark = uStardust[i];
        vec3 delta = spark.xyz - eye;
        float depth = dot(delta, ray);
        if (depth <= 0.0 || depth >= maxDepth || spark.w <= 0.001) continue;
        vec3 perpendicular = delta - ray * depth;
        float d2 = dot(perpendicular, perpendicular);
        if (d2 > 0.012) continue;
        float radius = max(0.010, depth * 0.70 / iResolution.y);
        float core = exp(-d2 / (radius * radius));
        float halo = exp(-d2 / 0.0012) * 0.07;
        glow += (core + halo) * spark.w;
    }
    return lightCore() * glow * 1.10;
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
    return lightTint() * halo * occ * flicker;
}
// Only the whale needs ray marching now; stars and halo are analytic lights.
// An inverted interval is a miss. Never clip light to this geometry bound.
vec2 objectBounds(vec3 eye, vec3 ray) {
    vec3 offset = eye - artifactOffset;
    float b = dot(offset, ray);
    float h = b * b - dot(offset, offset) + WHALE_BOUND * WHALE_BOUND;
    if (h < 0.0) return vec2(1.0, -1.0);
    float root = sqrt(h);
    return vec2(-b - root, -b + root);
}
void marchObjects(vec3 eye, vec3 ray, float wDepth, inout vec4 color) {
    vec2 bounds = objectBounds(eye, ray);
    float limit = min(wDepth, bounds.y);
    if (limit < max(0.0, bounds.x)) {
        vec3 halo = artifactHalo(eye, ray, wDepth);
        color.rgb += halo;
        gFish += halo;
        return;
    }
    float dist = 0.0;
    int id;
    vec3 rayPos = eye;
    float depth = 0.0;
    for (int i = 0; i < 100; i++) {
        depth = distance(rayPos, eye);
        if (depth > limit) {
            depth = wDepth; // the bounds only cull geometry, never its halo
            break;
        }
        dist = objects(rayPos, color.rgb, id);
        if (dist < (id == 1 ? 0.002 : 0.01)) {
            vec3 normal = vec3(0.0);
            if (id == 1) normal = objectsNormal(rayPos, 0.002);
            color = vec4(objectsColor(id, normal), depth);
            gWhaleHit = id == 1 ? 1.0 : 0.0;
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
        vec2 bounds = objectBounds(p, refl);
        float rayDepth = 0.0;
        float reflectionDepth = CAM_FAR;
        for (int i = 0; i < 40; i++) {
            // The old loop kept evaluating every object for all 40 steps even
            // after the reflected ray had left the scene (or missed it entirely).
            if (bounds.y < max(0.0, bounds.x) || rayDepth > bounds.y) break;
            dist = objects(rayPos, color, objId);
            if (dist < 0.01) {
                vec3 objNormal = vec3(0.0);
                if (objId == 1) objNormal = objectsNormal(rayPos, 0.001);
                color = objectsColor(objId, objNormal);
                reflectionDepth = rayDepth;
                break;
            }
            rayPos += refl * dist;
            rayDepth += dist;
        }
        color += stardustGlow(p, refl, reflectionDepth) * 0.55;
        color += artifactHalo(p, refl, CAM_FAR) * 0.35; // the glow mirrors too
    }
    float fresnel = (0.04 + 0.9 * (pow(1.0 - max(0.0, dot(-normal, ray)), 7.0)));
    vec3 lightOffset = artifactOffset - p;
    float d = length(lightOffset);
    const float r = 14.0;
    float atten = clamp(1.0 - (d*d) / (r*r), 0.0, 1.0);
    atten *= atten;
    vec3 point = lightTint() * atten * (1.0 + fresnel) * 0.07;
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
vec3 march(vec3 ray, vec3 camPos) {
    vec4 color = vec4(BACKGROUND, CAM_FAR);
    marchWater(camPos, ray, color);
    marchObjects(camPos, ray, color.w, color);
    vec3 stars = stardustGlow(camPos, ray, color.w);
    color.rgb += stars;
    gFish += stars;
    return color.rgb;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
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

    // Gentle broadside yaw keeps the head, long flippers and split flukes readable.
    float t = 0.30 + sin(time * 0.16) * 0.28;
    float s = sin(t);
    float c = cos(t);
    artifactRotation = mat3x3(c,0,s,
                              0,1,0,
                             -s,0,c);
    artifactRotation *= rotationAlign(vec3(0.0, 1.0, 0.0), normalize(vec3(sin(time * 0.4) * 0.10, 1.0, cos(time * 0.3) * 0.10 + 0.12)));
    artifactOffset = vec3(sin(time) * 0.4, cos(time * 0.5) * 0.3 - 1.7, -6.);
    flicker = mix(1.0, 1.1, sin(time * 2.0) * 0.5 + 0.5) + noise(time * 4.0) * -0.1 + 0.05;

    // camera animation
    camFwd = vec3(0.0, 0.7 + noise(time * 0.8 + 4.0) * 0.08 - 0.04, 1.0);
    camUp = vec3(noise(time * 1.2) * 0.02 - 0.01, 1.0, 0.0);

    vec3 camPos = vec3(0.0, 1.9, 1.0);
    mat4 vm = viewMatrix(camFwd, camUp);
    vec3 ray = (vm * vec4(calcRay(uv, 80.0, aspect), 1.0)).xyz;
    vec3 toWhale = artifactOffset - camPos;
    float whaleDepth = dot(toWhale, ray);
    bool mayHitWhale = whaleDepth > 0.0 &&
        dot(toWhale, toWhale) - whaleDepth * whaleDepth < WHALE_BOUND * WHALE_BOUND;
    // The body follows the screen saver's lifetime, independent of local holes.
    // Fade it only at entrance and the very end of the actual dismissal.
    float whaleAlpha = settle * (1.0 - smoothstep(0.90, 1.0, uDrain));
    float alpha = waterA * uOpaqueMax;
    // Transparent pixels still skip the scene except for the tiny whale bound.
    if (alpha <= 0.0 && (!mayHitWhale || whaleAlpha <= 0.0)) {
        fragColor = vec4(0.0);
        return;
    }

    gFish = vec3(0.0);
    gSea = vec3(0.0);
    gWhaleHit = 0.0;

    // scene
    vec3 color = march(ray, camPos);

    // vignette
    color -= (length(uv - 0.5) - 0.3) * 0.05;

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

    alpha = mix(alpha, whaleAlpha, gWhaleHit);
    fragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`,q=`// artifact-at-sea.wgsl — WebGPU twin of artifact-at-sea.glsl, used only for
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
  hdr   : vec4f, // xy HDR luminance multiples (1 = SDR), z light-style alternative
  stardust : array<vec4f, 20>, // world xyz and emission envelope, updated once per frame
};
@group(0) @binding(0) var<uniform> uni : U;

const CAM_FAR : f32 = 20.0;
const BACKGROUND : vec3f = vec3f(0.1, 0.1, 0.13);
const WATER_MARCH_ITERATIONS : i32 = 12;
const WATER_NORMAL_ITERATIONS : i32 = 39;
const PI : f32 = 3.14159265359;
const NUM_PARTICLES : i32 = 20;
const WHALE_SCALE : f32 = 0.20;
const WHALE_BOUND : f32 = 0.65; // animated body, flukes, fins and hit tolerance

var<private> artifactOffset : vec3f;
var<private> artifactRotation : mat3x3f;
var<private> flicker : f32;
var<private> camFwd : vec3f;
var<private> camUp : vec3f;
// HDR emission buckets — see the .glsl for the full story.
var<private> gFish : vec3f;
var<private> gSea : vec3f;
var<private> gWhaleHit : f32; // primary body coverage, never halo or reflections
var<private> time : f32;

// GLSL-parity smoothstep: keeps working with reversed edges.
fn ss(e0 : f32, e1 : f32, x : f32) -> f32 {
  let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
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
  // +beat propagates from the +x head to the -x tail, matching the GLSL.
  let unbent = p;
  let beat = time * 2.0;
  let tailness = ss(0.6, -1.6, p.x);
  p.y = p.y - (0.04 + 0.28 * tailness * tailness) * sin((p.x - 0.6) * 1.4 + beat);
  // blunt head flowing into a full chest, tapering into the tail stock
  var d = sdEllip(p - vec3f(0.60, 0.03, 0.0), vec3f(0.72, 0.30, 0.34));
  d = smin(d, sdEllip(p - vec3f(-0.15, 0.0, 0.0), vec3f(0.96, 0.31, 0.32)), 0.20);
  d = smin(d, sdEllip(p - vec3f(-1.10, 0.06, 0.0), vec3f(0.58, 0.13, 0.13)), 0.12);
  // flukes: a swept-back crescent with a trailing notch, pitching on the beat
  // The flukes follow the body's displacement and tangent without double warp.
  let tailPhase = (-1.68 - 0.6) * 1.4 + beat;
  let tailLift = 0.32 * sin(tailPhase);
  let tailSlope = 0.32 * 1.4 * cos(tailPhase);
  var q = unbent - vec3f(-1.68, 0.08 + tailLift, 0.0);
  let qxy = rot2(atan(tailSlope)) * q.xy;
  q = vec3f(qxy.x, qxy.y, q.z);
  q.x = q.x + abs(q.z) * 0.60;
  var fl = sdEllip(q, vec3f(0.30, 0.07, 0.85));
  fl = max(fl, -sdEllip(q - vec3f(-0.36, 0.0, 0.0), vec3f(0.24, 0.30, 0.28)));
  d = smin(d, fl, 0.08);
  // pectoral fins: mirrored flat blades, swept back with a slight droop
  var f = vec3f(p.x - 0.08, p.y + 0.19, abs(p.z) - 0.55);
  let fxz = rot2(0.65) * f.xz;
  f = vec3f(fxz.x, f.y, fxz.y);
  let fyz = rot2(-0.35) * f.yz;
  f = vec3f(f.x, fyz.x, fyz.y);
  d = smin(d, sdEllip(f, vec3f(0.16, 0.065, 0.56)), 0.07);
  // small raked dorsal fin
  var g = p - vec3f(-0.54, 0.36, 0.0);
  g.x = g.x + g.y * 0.9;
  d = smin(d, sdEllip(g, vec3f(0.17, 0.18, 0.065)), 0.05);
  return d * s * 0.72;
}
fn artifact(p0 : vec3f, curDist : ptr<function, f32>, id : ptr<function, i32>) {
  var p = p0 - artifactOffset;
  p = artifactRotation * p;
  let dist = whale(p, WHALE_SCALE);
  if (dist < *curDist) {
    *curDist = dist;
    *id = 1;
  }
}
fn objects(p : vec3f, objId : ptr<function, i32>) -> f32 {
  var dist = CAM_FAR;
  artifact(p, &dist, objId);
  return dist;
}
fn artifactDist(p0 : vec3f) -> f32 {
  var p = p0 - artifactOffset;
  p = artifactRotation * p;
  return whale(p, WHALE_SCALE);
}
fn objectsNormal(p : vec3f, eps : f32) -> vec3f {
  let h = vec2f(eps, 0.0);
  return normalize(vec3f(
    artifactDist(p + h.xyy) - artifactDist(p - h.xyy),
    artifactDist(p + h.yxy) - artifactDist(p - h.yxy),
    artifactDist(p + h.yyx) - artifactDist(p - h.yyx)));
}
// Self-emission palettes, shared by the body, halo, particles and water light.
fn lightTint() -> vec3f {
  if (uni.hdr.z < 0.5) { return vec3f(0.75, 0.55, 0.45); }
  if (uni.hdr.z < 1.5) { return vec3f(0.22, 0.60, 1.0); }
  return vec3f(0.08, 0.32, 1.0);
}
fn lightCore() -> vec3f {
  if (uni.hdr.z < 0.5) { return vec3f(1.10, 1.00, 0.85); }
  if (uni.hdr.z < 1.5) { return vec3f(0.72, 1.08, 1.45); }
  return vec3f(0.32, 0.66, 1.65);
}
fn objectsColor(id : i32, normal : vec3f) -> vec3f {
  if (id == 1) { // artifact
    let l = dot(normal, normalize(vec3f(0.0, 1.0, 0.5)));
    return lightCore() * (0.95 + 0.12 * max(l, 0.0)) * flicker;
  }
  return vec3f(1.0, 1.0, 0.0); // shouldn't happen
}
// Additive, fading sparks; solid whale/water depth occludes light behind it.
// Evaluate each spark once per ray, outside the expensive SDF marching loops.
fn stardustGlow(eye : vec3f, ray : vec3f, maxDepth : f32) -> vec3f {
  var glow = 0.0;
  for (var i = 0; i < NUM_PARTICLES; i++) {
    let spark = uni.stardust[i];
    let delta = spark.xyz - eye;
    let depth = dot(delta, ray);
    if (depth <= 0.0 || depth >= maxDepth || spark.w <= 0.001) { continue; }
    let perpendicular = delta - ray * depth;
    let d2 = dot(perpendicular, perpendicular);
    if (d2 > 0.012) { continue; }
    let radius = max(0.010, depth * 0.70 / uni.res.y);
    let core = exp(-d2 / (radius * radius));
    let halo = exp(-d2 / 0.0012) * 0.07;
    glow += (core + halo) * spark.w;
  }
  return lightCore() * glow * 1.10;
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
  return lightTint() * halo * occ * flicker;
}
// Only the whale needs ray marching; stars and halo extend beyond this bound.
fn objectBounds(eye : vec3f, ray : vec3f) -> vec2f {
  let offset = eye - artifactOffset;
  let b = dot(offset, ray);
  let h = b * b - dot(offset, offset) + WHALE_BOUND * WHALE_BOUND;
  if (h < 0.0) { return vec2f(1.0, -1.0); }
  let root = sqrt(h);
  return vec2f(-b - root, -b + root);
}
fn marchObjects(eye : vec3f, ray : vec3f, wDepth : f32, color : ptr<function, vec4f>) {
  let bounds = objectBounds(eye, ray);
  let limit = min(wDepth, bounds.y);
  if (limit < max(0.0, bounds.x)) {
    let halo = artifactHalo(eye, ray, wDepth);
    *color = vec4f((*color).rgb + halo, (*color).w);
    gFish += halo;
    return;
  }
  var dist = 0.0;
  var id = 0;
  var rayPos = eye;
  var depth = 0.0;
  var c = *color;
  for (var i = 0; i < 100; i++) {
    depth = distance(rayPos, eye);
    if (depth > limit) {
      depth = wDepth; // culling geometry must not clip the halo
      break;
    }
    dist = objects(rayPos, &id);
    if (dist < select(0.01, 0.002, id == 1)) {
      var normal = vec3f(0.0);
      if (id == 1) { normal = objectsNormal(rayPos, 0.002); }
      c = vec4f(objectsColor(id, normal), depth);
      gWhaleHit = select(0.0, 1.0, id == 1);
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
    let bounds = objectBounds(p, refl);
    var rayDepth = 0.0;
    var reflectionDepth = CAM_FAR;
    for (var i = 0; i < 40; i++) {
      // Stop once outside the scene, or skip rays that cannot hit any object.
      if (bounds.y < max(0.0, bounds.x) || rayDepth > bounds.y) { break; }
      dist = objects(rayPos, &objId);
      if (dist < 0.01) {
        var objNormal = vec3f(0.0);
        if (objId == 1) { objNormal = objectsNormal(rayPos, 0.001); }
        color = objectsColor(objId, objNormal);
        reflectionDepth = rayDepth;
        break;
      }
      rayPos += refl * dist;
      rayDepth += dist;
    }
    color += stardustGlow(p, refl, reflectionDepth) * 0.55;
    color += artifactHalo(p, refl, CAM_FAR) * 0.35; // the glow mirrors too
  }
  let fresnel = 0.04 + 0.9 * pow(1.0 - max(0.0, dot(-normal, ray)), 7.0);
  let lightOffset = artifactOffset - p;
  let d = length(lightOffset);
  let r = 14.0;
  var atten = clamp(1.0 - (d * d) / (r * r), 0.0, 1.0);
  atten *= atten;
  let pointLight = lightTint() * atten * (1.0 + fresnel) * 0.07;
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
fn march(ray : vec3f, camPos : vec3f) -> vec3f {
  var color = vec4f(BACKGROUND, CAM_FAR);
  marchWater(camPos, ray, &color);
  let wDepth = color.w;
  marchObjects(camPos, ray, wDepth, &color);
  let stars = stardustGlow(camPos, ray, color.w);
  color = vec4f(color.rgb + stars, color.w);
  gFish += stars;
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

  var waterA = clamp(washed * settle, 0.0, 1.0);

  let mrel = (uv - uMouse) * vec2f(aspect, 1.0);
  let dM = length(mrel);
  let warp = 0.07 * sin(uv.x * 13.0 + time * 0.7)
           + 0.06 * sin(uv.y * 17.0 - time * 0.5)
           + 0.04 * sin((uv.x + uv.y) * 9.0 + time * 0.9);
  let cut = ss(0.09, -0.09, dM - uDrain * 2.3 + warp); // 1 cleared -> 0 water
  waterA *= (1.0 - cut);

  // Gentle broadside yaw keeps the head, long flippers and split flukes readable.
  let t = 0.30 + sin(time * 0.16) * 0.28;
  let s = sin(t);
  let c = cos(t);
  artifactRotation = mat3x3f(vec3f(c, 0.0, s), vec3f(0.0, 1.0, 0.0), vec3f(-s, 0.0, c));
  artifactRotation = artifactRotation * rotationAlign(vec3f(0.0, 1.0, 0.0), normalize(vec3f(sin(time * 0.4) * 0.10, 1.0, cos(time * 0.3) * 0.10 + 0.12)));
  artifactOffset = vec3f(sin(time) * 0.4, cos(time * 0.5) * 0.3 - 1.7, -6.0);
  flicker = mix(1.0, 1.1, sin(time * 2.0) * 0.5 + 0.5) + noise(time * 4.0) * -0.1 + 0.05;

  // camera animation
  camFwd = vec3f(0.0, 0.7 + noise(time * 0.8 + 4.0) * 0.08 - 0.04, 1.0);
  camUp = vec3f(noise(time * 1.2) * 0.02 - 0.01, 1.0, 0.0);

  let camPos = vec3f(0.0, 1.9, 1.0);
  let vm = viewMatrix(camFwd, camUp);
  let ray = (vm * vec4f(calcRay(uv, 80.0, aspect), 1.0)).xyz;
  let toWhale = artifactOffset - camPos;
  let whaleDepth = dot(toWhale, ray);
  let mayHitWhale = whaleDepth > 0.0 &&
      dot(toWhale, toWhale) - whaleDepth * whaleDepth < WHALE_BOUND * WHALE_BOUND;
  // Body opacity is independent of the local hole; retain the lifecycle fade.
  let whaleAlpha = settle * (1.0 - ss(0.90, 1.0, uDrain));
  var alpha = waterA * uOpaqueMax;
  // Keep transparent-region culling outside the small animated whale bound.
  if (alpha <= 0.0 && (!mayHitWhale || whaleAlpha <= 0.0)) { return vec4f(0.0); }

  gFish = vec3f(0.0);
  gSea = vec3f(0.0);
  gWhaleHit = 0.0;

  // scene
  var color = march(ray, camPos);

  // vignette
  color -= vec3f((length(uv - 0.5) - 0.3) * 0.05);

  var col = color * 1.12;
  col += vec3f(0.80, 0.90, 1.0) * foam * 0.22 * (1.0 - uReveal * 0.5);

  // --- HDR compose — mirrors the .glsl -------------------------------------
  let kF = pow(max(uHdrFish, 1.0), 1.0 / 2.4);
  let kS = pow(max(uHdrSea, 1.0), 1.0 / 2.4);
  let seaW = ss(0.04, 0.30, dot(gSea, vec3f(0.299, 0.587, 0.114)));
  col += gFish * 1.12 * (kF - 1.0) + gSea * 1.12 * (kS - 1.0) * seaW;

  alpha = mix(alpha, whaleAlpha, gWhaleHit);
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
`;const R=l=>{const e=Math.max(0,Math.min(1,l));return e*e*(3-2*e)},g=l=>{const e=Math.sin(l*127.1+311.7)*43758.5453;return e-Math.floor(e)};function U(l,e){for(let t=0;t<20;t++){const n=l/5.6+t/20,o=Math.floor(n),a=(n-o)*5.6,s=l-a,i=t*13.7+o*7.9,c=-.95+g(i)*2.05,r=g(i+1)*Math.PI*2,h=Math.cos(r),O=Math.sin(r),M=Math.sqrt(Math.max(0,1-((c-.6)/.72)**2)),D=Math.sqrt(Math.max(0,1-((c+.15)/.96)**2)),I=(.04+.28*R((.6-c)/2.2)**2)*Math.sin((c-.6)*1.4+s*2),N=.1+g(i+2)*.045,E=c*.2-N*a,b=(h*(Math.max(M*.3,D*.31)+.025)+.02+I)*.2+(.045+h*.025)*a,L=O*((Math.max(M*.34,D*.32)+.025)*.2+.045*a),u=.3+Math.sin(s*.16)*.28,x=Math.cos(u)*E+Math.sin(u)*L,A=-Math.sin(u)*E+Math.cos(u)*L,T=Math.sin(s*.4)*.1,C=Math.cos(s*.3)*.1+.12,k=Math.hypot(T,1,C),f=-C/k,d=T/k,p=1/k,m=1/(1+p),P=.65*(1-Math.exp(-a/.65)),y=t*4;e[y]=(f*f*m+p)*x-d*b+f*d*m*A+Math.sin(s)*.4+Math.cos(s)*.4*P,e[y+1]=d*x+p*b-f*A+Math.cos(s*.5)*.3-1.7-Math.sin(s*.5)*.15*P,e[y+2]=f*d*m*x+f*b+(d*d*m+p)*A-6,e[y+3]=R(a/.35)*(1-R((a-2)/(5.6-2)))*(.75+.25*g(i+3))}}const j="(min-width: 1099px)",G="(prefers-reduced-motion: reduce)",B=8e3,V=60,S=1e3/V,z=.5,K=3.4,X=1.3,F=.55,_=1100,H=1,Y=3,$=1.7;function Q(){return/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className||"")}function v(l){return Math.max(0,Math.min(1,l))}function w(l){return l*l*(3-2*l)}const Z=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,J=`#version 300 es
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
uniform float uLightStyle;
uniform vec4 uStardust[20];
out vec4 _stColor;
${W}
void main() {
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  _stColor = c;
}`;class te{constructor(){Q()&&(this.mq=window.matchMedia(j),this.reduce=window.matchMedia(G),this.dyn=window.matchMedia("(dynamic-range: high)"),this.canvas=null,this.gl=null,this.gpu=null,this.backend="webgl",this.ready=!1,this.initPromise=null,this.hdrFish=1,this.hdrSea=1,this.prog=null,this.raf=null,this.running=!1,this.startTime=0,this.lastTick=0,this.nextFrame=0,this.idleTimer=null,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=H,this.lightStyle=0,this.stardust=new Float32Array(20*4),this.mode=0,this.dir=[1,0],this.mouse=[.5,.5],this.paused=!1,this.onActivity=this.onActivity.bind(this),this.onResize=this.onResize.bind(this),this.onVisibility=this.onVisibility.bind(this),this.tick=this.tick.bind(this),this.apply=this.apply.bind(this),this.onDynChange=this.onDynChange.bind(this),this.mq.addEventListener("change",this.apply),this.reduce.addEventListener("change",this.apply),this.dyn.addEventListener("change",this.onDynChange),this.apply(),window.__idleOcean=this)}apply(){const e=this.mq.matches&&!this.reduce.matches;e&&!this.canvas?this.enable():!e&&this.canvas&&this.disable()}onDynChange(){this.canvas&&(this.disable(),this.apply())}enable(){const e=document.createElement("canvas");e.className="idle-ocean",e.setAttribute("aria-hidden","true"),e.style.visibility="hidden",document.body.appendChild(e),this.canvas=e,this.ready=!1,this.initPromise=this.initBackend().then(t=>t?this.canvas?(this.ready=!0,this.resize(),window.addEventListener("mousemove",this.onActivity,{passive:!0}),window.addEventListener("wheel",this.onActivity,{passive:!0}),window.addEventListener("keydown",this.onActivity),window.addEventListener("pointerdown",this.onActivity,{passive:!0}),window.addEventListener("touchstart",this.onActivity,{passive:!0}),window.addEventListener("resize",this.onResize),document.addEventListener("visibilitychange",this.onVisibility),this.scheduleIdle(),!0):(this.destroyGpu(),!1):(this.disable(),!1))}disable(){this.stop(),clearTimeout(this.idleTimer),window.removeEventListener("mousemove",this.onActivity),window.removeEventListener("wheel",this.onActivity),window.removeEventListener("keydown",this.onActivity),window.removeEventListener("pointerdown",this.onActivity),window.removeEventListener("touchstart",this.onActivity),window.removeEventListener("resize",this.onResize),document.removeEventListener("visibilitychange",this.onVisibility),this.canvas&&this.canvas.remove(),this.canvas=null,this.gl=null,this.destroyGpu(),this.ready=!1}async initBackend(){if(this.dyn.matches&&!!navigator.gpu){try{if(await this.buildGpu())return this.backend="webgpu",this.hdrFish=Y,this.hdrSea=$,!0}catch(t){console.warn("[idle-ocean] WebGPU HDR init failed, using WebGL/SDR:",t)}this.destroyGpu(),this.freshCanvas()}return this.canvas?(this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.buildGl()):!1}freshCanvas(){if(!this.canvas)return;const e=this.canvas.cloneNode(!1);this.canvas.replaceWith(e),this.canvas=e}destroyGpu(){if(!this.gpu)return;const e=this.gpu;this.gpu=null;try{e.device.destroy()}catch{}}async buildGpu(){const e=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!e)return!1;const t=await e.requestDevice(),n=this.canvas&&this.canvas.getContext("webgpu");if(!n)return t.destroy(),!1;n.configure({device:t,format:"rgba16float",colorSpace:"srgb",toneMapping:{mode:"extended"},alphaMode:"premultiplied"});const o=typeof n.getConfiguration=="function"?n.getConfiguration():null;if(!o||!o.toneMapping||o.toneMapping.mode!=="extended")return t.destroy(),!1;const a=t.createShaderModule({code:q}),s=await a.getCompilationInfo();if(s.messages.some(h=>h.type==="error")){for(const h of s.messages)console.warn("[idle-ocean] wgsl "+h.lineNum+":"+h.linePos+" "+h.message);return t.destroy(),!1}const i=t.createRenderPipeline({layout:"auto",vertex:{module:a,entryPoint:"vmain"},fragment:{module:a,entryPoint:"fmain",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}}),c=t.createBuffer({size:(16+20*4)*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),r=t.createBindGroup({layout:i.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}}]});return this.gpu={device:t,ctx:n,pipeline:i,ubuf:c,bind:r,u:new Float32Array(16+20*4)},t.lost.then(h=>{this.gpu&&this.canvas&&(console.warn("[idle-ocean] WebGPU device lost ("+h.reason+"), falling back to WebGL"),this.gpu=null,this.backend="webgl",this.hdrFish=1,this.hdrSea=1,this.freshCanvas(),this.buildGl()?this.resize():this.disable())}),!0}buildGl(){const e=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1,powerPreference:"high-performance",depth:!1,stencil:!1});if(!e)return!1;this.gl=e;const t=(i,c)=>{const r=e.createShader(i);return e.shaderSource(r,c),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.warn("[idle-ocean] shader compile failed:",e.getShaderInfoLog(r)),null)},n=t(e.VERTEX_SHADER,Z),o=t(e.FRAGMENT_SHADER,J);if(!n||!o)return!1;const a=e.createProgram();if(e.attachShader(a,n),e.attachShader(a,o),e.bindAttribLocation(a,0,"p"),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))return console.warn("[idle-ocean] program link failed:",e.getProgramInfoLog(a)),!1;e.useProgram(a),this.prog=a;const s=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.uRes=e.getUniformLocation(a,"iResolution"),this.uTime=e.getUniformLocation(a,"iTime"),this.uReveal=e.getUniformLocation(a,"uReveal"),this.uOpaque=e.getUniformLocation(a,"uOpaqueMax"),this.uMode=e.getUniformLocation(a,"uMode"),this.uDir=e.getUniformLocation(a,"uDir"),this.uDrain=e.getUniformLocation(a,"uDrain"),this.uMouse=e.getUniformLocation(a,"uMouse"),this.uHdrFish=e.getUniformLocation(a,"uHdrFish"),this.uHdrSea=e.getUniformLocation(a,"uHdrSea"),this.uLightStyle=e.getUniformLocation(a,"uLightStyle"),this.uStardust=e.getUniformLocation(a,"uStardust[0]"),!0}resize(){if(!this.canvas)return;const e=Math.min(window.devicePixelRatio||1,1.5);let t=Math.round(window.innerWidth*e*F),n=Math.round(window.innerHeight*e*F);const o=Math.max(t,n);if(o>_){const a=_/o;t=Math.round(t*a),n=Math.round(n*a)}t=Math.max(1,t),n=Math.max(1,n),(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.gl&&this.gl.viewport(0,0,t,n))}scheduleIdle(){clearTimeout(this.idleTimer),!(document.hidden||this.paused)&&(this.idleTimer=setTimeout(()=>{this.phase==="idle"&&(this.pickEntrance(),this.reveal=0,this.drain=0,this.phase="reveal",this.start())},B))}pickEntrance(){const e=Math.random();this.mode=e<.34?0:e<.67?1:2;const t=Math.random()*Math.PI*2;this.dir=[Math.cos(t),Math.sin(t)]}onActivity(e){this.paused||(e&&typeof e.clientX=="number"&&(this.mouse=[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight]),(this.phase==="reveal"||this.phase==="hold")&&(this.phase="drain",this.start()),this.scheduleIdle())}onResize(){this.running&&this.resize()}onVisibility(){document.hidden?(this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),clearTimeout(this.idleTimer)):this.scheduleIdle()}start(){this.running||this.paused||(this.resize(),this.running=!0,this.startTime||(this.startTime=performance.now()),this.canvas&&(this.canvas.style.visibility="visible"),this.lastTick=performance.now(),this.nextFrame=this.lastTick+S,this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,this.raf&&cancelAnimationFrame(this.raf),this.raf=null}tick(e){if(!this.running||(this.raf=requestAnimationFrame(this.tick),e+z<this.nextFrame))return;const t=(e-this.lastTick)/1e3;if(this.lastTick=e,this.nextFrame+=Math.max(1,Math.floor((e+z-this.nextFrame)/S)+1)*S,this.phase==="reveal")this.reveal=Math.min(1,this.reveal+t/K),this.reveal>=1&&(this.phase="hold");else if(this.phase==="drain"&&(this.drain=Math.min(1,this.drain+t/X),this.drain>=1)){this.phase="idle",this.reveal=0,this.drain=0,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop();return}this.renderFrame(e)}renderFrame(e){if(!this.ready||!this.canvas)return;const t=((e||performance.now())-this.startTime)/1e3;if(U(t,this.stardust),this.backend==="webgpu"&&this.gpu){this.renderGpu(t);return}const n=this.gl;n&&(n.uniform3f(this.uRes,this.canvas.width,this.canvas.height,1),n.uniform1f(this.uTime,t),n.uniform1f(this.uReveal,w(v(this.reveal))),n.uniform1f(this.uOpaque,this.opaqueMax),n.uniform1f(this.uMode,this.mode),n.uniform2f(this.uDir,this.dir[0],this.dir[1]),n.uniform1f(this.uDrain,w(v(this.drain))),n.uniform2f(this.uMouse,this.mouse[0],this.mouse[1]),n.uniform1f(this.uHdrFish,this.hdrFish),n.uniform1f(this.uHdrSea,this.hdrSea),n.uniform1f(this.uLightStyle,this.lightStyle),n.uniform4fv(this.uStardust,this.stardust),n.drawArrays(n.TRIANGLES,0,3))}renderGpu(e){const{device:t,ctx:n,pipeline:o,ubuf:a,bind:s,u:i}=this.gpu;i[0]=this.canvas.width,i[1]=this.canvas.height,i[2]=1,i[3]=e,i[4]=w(v(this.reveal)),i[5]=this.opaqueMax,i[6]=this.mode,i[7]=w(v(this.drain)),i[8]=this.dir[0],i[9]=this.dir[1],i[10]=this.mouse[0],i[11]=this.mouse[1],i[12]=this.hdrFish,i[13]=this.hdrSea,i[14]=this.lightStyle,i.set(this.stardust,16),t.queue.writeBuffer(a,0,i);const c=t.createCommandEncoder(),r=c.beginRenderPass({colorAttachments:[{view:n.getCurrentTexture().createView(),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:0},storeOp:"store"}]});r.setPipeline(o),r.setBindGroup(0,s),r.draw(3),r.end(),t.queue.submit([c.finish()])}debugSet(e={}){this.paused=!0,clearTimeout(this.idleTimer),this.stop(),this.canvas||this.enable(),typeof e.opaqueMax=="number"&&(this.opaqueMax=e.opaqueMax),typeof e.mode=="number"&&(this.mode=e.mode),Array.isArray(e.dir)&&(this.dir=e.dir),Array.isArray(e.mouse)&&(this.mouse=e.mouse),typeof e.reveal=="number"&&(this.reveal=v(e.reveal)),typeof e.drain=="number"&&(this.drain=v(e.drain)),typeof e.hdrFish=="number"&&(this.hdrFish=e.hdrFish),typeof e.hdrSea=="number"&&(this.hdrSea=e.hdrSea),Number.isFinite(e.lightStyle)&&(this.lightStyle=Math.max(0,Math.min(2,Math.round(e.lightStyle)))),this.startTime||(this.startTime=performance.now());const t=()=>{this.resize(),this.canvas.style.visibility="visible",this.renderFrame(performance.now())};return this.ready?t():this.initPromise&&this.initPromise.then(n=>{n&&this.paused&&t()}),{reveal:this.reveal,drain:this.drain,opaqueMax:this.opaqueMax,mode:this.mode,backend:this.backend,hdrFish:this.hdrFish,hdrSea:this.hdrSea,lightStyle:this.lightStyle}}reset(){this.paused=!1,this.phase="idle",this.reveal=0,this.drain=0,this.opaqueMax=H,this.canvas&&(this.canvas.style.visibility="hidden"),this.stop(),this.scheduleIdle()}}export{te as IdleOcean};
