import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ImageCropperModal } from '../../components/ImageCropperModal'
import { WidgetChrome } from '../WidgetChrome'
import { WidgetStyleSheet } from '../WidgetStyleSheet'
import {
  POLAROID_APPEARANCE,
  appearanceShellStyle,
  imageBlurStyle,
  mutedFrom,
  parseAppearance,
} from '../widgetAppearance'
import type { GalleryWidgetPlacement } from '../types'
import { useWidgetGallery } from '../WidgetGalleryContext'
import { compressWidgetDataUrl } from '../widgetImage'

type Props = {
  placement: GalleryWidgetPlacement
  isEditMode?: boolean
  isDragging?: boolean
}

/** 与相框显示比例一致 */
const PHOTO_CROP_ASPECT = 1 / 1.05
const PHOTO_CROP_MAX_SIDE = 480

function randomTilt(): number {
  return Math.round((Math.random() * 10 - 5) * 10) / 10
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

function Frame({
  src,
  shell,
  photoBlur,
  placeholderTone,
  muted,
  className = '',
  style,
}: {
  src: string
  shell: CSSProperties
  photoBlur: number
  placeholderTone: string
  muted: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[3px] px-1.5 pb-1.5 pt-1.5 shadow-[0_10px_24px_rgba(28,28,30,0.16)] ${className}`}
      style={{
        ...shell,
        ...style,
      }}
    >
      <div
        className="wg-polaroid-photo relative min-h-0 flex-1 overflow-hidden rounded-[2px]"
        style={{
          background: src ? undefined : placeholderTone,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
          aspectRatio: '1 / 1.05',
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            style={imageBlurStyle(photoBlur)}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1">
            <span className="text-center text-[9px] leading-snug" style={{ color: muted }}>
              点击编辑
            </span>
          </div>
        )}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.22), transparent 45%), linear-gradient(180deg, transparent 60%, rgba(44,44,46,0.08))',
            mixBlendMode: 'soft-light',
          }}
        />
      </div>
    </div>
  )
}

export function PolaroidWidget({
  placement,
  isEditMode = false,
  isDragging = false,
}: Props) {
  const { patchConfig } = useWidgetGallery()
  const inputRef = useRef<HTMLInputElement>(null)
  const [styleOpen, setStyleOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState('')
  const cfg = placement.config ?? {}

  const imageA =
    (typeof cfg.imageA === 'string' && cfg.imageA) ||
    (typeof cfg.imageDataUrl === 'string' && cfg.imageDataUrl) ||
    ''

  const rotation =
    typeof cfg.rotation === 'number' && Number.isFinite(cfg.rotation)
      ? Math.max(-8, Math.min(8, cfg.rotation))
      : -2.5

  const appearance = parseAppearance(cfg.appearance, POLAROID_APPEARANCE)
  const shell = appearanceShellStyle(appearance)
  const muted = mutedFrom(appearance.textColor, 0.42)

  const placeholderTone = useMemo(
    () =>
      `linear-gradient(145deg, rgba(244,242,238,0.95) 0%, rgba(210,214,220,0.75) 48%, rgba(236,234,228,0.92) 100%)`,
    [],
  )

  const phoneShell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  const openEdit = () => {
    if (isEditMode || isDragging) return
    setStyleOpen(true)
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
        className="relative flex h-full w-full items-center justify-center overflow-visible"
        onClick={openEdit}
        aria-label="编辑拍立得"
      >
        <span
          className="pointer-events-none absolute top-0.5 left-1/2 z-20 -translate-x-1/2"
          aria-hidden
        >
          <span
            className="block h-3 w-4 rounded-[3px] border border-black/15"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(210,210,214,0.9))',
              boxShadow: '0 2px 6px rgba(28,28,30,0.18)',
            }}
          />
        </span>

        <div
          className="flex h-[92%] w-[78%] items-stretch justify-center"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.32s ease-in-out',
          }}
        >
          <Frame
            src={imageA}
            shell={shell}
            photoBlur={appearance.blur}
            placeholderTone={placeholderTone}
            muted={muted}
            className="h-full w-full"
          />
        </div>
      </button>

      <WidgetStyleSheet
        open={styleOpen}
        title="编辑拍立得"
        appearance={appearance}
        blurLabel="照片模糊"
        onChange={(next) => patchConfig(placement.id, { appearance: next })}
        onReset={() =>
          patchConfig(placement.id, {
            appearance: { ...POLAROID_APPEARANCE },
          })
        }
        onClose={() => setStyleOpen(false)}
        extras={
          <div className="space-y-2.5">
            <p className="text-[11px] leading-relaxed text-[#2c2c2e]/45">
              上传后可裁剪再应用，比例与相框一致。
            </p>
            {imageA ? (
              <div className="overflow-hidden rounded-[12px] border border-black/8 bg-black/5">
                <img src={imageA} alt="" className="mx-auto max-h-36 object-contain" />
              </div>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-widget-add-ui="true"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file || !file.type.startsWith('image/')) return
                void readFileAsDataUrl(file)
                  .then((src) => setCropSrc(src))
                  .catch(() => {})
              }}
            />
            <button
              type="button"
              data-widget-add-ui="true"
              className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2.5 text-[12px] font-medium text-[#2c2c2e]/80"
              onClick={() => inputRef.current?.click()}
            >
              {imageA ? '更换并裁剪' : '上传并裁剪'}
            </button>
            {imageA ? (
              <button
                type="button"
                data-widget-add-ui="true"
                className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/70"
                onClick={() =>
                  patchConfig(placement.id, {
                    imageA: '',
                    imageB: '',
                    imageDataUrl: '',
                  })
                }
              >
                清除照片
              </button>
            ) : null}
          </div>
        }
      />

      {phoneShell && cropSrc
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
                imageSrc={cropSrc}
                title="裁剪拍立得照片"
                aspect={PHOTO_CROP_ASPECT}
                maxSide={PHOTO_CROP_MAX_SIDE}
                objectFit="horizontal-cover"
                onCancel={() => setCropSrc('')}
                onConfirm={(dataUrl) => {
                  void compressWidgetDataUrl(dataUrl)
                    .then((compressed) => {
                      patchConfig(placement.id, {
                        imageA: compressed,
                        imageB: '',
                        imageDataUrl: compressed,
                        rotation: randomTilt(),
                      })
                    })
                    .catch(() => {
                      patchConfig(placement.id, {
                        imageA: dataUrl,
                        imageB: '',
                        imageDataUrl: dataUrl,
                        rotation: randomTilt(),
                      })
                    })
                    .finally(() => setCropSrc(''))
                }}
              />
            </div>,
            phoneShell,
          )
        : null}
    </WidgetChrome>
  )
}
