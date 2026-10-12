type ReplyTokenFabChatRef =
  | { kind: 'persona'; characterId: string }
  | { kind: 'group'; groupId: string }
  | { kind: 'other' }

export type ReplyTokenFabState = {
  visible: boolean
  panelOpen: boolean
  conversationKey: string
  peerLabel: string
  chatRef: ReplyTokenFabChatRef | null
  /** 打开聊天设置「回复」页的请求代数（WeChatApp 监听） */
  openSettingsReplyNonce: number
  /** 打开完整思维溯源 */
  openFullTraceNonce: number
}

type Listener = () => void

let state: ReplyTokenFabState = {
  visible: false,
  panelOpen: false,
  conversationKey: '',
  peerLabel: '',
  chatRef: null,
  openSettingsReplyNonce: 0,
  openFullTraceNonce: 0,
}

const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l()
}

export function getReplyTokenFabState(): ReplyTokenFabState {
  return state
}

export function subscribeReplyTokenFab(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function showReplyTokenFab(params: {
  conversationKey: string
  peerLabel: string
  chatRef?: ReplyTokenFabChatRef | null
}): boolean {
  const ck = params.conversationKey.trim()
  if (!ck) return false
  const already = state.visible && state.conversationKey === ck
  state = {
    ...state,
    visible: true,
    conversationKey: ck,
    peerLabel: params.peerLabel.trim() || state.peerLabel || '聊天',
    chatRef: params.chatRef ?? state.chatRef,
  }
  emit()
  return already
}

export function hideReplyTokenFab(): void {
  if (!state.visible && !state.panelOpen) return
  state = {
    ...state,
    visible: false,
    panelOpen: false,
  }
  emit()
}

export function setReplyTokenPanelOpen(open: boolean): void {
  if (state.panelOpen === open) return
  state = { ...state, panelOpen: open }
  emit()
}

export function requestOpenChatSettingsReply(): void {
  state = {
    ...state,
    panelOpen: false,
    openSettingsReplyNonce: state.openSettingsReplyNonce + 1,
  }
  emit()
}

export function requestOpenFullMemoryTrace(): void {
  state = {
    ...state,
    panelOpen: false,
    openFullTraceNonce: state.openFullTraceNonce + 1,
  }
  emit()
}
