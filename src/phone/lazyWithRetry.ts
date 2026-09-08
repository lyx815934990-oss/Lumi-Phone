import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyImporter = () => Promise<{ default: ComponentType<any> }>

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function extractFailedModuleUrl(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const patterns = [
    /Failed to fetch dynamically imported module:\s*(.+)$/i,
    /error loading dynamically imported module:\s*(.+)$/i,
    /Importing a module script failed\.?\s*(.+)?$/i,
  ]
  for (const re of patterns) {
    const m = msg.match(re)
    const raw = m?.[1]?.trim()
    if (!raw) continue
    // 文案换行可能把 `.tsx?t=` 拆成 `.ts` + `x?t=`，拼回完整 URL
    const cleaned = raw.replace(/\s+/g, '')
    for (const candidate of [cleaned, raw]) {
      try {
        const url = new URL(candidate)
        // 误成 WeChatApp.ts（Vite 会回落 HTML）时纠正为 .tsx
        if (/\.ts$/i.test(url.pathname) && !/\.tsx$/i.test(url.pathname)) {
          url.pathname = `${url.pathname}x`
        }
        return url.href
      } catch {
        /* try next */
      }
    }
  }
  return null
}

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const lower = msg.toLowerCase()
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module')
  )
}

function isViteDevRuntime(): boolean {
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return false
  }
}

/**
 * 弱网 / GitHub Pages 大 chunk 偶发 ERR_CONNECTION_RESET 时，
 * 失败的 dynamic import 会被浏览器 sticky 缓存；需带 cache-bust 重试。
 * 支持任意命名导出（不仅限于 React.lazy 的 default）。
 *
 * 注意：Vite 开发态不要用绝对 URL + @vite-ignore 重试（会绕过模块图，手机局域网更易二次失败）。
 */
export async function importNamedWithRetry<T>(
  importer: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 4
  const baseDelayMs = opts?.baseDelayMs ?? 600
  let lastError: unknown
  const viteDev = isViteDevRuntime()

  try {
    return await importer()
  } catch (error) {
    lastError = error
    if (!isChunkLoadError(error)) throw error
  }

  for (let i = 0; i < retries; i += 1) {
    await sleep(baseDelayMs * 2 ** i)
    try {
      // 生产构建：仅对 /assets/ 哈希 chunk 做绝对 URL cache-bust
      // 开发态或 /src/ 路径：只重跑原 importer（绝对 import .ts 会拿到 HTML，必挂）
      if (!viteDev) {
        const failedUrl = extractFailedModuleUrl(lastError)
        if (failedUrl && /\/assets\//i.test(failedUrl)) {
          const url = new URL(failedUrl)
          url.searchParams.set('t', String(Date.now()))
          return (await import(/* @vite-ignore */ url.href)) as T
        }
      }
      return await importer()
    } catch (error) {
      lastError = error
      if (!isChunkLoadError(error)) throw error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to fetch dynamically imported module')
}

export async function importWithRetry(
  importer: AnyImporter,
  opts?: { retries?: number; baseDelayMs?: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ default: ComponentType<any> }> {
  return importNamedWithRetry(importer, opts)
}

/** 用法同 React.lazy，失败时自动重试（含 cache-bust） */
export function lazyWithRetry(
  importer: AnyImporter,
  opts?: { retries?: number; baseDelayMs?: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): LazyExoticComponent<ComponentType<any>> {
  return lazy(() => importWithRetry(importer, opts))
}
