import { useMemo } from 'react'

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 25 // modules (Version-like)

function inFinder(r: number, c: number) {
  const zones = [
    [0, 0],
    [0, SIZE - 7],
    [SIZE - 7, 0],
  ]
  for (const [br, bc] of zones) {
    if (r >= br && r < br + 7 && c >= bc && c < bc + 7) return true
  }
  return false
}

function finderModule(r: number, c: number): boolean | null {
  const zones = [
    [0, 0],
    [0, SIZE - 7],
    [SIZE - 7, 0],
  ]
  for (const [br, bc] of zones) {
    if (r < br || r >= br + 7 || c < bc || c >= bc + 7) continue
    const lr = r - br
    const lc = c - bc
    const edge = lr === 0 || lr === 6 || lc === 0 || lc === 6
    const core = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4
    return edge || core
  }
  return null
}

function buildMatrix(seedKey: string): boolean[][] {
  const rnd = mulberry32(hashSeed(`qr-v1:${seedKey}`))
  const grid: boolean[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false))

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const f = finderModule(r, c)
      if (f !== null) {
        grid[r]![c] = f
        continue
      }
      // timing patterns
      if (r === 6 || c === 6) {
        grid[r]![c] = (r + c) % 2 === 0
        continue
      }
      // alignment-ish center blob for uniqueness
      if (r >= 10 && r <= 14 && c >= 10 && c <= 14) {
        const lr = r - 10
        const lc = c - 10
        const edge = lr === 0 || lr === 4 || lc === 0 || lc === 4
        const core = lr === 2 && lc === 2
        grid[r]![c] = edge || core
        continue
      }
      if (inFinder(r, c)) continue
      grid[r]![c] = rnd() > 0.48
    }
  }
  return grid
}

export function resolveIdentityQrMeta(seedKey: string) {
  const seed = hashSeed(`qr-v1:${seedKey}`)
  const code = (seed >>> 0).toString(16).toUpperCase().slice(0, 6)
  return { code, label: '身份码' }
}

export function UniqueIdentityQrSvg({
  seedKey,
  className,
  ink = '#141414',
  bg = '#FFFFFF',
  opacity = 1,
  withQuietZone = true,
}: {
  seedKey: string
  className?: string
  ink?: string
  bg?: string
  opacity?: number
  withQuietZone?: boolean
}) {
  const matrix = useMemo(() => buildMatrix(seedKey), [seedKey])
  const pad = withQuietZone ? 2 : 0
  const vb = SIZE + pad * 2

  return (
    <svg
      className={className}
      viewBox={`0 0 ${vb} ${vb}`}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ opacity }}
    >
      <rect width={vb} height={vb} fill={bg} rx={withQuietZone ? 1.2 : 0} />
      {matrix.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c + pad}
              y={r + pad}
              width={1}
              height={1}
              fill={ink}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

export function UniqueIdentityQrMark({ seedKey }: { seedKey: string }) {
  const meta = resolveIdentityQrMeta(seedKey)
  return (
    <div
      className="h-10 w-10 shrink-0 overflow-hidden rounded-[4px]"
      style={{ border: '1px solid rgba(16,16,18,0.12)', background: '#fff' }}
      aria-hidden
      title={`${meta.label} · ${meta.code}`}
    >
      <UniqueIdentityQrSvg seedKey={seedKey} className="h-full w-full" />
    </div>
  )
}

export function UniqueIdentityQrWatermark({ seedKey }: { seedKey: string }) {
  return (
    <UniqueIdentityQrSvg
      seedKey={seedKey}
      className="h-full w-full"
      ink="rgba(16,16,18,0.5)"
      bg="transparent"
      withQuietZone={false}
    />
  )
}
