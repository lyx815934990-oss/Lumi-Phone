import type { Character, PlayerIdentity } from '../types'
import { LifeMutableEditor } from '../../lifeMutable/LifeMutableEditor'
import { INK_KICKER, INK_LEAD, INK_SECTION, INK_TITLE } from './personaEditorTabs'

export function LifeMutableTab({
  character,
  playerIdentity,
}: {
  character: Character
  playerIdentity: PlayerIdentity | null
}) {
  return (
    <section className={INK_SECTION}>
      <header className="border-b border-[#D2D0CB] px-4 py-4">
        <p className={INK_KICKER}>03 LIFE · 档案袋</p>
        <h2 className={INK_TITLE}>可变人生</h2>
        <p className={INK_LEAD}>职业、资产与羁绊可随剧情改写，并保留变更史。</p>
      </header>
      <div className="px-1 pb-2 pt-1">
        <LifeMutableEditor character={character} playerIdentity={playerIdentity} />
      </div>
    </section>
  )
}
