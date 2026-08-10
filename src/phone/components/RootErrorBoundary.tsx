import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

/** 根级错误边界：避免未捕获异常直接白屏 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Lumi] root render crashed', error, info.componentStack)
  }

  private handleReload = () => {
    try {
      const u = new URL(window.location.href)
      u.searchParams.set('__err_retry', String(Date.now()))
      window.location.replace(u.toString())
    } catch {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#f2f2f4',
          color: '#1c1c1e',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>界面出了点问题</p>
        <p style={{ fontSize: 13, opacity: 0.55, marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>
          {this.state.error.message || '渲染失败'}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            marginTop: 20,
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid rgba(0,0,0,0.12)',
            background: '#fff',
            fontSize: 14,
          }}
        >
          重新加载
        </button>
      </div>
    )
  }
}
