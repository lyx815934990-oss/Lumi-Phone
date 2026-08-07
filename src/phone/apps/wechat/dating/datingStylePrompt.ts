import type { NarrativeGenOptions } from './types'

const DEFAULT_STYLE_PROMPT = [
  '现实事实白描（最高优先级文风）：像记流水账一样写可见动作与对白，短句推进，一事一句。',
  '默认参考作者：汪曾祺（只学平实、节制、贴地；不照搬原句，不写成散文诗）。',
  '严禁：景物开场长铺、文学腔比喻、情绪标签排比、网文/八股抒情、抽象升华、油腻霸总土味。',
  '环境至多一句且须立刻服务动作；禁连续景物/光线/柏油路/楼道氛围堆叠；禁「心口因为某种……而跳得急」这类空感受句。',
].join(' ')

const DEFAULT_REFERENCE_SNIPPET = [
  '他把塑料袋放到桌角，抬眼看我一秒，说：「先吃，面要坨了。」',
  '门口风有点硬，她把外套往上拽了拽，手机在掌心里震了一下。',
  '电梯到七层停住，谁也没先出去。她侧过脸，问：「你刚才那句，算认真吗？」',
  '雨没大，只是路滑。她走得慢一点，我就跟着慢一点。',
  '他拧开矿泉水递过来，语气很平：「别急，先把话说清楚。」',
].join('\n')

/**
 * AI Prompt：文风调教（注入到约会续写的 **system** 末尾，与 `lumiThinkingChainRules` 导出的 DATING_STYLE_SYSTEM_PROMPT 拼接）。
 *
 * 当用户在「文风设定」中填写 stylePrompt / referenceSnippet 并在点击「发送」时通过
 * `NarrativeGenOptions` 传入 `generateDatingAi`，此处生成以下结构（与产品文档一致）：
 *
 * 【写作风格约束】
 * 必须严格遵循以下文风：${stylePrompt}
 *
 * 【参考笔触学习】
 * 请深入分析并精准模仿以下片段的行文节奏、用词习惯与句式结构（白描：动作/对白优先，少形容词）。
 * 你的回复必须让人觉得是出自同一作者之手：
 * """${referenceSnippet}"""
 */
export function buildDatingStyleSystemAppend(gen?: NarrativeGenOptions): string {
  const userStylePrompt = gen?.stylePrompt?.trim()
  const userReferenceSnippet = gen?.referenceSnippet?.trim()
  const hasUserCustomStyle = Boolean(userStylePrompt || userReferenceSnippet)
  const stylePrompt = userStylePrompt || DEFAULT_STYLE_PROMPT
  const referenceSnippet = userReferenceSnippet || DEFAULT_REFERENCE_SNIPPET

  const parts: string[] = []
  parts.push(
    hasUserCustomStyle
      ? '【文风参考源｜最高优先级】本轮用户自定义文风与参考片段：正文句法/密度/用词须以其为准；不得退回网文散文腔或景物长铺。'
      : '【文风参考源｜最高优先级】未配用户自定义文风：默认「汪曾祺式现实白描」为硬底线。正文必须读起来像下方短句示例，禁止散文诗开场、禁止连续环境描写。',
  )
  parts.push(
    `【写作风格约束｜硬约束】\n请严格遵循以下文风（与格式铁律同级；违反即整段作废重写）：${stylePrompt}`,
  )
  parts.push(
    `【参考笔触学习｜硬约束】\n必须模仿以下文本的笔触与行文节奏（短句、动作/对白优先、少形容词）；句式密度、标点节奏与用词习惯须一致。禁止写成「十月深夜路灯……」「光线在潮湿的柏油路面上拉得细长」一类景物散文。\n"""${referenceSnippet}"""`,
  )
  parts.push(
    [
      '【白描 vs 八股｜对照自检】',
      '✗ 八股：景物开场→氛围堆叠→抽象心境→再进门；长句修饰、比喻、情绪标签。',
      '✓ 白描：先动作或对白；环境最多一句且立刻影响下一步；心理用短 OS / 可见神态，不写散文抒情。',
    ].join('\n'),
  )
  return `\n\n${parts.join('\n\n')}`
}
