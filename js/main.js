import { Navigation } from './modules/navigation.js';
import { Tooltip } from './modules/tooltip.js';
import { MapPage } from './modules/map.js';
import { ImageZoom } from './modules/image-zoom.js';
import { ShaderToyEmbedManager } from './modules/shadertoy.js';
import { ArticleCollapse } from './modules/article-collapse.js';
import { CodeBlock } from './modules/code-block.js';
import { initLanguageSwitcher } from './language-switcher.js';
import { initTagGraph } from './tag-graph.js';
import { initToc } from './modules/toc/index.js';

function init() {
  new Navigation();
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
  initLanguageSwitcher();
  initToc();
  if (document.getElementById('tag-graph')) {
    initTagGraph();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
