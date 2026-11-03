import { loadUserMoments } from '../../../components/moments/momentsFeedStorage'
import { loadStoryTimelinePromptBlock } from '../wechat/memory/storyTimelinePersist'
import { buildNetworkRelationshipsPromptBlock } from '../wechat/networkRelationshipsPrompt'
import { loadObservationNotes } from '../wechat/observationNotes/store'
import { personaDb } from '../wechat/newFriendsPersona/idb'
import type { Character } from '../wechat/newFriendsPersona/types'
import { buildCharacterCard, buildWorldBookText } from '../wechat/wechatChatAi'
import { resolvePrivateChatNetworkRootId } from '../wechat/privateChatNetworkNpcPronoun'

/** 同人注入世界书上限：保留职业/性格锚点，避免拖垮上下文 */
const FORUM_WORLD_BOOK_MAX = 1600

export type ForumPublicContext = {
  /** 约会角色 id（本命同人套用文风设定） */
  characterId: string
  userDisplayName: string
  charDisplayName: string
  charBioSnippet: string
  /** user 人设摘要（玩家身份卡） */
  userPersonaSnippet: string
  /** char 人设摘要（角色名片） */
  charPersonaSnippet: string
  relationshipLabel: string
  publicMomentSnippets: string[]
  /** 开启「参考近期剧情」时注入的时间轴摘要 */
  recentPlotSnippet: string
  includeRecentPlot: boolean
  /** 开启「人脉关系」时：关系表 + 绑定 NPC 人设 */
  networkCastSnippet: string
  includeNetworkCast: boolean
  /** 喂给模型的整块文本 */
  promptBlock: string
  /** 短摘要落库 */
  digest: string
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function clipMultiline(s: string, max: number): string {
  const t = s.replace(/\r\n/g, '\n').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * 与约会/私聊同款名片 + 截断世界书，保证职业/气质锚点进同人提示词。
 */
function forumPersonaCard(ch: Character | null | undefined, voice: 'character_card' | 'player_identity'): string {
  if (!ch) return ''
  const card = buildCharacterCard(ch, { bioMaxChars: 520 }).trim()
  const wb = buildWorldBookText(ch, FORUM_WORLD_BOOK_MAX, { voice }).trim()
  if (!card && !wb) return ''
  if (!wb) return card
  const wbLabel =
    voice === 'player_identity'
      ? '【玩家世界书·气质与设定锚点｜同人须对齐】'
      : '【角色世界书·气质与设定锚点｜同人须对齐】'
  return `${card}\n\n${wbLabel}\n${clipMultiline(wb, FORUM_WORLD_BOOK_MAX)}`
}

/**
 * 组装「网友能公开获知」的素材：user/char 人设名片 + 侧写关系 + 公开朋友圈；
 * 可选附带近期剧情时间轴、人脉关系与绑定 NPC 人设（仍禁止复述私聊原文）。
 */
export async function buildForumPublicContext(params: {
  characterId: string
  charDisplayName: string
  userDisplayName: string
  wechatAccountId?: string | null
  playerIdentityId?: string | null
  /** 是否参考近期剧情时间轴 */
  includeRecentPlot?: boolean
  /** 是否参考人脉关系设定 + 绑定 NPC 人设（可能写成群像） */
  includeNetworkCast?: boolean
}): Promise<ForumPublicContext> {
  const cid = params.characterId.trim()
  const charName = params.charDisplayName.trim() || '角色'
  const userName = params.userDisplayName.trim() || '用户'
  const includeRecentPlot = !!params.includeRecentPlot
  const includeNetworkCast = !!params.includeNetworkCast

  let charBioSnippet = ''
  let charPersonaSnippet = ''
  try {
    const ch = cid ? await personaDb.getCharacter(cid) : null
    if (ch) {
      const bio = typeof ch.bio === 'string' ? ch.bio.trim() : ''
      const nick = typeof ch.wechatNickname === 'string' ? ch.wechatNickname.trim() : ''
      const realName = typeof ch.name === 'string' ? ch.name.trim() : ''
      const nameLine =
        realName && nick && nick !== realName ? `真名「${realName}」；微信昵称「${nick}」` : ''
      charBioSnippet = clip(
        [nameLine, bio].filter(Boolean).join('；') || (realName ? `真名「${realName}」` : ''),
        220,
      )
      charPersonaSnippet = forumPersonaCard(ch, 'character_card')
    }
  } catch {
    charBioSnippet = ''
    charPersonaSnippet = ''
  }

  let userPersonaSnippet = ''
  const pid = params.playerIdentityId?.trim()
  if (pid && pid !== '__none__') {
    try {
      const iden = await personaDb.getPlayerIdentity(pid)
      if (iden) {
        userPersonaSnippet = forumPersonaCard(iden, 'player_identity')
      }
    } catch {
      userPersonaSnippet = ''
    }
  }

  let relationshipLabel = ''
  if (cid && pid && pid !== '__none__') {
    try {
      const doc = await loadObservationNotes({
        conversationCharacterId: cid,
        playerIdentityId: pid,
        charDisplayName: charName,
        seedIfEmpty: false,
      })
      relationshipLabel = doc?.relationshipLabel?.trim() || ''
    } catch {
      relationshipLabel = ''
    }
  }

  const publicMomentSnippets: string[] = []
  const acc = params.wechatAccountId?.trim()
  if (acc) {
    try {
      const moments = await loadUserMoments(acc)
      const relevant = moments
        .filter((m) => {
          const text = (m.content || '').trim()
          if (!text) return false
          if (m.isUserAuthored) return true
          if (m.authorCharacterId?.trim() === cid) return true
          return false
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6)
      for (const m of relevant) {
        const who = m.isUserAuthored ? userName : m.authorName?.trim() || charName
        publicMomentSnippets.push(`「${who}」朋友圈：${clip(m.content || '', 80)}`)
      }
    } catch {
      // skip
    }
  }

  let recentPlotSnippet = ''
  if (includeRecentPlot && cid) {
    try {
      const block = await loadStoryTimelinePromptBlock(cid, { recentSummaryRowCount: 8 })
      recentPlotSnippet = clipMultiline(block, 1800)
    } catch {
      recentPlotSnippet = ''
    }
  }

  let networkCastSnippet = ''
  if (includeNetworkCast && cid) {
    try {
      const focus = await personaDb.getCharacter(cid)
      const rootId = (await resolvePrivateChatNetworkRootId(focus)) || cid
      const chunks: string[] = []

      const relBlock = await buildNetworkRelationshipsPromptBlock({
        rootId,
        focusCharacterId: cid,
        mainToNpcOnly: false,
        maxChars: 2200,
      })
      if (relBlock.trim()) {
        chunks.push(clipMultiline(relBlock.trim(), 2200))
      }

      const npcs = (await personaDb.listNpcsFor(rootId)) as Character[]
      const npcCards: string[] = []
      for (const n of npcs.slice(0, 10)) {
        if (n.id === cid) continue
        const card = buildCharacterCard(n, { bioMaxChars: 180 }).trim()
        if (!card) continue
        const nm = (n.name || n.wechatNickname || '').trim() || '未命名'
        npcCards.push(`· NPC「${nm}」\n${card}`)
      }
      if (npcCards.length) {
        chunks.push(
          '【绑定 NPC 人设摘要】以下为同人脉档案中的配角名片，可入群像场次；气质须一致，禁止另编表外身份。',
          ...npcCards,
        )
      }

      networkCastSnippet = clipMultiline(chunks.join('\n\n'), 3200)
    } catch {
      networkCastSnippet = ''
    }
  }

  const lines: string[] = [
    '【网友可公开获知的信息｜最高优先级】',
    `- CP：${userName} × ${charName}`,
  ]

  if (userPersonaSnippet) {
    lines.push(`- ${userName}（user）人设名片摘要（气质/身份参考，禁止写成私聊原文）：`)
    lines.push(userPersonaSnippet)
  } else {
    lines.push(`- ${userName}（user）：仅知显示名，人设细节不足时勿胡编家庭/职业黑历史。`)
  }

  if (charPersonaSnippet) {
    lines.push(`- ${charName}（char）人设名片摘要（气质/身份参考，禁止写成私聊原文）：`)
    lines.push(charPersonaSnippet)
  } else if (charBioSnippet) {
    lines.push(`- ${charName} 公开名片摘录：${charBioSnippet}`)
  } else {
    lines.push(`- ${charName}：通讯录可见名「${charName}」（无更多公开简介）`)
  }

  lines.push(
    relationshipLabel
      ? `- 路人侧写/传闻中的关系印象（非官方官宣）：「${clip(relationshipLabel, 40)}」——仅作氛围参考，勿写成当事人亲口确认的私密告白原文`
      : '- 关系阶段：公开信息不足，网友只能根据蛛丝马迹脑补，勿写成已官宣细节',
  )

  if (publicMomentSnippets.length) {
    lines.push('- 近期公开朋友圈蛛丝马迹：')
    for (const s of publicMomentSnippets) lines.push(`  · ${s}`)
  } else {
    lines.push(
      '- 近期公开朋友圈：暂无可用摘要；只写模糊的「好像有点不对劲的互动感」，禁止编造具体私聊对白。',
    )
  }

  if (includeRecentPlot) {
    if (recentPlotSnippet) {
      lines.push(
        '',
        '【可选·近期剧情参考｜用户已开启】',
        '以下为故事时间轴摘要，仅作氛围与事件走向参考。须改写成「网友脑补出来的画面感」，禁止复述私聊原文、禁止全知剧透口吻。',
        recentPlotSnippet,
      )
    } else {
      lines.push(
        '',
        '【可选·近期剧情参考｜用户已开启】',
        '暂无可用时间轴摘要；仍按公开名片与朋友圈蛛丝马迹脑补，勿编造未发生的重大剧情转折。',
      )
    }
  }

  if (includeNetworkCast) {
    if (networkCastSnippet) {
      lines.push(
        '',
        '【可选·人脉关系与绑定 NPC｜用户已开启】',
        '主 CP 仍是上方 user × char；可写成群像（多人同场），出场配角须来自下表关系与 NPC 人设，禁止另造表外人物亲密线。',
        '关系档位、称呼、双方看法须与表一致；NPC 气质用行动体现，禁止设定表朗读。',
        networkCastSnippet,
      )
    } else {
      lines.push(
        '',
        '【可选·人脉关系与绑定 NPC｜用户已开启】',
        '当前角色暂无人脉圈或绑定 NPC 可读；仍以 user × char 双人线为主，勿硬编群像路人团。',
      )
    }
  }

  lines.push(
    '',
    '【硬边界】',
    '- **身份/职业铁律**：名片与世界书里写明的身份、职业、圈子（如电竞选手、学生等）必须沿用；禁止擅自改成便利店员、无关兼职等「脑补换皮职业」。',
    '- **性格铁律**：言行、语气、相处模式必须贴合人设与世界书（如娇软/黏人/嘴硬心软等）；禁止写成与人设相反的互损嘴炮二人转，除非人设明文如此。',
    '- 人设用于气质与行为习惯对齐；禁止写成设定表朗读或人设条目罗列。',
    '- 只能根据以上信息脑补；禁止写出未公开的私聊承诺、亲密细节、具体私聊对白原文。',
    '- 同人文应读起来像「网友根据蛛丝马迹磕到了」，而不是全知视角剧透。',
  )

  const promptBlock = lines.join('\n')
  const digest = clip(
    [
      `${userName}×${charName}`,
      relationshipLabel || '关系未公开',
      publicMomentSnippets.length ? `圈${publicMomentSnippets.length}条` : '无圈',
      includeRecentPlot ? (recentPlotSnippet ? '含近期剧情' : '剧情空') : '未参近期剧情',
      includeNetworkCast ? (networkCastSnippet ? '含人脉群像' : '人脉空') : '未参人脉',
      userPersonaSnippet || charPersonaSnippet ? '含人设' : '人设薄',
    ].join(' · '),
    160,
  )

  return {
    characterId: cid,
    userDisplayName: userName,
    charDisplayName: charName,
    charBioSnippet,
    userPersonaSnippet,
    charPersonaSnippet,
    relationshipLabel,
    publicMomentSnippets,
    recentPlotSnippet,
    includeRecentPlot,
    networkCastSnippet,
    includeNetworkCast,
    promptBlock,
    digest,
  }
}
