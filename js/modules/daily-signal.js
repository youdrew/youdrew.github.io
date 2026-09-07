/**
 * 每日 AI 信号（/daily/ signal 引擎）客户端交互。
 *
 * 页面结构由 lib/signal-render.js 构建期出好（.signal 根 + data-audiobase），
 * 这里只接管三件事：
 *   1. 逐条朗读：点 .pkey 从 R2 取 <audioBase>/<id>.m4a 播放，再点暂停。
 *   2. 分类连播：点某类标题后的 .secplay，顺序播放该类所有条目（必看单独一组）。
 *   3. 全部卡片默认折叠，通过原生 details 支持点击和键盘展开。
 *   4. 跳转药丸：点 .dpill 平滑滚到对应分类。
 *
 * 单个隐藏 <audio> 作播放引擎，正在播放的条目/卡片 .playing 点亮。JS 不可用时
 * 页面仍是完整可读的静态列表（音频按钮只是无反应）。
 */
export function initSignal() {
  const root = document.querySelector('.signal');
  if (!root) return;

  const refreshPanel = root.querySelector('.dnav__center');
  document.addEventListener('click', (event) => {
    if (refreshPanel?.open && !refreshPanel.contains(event.target)) refreshPanel.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && refreshPanel?.open) {
      refreshPanel.open = false;
      refreshPanel.querySelector('summary')?.focus();
    }
  });

  const base = (root.getAttribute('data-audiobase') || '').replace(/\/$/, '');
  const player = new Audio();
  player.hidden = true;
  player.preload = 'none';
  player.dataset.signalPlayer = '';
  root.append(player);
  const speech = window.speechSynthesis;
  const status = root.querySelector('.signal__audio-status');
  let speaking = false;
  let generation = 0;
  const announce = (text) => {
    if (status) status.textContent = text;
  };
  let curId = null;
  let chain = [];
  let pos = 0;
  let scope = null;

  const url = (id) =>
    cardsOf(id).find((c) => c.dataset.audio)?.dataset.audio || `${base}/${id}.m4a`;
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
      b.setAttribute('aria-pressed', String(!!on));
      b.classList.toggle('playing', on);
      const t = b.querySelector('.t');
      if (t) t.textContent = on ? '暂停' : '连播';
    });
  }

  function cancelSpeech() {
    generation++;
    if (speaking && speech) speech.cancel();
    speaking = false;
  }

  function playId(id) {
    cancelSpeech();
    player.pause();
    if (curId) highlight(curId, false);
    curId = id;
    highlight(id, true);
    announce('');
    player.src = url(id);
    const attempt = generation;
    const p = player.play();
    if (p && p.catch)
      p.catch((error) => {
        if (attempt !== generation || curId !== id || error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') {
          stopScope();
          announce('浏览器暂未允许播放，请再点一次朗读。');
        }
        // 文件不存在/格式不支持由 error 事件统一处理，避免重复启动朗读。
      });
  }

  // 老日报可能没有教程音频；失败时朗读同一条正文，连播仍能继续。
  player.addEventListener('error', () => {
    if (!curId || speaking) return;
    if (!speech || !window.SpeechSynthesisUtterance) {
      stopScope();
      announce('这条语音暂时不可用，请稍后重试。');
      return;
    }
    const card = cardsOf(curId).find((c) => c.matches('article'));
    const title = card?.querySelector('.drow__title, .mcard__t')?.textContent || '';
    const body = card?.querySelector('.drow__dek, .mcard__detail p')?.textContent || '';
    const utterance = new window.SpeechSynthesisUtterance(`${title}。${body}`);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.05;
    const voice = speech.getVoices().find((v) => /^zh[-_]CN/i.test(v.lang));
    if (voice) utterance.voice = voice;
    const attempt = generation;
    speaking = true;
    announce('正在使用浏览器语音朗读。');
    utterance.onend = () => {
      if (attempt !== generation) return;
      speaking = false;
      advance();
    };
    utterance.onerror = () => {
      if (attempt !== generation) return;
      stopScope();
      announce('语音播放失败，请稍后重试。');
    };
    speech.speak(utterance);
  });

  function startScope(s) {
    chain = scopeIds(s);
    pos = 0;
    scope = chain.length ? s : null;
    paintSecplay();
    if (chain.length) playId(chain[0]);
  }

  function stopScope() {
    cancelSpeech();
    scope = null;
    chain = [];
    paintSecplay();
    player.pause();
    if (curId) {
      highlight(curId, false);
      curId = null;
    }
  }

  function advance() {
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
  }
  player.addEventListener('ended', advance);
  window.addEventListener('pagehide', stopScope);

  // 逐条播放键
  root.querySelectorAll('.pkey').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = b.dataset.id;
      if (curId === id && (!player.paused || speaking)) {
        stopScope();
        announce('');
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
      if (scope === s && (!player.paused || speaking)) {
        stopScope();
        return;
      }
      startScope(s);
    });
  });

  // 顶部切换：点「必看」只看必看、点任一分类只看资讯（并滚到该类）。data-view 驱动显隐。
  const pills = [].slice.call(root.querySelectorAll('.dpill'));
  function setSection(sec, scroll = false) {
    if (!pills.some((p) => p.dataset.sec === sec)) sec = pills[0]?.dataset.sec;
    root.setAttribute('data-view', sec === 'featured' ? 'featured' : 'news');
    pills.forEach((p) => {
      const selected = p.dataset.sec === sec;
      p.classList.toggle('active', selected);
      if (selected) p.setAttribute('aria-current', 'page');
      else p.removeAttribute('aria-current');
    });
    root.querySelectorAll('.dpaper .dsec').forEach((section) => {
      section.hidden = section.id !== `sec-${sec}`;
    });
    if (scroll) {
      const top = root.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }
  pills.forEach((p) => {
    p.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = p.dataset.sec;
      window.history.replaceState(null, '', `#sec-${sec}`);
      setSection(sec, true);
    });
  });
  const fromHash = () => setSection(window.location.hash.replace(/^#sec-/, ''));
  window.addEventListener('hashchange', fromHash);
  fromHash();
}
