/**
 * Build the TOC panel DOM and inject it into <body>.
 *
 * Returns { container, items } where `items` is parallel to the headings
 * array (item[i] corresponds to headings[i]). Container size and position
 * are restored from localStorage if present, otherwise CSS defaults apply.
 */
import { loadState } from './storage.js';

function applyPersistedGeometry(container) {
  const state = loadState();
  if (!state) return;

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const minW = 200;
  const minH = 150;

  if (typeof state.width === 'number' && typeof state.height === 'number') {
    const w = Math.max(minW, Math.min(state.width, winW));
    const h = Math.max(minH, Math.min(state.height, winH));
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
  }
  if (typeof state.left === 'number' && typeof state.top === 'number') {
    const rect = container.getBoundingClientRect();
    const w = container.style.width ? parseFloat(container.style.width) : rect.width;
    const h = container.style.height ? parseFloat(container.style.height) : rect.height;
    const left = Math.max(0, Math.min(state.left, winW - w));
    const top = Math.max(0, Math.min(state.top, winH - h));
    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  }
}

export function renderToc(headings) {
  const container = document.createElement('div');
  container.className = 'toc-container';
  container.innerHTML = '<div class="toc-content"><div class="toc-list"></div></div>';
  document.body.appendChild(container);

  const list = container.querySelector('.toc-list');
  const items = headings.map((h) => {
    const item = document.createElement('div');
    item.className = 'toc-item';
    item.setAttribute('data-level', String(h.level));
    item.setAttribute('data-index', String(h.index));

    const collapseBtn = document.createElement('div');
    collapseBtn.className = 'toc-collapse-btn';

    const textSpan = document.createElement('span');
    textSpan.className = 'toc-item-text';
    textSpan.style.cursor = 'pointer';
    textSpan.innerHTML = `<span class="toc-number">${h.number}.</span> `;
    textSpan.appendChild(document.createTextNode(h.text));

    // Reflect any existing collapsed state on the source heading so the
    // initial render matches what the user previously set.
    if (h.element.classList.contains('collapsed')) {
      item.classList.add('collapsed');
    }

    item.appendChild(collapseBtn);
    item.appendChild(textSpan);
    list.appendChild(item);
    return item;
  });

  applyPersistedGeometry(container);

  return { container, items };
}
