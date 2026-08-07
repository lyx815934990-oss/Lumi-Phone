/**
 * 空白画布起步 CSS（糯叽机式）
 * —— 不含微信橙 / iMessage 蓝 / Lumi 铂金等任何主题美化。
 * —— 助手生成的 scopedCss 叠在后面负责全部观感。
 */
export const LUMI_CSS_SKIN_STARTER_SCOPED_CSS = `/* lumi css-skin blank canvas — no theme paint */
[data-wx-bubble-content] {
  box-sizing: border-box !important;
}
[data-wx-msg-kind="transfer"][data-wx-special-card],
[data-wx-msg-kind="red-packet"][data-wx-special-card],
[data-wx-msg-kind="location"][data-wx-special-card],
[data-wx-msg-kind="favorite"][data-wx-special-card],
[data-wx-msg-kind="voice"][data-wx-special-card],
[data-wx-msg-kind="voice-call"][data-wx-special-card] {
  position: relative !important;
  box-sizing: border-box !important;
}
`

/** 若模型 CSS 漏写特殊消息选择器，只补结构定位，不补任何主题色 */
export function ensureCssSkinSpecialRules(scopedCss: string | undefined | null): string {
  const body = String(scopedCss ?? '').trim()
  if (!body) return LUMI_CSS_SKIN_STARTER_SCOPED_CSS

  const needRp = !/\[data-wx-msg-kind=["']red-packet["']\]/.test(body)
  const needTf = !/\[data-wx-msg-kind=["']transfer["']\]/.test(body)
  if (!needRp && !needTf) return body

  const patches: string[] = []
  if (needRp) {
    patches.push(`[data-wx-msg-kind="red-packet"][data-wx-special-card] { position: relative !important; box-sizing: border-box !important; }`)
  }
  if (needTf) {
    patches.push(`[data-wx-msg-kind="transfer"][data-wx-special-card] { position: relative !important; box-sizing: border-box !important; }`)
  }
  return `${body}\n\n/* structure-only fallback */\n${patches.join('\n')}`
}

export function buildCssSkinEnginePackHints(): string[] {
  return [
    '## 纯 CSS 皮肤（skinEngine: "css" · 糯叽机空白画布）',
    '- DOM 只有最原始结构壳；**禁止**依赖微信/Lumi/iMessage/Telegram 主题皮或换色。',
    '- 所有美化写在 scopedCss：颜色、圆角、阴影、磨砂、红包卡、转账卡、顶栏、输入栏。',
    '- 文字气泡：`[data-wx-bubble-content]`；侧：`[data-wx-bubble-side="self"|"other"]`。',
    '- 特殊卡：`[data-wx-msg-kind="transfer"|"red-packet"|"voice"|"location"|"voice-call"|"favorite"][data-wx-special-card]`。',
    '- 零件：`[data-wx-special-part="icon"|"amount"|"label"|"status"|"footer"|"map"|"play"|"wave"]`。',
    '- 状态：`[data-wx-special-status="pending"|"accepted"|"unclaimed"|…]`。',
    '- preset 气泡色必须 transparent；真正颜色放 CSS。',
  ]
}
