import type { Character, PlayerIdentity } from '../types'
import { LifeMutableEditor } from '../../lifeMutable/LifeMutableEditor'

export function LifeMutableTab({
  character,
  playerIdentity,
}: {
  character: Character
  playerIdentity: PlayerIdentity | null
}) {
  return <LifeMutableEditor character={character} playerIdentity={playerIdentity} />
}
