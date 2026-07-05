/**
 * 每日资讯「跟读高亮」— 播放语音时始终知道读到了哪一段。
 *
 * TTS 管线不产出逐句时间戳，这里用段落字数对总时长做线性估算：中文
 * 合成语音语速大体均匀，段落级粒度下误差可以忽略。行为：
 *   - 播放时自动展开对应的「跟读文稿」callout，高亮估算的当前段落；
 *   - 温和跟随滚动 —— 仅当读者仍停留在文稿附近时才滚动，滚走了就不打扰；
 *   - 点击文稿任意段落，跳到该段对应的时间点播放（点哪读哪）；
 *   - 同页多段语音互斥播放，正在播放的「本节语音」callout 标出「播放中」。
 *
 * 仅在 body.type-daily-feed（/daily/ 与每日资讯文章页）上激活。
 */

const NEAR_PX = 160; // 「仍在文稿附近」的视口余量

function transcriptFor(audio) {
  const host = audio.closest('details.callout, div.callout');
  if (!host) return null;
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

class SegmentFollower {
  constructor(audio, transcript) {
    this.audio = audio;
    this.transcript = transcript;
    this.host = audio.closest('details.callout, div.callout');
    this.paras = Array.from(transcript.querySelectorAll('.callout-content > p')).filter((p) =>
      p.textContent.trim()
    );
    if (!this.paras.length) return;

    const weights = this.paras.map((p) => Math.max(1, p.textContent.trim().length));
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    this.ends = weights.map((w) => (acc += w) / total);
    this.current = -1;
    this.pendingSeekHandler = null;

    this.paras.forEach((p, i) => {
      p.classList.add('transcript-para');
      p.setAttribute('title', '点击从这一段开始播放');
      p.addEventListener('click', () => this.seekTo(i));
    });

    audio.addEventListener('timeupdate', () => this.sync());
    audio.addEventListener('seeked', () => this.sync());
    audio.addEventListener('play', () => this.onPlay());
    audio.addEventListener('pause', () => this.onPause());
    audio.addEventListener('ended', () => this.onEnded());
  }

  onPlay() {
    if (this.host) this.host.classList.add('is-playing');
    if (this.transcript.tagName === 'DETAILS') this.transcript.open = true;
    this.transcript.classList.add('is-following');
  }

  onPause() {
    if (this.host) this.host.classList.remove('is-playing');
  }

  onEnded() {
    this.onPause();
    this.transcript.classList.remove('is-following');
    this.setCurrent(-1, false);
  }

  sync() {
    const d = this.audio.duration;
    if (!isFinite(d) || d <= 0) return;
    const f = this.audio.currentTime / d;
    let idx = this.ends.findIndex((e) => f < e);
    if (idx === -1) idx = this.paras.length - 1;
    this.setCurrent(idx, !this.audio.paused);
  }

  setCurrent(idx, follow) {
    if (idx === this.current) return;
    const prev = this.paras[this.current];
    if (prev) prev.classList.remove('is-reading');
    this.current = idx;
    const cur = this.paras[idx];
    if (!cur) return;
    cur.classList.add('is-reading');
    const anchor = prev || this.transcript;
    if (follow && this.nearViewport(anchor)) {
      cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  nearViewport(el) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return r.bottom > -NEAR_PX && r.top < vh + NEAR_PX;
  }

  seekTo(i) {
    const startF = i === 0 ? 0 : this.ends[i - 1];
    const audio = this.audio;
    const seekAndPlay = () => {
      audio.currentTime = startF * audio.duration + 0.01;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    };
    if (audio.readyState >= 1 && isFinite(audio.duration) && audio.duration > 0) {
      seekAndPlay();
      return;
    }
    // preload="none"：先拿元数据再 seek + play。play-before-metadata 会被
    // Chromium 当成"纯视频后台媒体"而掐掉，顺序反过来就没事。
    if (this.pendingSeekHandler) {
      audio.removeEventListener('loadedmetadata', this.pendingSeekHandler);
    }
    this.pendingSeekHandler = () => {
      this.pendingSeekHandler = null;
      seekAndPlay();
    };
    audio.addEventListener('loadedmetadata', this.pendingSeekHandler, { once: true });
    audio.preload = 'metadata';
    audio.load();
  }
}

export class DailyTranscript {
  constructor() {
    if (!document.body.classList.contains('type-daily-feed')) return;
    const audios = Array.from(document.querySelectorAll('.content audio'));
    audios.forEach((audio) => {
      const transcript = transcriptFor(audio);
      if (transcript) new SegmentFollower(audio, transcript);
      audio.addEventListener('play', () => {
        audios.forEach((other) => {
          if (other !== audio && !other.paused) other.pause();
        });
      });
    });
  }
}
