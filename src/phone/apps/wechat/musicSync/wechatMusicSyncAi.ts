import type { WeChatMusicSyncInvitePayload } from '../newFriendsPersona/types'
import { personaDb } from '../newFriendsPersona/idb'
import { matchAnyDirectiveName, pickNamed, pickPositional } from '../directives/parseSpaceDirective'
import { WxCmd } from '../directives/wechatDirectiveLexicon'

export function formatMusicSyncInviteTranscriptLine(
  messageId: string,
  data: WeChatMusicSyncInvitePayload,
): string {
  const artist = data.trackArtist?.trim() || '未知歌手'
  const mid = messageId.trim() || data.inviteId
  if (data.charResponded === 'accepted' || data.charResponded === 'declined') {
    const verb = data.charResponded === 'accepted' ? '接受' : '拒绝'
    return `（用户曾向你发来音乐共听邀约：《${data.trackTitle}》— ${artist}；你已${verb}，勿再输出共听接受/共听拒绝。）`
  }
  // 邀约阶段只给曲名/歌手，勿塞整段时间轴歌词——否则模型未接受共听就接唱/报歌词
  return `（用户向你发来音乐共听邀约：《${data.trackTitle}》— ${artist}；messageId=${mid}；inviteId=${data.inviteId}。这是邀约卡，不是已开始共听；须先输出共听接受/共听拒绝。未接受前禁止接唱或大段复述歌词。）`
}

export const WECHAT_LISTEN_TRACK_SHARE_OUTPUT_BLOCK = `
---------------------
【用户分享的单曲 / 歌单（听一听卡片）】
---------------------
- 会话里若出现「（分享单曲）《曲名》…」或「（分享歌单）《名称》…」，表示用户**推荐一首歌或一个歌单**，**不是**正式的音乐共听邀约。
- 分享卡落库时会附带**歌单曲目摘录 / 歌手简介与热门曲目 / 带 [分:秒] 时间轴的歌词**等文字，你可据此判断「几分几秒唱哪句」并聊歌词意象。
- 即使用户口头问「要一起听吗」「一起听听」等，你也只能以**普通口语**回应（愿意听、去点开、聊对歌的感受等）。
- **禁止**为此输出 \`共听接受\` / \`共听拒绝\`；**禁止**假装已通过指令加入共听。要建立同步共听，须由用户从播放器发起正式的「音乐共听邀约卡」。
`.trim()

function normalizeMusicSyncDirectiveLine(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^`+|`+$/g, '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/［/g, '[')
    .replace(/］/g, ']')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
}

/** 模型把多行口语与指令挤在同一气泡时，拆成逐行便于解析/过滤 */
export function expandMultilineReplyBubbles(bubbles: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of bubbles) {
    const text = String(raw ?? '')
    if (!text.includes('\n')) {
      const t = text.trim()
      if (t) out.push(t)
      continue
    }
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (t) out.push(t)
    }
  }
  return out
}

export function parseMusicSyncIncomingActionDirective(
  raw: string,
): { kind: 'accept' | 'decline'; messageId?: string; replyText?: string } | null {
  const normalized = normalizeMusicSyncDirectiveLine(raw)
  const spaceTry = (names: string[], kind: 'accept' | 'decline') => {
    const parts = matchAnyDirectiveName(normalized, names)
    if (!parts) return null
    const messageId =
      pickNamed(parts, ['id', 'messageId', 'inviteId', '消息']) || pickPositional(parts, 0)
    const replyText = pickNamed(parts, ['replyText', '回复']) || undefined
    return {
      kind,
      messageId: messageId || undefined,
      replyText: replyText ? replyText.slice(0, 500) : undefined,
    }
  }
  const fromSpace =
    spaceTry([WxCmd.musicAccept], 'accept') ?? spaceTry([WxCmd.musicDecline], 'decline')
  if (fromSpace) return fromSpace
  const tryOne = (tag: string, kind: 'accept' | 'decline') => {
    const tagOnly = new RegExp(`^\\[${tag}\\]$`, 'i').exec(normalized)
    if (tagOnly) return { kind }

    const inline = new RegExp(`^\\[${tag}\\]\\s*(\\{[\\s\\S]*\\})$`, 'i').exec(normalized)
    if (!inline) return null
    try {
      const j = JSON.parse(inline[1]!) as { messageId?: unknown; inviteId?: unknown; replyText?: unknown }
      const messageId =
        (typeof j.messageId === 'string' ? j.messageId.trim() : '') ||
        (typeof j.inviteId === 'string' ? j.inviteId.trim() : '')
      const replyText = typeof j.replyText === 'string' ? j.replyText.trim().slice(0, 500) : ''
      return { kind, messageId: messageId || undefined, replyText: replyText || undefined }
    } catch {
      return { kind }
    }
  }
  return tryOne('MUSIC_SYNC_ACCEPT', 'accept') ?? tryOne('MUSIC_SYNC_DECLINE', 'decline')
}

/** 模型把指令行与 JSON 拆成两条气泡时，尝试合并解析 */
export function mergeMusicSyncDirectiveBubbleLines(currentLine: string, nextLine?: string): string {
  const current = normalizeMusicSyncDirectiveLine(currentLine)
  const next = normalizeMusicSyncDirectiveLine(nextLine ?? '')
  if (/^\[MUSIC_SYNC_(ACCEPT|DECLINE)\]$/i.test(current) && next.startsWith('{') && next.endsWith('}')) {
    return `${current}${next}`
  }
  return current
}

/** 不应作为角色口语气泡展示的指令残留行 */
export function isMusicSyncDirectiveArtifactLine(line: string): boolean {
  const t = normalizeMusicSyncDirectiveLine(line)
  if (!t) return false
  if (parseMusicSyncIncomingActionDirective(t)) return true
  if (matchAnyDirectiveName(t, [WxCmd.musicAccept, WxCmd.musicDecline])) return true
  if (/^\[MUSIC_SYNC_(ACCEPT|DECLINE)\]/i.test(t)) return true
  if (!t.startsWith('{') || !t.endsWith('}')) return false
  try {
    const j = JSON.parse(t) as Record<string, unknown>
    if (!j || typeof j !== 'object' || Array.isArray(j)) return false
    const keys = Object.keys(j)
    if (keys.length === 0) return false
    return keys.every((k) => k === 'messageId' || k === 'inviteId' || k === 'replyText')
  } catch {
    return false
  }
}

export type MusicInviteMsgLike = {
  id: string
  from: 'self' | 'other'
  musicSync?: {
    kind: string
    inviteId: string
    trackTitle?: string
    trackArtist?: string
    coverUrl?: string
    charResponded?: 'accepted' | 'declined'
  }
}

export function hasMusicSyncResponseForInvite(msgs: readonly MusicInviteMsgLike[], inviteId: string): boolean {
  const id = inviteId.trim()
  if (!id) return false
  return msgs.some((m) => {
    const ms = m.musicSync
    if (!ms || ms.inviteId !== id) return false
    if (ms.kind === 'music_accept' || ms.kind === 'music_decline') return true
    return (
      ms.kind === 'music_invite' &&
      (ms.charResponded === 'accepted' || ms.charResponded === 'declined')
    )
  })
}

/** 从同 inviteId 的接受/拒绝卡，给未标记的用户邀约补上 charResponded */
export function enrichMusicSyncInviteCharResponded<
  T extends { id: string; from: 'self' | 'other'; musicSync?: MusicInviteMsgLike['musicSync'] },
>(msgs: readonly T[]): T[] {
  const responseByInvite = new Map<string, 'accepted' | 'declined'>()
  for (const m of msgs) {
    const ms = m.musicSync
    if (!ms?.inviteId) continue
    if (ms.kind === 'music_accept') responseByInvite.set(ms.inviteId, 'accepted')
    if (ms.kind === 'music_decline') responseByInvite.set(ms.inviteId, 'declined')
  }
  if (!responseByInvite.size) return msgs as T[]
  let changed = false
  const next = msgs.map((m) => {
    const ms = m.musicSync
    if (!ms || ms.kind !== 'music_invite' || m.from !== 'self') return m
    if (ms.charResponded === 'accepted' || ms.charResponded === 'declined') return m
    const derived = responseByInvite.get(ms.inviteId)
    if (!derived) return m
    changed = true
    return { ...m, musicSync: { ...ms, charResponded: derived } }
  })
  return changed ? next : (msgs as T[])
}

export function resolveMusicSyncInviteCover(
  msgs: readonly MusicInviteMsgLike[],
  inviteId: string,
): string {
  const id = inviteId.trim()
  if (!id) return ''
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const ms = msgs[i]?.musicSync
    if (ms?.kind === 'music_invite' && ms.inviteId === id && ms.coverUrl?.trim()) {
      return ms.coverUrl.trim()
    }
  }
  return ''
}

export function findLatestPendingMusicInvite(
  msgs: readonly MusicInviteMsgLike[],
): { messageId: string; invite: WeChatMusicSyncInvitePayload } | null {
  const messageId = resolvePendingMusicInviteMessageId({ msgs })
  if (!messageId) return null
  const row = msgs.find((m) => m.id === messageId)
  if (!row?.musicSync || row.musicSync.kind !== 'music_invite') return null
  const invite = row.musicSync as WeChatMusicSyncInvitePayload
  return { messageId, invite }
}

/** 认领用户发出的、尚未被回应的最近一条共听邀约消息 id */
export function resolvePendingMusicInviteMessageId(params: {
  messageIdHint?: string
  msgs: readonly MusicInviteMsgLike[]
}): string | null {
  const hint = params.messageIdHint?.trim()
  const msgs = params.msgs
  const isPendingInvite = (m: MusicInviteMsgLike): boolean => {
    if (m.from !== 'self' || m.musicSync?.kind !== 'music_invite') return false
    const inviteId = m.musicSync.inviteId?.trim()
    if (!inviteId) return false
    if (m.musicSync.charResponded === 'accepted' || m.musicSync.charResponded === 'declined') return false
    return true
  }

  const hintMatches = (m: MusicInviteMsgLike): boolean => {
    if (!hint) return false
    return m.id === hint || m.musicSync?.inviteId === hint
  }

  const findLatestPending = (): string | null => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!
      if (!isPendingInvite(m)) continue
      const inviteId = m.musicSync!.inviteId
      if (!hasMusicSyncResponseForInvite(msgs, inviteId)) return m.id
    }
    return null
  }

  if (hint) {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!
      if (!hintMatches(m)) continue
      if (!isPendingInvite(m)) break
      // 该 id 已有接受/拒绝时不要硬失败：继续找最近未回应邀约
      if (hasMusicSyncResponseForInvite(msgs, m.musicSync!.inviteId)) break
      return m.id
    }
    // 模型写错/省略 id、或 hint 对应条已回应时：回退到最近一条未回应邀约
    return findLatestPending()
  }

  return findLatestPending()
}

/**
 * 解析「共听接受/拒绝」应对准的邀约：
 * 1) 先看内存 msgs；2) hint 直查 DB；3) 会话内最近未回应邀约（防 items 尚未 hydrate）
 */
export async function resolvePendingMusicInviteForAction(params: {
  messageIdHint?: string
  msgs: readonly MusicInviteMsgLike[]
  conversationKey?: string
}): Promise<{ messageId: string; invite: WeChatMusicSyncInvitePayload } | null> {
  const localId = resolvePendingMusicInviteMessageId({
    messageIdHint: params.messageIdHint,
    msgs: params.msgs,
  })
  if (localId) {
    const row = params.msgs.find((m) => m.id === localId)
    if (row?.musicSync?.kind === 'music_invite') {
      return { messageId: localId, invite: row.musicSync as WeChatMusicSyncInvitePayload }
    }
  }

  const hint = params.messageIdHint?.trim()
  if (hint) {
    try {
      const dbMsg = await personaDb.getWeChatChatMessageById(hint)
      const ms = dbMsg?.musicSync
      if (dbMsg && dbMsg.type === 'player' && ms?.kind === 'music_invite' && ms.inviteId.trim()) {
        if (!hasMusicSyncResponseForInvite(params.msgs, ms.inviteId)) {
          return { messageId: dbMsg.id, invite: ms }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const ck = params.conversationKey?.trim()
  if (ck) {
    try {
      const rows = await personaDb.listWeChatChatMessagesByConversationKey(ck)
      const mapped: MusicInviteMsgLike[] = rows.map((r) => ({
        id: r.id,
        from: r.type === 'player' ? ('self' as const) : ('other' as const),
        musicSync: r.musicSync
          ? {
              kind: r.musicSync.kind,
              inviteId: r.musicSync.inviteId,
              trackTitle: 'trackTitle' in r.musicSync ? r.musicSync.trackTitle : undefined,
              trackArtist: 'trackArtist' in r.musicSync ? r.musicSync.trackArtist : undefined,
              coverUrl: 'coverUrl' in r.musicSync ? r.musicSync.coverUrl : undefined,
              charResponded:
                r.musicSync.kind === 'music_invite' && 'charResponded' in r.musicSync
                  ? r.musicSync.charResponded
                  : undefined,
            }
          : undefined,
      }))
      const pending = findLatestPendingMusicInvite(mapped)
      if (pending) {
        const dbInvite = rows.find((r) => r.id === pending.messageId)?.musicSync
        if (dbInvite?.kind === 'music_invite') {
          return { messageId: pending.messageId, invite: dbInvite }
        }
      }
    } catch {
      /* ignore */
    }
  }

  return null
}

/** 音乐共听邀约回合：强制模型输出决断指令的 replyBias */
export function buildMusicSyncInviteReplyBias(params: {
  messageId: string
  invite: WeChatMusicSyncInvitePayload
}): string {
  const artist = params.invite.trackArtist?.trim() || '未知歌手'
  return `[系统裁决·音乐共听] 用户刚向你发来音乐共听邀约：《${params.invite.trackTitle}》— ${artist}。
你必须在本轮回复中：
1) 输出 1～4 行符合人设的口语对白（是否愿意一起听、对这首歌的简短感想即可）；
2) 在口语对白之间的**任意位置**（不必在最后）**单独占一行**输出以下指令之一（缺一不可）：
   - 愿意共听：\`共听接受 id=${params.messageId}\`
   - 拒绝共听：\`共听拒绝 id=${params.messageId}\`
指令行与普通对白一样按输出顺序展示；例如可先口语、再指令、再补一句口语。
禁止只回复口语而不输出指令行；禁止在未输出 共听接受 时假装已加入共听。
**未输出 共听接受 之前**：禁止接唱、禁止大段复述/引用歌词、禁止假装「正在听/听到哪一句」；可聊歌名/歌手/愿不愿意听。
只有输出 共听接受 且客户端建立共听后，才能按一起听进度聊歌词。`
}

/**
 * 模型未输出指令行时的兜底：根据角色本轮口语推断接受/拒绝。
 * - decline：明确拒绝
 * - accept：明确愿意 / 默认接听（避免「聊了几句却不出接受卡」）
 */
export function adjudicateMusicSyncFromCharacterText(combinedText: string): 'accept' | 'decline' | null {
  const t = combinedText.trim()
  if (!t) return null

  const decline =
    /(?:没空|不想听|不听|拒绝|算了吧|自己听|不方便|下次吧|先不了|不要了|懒得|没兴趣|忙着呢|在忙|没心情|不太想|算了|免了|别了吧)/u.test(
      t,
    )
  const accept =
    /(?:一起听|陪你听|好啊|好呀|行啊|可以啊|没问题|来吧|就这首|放吧|听听|同步|陪你|我也想听|当然要|走起|马上到|等我一|马上听|接轨|频率)/u.test(
      t,
    )

  if (decline && !accept) return 'decline'
  if (accept) return 'accept'
  return null
}

/** 有待回应共听邀约且本轮已有角色口语时：无明确拒绝则默认接受，保证会出现接受/拒绝卡 */
export function resolveMusicSyncInviteFallbackVerdict(combinedText: string): 'accept' | 'decline' {
  return adjudicateMusicSyncFromCharacterText(combinedText) ?? 'accept'
}

export const WECHAT_MUSIC_SYNC_INVITE_OUTPUT_BLOCK = `
---------------------
【用户发来的音乐共听邀约（同频共听）】
---------------------
- 会话里若出现「（用户向你发来音乐共听邀约：《曲名》— 歌手…）」或用户刚发来**音乐共听邀约卡**（非「分享单曲/歌单」卡），表示对方想与你**同步收听同一首歌**。
- **「（分享单曲）」/「（分享歌单）」只是推荐音乐，不是共听邀约**；那种情况下禁止输出本节的 \`共听接受\` / \`共听拒绝\`。
- 你必须结合人设、好感、当下是否方便、对这首歌的态度，**自主决定接受或拒绝**；不要无脑答应，也不要无视邀约。
- **接受**时：先输出自然口语（可多条），在口语之间的**任意位置**（不必在最后）**单独占一行**输出机器指令（与口语分条，勿塞进同一行）：
  - \`共听接受\` 或 \`共听接受 id=邀约消息id\`
  - 指令行与普通对白**按输出顺序**展示；例如「嗯？一起听？」→ 指令 →「我进去了」。
  - \`id\` 可省略：以本会话里用户发出的、最近一条仍未回应的共听邀约为准。
- **拒绝**时：先有冷淡/抱歉/忙/不合口味等口语（符合人设，可多条），在口语之间的**任意位置**单独一行：
  - \`共听拒绝\` 或 \`共听拒绝 id=…\`
- **禁止**用普通文字假装「已加入一起听」却不输出对应指令行；**不写指令则界面不会建立共听**。
- **未输出 共听接受 前**：禁止接唱、禁止大段复述歌词、禁止假装正在听；接受并建立共听后才可聊进度/歌词。
- 指令行只表示你对**用户发来的邀约**的决断。
- 你想**主动邀请用户一起听**时，用角色侧指令 \`共听邀请\`（见「角色侧播放控制」），不要用 \`共听接受\`。
`.trim()
