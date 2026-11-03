import { BookPlus, Check, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Pressable } from '../../components/Pressable'
import { listMarketHits, searchRemoteWordbooks, type RemoteBookHit } from './bookSearchApi'
import type { StudyingBookEntry } from './langStudyTypes'
import { LS } from './langStudyTheme'
import { getBookLessons, LANG_LABEL } from './wordbooks/catalog'
import { coverHintForBookId } from './wordbooks/coverHints'

type Props = {
  studyingBooks: StudyingBookEntry[]
  onAdd: (entry: StudyingBookEntry) => void
  onSetActive: (localBookId: string) => void
}

function CoverThumb({ url, title }: { url?: string; title: string }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) {
    return (
      <div
        className="flex h-[96px] w-[72px] shrink-0 flex-col items-center justify-center rounded-lg border text-center text-[10px] font-medium leading-tight"
        style={{ borderColor: LS.hairline, background: LS.soft, color: LS.accent }}
      >
        <span className="px-1">{title.slice(0, 6) || '词本'}</span>
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      className="h-[96px] w-[72px] shrink-0 rounded-lg border object-cover"
      style={{ borderColor: LS.hairline, background: LS.soft }}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  )
}

export function WordbookSearchPanel({ studyingBooks, onAdd, onSetActive }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<RemoteBookHit[]>(() => listMarketHits())
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState('国内本地教材库 · 输入即可搜')

  const studyingIds = useMemo(
    () => new Set(studyingBooks.map((b) => b.localBookId)),
    [studyingBooks],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setHits(listMarketHits())
      setLoading(false)
      setHint('国内本地教材库 · 输入即可搜')
      return
    }
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      void searchRemoteWordbooks(q, ac.signal)
        .then((res) => {
          if (ac.signal.aborted) return
          setHits(res.hits)
          setHint(
            res.errors.length
              ? `本地结果优先（外网增强：${res.errors[0]}）`
              : '已匹配本地词表 · 可加入在学',
          )
        })
        .catch((err) => {
          if (ac.signal.aborted) return
          setHits(listMarketHits().filter((h) => h.title.includes(q) || (h.localBook?.searchAliases || []).some((a) => a.includes(q))))
          setHint(err instanceof Error ? err.message : '搜索异常，已回退本地')
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    }, 220)
    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const addHit = (hit: RemoteBookHit) => {
    const book = hit.localBook
    if (!book) return
    onAdd({
      localBookId: book.id,
      title: hit.title || book.title,
      coverUrl: hit.coverUrl || coverHintForBookId(book.id),
      wordCount: book.wordCount,
      remoteId: hit.remoteId,
      sourceLabel: hit.source === 'local' ? '本地教材库' : hit.source === 'openlibrary' ? 'Open Library' : 'Google Books',
      addedAt: Date.now(),
    })
    onSetActive(book.id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            style={{ color: LS.mist }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜：大家的日语、标日、N5…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-10 text-[14px] outline-none"
            style={{ borderColor: LS.hairline, background: LS.card, color: LS.ink }}
          />
          {loading ? (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin"
              style={{ color: LS.accent }}
            />
          ) : null}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: LS.mist }}>
          {hint}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {hits.length === 0 ? (
          <p className="py-10 text-center text-[13px]" style={{ color: LS.mist }}>
            没有匹配的教材 / 词本
          </p>
        ) : (
          <ul className="space-y-2">
            {hits.map((hit) => {
              const book = hit.localBook
              const inShelf = book ? studyingIds.has(book.id) : false
              const lessonCount = hit.lessonCount || (book ? getBookLessons(book.id).length : 0)
              return (
                <li
                  key={hit.remoteId}
                  className="flex gap-3 rounded-2xl border p-3"
                  style={{ borderColor: LS.hairline, background: LS.card }}
                >
                  <CoverThumb url={hit.coverUrl} title={hit.title} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-snug" style={{ color: LS.ink }}>
                      {hit.title}
                    </p>
                    {hit.subtitle ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px]" style={{ color: LS.mist }}>
                        {hit.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px]" style={{ color: LS.mist }}>
                      {[hit.authors.slice(0, 2).join('、'), hit.source === 'local' ? '本地可刷' : hit.source]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {book ? (
                      <p className="mt-1.5 text-[12px] font-medium" style={{ color: LS.accent }}>
                        {book.wordCount} 词
                        {lessonCount > 0 ? ` · ${lessonCount} 课按序` : ''}
                        {' · '}
                        {LANG_LABEL[book.lang]}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12px]" style={{ color: LS.warn }}>
                        暂无对应本地词表
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pressable
                        type="button"
                        disabled={!book}
                        onClick={() => addHit(hit)}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
                        style={{ background: inShelf ? LS.mist : LS.accent }}
                      >
                        {inShelf ? (
                          <>
                            <Check className="size-3.5" />
                            已在学
                          </>
                        ) : (
                          <>
                            <BookPlus className="size-3.5" />
                            加入在学词本
                          </>
                        )}
                      </Pressable>
                      {inShelf && book ? (
                        <Pressable
                          type="button"
                          onClick={() => onSetActive(book.id)}
                          className="rounded-full border px-3 py-1.5 text-[12px]"
                          style={{ borderColor: LS.hairline, color: LS.ink }}
                        >
                          设为当前
                        </Pressable>
                      ) : null}
                    </div>
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
