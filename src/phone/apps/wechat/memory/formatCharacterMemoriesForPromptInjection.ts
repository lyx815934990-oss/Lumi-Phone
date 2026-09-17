import { personaDb } from '../newFriendsPersona/idb'
import type { MemoryVectorRecallOpts } from './memoryVectorRecall'
import { resolveMomentImagesForMemoryInjection } from './momentMemoryPromptImages'
import {
  emptyMemoryVectorRecallStatus,
  mergeMemoryVectorRecallStatus,
  type MemoryVectorRecallRoundStatus,
} from './memoryVectorRecallStatus'

export type { MemoryVectorRecallRoundStatus } from './memoryVectorRecallStatus'
export {
  emptyMemoryVectorRecallStatus,
  formatMemoryVectorRecallConsoleLine,
  mergeMemoryVectorRecallStatus,
} from './memoryVectorRecallStatus'

export type CharacterMemoryPromptInjectionPack = {
  text: string
  momentImageUrls: string[]
  /** 本轮长期记忆向量召回调用情况（供聊天控制台提示） */
  vectorRecall: MemoryVectorRecallRoundStatus
}

/** 私聊注入：自有长期记忆 + 线下关联记忆分轨拼接（总结入库逻辑不变）。 */
export async function formatCharacterMemoriesForPromptInjectionPack(
  characterId: string,
  relevanceText: string,
  opts?: MemoryVectorRecallOpts | null,
): Promise<CharacterMemoryPromptInjectionPack> {
  const cid = characterId.trim()
  if (!cid) {
    return {
      text: '',
      momentImageUrls: [],
      vectorRecall: emptyMemoryVectorRecallStatus({ detail: '无角色' }),
    }
  }
  const recallOpts = { ...opts, apiConfig: opts?.apiConfig ?? null }
  const [ownMem, linkedMem] = await Promise.all([
    personaDb.formatCharacterMemoriesForPromptByRelevance(cid, relevanceText, {
      ...recallOpts,
      memoryBucket: 'own',
    }),
    personaDb.formatCharacterMemoriesForPromptByRelevance(cid, relevanceText, {
      ...recallOpts,
      memoryBucket: 'linked',
    }),
  ])
  const text = [ownMem.text.trim(), linkedMem.text.trim()].filter(Boolean).join('\n\n')
  const pickedMemories = [...ownMem.pickedMemories, ...linkedMem.pickedMemories]
  const momentImageUrls = await resolveMomentImagesForMemoryInjection({
    accountId: opts?.lineScope?.wechatAccountId ?? null,
    pickedMemories,
  })
  return {
    text,
    momentImageUrls,
    vectorRecall: mergeMemoryVectorRecallStatus(ownMem.vectorRecall, linkedMem.vectorRecall),
  }
}

export async function formatCharacterMemoriesForPromptInjection(
  characterId: string,
  relevanceText: string,
  opts?: MemoryVectorRecallOpts | null,
): Promise<string> {
  const pack = await formatCharacterMemoriesForPromptInjectionPack(characterId, relevanceText, opts)
  return pack.text
}

/** 思维溯源：自有 + 关联记忆分轨召回后合并展示 */
export async function getCharacterMemoryRelevanceTraceForPromptInjection(
  characterId: string,
  relevanceText: string,
  opts?: MemoryVectorRecallOpts | null,
) {
  const cid = characterId.trim()
  if (!cid) return { keywordHits: [], vectorRetrievals: [] }
  const recallOpts = { ...opts, apiConfig: opts?.apiConfig ?? null }
  const [own, linked] = await Promise.all([
    personaDb.getCharacterMemoryRelevanceTraceByRelevance(cid, relevanceText, {
      ...recallOpts,
      memoryBucket: 'own',
    }),
    personaDb.getCharacterMemoryRelevanceTraceByRelevance(cid, relevanceText, {
      ...recallOpts,
      memoryBucket: 'linked',
    }),
  ])
  return {
    keywordHits: [
      ...own.keywordHits.map((h) => ({ ...h, memoryBucket: 'own' as const })),
      ...linked.keywordHits.map((h) => ({ ...h, memoryBucket: 'linked' as const })),
    ],
    vectorRetrievals: [
      ...own.vectorRetrievals.map((h) => ({ ...h, memoryBucket: 'own' as const })),
      ...linked.vectorRetrievals.map((h) => ({ ...h, memoryBucket: 'linked' as const })),
    ],
  }
}
