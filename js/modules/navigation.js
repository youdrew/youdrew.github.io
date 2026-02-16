/**
 * 导航栏模块
 * 统一处理桌面端和移动端的导航交互
 */
export class Navigation {
  constructor() {
    this.header = document.querySelector('header');
    this.menuIcon = document.getElementById('menu_icon');
    this.navTriggerZone = 50; // 桌面端触发区域宽度（像素）
    this.showNavTimeout = null;

    this.init();
  }

  init() {
    if (!this.header) return;

    // 根据屏幕尺寸初始化对应的行为
    this.handleResize();

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  handleResize() {
    const isDesktop = window.matchMedia('(min-width: 1099px)').matches;

    if (isDesktop) {
      this.initDesktopBehavior();
    } else {
      this.initMobileBehavior();
    }
  }

  /**
   * 桌面端行为：鼠标悬停触发
   * 原 nav.js 的逻辑
   */
  initDesktopBehavior() {
    // 移除可能存在的移动端事件监听
    if (this.menuIcon) {
      this.menuIcon.replaceWith(this.menuIcon.cloneNode(true));
      this.menuIcon = document.getElementById('menu_icon');
    }

    // 监听鼠标移动
    document.addEventListener('mousemove', (e) => {
      if (e.pageX <= this.navTriggerZone) {
        // 鼠标移动到左侧触发区域
        clearTimeout(this.showNavTimeout);
        this.header.classList.add('show_menu');
      } else {
        // 鼠标移出触发区域
        this.showNavTimeout = setTimeout(() => {
          // 检查鼠标是否在导航栏上
          const headerRect = this.header.getBoundingClientRect();
          const mouseX = e.clientX;
          const mouseY = e.clientY;

          const isOverHeader = (
            mouseX >= headerRect.left &&
            mouseX <= headerRect.right &&
            mouseY >= headerRect.top &&
            mouseY <= headerRect.bottom
          );

          if (!isOverHeader) {
            this.header.classList.remove('show_menu');
          }
        }, 300);
      }
    });

    // 当鼠标在导航栏上时保持显示
    this.header.addEventListener('mouseenter', () => {
      clearTimeout(this.showNavTimeout);
    });

    this.header.addEventListener('mouseleave', () => {
      this.showNavTimeout = setTimeout(() => {
        this.header.classList.remove('show_menu');
      }, 300);
    });
  }

  /**
   * 移动端行为：点击切换
   * 原 main.js 的逻辑
   */
  initMobileBehavior() {
    if (!this.menuIcon) return;

    // 点击菜单图标切换导航
    this.menuIcon.addEventListener('click', (e) => {
      e.preventDefault();

      const nav = this.header.querySelector('nav ul');
      if (nav) {
        nav.classList.toggle('show_menu');
      }

      this.menuIcon.classList.toggle('close_menu');

      return false;
    });
  }
}
