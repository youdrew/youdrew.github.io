#define time iTime

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
// glow. In SDR both ride inside `color` untouched; when the canvas has real
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
