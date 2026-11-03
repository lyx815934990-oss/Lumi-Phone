/**
 * 从公开课序词库生成「大家的日语 / 新标日」上下册 JSON。
 * 原料：
 *   scripts/raw/minna-no-ds.yaml  ← https://github.com/vitto4/MinnaNoDS
 *   scripts/raw/biaori.csv        ← https://github.com/Rabbit-Hu/vocab-helper
 *   wordbooks/raw/ja-zh-final.json（可选，给大家的日语配中文释义）
 *
 * 用法：node scripts/build-textbook-wordbooks.mjs
 */
import fs from 'fs'
import path from 'path'

const root = path.resolve('src/phone/apps/langStudy/wordbooks')
const rawScripts = path.resolve('scripts/raw')
const outDir = path.join(root, 'data')
const zhPath = path.join(root, 'raw', 'ja-zh-final.json')

fs.mkdirSync(outDir, { recursive: true })

function unquote(s) {
  const t = String(s ?? '').trim().replace(/,$/, '')
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"')
  }
  if (t === '~' || t === 'null') return ''
  return t
}

function cleanSpaces(s) {
  return String(s || '')
    .replace(/　/g, ' ')
    .replace(/\s+/g, '')
    .trim()
}

function cleanZh(s) {
  if (!s || typeof s !== 'string') return ''
  return s
    .replace(/^（[^）]*）/, '')
    .replace(/^[0-9⓪①②③④⑤⑥⑦⑧⑨]+/, '')
    .replace(/【[^】]*】/g, '')
    .replace(/^[0-9⓪①②③④⑤⑥⑦⑧⑨]+/, '')
    .trim()
    .replace(/^；+/, '')
    .trim()
}

function loadZhDict() {
  if (!fs.existsSync(zhPath)) return {}
  try {
    return JSON.parse(fs.readFileSync(zhPath, 'utf8'))
  } catch {
    return {}
  }
}

function lookupZh(zhDict, word, reading) {
  const candidates = [word, reading, cleanSpaces(word), cleanSpaces(reading)].filter(Boolean)
  for (const k of candidates) {
    const direct = zhDict[k]
    if (typeof direct === 'string' && direct.trim()) return cleanZh(direct) || direct.trim()
  }
  return ''
}

/** 简易 MinnaNoDS YAML 词条解析（不依赖 js-yaml） */
function parseMinnaYaml(text) {
  /** @type {Map<number, Array<{kanji:string,kana:string,en:string,editions:number[]}>>} */
  const lessons = new Map()
  let currentLesson = null
  /** @type {null | {kanji:string,kana:string,en:string,editions:number[]}} */
  let current = null
  let inMeaning = false

  for (const raw of text.split(/\r?\n/)) {
    const lessonMatch = raw.match(/^lesson-(\d+):\s*$/)
    if (lessonMatch) {
      currentLesson = Number(lessonMatch[1])
      if (!lessons.has(currentLesson)) lessons.set(currentLesson, [])
      current = null
      inMeaning = false
      continue
    }
    if (currentLesson == null) continue

    if (/^\s+-\s+id:/.test(raw)) {
      current = { kanji: '', kana: '', en: '', editions: [] }
      lessons.get(currentLesson).push(current)
      inMeaning = false
      const ed = raw.match(/edition:\s*\[([^\]]*)\]/)
      // edition may be on same or next lines — handled below
      void ed
      continue
    }
    if (!current) continue

    const edLine = raw.match(/^\s+edition:\s*\[([^\]]*)\]/)
    if (edLine) {
      current.editions = edLine[1]
        .split(',')
        .map((x) => Number(String(x).trim()))
        .filter((n) => n === 1 || n === 2)
      continue
    }

    const kanji = raw.match(/^\s+kanji:\s*(.+)$/)
    if (kanji) {
      current.kanji = unquote(kanji[1])
      continue
    }
    const kana = raw.match(/^\s+kana:\s*(.+)$/)
    if (kana) {
      current.kana = unquote(kana[1])
      continue
    }
    if (/^\s+meaning:\s*\{/.test(raw)) {
      inMeaning = true
      continue
    }
    if (inMeaning) {
      const en = raw.match(/^\s+en:\s*(.+)$/)
      if (en) current.en = unquote(en[1])
      if (raw.includes('}')) inMeaning = false
    }
  }
  return lessons
}

function minnaToUnits(lessons, zhDict, from, to, idPrefix) {
  const units = []
  for (let lesson = from; lesson <= to; lesson++) {
    const rows = lessons.get(lesson) || []
    const words = []
    let i = 0
    for (const row of rows) {
      // 优先第 2 版（国内常见「第2版」）；仅第1版也保留
      if (row.editions.length && !row.editions.includes(2) && !row.editions.includes(1)) continue
      if (row.editions.length === 1 && row.editions[0] === 1 && rows.some((r) => r.kana === row.kana && r.editions.includes(2))) {
        continue
      }
      const kana = cleanSpaces(row.kana)
      const kanji = cleanSpaces(row.kanji)
      if (!kana && !kanji) continue
      const surface = kanji || kana
      const phonetic = kana || undefined
      const zh = lookupZh(zhDict, surface, kana)
      const meaning = zh || row.en || '（释义待补）'
      i += 1
      words.push({
        id: `${idPrefix}-l${String(lesson).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
        word: surface,
        ...(phonetic ? { phonetic } : {}),
        meaning,
        lesson,
        lessonTitle: `第${lesson}课`,
      })
    }
    if (!words.length) continue
    units.push({
      lesson,
      title: `第${lesson}课`,
      words,
    })
  }
  return units
}

function parseBiaoriCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  /** @type {Map<number, Array<{word:string,phonetic:string,meaning:string,pos?:string}>>} */
  const byLesson = new Map()
  let cur = 0
  for (const line of lines) {
    if (!line.trim()) continue
    const marker = line.match(/^新标初_(\d+)\s*,*$/)
    if (marker) {
      cur = Number(marker[1])
      if (!byLesson.has(cur)) byLesson.set(cur, [])
      continue
    }
    if (!cur) continue
    const parts = line.split(',')
    if (parts.length < 3) continue
    const word = (parts[0] || '').trim()
    const phonetic = (parts[1] || '').trim()
    const meaning = (parts[2] || '').trim()
    const pos = (parts[3] || '').trim()
    if (!word || !meaning) continue
    if (word === '日文') continue
    byLesson.get(cur).push({ word, phonetic, meaning, ...(pos ? { pos } : {}) })
  }
  return byLesson
}

function biaoriToUnits(byLesson, from, to, idPrefix, lessonOffset = 0) {
  const units = []
  for (let lesson = from; lesson <= to; lesson++) {
    const rows = byLesson.get(lesson) || []
    const displayLesson = lesson - lessonOffset
    const words = rows.map((row, i) => ({
      id: `${idPrefix}-l${String(displayLesson).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      word: row.word,
      ...(row.phonetic ? { phonetic: row.phonetic } : {}),
      meaning: row.meaning,
      ...(row.pos ? { pos: row.pos } : {}),
      lesson: displayLesson,
      lessonTitle: `第${displayLesson}课`,
    }))
    if (!words.length) continue
    units.push({
      lesson: displayLesson,
      title: `第${displayLesson}课`,
      words,
    })
  }
  return units
}

function writeJson(name, data) {
  const p = path.join(outDir, name)
  fs.writeFileSync(p, JSON.stringify(data))
  const n = Array.isArray(data) ? data.reduce((a, u) => a + (u.words?.length || 0), 0) : 0
  console.log('wrote', name, 'lessons', Array.isArray(data) ? data.length : 0, 'words', n)
}

const zhDict = loadZhDict()
const minnaYaml = fs.readFileSync(path.join(rawScripts, 'minna-no-ds.yaml'), 'utf8')
const minnaLessons = parseMinnaYaml(minnaYaml)
const minna1 = minnaToUnits(minnaLessons, zhDict, 1, 25, 'mn1')
const minna2 = minnaToUnits(minnaLessons, zhDict, 26, 50, 'mn2')

const biaoriCsv = fs.readFileSync(path.join(rawScripts, 'biaori.csv'), 'utf8')
const biaoriBy = parseBiaoriCsv(biaoriCsv)
// 新标日初级上=第1–24课，初级下=第25–48课（与教材课号一致）
const hyojun1 = biaoriToUnits(biaoriBy, 1, 24, 'hj1', 0)
const hyojun2 = biaoriToUnits(biaoriBy, 25, 48, 'hj2', 0)

writeJson('minna-shokyu-1.json', minna1)
writeJson('minna-shokyu-2.json', minna2)
writeJson('hyojun-shokyu-1.json', hyojun1)
writeJson('hyojun-shokyu-2.json', hyojun2)

const attrPath = path.join(outDir, 'ATTRIBUTION.txt')
const prev = fs.existsSync(attrPath) ? fs.readFileSync(attrPath, 'utf8') : ''
const extra = [
  '',
  'Minna no Nihongo lesson vocab structure: MinnaNoDS (community dataset)',
  'https://github.com/vitto4/MinnaNoDS',
  'Chinese glosses for Minna matched from Japanese-Chinese-thesaurus when available; else English from MinnaNoDS.',
  '',
  '新标准日本语（初级）课序词表：Rabbit-Hu/vocab-helper 公开词表',
  'https://github.com/Rabbit-Hu/vocab-helper',
  'For personal study with the official textbooks; not a substitute for the books.',
  '',
].join('\n')
if (!prev.includes('MinnaNoDS')) {
  fs.writeFileSync(attrPath, prev.trimEnd() + '\n' + extra)
}

// 抽样对比，避免两套教材被生成成同一份
const m1w = minna1[0]?.words?.slice(0, 5).map((w) => w.word)
const h1w = hyojun1[0]?.words?.slice(0, 5).map((w) => w.word)
console.log('minna L1 sample', m1w)
console.log('hyojun L1 sample', h1w)
if (JSON.stringify(m1w) === JSON.stringify(h1w)) {
  console.error('ERROR: minna and hyojun lesson 1 look identical')
  process.exit(1)
}
