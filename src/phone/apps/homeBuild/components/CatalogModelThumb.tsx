import { useEffect, useRef, useState } from 'react'
import { getCachedFurnitureThumb, requestFurnitureThumb } from '../furnitureThumbRenderer'

type Props = {
  modelPath: string
  previewColor?: string
  active?: boolean
}

/** 目录缩略图：主 Canvas 烘焙真实 GLB 外观到 <img> */
export function CatalogModelThumb({ modelPath, previewColor = '#c4a574', active }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [src, setSrc] = useState<string | null>(() => getCachedFurnitureThumb(modelPath) ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSrc(getCachedFurnitureThumb(modelPath) ?? null)
    setBusy(false)
  }, [modelPath])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true)
      },
      { rootMargin: '180px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    const cached = getCachedFurnitureThumb(modelPath)
    if (cached) {
      setSrc(cached)
      return
    }
    let alive = true
    setBusy(true)
    void requestFurnitureThumb(modelPath).then((data) => {
      if (!alive) return
      setBusy(false)
      if (data) setSrc(data)
    })
    return () => {
      alive = false
    }
  }, [inView, modelPath])

  return (
    <div
      ref={hostRef}
      className="hb-catalog-thumb"
      style={{
        background: `linear-gradient(145deg, ${previewColor}88, #2a2a2e)`,
        outline: active ? '2px solid #2C6FAD' : undefined,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-contain"
          style={{ pointerEvents: 'none' }}
        />
      ) : busy ? (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-[9px] text-white/35">…</span>
        </div>
      ) : null}
    </div>
  )
}
