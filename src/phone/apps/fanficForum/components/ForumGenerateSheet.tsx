import { useMemo, useState } from 'react'

import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'
import { bindCommentsToPost } from '../forumCommentsAi'
import { buildForumPublicContext } from '../forumPublicContext'
import {
  aiGenerateShipFanfic,
  type ForumFicPersonAs,
  type ForumFicPersonMode,
} from '../forumShipFicAi'
import { pickPersonasForThread, type NetizenPersona } from '../netizenPersonas'
import { createForumPostId, useForumStore } from '../useForumStore'

function randomPostLikes(): number {
  return 8 + Math.floor(Math.random() * 140)
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  onChange: (n: number) => void
}) {
  const w = step >= 100 ? 10 : 7
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-3"
      style={{
        backgroundColor: FORUM.surface2,
        border: `1px solid ${FORUM.hairline}`,
      }}
    >
      <div className="min-w-0">
        <p className="font-medium" style={{ fontSize: 13, color: FORUM.text }}>
          {label}
        </p>
        <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted }}>
          {hint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Pressable
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex size-8 items-center justify-center rounded-full text-[16px] font-semibold disabled:opacity-35"
          style={{ backgroundColor: FORUM.bgAccent, color: FORUM.text }}
          aria-label={`${label}减少`}
        >
          −
        </Pressable>
        <span
          className="text-center font-bold tabular-nums"
          style={{ fontSize: 15, color: FORUM.accent, width: w * 4 }}
        >
          {value}
        </span>
        <Pressable
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex size-8 items-center justify-center rounded-full text-[16px] font-semibold disabled:opacity-35"
          style={{ backgroundColor: FORUM.bgAccent, color: FORUM.text }}
          aria-label={`${label}增加`}
        >
          +
        </Pressable>
      </div>
    </div>
  )
}

export function ForumGenerateSheet({
  open,
  onClose,
  characterId,
  charDisplayName,
  userDisplayName,
  wechatAccountId,
  playerIdentityId,
  /** 指定写手执笔；缺省则随机网友 */
  fixedAuthor = null,
  onGenerated,
}: {
  open: boolean
  onClose: () => void
  characterId: string
  charDisplayName: string
  userDisplayName: string
  wechatAccountId?: string | null
  playerIdentityId?: string | null
  fixedAuthor?: NetizenPersona | null
  onGenerated: (postId: string) => void
}) {
  const addPost = useForumStore((s) => s.addPost)
  const addComments = useForumStore((s) => s.addComments)
  const [demand, setDemand] = useState('')
  const [personMode, setPersonMode] = useState<ForumFicPersonMode>('third')
  /** 第一人称：我是谁；第二人称：你是谁 */
  const [personAs, setPersonAs] = useState<ForumFicPersonAs>('user')
  const [includeRecentPlot, setIncludeRecentPlot] = useState(false)
  const [includeNetworkCast, setIncludeNetworkCast] = useState(false)
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
      return `将由「${fixedAuthor.username}」执笔，会参考你们的人设；可开近期剧情 / 人脉群像。生成要求可不填。正文与评论一次生成。`
    }
    return '会参考 user / char 人设；可开近期剧情或人脉关系（可能写成群像）。正文与评论一次生成。'
  }, [phase, fixedAuthor])

  if (!open) return null

  const run = async () => {
    if (busy) return
    setBusy(true)
    setPhase('gen')
    try {
      const apiConfig = await loadResolvedApiConfig('chatCard')
      const publicContext = await buildForumPublicContext({
        characterId,
        charDisplayName,
        userDisplayName,
        wechatAccountId,
        playerIdentityId,
        includeRecentPlot,
        includeNetworkCast,
      })
      const author =
        fixedAuthor ??
        pickPersonasForThread({
          count: 1,
          seed: `author:${characterId}:${Date.now()}`,
        })[0]
      if (!author) throw new Error('人格库为空')

      const parsedWords = Math.floor(Number(targetWordCountText.trim()))
      const targetWordCount =
        Number.isFinite(parsedWords) && parsedWords > 0 ? parsedWords : 700
      const postId = createForumPostId()
      const fic = await aiGenerateShipFanfic({
        apiConfig,
        author,
        publicContext,
        demand: demand.trim() || undefined,
        targetWordCount,
        personMode,
        personAs,
        commentCount,
        replyCount: interactionCount,
        seed: postId,
      })

      addPost(characterId, {
        id: postId,
        kind: 'ship',
        characterId,
        authorPersonaId: fic.authorPersonaId,
        title: fic.title,
        body: fic.body,
        createdAt: Date.now(),
        publicContextDigest: publicContext.digest,
        likeCount: randomPostLikes(),
        ...(fic.authorNote ? { authorNote: fic.authorNote } : {}),
      })
      if (fic.comments.length) {
        addComments(characterId, bindCommentsToPost(fic.comments, postId))
      }

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
      aria-label="本命同人"
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-[19px] [scrollbar-width:none]"
        style={{ paddingTop: `calc(${FORUM.headerPadTop} + 8px)` }}
      >
        <p className="font-semibold tracking-[0.12em]" style={{ fontSize: 10, color: FORUM.accent }}>
          本命约稿
        </p>
        <h2 className="font-semibold" style={{ fontSize: 18, color: FORUM.text, marginTop: 2 }}>
          {fixedAuthor ? `${fixedAuthor.username} · 写本命` : '请网友写 · 本命'}
        </h2>
        <p className="mt-2 leading-relaxed" style={{ fontSize: 13, color: FORUM.textSecondary }}>
          {hint}
        </p>
        <div
          className="mt-4 rounded-[12px] px-3.5 py-3"
          style={{
            backgroundColor: FORUM.surface2,
            border: `1px solid ${FORUM.hairline}`,
          }}
        >
          <p style={{ fontSize: 11, color: FORUM.textMuted }}>CP 线</p>
          <p className="mt-1 font-semibold" style={{ fontSize: 15, color: FORUM.text }}>
            {userDisplayName} × {charDisplayName}
          </p>
        </div>

        <div className="mt-3">
          <label className="font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
            生成要求 <span style={{ fontWeight: 400 }}>（可不填）</span>
          </label>
          <textarea
            value={demand}
            onChange={(e) => setDemand(e.target.value)}
            disabled={busy}
            placeholder="例如：写他们在雨夜车站错过又重逢；克制、不要告白"
            rows={5}
            className="mt-1.5 w-full resize-y px-3.5 py-3 text-[14px] outline-none disabled:opacity-60"
            style={{
              borderRadius: 12,
              backgroundColor: FORUM.surface2,
              color: FORUM.text,
              border: `1px solid ${FORUM.hairline}`,
              lineHeight: 1.55,
              minHeight: 96,
            }}
          />
        </div>

        <div
          className="mt-3 rounded-[12px] px-3.5 py-3"
          style={{
            backgroundColor: FORUM.surface2,
            border: `1px solid ${FORUM.hairline}`,
          }}
        >
          <p className="font-medium" style={{ fontSize: 13, color: FORUM.text }}>
            人称视角
          </p>
          <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted, lineHeight: 1.45 }}>
            正文叙述用第几人称
          </p>
          <div className="mt-2.5 flex gap-1.5">
            {(
              [
                { id: 'first' as const, label: '第一人称' },
                { id: 'second' as const, label: '第二人称' },
                { id: 'third' as const, label: '第三人称' },
              ] as const
            ).map((opt) => {
              const on = personMode === opt.id
              return (
                <Pressable
                  key={opt.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setPersonMode(opt.id)}
                  className="min-w-0 flex-1 rounded-[10px] py-2 text-center text-[12px] font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: on ? FORUM.accent : FORUM.bgAccent,
                    color: on ? FORUM.surface2 : FORUM.text,
                  }}
                >
                  {opt.label}
                </Pressable>
              )
            })}
          </div>

          {personMode === 'first' || personMode === 'second' ? (
            <div className="mt-3 border-t pt-3" style={{ borderColor: FORUM.hairline }}>
              <p className="font-medium" style={{ fontSize: 12.5, color: FORUM.text }}>
                {personMode === 'first' ? '我 / 你 · 主视角' : '「你」指谁'}
              </p>
              <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted, lineHeight: 1.45 }}>
                {personMode === 'first'
                  ? '「我」是谁；另一人用「你」'
                  : '正文里的「你」是 user 还是 char；另一人用名字或他/她'}
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                <Pressable
                  type="button"
                  disabled={busy}
                  onClick={() => setPersonAs('user')}
                  className="rounded-[10px] px-3 py-2.5 text-left disabled:opacity-50"
                  style={{
                    backgroundColor: personAs === 'user' ? FORUM.bgAccent : 'transparent',
                    border: `1px solid ${personAs === 'user' ? FORUM.accent : FORUM.hairline}`,
                  }}
                >
                  <p style={{ fontSize: 13, color: FORUM.text, fontWeight: 600 }}>
                    {personMode === 'first' ? `我 = ${userDisplayName}` : `你 = ${userDisplayName}`}
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted }}>
                    {personMode === 'first'
                      ? `你 = ${charDisplayName}（user 主视角）`
                      : `${charDisplayName} 用名字 / 他她（user 为「你」）`}
                  </p>
                </Pressable>
                <Pressable
                  type="button"
                  disabled={busy}
                  onClick={() => setPersonAs('char')}
                  className="rounded-[10px] px-3 py-2.5 text-left disabled:opacity-50"
                  style={{
                    backgroundColor: personAs === 'char' ? FORUM.bgAccent : 'transparent',
                    border: `1px solid ${personAs === 'char' ? FORUM.accent : FORUM.hairline}`,
                  }}
                >
                  <p style={{ fontSize: 13, color: FORUM.text, fontWeight: 600 }}>
                    {personMode === 'first' ? `我 = ${charDisplayName}` : `你 = ${charDisplayName}`}
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted }}>
                    {personMode === 'first'
                      ? `你 = ${userDisplayName}（char 主视角）`
                      : `${userDisplayName} 用名字 / 他她（char 为「你」）`}
                  </p>
                </Pressable>
              </div>
            </div>
          ) : null}
        </div>

        <Pressable
          type="button"
          disabled={busy}
          onClick={() => setIncludeRecentPlot((v) => !v)}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-[12px] px-3.5 py-3 text-left disabled:opacity-60"
          style={{
            backgroundColor: FORUM.surface2,
            border: `1px solid ${includeRecentPlot ? FORUM.accent : FORUM.hairline}`,
          }}
        >
          <div className="min-w-0">
            <p className="font-medium" style={{ fontSize: 13, color: FORUM.text }}>
              参考近期剧情
            </p>
            <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted, lineHeight: 1.45 }}>
              开启后会带上故事时间轴摘要来写；仍按「网友脑补」改写，不复述私聊。
            </p>
          </div>
          <span
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ backgroundColor: includeRecentPlot ? FORUM.accent : FORUM.bgAccent }}
            aria-hidden
          >
            <span
              className="absolute top-0.5 size-5 rounded-full transition-transform"
              style={{
                backgroundColor: FORUM.surface2,
                left: includeRecentPlot ? 22 : 2,
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
              }}
            />
          </span>
        </Pressable>

        <Pressable
          type="button"
          disabled={busy}
          onClick={() => setIncludeNetworkCast((v) => !v)}
          className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-[12px] px-3.5 py-3 text-left disabled:opacity-60"
          style={{
            backgroundColor: FORUM.surface2,
            border: `1px solid ${includeNetworkCast ? FORUM.accent : FORUM.hairline}`,
          }}
        >
          <div className="min-w-0">
            <p className="font-medium" style={{ fontSize: 13, color: FORUM.text }}>
              参考人脉关系设定
            </p>
            <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted, lineHeight: 1.45 }}>
              读取绑定 NPC 人设与关系表；可能写成群像，主 CP 仍是你们俩。
            </p>
          </div>
          <span
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ backgroundColor: includeNetworkCast ? FORUM.accent : FORUM.bgAccent }}
            aria-hidden
          >
            <span
              className="absolute top-0.5 size-5 rounded-full transition-transform"
              style={{
                backgroundColor: FORUM.surface2,
                left: includeNetworkCast ? 22 : 2,
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
              }}
            />
          </span>
        </Pressable>

        <div className="mt-3 flex flex-col gap-2.5">
          <div
            className="flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-3"
            style={{
              backgroundColor: FORUM.surface2,
              border: `1px solid ${FORUM.hairline}`,
            }}
          >
            <div className="min-w-0">
              <p className="font-medium" style={{ fontSize: 13, color: FORUM.text }}>
                正文约字数
              </p>
              <p className="mt-0.5" style={{ fontSize: 11, color: FORUM.textMuted }}>
                直接输入目标字数（不含作者的话）
              </p>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              disabled={busy}
              value={targetWordCountText}
              onChange={(e) => setTargetWordCountText(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              className="w-[5.5rem] shrink-0 rounded-[10px] px-2 py-1.5 text-center text-[15px] font-bold tabular-nums outline-none disabled:opacity-50"
              style={{
                backgroundColor: FORUM.bgAccent,
                color: FORUM.accent,
                border: `1px solid ${FORUM.hairline}`,
              }}
              aria-label="正文约字数"
            />
          </div>
          <Stepper
            label="评论条数"
            hint="一级评论条数"
            value={commentCount}
            min={2}
            max={12}
            disabled={busy}
            onChange={setCommentCount}
          />
          <Stepper
            label="楼中楼条数"
            hint="互动接话（挂在一级评论下）"
            value={interactionCount}
            min={0}
            max={6}
            disabled={busy}
            onChange={setInteractionCount}
          />
          <p className="px-0.5" style={{ fontSize: 11, color: FORUM.textMuted, lineHeight: 1.5 }}>
            点赞由系统随机生成。
          </p>
        </div>
        <div className="h-4" />
      </div>
      <div
        className="flex gap-2 px-[19px] pt-2"
        style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}
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
          {busy ? '生成中…' : '开始生成'}
        </Pressable>
      </div>
    </div>
  )
}
