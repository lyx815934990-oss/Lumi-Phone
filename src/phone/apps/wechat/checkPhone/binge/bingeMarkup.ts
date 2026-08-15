/**
 * 查手机 · 追剧观影 AI 标记块解析
 */

import {
  emptyBingeDataset,
  MEDIA_KINDS,
  type BingeDataset,
  type BingeItem,
  type ForumGroup,
  type ForumPost,
  type MediaKind,
  type SearchRecord,
  type WatchSession,
  type WatchSessionGroup,
} from './types'

const POSTER_TONES = [
  'linear-gradient(160deg,#2a2438 0%,#6b5a78 55%,#c4b5c8 100%)',
  'linear-gradient(160deg,#1a1a22 0%,#3d3a48 50%,#8b8b8f 100%)',
  'linear-gradient(145deg,#241c28 0%,#4a3f52 45%,#9a8aa3 100%)',
  'linear-gradient(170deg,#101012 0%,#3a3540 60%,#6b5a78 100%)',
  'linear-gradient(150deg,#2c2830 0%,#5c4f62 50%,#d4c8d8 100%)',
  'linear-gradient(155deg,#1e2228 0%,#4a5560 55%,#a8b0b8 100%)',
]

function fieldMap(block: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([^：:]{1,24})\s*[：:]\s*(.*)$/)
    if (!m) continue
    map[m[1]!.trim()] = m[2]!.trim()
  }
  return map
}

function pick(map: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (map[k]?.trim()) return map[k]!.trim()
  }
  return ''
}

function parseKind(raw: string): MediaKind | null {
  const s = raw.trim()
  const table: Record<string, MediaKind> = {
    剧集: 'series',
    series: 'series',
    电影: 'movie',
    movie: 'movie',
    小说: 'novel',
    novel: 'novel',
    漫画: 'comic',
    comic: 'comic',
    动漫: 'anime',
    anime: 'anime',
  }
  return table[s] ?? table[s.toLowerCase()] ?? null
}

function parseGroup(raw: string): WatchSessionGroup {
  const s = raw.trim().toLowerCase()
  if (s === 'today' || s === '今天') return 'today'
  if (s === 'yesterday' || s === '昨天') return 'yesterday'
  return 'earlier'
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function extractBlocks(raw: string, start: string, end: string): string[] {
  const out: string[] = []
  const re = new RegExp(`${start}([\\s\\S]*?)${end}`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    out.push(m[1] || '')
  }
  return out
}

function parseItem(block: string, index: number): BingeItem | null {
  const map = fieldMap(block)
  const id = pick(map, 'id', 'ID') || `item_${index + 1}`
  const kind = parseKind(pick(map, '类型', 'kind'))
  const title = pick(map, '标题', 'title')
  if (!kind || !title) return null
  const progressRaw = pick(map, '进度值', 'progress')
  let progress = clamp01(Number(progressRaw))
  if (!progressRaw && pick(map, '进度文案', '进度')) {
    // 无显式进度值时按状态估
    const st = pick(map, '状态', 'status')
    progress = /完结|看完|完结|已完/.test(st) ? 1 : 0.45
  }
  const fav = /是|true|1|yes/i.test(pick(map, '收藏', 'favorited'))
  return {
    id,
    kind,
    title,
    posterTone: POSTER_TONES[index % POSTER_TONES.length]!,
    posterCaption: pick(map, '画面', '封面') || title.slice(0, 6),
    creators: pick(map, '创作者', '导演', '作者', '主演') || undefined,
    status: pick(map, '状态', 'status') || '追更中',
    progress,
    progressLabel: pick(map, '进度文案', '进度') || '进行中',
    totalMinutes: Math.max(0, Math.round(Number(pick(map, '累计分钟', '时长分钟')) || 120)),
    lastWatchedLabel: pick(map, '最近', '最近观看', '最近阅读') || '昨天 22:10',
    favorited: fav,
    synopsis: pick(map, '简介', 'synopsis') || '（暂无简介）',
    comment: pick(map, '评论', '短评')
      ? {
          text: pick(map, '评论', '短评'),
          atLabel: pick(map, '评论时间') || '3天前',
          likes: Math.max(0, Math.round(Number(pick(map, '评论赞')) || 0)) || undefined,
        }
      : undefined,
    forumId: pick(map, '讨论组', 'forumId') || undefined,
  }
}

function parseSession(block: string, index: number): WatchSession | null {
  const map = fieldMap(block)
  const itemId = pick(map, '内容', 'itemId', '关联')
  if (!itemId) return null
  return {
    id: pick(map, 'id', 'ID') || `sess_${index + 1}`,
    itemId,
    group: parseGroup(pick(map, '分组', 'group') || 'earlier'),
    dateKey: pick(map, '日期', 'dateKey') || '2026-08-13',
    progressNote: pick(map, '进度说明', '进度') || '看了一会儿',
    durationLabel: pick(map, '时长') || '40分钟',
    timeLabel: pick(map, '时间点', '时间') || '22:30',
  }
}

function parseForum(block: string, index: number): ForumGroup | null {
  const map = fieldMap(block)
  const id = pick(map, 'id', 'ID') || `forum_${index + 1}`
  const name = pick(map, '组名', '名称', 'name')
  if (!name) return null
  const posts: ForumPost[] = []
  const postLines = block.split(/\r?\n/).filter((l) => /^帖[：:]/.test(l.trim()) || /^post[：:]/i.test(l.trim()))
  postLines.forEach((line, i) => {
    const body = line.replace(/^帖[：:]|^post[：:]/i, '').trim()
    // 角色|昵称|正文|赞|回|时间
    const parts = body.split('|').map((x) => x.trim())
    if (parts.length < 3) return
    const who = parts[0] || ''
    const isCharacter = /角色|本人|self|char/i.test(who)
    posts.push({
      id: `${id}_p${i + 1}`,
      nick: parts[1] || (isCharacter ? 'TA' : '路人'),
      isCharacter,
      body: parts[2] || '',
      likes: Math.max(0, Math.round(Number(parts[3]) || 0)),
      replies: Math.max(0, Math.round(Number(parts[4]) || 0)),
      timeLabel: parts[5] || '昨天',
    })
  })
  return {
    id,
    name,
    relatedTitle: pick(map, '关联', '关联内容') || name,
    coverTone: POSTER_TONES[(index + 2) % POSTER_TONES.length]!,
    memberCount: Math.max(1, Math.round(Number(pick(map, '成员')) || 128)),
    activityLabel: pick(map, '活跃') || '今日活跃',
    bio: pick(map, '简介') || '聊聊这部作品。',
    posts,
  }
}

function parseSearch(block: string, index: number): SearchRecord | null {
  const map = fieldMap(block)
  const query = pick(map, '词', '搜索词', 'query')
  if (!query) return null
  return {
    id: pick(map, 'id') || `search_${index + 1}`,
    query,
    timeLabel: pick(map, '时间') || '前天',
  }
}

export const BINGE_MARKUP_FORMAT = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出下方标记块；每行「字段名：值」。
- 内容 8~14 条 <<BG_ITEM>>，须覆盖剧集/电影/小说/漫画/动漫至少各 1。
- 观看记录 6~12 条 <<BG_SESSION>>，内容字段引用条目 id。
- 讨论组 2~4 个 <<BG_FORUM>>；帖行格式：帖：角色|昵称|正文|赞|回|时间 或 帖：网友|昵称|…
- 站内搜索记录 4~8 条 <<BG_SEARCH>>：只写追剧馆内搜过的「作品名 / 演员 / 作者 / 题材关键词」；**禁止**浏览器搜索痕迹（网址、搜索引擎、与观影无关的查询）。
- 另输出一行统计：<<BG_STATS>> 本月小时：42 / 占比：剧集0.3|电影0.2|小说0.2|漫画0.15|动漫0.15 <<END_BG_STATS>>
- 进度文案须按类型：剧集/动漫「第X季 · EP0X / 共0X集」；电影「已看完 · 重看N次」或「观看至 01:12:33 / 02:08:00」；小说「读到第X章 / 共X章」；漫画「读到第X话 / 共X话」。
- 评论/短评要有情绪颗粒（惊喜、意难平、嗑到了、弃剧原因），禁止「还不错」。

<<BG_STATS>>
本月小时：42
占比：剧集0.28|电影0.18|小说0.22|漫画0.16|动漫0.16
<<END_BG_STATS>>

<<BG_ITEM>>
id：m1
类型：剧集
标题：示例剧名
创作者：主演甲 / 乙
状态：追更中
进度值：0.62
进度文案：第1季 · EP08 / 共16集
累计分钟：420
最近：昨天 23:12
收藏：是
简介：……
评论：第二集那个转场我直接愣住
评论时间：2天前
评论赞：12
讨论组：f1
画面：雨夜天台
<<END_BG_ITEM>>

<<BG_SESSION>>
id：s1
内容：m1
分组：today
日期：2026-08-14
进度说明：看到第8集
时长：1小时20分
时间点：23:12
<<END_BG_SESSION>>

<<BG_FORUM>>
id：f1
组名：示例讨论组
关联：示例剧名
成员：3200
活跃：今日 86 帖
简介：追更党集合
帖：角色|夜航灯|那句对白我循环了十遍|24|6|昨天
帖：网友|路人甲|同感|3|0|昨天
<<END_BG_FORUM>>

<<BG_SEARCH>>
id：q1
词：示例剧名 结局解析
时间：昨天 01:20
<<END_BG_SEARCH>>

<<BG_SEARCH>>
id：q2
词：某某演员 新剧
时间：前天 22:08
<<END_BG_SEARCH>>
`.trim()

export function parseBingeMarkup(raw: string): BingeDataset | null {
  if (!raw?.trim()) return null
  const text = raw.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''))
  const items = extractBlocks(text, '<<BG_ITEM>>', '<<END_BG_ITEM>>')
    .map((b, i) => parseItem(b, i))
    .filter((x): x is BingeItem => !!x)
  if (items.length < 4) return null

  const sessions = extractBlocks(text, '<<BG_SESSION>>', '<<END_BG_SESSION>>')
    .map((b, i) => parseSession(b, i))
    .filter((x): x is WatchSession => !!x)

  const forums = extractBlocks(text, '<<BG_FORUM>>', '<<END_BG_FORUM>>')
    .map((b, i) => parseForum(b, i))
    .filter((x): x is ForumGroup => !!x)

  const searches = extractBlocks(text, '<<BG_SEARCH>>', '<<END_BG_SEARCH>>')
    .map((b, i) => parseSearch(b, i))
    .filter((x): x is SearchRecord => !!x)

  const data = emptyBingeDataset()
  data.items = items
  data.sessions = sessions
  data.forums = forums
  data.searches = searches

  const statsBlocks = extractBlocks(text, '<<BG_STATS>>', '<<END_BG_STATS>>')
  if (statsBlocks[0]) {
    const map = fieldMap(statsBlocks[0])
    const hours = Number(pick(map, '本月小时', '小时'))
    if (Number.isFinite(hours)) data.monthHours = Math.max(0, hours)
    const shareRaw = pick(map, '占比')
    if (shareRaw) {
      const next = { ...data.kindShare }
      for (const part of shareRaw.split('|')) {
        const mm = part.trim().match(/^(剧集|电影|小说|漫画|动漫|series|movie|novel|comic|anime)\s*([0-9.]+)$/i)
        if (!mm) continue
        const kind = parseKind(mm[1]!)
        const v = Number(mm[2])
        if (kind && Number.isFinite(v)) next[kind] = Math.max(0, v)
      }
      const sum = MEDIA_KINDS.reduce((s, k) => s + next[k], 0)
      if (sum > 0) {
        for (const k of MEDIA_KINDS) next[k] = next[k] / sum
        data.kindShare = next
      }
    }
  } else {
    // 从条目累计分钟估占比
    const mins: Record<MediaKind, number> = { series: 0, movie: 0, novel: 0, comic: 0, anime: 0 }
    let total = 0
    for (const it of items) {
      mins[it.kind] += it.totalMinutes
      total += it.totalMinutes
    }
    if (total > 0) {
      for (const k of MEDIA_KINDS) data.kindShare[k] = mins[k] / total
      data.monthHours = Math.round((total / 60) * 10) / 10
    }
  }

  // 补全 forumId 引用
  const forumIds = new Set(forums.map((f) => f.id))
  data.items = items.map((it) =>
    it.forumId && forumIds.has(it.forumId) ? it : { ...it, forumId: it.forumId && forumIds.has(it.forumId) ? it.forumId : undefined },
  )

  return data
}

export function isBingeDatasetReady(data: BingeDataset | null): boolean {
  return !!data && data.items.length >= 4
}
