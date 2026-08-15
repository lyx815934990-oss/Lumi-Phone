import type { ReactNode } from 'react'

import type { WeChatBubbleTheme } from '../../../types'
import {
  ChatGroupSenderNicknameWithRank,
  ChatGroupSpeakerRankOnAvatar,
} from '../group/ChatGroupSpeakerAvatarWrap'
import { useSpecialChatCardLongPress } from '../hooks/useSpecialChatCardLongPress'
import { WeChatAvatarChromeWrap } from '../WeChatAvatarChromeWrap'
import type { WeChatPulseSharePayload } from '../newFriendsPersona/types'
import { PulseShareMessageCard } from './PulseShareMessageCard'

type Props = {
  id: string
  isSelf: boolean
  data: WeChatPulseSharePayload
  bubble: WeChatBubbleTheme
  showAvatar: boolean
  showAvatarColumn: boolean
  chatSelfAvatarUrl?: string
  chatOtherAvatarUrl?: string
  chatOtherSenderNickname?: string
  chatOtherAvatarRankBadge?: 'owner' | 'admin' | null
  chatSelfAvatarRankBadge?: 'owner' | 'admin' | null
  groupRankShowBesideNickname?: boolean
  onOpen?: () => void
  multiSelectAvatar?: ReactNode
  selected?: boolean
  onLongPress?: (anchorRect: DOMRect) => void
}

export function PulseShareChatRow({
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
  onOpen,
  multiSelectAvatar,
  selected = false,
  onLongPress,
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
      <PulseShareMessageCard data={data} onOpen={onOpen} />
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
            avatarGutter
          ) : null}
          <div className="min-w-0 max-w-[calc(100vw-96px)]">{card}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[100vw] max-w-[100vw] shrink-0 overflow-x-visible" data-wx-msg-id={id}>
      <div className="ml-[24px] mr-auto flex max-w-full items-start gap-[12px]">
        {showAvatarVisual || multiSelectAvatar ? (
          multiSelectAvatar ?? (
            <div className="relative shrink-0">
              {!rankBeside ? (
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
              ) : (
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
              )}
            </div>
          )
        ) : reserveAvatarGutter ? (
          multiSelectAvatar ?? avatarGutter
        ) : null}
        <div className="min-w-0 max-w-[calc(100vw-96px)]">
          {!multiSelectAvatar && rankBeside && chatOtherSenderNickname ? (
            <ChatGroupSenderNicknameWithRank
              nickname={chatOtherSenderNickname}
              rankBadge={chatOtherAvatarRankBadge}
            />
          ) : !multiSelectAvatar && chatOtherSenderNickname ? (
            <p className="mb-1 text-[12px] text-[#888888]">{chatOtherSenderNickname}</p>
          ) : null}
          {card}
        </div>
      </div>
    </div>
  )
}
