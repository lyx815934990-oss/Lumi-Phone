/** 组件库图片压缩（控制 localStorage 体积） */
const MAX_SIDE = 480
const MAX_BYTES = 140 * 1024

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || ''))
    fr.onerror = () => reject(fr.error ?? new Error('FileReader'))
    fr.readAsDataURL(blob)
  })
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new window.Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('图片加载失败'))
    el.src = src
  })
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await loadImageFromUrl(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function compressLoadedImage(
  img: HTMLImageElement,
  maxSide = MAX_SIDE,
  maxBytes = MAX_BYTES,
): Promise<string> {
  const max = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = max > maxSide ? maxSide / max : 1
  let w = Math.max(1, Math.round(img.naturalWidth * scale))
  let h = Math.max(1, Math.round(img.naturalHeight * scale))
  let q = 0.78

  const encode = async (width: number, height: number, quality: number) => {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('无法处理图片')
    ctx.fillStyle = '#f4f2ee'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), 'image/jpeg', quality),
    )
    if (!blob) throw new Error('图片编码失败')
    return blob
  }

  for (let i = 0; i < 8; i += 1) {
    const blob = await encode(w, h, q)
    if (blob.size <= maxBytes) return blobToDataUrl(blob)
    q = Math.max(0.45, q - 0.07)
    if (i === 3) {
      w = Math.max(1, Math.round(w * 0.85))
      h = Math.max(1, Math.round(h * 0.85))
    }
  }

  const last = await encode(w, h, q)
  return blobToDataUrl(last)
}

export async function compressWidgetImage(file: File): Promise<string> {
  const img = await loadImageFromFile(file)
  return compressLoadedImage(img)
}

/** 裁剪后的 dataURL 再压一遍，避免三张拍立得撑爆 localStorage */
export async function compressWidgetDataUrl(
  dataUrl: string,
  maxSide = MAX_SIDE,
  maxBytes = MAX_BYTES,
): Promise<string> {
  if (!dataUrl.startsWith('data:image')) return dataUrl
  const img = await loadImageFromUrl(dataUrl)
  return compressLoadedImage(img, maxSide, maxBytes)
}
