import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Pressable } from '../../components/Pressable'
import type { LangStudyState, LangStudyWord } from './langStudyTypes'
import { LS } from './langStudyTheme'
import { getBookById, getBookLessons } from './wordbooks/catalog'

type Filter = 'all' | 'learned' | 'unlearned'

type Props = {
  bookId: string
  studyState: LangStudyState
  onBack: () => void
}

function isLearned(state: LangStudyState, bookId: string, wordId: string): boolean {
  const m = state.progress[bookId]?.[wordId]
  return !!m?.introduced && m.level >= 2
}

export function WordListPage({ bookId, studyState, onBack }: Props) {
  const book = getBookById(bookId)
  const [filter, setFilter] = useState<Filter>('all')
  const lessons = useMemo(() => getBookLessons(bookId), [bookId])

  const words = book?.words ?? []
  const learnedCount = useMemo(
    () => words.filter((w) => isLearned(studyState, bookId, w.id)).length,
    [words, studyState, bookId],
  )
  const unlearnedCount = words.length - learnedCount

  const matchFilter = (w: LangStudyWord) => {
    const learned = isLearned(studyState, bookId, w.id)
    if (filter === 'learned') return learned
    if (filter === 'unlearned') return !learned
    return true
  }

  const filteredLessons = useMemo(() => {
    if (!lessons.length) return []
    return lessons
      .map((unit) => ({
        ...unit,
        words: unit.words.filter(matchFilter),
      }))
      .filter((u) => u.words.length > 0)
  }, [lessons, filter, studyState, bookId])

  const flatFiltered = useMemo(() => words.filter(matchFilter), [words, filter, studyState, bookId])

  if (!book) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3" style={{ background: LS.pageBg }}>
        <p style={{ color: LS.mist }}>词本不存在</p>
        <Pressable type="button" onClick={onBack} className="rounded-full px-4 py-2 text-white" style={{ background: LS.accent }}>
          返回
        </Pressable>
      </div>
    )
  }

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: '全部', count: words.length },
    { id: 'learned', label: '已学', count: learnedCount },
    { id: 'unlearned', label: '未学', count: unlearnedCount },
  ]

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
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: LS.ink }}
          >
            <ArrowLeft className="size-5" />
          </Pressable>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold" style={{ color: LS.ink }}>
              {book.title}
            </h1>
            <p className="text-[11px]" style={{ color: LS.mist }}>
              {words.length} 词
              {lessons.length ? ` · ${lessons.length} 课` : ''}
              {' · '}
              已学 {learnedCount} / 未学 {unlearnedCount}
            </p>
          </div>
        </div>
        <div className="mt-3 flex rounded-full border p-0.5" style={{ borderColor: LS.hairline, background: LS.card }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className="flex-1 rounded-full py-1.5 text-[12px] font-medium"
              style={{
                background: filter === t.id ? LS.accent : 'transparent',
                color: filter === t.id ? '#fff' : LS.mist,
              }}
            >
              {t.label} {t.count}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-8">
        {lessons.length > 0 ? (
          filteredLessons.length === 0 ? (
            <p className="py-12 text-center text-[13px]" style={{ color: LS.mist }}>
              没有符合条件的单词
            </p>
          ) : (
            <div className="space-y-4">
              {filteredLessons.map((unit) => (
                <section key={unit.lesson}>
                  <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                    <h2 className="text-[13px] font-semibold" style={{ color: LS.accent }}>
                      {unit.title}
                    </h2>
                    <span className="text-[11px]" style={{ color: LS.mist }}>
                      {unit.words.length} 词
                    </span>
                  </div>
                  <ul
                    className="overflow-hidden rounded-2xl border"
                    style={{ borderColor: LS.hairline, background: LS.card }}
                  >
                    {unit.words.map((w, idx) => {
                      const learned = isLearned(studyState, bookId, w.id)
                      return (
                        <li
                          key={w.id}
                          className="flex items-start gap-2.5 px-3 py-2.5"
                          style={{
                            borderTop: idx === 0 ? undefined : `1px solid ${LS.hairline}`,
                          }}
                        >
                          {learned ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: LS.accent }} />
                          ) : (
                            <Circle className="mt-0.5 size-4 shrink-0" style={{ color: LS.mist }} />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium" style={{ color: LS.ink }}>
                              {w.word}
                              {w.phonetic ? (
                                <span className="ml-2 text-[12px] font-normal" style={{ color: LS.mist }}>
                                  {w.phonetic}
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: LS.mist }}>
                              {w.meaning}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )
        ) : flatFiltered.length === 0 ? (
          <p className="py-12 text-center text-[13px]" style={{ color: LS.mist }}>
            没有符合条件的单词
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border" style={{ borderColor: LS.hairline, background: LS.card }}>
            {flatFiltered.map((w, idx) => {
              const learned = isLearned(studyState, bookId, w.id)
              return (
                <li
                  key={w.id}
                  className="flex items-start gap-2.5 px-3 py-2.5"
                  style={{ borderTop: idx === 0 ? undefined : `1px solid ${LS.hairline}` }}
                >
                  {learned ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: LS.accent }} />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0" style={{ color: LS.mist }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium" style={{ color: LS.ink }}>
                      {w.word}
                      {w.phonetic ? (
                        <span className="ml-2 text-[12px] font-normal" style={{ color: LS.mist }}>
                          {w.phonetic}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[12px]" style={{ color: LS.mist }}>
                      {w.meaning}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
