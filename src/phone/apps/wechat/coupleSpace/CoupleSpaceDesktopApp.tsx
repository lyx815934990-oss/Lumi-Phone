import { lazy, Suspense, useEffect, useState } from 'react'

import { useCustomization } from '../../../CustomizationContext'
import type { WeChatPersonaContact } from '../../../types'
import { personaDb } from '../newFriendsPersona/idb'
import {
  findAccountById,
  loadAccountsBundle,
  resolveAccountSessionIdentityId,
} from '../wechatAccountPersistence'
import { COUPLE_SPACE_DESKTOP_UNDER_DEV } from './coupleSpaceDevFlags'
import { CoupleSpaceUnderDevPage } from './CoupleSpaceUnderDevPage'

/** 开发中占位不拉取完整情侣空间；完整流程按需 chunk */
const CoupleSpaceApp = lazy(() =>
  import('./CoupleSpaceApp').then((m) => ({ default: m.CoupleSpaceApp })),
)

function CoupleSpaceDesktopAppInner({ onBack }: { onBack: () => void }) {
  const { state } = useCustomization()
  const [wechatAccountId, setWechatAccountId] = useState<string | null>(null)
  const [userDisplayName, setUserDisplayName] = useState('我')
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined)
  const [accountContacts, setAccountContacts] = useState<WeChatPersonaContact[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const bundle = await loadAccountsBundle()
        if (!bundle || cancelled) return
        const account = findAccountById(bundle, bundle.currentAccountId)
        if (!account || cancelled) return
        setWechatAccountId(account.accountId)
        const accountAvatar = account.avatarUrl?.trim()
        if (accountAvatar) setUserAvatarUrl(accountAvatar)
        if (Array.isArray(account.personaContacts) && account.personaContacts.length > 0) {
          setAccountContacts(account.personaContacts)
        }
        const nick = account.nickname?.trim()
        if (nick) {
          setUserDisplayName(nick)
          return
        }
        const pid = resolveAccountSessionIdentityId(account).trim()
        if (pid && pid !== '__none__') {
          const identity = await personaDb.getPlayerIdentity(pid)
          if (cancelled) return
          const name =
            identity?.wechatNickname?.trim() || identity?.name?.trim() || ''
          if (name) setUserDisplayName(name)
          const idAvatar = identity?.avatarUrl?.trim() || ''
          if (idAvatar && !accountAvatar) setUserAvatarUrl(idAvatar)
        }
      } catch {
        // ignore — 无账号时仍可打开空态页
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#FFF8F5] text-[13px] text-[#B99A8E]">
          打开情侣空间…
        </div>
      }
    >
      <CoupleSpaceApp
        onBack={onBack}
        personaContacts={accountContacts ?? state.wechatPersonaContacts}
        userDisplayName={userDisplayName}
        userAvatarUrl={userAvatarUrl || state.profile.avatarImageUrl || undefined}
        wechatAccountId={wechatAccountId}
      />
    </Suspense>
  )
}

/** 桌面独立应用：情侣空间（与微信发现共用同一套数据） */
export function CoupleSpaceDesktopApp({ onBack }: { onBack: () => void }) {
  if (COUPLE_SPACE_DESKTOP_UNDER_DEV) {
    return (
      <CoupleSpaceUnderDevPage
        title="情侣空间"
        hint="共写日记、纪念日历与双人玩法仍在打磨，完成后将在此接入。"
        onBack={onBack}
      />
    )
  }
  return <CoupleSpaceDesktopAppInner onBack={onBack} />
}
