import type { CurtainCastSlot, CurtainFoldPoint, CurtainQuest } from './types'
import { CAMPUS_LOCATIONS } from './locations'

function fold(
  id: string,
  title: string,
  body: string,
  choices: CurtainFoldPoint['choices'],
  triggerAt?: number,
): CurtainFoldPoint {
  return {
    id,
    title,
    body,
    choices,
    ...(triggerAt != null ? { triggerAt } : {}),
  }
}

function seat(id: string, title: string, brief: string): CurtainCastSlot {
  return { id, title, brief }
}

/** 选幕厅横向坐标笺（柔和黑白；代号用英文 FILE 标签） */
export const CURTAIN_QUEST_PRESETS: CurtainQuest[] = [
  {
    id: 'summer-transfer-year',
    theme: '白杨中学的转学名单',
    fileCode: 'FILE 06: SUMMER TRANSFER YEAR',
    timeLimit: 60,
    mainGoal:
      '在校庆晚会开幕铃响前，让节目终稿过审且无人罢演；澄清三年前事故对当事人的持续伤害；并以公开并肩的痕迹收束这两个月',
    synopsis:
      '当代市重点高中「白杨中学」，高二上学期。你们是本学期临时塞进名单的插班生——对外是调动/借读，戏中当作自己的人生来过。学校无超能力、无奇异规则，只有晚自习铃、月考排名与报销单。七十五周年校庆倒计时约六十日；三年前曾有一场被压成「设备故障」的节目事故，今年领导极度敏感。五席任选其二入戏，其余为校园 NPC。一轮约等于一日；幕间可随时用现代记忆私下交谈。感情线保持暗线克制。',
    prologue:
      '九月初，白杨中学的蝉声退了一半，晚铃还没学会新学期的节奏。\n教务处临时塞进两名插班生——就是你们。对外说法是工作调动或借读名额；对内，座位表多了两格空白，像被人用修正液轻轻盖过。\n这所学校没有奇迹，只有月考排名、社团报销单，以及人人都会嘴硬的青春。七十五周年校庆倒计时约六十日。三年前一场节目事故被写成「设备故障」，今年领导仍极度敏感：经费卡得死，人与人互相防备。\n谣言会先于真相抵达。你们将在日程里遇见招新摊的火药、失踪的旧串词本、树洞匿名贴、天台未说完的录音，以及一把伞的距离。\n感情请克制成暗线。幕令是软锚——合作抵达校庆开幕前的终局，但不必把每一天都过成任务清单。',
    roles: { userRole: '插班生·文静组', charRole: '插班生·外向组' },
    locations: CAMPUS_LOCATIONS,
    cast: [
      seat(
        'transfer-a',
        '插班生·文静组',
        '成绩中上、话少、观察力强；被老师安排「尽快融入」。书包里还有未拆完的旧校铭牌。对「被需要」很敏感，容易成为被保护或被误会的那一个。',
      ),
      seat(
        'transfer-b',
        '插班生·外向组',
        '很快学会叫人外号，也被怀疑「是不是来刷综评」。其实只是怕冷场；嘴快心软，容易先惹祸再补救。',
      ),
      seat(
        'student-union',
        '学生会文艺部干事',
        '管节目单与彩排签到。表面公事公办，私下最怕校庆翻车被记过。习惯用任务靠近人，难开口「我想见你」。',
      ),
      seat(
        'broadcast',
        '广播站晚间主播',
        '嗓音稳，台下别扭。与某人因一句话冷战过；口袋里常有未发出的改词便签。用声音靠近，用沉默推开。',
      ),
      seat(
        'yearbook',
        '校刊摄影记者',
        '肩挂旧相机，专钻侧幕与天桥。嘴上说「我只记录」，其实很会旁敲侧击；镜头里藏偏爱，不敢直说。',
      ),
    ],
    foldPoints: [
      fold(
        'fp-blank-seat',
        '名单上的空白',
        '开学典礼，广播念插班生名单时卡壳一秒。临时学生证照片栏是白的——教务说「下午补拍」。同桌起哄：是不是幽灵转学生。',
        [
          { id: 'a', label: '笑着接梗融入', progressDelta: 5 },
          { id: 'b', label: '认真纠正称呼', progressDelta: 6 },
          { id: 'c', label: '先找老师问清楚', progressDelta: 7 },
        ],
        1,
      ),
      fold(
        'fp-club-fair',
        '社团招新摊',
        '操场招新。文艺部缺人手，广播站缺敢说话的，校刊缺肯熬夜排版的。有人当众说：插班生别抢综评名额。全场静了三秒。',
        [
          { id: 'a', label: '当场怼回去', progressDelta: 6 },
          { id: 'b', label: '装作没听见去报名', progressDelta: 7 },
          { id: 'c', label: '拉同行者一起挑摊', progressDelta: 8 },
        ],
        4,
      ),
      fold(
        'fp-missing-cue',
        '消失的旧串词本',
        '道具组清点仓库：三年前校庆备份串词本袋封条被撕，内页抽走几张。公开说法是老鼠咬的。有人拍到侧门有人匆匆出门，脸没拍清。学生会要求别外传。',
        [
          { id: 'a', label: '查仓库出入记录', progressDelta: 8 },
          { id: 'b', label: '找摄影要底片', progressDelta: 7 },
          { id: 'c', label: '侧门蹲守线人', progressDelta: 6 },
        ],
        9,
      ),
      fold(
        'fp-cold-war',
        '对讲机里的沉默',
        '双主持人彩排因走位吵翻：一人摔对讲机，一人把改词便签撕了却没扔掉。开场节目面临无人肯同台。',
        [
          { id: 'a', label: '分开谈、再牵线', progressDelta: 7 },
          { id: 'b', label: '拿出改词便签做桥', progressDelta: 9 },
          { id: 'c', label: '先保排练、事后再算', progressDelta: 5 },
        ],
        14,
      ),
      fold(
        'fp-anonymous',
        '匿名树洞贴',
        '校园树洞长帖暗示三年前事故是人为，并点名某干部包庇。评论区开撕。教导处约谈。新人容易被拿来背锅。',
        [
          { id: 'a', label: '私下核验三条线索', progressDelta: 8 },
          { id: 'b', label: '先自保、少发言', progressDelta: 5 },
          { id: 'c', label: '幕间商量要不要查', progressDelta: 7 },
        ],
        18,
      ),
      fold(
        'fp-midterm',
        '月考与彩排撞车',
        '月考周撞上节目冻结名单。有人因缺席彩排被移出节目单，当众哭或摔门。友谊与合作出现第一次实质性裂痕。',
        [
          { id: 'a', label: '帮对方谈替换方案', progressDelta: 8 },
          { id: 'b', label: '先保住自己的名额', progressDelta: 5 },
          { id: 'c', label: '通宵补课再赶彩排', progressDelta: 7 },
        ],
        22,
      ),
      fold(
        'fp-roof',
        '天台录音',
        '有人在天台录到半段对话：有人承认当年是为了掩护朋友才撒谎。录音不完整，传出去会毁人。持有者找你们商量。',
        [
          { id: 'a', label: '封存、只给当事人', progressDelta: 9 },
          { id: 'b', label: '交给可信的老师', progressDelta: 7 },
          { id: 'c', label: '公开澄清（高风险）', progressDelta: 5 },
        ],
        28,
      ),
      fold(
        'fp-betrayal',
        '站队',
        '学生会内部会议泄密：有人把你们私下判断传给对立方。会议室里有人说：外校来的，别插手本校旧账。信任崩一角。',
        [
          { id: 'a', label: '当面把话说到桌上', progressDelta: 8 },
          { id: 'b', label: '查出泄密路径', progressDelta: 7 },
          { id: 'c', label: '先冷处理止损', progressDelta: 5 },
        ],
        33,
      ),
      fold(
        'fp-parent-day',
        '家长会短信',
        '班级群家长阴阳：插班生占资源。班主任和善约谈，压力明确——别给班级惹事。舆论压到身份焦虑。',
        [
          { id: 'a', label: '用成绩与贡献说话', progressDelta: 7 },
          { id: 'b', label: '请班主任公开澄清', progressDelta: 6 },
          { id: 'c', label: '忍着把校庆先扛完', progressDelta: 5 },
        ],
        38,
      ),
      fold(
        'fp-umbrella',
        '一把伞的距离',
        '大雨，外景彩排取消。共伞回宿舍区的路上，遇到冷战中的一方在躲雨哭。去劝会被误会站队；走开会被记恨。',
        [
          { id: 'a', label: '把伞让出去劝', progressDelta: 8 },
          { id: 'b', label: '装作没看见走过', progressDelta: 4 },
          { id: 'c', label: '只递纸巾、不站队', progressDelta: 7 },
        ],
        42,
      ),
      fold(
        'fp-final-draft',
        '终稿被拒',
        '节目单终稿被打回：某节目「格调问题」要求替换。原表演者扬言罢演，替换者被骂踩着别人上去。七十二小时内要可过审方案。',
        [
          { id: 'a', label: '改词保留原班底', progressDelta: 9 },
          { id: 'b', label: '合并节目各让一步', progressDelta: 8 },
          { id: 'c', label: '换节目保过审', progressDelta: 5 },
        ],
        48,
      ),
      fold(
        'fp-truth-table',
        '旧礼堂侧幕',
        '关键人被约到侧幕对质。三年前不是阴谋，是慌乱、包庇与错估；有人用谎言保护朋友，却把另一人推进更久的孤立。重点是停止继续伤害。',
        [
          { id: 'a', label: '促成当面道歉', progressDelta: 9 },
          { id: 'b', label: '小范围签字确认', progressDelta: 8 },
          { id: 'c', label: '只让当事人私下和解', progressDelta: 7 },
        ],
        52,
      ),
      fold(
        'fp-curtain',
        '开幕铃',
        '观众入场。提词器或打印页仍可能出小事故。需要临场顶上：节目能否开演、冲突方是否同台、你们是否留下公开并肩的痕迹。',
        [
          { id: 'a', label: '临场默契顶上', progressDelta: 8 },
          { id: 'b', label: '两人并肩救场', progressDelta: 10 },
          { id: 'c', label: '换人顶上保开演', progressDelta: 6 },
        ],
        56,
      ),
      fold(
        'fp-afterglow',
        '校庆后的空教室',
        '晚会结束，礼堂撤台。有人留下未署名感谢信或一张合影。适合摘下戏服，用真身谈这两个月像不像一场没说破的靠近。',
        [
          { id: 'a', label: '幕间轻声说破', progressDelta: 8 },
          { id: 'b', label: '先并肩不说破', progressDelta: 7 },
          { id: 'c', label: '约定戏外再谈', progressDelta: 6 },
        ],
        58,
      ),
    ],
  },
  {
    id: 'late-bell-campus',
    theme: '白杨校道的晚钟',
    fileCode: 'FILE 05: LATE BELL CAMPUS',
    timeLimit: 28,
    mainGoal: '在校庆晚会开幕铃响前，找回失踪的开场串词本，并让闹翻的双主持人重新同台',
    synopsis:
      '九月末的白杨校道，蝉声退尽，晚自习铃还没响。校庆晚会倒计时两小时，开场串词本从礼堂侧幕消失；两位原定主持人互不理睬。五席身份任选其二入戏，其余三人将作为校园里的真人 NPC 走动、传话、挡路或递线索。',
    prologue:
      '九月末，白杨校道的影子被拉得很长。\n校庆晚会倒计时两小时。侧幕桌上的开场串词本不见了；两位原定主持人互不理睬，对讲机里只剩忙音。\n有人说本子进过道具间，有人说被带去广播站改词。摄影记者的底片里，也许留着一个神色匆匆的背影。\n开幕铃不会等人。你们要在余光耗尽前，把失踪的本子与闹翻的同台，一并找回来。',
    roles: { userRole: '学生会秘书长', charRole: '广播站晚间主播' },
    locations: CAMPUS_LOCATIONS,
    cast: [
      seat(
        'secretary',
        '学生会秘书长',
        '表面稳得住场，其实日程表密到喘不过气。最怕校庆翻车，对「串词本失踪」比谁都心急；习惯用礼貌句压住火气，急了会轻轻咬后槽牙。',
      ),
      seat(
        'broadcaster',
        '广播站晚间主播',
        '嗓音干净，台上从容，台下别扭。与另一位主持人因彩排走位吵过一架，现在谁也不肯先低头；口袋里其实还留着对方写过的改词便签。',
      ),
      seat(
        'photographer',
        '校刊摄影记者',
        '肩挂旧相机，专钻侧幕与天桥抓拍。下午在道具间门口拍到有人神色匆匆出门，底片里也许有串词本去向；嘴上说「我只拍照」，其实很会旁敲侧击。',
      ),
      seat(
        'transfer',
        '转校插班生',
        '入学不到一月，脸生反而好问。不站队、不记仇，能从各席嘴里问出熟人不好问的话；书包里夹着本校地图，还没走熟礼堂后巷。',
      ),
      seat(
        'prop-keeper',
        '礼堂道具组组长',
        '管着仓库钥匙与幕后通道。最后确认看见串词本，是在道具间铁皮柜附近；对人客气，但对「乱翻道具」零容忍，被逼急了会端出规章口吻。',
      ),
    ],
    foldPoints: [
      fold(
        'fp-missing-script',
        '侧幕空了',
        '开场前两小时，侧幕桌上空空如也。有人说看见本子进过道具间，也有人说被带去广播站改词。',
        [
          { id: 'a', label: '先搜道具间', progressDelta: 16 },
          { id: 'b', label: '去广播站对质', progressDelta: 12 },
          { id: 'c', label: '调摄影记者的底片', progressDelta: 14 },
        ],
      ),
      fold(
        'fp-two-hosts',
        '对讲机里的沉默',
        '双主持人仍不肯同框。继续各说各的会误开场；若强行撮合，可能把积怨当众掀开。',
        [
          { id: 'a', label: '分开谈、再牵线', progressDelta: 15 },
          { id: 'b', label: '拿出改词便签做桥', progressDelta: 18 },
          { id: 'c', label: '先保开场、事后再算', progressDelta: 10 },
        ],
      ),
      fold(
        'fp-curtain-call',
        '开幕铃将响',
        '观众开始入场。串词本若还没齐，只能靠默契临场；若已找回，还差主持人愿不愿意并肩站上。',
        [
          { id: 'a', label: '临场默契顶上', progressDelta: 12 },
          { id: 'b', label: '把本子塞进对方手里', progressDelta: 20 },
          { id: 'c', label: '换人救场（风险）', progressDelta: 8 },
        ],
      ),
    ],
  },
  {
    id: 'victorian-shadow',
    theme: '十九世纪伦敦雾都',
    fileCode: 'FILE 01: THE VICTORIAN SHADOW',
    timeLimit: 24,
    mainGoal: '在晚宴之前取得那封被封蜡的邀请函',
    roles: { userRole: '流亡的远亲贵族', charRole: '雾巷里的私家侦探' },
    ambienceUrl: undefined,
    foldPoints: [
      fold(
        'fp-invite',
        '信笺被调换',
        '管家声称邀请函从未送达。走廊尽头有两扇门：一侧是书房，一侧是仆人梯。',
        [
          { id: 'a', label: '先搜书房', progressDelta: 18 },
          { id: 'b', label: '跟仆人梯下去', progressDelta: 12 },
          { id: 'c', label: '当面拆穿管家', progressDelta: 8 },
        ],
      ),
      fold(
        'fp-ballroom',
        '舞池中央的对视',
        '有人正朝你走来寒暄。继续周旋能套话，但会耽误寻找信笺的时机。',
        [
          { id: 'a', label: '周旋套话', progressDelta: 14 },
          { id: 'b', label: '借故离场', progressDelta: 10 },
        ],
      ),
    ],
  },
  {
    id: 'neon-harbor',
    theme: '雨夜赛博港湾',
    fileCode: 'FILE 02: NEON HARBOR',
    timeLimit: 20,
    mainGoal: '在港口封锁前，把两名离散的船员重新牵到同一艘船上',
    roles: { userRole: '数据走私中间人', charRole: '退役义体保镖' },
    foldPoints: [
      fold(
        'fp-dock',
        '闸口扫描',
        '安检光幕开始逐人过检。你们只有伪造通行码、贿赂岗哨、或潜入货柜三条路。',
        [
          { id: 'a', label: '伪造通行码', progressDelta: 16 },
          { id: 'b', label: '低调贿赂', progressDelta: 12 },
          { id: 'c', label: '潜入货柜', progressDelta: 20 },
        ],
      ),
    ],
  },
  {
    id: 'academy-veil',
    theme: '石廊魔法学院',
    fileCode: 'FILE 03: ACADEMY VEIL',
    timeLimit: 22,
    mainGoal: '在午夜钟声前，找到通往旧图书馆禁区的钥匙纹样',
    roles: { userRole: '转校旁听生', charRole: '守夜的高年级学长' },
    foldPoints: [
      fold(
        'fp-key',
        '纹样残缺',
        '钥匙纹样少了一角。传闻缺角藏在星象塔，也有人说在校长的怀表里。',
        [
          { id: 'a', label: '去星象塔', progressDelta: 15 },
          { id: 'b', label: '接近校长', progressDelta: 11 },
        ],
      ),
    ],
  },
  {
    id: 'silk-court',
    theme: '垂花宫廷长廊',
    fileCode: 'FILE 04: SILK COURT',
    timeLimit: 26,
    mainGoal: '在朝会之前，暗中促成两位本不往来的贵胄互通心意',
    roles: { userRole: '外来的织绣使', charRole: '殿前近侍' },
    foldPoints: [
      fold(
        'fp-letter',
        '诗笺被截',
        '本该送到的诗笺落在了第三人手里。你们可以追回、改写，或干脆当面递话。',
        [
          { id: 'a', label: '追回原笺', progressDelta: 14 },
          { id: 'b', label: '改写误导', progressDelta: 10 },
          { id: 'c', label: '当面递话', progressDelta: 18 },
        ],
      ),
    ],
  },
]

export function cloneQuest(quest: CurtainQuest): CurtainQuest {
  return {
    ...quest,
    roles: { ...quest.roles },
    cast: quest.cast?.map((s) => ({ ...s })),
    locations: quest.locations?.map((l) => ({ ...l })),
    foldPoints: quest.foldPoints?.map((fp) => ({
      ...fp,
      choices: fp.choices.map((c) => ({ ...c })),
    })),
  }
}
