/**
 * 中文片名 → AniList/Jikan 可检索的罗马音/日文别名。
 * Bangumi 在国内常超时，用这张表让中文搜索不依赖 Bangumi。
 * 注意：含标点的 key 必须用引号，否则 oxc 解析失败。
 */
const CN_TITLE_ALIASES: Record<string, string[]> = {
  佐佐木与宫野: ['Sasaki to Miyano', '佐々木と宮野', 'Sasaki and Miyano'],
  佐佐木と宮野: ['Sasaki to Miyano', '佐々木と宮野'],
  平家物语: ['Heike Monogatari', 'The Heike Story'],
  鬼灭之刃: ['Kimetsu no Yaiba', 'Demon Slayer', '鬼滅の刃'],
  进击的巨人: ['Shingeki no Kyojin', 'Attack on Titan', '進撃の巨人'],
  咒术回战: ['Jujutsu Kaisen', '呪術廻戦'],
  间谍过家家: ['Spy x Family', 'SPY×FAMILY'],
  辉夜大小姐想让我告白: ['Kaguya-sama', 'Kaguya-sama wa Kokurasetai'],
  约定的梦幻岛: ['Yakusoku no Neverland', 'The Promised Neverland'],
  夏目友人帐: ['Natsume Yuujinchou', "Natsume's Book of Friends"],
  排球少年: ['Haikyuu!!', 'ハイキュー!!'],
  '排球少年！！': ['Haikyuu!!'],
  青之驱魔师: ['Ao no Exorcist', 'Blue Exorcist'],
  文豪野犬: ['Bungou Stray Dogs'],
  宝石之国: ['Houseki no Kuni', 'Land of the Lustrous'],
  葬送的芙莉莲: ['Sousou no Frieren', 'Frieren'],
  我推的孩子: ['Oshi no Ko', '【推しの子】'],
  电锯人: ['Chainsaw Man', 'チェンソーマン'],
  链锯人: ['Chainsaw Man'],
  东京喰种: ['Tokyo Ghoul', '東京喰種'],
  东京食尸鬼: ['Tokyo Ghoul'],
  一拳超人: ['One Punch Man'],
  死神: ['Bleach'],
  火影忍者: ['Naruto'],
  海贼王: ['One Piece'],
  名侦探柯南: ['Detective Conan', 'Case Closed'],
  数码宝贝: ['Digimon'],
  美少女战士: ['Sailor Moon'],
  钢之炼金术师: ['Fullmetal Alchemist', 'Hagane no Renkinjutsushi'],
  全职猎人: ['Hunter x Hunter'],
  黑执事: ['Kuroshitsuji', 'Black Butler'],
  夏日重现: ['Summer Time Rendering', 'サマータイムレンダ'],
  孤独摇滚: ['Bocchi the Rock', 'ぼっち・ざ・ろっく！'],
  莉可丽丝: ['Lycoris Recoil'],
  迷宫饭: ['Dungeon Meshi', 'Delicious in Dungeon'],
  药屋少女的呢喃: ['Kusuriya no Hitorigoto', 'The Apothecary Diaries'],
  药屋的独自一人: ['Kusuriya no Hitorigoto'],
  天国大魔境: ['Tengoku Daimakyou', 'Heavenly Delusion'],
  终将成为你: ['Yagate Kimi ni Naru', 'Bloom Into You'],
  关于我转生变成史莱姆这档事: [
    'Tensei shitara Slime Datta Ken',
    'That Time I Got Reincarnated as a Slime',
  ],
  转生史莱姆: ['Tensei shitara Slime Datta Ken'],
  紫罗兰永恒花园: ['Violet Evergarden'],
  你的名字: ['Your Name', 'Kimi no Na wa', '君の名は。'],
  天气之子: ['Weathering With You', 'Tenki no Ko'],
  铃芽之旅: ['Suzume', 'Suzume no Tojimari'],
  灌篮高手: ['Slam Dunk'],
  头文字d: ['Initial D'],
  头文字D: ['Initial D'],
  擅长捉弄的高木同学: ['Karakai Jouzu no Takagi-san'],
  辉夜姬想让人告白: ['Kaguya-sama'],
  堀与宫村: ['Horimiya', 'Hori-san to Miyamura-kun'],
  月刊少女野崎君: ['Gekkan Shoujo Nozaki-kun'],
  Given: ['Given', 'ギヴン'],
  世界第一初恋: ['Sekai-ichi Hatsukoi', 'Sekaiichi Hatsukoi', '世界一初恋'],
  世界一初恋: ['Sekai-ichi Hatsukoi', 'Sekaiichi Hatsukoi'],
  只是结婚了而已: ['Kekkon shite mo Koishiteru', 'Married but in Love'],
  我让最想被拥抱的男人给威胁了: [
    'DAKAICHI',
    'Dakaretai Otoko',
    'Dakaretai Otoko 1-i ni Odosarete Imasu',
    '抱かれたい男1位に脅されています',
  ],
  抱かれたい男: ['DAKAICHI', 'Dakaretai Otoko', 'Dakaretai Otoko 1-i ni Odosarete Imasu'],
  最想被拥抱的男人: ['DAKAICHI', 'Dakaretai Otoko'],
  // —— 偏冷门 / 中文译名难命中 ——
  海边的异邦人: [
    'Umibe no Etranger',
    'Stranger by the Shore',
    '海辺のエトランゼ',
  ],
  海辺的异邦人: ['Umibe no Etranger', 'Stranger by the Shore'],
  异邦人: ['Umibe no Etranger', 'Stranger by the Shore'],
  同级生: ['Doukyuusei', 'Classmates', '同級生'],
  同級生: ['Doukyuusei', 'Classmates'],
  黄昏失焦: [
    'Twilight Out of Focus',
    'Tasogare Outfocus',
    'Out Focus',
    '黄昏アウトフォーカス',
  ],
  黄昏アウトフォーカス: ['Tasogare Outfocus', 'Twilight Out of Focus'],
  失焦: ['Tasogare Outfocus', 'Twilight Out of Focus'],
  平野与键浦: ['Hirano to Kagiura', 'Hirano and Kagiura', '平野と鍵浦'],
  平野和键浦: ['Hirano to Kagiura', 'Hirano and Kagiura', '平野と鍵浦'],
  平野と鍵浦: ['Hirano to Kagiura', 'Hirano and Kagiura'],
}

export function normalizeCnKey(s: string): string {
  return s.replace(/\s+/g, '').replace(/[！!？?。．.、，,·・]/g, '').toLowerCase()
}

const ALIAS_BY_NORM = (() => {
  const m = new Map<string, string[]>()
  for (const [cn, aliases] of Object.entries(CN_TITLE_ALIASES)) {
    const k = normalizeCnKey(cn)
    const prev = m.get(k) ?? []
    m.set(k, [...new Set([...prev, ...aliases.filter(Boolean)])])
  }
  return m
})()

/** 运行时学到的译名（自动翻译成功后写入，避免重复打接口） */
const LEARNED_ALIASES = new Map<string, string[]>()

export function hasExactCnAlias(query: string): boolean {
  const k = normalizeCnKey(query.trim())
  return Boolean(k && (ALIAS_BY_NORM.get(k)?.length || LEARNED_ALIASES.get(k)?.length))
}

export function registerLearnedAliases(query: string, aliases: string[]): void {
  const k = normalizeCnKey(query.trim())
  if (!k || !aliases.length) return
  const prev = LEARNED_ALIASES.get(k) ?? []
  LEARNED_ALIASES.set(k, [...new Set([...prev, ...aliases.filter(Boolean)])])
}

const CN_TITLE_KEYS = Object.keys(CN_TITLE_ALIASES)

function sharedCharScore(a: string, b: string): number {
  if (!a || !b) return 0
  const setB = new Set(b)
  let n = 0
  for (const ch of a) {
    if (setB.has(ch)) n += 1
  }
  return n
}

/**
 * 关键词拆分：空格/标点/连接词，中文长串再切前缀与尾词。
 * 例：「世界第一初恋」→ 世界第一初恋 / 世界第一 / 初恋 …
 */
export function tokenizeSearchKeywords(query: string): string[] {
  const q = query.trim()
  if (!q) return []
  const splitParts = q
    .split(/[\s\u3000、，,。．.!！？?·・/／＆&×xX与和のをにがはで]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 1)

  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = s.trim()
    if (t.length < 1) return
    const k = normalizeCnKey(t)
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push(t)
  }

  push(q)
  for (const p of splitParts) push(p)

  for (const p of splitParts.length ? splitParts : [q]) {
    if (!/[\u4e00-\u9fff]/.test(p)) continue
    if (p.length >= 3) {
      push(p.slice(0, 2))
      push(p.slice(0, 3))
    }
    if (p.length >= 4) {
      push(p.slice(0, 4))
      push(p.slice(-2))
      push(p.slice(-3))
    }
    if (p.length >= 5 && p.length <= 8) {
      // 中等长度片名：取中间 2～3 字作关键词（过长片名跳过，避免词爆炸）
      for (let i = 1; i <= p.length - 2; i += 1) {
        push(p.slice(i, i + 2))
        if (i + 3 <= p.length) push(p.slice(i, i + 3))
      }
    }
  }

  return out
}

/** 为查询生成宽松关键词检索词（含中文别名扩展），供 AniList/Jikan/Bangumi 使用 */
export function expandSearchQueries(query: string): string[] {
  const q = query.trim()
  if (!q) return []
  const nq = normalizeCnKey(q)
  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = s.trim()
    if (t.length < 1) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push(t)
  }

  const exactAls = [
    ...(ALIAS_BY_NORM.get(nq) ?? []),
    ...(LEARNED_ALIASES.get(nq) ?? []),
  ]
  // 点选关联片名 / 完整中文名：只打可命中的别名，避免碎词并发打爆 AniList 限流
  if (exactAls?.length) {
    for (const a of exactAls) push(a)
    for (const a of exactAls) {
      const short = a.split(/[\s:：]+/).filter(Boolean).slice(0, 2).join(' ')
      if (short.length >= 4 && short !== a) push(short)
    }
    push(q)
    return out.slice(0, 5)
  }

  const keywords = tokenizeSearchKeywords(q)
  push(q)
  for (const kw of keywords) {
    const n = normalizeCnKey(kw)
    // 丢掉过碎的中文 2 字词（易噪声 + 占满配额），保留 3 字及以上或非中文
    if (n.length < 2) continue
    if (/^[\u4e00-\u9fff]+$/.test(kw) && n.length < 3) continue
    push(kw)
  }

  const aliasMatched = new Set<string>()
  const tryAlias = (cn: string, als: string[]) => {
    if (aliasMatched.has(cn)) return
    aliasMatched.add(cn)
    for (const a of als) push(a)
  }

  for (const [cn, als] of Object.entries(CN_TITLE_ALIASES)) {
    const k = normalizeCnKey(cn)
    if (k.includes(nq) || (nq.length >= 3 && nq.includes(k))) tryAlias(cn, als)
    else if (
      keywords.some((kw) => {
        const n = normalizeCnKey(kw)
        return n.length >= 3 && (k.includes(n) || n.includes(k))
      })
    ) {
      tryAlias(cn, als)
    }
  }

  // 罗马音/英文别名优先，再短词，完整长中文最后
  out.sort((a, b) => {
    const aLat = /^[a-z0-9\s\-'.]+$/i.test(a) ? 0 : 1
    const bLat = /^[a-z0-9\s\-'.]+$/i.test(b) ? 0 : 1
    if (aLat !== bLat) return aLat - bLat
    const an = /[\u4e00-\u9fff]/.test(a) ? normalizeCnKey(a).length : a.length
    const bn = /[\u4e00-\u9fff]/.test(b) ? normalizeCnKey(b).length : b.length
    return an - bn
  })

  return out.slice(0, 5)
}

/** 用关键词给标题打相关度分（越大越相关） */
export function scoreTitleByKeywords(title: string, query: string): number {
  const t = normalizeCnKey(title)
  if (!t) return 0
  const keywords = tokenizeSearchKeywords(query)
  let score = 0
  const nq = normalizeCnKey(query)
  if (nq && t.includes(nq)) score += 50 + nq.length
  if (nq && nq.includes(t) && t.length >= 2) score += 30
  for (const kw of keywords) {
    const n = normalizeCnKey(kw)
    if (n.length < 2) continue
    if (t.includes(n)) score += 8 + n.length
  }
  score += sharedCharScore(nq, t)
  return score
}

/**
 * 无搜索结果时的关联中文片名（点选后可再搜）。
 * 优先子串包含，其次共字数。
 */
export function suggestRelatedCnTitles(query: string, limit = 6): string[] {
  const nq = normalizeCnKey(query.trim())
  if (nq.length < 2) return []

  const scored: { title: string; score: number }[] = []
  for (const cn of CN_TITLE_KEYS) {
    const k = normalizeCnKey(cn)
    if (!k || k === nq) continue
    let score = 0
    if (k.includes(nq) || nq.includes(k)) {
      score = 100 + Math.min(k.length, nq.length)
    } else {
      const overlap = sharedCharScore(nq, k)
      if (overlap >= 2 && overlap / Math.max(nq.length, 1) >= 0.4) {
        score = overlap * 10
      }
    }
    if (score > 0) scored.push({ title: cn, score })
  }

  scored.sort((a, b) => b.score - a.score || a.title.length - b.title.length)
  const seen = new Set<string>()
  const out: string[] = []
  for (const { title } of scored) {
    const k = normalizeCnKey(title)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(title)
    if (out.length >= limit) break
  }
  // 用户自补的中文名也参与关联提示
  for (const [k, als] of LEARNED_ALIASES) {
    if (out.length >= limit) break
    if (!k || k === nq || seen.has(k) || !als.length) continue
    if (k.includes(nq) || nq.includes(k)) {
      seen.add(k)
      // LEARNED 只有 norm key，用 key 本身展示（通常就是中文）
      out.push(k)
    }
  }
  return out
}
