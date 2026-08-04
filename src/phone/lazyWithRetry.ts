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
    try {
      return new URL(raw).href
    } catch {
      /* keep scanning */
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

/**
 * 弱网 / GitHub Pages 大 chunk 偶发 ERR_CONNECTION_RESET 时，
 * 失败的 dynamic import 会被浏览器 sticky 缓存；需带 cache-bust 重试。
 * 支持任意命名导出（不仅限于 React.lazy 的 default）。
 */
export async function importNamedWithRetry<T>(
  importer: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 4
  const baseDelayMs = opts?.baseDelayMs ?? 600
  let lastError: unknown

  try {
    return await importer()
  } catch (error) {
    lastError = error
    if (!isChunkLoadError(error)) throw error
  }

  for (let i = 0; i < retries; i += 1) {
    await sleep(baseDelayMs * 2 ** i)
    const failedUrl = extractFailedModuleUrl(lastError)
    try {
      if (failedUrl) {
        const url = new URL(failedUrl)
        url.searchParams.set('t', String(Date.now()))
        return (await import(/* @vite-ignore */ url.href)) as T
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): LazyExoticComponent<ComponentType<any>> {
  return lazy(() => importWithRetry(importer))
}
