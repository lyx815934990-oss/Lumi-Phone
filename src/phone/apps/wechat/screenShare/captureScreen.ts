import { isIOSWebKit } from '../../../utils/platform'

export function assertScreenShareSupported(): void {
  if (typeof navigator === 'undefined') {
    throw new Error('当前环境不支持屏幕共享')
  }
  if (isIOSWebKit()) {
    throw new Error('一起刷暂不支持 iOS，请使用 Android Chrome 或桌面浏览器')
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('当前浏览器不支持屏幕共享')
  }
}

/** 请求用户授权分享屏幕（优先整屏 / 当前标签页）。 */
export async function captureDisplayMediaStream(): Promise<MediaStream> {
  assertScreenShareSupported()
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 8, max: 15 },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: false,
    })
    const track = stream.getVideoTracks()[0]
    if (!track) {
      stream.getTracks().forEach((t) => t.stop())
      throw new Error('未能获取屏幕画面')
    }
    return stream
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
      throw new Error('已取消屏幕共享授权')
    }
    if (err instanceof Error && err.message.trim()) throw err
    throw new Error('开启屏幕共享失败')
  }
}
