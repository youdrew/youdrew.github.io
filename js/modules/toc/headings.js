/**
 * Collect TOC entries from the article body and build hierarchy info.
 *
 * Returns an array of {element, level, index, id, text, number, virtual}
 * where `number` is the dotted path like "1", "1.2", "1.2.1" matching the
 * entry's position in the outline tree. Sibling headings advance the same
 * counter — the old implementation pushed without popping the previous
 * sibling, numbering consecutive H2s as "1", "1.2", "1.3".
 *
 * `virtual: true` entries are not headings: on 每日资讯 pages
 * (opts.includeCallouts) every folded news-item callout becomes a TOC
 * entry one level below its section heading, so the sidebar lists each
 * story instead of just the two section titles. Legacy voice/transcript
 * callouts, if present, are excluded defensively.
 *
 * IDs already present are preserved so existing anchor links keep working;
 * missing IDs get filled in as `heading-${index}` / `toc-item-${index}`.
 */

import { newsLabel } from '../news-label.js';

function isNewsCallout(el) {
  if (el.querySelector('audio')) return false;
  const summary = el.querySelector('summary');
  if (!summary) return false;
  if (/跟读|本节语音/.test(summary.textContent || '')) return false;
  // Nested callouts stay out of the outline.
  if (el.parentElement && el.parentElement.closest('details.callout')) return false;
  return true;
}

export function collectHeadings(content, opts = {}) {
  const selector = opts.includeCallouts
    ? 'h1, h2, h3, h4, h5, h6, details.callout--foldable'
    : 'h1, h2, h3, h4, h5, h6';
  const nodes = Array.from(content.querySelectorAll(selector));

  const path = []; // outline stack: [{level, n}]
  let lastHeadingLevel = 1;
  const entries = [];

  nodes.forEach((element) => {
    const isHeading = /^H[1-6]$/.test(element.tagName);
    let level;
    let text;
    let virtual = false;

    if (isHeading) {
      level = parseInt(element.tagName[1], 10);
      lastHeadingLevel = level;
      text = element.textContent;
    } else {
      if (!isNewsCallout(element)) return;
      level = lastHeadingLevel + 1;
      virtual = true;
      const summary = element.querySelector('summary');
      text = newsLabel(summary.textContent || '', element.getAttribute('data-callout') || '', {
        short: true,
      });
      if (!text) return;
    }

    // Sibling-aware dotted numbering: pop everything at or below this
    // level; if the popped sibling was at the same level, continue its count.
    let n = 1;
    while (path.length && path[path.length - 1].level >= level) {
      const popped = path.pop();
      if (popped.level === level) n = popped.n + 1;
    }
    path.push({ level, n });

    const index = entries.length;
    if (!element.id) element.id = virtual ? `toc-item-${index}` : `heading-${index}`;

    const number = path.map((e) => e.n).join('.');
    // Stamp the number onto the DOM so daily per-item UI can label each card
    // with the same "1.2"-style number the sidebar shows.
    element.dataset.tocNumber = number;

    entries.push({ element, level, index, id: element.id, text, number, virtual });
  });

  return entries;
}
