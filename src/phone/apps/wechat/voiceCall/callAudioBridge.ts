/**
 * 通话音频桥：在用户手势里解锁，后续接通开场白才能自动播。
 * 浏览器（尤其 iOS）会拦截非手势触发的 audio.play()。
 */

const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='

let sharedAudio: HTMLAudioElement | null = null
let unlocked = false

function ensureAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio()
    sharedAudio.preload = 'auto'
    sharedAudio.setAttribute('playsinline', 'true')
    sharedAudio.setAttribute('webkit-playsinline', 'true')
  }
  return sharedAudio
}

function isPlayingRealAudio(audio: HTMLAudioElement): boolean {
  const src = String(audio.src || '')
  if (!src || src.startsWith('data:')) return false
  return !audio.paused && !audio.ended
}

/** 必须在用户点击拨打 / 接听时调用；若已在播真实语音则不打断 */
export function unlockVoiceCallAudio(): void {
  try {
    const audio = ensureAudio()
    // 挂起通话页时父组件常重渲染；切勿用静音片覆盖正在播的语音条
    if (unlocked && isPlayingRealAudio(audio)) return

    const prevSrc = audio.src
    const resumeUrl =
      prevSrc && !prevSrc.startsWith('data:') && !audio.ended ? prevSrc : ''
    const resumeAt = resumeUrl ? audio.currentTime : 0

    audio.volume = 0.01
    audio.src = SILENT_WAV
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      void p
        .then(() => {
          try {
            audio.pause()
            audio.currentTime = 0
          } catch {
            /* ignore */
          }
          unlocked = true
          // 若解锁前正在播真实音频，恢复之（避免被静音片顶掉后无法续播）
          if (resumeUrl) {
            audio.volume = 1
            audio.src = resumeUrl
            try {
              audio.currentTime = resumeAt
            } catch {
              /* ignore */
            }
            void audio.play().catch(() => {
              /* ignore */
            })
          }
        })
        .catch(() => {
          tryUnlockViaAudioContext()
        })
    } else {
      unlocked = true
    }
  } catch {
    tryUnlockViaAudioContext()
  }
}

function tryUnlockViaAudioContext(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    void ctx.resume().then(() => {
      unlocked = true
      try {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        gain.gain.value = 0.0001
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.01)
      } catch {
        /* ignore */
      }
    })
  } catch {
    /* ignore */
  }
}

export function isVoiceCallAudioUnlocked(): boolean {
  return unlocked
}

export function playVoiceCallUrl(
  url: string,
  handlers?: {
    onPlay?: () => void
    onEnded?: () => void
    onError?: () => void
  },
): HTMLAudioElement {
  const audio = ensureAudio()
  try {
    audio.pause()
  } catch {
    /* ignore */
  }
  audio.onplay = () => handlers?.onPlay?.()
  audio.onended = () => handlers?.onEnded?.()
  audio.onerror = () => handlers?.onError?.()
  audio.volume = 1
  audio.src = url
  void audio
    .play()
    .then(() => {
      unlocked = true
    })
    .catch(() => {
      handlers?.onError?.()
    })
  return audio
}

export function stopVoiceCallAudio(): void {
  const audio = sharedAudio
  if (!audio) return
  try {
    audio.onplay = null
    audio.onended = null
    audio.onerror = null
    audio.pause()
  } catch {
    /* ignore */
  }
}
