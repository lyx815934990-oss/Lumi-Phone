import { Box, ChevronLeft, Eye, Layers, Redo2, RotateCcw, Save, Undo2, UserRound } from 'lucide-react'
import { HOME_BUILD } from '../theme'
import { useHomeBuildStore } from '../store'
import type { HomeBuildMode } from '../types'

type Props = {
  onBack: () => void
  onSave: () => void
  onReset?: () => void
  toast?: string
  onModeChange?: (mode: HomeBuildMode) => void
}

const MODES: { id: HomeBuildMode; label: string; icon: typeof Layers }[] = [
  { id: 'floorplan', label: '户型', icon: Layers },
  { id: 'ghost', label: '摆放', icon: Box },
  { id: 'avatar', label: '人物', icon: UserRound },
  { id: 'walk', label: '漫游', icon: Eye },
]

export function TopToolbar({ onBack, onSave, onReset, toast, onModeChange }: Props) {
  const mode = useHomeBuildStore((s) => s.mode)
  const setMode = useHomeBuildStore((s) => s.setMode)
  const undo = useHomeBuildStore((s) => s.undo)
  const redo = useHomeBuildStore((s) => s.redo)
  const draft = useHomeBuildStore((s) => s.draft)
  const setActiveFloor = useHomeBuildStore((s) => s.setActiveFloor)
  const addFloor = useHomeBuildStore((s) => s.addFloor)

  return (
    <header
      className="pointer-events-auto relative z-50 flex shrink-0 items-center gap-2 px-3 py-2"
      style={{
        background: HOME_BUILD.card,
        borderBottom: `1px solid ${HOME_BUILD.hairline}`,
        paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
      }}
    >
      <button type="button" className="hb-toolbar-btn" onClick={onBack} aria-label="返回">
        <ChevronLeft className="size-5" strokeWidth={1.75} />
      </button>

      <div className="hb-mode-seg mx-auto flex-1 justify-center">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="hb-mode-btn"
            data-active={mode === m.id}
            onClick={() => (onModeChange ? onModeChange(m.id) : setMode(m.id))}
          >
            <m.icon className="size-3.5" strokeWidth={1.75} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" className="hb-toolbar-btn" onClick={undo} aria-label="撤销">
          <Undo2 className="size-4" strokeWidth={1.75} />
        </button>
        <button type="button" className="hb-toolbar-btn" onClick={redo} aria-label="重做">
          <Redo2 className="size-4" strokeWidth={1.75} />
        </button>

        <div className="hb-floor-stack ml-1">
          {draft.floors.map((f) => (
            <button
              key={f.id}
              type="button"
              className="hb-floor-btn"
              data-active={draft.activeFloorId === f.id}
              onClick={() => setActiveFloor(f.id)}
            >
              {f.label}
            </button>
          ))}
          <button type="button" className="hb-floor-btn text-[10px]" onClick={addFloor} title="新建楼层">
            +
          </button>
        </div>

        {onReset ? (
          <button
            type="button"
            className="hb-toolbar-btn"
            onClick={onReset}
            aria-label="重置小窝"
            title="重置小窝"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}

        <button type="button" className="hb-toolbar-btn" onClick={onSave} aria-label="保存">
          <Save className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {toast ? (
        <div
          className="pointer-events-none absolute inset-x-0 -bottom-8 text-center text-[11px]"
          style={{ color: HOME_BUILD.blueprint }}
        >
          {toast}
        </div>
      ) : null}
    </header>
  )
}
