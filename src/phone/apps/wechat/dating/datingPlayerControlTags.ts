/**
 * 玩家输入卡片顶行：展示当轮确实注入/改写提示词的场控标签。
 * 开启态才显示；人称 / 目标字数每轮都会注入，故始终显示。
 */

import type { NarrativePerspective } from './types'

export type DatingPlayerControlTagId =
  | 'perspective'
  | 'length'
  | 'god'
  | 'side'
  | 'director'
  | 'interrupt'
  | 'parallel'
  | 'if-line'
  | 'comment'
  | 'theater'
  | 'danmaku'
  | 'cot'
  | 'direct-out'

export type DatingPlayerControlTag = {
  id: DatingPlayerControlTagId
  label: string
}

export type DatingPlayerControlTagSource = {
  perspective?: NarrativePerspective
  /** 目标字数；有限正数时展示「约 N 字」 */
  lengthTargetChars?: number
  godPerspective?: boolean
  mainCharacterOffstage?: boolean
  directorMode?: boolean
  autoUserReaction?: boolean
  generateParallelOnSend?: boolean
  generateIfLineOnSend?: boolean
  commentModeEnabled?: boolean
  plotArtifactVisualEnabled?: boolean
  /** 缺省视为开启 */
  thinkingChainEnabled?: boolean
  offlineDanmakuEnabled?: boolean
}

const PERSPECTIVE_LABEL: Record<NarrativePerspective, string> = {
  first: '第一人称',
  second: '第二人称',
  third: '第三人称',
}

const LABEL: Record<DatingPlayerControlTagId, string> = {
  perspective: '人称',
  length: '字数',
  god: '上帝视角',
  side: '侧幕叙写',
  director: '导演模式',
  interrupt: '抢话',
  parallel: '平行事件',
  'if-line': 'IF线',
  comment: '评论模式',
  theater: '小剧场',
  danmaku: '弹幕',
  cot: '思维链',
  'direct-out': '直出',
}

export function buildDatingPlayerControlTags(
  src: DatingPlayerControlTagSource,
): DatingPlayerControlTag[] {
  const tags: DatingPlayerControlTag[] = []
  const push = (id: DatingPlayerControlTagId, label?: string) => {
    tags.push({ id, label: label ?? LABEL[id] })
  }

  const perspective = src.perspective ?? 'second'
  push('perspective', PERSPECTIVE_LABEL[perspective] ?? '第二人称')

  const length =
    typeof src.lengthTargetChars === 'number' && Number.isFinite(src.lengthTargetChars)
      ? Math.max(1, Math.round(src.lengthTargetChars))
      : 0
  if (length > 0) push('length', `约${length}字`)

  if (src.godPerspective) push('god')
  if (src.mainCharacterOffstage) push('side')
  if (src.directorMode) push('director')
  // 上帝视角下抢话不注入
  if (!src.godPerspective && src.autoUserReaction) push('interrupt')
  if (src.generateParallelOnSend) push('parallel')
  if (src.generateIfLineOnSend) push('if-line')
  if (src.commentModeEnabled !== false) push('comment')
  if (src.plotArtifactVisualEnabled !== false) push('theater')
  if (src.offlineDanmakuEnabled) push('danmaku')
  if (src.thinkingChainEnabled === false) push('direct-out')
  else push('cot')

  return tags
}
