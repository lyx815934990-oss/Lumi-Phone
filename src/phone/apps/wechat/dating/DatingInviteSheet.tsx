import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeart, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { personaDb } from '../newFriendsPersona/idb'
import { LUMI_SHELL_NUM_FONT } from '../lumiShellTheme'
import { DatingNum } from './DatingNum'
import { DATING_COMFORT, DATING_THEME, DATING_THEME_FONT } from './datingTheme'
import { resolvePlotStoryEndDisplayLabel } from './plotStoryTimeLabel'
import type { CharacterArchive, CharacterInfo } from './types'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EASE_SOFT: [number, number, number, number] = [0.33, 1, 0.32, 1]
/** 继续约会 → 剧情页 过渡时长（仪式序列） */
export const DATING_STORY_DEPART_MS = 1180

function formatRelativeLastDate(ts: number): string {
  const d = Date.now() - ts
  if (!Number.isFinite(d) || d < 0) return ''
  const mins = Math.floor(d / 60_000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function ExpandedLine({ characterId, text }: { characterId: string; text: string }) {
  const raw = String(text ?? '')
  const [display, setDisplay] = useState(raw)
  useEffect(() => {
    if (!raw.includes('{{') || !characterId.trim()) {
      setDisplay(raw)
      return
    }
    let cancelled = false
    void personaDb.expandCharacterFieldPlaceholderPreview(raw, characterId).then((out) => {
      if (!cancelled) setDisplay((out ?? raw).trim() || raw)
    })
    return () => {
      cancelled = true
    }
  }, [characterId, raw])
  return <>{display}</>
}

/**
 * 「继续约会」后的全屏入场：
 * 双帘分开 → 光晕与光环 → 头像升起 → 题签展开 → 整幕上收
 */
export function InviteDepartOverlay({
  character,
  hasProgress,
}: {
  character: CharacterInfo
  hasProgress: boolean
}) {
  const label = hasProgress ? '继续赴约' : '开启赴约'

  return (
    <motion.div
      className="fixed inset-0 z-[56000] overflow-hidden"
      style={{ background: DATING_COMFORT.bg, fontFamily: DATING_THEME_FONT }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22, ease: EASE } }}
    >
      {/* 左右幕帘 */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          background: `linear-gradient(90deg, ${DATING_COMFORT.surface} 0%, ${DATING_COMFORT.bg} 88%)`,
        }}
        initial={{ x: 0 }}
        animate={{ x: '-102%' }}
        transition={{ duration: 0.62, ease: EASE_SOFT, delay: 0.06 }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-y-0 right-0 w-1/2"
        style={{
          background: `linear-gradient(270deg, ${DATING_COMFORT.surface} 0%, ${DATING_COMFORT.bg} 88%)`,
        }}
        initial={{ x: 0 }}
        animate={{ x: '102%' }}
        transition={{ duration: 0.62, ease: EASE_SOFT, delay: 0.06 }}
      />

      {/* 中心舞台 */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-8"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          y: [10, 0, 0, -18],
          scale: [0.985, 1, 1, 1.03],
        }}
        transition={{ duration: 1.12, ease: EASE, times: [0, 0.22, 0.72, 1] }}
      >
        {/* 柔光 */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute size-[280px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,250,252,0.95) 0%, rgba(240,236,244,0.45) 42%, transparent 72%)',
          }}
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: [0, 0.9, 0.55, 0], scale: [0.55, 1, 1.12, 1.28] }}
          transition={{ duration: 1.05, ease: EASE, times: [0, 0.28, 0.7, 1], delay: 0.12 }}
        />

        {/* 双环 */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute size-[118px] rounded-full border"
          style={{ borderColor: DATING_COMFORT.grayMid }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.55, 0], scale: [0.7, 1.08, 1.32] }}
          transition={{ duration: 0.85, ease: EASE, delay: 0.22, times: [0, 0.45, 1] }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute size-[148px] rounded-full border"
          style={{ borderColor: DATING_COMFORT.grayLight }}
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.75, 1.05, 1.28] }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.28, times: [0, 0.42, 1] }}
        />

        {/* 头像 */}
        <motion.img
          src={resolveCharacterAvatarUrl({ avatarUrl: character.avatarUrl })}
          alt=""
          className="relative z-[1] size-[88px] rounded-full object-cover"
          style={{
            border: `2px solid ${DATING_COMFORT.grayLight}`,
            boxShadow: '0 12px 36px rgba(200, 192, 208, 0.32)',
          }}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], y: [16, 0, 0, -8], scale: [0.9, 1, 1, 1.06] }}
          transition={{ duration: 0.95, ease: EASE, times: [0, 0.28, 0.7, 1], delay: 0.18 }}
        />

        {/* 题签：细线展开 + 文案 */}
        <div className="relative z-[1] mt-7 flex w-full max-w-[240px] flex-col items-center">
          <div className="mb-3 flex w-full items-center gap-3">
            <motion.span
              className="h-px flex-1 origin-right"
              style={{ background: DATING_COMFORT.grayMid }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 0.85, 0.85, 0] }}
              transition={{ duration: 0.9, ease: EASE, times: [0, 0.32, 0.7, 1], delay: 0.32 }}
            />
            <motion.p
              className="shrink-0 text-[11px] font-medium tracking-[0.22em]"
              style={{ color: DATING_COMFORT.textMuted }}
              initial={{ opacity: 0, letterSpacing: '0.08em' }}
              animate={{
                opacity: [0, 1, 1, 0],
                letterSpacing: ['0.08em', '0.22em', '0.22em', '0.28em'],
              }}
              transition={{ duration: 0.9, ease: EASE, times: [0, 0.32, 0.7, 1], delay: 0.34 }}
            >
              {label}
            </motion.p>
            <motion.span
              className="h-px flex-1 origin-left"
              style={{ background: DATING_COMFORT.grayMid }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 0.85, 0.85, 0] }}
              transition={{ duration: 0.9, ease: EASE, times: [0, 0.32, 0.7, 1], delay: 0.32 }}
            />
          </div>

          <motion.p
            className="text-[20px] font-semibold tracking-tight"
            style={{ color: DATING_COMFORT.text, letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6] }}
            transition={{ duration: 0.88, ease: EASE, times: [0, 0.3, 0.7, 1], delay: 0.4 }}
          >
            {character.realName}
          </motion.p>

          <motion.p
            className="mt-2 text-[12px] tracking-[0.06em]"
            style={{ color: DATING_COMFORT.textMuted }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.85, 0] }}
            transition={{ duration: 0.82, ease: EASE, times: [0, 0.32, 0.7, 1], delay: 0.48 }}
          >
            {hasProgress ? '线下剧情 · 下一幕' : '线下故事 · 第一幕'}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}

type Props = {
  open: boolean
  character: CharacterInfo | null
  archive: CharacterArchive | null
  onClose: () => void
  onBeginDepart?: (payload: { character: CharacterInfo; hasProgress: boolean }) => void
  onConfirm: () => void
}

export function DatingInviteSheet({ open, character, archive, onClose, onBeginDepart, onConfirm }: Props) {
  const [departing, setDeparting] = useState(false)
  const departTimerRef = useRef<number | null>(null)

  const stats = useMemo(() => {
    if (!archive) return { aiActs: 0, lastStoryTime: null as string | null, lastDateLabel: null as string | null }
    const aiPlots = archive.plots.filter((p) => p.type === 'ai')
    const lastAi = [...aiPlots].reverse()[0]
    return {
      aiActs: aiPlots.length,
      lastStoryTime: lastAi ? resolvePlotStoryEndDisplayLabel(lastAi) : null,
      lastDateLabel: archive.lastDateAt ? formatRelativeLastDate(archive.lastDateAt) : null,
    }
  }, [archive])

  const tagline = character?.motto?.trim() || character?.signature?.trim() || ''
  const hasProgress = stats.aiActs > 0

  useEffect(() => {
    if (open) return
    setDeparting(false)
    if (departTimerRef.current != null) {
      window.clearTimeout(departTimerRef.current)
      departTimerRef.current = null
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (departTimerRef.current != null) window.clearTimeout(departTimerRef.current)
    }
  }, [])

  const handleConfirm = () => {
    if (departing || !character) return
    setDeparting(true)
    onBeginDepart?.({ character, hasProgress })
    departTimerRef.current = window.setTimeout(() => {
      departTimerRef.current = null
      setDeparting(false)
      onConfirm()
    }, DATING_STORY_DEPART_MS)
  }

  const showSheet = open && character && !departing

  return (
    <AnimatePresence>
      {showSheet ? (
        <div
          key="dating-invite"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dating-invite-title"
          className="fixed inset-0 z-[55000] flex items-end justify-center sm:items-center"
          style={{ fontFamily: DATING_THEME_FONT }}
          onClick={onClose}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'rgba(16, 16, 18, 0.38)' }}
          />

          <div
            className="dating-invite-sheet relative mx-auto w-full max-w-[420px] overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
            style={{
              background: DATING_THEME.surfaceStrong,
              border: `1px solid ${DATING_THEME.border}`,
              boxShadow: '0 -20px 56px rgba(16, 16, 18, 0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-36"
              style={{
                background:
                  'radial-gradient(120% 100% at 50% 0%, rgba(16,16,18,0.05) 0%, transparent 72%)',
              }}
            />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full p-2 transition-colors hover:bg-black/[0.04]"
              style={{ color: DATING_THEME.textMuted }}
              aria-label="关闭"
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>

            <div className="relative px-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-8">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-black/[0.08]" />
                <p
                  className="shrink-0 text-[11px] font-medium tracking-[0.2em]"
                  style={{ color: DATING_THEME.textMuted }}
                >
                  线下赴约
                </p>
                <span className="h-px flex-1 bg-black/[0.08]" />
              </div>

              <div className="mt-5 flex flex-col items-center">
                <img
                  src={resolveCharacterAvatarUrl({ avatarUrl: character.avatarUrl })}
                  alt=""
                  className="size-[88px] rounded-full object-cover"
                  style={{
                    border: `2px solid ${DATING_THEME.border}`,
                    boxShadow: '0 10px 32px rgba(16, 16, 18, 0.1)',
                  }}
                />
              </div>

              <h2
                id="dating-invite-title"
                className="mt-4 text-center text-[20px] font-semibold tracking-tight"
                style={{ color: DATING_THEME.text, letterSpacing: '-0.02em' }}
              >
                {character.realName}
              </h2>

              {tagline ? (
                <p
                  className="mx-auto mt-2 max-w-[280px] text-center text-[13px] leading-relaxed"
                  style={{ color: DATING_THEME.textMuted }}
                >
                  <ExpandedLine characterId={character.id} text={tagline} />
                </p>
              ) : null}

              <div
                className="mx-auto mt-5 max-w-[300px] rounded-[16px] px-4 py-3 text-center"
                style={{
                  border: `1px solid ${DATING_THEME.border}`,
                  background: DATING_THEME.chip,
                }}
              >
                {hasProgress ? (
                  <>
                    <p className="text-[12px] leading-snug" style={{ color: DATING_THEME.textMuted }}>
                      已进行至第 <DatingNum>{stats.aiActs}</DatingNum> 幕
                      {stats.lastStoryTime ? (
                        <>
                          <span className="mx-1 opacity-40">·</span>
                          <DatingNum>{stats.lastStoryTime}</DatingNum>
                        </>
                      ) : null}
                    </p>
                    {stats.lastDateLabel ? (
                      <p
                        className="mt-1 text-[11px] tabular-nums"
                        style={{ color: DATING_THEME.mist, fontFamily: LUMI_SHELL_NUM_FONT }}
                      >
                        上次约会 {stats.lastDateLabel}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[13px] leading-relaxed" style={{ color: DATING_THEME.textMuted }}>
                    与 {character.realName} 的线下故事，从此开始。
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-medium transition-transform active:scale-[0.988]"
                  style={{ background: DATING_THEME.accent, color: DATING_THEME.accentOn }}
                >
                  <CalendarHeart className="size-4" strokeWidth={1.75} />
                  {hasProgress ? '继续约会' : '开启约会'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-full py-2.5 text-[13px] font-medium transition-colors hover:bg-black/[0.03]"
                  style={{ color: DATING_THEME.textMuted }}
                >
                  再看看
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
