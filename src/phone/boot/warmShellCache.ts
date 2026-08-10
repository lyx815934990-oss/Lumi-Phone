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
  /** 手机端弱网只预热标为 critical 的项，避免卡在 82% */
  critical?: boolean
  load: () => Promise<unknown>
}

/**
 * 开屏必须拉齐的非剧本杀路由 / 发现页 chunk（与 PhoneApp / Discover 的 lazy 对齐）。
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
    critical: true,
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

/**
 * 开屏阶段限流预取：进桌面前把常用 App 与发现页 chunk 拉进浏览器缓存。
 * 单项失败 / 超时不阻断；手机端只预热 critical，并带总时限，避免卡在 82%。
 */
export async function preloadNonJubenshaResources(
  onProgress?: (p: BootPreloadProgress) => void,
  opts?: { concurrency?: number; overallTimeoutMs?: number },
): Promise<void> {
  const mobile = isMobileBootClient()
  const tasks = mobile
    ? BOOT_PRELOAD_TASKS.filter((t) => t.critical)
    : BOOT_PRELOAD_TASKS
  const total = tasks.length
  if (total === 0) return

  let done = 0
  let cursor = 0
  const concurrency = Math.max(
    1,
    Math.min(opts?.concurrency ?? (mobile ? 1 : 2), total),
  )
  const perTaskTimeoutMs = mobile ? 7_000 : 14_000
  const overallTimeoutMs =
    opts?.overallTimeoutMs ?? (mobile ? 12_000 : 28_000)

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
            retries: mobile ? 1 : 3,
            baseDelayMs: mobile ? 350 : 450,
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
  // 总超时也直接放行
  if (done < total) {
    done = total
    report('应用资源已就绪')
  }
}

/**
 * @deprecated 请用 {@link preloadNonJubenshaResources}（开屏阶段已全量预热）
 * 保留空实现以免旧调用处报错。
 */
export function warmNonJubenshaAppChunks(): void {
  // no-op：开屏 BootResourceGate 已预取
}
