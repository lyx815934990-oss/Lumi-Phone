/** 首开预热 / 缓存：排除剧本杀与超大媒体 */

import { importNamedWithRetry } from '../lazyWithRetry'
import { loadWeChatAppDefault } from './wechatAppModule'

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
  /** 开屏优先单独拉的大包（微信） */
  critical?: boolean
  load: () => Promise<unknown>
}

/**
 * 非剧本杀路由 / 发现页 chunk（与 PhoneApp / Discover 的 lazy 对齐）。
 * 绝不包含 jubensha / JBSGameFlow / 对局媒体。
 */
const BOOT_PRELOAD_TASKS: PreloadTask[] = [
  { label: '微信', critical: true, load: () => loadWeChatAppDefault() },
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
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return await Promise.race([
    promise.then((v) => v as T),
    sleep(ms).then(() => 'timeout' as const),
  ])
}

async function runPreloadQueue(
  tasks: PreloadTask[],
  onProgress?: (p: BootPreloadProgress) => void,
  opts?: {
    concurrency?: number
    overallTimeoutMs?: number
    perTaskTimeoutMs?: number
    /** true：超时不假装全部完成 */
    strict?: boolean
  },
): Promise<{ completed: number; total: number }> {
  const total = tasks.length
  if (total === 0) return { completed: 0, total: 0 }

  const mobile = isMobileBootClient()
  let done = 0
  let cursor = 0
  const concurrency = Math.max(1, Math.min(opts?.concurrency ?? (mobile ? 2 : 3), total))
  const perTaskTimeoutMs = opts?.perTaskTimeoutMs ?? (mobile ? 45_000 : 60_000)
  const overallTimeoutMs = opts?.overallTimeoutMs ?? 300_000
  const strict = opts?.strict === true

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
      let ok = false
      try {
        const result = await withTimeout(
          importNamedWithRetry(task.load, {
            retries: mobile ? 4 : 3,
            baseDelayMs: mobile ? 600 : 400,
          }),
          perTaskTimeoutMs,
        )
        ok = result !== 'timeout'
      } catch {
        ok = false
      }
      // 只有真加载成功才推进度——超时/失败绝不假装完成
      if (ok) {
        done += 1
        report(done >= total ? '应用资源已就绪' : `正在准备${task.label}…`)
      } else {
        report(`正在准备${task.label}…`)
      }
    }
  }

  const raced = await withTimeout(
    Promise.all(Array.from({ length: concurrency }, () => worker())),
    overallTimeoutMs,
  )

  if (raced === 'timeout' && !strict) {
    // 后台暖场才允许用已完成数收尾；不把失败项标满
    report(done >= total ? '应用资源已就绪' : '仍有资源在后台继续…')
  }

  return { completed: done, total }
}

/**
 * 微信：在时限内反复等同一 Promise，绝不把超时当成成功。
 */
async function preloadWeChatUntilReady(
  onProgress?: (p: BootPreloadProgress) => void,
  budgetMs = 300_000,
): Promise<boolean> {
  const started = Date.now()
  onProgress?.({ done: 0, total: 1, ratio: 0, label: '正在准备微信…' })

  while (Date.now() - started < budgetMs) {
    try {
      const remain = Math.max(5_000, budgetMs - (Date.now() - started))
      // 直接拉 lazy 用的 default Promise，保证开屏完成 = 点开可同步用
      const result = await withTimeout(loadWeChatAppDefault(), Math.min(remain, 90_000))
      if (result !== 'timeout') {
        onProgress?.({ done: 1, total: 1, ratio: 1, label: '微信已就绪' })
        return true
      }
      onProgress?.({ done: 0, total: 1, ratio: 0.15, label: '微信仍在下载…' })
    } catch {
      onProgress?.({ done: 0, total: 1, ratio: 0.05, label: '微信下载受阻，重试中…' })
      await sleep(1200)
    }
  }
  return false
}

/**
 * 开屏拉齐全部非剧本杀 App / 发现页 chunk。
 * 微信用单例 Promise 优先拉满；失败不假报完成。
 */
export async function preloadAllNonJubenshaBootResources(
  onProgress?: (p: BootPreloadProgress) => void,
): Promise<void> {
  const mobile = isMobileBootClient()
  const rest = BOOT_PRELOAD_TASKS.filter((t) => t.label !== '微信')
  const totalAll = BOOT_PRELOAD_TASKS.length
  let finished = 0

  const mapProgress = (local: BootPreloadProgress, baseDone: number, localTotal = local.total) => {
    const done = baseDone + local.done
    const ratioBase = totalAll > 0 ? Math.min(done, totalAll) / totalAll : 1
    // 微信未完成时，局部 ratio 也反映出来
    const ratio =
      localTotal > 0 && local.done < localTotal
        ? Math.min(ratioBase, (baseDone + local.ratio) / totalAll)
        : ratioBase
    onProgress?.({
      done: Math.min(done, totalAll),
      total: totalAll,
      ratio: Math.min(1, Math.max(0, ratio)),
      label: local.label,
    })
  }

  const wechatOk = await preloadWeChatUntilReady((p) => mapProgress(p, 0), 180_000)
  finished = wechatOk ? 1 : 0

  if (rest.length) {
    await runPreloadQueue(rest, (p) => mapProgress(p, finished), {
      concurrency: mobile ? 2 : 3,
      overallTimeoutMs: wechatOk ? 120_000 : 60_000,
      perTaskTimeoutMs: mobile ? 30_000 : 40_000,
      strict: true,
    })
  }
}

/**
 * @deprecated 请用 {@link preloadAllNonJubenshaBootResources}
 */
export async function preloadCriticalBootResources(
  onProgress?: (p: BootPreloadProgress) => void,
): Promise<void> {
  await preloadAllNonJubenshaBootResources(onProgress)
}

/**
 * 进桌面后补拉：若开屏被总超时打断，再静默暖一轮。
 */
export function scheduleBackgroundAppWarm(): void {
  if (typeof window === 'undefined') return
  const tasks = BOOT_PRELOAD_TASKS
  if (!tasks.length) return

  const run = () => {
    void (async () => {
      await preloadWeChatUntilReady(undefined, 180_000)
      await runPreloadQueue(
        tasks.filter((t) => t.label !== '微信'),
        undefined,
        {
          concurrency: isMobileBootClient() ? 1 : 2,
          overallTimeoutMs: 180_000,
          perTaskTimeoutMs: isMobileBootClient() ? 45_000 : 60_000,
          strict: false,
        },
      )
      void persistLoadedAssetsToServiceWorker()
    })()
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
 * @deprecated 请用 {@link preloadAllNonJubenshaBootResources}
 */
export async function preloadNonJubenshaResources(
  onProgress?: (p: BootPreloadProgress) => void,
  opts?: { concurrency?: number; overallTimeoutMs?: number },
): Promise<void> {
  void opts
  await preloadAllNonJubenshaBootResources(onProgress)
}

/**
 * @deprecated 请用 {@link scheduleBackgroundAppWarm}
 */
export function warmNonJubenshaAppChunks(): void {
  scheduleBackgroundAppWarm()
}

/** 按 app id 预取对应 lazy chunk（点图标瞬间先拉，减少白屏） */
const APP_IMPORT_BY_ID: Partial<Record<string, () => Promise<unknown>>> = {
  wechat: () => loadWeChatAppDefault(),
  weibo: () => loadWeChatAppDefault(),
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
}

const appPrefetchStarted = new Set<string>()

export function prefetchAppChunk(id: string): void {
  if (!id || appPrefetchStarted.has(id)) return
  const load = APP_IMPORT_BY_ID[id]
  if (!load) return
  appPrefetchStarted.add(id)
  void load().catch(() => {
    appPrefetchStarted.delete(id)
  })
}
