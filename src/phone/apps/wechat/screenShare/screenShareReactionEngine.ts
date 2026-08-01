import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { setBackgroundNotifyPendingWork } from '../../backgroundNotify/backgroundNotifyPendingWork'
import { resolveWorldBookUserBinding } from '../charUserPlaceholders'
import {
  buildMeetWechatPrivateChatContinuityBlock,
  isMeetSyncedCharacter,
  loadMeetUserProfileSnapshotFromKv,
} from '../../lumiMeet/meetUserProfileSnapshot'
import { personaDb } from '../newFriendsPersona/idb'
import type { WeChatChatMessage } from '../newFriendsPersona/types'
import { formatWorldBackgroundForPrompt } from '../newFriendsPersona/worldBackgroundFormat'
import { resolveWechatAppAvatar } from '../../../../components/discoverListen/listenTogetherUserAvatarPreference'
import {
  tryHandoffProactiveMessageReveal,
  stashProactiveMessageReveal,
  type ProactiveMessageRevealBubble,
} from '../proactiveMessageRevealBridge'
import { isProactiveMessageInFlight } from '../proactivePrivateMessageEngine'
import { stickerTranscriptTextFromFields } from '../stickers/stickerAntiRepeat'
import { isWechatAiReplyPipelineActive } from '../wechatAiReplyInFlight'
import { loadAccountsBundle } from '../wechatAccountPersistence'
import { buildFriendRequestPrivatePromptPack } from '../wechatFriendRequestPrivatePromptPack'
import {
  requestWeChatPeerReplyBubblesWithImage,
  type ChatTranscriptTurn,
} from '../wechatChatAi'
import {
  parsePrivateWeChatConversationCharacterAndSession,
  parseWechatAccountPrivateConversationKey,
  WECHAT_LUMI_PEER_CHARACTER_ID,
  WECHAT_SELF_PEER_CHARACTER_ID,
} from '../wechatConversationKey'
import { sampleFrameFromStream } from './frameSampler'
import {
  getScreenShareSession,
  getScreenShareStream,
  isScreenShareEffectivelyPaused,
  markScreenShareReactionFired,
  setScreenShareLastError,
  setScreenShareReacting,
  stopScreenShareSession,
} from './screenShareSession'

const TICK_MS = 4_000
/** 首轮稍快，后续约 18s 一抽 */
const FIRST_REACTION_AFTER_MS = 6_000
const REACTION_INTERVAL_MS = 18_000

let installed = false
let inFlight = false

function newMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `wx-ss-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function storedMessagesToTranscript(messages: WeChatChatMessage[]): ChatTranscriptTurn[] {
  return messages
    .filter((m) => !m.isRecalled && !m.ext?.centerSystemStrip)
    .map((m) => {
      const from = m.type === 'player' ? ('self' as const) : ('other' as const)
      if (m.voice) {
        const txt = m.voice.transcriptText?.trim() || m.content?.trim() || '（语音）'
        const emo = m.voice.emotionLabel?.trim()
        const who = m.type === 'player' ? '用户语音' : '对方语音'
        const voiceText = emo ? `（${who}，情绪：${emo}）${txt}` : `（${who}）${txt}`
        return { id: m.id, from, text: voiceText, replyTo: m.replyTo }
      }
      const stickerLine = stickerTranscriptTextFromFields(m.content, m.stickerRef)
      if (stickerLine) return { id: m.id, from, text: stickerLine, replyTo: m.replyTo }
      const text = m.content?.trim()
      if (text) return { id: m.id, from, text, replyTo: m.replyTo }
      if (m.images?.length) return { id: m.id, from, text: '（发送了一张图片）', replyTo: m.replyTo }
      return { id: m.id, from, text: '', replyTo: m.replyTo }
    })
    .filter((t) => t.text.trim())
}

async function fireScreenShareReaction(): Promise<void> {
  const session = getScreenShareSession()
  if (!session.active || isScreenShareEffectivelyPaused()) return

  const key = session.conversationKey.trim()
  const stream = getScreenShareStream()
  if (!key || !stream) {
    stopScreenShareSession('屏幕共享已结束')
    return
  }

  if (
    inFlight ||
    isWechatAiReplyPipelineActive(key) ||
    isProactiveMessageInFlight(key)
  ) {
    return
  }

  const parsed = parsePrivateWeChatConversationCharacterAndSession(key)
  if (!parsed) {
    stopScreenShareSession('会话无效')
    return
  }

  const characterId = session.characterId.trim() || parsed.characterId.trim()
  if (
    !characterId ||
    characterId === WECHAT_LUMI_PEER_CHARACTER_ID ||
    characterId === WECHAT_SELF_PEER_CHARACTER_ID
  ) {
    stopScreenShareSession('请在角色私聊中使用一起刷')
    return
  }

  const apiConfig = await loadResolvedApiConfig('chatCard')
  if (!apiConfig?.apiUrl?.trim() || !apiConfig.apiKey?.trim() || !apiConfig.modelId?.trim()) {
    setScreenShareLastError('未配置聊天 API，无法一起刷')
    return
  }

  const character = await personaDb.getCharacter(characterId)
  if (!character) {
    setScreenShareLastError('找不到角色')
    return
  }

  inFlight = true
  setScreenShareReacting(true)
  setBackgroundNotifyPendingWork({ wechatTyping: true })

  try {
    const frame = await sampleFrameFromStream(stream)
    if (!getScreenShareSession().active || isScreenShareEffectivelyPaused()) return

    const sessionPid = parsed.sessionPlayerId.trim() || '__none__'
    const scoped = parseWechatAccountPrivateConversationKey(key)
    const wechatAccountId = scoped?.wechatAccountId ?? null
    const playerIdentityId = sessionPid !== '__none__' ? sessionPid : sessionPid

    const bundle = await loadAccountsBundle()
    const account =
      wechatAccountId && bundle?.accounts
        ? bundle.accounts.find((a) => a.accountId === wechatAccountId)
        : undefined
    const playerDisplayName = account?.nickname?.trim() || '我'
    const wechatHome = {
      displayName: playerDisplayName,
      signature: account?.signature?.trim() || '',
    }
    const convSettings = await personaDb.getChatConversationSettings(key)
    const playerWechatAvatarUrl =
      resolveWechatAppAvatar(convSettings?.playerChatAvatarUrl).trim() ||
      resolveWechatAppAvatar(account?.avatarUrl).trim() ||
      ''

    let worldBackgroundPrompt: string | undefined
    if (character.worldBackgroundEnabled !== false && character.worldBackgroundId?.trim()) {
      const wbg = await personaDb.getWorldBackground(character.worldBackgroundId.trim())
      const block = formatWorldBackgroundForPrompt(wbg)
      if (block.trim()) worldBackgroundPrompt = block
    }

    const playerIdentity =
      sessionPid && sessionPid !== '__none__' && wechatAccountId
        ? await personaDb.getPlayerIdentityForWechatAccount(sessionPid, wechatAccountId)
        : null

    let meetWechatContinuityBlock: string | undefined
    if (isMeetSyncedCharacter(characterId, character.worldBooks ?? [])) {
      const meetSnap = await loadMeetUserProfileSnapshotFromKv(characterId)
      meetWechatContinuityBlock = buildMeetWechatPrivateChatContinuityBlock({
        meetSnapshot: meetSnap,
        wechatProfile: wechatHome,
        forFriendRequest: false,
      })
    }

    const worldBookBinding = await resolveWorldBookUserBinding(character)
    const messages = await personaDb.listWeChatChatMessagesByConversationKey(key)
    const transcript = storedMessagesToTranscript(messages).slice(-36)

    const pack = await buildFriendRequestPrivatePromptPack({
      characterId,
      conversationKey: key,
      sessionPlayerIdentityId: sessionPid,
      apiConfig,
      transcript,
      biasTextForMemoryHaystack: '一起刷屏幕陪看',
      strangerMemoryGuard: false,
      crossAccountContext:
        wechatAccountId && bundle?.accounts
          ? { currentAccountId: wechatAccountId, allAccounts: bundle.accounts }
          : undefined,
    })

    const ai = await requestWeChatPeerReplyBubblesWithImage({
      apiConfig,
      character,
      playerIdentity,
      playerDisplayName,
      wechatHomeProfile: wechatHome,
      meetWechatContinuityBlock,
      transcript,
      promptMode: 'persona',
      imageBase64: frame.base64,
      imageMime: frame.mime,
      userImageIsScreenShare: true,
      ...(playerWechatAvatarUrl ? { playerWechatAvatarUrl } : {}),
      longTermMemoryNotes: pack.memory || undefined,
      longTermMemoryMomentImages: pack.momentImageUrls?.length ? pack.momentImageUrls : undefined,
      worldBackgroundPrompt,
      offlineDatingPlotsContext: pack.offlineDatingPlotsContext || undefined,
      meetEncounterMemoriesContext: pack.meetEncounterMemoriesContext || undefined,
      unsummarizedPrivateNotes: pack.unsPrivate || undefined,
      unsummarizedGroupNotes: pack.unsGroup || undefined,
      unsummarizedMeetNotes: pack.unsMeet || undefined,
      storyTimelineNotes: pack.storyTimeline || undefined,
      recentPrivateAiRoundsNotes: pack.recentPrivateAiRounds || undefined,
      recentOfflineAiRoundsNotes: pack.recentOfflineAiRounds || undefined,
      recentMeetAiRoundsNotes: pack.recentMeetAiRounds || undefined,
      recentGroupChatsReference: pack.recentGroupChatsReference || undefined,
      includeThinkingChain: convSettings?.showThinkingChain === true,
      currentTimeMs: Date.now(),
      chatMemberIds: [characterId],
      globalWechatPlate: 'private_chat',
      worldBookPlayerIdentity: worldBookBinding?.row ?? null,
      worldBookUserLineLabel: worldBookBinding?.lineLabel,
      replyBias: '你们正在一起刷手机屏幕；请根据当前画面短促接话，不要长篇评图。',
    })

    if (!getScreenShareSession().active) return

    const bubbles = (ai.bubbles ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
    if (!bubbles.length) {
      markScreenShareReactionFired()
      return
    }

    let ts = Date.now()
    const revealBubbles: ProactiveMessageRevealBubble[] = []
    for (let i = 0; i < bubbles.length; i += 1) {
      ts += i === 0 ? 0 : 600 + Math.floor(Math.random() * 900)
      revealBubbles.push({
        id: newMessageId(),
        content: bubbles[i]!,
        thinking: i === 0 ? ai.thinking : undefined,
        timestamp: ts,
      })
    }

    const revealPayload = {
      conversationKey: key,
      characterId,
      playerIdentityId,
      playerDisplayName,
      notifyPeerTitle: session.peerTitle.trim() || character.wechatNickname?.trim() || character.name?.trim() || '对方',
      bubbles: revealBubbles,
    }

    const handedOff = tryHandoffProactiveMessageReveal(revealPayload)
    if (!handedOff) stashProactiveMessageReveal(revealPayload)
    markScreenShareReactionFired()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '一起刷接话失败'
    if (/屏幕共享已结束|未能获取|画面/.test(msg)) {
      stopScreenShareSession(msg)
    } else {
      setScreenShareLastError(msg)
      setScreenShareReacting(false)
    }
  } finally {
    inFlight = false
    setBackgroundNotifyPendingWork({ wechatTyping: false })
    if (getScreenShareSession().reacting) setScreenShareReacting(false)
  }
}

async function onTick(): Promise<void> {
  const session = getScreenShareSession()
  if (!session.active || isScreenShareEffectivelyPaused() || inFlight) return

  const now = Date.now()
  const elapsed = session.lastReactionAtMs > 0
    ? now - session.lastReactionAtMs
    : now - session.startedAtMs
  const need = session.lastReactionAtMs > 0 ? REACTION_INTERVAL_MS : FIRST_REACTION_AFTER_MS
  if (elapsed < need) return

  await fireScreenShareReaction()
}

export function installScreenShareReactionEngine(): void {
  if (installed) return
  installed = true
  if (typeof window === 'undefined') return
  window.setInterval(() => {
    void onTick()
  }, TICK_MS)
}
