import type { Character, PlayerIdentity } from './newFriendsPersona/types'
import {
  bundleFromCharacterFields,
  findAppearanceRefContextOverrideForCharacter,
  getAppearanceRefContextOverride,
  normalizeAppearanceRefPlayerIdentityId,
  type AppearanceRefBundle,
  type AppearanceRefContext,
  type AppearanceRefContextOverride,
} from './appearanceRefContextStore'

export type ResolvedScopedAppearanceRefs = {
  character: AppearanceRefBundle
  user: AppearanceRefBundle
  characterForked: boolean
  userForked: boolean
}

export async function resolveScopedAppearanceRefs(params: {
  context: AppearanceRefContext | 'global'
  playerIdentityId?: string | null
  characterId?: string | null
  character?: Character | null
  playerIdentity?: PlayerIdentity | null
}): Promise<ResolvedScopedAppearanceRefs> {
  const character = params.character ?? null
  const playerIdentity = params.playerIdentity ?? null
  const cid = params.characterId?.trim() || character?.id?.trim() || ''
  const pid =
    normalizeAppearanceRefPlayerIdentityId(params.playerIdentityId) ||
    normalizeAppearanceRefPlayerIdentityId(playerIdentity?.id) ||
    normalizeAppearanceRefPlayerIdentityId(character?.playerIdentityId)

  const globalCharacter = bundleFromCharacterFields(
    character?.appearanceRefImages,
    character?.appearanceRefUrl,
    character?.appearanceRefNote,
  )
  const globalUser = bundleFromCharacterFields(
    playerIdentity?.appearanceRefImages,
    playerIdentity?.appearanceRefUrl,
    playerIdentity?.appearanceRefNote,
  )

  if (params.context === 'global' || !cid) {
    return {
      character: globalCharacter,
      user: globalUser,
      characterForked: false,
      userForked: false,
    }
  }

  let override: AppearanceRefContextOverride | null = null
  if (pid) {
    override = await getAppearanceRefContextOverride(pid, cid, params.context)
  }
  // 无 pid / 身份不一致 / 历史用 __none__ 存的独立配置：按角色+场景回退
  if (!override?.forked) {
    override = await findAppearanceRefContextOverrideForCharacter(cid, params.context, pid)
  }
  if (!override?.forked) {
    return {
      character: globalCharacter,
      user: globalUser,
      characterForked: false,
      userForked: false,
    }
  }

  /** 仅笔记 fork、图片为空时保留全局参考图，避免「有图却生图丢参考」 */
  const mergeForkedBundle = (
    global: AppearanceRefBundle,
    overrideImages: AppearanceRefBundle['images'] | undefined | null,
    overrideNote: string | undefined | null,
    hasNoteField: boolean,
  ): AppearanceRefBundle => {
    const images =
      overrideImages && overrideImages.length > 0 ? overrideImages : global.images
    const note = hasNoteField
      ? String(overrideNote ?? '').trim()
      : global.note
    return { images, note }
  }

  const hasCharacterLocal =
    (override.characterRefImages?.length ?? 0) > 0 ||
    typeof override.characterRefNote === 'string'
  const hasUserLocal =
    (override.userRefImages?.length ?? 0) > 0 || typeof override.userRefNote === 'string'

  const characterBundle = hasCharacterLocal
    ? mergeForkedBundle(
        globalCharacter,
        override.characterRefImages,
        override.characterRefNote,
        typeof override.characterRefNote === 'string',
      )
    : globalCharacter
  const userBundle = hasUserLocal
    ? mergeForkedBundle(
        globalUser,
        override.userRefImages,
        override.userRefNote,
        typeof override.userRefNote === 'string',
      )
    : globalUser

  return {
    character: characterBundle,
    user: userBundle,
    characterForked: hasCharacterLocal,
    userForked: hasUserLocal,
  }
}

/** 将 bundle 写回 Character 形态字段，供 buildCharacterMediaImageGenParams 复用 */
export function appearanceBundleToCharacterPatch(bundle: AppearanceRefBundle): Pick<
  Character,
  'appearanceRefImages' | 'appearanceRefUrl' | 'appearanceRefNote'
> {
  const primary = bundle.images[0]?.url?.trim()
  return {
    appearanceRefImages: bundle.images.length ? bundle.images : undefined,
    appearanceRefUrl: primary || undefined,
    appearanceRefNote: bundle.note,
  }
}
