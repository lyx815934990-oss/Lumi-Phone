import { BEAD_PALETTE } from './palette'
import { BEAD_EMPTY, type BeadPattern } from './types'

function fromAscii(
  id: string,
  name: string,
  rows: string[],
  colorMap: Record<string, number>,
): BeadPattern {
  const height = rows.length
  const width = Math.max(...rows.map((r) => r.length))
  const cells: number[] = []
  for (let y = 0; y < height; y++) {
    const row = rows[y] ?? ''
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '.'
      cells.push(colorMap[ch] ?? BEAD_EMPTY)
    }
  }
  const used = new Set(cells.filter((c) => c >= 0))
  const palette = BEAD_PALETTE.filter((_, i) => used.has(i))
  const remap = new Map<number, number>()
  palette.forEach((_, i) => {
    const old = [...used].sort((a, b) => a - b)[i]
    if (old !== undefined) remap.set(old, i)
  })
  return {
    id,
    name,
    width,
    height,
    palette: palette.length ? [...palette] : ['#FF6B6B'],
    cells: cells.map((c) => (c >= 0 ? (remap.get(c) ?? 0) : BEAD_EMPTY)),
    source: 'builtin',
    createdAt: 0,
  }
}

const HEART = fromAscii(
  'builtin-heart',
  '小爱心',
  [
    '..rr..rr..',
    '.rrrrrrrr.',
    'rrrrrrrrrr',
    'rrrrrrrrrr',
    '.rrrrrrrr.',
    '..rrrrrr..',
    '...rrrr...',
    '....rr....',
  ],
  { r: 2, '.': BEAD_EMPTY },
)

const STAR = fromAscii(
  'builtin-star',
  '小星星',
  [
    '....y.....',
    '...yyy....',
    'yyyyyyyyyy',
    '..yyyyyy..',
    '.yyyyyyyy.',
    '...yyyy...',
    '..yyyyyy..',
    '.yy....yy.',
  ],
  { y: 3, '.': BEAD_EMPTY },
)

const CAT = fromAscii(
  'builtin-cat',
  '猫猫脸',
  [
    '..bb....bb..',
    '.bbbbbbbbbb.',
    'bbbbbbbbbbbb',
    'bbwwbbbbwwbb',
    'bbwwbbbbwwbb',
    'bbbbppppbbbb',
    'bbbppppppbbb',
    'bbbppppppbbb',
    'bbb.bbbb.bbb',
    'bb...bb...bb',
  ],
  { b: 1, w: 0, p: 2, '.': BEAD_EMPTY },
)

const CLOUD = fromAscii(
  'builtin-cloud',
  '小云朵',
  [
    '...wwww...',
    '..wwwwww..',
    '.wwwwwwww.',
    'wwwwwwwwww',
    'wwwwwwwwww',
    '..wwwwww..',
    '...wwww...',
  ],
  { w: 7, '.': BEAD_EMPTY },
)

const FLOWER = fromAscii(
  'builtin-flower',
  '小花朵',
  [
    '..pp..pp..',
    '.pppppppp.',
    '..pppppp..',
    '...yyyy...',
    '..yyyyyy..',
    '...yyyy...',
    '....gg....',
    '....gg....',
  ],
  { p: 6, y: 3, g: 4, '.': BEAD_EMPTY },
)

export const BUILTIN_BEAD_PATTERNS: BeadPattern[] = [HEART, STAR, CAT, CLOUD, FLOWER]

export function getBuiltinPattern(id: string): BeadPattern | undefined {
  return BUILTIN_BEAD_PATTERNS.find((p) => p.id === id)
}
