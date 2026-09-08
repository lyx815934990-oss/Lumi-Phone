/** 高级场控中心 · 界面高亮引导 */

import type { MemoryCoachStep } from '../memory/memoryCoachTypes'
import { datingAdvancedControlTutorialBody } from './datingAdvancedControlTutorialCopy'

export const DATING_ADVANCED_CONTROL_COACH_TARGET_ATTR = 'data-ac-coach'
export const DATING_ADVANCED_CONTROL_COACH_ROOT_ATTR = 'data-ac-coach-root'
export const DATING_ADVANCED_CONTROL_COACH_SCOPE = 'dating-advanced-control'
/** v2：补齐面板内 data-ac-coach 锚点与「高亮引导」按钮 */
export const DATING_ADVANCED_CONTROL_COACH_SEEN_KEY = 'dating-advanced-control-coach-completed-v2'

export const DATING_ADVANCED_CONTROL_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: null,
    centered: true,
    title: '场控中心是什么',
    body: datingAdvancedControlTutorialBody('场控中心是什么'),
  },
  {
    target: 'ac-help',
    title: '场控说明入口',
    body: '标题右侧「场控说明」打开文字版；「高亮引导」会逐个点亮下面每个开关并说明作用。随时可从这里重看。',
    cardPlacement: 'below',
  },
  {
    target: 'ac-perspective',
    title: '人称选择',
    body: datingAdvancedControlTutorialBody('人称选择'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-length',
    title: '目标字数',
    body: datingAdvancedControlTutorialBody('目标字数'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-pace',
    title: '时间推进',
    body: datingAdvancedControlTutorialBody('时间推进'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-thinking',
    title: '思维链',
    body: datingAdvancedControlTutorialBody('思维链'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-interrupt',
    title: '抢话与否',
    body: datingAdvancedControlTutorialBody('抢话与否'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-comment',
    title: '评论模式',
    body: datingAdvancedControlTutorialBody('评论模式'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-theater',
    title: '小剧场',
    body: datingAdvancedControlTutorialBody('小剧场'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-danmaku',
    title: '弹幕模式',
    body: datingAdvancedControlTutorialBody('弹幕模式'),
    cardPlacement: 'below',
  },
  {
    target: 'ac-language',
    title: '输出与翻译',
    body: datingAdvancedControlTutorialBody('输出与翻译'),
    cardPlacement: 'above',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '调好再写',
    body: '这些开关随当前角色存档。改完关上面板继续续写即可；想再看说明可点标题右侧「场控说明」或「高亮引导」。',
  },
]
