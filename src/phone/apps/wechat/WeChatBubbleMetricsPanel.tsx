import type { ReactNode } from 'react'

import type { WeChatBubbleTheme } from '../../types'
import {
  WECHAT_BUBBLE_DEFAULT_MAX_WIDTH_PCT,
  resolveBubbleAvatarRadiusPx,
  resolveBubbleAvatarSizePx,
  resolveBubbleFontSizePx,
  resolveBubbleMaxHeightPx,
  resolveBubbleMaxWidthPct,
  resolveBubbleScalePct,
} from '../../types'
import { WECHAT_BUBBLE_PRESETS } from './wechatBubblePresets'

export type BubbleMetricsSection = 'bubble' | 'text' | 'avatar'

type Side = 'self' | 'other'

type Patch = Partial<WeChatBubbleTheme>

function controlFontPx(bubble: WeChatBubbleTheme, side: Side): number {
  const raw = side === 'self' ? bubble.selfFontSizePx : bubble.otherFontSizePx
  if (typeof raw === 'number' && Number.isFinite(raw)) return resolveBubbleFontSizePx(bubble, side)
  const tail = bubble.bubbleTailStyle
  if (tail === 'wechat' || tail === 'imessage' || tail === 'telegram') return 16
  return 15
}

function matchingPresetBubble(bubble: WeChatBubbleTheme): WeChatBubbleTheme | null {
  const selfBg = bubble.selfBubbleBg.trim().toLowerCase()
  const otherBg = bubble.otherBubbleBg.trim().toLowerCase()
  const byColor = WECHAT_BUBBLE_PRESETS.find(
    (preset) =>
      preset.bubble.bubbleTailStyle === bubble.bubbleTailStyle &&
      preset.bubble.selfBubbleBg.trim().toLowerCase() === selfBg &&
      preset.bubble.otherBubbleBg.trim().toLowerCase() === otherBg,
  )
  if (byColor) return byColor.bubble
  const byTail = WECHAT_BUBBLE_PRESETS.find(
    (preset) => preset.bubble.bubbleTailStyle === bubble.bubbleTailStyle,
  )
  return byTail?.bubble ?? null
}

/** 恢复气泡 / 文字 / 头像相关的全部尺寸与圆角默认值（相对当前模版） */
export function clearBubbleMetricKeys(
  bubble: WeChatBubbleTheme,
  section: BubbleMetricsSection | 'all' = 'all',
): WeChatBubbleTheme {
  // 必须写成显式 undefined（不能 delete）：全局 merge 会留下旧值
  const next: WeChatBubbleTheme = { ...bubble }
  const preset = matchingPresetBubble(bubble)
  if (section === 'all' || section === 'bubble') {
    next.selfBubbleScalePct = undefined
    next.otherBubbleScalePct = undefined
    next.selfBubbleMaxWidthPct = undefined
    next.otherBubbleMaxWidthPct = undefined
    next.selfBubbleMaxHeightPx = undefined
    next.otherBubbleMaxHeightPx = undefined
    if (section === 'all' && preset) {
      next.selfBubbleRadiusPx = preset.selfBubbleRadiusPx
      next.otherBubbleRadiusPx = preset.otherBubbleRadiusPx
    }
  }
  if (section === 'all' || section === 'text') {
    next.selfFontSizePx = undefined
    next.otherFontSizePx = undefined
  }
  if (section === 'all' || section === 'avatar') {
    next.selfAvatarSizePx = undefined
    next.otherAvatarSizePx = undefined
    next.selfAvatarRadiusPx = undefined
    next.otherAvatarRadiusPx = undefined
    next.avatarRadiusPx = preset?.avatarRadiusPx ?? bubble.avatarRadiusPx
  }
  return next
}

function MetricBlock({
  title,
  hint,
  min,
  max,
  step = 1,
  unit,
  selfValue,
  otherValue,
  format,
  onOverall,
  onSelf,
  onOther,
}: {
  title: string
  hint: string
  min: number
  max: number
  step?: number
  unit: string
  selfValue: number
  otherValue: number
  format?: (value: number) => string
  onOverall: (value: number) => void
  onSelf: (value: number) => void
  onOther: (value: number) => void
}) {
  const labelOf = (value: number) => (format ? format(value) : `${value}${unit}`)
  const same = selfValue === otherValue
  const overall = same ? selfValue : Math.round((selfValue + otherValue) / 2)
  return (
    <div className="rounded-[14px] border px-3 py-2.5" style={{ borderColor: 'var(--wx-border)' }}>
      <p className="text-[12px] font-medium" style={{ color: 'var(--wx-text)' }}>
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--wx-text-muted)' }}>
        {hint}
        {same ? '' : ' 两侧目前不同，拖动整体会写成同一个值。'}
      </p>
      <label className="mt-2 block text-[11px]" style={{ color: 'var(--wx-text-muted)' }}>
        整体：{same ? labelOf(overall) : `约 ${labelOf(overall)}`}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={overall}
          onChange={(e) => onOverall(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="text-[11px]" style={{ color: 'var(--wx-text-muted)' }}>
          对方：{labelOf(otherValue)}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={otherValue}
            onChange={(e) => onOther(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-[11px]" style={{ color: 'var(--wx-text-muted)' }}>
          自己：{labelOf(selfValue)}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={selfValue}
            onChange={(e) => onSelf(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>
    </div>
  )
}

function heightLabel(value: number): string {
  return value <= 0 ? '不限' : `${value}px`
}

function snapBubbleHeight(value: number): number {
  if (value < 40) return 0
  return Math.max(80, value)
}

function SectionHeader({
  title,
  hint,
  onReset,
}: {
  title: string
  hint: string
  onReset: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium" style={{ color: 'var(--wx-text)' }}>
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--wx-text-muted)' }}>
          {hint}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="shrink-0 rounded-[12px] border px-3 py-1.5 text-[12px]"
        style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text)', background: 'transparent' }}
        title="恢复气泡、文字、头像的全部尺寸默认值"
      >
        全部恢复默认
      </button>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[16px] border p-3"
      style={{ borderColor: 'var(--wx-border)', background: 'var(--wx-surface)' }}
    >
      {children}
    </div>
  )
}

export function WeChatBubbleMetricsPanel({
  bubble,
  onChange,
  onReplace,
  section = 'bubble',
}: {
  bubble: WeChatBubbleTheme
  onChange: (patch: Patch) => void
  /** 用于真正清掉可选字段（恢复默认） */
  onReplace: (next: WeChatBubbleTheme) => void
  section?: BubbleMetricsSection
}) {
  const selfScale = resolveBubbleScalePct(bubble, 'self')
  const otherScale = resolveBubbleScalePct(bubble, 'other')
  const selfWidth =
    typeof bubble.selfBubbleMaxWidthPct === 'number'
      ? resolveBubbleMaxWidthPct(bubble, 'self')
      : WECHAT_BUBBLE_DEFAULT_MAX_WIDTH_PCT
  const otherWidth =
    typeof bubble.otherBubbleMaxWidthPct === 'number'
      ? resolveBubbleMaxWidthPct(bubble, 'other')
      : WECHAT_BUBBLE_DEFAULT_MAX_WIDTH_PCT
  const selfHeight = resolveBubbleMaxHeightPx(bubble, 'self')
  const otherHeight = resolveBubbleMaxHeightPx(bubble, 'other')
  const selfFont = controlFontPx(bubble, 'self')
  const otherFont = controlFontPx(bubble, 'other')
  const selfAvatar = resolveBubbleAvatarSizePx(bubble, 'self')
  const otherAvatar = resolveBubbleAvatarSizePx(bubble, 'other')
  const selfRadius = resolveBubbleAvatarRadiusPx(bubble, 'self')
  const otherRadius = resolveBubbleAvatarRadiusPx(bubble, 'other')

  if (section === 'bubble') {
    return (
      <Shell>
        <SectionHeader
          title="气泡尺寸"
          hint="只调气泡本体：大小、最大宽度、最大长度。左右可分别或整体改。「恢复默认」会清空气泡/文字/头像的全部尺寸参数。"
          onReset={() => onReplace(clearBubbleMetricKeys(bubble, 'all'))}
        />
        <div className="mt-3 flex flex-col gap-3">
          <MetricBlock
          title="气泡大小"
          hint="只缩放内边距（胖瘦），不改最长能到多宽。要改长度请拖下面的「最大宽度」。"
            min={70}
            max={150}
            unit="%"
            selfValue={selfScale}
            otherValue={otherScale}
            onOverall={(value) => onChange({ selfBubbleScalePct: value, otherBubbleScalePct: value })}
            onSelf={(value) => onChange({ selfBubbleScalePct: value })}
            onOther={(value) => onChange({ otherBubbleScalePct: value })}
          />
          <MetricBlock
            title="最大宽度"
            hint="气泡相对聊天区域的最宽比例。默认 75%。"
            min={50}
            max={92}
            unit="%"
            selfValue={selfWidth}
            otherValue={otherWidth}
            onOverall={(value) =>
              onChange({ selfBubbleMaxWidthPct: value, otherBubbleMaxWidthPct: value })
            }
            onSelf={(value) => onChange({ selfBubbleMaxWidthPct: value })}
            onOther={(value) => onChange({ otherBubbleMaxWidthPct: value })}
          />
          <MetricBlock
            title="最大长度"
            hint="气泡最高能拉多长。「不限」时随文字增高，超出后在气泡内滚动。"
            min={0}
            max={520}
            step={20}
            unit="px"
            format={heightLabel}
            selfValue={selfHeight}
            otherValue={otherHeight}
            onOverall={(value) => {
              const next = snapBubbleHeight(value)
              onChange({ selfBubbleMaxHeightPx: next, otherBubbleMaxHeightPx: next })
            }}
            onSelf={(value) => onChange({ selfBubbleMaxHeightPx: snapBubbleHeight(value) })}
            onOther={(value) => onChange({ otherBubbleMaxHeightPx: snapBubbleHeight(value) })}
          />
        </div>
      </Shell>
    )
  }

  if (section === 'text') {
    return (
      <Shell>
        <SectionHeader
          title="文字尺寸"
          hint="只调气泡正文字号。颜色与字体在下方单独设置。「恢复默认」会清空气泡/文字/头像的全部尺寸参数。"
          onReset={() => onReplace(clearBubbleMetricKeys(bubble, 'all'))}
        />
        <div className="mt-3">
          <MetricBlock
            title="文字大小"
            hint="不拖动时仍用当前模版的默认字号。"
            min={12}
            max={22}
            unit="px"
            selfValue={selfFont}
            otherValue={otherFont}
            onOverall={(value) => onChange({ selfFontSizePx: value, otherFontSizePx: value })}
            onSelf={(value) => onChange({ selfFontSizePx: value })}
            onOther={(value) => onChange({ otherFontSizePx: value })}
          />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <SectionHeader
        title="头像尺寸"
        hint="只调头像边长与圆角。显示开关与连续头像在下方。「恢复默认」会清空气泡/文字/头像的全部尺寸参数。"
        onReset={() => onReplace(clearBubbleMetricKeys(bubble, 'all'))}
      />
      <div className="mt-3 flex flex-col gap-3">
        <MetricBlock
          title="头像大小"
          hint="头像边长。微信经典默认 42，其它模版默认 40。"
          min={28}
          max={64}
          unit="px"
          selfValue={selfAvatar}
          otherValue={otherAvatar}
          onOverall={(value) => onChange({ selfAvatarSizePx: value, otherAvatarSizePx: value })}
          onSelf={(value) => onChange({ selfAvatarSizePx: value })}
          onOther={(value) => onChange({ otherAvatarSizePx: value })}
        />
        <MetricBlock
          title="头像圆角"
          hint="0 为直角，接近边长一半时接近圆形。"
          min={0}
          max={32}
          unit="px"
          selfValue={selfRadius}
          otherValue={otherRadius}
          onOverall={(value) =>
            onChange({
              avatarRadiusPx: value,
              selfAvatarRadiusPx: value,
              otherAvatarRadiusPx: value,
            })
          }
          onSelf={(value) => onChange({ selfAvatarRadiusPx: value })}
          onOther={(value) => onChange({ otherAvatarRadiusPx: value })}
        />
      </div>
    </Shell>
  )
}
