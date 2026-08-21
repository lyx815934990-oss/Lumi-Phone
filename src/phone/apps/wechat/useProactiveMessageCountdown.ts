import { useCallback, useEffect, useState } from 'react'

import { personaDb } from './newFriendsPersona/idb'
import type { ChatConversationSettingsRow } from './newFriendsPersona/types'
import {
  buildProactiveMessageCountdownState,
  type ProactiveMessageCountdownState,
} from './proactiveMessageCountdown'
import {
  isProactiveMessageInFlight,
  subscribeProactiveMessageInFlight,
} from './proactivePrivateMessageEngine'
import {
  drawProactiveVariableIntervalSeconds,
  isProactiveVariableIntervalEnabled,
  resolveProactiveVariableIdleBounds,
} from './proactiveVariableInterval'
import { hasProactiveMessageScheduleSaved } from './proactivePrivateMessageTypes'

export function useProactiveMessageCountdown(params: {
  conversationKey: string
  enabled: boolean
  isBusyActive: boolean
}): ProactiveMessageCountdownState | null {
  const [settings, setSettings] = useState<ChatConversationSettingsRow | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const conversationKey = params.conversationKey.trim()
  const active = params.enabled && !!conversationKey

  const reload = useCallback(async () => {
    if (!active) {
      setSettings(null)
      return
    }
    let st = await personaDb.getChatConversationSettings(conversationKey)
    // 非忙碌却残留忙碌档抽签时，立刻改回空闲区间，避免横幅一直显示 1 小时+
    if (
      st &&
      !params.isBusyActive &&
      isProactiveVariableIntervalEnabled(st) &&
      hasProactiveMessageScheduleSaved(st)
    ) {
      const stored = st.proactiveMessageNextIntervalSeconds
      const idleMax = resolveProactiveVariableIdleBounds(st).maxSeconds
      if (typeof stored === 'number' && stored > idleMax) {
        const nextSeconds = drawProactiveVariableIntervalSeconds(false, st)
        await personaDb.upsertChatConversationSettings({
          conversationKey,
          peerCharacterId: st.peerCharacterId,
          playerIdentityId: st.playerIdentityId,
          proactiveMessageNextIntervalSeconds: nextSeconds,
        })
        st = (await personaDb.getChatConversationSettings(conversationKey)) ?? {
          ...st,
          proactiveMessageNextIntervalSeconds: nextSeconds,
        }
      }
    }
    setSettings(st)
  }, [active, conversationKey, params.isBusyActive])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!active) return
    const onStorage = () => void reload()
    window.addEventListener('wechat-storage-changed', onStorage)
    return () => window.removeEventListener('wechat-storage-changed', onStorage)
  }, [active, reload])

  useEffect(() => {
    if (!active || !settings?.proactiveMessageEnabled) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active, settings?.proactiveMessageEnabled])

  useEffect(() => {
    if (!active || !settings?.proactiveMessageEnabled) return
    const bump = () => setNow(Date.now())
    return subscribeProactiveMessageInFlight(bump)
  }, [active, settings?.proactiveMessageEnabled])

  if (!active || !settings?.proactiveMessageEnabled) return null

  return buildProactiveMessageCountdownState({
    settings,
    now,
    isBusyActive: params.isBusyActive,
    inFlight: isProactiveMessageInFlight(conversationKey),
    characterExplicitlyBusy: params.isBusyActive,
  })
}
