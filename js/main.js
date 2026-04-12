import { Navigation } from './modules/navigation.js';
import { Tooltip } from './modules/tooltip.js';
import { MapPage } from './modules/map.js';
import { TOC } from './modules/toc.js';
import { ImageZoom } from './modules/image-zoom.js';
import { ShaderToyEmbedManager } from './modules/shadertoy.js';
import { ArticleCollapse } from './modules/article-collapse.js';
import { CodeBlock } from './modules/code-block.js';

// toc-collapse.js, language-switcher.js, i18n-data.js, tag-graph.js
// are loaded separately in after-footer.ejs — do NOT import here

function init() {
  new Navigation();
  new Tooltip();
  if (document.getElementById('map')) {
    new MapPage();
  }
  new TOC().init();
  new ImageZoom();
  setTimeout(() => {
    new ShaderToyEmbedManager();
  }, 500);
  new ArticleCollapse();
  new CodeBlock();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
