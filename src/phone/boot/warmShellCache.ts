/** 首开预热 / 缓存：排除剧本杀与超大媒体 */

import { importNamedWithRetry } from '../lazyWithRetry'

const SKIP_URL_RE =
  /JBSGameFlow|jubensha|Jubensha|jbsChat|剧本杀|\.mp4(?:$|\?)|聊天室背景/i

export function shouldSkipBootAssetUrl(url: string): boolean {
  return SKIP_URL_RE.test(url)
}

function collectLoadedAssetUrls(): string[] {
  if (typeof performance === 'undefined') return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    const name = String(entry.name || '')
    if (!name || shouldSkipBootAssetUrl(name)) continue
    if (!name.includes('/assets/') && !name.includes('/src/')) continue
    if (!/\.(js|css|woff2?)($|\?)/i.test(name) && !name.includes('/assets/')) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/** 把已下载的壳资源交给 SW 持久缓存（不含剧本杀） */
export async function persistLoadedAssetsToServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const urls = collectLoadedAssetUrls()
    if (!urls.length || !reg.active) return
    reg.active.postMessage({ type: 'lumi-cache-urls', urls })
  } catch {
    // ignore
  }
}

type PreloadTask = {
  /** 进度文案里的短名 */
  label: string
  /** 开屏只等 critical；其余进桌面后 idle 预热 */
  critical?: boolean
  load: () => Promise<unknown>
}

/**
 * 非剧本杀路由 / 发现页 chunk（与 PhoneApp / Discover 的 lazy 对齐）。
 * 绝不包含 jubensha / JBSGameFlow / 对局媒体。
 */
const BOOT_PRELOAD_TASKS: PreloadTask[] = [
  { label: '微信', critical: true, load: () => import('../apps/wechat/WeChatApp') },
  { label: '账号', critical: true, load: () => import('../apps/userAccount/UserAccountApp') },
  { label: '外观', critical: true, load: () => import('../components/CustomizeScreen') },
  { label: '遇见', load: () => import('../apps/lumiMeet/LumiMeetAppRoute') },
  { label: 'API', critical: true, load: () => import('../apps/api/ApiSettingsApp') },
  { label: '声纹', load: () => import('../apps/voiceprint/VoiceprintHubApp') },
  { label: '数据中心', load: () => import('../apps/dataArchive/DataArchiveApp') },
  { label: '档案室', load: () => import('../apps/loreArchive/LoreArchiveApp') },
  { label: '回收站', load: () => import('../apps/recycleBin/RecycleBinApp') },
  { label: '后台通知', load: () => import('../apps/backgroundNotify/BackgroundNotifyApp') },
  { label: '幻境', load: () => import('../apps/sandbox/SandboxApp') },
  { label: '演进录', load: () => import('../apps/evolution/EvolutionApp') },
  { label: '外卖', load: () => import('../apps/takeout/LumiTasteApp') },
  { label: '更新推送', load: () => import('../apps/evolution/EvolutionUpdatePushModal') },
  {
    label: '听一听',
    load: () => import('../../components/discoverListen/ListenTogetherPlayerBootstrap'),
  },
  { label: '宴席', load: () => import('../apps/takeout/TasteFeastCeremonyHost') },
  // 发现页（不含剧本杀馆）
  { label: '朋友圈', load: () => import('../../components/moments/WeChatMomentsPage') },
  {
    label: '听一听页',
    load: () => import('../../components/discoverListen/DiscoverListenTogetherApp'),
  },
  { label: '匿问我答', load: () => import('../../components/anonymousQa/AnonymousQnAApp') },
  { label: '微博广场', load: () => import('../apps/lumiPulse/WeChatDiscoverLumiPulseApp') },
  { label: '浮光直播', load: () => import('../apps/lumiLive') },
  { label: '私语档案', load: () => import('../apps/wechat/diary/SubconsciousArchivesApp') },
  { label: '外观工坊', load: () => import('../apps/lookWorkshop') },
]

export type BootPreloadProgress = {
  done: number
  total: number
  /** 0–1 */
  ratio: number
  label: string
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function isMobileBootClient(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true
  // iPadOS 桌面 UA
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer = 0
  try {
    return await Promise.race([
      promise.then((v) => v as T),
      sleep(ms).then(() => 'timeout' as const),
    ])
  } finally {
    window.clearTimeout(timer)
  }
}

async function runPreloadQueue(
  tasks: PreloadTask[],
  onProgress?: (p: BootPreloadProgress) => void,
  opts?: { concurrency?: number; overallTimeoutMs?: number; perTaskTimeoutMs?: number },
): Promise<void> {
  const total = tasks.length
  if (total === 0) return

  const mobile = isMobileBootClient()
  let done = 0
  let cursor = 0
  const concurrency = Math.max(
    1,
    Math.min(opts?.concurrency ?? (mobile ? 2 : 3), total),
  )
  const perTaskTimeoutMs = opts?.perTaskTimeoutMs ?? (mobile ? 6_000 : 10_000)
  const overallTimeoutMs = opts?.overallTimeoutMs ?? (mobile ? 8_000 : 12_000)

  const report = (label: string) => {
    onProgress?.({
      done,
      total,
      ratio: total > 0 ? done / total : 1,
      label,
    })
  }

  report('正在准备应用资源…')

  const worker = async () => {
    while (cursor < tasks.length) {
      const index = cursor
      cursor += 1
      const task = tasks[index]
      if (!task) break
      report(`正在准备${task.label}…`)
      try {
        const result = await withTimeout(
          importNamedWithRetry(task.load, {
            retries: mobile ? 1 : 2,
            baseDelayMs: mobile ? 280 : 400,
          }),
          perTaskTimeoutMs,
        )
        if (result === 'timeout') {
          // 弱网挂死的 dynamic import：跳过，进页再 lazy
        }
      } catch {
        // 弱网单项失败：不卡死开屏
      }
      done += 1
      report(done >= total ? '应用资源已就绪' : `正在准备${task.label}…`)
    }
  }

  await withTimeout(
    Promise.all(Array.from({ length: concurrency }, () => worker())),
    overallTimeoutMs,
  )
  if (done < total) {
    done = total
    report('应用资源已就绪')
  }
}

/**
 * 开屏只拉 critical（微信/账号/外观/API），尽快进桌面。
 */
export async function preloadCriticalBootResources(
  onProgress?: (p: BootPreloadProgress) => void,
): Promise<void> {
  const mobile = isMobileBootClient()
  const tasks = BOOT_PRELOAD_TASKS.filter((t) => t.critical)
  await runPreloadQueue(tasks, onProgress, {
    concurrency: mobile ? 2 : 3,
    overallTimeoutMs: mobile ? 7_000 : 9_000,
    perTaskTimeoutMs: mobile ? 5_500 : 8_000,
  })
}

/**
 * 进桌面后 idle 预热其余 App / 发现页，不挡首屏。
 */
export function scheduleBackgroundAppWarm(): void {
  if (typeof window === 'undefined') return
  const tasks = BOOT_PRELOAD_TASKS.filter((t) => !t.critical)
  if (!tasks.length) return

  const run = () => {
    void runPreloadQueue(tasks, undefined, {
      concurrency: isMobileBootClient() ? 1 : 2,
      overallTimeoutMs: isMobileBootClient() ? 24_000 : 40_000,
      perTaskTimeoutMs: isMobileBootClient() ? 8_000 : 12_000,
    }).then(() => {
      void persistLoadedAssetsToServiceWorker()
    })
  }

  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
  ).requestIdleCallback

  window.setTimeout(() => {
    if (typeof ric === 'function') {
      ric(run, { timeout: 3500 })
    } else {
      run()
    }
  }, 900)
}

/**
 * @deprecated 请用 {@link preloadCriticalBootResources}；保留兼容旧调用。
 */
export async function preloadNonJubenshaResources(
  onProgress?: (p: BootPreloadProgress) => void,
  opts?: { concurrency?: number; overallTimeoutMs?: number },
): Promise<void> {
  const mobile = isMobileBootClient()
  await runPreloadQueue(
    BOOT_PRELOAD_TASKS.filter((t) => t.critical),
    onProgress,
    {
      concurrency: opts?.concurrency ?? (mobile ? 2 : 3),
      overallTimeoutMs: opts?.overallTimeoutMs ?? (mobile ? 7_000 : 9_000),
    },
  )
}

/**
 * @deprecated 请用 {@link scheduleBackgroundAppWarm}
 */
export function warmNonJubenshaAppChunks(): void {
  scheduleBackgroundAppWarm()
}

/** 按 app id 预取对应 lazy chunk（点图标瞬间先拉，减少白屏） */
const APP_IMPORT_BY_ID: Partial<Record<string, () => Promise<unknown>>> = {
  wechat: () => import('../apps/wechat/WeChatApp'),
  weibo: () => import('../apps/wechat/WeChatApp'),
  appearance: () => import('../components/CustomizeScreen'),
  lumiMeet: () => import('../apps/lumiMeet/LumiMeetAppRoute'),
  api: () => import('../apps/api/ApiSettingsApp'),
  voiceprint: () => import('../apps/voiceprint/VoiceprintHubApp'),
  dataArchive: () => import('../apps/dataArchive/DataArchiveApp'),
  loreArchive: () => import('../apps/loreArchive/LoreArchiveApp'),
  recycleBin: () => import('../apps/recycleBin/RecycleBinApp'),
  backgroundNotify: () => import('../apps/backgroundNotify/BackgroundNotifyApp'),
  sandbox: () => import('../apps/sandbox/SandboxApp'),
  evolution: () => import('../apps/evolution/EvolutionApp'),
  takeout: () => import('../apps/takeout/LumiTasteApp'),
  lookWorkshop: () => import('../apps/lookWorkshop'),
}

const appPrefetchStarted = new Set<string>()

export function prefetchAppChunk(id: string): void {
  if (!id || appPrefetchStarted.has(id)) return
  const load = APP_IMPORT_BY_ID[id]
  if (!load) return
  appPrefetchStarted.add(id)
  void importNamedWithRetry(load, { retries: 1, baseDelayMs: 200 }).catch(() => {
    appPrefetchStarted.delete(id)
  })
}
