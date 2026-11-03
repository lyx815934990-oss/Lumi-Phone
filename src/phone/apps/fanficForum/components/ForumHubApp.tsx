import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { WeChatPersonaContact } from '../../../types'
import { MemoryCoachPortal } from '../../wechat/memory/MemoryCoachPortal'
import { MemoryTutorialModal } from '../../wechat/memory/MemoryTutorialModal'
import {
  readMemoryCoachSeen,
  writeMemoryCoachSeen,
} from '../../wechat/memory/memoryCoachTypes'
import {
  FORUM_COACH_ROOT_ATTR,
  FORUM_COACH_TARGET_ATTR,
  FORUM_HUB_COACH_PUBLISH_SHEET_TARGETS,
  FORUM_HUB_COACH_SCOPE,
  FORUM_HUB_COACH_SEEN_KEY,
  FORUM_HUB_COACH_STEPS,
} from '../forumCoach'
import { FORUM_HUB_TUTORIAL_SECTIONS } from '../forumTutorialCopy'
import { FORUM, forumKindLabel } from '../forumTheme'
import {
  forumCharLabel,
  forumUserLabel,
  loadCharacterRealNames,
  loadPlayerRealName,
} from '../forumRealNames'
import {
  FORUM_SAMPLE_NOTIFS,
  getForumNotifItem,
  getForumSampleComments,
  getForumSamplePost,
  isForumSamplePostId,
  resolveForumNotifSamplePost,
} from '../forumDmSample'
import { useForumSocialStore } from '../forumSocialStore'
import { getNetizenPersona } from '../netizenPersonas'
import { getResidentWriter, isResidentWriterId } from '../residentWriters'
import {
  EMPTY_FORUM_CHAR_SLICE,
  FORUM_PLAZA_BOARD_ID,
  isForumPlazaBoardId,
} from '../forumTypes'
import { useForumStore } from '../useForumStore'
import { ForumAuthorProfile } from './ForumAuthorProfile'
import { ForumCharProfile } from './ForumCharProfile'
import { ForumContactPickSheet } from './ForumContactPickSheet'
import { ForumCustomRequestSheet } from './ForumCustomRequestSheet'
import { ForumDmInbox } from './ForumDmInbox'
import { selectForumInboxBadge, useForumInboxUnreadStore } from '../forumInboxUnreadStore'
import { ForumDmThread } from './ForumDmThread'
import { ForumFollowingList } from './ForumFollowingList'
import { ForumGenerateSheet } from './ForumGenerateSheet'
import { ForumMePage } from './ForumMePage'
import { ForumDiscoverFeed, ForumPlaza } from './ForumPlaza'
import { ForumPostDetail } from './ForumPostDetail'
import {
  BottomTabBar,
  PublishChoiceSheet,
  PublishFab,
  type ForumTabId,
} from './ui'

type Stack =
  | { kind: 'tabs' }
  | { kind: 'profile'; characterId: string }
  | { kind: 'author'; writerId: string; from?: 'following' | 'dm' | 'feed' }
  | { kind: 'post'; characterId: string; postId: string; fromAuthorId?: string }
  | { kind: 'dm'; dmId: string }
  | { kind: 'following' }

export function ForumHubApp({
  onBack,
  personaContacts = [],
  userDisplayName,
  wechatAvatarUrl,
  wechatAccountId,
  playerIdentityId,
  className = '',
}: {
  onBack: () => void
  personaContacts?: WeChatPersonaContact[]
  userDisplayName: string
  /** 微信头像；通讯社自定义头像另存，互不覆盖 */
  wechatAvatarUrl?: string | null
  wechatAccountId?: string | null
  playerIdentityId?: string | null
  className?: string
}) {
  const bindAccount = useForumStore((s) => s.bindAccount)
  const hydrated = useForumStore((s) => s.hydrated)
  const root = useForumStore((s) => s.root)
  const currentAccountId = useForumStore((s) => s.currentAccountId)
  const deletePost = useForumStore((s) => s.deletePost)
  const addComments = useForumStore((s) => s.addComments)
  const listPostsByAuthor = useForumStore((s) => s.listPostsByAuthor)
  const bindSocial = useForumSocialStore((s) => s.bindAccount)

  const [tab, setTab] = useState<ForumTabId>('plaza')
  const [stack, setStack] = useState<Stack>({ kind: 'tabs' })
  /** 发布时默认落到的角色（最近打开的主页） */
  const [focusCharId, setFocusCharId] = useState<string | null>(null)

  const [publishOpen, setPublishOpen] = useState(false)
  const [contactPickOpen, setContactPickOpen] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  /** 本命生成落点角色（通讯录选择后写入） */
  const [shipTargetId, setShipTargetId] = useState<string | null>(null)
  /** 自定义选角落点：通讯录角色 id，或广场板 FORUM_PLAZA_BOARD_ID */
  const [customBoardId, setCustomBoardId] = useState<string>(FORUM_PLAZA_BOARD_ID)
  /** 从写手主页进入时锁定作者；普通发布为 null */
  const [fixedAuthorId, setFixedAuthorId] = useState<string | null>(null)
  /** characterId → Character.name（真实姓名） */
  const [charRealNames, setCharRealNames] = useState<Record<string, string>>({})
  /** 玩家身份真实姓名 */
  const [userRealName, setUserRealName] = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachStepIndex, setCoachStepIndex] = useState(0)
  const autoCoachStartedRef = useRef(false)

  useEffect(() => {
    void bindAccount(wechatAccountId)
    void bindSocial(wechatAccountId)
  }, [bindAccount, bindSocial, wechatAccountId])

  const startLiveCoach = useCallback(() => {
    setTutorialOpen(false)
    setContactPickOpen(false)
    setShipOpen(false)
    setCustomOpen(false)
    setTab('plaza')
    setStack({ kind: 'tabs' })
    setCoachStepIndex(0)
    setPublishOpen(false)
    window.setTimeout(() => setCoachOpen(true), 280)
  }, [])

  const finishCoach = useCallback((opts?: { openTutorial?: boolean }) => {
    writeMemoryCoachSeen(FORUM_HUB_COACH_SEEN_KEY)
    setCoachOpen(false)
    setCoachStepIndex(0)
    setPublishOpen(false)
    if (opts?.openTutorial) setTutorialOpen(true)
  }, [])

  useEffect(() => {
    if (autoCoachStartedRef.current) return
    if (readMemoryCoachSeen(FORUM_HUB_COACH_SEEN_KEY)) return
    autoCoachStartedRef.current = true
    writeMemoryCoachSeen(FORUM_HUB_COACH_SEEN_KEY)
    const id = window.setTimeout(() => startLiveCoach(), 640)
    return () => window.clearTimeout(id)
  }, [startLiveCoach])

  /** 引导走到「本命 / 原作 / 自己写」时自动打开发布台，便于高亮选项 */
  useEffect(() => {
    if (!coachOpen) return
    const target = FORUM_HUB_COACH_STEPS[coachStepIndex]?.target
    const needSheet = !!target && FORUM_HUB_COACH_PUBLISH_SHEET_TARGETS.has(target)
    setPublishOpen(needSheet)
  }, [coachOpen, coachStepIndex])

  useEffect(() => {
    let cancelled = false
    const ids = personaContacts.map((c) => c.characterId.trim()).filter(Boolean)
    void (async () => {
      const [names, realUser] = await Promise.all([
        loadCharacterRealNames(ids),
        loadPlayerRealName(playerIdentityId),
      ])
      if (cancelled) return
      setCharRealNames(names)
      setUserRealName(realUser)
    })()
    const onStorage = () => {
      void loadCharacterRealNames(ids).then((names) => {
        if (!cancelled) setCharRealNames(names)
      })
      void loadPlayerRealName(playerIdentityId).then((n) => {
        if (!cancelled) setUserRealName(n)
      })
    }
    window.addEventListener('wechat-storage-changed', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('wechat-storage-changed', onStorage)
    }
  }, [personaContacts, playerIdentityId])

  const contacts = useMemo(() => {
    const seen = new Set<string>()
    const out: WeChatPersonaContact[] = []
    for (const c of personaContacts) {
      const id = c.characterId?.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(c)
    }
    return out
  }, [personaContacts])

  const customPenName = useForumSocialStore((s) => {
    const acc = s.currentAccountId
    if (!acc) return ''
    return s.root.byAccount[acc]?.penName?.trim() ?? ''
  })
  const customForumAvatar = useForumSocialStore((s) => {
    const acc = s.currentAccountId
    if (!acc) return ''
    return s.root.byAccount[acc]?.avatarDataUrl?.trim() ?? ''
  })
  const resolvedUserName =
    customPenName || forumUserLabel(userRealName, userDisplayName)
  /** 展示头像：通讯社自定义优先，否则微信头像（两套存储隔离） */
  const resolvedAvatarUrl = customForumAvatar || wechatAvatarUrl?.trim() || null

  const charLabel = (characterId: string, remark?: string) =>
    forumCharLabel(characterId, charRealNames, remark)

  const postCount = (characterId: string) => {
    const acc = currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return 0
    return root.byAccount[acc]?.byChar[cid]?.posts.length ?? 0
  }

  const getSlice = (characterId: string) => {
    const acc = currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return EMPTY_FORUM_CHAR_SLICE
    return root.byAccount[acc]?.byChar[cid] ?? EMPTY_FORUM_CHAR_SLICE
  }

  const discoverItems = useMemo(() => {
    type FeedRow = {
      postId: string
      characterId: string
      charName: string
      title: string
      authorName: string
      authorPersonaId: string
      kindLabel: string
      commentCount: number
      createdAt: number
    }
    const acc = currentAccountId
    if (!acc) return { items: [] as FeedRow[], totalPosts: 0, totalComments: 0 }
    const rows: FeedRow[] = []
    let totalComments = 0
    const byChar = root.byAccount[acc]?.byChar ?? {}
    for (const [cid, slice] of Object.entries(byChar)) {
      totalComments += slice.comments.length
      for (const p of slice.posts) {
        const author = getNetizenPersona(p.authorPersonaId)
        const contact = contacts.find((c) => c.characterId.trim() === cid)
        rows.push({
          postId: p.id,
          characterId: cid,
          charName: isForumPlazaBoardId(cid)
            ? '通讯社选角'
            : charLabel(cid, contact?.remarkName),
          title: p.title,
          authorPersonaId: p.authorPersonaId,
          authorName:
            p.authorPersonaId === 'forum-self'
              ? resolvedUserName || '我'
              : author?.username ?? '网友',
          kindLabel: forumKindLabel(p.kind),
          commentCount: slice.comments.filter((c) => c.postId === p.id).length,
          createdAt: p.createdAt,
        })
      }
    }
    return {
      items: rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40),
      totalPosts: rows.length,
      totalComments,
    }
  }, [charRealNames, contacts, currentAccountId, resolvedUserName, root])

  const feedItems = discoverItems.items
  const accountPostCount = discoverItems.totalPosts
  const accountCommentCount = discoverItems.totalComments
  const dmBadge = useForumInboxUnreadStore((s) =>
    selectForumInboxBadge(s.readDmIds, s.readNotifIds),
  )

  /** 当前上下文角色（主页/帖子内）；广场无强制绑定 */
  const contextCharId = (() => {
    if (stack.kind === 'profile' || stack.kind === 'post') {
      const cid = stack.characterId
      return isForumPlazaBoardId(cid) ? null : cid
    }
    return null
  })()

  const contextContact = contextCharId
    ? contacts.find((c) => c.characterId.trim() === contextCharId) ?? null
    : null

  const openPublish = () => {
    setFixedAuthorId(null)
    setPublishOpen(true)
  }

  const tabBar = (activeTab: ForumTabId) => (
    <BottomTabBar
      active={activeTab}
      messageBadge={dmBadge}
      onChange={(id) => {
        setTab(id)
        setStack({ kind: 'tabs' })
      }}
    />
  )

  const startShipForContact = (contact: WeChatPersonaContact) => {
    const cid = contact.characterId.trim()
    setFocusCharId(cid)
    setShipTargetId(cid)
    setShipOpen(true)
  }

  const onPickContactFromPublish = () => {
    if (contextContact) {
      startShipForContact(contextContact)
      return
    }
    setContactPickOpen(true)
  }

  const onSearchOriginalFromPublish = () => {
    const board = contextCharId || FORUM_PLAZA_BOARD_ID
    setCustomBoardId(board)
    setCustomOpen(true)
  }

  const openAuthor = (writerId: string, from?: 'following' | 'dm' | 'feed') => {
    if (!isResidentWriterId(writerId)) return
    setStack({ kind: 'author', writerId, ...(from ? { from } : {}) })
  }

  /** 互动通知 → 只进帖子详情；无真实帖时用示例 mock 帖 */
  const openNotifTarget = (notifId: string) => {
    useForumInboxUnreadStore.getState().markNotifRead(notifId)
    const item = getForumNotifItem(notifId)
    if (!item) return
    const title = item.postTitle.trim()
    const matchTitle = (t: string) => {
      const a = t.trim()
      if (!a || !title) return false
      return a === title || a.includes(title) || title.includes(a)
    }
    const openPost = (characterId: string, postId: string) => {
      setFocusCharId(characterId)
      setTab('messages')
      setStack({ kind: 'post', characterId, postId })
    }
    const fromFeed = feedItems.find((f) => matchTitle(f.title))
    if (fromFeed) {
      openPost(fromFeed.characterId, fromFeed.postId)
      return
    }
    const acc = currentAccountId
    if (acc) {
      const byChar = root.byAccount[acc]?.byChar ?? {}
      for (const [cid, slice] of Object.entries(byChar)) {
        const post = slice.posts.find((p) => matchTitle(p.title))
        if (post) {
          openPost(cid, post.id)
          return
        }
      }
    }
    const sample = resolveForumNotifSamplePost(notifId)
    if (sample) {
      openPost(sample.characterId, sample.postId)
      return
    }
    // 最后兜底：示例帖列表按序号
    const notifIdx = Math.max(
      0,
      FORUM_SAMPLE_NOTIFS.findIndex((n) => n.id === notifId),
    )
    const fallback = resolveForumNotifSamplePost(
      FORUM_SAMPLE_NOTIFS[notifIdx % FORUM_SAMPLE_NOTIFS.length]?.id ?? 'n1',
    )
    if (fallback) openPost(fallback.characterId, fallback.postId)
  }

  const backFromAuthor = (from?: 'following' | 'dm' | 'feed') => {
    if (from === 'following') {
      setTab('me')
      setStack({ kind: 'following' })
      return
    }
    if (from === 'dm') {
      setTab('messages')
      setStack({ kind: 'tabs' })
      return
    }
    setTab(from === 'feed' && tab === 'plaza' ? 'plaza' : 'discover')
    setStack({ kind: 'tabs' })
  }

  const writeShipFromAuthor = (writerId: string) => {
    setFixedAuthorId(writerId)
    setContactPickOpen(true)
  }

  const writeCustomFromAuthor = (writerId: string) => {
    setFixedAuthorId(writerId)
    const board = focusCharId && !isForumPlazaBoardId(focusCharId) ? focusCharId : FORUM_PLAZA_BOARD_ID
    setCustomBoardId(board)
    setCustomOpen(true)
  }

  const shipTargetContact =
    contacts.find((c) => c.characterId.trim() === (shipTargetId || '').trim()) ?? null

  const fixedAuthor = fixedAuthorId ? getResidentWriter(fixedAuthorId) ?? null : null

  const onGenerated = (characterId: string, postId: string) => {
    if (!isForumPlazaBoardId(characterId)) setFocusCharId(characterId)
    const fromAuthorId = fixedAuthorId || undefined
    setFixedAuthorId(null)
    setStack({
      kind: 'post',
      characterId,
      postId,
      ...(fromAuthorId ? { fromAuthorId } : {}),
    })
  }

  const backFromPost = (characterId: string, fromAuthorId?: string) => {
    if (fromAuthorId && getResidentWriter(fromAuthorId)) {
      setStack({ kind: 'author', writerId: fromAuthorId })
      return
    }
    if (isForumPlazaBoardId(characterId)) {
      setTab('discover')
      setStack({ kind: 'tabs' })
      return
    }
    setStack({ kind: 'profile', characterId })
  }

  // —— 关注的大咖列表 ——
  if (stack.kind === 'following') {
    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
        <div className="min-h-0 flex-1">
          <ForumFollowingList
            onBack={() => {
              setTab('me')
              setStack({ kind: 'tabs' })
            }}
            onOpenWriter={(id) => openAuthor(id, 'following')}
          />
        </div>
        {tabBar(tab)}
        {renderSheets()}
      </div>
    )
  }

  // —— 私信回复（隐藏底部 Tab，与帖子详情一致）——
  if (stack.kind === 'dm') {
    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
        <div className="min-h-0 flex-1">
          <ForumDmThread
            dmId={stack.dmId}
            selfName={resolvedUserName}
            onBack={() => {
              setTab('messages')
              setStack({ kind: 'tabs' })
            }}
            onOpenWriter={(id) => openAuthor(id, 'dm')}
          />
        </div>
        {renderSheets()}
      </div>
    )
  }

  // —— 帖子详情 ——
  if (stack.kind === 'post') {
    const slice = getSlice(stack.characterId)
    const samplePost = getForumSamplePost(stack.postId)
    const post = slice.posts.find((p) => p.id === stack.postId) ?? samplePost
    const isSample = !!post && isForumSamplePostId(post.id)
    if (!post) {
      return (
        <div className={`flex h-full flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <p style={{ fontSize: 13.5, color: FORUM.textMuted }}>帖子不存在或已删除</p>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ backgroundColor: FORUM.surface2, color: FORUM.text }}
              onClick={() => {
                setTab('messages')
                setStack({ kind: 'tabs' })
              }}
            >
              回私信
            </button>
          </div>
          {tabBar(tab)}
        </div>
      )
    }
    const comments = isSample
      ? getForumSampleComments(post.id)
      : slice.comments
          .filter((c) => c.postId === post.id)
          .sort((a, b) => a.createdAt - b.createdAt)

    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
        <div className="min-h-0 flex-1">
          <ForumPostDetail
            post={post}
            comments={comments}
            selfAuthorName={resolvedUserName}
            selfAuthorAvatarUrl={resolvedAvatarUrl}
            shareContacts={contacts}
            shareDisplayNameById={charRealNames}
            onBack={() => {
              if (isSample) {
                setTab('messages')
                setStack({ kind: 'tabs' })
                return
              }
              backFromPost(stack.characterId, stack.fromAuthorId)
            }}
            onOpenAuthor={(authorId) => openAuthor(authorId, 'feed')}
            onSubmitComment={
              isSample
                ? undefined
                : (comment) => {
                    addComments(stack.characterId, [comment])
                  }
            }
            onDelete={
              isSample
                ? undefined
                : () => {
                    if (!window.confirm('删除这篇帖子及其评论？')) return
                    deletePost(stack.characterId, post.id)
                    backFromPost(stack.characterId, stack.fromAuthorId)
                  }
            }
          />
        </div>
        {renderSheets()}
      </div>
    )
  }

  // —— 写手主页 ——
  if (stack.kind === 'author') {
    const writer = getResidentWriter(stack.writerId)
    if (!writer) {
      return (
        <div className={`flex h-full flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <p style={{ fontSize: 13.5, color: FORUM.textMuted }}>未找到该写手</p>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ backgroundColor: FORUM.surface2, color: FORUM.text }}
              onClick={() => setStack({ kind: 'tabs' })}
            >
              回首页
            </button>
          </div>
          {tabBar(tab)}
        </div>
      )
    }
    const authorPosts = listPostsByAuthor(writer.id)
    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ForumAuthorProfile
            writer={writer}
            posts={authorPosts}
            commentCountFor={(boardId, postId) =>
              getSlice(boardId).comments.filter((c) => c.postId === postId).length
            }
            onBack={() => backFromAuthor(stack.from)}
            onOpenPost={(boardId, postId) =>
              setStack({ kind: 'post', characterId: boardId, postId, fromAuthorId: writer.id })
            }
            onWriteShip={() => writeShipFromAuthor(writer.id)}
            onWriteCustom={() => writeCustomFromAuthor(writer.id)}
          />
        </div>
        {tabBar(tab)}
        {renderSheets()}
      </div>
    )
  }

  // —— 角色主页 ——
  if (stack.kind === 'profile') {
    const contact = contacts.find((c) => c.characterId.trim() === stack.characterId) ?? null
    if (!contact) {
      return (
        <div className={`flex h-full flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <p style={{ fontSize: 13.5, color: FORUM.textMuted }}>未找到该角色</p>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ backgroundColor: FORUM.surface2, color: FORUM.text }}
              onClick={() => setStack({ kind: 'tabs' })}
            >
              回首页
            </button>
          </div>
          {tabBar(tab)}
        </div>
      )
    }
    const slice = getSlice(stack.characterId)
    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ForumCharProfile
            contact={contact}
            displayName={charLabel(contact.characterId, contact.remarkName)}
            posts={slice.posts}
            commentCountFor={(postId) => slice.comments.filter((c) => c.postId === postId).length}
            onBack={() => {
              setTab('plaza')
              setStack({ kind: 'tabs' })
            }}
            onOpenPost={(postId) => setStack({ kind: 'post', characterId: stack.characterId, postId })}
          />
        </div>
        {tabBar(tab)}
        {renderSheets()}
      </div>
    )
  }

  const renderCoachUi = () => (
    <>
      <MemoryTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        title="同人通讯社 · 说明"
        subtitle="生成 · 互动 · 转发微信 · 自己写（开发中）"
        sections={FORUM_HUB_TUTORIAL_SECTIONS}
        onStartLiveCoach={startLiveCoach}
        zIndex={64000}
      />
      <MemoryCoachPortal
        open={coachOpen}
        steps={FORUM_HUB_COACH_STEPS}
        stepIndex={coachStepIndex}
        onStepChange={setCoachStepIndex}
        onSkip={() => finishCoach()}
        onComplete={finishCoach}
        scopeRoot={FORUM_HUB_COACH_SCOPE}
        coachTargetAttr={FORUM_COACH_TARGET_ATTR}
        coachRootAttr={FORUM_COACH_ROOT_ATTR}
        layoutEpoch={`${coachStepIndex}-${publishOpen ? 'pub' : 'hub'}`}
        zIndex={64100}
      />
    </>
  )

  // —— Tab 根 ——
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${className}`}
      style={{ backgroundColor: FORUM.surface1 }}
      {...{ [FORUM_COACH_ROOT_ATTR]: FORUM_HUB_COACH_SCOPE }}
    >
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="absolute left-[19px] z-10 flex items-center gap-1.5"
            style={{ top: FORUM.headerPadTop }}
          >
            <button
              type="button"
              onClick={onBack}
              className="rounded-full px-2.5 py-1 text-[12px] font-medium active:opacity-70"
              style={{
                backgroundColor: FORUM.surface2,
                color: FORUM.textMuted,
              }}
            >
              关闭
            </button>
            <button
              type="button"
              onClick={() => {
                setCoachOpen(false)
                setTutorialOpen(true)
              }}
              className="rounded-full px-2.5 py-1 text-[12px] font-medium active:opacity-70"
              style={{
                backgroundColor: FORUM.surface2,
                color: FORUM.accent,
              }}
              {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-tutorial' }}
            >
              教程
            </button>
          </div>

          {tab === 'plaza' ? (
            <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)`, paddingBottom: 72 }}>
              <ForumPlaza
                contacts={contacts}
                displayNameById={charRealNames}
                hydrated={hydrated}
                postCount={postCount}
                feedItems={feedItems}
                onOpenWriter={(id) => openAuthor(id, 'feed')}
                onOpenCharacter={(cid) => {
                  setFocusCharId(cid)
                  setStack({ kind: 'profile', characterId: cid })
                }}
                onOpenPost={(characterId, postId) => {
                  setFocusCharId(characterId)
                  setStack({ kind: 'post', characterId, postId })
                }}
              />
            </div>
          ) : null}
          {tab === 'discover' ? (
            <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)`, paddingBottom: 72 }}>
              <ForumDiscoverFeed
                items={feedItems}
                onOpenWriter={(id) => openAuthor(id, 'feed')}
                onOpenPost={(characterId, postId) => {
                  setFocusCharId(characterId)
                  setStack({ kind: 'post', characterId, postId })
                }}
              />
            </div>
          ) : null}
          {tab === 'messages' ? (
            <div
              className="flex min-h-0 flex-col"
              style={{
                paddingTop: `calc(${FORUM.headerPadTop} + 28px)`,
                paddingBottom: 72,
                height: '100%',
              }}
            >
              <ForumDmInbox
                posts={feedItems.map((f) => ({
                  postId: f.postId,
                  characterId: f.characterId,
                  title: f.title,
                }))}
                onOpenDm={(dmId) => {
                  setTab('messages')
                  setStack({ kind: 'dm', dmId })
                }}
                onOpenNotif={openNotifTarget}
              />
            </div>
          ) : null}
          {tab === 'me' ? (
            <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)`, paddingBottom: 72 }}>
              <ForumMePage
                userName={resolvedUserName}
                wechatAvatarUrl={wechatAvatarUrl}
                postCount={accountPostCount}
                commentCount={accountCommentCount}
                commissionCount={accountPostCount}
                onOpenExplore={() => setTab('discover')}
                onOpenFollowing={() => setStack({ kind: 'following' })}
                onOpenMyPosts={() => setTab('plaza')}
              />
            </div>
          ) : null}
        </div>
        <PublishFab onClick={openPublish} />
      </div>

      {tabBar(tab)}
      {renderSheets()}
      {renderCoachUi()}
    </div>
  )

  function renderSheets() {
    return (
      <>
        <PublishChoiceSheet
          open={publishOpen}
          onClose={() => {
            // 引导进行中不允许手滑关掉发布台，避免高亮丢目标
            if (coachOpen) return
            setPublishOpen(false)
          }}
          choicesLocked={coachOpen}
          contextCharName={
            contextContact
              ? charLabel(contextContact.characterId, contextContact.remarkName)
              : undefined
          }
          onPickContact={onPickContactFromPublish}
          onSearchOriginal={onSearchOriginalFromPublish}
        />
        <ForumContactPickSheet
          open={contactPickOpen}
          onClose={() => {
            setContactPickOpen(false)
            // 从写手主页写本命取消选角时，若仍在作者页则保留 fixedAuthor
            if (stack.kind !== 'author') setFixedAuthorId(null)
          }}
          contacts={contacts}
          displayNameById={charRealNames}
          onPick={startShipForContact}
        />
        {shipTargetContact ? (
          <ForumGenerateSheet
            open={shipOpen}
            onClose={() => {
              setShipOpen(false)
              setShipTargetId(null)
              if (stack.kind !== 'author') setFixedAuthorId(null)
            }}
            characterId={shipTargetContact.characterId.trim()}
            charDisplayName={charLabel(
              shipTargetContact.characterId,
              shipTargetContact.remarkName,
            )}
            userDisplayName={resolvedUserName}
            wechatAccountId={wechatAccountId}
            playerIdentityId={playerIdentityId}
            fixedAuthor={fixedAuthor}
            onGenerated={(postId) => onGenerated(shipTargetContact.characterId.trim(), postId)}
          />
        ) : null}
        <ForumCustomRequestSheet
          open={customOpen}
          onClose={() => {
            setCustomOpen(false)
            if (stack.kind !== 'author') setFixedAuthorId(null)
          }}
          characterId={customBoardId}
          fixedAuthor={fixedAuthor}
          onGenerated={(postId) => onGenerated(customBoardId, postId)}
        />
      </>
    )
  }
}
