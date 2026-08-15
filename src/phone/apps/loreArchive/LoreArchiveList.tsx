import { AnimatePresence, motion } from 'framer-motion'
import {
  FolderClosed,
  Lock,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { LoreArchiveTag, LoreEntry } from '../../worldbook/loreArchiveTypes'
import {
  LORE_ARCHIVE_BUILTIN_PRESETS,
  type LoreArchiveBuiltinPresetId,
  type LoreArchiveBuiltinPresetMeta,
} from '../../worldbook/loreArchiveBuiltinPresets'
import { LoreArchiveTagPill } from './LoreArchiveTagManager'
import { SCENE_BADGE_LABEL, sceneBadges } from './loreArchiveScene'
import {
  LA,
  LA_FONT_EN,
  laCatalogLabelStyle,
  laEase,
  laPageStyle,
} from './loreArchiveTheme'

/** 固定分区，或 `tag:{id}` 表示某个分类标签 */
export type LoreHomeSegment = 'all' | 'system' | 'mine' | 'untagged' | `tag:${string}`

export function loreTagSegment(tagId: string): LoreHomeSegment {
  return `tag:${tagId}`
}

export function parseLoreTagSegment(segment: LoreHomeSegment): string | null {
  if (segment.startsWith('tag:')) return segment.slice(4)
  return null
}

export type LoreListPickTarget = { id: string; avatarUrl: string; name: string }

type Props = {
  entries: LoreEntry[]
  tags: LoreArchiveTag[]
  segment: LoreHomeSegment
  onSegmentChange: (s: LoreHomeSegment) => void
  builtinPresets: Record<LoreArchiveBuiltinPresetId, boolean>
  resolveTargets: (ids: string[]) => LoreListPickTarget[]
  onOpenEntry: (id: string) => void
  onOpenSystem: (preset: LoreArchiveBuiltinPresetMeta) => void
  onCreate: () => void
  onSetEntryEnabled: (id: string, enabled: boolean) => void
  onSetBuiltinPresetEnabled: (id: LoreArchiveBuiltinPresetId, enabled: boolean) => void
  onOpenTagManager: () => void
  highlightEntryId?: string | null
  onDeleteEntry: (id: string) => void
}

const PRIMARY_SEGMENTS: Array<{ id: 'all' | 'system' | 'mine'; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'system', label: '系统' },
  { id: 'mine', label: '我的' },
]

function AmberToggle({
  enabled,
  label,
  onToggle,
}: {
  enabled: boolean
  label: string
  onToggle: () => void
}) {
  const [pulse, setPulse] = useState(false)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
        if (!enabled) {
          setPulse(true)
          window.setTimeout(() => setPulse(false), 400)
        }
      }}
      className="relative h-7 w-[46px] shrink-0 rounded-full"
      style={{
        background: enabled ? LA.amber : LA.hairline,
        transition: 'background 150ms ease',
        boxShadow: pulse ? `0 0 0 6px ${LA.amberSoft}` : 'none',
      }}
    >
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
        style={{
          left: enabled ? 'calc(100% - 1.5rem - 2px)' : '2px',
          transition: 'left 150ms ease',
        }}
      />
    </button>
  )
}

function CatalogRow({
  accent,
  muted,
  highlight,
  onOpen,
  title,
  titleTrailing,
  enabled,
  toggleLabel,
  onToggle,
  onDelete,
}: {
  accent: string
  muted?: boolean
  highlight?: boolean
  onOpen: () => void
  title: string
  titleTrailing?: ReactNode
  enabled: boolean
  toggleLabel: string
  onToggle: () => void
  onDelete?: () => void
}) {
  return (
    <li
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: LA.hairline,
        background: highlight ? LA.amberSoft : muted ? 'rgba(243,242,240,0.9)' : LA.card,
        transition: 'background 600ms ease',
      }}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span
          className="h-5 w-[3px] shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="truncate text-[14px] font-medium leading-none"
              style={{ color: muted ? LA.mist : LA.ink }}
            >
              {title}
            </span>
            {titleTrailing}
          </div>
        </button>
        {onDelete ? (
          <button
            type="button"
            className="shrink-0 px-1 text-[10px]"
            style={{ color: LA.mist, fontFamily: LA_FONT_EN }}
            onClick={(ev) => {
              ev.stopPropagation()
              onDelete()
            }}
          >
            删除
          </button>
        ) : null}
        <AmberToggle enabled={enabled} label={toggleLabel} onToggle={onToggle} />
      </div>
    </li>
  )
}

export function LoreArchiveList({
  entries,
  tags,
  segment,
  onSegmentChange,
  builtinPresets,
  onOpenEntry,
  onOpenSystem,
  onCreate,
  onSetEntryEnabled,
  onSetBuiltinPresetEnabled,
  onOpenTagManager,
  highlightEntryId,
  onDeleteEntry,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filterTagId, setFilterTagId] = useState<string | null>(null)
  const [filterScene, setFilterScene] = useState<'global' | 'online' | 'offline' | null>(null)
  const [filterEnabled, setFilterEnabled] = useState<'on' | 'off' | null>(null)

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const systemEnabledCount = LORE_ARCHIVE_BUILTIN_PRESETS.filter((p) => builtinPresets[p.id]).length
  const categoryTagId = parseLoreTagSegment(segment)
  const isCategoryView = segment === 'untagged' || categoryTagId != null
  const primaryTab: 'all' | 'system' | 'mine' =
    segment === 'system' ? 'system' : segment === 'all' ? 'all' : 'mine'

  const mineEnabledCount = entries.filter((e) => e.enabled !== false).length
  const systemTotal = LORE_ARCHIVE_BUILTIN_PRESETS.length
  const catalogStat = `启用 ${mineEnabledCount + systemEnabledCount} · 自建 ${entries.length} · 系统 ${systemEnabledCount}/${systemTotal}`

  const filteredMine = useMemo(() => {
    let list = entries
    if (segment === 'untagged') {
      list = list.filter((e) => !(e.tagIds?.length))
    } else if (categoryTagId) {
      list = list.filter((e) => (e.tagIds ?? []).includes(categoryTagId))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q),
      )
    }
    if (filterTagId && !isCategoryView) {
      list = list.filter((e) => (e.tagIds ?? []).includes(filterTagId))
    }
    if (filterScene) list = list.filter((e) => sceneBadges(e).includes(filterScene))
    if (filterEnabled === 'on') list = list.filter((e) => e.enabled !== false)
    if (filterEnabled === 'off') list = list.filter((e) => e.enabled === false)
    return list
  }, [entries, query, filterTagId, filterScene, filterEnabled, segment, categoryTagId, isCategoryView])

  const filteredSystem = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...LORE_ARCHIVE_BUILTIN_PRESETS]
    if (q) list = list.filter((p) => p.title.toLowerCase().includes(q))
    if (filterEnabled === 'on') list = list.filter((p) => builtinPresets[p.id])
    if (filterEnabled === 'off') list = list.filter((p) => !builtinPresets[p.id])
    return list
  }, [query, filterEnabled, builtinPresets])

  const showSystem = segment === 'all' || segment === 'system'
  const showMine = segment === 'all' || segment === 'mine' || isCategoryView
  const showCategoryChips = primaryTab === 'mine' || isCategoryView
  const hasUntagged = entries.some((e) => !(e.tagIds?.length))

  const categoryLabel =
    segment === 'untagged'
      ? '未分类'
      : categoryTagId
        ? tagById.get(categoryTagId)?.name ?? '分类'
        : '我的世界书'

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" style={laPageStyle}>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-1">
        <header className="mb-2 flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: LA.ink }}>
              档案室
            </h1>
            <p
              className="mt-0.5 truncate text-[11px]"
              style={{ color: LA.mist, fontFamily: LA_FONT_EN, letterSpacing: '0.02em' }}
            >
              {catalogStat}
            </p>
          </div>
          <button
            type="button"
            aria-label="搜索"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ color: LA.mist }}
          >
            {searchOpen ? <X className="size-5" strokeWidth={1.5} /> : <Search className="size-5" strokeWidth={1.5} />}
          </button>
        </header>

        <AnimatePresence initial={false}>
          {searchOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: laEase }}
              className="overflow-hidden"
            >
              <div
                className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2.5"
                style={{ borderColor: LA.hairline, background: LA.card }}
              >
                <Search className="size-4" strokeWidth={1.5} style={{ color: LA.mist }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索标题或内容"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                  style={{ color: LA.ink }}
                />
              </div>
              <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setFilterTagId((v) => (v === tag.id ? null : tag.id))}
                  >
                    <LoreArchiveTagPill name={tag.name} size="md" selected={filterTagId === tag.id} />
                  </button>
                ))}
                {(['global', 'online', 'offline'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterScene((v) => (v === s ? null : s))}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[11px]"
                    style={{
                      borderColor: filterScene === s ? LA.amber : LA.hairline,
                      color: filterScene === s ? LA.amber : LA.mist,
                      background: LA.card,
                    }}
                  >
                    {SCENE_BADGE_LABEL[s]}
                  </button>
                ))}
                {(
                  [
                    ['on', '已启用'],
                    ['off', '未启用'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilterEnabled((v) => (v === k ? null : k))}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[11px]"
                    style={{
                      borderColor: filterEnabled === k ? LA.amber : LA.hairline,
                      color: filterEnabled === k ? LA.amber : LA.mist,
                      background: LA.card,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* 固定三段 */}
        <div
          className="mb-2.5 flex gap-5 border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: LA.hairline }}
        >
          {PRIMARY_SEGMENTS.map((s) => {
            const on = primaryTab === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSegmentChange(s.id)
                  if (s.id !== 'mine') setFilterTagId(null)
                }}
                className="relative shrink-0 pb-2.5 text-[14px] transition-colors"
                style={{
                  color: on ? LA.amber : LA.mist,
                  fontWeight: on ? 600 : 400,
                }}
              >
                {s.label}
                {on ? (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
                    style={{ background: LA.amber }}
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        {/* 我的 · 分类芯片 */}
        {showCategoryChips ? (
          <div className="-mx-1 mb-2.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onSegmentChange('mine')}
              className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium"
              style={{
                borderColor: segment === 'mine' ? LA.amber : LA.hairline,
                color: segment === 'mine' ? LA.amber : LA.mist,
                background: segment === 'mine' ? LA.amberSoft : LA.card,
              }}
            >
              全部
            </button>
            {tags.map((tag) => {
              const on = categoryTagId === tag.id
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onSegmentChange(loreTagSegment(tag.id))}
                  className="shrink-0"
                >
                  <LoreArchiveTagPill name={tag.name} size="md" selected={on} />
                </button>
              )
            })}
            {hasUntagged ? (
              <button
                type="button"
                onClick={() => onSegmentChange('untagged')}
                className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium"
                style={{
                  borderColor: segment === 'untagged' ? LA.amber : LA.hairline,
                  color: segment === 'untagged' ? LA.amber : LA.mist,
                  background: segment === 'untagged' ? LA.amberSoft : LA.card,
                }}
              >
                未分类
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenTagManager}
              className="shrink-0 rounded-full border border-dashed px-3 py-1.5 text-[11px]"
              style={{ borderColor: LA.amber, color: LA.amber }}
            >
              管理分类
            </button>
          </div>
        ) : null}

        {showSystem ? (
          <section className={showMine ? 'mb-4' : 'mb-2'}>
            <p style={laCatalogLabelStyle} className="mb-1.5 px-0.5">
              系统世界书 · {systemEnabledCount}/{systemTotal}
            </p>
            {filteredSystem.length === 0 ? (
              <p className="py-4 text-center text-[13px]" style={{ color: LA.mist }}>
                没有符合筛选的系统档案
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredSystem.map((preset) => {
                  const enabled = builtinPresets[preset.id] === true
                  return (
                    <CatalogRow
                      key={preset.id}
                      accent={LA.mist}
                      muted
                      onOpen={() => onOpenSystem(preset)}
                      title={preset.title}
                      titleTrailing={
                        <Lock className="size-3.5 shrink-0" strokeWidth={1.5} style={{ color: LA.mist }} />
                      }
                      enabled={enabled}
                      toggleLabel={`启用 ${preset.title}`}
                      onToggle={() => onSetBuiltinPresetEnabled(preset.id, !enabled)}
                    />
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}

        {showMine ? (
          <section className="pb-2">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
              <p style={laCatalogLabelStyle}>
                {isCategoryView
                  ? `${categoryLabel} · ${filteredMine.length} 篇`
                  : `我的世界书 · ${filteredMine.length} 篇`}
              </p>
              {!searchOpen && !showCategoryChips ? (
                <button
                  type="button"
                  onClick={onOpenTagManager}
                  className="text-[11px]"
                  style={{ color: LA.amber }}
                >
                  管理分类
                </button>
              ) : null}
            </div>

            {entries.length === 0 && !isCategoryView ? (
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <FolderClosed className="size-8" strokeWidth={1.25} style={{ color: LA.mist }} />
                <p className="mt-2.5 text-[14px]" style={{ color: LA.mist }}>
                  还没有自定义世界书
                </p>
                <button
                  type="button"
                  onClick={onCreate}
                  className="mt-3 rounded-full border px-5 py-2 text-[13px] font-medium"
                  style={{ borderColor: LA.amber, color: LA.amber }}
                >
                  新建第一篇
                </button>
              </div>
            ) : filteredMine.length === 0 ? (
              <div className="mx-auto mt-4 max-w-[280px] text-center">
                <p className="text-[14px]" style={{ color: LA.mist }}>
                  {isCategoryView ? `「${categoryLabel}」下暂无世界书` : '没有符合筛选的档案'}
                </p>
                <button
                  type="button"
                  className="mt-2.5 text-[12px] font-medium"
                  style={{ color: LA.amber }}
                  onClick={() => onSegmentChange(isCategoryView ? 'mine' : 'all')}
                >
                  {isCategoryView ? '查看我的档案' : '查看全部'}
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredMine.map((e) => {
                  const enabled = e.enabled !== false
                  const title = e.title.trim() || '未命名世界书'
                  const primaryTag = (e.tagIds ?? []).map((id) => tagById.get(id)).find(Boolean)
                  const accent = primaryTag ? LA.amber : LA.hairline
                  const highlight = highlightEntryId === e.id
                  return (
                    <CatalogRow
                      key={e.id}
                      accent={accent}
                      highlight={highlight}
                      onOpen={() => onOpenEntry(e.id)}
                      title={title}
                      enabled={enabled}
                      toggleLabel={`启用 ${title}`}
                      onToggle={() => onSetEntryEnabled(e.id, !enabled)}
                      onDelete={() => onDeleteEntry(e.id)}
                    />
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <motion.button
        type="button"
        aria-label="新建世界书"
        onClick={onCreate}
        className="fixed z-20 flex h-14 w-14 items-center justify-center rounded-full text-white"
        style={{
          background: LA.amber,
          right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
        whileTap={{ scale: 0.94 }}
      >
        <Plus className="h-7 w-7" strokeWidth={1.5} />
      </motion.button>
    </div>
  )
}
