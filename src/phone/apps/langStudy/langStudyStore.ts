import { personaDb } from '../wechat/newFriendsPersona/idb'
import { gradeAfterLearn, gradeAfterReview, normalizeMastery } from './langStudySrs'
import {
  DEFAULT_LANG_STUDY_STATE,
  LANG_STUDY_KV_KEY,
  type LangStudyState,
  type StudyingBookEntry,
  type WordMastery,
} from './langStudyTypes'

function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function yesterdayKey(d = new Date()): string {
  const prev = new Date(d)
  prev.setDate(prev.getDate() - 1)
  return todayKey(prev)
}

/** 旧合集词本 → 分册 */
const LEGACY_BOOK_ID: Record<string, string> = {
  'minna-shokyu': 'minna-shokyu-1',
  'hyojun-shokyu': 'hyojun-shokyu-1',
}

function migrateBookId(id: string): string {
  return LEGACY_BOOK_ID[id] ?? id
}

function bumpCheckIn(prev: LangStudyState, now: number): Pick<
  LangStudyState,
  'checkIns' | 'streak' | 'lastCheckInDate'
> {
  const day = todayKey(new Date(now))
  const todayCount = (prev.checkIns[day] ?? 0) + 1
  const checkIns = { ...prev.checkIns, [day]: todayCount }
  let streak = prev.streak
  let lastCheckInDate = prev.lastCheckInDate
  const reached = todayCount >= prev.dailyGoal
  const alreadyCountedToday = prev.lastCheckInDate === day
  if (reached && !alreadyCountedToday) {
    const y = yesterdayKey(new Date(now))
    streak = prev.lastCheckInDate === y ? prev.streak + 1 : 1
    lastCheckInDate = day
  }
  return { checkIns, streak, lastCheckInDate }
}

export function parseLangStudyState(raw: unknown): LangStudyState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LANG_STUDY_STATE }
  const o = raw as Partial<LangStudyState>
  const progress: LangStudyState['progress'] = {}
  if (o.progress && typeof o.progress === 'object') {
    for (const [bookId, words] of Object.entries(o.progress)) {
      if (!words || typeof words !== 'object') continue
      const map: Record<string, WordMastery> = {}
      for (const [wid, m] of Object.entries(words)) {
        const norm = normalizeMastery(m)
        if (norm) map[wid] = norm
      }
      const nextId = migrateBookId(bookId)
      progress[nextId] = { ...(progress[nextId] || {}), ...map }
    }
  }
  const checkIns: Record<string, number> = {}
  if (o.checkIns && typeof o.checkIns === 'object') {
    for (const [k, v] of Object.entries(o.checkIns)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) checkIns[k] = Math.floor(v)
    }
  }
  const buddyIds = Array.isArray(o.buddyCharacterIds)
    ? o.buddyCharacterIds.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim())
    : []

  const studyingBooks: StudyingBookEntry[] = []
  if (Array.isArray(o.studyingBooks)) {
    const seen = new Set<string>()
    for (const row of o.studyingBooks) {
      if (!row || typeof row !== 'object') continue
      const r = row as Partial<StudyingBookEntry>
      const rawId = typeof r.localBookId === 'string' ? r.localBookId.trim() : ''
      const localBookId = migrateBookId(rawId)
      if (!localBookId || seen.has(localBookId)) continue
      seen.add(localBookId)
      studyingBooks.push({
        localBookId,
        title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : localBookId,
        coverUrl: typeof r.coverUrl === 'string' && r.coverUrl.trim() ? r.coverUrl.trim() : undefined,
        wordCount:
          typeof r.wordCount === 'number' && Number.isFinite(r.wordCount)
            ? Math.max(0, Math.floor(r.wordCount))
            : 0,
        remoteId: typeof r.remoteId === 'string' ? r.remoteId : undefined,
        sourceLabel: typeof r.sourceLabel === 'string' ? r.sourceLabel : undefined,
        addedAt: typeof r.addedAt === 'number' && Number.isFinite(r.addedAt) ? r.addedAt : Date.now(),
      })
    }
  }

  let activeBookId =
    typeof o.activeBookId === 'string' ? migrateBookId(o.activeBookId) : null
  if (activeBookId && !studyingBooks.some((b) => b.localBookId === activeBookId)) {
    studyingBooks.push({
      localBookId: activeBookId,
      title: activeBookId,
      wordCount: 0,
      addedAt: Date.now(),
    })
  }
  if (!activeBookId && studyingBooks[0]) activeBookId = studyingBooks[0].localBookId

  return {
    activeBookId,
    studyingBooks,
    buddyCharacterIds: [...new Set(buddyIds)],
    dailyGoal:
      typeof o.dailyGoal === 'number' && Number.isFinite(o.dailyGoal)
        ? Math.max(5, Math.min(100, Math.round(o.dailyGoal)))
        : DEFAULT_LANG_STUDY_STATE.dailyGoal,
    progress,
    checkIns,
    streak:
      typeof o.streak === 'number' && Number.isFinite(o.streak)
        ? Math.max(0, Math.floor(o.streak))
        : 0,
    lastCheckInDate: typeof o.lastCheckInDate === 'string' ? o.lastCheckInDate : null,
    buddyNudgeEnabled: typeof o.buddyNudgeEnabled === 'boolean' ? o.buddyNudgeEnabled : true,
    lastNudgeAt: typeof o.lastNudgeAt === 'number' ? o.lastNudgeAt : null,
    autoSpeak: typeof o.autoSpeak === 'boolean' ? o.autoSpeak : true,
  }
}

export async function loadLangStudyState(): Promise<LangStudyState> {
  try {
    const raw = await personaDb.getPhoneKv(LANG_STUDY_KV_KEY)
    return parseLangStudyState(raw)
  } catch {
    return { ...DEFAULT_LANG_STUDY_STATE }
  }
}

export async function saveLangStudyState(state: LangStudyState): Promise<void> {
  await personaDb.setPhoneKv(LANG_STUDY_KV_KEY, state)
}

export function getTodayStudied(state: LangStudyState, now = new Date()): number {
  return state.checkIns[todayKey(now)] ?? 0
}

export function isTodayCheckedIn(state: LangStudyState, now = new Date()): boolean {
  return getTodayStudied(state, now) >= state.dailyGoal
}

export function countBookMastered(
  state: LangStudyState,
  bookId: string,
  minLevel = 2,
): number {
  const map = state.progress[bookId]
  if (!map) return 0
  let n = 0
  for (const m of Object.values(map)) {
    if (m.introduced && m.level >= minLevel) n += 1
  }
  return n
}

export function upsertStudyingBook(
  prev: LangStudyState,
  entry: StudyingBookEntry,
  makeActive = true,
): LangStudyState {
  const prevHit = prev.studyingBooks.find((b) => b.localBookId === entry.localBookId)
  const rest = prev.studyingBooks.filter((b) => b.localBookId !== entry.localBookId)
  const nextEntry: StudyingBookEntry = {
    ...entry,
    coverUrl: entry.coverUrl || prevHit?.coverUrl,
    title: entry.title || prevHit?.title || entry.localBookId,
    wordCount: entry.wordCount || prevHit?.wordCount || 0,
    addedAt: prevHit?.addedAt ?? entry.addedAt,
  }
  return {
    ...prev,
    studyingBooks: [nextEntry, ...rest],
    activeBookId: makeActive ? entry.localBookId : prev.activeBookId,
  }
}

export function removeStudyingBook(prev: LangStudyState, localBookId: string): LangStudyState {
  const studyingBooks = prev.studyingBooks.filter((b) => b.localBookId !== localBookId)
  let activeBookId = prev.activeBookId
  if (activeBookId === localBookId) {
    activeBookId = studyingBooks[0]?.localBookId ?? null
  }
  return { ...prev, studyingBooks, activeBookId }
}

function writeWordMastery(
  prev: LangStudyState,
  bookId: string,
  wordId: string,
  mastery: WordMastery,
  now: number,
): LangStudyState {
  const bookProg = { ...(prev.progress[bookId] ?? {}), [wordId]: mastery }
  const bump = bumpCheckIn(prev, now)
  return {
    ...prev,
    progress: { ...prev.progress, [bookId]: bookProg },
    ...bump,
  }
}

/** 学新词结果 */
export function applyLearnResult(
  prev: LangStudyState,
  bookId: string,
  wordId: string,
  remembered: boolean,
  now = Date.now(),
): LangStudyState {
  const cur = prev.progress[bookId]?.[wordId]
  return writeWordMastery(prev, bookId, wordId, gradeAfterLearn(cur, remembered, now), now)
}

/** 复习结果（遗忘曲线调档） */
export function applyReviewResult(
  prev: LangStudyState,
  bookId: string,
  wordId: string,
  known: boolean,
  now = Date.now(),
): LangStudyState {
  const cur = prev.progress[bookId]?.[wordId]
  return writeWordMastery(prev, bookId, wordId, gradeAfterReview(cur, known, now), now)
}

/** @deprecated 用 applyLearnResult / applyReviewResult */
export function applyStudyResult(
  prev: LangStudyState,
  bookId: string,
  wordId: string,
  known: boolean,
  now = Date.now(),
): LangStudyState {
  const cur = prev.progress[bookId]?.[wordId]
  if (!cur?.introduced) return applyLearnResult(prev, bookId, wordId, known, now)
  return applyReviewResult(prev, bookId, wordId, known, now)
}

const NUDGE_TEMPLATES = [
  '{name}：今天的 {n} 个词还没刷完，别鸽。',
  '{name} 盯着你：还差 {left} 个就达标了。',
  '{name}：打开外语 App 刷一会儿，我在这等你打卡。',
  '{name}：连续 {streak} 天？先把今天的目标啃完。',
  '{name}：词本在等你，催一下不算越界吧。',
]

export function pickBuddyNudgeLine(params: {
  buddyName: string
  dailyGoal: number
  studiedToday: number
  streak: number
  seed?: number
}): string {
  const left = Math.max(0, params.dailyGoal - params.studiedToday)
  const tpl = NUDGE_TEMPLATES[(params.seed ?? Date.now()) % NUDGE_TEMPLATES.length]!
  return tpl
    .replaceAll('{name}', params.buddyName || '搭子')
    .replaceAll('{n}', String(params.dailyGoal))
    .replaceAll('{left}', String(left))
    .replaceAll('{streak}', String(Math.max(0, params.streak)))
}
