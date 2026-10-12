import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'
import type { AnimeCharacterPick } from '../forumTypes'
import { listCharactersAnilist, toAnimeCharacterPick } from './anilistClient'
import { bangumiToPick, listCharactersBangumi } from './bangumiClient'
import { jikanToPick, listCharactersJikan } from './jikanClient'
import { suggestRelatedCnTitles } from './cnTitleAliases'
import { getCatalogEntry, listCatalogCharacters } from './liveCatalog'
import { hydrateUserTitleAliases } from './userTitleAliases'
import { formatLabel } from './mediaSearchKinds'
import { searchMediaUnified, type UnifiedMediaHit } from './searchMediaUnified'

type CharRow = {
  id: number
  name: string
  imageUrl?: string
  bio?: string
  mediaTitle: string
  mediaId: number
  source: 'anilist' | 'jikan' | 'bangumi'
  mediaKind?: UnifiedMediaHit['mediaKind']
}

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

function sourceLabel(s: UnifiedMediaHit['source']): string {
  if (s === 'bangumi') return 'Bangumi'
  if (s === 'jikan') return 'Jikan'
  return 'AniList'
}

/**
 * 选角：关键词模糊搜索（不分类型）
 * debounce → 多源合并全量展示 → 无结果提示改用原名 → 手动添加。
 */
export function AnimeCharacterPicker({
  selected,
  onChange,
  className = '',
}: {
  selected: AnimeCharacterPick[]
  onChange: (next: AnimeCharacterPick[]) => void
  className?: string
}) {
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 400)
  const [mediaHits, setMediaHits] = useState<UnifiedMediaHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeMedia, setActiveMedia] = useState<UnifiedMediaHit | null>(null)
  const [chars, setChars] = useState<CharRow[]>([])
  const [charsLoading, setCharsLoading] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualMedia, setManualMedia] = useState('')
  const [manualBio, setManualBio] = useState('')
  const searchGen = useRef(0)

  useEffect(() => {
    void hydrateUserTitleAliases()
  }, [])

  useEffect(() => {
    const q = debounced.trim()
    if (!q) {
      setMediaHits([])
      setSearchError(null)
      setSearching(false)
      setShowManual(false)
      return
    }
    const gen = ++searchGen.current
    setSearching(true)
    setSearchError(null)
    setActiveMedia(null)
    void (async () => {
      try {
        const hits = await searchMediaUnified(q)
        if (gen !== searchGen.current) return
        setMediaHits(hits)
        setShowManual(hits.length === 0)
      } catch (e) {
        if (gen !== searchGen.current) return
        setMediaHits([])
        setShowManual(true)
        setSearchError(e instanceof Error ? e.message : '搜索失败')
      } finally {
        if (gen === searchGen.current) setSearching(false)
      }
    })()
  }, [debounced])

  useEffect(() => {
    if (!activeMedia) {
      setChars([])
      return
    }
    let cancelled = false
    setCharsLoading(true)
    void (async () => {
      try {
        let list: CharRow[] = []
        if (activeMedia.source === 'anilist') {
          list = await listCharactersAnilist(activeMedia.id)
        } else if (activeMedia.source === 'bangumi') {
          const local = listCatalogCharacters(activeMedia.id)
          if (local.length) {
            const media = getCatalogEntry(activeMedia.id)
            list = local.map((c) => ({
              id: c.id,
              name: c.name,
              imageUrl: c.imageUrl,
              bio: c.bio,
              mediaTitle: media?.title ?? activeMedia.title,
              mediaId: activeMedia.id,
              source: 'bangumi' as const,
              mediaKind: activeMedia.mediaKind,
            }))
          } else {
            list = await listCharactersBangumi(
              activeMedia.id,
              activeMedia.title,
              activeMedia.mediaKind ?? 'anime',
            )
          }
        } else {
          list = await listCharactersJikan(
            activeMedia.id,
            activeMedia.title,
            activeMedia.mediaKind === 'manga' ? 'manga' : 'anime',
          )
        }
        if (cancelled) return
        setChars(list)
        if (!list.length) setShowManual(true)
      } catch {
        if (cancelled) return
        setChars([])
        setShowManual(true)
      } finally {
        if (!cancelled) setCharsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeMedia])

  const selectedKey = useMemo(() => {
    return new Set(selected.map((s) => `${s.source}:${s.mediaId}:${s.characterId}:${s.characterName}`))
  }, [selected])

  const relatedTitles = useMemo(() => {
    const q = debounced.trim()
    if (!q || searching || mediaHits.length > 0 || activeMedia) return []
    return suggestRelatedCnTitles(q, 8)
  }, [debounced, searching, mediaHits.length, activeMedia])

  const showEmptyHint =
    !activeMedia && !searching && !!debounced.trim() && mediaHits.length === 0

  const toggleChar = (row: CharRow) => {
    const pick =
      row.source === 'anilist'
        ? toAnimeCharacterPick(row as Parameters<typeof toAnimeCharacterPick>[0])
        : row.source === 'bangumi'
          ? bangumiToPick(row as Parameters<typeof bangumiToPick>[0])
          : jikanToPick(row as Parameters<typeof jikanToPick>[0])
    const key = `${pick.source}:${pick.mediaId}:${pick.characterId}:${pick.characterName}`
    if (selectedKey.has(key)) {
      onChange(
        selected.filter(
          (s) => `${s.source}:${s.mediaId}:${s.characterId}:${s.characterName}` !== key,
        ),
      )
    } else {
      onChange([...selected, pick])
    }
  }

  const addManual = () => {
    const name = manualName.trim()
    if (!name) return
    onChange([
      ...selected,
      {
        mediaTitle: manualMedia.trim() || query.trim() || '自定义作品',
        characterName: name,
        characterBio: manualBio.trim() || undefined,
        source: 'manual',
      },
    ])
    setManualName('')
    setManualBio('')
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div>
        <label className="font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
          关键词搜索作品
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="模糊搜索，如：平野、初恋、Haikyuu"
          className="mt-1 w-full px-3 py-2.5 text-[14px] outline-none"
          style={{
            borderRadius: FORUM.radiusCard,
            backgroundColor: FORUM.surface2,
            color: FORUM.text,
            border: 'none',
          }}
        />
        <p className="mt-1.5 leading-snug" style={{ fontSize: 11, color: FORUM.textMuted }}>
          动漫 / 漫画 / 剧 / 影 / 游戏一并搜索，匹配到的都会列出。
        </p>
        {searching ? (
          <p className="mt-1" style={{ fontSize: 12, color: FORUM.textMuted }}>
            搜索中…
          </p>
        ) : null}
        {searchError ? (
          <p className="mt-1" style={{ fontSize: 12, color: FORUM.danger }}>
            {searchError}
          </p>
        ) : null}
      </div>

      {!activeMedia && mediaHits.length > 0 ? (
        <ul
          className="max-h-56 space-y-1 overflow-y-auto"
          style={{ borderRadius: FORUM.radiusCard, backgroundColor: FORUM.surface2 }}
        >
          {mediaHits.map((m) => (
            <li key={`${m.source}-${m.mediaKind ?? 'x'}-${m.id}`}>
              <Pressable
                type="button"
                onClick={() => setActiveMedia(m)}
                className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left active:opacity-80"
              >
                <div
                  className="size-10 shrink-0 rounded-md"
                  style={{
                    backgroundColor: FORUM.bgAccent,
                    ...(m.coverImage
                      ? {
                          backgroundImage: `url(${m.coverImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}),
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" style={{ fontSize: 13, color: FORUM.text }}>
                    {m.title}
                  </p>
                  <p style={{ fontSize: 11, color: FORUM.textMuted }}>
                    {formatLabel(m.format, m.mediaKind)
                      ? `${formatLabel(m.format, m.mediaKind)} · `
                      : ''}
                    {m.year ? `${m.year} · ` : ''}
                    {sourceLabel(m.source)}
                  </p>
                </div>
              </Pressable>
            </li>
          ))}
        </ul>
      ) : null}

      {showEmptyHint ? (
        <div className="rounded-[17px] p-3" style={{ backgroundColor: FORUM.surface2 }}>
          <p className="font-medium" style={{ fontSize: 13, color: FORUM.text }}>
            没有搜到相关作品
          </p>
          <p className="mt-1.5 leading-relaxed" style={{ fontSize: 12, color: FORUM.textMuted }}>
            请改用原作的日文原名，或英文 / 罗马音再搜一次。例如「平野と鍵浦」「Hirano to
            Kagiura」，通常比中文译名更容易命中。
          </p>
        </div>
      ) : null}

      {showEmptyHint && relatedTitles.length > 0 ? (
        <div>
          <p className="mb-1.5 font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
            或试试这些关联词
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {relatedTitles.map((t) => (
              <li key={t}>
                <Pressable
                  type="button"
                  onClick={() => {
                    setActiveMedia(null)
                    setMediaHits([])
                    setSearchError(null)
                    setShowManual(false)
                    setQuery(t)
                  }}
                  className="rounded-full px-2.5 py-1 active:opacity-80"
                  style={{
                    background: FORUM.surface2,
                    color: FORUM.text,
                    fontSize: 12,
                    border: `1px solid ${FORUM.bgAccent}`,
                  }}
                >
                  {t}
                </Pressable>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeMedia ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate font-medium" style={{ fontSize: 13, color: FORUM.text }}>
              {activeMedia.title} · 选角色
            </p>
            <Pressable
              type="button"
              onClick={() => setActiveMedia(null)}
              className="shrink-0"
              style={{ fontSize: 12, color: FORUM.textMuted }}
            >
              换作品
            </Pressable>
          </div>
          {charsLoading ? (
            <p style={{ fontSize: 12, color: FORUM.textMuted }}>加载角色…</p>
          ) : (
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
              {chars.map((c) => {
                const key = `${c.source}:${c.mediaId}:${c.id}:${c.name}`
                const on = selectedKey.has(key)
                return (
                  <Pressable
                    key={key}
                    type="button"
                    onClick={() => toggleChar(c)}
                    className="flex flex-col items-center gap-1 rounded-lg p-1.5 text-center"
                    style={{
                      outline: on ? `2px solid ${FORUM.accent}` : 'none',
                      background: on ? FORUM.bgAccent : undefined,
                    }}
                  >
                    <div
                      className="size-12 rounded-full"
                      style={{
                        backgroundColor: FORUM.bgAccent,
                        ...(c.imageUrl
                          ? {
                              backgroundImage: `url(${c.imageUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : {}),
                      }}
                    />
                    <span
                      className="line-clamp-2 leading-tight"
                      style={{ fontSize: 10, color: FORUM.text }}
                    >
                      {c.name}
                    </span>
                  </Pressable>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {(showManual || showEmptyHint) && (
        <div className="rounded-[17px] p-3" style={{ backgroundColor: FORUM.surface2 }}>
          <p className="font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
            仍搜不到？手动添加角色
          </p>
          <input
            value={manualMedia}
            onChange={(e) => setManualMedia(e.target.value)}
            placeholder="作品名"
            className="mt-2 w-full px-2.5 py-2 text-[13px] outline-none"
            style={{ borderRadius: 12, backgroundColor: FORUM.surface1, border: 'none', color: FORUM.text }}
          />
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="角色名（必填）"
            className="mt-2 w-full px-2.5 py-2 text-[13px] outline-none"
            style={{ borderRadius: 12, backgroundColor: FORUM.surface1, border: 'none', color: FORUM.text }}
          />
          <textarea
            value={manualBio}
            onChange={(e) => setManualBio(e.target.value)}
            placeholder="角色简介（可选）"
            rows={2}
            className="mt-2 w-full resize-none px-2.5 py-2 text-[13px] outline-none"
            style={{ borderRadius: 12, backgroundColor: FORUM.surface1, border: 'none', color: FORUM.text }}
          />
          <Pressable
            type="button"
            onClick={addManual}
            className="mt-2 rounded-lg px-3 py-2 text-[13px] font-medium"
            style={{ background: FORUM.accent, color: '#FFFDF8' }}
          >
            添加
          </Pressable>
        </div>
      )}

      {selected.length > 0 ? (
        <div>
          <p className="mb-1.5 font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
            已选 {selected.length}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {selected.map((s, i) => (
              <li key={`${s.characterName}-${i}`}>
                <Pressable
                  type="button"
                  onClick={() => onChange(selected.filter((_, j) => j !== i))}
                  className="rounded-full px-2.5 py-1"
                  style={{ background: FORUM.surface2, color: FORUM.text, fontSize: 12 }}
                >
                  {s.characterName}
                  <span style={{ color: FORUM.textMuted }}> · {s.mediaTitle}</span>
                  {' ×'}
                </Pressable>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
