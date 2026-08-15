import { useMemo } from 'react'

import { normalizeMbti, type MbtiType } from './mbtiPersonalityWorldBook'
import { LUMI_SHELL, LUMI_SHELL_FONT, LUMI_SHELL_NUM_STYLE } from './lumiShellTheme'

export type RadarGrade = 'S' | 'A' | 'B' | 'C'

export type RadarAxis = {
  label: string
  value: number
  grade: RadarGrade
}

const GRADE_COLOR: Record<RadarGrade, string> = {
  S: '#C9A227',
  A: '#C44B4B',
  B: '#A67C52',
  C: '#3A3A3A',
}

function clamp01to100(n: number): number {
  return Math.max(8, Math.min(100, Math.round(n)))
}

export function valueToGrade(value: number): RadarGrade {
  if (value >= 88) return 'S'
  if (value >= 72) return 'A'
  if (value >= 52) return 'B'
  return 'C'
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededUnit(seed: number, lane: number): number {
  const x = Math.sin(seed * 0.0001 + lane * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  }
}

function mbtiAxisValues(mbti: MbtiType | null, seed: number): number[] {
  // 外向 / 直觉 / 理性 / 决断 / 开放 / 共情
  if (!mbti) {
    return [0, 1, 2, 3, 3, 4].map((lane) => clamp01to100(42 + seededUnit(seed, lane) * 28))
  }
  const e = mbti[0] === 'E' ? 1 : 0
  const n = mbti[1] === 'N' ? 1 : 0
  const t = mbti[2] === 'T' ? 1 : 0
  const j = mbti[3] === 'J' ? 1 : 0
  const base = (favored: number, lane: number) =>
    clamp01to100((favored ? 78 : 34) + seededUnit(seed, lane) * 16)
  return [
    base(e, 0),
    base(n, 1),
    base(t, 2),
    base(j, 3),
    clamp01to100((n || !j ? 74 : 40) + seededUnit(seed, 4) * 18),
    base(1 - t, 5),
  ]
}

function abilityAxisValues(mbti: MbtiType | null, seed: number): number[] {
  // 智商 / 情商 / 胆商 / 逆商 / 创商 / 健商
  const bias = mbti
    ? {
        iq: mbti[1] === 'N' || mbti[2] === 'T' ? 14 : 0,
        eq: mbti[2] === 'F' ? 16 : mbti[0] === 'E' ? 6 : 0,
        bq: mbti[0] === 'E' || mbti[3] === 'P' ? 12 : 0,
        aq: mbti[3] === 'J' || mbti[2] === 'T' ? 10 : 4,
        cq: mbti[1] === 'N' || mbti[3] === 'P' ? 14 : 2,
        hq: mbti[3] === 'P' || mbti[0] === 'E' ? 8 : 0,
      }
    : { iq: 0, eq: 0, bq: 0, aq: 0, cq: 0, hq: 0 }

  const lanes = [bias.iq, bias.eq, bias.bq, bias.aq, bias.cq, bias.hq]
  return lanes.map((b, lane) => clamp01to100(48 + b + seededUnit(seed, lane + 10) * 26))
}

function buildAxes(labels: string[], values: number[]): RadarAxis[] {
  return labels.map((label, i) => {
    const value = values[i] ?? 50
    return { label, value, grade: valueToGrade(value) }
  })
}

function HexRadarChart({
  title,
  subtitle,
  axes,
  size = 168,
}: {
  title: string
  subtitle?: string
  axes: RadarAxis[]
  size?: number
}) {
  const n = axes.length
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.32
  const levels = 4

  const rings = useMemo(() => {
    return Array.from({ length: levels }, (_, li) => {
      const r = (maxR * (li + 1)) / levels
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (Math.PI * 2 * i) / n
        return polar(cx, cy, r, a)
      })
      return pts.map((p) => `${p.x},${p.y}`).join(' ')
    })
  }, [cx, cy, maxR, n])

  const spokes = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n
      const p = polar(cx, cy, maxR, a)
      return { x2: p.x, y2: p.y }
    })
  }, [cx, cy, maxR, n])

  const dataPoly = useMemo(() => {
    return axes
      .map((axis, i) => {
        const a = (Math.PI * 2 * i) / n
        const r = (maxR * Math.max(0, Math.min(100, axis.value))) / 100
        const p = polar(cx, cy, r, a)
        return `${p.x},${p.y}`
      })
      .join(' ')
  }, [axes, cx, cy, maxR, n])

  const labelPositions = useMemo(() => {
    return axes.map((axis, i) => {
      const a = (Math.PI * 2 * i) / n
      const p = polar(cx, cy, maxR + size * 0.12, a)
      return { ...axis, x: p.x, y: p.y, a }
    })
  }, [axes, cx, cy, maxR, n, size])

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center px-0.5">
      <div className="mb-1 w-full px-1 text-center">
        <p className="text-[12px] font-semibold tracking-wide" style={{ color: '#1A1A1A' }}>
          {title}
        </p>
        {subtitle ? (
          <p
            className="mt-0.5 text-[9px] font-medium tracking-[0.14em]"
            style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <svg
        width="100%"
        height="auto"
        viewBox={`-8 0 ${size + 16} ${size}`}
        className="overflow-visible"
        style={{ maxWidth: size + 16 }}
      >
        <g transform="translate(8,0)">
        {rings.map((points, i) => (
          <polygon
            key={`ring-${i}`}
            points={points}
            fill="none"
            stroke="rgba(16,16,18,0.14)"
            strokeWidth={i === levels - 1 ? 1.1 : 0.8}
          />
        ))}
        {spokes.map((s, i) => (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={s.x2}
            y2={s.y2}
            stroke="rgba(16,16,18,0.12)"
            strokeWidth={0.8}
          />
        ))}
        <polygon
          points={dataPoly}
          fill="rgba(42,36,32,0.42)"
          stroke="rgba(28,24,22,0.78)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        {labelPositions.map((item) => {
          const anchor =
            Math.abs(Math.sin(item.a)) < 0.2 ? 'middle' : Math.sin(item.a) > 0 ? 'start' : 'end'
          return (
            <text
              key={item.label}
              x={item.x}
              y={item.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              style={{ fontFamily: LUMI_SHELL_FONT, fontSize: 9.5 }}
            >
              <tspan fill="#2A2A2A" fontWeight={600}>
                {item.label}
              </tspan>
              <tspan dx={2.5} fill={GRADE_COLOR[item.grade]} fontWeight={700} fontSize={10}>
                {item.grade}
              </tspan>
            </text>
          )
        })}
        </g>
      </svg>
    </div>
  )
}

const MBTI_LABELS = ['外向', '直觉', '理性', '决断', '开放', '共情'] as const
const ABILITY_LABELS = ['智商', '情商', '胆商', '逆商', '创商', '健商'] as const

export function ContactProfileRadarCharts({
  characterId,
  mbtiRaw,
}: {
  characterId: string
  mbtiRaw?: string | null
}) {
  const mbti = normalizeMbti(mbtiRaw)
  const seed = hashSeed(`${characterId}|${mbti || 'NONE'}`)

  const mbtiAxes = useMemo(
    () => buildAxes([...MBTI_LABELS], mbtiAxisValues(mbti, seed)),
    [mbti, seed],
  )
  const abilityAxes = useMemo(
    () => buildAxes([...ABILITY_LABELS], abilityAxisValues(mbti, seed)),
    [mbti, seed],
  )

  return (
    <div
      className="overflow-visible px-1 pb-3 pt-3.5"
      style={{
        background: '#FAFAFA',
        borderRadius: 18,
        border: '1px solid rgba(16,16,18,0.1)',
        boxShadow: '0 10px 28px rgba(16,16,18,0.05)',
        fontFamily: LUMI_SHELL_FONT,
      }}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2 px-3">
        <p className="text-[13px] font-semibold" style={{ color: '#2A2A2A' }}>
          能力雷达
          <span className="ml-1.5 text-[9px] font-medium tracking-[0.16em]" style={{ color: LUMI_SHELL.mist }}>
            RADAR
          </span>
        </p>
        <p className="text-[10px] tabular-nums" style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}>
          {mbti || '未设定 MBTI'}
        </p>
      </div>
      <div className="flex items-start justify-between gap-3 overflow-visible px-1.5">
        <HexRadarChart title="性格倾向" subtitle="MBTI" axes={mbtiAxes} size={148} />
        <HexRadarChart title="内在能力" subtitle="QUOTIENT" axes={abilityAxes} size={148} />
      </div>
    </div>
  )
}
