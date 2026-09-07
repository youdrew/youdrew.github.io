import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createGraphSimulation(nodes, links) {
  const spacing = clamp(1 + Math.log2(Math.max(nodes.length, 50) / 50) * 0.16, 1, 1.6);
  const degrees = new Map(nodes.map((node) => [node.name, 0]));
  links.forEach((link) => {
    degrees.set(link.source, (degrees.get(link.source) || 0) + 1);
    degrees.set(link.target, (degrees.get(link.target) || 0) + 1);
  });
  // A deterministic sunflower seed is linear-time and spreads new tags out.
  nodes.forEach((node, index) => {
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const radius = 45 * spacing * Math.sqrt(index + 0.5);
    node.anchor ||= { x: Math.cos(angle) * 750, y: Math.sin(angle) * 300 };
    node.x = node.anchor.x + Math.cos(angle) * radius;
    node.y = node.anchor.y + Math.sin(angle) * radius;
  });
  return (
    forceSimulation(nodes)
      .stop()
      .alphaDecay(0.035)
      .alphaMin(0.005)
      .velocityDecay(0.48)
      .force(
        'link',
        forceLink(links)
          .id((node) => node.name)
          .distance((link) => (175 + 90 / Math.sqrt(link.value || 1)) * spacing)
          .strength(
            (link) =>
              0.18 /
              Math.sqrt(
                Math.max(1, Math.min(degrees.get(link.source.name), degrees.get(link.target.name)))
              )
          )
      )
      // Barnes–Hut groups distant nodes: O(n log n), instead of all node pairs.
      .force(
        'charge',
        forceManyBody()
          .strength((node) => (node.guide ? -1000 : -650) * spacing)
          .distanceMin(35)
          .theta(0.9)
      )
      .force(
        'collision',
        forceCollide(
          (node) => (node.symbolSize / 2 + (node.guide ? 125 : 38)) * spacing
        ).iterations(2)
      )
      .force('x', forceX((node) => node.anchor.x * spacing).strength(0.08))
      .force('y', forceY((node) => node.anchor.y * spacing).strength(0.12))
  );
}

export function fitCamera(nodes, width, height, padding = 48) {
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  nodes.forEach((node) => {
    const r = node.symbolSize / 2 + 12;
    left = Math.min(left, node.x - r);
    right = Math.max(right, node.x + r);
    top = Math.min(top, node.y - r);
    bottom = Math.max(bottom, node.y + r);
  });
  if (!nodes.length) return { x: width / 2, y: height / 2, k: 1 };
  const k = clamp(
    Math.min(
      Math.max(1, width - padding * 2) / Math.max(1, right - left),
      Math.max(1, height - padding * 2) / Math.max(1, bottom - top),
      1.2
    ),
    0.04,
    4
  );
  return { x: width / 2 - ((left + right) * k) / 2, y: height / 2 - ((top + bottom) * k) / 2, k };
}

export function worldPoint(camera, point) {
  return { x: (point.x - camera.x) / camera.k, y: (point.y - camera.y) / camera.k };
}

export function zoomCamera(camera, point, factor) {
  const world = worldPoint(camera, point);
  const k = clamp(camera.k * factor, 0.04, 4);
  return { x: point.x - world.x * k, y: point.y - world.y * k, k };
}

export function nodeRadius(node, zoom) {
  return Math.max(4, (node.symbolSize / 2) * Math.sqrt(zoom));
}

// Screen-space collision grid: labels never overlap other labels or nodes,
// while zooming reveals more detail without changing the tag data.
export class LabelGrid {
  constructor() {
    this.cells = new Map();
  }
  keys(box) {
    const keys = [];
    for (let x = Math.floor(box.x / 64); x <= Math.floor((box.x + box.w) / 64); x++) {
      for (let y = Math.floor(box.y / 32); y <= Math.floor((box.y + box.h) / 32); y++)
        keys.push(`${x},${y}`);
    }
    return keys;
  }
  intersects(box) {
    return this.keys(box).some((key) =>
      (this.cells.get(key) || []).some(
        (other) =>
          box.x < other.x + other.w &&
          box.x + box.w > other.x &&
          box.y < other.y + other.h &&
          box.y + box.h > other.y
      )
    );
  }
  add(box) {
    this.keys(box).forEach((key) => {
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(box);
    });
  }
}
