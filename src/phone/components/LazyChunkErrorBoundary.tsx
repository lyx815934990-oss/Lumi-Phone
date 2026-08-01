import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  label?: string
}

type State = {
  error: Error | null
  retryKey: number
}

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
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

  private handleRetry = () => {
    this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 }))
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[#f2f2f4] px-6 text-center">
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
    return <div key={this.state.retryKey} className="flex h-full min-h-0 flex-1 flex-col">{this.props.children}</div>
  }
}
