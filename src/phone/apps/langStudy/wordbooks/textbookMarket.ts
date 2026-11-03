/**
 * 国内可用的教材「搜索市场」：纯本地索引，不依赖 Google / Open Library。
 * 上下册分开上架；大家的日语 ≠ 标准日本语。
 */
export type TextbookMarketItem = {
  id: string
  title: string
  subtitle: string
  aliases: string[]
  authors: string[]
  coverUrl: string
  /** 绑定本地可刷词本 */
  localBookId: string
  lessonCount: number
  publisher?: string
}

export const TEXTBOOK_MARKET: TextbookMarketItem[] = [
  {
    id: 'mkt-minna-1',
    title: '大家的日语 初级1（上册）',
    subtitle: 'みんなの日本語 初級Ⅰ · 第1–25课课序词表',
    aliases: [
      '大家的日语初级1',
      '大家的日语上册',
      '大家日语1',
      '初級Ⅰ',
      'みんなの日本語初級1',
      'minna 1',
      '民纳1',
    ],
    authors: ['スリーエーネットワーク'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29491878.jpg',
    localBookId: 'minna-shokyu-1',
    lessonCount: 25,
    publisher: '外语教学与研究出版社',
  },
  {
    id: 'mkt-minna-2',
    title: '大家的日语 初级2（下册）',
    subtitle: 'みんなの日本語 初級Ⅱ · 第26–50课课序词表',
    aliases: [
      '大家的日语初级2',
      '大家的日语下册',
      '大家日语2',
      '初級Ⅱ',
      'みんなの日本語初級2',
      'minna 2',
      '民纳2',
    ],
    authors: ['スリーエーネットワーク'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29491879.jpg',
    localBookId: 'minna-shokyu-2',
    lessonCount: 25,
    publisher: '外语教学与研究出版社',
  },
  {
    id: 'mkt-hyojun-1',
    title: '标准日本语 初级上册',
    subtitle: '新版中日交流标准日本语 · 第1–24课（与大家的日语不同套）',
    aliases: ['标日初级上', '标日上册', '标准日本语初级上', '新标日上', 'biaori上', '標準日本語上'],
    authors: ['人民教育出版社', '光村图书'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s28325521.jpg',
    localBookId: 'hyojun-shokyu-1',
    lessonCount: 24,
    publisher: '人民教育出版社',
  },
  {
    id: 'mkt-hyojun-2',
    title: '标准日本语 初级下册',
    subtitle: '新版中日交流标准日本语 · 第25–48课',
    aliases: ['标日初级下', '标日下册', '标准日本语初级下', '新标日下', 'biaori下', '標準日本語下'],
    authors: ['人民教育出版社', '光村图书'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s28325522.jpg',
    localBookId: 'hyojun-shokyu-2',
    lessonCount: 24,
    publisher: '人民教育出版社',
  },
  {
    id: 'mkt-n5',
    title: '日语能力考 N5 词表',
    subtitle: 'JLPT N5 完整开放词表',
    aliases: ['N5', 'jlpt n5', '能力考N5'],
    authors: ['OpenJLPT'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29715891.jpg',
    localBookId: 'jlpt-n5',
    lessonCount: 0,
  },
  {
    id: 'mkt-n4',
    title: '日语能力考 N4 词表',
    subtitle: 'JLPT N4 完整开放词表',
    aliases: ['N4', 'jlpt n4', '能力考N4'],
    authors: ['OpenJLPT'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29715892.jpg',
    localBookId: 'jlpt-n4',
    lessonCount: 0,
  },
  {
    id: 'mkt-cet4',
    title: '大学英语四级词汇',
    subtitle: '四级高频精选',
    aliases: ['四级', 'cet4', '英语四级'],
    authors: ['本地词库'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s33945687.jpg',
    localBookId: 'cet4-core',
    lessonCount: 0,
  },
  {
    id: 'mkt-cet6',
    title: '大学英语六级词汇',
    subtitle: '六级进阶精选',
    aliases: ['六级', 'cet6', '英语六级'],
    authors: ['本地词库'],
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s33945688.jpg',
    localBookId: 'cet6-core',
    lessonCount: 0,
  },
]

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[・·．.：:（）()【】\[\]「」『』]/g, '')
}

export function searchTextbookMarket(query: string): TextbookMarketItem[] {
  const q = norm(query)
  if (!q) return [...TEXTBOOK_MARKET]
  return TEXTBOOK_MARKET.map((item) => {
    const hay = norm([item.title, item.subtitle, ...item.aliases, ...item.authors, item.publisher || ''].join(' '))
    let score = 0
    if (hay.includes(q)) score += 100
    for (const a of item.aliases) {
      const an = norm(a)
      if (!an) continue
      if (q.includes(an) || an.includes(q)) score += 80
    }
    if (norm(item.title).includes(q) || q.includes(norm(item.title))) score += 60

    // 上下册 / 两套教材互不抢分
    const wantsMinna = /大家的日语|大家日语|みんな|minna|民纳/.test(q)
    const wantsHyojun = /标日|标准日本语|標準日本語|biaori|新标日/.test(q)
    const wantsUpper = /上册|初级1|初级上|初級[ⅰi１1]|shokyu-?1|初1/.test(q)
    const wantsLower = /下册|初级2|初级下|初級[ⅱii２2]|shokyu-?2|初2/.test(q)
    const isMinna = item.localBookId.startsWith('minna')
    const isHyojun = item.localBookId.startsWith('hyojun')
    const isUpper = /-(1)$/.test(item.localBookId) || item.title.includes('上')
    const isLower = /-(2)$/.test(item.localBookId) || item.title.includes('下')

    if (wantsMinna && isMinna) score += 120
    if (wantsMinna && isHyojun) score -= 200
    if (wantsHyojun && isHyojun) score += 120
    if (wantsHyojun && isMinna) score -= 200
    if (wantsUpper && isUpper) score += 80
    if (wantsUpper && isLower) score -= 100
    if (wantsLower && isLower) score += 80
    if (wantsLower && isUpper) score -= 100

    // 只搜「大家的日语」时同时返回上下册，不要误伤
    if (wantsMinna && !wantsUpper && !wantsLower && isMinna) score += 40
    if (wantsHyojun && !wantsUpper && !wantsLower && isHyojun) score += 40

    return { item, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
}
