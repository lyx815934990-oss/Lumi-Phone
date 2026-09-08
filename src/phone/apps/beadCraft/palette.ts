/** 常用拼豆色板（24 色） */
export const BEAD_PALETTE = [
  '#FFFFFF',
  '#1A1A1A',
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#FF9FF3',
  '#E8E8E8',
  '#8B8B8F',
  '#C9A66B',
  '#FFB3C6',
  '#A7E8DB',
  '#FF8C42',
  '#9B59B6',
  '#2ECC71',
  '#3498DB',
  '#E74C3C',
  '#F39C12',
  '#1ABC9C',
  '#D35400',
  '#7F8C8D',
  '#FAD7A0',
  '#AED6F1',
  '#F5B7B1',
] as const

export function nearestPaletteIndex(hex: string, palette: readonly string[] = BEAD_PALETTE): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  palette.forEach((color, index) => {
    const c = hexToRgb(color)
    if (!c) return
    const dist =
      (rgb.r - c.r) ** 2 + (rgb.g - c.g) ** 2 + (rgb.b - c.b) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  })
  return best
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace('#', '').trim()
  if (raw.length === 3) {
    return {
      r: parseInt(raw[0]! + raw[0], 16),
      g: parseInt(raw[1]! + raw[1], 16),
      b: parseInt(raw[2]! + raw[2], 16),
    }
  }
  if (raw.length !== 6) return null
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}
