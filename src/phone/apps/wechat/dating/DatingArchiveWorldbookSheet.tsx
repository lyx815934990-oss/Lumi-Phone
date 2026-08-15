import { AnimatePresence, motion } from 'framer-motion'
import { BookMarked, ChevronDown, ExternalLink, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { requestOpenLoreArchiveApp } from '../../loreArchive/loreArchiveFocusNavigation'
import { useWorldbookStore } from '../../../worldbook/worldbookLoreStore'
import {
  LORE_ARCHIVE_BUILTIN_PRESETS,
  type LoreArchiveBuiltinPresetId,
} from '../../../worldbook/loreArchiveBuiltinPresets'
import {
  LORE_ARCHIVE_TAG_COLORS,
  normalizeLoreArchiveTagColorKey,
  type LoreEntry,
} from '../../../worldbook/loreArchiveTypes'
import { DatingCapsuleSwitch } from './DatingCapsuleSwitch'

type Props = {
  open: boolean
  onClose: () => void
}

type TagGroup = {
  key: string
  label: string
  colorKey?: string
  entries: LoreEntry[]
}

function shortDesc(raw: string, max = 42): string {
  const t = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function CollapsibleSectionHeader({
  title,
  meta,
  open,
  onToggle,
  swatch,
}: {
  title: string
  meta?: string
  open: boolean
  onToggle: () => void
  swatch?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2.5 rounded-xl border border-stone-200/90 bg-stone-50/90 px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-stone-300 hover:bg-white active:bg-stone-100/80"
    >
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          open
            ? 'border-stone-800 bg-stone-900 text-white'
            : 'border-stone-300 bg-white text-stone-700'
        }`}
        aria-hidden
      >
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
          strokeWidth={2.25}
        />
      </span>
      {swatch ? (
        <span
          className="size-2.5 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-tight text-stone-800">
        {title}
      </span>
      {meta ? (
        <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[11px] tabular-nums text-stone-500 ring-1 ring-stone-200/80">
          {meta}
        </span>
      ) : null}
      <span className="shrink-0 text-[11px] font-medium text-stone-500">{open ? '收起' : '展开'}</span>
    </button>
  )
}

/** 线下约会：快捷开关档案室系统内置 + 自建世界书（立即生效，影响下一轮注入） */
export function DatingArchiveWorldbookSheet({ open, onClose }: Props) {
  const { entries, tags, builtinPresets, setBuiltinPresetEnabled, upsertEntry } = useWorldbookStore()

  const [systemOpen, setSystemOpen] = useState(true)
  /** 折叠态：缺省为展开；仅当 key 存在且为 false 时收起 */
  const [groupOpenMap, setGroupOpenMap] = useState<Record<string, boolean>>({})

  const systemOnCount = useMemo(
    () => LORE_ARCHIVE_BUILTIN_PRESETS.filter((p) => builtinPresets[p.id] === true).length,
    [builtinPresets],
  )

  const tagGroups = useMemo((): TagGroup[] => {
    const sortedEntries = [...entries].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    const tagOrder = [...tags].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    const assigned = new Set<string>()
    const groups: TagGroup[] = []

    for (const tag of tagOrder) {
      const list = sortedEntries.filter((e) => {
        if (assigned.has(e.id)) return false
        return (e.tagIds ?? []).includes(tag.id)
      })
      if (!list.length) continue
      for (const e of list) assigned.add(e.id)
      groups.push({
        key: `tag:${tag.id}`,
        label: tag.name,
        colorKey: tag.colorKey,
        entries: list,
      })
    }

    const untagged = sortedEntries.filter((e) => !assigned.has(e.id))
    if (untagged.length) {
      groups.push({
        key: 'untagged',
        label: '未分类',
        entries: untagged,
      })
    }
    return groups
  }, [entries, tags])

  const isGroupOpen = (key: string) => groupOpenMap[key] !== false

  const toggleGroup = (key: string) => {
    setGroupOpenMap((prev) => ({
      ...prev,
      // 缺省展开；仅显式 false 为收起
      [key]: prev[key] === false,
    }))
  }

  const openArchiveApp = () => {
    onClose()
    requestOpenLoreArchiveApp()
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dating-archive-wb-sheet"
          className="fixed inset-0 z-[80] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-stone-900/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dating-archive-wb-title"
            className="relative z-[1] mx-auto w-full max-w-lg overflow-hidden rounded-t-[20px] border border-stone-200/80 bg-white/88 shadow-[0_-12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-stone-300/80" />
            <div className="flex items-center justify-between border-b border-stone-100/90 px-4 py-3">
              <div className="min-w-0">
                <p
                  id="dating-archive-wb-title"
                  className="text-[15px] font-semibold tracking-tight text-stone-900"
                >
                  档案室世界书
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-stone-400">
                  开关立即全局生效，下一轮续写 / 生成会按新状态注入
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                aria-label="关闭"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[min(72vh,560px)] space-y-4 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
              <section>
                <CollapsibleSectionHeader
                  title="系统世界书"
                  meta={`${systemOnCount}/${LORE_ARCHIVE_BUILTIN_PRESETS.length} 开`}
                  open={systemOpen}
                  onToggle={() => setSystemOpen((v) => !v)}
                />
                {systemOpen ? (
                  <ul className="mt-1.5 space-y-1.5">
                    {LORE_ARCHIVE_BUILTIN_PRESETS.map((preset) => {
                      const on = builtinPresets[preset.id] === true
                      return (
                        <li
                          key={preset.id}
                          className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-stone-900">{preset.title}</p>
                            {shortDesc(preset.description) ? (
                              <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                                {shortDesc(preset.description)}
                              </p>
                            ) : null}
                          </div>
                          <DatingCapsuleSwitch
                            checked={on}
                            onToggle={() =>
                              setBuiltinPresetEnabled(preset.id as LoreArchiveBuiltinPresetId, !on)
                            }
                          />
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </section>

              <section>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">
                  我的世界书
                </p>
                {tagGroups.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/40 px-3 py-4 text-[12px] leading-relaxed text-stone-400">
                    暂无自建条目。可到档案室新建后再回来开关。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tagGroups.map((group) => {
                      const gOpen = isGroupOpen(group.key)
                      const onCount = group.entries.filter((e) => e.enabled !== false).length
                      const swatch = group.colorKey
                        ? LORE_ARCHIVE_TAG_COLORS[normalizeLoreArchiveTagColorKey(group.colorKey)]
                            .swatch
                        : undefined
                      return (
                        <div key={group.key}>
                          <CollapsibleSectionHeader
                            title={group.label}
                            meta={`${onCount}/${group.entries.length}`}
                            open={gOpen}
                            onToggle={() => toggleGroup(group.key)}
                            swatch={swatch}
                          />
                          {gOpen ? (
                            <ul className="mt-1.5 space-y-1.5">
                              {group.entries.map((entry) => {
                                const on = entry.enabled !== false
                                const title = String(entry.title ?? '').trim() || '未命名'
                                return (
                                  <li
                                    key={entry.id}
                                    className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[13px] font-medium text-stone-900">{title}</p>
                                    </div>
                                    <DatingCapsuleSwitch
                                      checked={on}
                                      onToggle={() =>
                                        upsertEntry({
                                          ...entry,
                                          enabled: !on,
                                          updatedAt: Date.now(),
                                        })
                                      }
                                    />
                                  </li>
                                )
                              })}
                            </ul>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="flex gap-2 border-t border-stone-100/90 px-4 py-3">
              <button
                type="button"
                onClick={openArchiveApp}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-[14px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <ExternalLink className="size-3.5 opacity-70" strokeWidth={1.75} />
                打开档案室
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-stone-800"
              >
                <BookMarked className="size-3.5 opacity-90" strokeWidth={1.75} />
                完成
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
