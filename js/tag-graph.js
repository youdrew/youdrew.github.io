import { KnowledgeGraph } from './modules/knowledge-graph.js';

// Keep the existing article sizes and semantic color palette. The graph owns
// copies because the force solver updates coordinates and resolves link ends.
export function initTagGraph() {
  const container = document.getElementById('tag-graph');
  const graphContainer = document.getElementById('tag-graph-container');
  const source = window.__TAG_GRAPH_DATA__;
  if (!container || !source?.nodes?.length || container.dataset.ready) return;
  container.dataset.ready = 'true';
  const data = {
    ...source,
    nodes: source.nodes.map((node) => ({ ...node })),
    links: (source.links || []).map((link) => ({ ...link })),
  };

  // Archive filter tags (guide nodes)
  const archiveFilterTags = data.archiveFilterTags || [];
  const archiveFilterSet = {};
  archiveFilterTags.forEach(function (t) {
    archiveFilterSet[t] = true;
  });

  function normalizeTagKey(name) {
    return String(name || '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // === Node size: determined by article count (node.value) ===
  // Edge count is still tracked separately, only used to scale label font size.
  const edgeCount = {};
  data.links.forEach(function (link) {
    edgeCount[link.source] = (edgeCount[link.source] || 0) + 1;
    edgeCount[link.target] = (edgeCount[link.target] || 0) + 1;
  });
  let maxValue = 1;
  data.nodes.forEach(function (node) {
    const v = node.value || 0;
    if (v > maxValue) maxValue = v;
  });
  data.nodes.forEach(function (node) {
    const v = node.value || 0;
    node.symbolSize = Math.max(12, Math.min(70, 12 + v * (58 / maxValue)));
  });

  // === BFS distance from archive_filter_tags ===
  const adj = {};
  data.nodes.forEach(function (n) {
    adj[n.name] = [];
  });
  function addAdjacency(a, b) {
    if (!adj[a] || !adj[b] || a === b) return;
    if (adj[a].indexOf(b) === -1) adj[a].push(b);
    if (adj[b].indexOf(a) === -1) adj[b].push(a);
  }
  data.links.forEach(function (link) {
    addAdjacency(link.source, link.target);
  });

  // Treat tags that differ only by hyphen vs space as the same semantic neighborhood
  // for coloring purposes, so aliases like Color-Management / Color Management
  // don't break the distance gradient.
  const aliasGroups = {};
  data.nodes.forEach(function (node) {
    const key = normalizeTagKey(node.name);
    if (!aliasGroups[key]) aliasGroups[key] = [];
    aliasGroups[key].push(node.name);
  });
  Object.keys(aliasGroups).forEach(function (key) {
    const group = aliasGroups[key];
    if (group.length < 2) return;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        addAdjacency(group[i], group[j]);
      }
    }
  });
  // === Color assignment ===
  // High-contrast palette: maximally separated hues for filter tags
  const filterPalette = [
    { h: 260, s: 62, l: 50 }, // purple
    { h: 15, s: 80, l: 55 }, // orange-red
    { h: 160, s: 60, l: 42 }, // teal-green
    { h: 220, s: 72, l: 52 }, // blue
    { h: 340, s: 70, l: 52 }, // rose-pink
    { h: 45, s: 85, l: 50 }, // amber
    { h: 190, s: 70, l: 45 }, // cyan
    { h: 90, s: 55, l: 45 }, // lime-green
    { h: 290, s: 60, l: 50 }, // magenta
    { h: 30, s: 75, l: 48 }, // burnt orange
    { h: 130, s: 50, l: 42 }, // forest green
    { h: 0, s: 70, l: 55 }, // red
  ];

  function hslToStr(h, s, l) {
    return 'hsl(' + Math.round(h) + ', ' + Math.round(s) + '%, ' + Math.round(l) + '%)';
  }

  const colorMap = {};
  const filterHSL = {}; // store HSL for each filter tag
  const filterNodes = data.nodes.filter(function (n) {
    return archiveFilterSet[n.name];
  });
  filterNodes.sort(function (a, b) {
    return b.value - a.value;
  });
  filterNodes.forEach(function (node, i) {
    const c = filterPalette[i % filterPalette.length];
    filterHSL[node.name] = c;
    colorMap[node.name] = hslToStr(c.h, c.s, c.l);
  });

  // BFS distance from each individual filter tag to all nodes
  const distFromFilter = {}; // distFromFilter[filterName][nodeName] = BFS distance
  archiveFilterTags.forEach(function (ft) {
    if (adj[ft] === undefined) return;
    const d = {};
    d[ft] = 0;
    const q = [ft];
    let qi = 0;
    while (qi < q.length) {
      const c = q[qi++];
      (adj[c] || []).forEach(function (nb) {
        if (d[nb] === undefined) {
          d[nb] = d[c] + 1;
          q.push(nb);
        }
      });
    }
    distFromFilter[ft] = d;
  });

  // Non-filter tags: weighted color blending from all reachable filter tags
  // Using inverse-square weighting for perceptual distance attenuation
  const nonFilterNodes = data.nodes.filter(function (n) {
    return !archiveFilterSet[n.name];
  });

  // Find global max BFS distance for normalization
  let globalMaxDist = 1;
  nonFilterNodes.forEach(function (node) {
    let closest = Infinity;
    archiveFilterTags.forEach(function (ft) {
      if (!distFromFilter[ft]) return;
      const d = distFromFilter[ft][node.name];
      if (d !== undefined && d < closest) closest = d;
    });
    if (closest < Infinity && closest > globalMaxDist) globalMaxDist = closest;
  });

  nonFilterNodes.forEach(function (node) {
    const weights = [];
    let totalWeight = 0;
    archiveFilterTags.forEach(function (ft) {
      if (!distFromFilter[ft] || !filterHSL[ft]) return;
      let d = distFromFilter[ft][node.name];
      if (d === undefined) return; // unreachable
      if (d === 0) d = 0.5;
      // Inverse-square: 1/d^2 gives natural perceptual falloff
      const w = 1.0 / (d * d);
      weights.push({ ft: ft, w: w });
      totalWeight += w;
    });

    if (totalWeight === 0) {
      // Disconnected from all filter tags → neutral gray
      colorMap[node.name] = 'hsl(0, 0%, 82%)';
      return;
    }

    // Circular mean for hue (to handle wrap-around, e.g. 350° + 10°)
    let sinSum = 0,
      cosSum = 0,
      sSum = 0,
      lSum = 0;
    weights.forEach(function (wt) {
      const nw = wt.w / totalWeight;
      const c = filterHSL[wt.ft];
      const hRad = (c.h * Math.PI) / 180;
      sinSum += Math.sin(hRad) * nw;
      cosSum += Math.cos(hRad) * nw;
      sSum += c.s * nw;
      lSum += c.l * nw;
    });
    let blendH = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
    if (blendH < 0) blendH += 360;
    let blendS = sSum;
    let blendL = lSum;

    // Perceptual fade: normalize closest distance to [0, 1] based on actual graph diameter
    let closestDist = Infinity;
    weights.forEach(function (wt) {
      const d = distFromFilter[wt.ft][node.name];
      if (d < closestDist) closestDist = d;
    });
    // t=0 means directly adjacent to filter, t=1 means farthest node
    let t = (closestDist - 1) / Math.max(globalMaxDist - 1, 1);
    t = Math.max(0, Math.min(1, t));
    // Fade by moving toward a lighter pastel, not toward grayscale.
    const tPerceptual = Math.pow(t, 0.85);
    const minSaturation = 32;
    const satScale = 1 - tPerceptual * 0.35;
    blendS = Math.max(minSaturation, blendS * satScale);
    // Lightness: shift toward a soft pastel range for distant nodes.
    blendL = blendL + tPerceptual * (82 - blendL) * 0.78;

    colorMap[node.name] = hslToStr(blendH, blendS, blendL);
  });

  data.nodes.forEach((node) => {
    node.color = colorMap[node.name];
    node.guide = !!archiveFilterSet[node.name];
    node.fontSize = Math.max(10, Math.min(15, 9 + (edgeCount[node.name] || 0) * 0.5));
    let closest = Infinity;
    filterNodes.forEach((filter, index) => {
      const distance = distFromFilter[filter.name]?.[node.name];
      if (distance !== undefined && distance < closest) {
        closest = distance;
        const angle = (index * Math.PI * 2) / filterNodes.length - Math.PI / 2;
        node.anchor = { x: Math.cos(angle) * 600, y: Math.sin(angle) * 320 };
      }
    });
  });
  // Disconnected notes still form their own small islands. Give connected
  // gray tags a shared anchor so their edges don't cross unrelated topics.
  const unanchored = new Map(
    data.nodes.filter((node) => !node.anchor).map((node) => [node.name, node])
  );
  const islands = [];
  while (unanchored.size) {
    const queue = [unanchored.values().next().value];
    unanchored.delete(queue[0].name);
    for (let index = 0; index < queue.length; index++) {
      (adj[queue[index].name] || []).forEach((name) => {
        if (unanchored.has(name)) {
          queue.push(unanchored.get(name));
          unanchored.delete(name);
        }
      });
    }
    islands.push(queue);
  }
  islands.forEach((island, index) => {
    island.forEach((node) => {
      node.anchor = { x: -950, y: (index - (islands.length - 1) / 2) * 200 };
    });
  });
  return new KnowledgeGraph(container, graphContainer, data);
}
