import { useEffect, useMemo, useState } from 'react'

import type { WeChatPersonaContact } from '../../../types'
import { FORUM, forumKindLabel } from '../forumTheme'
import {
  forumCharLabel,
  forumUserLabel,
  loadCharacterRealNames,
  loadPlayerRealName,
} from '../forumRealNames'
import { getNetizenPersona } from '../netizenPersonas'
import { getResidentWriter } from '../residentWriters'
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
import { ForumGenerateSheet } from './ForumGenerateSheet'
import {
  ForumDiscoverFeed,
  ForumPlaceholderTab,
  ForumPlaza,
} from './ForumPlaza'
import { ForumPostDetail } from './ForumPostDetail'
import {
  BottomTabBar,
  PublishChoiceSheet,
  type ForumTabId,
} from './ui'

type Stack =
  | { kind: 'tabs' }
  | { kind: 'profile'; characterId: string }
  | { kind: 'author'; writerId: string }
  | { kind: 'post'; characterId: string; postId: string; fromAuthorId?: string }

export function ForumHubApp({
  onBack,
  personaContacts = [],
  userDisplayName,
  wechatAccountId,
  playerIdentityId,
  className = '',
}: {
  onBack: () => void
  personaContacts?: WeChatPersonaContact[]
  userDisplayName: string
  wechatAccountId?: string | null
  playerIdentityId?: string | null
  className?: string
}) {
  const bindAccount = useForumStore((s) => s.bindAccount)
  const hydrated = useForumStore((s) => s.hydrated)
  const root = useForumStore((s) => s.root)
  const currentAccountId = useForumStore((s) => s.currentAccountId)
  const deletePost = useForumStore((s) => s.deletePost)
  const listPostsByAuthor = useForumStore((s) => s.listPostsByAuthor)

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

  useEffect(() => {
    void bindAccount(wechatAccountId)
  }, [bindAccount, wechatAccountId])

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

  const resolvedUserName = forumUserLabel(userRealName, userDisplayName)

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
    const acc = currentAccountId
    if (!acc) return []
    const rows: Array<{
      postId: string
      characterId: string
      charName: string
      title: string
      authorName: string
      kindLabel: string
      commentCount: number
      createdAt: number
    }> = []
    const byChar = root.byAccount[acc]?.byChar ?? {}
    for (const [cid, slice] of Object.entries(byChar)) {
      for (const p of slice.posts) {
        const author = getNetizenPersona(p.authorPersonaId)
        const contact = contacts.find((c) => c.characterId.trim() === cid)
        rows.push({
          postId: p.id,
          characterId: cid,
          charName: isForumPlazaBoardId(cid)
            ? '广场选角'
            : charLabel(cid, contact?.remarkName),
          title: p.title,
          authorName: author?.username ?? '网友',
          kindLabel: forumKindLabel(p.kind),
          commentCount: slice.comments.filter((c) => c.postId === p.id).length,
          createdAt: p.createdAt,
        })
      }
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40)
  }, [charRealNames, contacts, currentAccountId, root])

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

  const openAuthor = (writerId: string) => {
    setStack({ kind: 'author', writerId })
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

  // —— 帖子详情 ——
  if (stack.kind === 'post') {
    const slice = getSlice(stack.characterId)
    const post = slice.posts.find((p) => p.id === stack.postId) ?? null
    if (!post) {
      return (
        <div className={`flex h-full flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <p style={{ fontSize: 13.5, color: FORUM.textMuted }}>帖子不存在或已删除</p>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ backgroundColor: FORUM.surface2, color: FORUM.text }}
              onClick={() => backFromPost(stack.characterId, stack.fromAuthorId)}
            >
              {stack.fromAuthorId
                ? '返回写手主页'
                : isForumPlazaBoardId(stack.characterId)
                  ? '回发现'
                  : '返回角色主页'}
            </button>
          </div>
          <BottomTabBar
            active={tab}
            onChange={(id) => {
              setTab(id)
              setStack({ kind: 'tabs' })
            }}
            onPublish={openPublish}
          />
        </div>
      )
    }
    const comments = slice.comments
      .filter((c) => c.postId === post.id)
      .sort((a, b) => a.createdAt - b.createdAt)

    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
        <div className="min-h-0 flex-1">
          <ForumPostDetail
            post={post}
            comments={comments}
            onBack={() => backFromPost(stack.characterId, stack.fromAuthorId)}
            onOpenAuthor={(authorId) => {
              if (getResidentWriter(authorId)) openAuthor(authorId)
            }}
            onDelete={() => {
              if (!window.confirm('删除这篇帖子及其评论？')) return
              deletePost(stack.characterId, post.id)
              backFromPost(stack.characterId, stack.fromAuthorId)
            }}
          />
        </div>
        <BottomTabBar
          active={tab}
          onChange={(id) => {
            setTab(id)
            setStack({ kind: 'tabs' })
          }}
          onPublish={openPublish}
        />
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
              回广场
            </button>
          </div>
          <BottomTabBar
            active={tab}
            onChange={(id) => {
              setTab(id)
              setStack({ kind: 'tabs' })
            }}
            onPublish={openPublish}
          />
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
            onBack={() => {
              setTab('plaza')
              setStack({ kind: 'tabs' })
            }}
            onOpenPost={(boardId, postId) =>
              setStack({ kind: 'post', characterId: boardId, postId, fromAuthorId: writer.id })
            }
            onWriteShip={() => writeShipFromAuthor(writer.id)}
            onWriteCustom={() => writeCustomFromAuthor(writer.id)}
          />
        </div>
        <BottomTabBar
          active={tab}
          onChange={(id) => {
            setTab(id)
            setStack({ kind: 'tabs' })
          }}
          onPublish={openPublish}
        />
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
              回广场
            </button>
          </div>
          <BottomTabBar
            active={tab}
            onChange={(id) => {
              setTab(id)
              setStack({ kind: 'tabs' })
            }}
            onPublish={openPublish}
          />
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
        <BottomTabBar
          active={tab}
          onChange={(id) => {
            setTab(id)
            setStack({ kind: 'tabs' })
          }}
          onPublish={openPublish}
        />
        {renderSheets()}
      </div>
    )
  }

  // —— Tab 根 ——
  return (
    <div className={`relative flex h-full min-h-0 flex-col ${className}`} style={{ backgroundColor: FORUM.surface1 }}>
      <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* 退出同人论坛：广场标题区左上可返回微信发现 */}
        <button
          type="button"
          onClick={onBack}
          className="absolute left-[19px] z-10 rounded-full px-2.5 py-1 text-[12px] font-medium active:opacity-70"
          style={{
            top: FORUM.headerPadTop,
            backgroundColor: FORUM.surface2,
            color: FORUM.textMuted,
          }}
        >
          关闭
        </button>

        {tab === 'plaza' ? (
          <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)` }}>
            <ForumPlaza
              contacts={contacts}
              displayNameById={charRealNames}
              hydrated={hydrated}
              postCount={postCount}
              onOpenCharacter={(cid) => {
                setFocusCharId(cid)
                setStack({ kind: 'profile', characterId: cid })
              }}
              onOpenWriter={openAuthor}
            />
          </div>
        ) : null}
        {tab === 'discover' ? (
          <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)` }}>
            <ForumDiscoverFeed
              items={discoverItems}
              onOpenPost={(characterId, postId) => {
                setFocusCharId(characterId)
                setStack({ kind: 'post', characterId, postId })
              }}
            />
          </div>
        ) : null}
        {tab === 'messages' ? (
          <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)` }}>
            <ForumPlaceholderTab title="消息" hint="同人论坛互动提醒将在后续版本接入。" />
          </div>
        ) : null}
        {tab === 'me' ? (
          <div style={{ paddingTop: `calc(${FORUM.headerPadTop} + 28px)` }}>
            <ForumPlaceholderTab
              title="我的"
              hint={`当前身份：${resolvedUserName}。个人主页与收藏将在后续版本接入。`}
            />
          </div>
        ) : null}
      </div>

      <BottomTabBar active={tab} onChange={setTab} onPublish={openPublish} />
      {renderSheets()}
    </div>
  )

  function renderSheets() {
    return (
      <>
        <PublishChoiceSheet
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
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
