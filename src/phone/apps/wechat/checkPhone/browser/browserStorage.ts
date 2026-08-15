import { personaDb } from '../../newFriendsPersona/idb'
import { ensureAllPreviewsOpenable } from './browserMarkup'
import { rebuildFrequents } from './frequents'
import { emptyBrowserDataset } from './seedData'
import type { BrowserDataset } from './types'

/** v2：不再自动写入 mock 种子，首次为空，需 AI 生成 */
const BROWSER_KV_PREFIX = 'checkPhone.browser.v2:'
const TUTORIAL_SEEN_KEY = 'checkPhone.browserTutorialSeen.v1'

function key(characterId: string) {
  return `${BROWSER_KV_PREFIX}${String(characterId || 'unknown').trim()}`
}

function tutorialKey(characterId: string) {
  return `${TUTORIAL_SEEN_KEY}:${String(characterId || 'unknown').trim()}`
}

function normalizeDataset(raw: unknown): BrowserDataset {
  const empty = emptyBrowserDataset()
  if (!raw || typeof raw !== 'object') return empty
  const rec = raw as Partial<BrowserDataset>
  const base: BrowserDataset = {
    frequents: Array.isArray(rec.frequents) ? rec.frequents : [],
    recents: Array.isArray(rec.recents) ? rec.recents : [],
    suggests: Array.isArray(rec.suggests) ? rec.suggests : [],
    serpByQuery: rec.serpByQuery && typeof rec.serpByQuery === 'object' ? rec.serpByQuery : {},
    articles: rec.articles && typeof rec.articles === 'object' ? rec.articles : {},
    forums: rec.forums && typeof rec.forums === 'object' ? rec.forums : {},
    history: Array.isArray(rec.history) ? rec.history : [],
    bookmarkFolders:
      Array.isArray(rec.bookmarkFolders) && rec.bookmarkFolders.length
        ? rec.bookmarkFolders
        : [{ id: 'all', name: '全部' }],
    bookmarks: Array.isArray(rec.bookmarks) ? rec.bookmarks : [],
    sharedPages: Array.isArray(rec.sharedPages) ? rec.sharedPages : [],
    openTabs: Array.isArray(rec.openTabs) && rec.openTabs.length ? rec.openTabs : empty.openTabs,
  }
  // 旧缓存里常去可能是英文域名且打不开详情：读入时重建并补齐可打开正文
  base.frequents = rebuildFrequents(base, base.frequents)
  return ensureAllPreviewsOpenable(base)
}

export function hasBrowserContent(dataset: BrowserDataset): boolean {
  return (
    dataset.history.length > 0 ||
    dataset.bookmarks.length > 0 ||
    dataset.sharedPages.length > 0 ||
    dataset.recents.length > 0 ||
    Object.keys(dataset.articles).length > 0 ||
    Object.keys(dataset.forums).length > 0
  )
}

export async function loadBrowserDataset(characterId: string): Promise<BrowserDataset> {
  const raw = await personaDb.getPhoneKv(key(characterId))
  if (raw && typeof raw === 'object') return normalizeDataset(raw)
  return emptyBrowserDataset()
}

export async function saveBrowserDataset(characterId: string, dataset: BrowserDataset): Promise<void> {
  await personaDb.setPhoneKv(key(characterId), normalizeDataset(dataset))
}

export async function clearBrowserDataset(characterId: string): Promise<void> {
  await personaDb.setPhoneKv(key(characterId), emptyBrowserDataset())
}

export async function loadBrowserTutorialSeen(characterId: string): Promise<boolean> {
  return (await personaDb.getPhoneKv(tutorialKey(characterId))) === true
}

export async function saveBrowserTutorialSeen(characterId: string): Promise<void> {
  await personaDb.setPhoneKv(tutorialKey(characterId), true)
}
