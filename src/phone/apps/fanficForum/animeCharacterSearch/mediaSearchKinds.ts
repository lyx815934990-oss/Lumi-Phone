/** 选角搜索：作品类型勾选 */

export type MediaSearchKind = 'anime' | 'manga' | 'tv' | 'movie' | 'game'

export const MEDIA_SEARCH_KIND_OPTIONS: Array<{
  id: MediaSearchKind
  label: string
}> = [
  { id: 'anime', label: '动漫' },
  { id: 'manga', label: '漫画' },
  { id: 'tv', label: '电视剧' },
  { id: 'movie', label: '电影' },
  { id: 'game', label: '游戏' },
]

/** 默认：动漫+漫画+电视剧（华语剧有本地兜底） */
export const DEFAULT_MEDIA_SEARCH_KINDS: MediaSearchKind[] = ['anime', 'manga', 'tv']

export type MediaKindFlag = 'anime' | 'manga' | 'real' | 'game'

export function normalizeKinds(kinds: MediaSearchKind[] | undefined | null): MediaSearchKind[] {
  const set = new Set(kinds?.length ? kinds : DEFAULT_MEDIA_SEARCH_KINDS)
  const ordered = MEDIA_SEARCH_KIND_OPTIONS.map((o) => o.id).filter((id) => set.has(id))
  return ordered.length ? ordered : [...DEFAULT_MEDIA_SEARCH_KINDS]
}

export function kindsKey(kinds: MediaSearchKind[]): string {
  return normalizeKinds(kinds).join('+')
}

/** Bangumi subject type：1书 2动画 4游戏 6三次元 */
export function bangumiTypesForKinds(kinds: MediaSearchKind[]): number[] {
  const k = new Set(normalizeKinds(kinds))
  const types: number[] = []
  if (k.has('manga')) types.push(1)
  if (k.has('anime')) types.push(2)
  if (k.has('game')) types.push(4)
  if (k.has('tv') || k.has('movie')) types.push(6)
  return types
}

export function needsAniList(kinds: MediaSearchKind[]): boolean {
  const k = new Set(normalizeKinds(kinds))
  return k.has('anime') || k.has('manga') || k.has('movie')
}

export function needsJikan(kinds: MediaSearchKind[]): boolean {
  return needsAniList(kinds)
}

export function needsBangumi(kinds: MediaSearchKind[]): boolean {
  return bangumiTypesForKinds(kinds).length > 0
}

/** AniList：是否搜 ANIME / MANGA，以及动画 format */
export function anilistPlan(kinds: MediaSearchKind[]): {
  searchAnime: boolean
  searchManga: boolean
  /** null = 不限制 format */
  animeFormats: string[] | null
} {
  const k = new Set(normalizeKinds(kinds))
  const searchManga = k.has('manga')
  const wantSeries = k.has('anime')
  const wantMovie = k.has('movie')
  // 电视剧勾选对 AniList 仅作动画剧集补充（实拍靠 Bangumi）
  const wantTvAnime = k.has('tv') || wantSeries

  if (!wantSeries && !wantMovie && !k.has('tv')) {
    return { searchAnime: false, searchManga, animeFormats: null }
  }

  if (wantSeries && wantMovie) {
    return { searchAnime: true, searchManga, animeFormats: null }
  }
  if (wantMovie && !wantSeries && !k.has('tv')) {
    return { searchAnime: true, searchManga, animeFormats: ['MOVIE'] }
  }
  if ((wantSeries || wantTvAnime) && !wantMovie) {
    return {
      searchAnime: true,
      searchManga,
      animeFormats: ['TV', 'TV_SHORT', 'OVA', 'ONA', 'SPECIAL'],
    }
  }
  return { searchAnime: true, searchManga, animeFormats: null }
}

export function formatLabel(format?: string, mediaKind?: MediaKindFlag | string): string {
  const f = (format || '').toUpperCase()
  if (mediaKind === 'game' || f === 'GAME') return '游戏'
  if (mediaKind === 'real' || f === 'REAL' || f === 'LIVE') return '实拍'
  if (f === 'MOVIE') return '电影'
  if (f === 'MANGA' || f === 'NOVEL' || f === 'ONE_SHOT' || mediaKind === 'manga') return '漫画'
  if (f === 'TV' || f === 'TV_SHORT' || f === 'OVA' || f === 'ONA' || f === 'SPECIAL' || f === 'ANIME') {
    return '动漫'
  }
  if (format) return format
  if (mediaKind === 'anime') return '动漫'
  return ''
}
