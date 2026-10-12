/**
 * 统一作品搜索（关键词模糊匹配，不分类型）：
 * - 中文自动译成英/日后再搜
 * - AniList 动画+漫画 ∥ Bangumi 全类型 ∥ 本地热门库
 * - 仍空则 Jikan；结果按相关度排序后全部展示
 */

import { searchAnimeAnilist } from './anilistClient'
import { searchAnimeBangumi, type BangumiMediaHit } from './bangumiClient'
import { expandSearchQueries, scoreTitleByKeywords } from './cnTitleAliases'
import { searchAnimeJikan, type JikanMediaHit } from './jikanClient'
import type { AnimeMediaHit } from './anilistClient'
import { searchLiveCatalog, type CatalogMediaEntry } from './liveCatalog'
import type { MediaKindFlag } from './mediaSearchKinds'
import { translateTitleQuery } from './titleQueryTranslate'
import { hydrateUserTitleAliases } from './userTitleAliases'

export type UnifiedMediaHit = {
  id: number
  title: string
  coverImage?: string
  year?: number
  format?: string
  source: 'anilist' | 'jikan' | 'bangumi'
  mediaKind?: MediaKindFlag
}

/** Bangumi：书/动画/游戏/三次元 全开 */
const BGM_ALL_TYPES = [1, 2, 4, 6]

function toUnified(
  hit: AnimeMediaHit | JikanMediaHit | BangumiMediaHit,
): UnifiedMediaHit {
  let mediaKind: MediaKindFlag | undefined =
    'mediaKind' in hit && hit.mediaKind ? hit.mediaKind : undefined
  if (!mediaKind) {
    const f = (hit.format || '').toUpperCase()
    if (f === 'MANGA' || f === 'NOVEL' || f === 'ONE_SHOT') mediaKind = 'manga'
    else if (f === 'GAME') mediaKind = 'game'
    else if (f === 'REAL' || f === 'LIVE') mediaKind = 'real'
    else mediaKind = 'anime'
  }
  return {
    id: hit.id,
    title: hit.title,
    coverImage: hit.coverImage,
    year: hit.year,
    format: hit.format,
    source: hit.source,
    mediaKind,
  }
}

function dedupeKey(h: UnifiedMediaHit): string {
  return `${h.source}:${h.id}`
}

function titleKey(h: UnifiedMediaHit): string {
  return h.title.replace(/\s+/g, '').toLowerCase()
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} 超时`)), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

async function settledList<T>(p: Promise<T[]>, label: string, ms: number): Promise<{ hits: T[]; err?: string }> {
  try {
    const hits = await withTimeout(p, ms, label)
    return { hits }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[fanfic search] ${label} failed:`, msg)
    return { hits: [], err: msg }
  }
}

function mergeVariants(query: string, translated: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (s: string) => {
    const t = s.trim()
    if (t.length < 2) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push(t)
  }
  for (const t of translated) push(t)
  for (const t of expandSearchQueries(query)) push(t)
  out.sort((a, b) => {
    const aLat = /^[a-z0-9\s\-'.]+$/i.test(a) ? 0 : 1
    const bLat = /^[a-z0-9\s\-'.]+$/i.test(b) ? 0 : 1
    if (aLat !== bLat) return aLat - bLat
    return a.length - b.length
  })
  return out.slice(0, 8)
}

function catalogToUnified(e: CatalogMediaEntry): UnifiedMediaHit {
  return {
    id: e.id,
    title: e.title,
    coverImage: e.coverImage,
    year: e.year,
    format: e.format,
    source: 'bangumi',
    mediaKind: e.mediaKind,
  }
}

/** 多关键词合并；凑够一定数量再停，避免只命中精确一条 */
async function searchAnilistExpanded(variants: string[]): Promise<AnimeMediaHit[]> {
  const byId = new Map<number, AnimeMediaHit>()
  for (const v of variants) {
    const res = await settledList(
      searchAnimeAnilist(v, {
        searchAnime: true,
        searchManga: true,
        animeFormats: null,
      }),
      `AniList:${v}`,
      8_000,
    )
    for (const h of res.hits) {
      if (!byId.has(h.id)) byId.set(h.id, h)
    }
    if (byId.size >= 16) break
  }
  return [...byId.values()]
}

async function searchBangumiExpanded(variants: string[]): Promise<BangumiMediaHit[]> {
  const byId = new Map<number, BangumiMediaHit>()
  for (const v of variants.slice(0, 3)) {
    const res = await settledList(searchAnimeBangumi(v, BGM_ALL_TYPES), `Bangumi:${v}`, 3_500)
    for (const h of res.hits) {
      if (!byId.has(h.id)) byId.set(h.id, h)
    }
    if (byId.size >= 12) break
  }
  return [...byId.values()]
}

async function searchJikanExpanded(variants: string[]): Promise<JikanMediaHit[]> {
  const byKey = new Map<string, JikanMediaHit>()
  for (const v of variants) {
    const res = await settledList(
      searchAnimeJikan(v, { searchAnime: true, searchManga: true }),
      `Jikan:${v}`,
      8_000,
    )
    for (const h of res.hits) {
      const k = `${h.mediaKind}:${h.id}`
      if (!byKey.has(k)) byKey.set(k, h)
    }
    if (byKey.size >= 12) break
  }
  return [...byKey.values()]
}

function rankHits(hits: UnifiedMediaHit[], query: string): UnifiedMediaHit[] {
  return [...hits].sort((a, b) => {
    const ds = scoreTitleByKeywords(b.title, query) - scoreTitleByKeywords(a.title, query)
    if (ds !== 0) return ds
    const srcRank = (s: UnifiedMediaHit['source']) => (s === 'bangumi' ? 0 : s === 'anilist' ? 1 : 2)
    return srcRank(a.source) - srcRank(b.source)
  })
}

export async function searchMediaUnified(query: string): Promise<UnifiedMediaHit[]> {
  const q = query.trim()
  if (!q) return []
  await hydrateUserTitleAliases()

  const translated = await translateTitleQuery(q)
  const variants = mergeVariants(q, translated)

  const catalogHits = searchLiveCatalog(q, { real: true, game: true }).map(catalogToUnified)

  const [anilistHits, bangumiRes] = await Promise.all([
    searchAnilistExpanded(variants).catch((e) => {
      console.warn('[fanfic search] AniList failed:', e)
      return [] as AnimeMediaHit[]
    }),
    settledList(searchBangumiExpanded(variants), 'Bangumi', 6_000),
  ])

  const merged: UnifiedMediaHit[] = []
  const seenId = new Set<string>()
  const seenTitle = new Set<string>()
  const push = (list: UnifiedMediaHit[]) => {
    for (const h of list) {
      const ik = dedupeKey(h)
      const tk = titleKey(h)
      if (seenId.has(ik) || (tk && seenTitle.has(tk))) continue
      seenId.add(ik)
      if (tk) seenTitle.add(tk)
      merged.push(h)
    }
  }

  push(catalogHits)
  push(bangumiRes.hits.map(toUnified))
  push(anilistHits.map(toUnified))

  if (merged.length) return rankHits(merged, q).slice(0, 40)

  const jikanHits = await searchJikanExpanded(variants).catch((e) => {
    console.warn('[fanfic search] Jikan failed:', e)
    return [] as JikanMediaHit[]
  })
  push(jikanHits.map(toUnified))
  return rankHits(merged, q).slice(0, 40)
}
