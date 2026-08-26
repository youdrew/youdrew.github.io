/**
 * 文章折叠模块
 * 为文章标题添加折叠/展开功能
 */

function isHeading(element) {
  return !!element.tagName && /^H[1-6]$/.test(element.tagName);
}

function headingLevel(element) {
  return parseInt(element.tagName.charAt(1), 10);
}

/**
 * Apply one heading's current fold state to its body section while preserving
 * every descendant heading's independent state. When a parent is reopened,
 * child headings become visible, but content below a still-collapsed child
 * stays hidden.
 */
export function syncHeadingSection(heading) {
  if (!isHeading(heading)) return;

  const rootLevel = headingLevel(heading);
  const collapsedLevels = heading.classList.contains('collapsed') ? [rootLevel] : [];
  let next = heading.nextElementSibling;

  while (next) {
    if (isHeading(next)) {
      const level = headingLevel(next);
      if (level <= rootLevel) break;

      while (collapsedLevels.length && collapsedLevels[collapsedLevels.length - 1] >= level) {
        collapsedLevels.pop();
      }

      next.style.display = collapsedLevels.length ? 'none' : '';
      if (next.classList.contains('collapsed')) collapsedLevels.push(level);
    } else if (next.classList && next.classList.contains('tags')) {
      // Post metadata remains visible regardless of article fold state.
      next.style.display = '';
    } else {
      next.style.display = collapsedLevels.length ? 'none' : '';
    }

    next = next.nextElementSibling;
  }
}

export class ArticleCollapse {
  constructor() {
    this.init();
  }

  init() {
    const articleContent = document.querySelector('.content');
    if (!articleContent) return;

    // 查找所有标题
    const headings = articleContent.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading) => {
      // 创建折叠按钮
      const collapseButton = document.createElement('span');
      collapseButton.className = 'collapse-button';
      heading.insertBefore(collapseButton, heading.firstChild);

      // 添加点击事件
      collapseButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse(heading);
      });
    });
  }

  toggleCollapse(heading) {
    heading.classList.toggle('collapsed');
    syncHeadingSection(heading);
  }
}
