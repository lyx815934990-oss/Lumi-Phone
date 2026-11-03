import { useMemo, useState } from 'react'

import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { Pressable } from '../../../components/Pressable'
import { AnimeCharacterPicker } from '../animeCharacterSearch'
import { bindCommentsToPost } from '../forumCommentsAi'
import { aiGenerateCustomFanfic } from '../forumCustomFicAi'
import { FORUM } from '../forumTheme'
import type { AnimeCharacterPick } from '../forumTypes'
import { pickPersonasForThread, type NetizenPersona } from '../netizenPersonas'
import { createForumPostId, useForumStore } from '../useForumStore'

function CountRow({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  onChange: (n: number) => void
}) {
  const w = step >= 100 ? 10 : 6
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5"
      style={{
        backgroundColor: FORUM.surface2,
        border: `1px solid ${FORUM.hairline}`,
      }}
    >
      <span style={{ fontSize: 13, color: FORUM.text, fontWeight: 500 }}>{label}</span>
      <div className="flex items-center gap-2">
        <Pressable
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex size-7 items-center justify-center rounded-full disabled:opacity-35"
          style={{ backgroundColor: FORUM.bgAccent, color: FORUM.text }}
        >
          −
        </Pressable>
        <span
          className="text-center font-bold tabular-nums"
          style={{ color: FORUM.accent, width: w * 4 }}
        >
          {value}
        </span>
        <Pressable
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex size-7 items-center justify-center rounded-full disabled:opacity-35"
          style={{ backgroundColor: FORUM.bgAccent, color: FORUM.text }}
        >
          +
        </Pressable>
      </div>
    </div>
  )
}

export function ForumCustomRequestSheet({
  open,
  onClose,
  characterId,
  fixedAuthor = null,
  onGenerated,
}: {
  open: boolean
  onClose: () => void
  characterId: string
  /** 指定写手执笔；缺省则随机网友 */
  fixedAuthor?: NetizenPersona | null
  onGenerated: (postId: string) => void
}) {
  const addPost = useForumStore((s) => s.addPost)
  const addComments = useForumStore((s) => s.addComments)
  const [picks, setPicks] = useState<AnimeCharacterPick[]>([])
  const [demand, setDemand] = useState('')
  const [targetWordCountText, setTargetWordCountText] = useState('700')
  const [commentCount, setCommentCount] = useState(6)
  const [interactionCount, setInteractionCount] = useState(2)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'gen'>('idle')

  const hint = useMemo(() => {
    if (phase === 'gen') {
      return fixedAuthor
        ? `${fixedAuthor.username} 正在一次生成正文与评论区…`
        : '正在一次生成正文与评论区…'
    }
    if (fixedAuthor) {
      return `由写手「${fixedAuthor.username}」执笔。搜索作品 → 多选角色 → 想看的梗可不填。正文与评论一次生成。`
    }
    return '搜索作品 → 多选角色 → 想看的梗可不填。正文与评论一次生成。'
  }, [phase, fixedAuthor])

  if (!open) return null

  const run = async () => {
    if (busy) return
    if (!picks.length) {
      window.alert('请先选择至少一个角色')
      return
    }
    setBusy(true)
    setPhase('gen')
    try {
      const apiConfig = await loadResolvedApiConfig('chatCard')
      const author =
        fixedAuthor ??
        pickPersonasForThread({
          count: 1,
          seed: `custom:${characterId}:${Date.now()}`,
        })[0]
      if (!author) throw new Error('人格库为空')

      const parsedWords = Math.floor(Number(targetWordCountText.trim()))
      const targetWordCount =
        Number.isFinite(parsedWords) && parsedWords > 0 ? parsedWords : 700
      const postId = createForumPostId()
      const fic = await aiGenerateCustomFanfic({
        apiConfig,
        author,
        picks,
        demand: demand.trim() || '按角色气质自由发挥一段日常互动，克制、有画面。',
        targetWordCount,
        commentCount,
        replyCount: interactionCount,
        seed: postId,
      })

      const digest = picks.map((p) => `${p.characterName}@${p.mediaTitle}`).join(' / ').slice(0, 120)
      addPost(characterId, {
        id: postId,
        kind: 'custom',
        characterId,
        authorPersonaId: fic.authorPersonaId,
        title: fic.title,
        body: fic.body,
        createdAt: Date.now(),
        publicContextDigest: digest,
        customPicks: picks,
        likeCount: 8 + Math.floor(Math.random() * 140),
      })
      if (fic.comments.length) {
        addComments(characterId, bindCommentsToPost(fic.comments, postId))
      }

      setPicks([])
      setDemand('')
      onGenerated(postId)
      onClose()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '生成失败，请重试')
    } finally {
      setBusy(false)
      setPhase('idle')
    }
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col"
      style={{ backgroundColor: FORUM.surface1 }}
      role="dialog"
      aria-label="搜索原作角色"
    >
      <div
        className="flex shrink-0 items-start justify-between gap-3 px-[19px]"
        style={{ paddingTop: `calc(${FORUM.headerPadTop} + 8px)` }}
      >
        <div className="min-w-0">
          <p className="font-semibold tracking-[0.12em]" style={{ fontSize: 10, color: FORUM.accent }}>
            自定义同人
          </p>
          <h2 className="font-semibold" style={{ fontSize: 18, color: FORUM.text, marginTop: 2 }}>
            {fixedAuthor ? `${fixedAuthor.username} · 搜索原作角色` : '搜索原作角色'}
          </h2>
          <p className="mt-1 leading-relaxed" style={{ fontSize: 12, color: FORUM.textMuted }}>
            {hint}
          </p>
        </div>
        <Pressable
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
          style={{
            border: `1px solid ${FORUM.hairline}`,
            backgroundColor: FORUM.bgAccent,
            color: FORUM.text,
          }}
        >
          返回
        </Pressable>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] py-3 [scrollbar-width:none]">
        <AnimeCharacterPicker selected={picks} onChange={setPicks} />
        <div className="mt-3">
          <label className="font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
            生成要求 <span style={{ fontWeight: 400 }}>（可不填）</span>
          </label>
          <textarea
            value={demand}
            onChange={(e) => setDemand(e.target.value)}
            disabled={busy}
            placeholder="例如：写他们在雨夜车站错过又重逢"
            rows={5}
            className="mt-1 w-full resize-y px-3 py-2.5 text-[14px] outline-none disabled:opacity-60"
            style={{
              borderRadius: 10,
              backgroundColor: FORUM.surface2,
              color: FORUM.text,
              border: `1px solid ${FORUM.hairline}`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div
            className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5"
            style={{
              backgroundColor: FORUM.surface2,
              border: `1px solid ${FORUM.hairline}`,
            }}
          >
            <span style={{ fontSize: 13, color: FORUM.text, fontWeight: 500 }}>正文约字数</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              disabled={busy}
              value={targetWordCountText}
              onChange={(e) => setTargetWordCountText(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              className="w-[5.5rem] shrink-0 rounded-[8px] px-2 py-1 text-center text-[14px] font-bold tabular-nums outline-none disabled:opacity-50"
              style={{
                backgroundColor: FORUM.bgAccent,
                color: FORUM.accent,
                border: `1px solid ${FORUM.hairline}`,
              }}
              aria-label="正文约字数"
            />
          </div>
          <CountRow
            label="评论条数"
            value={commentCount}
            min={2}
            max={12}
            disabled={busy}
            onChange={setCommentCount}
          />
          <CountRow
            label="楼中楼条数"
            value={interactionCount}
            min={0}
            max={6}
            disabled={busy}
            onChange={setInteractionCount}
          />
          <p style={{ fontSize: 11, color: FORUM.textMuted }}>点赞由系统随机，无需设置。</p>
        </div>
      </div>

      <div
        className="flex shrink-0 gap-2 px-[19px] pt-2"
        style={{
          borderTop: `0.5px solid ${FORUM.hairline}`,
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Pressable
          type="button"
          disabled={busy}
          onClick={onClose}
          className="flex-1 rounded-[12px] py-3 text-center text-[14px] font-medium disabled:opacity-50"
          style={{ background: FORUM.bgAccent, color: FORUM.text }}
        >
          取消
        </Pressable>
        <Pressable
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="flex-1 rounded-[12px] py-3 text-center text-[14px] font-bold disabled:opacity-60"
          style={{ background: FORUM.accent, color: FORUM.surface2 }}
        >
          {busy ? '生成中…' : '请网友执笔生成'}
        </Pressable>
      </div>
    </div>
  )
}
