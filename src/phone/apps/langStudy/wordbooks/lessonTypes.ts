import type { LangStudyWord } from '../langStudyTypes'

export type LessonUnit = {
  lesson: number
  /** 如：第1课 です／ではありません */
  title: string
  words: LangStudyWord[]
}

export function flattenLessons(lessons: LessonUnit[]): LangStudyWord[] {
  const out: LangStudyWord[] = []
  for (const unit of lessons) {
    for (const w of unit.words) {
      out.push({
        ...w,
        lesson: unit.lesson,
        lessonTitle: unit.title,
      })
    }
  }
  return out
}

export function groupWordsByLesson(words: LangStudyWord[]): LessonUnit[] {
  const map = new Map<number, LessonUnit>()
  for (const w of words) {
    const n = typeof w.lesson === 'number' ? w.lesson : 0
    if (n <= 0) continue
    const title = w.lessonTitle || `第${n}课`
    let unit = map.get(n)
    if (!unit) {
      unit = { lesson: n, title, words: [] }
      map.set(n, unit)
    }
    unit.words.push(w)
  }
  return [...map.values()].sort((a, b) => a.lesson - b.lesson)
}
