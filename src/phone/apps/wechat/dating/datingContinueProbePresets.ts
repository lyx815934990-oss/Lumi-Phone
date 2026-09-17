/**
 * 线下剧情「续写方向」：
 * 大分类 → 小分类 →（具体选项 | 模型自行发挥）
 * 选「自行发挥」只按小分类气质注入，场面由模型自定；选具体选项则给更明确的指导。
 *
 * 主轴（导演常用）：换场景 / 氛围 / 情绪表现 / 转折 / 镜头 / 人物状态
 * 辅轴（关系与身体）：关系拉扯 / 暧昧肢体 / NSFW / 生活细节
 */

import {
  resolveTimeAdvanceSpan,
  type ContinueDraftTimeAdvance,
  type ContinueDraftTimeAdvanceCustom,
} from './datingDirectorContinueDraftAi'

export type ContinueProbeCategoryId =
  | 'scene'
  | 'atmosphere'
  | 'expression'
  | 'twist'
  | 'camera'
  | 'status'
  | 'relation'
  | 'intimate'
  | 'nsfw_foreplay'
  | 'nsfw_act'
  | 'nsfw_after'
  | 'daily'
  /** @deprecated 兼容旧自定义 chip，展示时归入转折 */
  | 'event'
  /** @deprecated 兼容旧自定义 chip，展示时归入情绪表现 */
  | 'mood'

export type ContinueProbeSubDef = {
  id: string
  category: ContinueProbeCategoryId
  /** 小分类名（如「开心」「误会」） */
  label: string
  /** 选「模型自行发挥」时注入：只定方向，不锁死场面 */
  freeProbe: string
}

export type ContinueProbePreset = {
  id: string
  category: ContinueProbeCategoryId
  /** 所属小分类；自定义方向可缺省 */
  subId?: string
  /** chip 主标题 */
  label: string
  hint: string
  probe: string
  /** 是否为「模型自行发挥」 */
  freeform?: boolean
}

export const DATING_CONTINUE_PROBE_CATEGORIES: ReadonlyArray<{
  id: ContinueProbeCategoryId
  label: string
  shortLabel?: string
}> = [
  { id: 'scene', label: '换场景' },
  { id: 'atmosphere', label: '氛围' },
  { id: 'expression', label: '情绪表现方式' },
  { id: 'twist', label: '转折' },
  { id: 'camera', label: '镜头' },
  { id: 'status', label: '人物状态' },
  { id: 'relation', label: '关系拉扯' },
  { id: 'intimate', label: '暧昧肢体' },
  { id: 'nsfw_foreplay', label: 'NSFW·前戏', shortLabel: '前戏' },
  { id: 'nsfw_act', label: 'NSFW·过程', shortLabel: '过程' },
  { id: 'nsfw_after', label: 'NSFW·事后', shortLabel: '事后' },
  { id: 'daily', label: '生活细节' },
]

export type ContinueProbeSectionDef =
  | {
      id: string
      label: string
      kind: 'flat'
      category: ContinueProbeCategoryId
    }
  | {
      id: 'nsfw'
      label: string
      kind: 'tabs'
      tabs: ReadonlyArray<{ category: ContinueProbeCategoryId; label: string }>
    }

export const DATING_CONTINUE_PROBE_SECTIONS: readonly ContinueProbeSectionDef[] = [
  { id: 'scene', label: '换场景', kind: 'flat', category: 'scene' },
  { id: 'atmosphere', label: '氛围', kind: 'flat', category: 'atmosphere' },
  { id: 'expression', label: '情绪表现方式', kind: 'flat', category: 'expression' },
  { id: 'twist', label: '转折', kind: 'flat', category: 'twist' },
  { id: 'camera', label: '镜头', kind: 'flat', category: 'camera' },
  { id: 'status', label: '人物状态', kind: 'flat', category: 'status' },
  { id: 'relation', label: '关系拉扯', kind: 'flat', category: 'relation' },
  { id: 'intimate', label: '暧昧肢体', kind: 'flat', category: 'intimate' },
  {
    id: 'nsfw',
    label: 'NSFW',
    kind: 'tabs',
    tabs: [
      { category: 'nsfw_foreplay', label: '前戏' },
      { category: 'nsfw_act', label: '过程' },
      { category: 'nsfw_after', label: '事后' },
    ],
  },
  { id: 'daily', label: '生活细节', kind: 'flat', category: 'daily' },
]

/** 把旧分类 id 归并到现行分类（自定义 chip / 随机抽取用） */
export function normalizeContinueProbeCategoryId(
  raw: string | null | undefined,
): ContinueProbeCategoryId | undefined {
  const cat = String(raw ?? '').trim()
  switch (cat) {
    case 'scene':
    case 'atmosphere':
    case 'expression':
    case 'twist':
    case 'camera':
    case 'status':
    case 'relation':
    case 'intimate':
    case 'nsfw_foreplay':
    case 'nsfw_act':
    case 'nsfw_after':
    case 'daily':
      return cat
    case 'event':
      return 'twist'
    case 'mood':
      return 'expression'
    case 'nsfw':
      return 'nsfw_foreplay'
    default:
      return undefined
  }
}

/** 小分类（大分类下的第二层） */
export const DATING_CONTINUE_PROBE_SUBS: readonly ContinueProbeSubDef[] = [
  // —— 换场景 ——
  {
    id: 'scene-vibe',
    category: 'scene',
    label: '空间气质',
    freeProbe:
      '本轮按「换场景·空间气质」自行发挥：可切到更密闭/更热闹/群像/更安静的空间。写出距离、声音与能不能说私事的变化，禁止只报地名。',
  },
  {
    id: 'scene-transit',
    category: 'scene',
    label: '移动换场',
    freeProbe:
      '本轮按「移动换场」自行发挥：到下一处、进门或路上走一段皆可。间隔须有可感知变化，禁止只写「到了晚上」。',
  },

  // —— 氛围 ——
  {
    id: 'atm-main',
    category: 'atmosphere',
    label: '整体氛围',
    freeProbe:
      '本轮定一种整体氛围（开心/甜蜜/酸涩/紧张/愤怒/严肃/暗流/暧昧/怀旧等），落到具体互动与对白，禁止纯形容词堆叠。',
  },

  // —— 情绪表现方式 ——
  {
    id: 'expr-main',
    category: 'expression',
    label: '怎么表现',
    freeProbe:
      '本轮定一种情绪表现方式（克制/直球/少说多做/撒娇/冷静/嘴硬心软/隐忍试探等）。写出可被对方察觉的语气与动作，禁止只旁白贴标签。',
  },

  // —— 转折 ——
  {
    id: 'twist-main',
    category: 'twist',
    label: '情节转折',
    freeProbe:
      '本轮安排一次可感知的转折（打断、反转、第三方、信息差、和解、闪回、危机、信物、误会加深等）。写出当场反应与能不能回到原话题，禁止无因翻脸。',
  },

  // —— 镜头 ——
  {
    id: 'camera-main',
    category: 'camera',
    label: '叙事镜头',
    freeProbe:
      '本轮按指定镜头感写：慢镜头细节、快切推进、多视角（可含其他 NPC/平行事件同步写进主文）、或蒙太奇穿插。禁止空喊镜头术语而不写场面。',
  },

  // —— 人物状态 ——
  {
    id: 'status-main',
    category: 'status',
    label: '身心状态',
    freeProbe:
      '本轮让关键人物处在一种身心状态（醉酒、疲惫、应激、放空、生病等）。状态须影响对白与动作节奏，禁止只贴标签。',
  },

  // —— 关系拉扯 ——
  {
    id: 'relation-misread',
    category: 'relation',
    label: '误会',
    freeProbe:
      '本轮按「误会」方向自行发挥：理解偏差、动机猜错或玩笑当真皆可。写出当场反应与有没有解释清楚，禁止无因翻脸。',
  },
  {
    id: 'relation-probe',
    category: 'relation',
    label: '试探',
    freeProbe:
      '本轮按「试探」方向自行发挥：半真半假发问、旁敲侧击或逼对方表态皆可。写出停顿与对方怎么接。',
  },
  {
    id: 'relation-jealous',
    category: 'relation',
    label: '吃醋',
    freeProbe:
      '本轮按「吃醋」方向自行发挥：酸意、比较、前任影子皆可。写出装没事或说漏嘴，须有可见诱因。',
  },
  {
    id: 'relation-mend',
    category: 'relation',
    label: '和解',
    freeProbe:
      '本轮按「和解」方向自行发挥：谁先低头、递台阶或破冰皆可。写出对方是接受还是还在赌气。',
  },
  {
    id: 'relation-distance',
    category: 'relation',
    label: '疏远',
    freeProbe:
      '本轮按「疏远」方向自行发挥：拉开距离、称呼变冷或话变少皆可。须有可见理由，禁止无动因翻脸。',
  },

  // —— 暧昧肢体 ——
  {
    id: 'intimate-near',
    category: 'intimate',
    label: '靠近',
    freeProbe:
      '本轮按「靠近」方向自行发挥：缩短距离、肩碰肩或凑近说话皆可。写出呼吸、视线与手部小动作。',
  },
  {
    id: 'intimate-touch',
    category: 'intimate',
    label: '触碰',
    freeProbe:
      '本轮按「触碰」方向自行发挥：手指碰到、牵手或整理衣领皆可。写出偶然还是故意、对方第一反应。',
  },
  {
    id: 'intimate-almost',
    category: 'intimate',
    label: '吻前',
    freeProbe:
      '本轮按「吻前一刻」方向自行发挥：脸很近、停住或退开皆可。写出谁犹豫、有没有吻下去。',
  },
  {
    id: 'intimate-subtext',
    category: 'intimate',
    label: '暗示',
    freeProbe:
      '本轮按「话里有话」方向自行发挥：表面聊别的、其实在试探靠近皆可。写出听的人懂不懂。',
  },

  // —— NSFW 前戏 ——
  {
    id: 'nsfw-fp-heat',
    category: 'nsfw_foreplay',
    label: '升温',
    freeProbe:
      '本轮按「前戏升温」自行发挥：越线触碰、深吻或衣物开始乱皆可。写出谁先越线、对方迎还是停，禁止跳过过程。',
  },
  {
    id: 'nsfw-fp-tease',
    category: 'nsfw_foreplay',
    label: '挑逗',
    freeProbe:
      '本轮按「挑逗」自行发挥：故意吊着、隔衣磨蹭或咬吻皆可。写出对方急与忍、谁先破功。',
  },
  {
    id: 'nsfw-fp-oral',
    category: 'nsfw_foreplay',
    label: '口',
    freeProbe:
      '本轮按「口」自行发挥：用嘴开始亲密服务的一拍。写出姿势与反应，停在可续节点。',
  },

  // —— NSFW 过程 ——
  {
    id: 'nsfw-act-core',
    category: 'nsfw_act',
    label: '结合',
    freeProbe:
      '本轮按「结合过程」自行发挥：进入、适应或节奏变化皆可。写出具体动作与对白，禁止一笔带过。',
  },
  {
    id: 'nsfw-act-talk',
    category: 'nsfw_act',
    label: '荤话',
    freeProbe:
      '本轮按「荤话/指令」自行发挥：边做边说短而真的露骨话。写出对方羞、回嘴还是更兴奋。',
  },
  {
    id: 'nsfw-act-power',
    category: 'nsfw_act',
    label: '主导',
    freeProbe:
      '本轮按「主导关系」自行发挥：按住、换姿或命令皆可。须有同意感，禁止无同意强迫。',
  },
  {
    id: 'nsfw-act-edge',
    category: 'nsfw_act',
    label: '险境',
    freeProbe:
      '本轮按「险境」自行发挥：可能被听见/看见时继续。写出压抑声音与是否停手，禁止无脑暴露。',
  },

  // —— NSFW 事后 ——
  {
    id: 'nsfw-af-soft',
    category: 'nsfw_after',
    label: '余韵',
    freeProbe:
      '本轮按「事后余韵」自行发挥：抱着缓、枕边话或发现痕迹皆可。写出亲昵或忽然的尴尬。',
  },
  {
    id: 'nsfw-af-clean',
    category: 'nsfw_after',
    label: '收拾',
    freeProbe:
      '本轮按「事后收拾」自行发挥：清理、穿回或一起冲澡皆可。写出谁动手、气氛是温还是正经。',
  },

  // —— 生活细节 ——
  {
    id: 'daily-meal',
    category: 'daily',
    label: '吃喝',
    freeProbe:
      '本轮按「吃喝」自行发挥：点菜、分食、买单或喂一口皆可。写出小细节里的在意或疏忽。',
  },
  {
    id: 'daily-walk',
    category: 'daily',
    label: '同行',
    freeProbe:
      '本轮按「同行」自行发挥：并肩走、共伞或夜深道别皆可。写出步调与小体贴。',
  },
  {
    id: 'daily-care',
    category: 'daily',
    label: '体贴',
    freeProbe:
      '本轮按「体贴」自行发挥：披外套、递热饮、小礼物或记得口味皆可。用行为写，少空话。',
  },
  {
    id: 'daily-play',
    category: 'daily',
    label: '玩闹',
    freeProbe:
      '本轮按「玩闹」自行发挥：合影、游戏惩罚、遇猫狗或试衣皆可。写出笑点与关系推进。',
  },
]

/** 具体选项（第三层）；比自行发挥更明确，但不过度锁死道具细节 */
const SPECIFIC_RAW: ReadonlyArray<Omit<ContinueProbePreset, 'freeform'>> = [
  // —— 换场景 · 空间气质 ——
  {
    id: 'scene-vibe-closed',
    category: 'scene',
    subId: 'scene-vibe',
    label: '密闭场景',
    hint: '狭小/封闭',
    probe:
      '本轮切入或强化密闭场景（车内、电梯、小房间、角落等）：距离近、声音闷、私事更容易被听见。写出视线、呼吸与不经意触碰，禁止只报地点名。',
  },
  {
    id: 'scene-vibe-lively',
    category: 'scene',
    subId: 'scene-vibe',
    label: '热闹场景',
    hint: '嘈杂人流',
    probe:
      '本轮切入热闹场景（商场、夜市、聚会厅等）：人声、走动、要压低说话或找空档。写出环境如何打断或掩护对话，禁止背景板式描写。',
  },
  {
    id: 'scene-vibe-ensemble',
    category: 'scene',
    subId: 'scene-vibe',
    label: '群像场景',
    hint: '多人同场',
    probe:
      '本轮切入群像场景：至少再写清 1～2 名他人在场的反应或插话。主线仍绕两人关系推进，禁止路人抢戏成主角。',
  },
  {
    id: 'scene-vibe-quiet',
    category: 'scene',
    subId: 'scene-vibe',
    label: '安静场景',
    hint: '低声可说',
    probe:
      '本轮切入安静场景（深夜街、空教室、静店等）：允许长停顿与小声对白。用环境安静反衬情绪，禁止硬塞人潮。',
  },
  // 换场景 · 移动
  {
    id: 'scene-transit-next',
    category: 'scene',
    subId: 'scene-transit',
    label: '换到下一处',
    hint: '路上也有戏',
    probe: '接着写：自然换到下一处。间隔里须有可感知变化（天气、步调、一句路上话）。',
  },
  {
    id: 'scene-transit-private',
    category: 'scene',
    subId: 'scene-transit',
    label: '进到私密处',
    hint: '关上门',
    probe: '接着写：进到一方空间并关上门。写出门口第一句怎么开口、气氛怎么变。',
  },

  // —— 氛围 ——
  {
    id: 'atm-happy-funny',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '开心搞笑',
    hint: '出糗或吐槽',
    probe: '本轮偏开心搞笑：允许出糗、吐槽、反差，须推进关系或事件；禁止恶意羞辱与纯段子堆砌。',
  },
  {
    id: 'atm-sweet-heart',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '甜蜜心动',
    hint: '心里发软',
    probe: '本轮偏甜蜜心动：近距离小互动或嘴硬心软皆可，甜须落到具体一拍；禁止油腻霸总与每句「宝宝」。',
  },
  {
    id: 'atm-bitter-sad',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '酸涩难过',
    hint: '克制',
    probe: '本轮偏酸涩难过：用停顿、小动作与语气发闷，禁止无铺垫嚎哭和鸡汤升华。',
  },
  {
    id: 'atm-tense',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '紧张',
    hint: '弦绷着',
    probe: '本轮偏紧张：时间、局势或信息差在催。心跳感来自局势，禁止无因惊悚跳杀。',
  },
  {
    id: 'atm-angry',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '生气愤怒',
    hint: '须有事由',
    probe: '本轮偏生气愤怒：须有具体事由，写出吵到哪一步、谁先收或更火；禁止无因翻脸。',
  },
  {
    id: 'atm-serious',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '认真严肃',
    hint: '谈正事',
    probe: '本轮偏认真严肃：对白短而清楚，少玩笑；写出双方是否愿意把话说开。',
  },
  {
    id: 'atm-undercurrent',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '暗流对峙',
    hint: '表面平静',
    probe: '本轮偏暗流对峙：表面仍可说话，底下较劲或防范。用潜台词与停顿写张力，禁止立刻开打。',
  },
  {
    id: 'atm-ambiguous',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '暧昧拉扯',
    hint: '未说破',
    probe: '本轮偏暧昧拉扯：靠近又退、试探又不点破。写出未说破的张力，禁止越级官宣。',
  },
  {
    id: 'atm-nostalgia',
    category: 'atmosphere',
    subId: 'atm-main',
    label: '怅然怀旧',
    hint: '旧事余温',
    probe: '本轮偏怅然怀旧：由眼前景勾起旧事或「以前」的对照。写出感慨与当下态度，禁止大段说明书式回忆。',
  },

  // —— 情绪表现方式 ——
  {
    id: 'expr-restrained',
    category: 'expression',
    subId: 'expr-main',
    label: '体面克制',
    hint: '不失控',
    probe: '本轮情绪表达偏体面克制：能忍则忍、话说一半。写出克制下的破绽（停顿、手部动作），禁止突然失态嚎啕。',
  },
  {
    id: 'expr-direct',
    category: 'expression',
    subId: 'expr-main',
    label: '热烈直球',
    hint: '说开',
    probe: '本轮情绪表达偏热烈直球：敢说想说的、态度清楚。仍须尊重对方选择，禁止强硬占位与病态占有。',
  },
  {
    id: 'expr-do-more',
    category: 'expression',
    subId: 'expr-main',
    label: '少说多做',
    hint: '行动派',
    probe: '本轮情绪表达偏少说多做：用具体行动传递态度，对白少而准。禁止大段自白替代行动。',
  },
  {
    id: 'expr-soft',
    category: 'expression',
    subId: 'expr-main',
    label: '撒娇示弱',
    hint: '看关系',
    probe: '本轮情绪表达可带撒娇/示弱：求一点回应或依赖。须贴合当前关系阶段，禁止无铺垫婴儿腔。',
  },
  {
    id: 'expr-rational',
    category: 'expression',
    subId: 'expr-main',
    label: '冷静理性',
    hint: '讲清楚',
    probe: '本轮情绪表达偏冷静理性：把事实与边界讲清楚，少升温修辞。写出对方是接住还是更急。',
  },
  {
    id: 'expr-tsundere',
    category: 'expression',
    subId: 'expr-main',
    label: '嘴硬心软',
    hint: '嫌弃里有在意',
    probe: '本轮情绪表达偏嘴硬心软：口头嫌弃或别扭，行动上仍照顾。甜/软须落到具体一拍，禁止全程硬损。',
  },
  {
    id: 'expr-probe',
    category: 'expression',
    subId: 'expr-main',
    label: '隐忍试探',
    hint: '旁敲侧击',
    probe: '本轮情绪表达偏隐忍试探：旁敲侧击、话留半句。写出对方懂不懂、有没有追问。',
  },

  // —— 转折 ——
  {
    id: 'twist-interrupt',
    category: 'twist',
    subId: 'twist-main',
    label: '被意外打断',
    hint: '话卡半截',
    probe: '接着写：正说到要紧处被意外打断（人/电话/突发）。写出还能不能回到刚才的话题。',
  },
  {
    id: 'twist-reverse',
    category: 'twist',
    subId: 'twist-main',
    label: '预期反转',
    hint: '以为A结果B',
    probe: '接着写：一次预期反转（以为要吵结果没吵 / 以为没事其实有事）。写出双方反应落差。',
  },
  {
    id: 'twist-third',
    category: 'twist',
    subId: 'twist-main',
    label: '第三方介入',
    hint: '熟人/外人',
    probe: '接着写：第三人介入（撞熟人、被围观、当众被问）。写出介绍与事后两人怎么对视。',
  },
  {
    id: 'twist-info',
    category: 'twist',
    subId: 'twist-main',
    label: '揭开信息差',
    hint: '秘密露边',
    probe: '接着写：一方已知、另一方不知的信息被揭开或差点揭开。写出掩饰、补救或摊牌。',
  },
  {
    id: 'twist-mend',
    category: 'twist',
    subId: 'twist-main',
    label: '和解破冰',
    hint: '谁先低头',
    probe: '接着写：谁先递台阶或破冰。写出对方是接受还是还在赌气。',
  },
  {
    id: 'twist-flashback',
    category: 'twist',
    subId: 'twist-main',
    label: '记忆闪回',
    hint: '短闪回',
    probe:
      '接着写：由眼前景触发一小段记忆闪回。闪回须短、服务当下态度；回到现在后写出情绪余波。禁止大段说明书回忆。',
  },
  {
    id: 'twist-crisis',
    category: 'twist',
    subId: 'twist-main',
    label: '突发危机',
    hint: '现实可解',
    probe: '接着写：突发小危机（走散、物品、安全/截止压力等）。保持现实可解释，写出谁先行动、是否牵手或争执。',
  },
  {
    id: 'twist-token',
    category: 'twist',
    subId: 'twist-main',
    label: '信物触发',
    hint: '旧物/信物',
    probe: '接着写：一件旧物、信物或礼物被看见/拿出，触发态度变化。写出双方第一句怎么说。',
  },
  {
    id: 'twist-misread-deep',
    category: 'twist',
    subId: 'twist-main',
    label: '误会加深',
    hint: '越描越黑',
    probe: '接着写：已有的误会因一句话或一个动作更深。写出有没有人想解释、解释成不成。',
  },

  // —— 镜头 ——
  {
    id: 'camera-slow',
    category: 'camera',
    subId: 'camera-main',
    label: '慢镜头拉长细节',
    hint: '放大一拍',
    probe:
      '本轮用「慢镜头」写法：把关键一拍（触碰、对视、停顿）拉长写细（呼吸、手、眼神），再落到可接续的对白或动作。禁止空喊慢镜头。',
  },
  {
    id: 'camera-fast',
    category: 'camera',
    subId: 'camera-main',
    label: '快切推进',
    hint: '短句推进',
    probe:
      '本轮用「快切」推进：短段落、短对白，快速跨过过渡拍，尽快落到下一可演节点。禁止拖沓寒暄。',
  },
  {
    id: 'camera-multi',
    category: 'camera',
    subId: 'camera-main',
    label: '多视角',
    hint: '含NPC/平行',
    probe:
      '本轮用多视角：主线仍写当前两人，同时把其他 NPC 视角或平行事件同步写进正文（可用短切换段），信息须服务主线张力；禁止平行抢成无关番外。',
  },
  {
    id: 'camera-montage',
    category: 'camera',
    subId: 'camera-main',
    label: '蒙太奇穿插',
    hint: '片段拼贴',
    probe:
      '本轮用蒙太奇：用 2～4 个短片段拼贴推进（不同时刻/地点的碎片），最后落回可演的当下。片段须有情绪递进，禁止无关联拼盘。',
  },

  // —— 人物状态 ——
  {
    id: 'status-drunk',
    category: 'status',
    subId: 'status-main',
    label: '醉酒失神',
    hint: '话易漏',
    probe:
      '本轮关键人物偏醉酒失神：动作慢半拍、话易漏、情绪放大。写出另一方怎么接；禁止写成完全无行为能力。',
  },
  {
    id: 'status-tired',
    category: 'status',
    subId: 'status-main',
    label: '疲惫倦怠',
    hint: '少话',
    probe: '本轮关键人物偏疲惫倦怠：话少、反应慢、想歇。写出关心是笨拙还是体贴，禁止鸡汤说教。',
  },
  {
    id: 'status-alert',
    category: 'status',
    subId: 'status-main',
    label: '应激紧绷',
    hint: '防御高',
    probe: '本轮关键人物偏应激紧绷：防备高、语速快或过冷。写出诱因与有没有被安抚到松一点。',
  },
  {
    id: 'status-loose',
    category: 'status',
    subId: 'status-main',
    label: '松弛放空',
    hint: '放松',
    probe: '本轮关键人物偏松弛放空：懒得争、发呆、随口接。写出这种松是否让对方更靠近或更着急。',
  },
  {
    id: 'status-sick',
    category: 'status',
    subId: 'status-main',
    label: '生病不适',
    hint: '照顾戏',
    probe: '本轮关键人物偏生病不适（发热、难受等）。写出照顾与边界，禁止用生病道德绑架亲密。',
  },

  // —— 关系拉扯（保留精简具体项） ——
  {
    id: 'relation-misread-words',
    category: 'relation',
    subId: 'relation-misread',
    label: '把话听拧',
    hint: '理解成另一层',
    probe: '接着写：一方把对方刚说的话理解成别的意思。写出愣住、急着解释或越描越黑。',
  },
  {
    id: 'relation-misread-joke',
    category: 'relation',
    subId: 'relation-misread',
    label: '玩笑当真',
    hint: '一句玩笑落地',
    probe: '接着写：一句玩笑被当真。写出说的人慌不慌、听的人脸色怎么变。',
  },
  {
    id: 'relation-probe-half',
    category: 'relation',
    subId: 'relation-probe',
    label: '半开玩笑问',
    hint: '说完盯着',
    probe: '接着写：一方用玩笑口吻抛出半认真的话。写出对方接话前的停顿与最后回什么。',
  },
  {
    id: 'relation-probe-ask',
    category: 'relation',
    subId: 'relation-probe',
    label: '逼着表态',
    hint: '你到底怎么想',
    probe: '接着写：一方直接问关系定位或态度。写出对方躲、答还是反问。',
  },
  {
    id: 'relation-jealous-acid',
    category: 'relation',
    subId: 'relation-jealous',
    label: '酸一下',
    hint: '装没事',
    probe: '接着写：出现让一方不自在的人/事/话。写出吃醋方装没事或嘴硬，有没有说漏。',
  },
  {
    id: 'relation-jealous-ex',
    category: 'relation',
    subId: 'relation-jealous',
    label: '前任影子',
    hint: '旧人被提起',
    probe: '接着写：对话里带出前任或暧昧对象。写出谁先提、另一方怎么接。',
  },
  {
    id: 'relation-mend-sorry',
    category: 'relation',
    subId: 'relation-mend',
    label: '先低头',
    hint: '道歉或认错',
    probe: '接着写：谁先开口道歉或认错。写出对方是接受还是还在赌气。',
  },
  {
    id: 'relation-distance-space',
    category: 'relation',
    subId: 'relation-distance',
    label: '拉开距离',
    hint: '身体或话变少',
    probe: '接着写：一方故意拉开距离。写出对方有没有察觉。',
  },

  // —— 暧昧肢体 ——
  {
    id: 'intimate-near-lean',
    category: 'intimate',
    subId: 'intimate-near',
    label: '身子靠过去',
    hint: '肩碰肩',
    probe: '接着写：谁更先缩短距离。写出靠近前后呼吸与视线变化。',
  },
  {
    id: 'intimate-near-ear',
    category: 'intimate',
    subId: 'intimate-near',
    label: '凑耳边说',
    hint: '只有两人听见',
    probe: '接着写：一方凑耳边说一句小声话。写出内容与对方反应。',
  },
  {
    id: 'intimate-touch-hand',
    category: 'intimate',
    subId: 'intimate-touch',
    label: '手指碰到',
    hint: '抽开或握住',
    probe: '接着写：一次明确的肢体接触。写出偶然还是故意、第一反应。',
  },
  {
    id: 'intimate-touch-fix',
    category: 'intimate',
    subId: 'intimate-touch',
    label: '帮整理',
    hint: '衣领或头发',
    probe: '接着写：一方帮对方整理仪容。写出被整理的人僵住还是配合。',
  },
  {
    id: 'intimate-almost-stop',
    category: 'intimate',
    subId: 'intimate-almost',
    label: '吻前停住',
    hint: '谁先退',
    probe: '接着写：吻前停住那一拍。写出谁犹豫、有没有吻下去。',
  },
  {
    id: 'intimate-subtext-chat',
    category: 'intimate',
    subId: 'intimate-subtext',
    label: '话里带刺带甜',
    hint: '表面聊别的',
    probe: '接着写：对白表面在聊别的，其实在暗示在意。写出听的人懂不懂。',
  },

  // —— NSFW（保留） ——
  {
    id: 'nsfw-fp-kiss',
    category: 'nsfw_foreplay',
    subId: 'nsfw-fp-heat',
    label: '深吻',
    hint: '吻到失控',
    probe: '接着写：一次带欲望的深吻。写出节奏、手落哪里、有没有继续往下。',
  },
  {
    id: 'nsfw-fp-undress',
    category: 'nsfw_foreplay',
    subId: 'nsfw-fp-heat',
    label: '解衣',
    hint: '衣服开始乱',
    probe: '接着写：衣物被解开或半褪。写出谁动手、对方眼神变化。',
  },
  {
    id: 'nsfw-fp-hold',
    category: 'nsfw_foreplay',
    subId: 'nsfw-fp-tease',
    label: '吊着不给',
    hint: '停在关头',
    probe: '接着写：一方故意挑逗到关头却停手。写出对方急与谁先破功。',
  },
  {
    id: 'nsfw-fp-mouth',
    category: 'nsfw_foreplay',
    subId: 'nsfw-fp-oral',
    label: '用嘴开始',
    hint: '姿势与节奏',
    probe: '接着写：一方用嘴开始亲密服务。写出姿势与被服务方反应。',
  },
  {
    id: 'nsfw-act-in',
    category: 'nsfw_act',
    subId: 'nsfw-act-core',
    label: '进入',
    hint: '结合当下',
    probe: '接着写：进入结合的过程。写出适应、表情与第一句对白。',
  },
  {
    id: 'nsfw-act-pace',
    category: 'nsfw_act',
    subId: 'nsfw-act-core',
    label: '改节奏',
    hint: '快慢力道',
    probe: '接着写：节奏明显变快或放慢。写出谁主导、对方求或忍。',
  },
  {
    id: 'nsfw-act-dirty',
    category: 'nsfw_act',
    subId: 'nsfw-act-talk',
    label: '边做边说',
    hint: '短句要真',
    probe: '接着写：一方说出露骨荤话。写出对方羞、回嘴还是更兴奋。',
  },
  {
    id: 'nsfw-act-dom',
    category: 'nsfw_act',
    subId: 'nsfw-act-power',
    label: '按住主导',
    hint: '谁压着谁',
    probe: '接着写：主导动作落地。写出双方同意感与快感，禁止无同意强迫。',
  },
  {
    id: 'nsfw-act-risk',
    category: 'nsfw_act',
    subId: 'nsfw-act-edge',
    label: '差点被发现',
    hint: '压着声音',
    probe: '接着写：可能被听见时继续。写出紧张与是否停手。',
  },
  {
    id: 'nsfw-af-hold',
    category: 'nsfw_after',
    subId: 'nsfw-af-soft',
    label: '抱着缓',
    hint: '余韵',
    probe: '接着写：结束后抱着缓一会儿。写出小声说话或忽然尴尬。',
  },
  {
    id: 'nsfw-af-talk',
    category: 'nsfw_after',
    subId: 'nsfw-af-soft',
    label: '枕边话',
    hint: '说句真的',
    probe: '接着写：事后枕边对白。写出一句平时不好意思说的话。',
  },
  {
    id: 'nsfw-af-wipe',
    category: 'nsfw_after',
    subId: 'nsfw-af-clean',
    label: '清理穿回',
    hint: '谁动手',
    probe: '接着写：事后清理或穿回衣服。写出谁动手、气氛温还是正经。',
  },

  // —— 生活细节 ——
  {
    id: 'daily-meal-food',
    category: 'daily',
    subId: 'daily-meal',
    label: '一起吃',
    hint: '点菜分食',
    probe: '接着写：一起用餐的一拍。写出谁记得口味、小细节里的在意。',
  },
  {
    id: 'daily-meal-pay',
    category: 'daily',
    subId: 'daily-meal',
    label: '买单拉扯',
    hint: '谁付',
    probe: '接着写：结账时的互动。写出谁抢、谁让、事后别扭不别扭。',
  },
  {
    id: 'daily-walk-side',
    category: 'daily',
    subId: 'daily-walk',
    label: '并肩走',
    hint: '步调',
    probe: '接着写：并肩走路。写出步调、是否靠近、有没有小体贴。',
  },
  {
    id: 'daily-walk-bye',
    category: 'daily',
    subId: 'daily-walk',
    label: '夜深道别',
    hint: '该散了',
    probe: '接着写：时间晚了。写出谁催回家、怎么道别。',
  },
  {
    id: 'daily-care-gift',
    category: 'daily',
    subId: 'daily-care',
    label: '小礼物',
    hint: '突然拿出',
    probe: '接着写：一方拿出小礼物或还东西。写出惊讶、推辞还是收下。',
  },
  {
    id: 'daily-care-jacket',
    category: 'daily',
    subId: 'daily-care',
    label: '披件衣服',
    hint: '默默做',
    probe: '接着写：一方把外套或热饮给对方。写出推不推、气味或温度。',
  },
  {
    id: 'daily-play-photo',
    category: 'daily',
    subId: 'daily-play',
    label: '拍照',
    hint: '合影或偷拍',
    probe: '接着写：有人提议合影或偷拍。写出愿不愿意、摆什么表情。',
  },
  {
    id: 'daily-play-game',
    category: 'daily',
    subId: 'daily-play',
    label: '玩惩罚',
    hint: '输了做什么',
    probe: '接着写：玩游戏或抽惩罚。写出输的人做什么、赢的人留不留情。',
  },
]

export function freeformProbeId(subId: string): string {
  return `free:${subId}`
}

export function buildFreeformPreset(sub: ContinueProbeSubDef): ContinueProbePreset {
  return {
    id: freeformProbeId(sub.id),
    category: sub.category,
    subId: sub.id,
    label: '模型自行发挥',
    hint: `只定「${sub.label}」方向，场面自定`,
    probe: sub.freeProbe,
    freeform: true,
  }
}

/** 展示用：自行发挥显示成「小分类·发挥」 */
export function formatContinueProbeChipLabel(
  preset: ContinueProbePreset,
  subById?: ReadonlyMap<string, ContinueProbeSubDef>,
): string {
  if (preset.freeform && preset.subId) {
    const sub = subById?.get(preset.subId)
    return sub ? `${sub.label}·发挥` : '自行发挥'
  }
  return preset.label
}

export const DATING_CONTINUE_PROBE_BUILTIN: readonly ContinueProbePreset[] = [
  ...DATING_CONTINUE_PROBE_SUBS.map(buildFreeformPreset),
  ...SPECIFIC_RAW,
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  DATING_CONTINUE_PROBE_CATEGORIES.map((c) => [c.id, c.label]),
)

export function listSubsForCategory(category: ContinueProbeCategoryId): ContinueProbeSubDef[] {
  const cat = normalizeContinueProbeCategoryId(category) ?? category
  return DATING_CONTINUE_PROBE_SUBS.filter((s) => s.category === cat)
}

export function listSpecificsForSub(
  presets: ReadonlyArray<ContinueProbePreset>,
  subId: string,
): ContinueProbePreset[] {
  return presets.filter((p) => p.subId === subId && !p.freeform)
}

export function composeContinueProbeDirectorText(opts: {
  probes: ReadonlyArray<
    Pick<ContinueProbePreset, 'label' | 'probe' | 'hint' | 'freeform' | 'subId'> & {
      /** @deprecated 已改为按大类补充；保留兼容 */
      customNote?: string
    }
  >
  timeAdvance?: ContinueDraftTimeAdvance
  timeAdvanceCustom?: ContinueDraftTimeAdvanceCustom | null
  extraNote?: string
  /** 各大类一条补充（有内容才注入） */
  categoryNotes?: ReadonlyArray<{ label: string; note: string }>
}): string {
  const lines = opts.probes
    .map((p) => {
      const probe = p.probe.trim()
      if (!probe) return ''
      const hint = String(p.hint ?? '').trim()
      const tag = p.freeform ? '〔自行发挥〕' : ''
      return hint ? `${tag}${probe}（${hint}）` : `${tag}${probe}`
    })
    .filter(Boolean)

  const categoryNoteLines = (opts.categoryNotes ?? [])
    .map((c) => {
      const label = String(c.label ?? '').trim()
      const note = String(c.note ?? '').trim()
      if (!note) return ''
      return label ? `· 【${label}】${note}` : `· ${note}`
    })
    .filter(Boolean)

  if (!lines.length && !opts.extraNote?.trim() && !categoryNoteLines.length) return ''

  const timeSpan = resolveTimeAdvanceSpan(opts.timeAdvance ?? 'none', opts.timeAdvanceCustom ?? null)
  const parts: string[] = [
    '【导演续写·方向指导】下列情节**尚未发生**；须紧接上一段结尾当场演出来，禁止写成问答或提纲。',
  ]

  if (timeSpan.auto) {
    parts.push(`【时间推进·自动】${timeSpan.detail}`)
  } else if (timeSpan.enabled) {
    parts.push(
      `【时间推进】约「${timeSpan.phrase}」：${timeSpan.detail}结构须「短带过间隔内变化 → 落到可演的一拍」。`,
    )
  } else {
    parts.push('【接笔】默认同场下一拍，禁止无故跳时跳场。')
  }

  if (lines.length) {
    parts.push('【本轮优先展开（可融合 1～3 条，择重点写；标〔自行发挥〕的只守方向、场面自定）】')
    for (const line of lines) {
      parts.push(`· ${line}`)
    }
  }

  if (categoryNoteLines.length) {
    parts.push('【分类补充】')
    for (const line of categoryNoteLines) {
      parts.push(line)
    }
  }

  const note = String(opts.extraNote ?? '').trim()
  if (note) {
    parts.push(`【补充】${note}`)
  }

  parts.push(
    '【硬要求】须推进关系或事件；禁止原地寒暄、纯氛围堆叠、复述上文；结尾落在可接续的对白或动作；服从档案室关系阶段与亲密闸门；对白/旁白/OS 遵守平等尊重（禁幼化贬低与病态占有）。',
  )

  return parts.join('\n')
}

export function groupProbesByCategory(
  presets: ReadonlyArray<ContinueProbePreset>,
): Array<{ category: ContinueProbeCategoryId; label: string; items: ContinueProbePreset[] }> {
  const map = new Map<ContinueProbeCategoryId, ContinueProbePreset[]>()
  for (const c of DATING_CONTINUE_PROBE_CATEGORIES) {
    map.set(c.id, [])
  }
  for (const p of presets) {
    const cat = normalizeContinueProbeCategoryId(p.category) ?? p.category
    const list = map.get(cat)
    if (list) list.push({ ...p, category: cat })
  }
  return DATING_CONTINUE_PROBE_CATEGORIES.map((c) => ({
    category: c.id,
    label: CATEGORY_LABEL[c.id] ?? c.label,
    items: map.get(c.id) ?? [],
  })).filter((g) => g.items.length > 0)
}

/** 随机抽取：优先跨大类，可抽到「自行发挥」或具体项 */
export function pickRandomContinueProbeIds(
  presets: ReadonlyArray<Pick<ContinueProbePreset, 'id' | 'category'>>,
  count?: number,
): string[] {
  if (!presets.length) return []
  const target = Math.min(presets.length, count ?? 2 + Math.floor(Math.random() * 2))
  if (target <= 0) return []

  const shuffled = [...presets].sort(() => Math.random() - 0.5)
  const pickedIds: string[] = []
  const usedCategories = new Set<string>()

  for (const p of shuffled) {
    if (pickedIds.length >= target) break
    const cat = normalizeContinueProbeCategoryId(p.category) ?? p.category
    if (!usedCategories.has(cat)) {
      pickedIds.push(p.id)
      usedCategories.add(cat)
    }
  }
  for (const p of shuffled) {
    if (pickedIds.length >= target) break
    if (!pickedIds.includes(p.id)) pickedIds.push(p.id)
  }
  return pickedIds
}
