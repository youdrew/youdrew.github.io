/**
 * 每日 AI 信号（/daily/ signal 引擎）客户端交互。
 *
 * 页面结构由 lib/signal-render.js 构建期出好（.signal 根 + data-audiobase），
 * 这里只接管三件事：
 *   1. 逐条朗读：点 .pkey 从 R2 取 <audioBase>/<id>.m4a 播放，再点暂停。
 *   2. 分类连播：点某类标题后的 .secplay，顺序播放该类所有条目（必看单独一组）。
 *   3. 必看卡片：点 .mcard 展开 / 收起 ~240 字详情（点播放键或链接不触发）。
 *   4. 跳转药丸：点 .dpill 平滑滚到对应分类。
 *
 * 单个隐藏 <audio> 作播放引擎，正在播放的条目/卡片 .playing 点亮。JS 不可用时
 * 页面仍是完整可读的静态列表（音频按钮只是无反应）。
 */
export function initSignal() {
  const root = document.querySelector('.signal');
  if (!root) return;

  const base = (root.getAttribute('data-audiobase') || '').replace(/\/$/, '');
  const player = new Audio();
  let curId = null;
  let chain = [];
  let pos = 0;
  let scope = null;

  const url = (id) => `${base}/${id}.m4a`;
  const cardsOf = (id) => Array.from(root.querySelectorAll(`[data-id="${CSS.escape(id)}"]`));
  const highlight = (id, on) => cardsOf(id).forEach((c) => c.classList.toggle('playing', on));

  // 某个作用域（featured / 分类 key）下的条目 id，去重保序。
  function scopeIds(s) {
    const sel = s === 'featured' ? '#sec-featured .has-audio' : `#sec-${s} .drow.has-audio`;
    const ids = [];
    const seen = {};
    root.querySelectorAll(sel).forEach((c) => {
      const d = c.dataset.id;
      if (d && !seen[d]) {
        seen[d] = 1;
        ids.push(d);
      }
    });
    return ids;
  }

  function paintSecplay() {
    root.querySelectorAll('.secplay').forEach((b) => {
      const on = scope && b.dataset.scope === scope;
      b.classList.toggle('playing', on);
      const t = b.querySelector('.t');
      if (t) t.textContent = on ? '暂停' : '连播';
    });
  }

  function playId(id) {
    if (curId) highlight(curId, false);
    curId = id;
    highlight(id, true);
    player.src = url(id);
    const p = player.play();
    if (p && p.catch) p.catch(() => {});
  }

  function startScope(s) {
    chain = scopeIds(s);
    pos = 0;
    scope = s;
    paintSecplay();
    if (chain.length) playId(chain[0]);
  }

  function stopScope() {
    scope = null;
    chain = [];
    paintSecplay();
    player.pause();
    if (curId) {
      highlight(curId, false);
      curId = null;
    }
  }

  player.addEventListener('ended', () => {
    if (scope) {
      pos++;
      if (pos < chain.length) {
        playId(chain[pos]);
        return;
      }
    }
    scope = null;
    paintSecplay();
    if (curId) {
      highlight(curId, false);
      curId = null;
    }
  });

  // 逐条播放键
  root.querySelectorAll('.pkey').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = b.dataset.id;
      if (curId === id && !player.paused) {
        player.pause();
        highlight(id, false);
        curId = null;
        scope = null;
        paintSecplay();
        return;
      }
      scope = null;
      paintSecplay();
      playId(id);
    });
  });

  // 分类连播键
  root.querySelectorAll('.secplay').forEach((b) => {
    b.addEventListener('click', () => {
      const s = b.dataset.scope;
      if (scope === s && !player.paused) {
        stopScope();
        return;
      }
      startScope(s);
    });
  });

  // 必看卡片展开
  root.querySelectorAll('.mcard').forEach((c) => {
    c.addEventListener('click', (e) => {
      if (e.target.closest('.pkey') || e.target.closest('a')) return;
      c.classList.toggle('open');
    });
  });

  // 分类跳转药丸：平滑滚动 + 吸顶让位
  root.querySelectorAll('.dpill').forEach((p) => {
    p.addEventListener('click', (e) => {
      e.preventDefault();
      const el = root.querySelector(p.getAttribute('href'));
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
}
