import type { WeChatPersonaContact } from '../../types'
import { FanficForumApp } from './FanficForumApp'

/** 微信发现 Tab · 同人创作论坛入口 */
export function WeChatDiscoverFanficForumApp({
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
  /** 微信头像；通讯社自定义头像与此隔离 */
  wechatAvatarUrl?: string | null
  wechatAccountId?: string | null
  playerIdentityId?: string | null
  className?: string
}) {
  return (
    <FanficForumApp
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
