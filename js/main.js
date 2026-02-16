/**
 * 主入口文件
 * 统一初始化所有功能模块
 */
import { Navigation } from './modules/navigation.js';
import { Tooltip } from './modules/tooltip.js';
import { MapPage } from './modules/map.js';
import { TOC } from './modules/toc.js';
import { ImageZoom } from './modules/image-zoom.js';
import { ShaderToyEmbedManager } from './modules/shadertoy.js';
import { ArticleCollapse } from './modules/article-collapse.js';
import { CodeBlock } from './modules/code-block.js';

/**
 * 初始化所有模块
 */
function initializeModules() {
  // 导航功能
  new Navigation();

  // 工具提示
  new Tooltip();

  // 地图页面（如果存在）
  if (document.getElementById('map')) {
    new MapPage();
  }

  // 目录功能（文章页面）
  const toc = new TOC();
  toc.init();

  // 图片缩放
  new ImageZoom();

  // ShaderToy 嵌入（延迟初始化以确保内容加载完成）
  setTimeout(() => {
    new ShaderToyEmbedManager();
  }, 500);

  // 文章标题折叠
  new ArticleCollapse();

  // 代码块功能
  new CodeBlock();
}

// 在 DOM 加载完成后初始化所有模块
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModules);
} else {
  // DOMContentLoaded 已经触发
  initializeModules();
}
