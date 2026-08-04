import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Languages, Settings2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { Pressable } from '../../components/Pressable'
import {
  EVO_ENTRY_COACH_ROOT_ATTR,
  EVO_ENTRY_COACH_SCOPE,
  EVO_ENTRY_COACH_TARGET_ATTR,
  type EvolutionEntryGuide,
  type EvolutionEntryGuideScene,
  type EvolutionEntryGuideStep,
} from './evolutionFeatureEntryGuides'

const PAD = 10
const RADIUS = 14
const COACH_Z = 10040

type HoleRect = { top: number; left: number; width: number; height: number }

function coachTargetSelector(id: string) {
  return `[${EVO_ENTRY_COACH_ROOT_ATTR}="${EVO_ENTRY_COACH_SCOPE}"] [${EVO_ENTRY_COACH_TARGET_ATTR}="${id}"]`
}

function measureTargetInOverlay(target: string, overlayEl: HTMLElement): HoleRect | null {
  const node = document.querySelector(coachTargetSelector(target))
  if (!node) return null
  const er = node.getBoundingClientRect()
  const or = overlayEl.getBoundingClientRect()
  if (er.width < 2 || er.height < 2) return null
  const maxW = or.width - 16
  return {
    top: Math.max(8, er.top - or.top - PAD),
    left: Math.max(8, er.left - or.left - PAD),
    width: Math.min(maxW, er.width + PAD * 2),
    height: er.height + PAD * 2,
  }
}

function holeRectsEqual(a: HoleRect | null, b: HoleRect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

function MockSwitch({ on = false }: { on?: boolean }) {
  return (
    <span
      className="relative inline-block h-7 w-[46px] shrink-0 rounded-full"
      style={{ backgroundColor: on ? '#111827' : '#cccccc' }}
      aria-hidden
    >
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
        style={{ left: on ? 20 : 2 }}
      />
    </span>
  )
}

function DemoPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-evo-entry-coach-root={EVO_ENTRY_COACH_SCOPE}
      className="pointer-events-none mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border border-white/25 bg-[#EDEDED] shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
    >
      <div className="flex h-10 items-center justify-center bg-black/5">
        <div className="h-1.5 w-16 rounded-full bg-black/15" />
      </div>
      <div className="min-h-[340px] bg-[#EDEDED]">{children}</div>
    </div>
  )
}

function SceneLinkedChatRoom() {
  return (
    <DemoPhoneFrame>
      <div className="flex items-center justify-between bg-[#EDEDED] px-3 py-2.5">
        <span className="text-[15px] text-[#576b95]">‹ 微信</span>
        <div className="text-center">
          <p className="text-[15px] font-medium text-black">阿衡</p>
          <p className="text-[10px] text-gray-400">在线</p>
        </div>
        <span
          data-evo-entry-coach="linked-chat-info"
          className="rounded-lg bg-white px-2.5 py-1.5 text-[18px] font-bold leading-none tracking-widest text-black shadow-sm"
        >
          ···
        </span>
      </div>
      <div className="space-y-3 bg-[#EDEDED] px-3 pb-6 pt-4">
        <div className="ml-auto max-w-[70%] rounded-lg bg-[#95ec69] px-3 py-2 text-[13px] text-black">
          你听说了吗…
        </div>
        <div className="max-w-[70%] rounded-lg bg-white px-3 py-2 text-[13px] text-black">嗯？</div>
      </div>
    </DemoPhoneFrame>
  )
}

function SceneLinkedChatSettings() {
  return (
    <DemoPhoneFrame>
      <div className="bg-white px-3 py-3 text-center text-[16px] font-medium">聊天信息</div>
      <div className="mt-2 space-y-0 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <span className="text-[15px]">置顶聊天</span>
          <MockSwitch />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <span className="text-[15px]">弹幕模式</span>
          <MockSwitch />
        </div>
        <div
          data-evo-entry-coach="linked-chat-switch"
          className="flex items-center justify-between bg-[#F7F7F8] px-4 py-3.5"
        >
          <span className="text-[15px] font-medium">联动聊天模式</span>
          <MockSwitch on />
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5">
          <span className="text-[15px]">回复思维链</span>
          <MockSwitch />
        </div>
      </div>
    </DemoPhoneFrame>
  )
}

function SceneDiaryDiscover() {
  return (
    <DemoPhoneFrame>
      <div className="bg-white px-3 py-3 text-center text-[16px] font-medium">发现</div>
      <div className="mt-2 space-y-0 bg-white">
        {[
          { label: '朋友圈', dim: true },
          { label: '听一听', dim: true },
          { label: '匿问我答', dim: true },
          { label: '微博广场', dim: true },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 text-[15px] text-gray-400"
          >
            <span>{row.label}</span>
            <ChevronRight className="size-4 text-gray-200" />
          </div>
        ))}
        <div
          data-evo-entry-coach="diary-entry"
          className="flex items-center justify-between bg-[#F7F7F8] px-4 py-3.5 text-[15px]"
        >
          <span className="font-medium text-black">私语档案</span>
          <ChevronRight className="size-4 text-gray-400" />
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5 text-[15px] text-gray-400">
          <span>剧本杀馆</span>
          <ChevronRight className="size-4 text-gray-200" />
        </div>
      </div>
    </DemoPhoneFrame>
  )
}

function SceneDiaryArchive() {
  return (
    <DemoPhoneFrame>
      <div className="bg-gray-50 px-3 py-3 text-center text-[16px] font-medium">私语档案</div>
      <div className="bg-gray-50 px-3 pb-6 pt-2">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-[16px] text-gray-400">
            衡
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">阿衡</p>
            <p className="mt-0.5 text-[11px] text-gray-400">已收录 3 篇 · 日语</p>
          </div>
          <span
            data-evo-entry-coach="diary-settings-btn"
            className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
          >
            <Settings2 className="size-4" strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </DemoPhoneFrame>
  )
}

function SceneDiarySettings() {
  return (
    <DemoPhoneFrame>
      <div className="bg-white px-4 py-3">
        <p className="text-[15px] font-medium">日记设置</p>
        <p className="mt-0.5 text-[11px] text-gray-400">阿衡 的私语档案</p>
      </div>
      <div
        data-evo-entry-coach="diary-lang-block"
        className="mx-3 mb-4 space-y-3 rounded-2xl bg-[#F7F7F8] p-3"
      >
        <div>
          <p className="text-[14px] font-medium">书写语言</p>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-800">
            日本語（日本）
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200/80 pt-3">
          <div>
            <p className="text-[14px] font-medium">同步翻译</p>
            <p className="mt-0.5 text-[11px] text-gray-400">非中文时附带简体译文</p>
          </div>
          <MockSwitch on />
        </div>
      </div>
    </DemoPhoneFrame>
  )
}

function SceneDiaryReader() {
  return (
    <DemoPhoneFrame>
      <div className="flex items-center justify-between bg-white px-2 py-2">
        <span className="flex size-9 items-center justify-center text-gray-700">
          <ChevronLeft className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-medium text-gray-900">阿衡</p>
          <p className="text-[10px] tracking-[0.2em] text-gray-400">阅读日记</p>
        </div>
        <span
          data-evo-entry-coach="diary-translate-btn"
          className="flex h-9 min-w-10 items-center justify-center gap-0.5 rounded-full px-2 text-[11px] text-gray-600 ring-1 ring-gray-200"
        >
          <Languages className="size-3.5" strokeWidth={1.5} />
          <span>翻译</span>
        </span>
      </div>
      <div className="bg-[#F7F4EE] px-5 py-6">
        <p className="text-center font-serif text-[15px] text-gray-800">今日のひとこと</p>
        <p className="mt-4 text-[12px] leading-[1.9] text-gray-600">
          今日も同じ駅で降りた。改札を出る前に、ふと立ち止まる——まだ間に合う気がした。
        </p>
      </div>
    </DemoPhoneFrame>
  )
}

function GuideScene({ scene }: { scene: EvolutionEntryGuideScene }) {
  switch (scene) {
    case 'linked-chat-room':
      return <SceneLinkedChatRoom />
    case 'linked-chat-settings':
      return <SceneLinkedChatSettings />
    case 'diary-discover':
      return <SceneDiaryDiscover />
    case 'diary-archive':
      return <SceneDiaryArchive />
    case 'diary-settings':
      return <SceneDiarySettings />
    case 'diary-reader':
      return <SceneDiaryReader />
    default:
      return null
  }
}

function CoachCardBody({
  guideTitle,
  stepIndex,
  total,
  step,
  isFirst,
  isLast,
  onSkip,
  onStepChange,
  onComplete,
}: {
  guideTitle: string
  stepIndex: number
  total: number
  step: EvolutionEntryGuideStep
  isFirst: boolean
  isLast: boolean
  onSkip: () => void
  onStepChange: (index: number) => void
  onComplete: () => void
}) {
  return (
    <>
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gray-400">
        {guideTitle} · {stepIndex + 1} / {total}
      </p>
      <p id="evo-entry-coach-title" className="mt-2 text-[15px] font-semibold tracking-tight text-gray-900">
        {step.title}
      </p>
      <p className="mt-2 text-[13px] leading-[1.75] text-gray-600">{step.body}</p>
      <div className="mt-5 flex flex-col gap-2">
        {step.isOutro ? (
          <Pressable
            type="button"
            onClick={onComplete}
            className="w-full rounded-full bg-gray-900 py-3 text-center text-[13px] font-semibold tracking-wide text-white active:opacity-90"
          >
            知道了
          </Pressable>
        ) : (
          <>
            <div className="flex gap-2">
              <Pressable
                type="button"
                onClick={onSkip}
                className="flex-1 rounded-full bg-gray-100 py-3 text-center text-[13px] font-medium text-gray-500 active:bg-gray-200/80"
              >
                跳过
              </Pressable>
              <Pressable
                type="button"
                onClick={() => {
                  if (isLast) onComplete()
                  else onStepChange(stepIndex + 1)
                }}
                className="min-w-0 flex-[1.4] rounded-full bg-gray-900 py-3 text-center text-[13px] font-semibold tracking-wide text-white active:opacity-90"
              >
                {isLast ? '完成' : '下一步'}
              </Pressable>
            </div>
            {!isFirst ? (
              <Pressable
                type="button"
                onClick={() => onStepChange(stepIndex - 1)}
                className="w-full py-1 text-center text-[12px] text-gray-400"
              >
                上一步
              </Pressable>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}

type Props = {
  open: boolean
  guide: EvolutionEntryGuide
  onClose: () => void
}

/** 新增功能入口：聚光灯教程（演示界面 + 挖孔高亮） */
export function EvolutionFeatureEntryCoach({ open, guide, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sceneWrapRef = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [hole, setHole] = useState<HoleRect | null>(null)
  const holeRef = useRef<HoleRect | null>(null)

  const steps = guide.steps
  const step = steps[stepIndex]
  const total = steps.length

  useEffect(() => {
    if (open) {
      setStepIndex(0)
      holeRef.current = null
      setHole(null)
    }
  }, [open, guide.id])

  const applyHole = useCallback((next: HoleRect | null) => {
    if (holeRectsEqual(holeRef.current, next)) return
    holeRef.current = next
    setHole(next)
  }, [])

  // 场景挂载后同步量一次；避免多次 timeout / ResizeObserver 反馈造成抖动
  useLayoutEffect(() => {
    if (!open || !step) {
      applyHole(null)
      return
    }
    if (step.centered || !step.target) {
      applyHole(null)
      return
    }
    const overlay = overlayRef.current
    if (!overlay) {
      applyHole(null)
      return
    }
    applyHole(measureTargetInOverlay(step.target, overlay))
    const id = requestAnimationFrame(() => {
      const o = overlayRef.current
      if (!o || !step.target) return
      applyHole(measureTargetInOverlay(step.target, o))
    })
    return () => cancelAnimationFrame(id)
  }, [open, step, stepIndex, applyHole])

  useEffect(() => {
    if (!open) return
    const onResize = () => {
      const o = overlayRef.current
      if (!o || !step?.target || step.centered) return
      applyHole(measureTargetInOverlay(step.target, o))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, step, applyHole])

  const goStep = useCallback((index: number) => {
    setStepIndex(index)
  }, [])

  if (typeof document === 'undefined' || !step) return null

  const isFirst = stepIndex === 0
  const isLast = stepIndex >= total - 1
  // 非居中步骤始终挂载挖孔层，用上一帧尺寸过渡到新目标，避免卸载重挂造成闪抖
  const useSpotlight = open && !step.centered
  const showScene = open && step.scene !== 'none'

  const cardProps = {
    guideTitle: guide.title,
    stepIndex,
    total,
    step,
    isFirst,
    isLast,
    onSkip: onClose,
    onStepChange: goStep,
    onComplete: onClose,
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={overlayRef}
          key={`evo-entry-coach-${guide.id}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="evo-entry-coach-title"
          className="fixed inset-0 overflow-hidden"
          style={{ zIndex: COACH_Z }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            ref={sceneWrapRef}
            className="pointer-events-none absolute inset-x-0 top-[max(40px,5%)] z-0 flex h-[min(420px,52vh)] items-start justify-center px-5"
            aria-hidden={!showScene}
          >
            {showScene ? <GuideScene scene={step.scene} /> : null}
          </div>

          {useSpotlight && hole ? (
            <motion.div
              className="pointer-events-none absolute z-[1] ring-2 ring-white/95"
              initial={false}
              animate={{
                top: hole.top,
                left: hole.left,
                width: hole.width,
                height: hole.height,
              }}
              transition={{ type: 'tween', duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: RADIUS,
                boxShadow: '0 0 0 9999px rgba(17,24,39,0.72), 0 0 28px rgba(17,24,39,0.25)',
              }}
              aria-hidden
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gray-900/72" aria-hidden />
          )}

          {step.centered ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-5">
              <div
                className="pointer-events-auto w-full max-w-[min(340px,calc(100%-24px))] rounded-[24px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <CoachCardBody {...cardProps} />
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pt-2 pb-[max(20px,env(safe-area-inset-bottom,0px))]">
              <div
                className="pointer-events-auto w-full max-w-[min(360px,calc(100%-8px))] rounded-[24px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <CoachCardBody {...cardProps} />
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
