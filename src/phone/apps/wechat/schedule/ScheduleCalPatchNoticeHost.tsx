import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SCHEDULE_CAL_PATCH_UPDATED_EVENT,
  type ScheduleCalPatchUpdatedEventDetail,
} from './scheduleCalendarPatch'

const INK = '#1F1A14'
const PAGE = '#FFFDF8'
const MUTED = '#6E6458'
const FAINT = '#A89C8C'
const LINE = '#D8CFC2'
const ACCENT = '#B54A3C'

type NoticeState = {
  appliedCount: number
  addedCount: number
  updatedCount: number
  completedCount: number
  addedTitles: string[]
  completedTitles: string[]
  revisedTitles: string[]
}

type SectionKind = 'done' | 'new' | 'edit'

const SECTION_THEME: Record<
  SectionKind,
  {
    label: string
    bar: string
    panelBg: string
    chipBg: string
    chipText: string
    markBg: string
    markText: string
    markBorder: string
    glyph: string
  }
> = {
  done: {
    label: '已完成',
    bar: ACCENT,
    panelBg: '#FBF0EC',
    chipBg: ACCENT,
    chipText: '#FFFDF8',
    markBg: ACCENT,
    markText: '#FFFDF8',
    markBorder: ACCENT,
    glyph: '✓',
  },
  new: {
    label: '新增',
    bar: INK,
    panelBg: '#F2F4F3',
    chipBg: INK,
    chipText: '#FFFDF8',
    markBg: '#FFFDF8',
    markText: INK,
    markBorder: INK,
    glyph: '+',
  },
  edit: {
    label: '修订',
    bar: '#8A7A68',
    panelBg: '#F5F1EA',
    chipBg: '#8A7A68',
    chipText: '#FFFDF8',
    markBg: '#FFFDF8',
    markText: '#8A7A68',
    markBorder: '#8A7A68',
    glyph: '✎',
  },
}

function SectionPanel({
  kind,
  count,
  items,
}: {
  kind: SectionKind
  count: number
  items: string[]
}) {
  if (!items.length) return null
  const t = SECTION_THEME[kind]
  return (
    <div
      className="mt-3 w-full overflow-hidden text-left"
      style={{
        background: t.panelBg,
        border: `1.5px solid ${INK}`,
        borderRadius: 12,
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ background: t.bar }}
      >
        <p className="text-[12px] font-bold tracking-wide" style={{ color: '#FFFDF8' }}>
          {t.label}
        </p>
        <span
          className="px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: t.chipBg === t.bar ? 'rgba(255,255,255,0.18)' : t.chipBg,
            color: t.chipText,
            borderRadius: 999,
          }}
        >
          {count} 项
        </span>
      </div>
      <ul className="divide-y px-1 py-1" style={{ borderColor: 'rgba(31,26,20,0.08)' }}>
        {items.map((title, i) => (
          <li
            key={`${kind}-${title}-${i}`}
            className="flex items-start gap-2.5 px-2.5 py-2.5 text-[13px] leading-snug"
            style={{
              color: INK,
              borderTop: i === 0 ? 'none' : '1px solid rgba(31,26,20,0.08)',
            }}
          >
            <span
              className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-[11px] font-bold"
              style={{
                color: t.markText,
                background: t.markBg,
                border: `1.5px solid ${t.markBorder}`,
                borderRadius: 999,
              }}
            >
              {t.glyph}
            </span>
            <span className="min-w-0 flex-1 font-medium">{title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 全局挂载：日历行程自动写入成功后弹出「杂志印戳」成就提示。
 * 新增 / 已完成用色带面板分区；需点「收下」关闭。
 */
export function ScheduleCalPatchNoticeHost() {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<NoticeState | null>(null)

  const dismiss = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<ScheduleCalPatchUpdatedEventDetail>
      const n =
        typeof ce.detail?.appliedCount === 'number' && Number.isFinite(ce.detail.appliedCount)
          ? Math.max(1, Math.round(ce.detail.appliedCount))
          : 0
      if (n <= 0) return
      const addedTitles = Array.isArray(ce.detail?.addedTitles)
        ? ce.detail!.addedTitles!.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
        : []
      const completedTitles = Array.isArray(ce.detail?.completedTitles)
        ? ce.detail!.completedTitles!.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
        : []
      const revisedTitles = Array.isArray(ce.detail?.revisedTitles)
        ? ce.detail!.revisedTitles!.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
        : []
      const legacy = Array.isArray(ce.detail?.titles)
        ? ce.detail!.titles!.map((x) => String(x ?? '').trim()).filter(Boolean)
        : []
      setNotice({
        appliedCount: n,
        addedCount: Math.max(0, Math.round(ce.detail?.addedCount ?? addedTitles.length)),
        updatedCount: Math.max(0, Math.round(ce.detail?.updatedCount ?? 0)),
        completedCount: Math.max(0, Math.round(ce.detail?.completedCount ?? completedTitles.length)),
        addedTitles: addedTitles.length ? addedTitles : [],
        completedTitles,
        revisedTitles:
          revisedTitles.length || addedTitles.length || completedTitles.length
            ? revisedTitles
            : legacy.slice(0, 6),
      })
      setOpen(true)
    }
    window.addEventListener(SCHEDULE_CAL_PATCH_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(SCHEDULE_CAL_PATCH_UPDATED_EVENT, onUpdated)
    }
  }, [])

  const headline = useMemo(() => {
    if (!notice) return '日程已更新'
    if (notice.completedCount > 0 && notice.addedCount === 0 && notice.revisedTitles.length === 0) {
      return '行程达成！'
    }
    if (notice.addedCount > 0 && notice.completedCount === 0 && notice.revisedTitles.length === 0) {
      return '新行程入册'
    }
    if (notice.completedCount > 0 && notice.addedCount > 0) return '行程有进展'
    return '日程已更新'
  }, [notice])

  const stampText = useMemo(() => {
    if (!notice) return 'CLEAR'
    if (notice.completedCount > 0 && notice.addedCount === 0) return 'CLEAR'
    if (notice.addedCount > 0 && notice.completedCount === 0) return 'NEW'
    return 'UPDATE'
  }, [notice])

  const subline = useMemo(() => {
    if (!notice) return ''
    const parts: string[] = []
    if (notice.completedCount) parts.push(`完成 ${notice.completedCount}`)
    if (notice.addedCount) parts.push(`新增 ${notice.addedCount}`)
    if (notice.revisedTitles.length) parts.push(`修订 ${notice.revisedTitles.length}`)
    if (!parts.length) parts.push(`共 ${notice.appliedCount} 项`)
    return parts.join(' · ')
  }, [notice])

  return (
    <AnimatePresence>
      {open && notice ? (
        <motion.div
          className="fixed inset-0 z-[1250] flex items-center justify-center px-5"
          style={{ background: 'rgba(20,16,12,0.55)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="schedule-cal-ach-title"
          aria-describedby="schedule-cal-ach-desc"
        >
          <motion.div
            className="relative w-full max-w-[min(340px,92vw)] overflow-hidden border-[2px] px-5 pb-5 pt-6"
            style={{
              borderColor: INK,
              background: PAGE,
              borderRadius: 4,
              boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
            }}
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <div className="relative flex flex-col items-center text-center">
              <motion.div
                className="relative mb-3 flex size-[72px] items-center justify-center"
                initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 260, delay: 0.04 }}
              >
                <span
                  className="absolute inset-0 rounded-full border-[3px]"
                  style={{ borderColor: ACCENT }}
                />
                <span
                  className="absolute inset-[7px] rounded-full border-[1.5px]"
                  style={{ borderColor: ACCENT }}
                />
                <span
                  className="text-[12px] font-black tracking-[0.14em]"
                  style={{ color: ACCENT }}
                >
                  {stampText}
                </span>
              </motion.div>

              <p className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: FAINT }}>
                MAGAZINE · QUEST
              </p>
              <h2
                id="schedule-cal-ach-title"
                className="mt-1 text-[22px] font-bold tracking-tight"
                style={{ color: INK }}
              >
                {headline}
              </h2>
              <p id="schedule-cal-ach-desc" className="mt-1.5 text-[13px]" style={{ color: MUTED }}>
                {subline}
              </p>

              <div className="mt-3 w-full border-t" style={{ borderColor: LINE }} />

              <SectionPanel
                kind="done"
                count={notice.completedTitles.length || notice.completedCount}
                items={notice.completedTitles}
              />
              <SectionPanel
                kind="new"
                count={notice.addedTitles.length || notice.addedCount}
                items={notice.addedTitles}
              />
              <SectionPanel
                kind="edit"
                count={notice.revisedTitles.length}
                items={notice.revisedTitles}
              />

              {!notice.completedTitles.length &&
              !notice.addedTitles.length &&
              !notice.revisedTitles.length ? (
                <p className="mt-3 text-[12px]" style={{ color: MUTED }}>
                  已同步写入日历日程
                </p>
              ) : null}

              <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
                已写入角色日历日程 · 可在人设「日程表 · 日历」查看
              </p>

              <button
                type="button"
                onClick={dismiss}
                className="mt-4 w-full py-3 text-[15px] font-bold transition-transform active:scale-[0.98]"
                style={{
                  background: ACCENT,
                  color: PAGE,
                  borderRadius: 10,
                }}
              >
                收下
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
