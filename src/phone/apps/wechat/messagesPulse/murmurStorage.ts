import { personaDb } from '../newFriendsPersona/idb'

export type MurmurVisibilityMode = 'public' | 'private' | 'allowlist' | 'blocklist'

export type MurmurVisibility = {
  mode: MurmurVisibilityMode
  /** allowlist=仅这些人可见；blocklist=这些人不可见 */
  characterIds?: string[]
}

export type MurmurReactor = {
  id: string
  name: string
  avatarUrl?: string
  at: number
}

/** Discord 式 emoji 反应（可多人叠同一 emoji） */
export type MurmurReaction = {
  emoji: string
  reactors: MurmurReactor[]
}

/** emoji 反应（仅展示 emoji；text 字段保留兼容旧数据，写入时置空） */
export type MurmurSticker = {
  id: string
  emoji: string
  text: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  at: number
}

export type MurmurComment = {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  text: string
  at: number
}

export type MurmurEntry = {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  text: string
  createdAt: number
  /** YYYY-MM-DD */
  dayKey: string
  visibility: MurmurVisibility
  likes: MurmurReactor[]
  reactions: MurmurReaction[]
  stickers: MurmurSticker[]
  comments: MurmurComment[]
}

const USER_KV = 'wechat-murmurs-user:v1:'
const CHAR_KV = 'wechat-murmurs-char:v1:'

export function murmurDayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeVisibility(raw: unknown): MurmurVisibility {
  if (!raw || typeof raw !== 'object') return { mode: 'public' }
  const o = raw as Record<string, unknown>
  const ids = Array.isArray(o.characterIds)
    ? o.characterIds
        .filter((x): x is string => typeof x === 'string' && !!x.trim())
        .map((x) => x.trim())
        .slice(0, 64)
    : []
  if (o.mode === 'private') return { mode: 'private' }
  if (o.mode === 'allowlist') return { mode: 'allowlist', characterIds: ids }
  if (o.mode === 'blocklist') return { mode: 'blocklist', characterIds: ids }
  return { mode: 'public' }
}

function normalizeReactor(raw: unknown): MurmurReactor | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!id || !name) return null
  return {
    id,
    name: name.slice(0, 32),
    avatarUrl: typeof o.avatarUrl === 'string' ? o.avatarUrl : undefined,
    at: typeof o.at === 'number' ? o.at : Date.now(),
  }
}

function normalizeReaction(raw: unknown): MurmurReaction | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const emoji = typeof o.emoji === 'string' ? o.emoji.trim() : ''
  if (!emoji) return null
  const reactors = Array.isArray(o.reactors)
    ? o.reactors.map(normalizeReactor).filter((x): x is MurmurReactor => !!x).slice(0, 40)
    : []
  return { emoji: emoji.slice(0, 16), reactors }
}

function normalizeSticker(raw: unknown): MurmurSticker | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const emoji = typeof o.emoji === 'string' ? o.emoji.trim() : ''
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  const authorId = typeof o.authorId === 'string' ? o.authorId.trim() : ''
  const authorName = typeof o.authorName === 'string' ? o.authorName.trim() : ''
  if (!id || !emoji || !authorId || !authorName) return null
  return {
    id,
    emoji: emoji.slice(0, 16),
    text: text.slice(0, 24),
    authorId,
    authorName: authorName.slice(0, 32),
    authorAvatarUrl: typeof o.authorAvatarUrl === 'string' ? o.authorAvatarUrl : undefined,
    at: typeof o.at === 'number' ? o.at : Date.now(),
  }
}

function normalizeComment(raw: unknown): MurmurComment | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const authorId = typeof o.authorId === 'string' ? o.authorId.trim() : ''
  const authorName = typeof o.authorName === 'string' ? o.authorName.trim() : ''
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  if (!id || !authorId || !authorName || !text) return null
  return {
    id,
    authorId,
    authorName: authorName.slice(0, 32),
    authorAvatarUrl: typeof o.authorAvatarUrl === 'string' ? o.authorAvatarUrl : undefined,
    text: text.slice(0, 200),
    at: typeof o.at === 'number' ? o.at : Date.now(),
  }
}

export function normalizeMurmurEntry(raw: unknown): MurmurEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const authorId = typeof o.authorId === 'string' ? o.authorId.trim() : ''
  const authorName = typeof o.authorName === 'string' ? o.authorName.trim() : ''
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  const createdAt = typeof o.createdAt === 'number' ? o.createdAt : 0
  const dayKey = typeof o.dayKey === 'string' ? o.dayKey.trim() : ''
  if (!id || !authorId || !authorName || !text || !dayKey) return null
  return {
    id,
    authorId,
    authorName: authorName.slice(0, 32),
    authorAvatarUrl: typeof o.authorAvatarUrl === 'string' ? o.authorAvatarUrl : undefined,
    text: text.slice(0, 500),
    createdAt,
    dayKey,
    visibility: normalizeVisibility(o.visibility),
    likes: Array.isArray(o.likes)
      ? o.likes.map(normalizeReactor).filter((x): x is MurmurReactor => !!x).slice(0, 80)
      : [],
    reactions: Array.isArray(o.reactions)
      ? o.reactions.map(normalizeReaction).filter((x): x is MurmurReaction => !!x).slice(0, 24)
      : [],
    stickers: Array.isArray(o.stickers)
      ? o.stickers.map(normalizeSticker).filter((x): x is MurmurSticker => !!x).slice(0, 40)
      : [],
    comments: Array.isArray(o.comments)
      ? o.comments.map(normalizeComment).filter((x): x is MurmurComment => !!x).slice(0, 60)
      : [],
  }
}

function normalizeList(raw: unknown): MurmurEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeMurmurEntry)
    .filter((x): x is MurmurEntry => !!x)
    .map(scrubMurmurMockNoise)
    .filter((x): x is MurmurEntry => !!x)
    .slice(0, 400)
}

function isSeedActorId(id: string): boolean {
  const s = id.trim()
  return s.startsWith('seed-') || s.startsWith('seed_peer') || s.startsWith('seed-peer')
}

function isSeedRecordId(id: string): boolean {
  const s = id.trim()
  return s.startsWith('seed-') || s.includes('-seed-')
}

const SEED_PEER_NAMES = new Set(['路过的朋友', '某位好友', '同班同学'])

/** 旧 mock 碎碎念 / 假互动：整条丢弃或剥掉假反应 */
function scrubMurmurMockNoise(entry: MurmurEntry): MurmurEntry | null {
  if (isSeedRecordId(entry.id)) return null
  if (isSeedActorId(entry.authorId)) return null

  const stickers = entry.stickers.filter(
    (s) => !isSeedRecordId(s.id) && !isSeedActorId(s.authorId) && !SEED_PEER_NAMES.has(s.authorName),
  )
  const comments = entry.comments.filter(
    (c) => !isSeedRecordId(c.id) && !isSeedActorId(c.authorId) && !SEED_PEER_NAMES.has(c.authorName),
  )
  const likes = entry.likes.filter(
    (l) => !isSeedActorId(l.id) && !SEED_PEER_NAMES.has(l.name),
  )
  const reactions = entry.reactions
    .map((r) => ({
      ...r,
      reactors: r.reactors.filter((x) => !isSeedActorId(x.id) && !SEED_PEER_NAMES.has(x.name)),
    }))
    .filter((r) => r.reactors.length > 0)

  // 角色侧旧种子帖：几乎都带 seed 互动；无真实互动且 id 不像用户/AI 手写时整条清掉
  const looksHandwritten =
    entry.id.startsWith('m-') ||
    entry.id.startsWith('m-ai-') ||
    entry.id.startsWith('m-char-') ||
    entry.id.startsWith('m-me-')
  const hadSeedNoise =
    entry.stickers.length !== stickers.length ||
    entry.comments.length !== comments.length ||
    entry.likes.length !== likes.length
  if (hadSeedNoise && !looksHandwritten) return null

  return { ...entry, stickers, comments, likes, reactions }
}

const MOCK_PURGE_FLAG = 'wechat-murmurs-mock-cleared:v4'
let mockPurgePromise: Promise<void> | null = null

/**
 * 一次性清空角色侧旧 mock 碎碎念（此前日历上的黑点），并清洗用户帖里的假互动。
 * 用户手写 / AI 真实发布保留。
 */
export async function ensureMurmurMockDataPurged(): Promise<void> {
  if (mockPurgePromise) return mockPurgePromise
  mockPurgePromise = (async () => {
    try {
      if ((await personaDb.getPhoneKv(MOCK_PURGE_FLAG)) === true) return

      const charKeys = await personaDb.listPhoneKvKeysByPrefix(CHAR_KV).catch(() => [] as string[])
      for (const key of charKeys) {
        await personaDb.setPhoneKv(key, [])
      }

      // 兼容：角色表里仍有、但 key 枚举失败时再扫一遍
      if (!charKeys.length) {
        const chars = await personaDb.listCharacters().catch(() => [])
        for (const c of chars) {
          const cid = String(c.id ?? '').trim()
          if (!cid) continue
          await personaDb.setPhoneKv(`${CHAR_KV}${cid}`, [])
        }
      }

      const userKeys = await personaDb.listPhoneKvKeysByPrefix(USER_KV).catch(() => [] as string[])
      for (const key of userKeys) {
        const cleaned = normalizeList(await personaDb.getPhoneKv(key))
        await personaDb.setPhoneKv(key, cleaned)
      }

      await personaDb.setPhoneKv(MOCK_PURGE_FLAG, true)
      try {
        window.dispatchEvent(new CustomEvent('wechat-murmur-published', { detail: { purged: true } }))
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.warn('[murmur] purge mock failed', err)
      mockPurgePromise = null
    }
  })()
  return mockPurgePromise
}

export async function loadUserMurmurs(playerIdentityId: string | null | undefined): Promise<MurmurEntry[]> {
  const pid = (playerIdentityId || '').trim()
  if (!pid || pid === '__none__') return []
  try {
    await ensureMurmurMockDataPurged()
    return normalizeList(await personaDb.getPhoneKv(`${USER_KV}${pid}`))
  } catch {
    return []
  }
}

export async function saveUserMurmurs(
  playerIdentityId: string | null | undefined,
  list: MurmurEntry[],
): Promise<void> {
  const pid = (playerIdentityId || '').trim()
  if (!pid || pid === '__none__') return
  await personaDb.setPhoneKv(`${USER_KV}${pid}`, normalizeList(list))
}

export async function loadCharacterMurmurs(
  characterId: string,
  opts?: { name?: string; avatarUrl?: string },
): Promise<MurmurEntry[]> {
  const cid = characterId.trim()
  if (!cid) return []
  try {
    await ensureMurmurMockDataPurged()
    const stored = normalizeList(await personaDb.getPhoneKv(`${CHAR_KV}${cid}`))
    return stored.map((r) => ({
      ...r,
      authorName: opts?.name || r.authorName,
      authorAvatarUrl: opts?.avatarUrl || r.authorAvatarUrl,
    }))
  } catch {
    return []
  }
}

export async function saveCharacterMurmurs(characterId: string, list: MurmurEntry[]): Promise<void> {
  const cid = characterId.trim()
  if (!cid) return
  await personaDb.setPhoneKv(`${CHAR_KV}${cid}`, normalizeList(list))
}

/** Discord 风常用反应（展开面板内全量可选） */
export const MURMUR_REACT_EMOJIS = ["👍","👎","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💯","✨","🔥","⭐","🌟","🎉","🎊","😂","🤣","😊","😇","🥰","😍","🤩","😘","😗","😉","😌","😋","😛","😜","🤪","😎","🤓","🧐","🤔","😏","😒","🙄","😬","😮","😯","😲","😳","🥺","😢","😭","😤","😠","🤬","😈","💀","☠️","💩","🤡","👻","👽","🤖","😺","🙌","👏","🤝","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","👌","🤌","🤏","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤙","💪","🦾","🙏","🫂","👀","👁️","👅","👄","💋","🩸","💤","💨","💫","💬","💭","🗯️","♠️","♣️","♥️","♦️","🃏","🎴","🀄","🕐","⏰","⏱️","⏲️","🕛","☕","🍵","🧋","🍺","🍷","🍾","🥂","🍸","🍹","🧃","🥛","🍼","🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥯","🧀","🥗","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🍤","🍙","🍚","🍘","🍥","🥠","🥡","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍎","🍏","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🎵","🎶","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎤","🎧","📻","🎬","🎮","🕹️","👾","🎯","🎲","♟️","🎰","🧩","🎨","🖼️","🎭","🧵","🪡","🧶","👓","🕶️","🥽","🥼","🦺","👔","👕","👖","🧣","🧤","🧥","🧦","👗","👘","🥻","🩱","🩲","🩳","👙","👚","👛","👜","👝","🛍️","🎒","👞","👟","🥾","🥿","👠","👡","🩰","👢","👑","👒","🎩","🎓","🧢","⛑️","💼","📚","📖","📝","✏️","✒️","🖋️","🖊️","🖌️","🖍️","📁","📂","🗂️","📅","📆","🗒️","🗓️","📇","📈","📉","📊","📋","📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔏","🔐","🔑","🗝️","🔨","🪓","⛏️","⚒️","🛠️","🗡️","⚔️","🔫","🪃","🏹","🛡️","🪚","🔧","🪛","🔩","⚙️","🗜️","⚖️","🦯","🔗","⛓️","🧰","🧲","🪜","⚗️","🧪","🧫","🧬","🔬","🔭","📡","💉","💊","🩹","🩺","🚪","🛗","🪞","🪟","🛏️","🛋️","🪑","🚽","🪠","🚿","🛁","🪤","🪒","🧴","🧷","🧹","🧺","🧻","🪣","🧼","🪥","🧽","🧯","🛒","🚬","⚰️","🪦","⚱️","🗿","🪧","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩️","🕋","⛲","⛺","🌁","🌃","🏙️","🌄","🌅","🌆","🌇","🌉","♨️","🎠","🎡","🎢","💈","サーカス","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🚚","🚛","🚜","🏎️","🏍️","🛵","🦽","🦼","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","🛢️","⛽","🚨","🚥","🚦","🛑","🚧","⚓","⛵","🛶","🚤","🛳️","⛴️","🛥️","🚢","✈️","🛩️","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸","🛎️","🧳","⌛","⏳","⌚","🕰️","🌡️","☀️","🌝","🌞","🪐","🌠","🌌","☁️","⛅","⛈️","🌤️","🌥️","🌦️","🌧️","🌨️","🌩️","🌪️","🌫️","🌬️","🌀","🌈","🌂","☂️","☔","⛱️","⚡","❄️","☃️","⛄","☄️","💧","🌊","🎃","🎄","🎆","🎇","🧨","🎈","🎋","🎍","🎎","🎏","🎐","🎑","🧧","🎀","🎁","🎗️","🎟️","🎫","🎖️","🏆","🏅","🥇","🥈","🥉","⚽","⚾","🥎","🏀","🏐","🏈","🏉","🎾","🥏","🎳","🏏","🏑","🏒","🥍","🏓","🏸","🥊","🥋","🥅","⛳","⛸️","🎣","🤿","🎽","🎿","🛷","🥌","🪀","🪁","🎱","🔮","🪄","🧿","🧸","🪅","🪆","🪢","🏃","🚶","🧘","🫠","🥹","🫡","🫥","🫤"] as const

export type MurmurContactLite = {
  characterId: string
  remarkName: string
  avatarUrl?: string
}

export function visibilityLabel(v: MurmurVisibility, contactNameById?: Map<string, string>): string {
  if (v.mode === 'private') return '仅自己可见'
  if (v.mode === 'public') return '全部好友可见'
  const ids = v.characterIds ?? []
  if (v.mode === 'blocklist') {
    if (!ids.length) return '全部好友可见'
    if (!contactNameById) return `对 ${ids.length} 人隐藏`
    const names = ids.map((id) => contactNameById.get(id) || '好友').slice(0, 3)
    const more = ids.length > 3 ? ` 等${ids.length}人` : ''
    return `对 ${names.join('、')}${more} 不可见`
  }
  if (!ids.length) return '指定好友可见'
  if (!contactNameById) return `指定 ${ids.length} 人可见`
  const names = ids.map((id) => contactNameById.get(id) || '好友').slice(0, 3)
  const more = ids.length > 3 ? ` 等${ids.length}人` : ''
  return `仅 ${names.join('、')}${more} 可见`
}

export function murmurVisibleToCharacter(m: MurmurEntry, characterId?: string | null): boolean {
  if (m.visibility.mode === 'private') return false
  if (m.visibility.mode === 'public') return true
  const cid = (characterId || '').trim()
  if (!cid) return false
  const ids = m.visibility.characterIds ?? []
  if (m.visibility.mode === 'allowlist') return ids.includes(cid)
  if (m.visibility.mode === 'blocklist') return !ids.includes(cid)
  return false
}

/** 动态首页混合流：我的 + 好友公开碎碎念 */
export async function loadMurmurBoardFeed(opts: {
  playerIdentityId?: string | null
  contacts: MurmurContactLite[]
}): Promise<MurmurEntry[]> {
  const userList = await loadUserMurmurs(opts.playerIdentityId)
  const charLists = await Promise.all(
    opts.contacts.map((c) =>
      loadCharacterMurmurs(c.characterId, { name: c.remarkName, avatarUrl: c.avatarUrl }),
    ),
  )
  const friendPublic = charLists.flat().filter((m) => m.visibility.mode === 'public')
  return [...userList, ...friendPublic].sort((a, b) => b.createdAt - a.createdAt)
}

export function formatUserMurmursPromptBlock(
  list: MurmurEntry[],
  displayName?: string,
  limit = 8,
  viewerCharacterId?: string | null,
): string {
  const published = list
    .filter((m) => murmurVisibleToCharacter(m, viewerCharacterId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
  if (!published.length) return ''
  const who = (displayName || '用户').trim() || '用户'
  const lines = published.map((m) => {
    const vis =
      m.visibility.mode === 'public'
        ? '全部好友'
        : m.visibility.mode === 'allowlist'
          ? '部分好友'
          : m.visibility.mode === 'blocklist'
            ? '部分隐藏'
            : '自己'
    return `- [${m.dayKey}]（${vis}）${m.text}`
  })
  return [
    `【用户碎碎念·随手记】（${who}的短备忘；你在可见范围内，可关心/调侃式回应；禁止编造未写出的内容）`,
    ...lines,
  ].join('\n')
}

export async function loadUserMurmursPromptBlock(opts: {
  playerIdentityId?: string | null
  displayName?: string
  viewerCharacterId?: string | null
}): Promise<string> {
  const list = await loadUserMurmurs(opts.playerIdentityId)
  return formatUserMurmursPromptBlock(list, opts.displayName, 8, opts.viewerCharacterId)
}

export async function patchMurmurInStore(opts: {
  entryId: string
  authorId: string
  isUserAuthor: boolean
  playerIdentityId?: string | null
  patch: (entry: MurmurEntry) => MurmurEntry
}): Promise<MurmurEntry | null> {
  if (opts.isUserAuthor) {
    const prev = await loadUserMurmurs(opts.playerIdentityId)
    const idx = prev.findIndex((x) => x.id === opts.entryId)
    if (idx < 0) return null
    const updated = opts.patch(prev[idx]!)
    const next = [...prev]
    next[idx] = updated
    await saveUserMurmurs(opts.playerIdentityId, next)
    return updated
  }
  const prev = await loadCharacterMurmurs(opts.authorId)
  const idx = prev.findIndex((x) => x.id === opts.entryId)
  if (idx < 0) return null
  const updated = opts.patch(prev[idx]!)
  const next = [...prev]
  next[idx] = updated
  await saveCharacterMurmurs(opts.authorId, next)
  return updated
}
