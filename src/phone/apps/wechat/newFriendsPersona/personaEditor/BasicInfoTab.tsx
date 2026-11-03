import type { Character, Gender } from '../types'
import type { ApiConfig } from '../../../api/types'
import { CharacterBasicProfileForm } from '../CharacterBasicProfileForm'

export function BasicInfoTab(props: {
  editorId: string
  character: Character
  isNpcPerspective: boolean
  protagonistCallsUser: string
  onProtagonistCallsChange: (v: string) => void
  onProtagonistCallsInteraction: () => void
  avatarFileInputRef: React.RefObject<HTMLInputElement | null>
  onPickAvatarFile: (file: File | null) => void
  patchCharacter: (p: Partial<Character>) => void
  onMbtiSelect: (nextCode: string) => void
  apiConfig: ApiConfig | null
  bioGenerating: boolean
  setBioGenerating: (v: boolean) => void
  onBioApiMissing: () => void
  onBioWorldBookMissing: () => void
  genderLabelZh: (g: Gender | undefined | null) => string
}) {
  return (
    <section className="pb-4 pt-1">
      <CharacterBasicProfileForm {...props} />
    </section>
  )
}
