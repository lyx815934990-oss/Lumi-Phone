/** GLB 模型 URL — public/home-models（由 建模模型/已整理 同步） */

/**
 * 生成可请求的模型路径。
 * 中文路径不做预编码：交给浏览器/Vite，避免与 three FileLoader 双重 encode 导致 404→方块。
 */
export function homeModelUrl(relativeOutput: string): string {
  const rel = relativeOutput
    .replace(/^已整理[/\\]/, '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('/')
  const base = import.meta.env.BASE_URL
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}home-models/${rel}`
}

/** @deprecated 太阳模型已改为 Vite 打包的 assets/sun.glb */
export function sunModelUrl(): string {
  const base = import.meta.env.BASE_URL
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}home-models/sun.glb`
}
