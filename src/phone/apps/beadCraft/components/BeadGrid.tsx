import { BEAD_EMPTY } from '../types'

export function PatternPreview({
  width,
  height,
  palette,
  cells,
  maxSize = 72,
  className = '',
}: {
  width: number
  height: number
  palette: string[]
  cells: number[]
  maxSize?: number
  className?: string
}) {
  const cellPx = Math.max(3, Math.floor(maxSize / Math.max(width, height)))
  return (
    <div
      className={`bc-pattern-preview ${className}`}
      style={{
        gridTemplateColumns: `repeat(${width}, ${cellPx}px)`,
        width: width * cellPx + Math.max(0, width - 1),
      }}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          className="bc-pattern-preview-cell"
          style={{
            width: cellPx,
            height: cellPx,
            background: cell >= 0 ? palette[cell] : 'transparent',
          }}
        />
      ))}
    </div>
  )
}

export function BeadGrid({
  width,
  height: _height,
  palette,
  target,
  filled,
  owners,
  onCellTap,
  disabled = false,
}: {
  width: number
  height: number
  palette: string[]
  target: number[]
  filled: number[]
  owners: ('user' | 'char' | null)[]
  onCellTap?: (index: number) => void
  disabled?: boolean
}) {
  return (
    <div
      className="inline-grid gap-[2px] rounded-2xl bg-black/[0.04] p-2"
      style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
    >
      {target.map((colorIndex, i) => {
        const isEmpty = colorIndex < 0
        const filledColor = filled[i]
        const owner = owners[i]
        const displayColor = filledColor! >= 0 ? palette[filledColor!] : undefined
        const canTap = !disabled && !isEmpty && filledColor === BEAD_EMPTY

        return (
          <button
            key={i}
            type="button"
            disabled={!canTap}
            onClick={() => canTap && onCellTap?.(i)}
            className={[
              'bc-bead-cell aspect-square min-w-[14px] max-w-[22px] w-full',
              isEmpty ? 'opacity-0 pointer-events-none' : '',
              filledColor === BEAD_EMPTY ? 'bc-bead-cell--empty' : '',
              owner === 'user' ? 'bc-bead-cell--user' : '',
              owner === 'char' ? 'bc-bead-cell--char' : '',
            ].join(' ')}
            style={{
              background: displayColor ?? 'rgba(255,255,255,0.5)',
            }}
            aria-label={isEmpty ? undefined : `格子 ${i + 1}`}
          />
        )
      })}
    </div>
  )
}
