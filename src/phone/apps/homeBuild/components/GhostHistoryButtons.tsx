import { Redo2, Undo2 } from 'lucide-react'
import { useHomeBuildStore } from '../store'

type Props = {
  /** 贴在属性条内时用紧凑图标；独立浮层时用胶囊 */
  variant?: 'dock' | 'float'
}

export function GhostHistoryButtons({ variant = 'float' }: Props) {
  const undo = useHomeBuildStore((s) => s.undo)
  const redo = useHomeBuildStore((s) => s.redo)
  const canUndo = useHomeBuildStore((s) => s.undoStack.length > 0)
  const canRedo = useHomeBuildStore((s) => s.redoStack.length > 0)
  const selectedFurnitureId = useHomeBuildStore((s) => s.selectedFurnitureId)
  const catalogOpen = useHomeBuildStore((s) => s.catalogOpen)

  if (variant === 'dock') {
    return (
      <>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/55 hover:bg-white/10 disabled:opacity-30"
          title="撤回"
          disabled={!canUndo}
          onClick={() => undo()}
        >
          <Undo2 className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/55 hover:bg-white/10 disabled:opacity-30"
          title="重做"
          disabled={!canRedo}
          onClick={() => redo()}
        >
          <Redo2 className="size-3.5" />
        </button>
      </>
    )
  }

  // 编辑物件时属性条已有撤回/重做；目录展开时也避开底栏
  if (selectedFurnitureId || catalogOpen) return null

  return (
    <div className="pointer-events-auto absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-3 z-30 flex gap-1.5">
      <button
        type="button"
        className="hb-ghost-history-btn"
        title="撤回"
        disabled={!canUndo}
        onClick={() => undo()}
        aria-label="撤回"
      >
        <Undo2 className="size-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        className="hb-ghost-history-btn"
        title="重做"
        disabled={!canRedo}
        onClick={() => redo()}
        aria-label="重做"
      >
        <Redo2 className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}
