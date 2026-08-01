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
  const m = msg.match(/Failed to fetch dynamically imported module:\s*(.+)$/i)
  if (!m?.[1]) return null
  try {
    return new URL(m[1].trim()).href
  } catch {
    return null
  }
}

/**
 * 弱网 / GitHub Pages 大 chunk 偶发 ERR_CONNECTION_RESET 时，
 * 失败的 dynamic import 会被浏览器 sticky 缓存；需带 cache-bust 重试。
 */
export async function importWithRetry(
  importer: AnyImporter,
  opts?: { retries?: number; baseDelayMs?: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ default: ComponentType<any> }> {
  const retries = opts?.retries ?? 4
  const baseDelayMs = opts?.baseDelayMs ?? 600
  let lastError: unknown

  try {
    return await importer()
  } catch (error) {
    lastError = error
  }

  for (let i = 0; i < retries; i += 1) {
    await sleep(baseDelayMs * 2 ** i)
    const failedUrl = extractFailedModuleUrl(lastError)
    try {
      if (failedUrl) {
        const url = new URL(failedUrl)
        url.searchParams.set('t', String(Date.now()))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await import(/* @vite-ignore */ url.href)) as { default: ComponentType<any> }
      }
      return await importer()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to fetch dynamically imported module')
}

/** 用法同 React.lazy，失败时自动重试（含 cache-bust） */
export function lazyWithRetry(
  importer: AnyImporter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): LazyExoticComponent<ComponentType<any>> {
  return lazy(() => importWithRetry(importer))
}
