/**
 * 地图页面模块
 * 处理联系页面的地图居中和尺寸调整
 */
export class MapPage {
  constructor() {
    this.mapElement = document.getElementById('map');
    this.init();
  }

  init() {
    if (!this.mapElement) return;

    this.adjustMapLayout();

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.adjustMapLayout();
    });
  }

  adjustMapLayout() {
    const header = document.querySelector('header');
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if (!header) return;

    const headerWidth = header.offsetWidth + 50; // 头部宽度 + 50px边距
    const mapWidth = this.mapElement.offsetWidth;

    // 设置地图尺寸
    this.mapElement.style.maxWidth = mapWidth + 'px';
    this.mapElement.style.height = windowHeight + 'px';

    // 在大屏幕下调整位置
    if (windowWidth > 1100) {
      this.mapElement.style.marginLeft = headerWidth + 'px';
    } else {
      this.mapElement.style.marginLeft = '0';
    }
  }
}
