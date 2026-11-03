export type LangStudyWord = {
  id: string
  word: string
  phonetic?: string
  meaning: string
  /** 词性，如 名词 / 动词 */
  pos?: string
  example?: string
  /** 教材课次（按课序词本） */
  lesson?: number
  lessonTitle?: string
}

export type LangStudyLang = 'en' | 'ja'

export type LangStudyBookMeta = {
  id: string
  title: string
  lang: LangStudyLang
  tags: string[]
  wordCount: number
  description: string
  /** 搜索别名：教材俗称、日文名、拼音缩写等，便于搜到 */
  searchAliases?: string[]
}

/**
 * 间隔重复进度（遗忘曲线）：
 * - introduced：是否已进入过「学新词」
 * - level：稳定档 0–5，决定下次间隔
 * - nextReviewAt：下次应复习时间戳
 */
export type WordMastery = {
  level: 0 | 1 | 2 | 3 | 4 | 5
  lastAt: number
  nextReviewAt: number
  introduced: boolean
  reps: number
}

/** 已加入「在学词本」的条目（封面可来自真实图书搜索） */
export type StudyingBookEntry = {
  localBookId: string
  title: string
  coverUrl?: string
  wordCount: number
  remoteId?: string
  sourceLabel?: string
  addedAt: number
}

export type LangStudyState = {
  activeBookId: string | null
  /** 在学词本书架（可多本） */
  studyingBooks: StudyingBookEntry[]
  buddyCharacterIds: string[]
  dailyGoal: number
  /** bookId -> wordId -> mastery */
  progress: Record<string, Record<string, WordMastery>>
  /** YYYY-MM-DD -> words studied that day */
  checkIns: Record<string, number>
  streak: number
  lastCheckInDate: string | null
  buddyNudgeEnabled: boolean
  lastNudgeAt: number | null
  /** 学新词时自动朗读 */
  autoSpeak: boolean
}

export type LangStudyBuddy = {
  id: string
  name: string
  avatarUrl: string
}

export const LANG_STUDY_KV_KEY = 'lang-study-v1'

export const DEFAULT_LANG_STUDY_STATE: LangStudyState = {
  activeBookId: null,
  studyingBooks: [],
  buddyCharacterIds: [],
  dailyGoal: 20,
  progress: {},
  checkIns: {},
  streak: 0,
  lastCheckInDate: null,
  buddyNudgeEnabled: true,
  lastNudgeAt: null,
  autoSpeak: true,
}
