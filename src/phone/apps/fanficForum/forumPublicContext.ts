import { loadUserMoments } from '../../../components/moments/momentsFeedStorage'
import { loadObservationNotes } from '../wechat/observationNotes/store'
import { personaDb } from '../wechat/newFriendsPersona/idb'

export type ForumPublicContext = {
  /** 约会角色 id（本命同人套用文风设定） */
  characterId: string
  userDisplayName: string
  charDisplayName: string
  charBioSnippet: string
  relationshipLabel: string
  publicMomentSnippets: string[]
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

/**
 * 组装「网友能公开获知」的素材：名片 + 侧写关系标签 + 公开朋友圈摘要。
 * 禁止注入私聊原文。
 */
export async function buildForumPublicContext(params: {
  characterId: string
  charDisplayName: string
  userDisplayName: string
  wechatAccountId?: string | null
  playerIdentityId?: string | null
}): Promise<ForumPublicContext> {
  const cid = params.characterId.trim()
  const charName = params.charDisplayName.trim() || '角色'
  const userName = params.userDisplayName.trim() || '用户'

  let charBioSnippet = ''
  try {
    const ch = cid ? await personaDb.getCharacter(cid) : null
    const bio = typeof ch?.bio === 'string' ? ch.bio.trim() : ''
    const nick = typeof ch?.wechatNickname === 'string' ? ch.wechatNickname.trim() : ''
    const realName = typeof ch?.name === 'string' ? ch.name.trim() : ''
    // 公开名片：优先真实姓名；昵称仅作补充且与真名不同时才写
    const nameLine = realName && nick && nick !== realName ? `真名「${realName}」；微信昵称「${nick}」` : ''
    charBioSnippet = clip(
      [nameLine, bio].filter(Boolean).join('；') || (realName ? `真名「${realName}」` : ''),
      220,
    )
  } catch {
    charBioSnippet = ''
  }

  let relationshipLabel = ''
  const pid = params.playerIdentityId?.trim()
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
          // 用户自己的圈，或该角色发的公开圈
          if (m.isUserAuthored) return true
          if (m.authorCharacterId?.trim() === cid) return true
          return false
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6)
      for (const m of relevant) {
        const who = m.isUserAuthored
          ? userName
          : m.authorName?.trim() || charName
        publicMomentSnippets.push(`「${who}」朋友圈：${clip(m.content || '', 80)}`)
      }
    } catch {
      // skip
    }
  }

  const lines: string[] = [
    '【网友可公开获知的信息｜最高优先级】',
    `- CP：${userName} × ${charName}`,
    charBioSnippet ? `- ${charName} 公开名片摘录：${charBioSnippet}` : `- ${charName}：通讯录可见名「${charName}」（无更多公开简介）`,
    relationshipLabel
      ? `- 路人侧写/传闻中的关系印象（非官方官宣）：「${clip(relationshipLabel, 40)}」——仅作氛围参考，勿写成当事人亲口确认的私密告白原文`
      : '- 关系阶段：公开信息不足，网友只能根据蛛丝马迹脑补，勿写成已官宣细节',
  ]
  if (publicMomentSnippets.length) {
    lines.push('- 近期公开朋友圈蛛丝马迹：')
    for (const s of publicMomentSnippets) lines.push(`  · ${s}`)
  } else {
    lines.push('- 近期公开朋友圈：暂无可用摘要；只写模糊的「好像有点不对劲的互动感」，禁止编造具体私聊对白。')
  }
  lines.push(
    '',
    '【硬边界】',
    '- 只能根据以上公开信息脑补；禁止写出未公开的私聊承诺、亲密细节、具体私聊对白原文。',
    '- 同人文应读起来像「网友根据蛛丝马迹磕到了」，而不是全知视角剧透。',
  )

  const promptBlock = lines.join('\n')
  const digest = clip(
    [
      `${userName}×${charName}`,
      relationshipLabel || '关系未公开',
      publicMomentSnippets.length ? `圈${publicMomentSnippets.length}条` : '无圈',
    ].join(' · '),
    120,
  )

  return {
    characterId: cid,
    userDisplayName: userName,
    charDisplayName: charName,
    charBioSnippet,
    relationshipLabel,
    publicMomentSnippets,
    promptBlock,
    digest,
  }
}
