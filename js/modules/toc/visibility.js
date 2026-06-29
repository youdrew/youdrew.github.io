/**
 * TOC 显示/隐藏开关。
 *
 * 在标题栏加一个 × 关闭按钮：点击后整个目录面板隐藏，并在右下角落出现一个
 * 「目录 / Contents」小药丸用于重新打开。隐藏状态写入 localStorage（复用
 * toc-panel-state，与拖拽/缩放几何同源），因此跨文章、跨刷新都记住用户的选择。
 *
 * 文案按页面语言切换（<html lang> = page.lang）。注意：这与 front-matter 的
 * `IsToc: false`（整篇不渲染 TOC）是两套机制 —— 这里是读者侧的运行时开关。
 */
import { loadState, saveState } from './storage.js';

function pickLang() {
  const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  return lang.indexOf('zh') === 0 ? 'zh' : 'en';
}

const STRINGS = {
  zh: { title: '目录', open: '目录', hide: '隐藏目录', show: '显示目录' },
  en: { title: 'Contents', open: 'Contents', hide: 'Hide contents', show: 'Show contents' },
};

export function initVisibility(container) {
  const L = STRINGS[pickLang()];

  const titleEl = container.querySelector('.toc-title');
  if (titleEl) titleEl.textContent = L.title;

  const closeBtn = container.querySelector('.toc-close-btn');
  if (closeBtn) {
    closeBtn.setAttribute('aria-label', L.hide);
    closeBtn.setAttribute('title', L.hide);
  }

  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'toc-reopen';
  pill.setAttribute('aria-label', L.show);
  pill.innerHTML =
    '<span class="toc-reopen__icon" aria-hidden="true"></span><span>' + L.open + '</span>';
  document.body.appendChild(pill);

  function setHidden(hidden, persist) {
    container.style.display = hidden ? 'none' : '';
    pill.classList.toggle('is-visible', hidden);
    if (persist) saveState({ hidden: hidden });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setHidden(true, true);
    });
  }
  pill.addEventListener('click', () => setHidden(false, true));

  const state = loadState();
  if (state && state.hidden) setHidden(true, false);
}
