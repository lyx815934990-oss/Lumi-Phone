/**
 * 人生账本 · 与玩家关系相关提示与世界书摘取。
 * 感情状态**不由本地代码推断/改写**，一律由模型在对齐 / 同请求补丁 / 建档时自由填写。
 */

import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import { PERSONA_AI_TOWARD_USER_ENTRY_NAME } from '../newFriendsPersona/personaAiWorldBooks'
import type { LifeMutableSheet } from './types'

export type LifeRelationPerspective = 'character' | 'player'

/** @deprecated 保留给旧调用；本地不再强制改写感情 */
export type LifeRelationLabels = {
  relationshipStatus: string
  socialRelation: string
  attitudeHint: string
  strength: number
}

/** 表面社交标签（仅提示词/展示辅助用，不用于强制改写账本） */
export function isWeakAcquaintanceRelation(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t) return true
  if (
    /暗恋|喜欢|好感|暧昧|恋人|交往|情侣|热恋|同居|已婚|结婚|单相思|追求|前任|分手|宿敌/.test(t)
  ) {
    return false
  }
  return /普通熟人|一般熟人|^熟人$|路人|陌生人|刚认识|认识但不|不咋在意|^同学$|^校友$|^同事$|^朋友$|^网友$/.test(
    t,
  )
}

/**
 * @deprecated 已停用本地关系推断；保留空实现以免旧引用报错。
 */
export function mapArchiveRelationToLifeLabels(
  _relationToUser: string,
  _perspective: LifeRelationPerspective,
): LifeRelationLabels | null {
  return null
}

/**
 * @deprecated 已停用本地关系推断；保留空实现以免旧引用报错。
 */
export function inferLifeRelationFromEvidence(
  _text: string,
  _perspective: LifeRelationPerspective,
): LifeRelationLabels | null {
  return null
}

/**
 * @deprecated 感情状态改由模型自由判定；本函数不再改写 sheet。
 */
export function enforceLifeRelationFromEvidence(params: {
  sheet: LifeMutableSheet
  perspective: LifeRelationPerspective
  counterpartNames: string[]
  archiveRelation?: string
  towardUserText?: string
  nearEndText?: string
}): { sheet: LifeMutableSheet; changed: boolean } {
  return { sheet: params.sheet, changed: false }
}

export function pickWorldBookEntryBodies(
  character: Character | PlayerIdentity | null | undefined,
  names: string[],
  maxEach = 900,
): string {
  if (!character) return ''
  const books = character.worldBooks ?? []
  const lines: string[] = []
  for (const name of names) {
    let body = ''
    for (const wb of books) {
      if (wb.enabled === false) continue
      const hit = (wb.items ?? []).find((it) => {
        const n = String(it.name ?? '').trim()
        return n === name || n.includes(name)
      })
      if (!hit || hit.enabled === false) continue
      body = String(hit.content ?? '').trim()
      if (body) break
    }
    if (!body) continue
    const clipped = body.length <= maxEach ? body : `${body.slice(0, maxEach)}…`
    lines.push(`【${name}】\n${clipped}`)
  }
  return lines.join('\n\n')
}

export function collectTowardUserRelationEvidence(
  character: Character | null | undefined,
): string {
  return pickWorldBookEntryBodies(character, [PERSONA_AI_TOWARD_USER_ENTRY_NAME, '对你现在'], 1200)
}

/** 同请求 / 对齐：感情栏由模型自由写（软提醒，非固定枚举） */
export function buildLifeRelationStatusHardRule(): string {
  return `【感情状态 relationshipStatus · 模型自由判定】
- 感情栏是**自由短句**，不限固定标签；请按本轮剧情/聊天证据自己判断怎么写（可写「暗恋未表白」「帮他疏解但还没谈恋爱」「刚互认在一起」等任意贴切表述）。
- **不要本地式死规则**：客户端不会再用代码把感情改成「热恋/暧昧」等预设词；你写什么就入库什么（无证据则不要改此字段）。
- 仍请依据证据：单方说想亲、身体亲密、帮忙解决生理需求，**不等于**双方已确认恋爱；未告白/未互认时，勿无脑写成热恋或正式恋人。
- 有明确告白且对方答应/互认时，再写成恋爱相关表述；「热恋」仅在确实很浓、且已是情侣身份时用。`
}

/** 对齐提示词：只给证据，不强制改写 */
export function buildLifeRelationAlignHardRule(): string {
  return `【与玩家感情 · 模型自由判定】
- 人设世界书「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」与开局关系原文、近端剧情，都是**证据**；感情栏请你综合后自由填写短句。
- **禁止**因表面像同学/熟人、近端只聊日常，就无视看法里的暗恋/喜欢写成「普通熟人」——但也不要用代码式枚举硬套；用你自己的自然语言概括当前阶段。
- 客户端**不会**在对齐后用本地逻辑覆盖你写的感情状态。
${buildLifeRelationStatusHardRule()}`
}
