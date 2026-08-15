import type { BrowserDataset, FrequentSite, HistoryItem } from './types'

/** 常见中文站点名（避免直接显示英文域名） */
const HOST_CN: Array<{ match: RegExp; name: string; glyph: string }> = [
  { match: /weibo|微博/, name: '微博', glyph: '微' },
  { match: /douban|豆瓣/, name: '豆瓣', glyph: '豆' },
  { match: /zhihu|知乎/, name: '知乎', glyph: '知' },
  { match: /163\.com|music\.163|网易云/, name: '网易云', glyph: '云' },
  { match: /xiaohongshu|xhslink|小红书/, name: '小红书', glyph: '红' },
  { match: /bilibili|b23\.tv|哔哩/, name: 'B站', glyph: 'B' },
  { match: /tieba|贴吧/, name: '贴吧', glyph: '贴' },
  { match: /baidu|百度/, name: '百度', glyph: '百' },
  { match: /qq\.com|腾讯/, name: '腾讯', glyph: 'Q' },
  { match: /toutiao|今日头条/, name: '头条', glyph: '头' },
  { match: /juejin|掘金/, name: '掘金', glyph: '掘' },
  { match: /csdn/, name: 'CSDN', glyph: 'C' },
  { match: /github/, name: 'GitHub', glyph: 'G' },
  { match: /bing|必应/, name: '必应', glyph: '必' },
  { match: /google/, name: '谷歌', glyph: '谷' },
  { match: /treehole|树洞/, name: '树洞', glyph: '洞' },
]

function hostKey(host: string): string {
  return String(host || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]!
    .toLowerCase()
}

function looksLatinOnly(s: string): boolean {
  const t = s.trim()
  if (!t) return true
  return /^[\w.\-]+$/i.test(t) && !/[\u4e00-\u9fff]/.test(t)
}

function resolveSiteLabel(input: {
  host: string
  siteName?: string
  title?: string
}): { name: string; glyph: string } {
  const siteName = String(input.siteName || '').trim()
  if (siteName && !looksLatinOnly(siteName)) {
    return { name: siteName.slice(0, 6), glyph: siteName.slice(0, 1) }
  }

  const blob = `${input.host} ${siteName} ${input.title || ''}`
  for (const row of HOST_CN) {
    if (row.match.test(blob)) return { name: row.name, glyph: row.glyph }
  }

  if (siteName) {
    const short = siteName.replace(/\.(com|cn|net|org|io)$/i, '').slice(0, 4)
    return { name: short || '网页', glyph: (short || '网').slice(0, 1) }
  }

  const title = String(input.title || '').trim()
  if (title && /[\u4e00-\u9fff]/.test(title)) {
    return { name: title.slice(0, 4), glyph: title.slice(0, 1) }
  }

  const host = hostKey(input.host)
  const first = host.split('.')[0] || 'web'
  for (const row of HOST_CN) {
    if (row.match.test(first)) return { name: row.name, glyph: row.glyph }
  }
  // 最后兜底：不用整段英文域名当站名
  return { name: '网页', glyph: '网' }
}

function pickLinkedPage(
  item: HistoryItem,
  articles: BrowserDataset['articles'],
  forums: BrowserDataset['forums'],
): { pageKind?: 'article' | 'forum'; pageId?: string; siteName?: string; title?: string } {
  if (item.pageKind === 'article' && item.pageId && articles[item.pageId]) {
    const page = articles[item.pageId]!
    return { pageKind: 'article', pageId: item.pageId, siteName: page.siteName, title: page.title }
  }
  if (item.pageKind === 'forum' && item.pageId && forums[item.pageId]) {
    const page = forums[item.pageId]!
    return { pageKind: 'forum', pageId: item.pageId, siteName: page.siteName, title: page.opContent }
  }
  // 同 host 兜底：找任意可打开详情
  const hk = hostKey(item.host)
  for (const a of Object.values(articles)) {
    if (hostKey(a.url).includes(hk) || hostKey(hk).includes(hostKey(a.url)) || a.siteName) {
      if (hk && (a.url.includes(hk.split('.')[0]!) || hostKey(a.url) === hk)) {
        return { pageKind: 'article', pageId: a.id, siteName: a.siteName, title: a.title }
      }
    }
  }
  for (const f of Object.values(forums)) {
    if (hk && (f.url.includes(hk.split('.')[0]!) || hostKey(f.url) === hk)) {
      return { pageKind: 'forum', pageId: f.id, siteName: f.siteName, title: f.opContent }
    }
  }
  return { siteName: undefined, title: item.title }
}

/**
 * 从历史/文章/论坛重建「常去」：中文站名 + 可打开的详情页链接。
 * 每个站点只保留一条，优先带 pageId 的记录。
 */
export function rebuildFrequents(dataset: BrowserDataset, aiFrequents?: unknown): FrequentSite[] {
  const byHost = new Map<string, FrequentSite>()

  const upsert = (site: FrequentSite) => {
    const key = hostKey(site.host) || site.id
    const prev = byHost.get(key)
    if (!prev) {
      byHost.set(key, site)
      return
    }
    // 已有条目若缺少详情，用新的补上
    if (!prev.pageId && site.pageId) byHost.set(key, { ...prev, ...site, name: prev.name, glyph: prev.glyph })
  }

  // 1) AI 给的 frequents（要求中文名）
  if (Array.isArray(aiFrequents)) {
    for (const raw of aiFrequents) {
      if (!raw || typeof raw !== 'object') continue
      const rec = raw as Partial<FrequentSite> & { siteName?: string }
      const nameSrc = String(rec.name || rec.siteName || '').trim()
      const host = String(rec.host || '').trim()
      if (!nameSrc && !host) continue
      const label = resolveSiteLabel({ host, siteName: nameSrc })
      const pageKind = rec.pageKind === 'forum' || rec.pageKind === 'article' ? rec.pageKind : undefined
      const pageId = typeof rec.pageId === 'string' ? rec.pageId : undefined
      const pageOk =
        pageKind === 'article'
          ? !!(pageId && dataset.articles[pageId])
          : pageKind === 'forum'
            ? !!(pageId && dataset.forums[pageId])
            : false
      upsert({
        id: String(rec.id || `fq_${hostKey(host) || nameSrc}`),
        name: looksLatinOnly(nameSrc) ? label.name : nameSrc.slice(0, 6),
        host: host || nameSrc,
        glyph: String(rec.glyph || label.glyph).slice(0, 2),
        pageKind: pageOk ? pageKind : undefined,
        pageId: pageOk ? pageId : undefined,
      })
    }
  }

  // 2) 从历史补齐 / 覆盖可打开详情
  for (const item of dataset.history) {
    if (!item?.id) continue
    const linked = pickLinkedPage(item, dataset.articles, dataset.forums)
    const label = resolveSiteLabel({
      host: item.host,
      siteName: linked.siteName,
      title: linked.title || item.title,
    })
    upsert({
      id: `fq_${hostKey(item.host) || item.id}`,
      name: label.name,
      host: item.host || label.name,
      glyph: label.glyph,
      pageKind: linked.pageKind,
      pageId: linked.pageId,
    })
  }

  // 3) 文章 / 论坛站点兜底
  for (const a of Object.values(dataset.articles)) {
    const label = resolveSiteLabel({ host: a.url, siteName: a.siteName, title: a.title })
    upsert({
      id: `fq_art_${a.id}`,
      name: label.name,
      host: hostKey(a.url) || a.siteName,
      glyph: label.glyph,
      pageKind: 'article',
      pageId: a.id,
    })
  }
  for (const f of Object.values(dataset.forums)) {
    const label = resolveSiteLabel({ host: f.url, siteName: f.siteName, title: f.opContent })
    upsert({
      id: `fq_forum_${f.id}`,
      name: label.name,
      host: hostKey(f.url) || f.siteName,
      glyph: label.glyph,
      pageKind: 'forum',
      pageId: f.id,
    })
  }

  const list = Array.from(byHost.values())
  // 可打开的排前面
  list.sort((a, b) => Number(!!b.pageId) - Number(!!a.pageId))
  return list.slice(0, 6)
}
