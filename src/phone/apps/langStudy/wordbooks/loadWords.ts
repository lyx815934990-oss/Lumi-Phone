import type { LangStudyWord } from '../langStudyTypes'
import hyojun1 from './data/hyojun-shokyu-1.json' with { type: 'json' }
import hyojun2 from './data/hyojun-shokyu-2.json' with { type: 'json' }
import jlptN4 from './data/jlpt-n4.json' with { type: 'json' }
import jlptN5 from './data/jlpt-n5.json' with { type: 'json' }
import jlptN5N4 from './data/jlpt-n5n4.json' with { type: 'json' }
import minna1 from './data/minna-shokyu-1.json' with { type: 'json' }
import minna2 from './data/minna-shokyu-2.json' with { type: 'json' }
import { flattenLessons, type LessonUnit } from './lessonTypes'

function asWords(raw: unknown): LangStudyWord[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((row): row is LangStudyWord => {
    if (!row || typeof row !== 'object') return false
    const o = row as LangStudyWord
    return typeof o.id === 'string' && typeof o.word === 'string' && typeof o.meaning === 'string'
  })
}

function asLessons(raw: unknown): LessonUnit[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const o = row as { lesson?: unknown; title?: unknown; words?: unknown }
      if (typeof o.lesson !== 'number' || typeof o.title !== 'string') return null
      const words = asWords(o.words)
      if (!words.length) return null
      return { lesson: o.lesson, title: o.title, words } satisfies LessonUnit
    })
    .filter((u): u is LessonUnit => !!u)
}

/** OpenJLPT N5 完整词表 */
export const JLPT_N5_FULL = asWords(jlptN5)
/** OpenJLPT N4 完整词表 */
export const JLPT_N4_FULL = asWords(jlptN4)
/** N5+N4 合集 */
export const JLPT_N5N4_FULL = asWords(jlptN5N4)

/** 大家的日语·初级1（第1–25课，MinnaNoDS） */
export const MINNA_LESSONS_1 = asLessons(minna1)
export const MINNA_1_WORDS = flattenLessons(MINNA_LESSONS_1)

/** 大家的日语·初级2（第26–50课，MinnaNoDS） */
export const MINNA_LESSONS_2 = asLessons(minna2)
export const MINNA_2_WORDS = flattenLessons(MINNA_LESSONS_2)

/** 新标日·初级上（第1–24课） */
export const HYOJUN_LESSONS_1 = asLessons(hyojun1)
export const HYOJUN_1_WORDS = flattenLessons(HYOJUN_LESSONS_1)

/** 新标日·初级下（第25–48课） */
export const HYOJUN_LESSONS_2 = asLessons(hyojun2)
export const HYOJUN_2_WORDS = flattenLessons(HYOJUN_LESSONS_2)
