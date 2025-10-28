// image-zoom.js placed in theme source
(function(){
  var overlay, zoomImg, hint;
  var scale = 1, minScale = 0.2, maxScale = 6;
  var lastPos = {x:0,y:0};
  var origin = {x:0,y:0};
  var dragging = false;
  var wheelTimeout;

  function buildOverlay(){
    overlay = document.createElement('div');
    overlay.id = 'image-zoom-overlay';
    overlay.className = 'fade-in';
    overlay.innerHTML = '<div class="image-zoom-content"><img class="image-zoom-img" alt="Zoomed Image" draggable="false" /><div class="image-zoom-hint">滚轮缩放，拖动查看，双击关闭</div></div>';
    document.body.appendChild(overlay);
    zoomImg = overlay.querySelector('.image-zoom-img');
    hint = overlay.querySelector('.image-zoom-hint');
    bindOverlayEvents();
  }

  function openOverlay(src){
    if(!overlay) buildOverlay();
    overlay.style.display = 'flex';
    zoomImg.src = src;
    scale = 1; lastPos.x = 0; lastPos.y = 0;
    applyTransform();
    if(hint){
      hint.style.opacity = '1';
      hint.style.transition = 'opacity .5s';
      clearTimeout(hint._hideTimer);
      hint._hideTimer = setTimeout(function(){ hint.style.opacity = '0'; }, 3000);
    }
  }
  function closeOverlay(){
    if(overlay){ overlay.style.display='none'; zoomImg.src=''; }
  }
  function applyTransform(){
    zoomImg.style.transform = 'translate('+lastPos.x+'px,'+lastPos.y+'px) scale('+scale+')';
  }
  function onWheel(e){
    e.preventDefault();
    var rect = zoomImg.getBoundingClientRect();
    var cx = e.clientX - rect.left - rect.width/2;
    var cy = e.clientY - rect.top - rect.height/2;
    var delta = (e.deltaY>0? -0.12: 0.12);
    var newScale = Math.max(minScale, Math.min(maxScale, scale + delta));
    var scaleFactor = newScale/scale;
    // 以鼠标点为中心缩放平移补偿
    lastPos.x = (lastPos.x + cx) * scaleFactor - cx;
    lastPos.y = (lastPos.y + cy) * scaleFactor - cy;
    scale = newScale;
    applyTransform();
    if(hint){ hint.style.opacity = '0.3'; clearTimeout(wheelTimeout); wheelTimeout = setTimeout(function(){hint.style.opacity='1';},400); }
  }
  function onMouseDown(e){ if(e.button!==0) return; dragging=true; origin.x=e.clientX; origin.y=e.clientY; overlay.style.cursor='grabbing'; }
  function onMouseMove(e){ if(!dragging) return; var dx=e.clientX-origin.x; var dy=e.clientY-origin.y; origin.x=e.clientX; origin.y=e.clientY; lastPos.x+=dx; lastPos.y+=dy; applyTransform(); }
  function onMouseUp(){ dragging=false; if(overlay) overlay.style.cursor='default'; }
  function onDblClick(){ closeOverlay(); }
  function onKey(e){ if(e.key==='Escape' && overlay && overlay.style.display==='flex') closeOverlay(); }

  function bindOverlayEvents(){
    zoomImg.addEventListener('wheel', onWheel, {passive:false});
    zoomImg.addEventListener('mousedown', onMouseDown);
    zoomImg.addEventListener('dblclick', onDblClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) closeOverlay(); });
  }

  function bindImages(){
    var selector = 'article img, .markdown-body img, .post img, .entry-content img, .content img, .main-content img, .page img';
    var imgs = document.querySelectorAll(selector);
    imgs.forEach(function(img){
      if(!img.classList.contains('image-zoomable')){
        img.classList.add('image-zoomable');
        img.style.cursor='zoom-in';
        img.addEventListener('click', function(){ openOverlay(img.getAttribute('data-origin')|| img.src); });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bindImages);
  // MutationObserver 更高效而不是 setInterval
  var observer = new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      if(muts[i].addedNodes.length){ bindImages(); break; }
    }
  });
  observer.observe(document.documentElement || document.body, {childList:true, subtree:true});
})();
