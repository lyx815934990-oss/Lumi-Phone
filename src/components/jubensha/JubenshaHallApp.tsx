import { lazy, Suspense } from 'react'

import { JUBENSHA_HALL_UNDER_DEV } from './jubenshaDevFlags'
import { JubenshaHallUnderDev } from './JubenshaHallUnderDev'
import type { WeChatPersonaContact } from '../../phone/types'

export type JubenshaHallAppProps = {
  onBack: () => void
  currentUserName?: string
  personaContacts?: WeChatPersonaContact[]
}

/** 开发中占位不拉取对局媒体；完整大厅与 JBSGameFlow 按需 chunk */
const JubenshaHallAppInner = lazy(() =>
  import('./JubenshaHallAppInner').then((m) => ({ default: m.JubenshaHallAppInner })),
)

export function JubenshaHallApp(props: JubenshaHallAppProps) {
  if (JUBENSHA_HALL_UNDER_DEV) {
    return <JubenshaHallUnderDev onBack={props.onBack} />
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#f4f1ea] text-[13px] text-[#5c3d2e]/45">
          打开剧本杀馆…
        </div>
      }
    >
      <JubenshaHallAppInner {...props} />
    </Suspense>
  )
}

export default JubenshaHallApp
