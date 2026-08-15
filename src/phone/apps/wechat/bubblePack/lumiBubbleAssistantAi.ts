import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../newFriendsPersona/ai'
import { buildBubblePackAiPrompt } from './aiKit'
import {
  composeBubbleAssistBriefText,
  hasBubbleAssistBriefContent,
  type BubbleAssistBrief,
} from './bubbleAssistBrief'
import { ensureCssSkinSpecialRules, LUMI_CSS_SKIN_STARTER_SCOPED_CSS } from './cssSkinStarter'
import { parseLumiBubblePack } from './parse'
import type { LumiWeChatBubblePack } from './types'

export type LumiBubbleAssistantAssetHint = {
  id: string
  name: string
}

export type LumiBubbleAssistantTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type LumiBubbleAssistantProgress = {
  phase: 'thinking' | 'coding'
  thinking?: string
  refinedBrief?: string
}

export type LumiBubbleAssistantGenerateArgs = {
  apiConfig: ApiConfig
  userText?: string
  brief?: BubbleAssistBrief
  assets: LumiBubbleAssistantAssetHint[]
  priorTurns?: LumiBubbleAssistantTurn[]
  signal?: AbortSignal
  temperature?: number
  onProgress?: (p: LumiBubbleAssistantProgress) => void
}

export type LumiBubbleAssistantResult = {
  thinking: string
  refinedBrief: string
  pack: LumiWeChatBubblePack
}

/** 助手产物强制糯叽机式：原始壳 + css，禁止主题皮换色 */
export function forceNuojijiCssSkinPack(pack: LumiWeChatBubblePack): LumiWeChatBubblePack {
  const aiCss = String(pack.scopedCss ?? '').trim()
  const merged = ensureCssSkinSpecialRules(
    aiCss
      ? `${LUMI_CSS_SKIN_STARTER_SCOPED_CSS}\n\n/* --- assistant css --- */\n${aiCss}`
      : LUMI_CSS_SKIN_STARTER_SCOPED_CSS,
  )
  const bubble = {
    ...pack.preset.bubble,
    selfBubbleBg: 'transparent',
    otherBubbleBg: 'transparent',
  }
  // 勿用尾巴去切换微信/iMessage 主题皮
  delete (bubble as { bubbleTailStyle?: unknown }).bubbleTailStyle
  bubble.showBubbleTail = false

  return {
    ...pack,
    skinEngine: 'css',
    scopedCss: merged,
    skinOverrides: pack.skinOverrides ?? {},
    preset: {
      ...pack.preset,
      bubble,
    },
  }
}

export function buildLumiBubbleAssistantSystemPrompt(): string {
  return [
    buildBubblePackAiPrompt(),
    '',
    '## 内置助手额外规则（糯叽机 · 单次请求）',
    '- 你在 Lumi「微信 · 气泡助手」内写包；确认植入后写入当前聊天气泡主题预览。',
    '- **一次回复完成**：理解需求并直接输出完整气泡包 JSON。',
    '- **必须 `"skinEngine": "css"`**。禁止 structured / 禁止套微信橙卡、Lumi 铂金、iMessage、Telegram 主题皮。',
    '- **禁止换色糊弄**：不能只改 preset 实色或 skinOverrides 就交差；红包/转账/文字气泡必须用 scopedCss 画出来。',
    '- scopedCss 必须覆盖：`[data-wx-bubble-content]`、顶栏、输入栏、`red-packet`、`transfer`、`voice`、`voice-call`、`location`。',
    '- 用户提到磨砂时：半透明底 + backdrop-filter；红包转账也要同系，禁止默认橙卡。',
    '- 多轮改稿：在上一版完整 JSON 上改，仍输出完整包。',
    '- 未上传 assetId 时不要写 avatarChrome。',
  ].join('\n')
}

function looksLikeFrostedRequest(text: string): boolean {
  return /磨砂|毛玻璃|frosted|glassmorphism|玻璃拟态|半透明模糊/i.test(text)
}

function assetBlock(assets: LumiBubbleAssistantAssetHint[]): string {
  if (assets.length === 0) return '（暂无已上传资源；请勿输出 avatarChrome 引用）'
  return assets.map((a) => `- ${a.id}（${a.name || a.id}）`).join('\n')
}

function resolveDemandText(args: LumiBubbleAssistantGenerateArgs): string {
  if (args.brief && hasBubbleAssistBriefContent(args.brief)) {
    return composeBubbleAssistBriefText(args.brief)
  }
  return (
    args.userText?.trim() ||
    '请设计一套原创、协调的聊天气泡外观（糯叽机式纯 CSS；禁止微信橙卡主题皮）。'
  )
}

function frostHintFor(text: string): string {
  if (!looksLikeFrostedRequest(text)) return ''
  return [
    '',
    '【硬性验收 · 磨砂】',
    '- 文字气泡与特殊消息都用 scopedCss 半透明 + backdrop-filter。',
    '- 禁止微信默认橙卡红包/转账。',
    '- 仅改顶栏或实色 = 失败。',
  ].join('\n')
}

function extractOptionalPreface(raw: string): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  const fence = /```(?:json|css)?/i.exec(text)
  const brace = text.indexOf('{')
  let cut = text.length
  if (fence && fence.index != null) cut = Math.min(cut, fence.index)
  if (brace >= 0) cut = Math.min(cut, brace)
  const preface = text.slice(0, cut).trim()
  if (!preface || preface.length > 800) return ''
  if (/^\{/.test(preface)) return ''
  return preface
}

export async function generateBubblePackWithLumiAssistant(
  args: LumiBubbleAssistantGenerateArgs,
): Promise<LumiBubbleAssistantResult> {
  const cfg = args.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) {
    throw new Error('请先在 API 设置中配置 chatCard（地址 / 密钥 / 模型）')
  }

  const isRevise = Boolean(args.priorTurns?.length)
  const demand = isRevise
    ? args.userText?.trim() || '请按上一版继续微调；保持 skinEngine:css，禁止改回主题皮。'
    : resolveDemandText(args)

  const thinking = isRevise
    ? '（改稿 · 单次 · 纯 CSS）'
    : '（单次 · 糯叽机纯 CSS，不套主题皮）'
  const refinedBrief = demand

  args.onProgress?.({ phase: 'coding', thinking, refinedBrief })

  const messages: OpenAiCompatibleMessage[] = [
    { role: 'system', content: buildLumiBubbleAssistantSystemPrompt() },
  ]

  if (isRevise && args.priorTurns?.length) {
    for (const t of args.priorTurns) {
      messages.push({ role: t.role, content: t.content })
    }
    messages.push({
      role: 'user',
      content: [
        demand,
        '',
        '请输出完整气泡包 JSON。必须 skinEngine:"css"，用 scopedCss 重绘；禁止微信/Lumi 主题皮换色。',
      ].join('\n'),
    })
  } else {
    messages.push({
      role: 'user',
      content: [
        '【可用头像装饰资源 assetId】',
        assetBlock(args.assets),
        '',
        '【用户需求 · 糯叽机式纯 CSS，禁止主题皮】',
        demand,
        frostHintFor(demand),
        '',
        '请输出完整气泡包 JSON：skinEngine 必须为 "css"；scopedCss 必填并覆盖文字气泡+红包+转账+顶栏+输入。',
        'preset 气泡色写 transparent。禁止套微信橙卡或只改颜色交差。',
      ].join('\n'),
    })
  }

  const raw = await openAiCompatibleChat(cfg, messages, {
    temperature: args.temperature ?? (isRevise ? 0.68 : 0.62),
    max_tokens: 7000,
    signal: args.signal,
  })

  const preface = extractOptionalPreface(raw)
  const pack = forceNuojijiCssSkinPack(parseLumiBubblePack(raw))
  return {
    thinking: preface || thinking,
    refinedBrief,
    pack,
  }
}
