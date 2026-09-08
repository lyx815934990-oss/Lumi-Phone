import { lazy, Suspense } from 'react'

import { BEAD_CRAFT_UNDER_DEV } from './beadCraftDevFlags'
import { BeadCraftUnderDev } from './BeadCraftUnderDev'
import type { WeChatPersonaContact } from '../../types'

export type BeadCraftAppProps = {
  onBack: () => void
  className?: string
  personaContacts?: WeChatPersonaContact[]
  wechatAccountId?: string
}

/** 开发中占位不拉取拼豆完整界面；完整流程按需 chunk */
const BeadCraftAppInner = lazy(() =>
  import('./BeadCraftAppInner').then((m) => ({ default: m.BeadCraftAppInner })),
)

export function BeadCraftApp(props: BeadCraftAppProps) {
  if (BEAD_CRAFT_UNDER_DEV) {
    return <BeadCraftUnderDev onBack={props.onBack} className={props.className} />
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#FFF8F4] text-[13px] text-[#9a8f8a]">
          打开一起拼豆…
        </div>
      }
    >
      <BeadCraftAppInner {...props} />
    </Suspense>
  )
}

export default BeadCraftApp
