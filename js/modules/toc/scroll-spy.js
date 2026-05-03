/**
 * Scroll-spy: highlights the heading the reader is currently looking at.
 *
 * Each heading has one of four states:
 *   passed   — already scrolled past (above viewport)
 *   reading  — currently in the viewport
 *   coming   — not yet reached (below viewport)
 *   active   — the "main" reading heading whose body contains the
 *              viewport's vertical center; rendered with stronger emphasis
 *
 * Implementation:
 *   - IntersectionObserver maintains the passed/reading/coming
 *     classification — it only fires when a heading actually crosses a
 *     viewport edge, so quiescent scrolling costs nothing.
 *   - A rAF-throttled scroll handler only re-checks bounding rects of the
 *     (typically small) visible set to decide which one is "active".
 *
 * Inline styles are intentionally applied here rather than via CSS
 * classes alone, matching the original behaviour where each heading
 * level has its own background-tint palette.
 */
const LEVEL_COLORS = {
  1: {
    passed: 'rgba(128,128,128,0.1)',
    reading: 'rgba(66,153,225,0.15)',
    coming: 'rgba(200,200,200,0.05)',
    active: 'rgba(66,153,225,0.25)',
  },
  2: {
    passed: 'rgba(128,128,128,0.1)',
    reading: 'rgba(49,130,206,0.15)',
    coming: 'rgba(200,200,200,0.05)',
    active: 'rgba(49,130,206,0.25)',
  },
  3: {
    passed: 'rgba(128,128,128,0.1)',
    reading: 'rgba(44,82,130,0.15)',
    coming: 'rgba(200,200,200,0.05)',
    active: 'rgba(44,82,130,0.25)',
  },
  4: {
    passed: 'rgba(128,128,128,0.1)',
    reading: 'rgba(42,67,101,0.15)',
    coming: 'rgba(200,200,200,0.05)',
    active: 'rgba(42,67,101,0.25)',
  },
  5: {
    passed: 'rgba(128,128,128,0.1)',
    reading: 'rgba(26,54,93,0.15)',
    coming: 'rgba(200,200,200,0.05)',
    active: 'rgba(26,54,93,0.25)',
  },
  6: {
    passed: 'rgba(128,128,128,0.1)',
    reading: 'rgba(21,62,117,0.15)',
    coming: 'rgba(200,200,200,0.05)',
    active: 'rgba(21,62,117,0.25)',
  },
};

export function initScrollSpy(headings, items) {
  if (!headings.length) return { destroy() {} };

  const states = new Array(headings.length).fill('coming');
  const visible = new Set();
  let activeIndex = -1;

  const headingByElement = new Map();
  headings.forEach((h, i) => headingByElement.set(h.element, i));

  function applyAll() {
    items.forEach((item, i) => {
      const level = parseInt(item.getAttribute('data-level') || '1', 10);
      const palette = LEVEL_COLORS[level] || LEVEL_COLORS[1];
      const state = states[i];

      item.classList.remove('toc-passed', 'toc-reading', 'toc-coming');
      item.style.boxShadow = '';
      item.style.transform = '';
      item.style.fontWeight = '';

      if (i === activeIndex) {
        item.classList.add('toc-reading');
        item.style.backgroundColor = palette.active;
        item.style.opacity = '1';
        item.style.fontWeight = '600';
        item.style.boxShadow = 'inset 0 0 0 2px rgba(66,153,225,0.3)';
        item.style.transform = 'scale(1.02)';
        item.style.transition = 'all 0.2s ease';
      } else if (state === 'reading') {
        item.classList.add('toc-reading');
        item.style.backgroundColor = palette.reading;
        item.style.opacity = '1';
        item.style.fontWeight = '600';
      } else if (state === 'passed') {
        item.classList.add('toc-passed');
        item.style.backgroundColor = palette.passed;
        item.style.opacity = '0.7';
      } else {
        item.classList.add('toc-coming');
        item.style.backgroundColor = palette.coming;
        item.style.opacity = '0.5';
      }
    });
  }

  function recomputeActive() {
    const center = window.innerHeight / 2;
    let newActive = -1;
    visible.forEach((i) => {
      const rect = headings[i].element.getBoundingClientRect();
      if (rect.top <= center && rect.bottom >= center) {
        newActive = i;
      }
    });
    if (newActive !== activeIndex) {
      activeIndex = newActive;
      applyAll();
    }
  }

  let rafId = null;
  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      recomputeActive();
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const i = headingByElement.get(entry.target);
      if (i === undefined) return;
      if (entry.isIntersecting) {
        visible.add(i);
        states[i] = 'reading';
      } else {
        visible.delete(i);
        states[i] = entry.boundingClientRect.bottom < 0 ? 'passed' : 'coming';
      }
    });
    recomputeActive();
    applyAll();
  });

  headings.forEach((h) => observer.observe(h.element));

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // First paint — IO will fire its initial callback async, but apply
  // defaults so the panel doesn't render with empty styles for one frame.
  applyAll();

  function destroy() {
    observer.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (rafId) cancelAnimationFrame(rafId);
  }

  return {
    destroy,
    refresh: () => {
      recomputeActive();
      applyAll();
    },
  };
}
