/** 通讯社头像上传：压缩为小图 data URL，与微信头像存储隔离 */

const MAX_FILE_BYTES = 5 * 1024 * 1024

async function compressDataUrl(dataUrl: string, maxEdge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法处理图片'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('无法读取图片'))
    img.src = dataUrl
  })
}

/** 读取并压缩为通讯社头像（约 256px JPEG） */
export async function readForumAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请上传 JPG、PNG 或 WebP 图片')
  if (file.size > MAX_FILE_BYTES) throw new Error('单张图片不能超过 5MB')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })

  return compressDataUrl(dataUrl, 256, 0.86)
}
