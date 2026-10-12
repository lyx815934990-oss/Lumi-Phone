import type { WeChatPersonaContact } from '../../types'
import { ForumHubApp } from './components/ForumHubApp'

export function FanficForumApp({
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
  return (
    <ForumHubApp
      onBack={onBack}
      personaContacts={personaContacts}
      userDisplayName={userDisplayName}
      wechatAccountId={wechatAccountId}
      playerIdentityId={playerIdentityId}
      className={className}
    />
  )
}
