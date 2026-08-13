/**
 * 归档导出过滤：只保留用户活动产生的数据。
 * 排除代码库内置可重新加载的默认项、以及可重建的临时缓存。
 */

import { DEFAULT_CUSTOMIZATION } from '../../types'
import { DEFAULT_CHAT_THEME, DEFAULT_CHAT_THEME_ID } from '../wechat/chatTheme/types'

/** localStorage：一次性标记 / 会话态 / 教程（非用户内容） */
const LS_SKIP_EXACT = new Set([
  'entry-notice-accepted-v1',
  'lumi-mobile-layout-migrated-v1',
  'wechat-force-reregister-onboarding-v1',
  'lumi-wechat-had-core-data-v1',
  'lumi-evolution-push-dismissed-date-v1',
  'lumi-evolution-push-dismissed-date-v2',
  'lumi-enable-splash-screen',
  'us_auth_verified',
  'us_pending_ban_check',
  'us_pending_session_check',
  'us_pending_correction_check',
  'us_banned_notice',
  'us_session_kicked_notice',
  'us_cached_user_status',
])

const LS_SKIP_PREFIX = [
  'lumi-pulse-coach-',
  'lumi-wechat-appearance-guide-',
  'wechat-wealth-tutorial-',
  'wechat-wealth-dev-',
  'checkPhone.spyTutorial',
]

/** phoneKv：可重建缓存（听一听接口缓存、TTS、锚点等） */
export const PHONE_KV_CACHE_SKIP_PREFIX = [
  'listen-together-home-feed-',
  'listen-together-toplists-',
  'listen-together-featured-artists-',
  'listen-together-search-results-',
  'listen-together-artist-page-',
  'listen-together-playlist-tracks-',
  'listen-together-song-comments-',
  'listen-together-playlist-comments-',
  'listen-together-netease-profile-',
  'listen-together-player-session-',
  'wechat-local-embedding-model-cache-',
  'wechat-dating-vn-line-voice-cache-v1:',
  'wechat-dating-vn-line-tts-req-v1:',
  'wx-pv-anchor-grp:',
  'wx-grp-anchor-pv:',
  'wechat-dm-bullets-v1',
  'checkPhone.spyTutorialSeen.',
  'persona-ai-generate-form-v1:',
] as const

const PHONE_KV_SKIP_PREFIX = PHONE_KV_CACHE_SKIP_PREFIX

const PHONE_KV_SKIP_EXACT = new Set(['wechat-memory-trace-last-v1'])

export const DATING_PLOT_IMAGE_KV_PREFIX = 'wechat-dating-plot-img-v1::'

function matchesPrefix(key: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => key.startsWith(p))
}

function looksLikeCoachKey(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('coach-seen') || k.includes('coach-completed') || k.includes('-coach-')
}

/** 外观 JSON 是否仍等于代码默认（无用户改动） */
export function isUntouchedDefaultCustomizationJson(raw: string | null | undefined): boolean {
  if (!raw) return true
  try {
    const parsed = JSON.parse(raw) as unknown
    // 含 dataURL / 本地上传痕迹 → 一定是用户数据
    if (raw.includes('data:')) return false
    return stableJsonEqual(parsed, DEFAULT_CUSTOMIZATION)
  } catch {
    return false
  }
}

function stableJsonEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/** 本机可安全删除的 localStorage 键（教程/引导/会话态等） */
export function isRedundantLocalStorageKey(key: string): boolean {
  if (!key) return false
  if (LS_SKIP_EXACT.has(key)) return true
  if (matchesPrefix(key, LS_SKIP_PREFIX)) return true
  if (looksLikeCoachKey(key)) return true
  return false
}

/** 本机可安全删除的 phoneKv 缓存键（不含用户媒体） */
export function isRedundantPhoneKvCacheKey(key: string): boolean {
  if (!key) return false
  if (PHONE_KV_SKIP_EXACT.has(key)) return true
  if (matchesPrefix(key, PHONE_KV_SKIP_PREFIX)) return true
  if (looksLikeCoachKey(key)) return true
  return false
}

/** 是否应写入归档的 localStorage 键 */
export function shouldExportLocalStorageKey(key: string, value: string | null): boolean {
  if (!key) return false
  if (isRedundantLocalStorageKey(key)) return false

  if (key.startsWith('lumi-phone-custom') && isUntouchedDefaultCustomizationJson(value)) {
    return false
  }
  return true
}

/** phoneKv 行是否应导出 */
export function shouldExportPhoneKvKey(key: string, value: unknown): boolean {
  if (!key) return false
  if (isRedundantPhoneKvCacheKey(key)) return false

  if (key.startsWith('lumi-phone-custom')) {
    const raw = typeof value === 'string' ? value : JSON.stringify(value ?? null)
    if (isUntouchedDefaultCustomizationJson(raw)) return false
  }
  return true
}

type IdbRow = Record<string, unknown>

function asRow(raw: unknown): IdbRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as IdbRow
}

/** 过滤单个 object store 的行（去掉代码种子默认项） */
export function filterIdbStoreRows(storeName: string, rows: unknown[]): unknown[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows

  if (storeName === 'phoneKv') {
    return rows.filter((row) => {
      const r = asRow(row)
      if (!r) return true
      const key = typeof r.key === 'string' ? r.key : ''
      return shouldExportPhoneKvKey(key, r.value)
    })
  }

  if (storeName === 'worldBackgrounds') {
    return rows.filter((row) => {
      const r = asRow(row)
      if (!r) return true
      if (r.isPreset === true) return false
      const id = typeof r.id === 'string' ? r.id : ''
      if (id.startsWith('wb-preset-')) return false
      return true
    })
  }

  if (storeName === 'chatTheme') {
    return rows.filter((row) => {
      const r = asRow(row)
      if (!r) return true
      // 代码种子默认主题：导入后 ensureDefaultChatTheme 会再写入
      return !isDefaultChatThemeRow(r)
    })
  }

  return rows
}

function isDefaultChatThemeRow(row: IdbRow): boolean {
  const id = typeof row.id === 'string' ? row.id : ''
  if (id !== DEFAULT_CHAT_THEME_ID) return false
  try {
    const def = DEFAULT_CHAT_THEME
    return (
      row.name === def.name &&
      row.isDefault === true &&
      stableJsonEqual(row.inputBar, def.inputBar) &&
      stableJsonEqual(row.bubble, def.bubble)
    )
  } catch {
    return true
  }
}

/** 过滤整份 IDB 快照 */
export function filterIdbSnapshotForUserData(snap: {
  dbName: string
  dbVersion: number
  stores: Record<string, unknown[]>
}): {
  dbName: string
  dbVersion: number
  stores: Record<string, unknown[]>
} {
  const stores: Record<string, unknown[]> = {}
  for (const [name, rows] of Object.entries(snap.stores)) {
    const next = filterIdbStoreRows(name, rows)
    // 空表也保留键，便于导入侧知道结构；但全空可省略以减小体积
    if (next.length > 0) stores[name] = next
  }
  return { dbName: snap.dbName, dbVersion: snap.dbVersion, stores }
}

/** 过滤 localStorage 快照 */
export function filterLocalStorageSnapshotForUserData(
  snap: Record<string, string | null>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(snap)) {
    if (shouldExportLocalStorageKey(key, value)) out[key] = value
  }
  return out
}
