import type { AnimeCharacterPick } from '../forumTypes'
import { cacheGet, cacheKeyChars, cacheKeySearch, cacheSet } from './searchCache'
import type { AnimeCharacterHit, AnimeMediaHit } from './anilistClient'

const JIKAN_BASE = 'https://api.jikan.moe/v4'

export type JikanMediaHit = Omit<AnimeMediaHit, 'source'> & {
  source: 'jikan'
  /** anime | manga — 决定角色列表 API 路径 */
  mediaKind: 'anime' | 'manga'
}

export type JikanCharacterHit = Omit<AnimeCharacterHit, 'source'> & {
  source: 'jikan'
  mediaKind: 'anime' | 'manga'
}

async function jikanGet<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN_BASE}${path}`)
  if (!res.ok) throw new Error(`Jikan 请求失败（HTTP ${res.status}）`)
  return (await res.json()) as T
}

type JikanMediaRaw = {
  mal_id: number
  title?: string
  title_japanese?: string
  year?: number
  images?: { jpg?: { image_url?: string } }
}

function mapJikanMedia(rows: JikanMediaRaw[] | undefined, mediaKind: 'anime' | 'manga'): JikanMediaHit[] {
  const hits: JikanMediaHit[] = []
  for (const m of rows ?? []) {
    if (!m?.mal_id) continue
    hits.push({
      id: m.mal_id,
      title: (m.title_japanese || m.title || '').trim() || '未命名作品',
      coverImage: m.images?.jpg?.image_url?.trim() || undefined,
      year: typeof m.year === 'number' ? m.year : undefined,
      format: mediaKind === 'manga' ? 'MANGA' : 'ANIME',
      source: 'jikan',
      mediaKind,
    })
  }
  return hits
}

/** 动画 + 漫画兜底搜索，可按类型裁剪 */
export async function searchAnimeJikan(
  query: string,
  opts?: { searchAnime?: boolean; searchManga?: boolean },
): Promise<JikanMediaHit[]> {
  const q = query.trim()
  if (!q) return []
  const searchAnime = opts?.searchAnime !== false
  const searchManga = opts?.searchManga !== false
  if (!searchAnime && !searchManga) return []

  const key = cacheKeySearch(`jikan:${searchAnime ? 'a' : ''}${searchManga ? 'm' : ''}:${q}`)
  const cached = cacheGet<JikanMediaHit[]>(key)
  if (cached) return cached

  const enc = encodeURIComponent(q)
  const tasks: Array<Promise<{ data?: JikanMediaRaw[] }>> = []
  if (searchAnime) {
    tasks.push(jikanGet<{ data?: JikanMediaRaw[] }>(`/anime?q=${enc}&limit=8`).catch(() => ({ data: [] })))
  }
  if (searchManga) {
    tasks.push(jikanGet<{ data?: JikanMediaRaw[] }>(`/manga?q=${enc}&limit=8`).catch(() => ({ data: [] })))
  }
  const pages = await Promise.all(tasks)

  const seen = new Set<string>()
  const hits: JikanMediaHit[] = []
  let pageIdx = 0
  if (searchAnime) {
    for (const h of mapJikanMedia(pages[pageIdx++]?.data, 'anime')) {
      const k = `${h.mediaKind}:${h.id}`
      if (seen.has(k)) continue
      seen.add(k)
      hits.push(h)
    }
  }
  if (searchManga) {
    for (const h of mapJikanMedia(pages[pageIdx++]?.data, 'manga')) {
      const k = `${h.mediaKind}:${h.id}`
      if (seen.has(k)) continue
      seen.add(k)
      hits.push(h)
    }
  }

  cacheSet(key, hits)
  return hits
}

export async function listCharactersJikan(
  mediaId: number,
  mediaTitle: string,
  mediaKind: 'anime' | 'manga' = 'anime',
): Promise<JikanCharacterHit[]> {
  const key = cacheKeyChars(mediaId, `jikan:${mediaKind}`)
  const cached = cacheGet<JikanCharacterHit[]>(key)
  if (cached) return cached

  const path = mediaKind === 'manga' ? `/manga/${mediaId}/characters` : `/anime/${mediaId}/characters`
  const data = await jikanGet<{
    data?: Array<{
      character?: {
        mal_id: number
        name?: string
        images?: { jpg?: { image_url?: string } }
      }
    }>
  }>(path)

  const hits: JikanCharacterHit[] = []
  for (const row of data.data ?? []) {
    const c = row.character
    if (!c?.mal_id) continue
    const name = (c.name || '').trim()
    if (!name) continue
    hits.push({
      id: c.mal_id,
      name,
      imageUrl: c.images?.jpg?.image_url?.trim() || undefined,
      mediaTitle,
      mediaId,
      source: 'jikan',
      mediaKind,
    })
  }
  cacheSet(key, hits)
  return hits
}

export function jikanToPick(hit: JikanCharacterHit, bio?: string): AnimeCharacterPick {
  return {
    mediaTitle: hit.mediaTitle,
    characterName: hit.name,
    characterBio: (bio ?? hit.bio)?.trim() || undefined,
    imageUrl: hit.imageUrl,
    source: 'jikan',
    mediaId: hit.mediaId,
    characterId: hit.id,
  }
}
