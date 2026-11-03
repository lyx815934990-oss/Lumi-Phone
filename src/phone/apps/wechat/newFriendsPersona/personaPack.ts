import type {
  Character,
  PersonaPack,
  PersonaPackKind,
  PersonaPackPremiseKind,
  PersonaPackSeat,
  WorldBook,
} from './types'
import { uid } from './utils'
import { DEFAULT_WORLD_BACKGROUND_ID } from './worldBackgroundConstants'
import { stampWechatAccountOwner } from '../wechatAccountScope'
import { pickRandomPersonaCharacterAvatar } from './personaCharacterAvatarPool'

export const PERSONA_PACK_PREMISE_OPTIONS: ReadonlyArray<{
  id: PersonaPackPremiseKind
  label: string
  hint: string
}> = [
  { id: 'dating_show', label: '恋综', hint: '多名可攻略对象同台，节目组当 NPC' },
  { id: 'variety', label: '综艺', hint: '游戏、任务、嘉宾，可攻略与主持分开' },
  { id: 'battle_royale', label: '异世界大逃杀', hint: '存活规则共用，队友/对手可攻略' },
  { id: 'custom', label: '自定义', hint: '自己写背景与规则' },
]

export function personaPackPremiseLabel(kind: PersonaPackPremiseKind | undefined): string {
  return PERSONA_PACK_PREMISE_OPTIONS.find((x) => x.id === kind)?.label ?? '演出卡'
}

export function isPersonaPackRomanceSeat(ch: Pick<Character, 'packSeat' | 'generatedForCharacterId'>): boolean {
  if (ch.packSeat === 'npc') return false
  if (ch.packSeat === 'romance') return true
  return !ch.generatedForCharacterId
}

export function clampEnsembleRomanceCount(n: number): number {
  if (!Number.isFinite(n)) return 4
  return Math.min(8, Math.max(2, Math.round(n)))
}

export function clampEnsembleNpcCount(n: number): number {
  if (!Number.isFinite(n)) return 2
  return Math.min(8, Math.max(0, Math.round(n)))
}

export function normalizePersonaPack(input: unknown): PersonaPack | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id) return null
  const now = Date.now()
  const kind: PersonaPackKind = raw.kind === 'ensemble' ? 'ensemble' : 'solo'
  const premiseKind: PersonaPackPremiseKind =
    raw.premiseKind === 'dating_show' ||
    raw.premiseKind === 'variety' ||
    raw.premiseKind === 'battle_royale' ||
    raw.premiseKind === 'custom'
      ? raw.premiseKind
      : 'custom'
  const memberIds = Array.isArray(raw.memberIds)
    ? [
        ...new Set(
          raw.memberIds
            .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            .map((x) => x.trim()),
        ),
      ]
    : []
  const npcIds = Array.isArray(raw.npcIds)
    ? [
        ...new Set(
          raw.npcIds
            .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            .map((x) => x.trim()),
        ),
      ]
    : []
  const anchor =
    typeof raw.anchorMemberId === 'string' && raw.anchorMemberId.trim()
      ? raw.anchorMemberId.trim()
      : memberIds[0] ?? ''
  return {
    id,
    createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : now,
    kind,
    title: typeof raw.title === 'string' ? raw.title.trim().slice(0, 64) : '',
    premiseKind,
    premise: typeof raw.premise === 'string' ? raw.premise.trim().slice(0, 4000) : '',
    sharedRules: typeof raw.sharedRules === 'string' ? raw.sharedRules.trim().slice(0, 8000) : '',
    memberIds,
    npcIds,
    anchorMemberId: anchor,
    wechatAccountId: typeof raw.wechatAccountId === 'string' ? raw.wechatAccountId.trim() || undefined : undefined,
    playerIdentityId:
      typeof raw.playerIdentityId === 'string' ? raw.playerIdentityId.trim() || undefined : undefined,
    worldBackgroundId:
      typeof raw.worldBackgroundId === 'string' ? raw.worldBackgroundId.trim() || undefined : undefined,
  }
}

export function buildPackSharedWorldBook(params: {
  title: string
  premiseKind: PersonaPackPremiseKind
  premise: string
  sharedRules: string
}): WorldBook {
  const now = Date.now()
  const kindLabel = personaPackPremiseLabel(params.premiseKind)
  const title = params.title.trim() || kindLabel
  const body = [
    `【演出卡】${title}（${kindLabel}）`,
    params.premise.trim() ? `【背景】${params.premise.trim()}` : '',
    params.sharedRules.trim() ? `【共用规则】${params.sharedRules.trim()}` : '',
    '【席位】本卡可攻略对象为正式成员；节目组/路人等 NPC 不是默认攻略对象。知情以当场在场为准。',
  ]
    .filter(Boolean)
    .join('\n')
  return {
    id: uid('wb'),
    name: `演出卡 · ${title}`.slice(0, 40),
    enabled: true,
    items: [
      {
        id: uid('wbi'),
        name: '共用背景与规则',
        enabled: true,
        priority: 'before',
        keywords: `${kindLabel},演出卡,共用规则`,
        content: body,
        updatedAt: now,
      },
    ],
  }
}

export function newBlankPackCharacter(params: {
  packId: string
  packSeat: PersonaPackSeat
  anchorMemberId?: string
  playerIdentityId?: string
  wechatAccountId?: string | null
  worldBackgroundId?: string
  name?: string
  gender?: Character['gender']
  identity?: string
  bio?: string
  interests?: string[]
  painPoints?: string[]
  worldBooks?: WorldBook[]
  /** 同卡内已占用头像，尽量不重复 */
  usedAvatarUrls?: Set<string>
}): Character {
  const now = Date.now()
  const id = uid('ch')
  const seat = params.packSeat
  const isNpc = seat === 'npc'
  const gender = params.gender ?? 'female'
  // usedAvatarUrls 传入后，同卡内已占用的图会跳过（池未耗尽前不重复）
  const avatarUrl = pickRandomPersonaCharacterAvatar(gender, params.usedAvatarUrls)
  const base: Character = {
    id,
    createdAt: now,
    updatedAt: now,
    name: params.name?.trim() || '',
    gender,
    age: null,
    height: '',
    weight: '',
    birthdayMD: '',
    zodiac: '',
    identity: params.identity?.trim() || '',
    mbti: '',
    bio: params.bio?.trim() || '',
    openingLines: '',
    avatarUrl,
    originalAvatarUrl: avatarUrl || undefined,
    wechatNickname: '',
    wechatId: '',
    wechatSignature: '',
    wechatRegion: '',
    momentsCoverUrl: '',
    worldBooks: params.worldBooks ?? [],
    worldBackgroundId: params.worldBackgroundId?.trim() || DEFAULT_WORLD_BACKGROUND_ID,
    worldBackgroundEnabled: true,
    packId: params.packId,
    packSeat: seat,
    wechatEnlisted: !isNpc,
    playerIdentityId: params.playerIdentityId,
    interests: params.interests,
    painPoints: params.painPoints,
  }
  if (isNpc && params.anchorMemberId?.trim()) {
    base.generatedForCharacterId = params.anchorMemberId.trim()
  }
  if (params.wechatAccountId?.trim()) {
    return stampWechatAccountOwner(base, params.wechatAccountId.trim())
  }
  return base
}

