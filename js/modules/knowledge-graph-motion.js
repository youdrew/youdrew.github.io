// Motion variants share geometry, colors and forces so comparisons isolate feel.
export const GRAPH_MOTIONS = {
  light: {
    name: ['A · 轻盈回弹', 'A · Light spring'],
    description: [
      '响应轻快，局部联动，松手后较快停下。',
      'Quick response, local movement and a short settling time.',
    ],
    damping: 0.34,
    cooling: 0.038,
    dragAlpha: 0.24,
    dragTarget: 0.065,
    inertia: 0.25,
  },
  spring: {
    name: ['B · 柔韧蛛网', 'B · Elastic web'],
    description: [
      '拖一个点，周围跟着舒展；回弹更明显，余韵更长。',
      'Neighbors stretch with your drag, with a softer, longer rebound.',
    ],
    damping: 0.18,
    cooling: 0.025,
    dragAlpha: 0.38,
    dragTarget: 0.12,
    inertia: 0.7,
  },
  float: {
    name: ['C · 漂浮星图', 'C · Floating map'],
    description: [
      '轻微持续漂浮，交互更活泼；闲置时仍以低帧率绘制，离屏暂停。',
      'Gentle continuous drift. Low-rate drawing while idle; pauses offscreen.',
    ],
    damping: 0.28,
    cooling: 0.032,
    dragAlpha: 0.3,
    dragTarget: 0.09,
    inertia: 0.5,
    floating: true,
  },
};

export function graphMotion(id) {
  return Object.hasOwn(GRAPH_MOTIONS, id) ? GRAPH_MOTIONS[id] : GRAPH_MOTIONS.spring;
}

export function applyGraphMotion(simulation, preset, reducedMotion = false) {
  simulation.velocityDecay(reducedMotion ? 0.55 : preset.damping).alphaDecay(preset.cooling);
  let phase = 0;
  const drift = () => {
    phase += 0.028;
    for (const node of simulation.nodes()) {
      if (node.fx != null || node.fy != null) continue;
      // Bounded, slow forces: no random re-layout and no timer of their own.
      node.vx += Math.sin(phase + node.index * 0.73) * 0.16;
      node.vy += Math.cos(phase * 0.8 + node.index * 0.57) * 0.12;
    }
  };
  simulation.force('drift', preset.floating && !reducedMotion ? drift : null);
}
