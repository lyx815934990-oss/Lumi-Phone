import type { LangStudyBookMeta } from './langStudyTypes'
import { getBookById, listBookMetas } from './wordbooks/catalog'
import { coverHintForBookId } from './wordbooks/coverHints'
import { searchTextbookMarket, type TextbookMarketItem } from './wordbooks/textbookMarket'

export type RemoteBookHit = {
  remoteId: string
  source: 'local' | 'google' | 'openlibrary'
  title: string
  subtitle?: string
  authors: string[]
  coverUrl?: string
  infoLink?: string
  publishedYear?: string
  lessonCount?: number
  localBook?: LangStudyBookMeta
  matchScore: number
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[・·．.：:（）()【】\[\]「」『』]/g, '')
}

function scoreLocalMatch(queryTitle: string, book: LangStudyBookMeta): number {
  const q = normalize(queryTitle)
  if (!q) return 0
  const title = normalize(book.title)
  const aliases = (book.searchAliases ?? []).map(normalize)
  const tags = book.tags.map(normalize)
  let score = 0
  if (title && (q.includes(title) || title.includes(q))) score += 80
  for (const a of aliases) {
    if (!a) continue
    if (q.includes(a) || a.includes(q)) score += 70
    if (a.length >= 2 && q.includes(a)) score += 40
  }
  for (const t of tags) {
    if (t.length >= 2 && q.includes(t)) score += 15
  }
  const wantsMinna = /大家的日语|大家日语|みんな|minna|民纳/.test(q)
  const wantsHyojun = /标日|标准日本语|標準日本語|biaori|新标日|hyojun/.test(q)
  const wantsUpper = /上册|初级1|初级上|初級[ⅰi１1]|shokyu-?1|初1/.test(q)
  const wantsLower = /下册|初级2|初级下|初級[ⅱii２2]|shokyu-?2|初2/.test(q)
  const isMinna = book.id.startsWith('minna')
  const isHyojun = book.id.startsWith('hyojun')
  const isUpper = book.id.endsWith('-1') || /上/.test(book.title)
  const isLower = book.id.endsWith('-2') || /下/.test(book.title)

  if (wantsMinna && isMinna) score += 80
  if (wantsMinna && isHyojun) score -= 200
  if (wantsHyojun && isHyojun) score += 80
  if (wantsHyojun && isMinna) score -= 200
  if (wantsUpper && isUpper) score += 50
  if (wantsUpper && isLower) score -= 80
  if (wantsLower && isLower) score += 50
  if (wantsLower && isUpper) score -= 80

  if (/n5|ｎ５/.test(q) && book.id.includes('n5')) score += 40
  if (/n4|ｎ４/.test(q) && book.id.includes('n4')) score += 40
  if (/四级|cet4/.test(q) && book.id.includes('cet4')) score += 40
  if (/六级|cet6/.test(q) && book.id.includes('cet6')) score += 40
  return score
}

export function matchBestLocalBook(
  title: string,
  extraText = '',
): { book: LangStudyBookMeta; score: number } | null {
  const blob = `${title} ${extraText}`
  let best: { book: LangStudyBookMeta; score: number } | null = null
  for (const book of listBookMetas()) {
    const score = scoreLocalMatch(blob, book)
    if (!best || score > best.score) best = { book, score }
  }
  if (!best || best.score < 40) return null
  return best
}

function marketToHit(item: TextbookMarketItem, scoreBoost = 0): RemoteBookHit {
  const book = getBookById(item.localBookId) ?? undefined
  return {
    remoteId: `market:${item.id}`,
    source: 'local',
    title: item.title,
    subtitle: item.subtitle,
    authors: item.authors,
    coverUrl: item.coverUrl || coverHintForBookId(item.localBookId),
    lessonCount: item.lessonCount || undefined,
    localBook: book,
    matchScore: 200 + scoreBoost + (book?.wordCount ? Math.min(50, Math.floor(book.wordCount / 40)) : 0),
  }
}

type GoogleVolume = {
  id?: string
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publishedDate?: string
    infoLink?: string
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
  }
}

function httpsify(url?: string): string | undefined {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, 'https://')
}

async function fetchJsonWithTimeout(
  url: string,
  signal: AbortSignal | undefined,
  label: string,
  timeoutMs = 5000,
): Promise<unknown> {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`${label} ${res.status}`)
    return await res.json()
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

async function searchGoogleBooks(query: string, signal?: AbortSignal): Promise<RemoteBookHit[]> {
  const q = query.trim()
  if (!q) return []
  const url =
    `https://www.googleapis.com/books/v1/volumes?` +
    new URLSearchParams({
      q,
      maxResults: '8',
      printType: 'books',
      orderBy: 'relevance',
    }).toString()
  const data = (await fetchJsonWithTimeout(url, signal, 'Google Books')) as { items?: GoogleVolume[] }
  const items = Array.isArray(data.items) ? data.items : []
  return items
    .map((item) => {
      const info = item.volumeInfo ?? {}
      const title = info.title?.trim() || ''
      if (!title) return null
      const authors = Array.isArray(info.authors) ? info.authors.filter(Boolean) : []
      const matched = matchBestLocalBook(title, `${info.subtitle || ''} ${authors.join(' ')}`)
      const coverUrl =
        httpsify(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail) ||
        (matched ? coverHintForBookId(matched.book.id) : undefined)
      return {
        remoteId: `google:${item.id || title}`,
        source: 'google' as const,
        title,
        subtitle: info.subtitle?.trim() || undefined,
        authors,
        coverUrl,
        infoLink: info.infoLink,
        publishedYear: info.publishedDate?.slice(0, 4),
        localBook: matched?.book,
        matchScore: matched?.score ?? 0,
      } satisfies RemoteBookHit
    })
    .filter(Boolean) as RemoteBookHit[]
}

/**
 * 国内优先：本地教材市场即时出结果（封面+词量+课数）。
 * 外网 Google Books 仅作增强，超时/失败不影响主流程。
 */
export async function searchRemoteWordbooks(
  query: string,
  signal?: AbortSignal,
): Promise<{ hits: RemoteBookHit[]; errors: string[]; fromLocal: boolean }> {
  const q = query.trim()
  if (q.length < 1) return { hits: [], errors: [], fromLocal: true }

  // 1) 国内本地市场（同步、必达）
  const market = searchTextbookMarket(q)
  const hits: RemoteBookHit[] = market.map((item, i) => marketToHit(item, 100 - i))

  // 补：直接匹配 catalog 标题（市场未收录的本地词本）
  const seenLocal = new Set(hits.map((h) => h.localBook?.id).filter(Boolean))
  for (const book of listBookMetas()) {
    const score = scoreLocalMatch(q, book)
    if (score < 30 || seenLocal.has(book.id)) continue
    hits.push({
      remoteId: `local:${book.id}`,
      source: 'local',
      title: book.title,
      subtitle: book.description,
      authors: ['本地词库'],
      coverUrl: coverHintForBookId(book.id),
      localBook: book,
      matchScore: score + 40,
    })
    seenLocal.add(book.id)
  }

  hits.sort((a, b) => b.matchScore - a.matchScore)

  // 2) 外网增强（可选，短超时）
  const errors: string[] = []
  try {
    const google = await searchGoogleBooks(q, signal)
    for (const g of google) {
      if (!g.localBook) continue
      const dup = hits.find((h) => h.localBook?.id === g.localBook?.id)
      if (dup) {
        if (!dup.coverUrl && g.coverUrl) dup.coverUrl = g.coverUrl
        continue
      }
      hits.push(g)
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : '外网图书增强不可用')
  }

  hits.sort((a, b) => {
    const am = (a.localBook ? 1000 : 0) + a.matchScore
    const bm = (b.localBook ? 1000 : 0) + b.matchScore
    return bm - am
  })

  return { hits: hits.slice(0, 30), errors, fromLocal: true }
}

/** 无关键词时：展示教材市场全部（国内默认浏览） */
export function listMarketHits(): RemoteBookHit[] {
  return searchTextbookMarket('').map((item, i) => marketToHit(item, 50 - i))
}
