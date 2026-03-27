/**
 * Tag Knowledge Graph - ECharts Force-Directed Graph
 * Dynamically loads ECharts and renders an interactive tag relationship graph.
 * Data is injected via window.__TAG_GRAPH_DATA__ from the Hexo EJS template.
 */
(function () {
  'use strict';

  var container = document.getElementById('tag-graph');
  var graphContainer = document.getElementById('tag-graph-container');
  var data = window.__TAG_GRAPH_DATA__;
  if (!container || !data || !data.nodes || data.nodes.length === 0) return;

  // Show loading indicator
  var loadingEl = document.createElement('div');
  loadingEl.className = 'graph-loading';
  loadingEl.textContent = 'Loading';
  container.parentNode.appendChild(loadingEl);

  // Archive filter tags (colored) and other tags (grayscale)
  var archiveFilterTags = data.archiveFilterTags || [];
  var archiveFilterSet = {};
  archiveFilterTags.forEach(function (t) { archiveFilterSet[t] = true; });

  // Color palette for archive_filter_tags only
  var colors = [
    '#795da3', '#6366f1', '#0086b3', '#8b5cf6',
    '#0ea5e9', '#a71d5d', '#10b981', '#f59e0b',
    '#ec4899', '#06b6d4', '#64748b', '#e67e22'
  ];

  // Assign colors: archive_filter_tags get palette colors, others get grayscale
  var colorMap = {};
  var colorIndex = 0;
  // Sort archive filter nodes by value descending for color assignment
  var filterNodes = data.nodes.filter(function (n) { return archiveFilterSet[n.name]; });
  filterNodes.sort(function (a, b) { return b.value - a.value; });
  filterNodes.forEach(function (node) {
    colorMap[node.name] = colors[colorIndex % colors.length];
    colorIndex++;
  });

  // Grayscale for non-filter tags: darker = more articles
  var nonFilterNodes = data.nodes.filter(function (n) { return !archiveFilterSet[n.name]; });
  var maxNonFilterValue = 1;
  nonFilterNodes.forEach(function (n) { if (n.value > maxNonFilterValue) maxNonFilterValue = n.value; });
  nonFilterNodes.forEach(function (node) {
    // Range from #c8c8c8 (light, few articles) to #707070 (dark, many articles)
    var ratio = maxNonFilterValue > 1 ? node.value / maxNonFilterValue : 0.5;
    var gray = Math.round(200 - ratio * 88);
    colorMap[node.name] = 'rgb(' + gray + ',' + gray + ',' + gray + ')';
  });

  // Tag translations for i18n - build normalized lookup
  var tagTranslations = data.tagTranslations || {};
  var tagTransNorm = {};
  Object.keys(tagTranslations).forEach(function (key) {
    tagTransNorm[key] = tagTranslations[key];
    // Also map space-separated version
    var spaced = key.replace(/-/g, ' ');
    if (spaced !== key) tagTransNorm[spaced] = tagTranslations[key];
  });

  // Get display name based on current language
  function getDisplayName(tagName) {
    var lang = (typeof localStorage !== 'undefined' && localStorage.getItem('siteLanguage')) || 'en';
    if (lang === 'zh-CN' && tagTransNorm[tagName]) {
      return tagTransNorm[tagName];
    }
    return tagName;
  }

  // Calculate the label visibility threshold
  var showAllLabels = data.nodes.length <= 18;

  // Prepare nodes
  data.nodes.forEach(function (node) {
    node.itemStyle = {
      color: colorMap[node.name],
      borderColor: '#fff',
      borderWidth: 1.5,
      shadowBlur: 5,
      shadowColor: 'rgba(0, 0, 0, 0.06)'
    };
    node.label = {
      show: showAllLabels || node.symbolSize >= 28,
      formatter: function () { return getDisplayName(node.name); },
      fontSize: Math.max(10, Math.min(15, 9 + node.value * 0.8)),
      color: '#555',
      fontFamily: '"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    };
  });

  // === Hint overlay: fade in on hover, auto-hide after 3s ===
  var hintEl = graphContainer.querySelector('.tag-graph-hint');
  var hintTimer = null;
  var hintShown = false;

  function showHint() {
    if (hintShown) return;
    hintShown = true;
    hintEl.classList.add('visible');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      hintEl.classList.remove('visible');
      hintShown = false;
    }, 3000);
  }

  graphContainer.addEventListener('mouseenter', showHint);

  // Dynamically load ECharts
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js';
  script.onload = function () { initChart(); };
  script.onerror = function () {
    loadingEl.textContent = 'Failed to load chart library';
    loadingEl.style.color = '#c44';
  };
  document.head.appendChild(script);

  function calcRepulsion(count) {
    if (count < 10) return 220;
    if (count < 20) return 320;
    if (count < 40) return 420;
    return 550;
  }

  function initChart() {
    // Remove loading indicator
    if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);

    var chart = echarts.init(container);

    var option = {
      backgroundColor: 'transparent',
      tooltip: {
        show: true,
        enterable: false,
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        borderColor: '#e8e8e8',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#4b4848',
          fontFamily: '"noto-sans-sc", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 13
        },
        extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); max-height: 260px; overflow-y: auto;',
        formatter: function (params) {
          if (params.dataType === 'node') {
            var displayName = getDisplayName(params.name);
            var html = '<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:' +
              (colorMap[params.name] || '#795da3') + '">' +
              displayName + '</div>';
            html += '<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 ' + params.value + ' article' + (params.value > 1 ? 's' : '') + '</div>';
            // Show article titles
            var titles = data.postTitles && data.postTitles[params.name];
            if (titles && titles.length > 0) {
              html += '<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">';
              titles.forEach(function (title) {
                var safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += '<div style="color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">• ' + safeTitle + '</div>';
              });
              html += '</div>';
            }
            return html;
          }
          if (params.dataType === 'edge') {
            return '<span style="font-weight:600">' + getDisplayName(params.data.source) + '</span>' +
              ' <span style="color:#bbb">↔</span> ' +
              '<span style="font-weight:600">' + getDisplayName(params.data.target) + '</span>' +
              '<br/><span style="color:#999;font-size:12px">Co-occurrence: ' + params.data.value + '</span>';
          }
        }
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        type: 'graph',
        layout: 'force',
        data: data.nodes,
        links: data.links,
        roam: true,
        draggable: true,
        force: {
          repulsion: calcRepulsion(data.nodes.length),
          edgeLength: [60, 200],
          gravity: 0.08,
          friction: 0.6,
          layoutAnimation: true
        },
        emphasis: {
          focus: 'adjacency',
          blurScope: 'global',
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(121, 93, 163, 0.45)',
            borderWidth: 2,
            borderColor: '#fff'
          },
          lineStyle: {
            width: 3,
            opacity: 0.85
          },
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333'
          }
        },
        label: {
          position: 'right',
          distance: 6
        },
        lineStyle: {
          color: '#d0d0d0',
          curveness: 0.2,
          opacity: 0.35
        },
        scaleLimit: {
          min: 0.4,
          max: 4
        }
      }]
    };

    chart.setOption(option);

    // Click node → navigate to tag page
    chart.on('click', function (params) {
      if (params.dataType === 'node' && data.tagPaths && data.tagPaths[params.name]) {
        window.location.href = data.tagPaths[params.name];
      }
    });

    // Cursor feedback
    chart.on('mouseover', function (params) {
      if (params.dataType === 'node') {
        container.style.cursor = 'pointer';
      }
    });
    chart.on('mouseout', function () {
      container.style.cursor = 'default';
    });

    // Responsive resize
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { chart.resize(); }, 150);
    });

    // Listen for language changes and refresh labels
    window.addEventListener('storage', function (e) {
      if (e.key === 'siteLanguage') {
        chart.setOption(option);
      }
    });

    // Also re-render when language is switched on the same page
    var origSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      origSetItem.call(localStorage, key, value);
      if (key === 'siteLanguage') {
        setTimeout(function () { chart.setOption(option); }, 50);
      }
    };
  }
})();
