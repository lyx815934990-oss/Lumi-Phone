import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { useCurrentApiConfig } from '../../api/ApiSettingsContext'
import type { WeChatPersonaContact } from '../../../types'
import { loadPartnerPersonaBrief, requestCurtainPartnerReply, splitPartnerBubbles } from './ai'
import { CurtainLobby } from './CurtainLobby'
import { CurtainStage, splitDialogueLines } from './CurtainStage'
import { PartnerInviteSheet } from './PartnerInviteSheet'
import { useCurtainStore } from './store'
import type { CurtainCastAssignment } from './types'

export type QimuAppProps = {
  onBack: () => void
  personaContacts?: WeChatPersonaContact[]
  className?: string
}

export function QimuApp({ onBack, personaContacts = [], className = '' }: QimuAppProps) {
  const apiConfig = useCurrentApiConfig()
  const view = useCurtainStore((s) => s.view)
  const selectedQuest = useCurtainStore((s) => s.selectedQuest)
  const dive = useCurtainStore((s) => s.dive)
  const selectQuest = useCurtainStore((s) => s.selectQuest)
  const clearSelection = useCurtainStore((s) => s.clearSelection)
  const startDive = useCurtainStore((s) => s.startDive)
  const appendMessage = useCurtainStore((s) => s.appendMessage)
  const bumpProgress = useCurtainStore((s) => s.bumpProgress)
  const nextTurn = useCurtainStore((s) => s.nextTurn)
  const maybeSpawnFoldPoint = useCurtainStore((s) => s.maybeSpawnFoldPoint)
  const setSending = useCurtainStore((s) => s.setSending)
  const setLastError = useCurtainStore((s) => s.setLastError)

  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null)

  const handleInvite = useCallback(
    async (contact: WeChatPersonaContact, castAssignment?: CurtainCastAssignment) => {
      setInviteLoadingId(contact.characterId)
      setLastError(null)
      try {
        const personaBrief = await loadPartnerPersonaBrief(contact.characterId)
        startDive({
          partner: {
            characterId: contact.characterId,
            displayName: contact.remarkName || '同行者',
            avatarUrl: contact.avatarUrl,
          },
          personaBrief,
          castAssignment,
        })
      } catch (e) {
        setLastError(e instanceof Error ? e.message : '入幕失败')
      } finally {
        setInviteLoadingId(null)
      }
    },
    [setLastError, startDive],
  )

  const handleSend = useCallback(
    async (text: string) => {
      const state = useCurtainStore.getState().dive
      if (!state) return
      const channel = state.channel
      const isMeta = channel === 'wing'
      const userLines = splitDialogueLines(text)
      if (!userLines.length) return

      // 换行 → 多条 VN 对白框；发给模型仍用完整段落
      for (const line of userLines) {
        appendMessage({
          role: 'user',
          content: line,
          channel,
          isMeta,
        })
      }
      setSending(true)
      setLastError(null)

      try {
        const latest = useCurtainStore.getState().dive
        if (!latest) return
        const raw = await requestCurtainPartnerReply({
          apiConfig,
          dive: latest,
          channel,
          userText: userLines.join('\n'),
        })
        const bubbles = splitPartnerBubbles(raw)
        for (const line of bubbles.length ? bubbles : [raw || '……']) {
          appendMessage({
            role: 'partner',
            content: line,
            channel,
            isMeta,
          })
        }
        if (channel === 'stage') {
          bumpProgress(4 + Math.floor(Math.random() * 5))
        }
        nextTurn()
        maybeSpawnFoldPoint()
      } catch (e) {
        setLastError(e instanceof Error ? e.message : '回应失败')
      } finally {
        setSending(false)
      }
    },
    [apiConfig, appendMessage, bumpProgress, maybeSpawnFoldPoint, nextTurn, setLastError, setSending],
  )

  return (
    <div className={`relative h-full min-h-0 ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {view === 'stage' && dive ? (
          <motion.div
            key="stage"
            className="h-full min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <CurtainStage onSend={handleSend} />
          </motion.div>
        ) : (
          <motion.div
            key="lobby"
            className="relative h-full min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <CurtainLobby
              onBack={onBack}
              onSelect={(quest) => {
                selectQuest(quest)
              }}
            />
            <PartnerInviteSheet
              open={view === 'invite'}
              quest={selectedQuest}
              contacts={personaContacts}
              loadingId={inviteLoadingId}
              onClose={clearSelection}
              onInvite={(c) => void handleInvite(c)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
