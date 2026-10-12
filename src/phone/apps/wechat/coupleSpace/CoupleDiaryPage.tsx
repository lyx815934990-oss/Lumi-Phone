import { BookHeart, ChevronLeft, Feather, Loader2, MessageCircle, PenLine } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCurrentApiConfig } from '../../api/ApiSettingsContext'
import { personaDb } from '../newFriendsPersona/idb'
import { CoupleFloatParticles } from './CoupleMotionDecor'
import { fetchCoupleDiaryCharAction } from './coupleDiaryCharAi'
import {
  formatCoupleBookmarkLabel,
  toLocalDateKey,
  type CoupleDiaryCharActionKind,
  type CoupleDiaryEntry,
} from './coupleSpaceTypes'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

type DaySpread = {
  dateKey: string
  charEntry: CoupleDiaryEntry | null
  userEntry: CoupleDiaryEntry | null
}

function AvatarDot({
  url,
  name,
}: {
  url?: string
  name: string
}) {
  if (url?.trim()) {
    return (
      <img
        src={url.trim()}
        alt=""
        className="h-5 w-5 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FBEFEA] text-[10px] font-medium text-[#B87A6A]">
      {name.slice(0, 1)}
    </span>
  )
}

function formatEntryDate(ms: number): string {
  return new Date(ms).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  })
}

function MemoryMark({ active }: { active?: boolean }) {
  if (!active) return null
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-[#FBEFEA] px-1.5 py-0.5 text-[9px] font-medium text-[#B87A6A]"
      title="已同步进对方记忆"
    >
      <BookHeart className="h-3 w-3" strokeWidth={1.75} aria-hidden />
      记得
    </span>
  )
}

export function CoupleDiaryPage({
  characterId,
  charName,
  userName,
  charAvatarUrl,
  userAvatarUrl,
  onBack,
}: {
  characterId: string
  charName: string
  userName: string
  charAvatarUrl?: string
  userAvatarUrl?: string
  onBack: () => void
}) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const room = useCoupleSpaceStore((s) => s.getRoom(characterId) ?? s.ensureRoom(characterId))
  const appendDiaryEntry = useCoupleSpaceStore((s) => s.appendDiaryEntry)
  const revealDiaryEntry = useCoupleSpaceStore((s) => s.revealDiaryEntry)
  const setDiaryIncludeInMemory = useCoupleSpaceStore((s) => s.setDiaryIncludeInMemory)
  const setDiaryCharActionResponse = useCoupleSpaceStore((s) => s.setDiaryCharActionResponse)

  const todayKey = toLocalDateKey()
  const [activeKey, setActiveKey] = useState(todayKey)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [includeInMemoryDraft, setIncludeInMemoryDraft] = useState(false)
  const [wantComment, setWantComment] = useState(false)
  const [wantContinue, setWantContinue] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionHint, setActionHint] = useState<string | null>(null)

  const spreads = useMemo(() => {
    const map = new Map<string, DaySpread>()
    const ensure = (key: string): DaySpread => {
      let row = map.get(key)
      if (!row) {
        row = { dateKey: key, charEntry: null, userEntry: null }
        map.set(key, row)
      }
      return row
    }
    ensure(todayKey)
    for (const e of room?.diary ?? []) {
      const key = toLocalDateKey(e.createdAt)
      const row = ensure(key)
      if (e.author === 'char') {
        if (!row.charEntry || e.createdAt > row.charEntry.createdAt) row.charEntry = e
      } else if (!row.userEntry || e.createdAt > row.userEntry.createdAt) {
        row.userEntry = e
      }
    }
    return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  }, [room?.diary, todayKey])

  const active = spreads.find((s) => s.dateKey === activeKey) ?? spreads[0]
  const charSealed =
    active?.charEntry?.author === 'char' && active.charEntry.revealedToPeerAt == null
  const userWritten = !!active?.userEntry?.content?.trim()
  const isToday = active?.dateKey === todayKey
  const dayHasMemoryShare = !!(
    (active?.userEntry?.includeInMemory === true) ||
    (room?.diary ?? []).some(
      (e) => toLocalDateKey(e.createdAt) === active?.dateKey && e.includeInMemory === true,
    )
  )

  const runCharActions = async (
    entry: CoupleDiaryEntry,
    kinds: CoupleDiaryCharActionKind[],
  ) => {
    if (!kinds.length) return
    setActionBusy(true)
    setActionHint(null)
    try {
      const ch = await personaDb.getCharacter(characterId).catch(() => null)
      let commentText = ''
      let continueText = ''
      let missed = false
      for (const kind of kinds) {
        const res = await fetchCoupleDiaryCharAction({
          api: apiConfig,
          kind,
          diaryContent: entry.content,
          character: ch,
          charDisplayName: charName,
          userDisplayName: userName,
          relationshipStage: room?.binding?.relationshipStageAtBind,
        })
        const text = res?.text?.trim() ?? ''
        if (!text) {
          missed = true
          continue
        }
        if (kind === 'comment') commentText = text
        else continueText = text
      }
      if (!commentText && !continueText) {
        setActionHint('模型没有返回内容，未写入回复')
        return
      }
      if (commentText) {
        setDiaryCharActionResponse(characterId, entry.id, commentText)
      }
      if (continueText) {
        setDiaryCharActionResponse(characterId, entry.id, continueText, {
          appendContinueAsCharPage: true,
          keepPriorResponse: !!commentText,
        })
      }
      setActionHint(
        missed
          ? '有一项模型没有返回，只保存了生成成功的部分'
          : kinds.includes('continue') && kinds.includes('comment')
            ? '对方留下了评论，并续写了一页'
            : kinds.includes('continue')
              ? '对方已续写一页'
              : '对方留下了评论',
      )
    } catch {
      setActionHint('请求失败，请稍后重试')
    } finally {
      setActionBusy(false)
    }
  }

  const submitUserPage = () => {
    const text = draft.trim()
    if (!text || !active || actionBusy) return
    const requested: CoupleDiaryCharActionKind[] = []
    if (wantComment) requested.push('comment')
    if (wantContinue) requested.push('continue')
    const row = appendDiaryEntry(characterId, {
      author: 'user',
      content: text,
      revealedToPeerAt: Date.now(),
      createdAt: isToday
        ? Date.now()
        : new Date(`${active.dateKey}T12:00:00`).getTime(),
      includeInMemory: includeInMemoryDraft === true,
      ...(requested.length ? { charActions: { requested } } : {}),
    })
    setDraft('')
    setComposing(false)
    setIncludeInMemoryDraft(false)
    setWantComment(false)
    setWantContinue(false)
    if (row && requested.length) {
      void runCharActions(row, requested)
    }
  }

  return (
    <div className="couple-space-root">
      <header className="couple-space-header" style={{ paddingLeft: 18, paddingRight: 18 }}>
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FBEFEA] active:opacity-80"
          aria-label="返回"
        >
          <ChevronLeft className="h-[19px] w-[19px] text-[#4A3A35]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="couple-space-title text-[16px] text-[#4A3A35]">共写日记</h1>
          <p className="text-[11px] text-[#B99A8E]">左右一页 · 分享记忆须主动开启</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="cs-diary-book">
          <CoupleFloatParticles
            delays={[0.2, 1.1, 2.3, 3.1]}
            bottoms={[8, 20, 14, 28]}
            lefts={[12, 28, 62, 84]}
          />
          <div className="cs-diary-spine" aria-hidden />

          <div className="cs-diary-page">
            <div className="flex items-center gap-1.5">
              <AvatarDot url={charAvatarUrl} name={charName} />
              <p className="min-w-0 truncate text-[11px] text-[#B99A8E]">
                {charName}
                {active?.charEntry
                  ? ` · ${formatEntryDate(active.charEntry.createdAt)}`
                  : active
                    ? ` · ${formatCoupleBookmarkLabel(active.dateKey)}`
                    : ''}
              </p>
            </div>
            {charSealed && active?.charEntry ? (
              <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-[14px] bg-[#FBEFEA] px-3 py-6 text-center">
                <p className="text-[12px] text-[#B99A8E]">对方还在写…</p>
                <button
                  type="button"
                  className="mt-2 text-[12px] font-medium text-[#B87A6A]"
                  onClick={() => revealDiaryEntry(characterId, active.charEntry!.id)}
                >
                  翻开日记
                </button>
              </div>
            ) : active?.charEntry?.content?.trim() ? (
              <p className="cs-diary-body">{active.charEntry.content}</p>
            ) : (
              <p className="mt-10 text-center text-[12px] leading-relaxed text-[#C9A99C]">
                这一页还空着
                <br />
                等对方写下来
              </p>
            )}
          </div>

          <div className="cs-diary-page cs-diary-page--right">
            {userWritten && active?.userEntry ? (
              <>
                <div className="flex items-center gap-1.5">
                  <AvatarDot url={userAvatarUrl} name={userName} />
                  <p className="min-w-0 truncate text-[11px] text-[#B99A8E]">
                    {userName} · {formatEntryDate(active.userEntry.createdAt)}
                  </p>
                  <MemoryMark active={active.userEntry.includeInMemory === true} />
                </div>
                <p className="cs-diary-body">{active.userEntry.content}</p>

                <label className="cs-diary-mem-toggle mt-3">
                  <input
                    type="checkbox"
                    checked={active.userEntry.includeInMemory === true}
                    onChange={(e) =>
                      setDiaryIncludeInMemory(characterId, active.userEntry!.id, e.target.checked)
                    }
                  />
                  <span>同步进 {charName} 的记忆</span>
                </label>

                {active.userEntry.charActions?.response?.trim() ? (
                  <div className="cs-diary-char-response">
                    <p className="mb-1 text-[10px] font-medium tracking-wide text-[#B99A8E]">
                      {active.userEntry.charActions.requested.includes('comment')
                        ? `${charName} 的评论`
                        : `${charName} 的续写`}
                    </p>
                    <p className="text-[12px] leading-relaxed text-[#6A5248]">
                      {active.userEntry.charActions.response}
                    </p>
                  </div>
                ) : null}

                {!active.userEntry.charActions?.response && !actionBusy ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="cs-diary-action-chip"
                      onClick={() => void runCharActions(active.userEntry!, ['comment'])}
                    >
                      <MessageCircle className="h-3 w-3" strokeWidth={1.75} />
                      求评论
                    </button>
                    <button
                      type="button"
                      className="cs-diary-action-chip"
                      onClick={() => void runCharActions(active.userEntry!, ['continue'])}
                    >
                      <PenLine className="h-3 w-3" strokeWidth={1.75} />
                      邀请续写
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-right text-[11px] text-[#C9A99C]">轮到你写了</p>
                <button
                  type="button"
                  className="cs-diary-empty"
                  onClick={() => setComposing(true)}
                >
                  <Feather className="h-[22px] w-[22px] text-[#EAC7BC]" strokeWidth={1.5} />
                  <span className="text-[12px] text-[#C9A99C]">点这里，写下今天</span>
                </button>
              </>
            )}
          </div>
        </div>

        {actionBusy ? (
          <div className="mx-[18px] mt-3 flex items-center gap-2 rounded-[12px] bg-[#FBEFEA] px-3 py-2.5 text-[12px] text-[#B87A6A]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            {charName} 正在写回应…
          </div>
        ) : actionHint ? (
          <p className="mx-[18px] mt-3 text-center text-[11px] text-[#B99A8E]">{actionHint}</p>
        ) : null}

        {composing && !userWritten ? (
          <div className="cs-diary-compose">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[#B99A8E]">
              <PenLine className="h-3.5 w-3.5" strokeWidth={1.6} />
              写下这一页
            </div>
            <textarea
              className="min-h-[96px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-[#4A3A35] outline-none placeholder:text-[#C9A99C]"
              placeholder={`想对 ${charName} 说的…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />

            <div className="cs-diary-compose-opts">
              <label className="cs-diary-mem-toggle">
                <input
                  type="checkbox"
                  checked={includeInMemoryDraft}
                  onChange={(e) => setIncludeInMemoryDraft(e.target.checked)}
                />
                <span>同步进 {charName} 的记忆</span>
              </label>
              <p className="text-[10px] leading-relaxed text-[#C9A99C]">
                默认关闭：只是想写下来。打开后才会进入对方聊天 / 约会的可引用记忆。
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`cs-diary-action-chip ${wantComment ? 'cs-diary-action-chip--on' : ''}`}
                  onClick={() => setWantComment((v) => !v)}
                >
                  <MessageCircle className="h-3 w-3" strokeWidth={1.75} />
                  求评论
                </button>
                <button
                  type="button"
                  className={`cs-diary-action-chip ${wantContinue ? 'cs-diary-action-chip--on' : ''}`}
                  onClick={() => setWantContinue((v) => !v)}
                >
                  <PenLine className="h-3 w-3" strokeWidth={1.75} />
                  邀请续写
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#C9A99C]">
                评论 / 续写与「纳入记忆」互不耦合：可只让对方这一次看到并回应，不必长期记住。
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full py-2.5 text-[13px] text-[#B99A8E]"
                onClick={() => {
                  setComposing(false)
                  setDraft('')
                  setIncludeInMemoryDraft(false)
                  setWantComment(false)
                  setWantContinue(false)
                }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={!draft.trim() || actionBusy}
                className="flex-[1.4] rounded-full py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg, #E8B4A8, #D99C90)' }}
                onClick={submitUserPage}
              >
                写下这一页
              </button>
            </div>
          </div>
        ) : null}

        <div className="cs-diary-bookmarks">
          {spreads.map((s) => {
            const shared = (room?.diary ?? []).some(
              (e) => toLocalDateKey(e.createdAt) === s.dateKey && e.includeInMemory === true,
            )
            return (
              <button
                key={s.dateKey}
                type="button"
                className={`cs-diary-bookmark ${
                  s.dateKey === active?.dateKey ? 'cs-diary-bookmark--active' : ''
                }`}
                onClick={() => {
                  setActiveKey(s.dateKey)
                  setComposing(false)
                  setDraft('')
                }}
              >
                {shared ? (
                  <BookHeart className="mr-0.5 inline h-3 w-3 opacity-80" strokeWidth={1.75} />
                ) : null}
                {s.dateKey === todayKey ? '今天' : formatCoupleBookmarkLabel(s.dateKey)}
              </button>
            )
          })}
        </div>
        {dayHasMemoryShare ? (
          <p className="mx-[18px] mt-2 text-center text-[10px] text-[#C9A99C]">
            带心形书签的日子里，有内容已同步进对方记忆
          </p>
        ) : null}
      </div>
    </div>
  )
}
