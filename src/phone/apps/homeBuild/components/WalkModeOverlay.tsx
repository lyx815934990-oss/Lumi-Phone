import { useEffect, useRef, useState } from 'react'
import { Eye, Gauge, Settings2 } from 'lucide-react'
import {
  addWalkLook,
  applyWalkSettings,
  getWalkLookSensitivity,
  requestWalkJump,
  resetWalkInput,
  setWalkFov,
  setWalkJumpHeight,
  setWalkLookSensitivity,
  setWalkMove,
  setWalkSpeed,
  WALK_FOV_MAX,
  WALK_FOV_MIN,
  WALK_JUMP_HEIGHT_MAX,
  WALK_JUMP_HEIGHT_MIN,
  WALK_SPEED_MAX,
  WALK_SPEED_MIN,
} from '../walkInput'
import {
  loadWalkSettings,
  lookSensitivityFromPercent,
  lookSensitivityToPercent,
  saveWalkSettings,
} from '../walkSettings'

const JOY_RADIUS = 52
/** 右侧轻点判定：位移与时长小于此视为小跳，否则为转视角 */
const LOOK_TAP_MAX_MOVE_PX = 14
const LOOK_TAP_MAX_MS = 280

type FloatingMoveJoy = {
  originX: number
  originY: number
  knobX: number
  knobY: number
  pointerId: number
}

type LookGesture = {
  pointerId: number
  lastX: number
  lastY: number
  startX: number
  startY: number
  startTime: number
  moved: number
}

function clampKnob(dx: number, dy: number) {
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return { px: 0, py: 0, moveX: 0, moveZ: 0 }
  const scale = len > JOY_RADIUS ? JOY_RADIUS / len : 1
  const px = dx * scale
  const py = dy * scale
  return { px, py, moveX: px / JOY_RADIUS, moveZ: -py / JOY_RADIUS }
}

export function WalkModeOverlay() {
  const [speed, setSpeed] = useState(() => loadWalkSettings().speed)
  const [lookPercent, setLookPercent] = useState(() =>
    lookSensitivityToPercent(loadWalkSettings().lookSensitivity),
  )
  const [fov, setFov] = useState(() => loadWalkSettings().fov)
  const [jumpHeight, setJumpHeight] = useState(() => loadWalkSettings().jumpHeight)
  const [panelOpen, setPanelOpen] = useState(true)
  const [moveJoy, setMoveJoy] = useState<FloatingMoveJoy | null>(null)
  const moveJoyRef = useRef<FloatingMoveJoy | null>(null)
  const lookActive = useRef<LookGesture | null>(null)
  const moveZoneRef = useRef<HTMLDivElement>(null)
  const lookZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyWalkSettings(loadWalkSettings())
  }, [])

  useEffect(() => {
    const cur = loadWalkSettings()
    setWalkSpeed(speed)
    setWalkJumpHeight(jumpHeight)
    saveWalkSettings({
      ...cur,
      speed,
      lookSensitivity: lookSensitivityFromPercent(lookPercent),
      fov,
      jumpHeight,
    })
  }, [speed, lookPercent, fov, jumpHeight])

  useEffect(() => {
    return () => resetWalkInput()
  }, [])

  const updateMoveJoy = (joy: FloatingMoveJoy, clientX: number, clientY: number) => {
    const dx = clientX - joy.originX
    const dy = clientY - joy.originY
    const { px, py, moveX, moveZ } = clampKnob(dx, dy)
    const next = { ...joy, knobX: px, knobY: py }
    moveJoyRef.current = next
    setMoveJoy(next)
    setWalkMove(moveX, moveZ)
  }

  const onMovePointerDown = (e: React.PointerEvent) => {
    if (moveJoyRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const joy: FloatingMoveJoy = {
      originX: e.clientX,
      originY: e.clientY,
      knobX: 0,
      knobY: 0,
      pointerId: e.pointerId,
    }
    moveJoyRef.current = joy
    setMoveJoy(joy)
    updateMoveJoy(joy, e.clientX, e.clientY)
  }

  const onMovePointerMove = (e: React.PointerEvent) => {
    const joy = moveJoyRef.current
    if (!joy || joy.pointerId !== e.pointerId) return
    updateMoveJoy(joy, e.clientX, e.clientY)
  }

  const onMovePointerEnd = (e: React.PointerEvent) => {
    const joy = moveJoyRef.current
    if (!joy || joy.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    moveJoyRef.current = null
    setMoveJoy(null)
    setWalkMove(0, 0)
  }

  const onLookPointerDown = (e: React.PointerEvent) => {
    if (lookActive.current) return
    lookActive.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      moved: 0,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onLookPointerMove = (e: React.PointerEvent) => {
    const look = lookActive.current
    if (!look || look.pointerId !== e.pointerId) return
    const dx = e.clientX - look.lastX
    const dy = e.clientY - look.lastY
    look.lastX = e.clientX
    look.lastY = e.clientY
    look.moved += Math.hypot(dx, dy)
    const sens = getWalkLookSensitivity()
    addWalkLook(-dx * sens, -dy * sens)
  }

  const onLookPointerEnd = (e: React.PointerEvent) => {
    const look = lookActive.current
    if (!look || look.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    const elapsed = performance.now() - look.startTime
    const totalMove = Math.max(
      look.moved,
      Math.hypot(e.clientX - look.startX, e.clientY - look.startY),
    )
    lookActive.current = null
    if (totalMove <= LOOK_TAP_MAX_MOVE_PX && elapsed <= LOOK_TAP_MAX_MS) {
      requestWalkJump()
    }
  }

  const onLookPointerCancel = (e: React.PointerEvent) => {
    const look = lookActive.current
    if (!look || look.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    lookActive.current = null
  }

  const onLookPercentChange = (percent: number) => {
    setLookPercent(percent)
    setWalkLookSensitivity(lookSensitivityFromPercent(percent))
  }

  const onFovChange = (next: number) => {
    setFov(next)
    setWalkFov(next)
  }

  return (
    <>
      <div className="hb-walk-speed-panel pointer-events-auto absolute left-3 top-3 z-20 w-[min(calc(100vw-5.5rem),220px)] rounded-2xl px-3 py-2.5">
        <button
          type="button"
          className="mb-2 flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
            <Settings2 className="size-3.5" />
            漫游设置
          </span>
          <span className="text-[10px] text-white/40">{panelOpen ? '收起' : '展开'}</span>
        </button>

        {panelOpen ? (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] leading-relaxed text-white/35">
              同住 OC 的立绘与抠图请到顶部「人物」页调整。
            </p>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/55">
                <span className="flex items-center gap-1.5">
                  <Gauge className="size-3.5" />
                  移动速度
                </span>
                <span className="tabular-nums text-white/70">{speed.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min={WALK_SPEED_MIN}
                max={WALK_SPEED_MAX}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(Number.parseFloat(e.target.value))}
                className="hb-walk-speed-slider w-full"
                aria-label="移动速度"
              />
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/55">
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  视角灵敏度
                </span>
                <span className="tabular-nums text-white/70">{lookPercent}%</span>
              </div>
              <input
                type="range"
                min={25}
                max={200}
                step={5}
                value={lookPercent}
                onChange={(e) => onLookPercentChange(Number.parseInt(e.target.value, 10))}
                className="hb-walk-speed-slider w-full"
                aria-label="视角灵敏度"
              />
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/55">
                <span>跳跃高度</span>
                <span className="tabular-nums text-white/70">{jumpHeight.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min={WALK_JUMP_HEIGHT_MIN}
                max={WALK_JUMP_HEIGHT_MAX}
                step={0.05}
                value={jumpHeight}
                onChange={(e) => setJumpHeight(Number.parseFloat(e.target.value))}
                className="hb-walk-speed-slider w-full"
                aria-label="跳跃高度"
              />
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/55">
                <span>视野角度</span>
                <span className="tabular-nums text-white/70">{fov}°</span>
              </div>
              <input
                type="range"
                min={WALK_FOV_MIN}
                max={WALK_FOV_MAX}
                step={1}
                value={fov}
                onChange={(e) => onFovChange(Number.parseInt(e.target.value, 10))}
                className="hb-walk-speed-slider w-full"
                aria-label="视野角度"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
                左手移动、右手滑动转视角；右侧轻点可小跳，配合摇杆可向不同方向跳。
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {moveJoy ? (
        <div
          className="hb-walk-joy-float pointer-events-none z-30"
          style={{ left: moveJoy.originX, top: moveJoy.originY }}
        >
          <div className="hb-walk-joy-base">
            <div
              className="hb-walk-joy-knob"
              style={{ transform: `translate(${moveJoy.knobX}px, ${moveJoy.knobY}px)` }}
            />
          </div>
        </div>
      ) : null}

      <div
        ref={moveZoneRef}
        className="hb-joystick-zone hb-joystick-zone--left hb-walk-move-zone pointer-events-auto z-20"
        onPointerDown={onMovePointerDown}
        onPointerMove={onMovePointerMove}
        onPointerUp={onMovePointerEnd}
        onPointerCancel={onMovePointerEnd}
      />

      <div
        ref={lookZoneRef}
        className="hb-joystick-zone hb-joystick-zone--right hb-walk-look-zone pointer-events-auto z-20"
        onPointerDown={onLookPointerDown}
        onPointerMove={onLookPointerMove}
        onPointerUp={onLookPointerEnd}
        onPointerCancel={onLookPointerCancel}
      >
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[10px] leading-tight text-white/35">
          滑动转视角
          <br />
          轻点小跳
        </span>
      </div>
    </>
  )
}
