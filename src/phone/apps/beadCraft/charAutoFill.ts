import { BEAD_EMPTY, type CharBeadPersonality } from './types'

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getCharBeadPersonality(characterId: string): CharBeadPersonality {
  const h = hashString(characterId || 'default')
  return {
    baseIntervalMs: 700 + (h % 1800),
    jitterMs: 200 + (h % 600),
    burstChance: 0.08 + (h % 12) / 100,
    burstSize: 1 + (h % 2),
  }
}

export function pickNextCharCell(target: number[], filled: number[]): number | null {
  const candidates: number[] = []
  for (let i = 0; i < target.length; i++) {
    if (target[i]! >= 0 && filled[i] === BEAD_EMPTY) candidates.push(i)
  }
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

export function getNextFillDelay(personality: CharBeadPersonality): number {
  const jitter = (Math.random() * 2 - 1) * personality.jitterMs
  return Math.max(320, personality.baseIntervalMs + jitter)
}

export function countRemaining(target: number[], filled: number[]): number {
  let n = 0
  for (let i = 0; i < target.length; i++) {
    if (target[i]! >= 0 && filled[i] === BEAD_EMPTY) n++
  }
  return n
}

export function countFilled(target: number[], filled: number[]): { done: number; total: number } {
  let total = 0
  let done = 0
  for (let i = 0; i < target.length; i++) {
    if (target[i]! >= 0) {
      total++
      if (filled[i]! >= 0) done++
    }
  }
  return { done, total }
}

export const CHAR_FILL_LINES = [
  '我来填这一格～',
  '这个位置交给我！',
  '我们一起加油',
  '快完成了呢',
  '这颜色真好看',
  '你填得比我快欸',
  '等等我嘛',
  '嘿嘿，我找到了',
]

export function pickCharFillLine(): string {
  return CHAR_FILL_LINES[Math.floor(Math.random() * CHAR_FILL_LINES.length)]!
}
