/**
 * Tooltip 模块
 * 为带有 data-title 属性的链接显示工具提示
 */
export class Tooltip {
  constructor() {
    this.init();
  }

  init() {
    // 监听所有链接的鼠标悬停事件
    document.addEventListener('mouseover', (e) => {
      if (e.target.tagName === 'A') {
        this.showTooltip(e.target);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.tagName === 'A') {
        this.hideTooltip();
      }
    });
  }

  showTooltip(anchor) {
    const attrTitle = anchor.getAttribute('data-title');

    if (!attrTitle || attrTitle === '') return;

    // 创建 tooltip 元素
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.textContent = attrTitle;

    anchor.parentNode.insertBefore(tooltip, anchor.nextSibling);

    // 计算位置
    const tipWidth = tooltip.offsetWidth;
    const aWidth = anchor.offsetWidth;
    const aHeight = anchor.offsetHeight + 3 + 4;

    let adjustedWidth = tipWidth;
    if (tipWidth < aWidth) {
      adjustedWidth = aWidth;
      tooltip.style.width = adjustedWidth + 'px';
    }

    const leftOffset = -(adjustedWidth - aWidth) / 2;

    tooltip.style.left = leftOffset + 'px';
    tooltip.style.bottom = aHeight + 'px';

    // 淡入动画
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);
  }

  hideTooltip() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach((tooltip) => {
      tooltip.remove();
    });
  }
}
