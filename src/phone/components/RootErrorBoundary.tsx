import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null; autoRetried: boolean }

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('importing a module script failed') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module')
  )
}

/** 根级错误边界：避免未捕获异常直接白屏 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, autoRetried: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Lumi] root render crashed', error, info.componentStack)

    // 更新后旧 chunk 404 / 导出撑爆内存导致模块加载失败：自动硬刷新一次
    if (!isChunkLoadError(error)) return
    try {
      const key = 'lumi-chunk-err-autoreload'
      if (sessionStorage.getItem(key) === '1') return
      sessionStorage.setItem(key, '1')
      const u = new URL(window.location.href)
      u.searchParams.set('__chunk_retry', String(Date.now()))
      window.location.replace(u.toString())
    } catch {
      /* fall through to UI */
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem('lumi-chunk-err-autoreload')
      const u = new URL(window.location.href)
      u.searchParams.set('__err_retry', String(Date.now()))
      window.location.replace(u.toString())
    } catch {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    const chunkFail = isChunkLoadError(this.state.error)
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
        <p style={{ fontSize: 13, opacity: 0.55, marginTop: 8, maxWidth: 300, lineHeight: 1.55 }}>
          {chunkFail
            ? '资源加载失败。常见原因：刚更新后缓存未刷新，或导出大数据时手机内存不足。请关掉页面重新打开；若刚在导出，可删掉部分组件大图后再试，或换电脑导出。'
            : this.state.error.message || '渲染失败'}
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
