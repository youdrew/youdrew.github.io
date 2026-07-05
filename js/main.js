import { Navigation } from './modules/navigation.js';
import { IdleOcean } from './modules/idle-ocean.js';
import { DailyAudio } from './modules/daily-audio.js';
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
  // After the TOC: it stamps each news callout with data-toc-number (the
  // single source of truth for the outline numbering), which the per-item
  // read-aloud buttons reuse so the card number matches the sidebar.
  new DailyAudio();
  if (document.getElementById('tag-graph')) {
    initTagGraph();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
