import { BookMarked, ChevronRight } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { formatObsRelativeTime } from './formatTime'
import type { ObservationNotesEntryPreview } from './store'
import {
  OBS_NOTES,
  OBS_NOTES_EN_STYLE,
  OBS_NOTES_FONT,
  OBS_NOTES_HEADER,
  OBS_NOTES_NUM_STYLE,
  OBS_NOTES_SERIF_CLASS,
} from './theme'

export function ObservationNotesEntryCard({
  preview,
  onOpen,
}: {
  preview: ObservationNotesEntryPreview | null
  onOpen: () => void
}) {
  const updatedLabel = preview ? formatObsRelativeTime(preview.updatedAt) : '尚未整理'
  const pending = preview?.pendingCount ?? 0
  const hasUnread = Boolean(preview?.hasUnread)

  return (
    <Pressable
      type="button"
      onClick={onOpen}
      className={`relative flex w-full items-center gap-3 overflow-hidden px-3.5 py-3.5 text-left active:opacity-90 ${OBS_NOTES_SERIF_CLASS}`}
      style={{
        background: OBS_NOTES.card,
        borderRadius: 12,
        border: `1px solid ${OBS_NOTES.hairline}`,
        boxShadow: '0 10px 28px rgba(28, 36, 52, 0.05)',
        fontFamily: OBS_NOTES_FONT,
      }}
      aria-label={`打开「${OBS_NOTES_HEADER.zh}」`}
    >
      {hasUnread ? (
        <span
          className="absolute left-2.5 top-2.5 size-[6px] rounded-full"
          style={{ background: OBS_NOTES.garnet }}
          aria-hidden
        />
      ) : null}

      {/* 左侧细轨装饰 */}
      <span
        aria-hidden
        className="absolute bottom-3 left-0 top-3 w-[2px] rounded-full"
        style={{ background: OBS_NOTES.coolRail }}
      />

      <div
        className="flex size-[40px] shrink-0 items-center justify-center rounded-[10px]"
        style={{
          border: `1px solid ${OBS_NOTES.garnet}`,
          background: OBS_NOTES.garnetSoftBg,
          color: OBS_NOTES.garnet,
        }}
      >
        <BookMarked className="size-[18px]" strokeWidth={1.6} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold tracking-wide" style={{ color: OBS_NOTES.ink }}>
          {OBS_NOTES_HEADER.zh}
        </p>
        <p className="mt-0.5" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 9, letterSpacing: '0.14em' }}>
          {OBS_NOTES_HEADER.en}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-snug" style={{ color: OBS_NOTES.mist }}>
          <span style={OBS_NOTES_NUM_STYLE}>最近更新于{updatedLabel}</span>
          {pending > 0 ? (
            <>
              <span> · </span>
              <span style={{ color: hasUnread ? OBS_NOTES.garnet : OBS_NOTES.mist }}>
                较上次新增{pending}项
              </span>
            </>
          ) : (
            <span> · 点开看看TA记下了什么</span>
          )}
        </p>
      </div>

      <ChevronRight className="size-[16px] shrink-0" style={{ color: OBS_NOTES.mist }} strokeWidth={1.7} />
    </Pressable>
  )
}
