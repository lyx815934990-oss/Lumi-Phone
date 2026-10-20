/**
 * 一键清空本机用户使用数据，使 Lumi 网页回到近似首次打开的状态。
 * 不删服务端；仅清本浏览器 localStorage / IndexedDB / sessionStorage / Cache Storage。
 */

const KNOWN_IDB_NAMES = [
  'wechat-personas-v1',
  'wechat-voice-call-sessions-v1',
  'lumi-home-oc-models',
  'lumi-qixi-envelope-v1',
  'lumi-qixi-font-v1',
] as const

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined' || !name) {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    try {
      const req = indexedDB.deleteDatabase(name)
      req.onsuccess = () => finish()
      req.onerror = () => finish()
      req.onblocked = () => {
        // 仍有连接时等一会再继续；整页 reload 会彻底断开
        window.setTimeout(finish, 400)
      }
    } catch {
      finish()
    }
  })
}

async function listIndexedDbNames(): Promise<string[]> {
  const names = new Set<string>(KNOWN_IDB_NAMES)
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    try {
      const list = await indexedDB.databases()
      for (const d of list) {
        const n = String(d?.name ?? '').trim()
        if (n) names.add(n)
      }
    } catch {
      /* 部分浏览器不支持或拒权，退回已知库名 */
    }
  }
  return [...names]
}

async function clearCacheStorage(): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
  } catch {
    /* ignore */
  }
}

function clearWebStorage(): { localKeys: number; sessionKeys: number } {
  let localKeys = 0
  let sessionKeys = 0
  try {
    localKeys = typeof localStorage !== 'undefined' ? localStorage.length : 0
    localStorage.clear()
  } catch {
    /* ignore */
  }
  try {
    sessionKeys = typeof sessionStorage !== 'undefined' ? sessionStorage.length : 0
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  return { localKeys, sessionKeys }
}

export type ClearAllUserDataResult = {
  indexedDbNames: string[]
  localStorageKeysCleared: number
  sessionStorageKeysCleared: number
}

/**
 * 清空本机使用数据。调用方应在成功后立刻整页刷新，避免内存态残留。
 */
export async function clearAllUserData(): Promise<ClearAllUserDataResult> {
  const indexedDbNames = await listIndexedDbNames()
  for (const name of indexedDbNames) {
    await deleteIndexedDb(name)
  }
  await clearCacheStorage()
  const { localKeys, sessionKeys } = clearWebStorage()
  return {
    indexedDbNames,
    localStorageKeysCleared: localKeys,
    sessionStorageKeysCleared: sessionKeys,
  }
}
