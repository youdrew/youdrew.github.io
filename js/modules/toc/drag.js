/**
 * Drag the entire TOC panel.
 *
 * Called by the central mousedown dispatcher in index.js when the press
 * lands on an interior (non-edge) area. Final position is clamped to the
 * viewport and persisted to localStorage on drop.
 */
import { saveState } from './storage.js';

export function startDrag(e, container, ctx) {
  const startX = e.clientX;
  const startY = e.clientY;
  const rect = container.getBoundingClientRect();
  const startLeft = rect.left;
  const startTop = rect.top;
  const width = rect.width;
  const height = rect.height;

  let frameRequested = false;
  let pendingEvent = null;

  function applyPosition() {
    frameRequested = false;
    const evt = pendingEvent;
    if (!evt) return;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const newLeft = Math.max(0, Math.min(startLeft + (evt.clientX - startX), winW - width));
    const newTop = Math.max(0, Math.min(startTop + (evt.clientY - startY), winH - height));
    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  }

  function onMove(evt) {
    pendingEvent = evt;
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(applyPosition);
    }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    ctx.dragging = false;
    const final = container.getBoundingClientRect();
    saveState({ left: final.left, top: final.top });
  }

  ctx.dragging = true;
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  e.preventDefault();
}
