/** 手写体经 Vite 插件拷到 public/fonts 的英文文件名，避免 Rolldown 丢掉中文路径 ttf。 */

export function publicHandFontUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}fonts/${fileName}`
}
