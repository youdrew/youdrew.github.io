/*
 * Canvas viewer — clicks on a .canvas-embed open a fullscreen modal that
 * clones the inline SVG and attaches a self-contained pan/zoom controller.
 * No third-party deps; graceful degradation: if JS is off, the inline SVG
 * remains visible and the (now-inert) button does nothing.
 */

const ZOOM_STEP = 1.2;
const WHEEL_STEP = 1.15;
const MIN_SCALE = 0.2;
const MAX_SCALE = 50;
const ARROW_ID_BASE = 'canvas-arrow-modal-';

let arrowCounter = 0;

export class CanvasViewer {
  constructor() {
    const embeds = document.querySelectorAll('.canvas-embed:not(.canvas-embed--error)');
    if (!embeds.length) return;
    for (const embed of embeds) this.attach(embed);
  }

  attach(embed) {
    embed.setAttribute('role', 'button');
    embed.setAttribute('tabindex', '0');
    embed.setAttribute('aria-label', '点击放大查看画布');

    embed.addEventListener('click', (event) => {
      // Real links inside the canvas (file/link nodes) keep their default behaviour.
      if (event.target.closest('a')) return;
      event.preventDefault();
      this.openModal(embed);
    });

    embed.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openModal(embed);
      }
    });
  }

  openModal(embed) {
    const sourceSvg = embed.querySelector('.canvas-svg');
    if (!sourceSvg) return;

    const clone = sourceSvg.cloneNode(true);
    rewriteArrowMarker(clone);
    clone.classList.add('canvas-modal__svg');

    const modal = document.createElement('div');
    modal.className = 'canvas-modal';
    modal.innerHTML = `
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
    `;

    modal.querySelector('.canvas-modal__viewport').appendChild(clone);
    document.body.appendChild(modal);
    document.body.classList.add('canvas-modal-open');

    const pz = new PanZoom(clone);

    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };

    const close = () => {
      pz.destroy();
      modal.remove();
      document.body.classList.remove('canvas-modal-open');
      document.removeEventListener('keydown', onKey);
    };

    modal.querySelector('.canvas-modal__close').addEventListener('click', close);
    modal.querySelector('.canvas-modal__overlay').addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    modal.querySelectorAll('.canvas-modal__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'zoom-in') pz.zoomBy(ZOOM_STEP);
        else if (action === 'zoom-out') pz.zoomBy(1 / ZOOM_STEP);
        else if (action === 'reset') pz.reset();
      });
    });
  }
}

function rewriteArrowMarker(svg) {
  // Each modal clone must have a unique marker id, otherwise multiple opens
  // collide and the first opened canvas's marker gets reused everywhere.
  const marker = svg.querySelector('#canvas-arrow');
  if (!marker) return;
  arrowCounter += 1;
  const newId = `${ARROW_ID_BASE}${arrowCounter}`;
  marker.id = newId;
  svg.querySelectorAll('[marker-end]').forEach((el) => {
    el.setAttribute('marker-end', `url(#${newId})`);
  });
}

class PanZoom {
  constructor(svg) {
    this.svg = svg;
    const vb = svg.viewBox.baseVal;
    this.original = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    this.state = { ...this.original };
    this.pointers = new Map();
    this.pinch = null;

    this.svg.style.cursor = 'grab';
    this.svg.style.touchAction = 'none';

    this.onWheel = this.onWheel.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    this.svg.addEventListener('wheel', this.onWheel, { passive: false });
    this.svg.addEventListener('pointerdown', this.onPointerDown);
    this.svg.addEventListener('pointermove', this.onPointerMove);
    this.svg.addEventListener('pointerup', this.onPointerUp);
    this.svg.addEventListener('pointercancel', this.onPointerUp);
  }

  setViewBox() {
    const { x, y, w, h } = this.state;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  currentScale() {
    return this.original.w / this.state.w;
  }

  zoomBy(factor, pivotX, pivotY) {
    const next = this.currentScale() * factor;
    if (next < MIN_SCALE || next > MAX_SCALE) return;

    if (pivotX == null) pivotX = this.state.x + this.state.w / 2;
    if (pivotY == null) pivotY = this.state.y + this.state.h / 2;

    this.state.x = pivotX - (pivotX - this.state.x) / factor;
    this.state.y = pivotY - (pivotY - this.state.y) / factor;
    this.state.w /= factor;
    this.state.h /= factor;
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
    if (event.target.closest('a')) return;
    this.svg.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      svg: this.screenToSvg(event.clientX, event.clientY),
    });

    if (this.pointers.size === 2) {
      this.pinch = this.computePinch();
    } else if (this.pointers.size === 1) {
      this.svg.style.cursor = 'grabbing';
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
        const pivot = this.screenToSvg(next.cx, next.cy);
        this.zoomBy(factor, pivot.x, pivot.y);
      }
      this.pinch = next;
    } else if (this.pointers.size === 1) {
      const here = this.screenToSvg(event.clientX, event.clientY);
      this.pan(here.x - pointer.svg.x, here.y - pointer.svg.y);
    }
  }

  onPointerUp(event) {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size === 0) this.svg.style.cursor = 'grab';
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
    this.svg.removeEventListener('wheel', this.onWheel);
    this.svg.removeEventListener('pointerdown', this.onPointerDown);
    this.svg.removeEventListener('pointermove', this.onPointerMove);
    this.svg.removeEventListener('pointerup', this.onPointerUp);
    this.svg.removeEventListener('pointercancel', this.onPointerUp);
  }
}
