import { useEffect, useId, useMemo, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'

import type { ObservationRadarBlock } from './types'
import { OBS_NOTES, OBS_NOTES_EN_STYLE, OBS_NOTES_FONT, OBS_NOTES_SERIF_CLASS, obsMarginaliaStyle } from './theme'

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  }
}

export function ObservationNotesRadar({
  title,
  block,
  playEntrance,
  handStack,
}: {
  title: string
  block: ObservationRadarBlock
  playEntrance: boolean
  handStack: string
}) {
  const axes = block.axes
  const n = Math.max(3, axes.length || 3)
  /** 尚未真正判定：默认六轴 50 且无评语 */
  const unset = block.judged !== true && !block.note?.trim() && axes.every((a) => a.value === 50)
  /** 画布留足标签边距，避免截断 */
  const pad = 36
  const plot = 200
  const size = plot + pad * 2
  const cx = size / 2
  const cy = size / 2
  const maxR = 78
  const labelR = maxR + 26
  const levels = 4
  const axisKey = useMemo(() => axes.map((a) => `${a.label}:${a.value}`).join('|'), [axes])

  const progress = useMotionValue(playEntrance ? 0 : 1)
  const [p, setP] = useState(playEntrance ? 0 : 1)

  useEffect(() => {
    if (!playEntrance) {
      progress.set(1)
      setP(1)
      return
    }
    progress.set(0)
    setP(0)
    const ctrl = animate(progress, 1, {
      duration: 0.4,
      ease: 'easeOut',
      onUpdate: (v) => setP(v),
    })
    return () => ctrl.stop()
  }, [playEntrance, progress, axisKey])

  const gridPolys = useMemo(() => {
    return Array.from({ length: levels }, (_, li) => {
      const r = maxR * ((li + 1) / levels)
      return Array.from({ length: n }, (__, i) => {
        const a = (Math.PI * 2 * i) / n
        const pt = polar(cx, cy, r, a)
        return `${pt.x},${pt.y}`
      }).join(' ')
    })
  }, [n, cx, cy])

  const spokes = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n
      const pt = polar(cx, cy, maxR, a)
      return { x2: pt.x, y2: pt.y, a, label: axes[i]?.label ?? `轴${i + 1}` }
    })
  }, [n, axes, cx, cy])

  const dataPts = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n
    const value = axes[i] ? Math.max(0, Math.min(100, axes[i].value)) : 0
    const r = maxR * (value / 100) * p
    return polar(cx, cy, r, a)
  })
  const dataPoly = dataPts.map((pt) => `${pt.x},${pt.y}`).join(' ')

  return (
    <div className={`overflow-visible ${OBS_NOTES_SERIF_CLASS}`} style={{ fontFamily: OBS_NOTES_FONT }}>
      <p className="mb-1 text-center text-[13px] font-semibold tracking-wide" style={{ color: OBS_NOTES.ink }}>
        {title}
      </p>
      {title.includes('MBTI') ? (
        <p className="mb-2 text-center" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 9 }}>
          PERSONALITY RADAR
        </p>
      ) : title.includes('内在能力') ? (
        <p className="mb-2 text-center" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 9 }}>
          ABILITY RADAR
        </p>
      ) : (
        <div className="mb-2" />
      )}
      <div className="flex justify-center overflow-visible">
        {unset ? (
          <div
            className="flex min-h-[200px] w-full max-w-[280px] flex-col items-center justify-center rounded-[12px] px-4 text-center"
            style={{
              border: `1px dashed ${OBS_NOTES.hairline}`,
              background: OBS_NOTES.garnetSoftBg,
            }}
          >
            <p className="text-[13px] font-medium" style={{ color: OBS_NOTES.inkSoft }}>
              尚未写下判定
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: OBS_NOTES.mist }}>
              点右上角「手动更新」补齐打分与评语
            </p>
          </div>
        ) : (
        <svg
          width="100%"
          height="auto"
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          style={{ maxWidth: size, display: 'block' }}
          aria-hidden
        >
          {gridPolys.map((pts, i) => (
            <polygon
              key={`g-${i}`}
              points={pts}
              fill="none"
              stroke={OBS_NOTES.hairline}
              strokeWidth={i === levels - 1 ? 1.1 : 0.85}
            />
          ))}
          {spokes.map((s, i) => (
            <line
              key={`sp-${i}`}
              x1={cx}
              y1={cy}
              x2={s.x2}
              y2={s.y2}
              stroke={OBS_NOTES.hairline}
              strokeWidth={0.85}
            />
          ))}
          <polygon
            points={dataPoly}
            fill={OBS_NOTES.garnetFill10}
            stroke={OBS_NOTES.garnet}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {dataPts.map((pt, i) => (
            <circle key={`d-${i}`} cx={pt.x} cy={pt.y} r={2.2} fill={OBS_NOTES.garnet} />
          ))}
          {spokes.map((s, i) => {
            const pt = polar(cx, cy, labelR, s.a)
            const anchor =
              Math.abs(Math.sin(s.a)) < 0.25 ? 'middle' : Math.sin(s.a) > 0 ? 'start' : 'end'
            return (
              <text
                key={`lb-${i}`}
                x={pt.x}
                y={pt.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={OBS_NOTES.mist}
                style={{ fontSize: 12, fontFamily: OBS_NOTES_FONT }}
              >
                {s.label}
              </text>
            )
          })}
        </svg>
        )}
      </div>
      {block.note?.trim() ? (
        <motion.p
          className="mt-2 px-1 text-[13px] leading-relaxed"
          style={obsMarginaliaStyle(handStack)}
          initial={playEntrance ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.35 }}
        >
          {block.note.trim()}
        </motion.p>
      ) : (
        <p className="mt-2 px-1 text-center text-[12px]" style={{ color: OBS_NOTES.mist }}>
          {unset ? '评语尚未写下' : '（无评语）'}
        </p>
      )}
      {!unset ? (
        <p className="mt-2 text-center text-[10px] leading-relaxed" style={{ color: OBS_NOTES.mist }}>
          {axes.map((a) => `${a.label}${Math.round(a.value)}`).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

export function ObservationAffectionBar({
  value,
  stageLabel,
  playEntrance,
}: {
  value: number
  stageLabel: string
  playEntrance: boolean
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  const [width, setWidth] = useState(playEntrance ? 0 : safe)
  const barId = useId()

  useEffect(() => {
    if (!playEntrance) {
      setWidth(safe)
      return
    }
    setWidth(0)
    const t = window.setTimeout(() => setWidth(safe), 30)
    return () => window.clearTimeout(t)
  }, [playEntrance, safe])

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium" style={{ color: OBS_NOTES.ink }}>
          好感度{' '}
          <span className="tabular-nums" style={{ color: OBS_NOTES.garnet }}>
            {safe}
          </span>
          <span className="ml-1.5 text-[12px]" style={{ color: OBS_NOTES.mist }}>
            · {stageLabel}
          </span>
        </p>
      </div>
      <div
        id={barId}
        className="h-[12px] w-full overflow-hidden rounded-full"
        style={{ background: OBS_NOTES.hairline }}
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="好感度"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: OBS_NOTES.garnet,
            transition: playEntrance ? 'width 400ms ease-out' : undefined,
          }}
        />
      </div>
    </div>
  )
}
