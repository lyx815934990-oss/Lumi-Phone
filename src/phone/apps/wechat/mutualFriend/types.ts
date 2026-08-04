/** 共同好友传话：主回复末尾同轮标记块（非 JSON） */

export type MutualFriendChainRelayTo = {
  otherRoleId?: string
  /** 弹窗用：一句话原因（如「想确认你说的喜欢的事」） */
  reason?: string
  /** 你向对方打听/转告的摘要 */
  relayedMessage?: string
  /**
   * 对方私下告诉你的事情经过（不私信玩家时常用）。
   * 写入后你会在后续对话中保持「已知晓」状态。
   */
  heardBack?: string
}

export type MutualFriendChainPayload = {
  relayTo?: MutualFriendChainRelayTo[]
  otherOutgoing?: Array<{ otherRoleId?: string; reason?: string; lines?: string[] }>
}

export type MutualFriendRelayRecord = {
  id: string
  fromRoleId: string
  toRoleId: string
  relayedMessage: string
  /** 对方回传给你的知情摘要（可选） */
  heardBack?: string
  timestamp: number
  /** 传话发生时所在会话（发起方与用户的私聊 key） */
  chatId: string
}

/** 人脉圈共享的「联动聊天模式」开关（按档案根 + 玩家身份） */
export type MutualFriendLinkedModeRow = {
  id: string
  networkRootId: string
  playerIdentityId: string
  enabled: boolean
  updatedAt: number
}

export type MutualFriendPeerOption = {
  characterId: string
  displayName: string
}
