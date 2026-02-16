/**
 * 图片缩放模块
 * 支持点击放大、滚轮缩放、拖拽查看
 */
export class ImageZoom {
  constructor() {
    this.overlay = null;
    this.zoomImg = null;
    this.hint = null;
    this.scale = 1;
    this.minScale = 0.2;
    this.maxScale = 6;
    this.lastPos = { x: 0, y: 0 };
    this.origin = { x: 0, y: 0 };
    this.dragging = false;
    this.wheelTimeout = null;

    this.init();
  }

  init() {
    this.bindImages();

    // 使用 MutationObserver 监听DOM变化，动态绑定新添加的图片
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length) {
          this.bindImages();
          break;
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  buildOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'image-zoom-overlay';
    this.overlay.className = 'fade-in';
    this.overlay.innerHTML = `
      <div class="image-zoom-content">
        <img class="image-zoom-img" alt="Zoomed Image" draggable="false" />
        <div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.zoomImg = this.overlay.querySelector('.image-zoom-img');
    this.hint = this.overlay.querySelector('.image-zoom-hint');

    this.bindOverlayEvents();
  }

  openOverlay(src) {
    if (!this.overlay) this.buildOverlay();

    this.overlay.style.display = 'flex';
    this.zoomImg.src = src;
    this.scale = 1;
    this.lastPos.x = 0;
    this.lastPos.y = 0;
    this.applyTransform();

    // 显示提示并在3秒后淡出
    if (this.hint) {
      this.hint.style.opacity = '1';
      this.hint.style.transition = 'opacity .5s';
      clearTimeout(this.hint._hideTimer);
      this.hint._hideTimer = setTimeout(() => {
        this.hint.style.opacity = '0';
      }, 3000);
    }
  }

  closeOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.zoomImg.src = '';
    }
  }

  applyTransform() {
    this.zoomImg.style.transform = `translate(${this.lastPos.x}px, ${this.lastPos.y}px) scale(${this.scale})`;
  }

  onWheel(e) {
    e.preventDefault();

    const rect = this.zoomImg.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, this.scale + delta)
    );
    const scaleFactor = newScale / this.scale;

    // 以鼠标点为中心缩放平移补偿
    this.lastPos.x = (this.lastPos.x + cx) * scaleFactor - cx;
    this.lastPos.y = (this.lastPos.y + cy) * scaleFactor - cy;
    this.scale = newScale;

    this.applyTransform();

    // 缩放时短暂显示提示
    if (this.hint) {
      this.hint.style.opacity = '0.3';
      clearTimeout(this.wheelTimeout);
      this.wheelTimeout = setTimeout(() => {
        this.hint.style.opacity = '1';
      }, 400);
    }
  }

  onMouseDown(e) {
    if (e.button !== 0) return;

    this.dragging = true;
    this.origin.x = e.clientX;
    this.origin.y = e.clientY;
    this.overlay.style.cursor = 'grabbing';
  }

  onMouseMove(e) {
    if (!this.dragging) return;

    const dx = e.clientX - this.origin.x;
    const dy = e.clientY - this.origin.y;

    this.origin.x = e.clientX;
    this.origin.y = e.clientY;
    this.lastPos.x += dx;
    this.lastPos.y += dy;

    this.applyTransform();
  }

  onMouseUp() {
    this.dragging = false;
    if (this.overlay) {
      this.overlay.style.cursor = 'default';
    }
  }

  onDblClick() {
    this.closeOverlay();
  }

  onKey(e) {
    if (
      e.key === 'Escape' &&
      this.overlay &&
      this.overlay.style.display === 'flex'
    ) {
      this.closeOverlay();
    }
  }

  bindOverlayEvents() {
    this.zoomImg.addEventListener('wheel', (e) => this.onWheel(e), {
      passive: false
    });
    this.zoomImg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.zoomImg.addEventListener('dblclick', () => this.onDblClick());

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('keydown', (e) => this.onKey(e));

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closeOverlay();
      }
    });
  }

  bindImages() {
    const selector =
      'article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img';
    const imgs = document.querySelectorAll(selector);

    imgs.forEach((img) => {
      if (!img.classList.contains('image-zoomable')) {
        img.classList.add('image-zoomable');
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
          this.openOverlay(img.getAttribute('data-origin') || img.src);
        });
      }
    });
  }
}
