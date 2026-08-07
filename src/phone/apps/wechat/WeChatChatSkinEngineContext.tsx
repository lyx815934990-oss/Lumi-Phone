import { createContext, useContext, type ReactNode } from 'react'

import type { LumiBubblePackSkinEngine } from './bubblePack/types'

const ChatSkinEngineContext = createContext<LumiBubblePackSkinEngine>('structured')

export function WeChatChatSkinEngineProvider({
  engine,
  children,
}: {
  engine?: LumiBubblePackSkinEngine | null
  children: ReactNode
}) {
  return (
    <ChatSkinEngineContext.Provider value={engine === 'css' ? 'css' : 'structured'}>
      {children}
    </ChatSkinEngineContext.Provider>
  )
}

export function useChatSkinEngine(): LumiBubblePackSkinEngine {
  return useContext(ChatSkinEngineContext)
}
