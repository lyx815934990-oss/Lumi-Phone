/** 绮幕 · 双轨频道：幕前＝戏中身份对白；幕间＝摘下戏服的真身耳语 */
export type CurtainChannel = 'stage' | 'wing'

/** 通讯录同行者（来自微信人设联系人） */
export type CurtainPartner = {
  characterId: string
  displayName: string
  avatarUrl?: string
}

/** 坐标笺内可选席位；未选中的席位入幕后作 NPC */
export type CurtainCastSlot = {
  id: string
  /** 幕中身份名 */
  title: string
  /** 短人设 / 公开面目（注入 prompt） */
  brief: string
}

/** 可前往地点 */
export type CurtainLocation = {
  id: string
  name: string
  /** 白天 | 黄昏 | 夜晚 | 全天 */
  period?: 'day' | 'dusk' | 'night' | 'any'
  brief?: string
}

/** 场上角色动态状态（NPC / 同行者戏中身份） */
export type CurtainActorStatus = {
  slotId: string
  title: string
  /** 短状态，如「在排练厅对讲机冷战」 */
  status: string
  /** 大致所在 */
  whereabouts: string
  /** partner = 同行者席位；npc = 其余席；user 不展示 */
  kind: 'partner' | 'npc'
}

/** 入幕时的席位分配 */
export type CurtainCastAssignment = {
  userSlotId: string
  partnerSlotId: string
  /** 其余席位 → NPC */
  npcSlotIds: string[]
}

/** 一场幕笺任务 */
export type CurtainQuest = {
  id: string
  /** 世界氛围短句，如「十九世纪伦敦雾都」 */
  theme: string
  /** 坐标笺代号，如 FILE 01: THE VICTORIAN SHADOW */
  fileCode: string
  /** 轮次上限（软倒计时） */
  timeLimit: number
  /** 终极目标（开放 RP 下作氛围锚） */
  mainGoal: string
  /**
   * 双方伪装身份（无 cast 时直接用；有 cast 时由选角写入）
   */
  roles: { userRole: string; charRole: string }
  /**
   * 多席位剧本：用户与同行者各选一席，其余自动为 NPC。
   * 长度建议 ≥ 3；青春校园本为 5。
   */
  cast?: CurtainCastSlot[]
  /** 可前往地点（开放行动） */
  locations?: CurtainLocation[]
  /** 开场提要（可选） */
  synopsis?: string
  /** 入幕开篇旁白（可选；优先于 synopsis 作故事开场） */
  prologue?: string
  /** 极淡风景底纹（灰度图 URL，可空） */
  ambienceUrl?: string
  /** 可选折点选项库 */
  foldPoints?: CurtainFoldPoint[]
}

export type CurtainFoldPoint = {
  id: string
  title: string
  body: string
  choices: Array<{ id: string; label: string; progressDelta: number }>
  /**
   * 在指定轮次弹出（与 currentTurn 对齐，约等于「入幕第 N 日」）。
   * 若本笺任一折点带 triggerAt，则按日程表触发，不再走默认稀疏触发。
   */
  triggerAt?: number
}

export type CurtainMessage = {
  id: string
  role: 'user' | 'partner' | 'system' | 'npc'
  content: string
  channel: CurtainChannel
  /** true＝幕间耳语，UI 用虚线框/斜体 */
  isMeta: boolean
  createdAt: number
  /**
   * system 消息展示态：
   * - narration：VN 旁白对话框
   * - tutorial：高亮教程（通常走独立指引层，留在消息流作备份）
   */
  tone?: 'narration' | 'tutorial'
}

/** 入幕进行态 */
export type CurtainDiveState = {
  isActive: boolean
  partnerId: string
  partnerName: string
  partnerAvatarUrl?: string
  /** 角色真实人设摘要（注入 prompt） */
  partnerPersonaBrief: string
  quest: CurtainQuest
  /** 多席位分配；旧二席本可无 */
  castAssignment?: CurtainCastAssignment
  currentTurn: number
  /** 主线进度 0–100 */
  mainStoryProgress: number
  channel: CurtainChannel
  messages: CurtainMessage[]
  /** 当前弹出的折点；null 表示无 */
  activeFoldPoint: CurtainFoldPoint | null
  /** 入幕高亮教程步骤；空则已结束 */
  tutorialSteps: string[]
  tutorialStepIndex: number
  /** 开篇背景全屏面板是否仍打开 */
  prologueOpen: boolean
  /** 开篇面板正文（可滚动） */
  prologueBody: string
  /** 当前所在地点 id */
  currentLocationId: string | null
  /** 当前结伴席位 id（含同行者席，不含用户席） */
  companionSlotIds: string[]
  /** 其他角色状态快照 */
  actorStatuses: CurtainActorStatus[]
  startedAt: number
}

export type CurtainView = 'lobby' | 'invite' | 'stage'

export function resolveNpcSlots(
  quest: CurtainQuest,
  assignment: CurtainCastAssignment | undefined,
): CurtainCastSlot[] {
  const cast = quest.cast
  if (!cast?.length || !assignment) return []
  return assignment.npcSlotIds
    .map((id) => cast.find((s) => s.id === id))
    .filter((s): s is CurtainCastSlot => !!s)
}

export function applyCastToQuestRoles(
  quest: CurtainQuest,
  assignment: CurtainCastAssignment,
): CurtainQuest {
  const cast = quest.cast ?? []
  const user = cast.find((s) => s.id === assignment.userSlotId)
  const partner = cast.find((s) => s.id === assignment.partnerSlotId)
  return {
    ...quest,
    roles: {
      userRole: user?.title ?? quest.roles.userRole,
      charRole: partner?.title ?? quest.roles.charRole,
    },
  }
}
