import { useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  Move,
  RotateCcw,
  Scaling,
  Trash2,
  Unlock,
} from 'lucide-react'
import { floorBaseY } from '../scene3dUtils'
import { useHomeBuildStore } from '../store'
import type { GizmoMode, PlacedFurniture } from '../types'
import { GhostHistoryButtons } from './GhostHistoryButtons'

function radToDeg(r: number) {
  return (r * 180) / Math.PI
}

function degToRad(d: number) {
  return (d * Math.PI) / 180
}

type PropTab = 'move' | 'turn' | 'tilt' | 'scale'

const DEFAULT_SCALE = { x: 1, y: 1, z: 1 }

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  disabled,
  onLive,
  onGestureStart,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  disabled?: boolean
  onLive: (v: number) => void
  onGestureStart: () => void
}) {
  const scrubbing = useRef(false)
  const clamped = Math.min(max, Math.max(min, value))

  return (
    <label className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] text-white/55">{label}</span>
      <input
        type="range"
        className="hb-slider hb-slider--light min-w-0 flex-1"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        onPointerDown={() => {
          if (disabled) return
          scrubbing.current = true
          onGestureStart()
        }}
        onPointerUp={() => {
          scrubbing.current = false
        }}
        onPointerCancel={() => {
          scrubbing.current = false
        }}
        onChange={(e) => onLive(Number(e.target.value))}
      />
      <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-white/70">
        {format(clamped)}
      </span>
    </label>
  )
}

const TABS: { id: PropTab; label: string; gizmo: GizmoMode; icon: typeof Move }[] = [
  { id: 'move', label: '位置', gizmo: 'move', icon: Move },
  { id: 'turn', label: '转向', gizmo: 'rotate', icon: RotateCcw },
  { id: 'tilt', label: '倾斜', gizmo: 'rotate', icon: RotateCcw },
  { id: 'scale', label: '缩放', gizmo: 'scale', icon: Scaling },
]

const TAB_RESET_LABEL: Record<PropTab, string> = {
  move: '重置位置',
  turn: '重置转向',
  tilt: '重置倾斜',
  scale: '重置缩放',
}

export function FurniturePropPanel() {
  const mode = useHomeBuildStore((s) => s.mode)
  const draft = useHomeBuildStore((s) => s.draft)
  const selectedFurnitureId = useHomeBuildStore((s) => s.selectedFurnitureId)
  const catalogOpen = useHomeBuildStore((s) => s.catalogOpen)
  const setGizmoMode = useHomeBuildStore((s) => s.setGizmoMode)
  const updateFurniture = useHomeBuildStore((s) => s.updateFurniture)
  const pushHistory = useHomeBuildStore((s) => s.pushHistory)
  const duplicateFurniture = useHomeBuildStore((s) => s.duplicateFurniture)
  const deleteFurniture = useHomeBuildStore((s) => s.deleteFurniture)
  const toggleFurnitureLock = useHomeBuildStore((s) => s.toggleFurnitureLock)
  const selectFurniture = useHomeBuildStore((s) => s.selectFurniture)

  const [tab, setTab] = useState<PropTab>('move')
  const [collapsed, setCollapsed] = useState(false)

  if (mode !== 'ghost' || !selectedFurnitureId) return null
  // 目录展开时让出画面，避免叠两层底栏
  if (catalogOpen) return null

  const item = draft.furniture.find((f) => f.id === selectedFurnitureId)
  if (!item) return null

  const locked = !!item.locked
  const floorId = item.floorId ?? draft.activeFloorId
  const defaultFeetY = floorBaseY(draft, floorId)

  const patchPosition = (axis: 'x' | 'y' | 'z', v: number) => {
    const id = item.id
    const latest = useHomeBuildStore.getState().draft.furniture.find((f) => f.id === id)
    if (!latest) return
    updateFurniture(id, { position: { ...latest.position, [axis]: v } })
  }

  const patchRotationDeg = (axis: 'x' | 'y' | 'z', deg: number) => {
    const id = item.id
    const latest = useHomeBuildStore.getState().draft.furniture.find((f) => f.id === id)
    if (!latest) return
    updateFurniture(id, { rotation: { ...latest.rotation, [axis]: degToRad(deg) } })
  }

  const patchScale = (axis: 'x' | 'y' | 'z', v: number) => {
    const id = item.id
    const latest = useHomeBuildStore.getState().draft.furniture.find((f) => f.id === id)
    if (!latest) return
    updateFurniture(id, { scale: { ...latest.scale, [axis]: Math.max(0.05, v) } })
  }

  const patchUniformScale = (v: number) => {
    const id = item.id
    const latest = useHomeBuildStore.getState().draft.furniture.find((f) => f.id === id)
    if (!latest) return
    const s = Math.max(0.05, v)
    updateFurniture(id, { scale: { x: s, y: s, z: s } })
  }

  const resetTab = (which: PropTab) => {
    if (locked) return
    const id = item.id
    const latest = useHomeBuildStore.getState().draft.furniture.find((f) => f.id === id)
    if (!latest) return
    pushHistory()
    if (which === 'move') {
      // 贴回所属楼层地面，水平位置保留
      updateFurniture(id, {
        position: { ...latest.position, y: floorBaseY(useHomeBuildStore.getState().draft, floorId) },
      })
      return
    }
    if (which === 'turn') {
      updateFurniture(id, { rotation: { ...latest.rotation, y: 0 } })
      return
    }
    if (which === 'tilt') {
      updateFurniture(id, { rotation: { ...latest.rotation, x: 0, z: 0 } })
      return
    }
    updateFurniture(id, { scale: { ...DEFAULT_SCALE } })
  }

  const resetAll = () => {
    if (locked) return
    const id = item.id
    const latest = useHomeBuildStore.getState().draft.furniture.find((f) => f.id === id)
    if (!latest) return
    pushHistory()
    const patch: Partial<PlacedFurniture> = {
      position: { ...latest.position, y: floorBaseY(useHomeBuildStore.getState().draft, floorId) },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { ...DEFAULT_SCALE },
    }
    updateFurniture(id, patch)
  }

  const selectTab = (next: PropTab) => {
    setTab(next)
    setCollapsed(false)
    const meta = TABS.find((t) => t.id === next)
    if (meta) setGizmoMode(meta.gizmo)
  }

  if (collapsed) {
    return (
      <div className="pointer-events-auto absolute bottom-[max(72px,calc(env(safe-area-inset-bottom)+58px))] left-1/2 z-30 -translate-x-1/2">
        <button
          type="button"
          className="hb-prop-chip flex max-w-[70vw] items-center gap-2 rounded-full px-3 py-2"
          onClick={() => setCollapsed(false)}
        >
          <span className="truncate text-[11px] text-white/90">{item.name}</span>
          <ChevronUp className="size-3.5 shrink-0 text-white/55" />
        </button>
      </div>
    )
  }

  return (
    <div className="hb-prop-dock pointer-events-auto absolute bottom-[max(72px,calc(env(safe-area-inset-bottom)+58px))] left-1/2 z-30 w-[min(calc(100vw-1.25rem),360px)] -translate-x-1/2 text-white">
      <div className="mb-1.5 flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/90">{item.name}</span>
        <GhostHistoryButtons variant="dock" />
        <button
          type="button"
          className="rounded-md p-1.5 text-white/55 hover:bg-white/10 disabled:opacity-35"
          title="重置全部参数"
          disabled={locked}
          onClick={resetAll}
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/55 hover:bg-white/10"
          title={item.locked ? '解锁' : '锁定'}
          onClick={() => toggleFurnitureLock(item.id)}
        >
          {item.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/55 hover:bg-white/10"
          title="复制"
          onClick={() => duplicateFurniture(item.id)}
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-[#ff8a8a] hover:bg-white/10"
          title="删除"
          onClick={() => deleteFurniture(item.id)}
        >
          <Trash2 className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/55 hover:bg-white/10"
          title="收起"
          onClick={() => setCollapsed(true)}
        >
          <ChevronDown className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md px-1.5 py-1 text-[10px] text-white/45 hover:bg-white/10"
          onClick={() => selectFurniture(null)}
        >
          完成
        </button>
      </div>

      <div className="mb-2 flex gap-1">
        {TABS.map((b) => (
          <button
            key={b.id}
            type="button"
            className="flex flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px]"
            style={{
              background: tab === b.id ? 'rgba(44,111,173,0.45)' : 'rgba(255,255,255,0.06)',
              color: tab === b.id ? '#dff0ff' : 'rgba(255,255,255,0.55)',
            }}
            onClick={() => selectTab(b.id)}
          >
            <b.icon className="size-3" />
            {b.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {tab === 'move' ? (
          <>
            <SliderField
              label="左右"
              value={item.position.x}
              min={-4}
              max={20}
              step={0.05}
              format={(v) => v.toFixed(1)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchPosition('x', v)}
            />
            <SliderField
              label="前后"
              value={item.position.z}
              min={-4}
              max={20}
              step={0.05}
              format={(v) => v.toFixed(1)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchPosition('z', v)}
            />
            <SliderField
              label="高度"
              value={item.position.y}
              min={0}
              max={12}
              step={0.05}
              format={(v) => v.toFixed(1)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchPosition('y', v)}
            />
          </>
        ) : null}

        {tab === 'turn' ? (
          <SliderField
            label="水平"
            value={radToDeg(item.rotation.y)}
            min={-180}
            max={180}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            disabled={locked}
            onGestureStart={() => pushHistory()}
            onLive={(v) => patchRotationDeg('y', v)}
          />
        ) : null}

        {tab === 'tilt' ? (
          <>
            <SliderField
              label="前后"
              value={radToDeg(item.rotation.x)}
              min={-60}
              max={60}
              step={1}
              format={(v) => `${Math.round(v)}°`}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchRotationDeg('x', v)}
            />
            <SliderField
              label="左右"
              value={radToDeg(item.rotation.z)}
              min={-60}
              max={60}
              step={1}
              format={(v) => `${Math.round(v)}°`}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchRotationDeg('z', v)}
            />
            <p className="text-[9px] text-white/35">正数：后仰 / 右倾 · 负数：前俯 / 左倾</p>
          </>
        ) : null}

        {tab === 'scale' ? (
          <>
            <SliderField
              label="整体"
              value={(item.scale.x + item.scale.y + item.scale.z) / 3}
              min={0.05}
              max={3}
              step={0.01}
              format={(v) => v.toFixed(2)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={patchUniformScale}
            />
            <SliderField
              label="宽"
              value={item.scale.x}
              min={0.05}
              max={3}
              step={0.01}
              format={(v) => v.toFixed(2)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchScale('x', v)}
            />
            <SliderField
              label="高"
              value={item.scale.y}
              min={0.05}
              max={3}
              step={0.01}
              format={(v) => v.toFixed(2)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchScale('y', v)}
            />
            <SliderField
              label="深"
              value={item.scale.z}
              min={0.05}
              max={3}
              step={0.01}
              format={(v) => v.toFixed(2)}
              disabled={locked}
              onGestureStart={() => pushHistory()}
              onLive={(v) => patchScale('z', v)}
            />
          </>
        ) : null}

        <button
          type="button"
          className="mt-0.5 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] text-sky-200/80 hover:bg-white/8 disabled:opacity-35"
          disabled={locked}
          onClick={() => resetTab(tab)}
        >
          <RotateCcw className="size-3" />
          {TAB_RESET_LABEL[tab]}
          {tab === 'move' ? (
            <span className="text-white/35">· 贴回地面 {defaultFeetY.toFixed(1)}m</span>
          ) : null}
        </button>
      </div>
    </div>
  )
}
