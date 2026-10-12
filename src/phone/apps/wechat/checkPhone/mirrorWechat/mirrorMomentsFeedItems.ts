import type { MomentItemModel } from '../../../../../components/moments/mockMoments'
import type { MomentContactRef, MomentPrivacyMeta } from '../../../../../components/moments/newMomentTypes'
import type { MirrorWeChatContact, MirrorWeChatMoment } from './types'

function mapVisibilityToPrivacy(visibility: string): MomentPrivacyMeta {
  const label = visibility.trim() || '公开'
  if (/私密|仅自己|自己可见/i.test(label)) {
    return { mode: 'private', visibilityLabel: label }
  }
  if (/屏蔽|不给|不可见|hide/i.test(label)) {
    return { mode: 'hideFrom', visibilityLabel: label }
  }
  if (/仅/.test(label)) {
    return {
      mode: 'shareWith',
      visibilityLabel: label,
      audienceOnlyUser: /你|用户|ta|对方/i.test(label),
    }
  }
  return { mode: 'public', visibilityLabel: label }
}

/** 镜像朋友圈 → 用户侧 MomentItem 模型（布局复用） */
export function mirrorMomentsToFeedItems(
  moments: MirrorWeChatMoment[],
  opts: {
    authorName: string
    authorAvatar: string
    authorCharacterId?: string
    nowMs?: number
  },
): MomentItemModel[] {
  const authorName = opts.authorName.trim() || '角色'
  const authorAvatar = opts.authorAvatar.trim()
  const nowMs = opts.nowMs && opts.nowMs > 0 ? opts.nowMs : Date.now()

  return moments.map((item, index) => {
    const ageMs = (index + 1) * (3 + (index % 5)) * 60 * 60 * 1000
    return {
      id: item.id,
      authorName,
      authorAvatar,
      authorCharacterId: opts.authorCharacterId,
      content: item.content,
      timestamp: Math.max(0, nowMs - ageMs),
      likes: [...item.likes],
      comments: item.comments.map((c, ci) => ({
        id: `${item.id}-c-${ci}`,
        author: c.from,
        content: c.content,
      })),
      privacy: mapVisibilityToPrivacy(item.visibility),
    }
  })
}

export function mirrorContactsToMomentRefs(contacts: MirrorWeChatContact[]): MomentContactRef[] {
  return contacts
    .filter((c) => c.kind !== 'group')
    .map((c) => ({
      id: c.id,
      name: (c.remarkName || c.nickname || '').trim() || c.id,
      avatarUrl: c.avatarUrl,
      characterId: c.characterId,
    }))
}
