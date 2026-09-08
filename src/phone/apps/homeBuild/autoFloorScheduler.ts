import type { FloorLevel } from './types'

let timer: ReturnType<typeof setTimeout> | null = null
let pending = false

type SyncFn = () => void

/** 延迟合并自动地板计算，避免打开/编辑时阻塞 UI */
export function scheduleAutoFloorSync(run: SyncFn): void {
  pending = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    if (!pending) return
    pending = false
    run()
  }, 280)
}

export function cancelAutoFloorSync(): void {
  pending = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

export function syncAutoFloorsNow(
  floors: FloorLevel[],
  syncFloor: (floor: FloorLevel) => FloorLevel,
): FloorLevel[] | null {
  try {
    return floors.map(syncFloor)
  } catch {
    return null
  }
}
