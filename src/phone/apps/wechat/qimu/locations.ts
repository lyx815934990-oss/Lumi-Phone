import type {
  CurtainActorStatus,
  CurtainCastAssignment,
  CurtainLocation,
  CurtainQuest,
} from './types'

export function loc(
  id: string,
  name: string,
  period: CurtainLocation['period'] = 'any',
  brief?: string,
): CurtainLocation {
  return { id, name, period, brief }
}

/** 白杨校园长线本必出 + 日常可选地点 */
export const CAMPUS_LOCATIONS: CurtainLocation[] = [
  loc('ceremony-hall', '开学典礼礼堂', 'day'),
  loc('jiaowu', '教务处报到窗口', 'day'),
  loc('classroom', '教室座位区', 'day'),
  loc('club-fair', '操场招新区', 'day'),
  loc('prop-warehouse', '礼堂道具仓库', 'dusk'),
  loc('side-door', '礼堂侧门外', 'dusk'),
  loc('rehearsal', '排练厅', 'night'),
  loc('broadcast', '广播站录音间', 'night'),
  loc('treehole', '宿舍刷树洞', 'night', '手机屏幕上的校园树洞'),
  loc('daoyuchu', '教导处谈话室', 'day'),
  loc('exam-hall', '考场', 'day'),
  loc('rooftop', '天台', 'night'),
  loc('union-room', '学生会会议室', 'day'),
  loc('teacher-office', '班主任办公室', 'day'),
  loc('rain-path', '雨中校道', 'dusk'),
  loc('dorm-gate', '宿舍区楼下门口', 'dusk'),
  loc('print-shop', '文印室', 'day'),
  loc('old-wing', '旧礼堂侧幕', 'night'),
  loc('entrance', '晚会观众入场通道', 'dusk'),
  loc('stage-lip', '舞台台口', 'night'),
  loc('empty-class', '空教室', 'night'),
  loc('corridor', '教学楼走廊', 'any'),
  loc('canteen', '食堂', 'day'),
  loc('library', '图书馆', 'day'),
  loc('night-study', '晚自习教室', 'night'),
]

export const GENERIC_LOCATIONS: CurtainLocation[] = [
  loc('main-hall', '主厅', 'any'),
  loc('corridor', '走廊', 'any'),
  loc('side-room', '侧室', 'any'),
  loc('courtyard', '庭院', 'day'),
  loc('rooftop', '高处平台', 'night'),
  loc('archive', '档案角落', 'any'),
]

export function resolveQuestLocations(quest: CurtainQuest): CurtainLocation[] {
  if (quest.locations?.length) return quest.locations
  if (quest.id.includes('campus') || quest.id.includes('transfer') || quest.id.includes('bell')) {
    return CAMPUS_LOCATIONS
  }
  return GENERIC_LOCATIONS
}

const NPC_STATUS_POOL = [
  '神色平常，像什么都没发生',
  '眉头微皱，手里攥着未发出的消息',
  '正和别人压低声音争执',
  '装作在忙，其实在偷听动静',
  '情绪低落，不太想开口',
  '表面镇定，余光一直扫向侧门',
]

function pickStatus(seed: number): string {
  return NPC_STATUS_POOL[seed % NPC_STATUS_POOL.length]!
}

export function buildInitialActorStatuses(
  quest: CurtainQuest,
  assignment: CurtainCastAssignment | undefined,
  locations: CurtainLocation[],
): CurtainActorStatus[] {
  const cast = quest.cast ?? []
  if (!cast.length) {
    return [
      {
        slotId: 'partner',
        title: quest.roles.charRole,
        status: '与你同在开场',
        whereabouts: locations[0]?.name ?? '场上',
        kind: 'partner',
      },
    ]
  }
  if (!assignment) return []

  const locName = (i: number) => locations[i % locations.length]?.name ?? '校园某处'
  const list: CurtainActorStatus[] = []

  const partner = cast.find((s) => s.id === assignment.partnerSlotId)
  if (partner) {
    list.push({
      slotId: partner.id,
      title: partner.title,
      status: '刚与你一同入场',
      whereabouts: locName(0),
      kind: 'partner',
    })
  }

  assignment.npcSlotIds.forEach((id, i) => {
    const slot = cast.find((s) => s.id === id)
    if (!slot) return
    list.push({
      slotId: slot.id,
      title: slot.title,
      status: pickStatus(i + 3),
      whereabouts: locName(i + 2),
      kind: 'npc',
    })
  })

  return list
}

export function refreshActorStatusesOnAdvance(
  prev: CurtainActorStatus[],
  locations: CurtainLocation[],
  turn: number,
): CurtainActorStatus[] {
  if (!locations.length) return prev
  return prev.map((a, i) => {
    if (a.kind === 'partner') {
      return {
        ...a,
        status: '仍与你保持联系',
        whereabouts: a.whereabouts,
      }
    }
    return {
      ...a,
      status: pickStatus(turn + i * 5),
      whereabouts: locations[(turn + i * 3) % locations.length]!.name,
    }
  })
}
