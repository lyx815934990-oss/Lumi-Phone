/**
 * 读者评论二次补生：正文落库后单独请求；配合讨论位锚点穿插展示。
 */

import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChatLenient } from '../newFriendsPersona/ai'
import {
  countReaderCommentAnchorsInBody,
  extractAndStripReaderComments,
  type PlotReaderComment,
} from './datingReaderComments'

const FILL_MAX_ATTEMPTS = 2

function wrapCommentBlock(inner: string): string {
  const t = String(inner || '').trim()
  if (/【\s*读者评论(?:区|块|模式)?\s*】/u.test(t) && /【\s*读者评论(?:区|块|模式)?\s*结束\s*】/u.test(t)) {
    return t
  }
  return `【读者评论】\n${t}\n【读者评论结束】`
}

export async function requestDatingReaderCommentsFill(params: {
  apiConfig: ApiConfig
  characterName: string
  playerName?: string
  /** 须已含【读者讨论位N】，评论按 #N 对齐穿插 */
  plotBody: string
  slotCount?: number
}): Promise<PlotReaderComment[]> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl || !cfg?.apiKey || !cfg?.modelId) return []

  const char = params.characterName.trim() || '角色'
  const user = (params.playerName || '用户').trim() || '用户'
  const bodyClip = String(params.plotBody || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/【\s*读者评论[\s\S]*?【\s*读者评论(?:区|块|模式)?\s*结束\s*】/giu, '')
    .replace(/【\s*小剧场[\s\S]*?【\s*小剧场\s*结束\s*】/giu, '')
    .trim()
    .slice(-2800)

  const slotCount = Math.max(
    2,
    params.slotCount ?? (countReaderCommentAnchorsInBody(bodyClip) || 2),
  )

  const slotSkeleton = Array.from({ length: slotCount }, (_, i) => {
    const n = i + 1
    return `#${n}\n★|昵称|赞|只点评【读者讨论位${n}】之前刚发生的情节\n·|昵称|赞|只点评讨论位${n}之前窗口`
  }).join('\n')

  const system =
    `你是约会剧情「读者评论」专用生成器。只输出一个【读者评论】…【读者评论结束】块。` +
    `禁止输出剧情正文、思维链、小剧场 HTML、记忆 JSON。` +
    `角色=${char}；玩家=${user}。简体中文。` +
    `格式只能用纯文本行：★|昵称|点赞|文案 与 ·|昵称|点赞|文案；禁止 JSON。` +
    `必须按 #1…#${slotCount} 分组，与正文【读者讨论位N】同号；#N 只评该锚点之前窗口，禁止剧透后文。`

  const userMsg =
    `正文里已插入【读者讨论位1】…【读者讨论位${slotCount}】。请为每个讨论位各写 2 条评论（1★+1·）。\n` +
    `评论会穿插显示在对应讨论位，不是堆在文末。\n\n` +
    `【本轮剧情（含讨论位）】\n${bodyClip || '（无）'}\n\n` +
    `照抄骨架并填内容：\n【读者评论】\n${slotSkeleton}\n【读者评论结束】\n` +
    `现在只输出上述块，顶格，不要解释。`

  for (let i = 0; i < FILL_MAX_ATTEMPTS; i++) {
    try {
      const raw = await openAiCompatibleChatLenient(
        cfg as any,
        [
          { role: 'system', content: system },
          {
            role: 'user',
            content:
              i === 0
                ? userMsg
                : `上一则未按讨论位分组。请重写：必须含 #1…#${slotCount} 与 ★|/·| 管道行，禁止 JSON。`,
          },
        ],
        { temperature: 0.78, max_tokens: 1800 },
      )
      const { comments } = extractAndStripReaderComments(wrapCommentBlock(raw))
      if (comments.length >= 1) return comments
    } catch (e) {
      console.warn('[dating] reader-comments fill attempt failed', i + 1, e)
    }
  }
  return []
}
