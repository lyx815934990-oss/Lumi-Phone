import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

import { ConsentModal } from './ConsentModal'
import { SpyInfiltrationAnimation } from './SpyInfiltrationAnimation'
import { SpyDesktop } from './SpyDesktop'
import { useCheckPhonePeerLabel } from './useCheckPhonePeerLabel'

type FlowStage = 'consent' | 'infiltrate' | 'desktop'

export function CheckPhoneFlow({
  open,
  characterId,
  characterName,
  playerIdentityId,
  playerDisplayName,
  playerWechatAvatarUrl,
  useLumiProjectAssistantPrompt,
  onClose,
  onToast,
}: {
  open: boolean
  characterId: string
  characterName: string
  playerIdentityId: string
  playerDisplayName: string
  /** 本聊天单独头像优先，否则全局微信头像（与气泡己方头像同源） */
  playerWechatAvatarUrl?: string
  useLumiProjectAssistantPrompt: boolean
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const [stage, setStage] = useState<FlowStage>('consent')
  /** 桌面与各 App 标题一律用通讯录备注，不用角色真实名 */
  const peerLabel = useCheckPhonePeerLabel(characterId, characterName)

  const resetAndClose = useCallback(() => {
    setStage('consent')
    onClose()
  }, [onClose])

  const onInfiltrationDone = useCallback(() => {
    setStage('desktop')
  }, [])

  const spyLabel = useMemo(() => {
    const pool = ['Accessing...', 'Decryption...', 'Handshake...', 'Bypassing...']
    return pool[Math.floor(Math.random() * pool.length)] ?? 'Accessing...'
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <ConsentModal
            open={stage === 'consent'}
            onClose={resetAndClose}
            onAsk={() => {
              onToast('Ask 分支即将上线')
              resetAndClose()
            }}
            onSpy={() => setStage('infiltrate')}
          />

          {stage === 'infiltrate' ? (
            <SpyInfiltrationAnimation
              label={spyLabel}
              onDone={onInfiltrationDone}
            />
          ) : null}

          {stage === 'desktop' ? (
            <SpyDesktop
              characterId={characterId}
              characterName={peerLabel}
              playerIdentityId={playerIdentityId}
              playerDisplayName={playerDisplayName}
              playerWechatAvatarUrl={playerWechatAvatarUrl}
              useLumiProjectAssistantPrompt={useLumiProjectAssistantPrompt}
              onToast={onToast}
              onExit={resetAndClose}
            />
          ) : null}
        </>
      ) : null}
    </AnimatePresence>
  )
}

