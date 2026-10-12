/**
 * 查手机 · 镜像微信 AI 输出格式（标记块 / 字段行）
 * 禁止 JSON，避免长对话嵌套与转义导致解析失败。
 */

import {
  looksLikeJapaneseBubbleText,
  parseWeChatSyncTranslationLine,
  stripJapaneseTrailingLaughMarker,
} from '../wechatChatLanguage'
import { fmtCallStatusDuration } from '../voiceCall/callStatusLabel'

function cleanSpyPlainContent(content: string): string {
  const t = content.trim()
  if (!t || !looksLikeJapaneseBubbleText(t)) return t
  return stripJapaneseTrailingLaughMarker(t)
}

type AvatarBucket =
  | 'abstract'
  | 'maleE'
  | 'elderFemale'
  | 'elderMale'
  | 'maleI'
  | 'femaleCute'
  | 'femaleCool'

type SpyMsgSpecial =
  | { kind: 'red_packet'; amountYuan?: number; remark?: string; opened?: boolean }
  | {
      kind: 'transfer'
      transferId?: string
      amountYuan?: number
      note?: string
      status?: 'pending' | 'accepted' | 'returned'
    }
  | {
      kind: 'voice_call'
      status: 'rejected' | 'no_answer' | 'duration'
      durationSec?: number
      lines?: Array<{ role: 'character' | 'player'; text: string; translation?: string }>
    }
  | {
      kind: 'location'
      name: string
      address?: string
      distance?: string
    }

type SpyMsg = {
  from: 'player' | 'character'
  content: string
  timestamp: number
  /** `[译]……` 行挂到上一条普通文字气泡 */
  translation?: string
  /** 群聊非角色发言者键（通讯录 id 或 s:昵称） */
  senderKey?: string
  senderNickname?: string
  special?: SpyMsgSpecial
}

export type SpyGroupMemberDraft = {
  key: string
  contactId?: string
  nickname: string
  isContact: boolean
  avatarBucket?: AvatarBucket
  /** 与角色关系（非通讯录成员必填；≤20 字） */
  relationshipNote?: string
}

export type SpyGroupChatDraft = {
  id: string
  groupName: string
  isPinned?: boolean
  members: SpyGroupMemberDraft[]
  messages: SpyMsg[]
}

const AVATAR_BUCKETS = new Set<string>([
  'abstract',
  'maleE',
  'elderFemale',
  'elderMale',
  'maleI',
  'femaleCute',
  'femaleCool',
])

export const SPY_WECHAT_MARKUP_RULE = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出下方规定的标记块；每行「字段名：值」（可用中文冒号或英文冒号）。
- 布尔写「是/否」；金额写数字；时间戳写毫秒整数。
- 【严禁照搬示例】下文任何举例、示范气泡、示范备注都只说明格式/风格；**禁止原样抄进输出**（含名字、宠称、整句对白）。违者视为不合格。
`.trim()

export const SPY_PROFILE_CONTACTS_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

先输出 1 个资料块，再输出若干联系人块（不含聊天记录）：

<<MIRROR_PROFILE>>
昵称：角色微信昵称
签名：个性签名
<<END_MIRROR_PROFILE>>

<<MIRROR_CONTACT>>
id：联系人唯一 id（可用英文数字下划线）
昵称：对方微信公开昵称
备注：我（角色）视角的通讯录备注（按亲疏多样化）
关系：与角色的社会/情感关系，简体中文，不超过 20 字（如同期队友、公司上司、母亲、经纪人；禁止写星标好友/通讯录好友）
头像桶：abstract|maleE|elderFemale|elderMale|maleI|femaleCute|femaleCool（仅额外联系人必填；人脉 NPC 可留空）
星标：是/否（通讯录「星标朋友」，与置顶无关）
置顶：是/否（信息页会话置顶栏，与星标无关）
拉黑：是/否
characterId：人脉角色 id（额外联系人留空）
<<END_MIRROR_CONTACT>>

备注分层（按关系选用，禁止全员同风；**只学结构，严禁照搬下方字样**）：
- 很亲：可用「字母检索前缀 + 自拟宠称/外号」；爱心可用彩色 emoji（❤️💕等）、字符心（♡♥）、或颜文字——任选，贴合亲密度即可。必须按真实称呼/人设自拟，禁止抄提示里出现过的固定宠称串。
- 一般：对方姓名，或「姓名（来源/关系）」。
- 临时：姓名或「姓名（场合）」。
`.trim()

/**
 * 镜像私聊「活人感」写法（对齐真实微信连发习惯）。
 * 生成任务与格式示例共用。内容仍须贴人设；活人感只改「怎么发」，不改「是谁」。
 */
export const SPY_CHAT_ALIVE_STYLE = `
【人设优先 · 硬性（先于活人感）】
- **角色（C）**：语气、用词、态度、底线、知识面必须贴合人设 / 世界书 / 关系阶段；禁止为了口语感说出台词本不该说的话、装成另一种人设。
- **联系人（P）**：按该联系人与角色的既有关系（同学/同事/家人/恋人等）说话；亲疏不同则亲昵度、话题、梗都不同；禁止全员同一口吻。
- **作息也要贴身份**：长辈/父母/老师等勿写凌晨三四点、四五点还在连发；同事偏白天；年轻人深夜须有动机。时间戳钟点与谁在说话必须一起合理。
- **活人感只约束气泡形态**（连发、短句、节奏），**不得牺牲人设一致性**；若二者冲突，保人设。

【活人感 · 气泡形态（像真微信，不像剧本对白）】
- **连发碎气泡**：同一人连续发 2～5 条短气泡再说完一件事；禁止把整段话塞进一条长气泡。
- **单条宜短**：多数气泡 2～18 字；偶尔一句稍长（≤35 字）即可；禁止小作文、禁止排比演讲。
- **你来我往不工整**：禁止严格「一句一回」乒乓球；允许一方连发后对方才回，或只回其中一个点。
- **口气口语**：在人设允许范围内可用短出口语、省略主语、吐槽打断补刀；人设沉稳/克制则少用脏词与夸张语气，改用符合其人设的短句连发。可用彩色爱心 emoji、字符心♡♥、颜文字，但须贴合人设，且禁止复读提示示范串。
- **具体细节**：用人设与关系里说得通的人名/地点/事物/时间点；禁止空泛寒暄，也禁止硬塞与人设无关的黑话，更禁止抄示范里的话题名词。
- **多段会话**：跨度内拆成 2～4 簇话题（中间时间戳可拉开几小时～几天）；簇内气泡时间戳很密（相差数秒～一两分钟）。
- 【禁止】客服腔、说明书腔、完美起承转合、每条都以句号收束的「完整书面句」、双方轮流各说一大段、OOC、照搬示例。
`.trim()

/**
 * 镜像微信通话 CL 建议条数（按时长；长通封顶避免爆上下文）。
 * 约每 10～14 秒一句摘录：5 分钟约 21～37 句。
 */
export function expectedMirrorCallClLineRange(durationSec: number): { min: number; max: number } {
  const sec = Math.max(0, Math.floor(Number(durationSec) || 0))
  if (sec <= 0) return { min: 0, max: 0 }
  const min = Math.max(4, Math.min(40, Math.round(sec / 14)))
  const max = Math.max(min + 2, Math.min(56, Math.round(sec / 8)))
  return { min, max }
}

/**
 * 条数明显不够时，按约 12 秒/句回推更贴合的 duration，
 * 避免界面显示「通了 5 分钟却只有四五句」。
 */
export function reconcileMirrorCallDurationSec(durationSec: number, lineCount: number): number {
  const sec = Math.max(0, Math.floor(Number(durationSec) || 0))
  const n = Math.max(0, Math.floor(Number(lineCount) || 0))
  if (sec <= 0 || n <= 0) return sec
  const { min } = expectedMirrorCallClLineRange(sec)
  if (n >= min) return sec
  return Math.max(15, Math.min(sec, Math.round(n * 12)))
}

/** 通话 CL 密度与说话节奏（生成硬项） */
export const SPY_CALL_CL_RULES = `
【通话 CL · 硬项】
- duration 接通：CL 条数须按时长密度（约每 10～14 秒一句）。例：约 1 分钟 ≈4～8 句；约 3 分钟 ≈13～22 句；约 5 分钟 ≈21～37 句。禁止时长很长却只写开场 2～4 句。
- rejected / no_answer：不要写 CL（0 行）；时长秒可写 0。
- **禁止**严格「一人一句」乒乓球轮流；必须出现同侧连续 2～4 行 CL（连说、补刀、打断后接着说）；双方条数也不必对等。
- 每句宜短口语；半角 () 内必须写声音旁白（非纯对白）；开启同步翻译时每条 CL 后跟 [译]……
`.trim()

/** 单联系人聊天块（兼容旧路径 / 补洞） */
export const SPY_CHAT_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

${SPY_CHAT_ALIVE_STYLE}

${SPY_CALL_CL_RULES}

只输出一个聊天块。消息每行一条：
普通文字：
C|毫秒时间戳|气泡正文
P|毫秒时间戳|气泡正文
红包（必须用此行，禁止只写「[红包]」占位文字）：
CRP|毫秒时间戳|金额数字|祝福语|pending或opened
PRP|毫秒时间戳|金额数字|祝福语|pending或opened
（末段可省略，默认 pending=未领；opened=已领。已领时须在下一行写系统条：【系统】你领取了对方的红包 或 【系统】对方领取了你的红包）
【红包方向 · 硬项】一笔红包只写**一条** CRP 或 PRP，禁止同一笔又写 C 又写 P。
- 联系人给角色发红包（角色是领取方）：只写 PRP|…|opened，下一行【系统】你领取了对方的红包；**禁止**再写 CRP（角色侧不得出现「发出红包」气泡）。
- 角色给联系人发红包（角色是发送方）：只写 CRP|…|opened 或 pending；已领时系统条为【系统】对方领取了你的红包。
转账（必须用此行，禁止只写「[转账]」占位文字）：
CTF|毫秒时间戳|金额数字|备注|pending或accepted或returned
PTF|毫秒时间戳|金额数字|备注|pending或accepted或returned
（accepted 时建议下一行写【系统】你已收款 或 【系统】对方已收款）
语音通话状态（可点开看记录）：
CVC|毫秒时间戳|时长秒|duration或rejected或no_answer
PVC|毫秒时间戳|时长秒|duration或rejected或no_answer
接通后紧跟 CL（条数见上表；半角括号内必须写声音旁白；开启同步翻译时每条 CL 后跟 [译]……）：
CL|C|喂？(嗓音带着刚醒的沙哑)
[译]Hello?(voice still rough from sleep)
CL|C|……怎么这时候打(被子窸窣，语气还软)
[译]...why call now(rustle of covers, soft)
CL|P|睡了吗(轻声，背景有风声)
[译]Were you asleep?(softly, wind in the background)
CL|P|没事我就……(犹豫吸气)
[译]Never mind, I'll just...(hesitant breath)
CL|C|说(低声)
[译]Go on.(low)
位置分享：
CLOC|毫秒时间戳|地点名|详细地址|距离文案
PLOC|毫秒时间戳|地点名|详细地址|距离文案
（C/CRP/CTF/CVC/CLOC = 角色侧；P/… = 联系人侧；正文内不要再写竖线 |）

<<MIRROR_CHAT>>
id：contact_xxx
C|1710000000000|（短句1·勿照抄）
C|1710000001200|（短句2·接上一句）
P|1710000003000|（对方短回）
CVC|1710000006000|72|duration
CL|C|嗯……(低声笑，被子窸窣)
CL|C|你别突然打来啊(语气软，仍未醒透)
CL|P|你别笑啊(紧张吸气)
CL|P|我就问一句(背景有风)
CL|C|问(短促)
CL|P|……算了你睡吧(轻声)
P|1710000012000|（对方收尾）
<<END_MIRROR_CHAT>>
`.trim()

/**
 * 一次请求为多名联系人各输出一块（每人一块，禁止串台）。
 * 消息行语法与 SPY_CHAT_FORMAT 相同。
 */
export const SPY_CHATS_BATCH_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

${SPY_CHAT_ALIVE_STYLE}

${SPY_CALL_CL_RULES}

为名单里**每一个**联系人各输出一个聊天块（人数 = 名单人数，禁止合并、禁止漏人、禁止串到别人的块）。
每个块第一行必须写 id（与名单完全一致），然后是消息行（语法与 SPY_CHAT_FORMAT 相同）：
普通：C|毫秒时间戳|正文 或 P|毫秒时间戳|正文
红包：CRP|毫秒时间戳|金额数字|祝福语|pending或opened / PRP|…（opened 后接【系统】领取条；一笔红包只写一侧，联系人发给角色时禁止再写 CRP）
转账：CTF|毫秒时间戳|金额数字|备注|pending或accepted或returned / PTF|…（accepted 后可接【系统】已收款）
语音通话：CVC|毫秒时间戳|时长秒|duration或rejected或no_answer / PVC|…（也可写 true=接通 / false=拒接）
通话旁白：CL|C|正文(声音旁白) 或 CL|P|…（紧跟 CVC/PVC；条数与同侧连说见【通话 CL · 硬项】；若开启同步翻译，每条 CL 后跟 [译]……）
位置：CLOC|毫秒时间戳|地点名|详细地址|距离文案 / PLOC|…（地址/距离可写「附近」，禁止只写经纬度）
（C/CRP/CTF/CVC/CLOC = 角色侧；P/PRP/PTF/PVC/PLOC = 该块联系人侧；正文勿含竖线 |）

<<MIRROR_CHAT>>
id：contact_a
C|1710000000000|（人设向短句·勿照抄）
C|1710000000800|（连发补刀）
CVC|1710000002000|72|duration
CL|C|喂？(嗓音带着刚醒的沙哑)
CL|C|怎么这时候打(被子窸窣)
CL|P|在呢(轻声，背景音乐隐约)
CL|P|没事我就……(犹豫)
CL|C|说(低声)
CL|P|……算了你睡(轻声)
P|1710000004000|（对方短回）
<<END_MIRROR_CHAT>>

<<MIRROR_CHAT>>
id：contact_b
C|1710001000000|（另一关系·不同语气）
CLOC|1710001002000|星巴克淮海店|上海市黄浦区淮海中路|步行约200米
CRP|1710001005000|8.8|喝杯热的
P|1710001007000|（对方）
<<END_MIRROR_CHAT>>
`.trim()

/** 从纯文本气泡推断红包/转账（兼容旧数据与模型偷懒写占位） */
export function inferSpySpecialFromContent(content: string): SpyMsgSpecial | undefined {
  const t = String(content ?? '').trim()
  if (!t) return undefined
  const amountMatch = t.match(/(?:¥|￥)?\s*(\d+(?:\.\d{1,2})?)\s*元?/)
  const amountYuan = amountMatch ? Number(amountMatch[1]) : undefined
  const amountOk = amountYuan != null && Number.isFinite(amountYuan) && amountYuan > 0

  if (/红包/.test(t) && !/转账/.test(t)) {
    let remark = t
      .replace(/^\[?\s*微信红包\s*\]?/i, '')
      .replace(/^\[?\s*红包\s*\]?/i, '')
      .replace(/^(?:微信)?红包\s*[:：]?\s*/i, '')
      .replace(/(?:¥|￥)?\s*\d+(?:\.\d{1,2})?\s*元?/g, '')
      .trim()
    if (!remark || remark === t) remark = '恭喜发财，大吉大利'
    return {
      kind: 'red_packet',
      amountYuan: amountOk ? amountYuan : undefined,
      remark,
      opened: /已领|已拆|opened/i.test(t),
    }
  }

  if (/转账/.test(t)) {
    let note = t
      .replace(/^\[?\s*微信转账\s*\]?/i, '')
      .replace(/^\[?\s*转账\s*\]?/i, '')
      .replace(/^(?:微信)?转账\s*[:：]?\s*/i, '')
      .replace(/(?:¥|￥)?\s*\d+(?:\.\d{1,2})?\s*元?/g, '')
      .replace(/pending|accepted|returned|待收|已收|已退/gi, '')
      .trim()
    const status: 'pending' | 'accepted' | 'returned' = /已退|returned/i.test(t)
      ? 'returned'
      : /已收|accepted/i.test(t)
        ? 'accepted'
        : 'pending'
    return {
      kind: 'transfer',
      amountYuan: amountOk ? amountYuan : 88,
      note: note || undefined,
      status,
    }
  }
  return undefined
}

/**
 * 相关群聊：可与私聊同批生成。
 * 成员里 contactId 须来自当前通讯录；陌生人用 s:微信昵称|头像桶。
 * 消息：C=角色；G|ts|发言者键|正文（发言者键=通讯录 id 或 s:昵称）。
 */
export const SPY_GROUPS_BATCH_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

${SPY_CHAT_ALIVE_STYLE}

按任务要求的数量输出相关群聊块（禁止无关灌水群）。
群名要像真微信群名（工作群/同学群/家人群/兴趣群等），贴合人设与通讯录关系，且与本次勾选的私聊联系人相关。

【群内人设与态度一致 · 硬项】
- 通讯录成员在群里的语气/态度必须与其「关系」及私聊气质一致：前任/冷战/不愉快 → 群里可冷淡、客套、少接话、阴阳或装不熟，**禁止**突然变亲密损友；恋人/死党 → 可更随便，但仍贴关系阶段。
- 角色（C）对某人的群内接话也要贴双方关系，禁止对前任突然甜蜜哄劝。
- 活人感只改气泡形态，不得用「群里气氛好」当借口 OOC。

字段：
- id：必须以 group_ 开头（唯一）
- 群名：信息页显示的群名称
- 置顶：是/否（信息页置顶栏）
- 成员：顿号或逗号分隔（勿用竖线当成员分隔符）。
  - 通讯录成员：直接写其 id
  - 非通讯录（含已删好友但仍同群）：\`s:微信昵称|头像桶|关系\`
    - 头像桶与通讯录相同，仅允许：abstract|maleE|elderFemale|elderMale|maleI|femaleCute|femaleCool
    - **只写桶名**；禁止头像 URL / http / data:；前端按桶从本地文件夹选图（与额外联系人同一逻辑）
    - 关系≤20 字必填，如「前同事·已删好友」「同城网友」「高中同学未加好友」
- 消息行：
  C|毫秒时间戳|正文（角色本人）
  G|毫秒时间戳|发言者键|正文（发言者键必须是上方成员里的联系人 id 或 s:昵称）
  可选：CRP/CTF 仅角色；GRP|ts|发言者键|金额|祝福语；GTF|ts|发言者键|金额|备注|status
- 若开启同步翻译：每条普通文字后跟 \`[译]……\`；每条通话 CL 后也跟 \`[译]……\`（红包/转账/CVC/PVC 不要跟译）
- 整段禁止 JSON、禁止代码围栏、禁止前后解释。

<<MIRROR_GROUP_CHAT>>
id：group_work_1
群名：（自拟群名·勿照抄）
置顶：否
成员：contact_a、contact_b、s:路过的猫|femaleCute|前同事·已删好友、s:阿伟|maleE|同城网友
C|1710000000000|（角色短句）
G|1710000001200|contact_a|（通讯录成员短回）
G|1710000002400|s:路过的猫|（陌生人短句）
C|1710000004000|（角色再接）
<<END_MIRROR_GROUP_CHAT>>
`.trim()

export const SPY_MOMENTS_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

每个朋友圈一条块：

<<MIRROR_MOMENT>>
id：唯一 id
内容：正文
可见性：公开/屏蔽用户/仅TA可见 等短文案
赞：甲、乙、丙（顿号或逗号分隔，可空）
评：甲：评论内容
评：乙：另一条评论
<<END_MIRROR_MOMENT>>
`.trim()

export const SPY_FINANCIAL_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

账单与亲情卡各用独立块：

<<MIRROR_BILL>>
id：唯一 id
日期：YYYY-MM-DD 或可读日期
对象：对方称呼
金额：-66（支出为负，收入为正）
备注：短备注
<<END_MIRROR_BILL>>

<<MIRROR_CARD>>
id：唯一 id
持卡人：开通对象
限额：3000
已用：800
<<END_MIRROR_CARD>>
`.trim()

function stripFence(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function splitFieldLine(line: string): { key: string; value: string } | null {
  const raw = String(line ?? '').trim()
  if (!raw) return null
  const m = raw.match(/^([^:：]{1,32})\s*[:：]\s*(.*)$/)
  if (!m) return null
  return { key: m[1]!.trim().toLowerCase(), value: (m[2] ?? '').trim() }
}

function yesNo(v: string | undefined): boolean | undefined {
  const s = (v || '').trim()
  if (!s) return undefined
  if (/^(是|yes|true|1|y)$/i.test(s)) return true
  if (/^(否|no|false|0|n)$/i.test(s)) return false
  return undefined
}

function num(v: string | undefined, fallback = 0): number {
  const n = Number(String(v ?? '').replace(/[,，\s]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

function normalizeBucket(v: string | undefined): AvatarBucket | undefined {
  const s = (v || '').trim()
  return AVATAR_BUCKETS.has(s) ? (s as AvatarBucket) : undefined
}

function fieldMap(block: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f) continue
    // 评：可多行，单独处理
    if (f.key === '评' || f.key === '评论' || f.key === 'comment') continue
    if (!map.has(f.key)) map.set(f.key, f.value)
  }
  return map
}

function getField(map: Map<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = map.get(k.toLowerCase())
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function extractBlocks(raw: string, openTag: string, closeTag: string): string[] {
  const text = stripFence(raw)
  const open = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const close = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${open}\\s*([\\s\\S]*?)\\s*${close}`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const body = (m[1] ?? '').trim()
    if (body) out.push(body)
  }
  return out
}

function parseLikes(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(/[,，、|/]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function parseComments(block: string): Array<{ from: string; content: string }> {
  const out: Array<{ from: string; content: string }> = []
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f) continue
    if (!(f.key === '评' || f.key === '评论' || f.key === 'comment')) continue
    const v = f.value
    const idxCn = v.indexOf('：')
    const idxEn = v.indexOf(':')
    let sep = -1
    if (idxCn >= 0 && idxEn >= 0) sep = Math.min(idxCn, idxEn)
    else sep = Math.max(idxCn, idxEn)
    if (sep < 0) {
      if (v.trim()) out.push({ from: '路人', content: v.trim() })
      continue
    }
    const from = v.slice(0, sep).trim() || '路人'
    const content = v.slice(sep + 1).trim()
    if (content) out.push({ from, content })
  }
  return out
}

function parseMessageLines(block: string): SpyMsg[] {
  const out: SpyMsg[] = []
  /** 最近一条语音通话，供后续 CL 行挂载 */
  let pendingCallIdx = -1
  for (const line of block.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue

    // 通话内容行：CL|C|文案(声音旁白) / CL|P|…
    const cl = t.match(/^CL\s*[|｜]\s*([CPcp角色联])\s*[|｜]\s*(.+)$/i)
    if (cl && pendingCallIdx >= 0) {
      const side = cl[1]!.toLowerCase()
      const role: 'player' | 'character' =
        side === 'p' || side === '联' ? 'player' : 'character'
      const text = (cl[2] ?? '').trim()
      const call = out[pendingCallIdx]
      if (text && call?.special?.kind === 'voice_call') {
        const lines = call.special.lines ? [...call.special.lines] : []
        lines.push({ role, text })
        call.special = { ...call.special, lines }
      }
      continue
    }

    // 同步翻译：优先挂到上一句通话 CL；否则挂普通文字气泡（红包/转账不跟译）
    const peeledTr = parseWeChatSyncTranslationLine(t)
    if (peeledTr != null) {
      if (pendingCallIdx >= 0) {
        const call = out[pendingCallIdx]
        if (call?.special?.kind === 'voice_call' && call.special.lines?.length) {
          const lines = [...call.special.lines]
          const lastIdx = lines.length - 1
          const last = lines[lastIdx]!
          if (!last.translation) {
            lines[lastIdx] = { ...last, translation: peeledTr }
            call.special = { ...call.special, lines }
            continue
          }
        }
      }
      pendingCallIdx = -1
      for (let i = out.length - 1; i >= 0; i -= 1) {
        const prev = out[i]!
        if (prev.special) continue
        if (!prev.translation) prev.translation = peeledTr
        break
      }
      continue
    }

    // 语音通话：CVC|ts|秒|status / PVC|…（status 兼容 duration/true/false 等）
    const vc = t.match(
      /^([CP])VC\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*(\d{1,6})\s*[|｜]\s*([^\s|｜]*)\s*$/i,
    )
    if (vc) {
      const from: 'player' | 'character' = vc[1]!.toUpperCase() === 'P' ? 'player' : 'character'
      const timestamp = Number(vc[2])
      const durationSec = Math.max(0, Math.round(Number(vc[3]) || 0))
      const stRaw = (vc[4] || 'duration').toLowerCase()
      const status: 'rejected' | 'no_answer' | 'duration' =
        stRaw.includes('reject') || stRaw.includes('拒') || stRaw === 'false' || stRaw === '0'
          ? 'rejected'
          : stRaw.includes('no') || stRaw.includes('未接')
            ? 'no_answer'
            : // true / 1 / duration / 已接通 / 通话 → 接通
              'duration'
      if (Number.isFinite(timestamp)) {
        const dur = status === 'duration' ? Math.max(1, durationSec) : 0
        out.push({
          from,
          content:
            status === 'duration'
              ? `[语音通话] ${fmtCallStatusDuration(dur)}`
              : status === 'rejected'
                ? '[语音通话] 已拒绝'
                : '[语音通话] 未接听',
          timestamp,
          special: {
            kind: 'voice_call',
            status,
            durationSec: status === 'duration' ? dur : undefined,
            lines: [],
          },
        })
        pendingCallIdx = out.length - 1
      }
      continue
    }

    // 位置：CLOC|ts|名|地址|距离 / PLOC|…（兼容误写成 名|纬度|经度）
    const loc = t.match(
      /^([CP])LOC\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*([^|｜]+)\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*(.*)$/i,
    )
    if (loc) {
      pendingCallIdx = -1
      const from: 'player' | 'character' = loc[1]!.toUpperCase() === 'P' ? 'player' : 'character'
      const timestamp = Number(loc[2])
      const name = (loc[3] ?? '').trim()
      let address = (loc[4] ?? '').trim()
      let distance = (loc[5] ?? '').trim() || '附近'
      const looksCoord = (s: string) => /^-?\d{1,3}(?:\.\d+)?$/.test(s)
      if (looksCoord(address) && looksCoord(distance.replace(/[^\d.\-]/g, '') || distance)) {
        address = ''
        distance = '附近'
      }
      if (name && Number.isFinite(timestamp)) {
        out.push({
          from,
          content: `[位置] ${name}`,
          timestamp,
          special: {
            kind: 'location',
            name,
            address: address || undefined,
            distance,
          },
        })
      }
      continue
    }

    // CRP|ts|金额|祝福语[|pending|opened] / PRP|…
    pendingCallIdx = -1
    const rp = t.match(
      /^([CP])RP\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*([^|｜]*?)(?:\s*[|｜]\s*(pending|opened|claimed|未领|已领|已拆))?\s*$/i,
    )
    if (rp) {
      const from: 'player' | 'character' = rp[1]!.toUpperCase() === 'P' ? 'player' : 'character'
      const timestamp = Number(rp[2])
      const amountYuan = Number(String(rp[3] ?? '').replace(/[¥￥,\s]/g, ''))
      const remark = (rp[4] ?? '').trim() || '恭喜发财，大吉大利'
      const stRaw = (rp[5] ?? 'pending').toLowerCase()
      const opened = /open|claim|已领|已拆/.test(stRaw)
      if (Number.isFinite(timestamp)) {
        out.push({
          from,
          content: remark,
          timestamp,
          special: {
            kind: 'red_packet',
            amountYuan: Number.isFinite(amountYuan) && amountYuan > 0 ? amountYuan : undefined,
            remark,
            opened,
          },
        })
        if (opened) {
          // 解析期补领取系统条（展示层也会兜底补一次）
          out.push({
            from: 'character',
            content:
              from === 'character'
                ? '【系统】对方领取了你的红包'
                : '【系统】你领取了对方的红包',
            timestamp: timestamp + 1,
          })
        }
      }
      continue
    }

    // CTF|ts|金额|备注|status / PTF|...
    const tf = t.match(
      /^([CP])TF\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*(pending|accepted|returned|待收|已收|已退)?\s*$/i,
    )
    if (tf) {
      const from: 'player' | 'character' = tf[1]!.toUpperCase() === 'P' ? 'player' : 'character'
      const timestamp = Number(tf[2])
      const amountYuan = Number(String(tf[3] ?? '').replace(/[¥￥,\s]/g, ''))
      const note = (tf[4] ?? '').trim()
      const stRaw = (tf[5] ?? 'pending').toLowerCase()
      const status: 'pending' | 'accepted' | 'returned' =
        stRaw.includes('return') || stRaw.includes('退')
          ? 'returned'
          : stRaw.includes('accept') || stRaw.includes('已收')
            ? 'accepted'
            : 'pending'
      if (Number.isFinite(timestamp)) {
        out.push({
          from,
          content: note || '[转账]',
          timestamp,
          special: {
            kind: 'transfer',
            amountYuan: Number.isFinite(amountYuan) && amountYuan > 0 ? amountYuan : 88,
            note: note || undefined,
            status,
          },
        })
      }
      continue
    }

    // 群聊成员发言：G|ts|senderKey|text
    const gm = t.match(/^(G|群)\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*([^|｜]+)\s*[|｜]\s*(.+)$/i)
    if (gm) {
      const timestamp = Number(gm[2])
      const senderKey = (gm[3] ?? '').trim()
      const content = (gm[4] ?? '').trim()
      if (content && senderKey && Number.isFinite(timestamp)) {
        const special = inferSpySpecialFromContent(content)
        const nick = senderKey.startsWith('s:') ? senderKey.slice(2).trim() : senderKey
        out.push({
          from: 'player',
          content,
          timestamp,
          senderKey,
          senderNickname: nick || senderKey,
          ...(special ? { special } : {}),
        })
      }
      continue
    }

    // 群红包：GRP|ts|senderKey|金额|祝福语
    const grp = t.match(/^GRP\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*([^|｜]+)\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*(.*)$/i)
    if (grp) {
      const timestamp = Number(grp[1])
      const senderKey = (grp[2] ?? '').trim()
      const amountYuan = Number(String(grp[3] ?? '').replace(/[¥￥,\s]/g, ''))
      const remark = (grp[4] ?? '').trim() || '恭喜发财，大吉大利'
      if (senderKey && Number.isFinite(timestamp)) {
        const nick = senderKey.startsWith('s:') ? senderKey.slice(2).trim() : senderKey
        out.push({
          from: 'player',
          content: remark,
          timestamp,
          senderKey,
          senderNickname: nick || senderKey,
          special: {
            kind: 'red_packet',
            amountYuan: Number.isFinite(amountYuan) && amountYuan > 0 ? amountYuan : undefined,
            remark,
            opened: false,
          },
        })
      }
      continue
    }

    // 群转账：GTF|ts|senderKey|金额|备注|status
    const gtf = t.match(
      /^GTF\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*([^|｜]+)\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*([^|｜]*)\s*[|｜]\s*(pending|accepted|returned|待收|已收|已退)?\s*$/i,
    )
    if (gtf) {
      const timestamp = Number(gtf[1])
      const senderKey = (gtf[2] ?? '').trim()
      const amountYuan = Number(String(gtf[3] ?? '').replace(/[¥￥,\s]/g, ''))
      const note = (gtf[4] ?? '').trim()
      const stRaw = (gtf[5] ?? 'pending').toLowerCase()
      const status: 'pending' | 'accepted' | 'returned' =
        stRaw.includes('return') || stRaw.includes('退')
          ? 'returned'
          : stRaw.includes('accept') || stRaw.includes('已收')
            ? 'accepted'
            : 'pending'
      if (senderKey && Number.isFinite(timestamp)) {
        const nick = senderKey.startsWith('s:') ? senderKey.slice(2).trim() : senderKey
        out.push({
          from: 'player',
          content: note || '[转账]',
          timestamp,
          senderKey,
          senderNickname: nick || senderKey,
          special: {
            kind: 'transfer',
            amountYuan: Number.isFinite(amountYuan) && amountYuan > 0 ? amountYuan : 88,
            note: note || undefined,
            status,
          },
        })
      }
      continue
    }

    // C|ts|text 或 P|ts|text
    const m = t.match(/^([CPcp角色联])\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*(.+)$/)
    if (m) {
      const side = m[1]!.toLowerCase()
      const from: 'player' | 'character' =
        side === 'p' || side === '联' ? 'player' : 'character'
      const timestamp = Number(m[2])
      const content = cleanSpyPlainContent((m[3] ?? '').trim())
      if (content && Number.isFinite(timestamp)) {
        const special = inferSpySpecialFromContent(content)
        out.push({ from, content, timestamp, ...(special ? { special } : {}) })
      }
      continue
    }
    // 兼容：character|ts|text / player|ts|text
    const m2 = t.match(/^(character|player|角色|联系人)\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*(.+)$/i)
    if (m2) {
      const side = m2[1]!.toLowerCase()
      const from: 'player' | 'character' =
        side === 'player' || side === '联系人' ? 'player' : 'character'
      const timestamp = Number(m2[2])
      const content = cleanSpyPlainContent((m2[3] ?? '').trim())
      if (content && Number.isFinite(timestamp)) {
        const special = inferSpySpecialFromContent(content)
        out.push({ from, content, timestamp, ...(special ? { special } : {}) })
      }
    }
  }
  // 条数明显少于时长应有密度时，回推 duration，避免「5 分钟只有四五句」
  for (const msg of out) {
    if (msg.special?.kind !== 'voice_call') continue
    if (msg.special.status !== 'duration') continue
    const n = msg.special.lines?.length ?? 0
    const dur = msg.special.durationSec ?? 0
    const next = reconcileMirrorCallDurationSec(dur, n)
    if (next !== dur && next > 0) {
      msg.special = { ...msg.special, durationSec: next }
      msg.content = `[语音通话] ${fmtCallStatusDuration(next)}`
    }
  }
  return out
}

export function parseSpyProfileContactsMarkup(raw: string): {
  profile: { nickname: string; avatarUrl?: string; signature: string }
  contacts: Array<{
    id: string
    nickname?: string
    remarkName: string
    avatarBucket?: AvatarBucket
    isStarred?: boolean
    isPinned?: boolean
    blocked?: boolean
    characterId?: string
    relationshipNote?: string
  }>
} | null {
  const profiles = extractBlocks(raw, '<<MIRROR_PROFILE>>', '<<END_MIRROR_PROFILE>>')
  const contactBlocks = extractBlocks(raw, '<<MIRROR_CONTACT>>', '<<END_MIRROR_CONTACT>>')
  if (!profiles.length && !contactBlocks.length) return null

  const pMap = fieldMap(profiles[0] || '')
  const profile = {
    nickname: getField(pMap, ['昵称', 'nickname', 'name']),
    avatarUrl: getField(pMap, ['头像', 'avatar', 'avatarurl']) || undefined,
    signature: getField(pMap, ['签名', '个性签名', 'signature']),
  }

  const contacts = contactBlocks
    .map((body, i) => {
      const map = fieldMap(body)
      const id =
        getField(map, ['id', '联系人id', 'contactid']) || `contact_${i + 1}_${Date.now().toString(36)}`
      let remarkName =
        getField(map, ['备注', '备注名', 'remark', 'remarkname']) ||
        getField(map, ['昵称', 'nickname']) ||
        ''
      // 丢掉「；联系人」一类提示残片 / 占位词，交给上层按侧写重算
      const remarkBad =
        !remarkName.trim() ||
        /^[;；:：,，.。、\s]+/.test(remarkName.trim()) ||
        /^(联系人|用户|朋友|对方|未命名)$/i.test(remarkName.trim()) ||
        /私藏侧写|禁止照搬|请按我与/.test(remarkName)
      if (remarkBad) remarkName = ''
      const nickname = getField(map, ['昵称', 'nickname']) || undefined
      const characterId = getField(map, ['characterid', '角色id', 'npcid']) || undefined
      const avatarBucket = normalizeBucket(
        getField(map, ['头像桶', 'avatarbucket', 'bucket', '头像类型']),
      )
      const relationshipNote = getField(map, ['关系', '关系描述', 'relationship', 'relation', 'rel'])
      return {
        id,
        nickname,
        remarkName: remarkName || nickname || '（待定）',
        avatarBucket,
        isStarred: yesNo(getField(map, ['星标', '星标好友', 'starred', 'isstarred'])),
        isPinned: yesNo(getField(map, ['置顶', '置顶聊天', 'pinned', 'ispinned', 'pin'])),
        blocked: yesNo(getField(map, ['拉黑', '屏蔽', 'blocked', 'isblocked'])),
        characterId: characterId || undefined,
        relationshipNote: relationshipNote || undefined,
      }
    })
    .filter((c) => c.id && c.remarkName)

  if (!contacts.length && !profile.nickname && !profile.signature) return null
  return { profile, contacts }
}

export function parseSpyChatMarkup(raw: string): {
  messages: SpyMsg[]
} | null {
  const blocks = extractBlocks(raw, '<<MIRROR_CHAT>>', '<<END_MIRROR_CHAT>>')
  // 兼容未写结束标签：整段当消息区
  const body = blocks[0] ?? stripFence(raw)
  const messages = parseMessageLines(body)
  if (!messages.length) return null
  return { messages }
}

/** 一次请求多联系人：按块内 id 归并消息 */
export function parseSpyChatsBatchMarkup(raw: string): {
  byContactId: Record<string, SpyMsg[]>
} | null {
  const blocks = extractBlocks(raw, '<<MIRROR_CHAT>>', '<<END_MIRROR_CHAT>>')
  if (!blocks.length) return null
  const byContactId: Record<string, SpyMsg[]> = {}
  for (const body of blocks) {
    const map = fieldMap(body)
    const id = getField(map, ['id', '联系人id', 'contactid', 'contact_id', 'cid'])
    const messages = parseMessageLines(body)
    if (!id || !messages.length) continue
    byContactId[id] = messages
  }
  if (!Object.keys(byContactId).length) return null
  return { byContactId }
}

function parseGroupMemberTokens(raw: string): SpyGroupMemberDraft[] {
  // 不要用 | 当分隔：陌生人格式含 s:昵称|桶|关系
  const parts = String(raw || '')
    .split(/[,，、;；]+/)
    .map((x) => x.trim())
    .filter(Boolean)
  const out: SpyGroupMemberDraft[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    if (/^s:/i.test(part)) {
      const rest = part.replace(/^s:/i, '').trim()
      const segs = rest.split(/\s*[|｜]\s*/).map((x) => x.trim()).filter(Boolean)
      const nickname = (segs[0] || '').trim()
      if (!nickname) continue
      const key = `s:${nickname}`
      if (seen.has(key)) continue
      seen.add(key)
      let bucketRaw = ''
      let relationRaw = ''
      if (segs.length >= 2) {
        if (AVATAR_BUCKETS.has(segs[1]!)) {
          bucketRaw = segs[1]!
          relationRaw = segs.slice(2).join('｜')
        } else {
          // 兼容漏写桶：第二段当关系
          relationRaw = segs.slice(1).join('｜')
        }
      }
      const relationshipNote = relationRaw.replace(/\s+/g, '').slice(0, 20) || undefined
      out.push({
        key,
        nickname,
        isContact: false,
        avatarBucket: normalizeBucket(bucketRaw),
        relationshipNote,
      })
      continue
    }
    const contactId = part.trim()
    if (!contactId || seen.has(contactId)) continue
    seen.add(contactId)
    out.push({
      key: contactId,
      contactId,
      nickname: contactId,
      isContact: true,
    })
  }
  return out
}

/** 一次请求多个相关群聊 */
export function parseSpyGroupsBatchMarkup(raw: string): {
  groups: SpyGroupChatDraft[]
} | null {
  const blocks = extractBlocks(raw, '<<MIRROR_GROUP_CHAT>>', '<<END_MIRROR_GROUP_CHAT>>')
  if (!blocks.length) return null
  const groups: SpyGroupChatDraft[] = []
  for (const body of blocks) {
    const map = fieldMap(body)
    const rawId = getField(map, ['id', '群id', 'groupid', 'group_id'])
    const groupName = getField(map, ['群名', '名称', 'name', 'title', 'groupname', 'group_name'])
    const members = parseGroupMemberTokens(getField(map, ['成员', 'members', '群成员']))
    const messages = parseMessageLines(body)
    if (!rawId || !groupName || !messages.length) continue
    const id = rawId.startsWith('group_') || rawId.startsWith('group:') ? rawId : `group_${rawId}`
    // 用成员表补全 G 行的昵称（通讯录成员先用 id，后续 AI 层再映射备注）
    const memberByKey = new Map(members.map((m) => [m.key, m] as const))
    for (const msg of messages) {
      if (!msg.senderKey) continue
      const m = memberByKey.get(msg.senderKey) || memberByKey.get(`s:${msg.senderKey}`)
      if (m && !msg.senderNickname) msg.senderNickname = m.nickname
    }
    groups.push({
      id,
      groupName,
      isPinned: yesNo(getField(map, ['置顶', 'pinned', 'pin'])),
      members,
      messages,
    })
  }
  if (!groups.length) return null
  return { groups }
}

export function parseSpyMomentsMarkup(raw: string): {
  moments: Array<{
    id: string
    content: string
    visibility: string
    likes: string[]
    comments: Array<{ from: string; content: string }>
  }>
} | null {
  const blocks = extractBlocks(raw, '<<MIRROR_MOMENT>>', '<<END_MIRROR_MOMENT>>')
  if (!blocks.length) return null
  const moments = blocks.map((body, i) => {
    const map = fieldMap(body)
    return {
      id: getField(map, ['id']) || `moment_${i + 1}`,
      content: getField(map, ['内容', '正文', 'content', 'text']),
      visibility: getField(map, ['可见性', 'visibility', '隐私']) || '公开',
      likes: parseLikes(getField(map, ['赞', '点赞', 'likes'])),
      comments: parseComments(body),
    }
  }).filter((m) => m.content)
  if (!moments.length) return null
  return { moments }
}

export function parseSpyFinancialMarkup(raw: string): {
  bills: Array<{ id: string; date: string; target: string; amount: number; remark: string }>
  affectionCards: Array<{ id: string; holder: string; limit: number; spent: number }>
} | null {
  const billBlocks = extractBlocks(raw, '<<MIRROR_BILL>>', '<<END_MIRROR_BILL>>')
  const cardBlocks = extractBlocks(raw, '<<MIRROR_CARD>>', '<<END_MIRROR_CARD>>')
  if (!billBlocks.length && !cardBlocks.length) return null

  const bills = billBlocks.map((body, i) => {
    const map = fieldMap(body)
    return {
      id: getField(map, ['id']) || `bill_${i + 1}`,
      date: getField(map, ['日期', 'date', 'time']),
      target: getField(map, ['对象', '对方', 'target', 'to']),
      amount: num(getField(map, ['金额', 'amount', 'money'])),
      remark: getField(map, ['备注', 'remark', 'note']),
    }
  })

  const affectionCards = cardBlocks.map((body, i) => {
    const map = fieldMap(body)
    return {
      id: getField(map, ['id']) || `card_${i + 1}`,
      holder: getField(map, ['持卡人', '对象', 'holder', 'to']),
      limit: num(getField(map, ['限额', 'limit', '额度']), 0),
      spent: num(getField(map, ['已用', 'spent', '已花费']), 0),
    }
  })

  return { bills, affectionCards }
}
