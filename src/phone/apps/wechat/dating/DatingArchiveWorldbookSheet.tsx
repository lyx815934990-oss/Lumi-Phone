import { AnimatePresence, motion } from 'framer-motion'
import { BookMarked, ChevronDown, ExternalLink, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
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
  /** 剧情页主题 CSS 变量，使面板跟随色卡 */
  themeStyle?: CSSProperties
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
      className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-2.5 py-2 text-left transition-colors hover:border-[var(--sr-gold)]/35 hover:bg-[var(--sr-panel-elevated)] active:opacity-90"
    >
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          open
            ? 'border-[var(--sr-gold)]/50 bg-[var(--sr-gold)] text-[var(--sr-gold-on)]'
            : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)]'
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
          className="size-2.5 shrink-0 rounded-full ring-2 ring-[var(--sr-panel-elevated)]"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-tight text-[var(--sr-text)]">
        {title}
      </span>
      {meta ? (
        <span className="shrink-0 rounded-md bg-[var(--sr-panel-elevated)] px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--sr-text-muted)] ring-1 ring-[var(--sr-border)]">
          {meta}
        </span>
      ) : null}
      <span className="shrink-0 text-[11px] font-medium text-[var(--sr-text-muted)]">
        {open ? '收起' : '展开'}
      </span>
    </button>
  )
}

/** 线下约会：快捷开关档案室系统内置 + 自建世界书（立即生效，影响下一轮注入） */
export function DatingArchiveWorldbookSheet({ open, onClose, themeStyle }: Props) {
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
          className="story-rpg-root fixed inset-0 z-[260] flex flex-col justify-end"
          style={themeStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dating-archive-wb-title"
            className="relative z-[1] mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-[var(--sr-border)] shadow-[0_-12px_40px_rgba(0,0,0,0.14)]"
            style={{
              background: 'var(--sr-panel-elevated)',
              color: 'var(--sr-text)',
              maxHeight: 'min(82dvh, 720px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--sr-border)]" />
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--sr-border)] px-4 py-3">
              <div className="min-w-0">
                <p
                  id="dating-archive-wb-title"
                  className="text-[15px] font-semibold tracking-tight text-[var(--sr-text)]"
                >
                  档案室世界书
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--sr-text-muted)]">
                  开关立即全局生效，下一轮续写 / 生成会按新状态注入
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-[var(--sr-text-muted)] transition-colors hover:bg-[var(--sr-glass)] hover:text-[var(--sr-text)]"
                aria-label="关闭"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin]">
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
                          className="flex items-start gap-3 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[var(--sr-text)]">{preset.title}</p>
                            {shortDesc(preset.description) ? (
                              <p className="mt-0.5 text-[11px] leading-snug text-[var(--sr-text-muted)]">
                                {shortDesc(preset.description)}
                              </p>
                            ) : null}
                          </div>
                          <DatingCapsuleSwitch
                            variant="story"
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
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sr-text-faint)]">
                  我的世界书
                </p>
                {tagGroups.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)]/60 px-3 py-4 text-[12px] leading-relaxed text-[var(--sr-text-muted)]">
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
                                    className="flex items-center gap-3 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[13px] font-medium text-[var(--sr-text)]">{title}</p>
                                    </div>
                                    <DatingCapsuleSwitch
                                      variant="story"
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

            <div className="flex shrink-0 gap-2 border-t border-[var(--sr-border)] px-4 py-3">
              <button
                type="button"
                onClick={openArchiveApp}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] py-2.5 text-[14px] font-medium text-[var(--sr-text-soft)] transition-colors hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]"
              >
                <ExternalLink className="size-3.5 opacity-70" strokeWidth={1.75} />
                打开档案室
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--sr-gold)] py-2.5 text-[14px] font-medium text-[var(--sr-gold-on)] transition hover:brightness-110"
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
