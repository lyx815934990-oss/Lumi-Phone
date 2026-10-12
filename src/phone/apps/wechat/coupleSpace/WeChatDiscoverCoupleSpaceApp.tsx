import type { WeChatPersonaContact } from '../../../types'
import { CoupleSpaceApp } from './CoupleSpaceApp'
import { COUPLE_SPACE_UNDER_DEV } from './coupleSpaceDevFlags'
import { CoupleSpaceUnderDevPage } from './CoupleSpaceUnderDevPage'

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
  if (COUPLE_SPACE_UNDER_DEV) {
    return (
      <div className={`h-full min-h-0 ${className}`}>
        <CoupleSpaceUnderDevPage
          title="情侣空间"
          hint="共写日记、纪念日历与双人玩法仍在打磨，完成后将在此接入。"
          onBack={onBack}
        />
      </div>
    )
  }

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
