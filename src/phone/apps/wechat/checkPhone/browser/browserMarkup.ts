/**
 * 查手机 · 浏览器痕迹 AI 输出（标记块 / 字段行）
 * 禁止 JSON，避免嵌套转义导致解析失败。
 */

import type {
  ArticlePage,
  BookmarkFolder,
  BookmarkItem,
  BrowserDataset,
  BrowserTab,
  ForumPage,
  ForumReply,
  FrequentSite,
  HistoryGroup,
  HistoryItem,
  SerpResult,
  SharedPageRecord,
  SuggestItem,
} from './types'
import { emptyBrowserDataset } from './seedData'
import { rebuildFrequents } from './frequents'
import { sceneCaptionFromSeed, toneFromCaptionSeed } from './components/ImagePlaceholder'

export const BROWSER_MARKUP_RULE = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出下方规定的标记块；每行「字段名：值」（中文/英文冒号均可）。
- 每条可预览的网页痕迹（历史里的文章/论坛、收藏、分享、搜索结果、常去、标签）都必须带「页面」字段，且该 id 必须对应一篇 <<BR_ARTICLE>> 或一个 <<BR_FORUM>>。
- 必须单独输出「搜索记录」块 <<BR_SEARCH>>（至少 5 条），词条为角色真实会搜的中文短句；这些会出现在历史记录（标题「搜索：…」）和地址栏下拉建议里。
- 收藏夹必须是「角色自己创建的夹名」（中文短名，贴合人设与近期情绪），先输出 <<BR_FOLDER>>，再在收藏条目里用「夹：夹名」引用；禁止使用系统内置夹名（如深夜 / 不想被看见 / 学习相关 / emo / secret / study）。
- 每篇文章必须写「画面：…」——用一句具体中文描述配图内容（如「一把木吉他放在地毯上，阳光从窗外照进来」），不要写「配图」「插图」这种空词。
- 先写正文块（文章/论坛），再写列表块与搜索记录，保证点进去能看到完整内容。
`.trim()

export const BROWSER_MARKUP_FORMAT = `
${BROWSER_MARKUP_RULE}

—— 文章（至少 4 篇，每篇至少 3 段正文）——
<<BR_ARTICLE>>
id：art_01
站点：知乎专栏
作者：匿名用户
时间：昨天 01:14
标题：中文标题
网址：https://zhuanlan.zhihu.com/p/example
画面：一把木吉他放在地毯上，阳光从窗外照进来
高亮：正文里出现过的短句
段：第一段正文
段：第二段正文
段：第三段正文
<<END_BR_ARTICLE>>

—— 论坛帖（至少 1 个，含楼主与回复）——
<<BR_FORUM>>
id：forum_01
站点：匿名树洞
楼主：凌晨的风
楼主身份：角色
时间：今天 02:11
正文：楼主长文内容
网址：https://treehole.local/t/example
回：角色|昵称|时间|赞数|回复正文
回：网友|另一人|时间|赞数|另一条回复
<<END_BR_FORUM>>

—— 历史记录（8~12 条；类型=article|forum；页面=对应 id）——
<<BR_HISTORY>>
id：h_01
标题：显示标题
网址：https://example.com
域名：zhihu.com
时间：01:14
分组：today
类型：article
页面：art_01
<<END_BR_HISTORY>>

—— 角色自建收藏夹（2~4 个；夹名要像角色随手起的，禁止内置默认名）——
<<BR_FOLDER>>
id：fld_later
名称：以后再看就好
<<END_BR_FOLDER>>

<<BR_FOLDER>>
id：fld_hide
名称：别点开
<<END_BR_FOLDER>>

<<BR_FOLDER>>
id：fld_quiet
名称：练习时听的
<<END_BR_FOLDER>>

—— 收藏（至少 6 条；「夹」填写上面的夹名或 id，分散到多个自建夹，内容不要重复）——
<<BR_BOOKMARK>>
id：bm_01
夹：以后再看就好
标题：深夜会反复打开的那篇
站点：知乎
网址：https://example.com/a
时间：昨天
类型：article
页面：art_01
<<END_BR_BOOKMARK>>

<<BR_BOOKMARK>>
id：bm_02
夹：别点开
标题：不想被人看见的那条
站点：豆瓣
网址：https://example.com/b
时间：今天
类型：article
页面：art_02
<<END_BR_BOOKMARK>>

<<BR_BOOKMARK>>
id：bm_03
夹：练习时听的
标题：循环了很多遍的那页
站点：网易云
网址：https://example.com/c
时间：前天
类型：article
页面：art_03
<<END_BR_BOOKMARK>>

—— 分享网页记录（3~6 条）——
<<BR_SHARED>>
id：sh_01
标题：分享标题
网址：https://example.com
域名：douban.com
渠道：朋友圈·仅自己可见
配文：短配文
时间：22:10
分组：today
类型：article
页面：art_01
<<END_BR_SHARED>>

—— 搜索记录（必填 5~8 条：角色搜过的关键词，会出现在历史与地址栏下拉）——
<<BR_SEARCH>>
搜索词：如何停止反复查看聊天记录
时间：01:20
分组：today
<<END_BR_SEARCH>>

<<BR_SEARCH>>
搜索词：对方已读不回怎么办才不显得卑微
时间：23:41
分组：yesterday
<<END_BR_SEARCH>>

—— 搜索结果页条目（4~6 条，每条必须能点进文章/论坛）——
<<BR_SERP>>
id：sr_01
站点：知乎
域名：zhihu.com
标题：结果标题
摘要：一两句摘要
类型：article
页面：art_01
<<END_BR_SERP>>

—— 相关搜索 ——
<<BR_RELATED>>
词：相关搜索词一
词：相关搜索词二
<<END_BR_RELATED>>

—— 搜索建议（可与搜索记录呼应；来源写 history 或 suggest）——
<<BR_SUGGEST>>
文本：建议词
来源：history
<<END_BR_SUGGEST>>

—— 常去（4~6；名称必须中文站名；页面可打开）——
<<BR_FREQUENT>>
名称：知乎
域名：zhihu.com
图标：知
类型：article
页面：art_01
<<END_BR_FREQUENT>>

—— 打开中的标签（2~4；必须含一个画面=newtab）——
<<BR_TAB>>
id：tab_home
标题：新标签页
网址：
画面：newtab
<<END_BR_TAB>>

<<BR_TAB>>
id：tab_1
标题：某页标题
网址：https://example.com
画面：article
类型：article
页面：art_01
<<END_BR_TAB>>
`.trim()

function stripFence(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function splitFieldLine(line: string): { key: string; value: string } | null {
  const raw = String(line ?? '').trim()
  if (!raw) return null
  const m = raw.match(/^([^:：]{1,32})\s*[:：]\s*(.*)$/)
  if (!m) return null
  return { key: m[1]!.trim().toLowerCase(), value: (m[2] ?? '').trim() }
}

function extractBlocks(raw: string, openTag: string, closeTag: string): string[] {
  const text = stripFence(raw)
  const open = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const close = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${open}\\s*([\\s\\S]*?)\\s*${close}`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const body = (m[1] ?? '').trim()
    if (body) out.push(body)
  }
  return out
}

function fieldMap(block: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f) continue
    if (f.key === '段' || f.key === '回' || f.key === '词' || f.key === '文') continue
    if (!map.has(f.key)) map.set(f.key, f.value)
  }
  return map
}

function getField(map: Map<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = map.get(k.toLowerCase())
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function multiLines(block: string, keys: string[]): string[] {
  const set = new Set(keys.map((k) => k.toLowerCase()))
  const out: string[] = []
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f || !set.has(f.key)) continue
    if (f.value.trim()) out.push(f.value.trim())
  }
  return out
}

function hostFromUrl(url: string, fallback = ''): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return fallback.replace(/^www\./, '')
  }
}

function toneFromSeed(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const a = 0xe0 + (h % 18)
  const b = 0xd0 + ((h >> 5) % 22)
  return `linear-gradient(145deg,rgb(${a},${a - 4},${b}),rgb(${b},${a - 8},${a}))`
}

function asGroup(v: string): HistoryGroup {
  const s = v.trim().toLowerCase()
  if (s === 'yesterday' || s.includes('昨')) return 'yesterday'
  if (s === 'earlier' || s.includes('更早') || s.includes('早前')) return 'earlier'
  return 'today'
}

function asPageKind(v: string): 'article' | 'forum' {
  const s = v.trim().toLowerCase()
  if (s === 'forum' || s.includes('论坛') || s.includes('帖')) return 'forum'
  return 'article'
}

function asScreen(v: string): BrowserTab['screen'] {
  const s = v.trim().toLowerCase()
  if (s === 'forum') return 'forum'
  if (s === 'serp' || s.includes('搜索')) return 'serp'
  if (s === 'history' || s.includes('历史')) return 'history'
  if (s === 'bookmarks' || s.includes('收藏')) return 'bookmarks'
  if (s === 'shared' || s.includes('分享')) return 'shared'
  if (s === 'article' || s.includes('文章')) return 'article'
  return 'newtab'
}

function parseYesCharacter(raw: string): boolean | undefined {
  const s = String(raw || '').trim()
  if (!s) return undefined
  if (/^(是|角色|本人|self|character|yes|true|1)$/i.test(s)) return true
  if (/^(否|网友|路人|netizen|other|no|false|0)$/i.test(s)) return false
  return undefined
}

function parseReplies(block: string): ForumReply[] {
  const out: ForumReply[] = []
  for (const line of multiLines(block, ['回', '回复', 'reply'])) {
    const parts = line.split('|').map((x) => x.trim()).filter((x, i, arr) => !(i === arr.length - 1 && !x))
    if (!parts.length) continue

    let isCharacter: boolean | undefined
    let nick = ''
    let time = '刚刚'
    let likes = 0
    let content = ''

    const role = parseYesCharacter(parts[0] || '')
    if (role !== undefined && parts.length >= 5) {
      isCharacter = role
      nick = parts[1] || '匿名'
      time = parts[2] || '刚刚'
      likes = Math.max(0, Number(parts[3]) || 0)
      content = parts.slice(4).join('|')
    } else if (parts.length >= 4) {
      nick = parts[0] || '匿名'
      time = parts[1] || '刚刚'
      likes = Math.max(0, Number(parts[2]) || 0)
      const rest = parts.slice(3)
      const lastRole = parseYesCharacter(rest[rest.length - 1] || '')
      if (lastRole !== undefined && rest.length >= 2) {
        isCharacter = lastRole
        content = rest.slice(0, -1).join('|')
      } else {
        content = rest.join('|')
      }
    } else {
      nick = '匿名'
      content = line
    }

    out.push({
      id: `r_${out.length + 1}`,
      nick,
      time,
      likes,
      content,
      isCharacter,
    })
  }
  return out
}

function synthesizeArticle(params: {
  id: string
  title: string
  url?: string
  host?: string
  siteName?: string
  snippet?: string
}): ArticlePage {
  const title = params.title.trim() || '未命名页面'
  const siteName = params.siteName?.trim() || '网页'
  const url = params.url?.trim() || `https://${params.host || 'web.local'}/p/${params.id}`
  const lead = params.snippet?.trim()
  const paragraphs = [
    lead || `打开这篇「${title}」时，页面还停在上次阅读的位置。`,
    '正文里有一些说一半的句子，像是写给别人看、又像只写给自己。',
    '往下划两屏，评论区更安静，只有零星的同感与一句欲言又止。',
  ]
  return {
    id: params.id,
    url,
    siteName,
    author: '佚名',
    publishedAt: '近期',
    title,
    paragraphs,
    highlight: { paragraphIndex: 0, phrase: title.slice(0, Math.min(8, title.length)) },
    imageTone: toneFromCaptionSeed(params.id),
    imageCaption: sceneCaptionFromSeed(params.id),
  }
}

function isBuiltinFolderLabel(raw: string): boolean {
  const s = String(raw || '').trim().toLowerCase()
  if (!s) return true
  if (['emo', 'secret', 'study', 'all', '全部'].includes(s)) return true
  if (['深夜', '不想被看见', '学习相关', '深夜emo', '秘密心事', '考试资料'].includes(String(raw || '').trim())) return true
  return false
}

function folderIdFromName(name: string): string {
  const t = String(name || '').trim() || '未命名夹'
  let h = 2166136261
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const slug = t
    .slice(0, 8)
    .replace(/\s+/g, '')
    .replace(/[^\u4e00-\u9fff\w]/g, '')
  return `fld_${(h >>> 0).toString(36)}_${slug || 'x'}`
}

/** 用角色自建夹重建收藏；去掉内置默认夹 */
export function ensureBookmarksDistributed(dataset: BrowserDataset): BrowserDataset {
  const pagePool: Array<{
    pageKind: 'article' | 'forum'
    pageId: string
    title: string
    siteName: string
    url: string
    thumbCaption?: string
  }> = [
    ...Object.values(dataset.articles).map((a) => ({
      pageKind: 'article' as const,
      pageId: a.id,
      title: a.title,
      siteName: a.siteName,
      url: a.url,
      thumbCaption: a.imageCaption,
    })),
    ...Object.values(dataset.forums).map((f) => ({
      pageKind: 'forum' as const,
      pageId: f.id,
      title: f.opContent.slice(0, 28),
      siteName: f.siteName,
      url: f.url,
      thumbCaption: sceneCaptionFromSeed(f.id, `${f.siteName}里的一串匿名心事`),
    })),
  ]

  for (const h of dataset.history) {
    if (h.pageKind === 'serp' || !h.pageId) continue
    if (pagePool.some((p) => p.pageId === h.pageId && p.title === h.title)) continue
    pagePool.push({
      pageKind: h.pageKind === 'forum' ? 'forum' : 'article',
      pageId: h.pageId,
      title: h.title,
      siteName: h.host || '网页',
      url: h.url,
      thumbCaption: dataset.articles[h.pageId]?.imageCaption || sceneCaptionFromSeed(h.id, h.title),
    })
  }

  // 角色自建夹：来自已有 folders + 书签上的夹名；过滤内置默认
  const folderByKey = new Map<string, BookmarkFolder>()
  const rememberFolder = (id: string, name: string) => {
    const n = String(name || '').trim()
    if (!n || n === '全部' || id === 'all') return
    if (isBuiltinFolderLabel(n) || isBuiltinFolderLabel(id)) return
    const fid = id.startsWith('fld_') ? id : folderIdFromName(n)
    if (!folderByKey.has(fid)) folderByKey.set(fid, { id: fid, name: n })
  }

  for (const f of dataset.bookmarkFolders || []) {
    if (!f?.id || f.id === 'all') continue
    rememberFolder(f.id, f.name || f.id)
  }

  // 旧数据：folderId 可能还是 emo/secret/study，后面会重分配
  let bookmarks = dataset.bookmarks.filter((b) => b?.title).map((b) => ({ ...b }))

  // 若书签的 folderId 能对应到自建夹名/id，保留；否则先挂起
  const resolveExisting = (raw: string): string | null => {
    const s = String(raw || '').trim()
    if (!s || isBuiltinFolderLabel(s)) return null
    for (const f of folderByKey.values()) {
      if (f.id === s || f.name === s) return f.id
    }
    const id = s.startsWith('fld_') ? s : folderIdFromName(s)
    rememberFolder(id, s.startsWith('fld_') ? s.replace(/^fld_[^_]+_/, '') || s : s)
    return id
  }

  bookmarks = bookmarks.map((b) => {
    const fid = resolveExisting(b.folderId)
    return fid ? { ...b, folderId: fid } : { ...b, folderId: '' }
  })

  // 没有任何自建夹时：仅用 AI 已生成的文章站点名拼夹名（不再塞本地写死的夹名）
  if (folderByKey.size === 0) {
    const invented: string[] = []
    for (const a of Object.values(dataset.articles)) {
      const n = String(a.siteName || '').trim().slice(0, 10)
      if (n && !invented.includes(n) && !isBuiltinFolderLabel(n)) invented.push(n)
      if (invented.length >= 3) break
    }
    for (const h of dataset.history) {
      if (invented.length >= 3) break
      if (h.pageKind === 'serp') continue
      const n = String(h.title || '')
        .replace(/^搜索[：:]\s*/, '')
        .trim()
        .slice(0, 8)
      if (n.length >= 2 && !invented.includes(n) && !isBuiltinFolderLabel(n)) invented.push(n)
    }
    for (const n of invented.slice(0, 4)) rememberFolder(folderIdFromName(n), n)
  }

  const folderList = Array.from(folderByKey.values()).slice(0, 6)
  const folderIds = folderList.map((f) => f.id)

  // 仅把已有收藏摊到自建夹；不额外造本地假收藏
  bookmarks = bookmarks.map((b, i) => {
    let fid = b.folderId
    if (!fid || isBuiltinFolderLabel(fid) || !folderIds.includes(fid)) {
      fid = folderIds.length ? folderIds[i % folderIds.length]! : ''
    }
    return { ...b, folderId: fid }
  })

  if (folderIds.length >= 2 && bookmarks.length >= folderIds.length) {
    const have = new Set(bookmarks.map((b) => b.folderId).filter(Boolean))
    if (folderIds.some((id) => !have.has(id))) {
      bookmarks = bookmarks.map((b, i) => ({
        ...b,
        folderId: folderIds[i % folderIds.length]!,
      }))
    }
  }

  bookmarks = bookmarks.map((b) => {
    const art = b.pageId ? dataset.articles[b.pageId] : undefined
    const caption =
      art?.imageCaption ||
      pagePool.find((p) => p.pageId === b.pageId)?.thumbCaption ||
      sceneCaptionFromSeed(b.id, b.title)
    return { ...b, thumbCaption: caption }
  })

  return {
    ...dataset,
    bookmarkFolders: [{ id: 'all', name: '全部' }, ...folderList],
    bookmarks,
  }
}

/** 保证每条预览痕迹都能打开正文 */
export function ensureAllPreviewsOpenable(dataset: BrowserDataset): BrowserDataset {
  const articles = { ...dataset.articles }
  const forums = { ...dataset.forums }
  let synth = 0

  const ensure = (
    title: string,
    opts: {
      pageKind?: 'article' | 'forum' | 'serp'
      pageId?: string
      url?: string
      host?: string
      siteName?: string
      snippet?: string
    },
  ): { pageKind: 'article' | 'forum'; pageId: string } => {
    const kind = opts.pageKind === 'forum' ? 'forum' : 'article'
    const pid = String(opts.pageId || '').trim()
    if (kind === 'forum' && pid && forums[pid]) return { pageKind: 'forum', pageId: pid }
    if (kind === 'article' && pid && articles[pid]) return { pageKind: 'article', pageId: pid }
    if (pid && forums[pid]) return { pageKind: 'forum', pageId: pid }
    if (pid && articles[pid]) return { pageKind: 'article', pageId: pid }

    synth += 1
    const id = pid || `synth_${synth}_${Date.now().toString(36)}`
    if (kind === 'forum') {
      forums[id] = {
        id,
        url: opts.url || `https://forum.local/t/${id}`,
        siteName: opts.siteName || '论坛',
        opNick: '匿名',
        opTime: '刚刚',
        opContent: opts.snippet || title || '（帖子正文）',
        replies: [
          { id: 'r1', nick: '路过', content: '看完有点沉默。', likes: 2, time: '刚刚' },
          { id: 'r2', nick: '懂的都懂', content: '这段太真实了。', likes: 5, time: '1分钟前' },
        ],
      }
      return { pageKind: 'forum', pageId: id }
    }
    articles[id] = synthesizeArticle({
      id,
      title: title || '网页',
      url: opts.url,
      host: opts.host,
      siteName: opts.siteName,
      snippet: opts.snippet,
    })
    return { pageKind: 'article', pageId: id }
  }

  const history: HistoryItem[] = dataset.history.map((h) => {
    // 搜索记录保持为 serp，不要强行改成文章（否则「搜索记录」会消失）
    if (h.pageKind === 'serp' || /^搜索[：:]/.test(String(h.title || ''))) {
      const q = String(h.title || '')
        .replace(/^搜索[：:]\s*/, '')
        .trim()
      return {
        ...h,
        title: q ? `搜索：${q}` : h.title,
        pageKind: 'serp' as const,
        pageId: undefined,
        host: h.host || 'bing.com',
        url: h.url || (q ? `https://www.bing.com/search?q=${encodeURIComponent(q)}` : h.url),
      }
    }
    const link = ensure(h.title, {
      pageKind: h.pageKind === 'forum' ? 'forum' : 'article',
      pageId: h.pageId,
      url: h.url,
      host: h.host,
    })
    return { ...h, pageKind: link.pageKind, pageId: link.pageId }
  })

  const bookmarks: BookmarkItem[] = dataset.bookmarks.map((b) => {
    const link = ensure(b.title, {
      pageKind: b.pageKind === 'forum' ? 'forum' : 'article',
      pageId: b.pageId,
      url: b.url,
      siteName: b.siteName,
    })
    return { ...b, pageKind: link.pageKind, pageId: link.pageId }
  })

  const sharedPages: SharedPageRecord[] = dataset.sharedPages.map((s) => {
    const link = ensure(s.title, {
      pageKind: s.pageKind === 'forum' ? 'forum' : 'article',
      pageId: s.pageId,
      url: s.url,
      host: s.host,
      snippet: s.caption,
    })
    return { ...s, pageKind: link.pageKind, pageId: link.pageId }
  })

  const defaultSerp = dataset.serpByQuery.__default || { resultCountLabel: '约 0 条结果', results: [], related: [] }
  const serpResults: SerpResult[] = defaultSerp.results.map((r) => {
    const link = ensure(r.title, {
      pageKind: r.pageKind,
      pageId: r.pageId,
      url: r.url,
      host: r.host,
      siteName: r.siteName,
      snippet: r.snippet,
    })
    return { ...r, pageKind: link.pageKind, pageId: link.pageId }
  })

  const frequents: FrequentSite[] = dataset.frequents.map((f) => {
    const link = ensure(f.name, {
      pageKind: f.pageKind,
      pageId: f.pageId,
      host: f.host,
      siteName: f.name,
    })
    return { ...f, pageKind: link.pageKind, pageId: link.pageId }
  })

  const pageHistory = history.filter((h) => h.pageKind !== 'serp')
  const recents = pageHistory.slice(0, 3).map((h) => {
    const art = h.pageId ? articles[h.pageId] : undefined
    return {
      id: `rc_${h.id}`,
      title: h.title,
      url: h.url,
      visitedAt: h.group === 'today' ? `今天 ${h.timeLabel}` : h.group === 'yesterday' ? `昨天 ${h.timeLabel}` : h.timeLabel,
      thumbTone: art?.imageTone || toneFromCaptionSeed(h.id),
      thumbCaption: art?.imageCaption || sceneCaptionFromSeed(h.id, h.title),
      pageKind: (h.pageKind === 'forum' ? 'forum' : 'article') as 'article' | 'forum',
      pageId: h.pageId,
    }
  })

  const openTabs: BrowserTab[] = dataset.openTabs.map((t) => {
    if (
      t.screen === 'newtab' ||
      t.screen === 'suggest' ||
      t.screen === 'history' ||
      t.screen === 'bookmarks' ||
      t.screen === 'shared' ||
      t.screen === 'tabs' ||
      t.screen === 'serp'
    ) {
      return t
    }
    const link = ensure(t.title, {
      pageKind: t.pageKind === 'forum' ? 'forum' : 'article',
      pageId: t.pageId,
      url: t.url,
    })
    return {
      ...t,
      screen: link.pageKind,
      pageKind: link.pageKind,
      pageId: link.pageId,
    }
  })

  // 旧数据若缺搜索记录：只从已有建议补，不写死本地搜索词
  let suggests = Array.isArray(dataset.suggests) ? [...dataset.suggests] : []
  const hasSearchHistory = history.some((h) => h.pageKind === 'serp' || /^搜索[：:]/.test(h.title))
  if (!hasSearchHistory && suggests.length > 0) {
    const queries: string[] = []
    for (const s of suggests) {
      if (s.text && !queries.includes(s.text)) queries.push(s.text)
    }
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i]!
      history.unshift({
        id: `h_search_backfill_${i + 1}`,
        title: `搜索：${q}`,
        url: `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
        host: 'bing.com',
        timeLabel: `${21 + (i % 8)}:${String(10 + i).padStart(2, '0')}`,
        group: i < 3 ? 'today' : 'yesterday',
        pageKind: 'serp',
      })
    }
  }

  // 文章配图：保证都有画面描述
  for (const id of Object.keys(articles)) {
    const a = articles[id]!
    articles[id] = {
      ...a,
      imageCaption: sceneCaptionFromSeed(a.id, a.imageCaption),
      imageTone: a.imageTone || toneFromCaptionSeed(a.id),
    }
  }

  const sharedWithCaption = sharedPages.map((s) => {
    const art = s.pageId ? articles[s.pageId] : undefined
    return {
      ...s,
      thumbTone: art?.imageTone || s.thumbTone || toneFromCaptionSeed(s.id),
      thumbCaption: art?.imageCaption || sceneCaptionFromSeed(s.id, s.title),
    }
  })

  const serpByQuery = { ...dataset.serpByQuery }
  const pack = {
    ...(defaultSerp || {}),
    results: serpResults,
    resultCountLabel: defaultSerp.resultCountLabel || `约 ${Math.max(serpResults.length * 210, 120)} 条结果`,
    related: defaultSerp.related || [],
  }
  serpByQuery.__default = pack
  for (const h of history) {
    if (h.pageKind !== 'serp') continue
    const q = h.title.replace(/^搜索[：:]\s*/, '').trim()
    if (!q || serpByQuery[q]) continue
    serpByQuery[q] = {
      resultCountLabel: pack.resultCountLabel,
      results: serpResults,
      related: pack.related,
    }
  }

  const base: BrowserDataset = {
    ...dataset,
    articles,
    forums,
    history,
    bookmarks,
    sharedPages: sharedWithCaption,
    frequents,
    recents,
    openTabs,
    suggests: suggests.slice(0, 12),
    serpByQuery,
  }
  return ensureBookmarksDistributed(base)
}

export function parseBrowserMarkup(raw: string): BrowserDataset | null {
  const text = stripFence(raw)
  if (!text) return null

  const articleBlocks = extractBlocks(text, '<<BR_ARTICLE>>', '<<END_BR_ARTICLE>>')
  const forumBlocks = extractBlocks(text, '<<BR_FORUM>>', '<<END_BR_FORUM>>')
  if (articleBlocks.length + forumBlocks.length < 1) return null

  const articles: Record<string, ArticlePage> = {}
  for (const block of articleBlocks) {
    const map = fieldMap(block)
    const id = getField(map, ['id', '页面id', 'pageid']) || `art_${Object.keys(articles).length + 1}`
    const title = getField(map, ['标题', 'title'])
    const paragraphs = multiLines(block, ['段', '段落', 'p', '正文段'])
    if (!title || paragraphs.length < 1) continue
    const url = getField(map, ['网址', 'url', '链接']) || `https://web.local/p/${id}`
    const highlightPhrase = getField(map, ['高亮', 'highlight', '划线'])
    let highlight: ArticlePage['highlight']
    if (highlightPhrase) {
      const idx = paragraphs.findIndex((p) => p.includes(highlightPhrase))
      highlight = { paragraphIndex: idx >= 0 ? idx : 0, phrase: highlightPhrase }
    }
    const imageCaption = sceneCaptionFromSeed(
      id,
      getField(map, ['画面', '图注', '配图', 'caption', 'imagecaption', '描述']),
    )
    articles[id] = {
      id,
      url,
      siteName: getField(map, ['站点', '网站', 'sitename']) || '网页',
      author: getField(map, ['作者', 'author']) || '佚名',
      publishedAt: getField(map, ['时间', '发布时间', 'publishedat']) || '近期',
      title,
      paragraphs,
      highlight,
      imageTone: toneFromCaptionSeed(id),
      imageCaption,
    }
  }

  const forums: Record<string, ForumPage> = {}
  for (const block of forumBlocks) {
    const map = fieldMap(block)
    const id = getField(map, ['id', '页面id', 'pageid']) || `forum_${Object.keys(forums).length + 1}`
    const opContent = getField(map, ['正文', '内容', 'content', '楼主内容'])
    if (!opContent) continue
    forums[id] = {
      id,
      url: getField(map, ['网址', 'url', '链接']) || `https://forum.local/t/${id}`,
      siteName: getField(map, ['站点', '网站', 'sitename']) || '论坛',
      opNick: getField(map, ['楼主', '昵称', 'opnick']) || '匿名',
      opTime: getField(map, ['时间', 'optime']) || '刚刚',
      opContent,
      opIsCharacter: parseYesCharacter(
        getField(map, ['楼主身份', '身份', '本人', 'opischaracter', 'isself']),
      ),
      replies: parseReplies(block),
    }
  }

  if (Object.keys(articles).length + Object.keys(forums).length < 1) return null

  const history: HistoryItem[] = []
  for (const block of extractBlocks(text, '<<BR_HISTORY>>', '<<END_BR_HISTORY>>')) {
    const map = fieldMap(block)
    const title = getField(map, ['标题', 'title'])
    if (!title) continue
    const url = getField(map, ['网址', 'url', '链接'])
    const host = getField(map, ['域名', 'host', '主机']) || hostFromUrl(url, 'web.local')
    history.push({
      id: getField(map, ['id']) || `h_${history.length + 1}`,
      title,
      url: url || `https://${host}/`,
      host,
      timeLabel: getField(map, ['时间', 'timelabel']) || '刚刚',
      group: asGroup(getField(map, ['分组', 'group'])),
      pageKind: asPageKind(getField(map, ['类型', 'pagekind', 'kind'])),
      pageId: getField(map, ['页面', 'page', 'pageid', '正文id']) || undefined,
    })
  }

  const folderByKey = new Map<string, BookmarkFolder>()
  for (const block of extractBlocks(text, '<<BR_FOLDER>>', '<<END_BR_FOLDER>>')) {
    const map = fieldMap(block)
    const name = getField(map, ['名称', 'name', '夹名', '标题'])
    if (!name || isBuiltinFolderLabel(name)) continue
    const idRaw = getField(map, ['id'])
    const id = idRaw && !isBuiltinFolderLabel(idRaw) ? idRaw : folderIdFromName(name)
    folderByKey.set(id, { id, name: name.slice(0, 12) })
  }

  const bookmarks: BookmarkItem[] = []
  for (const block of extractBlocks(text, '<<BR_BOOKMARK>>', '<<END_BR_BOOKMARK>>')) {
    const map = fieldMap(block)
    const title = getField(map, ['标题', 'title'])
    if (!title) continue
    const id = getField(map, ['id']) || `bm_${bookmarks.length + 1}`
    const folderRaw = getField(map, ['夹', 'folder', 'folderid', '分组', '夹名']) || ''
    let folderId = ''
    if (folderRaw && !isBuiltinFolderLabel(folderRaw)) {
      const hit = Array.from(folderByKey.values()).find((f) => f.id === folderRaw || f.name === folderRaw)
      if (hit) folderId = hit.id
      else {
        folderId = folderRaw.startsWith('fld_') ? folderRaw : folderIdFromName(folderRaw)
        folderByKey.set(folderId, { id: folderId, name: folderRaw.startsWith('fld_') ? folderRaw : folderRaw.slice(0, 12) })
      }
    }
    bookmarks.push({
      id,
      folderId,
      title,
      siteName: getField(map, ['站点', 'sitename', '网站']) || '网页',
      url: getField(map, ['网址', 'url']) || 'https://web.local/',
      savedAt: getField(map, ['时间', 'savedat']) || '最近',
      thumbTone: toneFromCaptionSeed(id),
      pageKind: asPageKind(getField(map, ['类型', 'pagekind', 'kind'])),
      pageId: getField(map, ['页面', 'page', 'pageid']) || undefined,
    })
  }
  const bookmarkFolders: BookmarkFolder[] = [{ id: 'all', name: '全部' }, ...Array.from(folderByKey.values())]

  const sharedPages: SharedPageRecord[] = []
  for (const block of extractBlocks(text, '<<BR_SHARED>>', '<<END_BR_SHARED>>')) {
    const map = fieldMap(block)
    const title = getField(map, ['标题', 'title'])
    if (!title) continue
    const id = getField(map, ['id']) || `sh_${sharedPages.length + 1}`
    const url = getField(map, ['网址', 'url'])
    sharedPages.push({
      id,
      title,
      url: url || 'https://web.local/',
      host: getField(map, ['域名', 'host']) || hostFromUrl(url, 'web.local'),
      channel: getField(map, ['渠道', 'channel']) || '朋友圈',
      caption: getField(map, ['配文', 'caption']) || undefined,
      timeLabel: getField(map, ['时间', 'timelabel']) || '刚刚',
      group: asGroup(getField(map, ['分组', 'group'])),
      thumbTone: toneFromSeed(id),
      pageKind: asPageKind(getField(map, ['类型', 'pagekind', 'kind'])),
      pageId: getField(map, ['页面', 'page', 'pageid']) || undefined,
    })
  }

  const serpResults: SerpResult[] = []
  for (const block of extractBlocks(text, '<<BR_SERP>>', '<<END_BR_SERP>>')) {
    const map = fieldMap(block)
    const title = getField(map, ['标题', 'title'])
    if (!title) continue
    const id = getField(map, ['id']) || `sr_${serpResults.length + 1}`
    const host = getField(map, ['域名', 'host']) || 'web.local'
    serpResults.push({
      id,
      siteName: getField(map, ['站点', 'sitename']) || '网页',
      host,
      url: getField(map, ['网址', 'url']) || `https://${host}/`,
      title,
      snippet: getField(map, ['摘要', 'snippet', '描述']) || title,
      pageKind: asPageKind(getField(map, ['类型', 'pagekind', 'kind'])),
      pageId: getField(map, ['页面', 'page', 'pageid']) || '',
    })
  }

  const relatedBlocks = extractBlocks(text, '<<BR_RELATED>>', '<<END_BR_RELATED>>')
  const related = relatedBlocks.length ? multiLines(relatedBlocks[0]!, ['词', '相关', 'q']) : []

  type SearchRec = { query: string; timeLabel: string; group: HistoryGroup }
  const searchRecs: SearchRec[] = []
  for (const block of extractBlocks(text, '<<BR_SEARCH>>', '<<END_BR_SEARCH>>')) {
    const map = fieldMap(block)
    const query =
      getField(map, ['搜索词', 'query', '关键词', '标题']) ||
      multiLines(block, ['词', '文', '搜索词'])[0] ||
      ''
    if (!query) continue
    searchRecs.push({
      query,
      timeLabel: getField(map, ['时间', 'timelabel']) || '刚刚',
      group: asGroup(getField(map, ['分组', 'group'])),
    })
  }

  const suggests: SuggestItem[] = []
  for (const block of extractBlocks(text, '<<BR_SUGGEST>>', '<<END_BR_SUGGEST>>')) {
    const map = fieldMap(block)
    const textLine =
      getField(map, ['文本', 'text', '建议']) || multiLines(block, ['文', '词', '文本'])[0] || ''
    if (!textLine) continue
    const sourceRaw = getField(map, ['来源', 'source'])
    suggests.push({
      id: `sg_${suggests.length + 1}`,
      text: textLine,
      source: /history|历史/.test(sourceRaw) ? 'history' : 'suggest',
    })
  }

  const aiFrequents: FrequentSite[] = []
  for (const block of extractBlocks(text, '<<BR_FREQUENT>>', '<<END_BR_FREQUENT>>')) {
    const map = fieldMap(block)
    const name = getField(map, ['名称', 'name', '站名', '站点'])
    if (!name) continue
    aiFrequents.push({
      id: `fq_${aiFrequents.length + 1}`,
      name,
      host: getField(map, ['域名', 'host']) || name,
      glyph: getField(map, ['图标', 'glyph', '字']) || name.slice(0, 1),
      pageKind: asPageKind(getField(map, ['类型', 'pagekind', 'kind'])),
      pageId: getField(map, ['页面', 'page', 'pageid']) || undefined,
    })
  }

  const empty = emptyBrowserDataset()
  let openTabs: BrowserTab[] = []
  for (const block of extractBlocks(text, '<<BR_TAB>>', '<<END_BR_TAB>>')) {
    const map = fieldMap(block)
    const title = getField(map, ['标题', 'title']) || '标签页'
    const id = getField(map, ['id']) || `tab_${openTabs.length + 1}`
    const screen = asScreen(getField(map, ['画面', 'screen', '页']))
    openTabs.push({
      id,
      title,
      url: getField(map, ['网址', 'url']),
      screen,
      query: getField(map, ['搜索词', 'query']) || undefined,
      pageId: getField(map, ['页面', 'page', 'pageid']) || undefined,
      pageKind: getField(map, ['类型', 'pagekind']) ? asPageKind(getField(map, ['类型', 'pagekind'])) : undefined,
      thumbTone: toneFromSeed(id),
    })
  }
  if (!openTabs.some((t) => t.screen === 'newtab')) {
    openTabs = [...empty.openTabs, ...openTabs]
  }
  openTabs = openTabs.slice(0, 6)

  if (!history.length) {
    let i = 0
    for (const a of Object.values(articles)) {
      i += 1
      history.push({
        id: `h_auto_${i}`,
        title: a.title,
        url: a.url,
        host: hostFromUrl(a.url, a.siteName),
        timeLabel: `${10 + i}:0${i}`,
        group: i <= 2 ? 'today' : 'yesterday',
        pageKind: 'article',
        pageId: a.id,
      })
      if (history.length >= 8) break
    }
    for (const f of Object.values(forums)) {
      if (history.length >= 10) break
      i += 1
      history.push({
        id: `h_auto_f_${i}`,
        title: f.opContent.slice(0, 24),
        url: f.url,
        host: hostFromUrl(f.url, f.siteName),
        timeLabel: `0${i}:30`,
        group: 'today',
        pageKind: 'forum',
        pageId: f.id,
      })
    }
  }

  // 搜索记录：只用 AI 输出的 <<BR_SEARCH>> / 建议，不塞本地写死词条
  const ensuredSearches: SearchRec[] = [...searchRecs]
  for (const s of suggests) {
    if (s.source !== 'history') continue
    if (ensuredSearches.some((x) => x.query === s.text)) continue
    ensuredSearches.push({ query: s.text, timeLabel: '最近', group: 'today' })
  }

  for (let i = 0; i < ensuredSearches.length; i++) {
    const s = ensuredSearches[i]!
    const title = `搜索：${s.query}`
    if (history.some((h) => h.title === title || (h.pageKind === 'serp' && h.title.includes(s.query)))) continue
    history.unshift({
      id: `h_search_${i + 1}`,
      title,
      url: `https://www.bing.com/search?q=${encodeURIComponent(s.query)}`,
      host: 'bing.com',
      timeLabel: s.timeLabel,
      group: s.group,
      pageKind: 'serp',
    })
  }

  const suggestOut: SuggestItem[] = [...suggests]
  for (const s of ensuredSearches) {
    if (suggestOut.some((x) => x.text === s.query)) continue
    suggestOut.push({ id: `sg_hist_${suggestOut.length + 1}`, text: s.query, source: 'history' })
  }

  const serpByQuery: BrowserDataset['serpByQuery'] = {
    __default: {
      resultCountLabel: `约 ${Math.max(serpResults.length * 210, 180)} 条结果`,
      results: serpResults,
      related: related.slice(0, 6),
    },
  }
  for (const s of ensuredSearches) {
    serpByQuery[s.query] = {
      resultCountLabel: `约 ${Math.max(serpResults.length * 180, 120)} 条结果`,
      results: serpResults,
      related: related.length
        ? related.slice(0, 6)
        : ensuredSearches.map((x) => x.query).filter((q) => q !== s.query).slice(0, 4),
    }
  }

  let draft: BrowserDataset = {
    ...empty,
    articles,
    forums,
    history,
    bookmarks,
    bookmarkFolders,
    sharedPages,
    suggests: suggestOut.slice(0, 12),
    openTabs,
    serpByQuery,
    recents: [],
    frequents: [],
  }

  draft.frequents = rebuildFrequents(draft, aiFrequents)
  draft = ensureAllPreviewsOpenable(draft)
  return draft
}
