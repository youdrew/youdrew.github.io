import {
  createGraphSimulation,
  fitCamera,
  worldPoint,
  zoomCamera,
  nodeRadius,
  LabelGrid,
} from './knowledge-graph-layout.js';
import { GRAPH_MOTIONS, graphMotion, applyGraphMotion } from './knowledge-graph-motion.js';

const FONT = '"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const icons = {
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8"/>',
  fullscreen: '<path d="M14 3h7v7M10 21H3v-7M21 3l-7 7M3 21l7-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
};

export class KnowledgeGraph {
  constructor(container, host, data) {
    this.container = container;
    this.host = host;
    this.data = data;
    this.nodes = data.nodes;
    this.links = data.links;
    this.abort = new AbortController();
    this.pointers = new Map();
    this.camera = { x: 0, y: 0, k: 1 };
    this.visible = true;
    this.ready = false;
    this.frame = 0;
    this.fitted = true;
    this.fullscreen = false;
    this.dragMode = false;
    this.toolbarOpen = false;
    const params = new URLSearchParams(location.search);
    this.motionId = Object.hasOwn(GRAPH_MOTIONS, params.get('graph-motion'))
      ? params.get('graph-motion')
      : 'spring';
    this.motion = graphMotion(this.motionId);
    this.compareMotions = params.has('graph-compare');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.compactMedia = matchMedia('(max-width: 768px), (pointer: coarse)');
    this.language = document.documentElement.lang;
    this.translations = {};
    Object.entries(data.tagTranslations || {}).forEach(([name, translation]) => {
      this.translations[name] = translation;
      this.translations[name.replace(/-/g, ' ')] = translation;
    });
    this.neighbors = new Map(this.nodes.map((node) => [node.name, new Set([node.name])]));
    this.links.forEach((link) => {
      this.neighbors.get(link.source)?.add(link.target);
      this.neighbors.get(link.target)?.add(link.source);
    });
    this.simulation = createGraphSimulation(this.nodes, this.links);
    this.canvas = document.createElement('canvas');
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.container.replaceChildren(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.createControls();
    if (this.compareMotions) this.createComparison();
    this.updateLanguage();
    this.bindEvents();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
      this.resume();
    });
    this.visibilityObserver.observe(host);
    this.languageObserver = new MutationObserver(() => {
      if (this.language !== document.documentElement.lang) {
        this.language = document.documentElement.lang;
        this.updateLanguage();
      }
    });
    this.languageObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });
    document.fonts?.ready.then(() => {
      if (!this.abort.signal.aborted) this.updateLanguage();
    });
    this.schedule();
  }

  on(target, name, callback, options = {}) {
    target.addEventListener(name, callback, { ...options, signal: this.abort.signal });
  }

  text(zh, en) {
    return this.language === 'zh-CN' ? zh : en;
  }
  name(node) {
    return this.language === 'zh-CN' ? this.translations[node.name] || node.name : node.name;
  }
  icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  }

  createControls() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'tag-graph-toolbar';
    this.toolbar.id = 'tag-graph-tools';
    this.toolbar.hidden = true;
    this.canvas.setAttribute('aria-keyshortcuts', 'T');
    this.canvas.setAttribute('aria-controls', this.toolbar.id);
    this.picker = document.createElement('select');
    this.picker.className = 'tag-graph-picker';
    this.toolbar.append(this.picker);
    this.buttons = {};
    const button = (key, icon, action) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tag-graph-control';
      if (key === 'plus' || key === 'minus') el.classList.add('tag-graph-zoom');
      el.innerHTML = this.icon(icon);
      this.on(el, 'click', action);
      this.buttons[key] = el;
      this.toolbar.append(el);
      return el;
    };
    button('minus', 'minus', () => this.zoom(1 / 1.35));
    button('plus', 'plus', () => this.zoom(1.35));
    button('fit', 'fit', () => {
      this.clearSelection();
      this.fit();
    });
    button('fullscreen', 'fullscreen', () =>
      this.fullscreen ? this.closeFullscreen() : this.enterFullscreen()
    );
    this.modeButton = document.createElement('button');
    this.modeButton.type = 'button';
    this.modeButton.className = 'tag-graph-control tag-graph-mode';
    this.modeButton.setAttribute('aria-pressed', 'false');
    this.on(this.modeButton, 'click', () => {
      this.cancelGesture();
      this.dragMode = !this.dragMode;
      this.updateInstructions();
    });
    this.toolbar.append(this.modeButton);
    this.on(this.picker, 'change', () => {
      const node = this.nodes.find((item) => item.name === this.picker.value);
      if (node) {
        this.fitted = false;
        this.camera.k = Math.max(this.camera.k, 0.85);
        this.camera.x = this.width / 2 - node.x * this.camera.k;
        const focusY = this.fullscreen ? this.height * 0.35 : Math.max(96, this.height * 0.23);
        this.camera.y = focusY - node.y * this.camera.k;
        this.select({ node });
      } else this.clearSelection();
      this.schedule();
    });
    this.panel = document.createElement('section');
    this.panel.className = 'tag-graph-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', this.text('标签相关文章', 'Related articles'));
    this.panel.setAttribute('aria-live', 'polite');
    this.loading = document.createElement('div');
    this.loading.className = 'graph-loading';
    this.hint = this.host.querySelector('.tag-graph-hint');
    this.hint.removeAttribute('data-i18n');
    this.hint.id = 'tag-graph-instructions';
    this.canvas.setAttribute('aria-describedby', this.hint.id);
    this.host.append(this.toolbar, this.panel, this.loading);
    this.picker.disabled = true;
    ['plus', 'minus', 'fit'].forEach((key) => {
      this.buttons[key].disabled = true;
    });
  }

  setToolbarOpen(open) {
    this.toolbarOpen = open;
    this.updateToolbar();
    this.schedule();
  }

  updateToolbar() {
    // Visibility belongs to this interaction, never to screen size or restored page state.
    this.toolbar.hidden = !this.toolbarOpen;
  }

  createComparison() {
    this.comparison = document.createElement('div');
    this.comparison.className = 'tag-graph-comparison';
    const choices = document.createElement('div');
    choices.className = 'tag-graph-motion-choices';
    choices.setAttribute('role', 'group');
    this.motionButtons = {};
    Object.keys(GRAPH_MOTIONS).forEach((id) => {
      const button = document.createElement('button');
      button.type = 'button';
      this.on(button, 'click', () => this.setMotion(id));
      this.motionButtons[id] = button;
      choices.append(button);
    });
    this.motionDescription = document.createElement('p');
    this.motionDescription.setAttribute('aria-live', 'polite');
    this.demoButton = document.createElement('button');
    this.demoButton.type = 'button';
    this.demoButton.className = 'tag-graph-demo';
    this.demoButton.disabled = true;
    this.on(this.demoButton, 'click', () => this.startDemo());
    this.comparison.append(choices, this.demoButton, this.motionDescription);
    this.host.before(this.comparison);
  }

  updateComparison() {
    if (!this.comparison) return;
    const languageIndex = this.language === 'zh-CN' ? 0 : 1;
    Object.entries(this.motionButtons).forEach(([id, button]) => {
      button.textContent = GRAPH_MOTIONS[id].name[languageIndex];
      button.setAttribute('aria-pressed', String(id === this.motionId));
      button.disabled = !this.ready;
    });
    this.motionDescription.textContent = this.motion.description[languageIndex];
    this.demoButton.textContent = this.demo
      ? this.text('演示中…', 'Demonstrating…')
      : this.text('演示拖拽', 'Demo drag');
    this.demoButton.disabled = !this.ready || !!this.demo;
  }

  setMotion(id) {
    this.cancelGesture();
    this.clearSelection();
    this.hover = null;
    this.motionId = Object.hasOwn(GRAPH_MOTIONS, id) ? id : 'spring';
    this.motion = graphMotion(this.motionId);
    if (this.referenceLayout) this.restoreLayout();
    applyGraphMotion(this.simulation, this.motion, this.reducedMotion.matches);
    const url = new URL(location.href);
    url.searchParams.set('graph-motion', this.motionId);
    history.replaceState(history.state, '', url);
    this.updateComparison();
    this.schedule();
  }

  restoreLayout() {
    this.nodes.forEach((node, index) => {
      Object.assign(node, this.referenceLayout[index], { vx: 0, vy: 0, fx: null, fy: null });
    });
    this.simulation.alpha(0).alphaTarget(0);
  }

  startDemo() {
    if (!this.ready) return;
    this.cancelGesture();
    this.clearSelection();
    this.restoreLayout();
    this.fit();
    const node = this.labelOrder.find((item) => item.guide) || this.nodes[0];
    this.demo = {
      node,
      x: node.x,
      y: node.y,
      distance: Math.min(100, this.width * 0.22) / this.camera.k,
    };
    this.dragNode = node;
    node.fx = node.x;
    node.fy = node.y;
    this.hover = { node };
    this.reheatDrag();
    this.updateComparison();
    this.schedule();
  }

  stepDemo(time) {
    const demo = this.demo;
    if (!demo) return;
    demo.start ??= time;
    const progress = Math.min(1, (time - demo.start) / 1000);
    const eased = (1 - Math.cos(progress * Math.PI)) / 2;
    demo.node.fx = demo.node.x = demo.x + demo.distance * eased;
    demo.node.fy = demo.node.y = demo.y - demo.distance * 0.28 * eased;
    if (time - demo.start >= 1300) {
      this.demo = null;
      this.releaseNode();
      this.updateComparison();
    }
  }

  reheatDrag() {
    this.simulation
      .alpha(Math.max(this.simulation.alpha(), this.motion.dragAlpha))
      .alphaTarget(this.motion.dragTarget);
  }

  updateLanguage() {
    this.canvas.setAttribute(
      'aria-label',
      this.text(
        '知识地图。T 键展开工具，方向键平移，加减键缩放，0 键查看全图。',
        'Knowledge map. T opens tools; arrow keys pan, plus/minus zoom, 0 fits the map.'
      )
    );
    this.picker.setAttribute('aria-label', this.text('查找标签', 'Find a tag'));
    const selected = this.picker.value;
    this.picker.replaceChildren(new Option(this.text('查找标签…', 'Find a tag…'), ''));
    this.nodes.forEach((node) => {
      node.displayName = this.name(node);
      this.ctx.font = `${node.fontSize}px ${FONT}`;
      node.labelWidth = this.ctx.measureText(node.displayName).width;
    });
    [...this.nodes]
      .sort((a, b) => this.name(a).localeCompare(this.name(b), this.language))
      .forEach((node) =>
        this.picker.add(new Option(`${this.name(node)} (${node.value})`, node.name))
      );
    this.picker.value = selected;
    this.labelOrder = [...this.nodes].sort(
      (a, b) => Number(b.guide) - Number(a.guide) || b.value - a.value
    );
    const labels = {
      plus: this.text('放大', 'Zoom in'),
      minus: this.text('缩小', 'Zoom out'),
      fit: this.text('查看全图', 'Fit map'),
      fullscreen: this.fullscreen
        ? this.text('退出全屏', 'Exit fullscreen')
        : this.text('全屏探索', 'Explore fullscreen'),
    };
    Object.entries(labels).forEach(([key, label]) => {
      this.buttons[key].setAttribute('aria-label', label);
      this.buttons[key].title = label;
    });
    this.loading.textContent = this.text('整理知识地图', 'Arranging knowledge map');
    this.updateInstructions();
    this.updateComparison();
    if (this.selection) this.showPanel(this.selection);
    this.schedule();
  }

  updateInstructions() {
    this.host.classList.toggle('tag-graph-compact', this.compactMedia.matches);
    this.updateToolbar();
    this.modeButton.hidden = !this.fullscreen || !this.compactMedia.matches;
    this.modeButton.textContent = this.text('移动节点', 'Move nodes');
    this.modeButton.setAttribute('aria-pressed', String(this.dragMode));
    this.hint.textContent = this.compactMedia.matches
      ? this.fullscreen
        ? this.dragMode
          ? this.text(
              '拖动节点 · 双指缩放 · 点按查看文章',
              'Drag nodes · Pinch to zoom · Tap for articles'
            )
          : this.text(
              '拖动画布 · 双指缩放 · 点按查看文章',
              'Drag to pan · Pinch to zoom · Tap for articles'
            )
        : this.text(
            '点按查看文章 · 全屏可缩放、拖动',
            'Tap for articles · Explore and zoom in fullscreen'
          )
      : this.text(
          '拖动节点 · 滚轮缩放 · 右键或 T 键展开工具',
          'Drag nodes · Scroll to zoom · Right-click or T for tools'
        );
    this.hint.classList.add('visible');
  }

  resize() {
    // Canvas size grows gently with the number of tags, with bounded page height.
    if (!this.fullscreen) {
      this.host.style.height = this.compactMedia.matches
        ? ''
        : `${Math.round(Math.min(660, 480 + Math.max(0, this.nodes.length - 40) * 0.8))}px`;
    }
    const rect = this.container.getBoundingClientRect();
    const width = Math.round(rect.width),
      height = Math.round(rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!width || !height || (width === this.width && height === this.height && dpr === this.dpr))
      return;
    const previousWidth = this.width || width,
      previousHeight = this.height || height;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    if (this.fitted) this.fit();
    else {
      this.camera.x += (width - previousWidth) / 2;
      this.camera.y += (height - previousHeight) / 2;
    }
    this.schedule();
  }

  fit() {
    this.fitted = true;
    const top = this.fullscreen && this.compactMedia.matches ? 112 : 64;
    this.camera = fitCamera(
      this.nodes,
      this.width,
      this.height - top - 32,
      this.width < 500 ? 24 : 42
    );
    this.camera.y += top;
    this.schedule();
  }

  zoom(factor, point = { x: this.width / 2, y: this.height / 2 }) {
    this.fitted = false;
    this.camera = zoomCamera(this.camera, point, factor);
    this.schedule();
  }

  schedule(force = true) {
    this.forceDraw ||= force;
    if (this.frame || !this.visible || document.hidden || this.abort.signal.aborted) return;
    this.frame = requestAnimationFrame((time = performance.now()) => {
      this.frame = 0;
      const floating = this.motion?.floating && !this.reducedMotion.matches;
      // Only the floating variant paints continuously, capped at 30 fps at rest.
      if (
        this.ready &&
        floating &&
        !this.dragNode &&
        this.simulation.alpha() < 0.05 &&
        !this.forceDraw &&
        time - (this.lastDraw || 0) < 32
      ) {
        this.schedule(false);
        return;
      }
      this.forceDraw = false;
      if (!this.ready) {
        // Bounded batches keep initial layout from blocking scrolling/input.
        const start = performance.now();
        do {
          this.simulation.tick();
        } while (
          this.simulation.alpha() > this.simulation.alphaMin() &&
          performance.now() - start < 6
        );
        if (this.simulation.alpha() > this.simulation.alphaMin()) {
          this.schedule();
          return;
        }
        this.ready = true;
        this.simulation.alpha(0);
        this.referenceLayout = this.nodes.map(({ x, y }) => ({ x, y }));
        applyGraphMotion(this.simulation, this.motion, this.reducedMotion.matches);
        this.fit();
        this.loading.remove();
        this.picker.disabled = false;
        ['plus', 'minus', 'fit'].forEach((key) => {
          this.buttons[key].disabled = false;
        });
        this.updateComparison();
      } else {
        this.stepDemo(time);
        if (floating) this.simulation.alpha(Math.max(this.simulation.alpha(), 0.018));
        if (this.simulation.alpha() > this.simulation.alphaMin()) this.simulation.tick();
      }
      this.draw();
      this.lastDraw = time;
      if (floating || this.demo || this.simulation.alpha() > this.simulation.alphaMin())
        this.schedule(false);
    });
  }

  resume() {
    if (!this.visible || document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.cancelGesture();
    } else this.schedule();
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const active = this.hover || this.selection;
    const focus = active?.node
      ? this.neighbors.get(active.node.name)
      : active?.link
        ? new Set([active.link.source.name, active.link.target.name])
        : null;
    const points = new Map();
    this.nodes.forEach((node) =>
      points.set(node, {
        x: node.x * this.camera.k + this.camera.x,
        y: node.y * this.camera.k + this.camera.y,
        r: nodeRadius(node, this.camera.k),
      })
    );
    // Edges are drawn in two batched paths; panning never reruns the solver.
    for (const highlighted of [false, true]) {
      ctx.beginPath();
      this.links.forEach((link) => {
        const isActive =
          !!focus &&
          (active.node
            ? link.source === active.node || link.target === active.node
            : link === active.link);
        if (isActive !== highlighted) return;
        const a = points.get(link.source),
          b = points.get(link.target);
        if (
          Math.max(a.x, b.x) < 0 ||
          Math.min(a.x, b.x) > this.width ||
          Math.max(a.y, b.y) < 0 ||
          Math.min(a.y, b.y) > this.height
        )
          return;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      });
      ctx.strokeStyle = highlighted
        ? 'rgba(121,93,163,0.48)'
        : `rgba(190,193,198,${focus ? 0.12 : 0.32})`;
      ctx.lineWidth = highlighted ? 1.8 : 1.2;
      ctx.stroke();
    }
    const grid = new LabelGrid();
    this.nodes.forEach((node) => {
      const p = points.get(node);
      if (p.x + p.r < 0 || p.x - p.r > this.width || p.y + p.r < 0 || p.y - p.r > this.height)
        return;
      ctx.globalAlpha = focus && !focus.has(node.name) ? 0.25 : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      grid.add({ x: p.x - p.r - 2, y: p.y - p.r - 2, w: p.r * 2 + 4, h: p.r * 2 + 4 });
    });
    ctx.textBaseline = 'middle';
    const order = active?.node
      ? [active.node, ...this.labelOrder.filter((node) => node !== active.node)]
      : this.labelOrder;
    // Only visible controls need to reserve space above the node labels.
    if (this.toolbarOpen) {
      grid.add({
        x: 0,
        y: 0,
        w: this.width,
        h: this.fullscreen && this.compactMedia.matches ? 112 : 62,
      });
    }
    for (const node of order) {
      const p = points.get(node),
        h = node.fontSize + 6,
        w = node.labelWidth + 8;
      if (p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) continue;
      const candidates = [
        { x: p.x + p.r + 4, y: p.y - h / 2, w, h },
        { x: p.x - p.r - 4 - w, y: p.y - h / 2, w, h },
        { x: p.x - w / 2, y: p.y + p.r + 3, w, h },
        { x: p.x - w / 2, y: p.y - p.r - 3 - h, w, h },
      ];
      if (node.guide || node === active?.node) {
        for (const offset of [-h, h, -h * 2, h * 2]) {
          candidates.push({ x: p.x + p.r + 4, y: p.y - h / 2 + offset, w, h });
          candidates.push({ x: p.x - p.r - 4 - w, y: p.y - h / 2 + offset, w, h });
        }
        // Keep primary topics named even in a phone-sized overview. If the
        // immediate space is occupied, use the nearest free spot and a leader.
        for (const distance of [30, 50, 70, 90]) {
          for (const angle of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
            candidates.push({
              x: p.x + Math.cos(angle) * (p.r + distance) - w / 2,
              y: p.y + Math.sin(angle) * (p.r + distance) - h / 2,
              w,
              h,
              leader: true,
            });
          }
        }
      }
      const box = candidates.find(
        (box) =>
          box.x >= 4 &&
          box.x + w <= this.width - 4 &&
          box.y >= 4 &&
          box.y + h <= this.height - 32 &&
          !grid.intersects(box)
      );
      if (!box) continue;
      grid.add(box);
      ctx.globalAlpha = focus && !focus.has(node.name) ? 0.25 : 1;
      if (box.leader) {
        ctx.beginPath();
        const x = Math.max(box.x, Math.min(box.x + w, p.x));
        const y = Math.max(box.y, Math.min(box.y + h, p.y));
        const distance = Math.hypot(x - p.x, y - p.y);
        ctx.moveTo(p.x + ((x - p.x) * p.r) / distance, p.y + ((y - p.y) * p.r) / distance);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#b9b9b9';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      ctx.font = `${node.fontSize}px ${FONT}`;
      ctx.fillStyle = '#555';
      ctx.fillText(node.displayName, box.x + 4, box.y + h / 2);
    }
    ctx.globalAlpha = 1;
  }

  hitTest(point, touch = false) {
    let closest = null,
      distance = Infinity;
    this.nodes.forEach((node) => {
      const d = Math.hypot(
        point.x - (node.x * this.camera.k + this.camera.x),
        point.y - (node.y * this.camera.k + this.camera.y)
      );
      if (d < Math.max(nodeRadius(node, this.camera.k) + 4, touch ? 22 : 8) && d < distance) {
        closest = { node };
        distance = d;
      }
    });
    if (closest || touch) return closest;
    // Thin edges don't compete with a phone's enlarged node targets.
    const p = worldPoint(this.camera, point);
    this.links.forEach((link) => {
      const a = link.source,
        b = link.target,
        dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))
      );
      const d = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) * this.camera.k;
      if (d < 4 && d < distance) {
        closest = { link };
        distance = d;
      }
    });
    return closest;
  }

  position(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  bindEvents() {
    this.on(this.canvas, 'contextmenu', (event) => {
      event.preventDefault();
      this.setToolbarOpen(true);
      this.picker.focus({ preventScroll: true });
    });
    this.on(document, 'pointerdown', (event) => {
      if (this.toolbarOpen && !this.toolbar.contains(event.target)) {
        this.setToolbarOpen(false);
      }
    });
    this.on(this.reducedMotion, 'change', () => {
      applyGraphMotion(this.simulation, this.motion, this.reducedMotion.matches);
      this.schedule();
    });
    this.on(this.canvas, 'pointerdown', (event) => this.pointerDown(event));
    this.on(this.canvas, 'pointermove', (event) => this.pointerMove(event));
    this.on(this.canvas, 'pointerup', (event) => this.pointerUp(event));
    this.on(this.canvas, 'pointercancel', () => this.cancelGesture());
    this.on(this.canvas, 'lostpointercapture', (event) => {
      if (this.pointers.has(event.pointerId)) this.cancelGesture();
    });
    this.on(this.canvas, 'pointerleave', () => {
      if (!this.pointers.size) {
        this.hover = null;
        this.schedule();
      }
    });
    this.on(
      this.canvas,
      'wheel',
      (event) => {
        if (this.compactMedia.matches && !this.fullscreen) return;
        event.preventDefault();
        const delta =
          event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.height : 1);
        this.zoom(Math.exp(-Math.max(-160, Math.min(160, delta)) * 0.003), this.position(event));
      },
      { passive: false }
    );
    this.on(this.canvas, 'keydown', (event) => {
      const pan = {
        ArrowLeft: [40, 0],
        ArrowRight: [-40, 0],
        ArrowUp: [0, 40],
        ArrowDown: [0, -40],
      }[event.key];
      if (pan) {
        this.fitted = false;
        this.camera.x += pan[0];
        this.camera.y += pan[1];
        this.schedule();
      } else if (
        event.key.toLowerCase() === 't' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.repeat
      ) {
        this.setToolbarOpen(!this.toolbarOpen);
        if (this.toolbarOpen) this.picker.focus({ preventScroll: true });
      } else if (event.key === '+' || event.key === '=') this.zoom(1.25);
      else if (event.key === '-') this.zoom(0.8);
      else if (event.key === '0') this.fit();
      else return;
      event.preventDefault();
    });
    this.on(document, 'keydown', (event) => this.fullscreenKeys(event));
    this.on(document, 'visibilitychange', () => this.resume());
    this.on(window, 'blur', () => this.cancelGesture());
    this.on(window, 'popstate', () => {
      if (this.fullscreen && history.state?.tagGraphFullscreen !== this.fullscreenToken)
        this.exitFullscreen();
      else if (
        !this.fullscreen &&
        this.fullscreenToken &&
        history.state?.tagGraphFullscreen === this.fullscreenToken
      )
        this.enterFullscreen(false);
    });
    this.on(window, 'pagehide', (event) => {
      this.cancelGesture();
      this.setToolbarOpen(false);
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      if (!event.persisted) this.destroy();
    });
    this.on(window, 'pageshow', () => {
      this.setToolbarOpen(false);
      this.resume();
    });
    this.on(this.compactMedia, 'change', () => {
      this.updateInstructions();
      this.resize();
    });
  }

  pointerDown(event) {
    if (!this.ready || event.button > 0) return;
    if (this.demo) this.cancelGesture();
    const point = this.position(event),
      touch = event.pointerType !== 'mouse';
    this.pointers.set(event.pointerId, point);
    const interactive = !touch || this.fullscreen;
    if (interactive) this.canvas.setPointerCapture(event.pointerId);
    if (this.pointers.size > 1) {
      this.releaseNode();
      this.gesture = { mode: 'pinch', moved: true, interactive };
      this.pinch = this.pinchState();
      return;
    }
    const hit = this.hitTest(point, touch);
    this.gesture = {
      start: point,
      point,
      hit,
      touch,
      interactive,
      moved: false,
      mode: 'press',
      time: performance.now(),
    };
    this.hover = null;
    this.schedule();
  }

  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return b
      ? {
          center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        }
      : null;
  }

  pointerMove(event) {
    const point = this.position(event);
    if (!this.pointers.has(event.pointerId)) {
      if (event.pointerType === 'mouse') {
        const hit = this.hitTest(point);
        if (hit?.node !== this.hover?.node || hit?.link !== this.hover?.link) {
          this.hover = hit;
          this.schedule();
        }
        this.canvas.style.cursor = hit?.node ? 'grab' : hit?.link ? 'pointer' : 'grab';
      }
      return;
    }
    this.pointers.set(event.pointerId, point);
    const g = this.gesture;
    if (!g) return;
    if (g.mode === 'pinch') {
      const next = this.pinchState();
      if (g.interactive && next && this.pinch) {
        const world = worldPoint(this.camera, this.pinch.center);
        this.zoom(next.distance / this.pinch.distance, this.pinch.center);
        this.camera.x = next.center.x - world.x * this.camera.k;
        this.camera.y = next.center.y - world.y * this.camera.k;
      }
      this.pinch = next;
      return;
    }
    if (!g.moved && Math.hypot(point.x - g.start.x, point.y - g.start.y) > (g.touch ? 10 : 5)) {
      g.moved = true;
      if (g.interactive) {
        this.clearSelection();
        this.fitted = false;
        const node = g.hit?.node;
        if (node && (!g.touch || this.dragMode)) {
          g.mode = 'node';
          const start = worldPoint(this.camera, g.start);
          g.offset = { x: start.x - node.x, y: start.y - node.y };
          node.fx = node.x;
          node.fy = node.y;
          this.dragNode = node;
          this.reheatDrag();
        } else g.mode = 'pan';
        this.canvas.style.cursor = 'grabbing';
      }
    }
    if (g.interactive && g.moved) {
      if (g.mode === 'node') {
        const world = worldPoint(this.camera, point);
        const now = performance.now();
        const delta = Math.max(8, now - g.time);
        g.velocity = {
          x: Math.max(-35, Math.min(35, (((point.x - g.point.x) / this.camera.k) * 16.67) / delta)),
          y: Math.max(-35, Math.min(35, (((point.y - g.point.y) / this.camera.k) * 16.67) / delta)),
        };
        g.time = now;
        this.dragNode.fx = this.dragNode.x = world.x - g.offset.x;
        this.dragNode.fy = this.dragNode.y = world.y - g.offset.y;
      } else {
        this.camera.x += point.x - g.point.x;
        this.camera.y += point.y - g.point.y;
      }
      this.schedule();
    }
    g.point = point;
  }

  pointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    const gesture = this.gesture;
    this.pointers.delete(event.pointerId);
    if (this.canvas.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId);
    if (this.pointers.size) return; // Finish a pinch only once both fingers are up.
    this.releaseNode(true);
    this.gesture = null;
    if (gesture && !gesture.moved) {
      if (
        gesture.hit?.node &&
        !gesture.touch &&
        !this.compactMedia.matches &&
        this.data.tagPaths?.[gesture.hit.node.name]
      ) {
        window.location.assign(this.data.tagPaths[gesture.hit.node.name]);
      } else if (gesture.hit) this.select(gesture.hit);
      else this.clearSelection();
    }
    this.canvas.style.cursor = 'grab';
  }

  releaseNode(withMomentum = false) {
    if (this.dragNode) {
      if (
        withMomentum &&
        !this.reducedMotion.matches &&
        this.gesture?.velocity &&
        performance.now() - this.gesture.time < 100
      ) {
        this.dragNode.vx = this.gesture.velocity.x * this.motion.inertia;
        this.dragNode.vy = this.gesture.velocity.y * this.motion.inertia;
      }
      this.dragNode.fx = null;
      this.dragNode.fy = null;
      this.dragNode = null;
    }
    this.simulation.alphaTarget(0);
  }

  cancelGesture() {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    this.gesture = null;
    this.pinch = null;
    this.releaseNode();
    if (this.demo) {
      this.demo = null;
      this.updateComparison();
    }
    ids.forEach((id) => {
      if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    });
  }

  select(hit) {
    this.selection = hit;
    this.hover = null;
    if (hit.node) this.picker.value = hit.node.name;
    this.showPanel(hit);
    this.schedule();
  }

  clearSelection() {
    this.selection = null;
    this.panel.hidden = true;
    this.picker.value = '';
    this.schedule();
  }

  showPanel(hit) {
    this.panel.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = hit.node
      ? this.name(hit.node)
      : `${this.name(hit.link.source)} ↔ ${this.name(hit.link.target)}`;
    heading.style.color = hit.node?.color || '#795da3';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tag-graph-panel-close tag-graph-control';
    close.innerHTML = this.icon('close');
    close.setAttribute('aria-label', this.text('关闭文章列表', 'Close articles'));
    close.addEventListener(
      'click',
      () => {
        this.clearSelection();
        this.canvas.focus({ preventScroll: true });
      },
      { once: true }
    );
    this.panel.append(heading, close);
    const posts = hit.node
      ? this.data.postTitles?.[hit.node.name]
      : this.data.linkPosts?.[[hit.link.source.name, hit.link.target.name].sort().join('\t')];
    const count = document.createElement('p');
    count.className = 'tag-graph-post-count';
    count.textContent = this.text(`${posts?.length || 0} 篇文章`, `${posts?.length || 0} articles`);
    this.panel.append(count);
    if (hit.node && this.data.tagPaths?.[hit.node.name]) {
      const all = document.createElement('a');
      all.className = 'tag-graph-all-posts';
      all.textContent = this.text('进入标签 →', 'Explore tag →');
      all.href = this.data.tagPaths[hit.node.name];
      this.panel.append(all);
    }
    const list = document.createElement('div');
    list.className = 'tag-graph-post-list';
    (posts || []).forEach((post) => {
      const row = document.createElement(typeof post === 'string' || !post.path ? 'div' : 'a');
      row.textContent = typeof post === 'string' ? post : post.title;
      if (post.path) row.href = post.path;
      list.append(row);
    });
    this.panel.append(list);
    this.panel.hidden = false;
  }

  enterFullscreen(pushHistory = true) {
    this.cancelGesture();
    this.setToolbarOpen(false);
    this.clearSelection();
    this.inlineCamera = { ...this.camera };
    this.inlineFitted = this.fitted;
    this.previousFocus = document.activeElement;
    this.scrollY = window.scrollY;
    this.bodyStyle = {};
    ['overflow', 'position', 'top', 'width'].forEach((key) => {
      this.bodyStyle[key] = document.body.style[key];
    });
    this.placeholder = document.createElement('div');
    this.placeholder.style.height = `${this.host.offsetHeight}px`;
    this.host.replaceWith(this.placeholder);
    document.body.append(this.host);
    this.inertElements = [...document.body.children].filter((el) => el !== this.host && !el.inert);
    this.inertElements.forEach((el) => {
      el.inert = true;
    });
    Object.assign(document.body.style, {
      overflow: 'hidden',
      position: 'fixed',
      top: `${-this.scrollY}px`,
      width: '100%',
    });
    this.fullscreen = true;
    this.host.classList.add('tag-graph-fullscreen');
    this.host.setAttribute('role', 'dialog');
    this.host.setAttribute('aria-modal', 'true');
    this.host.setAttribute('aria-label', this.text('知识地图', 'Knowledge map'));
    this.buttons.fullscreen.innerHTML = this.icon('close');
    this.fitted = true;
    this.resize();
    this.updateLanguage();
    if (pushHistory) {
      this.fullscreenToken = `graph-${performance.timeOrigin}-${performance.now()}`;
      history.pushState({ ...history.state, tagGraphFullscreen: this.fullscreenToken }, '');
    }
    this.canvas.focus({ preventScroll: true });
  }

  closeFullscreen() {
    if (history.state?.tagGraphFullscreen === this.fullscreenToken) history.back();
    else this.exitFullscreen();
  }

  exitFullscreen() {
    this.cancelGesture();
    this.setToolbarOpen(false);
    this.clearSelection();
    this.fullscreen = false;
    this.dragMode = false;
    this.host.classList.remove('tag-graph-fullscreen');
    ['role', 'aria-modal', 'aria-label'].forEach((attr) => this.host.removeAttribute(attr));
    this.placeholder.replaceWith(this.host);
    this.inertElements.forEach((el) => {
      el.inert = false;
    });
    Object.assign(document.body.style, this.bodyStyle);
    window.scrollTo({ top: this.scrollY, behavior: 'instant' });
    this.buttons.fullscreen.innerHTML = this.icon('fullscreen');
    this.fitted = this.inlineFitted;
    this.resize();
    if (!this.fitted) this.camera = { ...this.inlineCamera };
    this.updateLanguage();
    const focusTarget = this.previousFocus?.getClientRects().length
      ? this.previousFocus
      : this.canvas;
    focusTarget.focus({ preventScroll: true });
    this.schedule();
  }

  fullscreenKeys(event) {
    if (event.key === 'Escape') {
      if (this.fullscreen) this.closeFullscreen();
      else {
        this.clearSelection();
        if (this.toolbarOpen) {
          this.setToolbarOpen(false);
          this.canvas.focus({ preventScroll: true });
        }
      }
    }
    if (!this.fullscreen || event.key !== 'Tab') return;
    const controls = [...this.host.querySelectorAll('button, select, a, canvas')].filter(
      (el) => el.getClientRects().length
    );
    const first = controls[0],
      last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  destroy() {
    if (this.fullscreen) this.exitFullscreen();
    this.abort.abort();
    this.simulation.stop();
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    this.languageObserver.disconnect();
  }
}
