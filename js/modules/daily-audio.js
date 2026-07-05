/**
 * 每日资讯音频区 — web 原生播放器 + 跟读高亮。
 *
 * Mac 转换器发布的正文里，语音是一个「本节语音」callout 包着原生
 * <audio controls>，后面跟一个「跟读文稿」折叠 callout。Markdown 味的
 * 框套框读起来太重，这里在客户端整体重建成一个播放器卡片：
 *
 *   ┌ .daily-audio ─────────────────────────────────────┐
 *   │ (▶)  🐦 博主 & 播客 · 语音速览        0:42 / 4:07  │
 *   │      ━━━━━●──────────────────          1.25× 文稿 │
 *   ├ .daily-transcript（点「文稿」展开，播放时自动展开）┤
 *   │  段落… ← 正在朗读的段落带琥珀色高亮，点击可跳播    │
 *   └───────────────────────────────────────────────────┘
 *
 * 跟读高亮沿用字数线性估算（TTS 管线没有逐句时间戳；中文合成语速
 * 均匀，段落级误差可忽略）。JS 不可用时原始 callout 原样保留。
 *
 * 仅在 body.type-daily-feed（/daily/ 与每日资讯文章页）上激活。
 */

const NEAR_PX = 160; // 「仍在文稿附近」的视口余量
const RATES = [1, 1.25, 1.5, 2];
const RATE_KEY = 'daily-audio-rate';

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function loadRate() {
  try {
    const v = parseFloat(localStorage.getItem(RATE_KEY));
    return RATES.includes(v) ? v : 1;
  } catch {
    return 1;
  }
}

function saveRate(rate) {
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* best-effort */
  }
}

/** 语音 callout 后面若干个兄弟里找「跟读文稿」callout。 */
function transcriptFor(host) {
  let el = host.nextElementSibling;
  for (let hops = 0; el && hops < 4; hops++) {
    if (/^H[1-6]$/.test(el.tagName) || el.querySelector('audio')) return null;
    if (el.matches('details.callout[data-callout="note"]')) {
      const summary = el.querySelector('summary');
      if (summary && /跟读/.test(summary.textContent || '')) return el;
    }
    el = el.nextElementSibling;
  }
  return null;
}

/** 往前找所属小节标题（H1–H6），作为播放器的标题。 */
function sectionLabel(host) {
  let el = host.previousElementSibling;
  while (el) {
    if (/^H[1-6]$/.test(el.tagName)) return (el.textContent || '').trim();
    el = el.previousElementSibling;
  }
  return '';
}

const SVG_PLAY =
  '<svg class="daily-player__ic-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 4.3a1 1 0 0 1 1.53-.85l12 7.7a1 1 0 0 1 0 1.7l-12 7.7a1 1 0 0 1-1.53-.85Z"/></svg>';
const SVG_PAUSE =
  '<svg class="daily-player__ic-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/></svg>';

class Player {
  constructor(audio, host, registry) {
    this.audio = audio;
    this.registry = registry;
    this.dragging = false;
    this.pendingMeta = null;

    // ---- 组 DOM：wrapper 占据原 callout 的位置 -------------------------
    const label = sectionLabel(host);
    const transcriptSrc = transcriptFor(host);

    this.root = document.createElement('section');
    this.root.className = 'daily-audio';

    this.el = document.createElement('div');
    this.el.className = 'daily-player';
    this.el.dataset.state = 'idle';
    this.el.innerHTML =
      `<button type="button" class="daily-player__btn" aria-label="播放">${SVG_PLAY}${SVG_PAUSE}</button>` +
      '<div class="daily-player__main">' +
      '<div class="daily-player__meta">' +
      '<span class="daily-player__label"></span>' +
      '<span class="daily-player__time"><span class="daily-player__cur">0:00</span> / <span class="daily-player__dur">--:--</span></span>' +
      '</div>' +
      '<input class="daily-player__seek" type="range" min="0" max="1000" step="1" value="0" aria-label="播放进度">' +
      '</div>' +
      '<div class="daily-player__side">' +
      '<button type="button" class="daily-player__rate" aria-label="播放速度">1×</button>' +
      '</div>';
    this.root.appendChild(this.el);

    this.el.querySelector('.daily-player__label').textContent = label
      ? `${label} · 语音速览`
      : '本节语音';

    // 文稿面板：把「跟读文稿」callout 的正文搬进来，callout 壳丢弃。
    this.panel = null;
    this.paras = [];
    if (transcriptSrc) {
      this.panel = document.createElement('div');
      this.panel.className = 'daily-transcript';
      this.panel.hidden = true;
      const hint = document.createElement('p');
      hint.className = 'daily-transcript__hint';
      hint.textContent = '跟读文稿 · 点击任意段落，从那里开始朗读';
      this.panel.appendChild(hint);
      const content = transcriptSrc.querySelector('.callout-content');
      while (content && content.firstChild) this.panel.appendChild(content.firstChild);
      transcriptSrc.remove();
      this.root.appendChild(this.panel);

      this.tsBtn = document.createElement('button');
      this.tsBtn.type = 'button';
      this.tsBtn.className = 'daily-player__ts';
      this.tsBtn.setAttribute('aria-expanded', 'false');
      this.tsBtn.textContent = '文稿';
      this.el.querySelector('.daily-player__side').appendChild(this.tsBtn);
    }

    host.replaceWith(this.root);
    audio.removeAttribute('controls');
    audio.preload = 'metadata';
    this.root.appendChild(audio); // display:none，仅作播放引擎

    // ---- 跟读估算：段落字数 → 累积时间占比 ----------------------------
    if (this.panel) {
      this.paras = Array.from(this.panel.querySelectorAll('p:not(.daily-transcript__hint)')).filter(
        (p) => p.textContent.trim()
      );
      const weights = this.paras.map((p) => Math.max(1, p.textContent.trim().length));
      const total = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      this.ends = weights.map((w) => (acc += w) / total);
      this.current = -1;
      this.paras.forEach((p, i) => {
        p.classList.add('transcript-para');
        p.setAttribute('title', '点击从这一段开始播放');
        p.addEventListener('click', () => this.seekToPara(i));
      });
    }

    this.bind();
    this.applyRate(loadRate());
  }

  bind() {
    const q = (sel) => this.el.querySelector(sel);
    this.btn = q('.daily-player__btn');
    this.seek = q('.daily-player__seek');
    this.cur = q('.daily-player__cur');
    this.dur = q('.daily-player__dur');
    this.rateBtn = q('.daily-player__rate');
    const audio = this.audio;

    this.btn.addEventListener('click', () => {
      if (audio.paused) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        audio.pause();
      }
    });

    this.rateBtn.addEventListener('click', () => {
      const next = RATES[(RATES.indexOf(audio.playbackRate) + 1) % RATES.length] || 1;
      saveRate(next);
      this.registry.forEach((player) => player.applyRate(next));
    });

    if (this.tsBtn) {
      this.tsBtn.addEventListener('click', () => this.setPanel(this.panel.hidden));
    }

    // 拖动中只预览，不逐帧 seek；松手（change）才提交，避免连环 range 请求。
    this.seek.addEventListener('input', () => {
      this.dragging = true;
      this.paintSeek(Number(this.seek.value) / 1000);
    });
    this.seek.addEventListener('change', () => {
      this.dragging = false;
      const frac = Number(this.seek.value) / 1000;
      this.ensureMetadata(() => {
        audio.currentTime = frac * audio.duration;
      });
    });

    audio.addEventListener('loadedmetadata', () => {
      this.dur.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('durationchange', () => {
      this.dur.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      if (!this.dragging && isFinite(audio.duration) && audio.duration > 0) {
        this.paintSeek(audio.currentTime / audio.duration);
      }
      this.syncPara();
    });
    audio.addEventListener('seeked', () => this.syncPara());
    audio.addEventListener('play', () => this.onPlay());
    audio.addEventListener('pause', () => {
      this.el.dataset.state = 'paused';
      this.btn.setAttribute('aria-label', '播放');
    });
    audio.addEventListener('ended', () => {
      this.el.dataset.state = 'idle';
      this.btn.setAttribute('aria-label', '播放');
      this.setCurrentPara(-1, false);
    });
  }

  onPlay() {
    this.el.dataset.state = 'playing';
    this.btn.setAttribute('aria-label', '暂停');
    this.registry.forEach((player) => {
      if (player !== this && !player.audio.paused) player.audio.pause();
    });
    if (this.panel) this.setPanel(true);
  }

  setPanel(open) {
    if (!this.panel) return;
    this.panel.hidden = !open;
    this.tsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  applyRate(rate) {
    this.audio.playbackRate = rate;
    this.audio.defaultPlaybackRate = rate;
    if (this.rateBtn) this.rateBtn.textContent = `${rate}×`;
  }

  paintSeek(frac) {
    const f = Math.max(0, Math.min(1, frac));
    this.seek.value = String(Math.round(f * 1000));
    this.seek.style.setProperty('--p', `${f * 100}%`);
    if (isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.cur.textContent = fmtTime(f * this.audio.duration);
    }
  }

  /**
   * preload="none"/未加载时必须先拿元数据再 seek + play——
   * play-before-metadata 会被 Chromium 当成「纯视频后台媒体」掐掉。
   */
  ensureMetadata(cb) {
    const audio = this.audio;
    if (audio.readyState >= 1 && isFinite(audio.duration) && audio.duration > 0) {
      cb();
      return;
    }
    if (this.pendingMeta) audio.removeEventListener('loadedmetadata', this.pendingMeta);
    this.pendingMeta = () => {
      this.pendingMeta = null;
      cb();
    };
    audio.addEventListener('loadedmetadata', this.pendingMeta, { once: true });
    audio.preload = 'metadata';
    audio.load();
  }

  // ---- 跟读高亮 ---------------------------------------------------------

  seekToPara(i) {
    const startF = i === 0 ? 0 : this.ends[i - 1];
    this.ensureMetadata(() => {
      this.audio.currentTime = startF * this.audio.duration + 0.01;
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    });
  }

  syncPara() {
    if (!this.paras.length) return;
    const d = this.audio.duration;
    if (!isFinite(d) || d <= 0) return;
    const f = this.audio.currentTime / d;
    let idx = this.ends.findIndex((e) => f < e);
    if (idx === -1) idx = this.paras.length - 1;
    this.setCurrentPara(idx, !this.audio.paused);
  }

  setCurrentPara(idx, follow) {
    if (idx === this.current) return;
    const prev = this.paras[this.current];
    if (prev) prev.classList.remove('is-reading');
    this.current = idx;
    const cur = this.paras[idx];
    if (!cur) return;
    cur.classList.add('is-reading');
    // 温和跟随：读者还停留在文稿附近才滚动，滚走了就不打扰。
    const anchor = prev || this.panel;
    if (follow && anchor && this.nearViewport(anchor)) {
      cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  nearViewport(el) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return r.bottom > -NEAR_PX && r.top < vh + NEAR_PX;
  }
}

export class DailyAudio {
  constructor() {
    if (!document.body.classList.contains('type-daily-feed')) return;
    const registry = [];
    Array.from(document.querySelectorAll('.content audio')).forEach((audio) => {
      const host = audio.closest('details.callout, div.callout');
      if (!host) return;
      registry.push(new Player(audio, host, registry));
    });
  }
}
