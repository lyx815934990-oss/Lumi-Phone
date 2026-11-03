import { ArrowLeft, BookOpen, List, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable } from '../../components/Pressable'
import { useCustomization } from '../../CustomizationContext'
import { personaDb } from '../wechat/newFriendsPersona/idb'
import { BuddyNudgeBanner } from './BuddyNudgeBanner'
import { BuddyPickerSheet } from './BuddyPickerSheet'
import { LANG_STUDY_UNDER_DEV } from './langStudyDevFlags'
import { LangStudyUnderDev } from './LangStudyUnderDev'
import { StudySession, type StudyPhase } from './StudySession'
import { WordbookSearchPanel } from './WordbookSearchPanel'
import { WordListPage } from './WordListPage'
import {
  applyLearnResult,
  applyReviewResult,
  getTodayStudied,
  isTodayCheckedIn,
  loadLangStudyState,
  pickBuddyNudgeLine,
  removeStudyingBook,
  saveLangStudyState,
  countBookMastered,
  upsertStudyingBook,
} from './langStudyStore'
import { listDueReviewWords, listNewWords } from './langStudySrs'
import type { LangStudyBuddy, LangStudyState, LangStudyWord, StudyingBookEntry } from './langStudyTypes'
import { DEFAULT_LANG_STUDY_STATE } from './langStudyTypes'
import { LS } from './langStudyTheme'
import { getBookById, getBookLessons, LANG_LABEL, listBookMetas } from './wordbooks/catalog'

type Props = { onBack: () => void }

type Screen =
  | { name: 'home' }
  | { name: 'books' }
  | { name: 'study'; phase: StudyPhase; queue: LangStudyWord[] }
  | { name: 'wordlist'; bookId: string }

function LangStudyAppInner({ onBack }: Props) {
  const { state: phoneState } = useCustomization()
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [hydrated, setHydrated] = useState(false)
  const [studyState, setStudyState] = useState<LangStudyState>(DEFAULT_LANG_STUDY_STATE)
  const [roster, setRoster] = useState<LangStudyBuddy[]>([])
  const [buddyPickerOpen, setBuddyPickerOpen] = useState(false)

  const persist = useCallback(async (next: LangStudyState) => {
    setStudyState(next)
    try {
      await saveLangStudyState(next)
    } catch {
      /* ignore */
    }
  }, [])

  const addStudying = useCallback(
    (entry: StudyingBookEntry) => {
      setStudyState((prev) => {
        const next = upsertStudyingBook(prev, entry, true)
        void saveLangStudyState(next).catch(() => {})
        return next
      })
    },
    [],
  )

  const setActiveBook = useCallback((localBookId: string) => {
    setStudyState((prev) => {
      const next = { ...prev, activeBookId: localBookId }
      void saveLangStudyState(next).catch(() => {})
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loaded = await loadLangStudyState()
      if (cancelled) return
      setStudyState(loaded)
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const contacts = phoneState.wechatPersonaContacts
        const rows: LangStudyBuddy[] = (
          await Promise.all(
            contacts.map(async (c) => {
              let avatarUrl = c.avatarUrl?.trim() ?? ''
              let name = c.remarkName?.trim() || c.characterId
              try {
                const row = await personaDb.getCharacter(c.characterId)
                if (row?.name?.trim()) name = row.name.trim()
                if (row?.avatarUrl?.trim()) avatarUrl = row.avatarUrl.trim()
              } catch {
                /* ignore */
              }
              return { id: c.characterId, name, avatarUrl }
            }),
          )
        ).filter((x) => x.id)
        if (!cancelled) setRoster(rows)
      } catch {
        if (!cancelled) setRoster([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phoneState.wechatPersonaContacts])

  const activeBook = useMemo(() => getBookById(studyState.activeBookId), [studyState.activeBookId])
  const studiedToday = getTodayStudied(studyState)
  const checkedIn = isTodayCheckedIn(studyState)
  const buddies = useMemo(() => {
    const byId = new Map(roster.map((r) => [r.id, r]))
    return studyState.buddyCharacterIds.map((id) => byId.get(id)).filter(Boolean) as LangStudyBuddy[]
  }, [roster, studyState.buddyCharacterIds])

  const nudgeBuddy = buddies.length
    ? buddies[Math.floor(Date.now() / 86_400_000) % buddies.length]!
    : null

  const nudgeLine = nudgeBuddy
    ? pickBuddyNudgeLine({
        buddyName: nudgeBuddy.name,
        dailyGoal: studyState.dailyGoal,
        studiedToday,
        streak: studyState.streak,
        seed: Math.floor(Date.now() / 3_600_000) + (nudgeBuddy.id.length || 0),
      })
    : ''

  const dueWords = useMemo(() => {
    if (!activeBook) return []
    return listDueReviewWords(
      activeBook.words,
      studyState.progress[activeBook.id],
      Date.now(),
      80,
    )
  }, [activeBook, studyState.progress])

  const newWords = useMemo(() => {
    if (!activeBook) return []
    return listNewWords(
      activeBook.words,
      studyState.progress[activeBook.id],
      Math.max(5, studyState.dailyGoal),
    )
  }, [activeBook, studyState.dailyGoal, studyState.progress])

  const dueCount = dueWords.length
  const canLearnNew = dueCount === 0

  const onSessionResult = useCallback((phase: StudyPhase, wordId: string, ok: boolean) => {
    setStudyState((prev) => {
      if (!prev.activeBookId) return prev
      const next =
        phase === 'learn'
          ? applyLearnResult(prev, prev.activeBookId, wordId, ok)
          : applyReviewResult(prev, prev.activeBookId, wordId, ok)
      void saveLangStudyState(next).catch(() => {})
      return next
    })
  }, [])

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: LS.pageBg }}>
        <p className="text-[13px]" style={{ color: LS.mist }}>
          加载中…
        </p>
      </div>
    )
  }

  if (screen.name === 'study') {
    if (!activeBook) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6" style={{ background: LS.pageBg }}>
          <p style={{ color: LS.mist }}>请先选择词本</p>
          <Pressable
            type="button"
            onClick={() => setScreen({ name: 'books' })}
            className="rounded-full px-4 py-2 text-white"
            style={{ background: LS.accent }}
          >
            去选词本
          </Pressable>
        </div>
      )
    }
    const phase = screen.phase
    const sessionWords = screen.queue
    if (sessionWords.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6" style={{ background: LS.pageBg }}>
          <p style={{ color: LS.mist }}>
            {phase === 'review' ? '暂无到期复习' : '暂无新词，或已学完本词本'}
          </p>
          <Pressable
            type="button"
            onClick={() => setScreen({ name: 'home' })}
            className="rounded-full px-4 py-2 text-white"
            style={{ background: LS.accent }}
          >
            返回
          </Pressable>
        </div>
      )
    }
    return (
      <StudySession
        phase={phase}
        words={sessionWords}
        title={activeBook.title}
        lang={activeBook.lang}
        autoSpeak={studyState.autoSpeak}
        onAutoSpeakChange={(v) => {
          setStudyState((prev) => {
            const next = { ...prev, autoSpeak: v }
            void saveLangStudyState(next).catch(() => {})
            return next
          })
        }}
        onBack={() => setScreen({ name: 'home' })}
        onResult={(wordId, ok) => onSessionResult(phase, wordId, ok)}
      />
    )
  }

  if (screen.name === 'books') {
    return (
      <div className="flex h-full min-h-0 flex-col" style={{ background: LS.pageBg }}>
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
              onClick={() => setScreen({ name: 'home' })}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: LS.ink }}
            >
              <ArrowLeft className="size-5" />
            </Pressable>
            <h1 className="flex-1 text-center text-[17px] font-semibold" style={{ color: LS.ink }}>
              搜索词本
            </h1>
            <span className="w-10" />
          </div>
        </header>
        <WordbookSearchPanel
          studyingBooks={studyState.studyingBooks}
          onAdd={addStudying}
          onSetActive={(id) => {
            setActiveBook(id)
            setScreen({ name: 'home' })
          }}
        />
      </div>
    )
  }

  if (screen.name === 'wordlist') {
    return (
      <WordListPage
        bookId={screen.bookId}
        studyState={studyState}
        onBack={() => setScreen({ name: 'home' })}
      />
    )
  }

  // home (+ buddies sheet overlay)
  const goalPct = Math.min(100, Math.round((studiedToday / Math.max(1, studyState.dailyGoal)) * 100))

  return (
    <div className="relative flex h-full min-h-0 flex-col" style={{ background: LS.pageBg }}>
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
            aria-label="返回桌面"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: LS.ink }}
          >
            <ArrowLeft className="size-5" />
          </Pressable>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold" style={{ color: LS.ink }}>
              外语
            </h1>
            <p className="text-[12px]" style={{ color: LS.mist }}>
              背单词 · App 内搭子催更
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8">
        {studyState.buddyNudgeEnabled && nudgeBuddy && !checkedIn ? (
          <div className="mb-4">
            <BuddyNudgeBanner buddy={nudgeBuddy} line={nudgeLine} checkedIn={false} />
          </div>
        ) : null}
        {checkedIn && nudgeBuddy ? (
          <div className="mb-4">
            <BuddyNudgeBanner buddy={nudgeBuddy} line={nudgeLine} checkedIn />
          </div>
        ) : null}

        <section
          className="rounded-[22px] border px-4 py-4"
          style={{ background: LS.card, borderColor: LS.hairline }}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px]" style={{ color: LS.mist }}>
                今日进度
              </p>
              <p className="mt-1 text-[28px] font-semibold tabular-nums" style={{ color: LS.ink }}>
                {studiedToday}
                <span className="text-[15px] font-medium" style={{ color: LS.mist }}>
                  {' '}
                  / {studyState.dailyGoal}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px]" style={{ color: LS.mist }}>
                连续打卡
              </p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums" style={{ color: LS.accent }}>
                {studyState.streak} 天
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: LS.soft }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${goalPct}%`, background: LS.accent }}
            />
          </div>
          <p className="mt-2 text-[12px]" style={{ color: checkedIn ? LS.accent : LS.mist }}>
            {checkedIn ? '今日已打卡' : '刷词达到目标即可打卡'}
          </p>
        </section>

        <section
          className="mt-3 rounded-[22px] border px-4 py-4"
          style={{ background: LS.card, borderColor: LS.hairline }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4" style={{ color: LS.accent }} />
              <p className="text-[14px] font-semibold" style={{ color: LS.ink }}>
                在学词本
              </p>
            </div>
            <Pressable
              type="button"
              onClick={() => setScreen({ name: 'books' })}
              className="text-[13px] font-medium"
              style={{ color: LS.accent }}
            >
              搜索添加
            </Pressable>
          </div>
          {studyState.studyingBooks.length === 0 ? (
            <p className="mt-3 text-[13px]" style={{ color: LS.mist }}>
              还没有在学词本。搜「大家的日语初级1 / 初级2」或「标日上册 / 下册」分别加入。
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {studyState.studyingBooks.map((entry) => {
                const meta = getBookById(entry.localBookId)
                const active = studyState.activeBookId === entry.localBookId
                const wordCount = meta?.wordCount || entry.wordCount
                const displayTitle = meta?.title || entry.title
                return (
                  <li
                    key={entry.localBookId}
                    className="flex gap-3 rounded-xl border p-2.5"
                    style={{
                      borderColor: active ? LS.accent : LS.hairline,
                      background: active ? LS.accentSoft : LS.pageBg,
                    }}
                  >
                    {entry.coverUrl ? (
                      <img
                        src={entry.coverUrl}
                        alt=""
                        className="h-[72px] w-[54px] shrink-0 rounded-md object-cover"
                        style={{ background: LS.soft }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="flex h-[72px] w-[54px] shrink-0 items-center justify-center rounded-md text-[10px]"
                        style={{ background: LS.soft, color: LS.accent }}
                      >
                        词本
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold" style={{ color: LS.ink }}>
                        {displayTitle}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: LS.mist }}>
                        {wordCount} 词
                        {(() => {
                          const lc = getBookLessons(entry.localBookId).length
                          return lc > 0 ? ` · ${lc} 课` : ''
                        })()}
                        {meta ? ` · ${LANG_LABEL[meta.lang]}` : ''}
                        {active ? ' · 当前' : ''}
                        {' · 已掌握 '}
                        {countBookMastered(studyState, entry.localBookId)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {!active ? (
                          <Pressable
                            type="button"
                            onClick={() => setActiveBook(entry.localBookId)}
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                            style={{ background: LS.accent }}
                          >
                            设为当前
                          </Pressable>
                        ) : null}
                        <Pressable
                          type="button"
                          onClick={() => setScreen({ name: 'wordlist', bookId: entry.localBookId })}
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
                          style={{ borderColor: LS.hairline, color: LS.ink }}
                        >
                          <List className="size-3" />
                          单词表
                        </Pressable>
                        <Pressable
                          type="button"
                          aria-label="移出在学"
                          onClick={() => {
                            setStudyState((prev) => {
                              const next = removeStudyingBook(prev, entry.localBookId)
                              void saveLangStudyState(next).catch(() => {})
                              return next
                            })
                          }}
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
                          style={{ borderColor: LS.hairline, color: LS.mist }}
                        >
                          <Trash2 className="size-3" />
                          移出
                        </Pressable>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section
          className="mt-3 rounded-[22px] border px-4 py-4"
          style={{ background: LS.card, borderColor: LS.hairline }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4" style={{ color: LS.accent }} />
              <p className="text-[14px] font-semibold" style={{ color: LS.ink }}>
                监督搭子
              </p>
            </div>
            <Pressable
              type="button"
              onClick={() => setBuddyPickerOpen(true)}
              className="text-[13px] font-medium"
              style={{ color: LS.accent }}
            >
              {buddies.length ? '管理' : '添加'}
            </Pressable>
          </div>
          {buddies.length ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {buddies.slice(0, 5).map((b) => (
                  <span
                    key={b.id}
                    className="flex size-9 items-center justify-center overflow-hidden rounded-full border-2 text-[11px] font-semibold"
                    style={{ borderColor: LS.card, background: LS.soft, color: LS.accent }}
                    title={b.name}
                  >
                    {b.avatarUrl ? (
                      <img src={b.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      b.name.slice(0, 1)
                    )}
                  </span>
                ))}
              </div>
              <p className="min-w-0 flex-1 truncate text-[12px]" style={{ color: LS.mist }}>
                {buddies.map((b) => b.name).join('、')}
                {buddies.length > 5 ? ` 等 ${buddies.length} 人` : ''}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[13px]" style={{ color: LS.mist }}>
              从微信通讯录多选好友，只在本 App 催你打卡
            </p>
          )}
          <label className="mt-3 flex items-center justify-between gap-3 text-[13px]" style={{ color: LS.ink }}>
            <span>开启 App 内催更</span>
            <input
              type="checkbox"
              checked={studyState.buddyNudgeEnabled}
              onChange={(e) => void persist({ ...studyState, buddyNudgeEnabled: e.target.checked })}
              className="size-4 accent-[#2f6b4f]"
            />
          </label>
        </section>

        <section
          className="mt-4 rounded-[22px] border px-4 py-4"
          style={{ background: LS.card, borderColor: LS.hairline }}
        >
          <p className="text-[14px] font-semibold" style={{ color: LS.ink }}>
            今日学习
          </p>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: LS.mist }}>
            按遗忘曲线：先完成到期复习，再学新词。
          </p>
          <div className="mt-3 space-y-2">
            <Pressable
              type="button"
              disabled={!activeBook || dueCount === 0}
              onClick={() => setScreen({ name: 'study', phase: 'review', queue: dueWords })}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left disabled:opacity-40"
              style={{
                background: dueCount > 0 ? LS.accent : LS.soft,
                color: dueCount > 0 ? '#fff' : LS.mist,
              }}
            >
              <span className="text-[15px] font-semibold">① 复习单词</span>
              <span className="text-[13px] tabular-nums opacity-90">
                {activeBook ? (dueCount > 0 ? `${dueCount} 词到期` : '暂无到期') : '先选词本'}
              </span>
            </Pressable>
            <Pressable
              type="button"
              disabled={!activeBook || !canLearnNew || newWords.length === 0}
              onClick={() =>
                setScreen({
                  name: 'study',
                  phase: 'learn',
                  queue: newWords.slice(0, Math.max(5, studyState.dailyGoal)),
                })
              }
              className="flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left disabled:opacity-40"
              style={{
                borderColor: canLearnNew && newWords.length ? LS.accent : LS.hairline,
                background: LS.pageBg,
                color: canLearnNew && newWords.length ? LS.ink : LS.mist,
              }}
            >
              <span className="text-[15px] font-semibold">② 学新词</span>
              <span className="text-[13px] tabular-nums" style={{ color: LS.mist }}>
                {!activeBook
                  ? '先选词本'
                  : !canLearnNew
                    ? `先复习完 ${dueCount} 词`
                    : newWords.length
                      ? `本轮 ${Math.min(newWords.length, studyState.dailyGoal)} 词`
                      : '已学完'}
              </span>
            </Pressable>
          </div>
        </section>

        <div className="mt-3 space-y-2">
          <Pressable
            type="button"
            onClick={() => setScreen({ name: 'books' })}
            className="flex w-full items-center justify-center rounded-2xl border py-3 text-[14px] font-medium"
            style={{ borderColor: LS.hairline, background: LS.card, color: LS.ink }}
          >
            搜索教材 / 词本
          </Pressable>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: LS.mist }}>
          图书封面来自 Google Books / Open Library · 本地可刷词本 {listBookMetas().length} 套
        </p>
      </div>

      <BuddyPickerSheet
        open={buddyPickerOpen}
        roster={roster}
        selectedIds={studyState.buddyCharacterIds}
        onClose={() => setBuddyPickerOpen(false)}
        onConfirm={(ids) => {
          setStudyState((prev) => {
            const next = { ...prev, buddyCharacterIds: ids }
            void saveLangStudyState(next).catch(() => {})
            return next
          })
          setBuddyPickerOpen(false)
        }}
      />
    </div>
  )
}

/** 桌面「外语」：开发中时只进占位页 */
export function LangStudyApp({ onBack }: Props) {
  if (LANG_STUDY_UNDER_DEV) {
    return <LangStudyUnderDev onBack={onBack} />
  }
  return <LangStudyAppInner onBack={onBack} />
}
