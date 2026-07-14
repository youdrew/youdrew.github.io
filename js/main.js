import { Navigation } from './modules/navigation.js';
import { IdleOcean } from './modules/idle-ocean.js';
import { initSignal } from './modules/daily-signal.js';
import { Tooltip } from './modules/tooltip.js';
import { MapPage } from './modules/map.js';
import { ImageZoom } from './modules/image-zoom.js';
import { ShaderToyEmbedManager } from './modules/shadertoy.js';
import { ArticleCollapse } from './modules/article-collapse.js';
import { CodeBlock } from './modules/code-block.js';
import { CanvasViewer } from './modules/canvas-viewer.js';
import { initLanguageSwitcher } from './language-switcher.js';
import { initTagGraph } from './tag-graph.js';
import { initToc } from './modules/toc/index.js';

function init() {
  new Navigation();
  new IdleOcean();
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
  // signal 引擎版 /daily/（每日 AI 信号）：逐条/连播音频、必看卡片展开、分类跳转。
  initSignal();
  if (document.getElementById('tag-graph')) {
    initTagGraph();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
