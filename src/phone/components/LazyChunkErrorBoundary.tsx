import { Component, type ErrorInfo, type ReactNode } from 'react'

import { recoverLazyRouteSoft } from './lazyRouteRecover'

type Props = {
  children: ReactNode
  label?: string
  /** 失败/重试界面左上角关闭（如退回发现列表） */
  onClose?: () => void
  /**
   * 「再试一次」时额外回调：用于丢掉 React.lazy 已缓存的 rejected Promise
   *（例如重置微信模块单例并换新的 lazy 实例）。
   */
  onBeforeRetry?: () => void
}

type State = {
  error: Error | null
  retryKey: number
  recovering: boolean
}

function isLocalDevHost(): boolean {
  try {
    const h = window.location.hostname
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      /^192\.168\.\d+\.\d+$/.test(h) ||
      /^10\.\d+\.\d+\.\d+$/.test(h) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)
    )
  } catch {
    return false
  }
}

/** 捕获按需 chunk / 渲染失败，只展示手动重试——绝不自动刷整页（避免死循环） */
export class LazyChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0, recovering: false }

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Lumi] lazy route failed', error, info.componentStack)
  }

  private handleRetry = () => {
    try {
      this.props.onBeforeRetry?.()
    } catch (err) {
      console.warn('[Lumi] onBeforeRetry failed', err)
    }
    // 应用内重挂载；不自动 location.reload
    this.setState((s) => ({ error: null, recovering: false, retryKey: s.retryKey + 1 }))
  }

  private handleReload = () => {
    this.setState({ recovering: true })
    void recoverLazyRouteSoft().catch(() => {
      this.setState({ recovering: false })
    })
  }

  render() {
    if (this.state.error) {
      const localDev = isLocalDevHost()
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
                ? `${this.props.label.replace(/…$/, '')}失败`
                : '模块加载失败'}
          </p>
          <p className="max-w-[260px] text-[12px] leading-relaxed text-black/45">
            {localDev
              ? '本机调试：常见原因是手机访问局域网 Vite 时证书未信任、或微信大包下载中断。先点「再试一次」；仍不行确认电脑 Vite 仍在跑，或改用 http / 信任证书后刷新。'
              : '请优先打开 www.lumiphone.cn。先点「再试一次」；仍不行再清缓存刷新。系统不会再自动刷页打断下载。'}
          </p>
          {this.state.error?.message ? (
            <p className="max-w-[280px] break-words text-[11px] leading-relaxed text-red-700/70">
              {this.state.error.message}
            </p>
          ) : null}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              disabled={this.state.recovering}
              className="rounded-full bg-black/85 px-4 py-2 text-[13px] text-white disabled:opacity-50"
            >
              再试一次
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              disabled={this.state.recovering}
              className="rounded-full bg-black/8 px-4 py-2 text-[13px] text-black/70 disabled:opacity-50"
            >
              清缓存刷新
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
