/**
 * localStorage-backed persistence for TOC panel position and size.
 *
 * Wrapped in try/catch because localStorage can throw in private-mode
 * Safari and when quota is exceeded. We never want a storage failure
 * to break the TOC itself.
 */
const KEY = 'toc-panel-state';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(patch) {
  try {
    const current = loadState() || {};
    const next = { ...current, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* swallow — persistence is best-effort */
  }
}
