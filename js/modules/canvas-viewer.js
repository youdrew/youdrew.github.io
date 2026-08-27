/*
 * Canvas viewer — clicks on a .canvas-embed open a fullscreen modal that
 * clones the inline SVG and adds pan/zoom plus Obsidian-like node dragging.
 * Dragged positions are local browser preferences keyed by source revision;
 * the authored .canvas file remains the source of truth.
 * No third-party deps; graceful degradation: if JS is off, the inline SVG
 * remains visible and the (now-inert) button does nothing.
 */

const ZOOM_STEP = 1.2;
const WHEEL_STEP = 1.15;
const MIN_SCALE = 0.2;
const MAX_SCALE = 50;
const ARROW_ID_BASE = 'canvas-arrow-modal-';
const DRAG_THRESHOLD = 4;
const STORAGE_PREFIX = 'canvas-layout:v1';

let arrowCounter = 0;

function canvasCopy() {
  const isChinese = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
  return isChinese
    ? {
        open: '点击放大查看画布',
        close: '关闭',
        hint: '拖动节点 · 拖动画布 · 滚轮缩放',
        zoomOut: '缩小',
        resetView: '重置视图',
        zoomIn: '放大',
        resetLayout: '恢复节点原始位置',
        resetLayoutText: '复原节点',
      }
    : {
        open: 'Open interactive canvas',
        close: 'Close',
        hint: 'Drag nodes · Pan canvas · Scroll to zoom',
        zoomOut: 'Zoom out',
        resetView: 'Reset view',
        zoomIn: 'Zoom in',
        resetLayout: 'Restore original node positions',
        resetLayoutText: 'Reset nodes',
      };
}

export class CanvasViewer {
  constructor() {
    const embeds = document.querySelectorAll('.canvas-embed:not(.canvas-embed--error)');
    if (!embeds.length) return;
    for (const embed of embeds) this.attach(embed);
  }

  attach(embed) {
    const copy = canvasCopy();
    embed.setAttribute('role', 'button');
    embed.setAttribute('tabindex', '0');
    embed.setAttribute('aria-label', copy.open);

    embed.addEventListener('click', (event) => {
      // Real links inside the canvas (file/link nodes) keep their default behaviour.
      if (event.target.closest('a')) return;
      event.preventDefault();
      this.openModal(embed);
    });

    embed.addEventListener('keydown', (event) => {
      if (event.target.closest('a')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openModal(embed);
      }
    });
  }

  openModal(embed) {
    const sourceSvg = embed.querySelector('.canvas-svg');
    if (!sourceSvg) return;
    const copy = canvasCopy();

    const clone = sourceSvg.cloneNode(true);
    rewriteArrowMarker(clone);
    clone.classList.add('canvas-modal__svg');

    const modal = document.createElement('div');
    modal.className = 'canvas-modal';
    modal.innerHTML = `
      <div class="canvas-modal__overlay" aria-hidden="true"></div>
      <div class="canvas-modal__inner" role="dialog" aria-modal="true" aria-label="${copy.open}">
        <button class="canvas-modal__close" type="button" aria-label="${copy.close}">×</button>
        <div class="canvas-modal__viewport"></div>
        <div class="canvas-modal__hint" aria-hidden="true">${copy.hint}</div>
        <div class="canvas-modal__controls">
          <button class="canvas-modal__btn" data-action="zoom-out" type="button" aria-label="${copy.zoomOut}">−</button>
          <button class="canvas-modal__btn" data-action="reset" type="button" aria-label="${copy.resetView}">↺</button>
          <button class="canvas-modal__btn" data-action="zoom-in" type="button" aria-label="${copy.zoomIn}">+</button>
          <button class="canvas-modal__btn canvas-modal__btn--wide" data-action="reset-layout" type="button" aria-label="${copy.resetLayout}">${copy.resetLayoutText}</button>
        </div>
      </div>
    `;

    modal.querySelector('.canvas-modal__viewport').appendChild(clone);
    document.body.appendChild(modal);
    document.body.classList.add('canvas-modal-open');

    const storageKey = buildStorageKey(embed, clone);
    const pz = new PanZoom(clone, storageKey);
    const closeButton = modal.querySelector('.canvas-modal__close');
    closeButton.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modal.querySelectorAll('button, a[href]')).filter(
        (element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const close = () => {
      pz.destroy();
      modal.remove();
      document.body.classList.remove('canvas-modal-open');
      document.removeEventListener('keydown', onKey);
      embed.focus({ preventScroll: true });
    };

    closeButton.addEventListener('click', close);
    modal.querySelector('.canvas-modal__overlay').addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    modal.querySelectorAll('.canvas-modal__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'zoom-in') pz.zoomBy(ZOOM_STEP);
        else if (action === 'zoom-out') pz.zoomBy(1 / ZOOM_STEP);
        else if (action === 'reset') pz.reset();
        else if (action === 'reset-layout') pz.resetLayout();
      });
    });
  }
}

function buildStorageKey(embed, svg) {
  const slug = embed.dataset.canvasSlug || 'canvas';
  const revision = svg.dataset.canvasRevision || 'legacy';
  return `${STORAGE_PREFIX}:${slug}:${revision}`;
}

function rewriteArrowMarker(svg) {
  // Each modal clone must have a unique marker id, otherwise multiple opens
  // collide and the first opened canvas's marker gets reused everywhere.
  const marker = svg.querySelector('marker[id]');
  if (!marker) return;
  arrowCounter += 1;
  const oldId = marker.id;
  const newId = `${ARROW_ID_BASE}${arrowCounter}`;
  marker.id = newId;
  svg.querySelectorAll('[marker-end]').forEach((el) => {
    if (el.getAttribute('marker-end') === `url(#${oldId})`) {
      el.setAttribute('marker-end', `url(#${newId})`);
    }
  });
}

class CanvasScene {
  constructor(svg, storageKey) {
    this.svg = svg;
    this.storageKey = storageKey;
    this.nodes = new Map();
    this.edges = [];
    this.connections = new Map();
    const viewBox = svg.viewBox.baseVal;
    this.maxStoredOffset = Math.max(viewBox.width, viewBox.height) * 4;

    svg.querySelectorAll('.canvas-node[data-id]').forEach((element) => {
      const id = element.dataset.id;
      if (!id || this.nodes.has(id)) return;
      this.nodes.set(id, {
        id,
        element,
        x: finiteNumber(element.dataset.x),
        y: finiteNumber(element.dataset.y),
        width: finiteNumber(element.dataset.width, 200),
        height: finiteNumber(element.dataset.height, 80),
        dx: 0,
        dy: 0,
        baseTransform: element.getAttribute('transform') || '',
      });
      this.connections.set(id, []);
    });

    svg.querySelectorAll('.canvas-edge-group[data-from-node][data-to-node]').forEach((element) => {
      const edge = {
        element,
        fromNode: element.dataset.fromNode,
        toNode: element.dataset.toNode,
        fromSide: element.dataset.fromSide || 'right',
        toSide: element.dataset.toSide || 'left',
      };
      if (!this.nodes.has(edge.fromNode) || !this.nodes.has(edge.toNode)) return;
      this.edges.push(edge);
      this.connections.get(edge.fromNode).push(edge);
      this.connections.get(edge.toNode).push(edge);
    });

    this.removeStaleLayouts();
    this.restore();
    this.updateEdges(this.edges);
  }

  beginDrag(element) {
    const primary = this.nodes.get(element.dataset.id);
    if (!primary) return null;

    const records = this.dragRecords(primary).map((record) => ({
      record,
      dx: record.dx,
      dy: record.dy,
    }));
    primary.element.classList.add('is-dragging');
    return { primary, records };
  }

  dragRecords(primary) {
    if (!primary.element.classList.contains('canvas-node--group')) return [primary];

    const left = primary.x + primary.dx;
    const top = primary.y + primary.dy;
    const right = left + primary.width;
    const bottom = top + primary.height;
    const records = [primary];

    this.nodes.forEach((record) => {
      if (record === primary) return;
      const centerX = record.x + record.dx + record.width / 2;
      const centerY = record.y + record.dy + record.height / 2;
      if (centerX >= left && centerX <= right && centerY >= top && centerY <= bottom) {
        records.push(record);
      }
    });
    return records;
  }

  moveDrag(drag, dx, dy) {
    const edges = new Set();
    drag.records.forEach((entry) => {
      this.setOffset(entry.record, entry.dx + dx, entry.dy + dy);
      this.connections.get(entry.record.id).forEach((edge) => edges.add(edge));
    });
    this.updateEdges(edges);
  }

  finishDrag(drag, cancelled) {
    if (!drag) return;
    if (cancelled) this.moveDrag(drag, 0, 0);
    drag.primary.element.classList.remove('is-dragging');
    if (!cancelled) this.persist();
  }

  setOffset(record, dx, dy) {
    record.dx = dx;
    record.dy = dy;
    const translate = dx || dy ? `translate(${round(dx)} ${round(dy)})` : '';
    const transform = [record.baseTransform, translate].filter(Boolean).join(' ');
    if (transform) record.element.setAttribute('transform', transform);
    else record.element.removeAttribute('transform');
  }

  updateEdges(edges) {
    edges.forEach((edge) => {
      const from = this.nodes.get(edge.fromNode);
      const to = this.nodes.get(edge.toNode);
      const p1 = nodeEdgePoint(from, edge.fromSide);
      const p2 = nodeEdgePoint(to, edge.toSide);
      const distance = Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3);
      const c1 = controlOffset(edge.fromSide, distance);
      const c2 = controlOffset(edge.toSide, distance);
      const path = edge.element.querySelector('.canvas-edge');
      if (path) {
        path.setAttribute(
          'd',
          `M ${round(p1.x)} ${round(p1.y)} C ${round(p1.x + c1.dx)} ${round(
            p1.y + c1.dy
          )}, ${round(p2.x + c2.dx)} ${round(p2.y + c2.dy)}, ${round(p2.x)} ${round(p2.y)}`
        );
      }
      const label = edge.element.querySelector('.canvas-edge__label');
      if (label) {
        label.setAttribute('x', round((p1.x + p2.x) / 2));
        label.setAttribute('y', round((p1.y + p2.y) / 2));
      }
    });
  }

  reset() {
    this.nodes.forEach((record) => this.setOffset(record, 0, 0));
    this.updateEdges(this.edges);
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Storage can be unavailable in private browsing; interaction still works.
    }
  }

  restore() {
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(this.storageKey));
    } catch {
      return;
    }
    if (!Array.isArray(stored)) return;
    stored.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length !== 3) return;
      const record = this.nodes.get(String(entry[0]));
      const dx = Number(entry[1]);
      const dy = Number(entry[2]);
      if (
        !record ||
        !Number.isFinite(dx) ||
        !Number.isFinite(dy) ||
        Math.abs(dx) > this.maxStoredOffset ||
        Math.abs(dy) > this.maxStoredOffset
      ) {
        return;
      }
      this.setOffset(record, dx, dy);
    });
  }

  removeStaleLayouts() {
    const revisionSeparator = this.storageKey.lastIndexOf(':');
    const canvasPrefix = this.storageKey.slice(0, revisionSeparator + 1);
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key !== this.storageKey && key.startsWith(canvasPrefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage cleanup is optional; the viewer remains fully interactive.
    }
  }

  persist() {
    const stored = [];
    this.nodes.forEach((record) => {
      if (record.dx || record.dy) stored.push([record.id, round(record.dx), round(record.dy)]);
    });
    try {
      if (stored.length) localStorage.setItem(this.storageKey, JSON.stringify(stored));
      else localStorage.removeItem(this.storageKey);
    } catch {
      // A storage quota or privacy setting should not break node dragging.
    }
  }
}

class PanZoom {
  constructor(svg, storageKey) {
    this.svg = svg;
    const vb = svg.viewBox.baseVal;
    this.original = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    this.state = { ...this.original };
    this.scene = new CanvasScene(svg, storageKey);
    this.pointers = new Map();
    this.pinch = null;
    this.mode = null;
    this.primaryPointerId = null;
    this.drag = null;
    this.didDrag = false;
    this.suppressClick = false;

    this.svg.style.cursor = 'grab';
    this.svg.style.touchAction = 'none';

    this.onWheel = this.onWheel.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onDragStart = this.onDragStart.bind(this);

    this.svg.addEventListener('wheel', this.onWheel, { passive: false });
    this.svg.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    this.svg.addEventListener('click', this.onClick, true);
    this.svg.addEventListener('dragstart', this.onDragStart);
  }

  setViewBox() {
    const { x, y, w, h } = this.state;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  currentScale() {
    return this.original.w / this.state.w;
  }

  zoomBy(factor, pivotX, pivotY) {
    const current = this.currentScale();
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor));
    const appliedFactor = next / current;
    if (!Number.isFinite(appliedFactor) || Math.abs(appliedFactor - 1) < 0.0001) return;

    if (pivotX == null) pivotX = this.state.x + this.state.w / 2;
    if (pivotY == null) pivotY = this.state.y + this.state.h / 2;

    this.state.x = pivotX - (pivotX - this.state.x) / appliedFactor;
    this.state.y = pivotY - (pivotY - this.state.y) / appliedFactor;
    this.state.w /= appliedFactor;
    this.state.h /= appliedFactor;
    this.setViewBox();
  }

  pan(svgDx, svgDy) {
    this.state.x -= svgDx;
    this.state.y -= svgDy;
    this.setViewBox();
  }

  reset() {
    this.state = { ...this.original };
    this.setViewBox();
  }

  resetLayout() {
    this.scene.reset();
    this.reset();
  }

  screenToSvg(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }

  onWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
    const { x, y } = this.screenToSvg(event.clientX, event.clientY);
    this.zoomBy(factor, x, y);
  }

  onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = this.screenToSvg(event.clientX, event.clientY);
    this.pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      anchor: point,
      captured: false,
    });

    if (this.pointers.size === 2) {
      this.finishNodeDrag(true);
      this.mode = 'pinch';
      this.suppressClick = true;
      this.pointers.forEach((pointer, pointerId) => this.capturePointer(pointerId, pointer));
      this.pinch = this.computePinch();
    } else if (this.pointers.size === 1) {
      const node = event.target.closest('.canvas-node[data-id]');
      this.primaryPointerId = event.pointerId;
      this.didDrag = false;
      this.drag = node ? this.scene.beginDrag(node) : null;
      this.mode = this.drag ? 'node' : 'pan';
      if (!this.drag) this.svg.style.cursor = 'grabbing';
    }
  }

  onPointerMove(event) {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;

    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;

    if (this.pointers.size === 2 && this.pinch) {
      const next = this.computePinch();
      const factor = next.dist / this.pinch.dist;
      if (factor > 0 && Number.isFinite(factor)) {
        const pivot = this.screenToSvg(this.pinch.cx, this.pinch.cy);
        this.zoomBy(factor, pivot.x, pivot.y);
        const movedCenter = this.screenToSvg(next.cx, next.cy);
        this.pan(movedCenter.x - pivot.x, movedCenter.y - pivot.y);
      }
      this.pinch = next;
    } else if (this.pointers.size === 1 && event.pointerId === this.primaryPointerId) {
      const travel = Math.hypot(
        event.clientX - pointer.startClientX,
        event.clientY - pointer.startClientY
      );
      if (travel < DRAG_THRESHOLD) return;
      this.didDrag = true;
      this.capturePointer(event.pointerId, pointer);
      const here = this.screenToSvg(event.clientX, event.clientY);
      if (this.mode === 'node' && this.drag) {
        this.scene.moveDrag(this.drag, here.x - pointer.anchor.x, here.y - pointer.anchor.y);
        this.suppressClick = true;
      } else if (this.mode === 'pan') {
        this.pan(here.x - pointer.anchor.x, here.y - pointer.anchor.y);
      }
    }
  }

  onPointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    if (event.pointerId === this.primaryPointerId) this.finishNodeDrag(false);

    if (this.pointers.size >= 2) {
      this.pinch = this.computePinch();
      this.mode = 'pinch';
      return;
    }

    this.pinch = null;
    if (this.pointers.size === 1) {
      const [pointerId, remaining] = this.pointers.entries().next().value;
      remaining.startClientX = remaining.clientX;
      remaining.startClientY = remaining.clientY;
      remaining.anchor = this.screenToSvg(remaining.clientX, remaining.clientY);
      this.primaryPointerId = pointerId;
      this.mode = 'pan';
      this.svg.style.cursor = 'grabbing';
      return;
    }

    this.mode = null;
    this.primaryPointerId = null;
    this.svg.style.cursor = 'grab';
    if (this.suppressClick) {
      window.setTimeout(() => {
        this.suppressClick = false;
      }, 0);
    }
  }

  onPointerCancel(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    if (event.pointerId === this.primaryPointerId) this.finishNodeDrag(true);
    this.pinch = this.pointers.size >= 2 ? this.computePinch() : null;
    if (this.pointers.size >= 2) {
      this.mode = 'pinch';
      return;
    }
    if (this.pointers.size === 1) {
      const [pointerId, remaining] = this.pointers.entries().next().value;
      remaining.startClientX = remaining.clientX;
      remaining.startClientY = remaining.clientY;
      remaining.anchor = this.screenToSvg(remaining.clientX, remaining.clientY);
      this.primaryPointerId = pointerId;
      this.mode = 'pan';
      this.svg.style.cursor = 'grabbing';
      return;
    }
    if (this.pointers.size === 0) {
      this.mode = null;
      this.primaryPointerId = null;
      this.svg.style.cursor = 'grab';
      this.suppressClick = false;
    }
  }

  finishNodeDrag(cancelled) {
    if (!this.drag) return;
    this.scene.finishDrag(this.drag, cancelled || !this.didDrag);
    this.drag = null;
  }

  capturePointer(pointerId, pointer) {
    if (!pointer || pointer.captured) return;
    try {
      this.svg.setPointerCapture(pointerId);
      pointer.captured = true;
    } catch {
      // Window-level listeners keep the gesture alive if capture is unavailable.
    }
  }

  onClick(event) {
    if (!this.suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    this.suppressClick = false;
  }

  onDragStart(event) {
    event.preventDefault();
  }

  computePinch() {
    const [a, b] = [...this.pointers.values()];
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return {
      dist: Math.hypot(dx, dy),
      cx: (a.clientX + b.clientX) / 2,
      cy: (a.clientY + b.clientY) / 2,
    };
  }

  destroy() {
    this.finishNodeDrag(true);
    this.svg.removeEventListener('wheel', this.onWheel);
    this.svg.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    this.svg.removeEventListener('click', this.onClick, true);
    this.svg.removeEventListener('dragstart', this.onDragStart);
  }
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function nodeEdgePoint(node, side) {
  const x = node.x + node.dx;
  const y = node.y + node.dy;
  if (side === 'top') return { x: x + node.width / 2, y };
  if (side === 'bottom') return { x: x + node.width / 2, y: y + node.height };
  if (side === 'left') return { x, y: y + node.height / 2 };
  return { x: x + node.width, y: y + node.height / 2 };
}

function controlOffset(side, distance) {
  if (side === 'left') return { dx: -distance, dy: 0 };
  if (side === 'top') return { dx: 0, dy: -distance };
  if (side === 'bottom') return { dx: 0, dy: distance };
  return { dx: distance, dy: 0 };
}
