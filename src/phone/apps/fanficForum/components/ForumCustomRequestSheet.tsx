import { useMemo, useState } from 'react'

import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { Pressable } from '../../../components/Pressable'
import { AnimeCharacterPicker } from '../animeCharacterSearch'
import { bindCommentsToPost, aiGenerateForumComments } from '../forumCommentsAi'
import { aiGenerateCustomFanfic } from '../forumCustomFicAi'
import { FORUM } from '../forumTheme'
import type { AnimeCharacterPick } from '../forumTypes'
import { pickPersonasForThread, type NetizenPersona } from '../netizenPersonas'
import { createForumPostId, useForumStore } from '../useForumStore'

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
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'fic' | 'comments'>('idle')

  const hint = useMemo(() => {
    if (phase === 'fic') {
      return fixedAuthor ? `${fixedAuthor.username} 写文中…` : '网友写文中…'
    }
    if (phase === 'comments') return '正在生成评论区…'
    if (fixedAuthor) {
      return `由写手「${fixedAuthor.username}」执笔。搜索作品 → 多选角色 → 写一句想看的梗。`
    }
    return '搜索作品 → 多选角色 → 写一句想看的梗，由论坛网友按人格写同人文（转化性创作，不复刻原作台词）。'
  }, [phase, fixedAuthor])

  if (!open) return null

  const run = async () => {
    if (busy) return
    if (!picks.length) {
      window.alert('请先选择至少一个角色')
      return
    }
    if (!demand.trim()) {
      window.alert('请填写一句话想看的梗')
      return
    }
    setBusy(true)
    setPhase('fic')
    try {
      const apiConfig = await loadResolvedApiConfig('chatCard')
      const author =
        fixedAuthor ??
        pickPersonasForThread({
          count: 1,
          seed: `custom:${characterId}:${Date.now()}`,
        })[0]
      if (!author) throw new Error('人格库为空')

      const fic = await aiGenerateCustomFanfic({
        apiConfig,
        author,
        picks,
        demand,
      })

      const postId = createForumPostId()
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
      })

      setPhase('comments')
      try {
        const comments = await aiGenerateForumComments({
          apiConfig,
          postTitle: fic.title,
          postBody: fic.body,
          postAuthorPersonaId: fic.authorPersonaId,
          seed: postId,
        })
        addComments(characterId, bindCommentsToPost(comments, postId))
      } catch (e) {
        window.alert(
          e instanceof Error
            ? `同人文已保存，但评论区生成失败：${e.message}`
            : '同人文已保存，但评论区生成失败',
        )
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
    <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(44,40,37,0.28)' }}>
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭"
        onClick={busy ? undefined : onClose}
      />
      <div
        className="relative z-10 flex max-h-[88%] w-full max-w-[520px] flex-col"
        style={{
          backgroundColor: FORUM.surface1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ backgroundColor: FORUM.surface2 }} />
          <h2 className="font-semibold" style={{ fontSize: 16, color: FORUM.text }}>
            {fixedAuthor ? `${fixedAuthor.username} · 写选角文` : '自定义同人文'}
          </h2>
          <p className="mt-1 leading-relaxed" style={{ fontSize: 12, color: FORUM.textMuted }}>
            {hint}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <AnimeCharacterPicker selected={picks} onChange={setPicks} />
          <div className="mt-3">
            <label className="font-medium" style={{ fontSize: 12, color: FORUM.textMuted }}>
              一句话想看的梗
            </label>
            <textarea
              value={demand}
              onChange={(e) => setDemand(e.target.value)}
              disabled={busy}
              placeholder="例如：写他们在雨夜车站错过又重逢"
              rows={2}
              className="mt-1 w-full resize-none px-3 py-2.5 text-[14px] outline-none disabled:opacity-60"
              style={{
                borderRadius: FORUM.radiusCard,
                backgroundColor: FORUM.surface2,
                color: FORUM.text,
                border: 'none',
              }}
            />
          </div>
        </div>

        <div
          className="flex shrink-0 gap-2 px-4 py-3"
          style={{ borderTop: `0.5px solid ${FORUM.hairline}` }}
        >
          <Pressable
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 rounded-[17px] py-3 text-center text-[14px] font-medium disabled:opacity-50"
            style={{ background: FORUM.surface2, color: FORUM.text }}
          >
            取消
          </Pressable>
          <Pressable
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="flex-1 rounded-[17px] py-3 text-center text-[14px] font-medium disabled:opacity-60"
            style={{ background: FORUM.accent, color: '#FFFDF8' }}
          >
            {busy ? '生成中…' : '开始写'}
          </Pressable>
        </div>
      </div>
    </div>
  )
}
