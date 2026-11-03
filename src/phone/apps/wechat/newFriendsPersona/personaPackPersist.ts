import type { Character, PersonaPack, PersonaPackPremiseKind, Relationship } from './types'
import { uid } from './utils'
import { DEFAULT_WORLD_BACKGROUND_ID } from './worldBackgroundConstants'
import { emitWeChatStorageChanged, personaDb } from './idb'
import {
  buildPackSharedWorldBook,
  newBlankPackCharacter,
  personaPackPremiseLabel,
} from './personaPack'

export async function persistEnsemblePack(params: {
  title: string
  premiseKind: PersonaPackPremiseKind
  premise: string
  sharedRules: string
  playerIdentityId: string
  wechatAccountId?: string | null
  worldBackgroundId?: string
  romance: Array<Partial<Pick<Character, 'name' | 'gender' | 'identity' | 'bio' | 'interests' | 'painPoints'>>>
  npcs: Array<Partial<Pick<Character, 'name' | 'gender' | 'identity' | 'bio' | 'interests' | 'painPoints'>>>
  relations?: Array<{
    fromRomanceIndex?: number
    toRomanceIndex?: number
    fromNpcIndex?: number
    toNpcIndex?: number
    relation: string
    fromPerspective?: string
    toPerspective?: string
    fromCallsTo?: string
  }>
}): Promise<{ pack: PersonaPack; romance: Character[]; npcs: Character[] }> {
  const packId = uid('pack')
  const sharedBook = buildPackSharedWorldBook({
    title: params.title,
    premiseKind: params.premiseKind,
    premise: params.premise,
    sharedRules: params.sharedRules,
  })
  const romanceCount = Math.max(2, params.romance.length)
  const romanceDrafts = Array.from({ length: romanceCount }, (_, i) => params.romance[i] ?? {})
  const usedAvatarUrls = new Set<string>()
  const romance: Character[] = romanceDrafts.map((row) =>
    newBlankPackCharacter({
      packId,
      packSeat: 'romance',
      playerIdentityId: params.playerIdentityId,
      wechatAccountId: params.wechatAccountId,
      worldBackgroundId: params.worldBackgroundId,
      name: row.name,
      gender: row.gender,
      identity: row.identity,
      bio: row.bio,
      interests: row.interests,
      painPoints: row.painPoints,
      worldBooks: [{ ...sharedBook, id: uid('wb') }],
      usedAvatarUrls,
    }),
  )
  const anchorId = romance[0]!.id
  const npcs: Character[] = params.npcs.map((row) =>
    newBlankPackCharacter({
      packId,
      packSeat: 'npc',
      anchorMemberId: anchorId,
      playerIdentityId: params.playerIdentityId,
      wechatAccountId: params.wechatAccountId,
      worldBackgroundId: params.worldBackgroundId,
      name: row.name,
      gender: row.gender,
      identity: row.identity,
      bio: row.bio,
      interests: row.interests,
      painPoints: row.painPoints,
      worldBooks: [{ ...sharedBook, id: uid('wb') }],
      usedAvatarUrls,
    }),
  )

  const now = Date.now()
  const pack: PersonaPack = {
    id: packId,
    createdAt: now,
    updatedAt: now,
    kind: 'ensemble',
    title: params.title.trim() || personaPackPremiseLabel(params.premiseKind),
    premiseKind: params.premiseKind,
    premise: params.premise.trim(),
    sharedRules: params.sharedRules.trim(),
    memberIds: romance.map((c) => c.id),
    npcIds: npcs.map((c) => c.id),
    anchorMemberId: anchorId,
    wechatAccountId: params.wechatAccountId?.trim() || undefined,
    playerIdentityId: params.playerIdentityId.trim() || undefined,
    worldBackgroundId: params.worldBackgroundId?.trim() || DEFAULT_WORLD_BACKGROUND_ID,
  }

  for (const ch of [...romance, ...npcs]) {
    await personaDb.upsertCharacter(ch)
  }
  await personaDb.putPersonaPack(pack)

  const rels: Relationship[] = []
  for (const edge of params.relations ?? []) {
    const from =
      typeof edge.fromRomanceIndex === 'number' && romance[edge.fromRomanceIndex]
        ? romance[edge.fromRomanceIndex]!.id
        : typeof edge.fromNpcIndex === 'number' && npcs[edge.fromNpcIndex]
          ? npcs[edge.fromNpcIndex]!.id
          : ''
    const to =
      typeof edge.toRomanceIndex === 'number' && romance[edge.toRomanceIndex]
        ? romance[edge.toRomanceIndex]!.id
        : typeof edge.toNpcIndex === 'number' && npcs[edge.toNpcIndex]
          ? npcs[edge.toNpcIndex]!.id
          : ''
    if (!from || !to || from === to) continue
    rels.push({
      id: uid('rel'),
      fromCharacterId: from,
      toCharacterId: to,
      relation: (edge.relation || '认识').trim().slice(0, 24),
      fromPerspective: (edge.fromPerspective || '').trim().slice(0, 400),
      toPerspective: (edge.toPerspective || '').trim().slice(0, 400),
      fromCallsTo: (edge.fromCallsTo || '').trim().slice(0, 24),
    })
  }
  if (rels.length) await personaDb.bulkPutRelationships(rels)
  emitWeChatStorageChanged()
  return { pack, romance, npcs }
}
