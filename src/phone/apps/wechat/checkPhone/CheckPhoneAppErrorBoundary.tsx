import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable } from '../../../components/Pressable'

type Props = {
  children: ReactNode
  onClose?: () => void
  label?: string
}

type State = {
  error: Error | null
  retryKey: number
}

/** 查手机子 App 渲染失败时不拖垮整页微信 */
export class CheckPhoneAppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CheckPhoneAppErrorBoundary]', this.props.label || 'app', error, info.componentStack)
  }

  private retry = () => {
    this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 }))
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message?.trim() || '未知渲染错误'
      return (
        <div className="absolute inset-0 z-[40] flex flex-col bg-[#f2f2f4]">
          <div className="flex items-center justify-between px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
            <Pressable
              type="button"
              className="rounded-full px-3 py-1.5 text-[14px] text-black/70"
              onClick={() => this.props.onClose?.()}
            >
              关闭
            </Pressable>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[15px] font-medium text-black/75">
              {this.props.label ? `${this.props.label}出错了` : '页面出错了'}
            </p>
            <p className="max-w-[280px] break-words text-[12px] leading-relaxed text-black/45">{msg}</p>
            <Pressable
              type="button"
              className="mt-1 rounded-full bg-black/85 px-4 py-2 text-[13px] text-white"
              onClick={this.retry}
            >
              再试一次
            </Pressable>
          </div>
        </div>
      )
    }
    return <div key={this.state.retryKey} className="contents">{this.props.children}</div>
  }
}
