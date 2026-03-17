/**
 * 文章折叠模块
 * 为文章标题添加折叠/展开功能
 */
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

    // 读取页面配置：collapsed 默认为 true
    const defaultCollapsed =
      window.pageConfig && typeof window.pageConfig.collapsed !== 'undefined'
        ? window.pageConfig.collapsed
        : true;

    if (defaultCollapsed) {
      headings.forEach((heading) => this.collapseHeading(heading));
    }
  }

  collapseHeading(heading) {
    heading.classList.add('collapsed');
    let nextEl = heading.nextElementSibling;
    const headingLevel = parseInt(heading.tagName[1]);
    while (nextEl) {
      const isHeading = nextEl.tagName && nextEl.tagName.match(/^H[1-6]$/);
      if (isHeading && parseInt(nextEl.tagName[1]) <= headingLevel) break;
      nextEl.style.display = 'none';
      nextEl = nextEl.nextElementSibling;
    }
  }

  toggleCollapse(heading) {
    const headingLevel = parseInt(heading.tagName[1]);
    let nextEl = heading.nextElementSibling;
    heading.classList.toggle('collapsed');

    const isCollapsed = heading.classList.contains('collapsed');

    // 隐藏/显示所有下级内容直到遇到同级或更高级的标题
    while (nextEl) {
      const isHeading = nextEl.tagName && nextEl.tagName.match(/^H[1-6]$/);

      if (isHeading) {
        const nextLevel = parseInt(nextEl.tagName[1]);
        if (nextLevel <= headingLevel) break;
      }

      nextEl.style.display = isCollapsed ? 'none' : '';
      nextEl = nextEl.nextElementSibling;
    }
  }
}
