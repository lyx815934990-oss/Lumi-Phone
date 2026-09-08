/** 输入栏按钮图标：缩到小尺寸以控制草稿 / 气泡包体积 */

export const MAX_INPUT_BTN_ICON_DATA_URL_LEN = 120_000
const ICON_SIDE = 96

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export async function compressInputBtnIconDataUrl(src: string): Promise<string> {
  if (!src.trim()) return ''
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('图标图片读取失败'))
  })
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return src

  const scale = Math.min(1, ICON_SIDE / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.clearRect(0, 0, tw, th)
  ctx.drawImage(img, 0, 0, tw, th)

  // 优先 PNG（保留透明）；过大再压 JPEG
  const png = canvas.toDataURL('image/png')
  if (png.length <= MAX_INPUT_BTN_ICON_DATA_URL_LEN) return png

  let best = png
  for (const q of [0.92, 0.82, 0.72, 0.6]) {
    const jpeg = canvas.toDataURL('image/jpeg', q)
    if (jpeg.length < best.length) best = jpeg
    if (jpeg.length <= MAX_INPUT_BTN_ICON_DATA_URL_LEN) return jpeg
  }
  return best
}

export async function readAndCompressInputBtnIcon(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
  const raw = await readFileAsDataUrl(file)
  return compressInputBtnIconDataUrl(raw)
}
