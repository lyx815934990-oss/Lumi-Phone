/** 首开预热 / 缓存：排除剧本杀与超大媒体 */

const SKIP_URL_RE =
  /JBSGameFlow|jubensha|Jubensha|jbsChat|剧本杀|\.mp4(?:$|\?)|聊天室背景/i

export function shouldSkipBootAssetUrl(url: string): boolean {
  return SKIP_URL_RE.test(url)
}

function collectLoadedAssetUrls(): string[] {
  if (typeof performance === 'undefined') return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    const name = String(entry.name || '')
    if (!name || shouldSkipBootAssetUrl(name)) continue
    if (!name.includes('/assets/') && !name.includes('/src/')) continue
    if (!/\.(js|css|woff2?)($|\?)/i.test(name) && !name.includes('/assets/')) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/** 把已下载的壳资源交给 SW 持久缓存（不含剧本杀） */
export async function persistLoadedAssetsToServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const urls = collectLoadedAssetUrls()
    if (!urls.length || !reg.active) return
    reg.active.postMessage({ type: 'lumi-cache-urls', urls })
  } catch {
    // ignore
  }
}

/**
 * 首开空闲预取：微信等常用壳，绝不拉剧本杀 / 对局媒体。
 */
export function warmNonJubenshaAppChunks(): void {
  void import('../apps/wechat/WeChatApp').catch(() => {})
}
