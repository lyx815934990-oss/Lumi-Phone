/** 私藏侧写 · 界面高亮引导（列表 / 档案分工，正文与对应教程同源） */

import type { MemoryCoachStep } from '../memory/memoryCoachTypes'
import { obsNotesDetailTutorialBody, obsNotesHubTutorialBody } from './observationNotesTutorialCopy'

export const OBS_NOTES_COACH_TARGET_ATTR = 'data-obs-notes-coach'
export const OBS_NOTES_COACH_ROOT_ATTR = 'data-obs-notes-coach-root'
export const OBS_NOTES_HUB_COACH_SCOPE = 'obs-notes-hub'
export const OBS_NOTES_DETAIL_COACH_SCOPE = 'obs-notes-detail'
/** v3：补上「点击卡片看详情」引导；自动弹出即记已读 */
export const OBS_NOTES_HUB_COACH_SEEN_KEY = 'obs-notes-hub-coach-completed-v3'
/** v3：去掉心动/深刻引导（改由向量记忆召回） */
export const OBS_NOTES_DETAIL_COACH_SEEN_KEY = 'obs-notes-detail-coach-completed-v3'

export const OBS_NOTES_HUB_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: null,
    centered: true,
    title: '这是什么',
    body: obsNotesHubTutorialBody('这是什么'),
  },
  {
    target: null,
    centered: true,
    title: '有什么用',
    body: obsNotesHubTutorialBody('有什么用'),
  },
  {
    target: 'obs-hub-auto-switch',
    title: '开启「自动更新」时',
    body: obsNotesHubTutorialBody('开启「自动更新」时'),
    cardPlacement: 'below',
  },
  {
    target: 'obs-hub-auto-switch',
    title: '关闭自动更新时',
    body: obsNotesHubTutorialBody('关闭自动更新时'),
    cardPlacement: 'below',
  },
  {
    target: 'obs-hub-card',
    title: '点击卡片看详情',
    body: obsNotesHubTutorialBody('点击卡片看详情'),
    cardPlacement: 'below',
  },
  {
    target: 'obs-hub-tutorial',
    title: '怎么再看说明',
    body: obsNotesHubTutorialBody('怎么再看说明'),
    cardPlacement: 'below',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '下一步',
    body: '点开一张角色卡片进入档案；手动更新与字段说明在档案页教程里。',
  },
]

export const OBS_NOTES_DETAIL_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: 'obs-detail-manual',
    title: '手动更新',
    body: obsNotesDetailTutorialBody('手动更新'),
    cardPlacement: 'below',
  },
  {
    target: 'obs-detail-history',
    title: '更新历史',
    body: obsNotesDetailTutorialBody('更新历史'),
    cardPlacement: 'below',
  },
  {
    target: null,
    centered: true,
    title: '删剧情会回滚吗',
    body: obsNotesDetailTutorialBody('删剧情会回滚吗'),
  },
  {
    target: 'obs-detail-tutorial',
    title: '怎么再看说明',
    body: obsNotesDetailTutorialBody('怎么再看说明'),
    cardPlacement: 'below',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '可以开始翻了',
    body: '自动更新仍在列表页开关；这里负责细看与手动整理。',
  },
]
