/** Web Speech API 朗读（日语优先，其次英语） */
export function speakWord(text: string, langHint: 'ja' | 'en' | 'auto' = 'auto'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) return
  const sample = text.trim()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(sample)
  const hasKanaOrKanji = /[\u3040-\u30ff\u3400-\u9fff]/.test(sample)
  if (langHint === 'ja' || (langHint === 'auto' && hasKanaOrKanji)) {
    u.lang = 'ja-JP'
  } else {
    u.lang = 'en-US'
  }
  u.rate = 0.92
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}
