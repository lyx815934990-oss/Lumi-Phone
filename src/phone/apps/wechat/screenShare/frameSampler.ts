import { compressChatImageToJpeg } from '../wechatChatImageCompress'
import type { ScreenShareFrameCapture } from './types'

function waitVideoReady(video: HTMLVideoElement, timeoutMs = 4000): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('屏幕画面尚未就绪'))
    }, timeoutMs)
    const onReady = () => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return
      cleanup()
      resolve()
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('loadedmetadata', onReady)
    }
    video.addEventListener('loadeddata', onReady)
    video.addEventListener('loadedmetadata', onReady)
  })
}

/** 从 MediaStream 抽一帧并压成聊天用 JPEG base64（不含 dataURL 前缀）。 */
export async function sampleFrameFromStream(stream: MediaStream): Promise<ScreenShareFrameCapture> {
  const track = stream.getVideoTracks()[0]
  if (!track || track.readyState !== 'live') {
    throw new Error('屏幕共享已结束')
  }

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.srcObject = stream

  try {
    await video.play().catch(() => {})
    await waitVideoReady(video)
    const width = video.videoWidth
    const height = video.videoHeight
    if (width < 8 || height < 8) throw new Error('屏幕画面无效')

    const base64 = await compressChatImageToJpeg({
      source: video,
      width,
      height,
    })
    if (!base64 || base64.length < 64) throw new Error('抽帧失败')
    return { base64, mime: 'image/jpeg', width, height }
  } finally {
    video.pause()
    video.srcObject = null
    video.remove()
  }
}
