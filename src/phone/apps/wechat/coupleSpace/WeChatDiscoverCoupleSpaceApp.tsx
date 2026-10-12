import type { WeChatPersonaContact } from '../../../types'
import { CoupleSpaceApp } from './CoupleSpaceApp'

/** 微信发现 Tab · 情侣空间入口 */
export function WeChatDiscoverCoupleSpaceApp({
  onBack,
  personaContacts = [],
  userDisplayName,
  userAvatarUrl,
  wechatAccountId,
  className = '',
}: {
  onBack: () => void
  personaContacts?: WeChatPersonaContact[]
  userDisplayName: string
  userAvatarUrl?: string
  wechatAccountId?: string | null
  className?: string
}) {
  return (
    <div className={`h-full min-h-0 ${className}`}>
      <CoupleSpaceApp
        onBack={onBack}
        personaContacts={personaContacts}
        userDisplayName={userDisplayName}
        userAvatarUrl={userAvatarUrl}
        wechatAccountId={wechatAccountId}
      />
    </div>
  )
}
