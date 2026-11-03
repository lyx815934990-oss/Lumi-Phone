import type { WeChatPersonaContact } from '../../types'
import { ForumHubApp } from './components/ForumHubApp'

export function FanficForumApp({
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
  wechatAvatarUrl?: string | null
  wechatAccountId?: string | null
  playerIdentityId?: string | null
  className?: string
}) {
  return (
    <ForumHubApp
      onBack={onBack}
      personaContacts={personaContacts}
      userDisplayName={userDisplayName}
      wechatAvatarUrl={wechatAvatarUrl}
      wechatAccountId={wechatAccountId}
      playerIdentityId={playerIdentityId}
      className={className}
    />
  )
}
