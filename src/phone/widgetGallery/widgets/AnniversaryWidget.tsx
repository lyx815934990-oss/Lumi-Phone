import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImageCropperModal } from '../../components/ImageCropperModal'
import { WidgetChrome } from '../WidgetChrome'
import { WidgetStyleSheet } from '../WidgetStyleSheet'
import {
  mutedFrom,
  imageBlurStyle,
  parseAppearance,
  type WidgetAppearance,
} from '../widgetAppearance'
import type { GalleryWidgetPlacement } from '../types'
import { useWidgetGallery } from '../WidgetGalleryContext'
import { compressWidgetImage } from '../widgetImage'

type Props = {
  placement: GalleryWidgetPlacement
  isEditMode?: boolean
  isDragging?: boolean
}

/** 4×2 方格近似 2:1 */
const BG_CROP_ASPECT = 2
const BG_CROP_MAX_SIDE = 720
const NAME_MAX = 8

const DEFAULT_APPEARANCE: WidgetAppearance = {
  bgColor: '#f7f7f8',
  textColor: '#2c2c2e',
  opacity: 0.96,
  blur: 0,
}

function dayDiff(dateStr: string, mode: 'since' | 'until'): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const ms = 24 * 60 * 60 * 1000
  if (mode === 'since') {
    return Math.max(0, Math.floor((today.getTime() - target.getTime()) / ms))
  }
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / ms))
}

function Avatar({ src, label }: { src: string; label: string }) {
  return (
    <div
      className="relative z-0 h-10 w-10 shrink-0 overflow-hidden rounded-full border-[2.5px] border-white shadow-[0_2px_8px_rgba(28,28,30,0.12)]"
      style={{
        background:
          'linear-gradient(145deg, #f0f0f2 0%, #d8d8dc 55%, #c8c8cc 100%)',
      }}
      aria-label={label}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-[#2c2c2e]/40">
          {label}
        </span>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (src) resolve(src)
      else reject(new Error('empty'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader'))
    reader.readAsDataURL(file)
  })
}

export function AnniversaryWidget({
  placement,
  isEditMode = false,
  isDragging = false,
}: Props) {
  const { patchConfig } = useWidgetGallery()
  const leftInputRef = useRef<HTMLInputElement>(null)
  const rightInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const [styleOpen, setStyleOpen] = useState(false)
  const [bgCropSrc, setBgCropSrc] = useState('')
  const cfg = placement.config ?? {}

  const title =
    typeof cfg.title === 'string' && cfg.title.trim()
      ? cfg.title.trim().slice(0, 10)
      : '恋爱天数'
  const date =
    typeof cfg.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cfg.date)
      ? cfg.date
      : '2024-05-20'
  const mode: 'since' | 'until' = cfg.mode === 'until' ? 'until' : 'since'
  const avatarLeft = typeof cfg.avatarLeft === 'string' ? cfg.avatarLeft : ''
  const avatarRight = typeof cfg.avatarRight === 'string' ? cfg.avatarRight : ''
  const nameLeft =
    typeof cfg.nameLeft === 'string' ? cfg.nameLeft.trim().slice(0, NAME_MAX) : ''
  const nameRight =
    typeof cfg.nameRight === 'string' ? cfg.nameRight.trim().slice(0, NAME_MAX) : ''
  const showDate = cfg.showDate === true
  const bgImage = typeof cfg.bgImage === 'string' ? cfg.bgImage : ''
  const bubbleTop =
    typeof cfg.bubbleTop === 'string' && cfg.bubbleTop.trim()
      ? cfg.bubbleTop
      : '｜ıllıııllıl ♡°.•一切順利好運常在•.°♡'
  const bubbleBottom =
    typeof cfg.bubbleBottom === 'string' && cfg.bubbleBottom.trim()
      ? cfg.bubbleBottom
      : '♥︎․⁺ ✞ 𝑀𝑒𝑚𝑜𝑟𝑖𝑒𝑠 ✞'

  const appearance = parseAppearance(cfg.appearance, DEFAULT_APPEARANCE)
  const days = useMemo(() => dayDiff(date, mode), [date, mode])
  const muted = mutedFrom(appearance.textColor, 0.45)
  const dateLabel = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!m) return date
    return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`
  }, [date])

  const shell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  const openEdit = () => {
    if (isEditMode || isDragging) return
    setStyleOpen(true)
  }

  const onAvatar = async (side: 'left' | 'right', file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const dataUrl = await compressWidgetImage(file)
      patchConfig(placement.id, {
        [side === 'left' ? 'avatarLeft' : 'avatarRight']: dataUrl,
      })
    } catch {
      /* ignore */
    }
  }

  const onPickBackground = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const src = await readFileAsDataUrl(file)
      setBgCropSrc(src)
    } catch {
      /* ignore */
    }
  }

  return (
    <WidgetChrome
      size={placement.size}
      bare
      isEditMode={isEditMode}
      isDragging={isDragging}
    >
      <button
        type="button"
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[20px] px-2.5 pb-2 pt-2 text-left"
        style={{
          background: bgImage
            ? appearance.bgColor
            : `linear-gradient(165deg, ${appearance.bgColor} 0%, #ffffff 55%, #ececee 100%)`,
          opacity: appearance.opacity,
          boxShadow:
            '0 10px 26px rgba(28,28,30,0.12), inset 0 1px 0 rgba(255,255,255,0.85)',
          border: '1px solid rgba(28,28,30,0.08)',
          color: appearance.textColor,
        }}
        aria-label="编辑纪念日"
        onClick={openEdit}
      >
        {bgImage ? (
          <>
            <img
              src={bgImage}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={imageBlurStyle(appearance.blur)}
              draggable={false}
            />
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(165deg, ${appearance.bgColor}cc 0%, ${appearance.bgColor}66 45%, #ffffffaa 100%)`,
              }}
              aria-hidden
            />
          </>
        ) : (
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 22%, rgba(28,28,30,0.08) 0 6px, transparent 7px), radial-gradient(circle at 82% 28%, rgba(28,28,30,0.06) 0 5px, transparent 6px), radial-gradient(circle at 70% 78%, rgba(28,28,30,0.05) 0 8px, transparent 9px), radial-gradient(circle at 28% 72%, rgba(28,28,30,0.04) 0 4px, transparent 5px)',
            }}
            aria-hidden
          />
        )}

        <div className="relative z-[1] grid grid-cols-[1fr_auto_1fr] items-start gap-x-0.5 px-0.5">
          <div className="z-[2] flex justify-end">
            <div className="flex w-[3.4rem] translate-x-2.5 flex-col items-center">
              <Avatar src={avatarLeft} label="左" />
              <p
                className="relative z-[1] mt-1.5 w-full px-0.5 text-center text-[9px] leading-[1.4]"
                style={{ color: muted }}
                title={nameLeft || undefined}
              >
                <span className="inline-block max-w-full truncate align-top leading-[1.4]">
                  {nameLeft || '\u00a0'}
                </span>
              </p>
            </div>
          </div>
          <div className="min-w-[4.5rem] px-1 pt-0.5 text-center">
            <p className="truncate text-[10px]" style={{ color: muted }}>
              {title}
            </p>
            <p
              className="mt-0.5 text-[20px] font-light leading-none tabular-nums tracking-tight"
              style={{ color: appearance.textColor }}
            >
              {days}
              <span className="ml-0.5 text-[11px]" style={{ color: muted }}>
                天
              </span>
            </p>
            {showDate ? (
              <p
                className="mt-1 truncate text-[9px] leading-[1.35]"
                style={{ color: muted }}
              >
                {dateLabel}
              </p>
            ) : null}
          </div>
          <div className="z-[2] flex justify-start">
            <div className="flex w-[3.4rem] -translate-x-2.5 flex-col items-center">
              <Avatar src={avatarRight} label="右" />
              <p
                className="relative z-[1] mt-1.5 w-full px-0.5 text-center text-[9px] leading-[1.4]"
                style={{ color: muted }}
                title={nameRight || undefined}
              >
                <span className="inline-block max-w-full truncate align-top leading-[1.4]">
                  {nameRight || '\u00a0'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-[1] mt-1 flex min-h-0 flex-1 flex-col justify-center gap-1.5 px-0.5">
          <div className="flex items-end justify-end gap-1">
            <span className="mb-0.5 shrink-0 text-[9px]" style={{ color: muted }}>
              已读
            </span>
            <div
              className="max-w-[78%] rounded-[14px] rounded-br-[5px] px-2.5 py-1.5 text-[10px] leading-snug shadow-sm"
              style={{
                background: 'rgba(44, 44, 46, 0.08)',
                color: appearance.textColor,
              }}
            >
              {bubbleTop}
            </div>
          </div>
          <div className="flex items-end justify-start gap-1">
            <div
              className="max-w-[78%] rounded-[14px] rounded-bl-[5px] border border-white/80 bg-white/90 px-2.5 py-1.5 text-[10px] leading-snug shadow-sm"
              style={{ color: appearance.textColor }}
            >
              {bubbleBottom}
            </div>
            <span className="mb-0.5 shrink-0 text-[9px]" style={{ color: muted }}>
              未读
            </span>
          </div>
        </div>
      </button>

      <input
        ref={leftInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onAvatar('left', e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={rightInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onAvatar('right', e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onPickBackground(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <WidgetStyleSheet
        open={styleOpen}
        title="编辑纪念日"
        appearance={appearance}
        blurLabel="背景图模糊"
        onChange={(next) => patchConfig(placement.id, { appearance: next })}
        onReset={() =>
          patchConfig(placement.id, { appearance: { ...DEFAULT_APPEARANCE } })
        }
        onClose={() => setStyleOpen(false)}
        extras={
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-[12px] text-[#2c2c2e]/70">
                背景图
              </span>
              {bgImage ? (
                <div className="mb-2 overflow-hidden rounded-[12px] border border-black/8">
                  <img
                    src={bgImage}
                    alt=""
                    className="h-16 w-full object-cover"
                    draggable={false}
                  />
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/70"
                  onClick={() => bgInputRef.current?.click()}
                >
                  {bgImage ? '更换并裁剪' : '上传并裁剪'}
                </button>
                {bgImage ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-[12px] border border-black/8 bg-white/70 px-3 py-2 text-[12px] text-[#2c2c2e]/55"
                    onClick={() => patchConfig(placement.id, { bgImage: '' })}
                  >
                    清除
                  </button>
                ) : null}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">标题</span>
              <input
                value={title}
                maxLength={10}
                onChange={(e) =>
                  patchConfig(placement.id, { title: e.target.value.slice(0, 10) })
                }
                className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
                placeholder="恋爱天数"
              />
            </label>
            <div className="flex items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">起始/目标日期</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => patchConfig(placement.id, { date: e.target.value })}
                  className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
                />
              </label>
              <label className="shrink-0">
                <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">模式</span>
                <select
                  value={mode}
                  onChange={(e) =>
                    patchConfig(placement.id, {
                      mode: e.target.value === 'until' ? 'until' : 'since',
                    })
                  }
                  className="rounded-[10px] border border-black/8 bg-white/80 px-2 py-1.5 text-[12px] outline-none"
                >
                  <option value="since">已过天数</option>
                  <option value="until">倒计时</option>
                </select>
              </label>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-black/8 bg-white/70 px-3 py-2.5">
              <span className="text-[12px] text-[#2c2c2e]/80">显示目标年月日</span>
              <input
                type="checkbox"
                checked={showDate}
                onChange={(e) =>
                  patchConfig(placement.id, { showDate: e.target.checked })
                }
                className="h-4 w-4 accent-[#2c2c2e]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">左昵称</span>
                <input
                  value={nameLeft}
                  maxLength={NAME_MAX}
                  onChange={(e) =>
                    patchConfig(placement.id, {
                      nameLeft: e.target.value.slice(0, NAME_MAX),
                    })
                  }
                  className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
                  placeholder="昵称"
                />
              </label>
              <label className="block min-w-0">
                <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">右昵称</span>
                <input
                  value={nameRight}
                  maxLength={NAME_MAX}
                  onChange={(e) =>
                    patchConfig(placement.id, {
                      nameRight: e.target.value.slice(0, NAME_MAX),
                    })
                  }
                  className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
                  placeholder="昵称"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">上方气泡文案</span>
              <input
                value={bubbleTop}
                maxLength={36}
                onChange={(e) =>
                  patchConfig(placement.id, {
                    bubbleTop: e.target.value.slice(0, 36),
                  })
                }
                className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">下方气泡文案</span>
              <input
                value={bubbleBottom}
                maxLength={36}
                onChange={(e) =>
                  patchConfig(placement.id, {
                    bubbleBottom: e.target.value.slice(0, 36),
                  })
                }
                className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="min-w-0 flex-1 rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/70"
                onClick={() => leftInputRef.current?.click()}
              >
                换左头像
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/70"
                onClick={() => rightInputRef.current?.click()}
              >
                换右头像
              </button>
            </div>
          </div>
        }
      />

      {shell && bgCropSrc
        ? createPortal(
            <div
              data-widget-add-ui="true"
              data-widget-editing="true"
              className="absolute inset-0 z-[530]"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ImageCropperModal
                open
                imageSrc={bgCropSrc}
                title="裁剪纪念日背景（2:1）"
                aspect={BG_CROP_ASPECT}
                maxSide={BG_CROP_MAX_SIDE}
                objectFit="horizontal-cover"
                onCancel={() => setBgCropSrc('')}
                onConfirm={(dataUrl) => {
                  patchConfig(placement.id, { bgImage: dataUrl })
                  setBgCropSrc('')
                }}
              />
            </div>,
            shell,
          )
        : null}
    </WidgetChrome>
  )
}
