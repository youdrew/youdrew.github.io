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
 * 另外，本节每条新闻 callout 的标题行被重排成「编号 · 播放键 · 标题」：
 * 编号复用 TOC 大纲的 data-toc-number（与侧栏一致），播放键取代原来的
 * callout 图标，点击从该条对应的口播段落开始朗读。条目 ↔ 段落靠文本
 * token 匹配（口播会合并/跳过条目，按位置对齐不可靠）；匹配不到的条目
 * 仍给按钮，回退到前一条已匹配的位置，但不参与点亮。正在朗读的条目
 * 卡片同步点亮琥珀标记。
 *
 * 跟读高亮沿用字数线性估算（TTS 管线没有逐句时间戳；中文合成语速
 * 均匀，段落级误差可忽略）。JS 不可用时原始 callout 原样保留。
 *
 * 仅在 body.type-daily-feed（/daily/ 与每日资讯文章页）上激活。
 */

import { newsLabel } from './news-label.js';

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

/**
 * 条目标题 → 口播段落的文本匹配。
 *
 * token = 标题里的英文词（≥3 字符，人名/产品/论文缩写是最强信号）+
 * 连续中文串（≥2 字）。段落里每命中一个 token 记其长度为分（Set 去重，
 * 长 token 更独特、权重自然更高），取最高分段落；总分不过阈值视为
 * "口播没讲这条"，不注按钮。
 */
// 阈值取 10：正好放进「命中一个 ≥10 字符的独特标识符」（AgenticSTS、
// SkillCoach 这类论文缩写），而口播整条跳过的条目（无标识符命中，
// 只有 "for" 藏在 "transformer" 里之类的碎屑分）远低于此。
const MATCH_MIN_SCORE = 10;

function matchTokens(text) {
  const ascii = text.match(/[A-Za-z][A-Za-z0-9-]{2,}/g) || [];
  const cjk = text.match(/[一-鿿]{2,}/g) || [];
  return new Set([...ascii, ...cjk].map((s) => s.toLowerCase()));
}

function bestParagraph(title, paraTexts) {
  const tokens = matchTokens(title);
  let best = -1;
  let bestScore = 0;
  let bestAt = 0;
  paraTexts.forEach((text, i) => {
    const low = text.toLowerCase();
    let score = 0;
    let firstAt = Infinity;
    tokens.forEach((tok) => {
      const at = low.indexOf(tok);
      if (at !== -1) {
        score += tok.length;
        if (at < firstAt) firstAt = at;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      best = i;
      bestAt = firstAt === Infinity ? 0 : firstAt;
    }
  });
  if (bestScore < MATCH_MIN_SCORE) return { para: -1, offset: 0 };
  // Back up from the first matched token to the START of its sentence. This is
  // what fixes "clicking item N starts at the tail of item N-1": when one spoken
  // paragraph wraps up the previous story before introducing this one, the seek
  // lands on the sentence that names THIS item, skipping the leading transition —
  // yet a token already in the paragraph's first sentence yields offset ≈ 0, so
  // an item's own opening line is never clipped.
  const text = paraTexts[best];
  let s = bestAt;
  while (s > 0 && !/[。！？!?；;\n]/.test(text[s - 1])) s--;
  return { para: best, offset: s };
}

const SVG_PLAY =
  '<svg class="daily-player__ic-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 4.3a1 1 0 0 1 1.53-.85l12 7.7a1 1 0 0 1 0 1.7l-12 7.7a1 1 0 0 1-1.53-.85Z"/></svg>';
const SVG_PAUSE =
  '<svg class="daily-player__ic-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/></svg>';
const SVG_ITEM_PLAY =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 4.3a1 1 0 0 1 1.53-.85l12 7.7a1 1 0 0 1 0 1.7l-12 7.7a1 1 0 0 1-1.53-.85Z"/></svg>';
const SVG_ITEM_PAUSE =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/></svg>';

// 从条目正文的来源链接里提炼一个短标签，供卡片脸的 byline 显示：
//   "X：美团 LongCat (@Meituan_LongCat)" → "X · @Meituan_LongCat"
//   "Hacker News 热门（buzzing.cc 中文翻译）" → "Hacker News"
//   "MarkTechPost（RSS）" → "MarkTechPost"；兜底取「（」「：」前的头部。
function sourceLabel(a) {
  const t = ((a && a.textContent) || '').trim();
  const handle = (t.match(/@[A-Za-z0-9_]+/) || [])[0];
  if (handle) return `X · ${handle}`;
  if (/hacker\s*news|ycombinator|buzzing/i.test(t)) return 'Hacker News';
  if (/marktechpost/i.test(t)) return 'MarkTechPost';
  const head = t.split(/[（(：:]/)[0].trim();
  return head.slice(0, 22) || '来源';
}

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
    this.itemsByPara = [];
    this.activeItemBtn = null; // 条目播放键里最近控制播放的那个（用于再点暂停/继续）
    if (this.paras.length) this.attachItemButtons();
  }

  /**
   * 本节（音频卡片之后、下一个标题之前）的每条新闻 callout：把标题行
   * 重排成「编号 · 播放键 · 标题」——编号取 TOC stamp 的 data-toc-number
   * （与侧栏大纲一致），播放键取代原 callout 图标。点击播放键从该条对应
   * 的口播段落开始朗读；口播合并/跳过的条目匹配不到，回退到前一条已匹配
   * 段落的位置（保持顺序单调），但不登记进 itemsByPara —— 点亮只跟真正
   * 匹配上的条目走，避免误点亮。
   */
  attachItemButtons() {
    const items = [];
    let el = this.root.nextElementSibling;
    while (el && !/^H[1-6]$/.test(el.tagName)) {
      if (el.matches && el.matches('details.callout') && !el.querySelector('audio')) {
        items.push(el);
      }
      el = el.nextElementSibling;
    }
    const paraTexts = this.paras.map((p) => p.textContent);
    let runningPara = 0; // 口播跳过的条目回退到这里（上一条匹配段落 / 本节开头）

    items.forEach((item) => {
      const summary = item.querySelector('summary');
      if (!summary) return;
      item.classList.add('daily-item');

      const matched = bestParagraph(summary.textContent || '', paraTexts);
      const para = matched.para === -1 ? runningPara : matched.para;
      if (matched.para !== -1) {
        runningPara = matched.para;
        (this.itemsByPara[matched.para] || (this.itemsByPara[matched.para] = [])).push(item);
      }
      // Fine seek target: matched items jump to the sentence that introduces them
      // (paragraph start + intra-paragraph offset);口播 skipped items fall back to
      // the previous match's paragraph start.
      const seekF =
        matched.para === -1 ? this.paraStartF(para) : this.paraFrac(para, matched.offset);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'daily-item-play';
      btn.dataset.para = String(para); // 命中/回退的口播段落（也方便线上排查）
      btn.setAttribute('aria-label', '从这条开始朗读');
      btn.setAttribute('title', '从这条开始朗读');
      btn.innerHTML = SVG_ITEM_PLAY;
      // 播放键 = 播放/暂停开关：点「别的条」→ 跳到该条并播；点「当前正在
      // 控制的这条」→ 播放中就暂停、暂停中就从暂停处继续（不回跳）。图标随
      // 播放状态在 ▶/⏸ 之间切换（见 setItemBtnState + play/pause 事件）。
      btn.addEventListener('click', (e) => {
        e.preventDefault(); // 别顺手折叠/展开 details
        e.stopPropagation();
        if (this.activeItemBtn === btn) {
          if (this.audio.paused) {
            const p = this.audio.play();
            if (p && p.catch) p.catch(() => {});
          } else {
            this.audio.pause();
          }
        } else {
          this.setActiveItemBtn(btn);
          this.seekToFrac(seekF);
        }
      });

      // 标题去噪：砍掉 handle / 英文副标 / 与正文重复的描述尾巴，留一个干净
      // 的头（比 TOC 宽松，保留人名后的职务/公司），完整原文进 title 悬浮。
      const titleInner = summary.querySelector('.callout-title-inner');
      if (titleInner) {
        const original = titleInner.textContent.trim();
        const clean = newsLabel(original, item.dataset.callout || '', { short: false });
        if (clean && clean !== original) {
          titleInner.textContent = clean;
          titleInner.setAttribute('title', original);
        }
      }

      // 版式 A（编号杂志栏）：把 summary 重排成一张卡片脸——
      //   [编号] │ [标题 ……… 播放键]   ← headrow，始终显示
      //          [两行摘要 dek]          ← 收起时显示，展开由 CSS 隐藏、让位给正文
      //          [来源 byline]           ← 收起时显示
      // 收起＝干净卡片；点开＝原生 <details> 展开完整 .callout-content 正文。
      const main = document.createElement('div');
      main.className = 'daily-item-main';
      const head = document.createElement('div');
      head.className = 'daily-item-headrow';
      if (titleInner) head.appendChild(titleInner); // 从 summary 移入 headrow
      head.appendChild(btn); // 播放键在标题行右侧
      main.appendChild(head);

      // 摘要 dek＝正文首段里 🔗 之前的描述（多数条目描述与来源同段，按 🔗 切开）；
      // 来源＝正文最后一个链接（🔗 来源总在末尾，比取"第一个链接"更稳）。
      const content = item.querySelector('.callout-content');
      const firstP = content && content.querySelector('p');
      if (firstP) {
        const dekText = firstP.textContent.split(/\u{1F517}/u)[0].trim();
        if (dekText) {
          const dek = document.createElement('span'); // span, not <p>: dodges .content p rules (mobile margin etc.)
          dek.className = 'daily-item-dek';
          dek.textContent = dekText;
          main.appendChild(dek);
        }
      }
      const links = content ? content.querySelectorAll('a[href]') : [];
      const srcA = links.length ? links[links.length - 1] : null;
      if (srcA) {
        const src = document.createElement('span');
        src.className = 'daily-item-src';
        src.textContent = sourceLabel(srcA);
        main.appendChild(src);
      }

      const num = item.dataset.tocNumber;
      if (num) {
        const noEl = document.createElement('span');
        noEl.className = 'daily-item-no';
        noEl.textContent = num;
        summary.appendChild(noEl);
      }
      summary.appendChild(main);
    });
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
      this.clearActiveItemBtn(); // 拖主进度条＝离开条目键控制，复位其图标
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
      // 条目上的琥珀标记只表示「此刻正在读」——暂停即熄（文稿段落的
      // 高亮保留，当作面板内的进度书签）。
      this.setItemsLit(false);
      if (this.activeItemBtn) this.setItemBtnState(this.activeItemBtn, false);
    });
    audio.addEventListener('ended', () => {
      this.el.dataset.state = 'idle';
      this.btn.setAttribute('aria-label', '播放');
      this.setCurrentPara(-1, false);
      this.clearActiveItemBtn();
    });
  }

  onPlay() {
    this.el.dataset.state = 'playing';
    this.btn.setAttribute('aria-label', '暂停');
    this.registry.forEach((player) => {
      if (player !== this && !player.audio.paused) player.audio.pause();
    });
    // Do NOT auto-open the transcript — reading the transcript is a low-
    // frequency, opt-in action; a panel unfolding on its own reads as a bug
    // ("I never clicked 文稿, why did it open?"). The per-item amber marker
    // already shows which story the voice is on. Only the 文稿 button opens it.
    this.setItemsLit(true);
    if (this.activeItemBtn) this.setItemBtnState(this.activeItemBtn, true);
  }

  setItemsLit(lit) {
    (this.itemsByPara[this.current] || []).forEach((item) =>
      item.classList.toggle('is-reading-item', lit)
    );
  }

  // 条目播放键的 ▶/⏸ 图标：playing=true 显示暂停键（点它会停）。
  setItemBtnState(btn, playing) {
    if (!btn) return;
    btn.innerHTML = playing ? SVG_ITEM_PAUSE : SVG_ITEM_PLAY;
    const lbl = playing ? '暂停朗读' : '从这条开始朗读';
    btn.setAttribute('aria-label', lbl);
    btn.setAttribute('title', lbl);
    btn.classList.toggle('is-playing', playing);
  }

  // 记录当前由哪个条目播放键控制播放；换一条时把上一条的图标切回 ▶。
  setActiveItemBtn(btn) {
    if (this.activeItemBtn && this.activeItemBtn !== btn) {
      this.setItemBtnState(this.activeItemBtn, false);
    }
    this.activeItemBtn = btn;
  }

  // 播放已离开任何条目键（文稿跳段 / 拖主进度条 / 播完）→ 复位图标。
  clearActiveItemBtn() {
    if (this.activeItemBtn) this.setItemBtnState(this.activeItemBtn, false);
    this.activeItemBtn = null;
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

  /** Fraction at the START of paragraph i (== end of the previous paragraph). */
  paraStartF(i) {
    return i <= 0 ? 0 : this.ends[i - 1];
  }

  /** Fraction of a char offset WITHIN paragraph i (linear-by-length, like ends). */
  paraFrac(i, offset) {
    const startF = this.paraStartF(i);
    const endF = this.ends[i];
    const len = Math.max(1, (this.paras[i] ? this.paras[i].textContent : '').length);
    const within = Math.min(1, Math.max(0, offset / len));
    return startF + within * (endF - startF);
  }

  seekToFrac(startF) {
    this.ensureMetadata(() => {
      this.audio.currentTime = Math.max(0, startF) * this.audio.duration + 0.01;
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    });
  }

  seekToPara(i) {
    this.seekToFrac(this.paraStartF(i));
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
    (this.itemsByPara[this.current] || []).forEach((item) =>
      item.classList.remove('is-reading-item')
    );
    this.current = idx;
    const cur = this.paras[idx];
    if (!cur) return;
    cur.classList.add('is-reading');
    this.setItemsLit(!this.audio.paused);
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
