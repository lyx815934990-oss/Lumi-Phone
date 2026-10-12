import type { AnimeCharacterPick } from '../forumTypes'
import { cacheGet, cacheKeyChars, cacheKeySearch, cacheSet } from './searchCache'

const ANILIST_URL = 'https://graphql.anilist.co'

export type AnimeMediaHit = {
  id: number
  title: string
  coverImage?: string
  year?: number
  format?: string
  source: 'anilist'
}

export type AnimeCharacterHit = {
  id: number
  name: string
  imageUrl?: string
  bio?: string
  mediaTitle: string
  mediaId: number
  source: 'anilist'
}

const SEARCH_QUERY = `
query ($search: String, $type: MediaType, $format_in: [MediaFormat]) {
  Page(perPage: 16) {
    media(search: $search, type: $type, format_in: $format_in) {
      id
      type
      format
      title { romaji native english }
      coverImage { medium }
      seasonYear
      startDate { year }
    }
  }
}
`

const CHARS_QUERY = `
query ($id: Int) {
  Media(id: $id) {
    id
    title { romaji native english }
    characters(perPage: 25, sort: ROLE) {
      nodes {
        id
        name { full native alternative }
        image { medium }
        description(asHtml: false)
      }
    }
  }
}
`

async function anilistGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`AniList 请求失败（HTTP ${res.status}）`)
    const data = (await res.json()) as { data?: T; errors?: Array<{ message?: string }> }
    if (data.errors?.length) {
      throw new Error(data.errors[0]?.message || 'AniList 查询失败')
    }
    if (!data.data) throw new Error('AniList 无数据')
    return data.data
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message))) {
      throw new Error('AniList 搜索超时')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function pickTitle(t: { romaji?: string | null; native?: string | null; english?: string | null } | null | undefined): string {
  return (t?.native || t?.romaji || t?.english || '').trim() || '未命名作品'
}

function stripHtmlLite(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

type AnilistMediaNode = {
  id: number
  type?: string
  format?: string
  title?: { romaji?: string; native?: string; english?: string }
  coverImage?: { medium?: string }
  seasonYear?: number
  startDate?: { year?: number | null }
}

function mapMediaHits(nodes: Array<AnilistMediaNode | null | undefined> | null | undefined): AnimeMediaHit[] {
  const hits: AnimeMediaHit[] = []
  const seen = new Set<number>()
  for (const m of nodes ?? []) {
    if (!m?.id || seen.has(m.id)) continue
    seen.add(m.id)
    const year =
      typeof m.seasonYear === 'number'
        ? m.seasonYear
        : typeof m.startDate?.year === 'number'
          ? m.startDate.year
          : undefined
    hits.push({
      id: m.id,
      title: pickTitle(m.title),
      coverImage: m.coverImage?.medium?.trim() || undefined,
      year,
      format: m.format || m.type || undefined,
      source: 'anilist',
    })
  }
  return hits
}

/** 按类型搜动画 / 漫画（可限制动画 format） */
export async function searchAnimeAnilist(
  query: string,
  opts?: {
    searchAnime?: boolean
    searchManga?: boolean
    animeFormats?: string[] | null
  },
): Promise<AnimeMediaHit[]> {
  const q = query.trim()
  if (!q) return []
  const searchAnime = opts?.searchAnime !== false
  const searchManga = opts?.searchManga !== false
  if (!searchAnime && !searchManga) return []

  const formatsKey = opts?.animeFormats?.length ? opts.animeFormats.join(',') : 'all'
  const key = cacheKeySearch(
    `anilist:${searchAnime ? 'a' : ''}${searchManga ? 'm' : ''}:${formatsKey}:${q}`,
  )
  const cached = cacheGet<AnimeMediaHit[]>(key)
  if (cached) return cached

  type SearchPage = { Page?: { media?: Array<AnilistMediaNode | null> | null } }
  const tasks: Array<Promise<SearchPage>> = []
  if (searchAnime) {
    const variables: Record<string, unknown> = { search: q, type: 'ANIME' }
    if (opts?.animeFormats?.length) variables.format_in = opts.animeFormats
    tasks.push(
      anilistGraphql<SearchPage>(SEARCH_QUERY, variables).catch(() => ({ Page: { media: [] } })),
    )
  }
  if (searchManga) {
    tasks.push(
      anilistGraphql<SearchPage>(SEARCH_QUERY, { search: q, type: 'MANGA' }).catch(() => ({
        Page: { media: [] },
      })),
    )
  }

  const pages = await Promise.all(tasks)
  const hits = pages.flatMap((p) => mapMediaHits(p.Page?.media)).slice(0, 24)

  cacheSet(key, hits)
  return hits
}

export async function listCharactersAnilist(mediaId: number): Promise<AnimeCharacterHit[]> {
  const key = cacheKeyChars(mediaId, 'anilist')
  const cached = cacheGet<AnimeCharacterHit[]>(key)
  if (cached) return cached

  const data = await anilistGraphql<{
    Media?: {
      id: number
      title?: { romaji?: string; native?: string; english?: string }
      characters?: {
        nodes?: Array<{
          id: number
          name?: { full?: string; native?: string; alternative?: string[] | null }
          image?: { medium?: string }
          description?: string | null
        } | null> | null
      }
    } | null
  }>(CHARS_QUERY, { id: mediaId })

  const media = data.Media
  if (!media) return []
  const mediaTitle = pickTitle(media.title)
  const hits: AnimeCharacterHit[] = []
  for (const n of media.characters?.nodes ?? []) {
    if (!n?.id) continue
    const name = (n.name?.native || n.name?.full || '').trim()
    if (!name) continue
    const bioRaw = typeof n.description === 'string' ? stripHtmlLite(n.description) : ''
    hits.push({
      id: n.id,
      name,
      imageUrl: n.image?.medium?.trim() || undefined,
      bio: bioRaw ? bioRaw.slice(0, 280) : undefined,
      mediaTitle,
      mediaId: media.id,
      source: 'anilist',
    })
  }
  cacheSet(key, hits)
  return hits
}

export function toAnimeCharacterPick(
  hit: AnimeCharacterHit,
  bio?: string,
): AnimeCharacterPick {
  return {
    mediaTitle: hit.mediaTitle,
    characterName: hit.name,
    characterBio: (bio ?? hit.bio)?.trim() || undefined,
    imageUrl: hit.imageUrl,
    source: 'anilist',
    mediaId: hit.mediaId,
    characterId: hit.id,
  }
}
