import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ChevronLeft, Clapperboard, Clock, Globe, Map, MessageCircle, Moon, Music2, NotebookPen, PhoneCall, ShoppingBag, Ticket, UtensilsCrossed } from 'lucide-react'

import { AppIcon } from './AppIcon'
import './spyDesktop.css'
import { getOrInitSpyWallpaperUrl } from './spyWallpaper'
import { Pressable } from '../../../components/Pressable'
import { NotesApp } from './notes/NotesApp'
import { MirrorWeChatApp } from './mirrorWechat/MirrorWeChatApp'
import { SleepApp } from './sleep/SleepApp'
import { BrowserApp } from './browser/BrowserApp'
import { PhoneApp } from './calls/PhoneApp'
import { BingeApp } from './binge/BingeApp'
import { MarketApp } from './market/MarketApp'
import { HealthApp } from './health/HealthApp'
import { CheckPhoneAppErrorBoundary } from './CheckPhoneAppErrorBoundary'
import { SpyTutorial } from './SpyTutorial'
import { personaDb } from '../newFriendsPersona/idb'

type DesktopApp = {
  id: string
  label: string
  Icon: typeof MessageCircle
}

type ActiveSpyApp = 'notes' | 'wechat' | 'sleep' | 'browser' | 'calls' | 'binge' | 'market' | 'health' | null
const SPY_TUTORIAL_SEEN_KEY = 'checkPhone.spyTutorialSeen.v1'
const SPY_TUTORIAL_STEPS = [
  {
    title: '偷偷查手机说明',
    text:
      '你已进入偷偷查看模式。\n请尽量快速浏览关键内容，任何拖延都可能提升暴露风险。\n点击「下一步」查看抓包规则。',
  },
  {
    title: '抓包机制与扫描',
    text:
      '系统每 60 秒会发起一次扫描，扫描持续 10 秒。\n扫描期间禁止触碰屏幕；任何点击都会被立即判定抓包并强制退出。',
  },
  {
    title: '时钟可拖动',
    text:
      '右上角时钟图标显示扫描倒计时。\n按住并拖动即可在手机壳内移动位置，避免挡住操作按钮。',
  },
] as const

function getPhoneShellBounds() {
  const shell = document.querySelector('[data-phone-shell="true"]') as HTMLElement | null
  if (shell) {
    const r = shell.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    }
  }
  return {
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  }
}

export function SpyDesktop({
  characterId,
  characterName,
  playerIdentityId,
  playerDisplayName,
  playerWechatAvatarUrl,
  useLumiProjectAssistantPrompt,
  onToast,
  onExit,
}: {
  characterId: string
  characterName: string
  playerIdentityId: string
  playerDisplayName: string
  playerWechatAvatarUrl?: string
  useLumiProjectAssistantPrompt: boolean
  onToast: (msg: string) => void
  onExit: () => void
}) {
  const [now, setNow] = useState(() => new Date())
  const [caughtOpen, setCaughtOpen] = useState(false)
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null)
  const [nextScanAtMs, setNextScanAtMs] = useState(() => Date.now() + 60_000)
  const [scanActive, setScanActive] = useState(false)
  const [scanEndsAtMs, setScanEndsAtMs] = useState<number | null>(null)
  const [activeApp, setActiveApp] = useState<ActiveSpyApp>(null)
  const [timerManualPos, setTimerManualPos] = useState<{ x: number; y: number } | null>(null)
  const [timerDragging, setTimerDragging] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialTargetEl, setTutorialTargetEl] = useState<HTMLElement | null>(null)
  const timerDragStartRef = useRef<{ pointerId: number; dx: number; dy: number; startX: number; startY: number } | null>(null)
  const timerLongPressRef = useRef<number | null>(null)
  const prevBodyUserSelectRef = useRef<string>('')
  const prevBodyWebkitUserSelectRef = useRef<string>('')
  const backButtonRef = useRef<HTMLButtonElement | null>(null)
  const timerRef = useRef<HTMLDivElement | null>(null)
  const shellRootRef = useRef<HTMLDivElement | null>(null)
  const onExitRef = useRef(onExit)
  useEffect(() => {
    onExitRef.current = onExit
  }, [onExit])

  const apps = useMemo<DesktopApp[]>(
    () => [
      { id: 'wechat', label: '微信', Icon: MessageCircle },
      { id: 'notes', label: '备忘录', Icon: NotebookPen },
      { id: 'sleep', label: '睡眠', Icon: Moon },
      { id: 'shopping', label: '网购', Icon: ShoppingBag },
      { id: 'takeout', label: '外卖', Icon: UtensilsCrossed },
      { id: 'browser', label: '浏览器', Icon: Globe },
      { id: 'calls', label: '通话', Icon: PhoneCall },
      { id: 'binge', label: '追剧馆', Icon: Clapperboard },
      { id: 'market', label: '团购', Icon: Ticket },
      { id: 'health', label: '健康', Icon: Activity },
      { id: 'music', label: '音乐', Icon: Music2 },
      { id: 'maps', label: '地图', Icon: Map },
    ],
    [],
  )

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const url = await getOrInitSpyWallpaperUrl(characterId)
        if (!alive) return
        setWallpaperUrl(url)
      } catch {
        if (!alive) return
        setWallpaperUrl(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [characterId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const seen = await personaDb.getPhoneKv(`${SPY_TUTORIAL_SEEN_KEY}:${characterId}`)
      if (cancelled) return
      if (seen !== true) {
        setTutorialStep(0)
        setTutorialOpen(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [characterId])

  useEffect(() => {
    if (caughtOpen) return
    if (scanActive) return
    const waitMs = Math.max(0, nextScanAtMs - Date.now())
    const t = window.setTimeout(() => {
      const endAt = Date.now() + 10_000
      setScanEndsAtMs(endAt)
      setScanActive(true)
    }, waitMs)
    return () => window.clearTimeout(t)
  }, [caughtOpen, scanActive, nextScanAtMs])

  useEffect(() => {
    if (!scanActive) return
    const endAt = scanEndsAtMs ?? Date.now() + 10_000
    const t = window.setTimeout(() => {
      setScanActive(false)
      setScanEndsAtMs(null)
      setNextScanAtMs(Date.now() + 60_000)
    }, Math.max(0, endAt - Date.now()))
    return () => window.clearTimeout(t)
  }, [scanActive, scanEndsAtMs])

  useEffect(() => {
    if (!caughtOpen) return
    const t = window.setTimeout(() => onExitRef.current(), 3000)
    return () => window.clearTimeout(t)
  }, [caughtOpen])
  useEffect(() => {
    if (!tutorialOpen) return
    let id = 0
    const tick = () => {
      if (tutorialStep === 0) setTutorialTargetEl(backButtonRef.current)
      else setTutorialTargetEl(timerRef.current)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [tutorialOpen, tutorialStep])


  useEffect(() => {
    return () => {
      if (timerLongPressRef.current != null) window.clearTimeout(timerLongPressRef.current)
      document.body.style.userSelect = prevBodyUserSelectRef.current
      document.body.style.webkitUserSelect = prevBodyWebkitUserSelectRef.current
    }
  }, [])

  useEffect(() => {
    if (!timerDragging) return
    prevBodyUserSelectRef.current = document.body.style.userSelect
    prevBodyWebkitUserSelectRef.current = document.body.style.webkitUserSelect
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    return () => {
      document.body.style.userSelect = prevBodyUserSelectRef.current
      document.body.style.webkitUserSelect = prevBodyWebkitUserSelectRef.current
    }
  }, [timerDragging])

  const scanCountdownSec = scanActive
    ? Math.max(0, Math.ceil(((scanEndsAtMs ?? now.getTime()) - now.getTime()) / 1000))
    : Math.max(0, Math.ceil((nextScanAtMs - now.getTime()) / 1000))

  const timerAutoStyle = activeApp
    ? ({ right: 14, bottom: 14 } as const)
    : ({ right: 14, top: 14 } as const)

  const closeTutorial = () => {
    setTutorialOpen(false)
    void personaDb.setPhoneKv(`${SPY_TUTORIAL_SEEN_KEY}:${characterId}`, true)
  }

  const clampTimerPos = (clientX: number, clientY: number, dx: number, dy: number) => {
    const root = shellRootRef.current
    const rootRect = root?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
    const shell = getPhoneShellBounds()
    const el = timerRef.current
    const w = el?.offsetWidth || 44
    const h = el?.offsetHeight || 44
    const pad = 6

    let vx = clientX - dx
    let vy = clientY - dy
    const minX = Math.max(shell.left, rootRect.left) + pad
    const minY = Math.max(shell.top, rootRect.top) + pad
    const maxX = Math.min(shell.left + shell.width, rootRect.left + rootRect.width) - w - pad
    const maxY = Math.min(shell.top + shell.height, rootRect.top + rootRect.height) - h - pad

    vx = Math.min(Math.max(minX, vx), Math.max(minX, maxX))
    vy = Math.min(Math.max(minY, vy), Math.max(minY, maxY))

    return {
      x: vx - rootRect.left,
      y: vy - rootRect.top,
    }
  }

  const onTimerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (timerLongPressRef.current != null) window.clearTimeout(timerLongPressRef.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - rect.left
    const dy = e.clientY - rect.top
    timerDragStartRef.current = { pointerId: e.pointerId, dx, dy, startX: e.clientX, startY: e.clientY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    // 短按即进入拖动，移动超过阈值后真正改坐标
    timerLongPressRef.current = window.setTimeout(() => {
      setTimerDragging(true)
    }, 80)
  }

  const onTimerPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = timerDragStartRef.current
    if (!s || s.pointerId !== e.pointerId) return
    const moved = Math.hypot(e.clientX - s.startX, e.clientY - s.startY)
    if (!timerDragging) {
      if (moved < 4) return
      setTimerDragging(true)
      if (timerLongPressRef.current != null) {
        window.clearTimeout(timerLongPressRef.current)
        timerLongPressRef.current = null
      }
    }
    e.preventDefault()
    e.stopPropagation()
    setTimerManualPos(clampTimerPos(e.clientX, e.clientY, s.dx, s.dy))
  }

  const stopTimerDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = timerDragStartRef.current
    if (!s || s.pointerId !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()
    if (timerLongPressRef.current != null) {
      window.clearTimeout(timerLongPressRef.current)
      timerLongPressRef.current = null
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    setTimerDragging(false)
    timerDragStartRef.current = null
  }

  return (
    <motion.div
      ref={shellRootRef}
      className="absolute inset-0 z-[1400] overflow-hidden bg-[#070707] text-white"
      style={
        wallpaperUrl
          ? {
              backgroundImage: `url(${wallpaperUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onPointerDownCapture={() => {
        if (!scanActive || caughtOpen || tutorialOpen) return
        setCaughtOpen(true)
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/55" />
      <div className="pointer-events-none absolute inset-0 z-[1409] spy-red-vignette" />
      <div
        ref={timerRef}
        className={`absolute z-[1412] flex h-11 w-11 flex-col items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm select-none ${
          timerDragging ? 'cursor-grabbing scale-[1.04]' : 'cursor-grab'
        } ${scanActive ? 'border-red-300/40' : ''}`}
        style={
          timerManualPos
            ? {
                left: timerManualPos.x,
                top: timerManualPos.y,
                right: 'auto',
                bottom: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none',
              }
            : {
                ...timerAutoStyle,
                top: timerAutoStyle.top != null ? 'max(14px, env(safe-area-inset-top))' : undefined,
                bottom: timerAutoStyle.bottom != null ? 'max(14px, env(safe-area-inset-bottom))' : undefined,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none',
              }
        }
        onPointerDown={onTimerPointerDown}
        onPointerMove={onTimerPointerMove}
        onPointerUp={stopTimerDrag}
        onPointerCancel={stopTimerDrag}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={scanActive ? `系统扫描中 ${scanCountdownSec} 秒` : `下次扫描 ${scanCountdownSec} 秒`}
        title={scanActive ? `扫描中 ${scanCountdownSec}s` : `下次扫描 ${scanCountdownSec}s`}
      >
        <Clock
          size={16}
          strokeWidth={1.8}
          className={scanActive ? 'text-red-200' : 'text-[#e8d9b6]'}
          aria-hidden
        />
        <span
          className={`mt-0.5 font-mono text-[9px] leading-none tracking-tight ${
            scanActive ? 'text-red-200/90' : 'text-white/70'
          }`}
        >
          {scanCountdownSec}s
        </span>
      </div>

      <div className="relative z-[1] flex h-full w-full flex-col">
        {/* top controls */}
        <div
          className="flex items-center justify-between px-5"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        >
          <Pressable
            ref={backButtonRef}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/85 backdrop-blur-sm active:scale-[0.98]"
            onClick={onExit}
            aria-label="返回聊天室"
          >
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
          </Pressable>
          <div className="w-9" />
        </div>

        {/* desktop header */}
        <div className="px-5 pt-5">
          <div className="text-[12px] tracking-[0.32em] text-white/35">FOREIGN DEVICE</div>
          <div className="mt-1 text-[14px] text-white/80">{characterName} 的桌面</div>
        </div>

        {/* app grid */}
        <div className="mt-6 grid grid-cols-4 gap-x-4 gap-y-6 px-5">
          {apps.map(({ id, label, Icon }) => (
            <AppIcon
              key={id}
              label={label}
              onClick={() => {
                if (id === 'wechat') {
                  setActiveApp('wechat')
                  return
                }
                if (id === 'notes') {
                  setActiveApp('notes')
                  return
                }
                if (id === 'sleep') {
                  setActiveApp('sleep')
                  return
                }
                if (id === 'browser') {
                  setActiveApp('browser')
                  return
                }
                if (id === 'calls') {
                  setActiveApp('calls')
                  return
                }
                if (id === 'binge') {
                  setActiveApp('binge')
                  return
                }
                if (id === 'market') {
                  setActiveApp('market')
                  return
                }
                if (id === 'health') {
                  setActiveApp('health')
                  return
                }
                onToast('即将揭秘')
              }}
              icon={<Icon size={26} strokeWidth={1.6} className="text-[#e8d9b6]" aria-hidden />}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeApp === 'notes' ? (
          <NotesApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
          />
        ) : null}

        {activeApp === 'wechat' ? (
          <MirrorWeChatApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
            onToast={onToast}
          />
        ) : null}

        {activeApp === 'sleep' ? (
          <SleepApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            characterName={characterName}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
          />
        ) : null}

        {activeApp === 'browser' ? (
          <BrowserApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            characterName={characterName}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
            onToast={onToast}
          />
        ) : null}

        {activeApp === 'calls' ? (
          <PhoneApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            characterName={characterName}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            playerWechatAvatarUrl={playerWechatAvatarUrl}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
            onToast={onToast}
          />
        ) : null}

        {activeApp === 'binge' ? (
          <BingeApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            characterName={characterName}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
            onToast={onToast}
          />
        ) : null}

        {activeApp === 'market' ? (
          <MarketApp
            onClose={() => setActiveApp(null)}
            characterId={characterId}
            characterName={characterName}
            playerIdentityId={playerIdentityId}
            playerDisplayName={playerDisplayName}
            useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
            onToast={onToast}
          />
        ) : null}

        {activeApp === 'health' ? (
          <CheckPhoneAppErrorBoundary label="健康" onClose={() => setActiveApp(null)}>
            <HealthApp
              onClose={() => setActiveApp(null)}
              characterId={characterId}
              characterName={characterName}
              playerIdentityId={playerIdentityId}
              playerDisplayName={playerDisplayName}
              useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
              onToast={onToast}
            />
          </CheckPhoneAppErrorBoundary>
        ) : null}

        {scanActive && !caughtOpen ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[1413] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            <div className="rounded-[14px] border border-red-300/20 bg-black/55 px-4 py-3 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm">
              <div className="text-[12px] tracking-[0.22em] text-red-200/80">SYSTEM SCAN</div>
              <div className="mt-1 text-[13px] text-white/85">扫描进行中，请勿触碰屏幕</div>
              <div className="mt-1 text-[12px] tracking-[0.18em] text-white/55">{scanCountdownSec}s</div>
            </div>
          </motion.div>
        ) : null}

        {caughtOpen ? (
          <motion.div
            className="absolute inset-0 z-[1415]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08, ease: 'linear' }}
          >
            {/* red flash + glitch */}
            <motion.div
              className="absolute inset-0 bg-red-600/20"
              animate={{ opacity: [0, 1, 0.2, 1, 0] }}
              transition={{ duration: 0.48, times: [0, 0.18, 0.4, 0.62, 1], ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-0"
              animate={{ x: [0, -6, 8, -4, 0], filter: ['contrast(1)', 'contrast(1.4)', 'contrast(1.2)', 'contrast(1.5)', 'contrast(1)'] }}
              transition={{ duration: 0.38, ease: 'easeInOut' }}
            />

            <div className="absolute inset-0 flex items-center justify-center px-6">
              <motion.div
                className="w-full max-w-[420px] rounded-[12px] border border-red-400/35 bg-[#090909]/92 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.7)] backdrop-blur-md"
                initial={{ scale: 0.98, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.99, opacity: 0, y: 6 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
              >
                <div className="font-mono text-[11px] leading-relaxed tracking-[0.14em] text-red-200/80">
                  [系统安全警告]
                </div>
                <div className="mt-3 font-mono text-[13px] leading-relaxed tracking-[0.08em] text-white/90">
                  {'> 检测到扫描期间存在未授权触碰'}
                </div>
                <div className="mt-1 font-mono text-[13px] leading-relaxed tracking-[0.08em] text-white/90">
                  {'> 当前会话已暴露，正在强制退出'}
                </div>
                <div className="mt-3 h-px w-full bg-red-300/30" />
                <div className="mt-2 font-mono text-[11px] tracking-[0.16em] text-red-200/75">
                  3秒后返回聊天室...
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}

        <SpyTutorial
          open={tutorialOpen && !caughtOpen}
          step={tutorialStep}
          title={SPY_TUTORIAL_STEPS[tutorialStep]?.title ?? '查手机教程'}
          text={SPY_TUTORIAL_STEPS[tutorialStep]?.text ?? ''}
          targetElement={tutorialTargetEl}
          canPrev={tutorialStep > 0}
          onPrev={() => setTutorialStep((v) => Math.max(0, v - 1))}
          onNext={() => {
            setTutorialStep((v) => {
              const next = v + 1
              if (next >= SPY_TUTORIAL_STEPS.length) {
                closeTutorial()
                return v
              }
              return next
            })
          }}
          onClose={closeTutorial}
          nextLabel={tutorialStep >= SPY_TUTORIAL_STEPS.length - 1 ? '完成' : '下一步'}
        />
      </AnimatePresence>
    </motion.div>
  )
}

