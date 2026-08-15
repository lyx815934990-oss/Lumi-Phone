import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, MessageCircle, Phone, Video } from 'lucide-react'
import {
  GeometricAvatar,
  directionLabel,
  displayCallTitle,
  formatCallWhen,
  formatDuration,
  formatStamp,
  mediaLabel,
  resolveCallDate,
} from '../components/GeometricAvatar'
import type { CallRecord, CallTranscriptLine, PhoneContact } from '../types'

const EASE = [0.25, 0.1, 0.25, 1] as const
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

/** 详情页：尽量给完整日期 + 星期，避免只剩时分 */
function formatTranscriptWhen(call: CallRecord): string {
  const dt = resolveCallDate(call)
  if (dt) {
    const hm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${WEEKDAYS[dt.getDay()]} ${hm}`
  }
  return formatCallWhen(call)
}

/** 相邻稿句秒数跳变超过该值时，插入「约 x–y 分钟」分段标题 */
const SEGMENT_GAP_SEC = 45

function formatMinuteRange(fromSec: number, toSec: number): string {
  const a = Math.max(0, Math.floor(fromSec / 60))
  const b = Math.max(a, Math.ceil(toSec / 60))
  if (a === b) return `约 ${a} 分钟附近`
  return `约 ${a}–${b} 分钟`
}

type TranscriptRenderItem =
  | { kind: 'segment'; id: string; label: string }
  | { kind: 'line'; line: CallTranscriptLine; idx: number }

function buildTranscriptItems(lines: CallTranscriptLine[]): TranscriptRenderItem[] {
  const out: TranscriptRenderItem[] = []
  let prevAt = -1
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    const at = line.atSec ?? prevAt + 1
    const jump = prevAt >= 0 && at - prevAt >= SEGMENT_GAP_SEC
    if (i === 0 || jump) {
      const segStart = at
      let peekEnd = at
      for (let j = i; j < lines.length; j += 1) {
        const t = lines[j]!.atSec
        if (t == null) break
        if (j > i && t - (lines[j - 1]!.atSec ?? t) >= SEGMENT_GAP_SEC) break
        peekEnd = t
      }
      out.push({
        kind: 'segment',
        id: `seg_${i}_${segStart}`,
        label: formatMinuteRange(segStart, peekEnd),
      })
    }
    out.push({ kind: 'line', line, idx: i })
    prevAt = at
  }
  return out
}

export function CallTranscriptScreen({
  call,
  contact,
}: {
  call: CallRecord
  contact?: PhoneContact | null
}) {
  const lines = call.transcript || []
  const items = useMemo(() => buildTranscriptItems(lines), [lines])
  const [reveal, setReveal] = useState(0)
  const title = displayCallTitle(call.remarkName, contact?.displayName)
  const dateText = formatTranscriptWhen(call)
  const durationLabel = formatDuration(call.durationSec)

  useEffect(() => {
    setReveal(0)
    if (!lines.length) return
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setReveal(i)
      if (i >= lines.length) window.clearInterval(id)
    }, 70)
    return () => window.clearInterval(id)
  }, [call.id, lines.length])

  const metaLine = useMemo(() => {
    return `${mediaLabel(call.media)} · ${directionLabel(call.direction)}`
  }, [call])

  const visibleItems = useMemo(() => {
    return items.filter((it) => {
      if (it.kind === 'segment') {
        const itemIdx = items.indexOf(it)
        const nextLine = items.slice(itemIdx + 1).find((x) => x.kind === 'line')
        if (!nextLine || nextLine.kind !== 'line') return false
        return nextLine.idx < reveal
      }
      return it.idx < reveal
    })
  }, [items, reveal])

  return (
    <div className="phone-scroll relative h-full overflow-y-auto pb-28">
      <div className="flex flex-col items-center px-6 pt-4">
        <GeometricAvatar
          contact={contact}
          remarkName={call.remarkName}
          glyph={contact?.avatarGlyph || call.remarkName.slice(0, 1)}
          tone={contact?.avatarTone}
          size={88}
        />
        <h2 className="mt-3 text-center text-[24px] font-bold text-[var(--ph-ink)]">{title}</h2>
        <div className="mt-1 text-[13px] text-[var(--ph-mist)]">{call.phoneNumber}</div>

        <div className="mt-5 flex w-full max-w-[320px] justify-between px-2">
          {[
            { label: '信息', Icon: MessageCircle },
            { label: '呼叫', Icon: Phone },
            { label: '视频', Icon: Video },
            { label: '邮件', Icon: Mail },
          ].map((a) => (
            <div key={a.label} className="phone-action-disabled flex w-[64px] flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(94,108,132,0.12)] text-[var(--ph-fog)]">
                <a.Icon size={20} strokeWidth={1.7} />
              </div>
              <span className="text-[11px] text-[var(--ph-mist)]">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="phone-card mx-4 mt-6 px-4 py-3.5">
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-[var(--ph-mist)]">时间</span>
          <span className="font-medium text-[var(--ph-ink)]">{dateText}</span>
        </div>
        <div className="my-2.5 h-px bg-[var(--ph-line)]" />
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-[var(--ph-mist)]">时长</span>
          <span className="phone-mono font-medium text-[var(--ph-ink)]">{durationLabel}</span>
        </div>
        <div className="my-2.5 h-px bg-[var(--ph-line)]" />
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-[var(--ph-mist)]">状态</span>
          <span className="font-medium text-[var(--ph-ink)]">{metaLine}</span>
        </div>
      </div>

      <div className="px-4 pb-1 pt-6">
        <div className="text-[15px] font-semibold text-[var(--ph-ink)]">通话内容录音转写</div>
        {lines.length ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--ph-mist)]">
            按时段摘录的关键对白，不是整通逐字稿。
          </p>
        ) : null}
      </div>

      <div className="px-4 pb-8 pt-3">
        {lines.length ? (
          <AnimatePresence initial={false}>
            {visibleItems.map((it) => {
              if (it.kind === 'segment') {
                return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-3 mt-1 flex items-center gap-2"
                  >
                    <span className="phone-mono text-[11px] font-semibold tracking-wide text-[var(--ph-fog)]">
                      {it.label}
                    </span>
                    <span className="h-px flex-1 bg-[var(--ph-line)]" />
                  </motion.div>
                )
              }
              const { line, idx } = it
              const isSelf = line.speaker === 'self'
              return (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE, delay: Math.min(idx * 0.02, 0.2) }}
                  className="mb-4 flex gap-3"
                >
                  <div className="phone-mono w-10 shrink-0 pt-0.5 text-[11px] text-[var(--ph-mist)]">
                    {formatStamp(line.atSec)}
                  </div>
                  <div className="min-w-0 flex-1 text-[15px] leading-relaxed">
                    <span className={`font-semibold ${isSelf ? 'text-[var(--ph-ink)]' : 'text-[var(--ph-ink-2)]'}`}>
                      {line.speakerLabel}
                    </span>
                    <span className={`${isSelf ? 'text-[var(--ph-ink)]' : 'text-[var(--ph-ink-2)]'}`}>
                      {': '}
                      {line.text}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        ) : (
          <div className="py-10 text-center text-[13px] text-[var(--ph-mist)]">
            {call.direction === 'missed'
              ? '未接通，无转写内容'
              : '暂无转写内容（生成时可能漏写对白，请重新生成通话痕迹）'}
          </div>
        )}
      </div>
    </div>
  )
}
