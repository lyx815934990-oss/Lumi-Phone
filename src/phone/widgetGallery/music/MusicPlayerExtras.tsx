import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ImageCropperModal } from '../../components/ImageCropperModal'

type Props = {
  bgImage: string
  onBgImage: (dataUrl: string) => void
  /** 2×2 → 1；4×2 → 2 */
  cropAspect?: number
  spinSpeed?: 'slow' | 'medium' | 'fast'
  onSpinSpeed?: (v: 'slow' | 'medium' | 'fast') => void
  onOpenListen: () => void
  openListenLabel?: string
  hint?: string
  children?: ReactNode
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

/** 外观面板：背景图裁剪 + 旋转速度 + 听一听入口 */
export function MusicPlayerExtras({
  bgImage,
  onBgImage,
  cropAspect = 1,
  spinSpeed,
  onSpinSpeed,
  onOpenListen,
  openListenLabel = '打开听一听',
  hint = '曲目与播放进度跟随「听一听」。点组件主体可进入听一听选歌、搜歌与资料库。',
  children,
}: Props) {
  const bgInputRef = useRef<HTMLInputElement>(null)
  const [bgCropSrc, setBgCropSrc] = useState('')
  const shell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1.5 block text-[12px] text-[#2c2c2e]/70">
          背景图（与背景色二选一）
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
              onClick={() => onBgImage('')}
            >
              清除
            </button>
          ) : null}
        </div>
      </div>

      {onSpinSpeed && spinSpeed ? (
        <div>
          <span className="mb-1.5 block text-[12px] text-[#2c2c2e]/70">旋转速度</span>
          <div className="flex overflow-hidden rounded-[10px] border border-black/8">
            {(
              [
                ['slow', '慢'],
                ['medium', '中'],
                ['fast', '快'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="flex-1 py-1.5 text-[12px]"
                style={{
                  background: spinSpeed === id ? 'rgba(44,44,46,0.1)' : 'transparent',
                  color: '#2c2c2e',
                  fontWeight: spinSpeed === id ? 600 : 400,
                }}
                onClick={() => onSpinSpeed(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {children}

      <p className="text-[11px] leading-relaxed text-[#2c2c2e]/45">{hint}</p>
      <button
        type="button"
        className="w-full rounded-[12px] border border-black/8 bg-white/70 py-2.5 text-[12px] text-[#2c2c2e]"
        onClick={onOpenListen}
      >
        {openListenLabel}
      </button>

      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file || !file.type.startsWith('image/')) return
          void readFileAsDataUrl(file)
            .then((src) => setBgCropSrc(src))
            .catch(() => {})
        }}
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
                title={`裁剪播放器背景（${cropAspect === 2 ? '2:1' : '1:1'}）`}
                aspect={cropAspect}
                maxSide={720}
                objectFit="horizontal-cover"
                onCancel={() => setBgCropSrc('')}
                onConfirm={(dataUrl) => {
                  onBgImage(dataUrl)
                  setBgCropSrc('')
                }}
              />
            </div>,
            shell,
          )
        : null}
    </div>
  )
}

export const MUSIC_SPIN_SEC: Record<'slow' | 'medium' | 'fast', number> = {
  slow: 8,
  medium: 4.5,
  fast: 2.4,
}

export const MUSIC_DEFAULT_FROST = 14
