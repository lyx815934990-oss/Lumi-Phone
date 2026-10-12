/**
 * 热门华语剧 / 实拍 / 游戏本地索引。
 * Bangumi 国内常超时，搜索与角色列表都可先走这里。
 */

import type { MediaKindFlag } from './mediaSearchKinds'
import { normalizeCnKey } from './cnTitleAliases'

export type CatalogCharacter = {
  id: number
  name: string
  imageUrl?: string
  bio?: string
}

export type CatalogMediaEntry = {
  /** 优先用 Bangumi subject id，便于网络恢复后拉角色 */
  id: number
  title: string
  aliases?: string[]
  year?: number
  mediaKind: Extract<MediaKindFlag, 'real' | 'game'>
  format: 'REAL' | 'GAME'
  coverImage?: string
  characters: CatalogCharacter[]
}

/** 角色 id：subjectId * 100 + 序号，避免与 AniList 冲突（选角时仅作本地键） */
function chars(subjectId: number, names: string[]): CatalogCharacter[] {
  return names.map((name, i) => ({
    id: subjectId * 100 + i + 1,
    name,
  }))
}

/**
 * 覆盖常见检索；持续可加。id 尽量对齐 Bangumi。
 */
export const LIVE_CATALOG: CatalogMediaEntry[] = [
  {
    id: 295237,
    title: '庆余年 第一季',
    aliases: ['庆余年', '庆余年1', '庆余年第一季', 'Joy of Life'],
    year: 2019,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(295237, [
      '范闲',
      '林婉儿',
      '庆帝',
      '陈萍萍',
      '范建',
      '范若若',
      '范思辙',
      '王启年',
      '滕梓荆',
      '海棠朵朵',
      '战豆豆',
      '叶灵儿',
      '二皇子',
      '三皇子',
      '长公主',
      '言冰云',
      '肖恩',
      '影',
    ]),
  },
  {
    id: 353464,
    title: '庆余年 第二季',
    aliases: ['庆余年2', '庆余年第二季'],
    year: 2024,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(353464, [
      '范闲',
      '林婉儿',
      '庆帝',
      '陈萍萍',
      '王启年',
      '二皇子',
      '三皇子',
      '长公主',
      '言冰云',
      '海棠朵朵',
      '叶灵儿',
      '范若若',
      '范思辙',
    ]),
  },
  {
    id: 493385,
    title: '庆余年 第三季',
    aliases: ['庆余年3', '庆余年第三季'],
    year: 2025,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(493385, ['范闲', '林婉儿', '庆帝', '陈萍萍', '王启年', '二皇子', '三皇子']),
  },
  {
    id: 280_001,
    title: '陈情令',
    aliases: ['The Untamed', '魔道祖师电视剧', '魔道祖师剧版'],
    year: 2019,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_001, [
      '魏无羡',
      '蓝忘机',
      '江澄',
      '江厌离',
      '金凌',
      '蓝思追',
      '蓝景仪',
      '温宁',
      '温情',
      '聂怀桑',
      '晓星尘',
      '宋岚',
      '薛洋',
      '金子轩',
      '金光瑶',
      '蓝曦臣',
    ]),
  },
  {
    id: 280_002,
    title: '琅琊榜',
    aliases: ['Nirvana in Fire'],
    year: 2015,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_002, [
      '梅长苏',
      '林殊',
      '萧景琰',
      '飞流',
      '蒙挚',
      '霓凰郡主',
      '言豫津',
      '萧景睿',
      '靖王',
      '誉王',
      '夏冬',
      '蔺晨',
    ]),
  },
  {
    id: 280_003,
    title: '甄嬛传',
    aliases: ['后宫甄嬛传', 'Empresses in the Palace'],
    year: 2011,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_003, [
      '甄嬛',
      '雍正',
      '沈眉庄',
      '安陵容',
      '果郡王',
      '皇后',
      '华妃',
      '敬妃',
      '浣碧',
      '剪秋',
    ]),
  },
  {
    id: 280_004,
    title: '狂飙',
    aliases: ['狂飙电视剧'],
    year: 2023,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_004, ['安欣', '高启强', '高启盛', '孟德海', '李青', '唐小虎', '徐江']),
  },
  {
    id: 280_005,
    title: '莲花楼',
    aliases: ['Mysterious Lotus Casebook'],
    year: 2023,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_005, ['李莲花', '方多病', '笛飞声', '角丽谯', '肖紫苓']),
  },
  {
    id: 280_006,
    title: '长相思',
    aliases: ['长相思第一季', 'Lost You Forever'],
    year: 2023,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_006, ['小夭', '涂山璟', '玱玹', '相柳', '赤水丰隆', '玄戈']),
  },
  {
    id: 280_007,
    title: '与凤行',
    aliases: ['The Legend of Shen Li'],
    year: 2024,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_007, ['沈璃', '行止', '慕子期', '风息', '涂山汼']),
  },
  {
    id: 280_008,
    title: '人世间',
    year: 2022,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_008, ['周秉昆', '郑娟', '周秉义', '周蓉', '六小君子']),
  },
  {
    id: 280_009,
    title: '繁花',
    aliases: ['繁花电视剧'],
    year: 2023,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_009, ['宝总', '汪小姐', '玲子', '爷叔', '汪总']),
  },
  {
    id: 280_010,
    title: '延禧攻略',
    aliases: ['Story of Yanxi Palace'],
    year: 2018,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_010, ['魏璎珞', '富察傅恒', '乾隆', '皇后', '尔晴', '纯妃']),
  },
  {
    id: 280_011,
    title: '知否知否应是绿肥红瘦',
    aliases: ['知否', '知否知否'],
    year: 2018,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_011, ['盛明兰', '顾廷烨', '齐衡', '墨兰', '如兰', '华兰', '小公爷']),
  },
  {
    id: 280_012,
    title: '苍兰诀',
    aliases: ['Love Between Fairy and Devil'],
    year: 2022,
    mediaKind: 'real',
    format: 'REAL',
    characters: chars(280_012, ['东方青苍', '小兰花', '长蘅', '结黎', '容昊', '息吹']),
  },
  {
    id: 280_013,
    title: '原神',
    aliases: ['Genshin Impact', '原神游戏'],
    year: 2020,
    mediaKind: 'game',
    format: 'GAME',
    characters: chars(280_013, [
      '空',
      '荧',
      '派蒙',
      '钟离',
      '雷电将军',
      '温迪',
      '纳西妲',
      '芙宁娜',
      '甘雨',
      '胡桃',
      '魈',
      '神里绫华',
      '夜兰',
      '那维莱特',
    ]),
  },
]

const BY_ID = new Map(LIVE_CATALOG.map((e) => [e.id, e]))

export function getCatalogEntry(id: number): CatalogMediaEntry | undefined {
  return BY_ID.get(id)
}

export function listCatalogCharacters(mediaId: number): CatalogCharacter[] {
  return BY_ID.get(mediaId)?.characters ?? []
}

/** 本地关键词匹配（不依赖外网） */
export function searchLiveCatalog(
  query: string,
  opts?: { real?: boolean; game?: boolean },
): CatalogMediaEntry[] {
  const q = normalizeCnKey(query.trim())
  if (q.length < 1) return []
  const wantReal = opts?.real !== false
  const wantGame = opts?.game !== false

  const scored: Array<{ e: CatalogMediaEntry; score: number }> = []
  for (const e of LIVE_CATALOG) {
    if (e.mediaKind === 'game' && !wantGame) continue
    if (e.mediaKind === 'real' && !wantReal) continue
    const keys = [e.title, ...(e.aliases ?? [])].map((s) => normalizeCnKey(s))
    let score = 0
    for (const k of keys) {
      if (k === q) score = Math.max(score, 200)
      else if (k.includes(q) || q.includes(k)) score = Math.max(score, 100 + Math.min(k.length, q.length))
      else {
        let overlap = 0
        const set = new Set(k)
        for (const ch of q) if (set.has(ch)) overlap += 1
        if (overlap >= 2 && overlap / q.length >= 0.5) score = Math.max(score, overlap * 8)
      }
    }
    if (score > 0) scored.push({ e, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 12).map((s) => s.e)
}
