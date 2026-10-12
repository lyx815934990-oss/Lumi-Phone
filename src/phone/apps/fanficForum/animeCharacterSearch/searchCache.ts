/** 简单内存缓存，避免同词/同作品重复请求 */

const store = new Map<string, { at: number; value: unknown }>()
const TTL_MS = 1000 * 60 * 30

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key)
    return undefined
  }
  return hit.value as T
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, { at: Date.now(), value })
}

export function cacheKeySearch(q: string): string {
  return `search:${q.trim().toLowerCase()}`
}

export function cacheKeyChars(mediaId: number, source: string): string {
  return `media:${source}:${mediaId}:chars`
}
