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
import { initFold } from './fold.js';
import { initScrollSpy } from './scroll-spy.js';

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

  initFold(headings, items);
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
