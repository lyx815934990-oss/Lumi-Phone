import { Check, DoorOpen, RectangleHorizontal, X } from 'lucide-react'
import { Pressable } from '../../../components/Pressable'
import { OPENING_STYLES } from '../defaults'
import { HOME_BUILD } from '../theme'
import { useHomeBuildStore } from '../store'
import type { DoorWindowKind } from '../types'

type Props = {
  wallId: string
  t: number
  onClose: () => void
}

export function OpeningPicker({ wallId, t, onClose }: Props) {
  const addOpening = useHomeBuildStore((s) => s.addOpening)
  const save = useHomeBuildStore((s) => s.save)

  const place = (kind: DoorWindowKind, styleId: string, width: number) => {
    addOpening({ wallId, kind, t, width, styleId })
    save()
    onClose()
  }

  return (
    <div
      className="absolute inset-x-4 bottom-24 z-30 rounded-2xl p-4"
      style={{ background: HOME_BUILD.card, border: `1px solid ${HOME_BUILD.hairline}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium">安装门窗</p>
        <Pressable className="hb-toolbar-btn" onClick={onClose}>
          <X className="size-4" />
        </Pressable>
      </div>

      <p className="mb-2 text-[11px]" style={{ color: HOME_BUILD.mist }}>
        门
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {OPENING_STYLES.door.map((s) => (
          <Pressable
            key={s.id}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]"
            style={{ background: HOME_BUILD.blueprintSoft, color: HOME_BUILD.blueprint }}
            onClick={() => place('door', s.id, s.width)}
          >
            <DoorOpen className="size-3.5" />
            {s.name}
          </Pressable>
        ))}
      </div>

      <p className="mb-2 text-[11px]" style={{ color: HOME_BUILD.mist }}>
        窗
      </p>
      <div className="flex flex-wrap gap-2">
        {OPENING_STYLES.window.map((s) => (
          <Pressable
            key={s.id}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]"
            style={{ background: HOME_BUILD.blueprintSoft, color: HOME_BUILD.blueprint }}
            onClick={() => place('window', s.id, s.width)}
          >
            <RectangleHorizontal className="size-3.5" />
            {s.name}
          </Pressable>
        ))}
      </div>
    </div>
  )
}

type WallConfirmProps = {
  onConfirm: () => void
  onCancel: () => void
  variant?: 'wall' | 'demolish'
}

export function WallConfirmBar({ onConfirm, onCancel, variant = 'wall' }: WallConfirmProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(52px+max(8px,env(safe-area-inset-bottom)))] z-40 flex justify-center px-4">
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-lg"
        style={{ background: 'rgba(30, 30, 34, 0.95)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <span className="text-[12px] text-white/70">
          {variant === 'demolish' ? '确认拆除？' : '确认画墙？'}
        </span>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: '#E5484D' }}
          onClick={onCancel}
          aria-label="取消"
        >
          <X className="size-4 text-white" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: '#2FA84F' }}
          onClick={onConfirm}
          aria-label="确认"
        >
          <Check className="size-4 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
