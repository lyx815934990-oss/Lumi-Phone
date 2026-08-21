import {
  BookOpen,
  Camera,
  ChevronRight,
  Globe2,
  Headphones,
  MessageCircleQuestionMark,
  Radio,
  ScrollText,
  Store,
  Feather,
} from 'lucide-react'
import type { WeChatPersonaContact } from '../phone/types'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { LazyChunkErrorBoundary } from '../phone/components/LazyChunkErrorBoundary'
import { lazyWithRetry } from '../phone/lazyWithRetry'

import type { AnonymousQaWechatContext } from './anonymousQa/buildAnonymousQaPersonaContext'
import type { MockContact } from './anonymousQa/types'
import {
  LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM,
  LUMI_SHELL,
  LUMI_SHELL_FONT,
} from '../phone/apps/wechat/lumiShellTheme'
import { LISTEN_TOGETHER_NAVIGATE_EVENT, consumePendingOpenListenTogether } from './discoverListen/listenTogetherNavigation'
import { LISTEN_TOGETHER_SHARE_TO_MOMENTS_EVENT } from './discoverListen/listenTogetherMomentShareNavigation'
import {
  consumePendingPulseOpenWeibo,
  LUMI_PULSE_NAVIGATE_EVENT,
  peekPulseReturnToChat,
  requestPulseReturnToChat,
} from '../phone/apps/lumiPulse/lumiPulseNavigation'
import { useMomentsInteractionUnreadCount } from './moments/MomentsNoticeRuntime'
import { MomentsSerifNumericText } from './moments/ArchiveTimelineDateColumn'
import type { OnOpenMomentParticipantProfile } from './moments/momentProfileNavigation'
import { mockContactsToMomentRefs } from './moments/publishMomentUtils'

const WeChatMomentsPage = lazyWithRetry(() =>
  import('./moments/WeChatMomentsPage').then((m) => ({ default: m.WeChatMomentsPage })),
)
const DiscoverListenTogetherApp = lazyWithRetry(() =>
  import('./discoverListen/DiscoverListenTogetherApp').then((m) => ({
    default: m.DiscoverListenTogetherApp,
  })),
)
const AnonymousQnAApp = lazyWithRetry(() =>
  import('./anonymousQa/AnonymousQnAApp').then((m) => ({ default: m.AnonymousQnAApp })),
)
const WeChatDiscoverLumiPulseApp = lazyWithRetry(() =>
  import('../phone/apps/lumiPulse/WeChatDiscoverLumiPulseApp').then((m) => ({
    default: m.WeChatDiscoverLumiPulseApp,
  })),
)
const LumiLiveApp = lazyWithRetry(() =>
  import('../phone/apps/lumiLive').then((m) => ({ default: m.LumiLiveApp })),
)
const SubconsciousArchivesApp = lazyWithRetry(() =>
  import('../phone/apps/wechat/diary/SubconsciousArchivesApp').then((m) => ({
    default: m.SubconsciousArchivesApp,
  })),
)
const JubenshaHallApp = lazyWithRetry(() =>
  import('./jubensha/JubenshaHallApp').then((m) => ({ default: m.JubenshaHallApp })),
)
const ObservationNotesHubApp = lazyWithRetry(() =>
  import('../phone/apps/wechat/observationNotes/ObservationNotesHubApp').then((m) => ({
    default: m.ObservationNotesHubApp,
  })),
)

function DiscoverSuspense({
  children,
  onClose,
}: {
  children: ReactNode
  /** 加载中 / 加载失败时左上角关闭，退回发现列表 */
  onClose?: () => void
}) {
  return (
    <LazyChunkErrorBoundary label="打开发现页" onClose={onClose}>
      <Suspense
        fallback={
          <div className="relative flex h-full min-h-0 items-center justify-center bg-white text-[13px] text-[#8e8e8e]">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute left-3 top-3 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-black/6 px-3 text-[14px] font-medium text-black/70 active:bg-black/12"
                aria-label="关闭"
              >
                关闭
              </button>
            ) : null}
            加载中…
          </div>
        }
      >
        {children}
      </Suspense>
    </LazyChunkErrorBoundary>
  )
}

type DiscoverActionId =
  | 'moments'
  | 'anonymous-qa'
  | 'listen-together'
  | 'weibo'
  | 'lumi-live'
  | 'subconscious-archives'
  | 'observation-notes'
  | 'jubensha'
  | 'shop'

type DiscoverAction = {
  id: DiscoverActionId
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

export type WeChatDiscoverInstagramProps = {
  onActionClick?: (id: DiscoverActionId) => void
  onImmersiveViewChange?: (open: boolean) => void
  /** 当前微信账号昵称（朋友圈封面、互动展示） */
  wechatNickname?: string
  /** 当前微信账号头像 */
  wechatAvatarUrl?: string
  /** 朋友圈封面（空则默认图） */
  momentsCoverUrl?: string
  onMomentsCoverChange?: (url: string) => void | Promise<void>
  /** @deprecated 请用 wechatNickname；保留供匿问我答等复用 */
  currentUserName?: string
  /** 匿问我答：真实通讯录（含 self + 人脉 NPC） */
  qnaContacts?: MockContact[]
  qnaWechatCtx?: AnonymousQaWechatContext | null
  /** 剧本杀馆：微信人脉通讯录 */
  personaContacts?: WeChatPersonaContact[]
  /** 私藏侧写：当前玩家身份 id */
  playerIdentityId?: string | null
  /** 私藏侧写：微信账号 id（存档作用域） */
  wechatAccountId?: string
  onOpenParticipantProfile?: OnOpenMomentParticipantProfile
  restoreView?: 'moments' | null
  onRestoreViewConsumed?: () => void
  className?: string
}

const DISCOVER_ACTIONS: DiscoverAction[] = [
  { id: 'moments', label: '朋友圈', icon: Camera },
  { id: 'listen-together', label: '听一听', icon: Headphones },
  { id: 'anonymous-qa', label: '匿问我答', icon: MessageCircleQuestionMark },
  { id: 'weibo', label: '微博广场', icon: Globe2 },
  { id: 'lumi-live', label: '浮光直播', icon: Radio },
  { id: 'subconscious-archives', label: '私语档案', icon: ScrollText },
  { id: 'observation-notes', label: '私藏侧写', icon: Feather },
  { id: 'jubensha', label: '剧本杀馆', icon: BookOpen },
  { id: 'shop', label: '小店', icon: Store },
]

export function WeChatDiscoverInstagram({
  onActionClick,
  onImmersiveViewChange,
  wechatNickname,
  wechatAvatarUrl,
  momentsCoverUrl,
  onMomentsCoverChange,
  currentUserName,
  qnaContacts,
  qnaWechatCtx = null,
  personaContacts = [],
  playerIdentityId = null,
  wechatAccountId,
  onOpenParticipantProfile,
  restoreView = null,
  onRestoreViewConsumed,
  className = '',
}: WeChatDiscoverInstagramProps) {
  const momentsDisplayName = wechatNickname?.trim() || currentUserName?.trim() || '我'
  const momentContacts = mockContactsToMomentRefs(qnaContacts ?? [])
  const momentsUnreadCount = useMomentsInteractionUnreadCount()
  const [activeView, setActiveView] = useState<
    | 'list'
    | 'moments'
    | 'listen-together'
    | 'anonymous-qa'
    | 'weibo'
    | 'lumi-live'
    | 'subconscious-archives'
    | 'observation-notes'
    | 'jubensha'
  >('list')
  useEffect(() => {
    onImmersiveViewChange?.(activeView !== 'list')
  }, [activeView, onImmersiveViewChange])

  useEffect(() => {
    return () => onImmersiveViewChange?.(false)
  }, [onImmersiveViewChange])

  useEffect(() => {
    if (consumePendingOpenListenTogether()) setActiveView('listen-together')
    const onNavigate = () => {
      consumePendingOpenListenTogether()
      setActiveView('listen-together')
    }
    window.addEventListener(LISTEN_TOGETHER_NAVIGATE_EVENT, onNavigate)
    return () => window.removeEventListener(LISTEN_TOGETHER_NAVIGATE_EVENT, onNavigate)
  }, [])
  useEffect(() => {
    if (consumePendingPulseOpenWeibo()) setActiveView('weibo')
    const onNavigateWeibo = () => {
      consumePendingPulseOpenWeibo()
      setActiveView('weibo')
    }
    window.addEventListener(LUMI_PULSE_NAVIGATE_EVENT, onNavigateWeibo)
    return () => window.removeEventListener(LUMI_PULSE_NAVIGATE_EVENT, onNavigateWeibo)
  }, [])
  useEffect(() => {
    const onShareToMoments = () => setActiveView('moments')
    window.addEventListener(LISTEN_TOGETHER_SHARE_TO_MOMENTS_EVENT, onShareToMoments)
    return () => window.removeEventListener(LISTEN_TOGETHER_SHARE_TO_MOMENTS_EVENT, onShareToMoments)
  }, [])
  useEffect(() => {
    if (restoreView !== 'moments') return
    setActiveView('moments')
    onRestoreViewConsumed?.()
  }, [onRestoreViewConsumed, restoreView])

  if (activeView === 'moments') {
    return (
      <div className={`h-full min-h-0 ${className}`}>
        <DiscoverSuspense onClose={() => setActiveView('list')}>
          <WeChatMomentsPage
            onBack={() => setActiveView('list')}
            wechatNickname={momentsDisplayName}
            wechatAvatarUrl={wechatAvatarUrl}
            momentsCoverUrl={momentsCoverUrl}
            onMomentsCoverChange={onMomentsCoverChange}
            momentContacts={momentContacts}
            currentUserName={momentsDisplayName}
            qnaWechatCtx={qnaWechatCtx}
            onOpenParticipantProfile={onOpenParticipantProfile}
          />
        </DiscoverSuspense>
      </div>
    )
  }
  if (activeView === 'listen-together') {
    return (
      <DiscoverSuspense onClose={() => setActiveView('list')}>
        <DiscoverListenTogetherApp
          className={`h-full min-h-0 ${className}`}
          onBack={() => setActiveView('list')}
        />
      </DiscoverSuspense>
    )
  }
  if (activeView === 'anonymous-qa') {
    return (
      <div className={`h-full min-h-0 ${className}`}>
        <DiscoverSuspense onClose={() => setActiveView('list')}>
          <AnonymousQnAApp
            onBack={() => setActiveView('list')}
            currentUserName={currentUserName ?? momentsDisplayName}
            contacts={qnaContacts}
            wechatCtx={qnaWechatCtx}
          />
        </DiscoverSuspense>
      </div>
    )
  }
  if (activeView === 'weibo') {
    return (
      <DiscoverSuspense onClose={() => setActiveView('list')}>
        <WeChatDiscoverLumiPulseApp
          className={`h-full min-h-0 ${className}`}
          onBack={() => {
            setActiveView('list')
            if (peekPulseReturnToChat()) requestPulseReturnToChat()
          }}
        />
      </DiscoverSuspense>
    )
  }
  if (activeView === 'lumi-live') {
    return (
      <DiscoverSuspense onClose={() => setActiveView('list')}>
        <LumiLiveApp
          className={`h-full min-h-0 ${className}`}
          onBack={() => setActiveView('list')}
          personaContacts={personaContacts}
          userNick={momentsDisplayName}
        />
      </DiscoverSuspense>
    )
  }
  if (activeView === 'subconscious-archives') {
    return (
      <DiscoverSuspense onClose={() => setActiveView('list')}>
        <SubconsciousArchivesApp
          className={`h-full min-h-0 ${className}`}
          onBack={() => setActiveView('list')}
          contacts={qnaContacts}
          wechatCtx={qnaWechatCtx}
        />
      </DiscoverSuspense>
    )
  }
  if (activeView === 'observation-notes') {
    return (
      <DiscoverSuspense onClose={() => setActiveView('list')}>
        <ObservationNotesHubApp
          className={`h-full min-h-0 ${className}`}
          onBack={() => setActiveView('list')}
          playerIdentityId={playerIdentityId?.trim() || ''}
          personaContacts={personaContacts}
          accountId={wechatAccountId}
          wechatCtx={qnaWechatCtx}
        />
      </DiscoverSuspense>
    )
  }
  if (activeView === 'jubensha') {
    return (
      <div className={`h-full min-h-0 ${className}`}>
        <DiscoverSuspense onClose={() => setActiveView('list')}>
          <JubenshaHallApp
            onBack={() => setActiveView('list')}
            currentUserName={momentsDisplayName}
            personaContacts={personaContacts}
          />
        </DiscoverSuspense>
      </div>
    )
  }
  return (
    <div
      className={`h-full min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ fontFamily: LUMI_SHELL_FONT }}
    >
      <div
        className="mx-auto flex w-full max-w-[520px] flex-col px-4 pt-3"
        style={{ gap: 24, paddingBottom: LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM }}
      >
        <div className="px-0.5">
          <p
            className="text-[22px] font-semibold tracking-tight"
            style={{ color: LUMI_SHELL.ink, letterSpacing: '-0.02em' }}
          >
            发现
          </p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
            朋友圈、听一听与更多入口
          </p>
        </div>

        <section
          aria-label="发现核心功能"
          style={{
            background: LUMI_SHELL.card,
            borderRadius: LUMI_SHELL.cardRadiusPx,
            border: `1px solid ${LUMI_SHELL.hairline}`,
            boxShadow: '0 8px 28px rgba(16,16,18,0.045)',
            overflow: 'hidden',
          }}
        >
          <ul>
            {DISCOVER_ACTIONS.map((item, idx) => {
              const Icon = item.icon
              const isLast = idx === DISCOVER_ACTIONS.length - 1
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onActionClick?.(item.id)
                      if (item.id === 'moments') setActiveView('moments')
                      if (item.id === 'listen-together') setActiveView('listen-together')
                      if (item.id === 'anonymous-qa') setActiveView('anonymous-qa')
                      if (item.id === 'weibo') setActiveView('weibo')
                      if (item.id === 'lumi-live') setActiveView('lumi-live')
                      if (item.id === 'subconscious-archives') setActiveView('subconscious-archives')
                      if (item.id === 'observation-notes') setActiveView('observation-notes')
                      if (item.id === 'jubensha') setActiveView('jubensha')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    style={{
                      borderBottom: isLast ? undefined : `1px solid ${LUMI_SHELL.hairline}`,
                    }}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(16,16,18,0.04)', color: LUMI_SHELL.ink }}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-medium" style={{ color: LUMI_SHELL.ink }}>
                      {item.label}
                    </span>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      {item.id === 'moments' && momentsUnreadCount > 0 ? (
                        <span
                          className="flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[10px] font-semibold leading-none tabular-nums text-white"
                          style={{ background: LUMI_SHELL.badgeRed }}
                          aria-label={`${momentsUnreadCount} 条未读互动消息`}
                        >
                          <MomentsSerifNumericText
                            text={momentsUnreadCount > 99 ? '99+' : String(momentsUnreadCount)}
                          />
                        </span>
                      ) : null}
                      <ChevronRight className="size-4" strokeWidth={1.75} color={LUMI_SHELL.mist} aria-hidden />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default WeChatDiscoverInstagram
