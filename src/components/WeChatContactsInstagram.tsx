import { ChevronRight, HelpCircle, MessageSquare, Star, Tag, UserPlus, Users } from 'lucide-react'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { LUMI_ASSISTANT_AVATAR_PATH } from '../phone/apps/wechat/lumiAssistantAssets'
import {
  LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM,
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  LUMI_THREAD_CAPSULE,
  lumiThreadCapsuleStyle,
} from '../phone/apps/wechat/lumiShellTheme'
import { DEFAULT_PUBLIC_AVATAR_URL } from '../phone/types'
import { resolveCharacterAvatarUrl } from '../phone/utils/characterAvatarUrl'

const AVATAR_PLACEHOLDER = DEFAULT_PUBLIC_AVATAR_URL

const LETTER_INDEX = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '#',
] as const

type LetterKey = (typeof LETTER_INDEX)[number]

type EntryActionId = 'new-friend' | 'group-chats' | 'tags' | 'chat-only'

type EntryAction = {
  id: EntryActionId
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

export type WeChatContactRow = {
  id: string
  remarkName: string
  avatarUrl?: string
  /** 高亮标签，如「小助手」 */
  tag?: string
  isStarred?: boolean
}

type Contact = WeChatContactRow

export type WeChatContactsInstagramProps = {
  contacts?: Contact[]
  onEntryClick?: (id: EntryActionId) => void
  newFriendsBadgeCount?: number
  /** 点击通讯录联系人（内置 Lumi 小助手等） */
  onContactClick?: (contactId: string) => void
  className?: string
}

const ENTRY_ACTIONS: EntryAction[] = [
  { id: 'new-friend', label: '新的朋友', icon: UserPlus },
  { id: 'group-chats', label: '群聊', icon: Users },
  { id: 'tags', label: '标签', icon: Tag },
  { id: 'chat-only', label: '仅聊天的朋友', icon: MessageSquare },
]

/** 内置 Lumi 使用助手：项目内操作问题可向其询问（与信息页会话一致，点击进聊天） */
export const WECHAT_LUMI_ASSISTANT_CONTACT: WeChatContactRow = {
  id: 'wechat-lumi-assistant',
  remarkName: 'Lumi',
  tag: '小助手',
  avatarUrl: LUMI_ASSISTANT_AVATAR_PATH,
}

export const WECHAT_DEFAULT_CONTACTS: Contact[] = []

const ZH_PINYIN_INITIAL_BOUNDARIES: Array<{ letter: Exclude<LetterKey, '#'>; start: string }> = [
  { letter: 'A', start: '阿' },
  { letter: 'B', start: '芭' },
  { letter: 'C', start: '擦' },
  { letter: 'D', start: '搭' },
  { letter: 'E', start: '蛾' },
  { letter: 'F', start: '发' },
  { letter: 'G', start: '噶' },
  { letter: 'H', start: '哈' },
  { letter: 'J', start: '击' },
  { letter: 'K', start: '喀' },
  { letter: 'L', start: '垃' },
  { letter: 'M', start: '妈' },
  { letter: 'N', start: '拿' },
  { letter: 'O', start: '哦' },
  { letter: 'P', start: '啪' },
  { letter: 'Q', start: '期' },
  { letter: 'R', start: '然' },
  { letter: 'S', start: '撒' },
  { letter: 'T', start: '塌' },
  { letter: 'W', start: '挖' },
  { letter: 'X', start: '昔' },
  { letter: 'Y', start: '压' },
  { letter: 'Z', start: '匝' },
]

function getZhPinyinInitial(ch: string): LetterKey {
  for (let i = ZH_PINYIN_INITIAL_BOUNDARIES.length - 1; i >= 0; i -= 1) {
    const item = ZH_PINYIN_INITIAL_BOUNDARIES[i]
    if (ch.localeCompare(item.start, 'zh-CN-u-co-pinyin') >= 0) return item.letter
  }
  return '#'
}

function getGroupLetter(name: string): LetterKey {
  const first = (name || '').trim().charAt(0)
  if (!first) return '#'
  const upper = first.toUpperCase()
  if (/^[A-Z]$/.test(upper)) return upper as LetterKey
  if (/^[\u4e00-\u9fff]$/.test(first)) return getZhPinyinInitial(first)
  return '#'
}

const softGroupCardStyle: CSSProperties = {
  background: LUMI_SHELL.card,
  borderRadius: LUMI_SHELL.cardRadiusPx,
  border: `1px solid ${LUMI_SHELL.hairline}`,
  boxShadow: '0 8px 28px rgba(16,16,18,0.045)',
  overflow: 'hidden',
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="px-1 pb-2.5 pt-0.5 text-[11px] font-semibold tracking-[0.08em]"
      style={{ color: LUMI_SHELL.mist }}
    >
      {children}
    </div>
  )
}

function ContactAvatar({ url, size = 44 }: { url?: string; name?: string; size?: number }) {
  const src = resolveCharacterAvatarUrl({ avatarUrl: url }) || AVATAR_PLACEHOLDER
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{
        width: size,
        height: size,
        border: `1px solid ${LUMI_SHELL.hairline}`,
        boxShadow: '0 1px 3px rgba(16,16,18,0.04)',
      }}
      loading="lazy"
    />
  )
}

function ContactCapsuleRow({
  contact,
  onClick,
  trailing,
}: {
  contact: Contact
  onClick?: () => void
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform active:scale-[0.992]"
      style={{
        ...lumiThreadCapsuleStyle(),
        fontFamily: LUMI_SHELL_FONT,
      }}
    >
      <ContactAvatar url={contact.avatarUrl} name={contact.remarkName} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
          {contact.remarkName}
        </span>
        {contact.tag ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight"
            style={{
              background: 'rgba(16,16,18,0.06)',
              color: LUMI_SHELL.mist,
            }}
          >
            {contact.tag}
          </span>
        ) : null}
      </div>
      {trailing ?? (
        <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} color={LUMI_SHELL.mist} />
      )}
    </button>
  )
}

export function WeChatContactsInstagram({
  contacts = WECHAT_DEFAULT_CONTACTS,
  onEntryClick,
  newFriendsBadgeCount = 0,
  onContactClick,
  className = '',
}: WeChatContactsInstagramProps) {
  const [activeLetter, setActiveLetter] = useState<LetterKey>('A')
  const groupRefs = useRef<Partial<Record<LetterKey, HTMLElement | null>>>({})
  const indexNavRef = useRef<HTMLDivElement | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<LetterKey, Contact[]>()
    for (const letter of LETTER_INDEX) map.set(letter, [])
    for (const c of contacts) {
      const key = getGroupLetter(c.remarkName)
      map.get(key)?.push(c)
    }
    for (const [k, list] of map) {
      list.sort((a, b) => {
        if (!!a.isStarred !== !!b.isStarred) return a.isStarred ? -1 : 1
        return a.remarkName.localeCompare(b.remarkName, 'zh-CN-u-co-pinyin')
      })
      if (!list.length) map.delete(k)
    }
    return map
  }, [contacts])

  const starredContacts = useMemo(() => {
    return contacts
      .filter((c) => !!c.isStarred)
      .sort((a, b) => a.remarkName.localeCompare(b.remarkName, 'zh-CN-u-co-pinyin'))
  }, [contacts])

  const visibleLetters = useMemo(() => Array.from(grouped.keys()), [grouped])

  useEffect(() => {
    if (!visibleLetters.length) return
    if (!visibleLetters.includes(activeLetter)) {
      setActiveLetter(visibleLetters[0])
    }
  }, [activeLetter, visibleLetters])

  const jumpToLetter = (letter: LetterKey) => {
    setActiveLetter(letter)
    groupRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickLetterByClientY = (clientY: number): LetterKey | null => {
    const root = indexNavRef.current
    if (!root) return null
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-letter]'))
    if (!items.length) return null

    let picked: LetterKey | null = null
    let minDist = Number.POSITIVE_INFINITY
    for (const btn of items) {
      const rect = btn.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const d = Math.abs(clientY - centerY)
      if (d < minDist) {
        minDist = d
        picked = (btn.dataset.letter as LetterKey) ?? null
      }
    }
    return picked
  }

  const onIndexPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return
    const letter = pickLetterByClientY(e.clientY)
    if (letter && letter !== activeLetter) jumpToLetter(letter)
  }

  const onIndexPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const letter = pickLetterByClientY(e.clientY)
    if (letter) jumpToLetter(letter)
  }

  const onIndexPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div
      className={`relative h-full min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ fontFamily: LUMI_SHELL_FONT }}
    >
      <div
        className="mx-auto flex w-full max-w-[520px] flex-col px-4 pt-3"
        style={{
          gap: 24,
          paddingBottom: LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM,
        }}
      >
        <section>
          <SectionLabel>快捷入口</SectionLabel>
          <div style={softGroupCardStyle}>
            <ul>
              {ENTRY_ACTIONS.map((item, idx) => {
                const Icon = item.icon
                const showNewFriendBadge = item.id === 'new-friend' && newFriendsBadgeCount > 0
                const isLast = idx === ENTRY_ACTIONS.length - 1
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onEntryClick?.(item.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                      style={{
                        borderBottom: isLast ? undefined : `1px solid ${LUMI_SHELL.hairline}`,
                      }}
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(16,16,18,0.04)', color: LUMI_SHELL.ink }}
                      >
                        <Icon className="size-[18px]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1 text-[15px] font-medium" style={{ color: LUMI_SHELL.ink }}>
                        {item.label}
                      </span>
                      {showNewFriendBadge ? (
                        <span
                          className="inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none text-white"
                          style={{ background: LUMI_SHELL.badgeRed }}
                        >
                          {newFriendsBadgeCount > 99 ? '99+' : newFriendsBadgeCount}
                        </span>
                      ) : null}
                      <ChevronRight
                        className="size-4 shrink-0"
                        strokeWidth={1.75}
                        color={LUMI_SHELL.mist}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section aria-label="帮助与支持">
          <SectionLabel>帮助与支持</SectionLabel>
          <div className="mb-2.5 flex items-start gap-2 px-1">
            <HelpCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} color={LUMI_SHELL.mist} />
            <p className="text-[12px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
              项目内功能、操作有疑问时，可向 Lumi 小助手提问。
            </p>
          </div>
          <div className="flex flex-col" style={{ gap: LUMI_THREAD_CAPSULE.gapPx }}>
            <ContactCapsuleRow
              contact={WECHAT_LUMI_ASSISTANT_CONTACT}
              onClick={() => onContactClick?.(WECHAT_LUMI_ASSISTANT_CONTACT.id)}
            />
          </div>
        </section>

        {starredContacts.length ? (
          <section aria-label="星标朋友">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3" fill={LUMI_SHELL.ink} strokeWidth={1.6} color={LUMI_SHELL.ink} />
                星标朋友
              </span>
            </SectionLabel>
            <div className="flex flex-col" style={{ gap: LUMI_THREAD_CAPSULE.gapPx }}>
              {starredContacts.map((c) => (
                <ContactCapsuleRow
                  key={`starred-${c.id}`}
                  contact={c}
                  onClick={() => onContactClick?.(c.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {visibleLetters.length ? (
          <div className="flex flex-col" style={{ gap: 24 }}>
            {visibleLetters.map((letter) => {
              const list = grouped.get(letter) ?? []
              return (
                <section
                  key={letter}
                  ref={(el) => {
                    groupRefs.current[letter] = el
                  }}
                >
                  <SectionLabel>{letter}</SectionLabel>
                  <div className="flex flex-col" style={{ gap: LUMI_THREAD_CAPSULE.gapPx }}>
                    {list.map((c) => (
                      <ContactCapsuleRow
                        key={c.id}
                        contact={c}
                        onClick={() => onContactClick?.(c.id)}
                        trailing={<span className="w-4 shrink-0" aria-hidden />}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : null}
      </div>

      {visibleLetters.length ? (
        <nav
          ref={indexNavRef}
          className="fixed right-2 top-1/2 z-20 -translate-y-1/2 select-none touch-none"
          aria-label="通讯录字母索引"
          onPointerDown={onIndexPointerDown}
          onPointerMove={onIndexPointerMove}
          onPointerUp={onIndexPointerUp}
          onPointerCancel={onIndexPointerUp}
        >
          <ul
            className="flex flex-col items-center gap-0.5 px-1.5 py-2"
            style={{
              ...lumiThreadCapsuleStyle(),
              borderRadius: 999,
            }}
          >
            {visibleLetters.map((letter) => {
              const isActive = activeLetter === letter
              return (
                <li key={letter}>
                  <button
                    type="button"
                    onClick={() => jumpToLetter(letter)}
                    data-letter={letter}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold leading-none transition-colors"
                    style={{
                      color: isActive ? LUMI_SHELL.ink : LUMI_SHELL.mist,
                      background: isActive ? 'rgba(16,16,18,0.06)' : 'transparent',
                    }}
                  >
                    {letter}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}

export default WeChatContactsInstagram
