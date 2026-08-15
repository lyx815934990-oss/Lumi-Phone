import type { BrowserDataset } from './types'

/** 空数据集：无任何本地 mock，内容一律由 AI 生成后写入 */
export function emptyBrowserDataset(): BrowserDataset {
  return {
    frequents: [],
    recents: [],
    suggests: [],
    serpByQuery: {},
    articles: {},
    forums: {},
    history: [],
    bookmarkFolders: [{ id: 'all', name: '全部' }],
    bookmarks: [],
    sharedPages: [],
    openTabs: [
      {
        id: 'tab_home',
        title: '新标签页',
        url: '',
        screen: 'newtab',
        thumbTone: 'linear-gradient(145deg,#ebe8e2,#d9d5ce)',
      },
    ],
  }
}

export function shortenUrl(url: string, max = 28): string {
  try {
    const u = new URL(url)
    const path = `${u.host}${u.pathname}`.replace(/\/$/, '')
    if (path.length <= max) return path
    return `${path.slice(0, max - 1)}…`
  } catch {
    return url.length <= max ? url : `${url.slice(0, max - 1)}…`
  }
}

export function highlightQuery(text: string, query: string): Array<{ t: string; hit: boolean }> {
  const q = query.trim()
  if (!q) return [{ t: text, hit: false }]
  const parts: Array<{ t: string; hit: boolean }> = []
  let rest = text
  const lowerQ = q.toLowerCase()
  while (rest.length) {
    const idx = rest.toLowerCase().indexOf(lowerQ)
    if (idx < 0) {
      parts.push({ t: rest, hit: false })
      break
    }
    if (idx > 0) parts.push({ t: rest.slice(0, idx), hit: false })
    parts.push({ t: rest.slice(idx, idx + q.length), hit: true })
    rest = rest.slice(idx + q.length)
  }
  return parts
}
