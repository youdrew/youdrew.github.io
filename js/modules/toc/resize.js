/**
 * Resize the TOC panel by dragging its edges/corners.
 *
 * `attachEdgeDetection` sets the cursor and updates ctx.resizeDirection as
 * the pointer moves over the panel — index.js's mousedown dispatcher reads
 * that to decide between resize vs drag.
 *
 * `startResize` runs once index.js has decided this press is a resize, and
 * owns the document-level mousemove/mouseup until the user releases.
 */
import { saveState } from './storage.js';

const EDGE = 8;
const MIN_W = 200;
const MIN_H = 150;

export function attachEdgeDetection(container, ctx) {
  container.addEventListener('mousemove', (e) => {
    if (ctx.dragging || ctx.resizing) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let cursor = 'move';
    let dir = '';

    const left = x <= EDGE;
    const right = x >= rect.width - EDGE;
    const top = y <= EDGE;
    const bottom = y >= rect.height - EDGE;

    if (top && left) {
      cursor = 'nw-resize';
      dir = 'nw';
    } else if (top && right) {
      cursor = 'ne-resize';
      dir = 'ne';
    } else if (bottom && left) {
      cursor = 'sw-resize';
      dir = 'sw';
    } else if (bottom && right) {
      cursor = 'se-resize';
      dir = 'se';
    } else if (left) {
      cursor = 'w-resize';
      dir = 'w';
    } else if (right) {
      cursor = 'e-resize';
      dir = 'e';
    } else if (top) {
      cursor = 'n-resize';
      dir = 'n';
    } else if (bottom) {
      cursor = 's-resize';
      dir = 's';
    }

    container.style.cursor = cursor;
    ctx.resizeDirection = dir;
  });

  container.addEventListener('mouseleave', () => {
    if (!ctx.dragging && !ctx.resizing) {
      container.style.cursor = 'default';
      ctx.resizeDirection = '';
    }
  });
}

export function startResize(e, container, ctx) {
  const direction = ctx.resizeDirection;
  if (!direction) return;

  const startX = e.clientX;
  const startY = e.clientY;
  const rect = container.getBoundingClientRect();
  const startLeft = rect.left;
  const startTop = rect.top;
  const startWidth = rect.width;
  const startHeight = rect.height;

  let frameRequested = false;
  let pendingEvent = null;

  function applyResize() {
    frameRequested = false;
    const evt = pendingEvent;
    if (!evt) return;

    const dx = evt.clientX - startX;
    const dy = evt.clientY - startY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (direction.includes('e')) newWidth = startWidth + dx;
    if (direction.includes('w')) {
      newWidth = startWidth - dx;
      newLeft = startLeft + dx;
    }
    if (direction.includes('s')) newHeight = startHeight + dy;
    if (direction.includes('n')) {
      newHeight = startHeight - dy;
      newTop = startTop + dy;
    }

    if (newWidth < MIN_W) {
      if (direction.includes('w')) newLeft = startLeft + startWidth - MIN_W;
      newWidth = MIN_W;
    }
    if (newHeight < MIN_H) {
      if (direction.includes('n')) newTop = startTop + startHeight - MIN_H;
      newHeight = MIN_H;
    }

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    newLeft = Math.max(0, Math.min(newLeft, winW - newWidth));
    newTop = Math.max(0, Math.min(newTop, winH - newHeight));

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  }

  function onMove(evt) {
    pendingEvent = evt;
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(applyResize);
    }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    ctx.resizing = false;
    ctx.resizeDirection = '';
    const final = container.getBoundingClientRect();
    saveState({
      left: final.left,
      top: final.top,
      width: final.width,
      height: final.height,
    });
  }

  ctx.resizing = true;
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  e.preventDefault();
}
