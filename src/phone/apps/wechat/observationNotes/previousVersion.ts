import type { ObservationNotesDoc } from './types'
import { formatObservationNotesPromptBlock } from './promptBlock'

/** 旧版示意 mock（sampleNotes）特征，打开时丢弃重开空白档 */
export function looksLikeLegacySampleObservationNotes(doc: ObservationNotesDoc): boolean {
  const blob = [
    doc.remarkNickname,
    doc.preferredAddress,
    doc.overallEvaluation,
    ...doc.strengths,
    ...doc.weaknesses,
  ].join('\n')
  return (
    blob.includes('小狗狗') ||
    blob.includes('阿晚') ||
    blob.includes('我想继续把你记清楚') ||
    blob.includes('再来一串') ||
    blob.includes('被轻轻点名') ||
    blob.includes('我暂时只记下你愿意给我的那个称呼')
  )
}

/** 从最近一次变更史抽出「上一版」字段对照，供续写防偏 */
export function formatObservationNotesPreviousVersionBlock(doc: ObservationNotesDoc): string {
  const ev = doc.changeHistory[0]
  if (!ev?.diffs?.length) {
    return [
      '【上一版侧写对照】',
      '尚无历史版本。若字段仍是「尚不清楚」且已有档案/剧情证据，本次应落笔补齐（尤其是 basic.name），勿空交无变化。',
    ].join('\n')
  }

  const lines: string[] = [
    '【上一版侧写对照（更新前旧值｜防无故漂移；用户纠正时须覆盖）】',
    `最近一次整理：${ev.summary || '内容有更新'}`,
    `时间：${new Date(ev.at).toISOString()}`,
    '',
    '下列为该次整理前的旧值，以及当时改成的新值。你下一次改写时：',
    '- 无用户新反应时：已确认事实可保持，避免无故漂移；',
    '- **用户本轮反应/自述与旧值冲突时：以用户当前反应覆盖**（食物、称呼、雷点、以及亲密/XP/敏感处/亲密方式等性向身体亲密字段一律如此）；',
    '- 口吻、亲密度与关系阶段须连续渐变，禁止跳变或整段换人设；',
    '- 侧写是活的认知笔记，不是永久判决。',
    '',
  ]

  for (const d of ev.diffs.slice(0, 28)) {
    const label = d.label.trim() || d.path
    lines.push(`· ${label}（${d.path}）`)
    lines.push(`  旧值：${(d.previousText || '（空）').slice(0, 360)}`)
    lines.push(`  当时新值：${(d.currentText || '（空）').slice(0, 360)}`)
  }
  return lines.join('\n').trim()
}

export type ObservationNotesEvidenceMode = 'chat_recall' | 'recent_rounds'

/** 手动整份重填：把即将被替换的当前侧写全文标成原稿对照（只防口吻离谱，不保底旧事实） */
export function formatObservationNotesManuscriptReferenceBlock(
  doc: ObservationNotesDoc,
  opts?: { evidenceMode?: ObservationNotesEvidenceMode },
): string {
  const recentOnly = opts?.evidenceMode === 'recent_rounds'
  const evidenceHint = recentOnly
    ? '用户话、身份卡、线上/线下近端固定轮次、当前侧写原稿与上一版对照'
    : '用户话、身份卡、近期剧情、本轮向量/关键词召回'
  const body = formatObservationNotesPromptBlock(doc)
    .replace(/^【私藏侧写[^\n]*】\n?/, '')
    .replace(/\n【侧写定位[\s\S]*$/, '')
    .trim()
  return [
    '【即将被整份替换的当前侧写原稿｜第一人称口吻母本 + 事实重判】',
    '下面是**此刻即将被覆盖**的全文（即最新一版侧写）。整份重填时：',
    '- **口吻母本（硬）**：原稿是「我（角色）对 {{user}}」的第一人称私藏笔记。称呼/关系/评价/备注/优缺点/人格注·能力注须延续**同等亲密浓度与人设口癖**；禁止压成中性标签（反例：关系→「热恋」、称呼→单名单称、评价→百科简介）。',
    '- 近端无关系降温、用户也未纠正时：**禁止**把原稿的亲昵/戏谑/占有表述「瘦身摘要」。',
    `- **客观事实栏**按本轮材料重判（${evidenceHint}）。学校/专业/职业以身份卡为准；食物/雷点/爱好等无近端依据可写不知道类。`,
    '- **亲密 / XP / 敏感处 / 亲密方式**：本轮材料完全没提身体亲密 → 写成不知道类，禁止照抄旧身体偏好。',
    '- 人格/能力分值可微调；人格注/能力注仍须第一人称主观句，禁止空话。',
    '',
    body || '（当前侧写几乎为空，可按材料从零填写，但仍须第一人称贴人设。）',
  ].join('\n')
}

/** 系统注入：当前全文 + 上一版对照 + 连续性铁律 + 可选已知线索 */
export function formatObservationNotesUpdateContextBlock(
  doc: ObservationNotesDoc,
  opts?: {
    knownUserFactsBlock?: string
    /** 手动整份重填：只认近端轮次，不提向量/长期记忆 */
    evidenceMode?: ObservationNotesEvidenceMode
  },
): string {
  const recentOnly = opts?.evidenceMode === 'recent_rounds'
  const recallRule = recentOnly
    ? '- **近端与原稿优先于「不知道」**：侧写写着尚不清楚/暂时不知道，但近端轮次或当前原稿/上一版已有该事实 → 接话与答卷以之为准覆盖；禁止装作不记得。本轮未注入的旧记忆不得凭空当已知。'
    : '- **本轮召回记忆优先于「不知道」**：侧写写着尚不清楚/暂时不知道，但本轮【向量召回】/【关键词命中】已有该事实 → 接话与答卷都以召回为准覆盖；禁止装作不记得。未注入本轮的旧记忆不得凭空当已知。'
  const noChangeRule = recentOnly
    ? '- 无实质新证据且字段已写过、且与本轮用户话/身份卡/近端不冲突 → 可「无变化」；「尚不清楚」+本轮已有证据（含近端或原稿）则必须更新。'
    : '- 无实质新证据且字段已写过、且与本轮用户话/身份卡/召回不冲突 → 可「无变化」；「尚不清楚」+本轮已有证据（含召回）则必须更新。'

  return [
    formatObservationNotesPromptBlock(doc),
    '',
    opts?.knownUserFactsBlock?.trim() || '',
    '',
    formatObservationNotesPreviousVersionBlock(doc),
    '',
    '【侧写连续性铁律】',
    '- 侧写是「我对 {{user}} 的当前理解」，默认会变；不是永久标签。',
    '- 以「当前侧写」为默认接话参考；一旦与 **用户本轮反应/自述** 对不上，**一切以用户当前反应为准**（含食物、称呼、雷点、爱好，以及亲密/XP/敏感处/亲密方式等**性向身体亲密**字段；禁止把亲密写成感情节奏空话）。',
    '- **玩家身份卡修订优先**：学校/专业/职业等客观背景以系统注入的「已知档案线索 / 身份卡」为准；旧侧写或旧聊天写的普通大学等若与当前身份卡冲突，必须覆盖改写，禁止「无变化」。',
    recallRule,
    '- 冲突时：① 可见回复里用活人语气承认旧印象并更新认知（「我以为…我记住了」类，按你人设改写，勿公文）；② 答卷必须覆盖对应字段，禁止「无变化」。',
    noChangeRule,
    '- 「线上备注」须跟「好感」「关系」同步：默认贴合人设；深爱可反差更腻（宝宝/宝贝等可）；**禁止XX狗/XX猫等动物系宠称**；阶段仍浅则保持克制。',
    '- 禁止用过时侧写质疑、抬杠或强迫对方承认旧偏好；禁止为了「看起来更新了」而改无关字段。',
    '- 全文须保持你本人的人设口吻与当前亲密浓度，禁止中立档案腔、百科短标签、把关系栏压成「热恋/暧昧」单字。',
  ]
    .filter((x) => x !== '')
    .join('\n')
}
