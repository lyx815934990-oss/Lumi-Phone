import type { ReactNode } from 'react'

import type { WeChatBubbleTheme } from '../../../types'
import {
  ChatGroupSenderNicknameWithRank,
  ChatGroupSpeakerRankOnAvatar,
} from '../group/ChatGroupSpeakerAvatarWrap'
import { WeChatAvatarChromeWrap } from '../WeChatAvatarChromeWrap'
import { useSpecialChatCardLongPress } from '../hooks/useSpecialChatCardLongPress'
import type { WeChatCoupleSpaceInvitePayload } from '../newFriendsPersona/types'
import { CoupleSpaceCharacterInviteReceivedCard } from './CoupleSpaceCharacterInviteReceivedCard'
import { CoupleSpaceInviteSentCard } from './CoupleSpaceInviteSentCard'

export const COUPLE_SPACE_CHAT_CARD_WIDTH_CLASS = 'w-[min(220px,calc(100vw-112px))]'

type Props = {
  id: string
  isSelf: boolean
  data: WeChatCoupleSpaceInvitePayload
  bubble: WeChatBubbleTheme
  showAvatar: boolean
  showAvatarColumn: boolean
  chatSelfAvatarUrl?: string
  chatOtherAvatarUrl?: string
  chatOtherSenderNickname?: string
  chatOtherAvatarRankBadge?: 'owner' | 'admin' | null
  groupRankShowBesideNickname?: boolean
  selected?: boolean
  multiSelectAvatar?: ReactNode
  peerName?: string
  onOpenSpace?: () => void
  coupleSpaceInviteRespondBusy?: boolean
  onRespondToCharacterInvite?: (
    messageId: string,
    invite: WeChatCoupleSpaceInvitePayload,
    response: 'accept' | 'decline',
  ) => void
  onLongPress?: (anchorRect: DOMRect) => void
}

/** 情侣空间邀约卡聊天气泡行 */
export function CoupleSpaceInviteChatRow({
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
  groupRankShowBesideNickname = true,
  selected = false,
  multiSelectAvatar,
  peerName,
  onOpenSpace,
  coupleSpaceInviteRespondBusy,
  onRespondToCharacterInvite,
  onLongPress,
}: Props) {
  const avatarPx = 40
  const { anchorRef, bind, pressStyle } = useSpecialChatCardLongPress(onLongPress, selected)

  const cardInner = isSelf ? (
    <CoupleSpaceInviteSentCard
      data={data}
      peerName={peerName ?? chatOtherSenderNickname}
      onOpenSpace={data.charResponded === 'accepted' ? onOpenSpace : undefined}
    />
  ) : (
    <CoupleSpaceCharacterInviteReceivedCard
      data={data}
      peerName={peerName ?? chatOtherSenderNickname}
      busy={coupleSpaceInviteRespondBusy}
      onOpenSpace={data.userResponded === 'accepted' ? onOpenSpace : undefined}
      onAccept={() => onRespondToCharacterInvite?.(id, data, 'accept')}
      onDecline={() => onRespondToCharacterInvite?.(id, data, 'decline')}
    />
  )

  const card = (
    <div
      ref={anchorRef}
      className={`relative inline-block select-none transition-[transform,opacity] duration-150 ease-out ${COUPLE_SPACE_CHAT_CARD_WIDTH_CLASS}`}
      style={pressStyle}
      {...bind}
    >
      {cardInner}
    </div>
  )

  const showAvatarVisual = showAvatar && showAvatarColumn
  const reserveAvatarGutter = showAvatar
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
            avatarGutter
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
            (groupRankShowBesideNickname !== false || !chatOtherAvatarRankBadge ? (
              <WeChatAvatarChromeWrap side="other">
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
              </WeChatAvatarChromeWrap>
            ) : (
              <ChatGroupSpeakerRankOnAvatar chromeSide="other" rankBadge={chatOtherAvatarRankBadge}>
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
              </ChatGroupSpeakerRankOnAvatar>
            ))}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
            {!multiSelectAvatar && groupRankShowBesideNickname !== false ? (
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
          {avatarGutter}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">{card}</div>
        </div>
      ) : (
        <div className="ml-[24px] mr-auto min-w-0">{card}</div>
      )}
    </div>
  )
}
