import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Pressable } from '../../../components/Pressable'
import { FoldPointModal } from './FoldPointModal'
import { PersonaChannelToggle } from './PersonaChannelToggle'
import { ProloguePanel } from './ProloguePanel'
import { StageActionBar } from './StageActionBar'
import { useCurtainStore } from './store'
import { qimuInk } from './theme'
import { VnDialogueBox } from './VnDialogueBox'
import { VnReplayOverlay } from './VnReplayOverlay'

/** 将一段输入按换行拆成多句对白（空行忽略） */
export function splitDialogueLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function TutorialGuideOverlay({
  steps,
  index,
  onNext,
  onSkip,
}: {
  steps: string[]
  index: number
  onNext: () => void
  onSkip: () => void
}) {
  const step = steps[index]
  if (!step) return null
  const isLast = index >= steps.length - 1

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col justify-end px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="mb-3 overflow-hidden rounded-[12px]"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{
          background: 'linear-gradient(180deg, #fffdf8 0%, #f7f1e4 100%)',
          border: '2px solid rgba(200,170,100,0.95)',
          boxShadow:
            '0 0 0 1px rgba(255,240,200,0.8), 0 0 28px rgba(232,200,140,0.55), 0 16px 40px rgba(0,0,0,0.28)',
        }}
      >
        <div
          className="flex items-center justify-between gap-2 px-3.5 py-2"
          style={{
            background: 'linear-gradient(90deg, #2a2418 0%, #3d3424 55%, #2a2418 100%)',
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.16em] text-[#f5e6c8]"
            style={{ fontFamily: qimuInk.mono }}
          >
            TUTORIAL · 玩法指引
          </p>
          <p className="text-[11px] tabular-nums text-[#d4c4a0]" style={{ fontFamily: qimuInk.mono }}>
            {index + 1}/{steps.length}
          </p>
        </div>

        <div className="px-4 py-4">
          <p
            className="text-[15px] font-medium leading-[1.75]"
            style={{ color: qimuInk.title, fontFamily: qimuInk.display }}
          >
            {step}
          </p>
          <div className="mt-3.5 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 18 : 6,
                  background:
                    i === index
                      ? 'linear-gradient(90deg, #c9a84c, #e8d5a0)'
                      : i < index
                        ? 'rgba(180,150,80,0.55)'
                        : 'rgba(0,0,0,0.12)',
                }}
              />
            ))}
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-3"
          style={{ borderTop: '1px solid rgba(180,150,90,0.25)' }}
        >
          <Pressable
            type="button"
            onClick={onSkip}
            className="rounded-full px-3 py-2 text-[12px] active:opacity-70"
            style={{ color: qimuInk.mute }}
          >
            跳过指引
          </Pressable>
          <div className="flex-1" />
          <Pressable
            type="button"
            onClick={onNext}
            className="rounded-full px-5 py-2.5 text-[13px] font-semibold active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, #2c2c2c 0%, #111 100%)',
              color: '#f7f1e4',
              boxShadow: '0 0 16px rgba(232,200,140,0.35)',
            }}
          >
            {isLast ? '开始入戏' : '下一步'}
          </Pressable>
        </div>
      </motion.div>

      <p className="pb-1 text-center text-[11px] text-white/55">高亮指引 · 点「下一步」继续</p>
    </motion.div>
  )
}

type Props = {
  onSend: (text: string) => Promise<void>
}

export function CurtainStage({ onSend }: Props) {
  const dive = useCurtainStore((s) => s.dive)
  const sending = useCurtainStore((s) => s.sending)
  const lastError = useCurtainStore((s) => s.lastError)
  const setChannel = useCurtainStore((s) => s.setChannel)
  const abortDive = useCurtainStore((s) => s.abortDive)
  const resolveFoldPoint = useCurtainStore((s) => s.resolveFoldPoint)
  const advanceTutorial = useCurtainStore((s) => s.advanceTutorial)
  const skipTutorial = useCurtainStore((s) => s.skipTutorial)
  const dismissPrologue = useCurtainStore((s) => s.dismissPrologue)
  const [draft, setDraft] = useState('')
  const [vnIndex, setVnIndex] = useState(0)
  const [replayOpen, setReplayOpen] = useState(false)
  const prevLenRef = useRef(0)
  const diveIdRef = useRef<number | null>(null)

  const prologueActive = !!dive?.prologueOpen
  const tutorialActive = !!dive && !dive.prologueOpen && dive.tutorialSteps.length > 0

  // 新入幕重置；新消息到达且已在末尾时，停在首条新对白供逐句点进
  useEffect(() => {
    if (!dive) return
    if (diveIdRef.current !== dive.startedAt) {
      diveIdRef.current = dive.startedAt
      prevLenRef.current = dive.messages.length
      setVnIndex(0)
      return
    }
    const len = dive.messages.length
    const prev = prevLenRef.current
    if (len > prev) {
      setVnIndex((cur) => {
        if (prev === 0) return 0
        if (cur >= prev - 1) return prev
        return Math.min(cur, len - 1)
      })
    }
    prevLenRef.current = len
  }, [dive, dive?.messages.length, dive?.startedAt])

  if (!dive) return null

  const messages = dive.messages
  const safeIndex = Math.max(0, Math.min(vnIndex, Math.max(0, messages.length - 1)))
  const currentMsg = messages[safeIndex]
  const hasMore = safeIndex < messages.length - 1
  const atLatest = safeIndex >= messages.length - 1

  const turnsLeft = Math.max(0, dive.quest.timeLimit - dive.currentTurn)
  const turnUnit = dive.quest.timeLimit >= 40 ? '余日' : '余轮'
  const isWing = dive.channel === 'wing'
  const inputLocked =
    sending || !!dive.activeFoldPoint || tutorialActive || prologueActive || hasMore
  const actionsLocked = tutorialActive || prologueActive || !!dive.activeFoldPoint
  const directive =
    dive.mainStoryProgress >= 100
      ? '幕令已近收束'
      : dive.quest.mainGoal.length > 22
        ? `${dive.quest.mainGoal.slice(0, 22)}…`
        : dive.quest.mainGoal

  const advanceVn = () => {
    if (tutorialActive || prologueActive || dive.activeFoldPoint) return
    if (hasMore) setVnIndex((i) => i + 1)
  }

  const jumpToMessage = (index: number) => {
    if (!messages.length) return
    setVnIndex(Math.max(0, Math.min(index, messages.length - 1)))
  }

  const submit = async () => {
    const text = draft.trim()
    if (!text || inputLocked) return
    if (!splitDialogueLines(text).length) return
    setDraft('')
    await onSend(text)
  }

  return (
    <motion.div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      animate={{
        backgroundColor: isWing ? '#1c1c1c' : '#ececec',
      }}
      transition={{ duration: 0.45 }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 18%, #bbb 0%, transparent 52%), radial-gradient(ellipse at 72% 78%, #999 0%, transparent 48%)',
          filter: 'grayscale(1) blur(28px)',
          opacity: isWing ? 0.2 : 0.42,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background: isWing
            ? 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.62) 100%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.16) 100%)',
        }}
        aria-hidden
      />

      {/* 幕令环 */}
      <div
        className="relative z-10 mx-3 rounded-[16px] px-3 py-2.5"
        style={{
          marginTop: 'max(12px, calc(env(safe-area-inset-top, 0px) + 4px))',
          background: isWing ? qimuInk.glassDark : qimuInk.glass,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${isWing ? 'rgba(255,255,255,0.08)' : qimuInk.line}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-[52px]">
            <p
              className="text-[10px] tracking-wide"
              style={{ color: isWing ? 'rgba(255,255,255,0.45)' : qimuInk.mute }}
            >
              {turnUnit}
            </p>
            <p
              className="text-[18px] font-semibold tabular-nums"
              style={{
                color: isWing ? '#f2f2f2' : qimuInk.title,
                fontFamily: qimuInk.mono,
              }}
            >
              {turnsLeft}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[11px] tracking-wide"
              style={{ color: isWing ? 'rgba(255,255,255,0.5)' : qimuInk.mute }}
            >
              CURRENT DIRECTIVE
            </p>
            <p
              className="truncate text-[12.5px] font-medium"
              style={{ color: isWing ? '#f5f5f5' : qimuInk.title }}
            >
              {directive}
            </p>
            <div
              className="mt-1.5 h-[2px] overflow-hidden rounded-full"
              style={{ background: isWing ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: qimuInk.pearl }}
                animate={{ width: `${dive.mainStoryProgress}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 24 }}
              />
            </div>
          </div>
          <Pressable
            type="button"
            onClick={abortDive}
            className="shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium active:opacity-80"
            style={{
              color: isWing ? 'rgba(255,255,255,0.7)' : qimuInk.body,
              border: `1px solid ${isWing ? 'rgba(255,255,255,0.14)' : qimuInk.lineStrong}`,
            }}
          >
            落幕
          </Pressable>
        </div>
      </div>

      {/* 场景点击区：推进对白 */}
      <button
        type="button"
        className="relative z-10 min-h-0 flex-1 cursor-default"
        aria-label={hasMore ? '点击继续对白' : '场景'}
        onClick={advanceVn}
      />

      {/* 底部：单条 VN 对话框 + 操作 */}
      <div className="relative z-10 shrink-0 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1">
        {currentMsg ? (
          <VnDialogueBox
            msg={currentMsg}
            partnerName={dive.partnerName}
            userRole={dive.quest.roles.userRole}
            charRole={dive.quest.roles.charRole}
            footerHint={hasMore ? '▼ 点击继续' : '■'}
            onPress={advanceVn}
          />
        ) : (
          <div className="rounded-[6px] border px-3 py-6 text-center text-[13px]" style={{ color: qimuInk.mute }}>
            ……
          </div>
        )}

        {sending && atLatest ? (
          <p
            className="mt-1.5 text-center text-[11px]"
            style={{ color: isWing ? 'rgba(255,255,255,0.4)' : qimuInk.mute }}
          >
            ……
          </p>
        ) : null}
        {lastError ? (
          <p className="mt-1 text-center text-[11.5px]" style={{ color: '#a04444' }}>
            {lastError}
          </p>
        ) : null}

        <div className="mt-2">
          <StageActionBar
            disabled={actionsLocked}
            isWing={isWing}
            onOpenReplay={() => setReplayOpen(true)}
          />
        </div>

        <div className="mb-2 flex justify-center">
          <PersonaChannelToggle
            channel={dive.channel}
            onChange={setChannel}
            disabled={inputLocked}
          />
        </div>
        <div
          className="flex items-end gap-2 rounded-[8px] border px-2.5 py-2"
          style={{
            background: isWing ? qimuInk.wingInput : qimuInk.stageInput,
            borderColor: isWing ? 'rgba(180,160,120,0.35)' : qimuInk.line,
            boxShadow: isWing ? qimuInk.pearlGlow : 'none',
            opacity: inputLocked ? 0.45 : 1,
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={
              prologueActive
                ? '请先阅读开篇前提…'
                : tutorialActive
                  ? '请先完成上方高亮指引…'
                  : hasMore
                    ? '请先点对话框继续…'
                    : isWing
                      ? '幕间耳语…换行可拆成多句'
                      : '以幕中身份开口…换行可拆成多句'
            }
            disabled={inputLocked}
            className="min-h-[44px] max-h-[96px] flex-1 resize-none bg-transparent px-1 py-1 text-[13.5px] outline-none placeholder:text-[#a8a8a8]"
            style={{ color: qimuInk.title }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <Pressable
            type="button"
            disabled={!draft.trim() || inputLocked}
            onClick={() => void submit()}
            className="mb-0.5 shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold disabled:opacity-40"
            style={{ background: qimuInk.title, color: '#f7f7f7' }}
          >
            送出
          </Pressable>
        </div>
        <p
          className="mt-1.5 text-center text-[10.5px]"
          style={{ color: isWing ? 'rgba(255,255,255,0.35)' : qimuInk.mute }}
        >
          {hasMore ? '点击对话框或场景继续' : isWing ? '幕间 · NPC 冻结' : '幕前 · 可推进幕令'}
          {' · '}
          历史可看 LOG
        </p>
      </div>

      <FoldPointModal point={dive.activeFoldPoint} onChoose={resolveFoldPoint} />

      <VnReplayOverlay
        open={replayOpen}
        dive={dive}
        startIndex={safeIndex}
        onClose={() => setReplayOpen(false)}
        onResumeAt={jumpToMessage}
      />

      <ProloguePanel
        open={prologueActive}
        fileCode={dive.quest.fileCode}
        theme={dive.quest.theme}
        body={dive.prologueBody}
        onDismiss={dismissPrologue}
      />

      <AnimatePresence>
        {tutorialActive ? (
          <TutorialGuideOverlay
            steps={dive.tutorialSteps}
            index={dive.tutorialStepIndex}
            onNext={advanceTutorial}
            onSkip={skipTutorial}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
