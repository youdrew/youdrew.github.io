export const NUM_PARTICLES = 20;
const LIFETIME = 5.6;
const WHALE_SCALE = 0.2; // Match the whale SDF in both shaders.
const smooth = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const random = (seed) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

// Calculate once per frame, not once per ocean pixel. Each spark remembers the
// whale's pose at birth, so it drifts freely instead of sticking to its body.
// The reusable vec4 buffer contains world xyz and a smooth emission envelope.
export function updateStardust(time, out) {
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const cycle = time / LIFETIME + i / NUM_PARTICLES;
    const generation = Math.floor(cycle);
    const age = (cycle - generation) * LIFETIME;
    const born = time - age;
    const seed = i * 13.7 + generation * 7.9;
    const x = -0.95 + random(seed) * 2.05;
    const angle = random(seed + 1) * Math.PI * 2;
    const ny = Math.cos(angle);
    const nz = Math.sin(angle);
    const head = Math.sqrt(Math.max(0, 1 - ((x - 0.6) / 0.72) ** 2));
    const chest = Math.sqrt(Math.max(0, 1 - ((x + 0.15) / 0.96) ** 2));
    const tailness = smooth((0.6 - x) / 2.2);
    const bend = (0.04 + 0.28 * tailness ** 2) * Math.sin((x - 0.6) * 1.4 + born * 2);
    // The main body's envelope, including its swim bend. Drift begins at the
    // skin, with a gentle current toward the -x tail and a little buoyancy.
    const speed = 0.1 + random(seed + 2) * 0.045;
    const lx = x * WHALE_SCALE - speed * age;
    const ly =
      (ny * (Math.max(head * 0.3, chest * 0.31) + 0.025) + 0.02 + bend) * WHALE_SCALE +
      (0.045 + ny * 0.025) * age;
    const lz = nz * ((Math.max(head * 0.34, chest * 0.32) + 0.025) * WHALE_SCALE + 0.045 * age);

    // Inverse of the shaders' broadside yaw * rotationAlign(up, bank), sampled
    // at birth. Keep the pose formulas in sync with artifactRotation/Offset.
    const yaw = 0.3 + Math.sin(born * 0.16) * 0.28;
    const rx = Math.cos(yaw) * lx + Math.sin(yaw) * lz;
    const rz = -Math.sin(yaw) * lx + Math.cos(yaw) * lz;
    const bankX = Math.sin(born * 0.4) * 0.1;
    const bankZ = Math.cos(born * 0.3) * 0.1 + 0.12;
    const bankLength = Math.hypot(bankX, 1, bankZ);
    const vx = -bankZ / bankLength;
    const vz = bankX / bankLength;
    const c = 1 / bankLength;
    const k = 1 / (1 + c);
    // Newly shed light shares the whale's velocity, then settles into the
    // current. Otherwise a swimming whale leaves its own sparks too abruptly.
    const carried = 0.65 * (1 - Math.exp(-age / 0.65));
    const offset = i * 4;
    out[offset] =
      (vx * vx * k + c) * rx -
      vz * ly +
      vx * vz * k * rz +
      Math.sin(born) * 0.4 +
      Math.cos(born) * 0.4 * carried;
    out[offset + 1] =
      vz * rx +
      c * ly -
      vx * rz +
      Math.cos(born * 0.5) * 0.3 -
      1.7 -
      Math.sin(born * 0.5) * 0.15 * carried;
    out[offset + 2] = vx * vz * k * rx + vx * ly + (vz * vz * k + c) * rz - 6;
    out[offset + 3] =
      smooth(age / 0.35) *
      (1 - smooth((age - 2.0) / (LIFETIME - 2.0))) *
      (0.75 + 0.25 * random(seed + 3));
  }
}
