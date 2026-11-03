import { ArrowLeft, Eye, EyeOff, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Pressable } from '../../components/Pressable'
import type { LangStudyLang, LangStudyWord } from './langStudyTypes'
import { LS } from './langStudyTheme'
import { speakWord, stopSpeaking } from './speakWord'

export type StudyPhase = 'review' | 'learn'

type Props = {
  phase: StudyPhase
  words: LangStudyWord[]
  title: string
  lang: LangStudyLang
  autoSpeak: boolean
  onAutoSpeakChange: (v: boolean) => void
  onBack: () => void
  /** learn: remembered；review: known */
  onResult: (wordId: string, ok: boolean) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function exampleLine(w: LangStudyWord): string | undefined {
  if (w.example?.trim()) return w.example.trim()
  if (w.phonetic && w.meaning) return `${w.word}（${w.phonetic}）：${w.meaning}`
  if (w.meaning) return `${w.word} — ${w.meaning}`
  return undefined
}

export function StudySession({
  phase,
  words,
  title,
  lang,
  autoSpeak,
  onAutoSpeakChange,
  onBack,
  onResult,
}: Props) {
  const queue = useMemo(() => {
    if (phase === 'review') return shuffle(words)
    return words
  }, [words, phase])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [mode, setMode] = useState<'flash' | 'quiz'>('flash')

  const current = queue[index]
  const done = index >= queue.length

  // 队列在进入会话时已冻结；仅换阶段时重置进度
  useEffect(() => {
    setIndex(0)
    setRevealed(phase === 'learn')
    setQuizFeedback(null)
    setMode('flash')
  }, [phase])

  useEffect(() => {
    if (!current) return
    if (phase === 'learn' && autoSpeak) {
      speakWord(current.phonetic || current.word, lang === 'ja' ? 'ja' : 'en')
    }
    return () => stopSpeaking()
  }, [current?.id, phase, autoSpeak, lang])

  const quizOptions = useMemo(() => {
    if (!current || mode !== 'quiz' || phase !== 'review') return []
    const others = shuffle(words.filter((w) => w.id !== current.id)).slice(0, 3)
    return shuffle([current, ...others])
  }, [current, mode, words, phase])

  const advance = (ok: boolean) => {
    if (!current) return
    onResult(current.id, ok)
    setRevealed(phase === 'learn')
    setQuizFeedback(null)
    setIndex((i) => i + 1)
  }

  const phaseLabel = phase === 'review' ? '今日复习' : '学新词'
  const speakLang = lang === 'ja' ? 'ja' : 'en'

  if (done || !current) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ background: LS.pageBg }}>
        <header
          className="flex shrink-0 items-center gap-2 px-3 pb-3"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }}
        >
          <Pressable
            type="button"
            aria-label="返回"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: LS.ink }}
          >
            <ArrowLeft className="size-5" />
          </Pressable>
          <h1 className="text-[17px] font-semibold" style={{ color: LS.ink }}>
            {phaseLabel}完成
          </h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <p className="text-[22px] font-semibold" style={{ color: LS.ink }}>
            {phase === 'review' ? '复习' : '新词'} {queue.length} 个已完成
          </p>
          <p className="mt-2 text-[14px]" style={{ color: LS.mist }}>
            {phase === 'review'
              ? '可以开始学新词了（若仍有到期词会继续锁住）'
              : '进度已按遗忘曲线安排下次复习'}
          </p>
          <Pressable
            type="button"
            onClick={onBack}
            className="mt-8 rounded-full px-6 py-3 text-[15px] font-medium text-white"
            style={{ background: LS.accent }}
          >
            回到首页
          </Pressable>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: LS.pageBg }}>
      <header
        className="shrink-0 border-b px-3 pb-3"
        style={{
          borderColor: LS.hairline,
          paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
          background: 'rgba(244,247,245,0.96)',
        }}
      >
        <div className="flex items-center gap-2">
          <Pressable
            type="button"
            aria-label="返回"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: LS.ink }}
          >
            <ArrowLeft className="size-5" />
          </Pressable>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold" style={{ color: LS.ink }}>
              {phaseLabel} · {title}
            </h1>
            <p className="text-[12px]" style={{ color: LS.mist }}>
              {index + 1} / {queue.length}
            </p>
          </div>
          {phase === 'review' ? (
            <div className="flex rounded-full border p-0.5 text-[12px]" style={{ borderColor: LS.hairline }}>
              <button
                type="button"
                onClick={() => {
                  setMode('flash')
                  setQuizFeedback(null)
                  setRevealed(false)
                }}
                className="rounded-full px-2.5 py-1"
                style={{
                  background: mode === 'flash' ? LS.accent : 'transparent',
                  color: mode === 'flash' ? '#fff' : LS.mist,
                }}
              >
                刷卡
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('quiz')
                  setQuizFeedback(null)
                  setRevealed(false)
                }}
                className="rounded-full px-2.5 py-1"
                style={{
                  background: mode === 'quiz' ? LS.accent : 'transparent',
                  color: mode === 'quiz' ? '#fff' : LS.mist,
                }}
              >
                测验
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-1.5 text-[11px]" style={{ color: LS.mist }}>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => onAutoSpeakChange(e.target.checked)}
                className="size-3.5 accent-[#2f6b4f]"
              />
              自动发音
            </label>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: LS.soft }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((index + 1) / Math.max(1, queue.length)) * 100}%`,
              background: LS.accent,
            }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-5">
        <div
          className="flex min-h-[240px] flex-col items-center justify-center rounded-[24px] border px-5 py-8 text-center shadow-sm"
          style={{ background: LS.card, borderColor: LS.hairline }}
        >
          {current.lessonTitle || current.lesson ? (
            <p className="mb-3 text-[11px] font-medium" style={{ color: LS.accent }}>
              {current.lessonTitle || `第${current.lesson}课`}
            </p>
          ) : null}

          <p className="text-[32px] font-semibold tracking-tight" style={{ color: LS.ink }}>
            {current.word}
          </p>

          {phase === 'learn' || revealed ? (
            <>
              {current.phonetic ? (
                <p className="mt-2 text-[15px]" style={{ color: LS.mist }}>
                  {current.phonetic}
                </p>
              ) : null}
              <Pressable
                type="button"
                aria-label="发音"
                onClick={() => speakWord(current.phonetic || current.word, speakLang)}
                className="mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px]"
                style={{ borderColor: LS.hairline, color: LS.accent }}
              >
                <Volume2 className="size-3.5" />
                发音
              </Pressable>
            </>
          ) : current.phonetic && phase === 'review' && !revealed ? null : null}

          {phase === 'learn' ? (
            <div className="mt-5 w-full space-y-3 text-left">
              <div>
                <p className="text-[11px]" style={{ color: LS.mist }}>
                  意思
                </p>
                <p className="mt-0.5 text-[16px] leading-relaxed" style={{ color: LS.ink }}>
                  {current.meaning}
                </p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-[11px]" style={{ color: LS.mist }}>
                    读法
                  </p>
                  <p className="mt-0.5 text-[14px]" style={{ color: LS.ink }}>
                    {current.phonetic || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px]" style={{ color: LS.mist }}>
                    词性
                  </p>
                  <p className="mt-0.5 text-[14px]" style={{ color: LS.ink }}>
                    {current.pos || '—'}
                  </p>
                </div>
              </div>
              {exampleLine(current) ? (
                <div>
                  <p className="text-[11px]" style={{ color: LS.mist }}>
                    例句 / 提示
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: LS.mist }}>
                    {exampleLine(current)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : mode === 'flash' ? (
            <>
              {revealed ? (
                <div className="mt-6 w-full text-left">
                  <p className="text-[16px] leading-relaxed" style={{ color: LS.ink }}>
                    {current.meaning}
                  </p>
                  {current.phonetic ? (
                    <p className="mt-2 text-[13px]" style={{ color: LS.mist }}>
                      读法 {current.phonetic}
                    </p>
                  ) : null}
                  {current.pos ? (
                    <p className="mt-1 text-[13px]" style={{ color: LS.mist }}>
                      词性 {current.pos}
                    </p>
                  ) : null}
                  {exampleLine(current) ? (
                    <p className="mt-3 text-[13px] leading-relaxed" style={{ color: LS.mist }}>
                      {exampleLine(current)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <Pressable
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px]"
                  style={{ borderColor: LS.hairline, color: LS.accent }}
                >
                  <Eye className="size-4" />
                  显示释义
                </Pressable>
              )}
            </>
          ) : (
            <div className="mt-6 w-full space-y-2">
              {quizOptions.map((opt) => {
                const isAnswer = opt.id === current.id
                const show = quizFeedback !== null
                let bg: string = LS.soft
                let color: string = LS.ink
                if (show && isAnswer) {
                  bg = LS.accentSoft
                  color = LS.accent
                } else if (show && quizFeedback === 'wrong' && !isAnswer) {
                  bg = LS.card
                  color = LS.mist
                }
                return (
                  <Pressable
                    key={opt.id}
                    type="button"
                    disabled={quizFeedback !== null}
                    onClick={() => {
                      if (isAnswer) {
                        setQuizFeedback('correct')
                        window.setTimeout(() => advance(true), 450)
                      } else {
                        setQuizFeedback('wrong')
                        window.setTimeout(() => advance(false), 700)
                      }
                    }}
                    className="w-full rounded-xl border px-3 py-3 text-left text-[14px] leading-snug disabled:opacity-90"
                    style={{ borderColor: LS.hairline, background: bg, color }}
                  >
                    {opt.meaning}
                  </Pressable>
                )
              })}
            </div>
          )}
        </div>

        {phase === 'learn' || (phase === 'review' && mode === 'flash') ? (
          <div className="mt-auto flex gap-3 pb-2 pt-6">
            <Pressable
              type="button"
              disabled={phase === 'review' && !revealed}
              onClick={() => advance(false)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3.5 text-[15px] font-medium disabled:opacity-40"
              style={{ borderColor: LS.hairline, background: LS.card, color: LS.warn }}
            >
              <EyeOff className="size-4" />
              {phase === 'learn' ? '再看一眼' : '忘记了'}
            </Pressable>
            <Pressable
              type="button"
              disabled={phase === 'review' && !revealed}
              onClick={() => advance(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-medium text-white disabled:opacity-40"
              style={{ background: LS.accent }}
            >
              {phase === 'learn' ? '记住了' : '认识'}
            </Pressable>
          </div>
        ) : null}
      </div>
    </div>
  )
}
