import { AnimatePresence, motion } from 'framer-motion'
import { Palette, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DecoText } from './DecoText'
import type { WidgetAppearance } from './widgetAppearance'

type Props = {
  open: boolean
  title?: string
  appearance: WidgetAppearance
  onChange: (next: WidgetAppearance) => void
  onReset: () => void
  onClose: () => void
  /** 组件专属选项（如拍立得隐藏文字） */
  extras?: ReactNode
  /** 模糊滑杆文案；空字符串则隐藏 */
  blurLabel?: string
  /** 是否显示模糊滑杆，默认 true */
  showBlur?: boolean
  /** 是否显示背景透明度滑杆，默认 true */
  showOpacity?: boolean
  /** 是否显示背景色，默认 true（有背景图时可关掉，与图互斥） */
  showBgColor?: boolean
}

function isValidHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim())
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-[#2c2c2e]/70">{label}</span>
      <span className="flex items-center gap-2">
        <span className="relative h-7 w-7 overflow-hidden rounded-md border border-black/10">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={value.length === 4 || value.length === 7 ? value : '#2c2c2e'}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
          />
        </span>
        <input
          type="text"
          value={draft}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value
            setDraft(next)
            if (isValidHex(next)) onChange(next.trim())
          }}
          onBlur={() => {
            if (isValidHex(draft)) onChange(draft.trim())
            else setDraft(value)
          }}
          className="w-[86px] rounded-[8px] border border-black/8 bg-white/80 px-2 py-1 font-mono text-[11px] outline-none"
        />
      </span>
    </label>
  )
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[12px] text-[#2c2c2e]/70">
        <span>{label}</span>
        <span className="tabular-nums text-[#2c2c2e]/45">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#2c2c2e]"
      />
    </label>
  )
}

/** 卡片外观编辑底栏：颜色 / 透明度 / 模糊 */
export function WidgetStyleSheet({
  open,
  title = '卡片外观',
  appearance,
  onChange,
  onReset,
  onClose,
  extras,
  blurLabel = '照片模糊',
  showBlur = true,
  showOpacity = true,
  showBgColor = true,
}: Props) {
  const shell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  if (!open || !shell) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="wg-style"
        data-widget-editing="true"
        data-widget-add-ui="true"
        className="absolute inset-0 z-[92] flex flex-col bg-black/25 backdrop-blur-[2px]"
        style={{ touchAction: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <motion.div
          className="mt-auto flex max-h-[88%] flex-col overflow-hidden rounded-t-[24px] border border-white/50 bg-white/90 shadow-[0_-12px_40px_rgba(28,28,30,0.16)] backdrop-blur-2xl"
          style={{ touchAction: 'pan-y' }}
          initial={{ y: 36 }}
          animate={{ y: 0 }}
          exit={{ y: 20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3">
            <div>
              <DecoText preset="stars" className="text-[10px] text-[#2c2c2e]/55">
                Style
              </DecoText>
              <p className="text-[14px] font-medium text-[#2c2c2e]">{title}</p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5"
              aria-label="关闭"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3.5"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {showBgColor ? (
              <ColorRow
                label="背景色"
                value={appearance.bgColor}
                onChange={(bgColor) => onChange({ ...appearance, bgColor })}
              />
            ) : null}
            <ColorRow
              label="文字色"
              value={appearance.textColor}
              onChange={(textColor) => onChange({ ...appearance, textColor })}
            />
            {showOpacity ? (
              <RangeRow
                label="背景透明度"
                value={Math.round(appearance.opacity * 100)}
                min={12}
                max={100}
                step={1}
                display={`${Math.round(appearance.opacity * 100)}%`}
                onChange={(v) => onChange({ ...appearance, opacity: v / 100 })}
              />
            ) : null}
            {showBlur && blurLabel ? (
              <RangeRow
                label={blurLabel}
                value={appearance.blur}
                min={0}
                max={28}
                step={1}
                display={`${appearance.blur}px`}
                onChange={(blur) => onChange({ ...appearance, blur })}
              />
            ) : null}
            {extras}
          </div>

          <div className="shrink-0 border-t border-black/5 px-4 py-3">
            <button
              type="button"
              className="w-full rounded-[14px] border border-black/8 bg-white/80 py-2.5 text-[13px] text-[#2c2c2e]"
              onClick={onReset}
            >
              恢复默认外观
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    shell,
  )
}

type StyleBtnProps = {
  visible: boolean
  onClick: () => void
  /** 默认右下；音乐播控在底部时用右上避免重叠 */
  corner?: 'bottom-right' | 'top-right'
}

/** 组件外观入口 */
export function WidgetStyleButton({
  visible,
  onClick,
  corner = 'bottom-right',
}: StyleBtnProps) {
  if (!visible) return null
  const pos =
    corner === 'top-right' ? 'right-1 top-1' : 'bottom-1 right-1'
  return (
    <button
      type="button"
      data-widget-add-ui="true"
      aria-label="自定义外观"
      className={`absolute ${pos} z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/55 bg-white/70 text-[#2c2c2e] shadow-[0_4px_12px_rgba(28,28,30,0.14)] backdrop-blur-md transition duration-300 ease-in-out active:scale-95`}
      onPointerDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick()
      }}
    >
      <Palette size={13} strokeWidth={2} />
    </button>
  )
}
