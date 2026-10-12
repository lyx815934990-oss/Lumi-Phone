import { useEffect, useState } from 'react'
import { DatingProvider, useDating } from './DatingContext'
import { DatingRoleSelectPage } from './DatingRoleSelectPage'
import { DatingStoryPage } from './DatingStoryPage'
import { useDatingInteractiveStore } from './useDatingInteractiveStore'

type Page = 'select' | 'story'

function DatingSystemInner({
  onVnChromeChange,
  onOpenPersonaManager,
}: {
  onVnChromeChange?: (hidden: boolean) => void
  onOpenPersonaManager?: () => void
}) {
  const [page, setPage] = useState<Page>('select')
  const { currentCharacter } = useDating()
  const clearInteractiveSession = useDatingInteractiveStore((s) => s.clearSession)

  useEffect(() => {
    const hidden = page === 'story'
    onVnChromeChange?.(hidden)
    return () => {
      onVnChromeChange?.(false)
    }
  }, [onVnChromeChange, page])

  /** 互动模式已下线：清掉未收束会话，避免旧数据把用户锁回互动页 */
  useEffect(() => {
    clearInteractiveSession()
  }, [clearInteractiveSession, currentCharacter.id])

  if (page === 'select') {
    return (
      <DatingRoleSelectPage
        onEnterStory={() => setPage('story')}
        onOpenPersonaManager={onOpenPersonaManager}
      />
    )
  }
  return <DatingStoryPage onBackToSelect={() => setPage('select')} />
}

export function DatingSystem({
  onVnChromeChange,
  onOpenPersonaManager,
}: {
  onVnChromeChange?: (hidden: boolean) => void
  onOpenPersonaManager?: () => void
}) {
  return (
    <DatingProvider>
      <DatingSystemInner onVnChromeChange={onVnChromeChange} onOpenPersonaManager={onOpenPersonaManager} />
    </DatingProvider>
  )
}

export default DatingSystem
