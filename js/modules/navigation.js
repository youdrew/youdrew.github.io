/**
 * 导航栏模块
 * 桌面端：鼠标移到左边缘触发显示；移动端：点击图标切换。
 *
 * 本模块通过 matchMedia 的 change 事件在桌面/移动模式间切换，每次切换
 * 时彻底解绑旧模式的监听再绑定新模式，避免事件累积。mousemove 用
 * requestAnimationFrame 节流，避免每帧触发多次回调。
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

    // Bind once so the same function reference can be removed later.
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onHeaderEnter = this.onHeaderEnter.bind(this);
    this.onHeaderLeave = this.onHeaderLeave.bind(this);
    this.onMenuIconClick = this.onMenuIconClick.bind(this);
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
    if (this.menuIcon) {
      this.menuIcon.removeEventListener('click', this.onMenuIconClick);
      this.menuIcon.classList.remove('close_menu');
    }

    clearTimeout(this.showNavTimeout);
    this.showNavTimeout = null;

    this.header.classList.remove('show_menu');
    const nav = this.header.querySelector('nav ul');
    if (nav) nav.classList.remove('show_menu');
  }

  bindDesktop() {
    document.addEventListener('mousemove', this.onMouseMove);
    this.header.addEventListener('mouseenter', this.onHeaderEnter);
    this.header.addEventListener('mouseleave', this.onHeaderLeave);
  }

  bindMobile() {
    if (!this.menuIcon) return;
    this.menuIcon.addEventListener('click', this.onMenuIconClick);
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

  onMenuIconClick(e) {
    e.preventDefault();
    const nav = this.header.querySelector('nav ul');
    if (nav) nav.classList.toggle('show_menu');
    this.menuIcon.classList.toggle('close_menu');
  }
}
