import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { personaDb } from '../newFriendsPersona/idb'
import type { WeChatContactRow } from '../../../../components/WeChatContactsInstagram'
import { ListenNumericText } from '../../../../components/discoverListen/ListenNum'
import { Pressable } from '../../../components/Pressable'
import { MemoryDashboard } from './MemoryDashboard'
import { MemoryEngineConfig } from './MemoryEngineConfig'
import { MemorySummaryProgressPanel } from './MemorySummaryProgressPanel'
import { MemoryEpiloguePanel } from './MemoryEpiloguePanel'
import { MemorySummaryRetryPanel } from './MemorySummaryRetryPanel'
import { ARCHIVE_BG } from './memoryArchiveTheme'
import type { MemoryCharacterPageMeta } from './memoryArchiveTypes'
import { MemoryCoachPortal } from './MemoryCoachPortal'
import { MemoryTutorialModal } from './MemoryTutorialModal'
import { MemoryTutorialButton } from './MemoryTutorialButton'
import { MEMORY_HUB_COACH_STEPS, MEMORY_HUB_START_COACH_EVENT } from './memoryHubCoachSteps'
import { MEMORY_HUB_TUTORIAL_SECTIONS } from './memoryHubTutorialCopy'
import {
  MEMORY_HUB_COACH_SEEN_KEY,
  readMemoryCoachSeen,
  writeMemoryCoachSeen,
} from './memoryCoachTypes'
import { MEMORY_ARCHIVE_OPEN_TUTORIAL_EVENT } from './memoryArchiveCoachSteps'
import { MEMORY_ARCHIVE_DETAIL_OPEN_TUTORIAL_EVENT } from './memoryArchiveDetailCoachSteps'
import { dispatchMemoryTabCoachForHubTab } from './useMemoryTabCoach'

const MEMORY_ARCHIVE_TABS = [
  { id: 'config' as const, label: '配置', full: '记忆配置' },
  { id: 'memories' as const, label: '角色', full: '角色总结' },
  { id: 'epilogue' as const, label: '尾声', full: '尾声延展' },
  { id: 'progress' as const, label: '进度', full: '线上总结进度' },
  { id: 'retry' as const, label: '补全', full: '补全总结' },
] as const

type MemoryArchiveTabId = (typeof MEMORY_ARCHIVE_TABS)[number]['id']

function TopBar({
  title,
  subtitle,
  onBack,
  onOpenTutorial,
  tutorialCoachTarget = 'hub-tutorial',
  backLabel = '返回',
}: {
  title: string
  subtitle?: string
  onBack: () => void
  onOpenTutorial?: () => void
  /** 高亮引导锚点：总馆 / 角色列表 / 角色详情 */
  tutorialCoachTarget?: 'hub-tutorial' | 'memories-tab-tutorial' | 'detail-tutorial'
  backLabel?: string
}) {
  return (
    <div
      className="sticky top-0 z-30 shrink-0"
      style={{
        background: ARCHIVE_BG,
        paddingTop: 'max(8px, env(safe-area-inset-top,0px))',
      }}
    >
      <div className="flex items-center gap-1 px-2.5 pb-2 pt-1">
        <Pressable
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-black/[0.04]"
          aria-label={backLabel}
        >
          <ArrowLeft className="size-5 text-[#111]" strokeWidth={1.6} />
        </Pressable>

        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="truncate text-[16px] font-semibold tracking-tight text-[#111]">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-[#8A8A8E]">
              <ListenNumericText text={subtitle} />
            </p>
          ) : title === '记忆' ? (
            <p className="mt-0.5 truncate text-[11px] tracking-wide text-[#8A8A8E]">长期记忆 · ARCHIVE</p>
          ) : null}
        </div>

        {onOpenTutorial ? (
          <MemoryTutorialButton
            compact
            onClick={onOpenTutorial}
            coachTarget={tutorialCoachTarget}
          />
        ) : (
          <div className="h-10 w-10 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  )
}

export function MemoryManagementApp({
  contacts,
  playerIdentityId,
  playerDisplayName,
  currentWechatAccountId,
  apiConfig,
  onBack,
}: {
  contacts: WeChatContactRow[]
  playerIdentityId: string | null
  playerDisplayName: string
  currentWechatAccountId?: string
  apiConfig?: import('../../api/types').ApiConfig | null
  onBack: () => void
}) {
  const [activeTab, setActiveTab] = useState<MemoryArchiveTabId>('memories')
  const [retryCount, setRetryCount] = useState(0)
  const [hubTutorialOpen, setHubTutorialOpen] = useState(false)
  const [hubCoachOpen, setHubCoachOpen] = useState(false)
  const [hubCoachStepIndex, setHubCoachStepIndex] = useState(0)
  const [characterPage, setCharacterPage] = useState<MemoryCharacterPageMeta | null>(null)
  const [epilogueCharacterPage, setEpilogueCharacterPage] = useState<MemoryCharacterPageMeta | null>(null)

  const pid = playerIdentityId?.trim() ?? ''
  const onCharacterPage =
    (activeTab === 'epilogue' && epilogueCharacterPage != null) ||
    (activeTab === 'memories' && characterPage != null)
  const hubCoachActive = !onCharacterPage
  const configCoachActive = activeTab === 'config' && hubCoachActive
  /** 角色列表与角色详情页的高亮引导都挂在此 Tab；进详情时不可关掉，否则详情引导永远不显示 */
  const archiveCoachActive = activeTab === 'memories'
  const progressCoachActive = activeTab === 'progress' && hubCoachActive
  const retryCoachActive = activeTab === 'retry' && hubCoachActive
  const epilogueCoachActive = activeTab === 'epilogue' && !epilogueCharacterPage

  const startHubCoach = useCallback(() => {
    setHubCoachStepIndex(0)
    setHubCoachOpen(true)
  }, [])

  const finishHubCoach = useCallback(
    (opts?: { openTutorial?: boolean }) => {
      writeMemoryCoachSeen(MEMORY_HUB_COACH_SEEN_KEY)
      setHubCoachOpen(false)
      setHubCoachStepIndex(0)
      if (opts?.openTutorial) {
        setHubTutorialOpen(true)
        return
      }
      window.setTimeout(() => dispatchMemoryTabCoachForHubTab(activeTab), 420)
    },
    [activeTab],
  )

  const handleTopBack = useCallback(() => {
    if (activeTab === 'epilogue' && epilogueCharacterPage) {
      setEpilogueCharacterPage(null)
      return
    }
    if (characterPage) {
      setCharacterPage(null)
      return
    }
    onBack()
  }, [activeTab, characterPage, epilogueCharacterPage, onBack])

  const topTitle = (() => {
    if (activeTab === 'epilogue' && epilogueCharacterPage) {
      return `${epilogueCharacterPage.displayName}的尾声延展`
    }
    if (activeTab === 'memories' && characterPage) {
      return `${characterPage.displayName}的角色总结`
    }
    return '记忆'
  })()

  const reloadRetryCount = useCallback(async () => {
    const list = await personaDb.listMemorySummaryRetries()
    setRetryCount(list.length)
  }, [])

  useEffect(() => {
    void reloadRetryCount()
    const onStorage = () => void reloadRetryCount()
    window.addEventListener('wechat-storage-changed', onStorage)
    return () => window.removeEventListener('wechat-storage-changed', onStorage)
  }, [reloadRetryCount])

  useEffect(() => {
    const onResult = (e: Event) => {
      const ce = e as CustomEvent<{ ok?: boolean }>
      if (ce.detail?.ok) return
      void reloadRetryCount()
      setActiveTab('retry')
    }
    window.addEventListener('wechat-memory-summary-result', onResult as EventListener)
    return () => window.removeEventListener('wechat-memory-summary-result', onResult as EventListener)
  }, [reloadRetryCount])

  useEffect(() => {
    if (!hubCoachActive) {
      setHubCoachOpen(false)
      setHubCoachStepIndex(0)
      return
    }
    if (readMemoryCoachSeen(MEMORY_HUB_COACH_SEEN_KEY)) return
    const id = window.setTimeout(() => startHubCoach(), 640)
    return () => window.clearTimeout(id)
  }, [hubCoachActive, startHubCoach])

  useEffect(() => {
    const onStart = () => startHubCoach()
    window.addEventListener(MEMORY_HUB_START_COACH_EVENT, onStart)
    return () => window.removeEventListener(MEMORY_HUB_START_COACH_EVENT, onStart)
  }, [startHubCoach])

  return (
    <div
      data-memory-coach-root="memory-management"
      className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900"
      style={{ background: ARCHIVE_BG }}
    >
      <TopBar
        title={topTitle}
        onBack={handleTopBack}
        backLabel={onCharacterPage ? '返回浏览' : '返回'}
        tutorialCoachTarget={
          activeTab === 'memories' && characterPage
            ? 'detail-tutorial'
            : activeTab === 'memories'
              ? 'memories-tab-tutorial'
              : 'hub-tutorial'
        }
        onOpenTutorial={
          activeTab === 'memories' && characterPage
            ? () => {
                window.dispatchEvent(new Event(MEMORY_ARCHIVE_DETAIL_OPEN_TUTORIAL_EVENT))
              }
            : activeTab === 'memories'
              ? () => {
                  window.dispatchEvent(new Event(MEMORY_ARCHIVE_OPEN_TUTORIAL_EVENT))
                }
              : hubCoachActive
                ? () => setHubTutorialOpen(true)
                : undefined
        }
      />

      {hubCoachActive ? (
        <MemoryTutorialModal
          open={hubTutorialOpen}
          onClose={() => setHubTutorialOpen(false)}
          title="记忆 · 五个分区"
          subtitle="先认入口，再进各页细看"
          sections={MEMORY_HUB_TUTORIAL_SECTIONS}
          onStartLiveCoach={() => {
            setHubTutorialOpen(false)
            window.setTimeout(() => startHubCoach(), 280)
          }}
          zIndex={52000}
        />
      ) : null}

      <MemoryCoachPortal
        open={hubCoachOpen && hubCoachActive}
        steps={MEMORY_HUB_COACH_STEPS}
        stepIndex={hubCoachStepIndex}
        onStepChange={setHubCoachStepIndex}
        onSkip={() => finishHubCoach()}
        onComplete={(opts) => finishHubCoach(opts)}
        scopeRoot="memory-management"
        layoutEpoch={activeTab}
        zIndex={57000}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!onCharacterPage ? (
          <div className="shrink-0 px-4 pb-1" style={{ background: ARCHIVE_BG }}>
            <nav
              className="mx-auto grid w-full max-w-xl grid-cols-5 border-b border-black/[0.06]"
              role="tablist"
              aria-label="记忆分区"
            >
              {MEMORY_ARCHIVE_TABS.map((tab) => {
                const active = activeTab === tab.id
                const showRetryBadge = tab.id === 'retry' && retryCount > 0
                return (
                  <Pressable
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={tab.full}
                    title={tab.full}
                    data-memory-coach={`hub-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex w-full flex-col items-center justify-end px-0.5 pb-2.5 pt-1"
                  >
                    <span
                      className="block w-full truncate text-center text-[13px] transition-colors"
                      style={{
                        color: active ? '#111' : '#8A8A8E',
                        fontWeight: active ? 600 : 450,
                      }}
                    >
                      {tab.label}
                    </span>
                    {showRetryBadge ? (
                      <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#111] px-1 text-[9px] font-bold text-white">
                        {retryCount > 9 ? '9+' : retryCount}
                      </span>
                    ) : null}
                    {active ? (
                      <span
                        className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[#111]"
                        aria-hidden
                      />
                    ) : null}
                  </Pressable>
                )
              })}
            </nav>
          </div>
        ) : null}
        <div
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] ${
            activeTab === 'config' && !onCharacterPage ? '' : 'hidden'
          }`}
          aria-hidden={activeTab !== 'config' || onCharacterPage}
        >
          <MemoryEngineConfig
            currentWechatAccountId={currentWechatAccountId}
            coachActive={configCoachActive}
          />
        </div>
        <div
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] ${
            activeTab === 'progress' && !onCharacterPage ? '' : 'hidden'
          }`}
          aria-hidden={activeTab !== 'progress' || onCharacterPage}
        >
          <MemorySummaryProgressPanel
            contacts={contacts}
            currentWechatAccountId={currentWechatAccountId}
            playerIdentityId={playerIdentityId}
            coachActive={progressCoachActive}
          />
        </div>
        <div
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] ${
            activeTab === 'retry' && !onCharacterPage ? '' : 'hidden'
          }`}
          aria-hidden={activeTab !== 'retry' || onCharacterPage}
        >
          <MemorySummaryRetryPanel coachActive={retryCoachActive} />
        </div>
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
            activeTab === 'epilogue' ? '' : 'hidden'
          }`}
          aria-hidden={activeTab !== 'epilogue'}
        >
          <MemoryEpiloguePanel
            contacts={contacts}
            apiConfig={apiConfig ?? null}
            currentWechatAccountId={currentWechatAccountId}
            activeCharacterPageId={epilogueCharacterPage?.charId ?? null}
            onCharacterPageChange={setEpilogueCharacterPage}
            coachActive={epilogueCoachActive}
          />
        </div>
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
            activeTab === 'memories' ? '' : 'hidden'
          }`}
          aria-hidden={activeTab !== 'memories'}
        >
          <MemoryDashboard
            contacts={contacts}
            playerIdentityId={pid || '__none__'}
            playerDisplayName={playerDisplayName.trim() || '我'}
            currentWechatAccountId={currentWechatAccountId}
            apiConfig={apiConfig ?? null}
            activeCharacterPageId={characterPage?.charId ?? null}
            onCharacterPageChange={setCharacterPage}
            coachActive={archiveCoachActive}
          />
        </div>
      </div>
    </div>
  )
}
