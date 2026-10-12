import type { ApiConfig } from '../../../api/types'
import type { Character, PlayerIdentity } from '../types'
import { WorldBooksEditor } from '../WorldBooksEditor'

export function WorldbookTab({
  apiConfig,
  character,
  worldBackgroundPrompt,
  identityContext,
  linkedNpcsContext,
  onChange,
}: {
  apiConfig: ApiConfig | null
  character: Character
  worldBackgroundPrompt: string
  identityContext: PlayerIdentity | null
  linkedNpcsContext: string
  onChange: (next: Character | ((prev: Character) => Character)) => void
}) {
  return (
    <div className="persona-worldbook-shelf relative overflow-hidden rounded-[14px] border border-neutral-200/90 bg-[#FAFAFA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <WorldBooksEditor
        apiConfig={apiConfig}
        character={character}
        forPlayerIdentity={false}
        worldBackgroundPrompt={worldBackgroundPrompt}
        identityContext={identityContext}
        linkedNpcsContext={linkedNpcsContext}
        onChange={onChange}
      />
    </div>
  )
}
