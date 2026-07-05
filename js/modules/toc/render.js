/**
 * Build the TOC drawer DOM and inject it into <body>.
 *
 * The TOC is a right-edge slide-in drawer (was: a floating draggable/
 * resizable panel that sat over the article and had to be shooed away).
 * Closed, it leaves only a slim edge tab — content is never occluded.
 * Open/close wiring, the tab and the scrim live in visibility.js.
 *
 * Returns { container, items } where `items` is parallel to the entries
 * array (item[i] corresponds to entries[i]). Virtual entries (news-item
 * callouts on 每日资讯 pages) render without a fold button — they are
 * leaves, and folding is a heading-level behaviour.
 */
export function renderToc(headings) {
  const container = document.createElement('aside');
  container.className = 'toc-drawer';
  container.innerHTML =
    '<div class="toc-header">' +
    '<span class="toc-title"></span>' +
    '<div class="toc-header__actions">' +
    '<button type="button" class="toc-foldall"></button>' +
    '<button type="button" class="toc-close-btn"><span class="toc-close-btn__x" aria-hidden="true"></span></button>' +
    '</div>' +
    '</div>' +
    '<div class="toc-content"><div class="toc-list"></div></div>';
  document.body.appendChild(container);

  const list = container.querySelector('.toc-list');
  const items = headings.map((h) => {
    const item = document.createElement('div');
    item.className = h.virtual ? 'toc-item toc-item--virtual' : 'toc-item';
    item.setAttribute('data-level', String(h.level));
    item.setAttribute('data-index', String(h.index));

    if (!h.virtual) {
      const collapseBtn = document.createElement('div');
      collapseBtn.className = 'toc-collapse-btn';
      item.appendChild(collapseBtn);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'toc-item-text';
    textSpan.style.cursor = 'pointer';
    textSpan.innerHTML = `<span class="toc-number">${h.number}.</span> `;
    textSpan.appendChild(document.createTextNode(h.text));
    textSpan.setAttribute('title', h.text);

    // Reflect any existing collapsed state on the source heading so the
    // initial render matches what the user previously set.
    if (h.element.classList.contains('collapsed')) {
      item.classList.add('collapsed');
    }

    item.appendChild(textSpan);
    list.appendChild(item);
    return item;
  });

  return { container, items };
}
