import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { markBootProgress, markBootReactAlive } from './phone/boot/lumiBootBridge'
import {
  isLikelyIosBrowser,
  setupServiceWorkerControlWatcher,
} from './phone/apps/backgroundNotify/backgroundPushClient'
import { maybeRecoverFromBrokenKeepAlivePwa } from './phone/apps/backgroundNotify/keepAliveBootRecovery'

markBootReactAlive()
markBootProgress(76, '正在启动应用…')

/**
 * 键盘覆盖内容而不是挤压 viewport（Chromium 等）。
 * iOS WebKit 不支持 VirtualKeyboard API，强行设置会与 visualViewport 滚动抢布局。
 */
if (
  'virtualKeyboard' in navigator &&
  !/iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
) {
  ;(navigator as Navigator & { virtualKeyboard?: { overlaysContent: boolean } }).virtualKeyboard!.overlaysContent = true
}

/** 本机 dev + iOS PWA：清掉历史 SW，避免旧接管状态导致主屏幕图标打开白屏 */
if (import.meta.env.DEV && isLikelyIosBrowser() && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    void Promise.all(regs.map((r) => r.unregister()))
  })
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  markBootProgress(100, '启动失败：缺少根节点')
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    markBootProgress(82, '界面准备中…')
  } catch (err) {
    console.error('[Lumi] React mount failed', err)
    markBootProgress(100, '界面启动失败，请刷新重试')
  }
}

function runWhenIdle(task: () => void, timeoutMs: number) {
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    ric(task, { timeout: timeoutMs })
    return
  }
  window.setTimeout(task, Math.min(timeoutMs, 2500))
}

/** 先渲染 UI，再挂 SW / 保活 / 主动消息引擎，避免抢首屏 */
queueMicrotask(() => {
  maybeRecoverFromBrokenKeepAlivePwa()
  /** 本机 dev 不注册 SW（尤其 iOS 主屏幕 PWA 易白屏）；正式构建再启用 */
  if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
    const installSwWatcher = () => setupServiceWorkerControlWatcher()
    const iosDeferMs = isLikelyIosBrowser() ? 2500 : 0
    if (iosDeferMs > 0) {
      window.setTimeout(installSwWatcher, iosDeferMs)
    } else {
      installSwWatcher()
    }
  }

  runWhenIdle(() => {
    void import('./phone/apps/backgroundNotify/backgroundKeepAlive').then((m) => {
      m.installBackgroundKeepAlive()
    })
    void import('./phone/apps/wechat/proactivePrivateMessageEngine').then((m) => {
      m.installProactivePrivateMessageEngine()
    })
    void import('./components/moments/proactiveCharacterMomentEngine').then((m) => {
      m.installProactiveCharacterMomentEngine()
    })
    void import('./phone/apps/takeout/tasteUserGiftDeliveryEngine').then((m) => {
      m.installTasteUserGiftDeliveryEngine()
    })
    void import('./phone/apps/takeout/tasteFeastCeremonyEngine').then((m) => {
      m.installTasteFeastCeremonyEngine()
    })
  }, 4000)
})
