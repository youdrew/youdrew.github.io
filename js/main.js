import { Navigation } from './modules/navigation.js';
import { Tooltip } from './modules/tooltip.js';
import { MapPage } from './modules/map.js';
import { ImageZoom } from './modules/image-zoom.js';
import { ShaderToyEmbedManager } from './modules/shadertoy.js';
import { ArticleCollapse } from './modules/article-collapse.js';
import { CodeBlock } from './modules/code-block.js';
import { CanvasViewer } from './modules/canvas-viewer.js';
import { initLanguageSwitcher } from './language-switcher.js';
import { initToc } from './modules/toc/index.js';

function init() {
  new Navigation();
  if (/(^|\s)path-(zh-CN-)?index-html(\s|$)/.test(document.body.className)) {
    import('./modules/idle-ocean.js')
      .then(({ IdleOcean }) => new IdleOcean())
      .catch((error) => console.warn('Ocean effect unavailable', error));
  }
  new Tooltip();
  if (document.getElementById('map')) {
    new MapPage();
  }
  new ImageZoom();
  setTimeout(() => {
    new ShaderToyEmbedManager();
  }, 500);
  new ArticleCollapse();
  new CodeBlock();
  new CanvasViewer();
  initLanguageSwitcher();
  initToc();
  if (document.querySelector('.signal')) {
    import('./modules/daily-signal.js')
      .then(({ initSignal }) => initSignal())
      .catch((error) => console.error('Daily audio controls unavailable', error));
  }
  if (document.getElementById('article-search')) {
    import('./modules/article-search.js')
      .then(({ initArticleSearch }) => initArticleSearch())
      .catch((error) => console.error('Article search unavailable', error));
  }
  if (document.getElementById('tag-graph')) {
    const graph = document.getElementById('tag-graph');
    const loadGraph = () =>
      import('./tag-graph.js')
        .then(({ initTagGraph }) => initTagGraph())
        .catch((error) => {
          console.error('Knowledge map failed to load', error);
          graph.textContent =
            document.documentElement.lang === 'zh-CN'
              ? '知识地图加载失败，请刷新重试。下方文章仍可浏览。'
              : 'Map unavailable. Please reload, or browse the articles below.';
        });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            loadGraph();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(graph);
    } else {
      loadGraph();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
