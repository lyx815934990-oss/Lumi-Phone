import type { ReactNode } from 'react'

import type { WeChatBubbleTheme, WeChatPersonaContact } from '../../../types'
import {
  ChatGroupSenderNicknameWithRank,
  ChatGroupSpeakerRankOnAvatar,
} from '../group/ChatGroupSpeakerAvatarWrap'
import { useSpecialChatCardLongPress } from '../hooks/useSpecialChatCardLongPress'
import type { WeChatSharedRecordPayload } from '../newFriendsPersona/types'
import { SharedRecordCard } from './SharedRecordCard'

type Props = {
  id: string
  isSelf: boolean
  data: WeChatSharedRecordPayload
  bubble: WeChatBubbleTheme
  showAvatar: boolean
  showAvatarColumn: boolean
  chatSelfAvatarUrl?: string
  chatOtherAvatarUrl?: string
  chatOtherSenderNickname?: string
  chatOtherAvatarRankBadge?: 'owner' | 'admin' | null
  chatSelfAvatarRankBadge?: 'owner' | 'admin' | null
  groupRankShowBesideNickname?: boolean
  multiSelectAvatar?: ReactNode
  selected?: boolean
  onLongPress?: (anchorRect: DOMRect) => void
  personaContacts?: readonly WeChatPersonaContact[]
  playerDisplayName?: string
}

/** 收藏记忆切片转发 · 聊天气泡行 */
export function SharedRecordChatRow({
  id,
  isSelf,
  data,
  bubble,
  showAvatar,
  showAvatarColumn,
  chatSelfAvatarUrl,
  chatOtherAvatarUrl,
  chatOtherSenderNickname,
  chatOtherAvatarRankBadge = null,
  chatSelfAvatarRankBadge: _chatSelfAvatarRankBadge = null,
  groupRankShowBesideNickname = true,
  multiSelectAvatar,
  selected = false,
  onLongPress,
  personaContacts,
  playerDisplayName,
}: Props) {
  const avatarPx = 40
  const { anchorRef, bind, pressStyle } = useSpecialChatCardLongPress(onLongPress, selected)
  const card = (
    <div
      ref={anchorRef}
      className="relative inline-block select-none transition-[transform,opacity] duration-150 ease-out"
      style={pressStyle}
      {...bind}
    >
      <SharedRecordCard
        data={data}
        personaContacts={personaContacts}
        playerDisplayName={playerDisplayName}
      />
    </div>
  )
  const showAvatarVisual = showAvatar && showAvatarColumn
  const reserveAvatarGutter = showAvatar
  const rankBeside = groupRankShowBesideNickname !== false
  const avatarGutter = <div className="h-10 w-10 shrink-0" aria-hidden />
  const otherAvatarFallback = (
    <div
      className="h-10 w-10 shrink-0"
      style={{
        borderRadius: `${bubble.avatarRadiusPx}px`,
        background: 'rgba(0,0,0,0.06)',
        border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
      }}
      aria-hidden
    />
  )

  if (isSelf) {
    return (
      <div className="w-[100vw] max-w-[100vw] shrink-0 overflow-x-visible" data-wx-msg-id={id}>
        <div className="ml-auto mr-[24px] flex max-w-full flex-row-reverse items-start gap-[12px]">
          {showAvatarVisual || multiSelectAvatar ? (
            multiSelectAvatar ?? (
              chatSelfAvatarUrl?.trim() ? (
                <img
                  src={chatSelfAvatarUrl.trim()}
                  alt=""
                  width={avatarPx}
                  height={avatarPx}
                  className="h-10 w-10 shrink-0 object-cover"
                  style={{
                    borderRadius: `${bubble.avatarRadiusPx}px`,
                    border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                  }}
                  aria-hidden
                />
              ) : (
                <div
                  className="h-10 w-10 shrink-0"
                  style={{
                    borderRadius: `${bubble.avatarRadiusPx}px`,
                    background: 'rgba(0,0,0,0.06)',
                    border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                  }}
                  aria-hidden
                />
              )
            )
          ) : reserveAvatarGutter ? (
            multiSelectAvatar ?? avatarGutter
          ) : null}
          <div className="flex min-w-0 flex-col items-end">{card}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[100vw] max-w-[100vw] shrink-0 overflow-x-visible" data-wx-msg-id={id}>
      {!showAvatar && !multiSelectAvatar ? (
        <div className="ml-[24px] mr-auto min-w-0">{card}</div>
      ) : showAvatarVisual || multiSelectAvatar ? (
        <div className="ml-[24px] mr-auto flex max-w-full flex-row items-start gap-[12px]">
          {multiSelectAvatar ??
            (<ChatGroupSpeakerRankOnAvatar chromeSide="other" rankBadge={rankBeside ? null : chatOtherAvatarRankBadge}>
                {chatOtherAvatarUrl?.trim() ? (
                <img
                  src={chatOtherAvatarUrl.trim()}
                  alt=""
                  width={avatarPx}
                  height={avatarPx}
                  className="h-10 w-10 shrink-0 object-cover"
                  style={{
                    borderRadius: `${bubble.avatarRadiusPx}px`,
                    border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                  }}
                  aria-hidden
                />
              ) : (
                otherAvatarFallback
              )}
              </ChatGroupSpeakerRankOnAvatar>)}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
            {!multiSelectAvatar && rankBeside ? (
              <ChatGroupSenderNicknameWithRank
                nickname={chatOtherSenderNickname}
                rankBadge={chatOtherAvatarRankBadge ?? null}
              />
            ) : null}
            {card}
          </div>
        </div>
      ) : reserveAvatarGutter ? (
        <div className="ml-[24px] mr-auto flex max-w-full flex-row items-start gap-[12px]">
          {multiSelectAvatar ?? avatarGutter}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">{card}</div>
        </div>
      ) : (
        <div className="ml-[24px] mr-auto min-w-0">{card}</div>
      )}
    </div>
  )
}
