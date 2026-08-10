import { Camera, Flower2, Menu, Trash2, Zap } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ImageCropperModal } from '../../components/ImageCropperModal'
import { WidgetChrome } from '../WidgetChrome'
import { WidgetStyleSheet } from '../WidgetStyleSheet'
import {
  POLAROID_APPEARANCE,
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

/** 约等于机身 LCD 可视比例（略横） */
const SCREEN_CROP_ASPECT = 4 / 3
const SCREEN_CROP_MAX_SIDE = 480

const BODY = {
  shell: 'linear-gradient(165deg, #f7f7f8 0%, #e8e8ea 42%, #d8d8dc 100%)',
  rim: 'rgba(0,0,0,0.12)',
  screenBezel: '#2a2a2c',
  screenInner: '#111113',
  btn: 'linear-gradient(180deg, #fafafa 0%, #e6e6e8 100%)',
  btnInk: '#3a3a3c',
  muted: 'rgba(44,44,46,0.45)',
} as const

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

function CamBtn({
  children,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <span
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-[5px] border border-black/10 text-[8px] font-medium tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.08)] ${className}`}
      style={{ background: BODY.btn, color: BODY.btnInk }}
    >
      {children}
    </span>
  )
}

export function RetroCameraWidget({
  placement,
  isEditMode = false,
  isDragging = false,
}: Props) {
  const { patchConfig } = useWidgetGallery()
  const inputRef = useRef<HTMLInputElement>(null)
  const [styleOpen, setStyleOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState('')
  const cfg = placement.config ?? {}
  const imageUrl =
    (typeof cfg.imageUrl === 'string' && cfg.imageUrl) ||
    (typeof cfg.imageDataUrl === 'string' && cfg.imageDataUrl) ||
    ''
  const brand =
    typeof cfg.brand === 'string' && cfg.brand.trim()
      ? cfg.brand.trim().slice(0, 12)
      : 'iScreen'
  const appearance = parseAppearance(cfg.appearance, {
    ...POLAROID_APPEARANCE,
    bgColor: '#e8e8ea',
    opacity: 1,
    blur: 0,
  })

  const placeholder = useMemo(
    () =>
      'linear-gradient(145deg, #1c1c1e 0%, #2c2c2e 48%, #3a3a3c 100%)',
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
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] px-1.5 py-1.5 text-left"
        style={{
          background: appearance.bgColor
            ? undefined
            : BODY.shell,
          backgroundImage: appearance.bgColor
            ? `linear-gradient(165deg, ${appearance.bgColor} 0%, ${appearance.bgColor} 100%)`
            : BODY.shell,
          boxShadow:
            '0 10px 24px rgba(28,28,30,0.14), inset 0 1px 0 rgba(255,255,255,0.75)',
          border: `1px solid ${BODY.rim}`,
          opacity: appearance.opacity,
        }}
        onClick={openEdit}
        aria-label="编辑复古相机"
      >
        <div
          className="flex h-full w-full overflow-hidden rounded-[14px]"
          style={{
            background: BODY.shell,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.55)',
          }}
        >
          {/* LCD */}
          <div className="flex min-w-0 flex-[1.35] flex-col px-2 pb-1.5 pt-2">
            <div
              className="relative min-h-0 flex-1 overflow-hidden rounded-[6px]"
              style={{
                background: BODY.screenBezel,
                boxShadow:
                  'inset 0 0 0 2px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.35)',
                padding: 4,
              }}
            >
              <div
                className="relative h-full w-full overflow-hidden rounded-[3px]"
                style={{ background: BODY.screenInner }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                      filter:
                        appearance.blur > 0
                          ? `blur(${appearance.blur}px) grayscale(0.15) contrast(1.05)`
                          : 'grayscale(0.15) contrast(1.05)',
                      ...(appearance.blur > 0
                        ? { transform: 'scale(1.06)', transformOrigin: 'center' }
                        : {}),
                    }}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-1"
                    style={{ background: placeholder }}
                  >
                    <Camera size={18} strokeWidth={1.4} color="rgba(255,255,255,0.45)" />
                    <span className="text-[9px] tracking-[0.14em] text-white/40">
                      TAP PHOTO
                    </span>
                  </div>
                )}
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 30%, rgba(0,0,0,0.18))',
                  }}
                />
              </div>
            </div>
            <p
              className="mt-1 text-center text-[9px] font-medium tracking-[0.18em]"
              style={{ color: BODY.muted }}
            >
              {brand}
            </p>
          </div>

          {/* Controls */}
          <div className="flex w-[38%] shrink-0 flex-col items-center justify-between py-1.5 pr-2 pl-1">
            <div className="flex w-full items-start justify-between px-0.5">
              <span
                className="mt-0.5 h-2 w-6 rounded-[2px]"
                style={{
                  background:
                    'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)',
                }}
                aria-hidden
              />
              <span className="text-[7px] tracking-wide" style={{ color: BODY.muted }}>
                AUTO
              </span>
            </div>

            <div className="flex w-full items-center justify-center gap-1.5">
              <CamBtn className="h-5 w-7" ariaLabel="SCENE">
                <Camera size={10} strokeWidth={1.6} />
              </CamBtn>
              <CamBtn className="h-5 w-7" ariaLabel="Playback">
                <span className="ml-0.5 inline-block border-y-[4px] border-l-[7px] border-y-transparent border-l-[#3a3a3c]" />
              </CamBtn>
            </div>

            <div className="relative my-0.5 flex h-[52%] w-[78%] max-w-[72px] items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border border-black/10"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, #f5f5f7, #d8d8dc 70%)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.1)',
                }}
              />
              <Zap
                size={9}
                strokeWidth={1.6}
                className="absolute top-1 left-1/2 -translate-x-1/2"
                color={BODY.btnInk}
              />
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-[#3a3a3c]">
                ⏱
              </span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] leading-none text-[#3a3a3c]">
                ±
              </span>
              <Flower2
                size={9}
                strokeWidth={1.6}
                className="absolute bottom-1 left-1/2 -translate-x-1/2"
                color={BODY.btnInk}
              />
              <span
                className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-[8px] font-semibold"
                style={{
                  background: 'linear-gradient(180deg,#fff,#e8e8ea)',
                  color: BODY.btnInk,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
              >
                OK
              </span>
            </div>

            <div className="flex w-full items-center justify-center gap-1.5">
              <CamBtn className="h-5 min-w-[34px] px-1.5" ariaLabel="MENU">
                <span className="inline-flex items-center gap-0.5">
                  <Menu size={9} strokeWidth={1.8} />
                  MENU
                </span>
              </CamBtn>
              <CamBtn className="h-5 w-7" ariaLabel="Delete">
                <Trash2 size={10} strokeWidth={1.6} />
              </CamBtn>
            </div>
          </div>
        </div>
      </button>

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

      <WidgetStyleSheet
        open={styleOpen}
        title="编辑复古相机"
        appearance={appearance}
        blurLabel="屏幕照片模糊"
        onChange={(next) => patchConfig(placement.id, { appearance: next })}
        onReset={() =>
          patchConfig(placement.id, {
            appearance: {
              bgColor: '#e8e8ea',
              textColor: '#2c2c2e',
              opacity: 1,
              blur: 0,
            },
          })
        }
        onClose={() => setStyleOpen(false)}
        extras={
          <div className="space-y-2.5">
            <p className="text-[11px] leading-relaxed text-[#2c2c2e]/45">
              上传后可按 LCD 屏幕比例裁剪再应用。
            </p>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#2c2c2e]/70">机身品牌字</span>
              <input
                value={brand}
                maxLength={12}
                onChange={(e) =>
                  patchConfig(placement.id, { brand: e.target.value.slice(0, 12) })
                }
                className="w-full rounded-[10px] border border-black/8 bg-white/80 px-2.5 py-1.5 text-[12px] outline-none"
              />
            </label>
            {imageUrl ? (
              <div className="overflow-hidden rounded-[12px] border border-black/8 bg-black/5">
                <img
                  src={imageUrl}
                  alt=""
                  className="mx-auto max-h-28 object-contain"
                  draggable={false}
                />
              </div>
            ) : null}
            <button
              type="button"
              data-widget-add-ui="true"
              className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/70"
              onClick={() => inputRef.current?.click()}
            >
              {imageUrl ? '更换并裁剪' : '上传并裁剪'}
            </button>
            {imageUrl ? (
              <button
                type="button"
                data-widget-add-ui="true"
                className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/55"
                onClick={() =>
                  patchConfig(placement.id, { imageUrl: '', imageDataUrl: '' })
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
                title="裁剪相机屏幕照片（4:3）"
                aspect={SCREEN_CROP_ASPECT}
                maxSide={SCREEN_CROP_MAX_SIDE}
                objectFit="horizontal-cover"
                onCancel={() => setCropSrc('')}
                onConfirm={(dataUrl) => {
                  void compressWidgetDataUrl(dataUrl)
                    .then((compressed) => {
                      patchConfig(placement.id, {
                        imageUrl: compressed,
                        imageDataUrl: compressed,
                      })
                    })
                    .catch(() => {
                      patchConfig(placement.id, {
                        imageUrl: dataUrl,
                        imageDataUrl: dataUrl,
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
