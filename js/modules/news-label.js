/**
 * Shared label extraction for daily news callouts.
 *
 * The upstream title lines (follow-builders / aihot) pack a lot after the
 * name or title: a social handle ("· swyx on X" / "· 嘉宾 X"), the English
 * paper title in full-width parens, and a description after an em-dash that
 * simply repeats the callout body. This strips that noise down to a clean
 * head. Two aggressiveness levels:
 *
 *   short=false (card headline)  keep the identifying name/title —
 *     "Swyx · swyx on X — Swyx — best known…"           → "Swyx"
 *     "Nan Yu, head of product @ Linear · thenanyu…"    → "Nan Yu, head of product @ Linear"
 *     "生数科技发布 Vidu S1，推动… — 7月3日，生数…"       → "生数科技发布 Vidu S1，推动…"
 *
 *   short=true (TOC sidebar)     also drop the role after the first comma and
 *     hard-cap the length, so a long mixed title can't fill the narrow drawer
 *     on a phone (Eugene: keep TOC titles within ~15 中文字符) —
 *     "Nan Yu, head of product @ Linear · thenanyu…"    → "Nan Yu"
 *     "程序即权重：用编程范式实现模糊函数（Program…）"    → "程序即权重：用编程范式实现模…"
 *
 * The em-dash cut is skipped for quote/cite callouts (podcasts): there the
 * episode title lives after the dash, so cutting would gut the label.
 */

// Cap at ~maxUnits visual units (CJK / full-width ≈ 1, else ≈ 0.5), appending
// an ellipsis when truncated.
function capVisual(s, maxUnits) {
  let units = 0;
  let out = '';
  for (const ch of s) {
    // CJK symbols/punctuation, CJK ideographs (ext-A + unified) and full/
    // half-width forms count as one visual unit; everything else ~half. Uses
    // numeric code points so no literal CJK glyph (e.g. the full-width space)
    // sits in the source as "irregular whitespace".
    const c = ch.codePointAt(0);
    const wide =
      (c >= 0x3000 && c <= 0x303f) || (c >= 0x3400 && c <= 0x9fff) || (c >= 0xff00 && c <= 0xffef);
    units += wide ? 1 : 0.5;
    if (units > maxUnits) return out.replace(/\s+$/, '') + '…';
    out += ch;
  }
  return out;
}

export function newsLabel(summaryText, dataCallout, opts = {}) {
  let s = (summaryText || '').trim();

  const paren = s.search(/[（(]/);
  if (paren > 4) s = s.slice(0, paren); // drop English paper title in parens

  const mid = s.indexOf(' · ');
  if (mid > 0) s = s.slice(0, mid); // drop "· handle on X" / "· 嘉宾 X"

  if (dataCallout !== 'quote' && dataCallout !== 'cite') {
    const dash = s.indexOf(' — ');
    if (dash > 0) s = s.slice(0, dash); // drop the description tail (repeats the body)
  }

  s = s.trim();

  if (opts.short) {
    const comma = s.search(/[，,]/);
    if (comma > 1) s = s.slice(0, comma); // drop the role/company suffix
    s = capVisual(s, 15);
  }

  return s;
}
