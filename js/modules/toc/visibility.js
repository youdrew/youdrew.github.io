/**
 * TOC 抽屉的开合控制。
 *
 * 关闭态只剩右缘一枚竖排「目录」把手（.toc-tab），不遮挡任何内容；
 * 点击把手滑出抽屉，× / Esc / 点遮罩（移动端）收回。开合状态写入
 * localStorage（沿用 toc-panel-state.hidden），但只有桌面端会按记忆
 * 自动展开 —— 移动端永远从收起状态开始，抽屉是叠加层。
 *
 * 打开时把当前正在阅读的条目滚到列表中部，读者随时打开都能对上位置。
 *
 * 文案按页面语言切换（<html lang> = page.lang）。注意：这与 front-matter
 * 的 `IsToc: false`（整篇不渲染 TOC）是两套机制 —— 这里是读者侧开关。
 */
import { loadState, saveState } from './storage.js';

function pickLang() {
  const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  return lang.indexOf('zh') === 0 ? 'zh' : 'en';
}

const STRINGS = {
  zh: { title: '目录', open: '目录', hide: '收起目录', show: '打开目录' },
  en: { title: 'Contents', open: 'TOC', hide: 'Hide contents', show: 'Show contents' },
};

function centerActiveItem(container) {
  const content = container.querySelector('.toc-content');
  const active = container.querySelector('.toc-item.toc-reading');
  if (!content || !active) return;
  content.scrollTop = active.offsetTop - content.clientHeight / 2 + active.offsetHeight / 2;
}

export function initVisibility(container) {
  const L = STRINGS[pickLang()];

  const titleEl = container.querySelector('.toc-title');
  if (titleEl) titleEl.textContent = L.title;
  container.setAttribute('aria-label', L.title);

  const closeBtn = container.querySelector('.toc-close-btn');
  if (closeBtn) {
    closeBtn.setAttribute('aria-label', L.hide);
    closeBtn.setAttribute('title', L.hide);
  }

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'toc-tab';
  tab.setAttribute('aria-label', L.show);
  tab.innerHTML =
    '<span class="toc-tab__icon" aria-hidden="true"></span><span class="toc-tab__text">' +
    L.open +
    '</span>';
  document.body.appendChild(tab);

  const scrim = document.createElement('div');
  scrim.className = 'toc-scrim';
  document.body.appendChild(scrim);

  function setOpen(open, persist) {
    container.classList.toggle('is-open', open);
    tab.classList.toggle('is-hidden', open);
    scrim.classList.toggle('is-visible', open);
    // Desktop: shift the article left so the drawer never sits over the text
    // (grid.css gates the padding shift to ≥1100px; on mobile the drawer is an
    // overlay + scrim, so the class is harmless there).
    document.body.classList.toggle('toc-drawer-open', open);
    if (open) centerActiveItem(container);
    if (persist) saveState({ hidden: !open });
  }

  tab.addEventListener('click', () => setOpen(true, true));
  scrim.addEventListener('click', () => setOpen(false, true));
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(false, true);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('is-open')) setOpen(false, false);
  });

  // 初始态：默认收起。桌面端尊重上次的选择；移动端抽屉是叠加层，总是收起。
  const state = loadState();
  const wide = window.matchMedia('(min-width: 1100px)').matches;
  setOpen(wide && !!state && state.hidden === false, false);

  return { setOpen };
}
