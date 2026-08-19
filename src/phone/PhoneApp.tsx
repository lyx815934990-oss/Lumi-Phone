import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { EntryNoticeModal } from './components/EntryNoticeModal'
import { HomeScreen } from './components/HomeScreen'
import { LazyChunkErrorBoundary } from './components/LazyChunkErrorBoundary'
import { LazyRouteFallback } from './components/LazyRouteFallback'
import { lazyWithRetry } from './lazyWithRetry'
import { PhoneShell } from './components/PhoneShell'
import { UserSystemAuthModal } from './components/UserSystemAuthModal'
import { UserInfoCorrectionModal } from './components/UserInfoCorrectionModal'
import { AccountStatusCheckingOverlay } from './components/AccountStatusCheckingOverlay'
import { prefetchAppChunk, persistLoadedAssetsToServiceWorker } from './boot/warmShellCache'
import { isWeChatAppModuleReady, loadWeChatAppDefault } from './boot/wechatAppModule'
import { readEnableSplashScreenSync } from './boot/splashPref'
import { BootResourceGate } from './components/BootResourceGate'
import { SplashScreen } from './components/SplashScreen'
import { useCustomization } from './CustomizationContext'
import {
  canEnterHomeOffline,
  fetchUserStatus,
  getAuthToken,
  readAuthVerified,
  readBannedNotice,
  readLocalAccountGateStatus,
  readLocalUserLoginStatus,
  readSessionKickedNotice,
  resolveOfflineAuthVerifyError,
  runLumiSessionGuard,
  shouldShowAccountStatusCheck,
  setAuthVerified,
  STATUS_FETCH_TIMEOUT_MS,
  STATUS_CHECK_MIN_OVERLAY_MS,
  waitForStatusCheckOverlay,
} from './userSystem/userSystemApi'
import { isUserActivated, needsUserInfoCorrection, type UserAccountTab, type UserLoginStatus } from './userSystem/types'
import { isLocalDevBypassAuth, LOCAL_DEV_MOCK_STATUS } from './userSystem/localDevMode'
import { ApiSettingsProvider } from './apps/api/ApiSettingsContext'
import { LUMI_SYS_FIRST_BOOT_KEY } from './apps/dataArchive/constants'
import {
  shouldOfferEvolutionPush,
  resetEvolutionPushDismissals,
  clearLegacyEvolutionPushSessionDismiss,
} from './apps/evolution/evolutionPushStorage'
import {
  shouldOfferQixiEnvelope,
  resetQixiEnvelopeDismissals,
  QIXI_OPEN_EVENT,
  type QixiOpenEventDetail,
} from './apps/qixi/qixiEnvelopeStorage'
import { LUMI_PULSE_NAVIGATE_EVENT } from './apps/lumiPulse/lumiPulseNavigation'
import { WorldbookLoreProvider } from './worldbook/worldbookLoreStore'
import type { AppSlot } from './types'
import { dispatchPhoneDismissOverlays } from './phoneDismissOverlays'
import {
  runDiscordOAuthCallbackFromUrl,
  resolveDiscordAuthTabAfterOAuth,
  storeDiscordOAuthError,
} from './userSystem/discordOAuthFlow'
import { consumeDiscordRegisterFromCommunityTroubleshoot } from './userSystem/discordRegisterFlags'
import { storeDiscordRegisterPending } from './components/DiscordRegisterCompleteModal'

// 与开屏预加载共用同一模块 Promise；禁止 cache-bust 重试，避免进度到 90% 被整页打断
const WeChatApp = lazy(loadWeChatAppDefault)
const UserAccountApp = lazyWithRetry(() =>
  import('./apps/userAccount/UserAccountApp').then((m) => ({ default: m.UserAccountApp })),
)
const CustomizeScreen = lazyWithRetry(() =>
  import('./components/CustomizeScreen').then((m) => ({ default: m.CustomizeScreen })),
)
const LumiMeetAppRoute = lazyWithRetry(() =>
  import('./apps/lumiMeet/LumiMeetAppRoute').then((m) => ({ default: m.LumiMeetAppRoute })),
)
const ApiSettingsApp = lazyWithRetry(() =>
  import('./apps/api/ApiSettingsApp').then((m) => ({ default: m.ApiSettingsApp })),
)
const VoiceprintHubApp = lazyWithRetry(() =>
  import('./apps/voiceprint/VoiceprintHubApp').then((m) => ({ default: m.VoiceprintHubApp })),
)
const DataArchiveApp = lazyWithRetry(() =>
  import('./apps/dataArchive/DataArchiveApp').then((m) => ({ default: m.DataArchiveApp })),
)
const LoreArchiveApp = lazyWithRetry(() =>
  import('./apps/loreArchive/LoreArchiveApp').then((m) => ({ default: m.LoreArchiveApp })),
)
const RecycleBinApp = lazyWithRetry(() =>
  import('./apps/recycleBin/RecycleBinApp').then((m) => ({ default: m.RecycleBinApp })),
)
const BackgroundNotifyApp = lazyWithRetry(() =>
  import('./apps/backgroundNotify/BackgroundNotifyApp').then((m) => ({
    default: m.BackgroundNotifyApp,
  })),
)
const SandboxApp = lazyWithRetry(() =>
  import('./apps/sandbox/SandboxApp').then((m) => ({ default: m.SandboxApp })),
)
const EvolutionApp = lazyWithRetry(() =>
  import('./apps/evolution/EvolutionApp').then((m) => ({ default: m.EvolutionApp })),
)
const LumiTasteApp = lazyWithRetry(() =>
  import('./apps/takeout/LumiTasteApp').then((m) => ({ default: m.LumiTasteApp })),
)
const AppPlaceholderScreen = lazyWithRetry(() =>
  import('./components/AppPlaceholderScreen').then((m) => ({ default: m.AppPlaceholderScreen })),
)
const EvolutionUpdatePushModal = lazyWithRetry(() =>
  import('./apps/evolution/EvolutionUpdatePushModal').then((m) => ({
    default: m.EvolutionUpdatePushModal,
  })),
)
const QixiEnvelopeModal = lazyWithRetry(() =>
  import('./apps/qixi/QixiEnvelopeModal').then((m) => ({
    default: m.QixiEnvelopeModal,
  })),
)
const ListenTogetherPlayerBootstrap = lazyWithRetry(() =>
  import('../components/discoverListen/ListenTogetherPlayerBootstrap').then((m) => ({
    default: m.ListenTogetherPlayerBootstrap,
  })),
)
const TasteFeastCeremonyHost = lazyWithRetry(() =>
  import('./apps/takeout/TasteFeastCeremonyHost').then((m) => ({
    default: m.TasteFeastCeremonyHost,
  })),
)

function SuspenseApp({
  children,
  label,
  /** true：开屏已就绪 / 后台预挂，不再甩进度条 */
  skipFallback,
}: {
  children: ReactNode
  label?: string
  skipFallback?: boolean
}) {
  return (
    <LazyChunkErrorBoundary label={label}>
      <Suspense fallback={skipFallback ? null : <LazyRouteFallback label={label} />}>{children}</Suspense>
    </LazyChunkErrorBoundary>
  )
}

type Route =
  | { name: 'home' }
  | { name: 'customize' }
  | { name: 'userAccount'; tab?: UserAccountTab; authTab?: 'login' | 'register' }
  | { name: 'app'; id: AppSlot['id'] }

function resolveInitialPhoneRoute(): Route {
  if (typeof window === 'undefined') return { name: 'home' }
  const authTab = resolveDiscordAuthTabAfterOAuth()
  if (authTab) {
    return { name: 'userAccount', tab: 'auth', authTab }
  }
  return { name: 'home' }
}

function shouldSkipSplashOnBoot(): boolean {
  if (typeof window === 'undefined') return false
  return !!resolveDiscordAuthTabAfterOAuth()
}

const transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }

function buildPageProps(disableTransitions: boolean) {
  if (disableTransitions) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
      transition: { duration: 0 },
      style: {
        willChange: 'auto',
      },
    }
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition,
    style: {
      willChange: 'transform, opacity',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden' as const,
      WebkitBackfaceVisibility: 'hidden' as const,
    },
  }
}
const ENTRY_NOTICE_KEY = 'entry-notice-accepted-v1'
const localDevBypassAuth = isLocalDevBypassAuth()

export function PhoneApp() {
  const { state } = useCustomization()
  const fullScreen = state.ui.fullScreen
  const disableTransitions = state.ui.disablePageTransitions
  const pageProps = buildPageProps(disableTransitions)
  const [route, setRoute] = useState<Route>(resolveInitialPhoneRoute)
  /** 开屏动画前：HTML 进度条 → 就绪后再播 Splash */
  const skipSplashOnBoot = shouldSkipSplashOnBoot()
  const [bootDone, setBootDone] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [wechatKeepAlive, setWechatKeepAlive] = useState(false)
  const [showEntryNotice, setShowEntryNotice] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [riskConfirmed, setRiskConfirmed] = useState(false)
  const [userAuthStatus, setUserAuthStatus] = useState<UserLoginStatus | null>(
    () => (localDevBypassAuth ? LOCAL_DEV_MOCK_STATUS : null),
  )
  const [userAuthReady, setUserAuthReady] = useState(() => localDevBypassAuth)
  const [banNotice, setBanNotice] = useState<string | null>(() => readBannedNotice()?.message ?? null)
  const [sessionKickedNotice, setSessionKickedNotice] = useState<string | null>(() => readSessionKickedNotice())
  const [authVerifyError, setAuthVerifyError] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(false)
  const [showEvolutionPush, setShowEvolutionPush] = useState(false)
  const [showQixiEnvelope, setShowQixiEnvelope] = useState(false)
  const [qixiWithCeremony, setQixiWithCeremony] = useState(true)
  /** 演进面板本轮已结束（未弹或已关），才允许七夕跟进 */
  const [evolutionPushSettled, setEvolutionPushSettled] = useState(false)
  /** Splash 结束后再挂听一听 / 宴席等次要运行时，减轻首开 */
  const [deferSecondaryRuntime, setDeferSecondaryRuntime] = useState(false)
  const openVerifiedRef = useRef(localDevBypassAuth || readAuthVerified())
  /** 本次页面加载是否已做过开屏后的唯一一次账号检测（刷新页面会重置） */
  const sessionBootAuthDoneRef = useRef(false)

  const enableSplashScreen = state.ui.enableSplashScreen !== false

  const handleBootReady = useCallback(() => {
    setBootDone(true)
    // 用同步 localStorage 偏好，避免 IDB 水合前误用默认「开启」
    const splashOn = !skipSplashOnBoot && readEnableSplashScreenSync()
    setShowSplash(splashOn)
  }, [skipSplashOnBoot])

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  /** 设置里关掉开屏，或水合后发现已关闭：立刻停掉正在播的开屏 */
  useEffect(() => {
    if (!enableSplashScreen && showSplash) {
      setShowSplash(false)
    }
  }, [enableSplashScreen, showSplash])

  /** 开屏一结束就后台挂起微信（hidden），点开时不应再出「打开微信…」进度条 */
  useEffect(() => {
    if (!bootDone) return
    setWechatKeepAlive(true)
    void loadWeChatAppDefault()
  }, [bootDone])

  useEffect(() => {
    if (!bootDone || showSplash) return
    prefetchAppChunk('wechat')
    const t = window.setTimeout(() => setDeferSecondaryRuntime(true), 1800)
    return () => window.clearTimeout(t)
  }, [bootDone, showSplash])

  /** 桌面稳定后：把开屏已下载的壳资源写入 SW（剧本杀仍不缓存） */
  useEffect(() => {
    if (!bootDone || showSplash) return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      void persistLoadedAssetsToServiceWorker()
    }
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        cancelIdleCallback?: (id: number) => void
      }
    ).requestIdleCallback
    let idleId = 0
    const warm = window.setTimeout(() => {
      if (typeof ric === 'function') {
        idleId = ric(run, { timeout: 5000 })
      } else {
        run()
      }
    }, 1200)
    return () => {
      cancelled = true
      window.clearTimeout(warm)
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [bootDone, showSplash])

  useEffect(() => {
    if (localDevBypassAuth) openVerifiedRef.current = true
  }, [])

  useEffect(() => {
    if (localDevBypassAuth && import.meta.env.DEV) {
      console.info('[Lumi] 本地开发模式：已跳过账号登录与状态检测')
    }
    if (!localDevBypassAuth && import.meta.env.DEV) {
      console.info('[Lumi] 本地开发模式：已启用账号登录与状态检测（验证完请在 .env.development 改回 bypass）')
    }
  }, [])

  const handleKickedToLogin = useCallback(() => {
    setUserAuthStatus(null)
    setBanNotice(readBannedNotice()?.message ?? null)
    setSessionKickedNotice(readSessionKickedNotice())
    setUserAuthReady(true)
    setRoute({ name: 'home' })
  }, [])

  const goHome = useCallback(() => setRoute({ name: 'home' }), [])

  const openApp = useCallback((id: AppSlot['id']) => {
    // 点图标瞬间先拉 chunk，和路由切换并行，减少「打开…」卡住
    prefetchAppChunk(id === 'appearance' ? 'appearance' : id)
    if (id === 'wechat') setWechatKeepAlive(true)
    if (id === 'weibo') {
      setWechatKeepAlive(true)
      setRoute({ name: 'app', id: 'wechat' })
      window.dispatchEvent(new CustomEvent(LUMI_PULSE_NAVIGATE_EVENT))
      return
    }
    if (id === 'appearance') {
      setRoute({ name: 'customize' })
      return
    }
    setRoute({ name: 'app', id })
  }, [])

  const wechatVisible = route.name === 'app' && route.id === 'wechat'

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (shouldSkipSplashOnBoot()) {
      setShowEntryNotice(false)
      return
    }
    const accepted = window.localStorage.getItem(ENTRY_NOTICE_KEY) === '1'
    setShowEntryNotice(!accepted)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (!window.localStorage.getItem(LUMI_SYS_FIRST_BOOT_KEY)) {
        window.localStorage.setItem(LUMI_SYS_FIRST_BOOT_KEY, String(Date.now()))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (route.name === 'app' && route.id !== 'wechat') {
      dispatchPhoneDismissOverlays()
    }
  }, [route])

  useEffect(() => {
    let cancelled = false
    const run = () => {
      void import('./apps/wechat/newFriendsPersona/idb').then(({ personaDb }) => {
        if (!cancelled) void personaDb.purgeExpiredIndexedTrash()
      })
    }
    /** 首屏稳定后再清回收站，避免与开屏抢主线程 / IDB */
    const warm = window.setTimeout(run, 12_000)
    const t = window.setInterval(run, 120_000)
    return () => {
      cancelled = true
      window.clearTimeout(warm)
      window.clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<{ id: AppSlot['id'] }>
      const id = ce.detail?.id
      if (!id) return
      if (id === 'wechat') setWechatKeepAlive(true)
      openApp(id)
    }
    window.addEventListener('phone:open-app', onOpen as EventListener)
    return () => window.removeEventListener('phone:open-app', onOpen as EventListener)
  }, [openApp])

  const handleNoticeConfirm = useCallback(() => {
    if (!ageConfirmed || !riskConfirmed) return
    window.localStorage.setItem(ENTRY_NOTICE_KEY, '1')
    setShowEntryNotice(false)
  }, [ageConfirmed, riskConfirmed])

  const refreshUserAuth = useCallback(async () => {
    if (localDevBypassAuth) {
      openVerifiedRef.current = true
      setAuthChecking(false)
      setUserAuthStatus(LOCAL_DEV_MOCK_STATUS)
      setAuthVerifyError(null)
      setBanNotice(null)
      setSessionKickedNotice(null)
      setUserAuthReady(true)
      return
    }

    if (!getAuthToken()) {
      if (readBannedNotice()) {
        setAuthChecking(true)
        setUserAuthReady(false)
        setAuthVerifyError(null)
        try {
          await waitForStatusCheckOverlay()
          setUserAuthStatus(readLocalAccountGateStatus())
          setBanNotice(readBannedNotice()?.message ?? null)
          setSessionKickedNotice(readSessionKickedNotice())
        } finally {
          setAuthChecking(false)
          setUserAuthReady(true)
        }
        return
      }
      openVerifiedRef.current = false
      setAuthChecking(false)
      setUserAuthStatus(null)
      setAuthVerifyError(null)
      setBanNotice(readBannedNotice()?.message ?? null)
      setSessionKickedNotice(readSessionKickedNotice())
      setUserAuthReady(true)
      return
    }

    setAuthChecking(true)
    setUserAuthReady(false)
    setAuthVerifyError(null)
    const checkStarted = Date.now()
    try {
      const status = await fetchUserStatus({ force: true, timeoutMs: STATUS_FETCH_TIMEOUT_MS })
      // 401/挤下线/封禁等会在请求层清掉 token；保留本地登录态以便同浏览器免重复输密码
      if (!getAuthToken()) {
        openVerifiedRef.current = false
        handleKickedToLogin()
        return
      }
      if (!status) {
        // 网络/超时：绝不 clearAuth。已验证过的账号可离线进；否则提示重试（账号密码仍在缓存）
        const local = readLocalUserLoginStatus()
        if (canEnterHomeOffline() && local) {
          openVerifiedRef.current = true
          const guard = await runLumiSessionGuard()
          if (guard === 'displaced' || guard === 'banned') {
            openVerifiedRef.current = false
            handleKickedToLogin()
            return
          }
          setUserAuthStatus(local)
          setAuthVerifyError(null)
          setBanNotice(readBannedNotice()?.message ?? null)
          setSessionKickedNotice(readSessionKickedNotice())
          setUserAuthReady(true)
          return
        }
        openVerifiedRef.current = false
        setUserAuthStatus(local)
        setAuthVerifyError(resolveOfflineAuthVerifyError(local))
        setBanNotice(readBannedNotice()?.message ?? null)
        setSessionKickedNotice(readSessionKickedNotice())
        setUserAuthReady(true)
        return
      }
      openVerifiedRef.current = true

      const guard = await runLumiSessionGuard()
      if (guard === 'displaced' || guard === 'banned') {
        openVerifiedRef.current = false
        handleKickedToLogin()
        return
      }

      setUserAuthStatus(status)
      setAuthVerifyError(null)
      setBanNotice(readBannedNotice()?.message ?? null)
      setSessionKickedNotice(readSessionKickedNotice())
      setUserAuthReady(true)
    } finally {
      const remain = STATUS_CHECK_MIN_OVERLAY_MS - (Date.now() - checkStarted)
      if (remain > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remain))
      }
      setAuthChecking(false)
    }
  }, [handleKickedToLogin])

  useEffect(() => {
    if (localDevBypassAuth) return
    if (!bootDone || showSplash || showEntryNotice) return
    if (sessionBootAuthDoneRef.current) return
    sessionBootAuthDoneRef.current = true
    if (shouldShowAccountStatusCheck()) {
      setAuthChecking(true)
      setUserAuthReady(false)
    }
    void refreshUserAuth()
  }, [bootDone, showSplash, showEntryNotice, refreshUserAuth])

  const needsCorrection = needsUserInfoCorrection(userAuthStatus)

  const showUserAuthModal =
    !localDevBypassAuth &&
    bootDone &&
    !showSplash &&
    !showEntryNotice &&
    !authChecking &&
    !needsCorrection &&
    route.name === 'home' &&
    userAuthReady &&
    (!!authVerifyError ||
      !userAuthStatus ||
      !isUserActivated(userAuthStatus))

  const showInfoCorrectionModal =
    !localDevBypassAuth &&
    bootDone &&
    !showSplash &&
    !showEntryNotice &&
    !authChecking &&
    userAuthReady &&
    needsCorrection &&
    !!userAuthStatus

  const showAccountStatusChecking =
    !localDevBypassAuth &&
    bootDone &&
    !showSplash &&
    !showEntryNotice &&
    route.name === 'home' &&
    shouldShowAccountStatusCheck() &&
    (authChecking || !userAuthReady)

  const userAuthStatusOnly =
    !!userAuthStatus && !isUserActivated(userAuthStatus)

  const canOfferEvolutionPush =
    bootDone &&
    !showSplash &&
    !showEntryNotice &&
    !showAccountStatusChecking &&
    !showUserAuthModal &&
    !showInfoCorrectionModal &&
    route.name === 'home' &&
    (localDevBypassAuth ||
      (userAuthReady && !!userAuthStatus && isUserActivated(userAuthStatus)))

  useEffect(() => {
    if (!canOfferEvolutionPush) {
      setShowEvolutionPush((prev) => (prev ? false : prev))
      setEvolutionPushSettled(false)
      return
    }
    setEvolutionPushSettled(false)
    let cancelled = false
    void import('./apps/evolution/evolutionLogData').then(({ getLatestEvolutionRecord }) => {
      if (cancelled) return
      const version = getLatestEvolutionRecord().version
      clearLegacyEvolutionPushSessionDismiss()
      // 开发环境：URL 带 ?evolutionPush=1 时强制清关闭标记并弹出
      if (import.meta.env.DEV) {
        try {
          const q = new URLSearchParams(window.location.search)
          if (q.get('evolutionPush') === '1') {
            resetEvolutionPushDismissals()
          }
        } catch {
          // ignore
        }
      }
      if (!shouldOfferEvolutionPush(version)) {
        setShowEvolutionPush(false)
        setEvolutionPushSettled(true)
        return
      }
      setShowEvolutionPush(true)
    })
    return () => {
      cancelled = true
    }
  }, [canOfferEvolutionPush])

  useEffect(() => {
    if (!canOfferEvolutionPush) {
      setShowQixiEnvelope(false)
      return
    }
    if (showEvolutionPush || !evolutionPushSettled) return

    if (import.meta.env.DEV) {
      try {
        const q = new URLSearchParams(window.location.search)
        if (q.get('qixi') === '1') {
          resetQixiEnvelopeDismissals()
          setQixiWithCeremony(true)
          setShowQixiEnvelope(true)
          return
        }
      } catch {
        // ignore
      }
    }

    if (!shouldOfferQixiEnvelope()) return
    setQixiWithCeremony(true)
    setShowQixiEnvelope(true)
  }, [canOfferEvolutionPush, showEvolutionPush, evolutionPushSettled])

  /** 桌面入口：当日可重复打开 */
  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<QixiOpenEventDetail>).detail
      setQixiWithCeremony(detail?.withCeremony === true)
      setShowQixiEnvelope(true)
    }
    window.addEventListener(QIXI_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(QIXI_OPEN_EVENT, onOpen)
  }, [])

  const handleRetryAuthVerify = useCallback(() => {
    openVerifiedRef.current = false
    setAuthVerifyError(null)
    setUserAuthReady(false)
    void refreshUserAuth()
  }, [refreshUserAuth])

  const handleUserAuthed = useCallback((status: UserLoginStatus) => {
    openVerifiedRef.current = true
    setUserAuthStatus(status)
    setAuthVerifyError(null)
    setBanNotice(null)
    setSessionKickedNotice(null)
    if (isUserActivated(status)) {
      setAuthVerified()
    }
  }, [])

  const openUserAccount = useCallback((tab: UserAccountTab = 'overview', authTab?: 'login' | 'register') => {
    setRoute({ name: 'userAccount', tab, authTab: authTab ?? (tab === 'auth' ? 'register' : undefined) })
  }, [])

  useEffect(() => {
    void runDiscordOAuthCallbackFromUrl().then((result) => {
      if (!result) return
      if (result.kind === 'login' && result.ok) {
        handleUserAuthed(result.status)
        if (result.status.banStatus === 'banned') {
          openUserAccount('unban', 'login')
        } else if (!result.lumiEntry) {
          openUserAccount('overview', 'login')
        }
        return
      }
      if (result.kind === 'register' && result.ok) {
        storeDiscordRegisterPending({
          registerToken: result.registerToken,
          discordId: result.discordId,
          discordHandle: result.discordHandle,
          discordDisplayName: result.discordDisplayName,
          discordUsername: result.discordUsername,
          fromUnregisteredLogin: result.fromUnregisteredLogin,
          fromCommunityTroubleshoot: consumeDiscordRegisterFromCommunityTroubleshoot(),
        })
        openUserAccount('auth', result.fromUnregisteredLogin ? 'login' : 'register')
        return
      }
      storeDiscordOAuthError(result.error)
      openUserAccount('auth', result.kind === 'register' ? 'register' : 'login')
    })
  }, [handleUserAuthed, openUserAccount])

  const handleUserAccountBack = useCallback(() => {
    setRoute({ name: 'home' })
  }, [])

  const syncUserAuthFromLocal = useCallback(() => {
    if (!getAuthToken()) {
      openVerifiedRef.current = false
      setUserAuthStatus(null)
      setAuthVerifyError(null)
      setBanNotice(readBannedNotice()?.message ?? null)
      setSessionKickedNotice(readSessionKickedNotice())
      setUserAuthReady(true)
      return
    }
    openVerifiedRef.current = readAuthVerified()
    setUserAuthStatus(readLocalUserLoginStatus())
    setAuthVerifyError(null)
    setBanNotice(readBannedNotice()?.message ?? null)
    setSessionKickedNotice(readSessionKickedNotice())
    setUserAuthReady(true)
  }, [])

  return (
    <div
      className={
        fullScreen
          ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
          : 'flex min-h-0 min-w-0 flex-1 flex-col'
      }
    >
      <ApiSettingsProvider>
        <WorldbookLoreProvider>
        {deferSecondaryRuntime ? (
          <Suspense fallback={null}>
            <ListenTogetherPlayerBootstrap />
          </Suspense>
        ) : null}
        <PhoneShell>
          {wechatKeepAlive ? (
            <div
              className={`route-page-layer flex h-full min-h-0 flex-col bg-white ${
                wechatVisible ? 'absolute inset-0 z-[20]' : 'hidden'
              }`}
              aria-hidden={!wechatVisible}
            >
              <SuspenseApp
                label="打开微信…"
                // 开屏已拉好、或仍在桌面后台挂载：绝不弹进度条抢戏
                skipFallback={isWeChatAppModuleReady() || !wechatVisible}
              >
                <WeChatApp onBack={goHome} />
              </SuspenseApp>
            </div>
          ) : null}
          <AnimatePresence mode="sync" initial={false}>
            {route.name === 'home' && (
              <motion.div
                key="home"
                className={`route-page-layer relative flex h-full min-h-0 flex-col ${disableTransitions ? '' : 'transform-gpu'}`}
                {...pageProps}
                initial={false}
              >
                <HomeScreen
                  onOpenApp={openApp}
                  onOpenUserAccount={() => openUserAccount('overview')}
                  onUserAccountAuthChange={syncUserAuthFromLocal}
                />
              </motion.div>
            )}
            {route.name === 'userAccount' && (
              <motion.div
                key="userAccount"
                className={`route-page-layer flex h-full min-h-0 flex-col ${disableTransitions ? '' : 'transform-gpu'}`}
                {...pageProps}
              >
                <SuspenseApp label="打开账号…">
                  <UserAccountApp
                    onBack={handleUserAccountBack}
                    initialTab={route.tab}
                    initialAuthTab={route.authTab}
                    onAuthChange={syncUserAuthFromLocal}
                  />
                </SuspenseApp>
              </motion.div>
            )}
            {route.name === 'customize' && (
              <motion.div
                key="customize"
                className={`route-page-layer flex h-full min-h-0 flex-col ${disableTransitions ? '' : 'transform-gpu'}`}
                {...pageProps}
              >
                <SuspenseApp label="打开外观…">
                  <CustomizeScreen onBack={goHome} />
                </SuspenseApp>
              </motion.div>
            )}
            {route.name === 'app' && route.id !== 'wechat' && (
              <motion.div
                key={`app-${route.id}`}
                className={`route-page-layer flex h-full min-h-0 flex-col ${disableTransitions ? '' : 'transform-gpu'}`}
                {...pageProps}
              >
                <SuspenseApp>
                  {route.id === 'lumiMeet' ? (
                    <LumiMeetAppRoute onBack={goHome} />
                  ) : route.id === 'api' ? (
                    <ApiSettingsApp onBack={goHome} />
                  ) : route.id === 'voiceprint' ? (
                    <VoiceprintHubApp onBack={goHome} />
                  ) : route.id === 'dataArchive' ? (
                    <DataArchiveApp onBack={goHome} />
                  ) : route.id === 'loreArchive' ? (
                    <LoreArchiveApp onBack={goHome} />
                  ) : route.id === 'recycleBin' ? (
                    <RecycleBinApp onBack={goHome} />
                  ) : route.id === 'backgroundNotify' ? (
                    <BackgroundNotifyApp onBack={goHome} />
                  ) : route.id === 'sandbox' ? (
                    <SandboxApp onBack={goHome} />
                  ) : route.id === 'evolution' ? (
                    <EvolutionApp onBack={goHome} />
                  ) : route.id === 'takeout' ? (
                    <LumiTasteApp onBack={goHome} />
                  ) : (
                    <AppPlaceholderScreen appId={route.id} onBack={goHome} />
                  )}
                </SuspenseApp>
              </motion.div>
            )}
          </AnimatePresence>
          {deferSecondaryRuntime ? (
            <Suspense fallback={null}>
              <TasteFeastCeremonyHost />
            </Suspense>
          ) : null}
        </PhoneShell>
        </WorldbookLoreProvider>
        {!bootDone ? (
          <BootResourceGate enabled={!skipSplashOnBoot} onReady={handleBootReady} />
        ) : null}
        {showSplash && <SplashScreen onComplete={handleSplashComplete} maxMs={3200} />}
        <EntryNoticeModal
          open={bootDone && !showSplash && showEntryNotice}
          ageConfirmed={ageConfirmed}
          riskConfirmed={riskConfirmed}
          onToggleAge={setAgeConfirmed}
          onToggleRisk={setRiskConfirmed}
          onConfirm={handleNoticeConfirm}
        />
        <AccountStatusCheckingOverlay open={showAccountStatusChecking} />
        {showEvolutionPush ? (
          <Suspense fallback={null}>
            <EvolutionUpdatePushModal
              open={showEvolutionPush}
              onClose={() => {
                setShowEvolutionPush(false)
                setEvolutionPushSettled(true)
              }}
              onOpenEvolution={() => openApp('evolution')}
            />
          </Suspense>
        ) : null}
        {showQixiEnvelope ? (
          <Suspense fallback={null}>
            <QixiEnvelopeModal
              open={showQixiEnvelope}
              withCeremony={qixiWithCeremony}
              onClose={() => setShowQixiEnvelope(false)}
            />
          </Suspense>
        ) : null}
        <UserSystemAuthModal
          open={showUserAuthModal}
          statusOnly={userAuthStatusOnly}
          initialStatus={userAuthStatus}
          banNotice={banNotice}
          sessionKickedNotice={sessionKickedNotice}
          authVerifyError={authVerifyError}
          onAuthed={handleUserAuthed}
          onRetryAuthVerify={handleRetryAuthVerify}
          onOpenAccount={(tab) => {
            openUserAccount(tab ?? 'overview')
          }}
        />
        {userAuthStatus ? (
          <UserInfoCorrectionModal
            open={showInfoCorrectionModal}
            status={userAuthStatus}
            onCorrected={(status) => {
              setUserAuthStatus(status)
              setUserAuthReady(true)
            }}
            onLogout={() => {
              openVerifiedRef.current = false
              setUserAuthStatus(null)
              setUserAuthReady(true)
            }}
          />
        ) : null}
      </ApiSettingsProvider>
    </div>
  )
}
