import type { ApiConfig } from '../../api/types'
import { generatePersonaWithAi, isPersonaAiAbortError } from './personaAiGenerate'
import { emptyPersonaAiGenerateForm } from './personaAiGenerateTypes'
import { PERSONA_AI_COMPACT_BOOK_TITLE } from './personaAiWorldBooks'
import { personaDb } from './idb'
import { personaPackPremiseLabel } from './personaPack'
import type { Character, PersonaPack, WorldBook } from './types'

function mergePackAndDossierBooks(prior: Character, generated: Character): WorldBook[] {
  const packBooks = (prior.worldBooks ?? []).filter((b) => String(b.name ?? '').startsWith('演出卡'))
  const dossier = (generated.worldBooks ?? []).filter(
    (b) => String(b.name ?? '').trim() === PERSONA_AI_COMPACT_BOOK_TITLE,
  )
  const rest = (generated.worldBooks ?? []).filter((b) => {
    const n = String(b.name ?? '').trim()
    return n !== PERSONA_AI_COMPACT_BOOK_TITLE && !n.startsWith('演出卡')
  })
  return [...packBooks, ...dossier, ...rest]
}

function formForPackMember(params: {
  ch: Character
  pack: PersonaPack
  seat: 'romance' | 'npc'
  others: Character[]
}): ReturnType<typeof emptyPersonaAiGenerateForm> {
  const form = emptyPersonaAiGenerateForm()
  const kind = personaPackPremiseLabel(params.pack.premiseKind)
  const others = params.others
    .filter((x) => x.id !== params.ch.id)
    .map((x) => `${x.name?.trim() || '未命名'}（${x.packSeat === 'npc' ? 'NPC' : '可攻略'}）`)
    .join('、')
  form.nameHint = params.ch.name?.trim() || ''
  form.gender = params.ch.gender ?? 'female'
  form.occupationHint = params.ch.identity?.trim() || ''
  form.backgroundHint = params.ch.bio?.trim() || ''
  form.hobbiesHint = (params.ch.interests ?? []).join('、')
  form.painPointsHint = (params.ch.painPoints ?? []).join('、')
  const toward = /对你[:：]\s*(.+)$/m.exec(params.ch.bio ?? '')
  form.relationToUser = toward?.[1]?.trim() || (params.seat === 'romance' ? '刚认识' : '工作关系')
  form.relationDetailHint =
    params.seat === 'romance'
      ? `在「${params.pack.title || kind}」里与玩家同台认识。背景：${params.pack.premise.slice(0, 400)}`
      : `以节目组/配角身份出现在「${params.pack.title || kind}」，与玩家主要是场面接触，不是默认可攻略线。`
  form.extraNotes = [
    `这是多人卡「${params.pack.title || kind}」（${kind}）中的${params.seat === 'romance' ? '可攻略对象' : 'NPC 席'}。`,
    params.pack.sharedRules.trim() ? `共用规则：${params.pack.sharedRules.trim().slice(0, 500)}` : '',
    others ? `同卡其他人：${others}` : '',
    '世界书必须按单人卡「角色人设档案」出齐，含尾声「对你的看法和态度」「对你的称呼」，以及序言「相遇羁绊」。',
    params.seat === 'npc'
      ? 'NPC 尾声对玩家的态度以职能/距离感为主，不要写成恋爱攻略对象。周边NPC条目不要把其他可攻略写成自己的跟班。'
      : '可攻略对象彼此平等；周边NPC可写主持/导演等，不要把同卡其他可攻略写成工具人。知情以当场在场为准。',
  ]
    .filter(Boolean)
    .join('\n')
  return form
}

export async function fillEnsembleMemberDossiers(params: {
  apiConfig: ApiConfig
  pack: PersonaPack
  romance: Character[]
  npcs: Character[]
  signal?: AbortSignal
  onProgress?: (info: { index: number; total: number; name: string; seat: 'romance' | 'npc' }) => void
}): Promise<{ filled: number; failed: string[] }> {
  const playerIdentity = params.pack.playerIdentityId
    ? await personaDb.getPlayerIdentity(params.pack.playerIdentityId).catch(() => null)
    : null
  const playerDisplayName =
    playerIdentity?.name?.trim() || playerIdentity?.wechatNickname?.trim() || '你'
  const queue: Array<{ ch: Character; seat: 'romance' | 'npc' }> = [
    ...params.romance.map((ch) => ({ ch, seat: 'romance' as const })),
    ...params.npcs.map((ch) => ({ ch, seat: 'npc' as const })),
  ]
  const all = [...params.romance, ...params.npcs]
  const failed: string[] = []
  let filled = 0
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]!
    const name = item.ch.name?.trim() || (item.seat === 'npc' ? `NPC${i + 1}` : `角色${i + 1}`)
    params.onProgress?.({ index: i + 1, total: queue.length, name, seat: item.seat })
    try {
      const latest = (await personaDb.getCharacter(item.ch.id)) || item.ch
      const result = await generatePersonaWithAi({
        apiConfig: params.apiConfig,
        form: formForPackMember({ ch: latest, pack: params.pack, seat: item.seat, others: all }),
        draft: latest,
        playerIdentity,
        playerDisplayName,
        skipLifeLedger: true,
        signal: params.signal,
      })
      const next: Character = {
        ...result.character,
        packId: latest.packId,
        packSeat: latest.packSeat ?? item.seat,
        wechatEnlisted: latest.wechatEnlisted,
        generatedForCharacterId: latest.generatedForCharacterId,
        worldBooks: mergePackAndDossierBooks(latest, result.character),
      }
      await personaDb.upsertCharacter(next)
      filled += 1
    } catch (e) {
      if (isPersonaAiAbortError(e)) throw e
      failed.push(`${name}：${e instanceof Error ? e.message : '人设档案生成失败'}`)
    }
  }
  return { filled, failed }
}
