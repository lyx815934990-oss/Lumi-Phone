import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ImageCropperModal } from '../../components/ImageCropperModal'
import { WidgetChrome } from '../WidgetChrome'
import { WidgetStyleSheet } from '../WidgetStyleSheet'
import {
  POLAROID_APPEARANCE,
  appearanceShellStyle,
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

type SlotKey = 'imageA' | 'imageB' | 'imageC'

/** 与单张拍立得相框比例一致 */
const PHOTO_CROP_ASPECT = 1 / 1.05
const PHOTO_CROP_MAX_SIDE = 480

const ALL_SLOTS: SlotKey[] = ['imageA', 'imageB', 'imageC']

type CropQueueItem = {
  src: string
  slot: SlotKey
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
  label,
  className = '',
  style,
}: {
  src: string
  shell: CSSProperties
  photoBlur: number
  placeholderTone: string
  muted: string
  label: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[3px] bg-[#faf9f6] px-1 pb-1.5 pt-1 shadow-[0_8px_18px_rgba(28,28,30,0.16)] ${className}`}
      style={{
        ...shell,
        ...style,
      }}
    >
      <div
        className="wg-polaroid-photo relative min-h-0 flex-1 overflow-hidden rounded-[2px]"
        style={{
          background: src ? undefined : placeholderTone,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
          aspectRatio: '1 / 1.05',
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            style={{
              filter:
                photoBlur > 0
                  ? `blur(${photoBlur}px) grayscale(0.08) contrast(1.02)`
                  : 'grayscale(0.08) contrast(1.02)',
              ...(photoBlur > 0
                ? { transform: 'scale(1.06)', transformOrigin: 'center' }
                : {}),
            }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1">
            <span className="text-center text-[8px] leading-snug" style={{ color: muted }}>
              {label}
            </span>
          </div>
        )}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 45%), linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.1))',
            mixBlendMode: 'soft-light',
          }}
        />
      </div>
    </div>
  )
}

export function PolaroidTripleWidget({
  placement,
  isEditMode = false,
  isDragging = false,
}: Props) {
  const { patchConfig } = useWidgetGallery()
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceSlotRef = useRef<SlotKey | 'all'>('all')
  const [pickMultiple, setPickMultiple] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const [activeSlot, setActiveSlot] = useState<SlotKey | 'all'>('all')
  const [cropQueue, setCropQueue] = useState<CropQueueItem[]>([])
  const [picking, setPicking] = useState(false)
  const cfg = placement.config ?? {}

  const imageA = typeof cfg.imageA === 'string' ? cfg.imageA : ''
  const imageB = typeof cfg.imageB === 'string' ? cfg.imageB : ''
  const imageC = typeof cfg.imageC === 'string' ? cfg.imageC : ''

  const appearance = parseAppearance(cfg.appearance, POLAROID_APPEARANCE)
  const shell = appearanceShellStyle({
    ...appearance,
    opacity: Math.max(appearance.opacity, 0.92),
  })
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

  const currentCrop = cropQueue[0] ?? null
  const cropTotal = cropQueue.length
  const cropIndexLabel =
    cropTotal > 1 ? `（${1}/${cropTotal}）` : ''

  const openEdit = (slot: SlotKey) => {
    if (isEditMode || isDragging) return
    setActiveSlot(slot)
    setStyleOpen(true)
  }

  const triggerUpload = (slot: SlotKey | 'all') => {
    replaceSlotRef.current = slot
    setPickMultiple(slot === 'all')
    setActiveSlot(slot)
    window.setTimeout(() => inputRef.current?.click(), 0)
  }

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    const images = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 3)
    if (!images.length) return

    setPicking(true)
    try {
      const srcs = await Promise.all(images.map((f) => readFileAsDataUrl(f)))
      const slot = replaceSlotRef.current
      if (slot === 'all') {
        setCropQueue(
          srcs.map((src, i) => ({
            src,
            slot: ALL_SLOTS[i]!,
          })),
        )
      } else {
        setCropQueue([{ src: srcs[0]!, slot }])
      }
    } catch {
      /* ignore */
    } finally {
      setPicking(false)
    }
  }

  const finishCurrentCrop = (dataUrl: string) => {
    const item = cropQueue[0]
    if (!item) return
    // 先出队，避免连点时用旧 queue；落盘前压缩，防止三张图撑爆 localStorage
    setCropQueue((prev) => prev.slice(1))
    void compressWidgetDataUrl(dataUrl)
      .then((compressed) => {
        patchConfig(placement.id, { [item.slot]: compressed })
      })
      .catch(() => {
        patchConfig(placement.id, { [item.slot]: dataUrl })
      })
  }

  const cancelCropQueue = () => setCropQueue([])

  const frames: { key: SlotKey; src: string; label: string; className: string; style: CSSProperties }[] =
    [
      {
        key: 'imageA',
        src: imageA,
        label: '图1',
        className: 'absolute left-[2%] top-[10%] z-[2] h-[78%] w-[34%]',
        style: {
          transform: 'rotate(-9deg) translateY(4px)',
          transition: 'transform 0.3s ease-in-out',
        },
      },
      {
        key: 'imageB',
        src: imageB,
        label: '图2',
        className: 'absolute left-1/2 top-[4%] z-[1] h-[82%] w-[34%] -translate-x-1/2',
        style: {
          transform: 'rotate(1.5deg)',
          transition: 'transform 0.3s ease-in-out',
        },
      },
      {
        key: 'imageC',
        src: imageC,
        label: '图3',
        className: 'absolute right-[2%] top-[10%] z-[3] h-[78%] w-[34%]',
        style: {
          transform: 'rotate(10deg) translateY(4px)',
          transition: 'transform 0.3s ease-in-out',
        },
      },
    ]

  const slotLabel =
    activeSlot === 'all' ? '三张' : activeSlot === 'imageA' ? '图1' : activeSlot === 'imageB' ? '图2' : '图3'
  const activePreview =
    activeSlot === 'imageA' ? imageA : activeSlot === 'imageB' ? imageB : activeSlot === 'imageC' ? imageC : ''

  return (
    <WidgetChrome
      size={placement.size}
      bare
      isEditMode={isEditMode}
      isDragging={isDragging}
    >
      <div className="relative h-full w-full overflow-visible">
        {frames.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${f.className} border-0 bg-transparent p-0`}
            style={f.style}
            onClick={() => openEdit(f.key)}
            aria-label={`编辑${f.label}`}
          >
            <Frame
              src={f.src}
              shell={shell}
              photoBlur={appearance.blur}
              placeholderTone={placeholderTone}
              muted={muted}
              label={f.label}
              className="h-full w-full"
            />
          </button>
        ))}
      </div>

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
              当前槽位：{slotLabel}。每张上传后都会裁剪；「全部」可一次选最多三张并依次裁剪。
            </p>
            <div className="flex gap-1.5">
              {(
                [
                  ['imageA', '图1'],
                  ['imageB', '图2'],
                  ['imageC', '图3'],
                  ['all', '全部'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-widget-add-ui="true"
                  className={`flex-1 rounded-[10px] border py-1.5 text-[11px] ${
                    activeSlot === key
                      ? 'border-[#2c2c2e]/35 bg-[#2c2c2e] text-white'
                      : 'border-black/8 bg-white/70 text-[#2c2c2e]/70'
                  }`}
                  onClick={() => setActiveSlot(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {activePreview ? (
              <div className="overflow-hidden rounded-[12px] border border-black/8 bg-black/5">
                <img src={activePreview} alt="" className="mx-auto max-h-28 object-contain" />
              </div>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple={pickMultiple}
              className="hidden"
              data-widget-add-ui="true"
              onChange={(e) => {
                void onFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={picking || !!currentCrop}
              className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2.5 text-[12px] font-medium text-[#2c2c2e]/80 disabled:opacity-50"
              onClick={() => triggerUpload(activeSlot)}
            >
              {picking
                ? '准备裁剪…'
                : activeSlot === 'all'
                  ? '一次上传三张并裁剪'
                  : `上传并裁剪${slotLabel}`}
            </button>
            {(imageA || imageB || imageC) && (
              <button
                type="button"
                data-widget-add-ui="true"
                className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2 text-[12px] text-[#2c2c2e]/70"
                onClick={() => {
                  if (activeSlot === 'all') {
                    patchConfig(placement.id, {
                      imageA: '',
                      imageB: '',
                      imageC: '',
                    })
                  } else {
                    patchConfig(placement.id, { [activeSlot]: '' })
                  }
                }}
              >
                {activeSlot === 'all' ? '清除全部照片' : `清除${slotLabel}`}
              </button>
            )}
          </div>
        }
      />

      {phoneShell && currentCrop
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
                imageSrc={currentCrop.src}
                title={`裁剪拍立得${
                  currentCrop.slot === 'imageA'
                    ? '图1'
                    : currentCrop.slot === 'imageB'
                      ? '图2'
                      : '图3'
                }${cropIndexLabel}`}
                aspect={PHOTO_CROP_ASPECT}
                maxSide={PHOTO_CROP_MAX_SIDE}
                objectFit="horizontal-cover"
                onCancel={cancelCropQueue}
                onConfirm={finishCurrentCrop}
              />
            </div>,
            phoneShell,
          )
        : null}
    </WidgetChrome>
  )
}
