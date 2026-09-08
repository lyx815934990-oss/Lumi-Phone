import { lazy, Suspense } from 'react'

import { HOME_BUILD_UNDER_DEV } from './homeBuildDevFlags'
import { HomeBuildUnderDev } from './HomeBuildUnderDev'
import type { WeChatPersonaContact } from '../../types'

export type HomeBuildAppProps = {
  onBack: () => void
  className?: string
  personaContacts?: WeChatPersonaContact[]
  wechatAccountId?: string
}

/** 开发中占位不拉取 3D 家园完整界面；完整流程按需 chunk */
const HomeBuildAppInner = lazy(() =>
  import('./HomeBuildAppInner').then((m) => ({ default: m.HomeBuildAppInner })),
)

export function HomeBuildApp(props: HomeBuildAppProps) {
  if (HOME_BUILD_UNDER_DEV) {
    return <HomeBuildUnderDev onBack={props.onBack} className={props.className} />
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#F7F6F4] text-[13px] text-[#8B8B8F]">
          打开 3D 家园…
        </div>
      }
    >
      <HomeBuildAppInner {...props} />
    </Suspense>
  )
}

export default HomeBuildApp
