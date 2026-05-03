/**
 * Bidirectional fold sync between TOC items and body headings.
 *
 * Single source of truth = the heading's `.collapsed` class. A user can
 * trigger collapse from either side:
 *   - TOC item button → toggleFromToc() updates both heading + TOC tree
 *   - Body heading button (rendered by article-collapse module) → mutates
 *     heading class → MutationObserver fires → syncFromHeading() reflects
 *     into TOC tree
 *
 * Re-entrancy guard: each updater no-ops if the target is already in the
 * desired state, so the observer round-trip terminates after one hop.
 *
 * `.tags` containers are intentionally exempted from hide/show — they are
 * post-article metadata that should remain visible regardless of fold state.
 */

function hideTocChildren(items, startIndex, parentLevel) {
  for (let i = startIndex + 1; i < items.length; i += 1) {
    const level = parseInt(items[i].getAttribute('data-level') || '1', 10);
    if (level <= parentLevel) break;
    items[i].classList.add('toc-hidden');
  }
}

function showTocChildren(items, startIndex, parentLevel) {
  for (let i = startIndex + 1; i < items.length; i += 1) {
    const level = parseInt(items[i].getAttribute('data-level') || '1', 10);
    if (level <= parentLevel) break;

    if (level === parentLevel + 1) {
      items[i].classList.remove('toc-hidden');
    } else {
      // Deeper item: only show if every ancestor between us and the
      // toggled item is expanded.
      let shouldShow = true;
      for (let j = i - 1; j > startIndex; j -= 1) {
        const prevLevel = parseInt(items[j].getAttribute('data-level') || '1', 10);
        if (prevLevel < level && items[j].classList.contains('collapsed')) {
          shouldShow = false;
          break;
        }
        if (prevLevel <= parentLevel) break;
      }
      if (shouldShow) items[i].classList.remove('toc-hidden');
    }
  }
}

function hideHeadingSiblings(heading) {
  const level = parseInt(heading.tagName.charAt(1), 10);
  let next = heading.nextElementSibling;
  while (next) {
    if (next.tagName && /^H[1-6]$/.test(next.tagName)) {
      const nextLevel = parseInt(next.tagName.charAt(1), 10);
      if (nextLevel <= level) break;
    }
    if (next.classList && next.classList.contains('tags')) {
      next = next.nextElementSibling;
      continue;
    }
    next.style.display = 'none';
    next = next.nextElementSibling;
  }
}

function showHeadingSiblings(heading) {
  const level = parseInt(heading.tagName.charAt(1), 10);
  let next = heading.nextElementSibling;
  while (next) {
    if (next.tagName && /^H[1-6]$/.test(next.tagName)) {
      const nextLevel = parseInt(next.tagName.charAt(1), 10);
      if (nextLevel <= level) break;
    }
    if (next.classList && next.classList.contains('tags')) {
      next.style.display = '';
      next = next.nextElementSibling;
      continue;
    }
    next.style.display = '';
    next = next.nextElementSibling;
  }
}

function toggleFromToc(headings, items, index) {
  const item = items[index];
  const heading = headings[index] && headings[index].element;
  if (!item || !heading) return;

  const level = parseInt(item.getAttribute('data-level') || '1', 10);
  const willCollapse = !item.classList.contains('collapsed');

  if (willCollapse) {
    item.classList.add('collapsed');
    hideTocChildren(items, index, level);
    if (!heading.classList.contains('collapsed')) {
      heading.classList.add('collapsed');
      hideHeadingSiblings(heading);
    }
  } else {
    item.classList.remove('collapsed');
    showTocChildren(items, index, level);
    if (heading.classList.contains('collapsed')) {
      heading.classList.remove('collapsed');
      showHeadingSiblings(heading);
    }
  }
}

function syncFromHeading(headings, items, index) {
  const item = items[index];
  const heading = headings[index] && headings[index].element;
  if (!item || !heading) return;

  const level = parseInt(item.getAttribute('data-level') || '1', 10);
  const isCollapsed = heading.classList.contains('collapsed');

  if (isCollapsed && !item.classList.contains('collapsed')) {
    item.classList.add('collapsed');
    hideTocChildren(items, index, level);
  } else if (!isCollapsed && item.classList.contains('collapsed')) {
    item.classList.remove('collapsed');
    showTocChildren(items, index, level);
  }
}

export function initFold(headings, items) {
  // Apply initial nested-hide for any items that started collapsed.
  // (render.js already added .collapsed to the item if the heading had it,
  // but its descendants still need .toc-hidden.)
  items.forEach((item, i) => {
    if (item.classList.contains('collapsed')) {
      const level = parseInt(item.getAttribute('data-level') || '1', 10);
      hideTocChildren(items, i, level);
    }
  });

  // TOC-side: clicking the collapse button on a TOC item.
  items.forEach((item, i) => {
    const btn = item.querySelector('.toc-collapse-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFromToc(headings, items, i);
    });
  });

  // Body-side: observe each heading's class attribute. Any change to
  // `.collapsed` (whether driven by article-collapse module's button
  // click or by us) is reflected back into the TOC tree.
  const headingByElement = new Map();
  headings.forEach((h, i) => headingByElement.set(h.element, i));

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;
      const i = headingByElement.get(mutation.target);
      if (i === undefined) return;
      syncFromHeading(headings, items, i);
    });
  });
  headings.forEach((h) => {
    observer.observe(h.element, { attributes: true, attributeFilter: ['class'] });
  });

  return { observer };
}
