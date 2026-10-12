import { Reorder, useDragControls } from 'framer-motion'
import type { CoTEntry, CotPresetKind } from '../cotTypes'
import { CotEntryCard } from './CotEntryCard'

export function SortableCotEntry({
  entry,
  indexLabel,
  onChange,
  onDelete,
  presetKind = 'thinkingChain',
}: {
  entry: CoTEntry
  indexLabel: number
  onChange: (next: CoTEntry) => void
  onDelete: () => void
  presetKind?: CotPresetKind
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={entry}
      dragListener={false}
      dragControls={controls}
      className="list-none"
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 12px 28px rgba(45,42,38,0.12)',
        zIndex: 20,
      }}
    >
      <CotEntryCard
        entry={entry}
        indexLabel={indexLabel}
        dragEnabled
        onDragHandlePointerDown={(e) => controls.start(e)}
        onChange={onChange}
        onDelete={onDelete}
        presetKind={presetKind}
      />
    </Reorder.Item>
  )
}
