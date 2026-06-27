/**
 * 导航栏模块
 * 桌面端：鼠标移到左边缘触发显示；移动端：点击图标展开全屏菜单。
 *
 * 本模块通过 matchMedia 的 change 事件在桌面/移动模式间切换，每次切换
 * 时彻底解绑旧模式的监听再绑定新模式，避免事件累积。mousemove 用
 * requestAnimationFrame 节流，避免每帧触发多次回调。
 *
 * 移动端：点击汉堡按钮给 <header> 切换 `menu-open`，CSS 把它展开成
 * 全屏覆盖菜单（见 responsive.css）。展开时锁定 body 滚动，点击任一
 * 导航链接或按 Esc 自动收起。
 */
export class Navigation {
  constructor() {
    this.header = document.querySelector('header');
    this.menuIcon = document.getElementById('menu_icon');
    this.navTriggerZone = 50;

    this.showNavTimeout = null;
    this.lastMouseEvent = null;
    this.mouseMoveScheduled = false;

    this.mediaQuery = null;
    this.currentMode = null; // 'desktop' | 'mobile'
    this.navLinks = null;

    // Bind once so the same function reference can be removed later.
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onHeaderEnter = this.onHeaderEnter.bind(this);
    this.onHeaderLeave = this.onHeaderLeave.bind(this);
    this.onMenuIconClick = this.onMenuIconClick.bind(this);
    this.onNavLinkClick = this.onNavLinkClick.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.onBreakpointChange = this.onBreakpointChange.bind(this);

    this.init();
  }

  init() {
    if (!this.header) return;

    this.mediaQuery = window.matchMedia('(min-width: 1099px)');
    this.mediaQuery.addEventListener('change', this.onBreakpointChange);
    this.applyMode(this.mediaQuery.matches ? 'desktop' : 'mobile');
  }

  onBreakpointChange(e) {
    this.applyMode(e.matches ? 'desktop' : 'mobile');
  }

  applyMode(mode) {
    if (mode === this.currentMode) return;

    this.teardown();
    this.currentMode = mode;

    if (mode === 'desktop') {
      this.bindDesktop();
    } else {
      this.bindMobile();
    }
  }

  teardown() {
    document.removeEventListener('mousemove', this.onMouseMove);
    this.header.removeEventListener('mouseenter', this.onHeaderEnter);
    this.header.removeEventListener('mouseleave', this.onHeaderLeave);
    document.removeEventListener('keydown', this.onKeydown);
    if (this.menuIcon) {
      this.menuIcon.removeEventListener('click', this.onMenuIconClick);
    }
    if (this.navLinks) {
      this.navLinks.forEach((a) => a.removeEventListener('click', this.onNavLinkClick));
    }

    clearTimeout(this.showNavTimeout);
    this.showNavTimeout = null;

    // Reset both desktop (show_menu) and mobile (menu-open) state + scroll lock.
    this.header.classList.remove('show_menu', 'menu-open');
    document.body.style.overflow = '';
  }

  bindDesktop() {
    document.addEventListener('mousemove', this.onMouseMove);
    this.header.addEventListener('mouseenter', this.onHeaderEnter);
    this.header.addEventListener('mouseleave', this.onHeaderLeave);
  }

  bindMobile() {
    if (!this.menuIcon) return;
    this.menuIcon.addEventListener('click', this.onMenuIconClick);
    this.navLinks = this.header.querySelectorAll('nav ul li a');
    this.navLinks.forEach((a) => a.addEventListener('click', this.onNavLinkClick));
    document.addEventListener('keydown', this.onKeydown);
  }

  openMenu() {
    this.header.classList.add('menu-open');
    this.menuIcon.setAttribute('aria-expanded', 'true');
    this.menuIcon.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }

  closeMenu() {
    this.header.classList.remove('menu-open');
    if (this.menuIcon) {
      this.menuIcon.setAttribute('aria-expanded', 'false');
      this.menuIcon.setAttribute('aria-label', 'Open menu');
    }
    document.body.style.overflow = '';
  }

  onMenuIconClick(e) {
    e.preventDefault();
    if (this.header.classList.contains('menu-open')) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  onNavLinkClick() {
    // Same-page anchors and cross-page links both feel better with the
    // overlay dismissed immediately.
    this.closeMenu();
  }

  onKeydown(e) {
    if (e.key === 'Escape' && this.header.classList.contains('menu-open')) {
      this.closeMenu();
    }
  }

  onMouseMove(e) {
    this.lastMouseEvent = e;
    if (this.mouseMoveScheduled) return;
    this.mouseMoveScheduled = true;
    requestAnimationFrame(() => {
      this.mouseMoveScheduled = false;
      this.processMouseMove(this.lastMouseEvent);
    });
  }

  processMouseMove(e) {
    if (!e) return;

    if (e.pageX <= this.navTriggerZone) {
      clearTimeout(this.showNavTimeout);
      this.header.classList.add('show_menu');
      return;
    }

    // Defer hiding by 300ms so a quick re-entry into the trigger zone or
    // onto the header itself can cancel the hide.
    clearTimeout(this.showNavTimeout);
    this.showNavTimeout = setTimeout(() => {
      const rect = this.header.getBoundingClientRect();
      const overHeader =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!overHeader) {
        this.header.classList.remove('show_menu');
      }
    }, 300);
  }

  onHeaderEnter() {
    clearTimeout(this.showNavTimeout);
  }

  onHeaderLeave() {
    this.showNavTimeout = setTimeout(() => {
      this.header.classList.remove('show_menu');
    }, 300);
  }
}
