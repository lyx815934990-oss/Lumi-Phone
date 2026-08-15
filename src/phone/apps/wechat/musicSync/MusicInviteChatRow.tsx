import type { ReactNode } from 'react'

import type { WeChatBubbleTheme } from '../../../types'
import {
  ChatGroupSenderNicknameWithRank,
  ChatGroupSpeakerRankOnAvatar,
} from '../group/ChatGroupSpeakerAvatarWrap'
import { useSpecialChatCardLongPress } from '../hooks/useSpecialChatCardLongPress'
import type { WeChatMusicSyncPayload, WeChatMusicSyncInvitePayload } from '../newFriendsPersona/types'
import { AcceptResponseCard } from './AcceptResponseCard'
import { CharacterInviteReceivedCard } from './CharacterInviteReceivedCard'
import { DeclineResponseCard } from './DeclineResponseCard'
import { InviteSentCard } from './InviteSentCard'

type Props = {
  id: string
  isSelf: boolean
  data: WeChatMusicSyncPayload
  bubble: WeChatBubbleTheme
  showAvatar: boolean
  showAvatarColumn: boolean
  chatSelfAvatarUrl?: string
  chatOtherAvatarUrl?: string
  chatOtherSenderNickname?: string
  chatOtherAvatarRankBadge?: 'owner' | 'admin' | null
  chatSelfAvatarRankBadge?: 'owner' | 'admin' | null
  groupRankShowBesideNickname?: boolean
  animated?: boolean
  /** music_accept：邀约曲目封面（可来自 data 或会话内邀约卡） */
  inviteCoverUrl?: string
  musicInviteRespondBusy?: boolean
  onRespondToCharacterInvite?: (
    messageId: string,
    invite: WeChatMusicSyncInvitePayload,
    response: 'accept' | 'decline',
  ) => void
  multiSelectAvatar?: ReactNode
  selected?: boolean
  onLongPress?: (anchorRect: DOMRect) => void
}

function MusicSyncCardBody({
  messageId,
  isSelf,
  data,
  inviteCoverUrl,
  peerName,
  musicInviteRespondBusy,
  onRespondToCharacterInvite,
}: {
  messageId: string
  isSelf: boolean
  data: WeChatMusicSyncPayload
  inviteCoverUrl?: string
  peerName?: string
  musicInviteRespondBusy?: boolean
  onRespondToCharacterInvite?: (
    messageId: string,
    invite: WeChatMusicSyncInvitePayload,
    response: 'accept' | 'decline',
  ) => void
}) {
  if (data.kind === 'music_invite') {
    if (isSelf) return <InviteSentCard data={data} />
    return (
      <CharacterInviteReceivedCard
        data={data}
        peerName={peerName}
        busy={musicInviteRespondBusy}
        onAccept={() => onRespondToCharacterInvite?.(messageId, data, 'accept')}
        onDecline={() => onRespondToCharacterInvite?.(messageId, data, 'decline')}
      />
    )
  }
  if (data.kind === 'music_accept') {
    return <AcceptResponseCard data={data} coverUrl={inviteCoverUrl} />
  }
  return <DeclineResponseCard data={data} />
}

/** 同频共听邀约 / 回应聊天气泡行 */
export function MusicInviteChatRow({
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
  inviteCoverUrl,
  musicInviteRespondBusy,
  onRespondToCharacterInvite,
  multiSelectAvatar,
  selected = false,
  onLongPress,
}: Props) {
  const avatarPx = 40
  const { anchorRef, bind, pressStyle } = useSpecialChatCardLongPress(onLongPress, selected)
  const listenStatus =
    data.kind === 'music_invite'
      ? 'invite'
      : data.kind === 'music_accept'
        ? 'accepted'
        : 'declined'
  const card = (
    <div
      ref={anchorRef}
      className="relative inline-block select-none transition-[transform,opacity] duration-150 ease-out"
      style={pressStyle}
      {...bind}
      data-wx-msg-kind="listen-together"
      data-wx-special-card
      data-wx-special-status={listenStatus}
      data-wx-bubble-side={isSelf ? 'self' : 'other'}
    >
      <MusicSyncCardBody
        messageId={id}
        isSelf={isSelf}
        data={data}
        inviteCoverUrl={inviteCoverUrl}
        peerName={chatOtherSenderNickname}
        musicInviteRespondBusy={musicInviteRespondBusy}
        onRespondToCharacterInvite={onRespondToCharacterInvite}
      />
    </div>
  )
  const showAvatarVisual = showAvatar && showAvatarColumn
  const reserveAvatarGutter = showAvatar
  const rankBeside = groupRankShowBesideNickname !== false
  /** 与同一人连续气泡对齐：仅占位，不渲染可见灰块 */
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
          {multiSelectAvatar ?? (
            <ChatGroupSpeakerRankOnAvatar chromeSide="other" rankBadge={rankBeside ? null : chatOtherAvatarRankBadge}>
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
          )}
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
          {avatarGutter}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">{card}</div>
        </div>
      ) : (
        <div className="ml-[24px] mr-auto min-w-0">{card}</div>
      )}
    </div>
  )
}
