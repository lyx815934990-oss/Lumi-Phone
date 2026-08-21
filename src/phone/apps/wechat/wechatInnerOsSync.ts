/**
 * 微信气泡「内心 OS」同轮同步：与心语档案不同——每条可见文字/语音气泡一句潜台词。
 * 行格式：`[内心OS]……`（紧跟在对应气泡行后；不算可见气泡）。
 */

const INNER_OS_LINE_RE = /^(?:\[内心OS\]|【内心OS】|\[OS\]|【OS】)\s*(.*)$/u

/** 注入 system：开启「每句内心 OS」时的硬项规则 */
export function buildWechatInnerOsSyncAppendix(): string {
  return `【同步内心 OS · 硬项】
本会话已开启「每句消息生成内心 OS」。角色发出的每条**用户可见文字气泡**与每条 \`语音 \` 行之后，必须紧跟单独一行：
\`[内心OS]……\`
其中「……」为一句第一人称潜台词（宜 8～40 字）：嘴上说的 vs 心里真正想的，可吐槽、口是心非、吃醋、嘴硬心软等；**禁止**写成心语档案那种整段独白；**禁止**复述气泡原文。
- \`[内心OS]\` 行**不**算用户可见气泡条数；客户端只把上一行当气泡，OS 挂到该气泡上供长按/单击查看。
- 红包/转账/表情包/图片/指令行等**不要**跟 \`[内心OS]\`。
- 若本轮同时开启同步翻译：顺序为「气泡 → \`[内心OS]\` → \`[译]\`」。
- 若本轮同时开启同步心语：全部气泡与附录行写完后，**最后**再输出心语 XML（不算气泡）。
- 群聊：每个 SPEAKER 文字/语音气泡后同样跟一行 \`[内心OS]\`。`
}

/** 解析单行是否为内心 OS 附录 */
export function parseWeChatInnerOsLine(line: string): string | null {
  const m = String(line ?? '').trim().match(INNER_OS_LINE_RE)
  if (!m) return null
  return String(m[1] ?? '').trim()
}

/** 从气泡行列表剥离 `[内心OS]`，挂到上一行 */
export function peelWeChatInnerOsLines(lines: string[]): {
  lines: string[]
  innerOs: Array<string | undefined>
} {
  const outLines: string[] = []
  const innerOs: Array<string | undefined> = []
  for (const raw of lines) {
    const line = String(raw ?? '')
    const os = parseWeChatInnerOsLine(line)
    if (os != null) {
      if (outLines.length > 0) {
        const prev = innerOs[outLines.length - 1]
        innerOs[outLines.length - 1] = os || prev
      }
      continue
    }
    outLines.push(line)
    innerOs.push(undefined)
  }
  return { lines: outLines, innerOs }
}

/** 按气泡原文键取 OS（与同步译同一套 key） */
export function createWeChatInnerOsLookup() {
  const map = new Map<string, string>()
  return {
    offer(key: string, text: string) {
      const k = key.trim()
      const t = text.trim()
      if (!k || !t) return
      if (!map.has(k)) map.set(k, t)
    },
    take(key: string): string | undefined {
      const k = key.trim()
      if (!k) return undefined
      const v = map.get(k)
      if (v != null) map.delete(k)
      return v
    },
  }
}
