import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'

import type { WeChatPersonaContact } from '../../types'
import { BeadCraftTabBar } from './BeadCraftTabBar'
import { useBeadCraftStore } from './store'
import type { BeadCollectionItem, BeadCraftTab } from './types'
import { CraftSessionScreen } from './screens/CraftSessionScreen'
import { MineScreen } from './screens/MineScreen'
import { PlazaScreen } from './screens/PlazaScreen'
import { Viewer3DScreen } from './screens/Viewer3DScreen'
import './beadCraft.css'

type Route =
  | { kind: 'tabs' }
  | { kind: 'craft' }
  | { kind: 'viewer'; item: BeadCollectionItem; viewerMode: 'celebrate' | 'collection' }

export type BeadCraftAppInnerProps = {
  onBack: () => void
  className?: string
  personaContacts?: WeChatPersonaContact[]
  wechatAccountId?: string
}

export function BeadCraftAppInner({
  onBack,
  className = '',
  personaContacts = [],
  wechatAccountId,
}: BeadCraftAppInnerProps) {
  const bindAccount = useBeadCraftStore((s) => s.bindAccount)
  const updateCollectionNote = useBeadCraftStore((s) => s.updateCollectionNote)

  const [tab, setTab] = useState<BeadCraftTab>('plaza')
  const [route, setRoute] = useState<Route>({ kind: 'tabs' })

  useEffect(() => {
    void bindAccount(wechatAccountId)
  }, [bindAccount, wechatAccountId])

  if (route.kind === 'craft') {
    return (
      <div className={`bc-root relative flex h-full min-h-0 flex-col ${className}`} data-app-id="beadCraft">
        <CraftSessionScreen
          onBack={() => setRoute({ kind: 'tabs' })}
          onComplete={(item) => setRoute({ kind: 'viewer', item, viewerMode: 'celebrate' })}
        />
      </div>
    )
  }

  if (route.kind === 'viewer') {
    return (
      <div className={`bc-root relative flex h-full min-h-0 flex-col ${className}`} data-app-id="beadCraft">
        <Viewer3DScreen
          item={route.item}
          mode={route.viewerMode}
          onBack={() => setRoute({ kind: 'tabs' })}
          onDone={(note) => {
            if (note.trim()) updateCollectionNote(route.item.id, note.trim())
            if (route.viewerMode === 'celebrate') setTab('mine')
            setRoute({ kind: 'tabs' })
          }}
        />
      </div>
    )
  }

  return (
    <div className={`bc-root relative flex h-full min-h-0 flex-col ${className}`} data-app-id="beadCraft">
      <header className="bc-header flex shrink-0 items-center gap-2 border-b border-[#f0e4dc]/80 bg-white/55 px-3 pb-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full bg-white/70 shadow-sm"
          aria-label="返回发现"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-semibold tracking-tight text-[#2a2220]">一起拼豆</p>
          <p className="text-[11px] text-[#9a8f8a]">和 TA 慢慢填满每一颗豆</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'plaza' ? (
          <PlazaScreen
            contacts={personaContacts}
            onStartSession={() => setRoute({ kind: 'craft' })}
          />
        ) : (
          <MineScreen
            onOpenCollection={(item) =>
              setRoute({ kind: 'viewer', item, viewerMode: 'collection' })
            }
          />
        )}
      </div>

      <BeadCraftTabBar active={tab} onChange={setTab} />
    </div>
  )
}

export { BeadCraftAppInner as default }
