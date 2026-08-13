/** 微信 / 懒加载路由：更新后 chunk 卡住时的自救（偏 iOS Safari 安全） */

const AUTO_RECOVER_KEY = 'lumi-chunk-auto-recover'

/** 只清 Cache Storage，不立刻 unregister SW（iOS 上卸 SW 再跳转易出现「已丢失网络连接」） */
export async function clearLumiRuntimeCaches(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
}

/** 可选：延后卸 SW，等下次冷启动再生效 */
export function scheduleUnregisterServiceWorkers(): void {
  try {
    window.setTimeout(() => {
      void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        for (const r of regs) void r.unregister().catch(() => false)
      })
    }, 2500)
  } catch {
    /* ignore */
  }
}

export function hardReloadWithBust(): void {
  try {
    const u = new URL(window.location.href)
    // 裸域 TLS 偶发失败时，尽量落到 www（同站点）
    if (u.hostname === 'lumiphone.cn') {
      u.hostname = 'www.lumiphone.cn'
    }
    u.searchParams.set('__lazy_retry', String(Date.now()))
    window.location.replace(u.href)
  } catch {
    window.location.reload()
  }
}

export async function recoverLazyRouteSoft(): Promise<void> {
  await clearLumiRuntimeCaches()
  try {
    sessionStorage.removeItem(AUTO_RECOVER_KEY)
  } catch {
    /* ignore */
  }
  hardReloadWithBust()
}

export { AUTO_RECOVER_KEY }
