import { DEFAULT_PUBLIC_AVATAR_PATH } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'

/** 账本头像：专属优先，否则微信头像，再否则默认图 */
export function resolveLifeLedgerAvatarSrc(
  ledgerAvatar: string | undefined,
  wechatAvatarUrl?: string | null,
): string {
  const custom = ledgerAvatar?.trim() || ''
  if (custom) {
    return (
      resolveCharacterAvatarUrl({ avatarUrl: custom }) ||
      resolveCharacterAvatarUrl({ avatarUrl: DEFAULT_PUBLIC_AVATAR_PATH })
    )
  }
  return (
    resolveCharacterAvatarUrl({ avatarUrl: wechatAvatarUrl }) ||
    resolveCharacterAvatarUrl({ avatarUrl: DEFAULT_PUBLIC_AVATAR_PATH })
  )
}
