/**
 * TOC entry point — composes the submodules.
 *
 * Drawer redesign: the floating draggable/resizable panel is now a
 * right-edge slide-in drawer (render.js + visibility.js). drag.js and
 * resize.js are gone — the drawer solved the "panel covers the article,
 * keep nudging it around" problem they existed to mitigate, and the
 * previously desktop-only TOC now works on mobile too (tab + scrim).
 *
 * On 每日资讯 pages (body.type-daily-feed) the outline additionally lists
 * every news-item callout under its section heading (headings.js
 * includeCallouts), and clicking such an entry unfolds the callout it
 * scrolls to.
 *
 * Scroll-spy uses IntersectionObserver; fold state stays bidirectionally
 * synced with the body headings via MutationObserver (fold.js).
 */
import { collectHeadings } from './headings.js';
import { renderToc } from './render.js';
import { initVisibility } from './visibility.js';
import { initFold, foldAll } from './fold.js';
import { initScrollSpy } from './scroll-spy.js';

// Material "unfold_less" (arrows in → collapse) / "unfold_more"
// (arrows out → expand).
const SVG_FOLD_LESS =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 18.59 8.83 20 12 16.83 15.17 20l1.41-1.41L12 14zM16.59 5.41 15.17 4 12 7.17 8.83 4 7.41 5.41 12 10z"/></svg>';
const SVG_FOLD_MORE =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5.83 15.17 9l1.41-1.41L12 3 7.42 7.59 8.83 9zm0 12.34L8.83 15l-1.41 1.4L12 21l4.58-4.6L15.17 15z"/></svg>';

function isCollapsible(item) {
  return !item.classList.contains('toc-item--virtual') && !!item.querySelector('.toc-collapse-btn');
}

function shouldRender() {
  const content = document.querySelector('.content');
  if (!content) return null;
  if (content.classList.contains('archives')) return null;
  const body = document.body;
  if (body.classList.contains('path-about-index-html') || body.classList.contains('layout-about')) {
    return null;
  }
  const main = document.querySelector('section.main[data-toc]');
  if (main && main.getAttribute('data-toc') === 'false') return null;
  return content;
}

export function initToc() {
  const content = shouldRender();
  if (!content) return;

  const headings = collectHeadings(content, {
    includeCallouts: document.body.classList.contains('type-daily-feed'),
  });
  if (!headings.length) return;

  const { container, items } = renderToc(headings);

  // Keep both global actions visible. Disabled state communicates which action
  // is currently a no-op without making the opposite action disappear.
  const collapseAllBtn = container.querySelector('.toc-collapse-all');
  const expandAllBtn = container.querySelector('.toc-expand-all');
  const collapsibles = items.filter(isCollapsible);
  let updateFoldControls = null;
  if (collapseAllBtn && expandAllBtn && collapsibles.length) {
    const zh =
      (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;
    const T = zh
      ? { collapse: '全部折叠', expand: '全部展开' }
      : { collapse: 'Collapse all', expand: 'Expand all' };

    collapseAllBtn.innerHTML = SVG_FOLD_LESS;
    collapseAllBtn.setAttribute('aria-label', T.collapse);
    collapseAllBtn.setAttribute('title', T.collapse);
    expandAllBtn.innerHTML = SVG_FOLD_MORE;
    expandAllBtn.setAttribute('aria-label', T.expand);
    expandAllBtn.setAttribute('title', T.expand);

    updateFoldControls = () => {
      const collapsedCount = collapsibles.filter((item) =>
        item.classList.contains('collapsed')
      ).length;
      collapseAllBtn.disabled = collapsedCount === collapsibles.length;
      expandAllBtn.disabled = collapsedCount === 0;
    };

    collapseAllBtn.addEventListener('click', () => {
      foldAll(headings, items, true);
      updateFoldControls();
    });
    expandAllBtn.addEventListener('click', () => {
      foldAll(headings, items, false);
      updateFoldControls();
    });
  } else {
    if (collapseAllBtn) collapseAllBtn.remove();
    if (expandAllBtn) expandAllBtn.remove();
  }

  initFold(headings, items, updateFoldControls);
  if (updateFoldControls) updateFoldControls();
  const spy = initScrollSpy(headings, items);
  initVisibility(container); // last: the initial auto-open centers on the spy's active item

  // Click a TOC entry → smooth-scroll to the target and refresh the spy
  // after the scroll settles so the active highlight catches up. Virtual
  // entries are folded callouts — unfold on arrival so the reader lands
  // on the story, not on a closed box.
  items.forEach((item, i) => {
    const textSpan = item.querySelector('.toc-item-text');
    if (!textSpan) return;
    textSpan.addEventListener('click', () => {
      const h = headings[i];
      if (!h || !h.element) return;
      if (h.virtual && h.element.tagName === 'DETAILS' && !h.element.open) {
        h.element.open = true;
      }
      h.element.scrollIntoView({ behavior: 'smooth', block: h.virtual ? 'start' : 'center' });
      setTimeout(() => spy.refresh(), 300);
    });
  });
}
