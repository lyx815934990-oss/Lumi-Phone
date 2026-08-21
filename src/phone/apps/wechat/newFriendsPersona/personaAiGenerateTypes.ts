import type { Gender } from './types'

/** AI 生成角色 · 用户填写面板 */
export type PersonaAiGenerateForm = {
  /** 真实姓名；留空则由 AI 生成 */
  nameHint: string
  /** 头像 dataURL 或 URL；留空则不生成分配头像 */
  avatarUrl: string
  gender: Gender
  /** 年龄描述，如「25岁」「20-28岁」 */
  ageHint: string
  /** 职业 / 社会身份方向 */
  occupationHint: string
  /**
   * true = 职业/社会身份单独写入尾声「职业身份的当前快照」，可随剧情更新；
   * false = 固定写在「名片基础」序言
   */
  occupationMutable: boolean
  /** 外貌补充（眉眼配饰等；发色/发型/身形优先读分栏） */
  appearanceHint: string
  /** 发色 */
  hairColorHint: string
  /** 发型 */
  hairStyleHint: string
  /** 身形体态 */
  bodyShapeHint: string
  /** 气质气场 */
  auraHint: string
  /** 分境穿搭偏好 */
  outfitHint: string
  /** MBTI 四字母；空串 = 交给 AI；「不限」同空 */
  mbtiHint: string
  /** 性格关键词、气质 */
  personalityKeywords: string
  /** 社交面具一句话（对外 vs 私下反差） */
  socialMaskHint: string
  /** 身世 / 背景梗（1–3 句种子） */
  backgroundHint: string
  /** 兴趣爱好（写入「能力与日常」+ 顶层 interests） */
  hobbiesHint: string
  /** 生活小习惯：烟酒、作息、洁癖等（写入「能力与日常」） */
  lifeHabitsHint: string
  /** 雷点种子（顶层 painPoints +「名片基础」） */
  painPointsHint: string
  /** 人脉偏向汇总（旧字段；优先读下方分栏） */
  socialCircleHint: string
  /** 家人画像 */
  socialFamilyHint: string
  /** 朋友画像 */
  socialFriendsHint: string
  /** 同事/下属画像 */
  socialWorkHint: string
  /** 反差萌点（写入「性格内核」/「人际与秘密」） */
  gapMoeHint: string
  /** 与 {{user}} 的关系设定 */
  relationToUser: string
  /** 与 {{user}} 的相识过程 / 开局互动细节 */
  relationDetailHint: string
  /** 当前选中的「初始过程」预设 id；手改/清空时置空 */
  meetingProcessPresetId: string
  /** 历史身份 · {{char}}（相识/过往阶段时的社会身份） */
  historyCharIdentity: string
  /** 历史身份 · {{user}} */
  historyUserIdentity: string
  /** 现在身份 · {{char}}（开局当下） */
  presentCharIdentity: string
  /** 现在身份 · {{user}} */
  presentUserIdentity: string
  /** 当前选中的身份弧预设 id；对换/手改后置空，避免按钮假选中 */
  identityArcPresetId: string
  /** 过往感情史种子（可选；无论是否填写，世界书恒含「过往感情史」序言条） */
  relationshipHistoryHint: string
  /** 恋爱 / 亲密态度方向 */
  loveAttitudeHint: string
  /** 恋爱反差汇总（旧字段；优先读下方分栏） */
  loveContrastHint: string
  /** 恋爱前样子 */
  loveBeforeHint: string
  /** 恋爱后样子 */
  loveAfterHint: string
  /** 吃醋的样子 */
  jealousyHint: string
  /** 与恋人冲突的样子 */
  conflictHint: string
  /** 角色本人通用口语 / 口头禅习惯（写入「能力与日常」，非对 {{user}} 专属） */
  speechStyleHint: string
  /** 性取向；空或「不限」= 交给 AI */
  orientationHint: string
  /** true = 性取向单独写入尾声「取向认同的当前快照」，可随剧情更新；性格内核仍为序言 */
  orientationMutable: boolean
  /** 开启成人向（NSFW）档案扩写 */
  nsfwEnabled: boolean
  /** 性癖 XP / 亲密偏好种子（仅 nsfwEnabled 时生效） */
  nsfwHint: string
  /** 参考的动漫角色或真实人物（可多名，逗号/顿号分隔） */
  referencePersonaHint: string
  /**
   * true = 按填写人物直接生成档案（保留原名与已知人设）；
   * false = 只借气质，须原创姓名与经历
   */
  referencePersonaDirectGenerate: boolean
  /** 补充说明（题材、禁忌等） */
  extraNotes: string
}

export const PERSONA_AI_RELATION_PRESETS = [
  '陌生人',
  '刚认识',
  '互相认识但不咋在意',
  '青梅竹马',
  '同班同学',
  '校友',
  '同事',
  '上下级',
  '朋友 · 常聊',
  '死党',
  '网友见面',
  '宿敌',
  '竞争对手',
  '暧昧 / 试探中',
  '暗恋对方',
  '被暗恋',
  '恋人 / 稳定交往',
  '已婚',
  '前任 · 仍有牵扯',
  '前任 · 已断联',
  '合租室友',
  '邻居',
  '家人 / 亲戚',
] as const

/** 一键填入「历史×现在 × char/user」四格身份的抓马开局预设 */
export type PersonaAiIdentityArcPreset = {
  id: string
  /** 预选按钮短标签 */
  label: string
  historyChar: string
  historyUser: string
  presentChar: string
  presentUser: string
}

export const PERSONA_AI_IDENTITY_ARC_PRESETS: readonly PersonaAiIdentityArcPreset[] = [
  {
    id: 'ex-colleagues',
    label: '前任·现同事',
    historyChar: '恋人',
    historyUser: '恋人',
    presentChar: '同部门同事',
    presentUser: '同部门同事',
  },
  {
    id: 'ex-roommates',
    label: '前任·合租',
    historyChar: '恋人',
    historyUser: '恋人',
    presentChar: '合租室友',
    presentUser: '合租室友',
  },
  {
    id: 'childhood-boss',
    label: '青梅·现上司',
    historyChar: '青梅竹马',
    historyUser: '青梅竹马',
    presentChar: '直属上司',
    presentUser: '下属员工',
  },
  {
    id: 'rival-fake-couple',
    label: '宿敌·假情侣',
    historyChar: '竞争对手',
    historyUser: '竞争对手',
    presentChar: '假扮情侣的搭档',
    presentUser: '假扮情侣的搭档',
  },
  {
    id: 'crush-mentor',
    label: '暗恋·新带教',
    historyChar: '同校学长/暗恋对象',
    historyUser: '学弟学妹',
    presentChar: '职场带教',
    presentUser: '新人下属',
  },
  {
    id: 'online-neighbor',
    label: '网友·现邻居',
    historyChar: '匿名网友',
    historyUser: '匿名网友',
    presentChar: '对门邻居',
    presentUser: '对门邻居',
  },
  {
    id: 'savior-rival',
    label: '恩人·现对手',
    historyChar: '救命恩人',
    historyUser: '被救下的人',
    presentChar: '赛场/职场对手',
    presentUser: '赛场/职场对手',
  },
  {
    id: 'stand-in-fiance',
    label: '名义未婚夫妻',
    historyChar: '世交子女',
    historyUser: '世交子女',
    presentChar: '名义未婚夫/妻',
    presentUser: '名义未婚夫/妻',
  },
  {
    id: 'landlord-ex',
    label: '放鸽子·现房东',
    historyChar: '放鸽子的人',
    historyUser: '被放鸽子的人',
    presentChar: '房东',
    presentUser: '租客',
  },
  {
    id: 'interview-next-day',
    label: '私密局·次日面试',
    historyChar: '酒吧/局末认识的陌生人',
    historyUser: '酒吧/局末认识的陌生人',
    presentChar: '面试官',
    presentUser: '应聘者',
  },
  {
    id: 'step-family',
    label: '重组家庭·继兄妹',
    historyChar: '互不相识的陌生人',
    historyUser: '互不相识的陌生人',
    presentChar: '继兄/继姐',
    presentUser: '继弟/继妹',
  },
  {
    id: 'debt-colleagues',
    label: '旧债·现搭档',
    historyChar: '欠人情/欠钱的一方',
    historyUser: '被欠人情/被欠钱的一方',
    presentChar: '项目搭档',
    presentUser: '项目搭档',
  },
  {
    id: 'doctor-patient',
    label: '旧同学·医患',
    historyChar: '同班同学',
    historyUser: '同班同学',
    presentChar: '主治医生',
    presentUser: '患者',
  },
  {
    id: 'teacher-parent',
    label: '旧识·家校',
    historyChar: '大学同学',
    historyUser: '大学同学',
    presentChar: '班主任/任课老师',
    presentUser: '学生家长',
  },
  {
    id: 'countdown-transfer',
    label: '恋人·即将异地',
    historyChar: '同城恋人',
    historyUser: '同城恋人',
    presentChar: '即将外派/出国的一方',
    presentUser: '留下的一方',
  },
] as const

export function applyPersonaAiIdentityArcPreset(
  preset: PersonaAiIdentityArcPreset,
): Pick<
  PersonaAiGenerateForm,
  | 'historyCharIdentity'
  | 'historyUserIdentity'
  | 'presentCharIdentity'
  | 'presentUserIdentity'
  | 'identityArcPresetId'
> {
  return {
    historyCharIdentity: preset.historyChar,
    historyUserIdentity: preset.historyUser,
    presentCharIdentity: preset.presentChar,
    presentUserIdentity: preset.presentUser,
    identityArcPresetId: preset.id,
  }
}

/** 初始相识/开局过程预设（写入 relationDetailHint，可顺带带上关系标签） */
export type PersonaAiMeetingProcessPreset = {
  id: string
  label: string
  /** 写入「相遇羁绊」的过程种子 */
  detail: string
  /** 可选：同步写入初始关系 */
  relation?: string
}

export const PERSONA_AI_MEETING_PROCESS_PRESETS: readonly PersonaAiMeetingProcessPreset[] = [
  {
    id: 'reunion-elevator',
    label: '电梯重逢',
    detail: '多年未见，同栋楼电梯里猝然重逢；双方都愣住，假装看手机却谁也没先出门。',
    relation: '前任 · 仍有牵扯',
  },
  {
    id: 'early-homecoming',
    label: '提前一天回家',
    detail: '本该明日才回，今晚却提前推门；屋里灯还亮着，对方完全没料到。',
    relation: '恋人 / 稳定交往',
  },
  {
    id: 'first-night-rent',
    label: '合租首夜',
    detail: '中介交钥匙当晚第一次同住；行李还没收完，公共区域怎么用已经开始别扭。',
    relation: '合租室友',
  },
  {
    id: 'fake-couple-banquet',
    label: '假情侣出场',
    detail: '家族/同学宴上临时约定假扮情侣入场；称呼与距离都要当场演给旁人看。',
    relation: '朋友 · 常聊',
  },
  {
    id: 'online-meetup',
    label: '网友奔现',
    detail: '线上聊很久后第一次见面；声音对得上脸，气氛却比聊天记录尴尬得多。',
    relation: '网友见面',
  },
  {
    id: 'missed-date-landlord',
    label: '放鸽子后再见',
    detail: '当年放鸽子/被放鸽子的人，如今以房东与租客身份重新见面谈合同。',
    relation: '刚认识',
  },
  {
    id: 'interview-after-night',
    label: '次日面试撞脸',
    detail: '前一晚局末认识，隔天面试/入职现场坐成对面；双方都在装作第一次见。',
    relation: '上下级',
  },
  {
    id: 'hospital-corridor',
    label: '医院走廊',
    detail: '探病/陪诊在走廊撞见；旧关系还没理清，当下又不得不说几句场面话。',
    relation: '前任 · 仍有牵扯',
  },
  {
    id: 'project-forced-pair',
    label: '被迫搭档',
    detail: '领导点名两人一组交活；截止日期近，私怨只能先压着开干。',
    relation: '竞争对手',
  },
  {
    id: 'countdown-last-night',
    label: '分别前夜',
    detail: '明天一早就异地/出国；今晚最后一顿或最后一面，话在嘴边说不圆。',
    relation: '恋人 / 稳定交往',
  },
  {
    id: 'neighbor-borrow',
    label: '对门借东西',
    detail: '停水停电或忘带钥匙，第一次敲对门；借完东西却站着多聊了两句。',
    relation: '邻居',
  },
  {
    id: 'rain-share-umbrella',
    label: '暴雨同路',
    detail: '骤雨只剩一把伞/一辆顺风车；湿漉漉挤在同一段路里，不得不开口。',
    relation: '刚认识',
  },
] as const

export function applyPersonaAiMeetingProcessPreset(
  preset: PersonaAiMeetingProcessPreset,
): Pick<PersonaAiGenerateForm, 'relationDetailHint' | 'relationToUser' | 'meetingProcessPresetId'> {
  return {
    relationDetailHint: preset.detail,
    relationToUser: preset.relation?.trim() || '',
    meetingProcessPresetId: preset.id,
  }
}

/** 四格身份任一有内容时拼成生成种子 */
export function composePersonaAiIdentityArcSeed(form: PersonaAiGenerateForm): string {
  const parts = [
    form.historyCharIdentity.trim()
      ? `历史·{{char}}：${form.historyCharIdentity.trim()}`
      : '',
    form.historyUserIdentity.trim()
      ? `历史·{{user}}：${form.historyUserIdentity.trim()}`
      : '',
    form.presentCharIdentity.trim()
      ? `现在·{{char}}：${form.presentCharIdentity.trim()}`
      : '',
    form.presentUserIdentity.trim()
      ? `现在·{{user}}：${form.presentUserIdentity.trim()}`
      : '',
  ].filter(Boolean)
  return parts.join('；')
}

export const PERSONA_AI_PERSONALITY_PRESETS = [
  '温柔内敛',
  '高冷毒舌',
  '阳光社牛',
  '慢热文艺',
  '腹黑克制',
  '直球热烈',
  '理性可靠',
  '傲娇嘴硬',
  '敏感多思',
  '随性摆烂',
  '完美主义',
  '护短偏心',
] as const

/** 对外展示 vs 私下真实 · 写入 core.surface / core.trueSelf 反差种子 */
export const PERSONA_AI_SOCIAL_MASK_PRESETS = [
  '对外礼貌疏离 · 私下话多毒舌',
  '对外高冷禁欲 · 私下软萌黏人',
  '对外社牛健谈 · 私下其实社疲',
  '对外温和可靠 · 私下情绪易爆',
  '对外完美学霸 · 私下摆烂犯浑',
  '对外精英体面 · 私下爱拆台',
  '对外开朗爱笑 · 私下敏感多思',
  '对外克制距离 · 私下占有欲强',
  '对外恭敬听话 · 私下很有主见',
  '对外冷淡简短 · 私下会记小事',
  '对熟人放肆 · 对生人端着',
  '对下属严厉 · 对平级随和',
] as const

export const PERSONA_AI_OCCUPATION_PRESETS = [
  '外科医生',
  '急诊护士',
  '律所律师',
  '法官助理',
  '独立插画师',
  '平面设计师',
  '咖啡店老板',
  '调酒师',
  '大学讲师',
  '高中教师',
  '品牌策划',
  '广告文案',
  '自由摄影师',
  '记者编辑',
  '程序员',
  '产品经理',
  '投行分析师',
  '会计师',
  '飞行员',
  '空乘',
  '厨师',
  '健身教练',
  '心理咨询师',
  '研究生在读',
  '自由职业',
  '家族企业继承人',
] as const

export const PERSONA_AI_HAIR_COLOR_PRESETS = [
  '自然黑',
  '蓝黑色',
  '深棕色',
  '浅棕色',
  '栗色',
  '亚麻色',
  '蜂蜜金',
  '灰棕色',
  '银灰',
  '银白',
  '酒红',
  '暗紫',
  '雾霾蓝',
  '奶茶色',
  '渐变挑染',
] as const

export const PERSONA_AI_HAIR_STYLE_PRESETS = [
  '超短寸头',
  '短碎发',
  '侧分短发',
  '中分短发',
  '齐耳短发',
  '齐肩直发',
  '中长微卷',
  '大波浪',
  '内扣中长',
  '空气刘海',
  '齐刘海',
  '侧分碎刘海',
  '高马尾',
  '低马尾',
  '半扎发',
  '低丸子头',
  '散披肩长发',
  '狼尾短发',
  '纹理烫',
  '常戴棒球帽',
] as const

export const PERSONA_AI_BODY_SHAPE_PRESETS = [
  '骨感清瘦',
  '偏瘦高挑',
  '瘦高宽肩',
  '肩宽挺拔',
  '运动结实',
  '精干匀称',
  '柔和圆润',
  '娇小玲珑',
  '高挑模特感',
  '宽肩窄腰',
  '结实有腹肌线条',
  '微胖可爱',
  '下颌线清晰',
  '锁骨明显',
  '手指修长',
] as const

/** 眉眼 / 配饰等外貌细节（可多选） */
export const PERSONA_AI_APPEARANCE_DETAIL_PRESETS = [
  '眉眼深邃',
  '桃花眼',
  '丹凤眼',
  '卧蚕明显',
  '戴细框眼镜',
  '戴半框眼镜',
  '有耳钉',
  '耳骨钉',
  '右手腕细链',
  '左手戒指',
  '锁骨链',
  '淡妆自然',
  '素颜感',
  '唇色偏淡',
] as const

export const PERSONA_AI_OUTFIT_PRESETS = [
  '通勤白衬衫 + 西裤',
  '黑西装三件套',
  '针织开衫 + 牛仔裤',
  'oversize 卫衣',
  '高领毛衣',
  '风衣长款',
  '皮衣机车感',
  '工装裤 + 靴子',
  '运动服休闲',
  '校服 / 学院感',
  '医生白大褂场合',
  '护士服场合',
  '法庭正装',
  '咖啡馆围裙日常',
  '简约黑白极简',
  '日系干净叠穿',
  '韩系宽松层搭',
  '约会小礼服 / 正装',
  '私下家居宽松',
  '常戴棒球帽遮脸',
  '喜欢冷色系',
  '喜欢大地色',
  '配饰极少',
  '爱戴手表',
] as const

/** @deprecated 兼容旧引用；请用发色/发型/身形分栏 */
export const PERSONA_AI_APPEARANCE_PRESETS = PERSONA_AI_APPEARANCE_DETAIL_PRESETS

export const PERSONA_AI_AURA_PRESETS = [
  '清冷禁欲',
  '阳光破碎',
  '上位者压迫感',
  '克制疏离',
  '温和可靠',
  '锋利毒舌',
  '少年感干净',
  '松弛随性',
  '精英干练',
  '书卷气',
  '危险魅力',
  '安静观察型',
  '气场稳、少废话',
  '看起来难接近',
  '笑起来很软',
] as const

export const PERSONA_AI_BACKGROUND_PRESETS = [
  '小镇出来打拼',
  '单亲家庭长大',
  '留学归来',
  '转行二次起步',
  '家里期望很高',
  '曾经历重大挫折',
  '父母离异',
  '家境优渥但不亲',
  '早早独立养家',
  '学霸路线一路顺',
  '高考失利后重来',
  '职场空窗后回归',
  '有过短暂出国生活',
  '童年寄养亲戚家',
] as const

/** 兴趣爱好：原子选项，可多选 */
export const PERSONA_AI_HOBBIES_PRESETS = [
  '追剧',
  '打游戏',
  '跑步',
  '健身',
  '游泳',
  '摄影',
  '扫街',
  '烘焙',
  '下厨',
  '听歌',
  'Livehouse',
  '画画',
  '手工',
  '阅读',
  '写作',
  '养猫',
  '遛狗',
  '爬山',
  '露营',
  '集邮',
  '拼乐高',
  '看球',
  '骑行',
  '钓鱼',
  '逛展',
  '学语言',
  '喝茶',
  '咖啡品鉴',
] as const

export const PERSONA_AI_LIFE_HABITS_PRESETS = [
  '不抽烟',
  '不喝酒',
  '偶尔小酌',
  '社交才喝酒',
  '烟民但量少',
  '咖啡依赖',
  '喝茶续命',
  '熬夜党',
  '早起星人',
  '轻度洁癖',
  '重度洁癖',
  '紧张时转笔',
  '深度咖啡因依赖',
  '喜欢走路通勤',
  '手机静音党',
  '回消息很慢',
  '秒回强迫症',
  '周末必须睡懒觉',
  '健身打卡不断',
  '吃饭很挑食',
] as const

export const PERSONA_AI_PAIN_POINTS_PRESETS = [
  '被当众拆台',
  '查岗式关心',
  '道德绑架',
  '迟到放鸽子',
  '过度黏人',
  '甩锅推责',
  '打断说话',
  '无视边界',
  '翻旧账',
  '冷暴力',
  '当众起哄暧昧',
  '比较式贬低',
  '强迫分享隐私',
  '临时放鸽子不解释',
] as const

export const PERSONA_AI_SOCIAL_CIRCLE_PRESETS = [
  '家人疏离少联系',
  '两三好友深交',
  '同事客气不深',
  '圈子小但稳',
  '社交面广水交多',
  '有一个对立面/竞争者',
] as const

export const PERSONA_AI_GAP_MOE_PRESETS = [
  '外表冷 · 其实会记小事',
  '嘴上嫌弃 · 行动照顾',
  '工作狠人 · 私下社恐',
  '看起来难搞 · 熟了话多',
  '会做饭但不爱承认',
  '怕虫子但装作镇定',
  '喝醉后话变多',
  '对小动物很温柔',
  '生气时先沉默再软化',
  '假装不在意其实在听',
] as const

export const PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS = [
  '母胎单身，从未喜欢过人',
  '母胎单身',
  '暂无恋爱经历',
  '有过暗恋/好感，未表白',
  '喜欢过但未在一起',
  '谈过一段，和平分手',
  '被伤到，现在慢热',
  '有过暧昧没成',
  '刻骨铭心',
  '逢场作戏',
  '前任仍有联系',
  '前任已彻底断联',
  '长期单身，不急',
  '刚分手不久',
  '有过短暂闪婚闪离',
  '只谈过网恋',
] as const

export const PERSONA_AI_LOVE_ATTITUDE_PRESETS = [
  '慢热试探',
  '直球但怕受伤',
  '嘴硬心软',
  '边界感强',
  '占有欲克制',
  '已恋爱 · 稳定',
  '暂无恋爱意向',
  '先成为朋友再说',
  '需要大量确认',
  '喜欢但不说破',
] as const

export const PERSONA_AI_LOVE_CONTRAST_PRESETS = [
  '恋爱前冷 · 恋爱后黏',
  '恋爱前嘴硬 · 恋爱后撒娇',
  '恋爱前疏离 · 恋爱后直球',
  '吃醋不承认 · 行动占有',
  '冲突先冷战 · 冷静后哄',
  '吵架会硬刚 · 事后会道歉',
  '稳定后反而更克制',
] as const

/** 恋爱前样子 · 可多选 */
export const PERSONA_AI_LOVE_BEFORE_PRESETS = [
  '冷淡疏离',
  '礼貌距离',
  '嘴硬难靠近',
  '边界感极强',
  '慢热观察',
  '客气但不深入',
  '容易推开人',
  '习惯独处',
  '对亲密话题回避',
  '只把对方当普通熟人',
  '偶尔关心但很快收回',
  '看起来完全不在意',
] as const

/** 恋爱后样子 · 可多选 */
export const PERSONA_AI_LOVE_AFTER_PRESETS = [
  '变得黏人',
  '会主动撒娇',
  '直球表达在意',
  '私下话变多',
  '占有欲上升但仍克制',
  '习惯报备行程',
  '更愿意示弱',
  '护短偏心',
  '依赖感变强',
  '稳定后反而更克制',
  '喜欢肢体接触',
  '吃醋但不说破',
] as const

/** 吃醋的样子 · 可多选 */
export const PERSONA_AI_JEALOUSY_PRESETS = [
  '不承认自己在吃醋',
  '语气突然变短',
  '阴阳怪气',
  '假装不在意',
  '盯着对方看很久',
  '行动上更黏',
  '故意冷淡试探',
  '旁敲侧击问来问去',
  '默默记在心里',
  '直接问清楚',
  '吃醋后加倍占有',
  '吃醋时更安静',
] as const

/** 与恋人冲突的样子 · 可多选 */
export const PERSONA_AI_CONFLICT_PRESETS = [
  '先冷战再哄',
  '当场硬刚',
  '事后会道歉',
  '沉默到对方先开口',
  '讲道理压人',
  '翻旧账',
  '摔门走人又回来',
  '冷静分析问题',
  '嘴上不服气心里慌',
  '冲突时保护欲更强',
  '需要空间冷静',
  '和好后加倍温柔',
] as const

export const PERSONA_AI_SPEECH_STYLE_PRESETS = [
  '说话短',
  '少用表情',
  '爱用省略号',
  '偶尔毒舌',
  '温柔耐心',
  '偶尔方言词',
  '话多爱分享',
  '习惯用反问句',
  '语速缓慢',
  '句尾爱加「嗯」',
  '爱用「随便」',
  '爱损人但不脏',
  '正式场合很客气',
  '熟了才开玩笑',
] as const

export const PERSONA_AI_MBTI_ANY = '不限'

export const PERSONA_AI_ORIENTATION_ANY = '不限'

export const PERSONA_AI_ORIENTATION_PRESETS = [
  '异性恋',
  '同性恋',
  '双/泛性恋',
  '无性恋',
  '探索中 / 未明确',
] as const

export const PERSONA_AI_NSFW_PRESETS = [
  '慢热羞涩',
  '主动热情',
  '温柔引导型',
  '占有欲强',
  '嘴硬身体诚实',
  '重氛围轻尺度',
  '喜欢被夸奖',
  '喜欢掌控节奏',
  '喜欢被主导',
  '事后需要拥抱',
  '偏好安静亲密',
  '偏好激烈直接',
] as const

export function emptyPersonaAiGenerateForm(): PersonaAiGenerateForm {
  return {
    nameHint: '',
    avatarUrl: '',
    gender: 'female',
    ageHint: '',
    occupationHint: '',
    occupationMutable: false,
    appearanceHint: '',
    hairColorHint: '',
    hairStyleHint: '',
    bodyShapeHint: '',
    auraHint: '',
    outfitHint: '',
    mbtiHint: '',
    personalityKeywords: '',
    socialMaskHint: '',
    backgroundHint: '',
    hobbiesHint: '',
    lifeHabitsHint: '',
    painPointsHint: '',
    socialCircleHint: '',
    socialFamilyHint: '',
    socialFriendsHint: '',
    socialWorkHint: '',
    gapMoeHint: '',
    relationToUser: '',
    relationDetailHint: '',
    meetingProcessPresetId: '',
    historyCharIdentity: '',
    historyUserIdentity: '',
    presentCharIdentity: '',
    presentUserIdentity: '',
    identityArcPresetId: '',
    relationshipHistoryHint: '',
    loveAttitudeHint: '',
    loveContrastHint: '',
    loveBeforeHint: '',
    loveAfterHint: '',
    jealousyHint: '',
    conflictHint: '',
    speechStyleHint: '',
    orientationHint: '',
    orientationMutable: false,
    nsfwEnabled: false,
    nsfwHint: '',
    referencePersonaHint: '',
    referencePersonaDirectGenerate: false,
    extraNotes: '',
  }
}

function joinSeedParts(parts: string[]): string {
  return parts.map((s) => s.trim()).filter(Boolean).join('；')
}

/** 发色/发型/身形/细节 + 气质 + 分境穿搭 → 提示种子 */
export function composePersonaAiAppearanceSeed(form: PersonaAiGenerateForm): string {
  return joinSeedParts([
    form.hairColorHint.trim() ? `发色：${form.hairColorHint.trim()}` : '',
    form.hairStyleHint.trim() ? `发型：${form.hairStyleHint.trim()}` : '',
    form.bodyShapeHint.trim() ? `身形：${form.bodyShapeHint.trim()}` : '',
    form.appearanceHint.trim() ? `细节：${form.appearanceHint.trim()}` : '',
    form.auraHint.trim() ? `气质：${form.auraHint.trim()}` : '',
    form.outfitHint.trim() ? `穿搭：${form.outfitHint.trim()}` : '',
  ])
}

/** 家人/朋友/同事分栏 → 人脉种子 */
export function composePersonaAiSocialCircleSeed(form: PersonaAiGenerateForm): string {
  const split = joinSeedParts([
    form.socialFamilyHint.trim() ? `家人：${form.socialFamilyHint.trim()}` : '',
    form.socialFriendsHint.trim() ? `朋友：${form.socialFriendsHint.trim()}` : '',
    form.socialWorkHint.trim() ? `同事/下属：${form.socialWorkHint.trim()}` : '',
  ])
  return split || form.socialCircleHint.trim()
}

/** 恋爱前/后/吃醋/冲突 → 亲密反差种子 */
export function composePersonaAiLoveContrastSeed(form: PersonaAiGenerateForm): string {
  const split = joinSeedParts([
    form.loveBeforeHint.trim() ? `恋爱前：${form.loveBeforeHint.trim()}` : '',
    form.loveAfterHint.trim() ? `恋爱后：${form.loveAfterHint.trim()}` : '',
    form.jealousyHint.trim() ? `吃醋：${form.jealousyHint.trim()}` : '',
    form.conflictHint.trim() ? `冲突：${form.conflictHint.trim()}` : '',
  ])
  return split || form.loveContrastHint.trim()
}
