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

  // Archive filter tags (guide nodes)
  var archiveFilterTags = data.archiveFilterTags || [];
  var archiveFilterSet = {};
  archiveFilterTags.forEach(function (t) { archiveFilterSet[t] = true; });

  function normalizeTagKey(name) {
    return String(name || '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // === Node size: determined by article count (node.value) ===
  // Edge count is still tracked separately, only used to scale label font size.
  var edgeCount = {};
  data.links.forEach(function (link) {
    edgeCount[link.source] = (edgeCount[link.source] || 0) + 1;
    edgeCount[link.target] = (edgeCount[link.target] || 0) + 1;
  });
  var maxValue = 1;
  data.nodes.forEach(function (node) {
    var v = node.value || 0;
    if (v > maxValue) maxValue = v;
  });
  data.nodes.forEach(function (node) {
    var v = node.value || 0;
    node.symbolSize = Math.max(12, Math.min(70, 12 + v * (58 / maxValue)));
  });

  // === BFS distance from archive_filter_tags ===
  var adj = {};
  data.nodes.forEach(function (n) { adj[n.name] = []; });
  function addAdjacency(a, b) {
    if (!adj[a] || !adj[b] || a === b) return;
    if (adj[a].indexOf(b) === -1) adj[a].push(b);
    if (adj[b].indexOf(a) === -1) adj[b].push(a);
  }
  data.links.forEach(function (link) {
    addAdjacency(link.source, link.target);
  });

  // Treat tags that differ only by hyphen vs space as the same semantic neighborhood
  // for coloring purposes, so aliases like Color-Management / Color Management
  // don't break the distance gradient.
  var aliasGroups = {};
  data.nodes.forEach(function (node) {
    var key = normalizeTagKey(node.name);
    if (!aliasGroups[key]) aliasGroups[key] = [];
    aliasGroups[key].push(node.name);
  });
  Object.keys(aliasGroups).forEach(function (key) {
    var group = aliasGroups[key];
    if (group.length < 2) return;
    for (var i = 0; i < group.length; i++) {
      for (var j = i + 1; j < group.length; j++) {
        addAdjacency(group[i], group[j]);
      }
    }
  });
  var dist = {};
  var bfsQueue = [];
  archiveFilterTags.forEach(function (t) {
    if (adj[t] !== undefined) {
      dist[t] = 0;
      bfsQueue.push(t);
    }
  });
  var bfsHead = 0;
  while (bfsHead < bfsQueue.length) {
    var curr = bfsQueue[bfsHead++];
    (adj[curr] || []).forEach(function (nb) {
      if (dist[nb] === undefined) {
        dist[nb] = dist[curr] + 1;
        bfsQueue.push(nb);
      }
    });
  }
  var maxDist = 1;
  Object.keys(dist).forEach(function (k) {
    if (dist[k] > maxDist) maxDist = dist[k];
  });

  // === Color assignment ===
  // High-contrast palette: maximally separated hues for filter tags
  var filterPalette = [
    { h: 260, s: 62, l: 50 },  // purple
    { h: 15,  s: 80, l: 55 },  // orange-red
    { h: 160, s: 60, l: 42 },  // teal-green
    { h: 220, s: 72, l: 52 },  // blue
    { h: 340, s: 70, l: 52 },  // rose-pink
    { h: 45,  s: 85, l: 50 },  // amber
    { h: 190, s: 70, l: 45 },  // cyan
    { h: 90,  s: 55, l: 45 },  // lime-green
    { h: 290, s: 60, l: 50 },  // magenta
    { h: 30,  s: 75, l: 48 },  // burnt orange
    { h: 130, s: 50, l: 42 },  // forest green
    { h: 0,   s: 70, l: 55 }   // red
  ];

  function hslToStr(h, s, l) {
    return 'hsl(' + Math.round(h) + ', ' + Math.round(s) + '%, ' + Math.round(l) + '%)';
  }

  var colorMap = {};
  var filterHSL = {}; // store HSL for each filter tag
  var filterNodes = data.nodes.filter(function (n) { return archiveFilterSet[n.name]; });
  filterNodes.sort(function (a, b) { return b.value - a.value; });
  filterNodes.forEach(function (node, i) {
    var c = filterPalette[i % filterPalette.length];
    filterHSL[node.name] = c;
    colorMap[node.name] = hslToStr(c.h, c.s, c.l);
  });

  // BFS distance from each individual filter tag to all nodes
  var distFromFilter = {}; // distFromFilter[filterName][nodeName] = BFS distance
  archiveFilterTags.forEach(function (ft) {
    if (adj[ft] === undefined) return;
    var d = {};
    d[ft] = 0;
    var q = [ft];
    var qi = 0;
    while (qi < q.length) {
      var c = q[qi++];
      (adj[c] || []).forEach(function (nb) {
        if (d[nb] === undefined) {
          d[nb] = d[c] + 1;
          q.push(nb);
        }
      });
    }
    distFromFilter[ft] = d;
  });

  // Non-filter tags: weighted color blending from all reachable filter tags
  // Using inverse-square weighting for perceptual distance attenuation
  var nonFilterNodes = data.nodes.filter(function (n) { return !archiveFilterSet[n.name]; });

  // Find global max BFS distance for normalization
  var globalMaxDist = 1;
  nonFilterNodes.forEach(function (node) {
    var closest = Infinity;
    archiveFilterTags.forEach(function (ft) {
      if (!distFromFilter[ft]) return;
      var d = distFromFilter[ft][node.name];
      if (d !== undefined && d < closest) closest = d;
    });
    if (closest < Infinity && closest > globalMaxDist) globalMaxDist = closest;
  });

  nonFilterNodes.forEach(function (node) {
    var weights = [];
    var totalWeight = 0;
    archiveFilterTags.forEach(function (ft) {
      if (!distFromFilter[ft] || !filterHSL[ft]) return;
      var d = distFromFilter[ft][node.name];
      if (d === undefined) return; // unreachable
      if (d === 0) d = 0.5;
      // Inverse-square: 1/d^2 gives natural perceptual falloff
      var w = 1.0 / (d * d);
      weights.push({ ft: ft, w: w });
      totalWeight += w;
    });

    if (totalWeight === 0) {
      // Disconnected from all filter tags → neutral gray
      colorMap[node.name] = 'hsl(0, 0%, 82%)';
      return;
    }

    // Circular mean for hue (to handle wrap-around, e.g. 350° + 10°)
    var sinSum = 0, cosSum = 0, sSum = 0, lSum = 0;
    weights.forEach(function (wt) {
      var nw = wt.w / totalWeight;
      var c = filterHSL[wt.ft];
      var hRad = c.h * Math.PI / 180;
      sinSum += Math.sin(hRad) * nw;
      cosSum += Math.cos(hRad) * nw;
      sSum += c.s * nw;
      lSum += c.l * nw;
    });
    var blendH = Math.atan2(sinSum, cosSum) * 180 / Math.PI;
    if (blendH < 0) blendH += 360;
    var blendS = sSum;
    var blendL = lSum;

    // Perceptual fade: normalize closest distance to [0, 1] based on actual graph diameter
    var closestDist = Infinity;
    weights.forEach(function (wt) {
      var d = distFromFilter[wt.ft][node.name];
      if (d < closestDist) closestDist = d;
    });
    // t=0 means directly adjacent to filter, t=1 means farthest node
    var t = (closestDist - 1) / Math.max(globalMaxDist - 1, 1);
    t = Math.max(0, Math.min(1, t));
    // Fade by moving toward a lighter pastel, not toward grayscale.
    var tPerceptual = Math.pow(t, 0.85);
    var minSaturation = 32;
    var satScale = 1 - tPerceptual * 0.35;
    blendS = Math.max(minSaturation, blendS * satScale);
    // Lightness: shift toward a soft pastel range for distant nodes.
    blendL = blendL + tPerceptual * (82 - blendL) * 0.78;

    colorMap[node.name] = hslToStr(blendH, blendS, blendL);
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

  // === Initial positions: place filter nodes in a circle, others in outer ring ===
  var containerRect = graphContainer.getBoundingClientRect();
  var cw = containerRect.width || 500;
  var ch = containerRect.height || 400;
  var innerRadius = Math.min(cw, ch) * 0.28;
  filterNodes.forEach(function (node, i) {
    var angle = (2 * Math.PI * i) / Math.max(filterNodes.length, 1) - Math.PI / 2;
    node.x = cw / 2 + innerRadius * Math.cos(angle);
    node.y = ch / 2 + innerRadius * Math.sin(angle);
  });
  var outerRadius = Math.min(cw, ch) * 0.45;
  nonFilterNodes.forEach(function (node, i) {
    var angle = (2 * Math.PI * i) / Math.max(nonFilterNodes.length, 1);
    node.x = cw / 2 + outerRadius * Math.cos(angle);
    node.y = ch / 2 + outerRadius * Math.sin(angle);
  });

  // Enforce minimum distance between all node pairs to prevent overlap
  var MIN_GAP = 40;
  var allNodes = data.nodes;
  for (var iter = 0; iter < 15; iter++) {
    for (var ni = 0; ni < allNodes.length; ni++) {
      for (var nj = ni + 1; nj < allNodes.length; nj++) {
        var dx = allNodes[nj].x - allNodes[ni].x;
        var dy = allNodes[nj].y - allNodes[ni].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var minD = MIN_GAP + (allNodes[ni].symbolSize + allNodes[nj].symbolSize) / 2;
        if (d < minD) {
          var push = (minD - d) / 2;
          var nx = d > 0.1 ? dx / d : (Math.random() - 0.5);
          var ny = d > 0.1 ? dy / d : (Math.random() - 0.5);
          allNodes[ni].x -= nx * push;
          allNodes[ni].y -= ny * push;
          allNodes[nj].x += nx * push;
          allNodes[nj].y += ny * push;
        }
      }
    }
  }

  // Pre-calculate zoom and center to fit all filter nodes based on initial positions
  var initialZoom = 1;
  var initialCenter = [cw / 2, ch / 2];
  if (filterNodes.length > 0) {
    var fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
    filterNodes.forEach(function (node) {
      var r = (node.symbolSize || 20) / 2 + 50; // extra padding for label
      if (node.x - r < fMinX) fMinX = node.x - r;
      if (node.x + r > fMaxX) fMaxX = node.x + r;
      if (node.y - r < fMinY) fMinY = node.y - r;
      if (node.y + r > fMaxY) fMaxY = node.y + r;
    });
    var fbw = fMaxX - fMinX;
    var fbh = fMaxY - fMinY;
    if (fbw > 0 && fbh > 0) {
      var zx = cw / fbw;
      var zy = ch / fbh;
      initialZoom = Math.min(zx, zy, 1.5) * 0.8;
      if (initialZoom < 0.3) initialZoom = 0.3;
      initialCenter = [(fMinX + fMaxX) / 2, (fMinY + fMaxY) / 2];
    }
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
      show: true,
      formatter: function () { return getDisplayName(node.name); },
      fontSize: Math.max(10, Math.min(15, 9 + (edgeCount[node.name] || 0) * 0.5)),
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
  script.integrity = 'sha384-Mx5lkUEQPM1pOJCwFtUICyX45KNojXbkWdYhkKUKsbv391mavbfoAmONbzkgYPzR';
  script.crossOrigin = 'anonymous';
  script.onload = function () { initChart(); };
  script.onerror = function () {
    loadingEl.textContent = 'Failed to load chart library';
    loadingEl.style.color = '#c44';
  };
  document.head.appendChild(script);

  function calcRepulsion(count) {
    if (count < 10) return 500;
    if (count < 20) return 800;
    if (count < 40) return 1100;
    return 1400;
  }

  function initChart() {
    // Remove loading indicator
    if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);

    var chart = echarts.init(container);

    var option = {
      backgroundColor: 'transparent',
      tooltip: {
        show: true,
        enterable: true,
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
          function escHtml(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
          function postRow(title, path) {
            var safeTitle = escHtml(title);
            var safePath = escHtml(path);
            var common = 'style="display:block;color:#666;font-size:11px;line-height:1.6;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;text-decoration:none;"';
            if (safePath) {
              return '<a href="' + safePath + '" ' + common + '>• ' + safeTitle + '</a>';
            }
            return '<div ' + common + '>• ' + safeTitle + '</div>';
          }
          if (params.dataType === 'node') {
            var displayName = getDisplayName(params.name);
            var html = '<div style="font-weight:600;font-size:14px;margin-bottom:5px;color:' +
              (colorMap[params.name] || '#795da3') + '">' +
              escHtml(displayName) + '</div>';
            html += '<div style="color:#777;font-size:12px;margin-bottom:6px;">📄 ' + params.value + ' article' + (params.value > 1 ? 's' : '') + '</div>';
            var titles = data.postTitles && data.postTitles[params.name];
            if (titles && titles.length > 0) {
              html += '<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;">';
              titles.forEach(function (item) {
                // Backwards-compatible: item may be a string or { title, path }
                if (typeof item === 'string') {
                  html += postRow(item, '');
                } else {
                  html += postRow(item.title, item.path);
                }
              });
              html += '</div>';
            }
            return html;
          }
          if (params.dataType === 'edge') {
            var srcName = params.data.source;
            var tgtName = params.data.target;
            var html = '<span style="font-weight:600">' + escHtml(getDisplayName(srcName)) + '</span>' +
              ' <span style="color:#bbb">↔</span> ' +
              '<span style="font-weight:600">' + escHtml(getDisplayName(tgtName)) + '</span>';
            html += '<br/><span style="color:#999;font-size:12px">📄 ' + params.data.value + ' article' + (params.data.value > 1 ? 's' : '') + '</span>';
            var edgeKey = [srcName, tgtName].sort().join('\t');
            var sharedPosts = data.linkPosts && data.linkPosts[edgeKey];
            if (sharedPosts && sharedPosts.length > 0) {
              html += '<div style="max-height:160px;overflow-y:auto;border-top:1px solid #eee;padding-top:5px;margin-top:5px;">';
              sharedPosts.forEach(function (p) {
                html += postRow(p.title, p.path);
              });
              html += '</div>';
            }
            return html;
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
        roam: false,
        draggable: true,
        force: {
          repulsion: calcRepulsion(data.nodes.length),
          edgeLength: [100, 300],
          gravity: 0.12,
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
          width: 1.5,
          curveness: 0,
          opacity: 0.35
        },
        scaleLimit: {
          min: 0.3,
          max: 4
        },
        zoom: initialZoom,
        center: initialCenter
      }]
    };

    chart.setOption(option);

    // After force layout stabilizes, re-fit to ensure all filter nodes are visible
    if (filterNodes.length > 0) {
      var fitAttempts = 0;
      var fitInterval = setInterval(function () {
        fitAttempts++;
        // Sample current positions from the chart's internal model
        var model = chart.getModel();
        var series0 = model && model.getSeriesByIndex && model.getSeriesByIndex(0);
        var graph = series0 && series0.getGraph && series0.getGraph();
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        var validCount = 0;
        filterNodes.forEach(function (node) {
          var gNode = graph && graph.getNodeByName && graph.getNodeByName(node.name);
          var layout = gNode && gNode.getLayout && gNode.getLayout();
          var x, y;
          if (layout && layout.length >= 2) {
            x = layout[0]; y = layout[1];
          } else {
            x = node.x || 0; y = node.y || 0;
          }
          var r = (node.symbolSize || 20) / 2 + 50;
          if (x - r < minX) minX = x - r;
          if (x + r > maxX) maxX = x + r;
          if (y - r < minY) minY = y - r;
          if (y + r > maxY) maxY = y + r;
          validCount++;
        });
        if (validCount > 0) {
          var bw = maxX - minX;
          var bh = maxY - minY;
          if (bw > 0 && bh > 0) {
            var zoomX = cw / bw;
            var zoomY = ch / bh;
            var zoom = Math.min(zoomX, zoomY, 1.5) * 0.8;
            if (zoom < 0.3) zoom = 0.3;
            currentZoom = zoom;
            currentCenter = [(minX + maxX) / 2, (minY + maxY) / 2];
            chart.setOption({
              series: [{
                zoom: zoom,
                center: currentCenter.slice()
              }]
            });
          }
        }
        // Stop after a few attempts (layout should be stable by then)
        if (fitAttempts >= 4) {
          clearInterval(fitInterval);
        }
      }, 800);
    }

    // Click node → navigate to tag page.
    // Click edge → no-op; the tooltip exposes clickable article links instead,
    // letting the user pick a specific article rather than guessing where the
    // edge will take them.
    chart.on('click', function (params) {
      if (params.dataType === 'node' && data.tagPaths && data.tagPaths[params.name]) {
        window.location.href = data.tagPaths[params.name];
      }
    });

    // Cursor feedback
    chart.on('mouseover', function (params) {
      if (params.dataType === 'node' || params.dataType === 'edge') {
        container.style.cursor = 'pointer';
      }
    });
    chart.on('mouseout', function () {
      container.style.cursor = 'default';
    });

    // Prevent page scroll/zoom when interacting inside the graph container
    var graphEl = graphContainer || container;
    graphEl.addEventListener('wheel', function (e) {
      e.preventDefault();
    }, { passive: false });
    graphEl.addEventListener('touchmove', function (e) {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    }, { passive: false });

    // Unified zoom & pan via ZRender (roam is disabled to avoid dual-layer conflicts)
    var zr = chart.getZr();
    var currentZoom = initialZoom || 1;
    var currentCenter = initialCenter ? [initialCenter[0], initialCenter[1]] : [0, 0];

    // Zoom: mousewheel anywhere on canvas
    zr.on('mousewheel', function (e) {
      e.event.preventDefault();
      e.event.stopPropagation();
      var delta = e.wheelDelta > 0 ? 1.08 : (1 / 1.08);
      var newZoom = currentZoom * delta;
      if (newZoom < 0.3) newZoom = 0.3;
      if (newZoom > 4) newZoom = 4;
      currentZoom = newZoom;
      chart.setOption({ series: [{ zoom: currentZoom }] });
    });

    // Pan: drag anywhere on canvas (not on a node)
    var isPanning = false;
    var panStart = [0, 0];
    var centerAtPanStart = [0, 0];
    zr.on('mousedown', function (e) {
      // Only pan when not clicking on a graph element
      if (!e.target) {
        isPanning = true;
        panStart = [e.event.clientX, e.event.clientY];
        centerAtPanStart = [currentCenter[0], currentCenter[1]];
        container.style.cursor = 'grabbing';
      }
    });
    zr.on('mousemove', function (e) {
      if (isPanning) {
        var dx = e.event.clientX - panStart[0];
        var dy = e.event.clientY - panStart[1];
        // Convert pixel offset to graph coordinate offset (account for zoom & device pixel ratio)
        var cw = container.clientWidth;
        var ch = container.clientHeight;
        var graphW = cw / currentZoom;
        var graphH = ch / currentZoom;
        currentCenter[0] = centerAtPanStart[0] - dx * (graphW / cw);
        currentCenter[1] = centerAtPanStart[1] - dy * (graphH / ch);
        chart.setOption({ series: [{ center: [currentCenter[0], currentCenter[1]] }] });
      }
    });
    zr.on('mouseup', function () {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = 'default';
      }
    });
    zr.on('globalout', function () {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = 'default';
      }
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
