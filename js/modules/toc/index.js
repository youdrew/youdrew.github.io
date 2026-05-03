/**
 * TOC entry point — composes the submodules.
 *
 * Phase 9 refactor: replaces the 678-line toc-collapse.js with a small
 * orchestrator + focused submodules. Behaviour is preserved (see
 * ROADMAP.md Phase 9 verification checklist), with three notable wins:
 *
 *   1. Scroll-spy uses IntersectionObserver instead of a setTimeout
 *      throttled scroll listener.
 *   2. setTimeout race-condition workarounds are gone — modules run
 *      strictly synchronously after the DOM exists.
 *   3. Drag/resize position+size persist to localStorage across reloads.
 *
 * Mobile (<768px) hiding is handled in CSS (`@media max-width: 768px`
 * sets `.toc-container { display: none }`), so this module makes no
 * viewport-size decisions of its own.
 */
import { collectHeadings } from './headings.js';
import { renderToc } from './render.js';
import { initFold } from './fold.js';
import { startDrag } from './drag.js';
import { attachEdgeDetection, startResize } from './resize.js';
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

function isInteractiveTarget(target) {
  return (
    target.classList.contains('toc-collapse-btn') ||
    target.classList.contains('toc-item-text') ||
    target.closest('.toc-collapse-btn') ||
    target.closest('.toc-item-text')
  );
}

export function initToc() {
  const content = shouldRender();
  if (!content) return;

  const headings = collectHeadings(content);
  if (!headings.length) return;

  const { container, items } = renderToc(headings);

  initFold(headings, items);

  const ctx = { dragging: false, resizing: false, resizeDirection: '' };
  attachEdgeDetection(container, ctx);

  container.addEventListener('mousedown', (e) => {
    if (isInteractiveTarget(e.target)) return;
    if (ctx.resizeDirection) {
      startResize(e, container, ctx);
    } else {
      startDrag(e, container, ctx);
    }
  });

  const spy = initScrollSpy(headings, items);

  // Click a TOC entry → smooth-scroll to the heading and refresh the
  // spy after the scroll settles so the active highlight catches up.
  items.forEach((item, i) => {
    const textSpan = item.querySelector('.toc-item-text');
    if (!textSpan) return;
    textSpan.addEventListener('click', () => {
      const heading = headings[i] && headings[i].element;
      if (!heading) return;
      heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => spy.refresh(), 300);
    });
  });
}
