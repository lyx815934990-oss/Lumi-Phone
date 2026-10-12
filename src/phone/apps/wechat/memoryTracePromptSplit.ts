import { estimateTextTokens } from '../thinkingChain/cotTokens'

export type SplitPromptSection = {
  id: string
  label: string
  detail?: string
  rawTokens: number
}

export type SplitSystemPromptOptions = {
  /** 文心「自定义提示词」正文；命中则标为扮演主壳·用户预设 */
  userRoleplayText?: string | null
  userRoleplayPresetName?: string | null
  /** online=私聊；offline=线下约会（user 侧是整包上下文，不是「你打的字」） */
  scene?: 'online' | 'offline' | null
}

type Classified = {
  mergeKey: string
  label: string
  detail: string
}

function slugId(mergeKey: string): string {
  return `sec_${mergeKey.replace(/[^\u4e00-\u9fffA-Za-z0-9]+/g, '_').slice(0, 40)}`
}

function compactWs(s: string): string {
  return String(s ?? '').replace(/\s+/g, '')
}

/**
 * 文心正文是否出现在本段。
 * 按 {{...}} 切开取字面片段顺序匹配，避免 {{char}}/{{user}} 展开后探针失效。
 */
function chunkLooksLikeUserRoleplay(chunk: string, userText: string): boolean {
  const raw = String(userText ?? '').trim()
  if (raw.length < 24) return false
  const c = compactWs(chunk)
  if (!c) return false

  const literals = raw
    .split(/\{\{[^}]+\}\}/)
    .map((s) => compactWs(s))
    .filter((s) => s.length >= 10)

  if (literals.length >= 1) {
    let from = 0
    let hits = 0
    const need = literals.length === 1 ? 1 : Math.min(2, literals.length)
    for (const lit of literals.slice(0, 10)) {
      const probe = lit.slice(0, Math.min(96, lit.length))
      if (probe.length < 10) continue
      const idx = c.indexOf(probe, from)
      if (idx >= 0) {
        hits += 1
        from = idx + probe.length
        if (hits >= need) return true
      }
    }
  }

  // 无占位符或字面过碎：整段去空白后取多处探针
  const u = compactWs(raw.replace(/\{\{[^}]+\}\}/g, ''))
  if (u.length < 48) return false
  const take = Math.min(100, Math.max(40, Math.floor(u.length * 0.06)))
  const probes = [
    u.slice(0, take),
    u.length > take * 2 ? u.slice(Math.floor(u.length * 0.3), Math.floor(u.length * 0.3) + take) : '',
    u.length > take * 3 ? u.slice(Math.floor(u.length * 0.55), Math.floor(u.length * 0.55) + take) : '',
  ].filter((p) => p.length >= 36)
  return probes.some((p) => c.includes(p))
}

function startsWithTitle(chunk: string, titles: RegExp): boolean {
  return titles.test(chunk.trimStart())
}

/**
 * 除 --- 外，在主要【标题】处再切开，避免旧快照缺分隔时整坨误归一类。
 */
function splitPromptChunks(text: string): string[] {
  const rough = text
    .split(/\n-{3,}\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const headerRe =
    /(?=^【(?:当前时间|效力层级|角色忙碌模式|忙碌模式可选触发|忙碌后回复上下文|表情包·宁缺毋滥|表情包资源|角色档案摘要|世界书条目|玩家身份|会话对方|线上回复输出协议|内置档案|档案与世界书|恋爱相处参考|[^】]*情感破冰|情感破冰与告白|界面生成设置|输出格式硬约束|约会对象·|本轮玩家输入|本轮导演指令|本轮屏外|剧情时间轴))/m

  /** 线下 user 包常用行首锚点（不一定带【】） */
  const offlineAnchorRe =
    /(?=^(?:最近剧情（|未总结·私聊|未总结·群聊|未总结·线下剧情|已总结·长期记忆))/m

  const out: string[] = []
  for (const part of rough) {
    let pieces = part
      .split(headerRe)
      .map((s) => s.trim())
      .filter(Boolean)
    if (pieces.length <= 1) pieces = [part]
    for (const p of pieces) {
      const sub = p
        .split(offlineAnchorRe)
        .map((s) => s.trim())
        .filter(Boolean)
      if (sub.length <= 1) out.push(p)
      else out.push(...sub)
    }
  }
  return out
}

/** 档案室「系统内置预设」特征（与档案室 UI 开关名对齐；≠ 微信扮演主壳） */
function detectArchiveBuiltinPresets(full: string): string[] {
  const hits: Array<{ test: RegExp; name: string }> = [
    { test: /Lumi_Doctrine_of_Love|恋爱相处参考·高质量爱情观|Lumi\s*高质量爱情观/i, name: 'Lumi 高质量爱情观' },
    { test: /情感破冰与告白|情感可抵达|告白演绎引擎/, name: '角色情感破冰与主动告白' },
    { test: /纯爱克制|Pure_Restrain/i, name: '纯爱克制' },
    { test: /来吃点丰盛的好不好|丰盛.*菜/, name: '来吃点丰盛的好不好' },
    { test: /别再问怎么了|Direct_Answer/i, name: '别再问怎么了' },
    { test: /别再嘴硬硬损|Passionate_Direct/i, name: '别再嘴硬硬损了' },
    { test: /正经吵架可以的|Realistic_Conflict/i, name: '正经吵架可以的' },
    { test: /【现实一点】|Realistic_Autonomy/i, name: '现实一点' },
    { test: /能不能温柔一点|Gentle_Older/i, name: '能不能温柔一点' },
    { test: /我也有自己的生活|Autonomous_Social/i, name: '我也有自己的生活' },
    { test: /校园与升学常识|School_Campus/i, name: '校园与升学常识' },
    { test: /别再全员牛奶香|Body_Scent_Perfume/i, name: '别再全员牛奶香' },
    { test: /有点生活常识|Daily_Life_Common_Sense/i, name: '有点生活常识' },
  ]
  return hits.filter((h) => h.test.test(full)).map((h) => h.name)
}

/**
 * 把碎段归到用户能懂的来源类别（同 key 会合并成 1 条）。
 * 窄匹配优先：避免「正文里提到忙碌/时间」就把整段大协议算进去。
 */
export function classifyPromptChunk(
  chunk: string,
  opts?: SplitSystemPromptOptions,
): Classified {
  const trimmed = chunk.trim()
  const head = trimmed.slice(0, 900)
  const full = trimmed
  const userText = String(opts?.userRoleplayText ?? '').trim()
  const presetName = String(opts?.userRoleplayPresetName ?? '').trim() || '未命名'

  if (userText && chunkLooksLikeUserRoleplay(chunk, userText)) {
    const offline = opts?.scene === 'offline'
    return {
      mergeKey: 'roleplay_user',
      label: `扮演主壳 · 文心「${presetName}」`,
      detail: offline
        ? '你的自定义提示词（已替换线下扮演/写作核心，以及沙盒与禁词硬钉）'
        : '你的自定义提示词（已替换系统 WECHAT_CORE）',
    }
  }

  // 忙碌：必须段首就是忙碌标题，且整段不能过大（防止误吞主壳）
  if (
    startsWithTitle(trimmed, /^【(?:角色)?忙碌模式|^【忙碌后回复上下文】/) &&
    trimmed.length < 2500
  ) {
    return { mergeKey: 'busy', label: '忙碌模式规则', detail: '可选触发忙碌指令的规则（仅本段）' }
  }

  // 当前时间：必须段首就是时间块
  if (startsWithTitle(trimmed, /^【当前时间】/) && trimmed.length < 1500) {
    return { mergeKey: 'time', label: '当前时间', detail: '会话墙钟时间点（短块）' }
  }

  if (/<CharUserEqualityOverride>/i.test(head) || /你现在是拥有独立人格的真实人类/.test(head)) {
    const offline = opts?.scene === 'offline'
    return {
      mergeKey: 'roleplay_system',
      label: offline ? '扮演主壳 · 线下系统内置' : '扮演主壳 · 系统内置',
      detail: offline
        ? '线下通道对齐主壳（未启用文心时）；不是玩家输入'
        : 'WECHAT_CORE（未启用文心自定义提示词时）',
    }
  }

  // —— 线下约会：整包塞在 user 角色里的上下文（≠ 你打的短句）——
  if (
    startsWithTitle(trimmed, /^【本轮(?:玩家输入|导演指令|屏外剧情引导)原文/) ||
    /^【本轮(?:玩家输入|导演指令|屏外)/.test(head)
  ) {
    return {
      mergeKey: 'offline_player_input',
      label: '本轮玩家/导演输入',
      detail: '你这一拍真正打的字（通常很短）',
    }
  }
  if (/^最近剧情（/.test(trimmed) || startsWithTitle(trimmed, /^最近剧情/)) {
    return {
      mergeKey: 'offline_recent_plots',
      label: '最近剧情（线下历史）',
      detail: '已生成的线下剧情原文/摘要装填，常占大头',
    }
  }
  if (/^未总结·私聊/.test(trimmed) || startsWithTitle(trimmed, /^未总结·私聊/)) {
    return {
      mergeKey: 'offline_uns_priv',
      label: '未总结 · 私聊原文',
      detail: '尚未写入长期记忆的微信私聊，整段注入线下请求',
    }
  }
  if (/^未总结·群聊/.test(trimmed) || startsWithTitle(trimmed, /^未总结·群聊/)) {
    return {
      mergeKey: 'offline_uns_grp',
      label: '未总结 · 群聊原文',
      detail: '尚未写入长期记忆的群聊原文',
    }
  }
  if (/^未总结·线下剧情/.test(trimmed) || startsWithTitle(trimmed, /^未总结·线下/)) {
    return {
      mergeKey: 'offline_uns_off',
      label: '未总结 · 线下剧情',
      detail: '尚未总结的线下段落',
    }
  }
  if (/^已总结·长期记忆/.test(trimmed) || startsWithTitle(trimmed, /^已总结·长期记忆/)) {
    return {
      mergeKey: 'offline_ltm',
      label: '已总结 · 长期记忆',
      detail: '关键词/向量召回的已总结记忆',
    }
  }
  if (/【剧情时间轴·当前状态】/.test(head) || startsWithTitle(trimmed, /^【剧情时间轴/)) {
    return {
      mergeKey: 'offline_timeline',
      label: '剧情时间轴',
      detail: '故事内「现在」与语义召回',
    }
  }
  if (/【界面生成设置/.test(head) || startsWithTitle(trimmed, /^【界面生成设置/)) {
    return {
      mergeKey: 'offline_ui_settings',
      label: '界面生成设置',
      detail: '人称/视角/字数/时间推进等面板硬约束',
    }
  }
  if (/【输出格式硬约束】/.test(head) || startsWithTitle(trimmed, /^【输出格式硬约束】/)) {
    return {
      mergeKey: 'offline_format',
      label: '线下输出格式硬约束',
      detail: '字数、人称、VN/普通体、评论/小剧场等',
    }
  }
  if (/【约会对象·档案/.test(head) || startsWithTitle(trimmed, /^【约会对象·档案/)) {
    return {
      mergeKey: 'offline_char_card',
      label: '约会对象 · 档案简介',
      detail: '人设卡摘要（走 user 侧注入）',
    }
  }
  if (/【约会对象·世界书】/.test(head) || startsWithTitle(trimmed, /^【约会对象·世界书/)) {
    return {
      mergeKey: 'offline_char_wb',
      label: '约会对象 · 人设世界书',
      detail: '角色卡绑定世界书（走 user 侧注入）',
    }
  }
  if (/【效力层级·(?:续写|重新生成)】/.test(head)) {
    return {
      mergeKey: 'offline_priority',
      label: '线下效力层级说明',
      detail: '续写/重生成优先级梯子',
    }
  }

  if (/Lumi_System_Override|虚构沙盒/i.test(head) && trimmed.length < 8000) {
    return { mergeKey: 'sandbox', label: '沙盒扮演', detail: '固定协议，不可被文心替换' }
  }

  if (
    startsWithTitle(trimmed, /^【表情包·宁缺毋滥/) ||
    (/表情包·宁缺毋滥/.test(head) && /表情包/.test(full) && trimmed.length < 4000)
  ) {
    return {
      mergeKey: 'sticker_rules',
      label: '表情包发送规则',
      detail: '宁缺毋滥等发送约束（协议里可能重复出现，已合并）',
    }
  }
  if (/【表情包资源】/.test(head) || startsWithTitle(trimmed, /^【表情包资源】/)) {
    return { mergeKey: 'sticker_catalog', label: '表情包资源目录', detail: '可引用的表情包名称表' }
  }
  if (/微信经典表情/.test(head)) {
    return { mergeKey: 'classic_emoji', label: '微信经典表情目录', detail: '文字行内黄脸名称表' }
  }

  if (/效力层级/.test(head) && trimmed.length < 6000) {
    return { mergeKey: 'priority', label: '效力层级说明', detail: '冲突时听谁的优先级梯子' }
  }

  // 档案室 · 系统内置预设（你在档案室开的开关；≠ WECHAT_CORE，文心不会替换）
  const builtinNames = detectArchiveBuiltinPresets(full)
  if (
    builtinNames.length > 0 ||
    /【内置档案·档[123]·效力】/.test(head) ||
    /Lumi_Doctrine_of_Love|Doctrine_of_Love/i.test(full)
  ) {
    const names = builtinNames.length ? builtinNames.join('、') : '系统内置预设'
    return {
      mergeKey: 'archive_builtin',
      label: '档案室 · 系统内置预设',
      detail: `档案室开关注入（如「${names}」）；不是微信扮演主壳，文心自定义提示词不会替换`,
    }
  }

  // 档案室 · 你自己写的世界书条目
  if (
    /【档案与世界书/.test(head) ||
    (/档案与世界书|世界线法则/.test(full) && /\[(?:微信|线下|全局|全板块)/.test(full)) ||
    (/请务必在叙事与设定理解中严格遵守下列条目/.test(full) && /档[123]/.test(full))
  ) {
    return {
      mergeKey: 'archive_user',
      label: '档案室世界书（你写的）',
      detail: '全局档案室里你创建的条目，按档位注入',
    }
  }

  if (/世界书条目|人设绑定·与档案室/.test(head) || (/世界书/.test(head) && /人设/.test(head))) {
    return { mergeKey: 'persona_wb', label: '人设世界书', detail: '角色卡绑定的世界书条目' }
  }
  if (/角色档案摘要|【角色档案】/.test(head)) {
    return { mergeKey: 'persona', label: '角色档案', detail: '人设卡摘要注入' }
  }
  if (/气质偏向/.test(head) && trimmed.length < 800) {
    return { mergeKey: 'mbti_hint', label: '气质偏向（弱参考）', detail: '一行 MBTI 气质提示' }
  }
  if (/人生账本|可变人生/.test(head)) {
    return { mergeKey: 'life_ledger', label: '人生账本', detail: '可变人生事实块' }
  }
  if (/私藏侧写|观察笔记/.test(head)) {
    return { mergeKey: 'deep_cognition', label: '私藏侧写', detail: 'char 对 user 的稳定认知' }
  }
  if (/世界背景/.test(head)) {
    return { mergeKey: 'world_bg', label: '世界背景', detail: '场景世界观' }
  }
  if (/尾声延展|判断标记/.test(full) && (startsWithTitle(trimmed, /^【/) || /尾声延展/.test(head))) {
    return { mergeKey: 'wb_after', label: '尾声延展协议/快照', detail: '尾声补丁输出规则或已注入快照' }
  }

  if (/【玩家身份|玩家身份卡|身份卡】/.test(head) || startsWithTitle(trimmed, /^【玩家|^【会话身份/)) {
    return { mergeKey: 'player', label: '玩家身份', detail: '当前发言人身份卡' }
  }
  if (/日程|课表|作息/.test(head) && trimmed.length < 4000) {
    return { mergeKey: 'schedule', label: '日程', detail: '角色/玩家日程表' }
  }
  if (/会话对方|技术席位说明/.test(head) && trimmed.length < 3000) {
    return { mergeKey: 'peer', label: '会话对方说明', detail: 'user/assistant 席位与称呼' }
  }

  if (/板块·近端·线下|线下剧情原文|线下剧情参考/.test(full)) {
    return { mergeKey: 'ctx_offline', label: '近端上下文 · 线下', detail: '未总结/近端线下剧情' }
  }
  if (/板块·未总结·线上|未总结.*私聊|线上私聊原文/.test(full)) {
    return { mergeKey: 'ctx_online', label: '近端上下文 · 线上', detail: '尚未总结的私聊原文' }
  }
  if (/最近.*轮|近端·固定线上/.test(full) && /私聊|原文|参考/.test(full)) {
    return { mergeKey: 'recent_rounds', label: '最近轮次参考', detail: '最近 N 轮对话参考' }
  }
  if (/板块·线上长期记忆|长期记忆/.test(full) && /向量|关键词|召回/.test(full)) {
    return { mergeKey: 'ltm', label: '长期记忆', detail: '向量/关键词召回条目' }
  }
  if (/剧情时间轴/.test(full)) {
    return { mergeKey: 'timeline', label: '剧情时间轴', detail: '故事内「现在」与召回' }
  }
  if (/人脉|NPC网|关系网/.test(head)) {
    return { mergeKey: 'network', label: '人脉关系', detail: '人脉圈关系注入' }
  }

  if (/线上回复输出协议|换行分条|禁 JSON|禁 Markdown/.test(full)) {
    return { mergeKey: 'format', label: '输出格式协议', detail: '固定格式硬钉（不可被文心替换）' }
  }
  if (/朋友圈|改资料|在场碎语|置顶|Profile_Update|Moment_Publish/i.test(full)) {
    return { mergeKey: 'self_service', label: '角色自助协议', detail: '改资料/发朋友圈等输出协议' }
  }
  if (/撤回/.test(head) && trimmed.length < 2000) {
    return { mergeKey: 'recall', label: '撤回指南', detail: '消息撤回相关说明' }
  }
  if (/发图|生图|配图/.test(full) && /协议|指令|风格/.test(full)) {
    return { mergeKey: 'image_gen', label: '发图/生图协议', detail: '角色发图相关指令' }
  }
  if (/媒体发送|语音.*概率|表情包.*概率|触发概率/.test(full)) {
    return { mergeKey: 'media_freq', label: '媒体发送频率', detail: '语音/表情等触发概率' }
  }
  if (/弹幕/.test(head)) {
    return { mergeKey: 'danmaku', label: '弹幕协议', detail: '弹幕模式输出规则' }
  }
  if (/思维链|<\/?thinking>|场记/.test(full) && /步骤|推演|CoT/i.test(full)) {
    return { mergeKey: 'cot', label: '思维链协议', detail: '本轮若开启思维链时的步骤说明' }
  }
  if (/语言|翻译|内心OS|心语|Heart_Whisper|Inner.?OS/i.test(full) && /附录|协议|同步/.test(full)) {
    return { mergeKey: 'lang_sync', label: '语言/心语/内心OS 附录', detail: '仅对应开关开启时才会出现' }
  }

  const bracket = head.match(/【([^】\n]{1,40})】/)
  const hint = bracket?.[1]?.trim()
  return {
    mergeKey: 'misc_protocol',
    label: '其它协议碎片',
    detail: hint
      ? `未能归入主类的协议段（含「${hint}」等），已合并计 token`
      : '未能归入主类的协议/说明碎片，已合并计 token',
  }
}

/**
 * 将当轮真实 system 拆段后按来源合并，给出可读板块名。
 */
export function splitSystemPromptIntoNamedSections(
  systemText: string,
  opts?: SplitSystemPromptOptions,
): SplitPromptSection[] {
  const text = String(systemText ?? '').trim()
  if (!text) return []

  const chunks = splitPromptChunks(text)

  const merged = new Map<string, { label: string; detail: string; rawTokens: number; parts: number }>()
  for (const chunk of chunks) {
    const rawTokens = estimateTextTokens(chunk)
    if (rawTokens <= 0) continue
    const cls = classifyPromptChunk(chunk, opts)
    const prev = merged.get(cls.mergeKey)
    if (prev) {
      prev.rawTokens += rawTokens
      prev.parts += 1
      if (cls.detail.length > prev.detail.length) prev.detail = cls.detail
    } else {
      merged.set(cls.mergeKey, {
        label: cls.label,
        detail: cls.detail,
        rawTokens,
        parts: 1,
      })
    }
  }

  // 若启用了文心却完全没命中：用预设正文补一条，避免「消失」
  const userText = String(opts?.userRoleplayText ?? '').trim()
  const presetName = String(opts?.userRoleplayPresetName ?? '').trim() || '未命名'
  if (userText && !merged.has('roleplay_user')) {
    const t = estimateTextTokens(userText)
    if (t > 0) {
      merged.set('roleplay_user', {
        label: `扮演主壳 · 文心「${presetName}」`,
        detail:
          '按文心预设正文粗估（注入后占位符已展开，未能在 system 碎片中精确对齐时的兜底显示）',
        rawTokens: t,
        parts: 1,
      })
    }
  }

  const out: SplitPromptSection[] = []
  for (const [key, v] of merged) {
    const detail = v.parts > 1 ? `${v.detail}（合并 ${v.parts} 段）` : v.detail
    out.push({
      id: slugId(key),
      label: v.label,
      detail,
      rawTokens: v.rawTokens,
    })
  }
  return out
}
