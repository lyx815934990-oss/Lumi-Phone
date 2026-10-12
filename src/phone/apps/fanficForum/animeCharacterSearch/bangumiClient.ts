import type { AnimeCharacterPick } from '../forumTypes'
import { cacheGet, cacheKeyChars, cacheKeySearch, cacheSet } from './searchCache'
import type { MediaKindFlag } from './mediaSearchKinds'

/**
 * Bangumi：中文片名强项；含动画/漫画/游戏/三次元（实拍剧与电影）。
 * 浏览器不可直连（CORS + 无法自定义 UA），统一走同源 `/bgm-proxy`。
 */
const BGM_UA = 'LumiFanficForum/1.0 (fanfic character picker; +https://github.com/bangumi/api)'

function bangumiBaseUrl(): string {
  if (typeof window !== 'undefined') return '/bgm-proxy'
  return 'https://api.bgm.tv'
}

export type BangumiMediaHit = {
  id: number
  title: string
  coverImage?: string
  year?: number
  format?: string
  source: 'bangumi'
  mediaKind: MediaKindFlag
}

export type BangumiCharacterHit = {
  id: number
  name: string
  imageUrl?: string
  bio?: string
  mediaTitle: string
  mediaId: number
  source: 'bangumi'
  mediaKind: MediaKindFlag
}

async function bgmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${bangumiBaseUrl()}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': BGM_UA,
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`Bangumi 请求失败（HTTP ${res.status}）`)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message))) {
      throw new Error('Bangumi 搜索超时，请重试')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

type BgmSubject = {
  id: number
  name?: string
  name_cn?: string
  date?: string
  type?: number
  images?: { small?: string; medium?: string; large?: string; common?: string }
}

function mapSubject(s: BgmSubject): BangumiMediaHit | null {
  if (!s?.id) return null
  const title = (s.name_cn || s.name || '').trim()
  if (!title) return null
  const yearRaw = typeof s.date === 'string' ? Number(s.date.slice(0, 4)) : NaN
  let mediaKind: MediaKindFlag = 'anime'
  let format = 'ANIME'
  if (s.type === 1) {
    mediaKind = 'manga'
    format = 'MANGA'
  } else if (s.type === 4) {
    mediaKind = 'game'
    format = 'GAME'
  } else if (s.type === 6) {
    mediaKind = 'real'
    format = 'REAL'
  } else {
    mediaKind = 'anime'
    format = 'ANIME'
  }
  return {
    id: s.id,
    title,
    coverImage: s.images?.medium || s.images?.common || s.images?.large || undefined,
    year: Number.isFinite(yearRaw) ? yearRaw : undefined,
    format,
    source: 'bangumi',
    mediaKind,
  }
}

/**
 * @param types Bangumi subject type：1书 2动画 4游戏 6三次元；默认动画+书
 */
export async function searchAnimeBangumi(
  query: string,
  types: number[] = [2, 1],
): Promise<BangumiMediaHit[]> {
  const q = query.trim()
  if (!q) return []
  const typeList = types.length ? types : [2, 1]
  const key = cacheKeySearch(`bangumi:${typeList.join(',')}:${q}`)
  const cached = cacheGet<BangumiMediaHit[]>(key)
  if (cached) return cached

  const data = await bgmFetch<{ data?: BgmSubject[] }>(`/v0/search/subjects?limit=16`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: q,
      filter: { type: typeList },
    }),
  })

  const seen = new Set<number>()
  const hits: BangumiMediaHit[] = []
  for (const s of data.data ?? []) {
    const hit = mapSubject(s)
    if (!hit || seen.has(hit.id)) continue
    seen.add(hit.id)
    hits.push(hit)
  }
  cacheSet(key, hits)
  return hits
}

export async function listCharactersBangumi(
  mediaId: number,
  mediaTitle: string,
  mediaKind: MediaKindFlag = 'anime',
): Promise<BangumiCharacterHit[]> {
  const key = cacheKeyChars(mediaId, 'bangumi')
  const cached = cacheGet<BangumiCharacterHit[]>(key)
  if (cached) return cached

  const data = await bgmFetch<
    Array<{
      id: number
      name?: string
      name_cn?: string
      images?: { small?: string; medium?: string; large?: string; grid?: string }
    }>
  >(`/v0/subjects/${mediaId}/characters`)

  const hits: BangumiCharacterHit[] = []
  for (const c of data ?? []) {
    if (!c?.id) continue
    const name = (c.name_cn || c.name || '').trim()
    if (!name) continue
    hits.push({
      id: c.id,
      name,
      imageUrl: c.images?.medium || c.images?.large || c.images?.grid || c.images?.small || undefined,
      mediaTitle,
      mediaId,
      source: 'bangumi',
      mediaKind,
    })
  }
  cacheSet(key, hits)
  return hits
}

export function bangumiToPick(hit: BangumiCharacterHit, bio?: string): AnimeCharacterPick {
  return {
    mediaTitle: hit.mediaTitle,
    characterName: hit.name,
    characterBio: (bio ?? hit.bio)?.trim() || undefined,
    imageUrl: hit.imageUrl,
    source: 'bangumi',
    mediaId: hit.mediaId,
    characterId: hit.id,
  }
}
