import {
  pickStablePulseNetizenAvatarPath,
  resolvePulseAuthorAvatarUrl,
} from '../lumiPulse/pulseNetizenAvatar'

export function personaAvatarResolved(personaId: string, username: string): string | undefined {
  return resolvePulseAuthorAvatarUrl(
    pickStablePulseNetizenAvatarPath(`fanfic:${personaId}:${username}`),
  )
}
