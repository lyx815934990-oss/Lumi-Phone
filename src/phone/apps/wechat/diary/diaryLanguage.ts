import {
  normalizeWeChatChatLanguageCode,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  weChatChatLanguageLabel,
  weChatChatLanguageNativeName,
} from '../wechatChatLanguage'

export function normalizeDiaryOutputLanguage(code?: string | null): string {
  return normalizeWeChatChatLanguageCode(code, WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE)
}

/** 简体/繁体均视为中文：不显示「译为中文」按钮 */
export function isDiaryWritingChinese(code?: string | null): boolean {
  const c = normalizeDiaryOutputLanguage(code)
  return c === 'zh-CN' || c === 'zh-TW'
}

export function buildDiaryOutputLanguageAppendix(diaryOutputLanguage?: string | null): string {
  const code = normalizeDiaryOutputLanguage(diaryOutputLanguage)
  if (code === 'zh-CN') return ''

  const native = weChatChatLanguageNativeName(code)
  const label = weChatChatLanguageLabel(code)
  const isTw = code === 'zh-TW'

  return `
【日记书写语言 · 最高优先级之一】
- 用户已指定：日记正文 title 与 content 一律使用 **${label}（${native}）** 书写。
- 禁止默认改回简体中文正文（本条系统说明除外）。
- memory_summary 仍须用**简体中文**第三人称撰写（供长期记忆检索），与正文语言无关。
- inUniverseTime 可用简体中文标注剧情时间（含公历年份）。
${
  isTw
    ? '- 正文使用繁体汉字；文盲/低学历人设的拼音顶替规则仍适用（仅难字）。'
    : `- 正文主体必须是 ${native}；不要中英（或其它语言）整句混排。
- 文盲/低学历人设：若该语言文化下「写不好字」的表现不适用，则用通顺 ${native} 书写即可，勿强行插入拼音。
- 文化水平正常或偏高：通顺书面 ${native}，不要故意写错。`
}
`.trim()
}
