/**
 * 线下剧情「续写方向」：
 * 大分类 → 小分类 →（具体选项 | 模型自行发挥）
 * 选「自行发挥」只按小分类气质注入，场面由模型自定；选具体选项则给更明确的指导。
 */

import {
  resolveTimeAdvanceSpan,
  type ContinueDraftTimeAdvance,
  type ContinueDraftTimeAdvanceCustom,
} from './datingDirectorContinueDraftAi'

export type ContinueProbeCategoryId =
  | 'relation'
  | 'event'
  | 'scene'
  | 'intimate'
  | 'nsfw_foreplay'
  | 'nsfw_act'
  | 'nsfw_after'
  | 'mood'
  | 'atmosphere'
  | 'daily'

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
  { id: 'relation', label: '关系拉扯' },
  { id: 'event', label: '突发插曲' },
  { id: 'scene', label: '场景推进' },
  { id: 'intimate', label: '暧昧肢体' },
  { id: 'nsfw_foreplay', label: 'NSFW·前戏', shortLabel: '前戏' },
  { id: 'nsfw_act', label: 'NSFW·过程', shortLabel: '过程' },
  { id: 'nsfw_after', label: 'NSFW·事后', shortLabel: '事后' },
  { id: 'mood', label: '情绪当面' },
  { id: 'atmosphere', label: '情绪氛围' },
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
  { id: 'relation', label: '关系拉扯', kind: 'flat', category: 'relation' },
  { id: 'event', label: '突发插曲', kind: 'flat', category: 'event' },
  { id: 'scene', label: '场景推进', kind: 'flat', category: 'scene' },
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
  { id: 'mood', label: '情绪当面', kind: 'flat', category: 'mood' },
  { id: 'atmosphere', label: '情绪氛围', kind: 'flat', category: 'atmosphere' },
  { id: 'daily', label: '生活细节', kind: 'flat', category: 'daily' },
]

/** 小分类（大分类下的第二层） */
export const DATING_CONTINUE_PROBE_SUBS: readonly ContinueProbeSubDef[] = [
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

  // —— 突发插曲 ——
  {
    id: 'event-interrupt',
    category: 'event',
    label: '打断',
    freeProbe:
      '本轮按「被打断」方向自行发挥：外人、电话或突发状况打断正事皆可。写出还能不能回到原话题。',
  },
  {
    id: 'event-secret',
    category: 'event',
    label: '秘密',
    freeProbe:
      '本轮按「秘密」方向自行发挥：差点说漏、被察觉或当面兑现约定皆可。写出掩饰、补救或摊牌。',
  },
  {
    id: 'event-chaos',
    category: 'event',
    label: '变卦',
    freeProbe:
      '本轮按「计划变卦」方向自行发挥：安排黄了、东西丢了或结账卡壳皆可。写出谁急、临时怎么改。',
  },
  {
    id: 'event-third',
    category: 'event',
    label: '第三人',
    freeProbe:
      '本轮按「第三人介入」方向自行发挥：撞熟人、被围观或当众被问关系皆可。写出介绍与事后评价。',
  },

  // —— 场景推进 ——
  {
    id: 'scene-move',
    category: 'scene',
    label: '换场',
    freeProbe:
      '本轮按「换场」方向自行发挥：到下一处、进门或路上移动皆可。间隔须有可感知变化，禁止只写「到了晚上」。',
  },
  {
    id: 'scene-pressure',
    category: 'scene',
    label: '压力',
    freeProbe:
      '本轮按「环境压力」方向自行发挥：打烊、末班、截止前皆可。写出走或留、谁开口。',
  },
  {
    id: 'scene-space',
    category: 'scene',
    label: '空间',
    freeProbe:
      '本轮按「空间变化」方向自行发挥：密闭、变吵、独处被打破皆可。写出距离与声音怎么变。',
  },
  {
    id: 'scene-weather',
    category: 'scene',
    label: '天气',
    freeProbe:
      '本轮按「天气/环境」方向自行发挥：雨、降温、起风皆可。写出对两人距离或情绪的影响。',
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

  // —— 情绪当面 ——
  {
    id: 'mood-soft',
    category: 'mood',
    label: '软下来',
    freeProbe:
      '本轮按「情绪软下来」自行发挥：眼眶红、被安慰或一起笑崩皆可。写出另一方怎么接住。',
  },
  {
    id: 'mood-clash',
    category: 'mood',
    label: '顶上',
    freeProbe:
      '本轮按「情绪顶上」自行发挥：赌气、真生气或沉默对峙皆可。须有具体事由，写出吵到哪一步。',
  },
  {
    id: 'mood-nervous',
    category: 'mood',
    label: '紧张',
    freeProbe:
      '本轮按「明显紧张」自行发挥：手抖、语无伦次或同时开口又停皆可。写出有没有被察觉。',
  },

  // —— 情绪氛围（用户举例的大分类） ——
  {
    id: 'atm-happy',
    category: 'atmosphere',
    label: '开心',
    freeProbe:
      '本轮整体氛围偏开心：轻松、好笑或心里发软皆可。须落到具体互动，禁止纯段子堆砌与恶意羞辱。',
  },
  {
    id: 'atm-warm',
    category: 'atmosphere',
    label: '温馨',
    freeProbe:
      '本轮整体氛围偏温馨：小体贴、慢节奏、被接住皆可。禁止霸总腔与工业糖精告白。',
  },
  {
    id: 'atm-sad',
    category: 'atmosphere',
    label: '低落',
    freeProbe:
      '本轮整体氛围偏低落：发闷、压抑或苦甜皆可。用停顿与小动作写，禁止无铺垫嚎哭和鸡汤升华。',
  },
  {
    id: 'atm-tense',
    category: 'atmosphere',
    label: '紧张',
    freeProbe:
      '本轮整体氛围偏紧张：信息差、时间压力或不对劲感皆可。心跳感来自局势，禁止无因惊悚跳杀。',
  },
  {
    id: 'atm-sweet',
    category: 'atmosphere',
    label: '甜蜜',
    freeProbe:
      '本轮整体氛围偏甜蜜：嘴硬心软、近距离小互动皆可。禁止油腻霸总与每句「宝宝」，甜须落到具体一拍。',
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
  // 误会
  { id: 'relation-misread-words', category: 'relation', subId: 'relation-misread', label: '把话听拧', hint: '理解成另一层', probe: '接着写：一方把对方刚说的话理解成别的意思。写出愣住、急着解释或越描越黑。' },
  { id: 'relation-misread-motive', category: 'relation', subId: 'relation-misread', label: '动机猜错', hint: '以为对方另有所指', probe: '接着写：一方把对方的好意/玩笑猜成拒绝或嘲讽。写出澄清前后的气氛差。' },
  { id: 'relation-misread-joke', category: 'relation', subId: 'relation-misread', label: '玩笑当真', hint: '一句玩笑落地', probe: '接着写：一句玩笑被当真。写出说的人慌不慌、听的人脸色怎么变。' },
  // 试探
  { id: 'relation-probe-half', category: 'relation', subId: 'relation-probe', label: '半开玩笑问', hint: '说完盯着', probe: '接着写：一方用玩笑口吻抛出半认真的话。写出对方接话前的停顿与最后回什么。' },
  { id: 'relation-probe-ask', category: 'relation', subId: 'relation-probe', label: '逼着表态', hint: '你到底怎么想', probe: '接着写：一方直接问关系定位或态度。写出对方躲、答还是反问。' },
  { id: 'relation-probe-unsaid', category: 'relation', subId: 'relation-probe', label: '欲言又止', hint: '话咽回去', probe: '接着写：有人差点说出不敢说的话，最后咽回或改话题。写出犹豫那一秒。' },
  // 吃醋
  { id: 'relation-jealous-acid', category: 'relation', subId: 'relation-jealous', label: '酸一下', hint: '装没事', probe: '接着写：出现让一方不自在的人/事/话。写出吃醋方装没事或嘴硬，有没有说漏。' },
  { id: 'relation-jealous-compare', category: 'relation', subId: 'relation-jealous', label: '被比较', hint: '拿别人说事', probe: '接着写：有人无意把对方跟别人比。写出被比的人脸色与回不回嘴。' },
  { id: 'relation-jealous-ex', category: 'relation', subId: 'relation-jealous', label: '前任影子', hint: '旧人被提起', probe: '接着写：对话里带出前任或暧昧对象。写出谁先提、另一方怎么接。' },
  // 和解
  { id: 'relation-mend-sorry', category: 'relation', subId: 'relation-mend', label: '先低头', hint: '道歉或认错', probe: '接着写：谁先开口道歉或认错。写出对方是接受还是还在赌气。' },
  { id: 'relation-mend-step', category: 'relation', subId: 'relation-mend', label: '递台阶', hint: '给对方下台', probe: '接着写：一方故意给对方台阶下。写出对方接不接、气氛怎么松。' },
  // 疏远
  { id: 'relation-distance-space', category: 'relation', subId: 'relation-distance', label: '拉开距离', hint: '身体或话变少', probe: '接着写：一方故意拉开距离（挪开、少说话）。写出对方有没有察觉。' },
  { id: 'relation-distance-name', category: 'relation', subId: 'relation-distance', label: '称呼变了', hint: '亲疏变化', probe: '接着写：称呼忽然更亲或更生分。写出对方听到时的反应。' },

  // 打断
  { id: 'event-interrupt-people', category: 'event', subId: 'event-interrupt', label: '被人打断', hint: '话卡半截', probe: '接着写：正说到要紧处被外人打断。写出还能不能回到刚才的话题。' },
  { id: 'event-interrupt-phone', category: 'event', subId: 'event-interrupt', label: '来电打断', hint: '接不接', probe: '接着写：手机响了。写出来电是谁、接不接，另一方什么表情。' },
  // 秘密
  { id: 'event-secret-slip', category: 'event', subId: 'event-secret', label: '差点说漏', hint: '补救掩饰', probe: '接着写：只有一方知道的事差点说漏。写出补救、掩饰或摊牌。' },
  { id: 'event-secret-keep', category: 'event', subId: 'event-secret', label: '约定兑现', hint: '线上说过的', probe: '接着写：聊天里提过的事当面兑现。写出惊喜还是措手不及。' },
  // 变卦
  { id: 'event-chaos-plan', category: 'event', subId: 'event-chaos', label: '计划黄了', hint: '临时改', probe: '接着写：原本安排被打乱。写出谁急、临时改成什么。' },
  { id: 'event-chaos-lost', category: 'event', subId: 'event-chaos', label: '东西不见', hint: '一起找', probe: '接着写：重要小东西找不到。写出翻找、埋怨或一起找。' },
  // 第三人
  { id: 'event-third-meet', category: 'event', subId: 'event-third', label: '撞见熟人', hint: '怎么介绍', probe: '接着写：撞见认识其中一方的人。写出打招呼、怎么介绍、分开后评价。' },
  { id: 'event-third-ask', category: 'event', subId: 'event-third', label: '当众被问', hint: '你们是什么关系', probe: '接着写：有人当众问两人关系。写出怎么答、对视那一眼。' },

  // 换场 / 压力 / 空间 / 天气
  { id: 'scene-move-next', category: 'scene', subId: 'scene-move', label: '换到下一处', hint: '路上也有戏', probe: '接着写：自然换到下一处。间隔里须有可感知变化。' },
  { id: 'scene-move-home', category: 'scene', subId: 'scene-move', label: '进到私密处', hint: '关上门', probe: '接着写：进到一方空间并关上门。写出门口第一句怎么开口。' },
  { id: 'scene-pressure-close', category: 'scene', subId: 'scene-pressure', label: '要打烊了', hint: '走还是留', probe: '接着写：环境逼他们表态（打烊/关门）。写出走或留、谁开口。' },
  { id: 'scene-pressure-late', category: 'scene', subId: 'scene-pressure', label: '末班将近', hint: '赶不赶', probe: '接着写：发现末班将近。写出要不要送、怎么告别。' },
  { id: 'scene-space-close', category: 'scene', subId: 'scene-space', label: '密闭空间', hint: '只能靠近', probe: '接着写：两人困在狭小空间。写出沉默、视线、不小心碰到。' },
  { id: 'scene-space-noise', category: 'scene', subId: 'scene-space', label: '周围变吵', hint: '压低声音', probe: '接着写：周围从安静变嘈杂。写出是否压低声音或离开。' },
  { id: 'scene-weather-rain', category: 'scene', subId: 'scene-weather', label: '天气突变', hint: '雨或降温', probe: '接着写：天气突变。写出对两人距离和情绪的影响。' },

  // 暧昧
  { id: 'intimate-near-lean', category: 'intimate', subId: 'intimate-near', label: '身子靠过去', hint: '肩碰肩', probe: '接着写：谁更先缩短距离。写出靠近前后呼吸与视线变化。' },
  { id: 'intimate-near-ear', category: 'intimate', subId: 'intimate-near', label: '凑耳边说', hint: '只有两人听见', probe: '接着写：一方凑耳边说一句小声话。写出内容与对方反应。' },
  { id: 'intimate-touch-hand', category: 'intimate', subId: 'intimate-touch', label: '手指碰到', hint: '抽开或握住', probe: '接着写：一次明确的肢体接触。写出偶然还是故意、第一反应。' },
  { id: 'intimate-touch-fix', category: 'intimate', subId: 'intimate-touch', label: '帮整理', hint: '衣领或头发', probe: '接着写：一方帮对方整理仪容。写出被整理的人僵住还是配合。' },
  { id: 'intimate-almost-stop', category: 'intimate', subId: 'intimate-almost', label: '吻前停住', hint: '谁先退', probe: '接着写：吻前停住那一拍。写出谁犹豫、有没有吻下去。' },
  { id: 'intimate-subtext-chat', category: 'intimate', subId: 'intimate-subtext', label: '话里带刺带甜', hint: '表面聊别的', probe: '接着写：对白表面在聊别的，其实在暗示在意。写出听的人懂不懂。' },
  { id: 'intimate-almost-drunk', category: 'intimate', subId: 'intimate-almost', label: '状态不佳漏嘴', hint: '微醺或太累', probe: '接着写：一方微醺或太累说出平时不会说的话。写出另一方怎么反应。' },

  // NSFW 具体（稍笼统）
  { id: 'nsfw-fp-kiss', category: 'nsfw_foreplay', subId: 'nsfw-fp-heat', label: '深吻', hint: '吻到失控', probe: '接着写：一次带欲望的深吻。写出节奏、手落哪里、有没有继续往下。' },
  { id: 'nsfw-fp-undress', category: 'nsfw_foreplay', subId: 'nsfw-fp-heat', label: '解衣', hint: '衣服开始乱', probe: '接着写：衣物被解开或半褪。写出谁动手、对方眼神变化。' },
  { id: 'nsfw-fp-hold', category: 'nsfw_foreplay', subId: 'nsfw-fp-tease', label: '吊着不给', hint: '停在关头', probe: '接着写：一方故意挑逗到关头却停手。写出对方急与谁先破功。' },
  { id: 'nsfw-fp-mouth', category: 'nsfw_foreplay', subId: 'nsfw-fp-oral', label: '用嘴开始', hint: '姿势与节奏', probe: '接着写：一方用嘴开始亲密服务。写出姿势与被服务方反应。' },
  { id: 'nsfw-act-in', category: 'nsfw_act', subId: 'nsfw-act-core', label: '进入', hint: '结合当下', probe: '接着写：进入结合的过程。写出适应、表情与第一句对白。' },
  { id: 'nsfw-act-pace', category: 'nsfw_act', subId: 'nsfw-act-core', label: '改节奏', hint: '快慢力道', probe: '接着写：节奏明显变快或放慢。写出谁主导、对方求或忍。' },
  { id: 'nsfw-act-dirty', category: 'nsfw_act', subId: 'nsfw-act-talk', label: '边做边说', hint: '短句要真', probe: '接着写：一方说出露骨荤话。写出对方羞、回嘴还是更兴奋。' },
  { id: 'nsfw-act-dom', category: 'nsfw_act', subId: 'nsfw-act-power', label: '按住主导', hint: '谁压着谁', probe: '接着写：主导动作落地。写出双方同意感与快感，禁止无同意强迫。' },
  { id: 'nsfw-act-risk', category: 'nsfw_act', subId: 'nsfw-act-edge', label: '差点被发现', hint: '压着声音', probe: '接着写：可能被听见时继续。写出紧张与是否停手。' },
  { id: 'nsfw-af-hold', category: 'nsfw_after', subId: 'nsfw-af-soft', label: '抱着缓', hint: '余韵', probe: '接着写：结束后抱着缓一会儿。写出小声说话或忽然尴尬。' },
  { id: 'nsfw-af-talk', category: 'nsfw_after', subId: 'nsfw-af-soft', label: '枕边话', hint: '说句真的', probe: '接着写：事后枕边对白。写出一句平时不好意思说的话。' },
  { id: 'nsfw-af-wipe', category: 'nsfw_after', subId: 'nsfw-af-clean', label: '清理穿回', hint: '谁动手', probe: '接着写：事后清理或穿回衣服。写出谁动手、气氛温还是正经。' },

  // 情绪当面
  { id: 'mood-soft-cry', category: 'mood', subId: 'mood-soft', label: '眼眶红了', hint: '没忍住', probe: '接着写：有人眼眶红或声音发抖。写出另一方怎么反应。' },
  { id: 'mood-soft-laugh', category: 'mood', subId: 'mood-soft', label: '一起大笑', hint: '笑完更近', probe: '接着写：两人一起大笑。写出笑完气氛变轻松，有没有多说心里话。' },
  { id: 'mood-soft-comfort', category: 'mood', subId: 'mood-soft', label: '被安慰', hint: '笨拙体贴', probe: '接着写：一方低落，另一方用具体动作安慰。禁止空洞「你要坚强」。' },
  { id: 'mood-clash-sulk', category: 'mood', subId: 'mood-clash', label: '赌气', hint: '不说话', probe: '接着写：一方明显赌气。写出另一方是哄还是也硬撑。' },
  { id: 'mood-clash-angry', category: 'mood', subId: 'mood-clash', label: '真生气', hint: '有事由', probe: '接着写：一方真的生气，须有具体事由。写出吵到哪一步。' },
  { id: 'mood-nervous-shake', category: 'mood', subId: 'mood-nervous', label: '藏不住紧张', hint: '手抖语乱', probe: '接着写：一方明显紧张。写出另一方有没有察觉、怎么安抚或调侃。' },

  // 氛围小分类下的具体（稍笼统）
  { id: 'atm-happy-funny', category: 'atmosphere', subId: 'atm-happy', label: '轻松好笑', hint: '出糗或吐槽', probe: '本轮偏轻松好笑：允许出糗、吐槽、反差，须推进关系；禁止恶意羞辱。' },
  { id: 'atm-happy-bright', category: 'atmosphere', subId: 'atm-happy', label: '心情上扬', hint: '明显开心', probe: '本轮气氛明显上扬：有具体让人开心的互动落点，禁止空喊开心。' },
  { id: 'atm-warm-care', category: 'atmosphere', subId: 'atm-warm', label: '默默体贴', hint: '不油腻', probe: '本轮偏温馨：用具体小体贴传递安心，禁止霸总腔与糖精告白。' },
  { id: 'atm-warm-heal', category: 'atmosphere', subId: 'atm-warm', label: '被接住', hint: '治愈感', probe: '本轮偏治愈：一方低落时被温柔接住，禁止说教式安慰。' },
  { id: 'atm-sad-quiet', category: 'atmosphere', subId: 'atm-sad', label: '发闷发酸', hint: '克制', probe: '本轮偏悲伤克制：用语气停顿与小动作，禁止无铺垫嚎哭。' },
  { id: 'atm-sad-bitter', category: 'atmosphere', subId: 'atm-sad', label: '苦甜', hint: '笑里带酸', probe: '本轮偏苦甜：表面轻松，底下有失落感；禁止全程哭丧。' },
  { id: 'atm-tense-clock', category: 'atmosphere', subId: 'atm-tense', label: '时间在催', hint: '弦绷着', probe: '本轮偏紧张：时间或局势在催，心跳感来自局势而非形容词。' },
  { id: 'atm-tense-odd', category: 'atmosphere', subId: 'atm-tense', label: '不对劲', hint: '轻微违和', probe: '本轮偏诡异不安：信息对不上，保持现实可解释余地，禁止跳灵异跳杀。' },
  { id: 'atm-sweet-soft', category: 'atmosphere', subId: 'atm-sweet', label: '心里发软', hint: '心动', probe: '本轮偏甜蜜心动：嘴硬心软或近距离小互动，禁止油腻霸总。' },
  { id: 'atm-sweet-shy', category: 'atmosphere', subId: 'atm-sweet', label: '别扭的甜', hint: '嘴硬', probe: '本轮偏别扭甜蜜：嫌弃里带着在意，甜须落到具体一拍。' },

  // 生活
  { id: 'daily-meal-food', category: 'daily', subId: 'daily-meal', label: '一起吃', hint: '点菜分食', probe: '接着写：一起用餐的一拍。写出谁记得口味、小细节里的在意。' },
  { id: 'daily-meal-pay', category: 'daily', subId: 'daily-meal', label: '买单拉扯', hint: '谁付', probe: '接着写：结账时的互动。写出谁抢、谁让、事后别扭不别扭。' },
  { id: 'daily-walk-side', category: 'daily', subId: 'daily-walk', label: '并肩走', hint: '步调', probe: '接着写：并肩走路。写出步调、是否靠近、有没有小体贴。' },
  { id: 'daily-walk-bye', category: 'daily', subId: 'daily-walk', label: '夜深道别', hint: '该散了', probe: '接着写：时间晚了。写出谁催回家、怎么道别。' },
  { id: 'daily-care-gift', category: 'daily', subId: 'daily-care', label: '小礼物', hint: '突然拿出', probe: '接着写：一方拿出小礼物或还东西。写出惊讶、推辞还是收下。' },
  { id: 'daily-care-jacket', category: 'daily', subId: 'daily-care', label: '披件衣服', hint: '默默做', probe: '接着写：一方把外套或热饮给对方。写出推不推、气味或温度。' },
  { id: 'daily-play-photo', category: 'daily', subId: 'daily-play', label: '拍照', hint: '合影或偷拍', probe: '接着写：有人提议合影或偷拍。写出愿不愿意、摆什么表情。' },
  { id: 'daily-play-game', category: 'daily', subId: 'daily-play', label: '玩惩罚', hint: '输了做什么', probe: '接着写：玩游戏或抽惩罚。写出输的人做什么、赢的人留不留情。' },
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

const CATEGORY_LABEL: Record<ContinueProbeCategoryId, string> = Object.fromEntries(
  DATING_CONTINUE_PROBE_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<ContinueProbeCategoryId, string>

export function listSubsForCategory(category: ContinueProbeCategoryId): ContinueProbeSubDef[] {
  return DATING_CONTINUE_PROBE_SUBS.filter((s) => s.category === category)
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
      /** 该选项下玩家自定义补充（可选） */
      customNote?: string
    }
  >
  timeAdvance?: ContinueDraftTimeAdvance
  timeAdvanceCustom?: ContinueDraftTimeAdvanceCustom | null
  extraNote?: string
}): string {
  const lines = opts.probes
    .map((p) => {
      const probe = p.probe.trim()
      if (!probe) return ''
      const hint = String(p.hint ?? '').trim()
      const tag = p.freeform ? '〔自行发挥〕' : ''
      const custom = String(p.customNote ?? '').trim()
      let line = hint ? `${tag}${probe}（${hint}）` : `${tag}${probe}`
      if (custom) line = `${line}；补充：${custom}`
      return line
    })
    .filter(Boolean)
  if (!lines.length && !opts.extraNote?.trim()) return ''

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

  const note = String(opts.extraNote ?? '').trim()
  if (note) {
    parts.push(`【补充】${note}`)
  }

  parts.push(
    '【硬要求】须推进关系或事件；禁止原地寒暄、纯氛围堆叠、复述上文；结尾落在可接续的对白或动作；服从档案室关系阶段与亲密闸门。',
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
    const list = map.get(p.category)
    if (list) list.push(p)
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
  const usedCategories = new Set<ContinueProbeCategoryId>()

  for (const p of shuffled) {
    if (pickedIds.length >= target) break
    if (!usedCategories.has(p.category)) {
      pickedIds.push(p.id)
      usedCategories.add(p.category)
    }
  }
  for (const p of shuffled) {
    if (pickedIds.length >= target) break
    if (!pickedIds.includes(p.id)) pickedIds.push(p.id)
  }
  return pickedIds
}
