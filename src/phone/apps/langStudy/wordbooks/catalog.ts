import type { LangStudyBookMeta, LangStudyLang, LangStudyWord } from '../langStudyTypes'
import { CET4_WORDS } from './cet4'
import { CET6_WORDS } from './cet6'
import { DAILY_WORDS } from './daily'
import { JP_DAILY_WORDS } from './jpDaily'
import { groupWordsByLesson, type LessonUnit } from './lessonTypes'
import {
  HYOJUN_1_WORDS,
  HYOJUN_2_WORDS,
  HYOJUN_LESSONS_1,
  HYOJUN_LESSONS_2,
  JLPT_N4_FULL,
  JLPT_N5_FULL,
  MINNA_1_WORDS,
  MINNA_2_WORDS,
  MINNA_LESSONS_1,
  MINNA_LESSONS_2,
} from './loadWords'

type BookPack = LangStudyBookMeta & {
  words: LangStudyWord[]
  lessons?: LessonUnit[]
}

export const LANG_LABEL: Record<LangStudyLang, string> = {
  en: '英语',
  ja: '日语',
}

const BOOKS: BookPack[] = [
  {
    id: 'cet4-core',
    title: '四级精选',
    lang: 'en',
    tags: ['英语', '四级', '考试', '高频'],
    wordCount: CET4_WORDS.length,
    description: '大学英语四级高频核心词，适合系统刷记。',
    searchAliases: ['cet4', '大学英语四级', '英语四级'],
    words: CET4_WORDS,
  },
  {
    id: 'cet6-core',
    title: '六级精选',
    lang: 'en',
    tags: ['英语', '六级', '考试', '进阶'],
    wordCount: CET6_WORDS.length,
    description: '六级常见书面与学术向词汇。',
    searchAliases: ['cet6', '大学英语六级', '英语六级'],
    words: CET6_WORDS,
  },
  {
    id: 'daily-oral',
    title: '日常口语',
    lang: 'en',
    tags: ['英语', '日常', '口语', '生活'],
    wordCount: DAILY_WORDS.length,
    description: '打招呼、点餐、出行等生活高频词。',
    searchAliases: ['english daily', '生活英语'],
    words: DAILY_WORDS,
  },
  {
    id: 'jlpt-n5',
    title: '日语 N5 完整词表',
    lang: 'ja',
    tags: ['日语', 'N5', 'JLPT', '完整', '基础'],
    wordCount: JLPT_N5_FULL.length,
    description: `JLPT N5 完整开放词表（${JLPT_N5_FULL.length} 词）。`,
    searchAliases: ['jlpt', '日语能力考', '能力考试', 'n5', 'N5完整'],
    words: JLPT_N5_FULL,
  },
  {
    id: 'jlpt-n4',
    title: '日语 N4 完整词表',
    lang: 'ja',
    tags: ['日语', 'N4', 'JLPT', '完整', '进阶'],
    wordCount: JLPT_N4_FULL.length,
    description: `JLPT N4 完整开放词表（${JLPT_N4_FULL.length} 词）。`,
    searchAliases: ['jlpt n4', '能力考N4', 'n4', 'N4完整'],
    words: JLPT_N4_FULL,
  },
  {
    id: 'jp-daily',
    title: '日语日常会话',
    lang: 'ja',
    tags: ['日语', '日常', '口语', '旅行'],
    wordCount: JP_DAILY_WORDS.length,
    description: '打招呼、点餐、交通、酒店等实用会话精选。',
    searchAliases: ['旅行日语', '口语日语'],
    words: JP_DAILY_WORDS,
  },
  {
    id: 'minna-shokyu-1',
    title: '大家的日语·初级1（上册）',
    lang: 'ja',
    tags: ['日语', '教材', '大家的日语', '初级1', '上册', '按课序'],
    wordCount: MINNA_1_WORDS.length,
    description: `みんなの日本語 初級Ⅰ · 第1–25课课序词表（${MINNA_1_WORDS.length} 词）。与「初级2 / 标日」词本不同。`,
    searchAliases: [
      '大家的日语初级1',
      '大家的日语上册',
      '大家日语1',
      '初級Ⅰ',
      'みんなの日本語初級1',
      'minna 1',
      '民纳1',
    ],
    words: MINNA_1_WORDS,
    lessons: MINNA_LESSONS_1,
  },
  {
    id: 'minna-shokyu-2',
    title: '大家的日语·初级2（下册）',
    lang: 'ja',
    tags: ['日语', '教材', '大家的日语', '初级2', '下册', '按课序'],
    wordCount: MINNA_2_WORDS.length,
    description: `みんなの日本語 初級Ⅱ · 第26–50课课序词表（${MINNA_2_WORDS.length} 词）。`,
    searchAliases: [
      '大家的日语初级2',
      '大家的日语下册',
      '大家日语2',
      '初級Ⅱ',
      'みんなの日本語初級2',
      'minna 2',
      '民纳2',
    ],
    words: MINNA_2_WORDS,
    lessons: MINNA_LESSONS_2,
  },
  {
    id: 'hyojun-shokyu-1',
    title: '标准日本语·初级上册',
    lang: 'ja',
    tags: ['日语', '教材', '标日', '标准日本语', '初级上', '上册', '按课序'],
    wordCount: HYOJUN_1_WORDS.length,
    description: `新版中日交流标准日本语 初级上 · 第1–24课（${HYOJUN_1_WORDS.length} 词）。与「大家的日语」不是同一套教材。`,
    searchAliases: [
      '标日初级上',
      '标日上册',
      '标准日本语初级上',
      '新标日上',
      'biaori上',
      '標準日本語上',
    ],
    words: HYOJUN_1_WORDS,
    lessons: HYOJUN_LESSONS_1,
  },
  {
    id: 'hyojun-shokyu-2',
    title: '标准日本语·初级下册',
    lang: 'ja',
    tags: ['日语', '教材', '标日', '标准日本语', '初级下', '下册', '按课序'],
    wordCount: HYOJUN_2_WORDS.length,
    description: `新版中日交流标准日本语 初级下 · 第25–48课（${HYOJUN_2_WORDS.length} 词）。`,
    searchAliases: [
      '标日初级下',
      '标日下册',
      '标准日本语初级下',
      '新标日下',
      'biaori下',
      '標準日本語下',
    ],
    words: HYOJUN_2_WORDS,
    lessons: HYOJUN_LESSONS_2,
  },
]

export function listBookMetas(): LangStudyBookMeta[] {
  return BOOKS.map(({ words: _w, lessons: _l, ...meta }) => meta)
}

export function getBookById(id: string | null | undefined): BookPack | null {
  if (!id) return null
  return BOOKS.find((b) => b.id === id) ?? null
}

export function getBookLessons(bookId: string | null | undefined): LessonUnit[] {
  const book = getBookById(bookId)
  if (!book) return []
  if (book.lessons?.length) return book.lessons
  return groupWordsByLesson(book.words)
}

function normalizeSearchText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[・·．.]/g, '')
}

export function searchBooks(query: string, tag?: string): LangStudyBookMeta[] {
  const qRaw = query.trim()
  const q = normalizeSearchText(qRaw)
  const tagQ = tag?.trim().toLowerCase() ?? ''
  return listBookMetas().filter((b) => {
    if (tagQ && !b.tags.some((t) => t.toLowerCase() === tagQ || t.toLowerCase().includes(tagQ))) {
      return false
    }
    if (!q) return true
    const langLabel = LANG_LABEL[b.lang]
    const alias = (b.searchAliases ?? []).join(' ')
    const hay = normalizeSearchText(
      `${b.title} ${b.description} ${b.tags.join(' ')} ${langLabel} ${b.lang} ${alias}`,
    )
    if (hay.includes(q)) return true
    const parts = qRaw
      .toLowerCase()
      .split(/\s+/)
      .map((p) => normalizeSearchText(p))
      .filter(Boolean)
    return parts.length > 1 && parts.every((p) => hay.includes(p))
  })
}

export function allBookTags(): string[] {
  const preferred = [
    '日语',
    '英语',
    '教材',
    '按课序',
    '上册',
    '下册',
    '大家的日语',
    '标日',
    '标准日本语',
    'N5',
    'N4',
    'JLPT',
    '四级',
    '六级',
    '日常',
    '口语',
    '初级1',
    '初级2',
    '初级上',
    '初级下',
    '考试',
  ]
  const set = new Set<string>()
  for (const b of BOOKS) for (const t of b.tags) set.add(t)
  const rest = [...set].filter((t) => !preferred.includes(t)).sort((a, b) => a.localeCompare(b, 'zh'))
  return [...preferred.filter((t) => set.has(t)), ...rest]
}
