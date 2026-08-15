import type { Gender } from '../newFriendsPersona/types'

/**
 * 模型常违例输出第一人称「我」；入库前统一改为 {{user}}，便于分线绑定与注入展开。
 * 保留「我们」；不改动 {{…}} 块内文本。
 */
export function convertPlayerFirstPersonToUserPlaceholder(content: string): string {
  let s = String(content ?? '')
  if (!s.includes('我')) return s
  s = s.replace(/我的/g, '\u0000MEM_USER_DE\u0000')
  s = s.replace(/我们/g, '\u0000MEM_WMEN\u0000')
  s = s.replace(/我/g, '{{user}}')
  s = s.replace(/\u0000MEM_WMEN\u0000/g, '我们')
  s = s.replace(/\u0000MEM_USER_DE\u0000/g, '{{user}}')
  return s
}

/** 写入总结 user 附录：约束指 {{char}} 时的他/她，减少司予(男)被写成「她」。 */
export function buildMemorySummaryCharGenderDirective(gender: Gender | null | undefined): string {
  if (gender === 'male') {
    return (
      '【{{char}} 档案性别】男。凡叙述 {{char}} 的行为/感受/回应，第三人称只用「他」，**禁止**用「她」指 {{char}}。' +
      '若写到第三者（如社长、{{archive_char}}、{{id:…}}），须用占位符或「对方/那人」指清是谁，**禁止**用孤立的「她/他」让读者误以为在指 {{char}}。'
    )
  }
  if (gender === 'female') {
    return (
      '【{{char}} 档案性别】女。凡叙述 {{char}} 的行为/感受/回应，第三人称只用「她」，**禁止**用「他」指 {{char}}。' +
      '写到第三者时须用占位符指清对象，勿用含糊的「她/他」混淆 {{char}}。'
    )
  }
  return (
    '【{{char}} 档案性别】未标明。指 {{char}} 时优先重复 {{char}} 或写「对方」，避免写死他/她；' +
    '确需第三人称且材料有明确性别证据时才用他/她，并确保不是指错人。'
  )
}

/** 线下摘要 / 时间轴：把 {{char}}/{{user}} 与档案显示名钉死，减少主客体写反。 */
export function buildMemorySummaryIdentityRosterBlock(params: {
  charDisplayName?: string | null
  userDisplayName?: string | null
}): string {
  const charName = String(params.charDisplayName ?? '').trim() || '（对方角色）'
  const userName = String(params.userDisplayName ?? '').trim() || '（玩家）'
  return (
    `【身份对照表·必读】\n` +
    `- {{char}} = ${charName}（对方角色 / 本条线下摘要挂载对象；不是玩家）\n` +
    `- {{user}} = ${userName}（玩家；不是对方角色）\n` +
    `- 材料里的「你」通常指 {{user}}；材料里对方角色本人 = {{char}}。\n` +
    `- 摔倒/受伤/伤口/疼痛等身体遭遇：按材料主语挂到正确占位符，禁止把 {{char}} 的伤写成 {{user}} 的伤。`
  )
}

export function normalizeMemorySummaryBodyAfterModel(content: string): string {
  return convertPlayerFirstPersonToUserPlaceholder(String(content ?? '').trim())
}
