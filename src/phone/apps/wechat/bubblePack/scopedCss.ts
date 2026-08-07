/**
 * AI / 外发包常见问题：
 * - 误用 `.wx-bubble-content`（DOM 不存在）
 * - 选择器前再写一层 `[data-wx-chat-skin-scope]`，套进 `@scope` 后双重限定导致规则永不命中
 * 规范化后保证预览/真机都能吃到 blur / 描边 / 阴影。
 */

/** 去掉多余的皮肤根前缀，避免 @scope 双重嵌套失效 */
function stripRedundantSkinScopePrefix(css: string): string {
  return css
    .replace(/\[data-wx-chat-skin-scope\]\s+/g, '')
    .replace(/\[data-lumi-theme-scope\]\s+/g, '')
}

/**
 * AI / 旧包常误用 `.wx-bubble-content`（DOM 上不存在）。
 * 统一改写为真实挂载点 `[data-wx-bubble-content]`。
 */
export function normalizeBubblePackScopedCss(css: string | undefined | null): string {
  let body = String(css ?? '').trim()
  if (!body) return ''
  body = body.replace(/\.wx-bubble-content\b/g, '[data-wx-bubble-content]')
  body = stripRedundantSkinScopePrefix(body)
  return body
}

/** 从 scopedCss 里读出气泡 blur 强度（px）；没有则 null */
export function extractBubbleBackdropBlurPx(css: string | undefined | null): number | null {
  const body = String(css ?? '')
  if (!/backdrop-filter/i.test(body)) return null
  const m =
    /\[data-wx-bubble-content\][^{]*\{[^}]*backdrop-filter:\s*blur\(([\d.]+)px\)/i.exec(body) ||
    /backdrop-filter:\s*blur\(([\d.]+)px\)/i.exec(body)
  if (!m) return 10
  const n = Number(m[1])
  return Number.isFinite(n) ? Math.max(2, Math.min(40, Math.round(n))) : 10
}

/**
 * 糯叽机同款：毛玻璃规则落到气泡面，并用 !important 压过 React inline 的 transparent border。
 * 若原文已有 bubble-content 规则则补强；否则按检测到的 blur 补一条完整规则。
 */
export function ensureFrostedBubbleCss(css: string | undefined | null): string {
  const body = normalizeBubblePackScopedCss(css)
  if (!body) return ''
  if (body.includes('lumi frosted boost')) return body
  const blurPx = extractBubbleBackdropBlurPx(body)
  if (blurPx == null) return body

  const boost = [
    `[data-wx-bubble-content] {`,
    `  -webkit-backdrop-filter: blur(${blurPx}px) saturate(160%) !important;`,
    `  backdrop-filter: blur(${blurPx}px) saturate(160%) !important;`,
    `  border: 1px solid rgba(255,255,255,0.55) !important;`,
    `  box-shadow: 0 4px 14px rgba(180,160,135,0.16) !important;`,
    `}`,
    `[data-wx-chat-header], [data-wx-chat-input-bar] {`,
    `  -webkit-backdrop-filter: blur(${Math.max(blurPx, 14)}px) saturate(160%) !important;`,
    `  backdrop-filter: blur(${Math.max(blurPx, 14)}px) saturate(160%) !important;`,
    `}`,
    `[data-wx-chat-header] {`,
    `  border-bottom-color: rgba(255,255,255,0.45) !important;`,
    `}`,
    `[data-wx-chat-input-bar] {`,
    `  border-top-color: rgba(255,255,255,0.4) !important;`,
    `}`,
    `[data-wx-chat-input-shell] {`,
    `  -webkit-backdrop-filter: blur(${blurPx}px) saturate(160%) !important;`,
    `  backdrop-filter: blur(${blurPx}px) saturate(160%) !important;`,
    `}`,
    `[data-wx-special-card] {`,
    `  -webkit-backdrop-filter: blur(${blurPx}px) saturate(160%) !important;`,
    `  backdrop-filter: blur(${blurPx}px) saturate(160%) !important;`,
    `}`,
  ].join('\n')

  return `${body}\n\n/* lumi frosted boost (nuojiji-parity) */\n${boost}`
}

/** 将气泡包 scopedCss 限制在聊天皮肤根节点内 */
export function wrapWeChatChatSkinScopedCss(css: string | undefined | null): string {
  const body = ensureFrostedBubbleCss(css)
  if (!body) return ''
  return `@scope ([data-wx-chat-skin-scope]) {\n${body}\n}`
}
