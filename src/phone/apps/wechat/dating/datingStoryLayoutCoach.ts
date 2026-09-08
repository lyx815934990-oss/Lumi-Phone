/** 剧情内容页 · 界面高亮引导 */

import type { MemoryCoachStep } from '../memory/memoryCoachTypes'
import { datingStoryLayoutTutorialBody } from './datingStoryLayoutTutorialCopy'

export const DATING_STORY_COACH_TARGET_ATTR = 'data-dating-story-coach'
export const DATING_STORY_COACH_ROOT_ATTR = 'data-dating-story-coach-root'
export const DATING_STORY_COACH_SCOPE = 'dating-story-layout'
/** v5：补标题栏重置进度 + 左侧楼层目录 */
export const DATING_STORY_LAYOUT_COACH_SEEN_KEY = 'dating-story-layout-coach-completed-v5'

export const DATING_STORY_LAYOUT_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: null,
    centered: true,
    title: '这是什么',
    body: datingStoryLayoutTutorialBody('这是什么'),
  },
  {
    target: 'sr-header',
    title: '标题栏',
    body: datingStoryLayoutTutorialBody('标题栏'),
    cardPlacement: 'below',
  },
  {
    target: 'sr-worldbook',
    title: '全局档案室世界书',
    body: datingStoryLayoutTutorialBody('全局档案室世界书'),
    cardPlacement: 'below',
  },
  {
    target: 'sr-mode-switch',
    title: '模式切换',
    body: datingStoryLayoutTutorialBody('模式切换'),
    cardPlacement: 'below',
  },
  {
    target: 'sr-look',
    title: '外观',
    body: datingStoryLayoutTutorialBody('外观'),
    cardPlacement: 'below',
  },
  {
    target: 'sr-reset',
    title: '重置进度',
    body: datingStoryLayoutTutorialBody('重置进度'),
    cardPlacement: 'below',
  },
  {
    target: 'sr-tutorial',
    title: '教程在右上角',
    body: '随时点这里打开剧情页说明，或再走一遍高亮引导。场控里的参数说明在 ⌘ 面板顶部单独看。',
    cardPlacement: 'below',
  },
  {
    target: 'sr-feed',
    title: '剧情卡片',
    body: datingStoryLayoutTutorialBody('剧情卡片'),
    cardPlacement: 'below',
  },
  {
    target: 'sr-floor',
    title: '楼层目录',
    body: datingStoryLayoutTutorialBody('楼层目录'),
    cardPlacement: 'auto',
  },
  {
    target: 'sr-director-bar',
    title: '底部导演控台',
    body: datingStoryLayoutTutorialBody('底部导演控台'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-god',
    title: '上帝视角',
    body: datingStoryLayoutTutorialBody('上帝视角'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-director',
    title: '导演模式',
    body: datingStoryLayoutTutorialBody('导演模式'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-side',
    title: '侧幕叙写',
    body: datingStoryLayoutTutorialBody('侧幕叙写'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-parallel',
    title: '平行事件',
    body: datingStoryLayoutTutorialBody('平行事件'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-if',
    title: 'IF 线',
    body: datingStoryLayoutTutorialBody('IF 线'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-continue',
    title: '续写方向',
    body: datingStoryLayoutTutorialBody('续写方向'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-mode-npc',
    title: '人脉 NPC 插入',
    body: datingStoryLayoutTutorialBody('人脉 NPC 插入'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-advanced',
    title: '场控中心入口',
    body: datingStoryLayoutTutorialBody('场控中心入口'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-insert-quote',
    title: '插入对白',
    body: datingStoryLayoutTutorialBody('插入对白'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-insert-os',
    title: '插入内心 OS',
    body: datingStoryLayoutTutorialBody('插入内心 OS'),
    cardPlacement: 'above',
  },
  {
    target: 'sr-heart-whisper',
    title: '心语',
    body: datingStoryLayoutTutorialBody('心语'),
    cardPlacement: 'above',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '开始写吧',
    body: '标题栏可开世界书、切普通/VN、调外观；红色箭头可重置进度；左侧「楼层」可跳转与调可见层数。都不勾上帝 / 侧幕时按混合视角续写。卡住用续写方向；输入可用 "" 与 **；心形是心语。场控细则在 ⌘「场控说明」。',
  },
]
