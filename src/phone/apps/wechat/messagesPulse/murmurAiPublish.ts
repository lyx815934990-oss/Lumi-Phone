import type { ApiConfig } from '../../api/types'
import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { loadOfflineDatingPlotsPromptBlock } from '../dating/loadOfflineDatingPlotsForWechatPrompt'
import { gatherLatestRoundBodyForEpilogue } from '../memory/memoryEpilogueArchive'
import { resolveAutoSummaryApiConfigFromSettings } from '../memory/memorySummaryApi'
import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character } from '../newFriendsPersona/types'
import { filterContactsRelatedToAuthor } from './murmurRelation'
import {
  computeMurmurNextDueAt,
  isMurmurAdaptivePublishDue,
  isMurmurPublishDue,
  loadMurmurPublishSettings,
  saveMurmurPublishSettings,
  type MurmurPublishSettings,
} from './murmurSettings'
import {
  loadCharacterMurmurs,
  murmurDayKey,
  MURMUR_REACT_EMOJIS,
  saveCharacterMurmurs,
  type MurmurComment,
  type MurmurContactLite,
  type MurmurEntry,
  type MurmurSticker,
} from './murmurStorage'

function stripFences(raw: string): string {
  return String(raw ?? '')
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function fieldLine(block: string, keys: string[]): string {
  const lines = block.split(/\r?\n/)
  for (const key of keys) {
    const re = new RegExp(`^\\s*${key}\\s*[:：]\\s*(.*)$`, 'i')
    for (const line of lines) {
      const m = re.exec(line.trim())
      if (!m) continue
      return (m[1] ?? '').trim()
    }
  }
  return ''
}

function parseYesNo(raw: string): boolean {
  const s = raw.trim().toLowerCase()
  if (/^(是|要|发|发布|true|yes|1)$/i.test(s)) return true
  if (/^(否|不|不发|false|no|0)$/i.test(s)) return false
  if (s.includes('不发') || s.includes('无需')) return false
  if (s.includes('发') || s.includes('是')) return true
  return false
}

export type MurmurAiPublishResult =
  | { status: 'skipped'; reason: string }
  | { status: 'no_post' }
  | { status: 'published'; entry: MurmurEntry }
  | { status: 'failed'; reason: string }

async function resolveMurmurApiConfig(fallback: ApiConfig | null): Promise<ApiConfig | null> {
  try {
    const settings = await personaDb.getMemorySettings()
    const fromMemory = resolveAutoSummaryApiConfigFromSettings(settings, fallback)
    if (fromMemory?.apiUrl?.trim() && fromMemory.apiKey?.trim() && fromMemory.modelId?.trim()) {
      return fromMemory
    }
  } catch {
    /* ignore */
  }
  if (fallback?.apiUrl?.trim() && fallback.apiKey?.trim() && fallback.modelId?.trim()) return fallback
  try {
    return await loadResolvedApiConfig()
  } catch {
    return null
  }
}

async function gatherRecentPlotContext(characterId: string, characterName?: string): Promise<string> {
  const chunks: string[] = []
  try {
    const latest = await gatherLatestRoundBodyForEpilogue(characterId)
    if (latest.trim()) chunks.push(`【近轮对话/尾声摘录】\n${latest.trim().slice(0, 1600)}`)
  } catch {
    /* ignore */
  }
  try {
    const rows = await personaDb.listWeChatChatMessagesRecentByCharacter({
      characterId,
      limit: 16,
    })
    const lines: string[] = []
    for (const m of rows.slice(-10)) {
      const t = String(m.content ?? '').trim()
      if (!t) continue
      const who = m.type === 'character' ? '角色' : m.type === 'player' ? '用户' : '系统'
      lines.push(`${who}：${t.slice(0, 140)}`)
    }
    if (lines.length) chunks.push(`【线上私聊近况】\n${lines.join('\n')}`)
  } catch {
    /* ignore */
  }
  try {
    const offline = await loadOfflineDatingPlotsPromptBlock(characterId, characterName ?? null)
    const clipped = offline.trim().slice(0, 2200)
    if (clipped) chunks.push(clipped)
  } catch {
    /* ignore */
  }
  return chunks.join('\n\n').slice(0, 4200)
}

function buildMurmurPublishSystemPrompt(mode: MurmurPublishSettings['mode']): string {
  const adaptiveHint =
    mode === 'adaptive'
      ? `
【灵动模式】
- 材料含线上私聊与线下约会剧情；优先捕捉「刚发生、可公开分享」的余韵（散场、忙完、心情起伏、日常碎片）。
- 若材料偏私密/暧昧到不宜公开，或只是正在进行中的对话无收束 →「发布：否」。
- 不要复述约会长情节；只提炼一句外人也能看的随手记。
`.trim()
      : ''

  return `
你是角色「碎碎念 / 随手记」撰写助手。根据最近线上聊天与线下约会剧情，判断角色此刻是否值得发一条极短的公开碎碎念。

【原则】
- 默认「发布：否」。无新近剧情线索、纯闲聊、或没有可公开的心情/状态 → 不发。
- 有可感知的近况（忙完、累了、开心、下雨出门、刚吵完想冷静、约会后余韵等）才发。
- **用户点名例外（最高优先）**：若材料写明用户明确要求发碎碎念 / 随手记 → **必须「发布：是」**，正文按用户要求与人设口吻写（≤28 字）；禁止「发布：否」。
- 文案 ≤28 字，像状态贴纸/随手记，第一人称短句；禁止对某个具体好友点名邀约；禁止长篇独白。
- 禁止臆造未在材料中出现的事实；禁止泄露不宜公开的私密细节。
${adaptiveHint}

【输出】禁止 JSON、禁止 markdown 围栏。只输出：

[MURMUR]
发布：是
正文：今天好累啊
反应：👍|哈哈

或

[MURMUR]
发布：否

「反应」可选：给人脉内好友的轻互动，格式「emoji|短评」，多条用顿号或换行；无则留空。
`.trim()
}

function parseMurmurPublishMarkup(raw: string): {
  shouldPost: boolean
  text: string
  reactionHints: Array<{ emoji: string; comment: string }>
} {
  const body = stripFences(raw)
  const blockMatch = body.match(/\[MURMUR\]([\s\S]*?)(?=\n\s*\[[A-Z_]+\]|$)/i)
  const block = (blockMatch?.[1] ?? body).trim()
  const shouldPost = parseYesNo(fieldLine(block, ['发布', '是否发布', 'post', 'publish']))
  const text = fieldLine(block, ['正文', '碎碎念', 'text', 'content']).slice(0, 28)
  const reactionRaw = fieldLine(block, ['反应', '互动', 'reactions'])
  const reactionHints: Array<{ emoji: string; comment: string }> = []
  if (reactionRaw) {
    for (const part of reactionRaw.split(/[、,，\n]/)) {
      const bit = part.trim()
      if (!bit) continue
      const [em, ...rest] = bit.split('|')
      const emoji = (em || '').trim().slice(0, 8)
      const comment = rest.join('|').trim().slice(0, 24)
      if (emoji) reactionHints.push({ emoji, comment })
    }
  }
  return { shouldPost, text, reactionHints }
}

function pickRelatedEngagement(opts: {
  murmurId: string
  related: MurmurContactLite[]
  hints: Array<{ emoji: string; comment: string }>
  now: number
}): { stickers: MurmurSticker[]; comments: MurmurComment[] } {
  const stickers: MurmurSticker[] = []
  const comments: MurmurComment[] = []
  const pool = opts.related.slice(0, 8)
  if (!pool.length) return { stickers, comments }

  const hints = opts.hints.length
    ? opts.hints
    : [{ emoji: MURMUR_REACT_EMOJIS[0]!, comment: '' }]

  for (let i = 0; i < Math.min(pool.length, hints.length, 4); i++) {
    const c = pool[i]!
    const h = hints[i] ?? hints[0]!
    const emoji = h.emoji || MURMUR_REACT_EMOJIS[i % MURMUR_REACT_EMOJIS.length]!
    stickers.push({
      id: `st-ai-${opts.murmurId}-${c.characterId}`,
      emoji,
      text: '',
      authorId: c.characterId,
      authorName: c.remarkName,
      authorAvatarUrl: c.avatarUrl,
      at: opts.now + 3000 + i * 1200,
    })
    if (h.comment) {
      comments.push({
        id: `cm-ai-${opts.murmurId}-${c.characterId}`,
        authorId: c.characterId,
        authorName: c.remarkName,
        authorAvatarUrl: c.avatarUrl,
        text: h.comment,
        at: opts.now + 5000 + i * 1500,
      })
    }
  }
  return { stickers, comments }
}

/** 角色主动发一条碎碎念（参考近剧情；互动仅限人脉同伴） */
export async function publishCharacterMurmurFromAi(params: {
  character: Character
  contacts: MurmurContactLite[]
  apiConfig?: ApiConfig | null
  force?: boolean
  /** 用户明确要求发碎碎念时的原话 / 方向 */
  userRequestText?: string
}): Promise<MurmurAiPublishResult> {
  const ch = params.character
  const cid = ch?.id?.trim() || ''
  if (!cid) return { status: 'skipped', reason: '无人设' }

  const settings = await loadMurmurPublishSettings(cid)
  const userForced = !!params.force || !!params.userRequestText?.trim()
  if (!userForced && !settings.enabled) return { status: 'skipped', reason: '未开启主动发布' }

  if (!userForced) {
    const due =
      settings.mode === 'adaptive'
        ? await isMurmurAdaptivePublishDue(cid, settings)
        : isMurmurPublishDue(settings)
    if (!due) {
      await saveMurmurPublishSettings(cid, {
        lastCheckedAt: Date.now(),
        nextDueAt: computeMurmurNextDueAt(settings),
      })
      return { status: 'skipped', reason: '未到发布时机' }
    }
  }

  const name = String(ch.name ?? ch.wechatNickname ?? '').trim() || '角色'
  const plot = await gatherRecentPlotContext(cid, name)
  if (!userForced && (!plot.trim() || plot.trim().length < 12)) {
    const now = Date.now()
    await saveMurmurPublishSettings(cid, {
      lastCheckedAt: now,
      nextDueAt: computeMurmurNextDueAt({ ...settings, lastCheckedAt: now }),
    })
    return { status: 'skipped', reason: '近剧情不足' }
  }

  const cfg = await resolveMurmurApiConfig(params.apiConfig ?? null)
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    return { status: 'failed', reason: '未配置 API' }
  }

  try {
    const raw = await openAiCompatibleChat(cfg, [
      { role: 'system', content: buildMurmurPublishSystemPrompt(settings.mode) },
      {
        role: 'user',
        content: [
          `【角色】${name}`,
          `【发布模式】${settings.mode === 'adaptive' ? '灵动（依线上/线下近况）' : '定时'}`,
          '',
          userForced
            ? [
                '【用户点名须发布 · 最高优先】',
                '用户明确要求角色立刻发一条碎碎念/随手记。你必须「发布：是」，正文贴合用户要求与人设口吻（≤28 字）。',
                params.userRequestText?.trim()
                  ? `用户原话：\n${params.userRequestText.trim().slice(0, 400)}`
                  : '',
              ]
                .filter(Boolean)
                .join('\n')
            : '',
          plot.trim() ? '【最近剧情材料】' : '',
          plot.trim() || '（本轮以用户点名为主，可据人设自拟一句公开随手记）',
          '',
          userForced
            ? '必须「发布：是」并给出正文。'
            : '请判断是否发布碎碎念；无合适近况则「发布：否」。',
        ]
          .filter((x) => x !== '')
          .join('\n'),
      },
    ])
    let parsed = parseMurmurPublishMarkup(raw)
    if (!parsed.shouldPost || !parsed.text.trim()) {
      if (userForced) {
        // 用户点名却仍否：用用户原话截短兜底发一条，避免「说发却没发」
        const fallback =
          String(params.userRequestText ?? '')
            .replace(/(?:发|写).{0,8}(?:碎碎念|随手记)|(?:碎碎念|随手记).{0,8}(?:发|写)/gi, '')
            .replace(/[，。！？\s]+/g, ' ')
            .trim()
            .slice(0, 28) || '随便记一下'
        parsed = { ...parsed, shouldPost: true, text: fallback }
      } else {
        const now = Date.now()
        const after: MurmurPublishSettings = {
          ...settings,
          lastPublishedAt: now,
          lastCheckedAt: now,
        }
        await saveMurmurPublishSettings(cid, {
          lastPublishedAt: now,
          lastCheckedAt: now,
          nextDueAt: computeMurmurNextDueAt(after),
        })
        return { status: 'no_post' }
      }
    }

    const now = Date.now()
    const id = `m-ai-${cid.slice(0, 8)}-${now}`
    const related = await filterContactsRelatedToAuthor(cid, params.contacts)
    const engagement = pickRelatedEngagement({
      murmurId: id,
      related,
      hints: parsed.reactionHints,
      now,
    })

    const entry: MurmurEntry = {
      id,
      authorId: cid,
      authorName: name,
      authorAvatarUrl: ch.avatarUrl,
      text: parsed.text.trim(),
      createdAt: now,
      dayKey: murmurDayKey(new Date(now)),
      visibility: { mode: 'public' },
      likes: [],
      reactions: [],
      stickers: engagement.stickers,
      comments: engagement.comments,
    }

    const prev = await loadCharacterMurmurs(cid, { name, avatarUrl: ch.avatarUrl })
    await saveCharacterMurmurs(cid, [entry, ...prev.filter((x) => x.id !== entry.id)])
    const afterPub: MurmurPublishSettings = {
      ...settings,
      lastPublishedAt: now,
      lastCheckedAt: now,
    }
    await saveMurmurPublishSettings(cid, {
      lastPublishedAt: now,
      lastCheckedAt: now,
      nextDueAt: computeMurmurNextDueAt(afterPub),
    })
    try {
      window.dispatchEvent(
        new CustomEvent('wechat-murmur-published', {
          detail: { characterId: cid, entryId: entry.id },
        }),
      )
    } catch {
      /* ignore */
    }
    return { status: 'published', entry }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    return { status: 'failed', reason: reason || '发布失败' }
  }
}
