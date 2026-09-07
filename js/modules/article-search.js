export function searchTerms(query) {
  return [...new Set(String(query).trim().toLocaleLowerCase().split(/\s+/))]
    .filter(Boolean)
    .slice(0, 8);
}

export function searchArticles(posts, query) {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  return posts
    .flatMap((post) => {
      const title = post.title.toLocaleLowerCase();
      const text = post.text.toLocaleLowerCase();
      const tags = (post.tags || []).join(' ').toLocaleLowerCase();
      if (
        !terms.every((term) => title.includes(term) || text.includes(term) || tags.includes(term))
      ) {
        return [];
      }
      const score = terms.reduce(
        (sum, term) => sum + (title.includes(term) ? 10 : 0) + (tags.includes(term) ? 3 : 0),
        0
      );
      return [{ post, score }];
    })
    .sort((a, b) => b.score - a.score || String(b.post.date).localeCompare(String(a.post.date)))
    .map(({ post }) => post);
}

export function searchSnippet(text, query, length = 160) {
  const lower = text.toLocaleLowerCase();
  const matches = searchTerms(query)
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0);
  const first = matches.length ? Math.min(...matches) : 0;
  const start = Math.max(0, first - 45);
  const end = Math.min(text.length, start + length);
  return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export function highlightSegments(text, query) {
  const terms = searchTerms(query).sort((a, b) => b.length - a.length);
  if (!terms.length) return [{ text, match: false }];
  const expression = new RegExp(
    '(' + terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
    'giu'
  );
  return text.split(expression).map((value, index) => ({ text: value, match: index % 2 === 1 }));
}

function appendHighlight(element, text, query) {
  for (const segment of highlightSegments(text, query)) {
    if (segment.match) {
      const mark = document.createElement('mark');
      mark.textContent = segment.text;
      element.append(mark);
    } else {
      element.append(document.createTextNode(segment.text));
    }
  }
}

export function validSearchPosts(posts, baseUrl) {
  const origin = new URL(baseUrl).origin;
  return posts.flatMap((post) => {
    if (
      !post ||
      typeof post.title !== 'string' ||
      typeof post.text !== 'string' ||
      typeof post.path !== 'string'
    ) {
      return [];
    }
    try {
      const url = new URL(post.path, baseUrl);
      if (url.origin !== origin || !/^https?:$/.test(url.protocol)) return [];
      return [
        {
          ...post,
          path: url.pathname + url.search + url.hash,
          date: typeof post.date === 'string' ? post.date : '',
          tags: Array.isArray(post.tags) ? post.tags.filter((tag) => typeof tag === 'string') : [],
        },
      ];
    } catch {
      // One malformed record must not take the rest of the article index offline.
      return [];
    }
  });
}

export function initArticleSearch() {
  const root = document.getElementById('article-search');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const form = root.querySelector('form');
  const input = root.querySelector('input');
  const clear = root.querySelector('[data-search-clear]');
  const status = root.querySelector('[data-search-status]');
  const results = root.querySelector('[data-search-results]');
  const browse = document.getElementById('archive-browse');
  const zh = root.dataset.lang === 'zh-CN';
  const idleMessage = status.textContent;
  let pendingIndex;
  let revision = 0;
  let timer;
  let composing = false;

  function loadIndex() {
    if (!pendingIndex) {
      pendingIndex = fetch(root.dataset.indexUrl, { credentials: 'same-origin' })
        .then((response) => {
          if (!response.ok) throw new Error('Search index unavailable');
          return response.json();
        })
        .then((data) => {
          if (data.lang !== root.dataset.lang || !Array.isArray(data.posts)) {
            throw new Error('Invalid search index');
          }
          return validSearchPosts(data.posts, window.location.href);
        })
        .catch((error) => {
          pendingIndex = undefined;
          throw error;
        });
    }
    return pendingIndex;
  }

  async function run() {
    clearTimeout(timer);
    const current = ++revision;
    const query = input.value.trim();
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url);
    clear.hidden = !query;
    results.replaceChildren();
    results.hidden = !query;
    root.setAttribute('aria-busy', 'false');
    if (!query) {
      status.textContent = idleMessage;
      if (browse) browse.hidden = false;
      return;
    }
    status.textContent = zh ? '正在搜索…' : 'Searching…';
    root.setAttribute('aria-busy', 'true');
    try {
      const posts = await loadIndex();
      if (current !== revision) return;
      const matches = searchArticles(posts, query);
      for (const post of matches) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = post.path;
        appendHighlight(link, post.title, query);
        const snippet = document.createElement('p');
        appendHighlight(snippet, searchSnippet(post.text, query), query);
        const date = document.createElement('time');
        date.dateTime = post.date || '';
        date.textContent = post.date || '';
        item.append(date, link, snippet);
        results.append(item);
      }
      status.textContent = matches.length
        ? zh
          ? `找到 ${matches.length} 篇文章`
          : `${matches.length} article${matches.length === 1 ? '' : 's'} found`
        : zh
          ? '没有找到相关内容，试试更短的关键词。'
          : 'No matching articles. Try a shorter search.';
      if (browse) browse.hidden = true;
    } catch {
      if (current !== revision) return;
      status.textContent = zh
        ? '搜索暂时不可用，请重新输入重试。也可继续浏览下方归档。'
        : 'Search unavailable. Edit your search to retry, or browse the archive below.';
      if (browse) browse.hidden = false;
    } finally {
      if (current === revision) root.setAttribute('aria-busy', 'false');
    }
  }

  input.addEventListener('input', () => {
    if (composing) return;
    ++revision;
    clearTimeout(timer);
    if (!input.value.trim()) run();
    else timer = setTimeout(run, 180);
  });
  input.addEventListener('compositionstart', () => {
    composing = true;
    ++revision;
    clearTimeout(timer);
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    run();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!composing) run();
  });
  function reset() {
    input.value = '';
    run();
    input.focus();
  }
  clear.addEventListener('click', reset);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !composing) {
      event.preventDefault();
      reset();
    }
  });
  input.value = (new URL(window.location.href).searchParams.get('q') || '').slice(0, 128);
  if (input.value) run();
}
