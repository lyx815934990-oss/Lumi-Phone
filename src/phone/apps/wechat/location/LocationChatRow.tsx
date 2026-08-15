import type { ReactNode } from 'react'

import type { WeChatBubbleTheme } from '../../../types'
import {
  ChatGroupSenderNicknameWithRank,
  ChatGroupSpeakerRankOnAvatar,
} from '../group/ChatGroupSpeakerAvatarWrap'
import { useSpecialChatCardLongPress } from '../hooks/useSpecialChatCardLongPress'
import { WeChatAvatarChromeWrap } from '../WeChatAvatarChromeWrap'
import type { WeChatLocationPayload } from '../newFriendsPersona/types'
import { LocationMessageCard } from './LocationMessageCard'
import { useChatSkinEngine } from '../WeChatChatSkinEngineContext'
import {
  ImessageLocationCard,
  TelegramLocationBubble,
  TalkmakerLocationCard,
  resolveMessengerBubbleStyle,
} from '../wechatMessengerSpecialBubbles'
import { formatTelegramBubbleTime } from '../wechatBubbleTelegramUi'
import {
  formatTalkmakerExternalTime,
  TalkmakerExternalTimestamp,
} from '../wechatBubbleTalkmakerUi'

type Props = {
  id: string
  isSelf: boolean
  data: WeChatLocationPayload
  bubble: WeChatBubbleTheme
  showAvatar: boolean
  showAvatarColumn: boolean
  showBubbleTail?: boolean
  bubbleTailMaskColor?: string
  messageTimestampMs?: number
  telegramShowReadChecks?: boolean
  chatSelfAvatarUrl?: string
  chatOtherAvatarUrl?: string
  chatOtherSenderNickname?: string
  chatOtherAvatarRankBadge?: 'owner' | 'admin' | null
  chatSelfAvatarRankBadge?: 'owner' | 'admin' | null
  groupRankShowBesideNickname?: boolean
  /** 聊天气泡预览嵌在窄容器里，不能用 100vw（会把用户侧卡片挤出可视区） */
  variant?: 'chat' | 'preview'
  multiSelectAvatar?: ReactNode
  selected?: boolean
  onLongPress?: (anchorRect: DOMRect) => void
}

/** 位置分享聊天气泡行 */
export function LocationChatRow({
  id,
  isSelf,
  data,
  bubble,
  showAvatar,
  showAvatarColumn,
  showBubbleTail = false,
  bubbleTailMaskColor = 'var(--wx-chat-room-bg, #EDEDED)',
  messageTimestampMs,
  telegramShowReadChecks = true,
  chatSelfAvatarUrl,
  chatOtherAvatarUrl,
  chatOtherSenderNickname,
  chatOtherAvatarRankBadge = null,
  chatSelfAvatarRankBadge: _chatSelfAvatarRankBadge = null,
  groupRankShowBesideNickname = true,
  variant = 'chat',
  multiSelectAvatar,
  selected = false,
  onLongPress,
}: Props) {
  const avatarPx = 40
  const chatSkinEngine = useChatSkinEngine()
  const messengerStyle = resolveMessengerBubbleStyle(bubble, chatSkinEngine)
  const { anchorRef, bind, pressStyle } = useSpecialChatCardLongPress(onLongPress, selected)
  const talkmakerTimeLabel =
    messengerStyle === 'talkmaker' && typeof messageTimestampMs === 'number'
      ? formatTalkmakerExternalTime(messageTimestampMs)
      : null
  const cardInner =
    messengerStyle === 'imessage' ? (
      <ImessageLocationCard
        data={data}
        isSelf={isSelf}
        showTail={showBubbleTail}
        bubbleTailMaskColor={bubbleTailMaskColor}
        bubble={bubble}
      />
    ) : messengerStyle === 'telegram' ? (
      <TelegramLocationBubble
        data={data}
        isSelf={isSelf}
        bubble={bubble}
        showTail={showBubbleTail}
        timeLabel={
          typeof messageTimestampMs === 'number' ? formatTelegramBubbleTime(messageTimestampMs) : undefined
        }
        showReadChecks={telegramShowReadChecks}
      />
    ) : messengerStyle === 'talkmaker' ? (
      <TalkmakerLocationCard data={data} isSelf={isSelf} showTail={showBubbleTail} />
    ) : (
      <LocationMessageCard
        data={data}
        wechatClassic={messengerStyle === 'wechat'}
        cssSkin={messengerStyle === 'css'}
      />
    )
  const cardContent =
    talkmakerTimeLabel ? (
      <div className={`flex items-end gap-1 ${isSelf ? 'justify-end' : ''}`}>
        {isSelf ? <TalkmakerExternalTimestamp timeLabel={talkmakerTimeLabel} /> : null}
        {cardInner}
        {!isSelf ? <TalkmakerExternalTimestamp timeLabel={talkmakerTimeLabel} /> : null}
      </div>
    ) : (
      cardInner
    )
  const card = (
    <div
      ref={anchorRef}
      className="relative inline-block select-none transition-[transform,opacity] duration-150 ease-out"
      style={pressStyle}
      {...bind}
    >
      {cardContent}
    </div>
  )
  const showAvatarVisual = showAvatar && showAvatarColumn
  const reserveAvatarGutter = showAvatar
  const rankBeside = groupRankShowBesideNickname !== false
  const avatarGutter = <div className="h-10 w-10 shrink-0" aria-hidden />
  const rowWidthClass =
    variant === 'preview'
      ? 'w-full max-w-full shrink-0 overflow-x-hidden'
      : 'w-[100vw] max-w-[100vw] shrink-0 overflow-x-visible'
  const cardMaxClass =
    variant === 'preview' ? 'min-w-0 max-w-full' : 'min-w-0 max-w-[calc(100vw-96px)]'
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
    if (messengerStyle === 'talkmaker') {
      return (
        <div className={rowWidthClass} data-wx-msg-id={id}>
          <div
            className={`ml-auto mr-[24px] flex max-w-full flex-row-reverse items-start ${multiSelectAvatar ? 'gap-[12px]' : ''}`}
          >
            {multiSelectAvatar}
            <div className={cardMaxClass}>{card}</div>
          </div>
        </div>
      )
    }
    return (
      <div className={rowWidthClass} data-wx-msg-id={id}>
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
          <div className={cardMaxClass}>{card}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={rowWidthClass} data-wx-msg-id={id}>
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
        <div className={cardMaxClass}>
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
