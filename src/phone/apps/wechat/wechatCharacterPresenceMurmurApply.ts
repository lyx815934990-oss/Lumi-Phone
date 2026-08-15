/**
 * 线上私聊：用户明确要求角色改「在线状态 / 想法」或发「碎碎念」时的检测、提示词与偏置。
 * 想法具体文案由状态判断模型从用户原话智能理解，不做正则抠字。
 */

export type UserPresenceMurmurRequest = {
  presence: boolean
  thought: boolean
  murmur: boolean
}

const PRESENCE_RE =
  /(?:改|换|调|设|把).{0,12}(?:在线状态|在线档|状态圆点)|(?:在线状态|状态).{0,8}(?:改成|换成|设为|调成)|(?:设为|改成|换成).{0,6}(?:在线|离开|离线)|(?:你|角色).{0,8}(?:上线|离线|离开一下|显示在线|显示离开|显示离线)/i

const THOUGHT_RE =
  /(?:改|换|发|更新|写|挂).{0,12}(?:想法|想法气泡|状态文案|动态想法)|(?:想法|想法气泡).{0,10}(?:改成|换成|写成|更新|挂着|挂上)|把.{0,10}想法.{0,8}(?:改|换|设|挂)|发一个想法|发个想法|挂(?:一个|个)?想法/i

const MURMUR_RE =
  /(?:发|写|更|发一条|发个).{0,8}(?:碎碎念|随手记)|(?:碎碎念|随手记).{0,8}(?:发|写|更新|发一条)|发条碎碎念|发条随手记/i

function joinTexts(message?: string | null | string[]): string {
  if (Array.isArray(message)) {
    return message.map((x) => String(x ?? '').trim()).filter(Boolean).join('\n')
  }
  return String(message ?? '').trim()
}

/**
 * 取本轮用户连发气泡（从末尾跳过对方/系统后，连续 self）。
 * AI 已写入 transcript 时也能正确拿到「怎么样？」前的「发想法 / 说『…』」。
 */
export function collectLastUserBurstTexts(
  transcript: readonly { from: string; text?: string | null }[],
  limit = 8,
): string[] {
  let i = transcript.length - 1
  while (i >= 0 && transcript[i]?.from !== 'self') i -= 1
  const out: string[] = []
  while (i >= 0 && transcript[i]?.from === 'self' && out.length < limit) {
    const text = String(transcript[i]?.text ?? '').trim()
    if (text) out.unshift(text)
    i -= 1
  }
  return out
}

export function detectUserPresenceMurmurRequest(
  message?: string | null | string[],
): UserPresenceMurmurRequest {
  const t = joinTexts(message)
  if (!t) return { presence: false, thought: false, murmur: false }
  return {
    presence: PRESENCE_RE.test(t),
    thought: THOUGHT_RE.test(t),
    murmur: MURMUR_RE.test(t),
  }
}

export function userRequestedPeerPresenceOrThought(
  message?: string | null | string[],
): boolean {
  const d = detectUserPresenceMurmurRequest(message)
  return d.presence || d.thought
}

export function userRequestedMurmurPublish(message?: string | null | string[]): boolean {
  return detectUserPresenceMurmurRequest(message).murmur
}

/** 注入本轮 user bias：明确要求时角色须立刻配合更新 */
export function buildUserPresenceMurmurRequestBias(
  message?: string | null | string[],
): string {
  const d = detectUserPresenceMurmurRequest(message)
  if (!d.presence && !d.thought && !d.murmur) return ''
  const parts: string[] = []
  if (d.presence || d.thought) {
    parts.push(
      '用户明确要求你改**在线状态 / 活动文案 / 想法气泡**：须像真人立刻照做（可先 1～2 句口语答应）。若对方给了具体想法内容，须按对方意思挂上对应短文案，勿擅自换成出门/加班等无关状态；客户端会在本轮结束后由状态判断同步对外展示。**禁止**只口头敷衍却不改。',
    )
  }
  if (d.murmur) {
    parts.push(
      '用户明确要求你发**碎碎念 / 随手记**：须立刻答应并发布对应内容（可先短回一句）；客户端会在本轮结束后生成并上墙；**禁止**只说「好」却不发。',
    )
  }
  return `[系统提示] 用户本轮明确要求你更新动态展示。${parts.join(' ')}`
}

export const WECHAT_CHARACTER_PRESENCE_MURMUR_APPENDIX = `
---------------------
【在线状态 / 想法 / 碎碎念 · 用户点名须立刻更新】
---------------------
对外展示与私聊分开：
- **在线状态**：在线 / 离开 / 离线（聊天顶栏圆点）。
- **活动文案**：如「工作中」「听歌中」（≤8 字）。
- **想法**：状态列表上的短贴纸句（≤8 字公开状态，不是对用户说的私聊句）。
- **碎碎念 / 随手记**：动态里的短备忘帖（公开可见的一句话）。

■ 自知
- 提示词中的【你的在线状态与想法 · 当前对外展示】即你此刻挂着的状态；被问「你想法写了啥」须按该快照回答，勿装不知道。

■ 默认
- 无用户点名时，勿为刷存在感乱改状态、乱发碎碎念；自行更新仍服从会话开关与人设节奏。

■ 用户明确要求时（硬）
- 若 {{user}} **明确要求**你改在线状态 / 活动 / 想法，或要求你发碎碎念 / 随手记：
  1) 本轮可见回复须像真人**立刻答应并照做**（可嘴硬/吐槽，但结果须改/须发）；
  2) 按对方说的方向改；对方给了具体想法内容时须按对方意思挂上，禁止擅自改成「立刻出发」等无关状态；
  3) **禁止**只口头「好啊/改好了/发出去了」却不真正更新；客户端会在本轮结束后同步状态与碎碎念。
- 不愿配合时（极少）：须明确口头拒绝，且不要假装已改/已发。
`.trim()
