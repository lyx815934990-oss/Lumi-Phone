import type { WeChatPersonaContact } from '../../types'
import { FanficForumApp } from './FanficForumApp'

/** 微信发现 Tab · 同人创作论坛入口 */
export function WeChatDiscoverFanficForumApp({
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
    <FanficForumApp
      onBack={onBack}
      personaContacts={personaContacts}
      userDisplayName={userDisplayName}
      wechatAccountId={wechatAccountId}
      playerIdentityId={playerIdentityId}
      className={className}
    />
  )
}
