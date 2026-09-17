/**
 * 单角色（人脉圈）已产生运行时数据：导出 / 导入。
 * 不含人设正文与世界观（见 characterBundleIo）。
 */

import type { CharacterLifeMutableRow } from '../lifeMutable/types'
import type { StoryTimelinePlotRow, StoryTimelineState } from '../memory/storyTimelineTypes'
import { stampWechatAccountOwner } from '../wechatAccountScope'
import { wechatConversationKey } from '../wechatConversationKey'
import { emitWeChatStorageChanged, personaDb } from './idb'
import type {
  Character,
  CharacterBusySettingsRow,
  CharacterDanmakuSettingsRow,
  CharacterMemory,
  CharacterNotificationSettingsRow,
  CharacterTimeSettingsRow,
  ChatConversationSettingsRow,
  HeartWhisperRow,
  PlayerIdentity,
  WeChatChatMessage,
} from './types'

export const CHARACTER_RUNTIME_KIND = 'lumi-phone-character-runtime' as const
/** v2：附带玩家身份快照与角色↔身份绑定，便于名册侧导入对齐会话身份 */
export const CHARACTER_RUNTIME_VERSION = 2 as const

const WECHAT_DATING_ARCHIVES_KV_KEY = 'wechat-dating-archives-v1'

export type CharacterRuntimeMemorySettingsCursors = {
  datingPlotSummaryCursorByCharacterId?: Record<string, number>
  meetSummaryCursorTimestampByCharacterId?: Record<string, number>
  autoSummaryIntervalByCharacterId?: Record<string, number>
}

export type CharacterRuntimeIdentityBinding = {
  characterId: string
  playerIdentityId: string
  linkedPlayerIdentityIds?: string[]
}

export type CharacterRuntimeExportV1 = {
  kind: typeof CHARACTER_RUNTIME_KIND
  version: typeof CHARACTER_RUNTIME_VERSION | 1
  exportedAt: number
  rootCharacterId: string
  characterIds: string[]
  /** 仅 id/name，便于核对；不含完整人设 */
  characterLabels: Array<{ id: string; name: string }>
  /** 数据包涉及的玩家身份（user）完整行，导入时入库 */
  playerIdentities: PlayerIdentity[]
  /** 各角色当时的主绑定 / 多马甲，导入时写回角色并建关系边 */
  characterIdentityBindings: CharacterRuntimeIdentityBinding[]
  messages: WeChatChatMessage[]
  memories: CharacterMemory[]
  datingArchiveEntry: unknown | null
  storyTimelineStates: StoryTimelineState[]
  storyTimelineRows: StoryTimelinePlotRow[]
  conversationSettings: ChatConversationSettingsRow[]
  heartWhispers: HeartWhisperRow[]
  lifeMutable: CharacterLifeMutableRow[]
  danmakuRows: CharacterDanmakuSettingsRow[]
  busyRows: CharacterBusySettingsRow[]
  timeRows: CharacterTimeSettingsRow[]
  notificationRows: CharacterNotificationSettingsRow[]
  memorySettingsCursors: CharacterRuntimeMemorySettingsCursors
  summary: string
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function jsonVersionMatches(x: unknown, expected: number): boolean {
  if (x === expected) return true
  if (typeof x === 'string' && x.trim() === String(expected)) return true
  if (typeof x === 'number' && Number.isFinite(x) && Math.trunc(x) === expected) return true
  return false
}

function pickRecordSlice(
  src: Record<string, number> | undefined,
  ids: Set<string>,
): Record<string, number> | undefined {
  if (!src) return undefined
  const out: Record<string, number> = {}
  for (const id of ids) {
    const v = src[id]
    if (typeof v === 'number' && Number.isFinite(v)) out[id] = v
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * 按当前编辑角色解析人脉根，导出该圈已产生运行时数据。
 */
export async function buildCharacterRuntimeExport(data: Character): Promise<CharacterRuntimeExportV1> {
  const rootId = data.generatedForCharacterId?.trim() || data.id
  if (!rootId) throw new Error('角色未就绪，无法导出')

  const npcs = await personaDb.listNpcsFor(rootId)
  const characterIds = [rootId, ...npcs.map((n) => n.id).filter(Boolean)]
  const idSet = new Set(characterIds)

  const characterLabels: Array<{ id: string; name: string }> = []
  const characterRows: Character[] = []
  for (const cid of characterIds) {
    const row = cid === data.id ? data : await personaDb.getCharacter(cid)
    if (row) characterRows.push(row)
    characterLabels.push({
      id: cid,
      name: (row?.name ?? row?.wechatNickname ?? cid).trim() || cid,
    })
  }

  const messages = await personaDb.listWeChatChatMessagesByCharacterIds(characterIds)

  const characterIdentityBindings: CharacterRuntimeIdentityBinding[] = []
  const identityIdSet = new Set<string>()
  for (const row of characterRows) {
    const primary = row.playerIdentityId?.trim() || ''
    const linked = (row.linkedPlayerIdentityIds ?? []).map((x) => String(x ?? '').trim()).filter(Boolean)
    if (primary) identityIdSet.add(primary)
    for (const lid of linked) identityIdSet.add(lid)
    if (primary) {
      characterIdentityBindings.push({
        characterId: row.id,
        playerIdentityId: primary,
        ...(linked.length ? { linkedPlayerIdentityIds: linked } : {}),
      })
    }
  }
  for (const m of messages) {
    const pid = String(m.playerIdentityId ?? '').trim()
    if (pid && pid !== '__none__') identityIdSet.add(pid)
  }

  const memories: CharacterMemory[] = []
  for (const cid of characterIds) {
    const rows = await personaDb.listCharacterMemoriesForCharacter(cid)
    memories.push(...rows)
  }

  let datingArchiveEntry: unknown | null = null
  try {
    const datingRaw = await personaDb.getPhoneKv(WECHAT_DATING_ARCHIVES_KV_KEY)
    if (datingRaw && typeof datingRaw === 'object' && !Array.isArray(datingRaw)) {
      datingArchiveEntry = (datingRaw as Record<string, unknown>)[rootId] ?? null
    }
  } catch {
    datingArchiveEntry = null
  }

  const storyTimelineStates: StoryTimelineState[] = []
  const storyTimelineRows: StoryTimelinePlotRow[] = []
  for (const cid of characterIds) {
    try {
      const st = await personaDb.getStoryTimelineState(cid)
      if (st) storyTimelineStates.push(st)
    } catch {
      /* ignore */
    }
    try {
      const rows = await personaDb.listStoryTimelinePlotRowsByCharacterId(cid)
      if (rows.length) storyTimelineRows.push(...rows)
    } catch {
      /* ignore */
    }
  }

  const allConv = await personaDb.listAllChatConversationSettings()
  const conversationSettings = allConv.filter((row) => idSet.has(row.peerCharacterId))
  for (const row of conversationSettings) {
    const pid = String(row.playerIdentityId ?? '').trim()
    if (pid && pid !== '__none__') identityIdSet.add(pid)
  }

  const playerIdentities: PlayerIdentity[] = []
  for (const pid of identityIdSet) {
    try {
      const ident = await personaDb.getPlayerIdentity(pid)
      if (ident) playerIdentities.push(ident)
    } catch {
      /* ignore */
    }
  }

  const heartWhispers: HeartWhisperRow[] = []
  const lifeMutable: CharacterLifeMutableRow[] = []
  const danmakuRows: CharacterDanmakuSettingsRow[] = []
  const busyRows: CharacterBusySettingsRow[] = []
  const timeRows: CharacterTimeSettingsRow[] = []
  const notificationRows: CharacterNotificationSettingsRow[] = []

  for (const cid of characterIds) {
    try {
      const h = await personaDb.getHeartWhisper(cid)
      if (h) heartWhispers.push(h)
    } catch {
      /* ignore */
    }
    try {
      const lm = await personaDb.getCharacterLifeMutable(cid)
      if (lm) lifeMutable.push(lm)
    } catch {
      /* ignore */
    }
    try {
      const d = await personaDb.getCharacterDanmakuSettings(cid)
      if (d) danmakuRows.push(d)
    } catch {
      /* ignore */
    }
    try {
      const b = await personaDb.getCharacterBusySettings(cid)
      if (b) busyRows.push(b)
    } catch {
      /* ignore */
    }
    try {
      const t = await personaDb.getCharacterTimeSettings(cid)
      if (t) timeRows.push(t)
    } catch {
      /* ignore */
    }
    try {
      const n = await personaDb.getCharacterNotificationSettings(cid)
      if (n) notificationRows.push(n)
    } catch {
      /* ignore */
    }
  }

  let memorySettingsCursors: CharacterRuntimeMemorySettingsCursors = {}
  try {
    const ms = await personaDb.getMemorySettings()
    memorySettingsCursors = {
      datingPlotSummaryCursorByCharacterId: pickRecordSlice(
        ms.datingPlotSummaryCursorByCharacterId,
        idSet,
      ),
      meetSummaryCursorTimestampByCharacterId: pickRecordSlice(
        ms.meetSummaryCursorTimestampByCharacterId,
        idSet,
      ),
      autoSummaryIntervalByCharacterId: pickRecordSlice(ms.autoSummaryIntervalByCharacterId, idSet),
    }
  } catch {
    memorySettingsCursors = {}
  }

  const rootLabel = characterLabels.find((c) => c.id === rootId)?.name || rootId
  const summary = [
    `「${rootLabel}」人脉圈 ${characterIds.length} 人`,
    `${messages.length} 条消息`,
    `${memories.length} 条记忆`,
    `${storyTimelineRows.length} 条剧情摘要`,
    `${playerIdentities.length} 个玩家身份`,
    datingArchiveEntry ? '含约会存档' : '无约会存档',
  ].join(' · ')

  return {
    kind: CHARACTER_RUNTIME_KIND,
    version: CHARACTER_RUNTIME_VERSION,
    exportedAt: Date.now(),
    rootCharacterId: rootId,
    characterIds,
    characterLabels,
    playerIdentities,
    characterIdentityBindings,
    messages,
    memories,
    datingArchiveEntry,
    storyTimelineStates,
    storyTimelineRows,
    conversationSettings,
    heartWhispers,
    lifeMutable,
    danmakuRows,
    busyRows,
    timeRows,
    notificationRows,
    memorySettingsCursors,
    summary,
  }
}

/** 解析运行时数据包；无法识别则返回 null（兼容 v1） */
export function parseCharacterRuntimeExport(parsed: unknown): CharacterRuntimeExportV1 | null {
  if (!isRecord(parsed)) return null
  if (typeof parsed.kind !== 'string' || parsed.kind.trim() !== CHARACTER_RUNTIME_KIND) return null
  const versionOk =
    jsonVersionMatches(parsed.version, CHARACTER_RUNTIME_VERSION) || jsonVersionMatches(parsed.version, 1)
  if (!versionOk) return null
  const rootCharacterId = typeof parsed.rootCharacterId === 'string' ? parsed.rootCharacterId.trim() : ''
  if (!rootCharacterId) return null
  const characterIds = Array.isArray(parsed.characterIds)
    ? parsed.characterIds.map((x) => String(x ?? '').trim()).filter(Boolean)
    : [rootCharacterId]
  if (!characterIds.includes(rootCharacterId)) characterIds.unshift(rootCharacterId)

  const characterLabels = Array.isArray(parsed.characterLabels)
    ? parsed.characterLabels
        .filter((x): x is { id: string; name: string } => isRecord(x) && typeof x.id === 'string')
        .map((x) => ({ id: x.id.trim(), name: typeof x.name === 'string' ? x.name.trim() : x.id.trim() }))
    : []

  const playerIdentities = Array.isArray(parsed.playerIdentities)
    ? (parsed.playerIdentities as PlayerIdentity[]).filter(
        (x) => x && typeof x === 'object' && typeof (x as PlayerIdentity).id === 'string',
      )
    : []

  const characterIdentityBindings: CharacterRuntimeIdentityBinding[] = []
  if (Array.isArray(parsed.characterIdentityBindings)) {
    for (const raw of parsed.characterIdentityBindings) {
      if (!isRecord(raw)) continue
      const characterId = typeof raw.characterId === 'string' ? raw.characterId.trim() : ''
      const playerIdentityId = typeof raw.playerIdentityId === 'string' ? raw.playerIdentityId.trim() : ''
      if (!characterId || !playerIdentityId) continue
      const linked = Array.isArray(raw.linkedPlayerIdentityIds)
        ? raw.linkedPlayerIdentityIds.map((x) => String(x ?? '').trim()).filter(Boolean)
        : undefined
      characterIdentityBindings.push({
        characterId,
        playerIdentityId,
        ...(linked?.length ? { linkedPlayerIdentityIds: linked } : {}),
      })
    }
  }

  return {
    kind: CHARACTER_RUNTIME_KIND,
    version: jsonVersionMatches(parsed.version, 1) ? 1 : CHARACTER_RUNTIME_VERSION,
    exportedAt:
      typeof parsed.exportedAt === 'number' && Number.isFinite(parsed.exportedAt) ? parsed.exportedAt : Date.now(),
    rootCharacterId,
    characterIds,
    characterLabels,
    playerIdentities,
    characterIdentityBindings,
    messages: Array.isArray(parsed.messages) ? (parsed.messages as WeChatChatMessage[]) : [],
    memories: Array.isArray(parsed.memories) ? (parsed.memories as CharacterMemory[]) : [],
    datingArchiveEntry: parsed.datingArchiveEntry ?? null,
    storyTimelineStates: Array.isArray(parsed.storyTimelineStates)
      ? (parsed.storyTimelineStates as StoryTimelineState[])
      : [],
    storyTimelineRows: Array.isArray(parsed.storyTimelineRows)
      ? (parsed.storyTimelineRows as StoryTimelinePlotRow[])
      : [],
    conversationSettings: Array.isArray(parsed.conversationSettings)
      ? (parsed.conversationSettings as ChatConversationSettingsRow[])
      : [],
    heartWhispers: Array.isArray(parsed.heartWhispers) ? (parsed.heartWhispers as HeartWhisperRow[]) : [],
    lifeMutable: Array.isArray(parsed.lifeMutable) ? (parsed.lifeMutable as CharacterLifeMutableRow[]) : [],
    danmakuRows: Array.isArray(parsed.danmakuRows) ? (parsed.danmakuRows as CharacterDanmakuSettingsRow[]) : [],
    busyRows: Array.isArray(parsed.busyRows) ? (parsed.busyRows as CharacterBusySettingsRow[]) : [],
    timeRows: Array.isArray(parsed.timeRows) ? (parsed.timeRows as CharacterTimeSettingsRow[]) : [],
    notificationRows: Array.isArray(parsed.notificationRows)
      ? (parsed.notificationRows as CharacterNotificationSettingsRow[])
      : [],
    memorySettingsCursors: isRecord(parsed.memorySettingsCursors)
      ? (parsed.memorySettingsCursors as CharacterRuntimeMemorySettingsCursors)
      : {},
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  }
}

async function resolveRuntimeCharacterIdMap(
  payload: CharacterRuntimeExportV1,
  targetRootCharacterId?: string | null,
): Promise<{ idMap: Map<string, string>; targetRootId: string; remapped: boolean }> {
  const rootExists = await personaDb.getCharacter(payload.rootCharacterId)
  if (rootExists) {
    const idMap = new Map<string, string>()
    for (const id of payload.characterIds) idMap.set(id, id)
    return { idMap, targetRootId: payload.rootCharacterId, remapped: false }
  }

  const targetRoot = String(targetRootCharacterId ?? '').trim()
  if (!targetRoot) {
    throw new Error('数据包中的角色不存在。请先导入对应人设包，再在名册卡片上导入数据包。')
  }
  const targetRootRow = await personaDb.getCharacter(targetRoot)
  if (!targetRootRow) throw new Error('目标角色不存在，无法写入数据包')

  const targetNpcs = await personaDb.listNpcsFor(targetRoot)
  const targetPool = targetNpcs.map((n) => ({
    id: n.id,
    name: (n.name ?? n.wechatNickname ?? '').trim(),
  }))
  const used = new Set<string>([targetRoot])
  const idMap = new Map<string, string>()
  idMap.set(payload.rootCharacterId, targetRoot)

  const oldNpcs = payload.characterIds.filter((id) => id !== payload.rootCharacterId)
  for (const oldId of oldNpcs) {
    const label = payload.characterLabels.find((l) => l.id === oldId)?.name?.trim() || ''
    const byName = label
      ? targetPool.find((t) => !used.has(t.id) && t.name && t.name === label)
      : undefined
    if (byName) {
      idMap.set(oldId, byName.id)
      used.add(byName.id)
      continue
    }
    const next = targetPool.find((t) => !used.has(t.id))
    if (next) {
      idMap.set(oldId, next.id)
      used.add(next.id)
    }
  }

  return { idMap, targetRootId: targetRoot, remapped: true }
}

function mapId(idMap: Map<string, string>, raw: string | undefined | null): string | null {
  const id = String(raw ?? '').trim()
  if (!id) return null
  const next = idMap.get(id)
  return next?.trim() || null
}

function remapCursorMap(
  src: Record<string, number> | undefined,
  idMap: Map<string, string>,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!src) return out
  for (const [oldId, value] of Object.entries(src)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const next = mapId(idMap, oldId)
    if (next) out[next] = value
  }
  return out
}

async function applyDatingArchiveEntry(rootId: string, entry: unknown | null): Promise<void> {
  if (entry == null) return
  const raw = await personaDb.getPhoneKv(WECHAT_DATING_ARCHIVES_KV_KEY)
  const arch: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {}
  arch[rootId] = entry
  await personaDb.setPhoneKv(WECHAT_DATING_ARCHIVES_KV_KEY, arch)
}

export type ImportCharacterRuntimeResult = {
  targetRootId: string
  remapped: boolean
  summary: string
}

/**
 * 将数据包写入库：优先按原 characterId；不存在则映射到目标人脉圈（按名字 / 顺序）。
 * 先入库玩家身份，再写会话数据，最后回写角色↔身份绑定（避免与编辑页导入人设的身份流程冲突）。
 */
export async function importCharacterRuntimeExport(
  payload: CharacterRuntimeExportV1,
  opts?: { targetRootCharacterId?: string | null; wechatAccountId?: string | null },
): Promise<ImportCharacterRuntimeResult> {
  const wechatAccountId = opts?.wechatAccountId?.trim() || ''
  const { idMap, targetRootId, remapped } = await resolveRuntimeCharacterIdMap(
    payload,
    opts?.targetRootCharacterId,
  )

  // 1) 玩家身份先入库（保留原 id，会话键才能对上）
  for (const ident of payload.playerIdentities || []) {
    const id = ident?.id?.trim()
    if (!id) continue
    const stamped = wechatAccountId
      ? stampWechatAccountOwner({ ...ident, id, updatedAt: Date.now() }, wechatAccountId)
      : { ...ident, id, updatedAt: Date.now() }
    await personaDb.upsertPlayerIdentity(stamped)
  }

  // 2) 聊天 / 记忆 / 剧情等
  for (const m of payload.messages) {
    const newCid = mapId(idMap, m.characterId)
    if (!newCid) continue
    const pid = String(m.playerIdentityId ?? '').trim() || '__none__'
    await personaDb.appendWeChatChatMessage({
      ...m,
      characterId: newCid,
      conversationKey: wechatConversationKey(newCid, pid),
      quiet: true,
    })
  }

  for (const mem of payload.memories) {
    const newCid = mapId(idMap, mem.characterId)
    if (!newCid) continue
    await personaDb.upsertCharacterMemory({ ...mem, characterId: newCid })
  }

  await applyDatingArchiveEntry(targetRootId, payload.datingArchiveEntry)

  for (const st of payload.storyTimelineStates) {
    const newCid = mapId(idMap, st.characterId)
    if (!newCid) continue
    await personaDb.putStoryTimelineState({ ...st, characterId: newCid })
  }
  for (const row of payload.storyTimelineRows) {
    const newCid = mapId(idMap, row.characterId)
    if (!newCid) continue
    await personaDb.upsertStoryTimelinePlotRow({ ...row, characterId: newCid })
  }

  for (const row of payload.conversationSettings) {
    const newPeer = mapId(idMap, row.peerCharacterId)
    if (!newPeer) continue
    const pid = String(row.playerIdentityId ?? '').trim() || '__none__'
    await personaDb.upsertChatConversationSettings({
      conversationKey: wechatConversationKey(newPeer, pid),
      peerCharacterId: newPeer,
      playerIdentityId: pid,
      isPinned: row.isPinned,
      isMuted: row.isMuted,
      hiddenFromMessageList: row.hiddenFromMessageList,
      notifyEnabled: row.notifyEnabled,
      showThinkingChain: row.showThinkingChain,
      forwardHistoryCardEnabled: row.forwardHistoryCardEnabled,
      profileImageChangeEnabled: row.profileImageChangeEnabled,
      internetMemeLexiconEnabled: row.internetMemeLexiconEnabled,
      mimicUserSpeakingStyleEnabled: row.mimicUserSpeakingStyleEnabled,
      isDanmakuMode: row.isDanmakuMode,
      showGroupMemberNicknameInChat: row.showGroupMemberNicknameInChat,
      showGroupRankBadgesInChat: row.showGroupRankBadgesInChat,
      chatBackground: row.chatBackground,
      lastMessageTime: row.lastMessageTime,
    })
  }

  for (const h of payload.heartWhispers) {
    const newCid = mapId(idMap, h.characterId)
    if (!newCid || !h.data) continue
    await personaDb.putHeartWhisper(newCid, h.data)
  }
  for (const lm of payload.lifeMutable) {
    const newCid = mapId(idMap, lm.characterId)
    if (!newCid || !lm.sheet) continue
    await personaDb.putCharacterLifeMutable(newCid, lm.sheet)
  }
  for (const d of payload.danmakuRows) {
    const newCid = mapId(idMap, d.characterId)
    if (!newCid) continue
    await personaDb.putCharacterDanmakuSettings({ ...d, characterId: newCid })
  }
  for (const b of payload.busyRows) {
    const newCid = mapId(idMap, b.characterId)
    if (!newCid) continue
    await personaDb.putCharacterBusySettings({ ...b, characterId: newCid })
  }
  for (const t of payload.timeRows) {
    const newCid = mapId(idMap, t.characterId)
    if (!newCid) continue
    await personaDb.putCharacterTimeSettings({ ...t, characterId: newCid })
  }
  for (const n of payload.notificationRows) {
    const newCid = mapId(idMap, n.characterId)
    if (!newCid) continue
    await personaDb.putCharacterNotificationSettings({ ...n, characterId: newCid })
  }

  const cursors = payload.memorySettingsCursors || {}
  const datingCursors = remapCursorMap(cursors.datingPlotSummaryCursorByCharacterId, idMap)
  const meetCursors = remapCursorMap(cursors.meetSummaryCursorTimestampByCharacterId, idMap)
  const intervalCursors = remapCursorMap(cursors.autoSummaryIntervalByCharacterId, idMap)
  if (
    Object.keys(datingCursors).length ||
    Object.keys(meetCursors).length ||
    Object.keys(intervalCursors).length
  ) {
    const ms = await personaDb.getMemorySettings()
    await personaDb.putMemorySettings({
      datingPlotSummaryCursorByCharacterId: {
        ...(ms.datingPlotSummaryCursorByCharacterId || {}),
        ...datingCursors,
      },
      meetSummaryCursorTimestampByCharacterId: {
        ...(ms.meetSummaryCursorTimestampByCharacterId || {}),
        ...meetCursors,
      },
      autoSummaryIntervalByCharacterId: {
        ...(ms.autoSummaryIntervalByCharacterId || {}),
        ...intervalCursors,
      },
    })
  }

  // 3) 回写角色主绑定 + 关系边（不走编辑页人设包身份同步流程）
  for (const binding of payload.characterIdentityBindings || []) {
    const newCid = mapId(idMap, binding.characterId)
    const pid = binding.playerIdentityId?.trim()
    if (!newCid || !pid) continue
    const ch = await personaDb.getCharacter(newCid)
    if (!ch) continue
    const linked = (binding.linkedPlayerIdentityIds ?? [])
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
    await personaDb.upsertCharacter({
      ...ch,
      playerIdentityId: pid,
      ...(linked.length ? { linkedPlayerIdentityIds: linked } : {}),
      updatedAt: Date.now(),
    })
    const ident = await personaDb.getPlayerIdentity(pid)
    await personaDb.upsertPlayerIdentityBindings({
      identityId: pid,
      characterId: newCid,
      identityName: ident?.name?.trim() || '你',
      characterName: ch.name?.trim() || '角色',
    })
  }

  emitWeChatStorageChanged()

  const identityNote =
    (payload.playerIdentities?.length || 0) > 0
      ? ` · 已入库 ${payload.playerIdentities.length} 个玩家身份`
      : ''
  const summary =
    (payload.summary?.trim() ||
      `${payload.messages.length} 条消息 · ${payload.memories.length} 条记忆`) +
    identityNote +
    (remapped ? '（已映射到当前人脉）' : '')

  return { targetRootId, remapped, summary }
}
