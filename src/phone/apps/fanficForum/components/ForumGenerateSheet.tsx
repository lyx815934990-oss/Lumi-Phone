import { useMemo, useState } from 'react'

import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'
import { bindCommentsToPost, aiGenerateForumComments } from '../forumCommentsAi'
import { buildForumPublicContext } from '../forumPublicContext'
import { aiGenerateShipFanfic } from '../forumShipFicAi'
import { pickPersonasForThread, type NetizenPersona } from '../netizenPersonas'
import { createForumPostId, useForumStore } from '../useForumStore'

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
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'fic' | 'comments'>('idle')

  const hint = useMemo(() => {
    if (phase === 'fic') {
      return fixedAuthor ? `${fixedAuthor.username} 正在写本命同人文…` : '正在写本命同人文…'
    }
    if (phase === 'comments') return '正在生成评论区…'
    if (fixedAuthor) {
      return `将由常驻写手「${fixedAuthor.username}」执笔；评论区同好会冒泡，写手也可能选择性回几句。`
    }
    return '将基于公开可见信息生成一篇网友向同人文，并附带有分歧的评论区。'
  }, [phase, fixedAuthor])

  if (!open) return null

  const run = async () => {
    if (busy) return
    setBusy(true)
    setPhase('fic')
    try {
      const apiConfig = await loadResolvedApiConfig('chatCard')
      const publicContext = await buildForumPublicContext({
        characterId,
        charDisplayName,
        userDisplayName,
        wechatAccountId,
        playerIdentityId,
      })
      const author =
        fixedAuthor ??
        pickPersonasForThread({
          count: 1,
          seed: `author:${characterId}:${Date.now()}`,
        })[0]
      if (!author) throw new Error('人格库为空')

      const fic = await aiGenerateShipFanfic({
        apiConfig,
        author,
        publicContext,
      })

      const postId = createForumPostId()
      addPost(characterId, {
        id: postId,
        kind: 'ship',
        characterId,
        authorPersonaId: fic.authorPersonaId,
        title: fic.title,
        body: fic.body,
        createdAt: Date.now(),
        publicContextDigest: publicContext.digest,
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
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭" onClick={busy ? undefined : onClose} />
      <div
        className="relative z-10 w-full max-w-[520px] px-4 pt-4"
        style={{
          backgroundColor: FORUM.surface1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ backgroundColor: FORUM.surface2 }} />
        <h2 className="font-semibold" style={{ fontSize: 16, color: FORUM.text }}>
          {fixedAuthor ? `${fixedAuthor.username} · 写本命` : '生成本命同人文'}
        </h2>
        <p className="mt-2 leading-relaxed" style={{ fontSize: 13, color: FORUM.textSecondary }}>
          {hint}
        </p>
        <p className="mt-1" style={{ fontSize: 12, color: FORUM.textMuted }}>
          CP：{userDisplayName} × {charDisplayName}
        </p>
        <div className="mt-4 flex gap-2">
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
            {busy ? '生成中…' : '开始生成'}
          </Pressable>
        </div>
      </div>
    </div>
  )
}
