import { Cache } from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import type { Group } from 'three'

const loader = new FBXLoader()
const promiseCache = new Map<string, Promise<Group>>()

async function fetchFbxBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`无法加载 FBX HTTP ${res.status}：${url}`)
  const buf = await res.arrayBuffer()
  if (buf.byteLength < 16) throw new Error(`FBX 文件过小：${url}`)
  return buf
}

/** 加载 Mixamo / 用户 OC FBX（含网格或纯动作） */
export function loadAvatarFbx(url: string): Promise<Group> {
  let p = promiseCache.get(url)
  if (!p) {
    p = fetchFbxBuffer(url)
      .then((buf) => {
        // three@0.185 FBXLoader 只有同步 parse，没有 parseAsync
        return loader.parse(buf, '') as Group
      })
      .catch((err) => {
        promiseCache.delete(url)
        throw err
      })
    promiseCache.set(url, p)
  }
  // 返回缓存源；有蒙皮时由 prepareCustomAvatarMesh 用 SkeletonUtils 克隆
  return p
}

export function clearAvatarFbx(url: string): void {
  promiseCache.delete(url)
  try {
    Cache.remove(url)
  } catch {
    /* ignore */
  }
}

/** 丢弃全部 FBX 内存缓存（缩放逻辑回滚后避免脏骨架） */
export function clearAllAvatarFbxCache(): void {
  promiseCache.clear()
}

/** 从 FBX 组里取第一条有效动画 */
export function firstAnimationClip(group: Group) {
  const clips = group.animations.filter((c) => c.duration > 0.01)
  return clips.find((c) => c.name.includes('mixamo')) ?? clips[0] ?? null
}
