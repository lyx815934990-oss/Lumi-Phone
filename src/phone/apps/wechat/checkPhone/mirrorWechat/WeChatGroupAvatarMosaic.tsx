import { useState, type CSSProperties } from 'react'

import { getAnyAvatar } from './avatarPool'
import type { MirrorWeChatContact } from './types'
import { isMirrorGroupContact } from './types'

const MOSAIC_BG = '#DDDEE0'
const FALLBACK_AVATAR = '/image/个人名片默认头像1.png'

/** 收集群头像格子（含角色本人，最多 9 格；按成员占位，缺头像用稳定兜底） */
export function collectMirrorGroupAvatarUrls(
  contact: Pick<MirrorWeChatContact, 'kind' | 'id' | 'avatarUrl' | 'members'>,
  opts?: {
    selfAvatarUrl?: string
    /** 用通讯录 id 回填成员头像（生成时 snapshot 常漏 avatar） */
    resolveContactAvatar?: (contactId: string) => string | undefined
    max?: number
  },
): string[] {
  const max = Math.min(9, Math.max(1, Math.round(Number(opts?.max) || 9)))
  const urls: string[] = []
  const seenKeys = new Set<string>()

  const pushSlot = (slotKey: string, raw?: string) => {
    const key = String(slotKey || '').trim() || `slot:${urls.length}`
    if (seenKeys.has(key) || urls.length >= max) return
    let u = String(raw || '').trim()
    if (!u) {
      u = getAnyAvatar(`mirror-group:${contact.id}:${key}`) || FALLBACK_AVATAR
    }
    seenKeys.add(key)
    urls.push(u)
  }

  pushSlot('__self__', opts?.selfAvatarUrl)

  for (const m of contact.members || []) {
    if (urls.length >= max) break
    const slotKey = (m.key || m.contactId || m.nickname || '').trim() || `m:${urls.length}`
    let avatar = (m.avatarUrl || '').trim()
    if (!avatar && m.contactId && opts?.resolveContactAvatar) {
      avatar = (opts.resolveContactAvatar(m.contactId) || '').trim()
    }
    pushSlot(slotKey, avatar)
  }

  // 成员为空时至少保留封面 / 兜底一格
  if (urls.length <= 1 && (contact.avatarUrl || '').trim()) {
    if (urls.length === 0) pushSlot('__cover__', contact.avatarUrl)
  }
  if (!urls.length) pushSlot('__empty__', FALLBACK_AVATAR)
  return urls.slice(0, max)
}

function splitRows(avatars: string[]): string[][] {
  const n = avatars.length
  if (n <= 1) return [avatars]
  if (n === 2) return [avatars]
  if (n === 3) return [[avatars[0]!], [avatars[1]!, avatars[2]!]]
  if (n === 4) return [avatars.slice(0, 2), avatars.slice(2, 4)]
  if (n === 5) return [avatars.slice(0, 2), avatars.slice(2, 5)]
  if (n === 6) return [avatars.slice(0, 3), avatars.slice(3, 6)]
  if (n === 7) return [[avatars[0]!], avatars.slice(1, 4), avatars.slice(4, 7)]
  if (n === 8) return [avatars.slice(0, 2), avatars.slice(2, 5), avatars.slice(5, 8)]
  return [avatars.slice(0, 3), avatars.slice(3, 6), avatars.slice(6, 9)]
}

function MosaicCell({ src, cell }: { src: string; cell: number }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="overflow-hidden bg-[#c8c9cc]" style={{ width: cell, height: cell }}>
      {broken ? (
        <div className="h-full w-full bg-[#c8c9cc]" />
      ) : (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          onError={() => setBroken(true)}
        />
      )}
    </div>
  )
}

/**
 * 微信风格群头像九宫格（1～9 人）。
 * 布局：2 并排 / 3 上一下二 / 4 为 2×2 / 5～9 按微信常见折行。
 */
export function WeChatGroupAvatarMosaic({
  urls,
  size = 48,
  radius = 10,
  className,
  style,
}: {
  urls: string[]
  size?: number
  radius?: number
  className?: string
  style?: CSSProperties
}) {
  const avatars = urls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 9)
  const gap = size >= 44 ? 2 : 1

  if (avatars.length === 0) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: MOSAIC_BG,
          flexShrink: 0,
          ...style,
        }}
        aria-hidden
      />
    )
  }

  if (avatars.length === 1) {
    return (
      <div
        className={`overflow-hidden ${className || ''}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          flexShrink: 0,
          ...style,
        }}
      >
        <MosaicCell src={avatars[0]!} cell={size} />
      </div>
    )
  }

  const n = avatars.length
  const cell3 = (size - gap * 2) / 3
  const cell2 = (size - gap) / 2
  const rows = splitRows(avatars)

  return (
    <div
      className={`flex flex-col items-center justify-center overflow-hidden ${className || ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: MOSAIC_BG,
        gap,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden
    >
      {rows.map((row, ri) => {
        const useThird = n >= 5 || n === 3 || row.length >= 3
        const cell = useThird ? cell3 : cell2
        return (
          <div key={ri} className="flex items-center justify-center" style={{ gap }}>
            {row.map((src, ci) => (
              <MosaicCell key={`${ri}-${ci}`} src={src} cell={cell} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** 镜像会话行：群聊九宫格 / 私聊单图 */
export function MirrorChatListAvatar({
  contact,
  selfAvatarUrl,
  resolveContactAvatar,
  size = 48,
  radius = 12,
  className,
}: {
  contact: MirrorWeChatContact
  selfAvatarUrl?: string
  resolveContactAvatar?: (contactId: string) => string | undefined
  size?: number
  radius?: number
  className?: string
}) {
  if (isMirrorGroupContact(contact)) {
    return (
      <WeChatGroupAvatarMosaic
        urls={collectMirrorGroupAvatarUrls(contact, {
          selfAvatarUrl,
          resolveContactAvatar,
          max: 9,
        })}
        size={size}
        radius={radius}
        className={className}
      />
    )
  }
  const src = contact.avatarUrl?.trim()
  if (!src) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: '#EFF1F4',
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={`object-cover ${className || ''}`}
      style={{ width: size, height: size, borderRadius: radius, flexShrink: 0 }}
      draggable={false}
    />
  )
}
