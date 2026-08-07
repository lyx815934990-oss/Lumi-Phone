/** 气泡助手分项需求：总述 + 各气泡/特殊消息可选细节 */

export type BubbleAssistBriefFieldId =
  | 'overview'
  | 'header'
  | 'textSelf'
  | 'textOther'
  | 'roomBg'
  | 'inputBar'
  | 'voice'
  | 'voiceCall'
  | 'redPacket'
  | 'transfer'
  | 'location'
  | 'avatar'
  | 'keep'

export type BubbleAssistBrief = Record<BubbleAssistBriefFieldId, string>

export type BubbleAssistBriefFieldMeta = {
  id: BubbleAssistBriefFieldId
  label: string
  hint: string
  placeholder: string
  /** 首条总述必填区；其余可选 */
  required?: boolean
  rows?: number
}

export const BUBBLE_ASSIST_BRIEF_FIELDS: BubbleAssistBriefFieldMeta[] = [
  {
    id: 'overview',
    label: '整体风格',
    hint: '先写一套大致感觉；下面各项可留空，由助手按整体风格统一补齐。',
    placeholder: '例如：暖米磨砂玻璃感，柔和阴影，无尾巴，整体偏安静私聊氛围…',
    required: true,
    rows: 4,
  },
  {
    id: 'header',
    label: '顶栏',
    hint: '可选',
    placeholder: '例：半透明磨砂、细底边、标题偏细…',
    rows: 2,
  },
  {
    id: 'textSelf',
    label: '文字气泡 · 己方',
    hint: '可选',
    placeholder: '例：雾粉半透明、圆角 18、字色深咖、不要尾巴…',
    rows: 2,
  },
  {
    id: 'textOther',
    label: '文字气泡 · 对方',
    hint: '可选',
    placeholder: '例：奶白磨砂、细白边、略大圆角…',
    rows: 2,
  },
  {
    id: 'roomBg',
    label: '聊天室背景',
    hint: '可选',
    placeholder: '例：浅米纯色 #FDFBF7，或淡灰方便透出磨砂…',
    rows: 2,
  },
  {
    id: 'inputBar',
    label: '输入栏',
    hint: '可选',
    placeholder: '例：浅磨砂底条、圆角输入壳、图标暖灰…',
    rows: 2,
  },
  {
    id: 'voice',
    label: '语音消息',
    hint: '可选 · 特殊消息',
    placeholder: '例：播放钮玫瑰金、波形已读段更深、气泡跟文字同系…',
    rows: 2,
  },
  {
    id: 'voiceCall',
    label: '语音通话条',
    hint: '可选 · 特殊消息',
    placeholder: '例：与文字气泡同色系、图标与字色统一…',
    rows: 2,
  },
  {
    id: 'redPacket',
    label: '红包',
    hint: '可选 · 特殊消息',
    placeholder: '例：绒面深红、祝福语香槟金、卡片细描边…',
    rows: 2,
  },
  {
    id: 'transfer',
    label: '转账',
    hint: '可选 · 特殊消息',
    placeholder: '例：左侧竖线香槟金、金额字更沉、已收态改青绿…',
    rows: 2,
  },
  {
    id: 'location',
    label: '位置',
    hint: '可选 · 特殊消息',
    placeholder: '例：地图 pin 改雾蓝、标题字重适中…',
    rows: 2,
  },
  {
    id: 'avatar',
    label: '头像框 / 角标',
    hint: '可选；仅当已上传资源时可写 assetId 意向',
    placeholder: '例：对方用圆形细框、右下角小星星角标…',
    rows: 2,
  },
  {
    id: 'keep',
    label: '保持不变',
    hint: '可选',
    placeholder: '例：不要改字体；尾巴保持无…',
    rows: 2,
  },
]

export function emptyBubbleAssistBrief(): BubbleAssistBrief {
  return {
    overview: '',
    header: '',
    textSelf: '',
    textOther: '',
    roomBg: '',
    inputBar: '',
    voice: '',
    voiceCall: '',
    redPacket: '',
    transfer: '',
    location: '',
    avatar: '',
    keep: '',
  }
}

export function hasBubbleAssistBriefContent(brief: BubbleAssistBrief): boolean {
  return BUBBLE_ASSIST_BRIEF_FIELDS.some((f) => brief[f.id].trim())
}

/** 拼成发给模型的结构化需求正文 */
export function composeBubbleAssistBriefText(brief: BubbleAssistBrief): string {
  const lines: string[] = []
  for (const f of BUBBLE_ASSIST_BRIEF_FIELDS) {
    const v = brief[f.id].trim()
    if (!v) continue
    lines.push(`【${f.label}】`)
    lines.push(v)
    lines.push('')
  }
  return lines.join('\n').trim()
}

/**
 * 外发用：把当前输入框已填内容打进需求模版。
 * 已填写原文；未填保留「（未填）」方便外部 AI 按整体风格补齐。
 * 若整表为空则返回 null，由调用方回退到空白模版。
 */
export function buildBubbleAssistBriefExportForExternalAi(
  brief: BubbleAssistBrief,
): string | null {
  if (!hasBubbleAssistBriefContent(brief)) return null
  const lines: string[] = [
    '--- 以下为用户在 Lumi 气泡助手已填写的需求（可直接与「外发提示词」一起发给 AI）---',
    '',
  ]
  for (const f of BUBBLE_ASSIST_BRIEF_FIELDS) {
    const v = brief[f.id].trim()
    lines.push(`【${f.label}】`)
    lines.push(v || '（未填，请按整体风格协调补齐）')
    lines.push('')
  }
  return lines.join('\n').trim()
}
