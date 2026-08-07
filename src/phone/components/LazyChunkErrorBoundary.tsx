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
}

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const lower = msg.toLowerCase()
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('load failed') ||
    // Chromium: ERR_CONNECTION_RESET / Failed to fetch
    (lower.includes('failed to fetch') && lower.includes('module'))
  )
}

/** 捕获按需 chunk 下载失败，提供重试 / 刷新，避免整机白屏 */
export class LazyChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    if (isChunkLoadError(error)) return { error }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      console.warn('[Lumi] lazy chunk load failed', error, info.componentStack)
    }
  }

  /**
   * React.lazy 会 sticky 缓存失败的 Promise，仅清 error + remount 不会重新拉 chunk。
   * 带 cache-bust 软刷新，才能真正重新下载。
   */
  private handleRetry = () => {
    try {
      const u = new URL(window.location.href)
      u.searchParams.set('__lazy_retry', String(Date.now()))
      window.location.replace(u.href)
    } catch {
      window.location.reload()
    }
  }

  private handleReload = () => {
    window.location.reload()
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
            {this.props.label ? `${this.props.label}失败` : '模块加载失败'}
          </p>
          <p className="max-w-[260px] text-[12px] leading-relaxed text-black/45">
            网络中断或资源下载被重置。可重试加载；若刚更新过站点，请刷新页面。
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-full bg-black/85 px-4 py-2 text-[13px] text-white"
            >
              重试
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-full bg-black/8 px-4 py-2 text-[13px] text-black/70"
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
