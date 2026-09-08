/** 家具目录缩略图请求总线（由场景内 FurnitureThumbBaker 用主 WebGL 出图） */

const cache = new Map<string, string>()
const waiters = new Map<string, Array<(v: string | null) => void>>()
const queue: string[] = []

export function getCachedFurnitureThumb(url: string): string | undefined {
  return cache.get(url)
}

/** 排队渲染目录缩略图；需 Scene3D 内挂载 FurnitureThumbBaker */
export function requestFurnitureThumb(url: string): Promise<string | null> {
  const hit = cache.get(url)
  if (hit) return Promise.resolve(hit)

  return new Promise((resolve) => {
    const list = waiters.get(url)
    if (list) {
      list.push(resolve)
      return
    }
    waiters.set(url, [resolve])
    queue.push(url)
  })
}

export function takeNextThumbUrl(): string | null {
  return queue.shift() ?? null
}

export function finishFurnitureThumb(url: string, data: string | null): void {
  if (data) cache.set(url, data)
  const list = waiters.get(url)
  waiters.delete(url)
  if (!list) return
  for (const resolve of list) resolve(data)
}
