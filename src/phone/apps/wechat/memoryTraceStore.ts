import { personaDb } from './newFriendsPersona/idb'
import {
  parseMemoryTraceData,
  WECHAT_MEMORY_TRACE_KV_KEY,
  type MemoryTraceData,
} from './memoryTraceTypes'

let lastTrace: MemoryTraceData | null = null
const listeners = new Set<() => void>()

/** 串行写库代数：更早发起的 setPhoneKv 不得覆盖更新的溯源 */
let persistGeneration = 0

export function getLastMemoryTrace(): MemoryTraceData | null {
  return lastTrace
}

function stampTrace(data: MemoryTraceData): MemoryTraceData {
  const publishedAtMs =
    typeof data.publishedAtMs === 'number' && Number.isFinite(data.publishedAtMs) && data.publishedAtMs > 0
      ? data.publishedAtMs
      : Date.now()
  return { ...data, publishedAtMs }
}

export function setLastMemoryTrace(data: MemoryTraceData | null): void {
  if (data) {
    const stamped = stampTrace(data)
    // 内存里已有更新记录时，禁止被更旧的 payload 盖掉（异步发布竞态）
    if (
      lastTrace?.publishedAtMs != null &&
      stamped.publishedAtMs != null &&
      stamped.publishedAtMs < lastTrace.publishedAtMs
    ) {
      return
    }
    lastTrace = stamped
  } else {
    lastTrace = null
  }
  listeners.forEach((fn) => fn())
  if (typeof window === 'undefined') return
  const gen = ++persistGeneration
  const snapshot = lastTrace
  void (async () => {
    try {
      if (snapshot) {
        await personaDb.setPhoneKv(WECHAT_MEMORY_TRACE_KV_KEY, snapshot)
      } else {
        await personaDb.runWithIndexedTrashSuspended(async () => {
          await personaDb.deletePhoneKv(WECHAT_MEMORY_TRACE_KV_KEY)
        })
      }
      // 慢写完成时若已有更新发布：再写一次最新，避免旧线下盖住新线上
      if (gen !== persistGeneration && lastTrace) {
        await personaDb.setPhoneKv(WECHAT_MEMORY_TRACE_KV_KEY, lastTrace)
      }
    } catch {
      // 配额或 IDB 失败时不阻断聊天
    }
  })()
}

/**
 * 进入微信时从 IndexedDB 恢复上次发布的溯源。
 * 若内存里已有更新的溯源（例如私聊刚发布、IDB 尚未写完），禁止用旧线下记录盖回。
 */
export async function hydrateMemoryTraceFromIndexedDb(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const raw = await personaDb.getPhoneKv(WECHAT_MEMORY_TRACE_KV_KEY)
    const parsed = parseMemoryTraceData(raw)
    if (!parsed) return
    const incomingTs = parsed.publishedAtMs ?? 0
    const currentTs = lastTrace?.publishedAtMs ?? 0
    if (lastTrace && incomingTs < currentTs) return
    if (lastTrace && incomingTs === currentTs && currentTs > 0) return
    lastTrace = stampTrace(parsed)
    listeners.forEach((fn) => fn())
  } catch {
    // ignore
  }
}

export function subscribeLastMemoryTrace(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}
