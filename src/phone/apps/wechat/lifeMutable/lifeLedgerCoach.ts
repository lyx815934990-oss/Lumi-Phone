/** 人生账本 · 界面高亮引导（正文与文字教程同源） */

import type { MemoryCoachStep } from '../memory/memoryCoachTypes'
import { lifeLedgerTutorialBody } from './lifeLedgerTutorialCopy'

export const LIFE_LEDGER_COACH_TARGET_ATTR = 'data-life-ledger-coach'
export const LIFE_LEDGER_COACH_ROOT_ATTR = 'data-life-ledger-coach-root'
export const LIFE_LEDGER_COACH_SCOPE = 'life-ledger-editor'
export const LIFE_LEDGER_COACH_SEEN_KEY = 'life-ledger-coach-completed-v1'

export type LifeLedgerCoachTargetId =
  | 'ledger-intro'
  | 'ledger-inline-sync'
  | 'ledger-align'
  | 'ledger-tabs'
  | 'ledger-tutorial'

export const LIFE_LEDGER_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: null,
    centered: true,
    title: '这是什么',
    body: lifeLedgerTutorialBody('这是什么'),
  },
  {
    target: null,
    centered: true,
    title: '有什么用',
    body: lifeLedgerTutorialBody('有什么用'),
  },
  {
    target: 'ledger-inline-sync',
    title: '开启「同请求更新」时',
    body: lifeLedgerTutorialBody('开启「同请求更新」时'),
    cardPlacement: 'below',
  },
  {
    target: 'ledger-inline-sync',
    title: '关闭时有什么不同',
    body: lifeLedgerTutorialBody('关闭时有什么不同'),
    cardPlacement: 'below',
  },
  {
    target: 'ledger-align',
    title: '按记忆对齐',
    body: lifeLedgerTutorialBody('按记忆对齐'),
    cardPlacement: 'below',
  },
  {
    target: 'ledger-tabs',
    title: '角色本线 vs 玩家本线',
    body: lifeLedgerTutorialBody('角色本线 vs 玩家本线'),
    cardPlacement: 'below',
  },
  {
    target: 'ledger-tutorial',
    title: '怎么再看说明',
    body: lifeLedgerTutorialBody('怎么再看说明'),
    cardPlacement: 'below',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '可以开始用了',
    body: '建议先打开同请求更新，需要时再点对齐。忘记差别就点教程对比「开/关」体验。',
  },
]
