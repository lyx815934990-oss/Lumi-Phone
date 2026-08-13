import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  label?: string
  /** 失败/重试界面左上角关闭（如退回发现列表） */
  onClose?: () => void
}

type State = {
  error: Error | null
  retryKey: number
  recovering: boolean
}

const AUTO_RECOVER_KEY = 'lumi-chunk-auto-recover'

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const lower = msg.toLowerCase()
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('load failed') ||
    (lower.includes('failed to fetch') && lower.includes('module'))
  )
}

/** 彻底清掉壳缓存与 SW，避免旧 hash / 坏拆包一直卡住微信、发现页 */
async function nukeRuntimeCachesAndSw(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.()
    if (regs?.length) {
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
    }
  } catch {
    /* ignore */
  }
}

function hardReloadWithBust(): void {
  try {
    const u = new URL(window.location.href)
    u.searchParams.set('__lazy_retry', String(Date.now()))
    window.location.replace(u.href)
  } catch {
    window.location.reload()
  }
}

/** 捕获按需 chunk 下载失败，提供重试 / 刷新，避免整机白屏 */
export class LazyChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0, recovering: false }

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    // 更新后 chunk 失败 / 模块求值失败都拦，避免白屏或永久停在 Suspense
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Lumi] lazy route failed', error, info.componentStack)

    // 仅对典型 chunk 下载失败做一次自动抢救；其它错误交给用户点重试
    if (!isChunkLoadError(error)) return

    try {
      if (sessionStorage.getItem(AUTO_RECOVER_KEY) === '1') return
      sessionStorage.setItem(AUTO_RECOVER_KEY, '1')
    } catch {
      return
    }
    this.setState({ recovering: true })
    void nukeRuntimeCachesAndSw().finally(() => {
      hardReloadWithBust()
    })
  }

  private handleRetry = () => {
    this.setState({ recovering: true })
    void nukeRuntimeCachesAndSw().finally(() => {
      try {
        sessionStorage.removeItem(AUTO_RECOVER_KEY)
      } catch {
        /* ignore */
      }
      hardReloadWithBust()
    })
  }

  private handleReload = () => {
    this.setState({ recovering: true })
    void nukeRuntimeCachesAndSw().finally(() => {
      try {
        sessionStorage.removeItem(AUTO_RECOVER_KEY)
      } catch {
        /* ignore */
      }
      window.location.reload()
    })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[#f2f2f4] px-6 text-center">
          {this.props.onClose ? (
            <button
              type="button"
              onClick={this.props.onClose}
              className="absolute left-3 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-black/6 px-3 text-[14px] font-medium text-black/70 active:bg-black/12"
              style={{ top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))' }}
              aria-label="关闭"
            >
              关闭
            </button>
          ) : null}
          <p className="text-[15px] font-medium text-black/75">
            {this.state.recovering
              ? '正在清理缓存并重新进入…'
              : this.props.label
                ? `${this.props.label}失败`
                : '模块加载失败'}
          </p>
          <p className="max-w-[260px] text-[12px] leading-relaxed text-black/45">
            多半是更新后旧缓存或资源下载中断。可点重试；若仍不行，请关掉网页重新打开一次。
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              disabled={this.state.recovering}
              className="rounded-full bg-black/85 px-4 py-2 text-[13px] text-white disabled:opacity-50"
            >
              重试
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              disabled={this.state.recovering}
              className="rounded-full bg-black/8 px-4 py-2 text-[13px] text-black/70 disabled:opacity-50"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return (
      <div key={this.state.retryKey} className="flex h-full min-h-0 flex-1 flex-col">
        {this.props.children}
      </div>
    )
  }
}
