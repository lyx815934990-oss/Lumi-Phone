import { useRef } from 'react'
import type { Character, PlayerIdentity } from '../types'
import { metaAge, metaGender, metaMbti, metaZodiac } from './personaRosterDisplay'
import {
  PERSONA_BOX_COLORS as BOX,
  PersonaBoxCardFace,
  type BoxDrawPhase,
  type PersonaBoxCardKind,
} from './PersonaCollectibleBox'

const INERTIA_FRICTION = 0.955
const INERTIA_MIN = 0.02
const VELOCITY_SMOOTH = 0.65

type DragGesture = {
  active: boolean
  lastX: number
  lastY: number
  lastT: number
  vx: number
  vy: number
  raf: number
}

function stopInertia(g: DragGesture) {
  if (g.raf) {
    cancelAnimationFrame(g.raf)
    g.raf = 0
  }
}

function startInertia(
  g: DragGesture,
  setRotX: (n: number | ((p: number) => number)) => void,
  setRotY: (n: number | ((p: number) => number)) => void,
) {
  stopInertia(g)
  let vx = g.vx
  let vy = g.vy
  if (Math.hypot(vx, vy) < INERTIA_MIN) return
  const tick = () => {
    vx *= INERTIA_FRICTION
    vy *= INERTIA_FRICTION
    if (Math.hypot(vx, vy) < INERTIA_MIN) {
      g.raf = 0
      g.vx = 0
      g.vy = 0
      return
    }
    setRotY((y) => y + vx * 16)
    setRotX((x) => Math.max(-68, Math.min(68, x + vy * 16)))
    g.raf = requestAnimationFrame(tick)
  }
  g.raf = requestAnimationFrame(tick)
}

export function PersonaBoxCenterStage({
  character,
  variant,
  boxNo,
  phase,
  fadeIn,
  rotX,
  rotY,
  setRotX,
  setRotY,
  identityList,
  identityNameById,
  mainNameById,
  onClose,
  onEdit,
  onUploadAvatar,
  onResetAngle,
  cardKind = 'solo',
}: {
  character: Character
  variant: 'main' | 'npc'
  boxNo: string
  phase: Extract<BoxDrawPhase, 'fly' | 'ready'>
  fadeIn: boolean
  rotX: number
  rotY: number
  setRotX: (n: number | ((p: number) => number)) => void
  setRotY: (n: number | ((p: number) => number)) => void
  identityList: PlayerIdentity[]
  identityNameById: Record<string, string>
  mainNameById: Record<string, string>
  onClose: () => void
  onEdit: () => void
  onUploadAvatar: () => void
  onResetAngle: () => void
  cardKind?: PersonaBoxCardKind
}) {
  const ready = phase === 'ready'
  const visible = ready || fadeIn
  const gesture = useRef<DragGesture>({
    active: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    vx: 0,
    vy: 0,
    raf: 0,
  }).current

  const cardW = 220
  const cardH = cardW * 1.4

  return (
    <div
      className="fixed inset-0 z-[1100] flex flex-col items-center justify-center"
      style={{
        background: visible ? 'rgba(42,38,34,0.28)' : 'rgba(42,38,34,0)',
        transition: 'background 0.4s ease',
        pointerEvents: ready ? 'auto' : 'none',
      }}
    >
      <div className="relative" style={{ width: cardW, height: cardH, perspective: 1200 }}>
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: cardW,
            height: cardH,
            marginLeft: -cardW / 2,
            marginTop: -cardH / 2,
            transformStyle: 'preserve-3d',
            transform: ready
              ? `rotateX(${rotX}deg) rotateY(${rotY}deg)`
              : 'rotateX(0deg) rotateY(0deg)',
            opacity: visible ? 1 : 0,
            transition: ready ? 'none' : 'opacity 0.45s ease',
            cursor: ready ? 'grab' : 'default',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onPointerDown={(e) => {
            if (!ready) return
            stopInertia(gesture)
            gesture.active = true
            gesture.lastX = e.clientX
            gesture.lastY = e.clientY
            gesture.lastT = performance.now()
            gesture.vx = 0
            gesture.vy = 0
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!ready || !gesture.active) return
            const now = performance.now()
            const dt = Math.max(8, now - gesture.lastT)
            const dx = e.clientX - gesture.lastX
            const dy = e.clientY - gesture.lastY
            gesture.lastX = e.clientX
            gesture.lastY = e.clientY
            gesture.lastT = now
            const instVx = (dx * 0.55) / dt
            const instVy = (-dy * 0.45) / dt
            gesture.vx = gesture.vx * (1 - VELOCITY_SMOOTH) + instVx * VELOCITY_SMOOTH
            gesture.vy = gesture.vy * (1 - VELOCITY_SMOOTH) + instVy * VELOCITY_SMOOTH
            setRotY((y) => y + dx * 0.55)
            setRotX((x) => Math.max(-68, Math.min(68, x - dy * 0.45)))
          }}
          onPointerUp={(e) => {
            if (!gesture.active) return
            gesture.active = false
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            startInertia(gesture, setRotX, setRotY)
          }}
          onPointerCancel={() => {
            if (!gesture.active) return
            gesture.active = false
            startInertia(gesture, setRotX, setRotY)
          }}
        >
          <div className="relative size-full" style={{ transformStyle: 'preserve-3d' }}>
            <PersonaBoxCardFace
              character={character}
              variant={variant}
              identityList={identityList}
              identityNameById={identityNameById}
              mainNameById={mainNameById}
              boxNo={boxNo}
              cardKind={cardKind}
            />
            <div
              className="absolute inset-0"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                borderRadius: 14,
                border: `2px solid ${BOX.foil}`,
                background: BOX.elevated,
                padding: 3,
                boxSizing: 'border-box',
              }}
            >
              <div
                className="flex h-full flex-col rounded-[11px] p-4"
                style={{ border: `1px solid ${BOX.lineSoft}`, background: BOX.surface }}
              >
                <p
                  className="font-mono text-[10px] tracking-[0.14em]"
                  style={{ color: BOX.tab }}
                >
                  CARD BACK · DATA
                </p>
                <div className="mt-3 space-y-0">
                  {(
                    [
                      ['性别', metaGender(character)],
                      ['年龄', metaAge(character)],
                      ['人格', metaMbti(character)],
                      ['星座', metaZodiac(character)],
                      [
                        '档案',
                        cardKind === 'ensemble'
                          ? '多人卡'
                          : variant === 'main'
                            ? '主角'
                            : 'NPC',
                      ],
                    ] as const
                  ).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between border-b py-2 text-[13px]"
                      style={{ borderColor: BOX.lineSoft }}
                    >
                      <span style={{ color: BOX.faint }}>{k}</span>
                      <span className="font-medium" style={{ color: BOX.ink }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {ready ? (
        <div className="absolute inset-x-0 bottom-[22%] flex flex-col items-center gap-2 px-4">
          <p className="text-[11px] text-white/85">已居中 · 拖动旋转（松手有惯性）</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StageBtn onClick={onResetAngle}>复位</StageBtn>
            {cardKind === 'solo' ? <StageBtn onClick={onUploadAvatar}>换头像</StageBtn> : null}
            <StageBtn onClick={onClose}>收回盒子</StageBtn>
            <StageBtn primary onClick={onEdit}>
              {cardKind === 'ensemble' ? '打开演出卡' : '编辑人设'}
            </StageBtn>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StageBtn({
  children,
  onClick,
  primary,
}: {
  children: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-[13px] font-medium active:scale-[0.98] ${
        primary ? 'bg-[#111827] text-white' : 'bg-white/95 text-[#111827]'
      }`}
    >
      {children}
    </button>
  )
}

