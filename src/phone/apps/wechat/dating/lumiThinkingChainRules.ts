/**
 * 约会页 system：必注入核心（offlineDatingMustInjectPrompts）
 * + 本文件仅追加「档案室可选预设」短注/全文。
 *
 * 旧统一册 / NSFW 分册 / 纠错便签等已停用，不再导出。
 */

import {
  buildOfflineDatingMustInjectCore,
  buildOfflineDatingThinkingChainBooksPrompt,
} from './offlineDatingMustInjectPrompts'
import type { DatingWritingPresetToggles } from './datingWritingPresets'
import { OFFLINE_DATING_FASHION_STYLING_APPENDIX } from './offlineDatingFashionStylingAppendix'
import { OFFLINE_DATING_COUPLE_INTIMACY_POSE_APPENDIX } from './offlineDatingCoupleIntimacyPoseAppendix'
import type { LoreArchiveBuiltinPresetToggles } from '../../../worldbook/loreArchiveBuiltinPresets'
import { resolveLoreArchiveBuiltinPresetToggles } from '../../../worldbook/loreArchiveBuiltinPresets'
import { CUISINE_RECIPE_WORLD_BOOK_APPENDIX } from '../../../worldbook/cuisineRecipeWorldBookAppendix'
import { DIRECT_ANSWER_NO_PROBE_APPENDIX } from '../../../worldbook/directAnswerNoProbeAppendix'
import { PASSIONATE_DIRECT_BALL_APPENDIX } from '../../../worldbook/passionateDirectBallAppendix'
import { REALISTIC_CONFLICT_APPENDIX } from '../../../worldbook/realisticConflictAppendix'
import { REALISTIC_AUTONOMY_APPENDIX } from '../../../worldbook/realisticAutonomyAppendix'
import { GENTLE_OLDER_BROTHER_APPENDIX } from '../../../worldbook/gentleOlderBrotherAppendix'
import { AUTONOMOUS_SOCIAL_LIFE_APPENDIX } from '../../../worldbook/autonomousSocialLifeAppendix'
import { SCHOOL_CAMPUS_COMMON_KNOWLEDGE_APPENDIX } from '../../../worldbook/schoolCampusCommonKnowledgeAppendix'

/** @deprecated 请用 buildOfflineDatingThinkingChainBooksPrompt */
export function buildLumiThinkingChainBooksPrompt(
  toggles?: LoreArchiveBuiltinPresetToggles | null,
): string {
  return buildOfflineDatingThinkingChainBooksPrompt(toggles)
}

/** @deprecated */
export const LUMI_THINKING_CHAIN_BOOKS_PROMPT = buildLumiThinkingChainBooksPrompt()

export function buildDatingStyleSystemPrompt(
  toggles?: LoreArchiveBuiltinPresetToggles | null,
  opts?: {
    thinkingChainEnabled?: boolean
    writingPresets?: DatingWritingPresetToggles | null
    /** 传入字符串时替换全部内置线下 must-inject，仅用自定义正文 */
    customWritingPrompt?: string | null
  },
): string {
  const thinkingChainEnabled = opts?.thinkingChainEnabled !== false
  const usingCustom = typeof opts?.customWritingPrompt === 'string'
  const resolved = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const innerOsPresetNote = resolved.offlineRichInnerOs
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·多内心 OS·已开启】默认 OS 篇幅规则不适用；以思维链内【线下约会·多内心 OS 描写引擎】为准（单条不少于 45 汉字）。`
      : `\n\n【档案室预设·多内心 OS·已开启】默认 OS 篇幅规则不适用；内心 OS 单条不少于 45 汉字，宜多条、有信息量。`
    : ''
  const fashionPresetNote = resolved.offlineFashionStyling
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·穿搭造型·已开启】衣着禁止「深灰卫衣+黑运动裤+帆布鞋」等敷衍三件套；须写廓形/面料/剪裁/配饰或鞋履设计（详见思维链【线下约会·穿搭造型描写引擎】）。`
      : `\n\n【档案室预设·穿搭造型·已开启】\n${OFFLINE_DATING_FASHION_STYLING_APPENDIX}`
    : ''
  const intimacyPosePresetNote = resolved.offlineCoupleIntimacyPoses
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·耳后三厘米经济特区·已开启】亲密可写具体姿势与贴耳短句；**文风必须服从【线下剧情扮演总规则】**（写动作不写术语名、禁油腻感官堆砌、禁侮辱幼化）。详情见思维链特区条文，与总规则冲突时以总规则为准。`
      : `\n\n【档案室预设·耳后三厘米经济特区·已开启】姿势参考如下，但正文文风以【线下剧情扮演总规则】为准（冲突时改写总成本规则写法）：\n${OFFLINE_DATING_COUPLE_INTIMACY_POSE_APPENDIX}`
    : ''
  const cuisinePresetNote = resolved.cuisineRecipeAtlas
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·来吃点丰盛的好不好·已开启】进食/点菜/下厨须落具体菜名与风味，禁止「随便吃点」（详见思维链【来吃点丰盛的好不好】）；寻味外卖指令仍只用系统菜单。`
      : `\n\n【档案室预设·来吃点丰盛的好不好·已开启】\n${CUISINE_RECIPE_WORLD_BOOK_APPENDIX}`
    : ''
  const directAnswerPresetNote = resolved.directAnswerNoProbe
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·别再问怎么了·已开启】{{user}} 已说出内容时须直接接住/回答，禁止默认「怎么了」「为什么这样说」（详见思维链【别再问怎么了】）。`
      : `\n\n【档案室预设·别再问怎么了·已开启】\n${DIRECT_ANSWER_NO_PROBE_APPENDIX}`
    : ''
  const passionateDirectPresetNote = resolved.passionateDirectBall
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·别再嘴硬硬损了·已开启】有心动/喜欢/心疼时须热烈直球；禁「等着/回去收拾你」当主轴（详见思维链【别再嘴硬硬损了】）。`
      : `\n\n【档案室预设·别再嘴硬硬损了·已开启】\n${PASSIONATE_DIRECT_BALL_APPENDIX}`
    : ''
  const realisticConflictPresetNote = resolved.realisticConflict
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·正经吵架可以的·已开启】允许正常矛盾与僵持；禁止 char 自我说服秒和好；和好须有台阶（详见思维链【正经吵架可以的】）。冲突场景下本预设优先于「必须直球哄」。`
      : `\n\n【档案室预设·正经吵架可以的·已开启】\n${REALISTIC_CONFLICT_APPENDIX}`
    : ''
  const realisticAutonomyPresetNote = resolved.realisticAutonomy
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·现实一点·已开启】想好好在一起的互相独立：自爱；拒绝须认真沟通（说清理由/下一步），禁敷衍逃责；可为现实取舍；可不时刻哄；可疲惫/必要时吵架或提分开；贴人设非挑事（详见思维链【现实一点】）。现实权衡时优先于「必须牺牲成全」，但不得变甩锅。`
      : `\n\n【档案室预设·现实一点·已开启】\n${REALISTIC_AUTONOMY_APPENDIX}`
    : ''
  const gentleBrotherPresetNote = resolved.gentleOlderBrother
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·能不能温柔一点·已开启】稳核年上照顾：主动、又说又做、动作轻柔、时刻考虑感受；禁油腻用力过猛（详见思维链【能不能温柔一点】）。非冲突日常优先本气质；与「正经吵架可以的」并存时冲突戏仍可僵持。`
      : `\n\n【档案室预设·能不能温柔一点·已开启】\n${GENTLE_OLDER_BROTHER_APPENDIX}`
    : ''
  const autonomousLifePresetNote = resolved.autonomousSocialLife
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·我也有自己的生活·已开启】自主日常+群像；宜有具体碎片与可辨认他人；禁没朋友/无所事事真空（详见思维链【我也有自己的生活】）。`
      : `\n\n【档案室预设·我也有自己的生活·已开启】\n${AUTONOMOUS_SOCIAL_LIFE_APPENDIX}`
    : ''
  const schoolCampusPresetNote = resolved.schoolCampusCommonKnowledge
    ? thinkingChainEnabled
      ? `\n\n【档案室预设·校园与升学常识·已开启】涉校园/艺考/高考/大学时按常识锚点写（纪律处分、艺考集训招录、查分志愿、课表实习；详见思维链【校园与升学常识】）。`
      : `\n\n【档案室预设·校园与升学常识·已开启】\n${SCHOOL_CAMPUS_COMMON_KNOWLEDGE_APPENDIX}`
    : ''
  const core = buildOfflineDatingMustInjectCore({
    thinkingChainEnabled,
    toggles,
    writingPresets: opts?.writingPresets,
    customWritingPrompt: usingCustom ? opts?.customWritingPrompt : null,
  })
  // 自定义写作预设：不叠档案室短注（避免与「完全按自定义」冲突）；档案室仍可由世界书条目注入
  if (usingCustom) return core
  return (
    core +
    `${innerOsPresetNote}${fashionPresetNote}${intimacyPosePresetNote}${cuisinePresetNote}${directAnswerPresetNote}${passionateDirectPresetNote}${realisticConflictPresetNote}${realisticAutonomyPresetNote}${gentleBrotherPresetNote}${autonomousLifePresetNote}${schoolCampusPresetNote}`
  )
}

/** 默认全开（与档案室内置预设默认一致） */
export const DATING_STYLE_SYSTEM_PROMPT = buildDatingStyleSystemPrompt()
