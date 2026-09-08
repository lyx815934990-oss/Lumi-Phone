/**
 * 人生账本变更历史（对齐 / 同请求同步 / 手动编辑）
 */

import { genderLabelZh } from '../newFriendsPersona/utils'
import { lifePlaceKindLabel } from './compute'
import type {
  LifeChangeEvent,
  LifeEducationTrack,
  LifeFamilyMember,
  LifeFieldDiff,
  LifeMutableSheet,
  LifePet,
  LifeRealEstate,
  LifeSocialContact,
  LifeVehicle,
} from './types'

export const LIFE_CHANGE_HISTORY_MAX = 40
export const LIFE_MANUAL_HISTORY_COALESCE_MS = 3 * 60 * 1000

const TRACK_ZH: Record<Exclude<LifeEducationTrack, ''>, string> = {
  junior_high: '初中',
  high_school: '高中',
  undergrad: '大学本科',
  master: '硕士',
  phd: '博士',
  working: '已工作',
  other: '其他',
}

function joinParts(parts: Array<string | null | undefined | false>, sep = ' · '): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(sep)
}

function formatEducationTrack(v: unknown): string {
  if (v === '' || v == null) return '未设定'
  const t = String(v) as LifeEducationTrack
  return TRACK_ZH[t as Exclude<LifeEducationTrack, ''>] || String(v)
}

function formatGender(v: unknown): string {
  if (v === 'male' || v === 'female' || v === 'other') return genderLabelZh(v)
  if (typeof v === 'string' && v.trim()) return v.trim()
  return '（空）'
}

function formatOneRealEstate(raw: unknown, i = 0): string {
  if (!raw || typeof raw !== 'object') return ''
  const r = raw as Partial<LifeRealEstate>
  const kind = lifePlaceKindLabel(r.placeKind || '')
  const tenure = r.tenure === 'own' ? '自有' : r.tenure === 'rent' ? '租住' : ''
  const flags = joinParts([r.isPrimary ? '主居' : '', r.ownedBySubject ? '产权归本人' : '', tenure], '，')
  const head = joinParts([r.label || `住所${i + 1}`, kind])
  const body = joinParts(
    [
      r.location,
      r.layout,
      r.area,
      r.floor ? `${r.floor}层` : '',
      (r.valueWan || '').trim() ? `价值约${String(r.valueWan).trim()}万元` : '',
      flags,
      r.note,
    ],
    '；',
  )
  return joinParts([head, body], '：')
}

function formatOneVehicle(raw: unknown, _i = 0): string {
  if (!raw || typeof raw !== 'object') return ''
  const v = raw as Partial<LifeVehicle>
  const rawModel = (v.model || '').trim()
  if (rawModel === '无') return '无车'
  const model = rawModel || '型号未填'
  const pay = v.payKind === 'full' ? '全款' : v.payKind === 'loan' ? '贷款' : ''
  const value = (v.valueWan || '').trim() ? `价值约${String(v.valueWan).trim()}万元` : ''
  return joinParts([model, v.boughtAt ? `购于${v.boughtAt}` : '', value, pay, v.note])
}

function formatOneFamily(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const m = raw as Partial<LifeFamilyMember>
  const name = (m.name || '').trim() || '未命名'
  const rel = (m.relation || '').trim()
  const age = (m.age || '').trim() ? `${String(m.age).trim()}岁` : ''
  const job = (m.occupationOrSchool || '').trim()
  const home = (m.residence || '').trim()
  const flags = joinParts(
    [m.alive === false ? '已故' : '', m.livesWithSubject ? '同住' : '', (m.health || '').trim()],
    '，',
  )
  return joinParts([rel ? `${rel}·${name}` : name, age, job, home, flags])
}

function formatOneSocial(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const c = raw as Partial<LifeSocialContact>
  const name = (c.name || '').trim() || '未命名'
  const rel = (c.relation || '').trim()
  const age = (c.age || '').trim() ? `${String(c.age).trim()}岁` : ''
  const job = (c.occupationOrSchool || '').trim()
  const home = (c.residence || '').trim()
  const attitude = (c.attitude || '').trim()
  const note = (c.note || '').trim()
  return joinParts([rel ? `${rel}·${name}` : name, age, job, home, attitude, note])
}

function formatOnePet(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const p = raw as Partial<LifePet>
  const name = (p.name || '').trim() || '未命名'
  const species = (p.species || '').trim()
  const age = (p.age || '').trim() ? `${String(p.age).trim()}岁` : ''
  const when = (p.acquiredAt || '').trim()
  const where = (p.acquiredPlace || '').trim()
  return joinParts([species ? `${species}·${name}` : name, age, when ? `养于${when}` : '', where])
}

type ListEntry = { key: string; line: string; fingerprint: string }

function listEntryKey(raw: unknown, fallback: string): string {
  if (raw && typeof raw === 'object') {
    const id = (raw as { id?: unknown }).id
    if (typeof id === 'string' && id.trim()) return id.trim()
  }
  return fallback
}

function contentFingerprint(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const o = { ...(raw as Record<string, unknown>) }
  delete o.id
  try {
    return JSON.stringify(o)
  } catch {
    return String(raw)
  }
}

function toRealEstateEntries(list: unknown): ListEntry[] {
  if (!Array.isArray(list)) return []
  return list
    .map((raw, i) => {
      const line = formatOneRealEstate(raw, i)
      if (!line) return null
      return {
        key: listEntryKey(raw, `re-${i}-${line}`),
        line,
        fingerprint: contentFingerprint(raw),
      }
    })
    .filter((x): x is ListEntry => !!x)
}

function toVehicleEntries(list: unknown): ListEntry[] {
  if (!Array.isArray(list)) return []
  return list
    .map((raw, i) => {
      const line = formatOneVehicle(raw, i)
      if (!line) return null
      return {
        key: listEntryKey(raw, `vh-${i}-${line}`),
        line,
        fingerprint: contentFingerprint(raw),
      }
    })
    .filter((x): x is ListEntry => !!x)
}

function toFamilyEntries(list: unknown): ListEntry[] {
  if (!Array.isArray(list)) return []
  return list
    .map((raw, i) => {
      const line = formatOneFamily(raw)
      if (!line) return null
      const o = raw && typeof raw === 'object' ? (raw as Partial<LifeFamilyMember>) : {}
      const soft = `${(o.relation || '').trim()}|${(o.name || '').trim()}`.toLowerCase()
      return {
        key: listEntryKey(raw, soft || `fm-${i}-${line}`),
        line,
        fingerprint: contentFingerprint(raw),
      }
    })
    .filter((x): x is ListEntry => !!x)
}

function toSocialEntries(list: unknown): ListEntry[] {
  if (!Array.isArray(list)) return []
  return list
    .map((raw, i) => {
      const line = formatOneSocial(raw)
      if (!line) return null
      const o = raw && typeof raw === 'object' ? (raw as Partial<LifeSocialContact>) : {}
      const soft = `${(o.name || '').trim()}|${(o.relation || '').trim()}`.toLowerCase()
      return {
        key: listEntryKey(raw, soft || `sc-${i}-${line}`),
        line,
        fingerprint: contentFingerprint(raw),
      }
    })
    .filter((x): x is ListEntry => !!x)
}

function toPetEntries(list: unknown): ListEntry[] {
  if (!Array.isArray(list)) return []
  return list
    .map((raw, i) => {
      const line = formatOnePet(raw)
      if (!line) return null
      const o = raw && typeof raw === 'object' ? (raw as Partial<LifePet>) : {}
      const soft = `${(o.species || '').trim()}|${(o.name || '').trim()}`.toLowerCase()
      return {
        key: listEntryKey(raw, soft || `pet-${i}-${line}`),
        line,
        fingerprint: contentFingerprint(raw),
      }
    })
    .filter((x): x is ListEntry => !!x)
}

/** 只输出相对上一版的条目级差异，不整表重打 */
function diffListEntries(
  pathPrefix: string,
  labelPrefix: string,
  beforeEntries: ListEntry[],
  afterEntries: ListEntry[],
): LifeFieldDiff[] {
  const beforeMap = new Map(beforeEntries.map((e) => [e.key, e]))
  const afterMap = new Map(afterEntries.map((e) => [e.key, e]))
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()])
  const out: LifeFieldDiff[] = []
  for (const key of keys) {
    const b = beforeMap.get(key)
    const a = afterMap.get(key)
    if (b && a) {
      if (b.fingerprint === a.fingerprint || b.line === a.line) continue
      out.push({
        path: `${pathPrefix}.${key}`,
        label: `${labelPrefix} · 变更`,
        previousText: b.line,
        currentText: a.line,
      })
    } else if (!b && a) {
      out.push({
        path: `${pathPrefix}.${key}`,
        label: `${labelPrefix} · 新增`,
        previousText: '（无）',
        currentText: a.line,
      })
    } else if (b && !a) {
      out.push({
        path: `${pathPrefix}.${key}`,
        label: `${labelPrefix} · 删除`,
        previousText: b.line,
        currentText: '（已删除）',
      })
    }
  }
  return out
}

function previewScalar(key: keyof LifeMutableSheet, v: unknown): string {
  if (key === 'gender') return formatGender(v)
  if (key === 'educationTrack') return formatEducationTrack(v)
  if (v == null) return '（空）'
  if (typeof v === 'string') return v.trim() || '（空）'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return '（空）'
}

const SCALAR_LABELS: Array<[keyof LifeMutableSheet, string]> = [
  ['name', '姓名'],
  ['gender', '性别'],
  ['genderChangeNote', '性别说明'],
  ['occupationMain', '主业'],
  ['occupationSide', '副业'],
  ['savings', '存款'],
  ['relationshipStatus', '感情'],
  ['educationTrack', '学历轨道'],
  ['educationGradeAtStart', '开篇学年'],
  ['educationNote', '学历备注'],
  ['extraNote', '补充'],
  ['ageAtStart', '开篇岁数'],
  ['storyStartDay', '开篇日'],
]

/** 比较用：去掉历史字段，避免历史自身触发 diff */
export function lifeSheetWithoutHistory(sheet: LifeMutableSheet): Omit<LifeMutableSheet, 'changeHistory'> {
  const { changeHistory: _h, ...rest } = sheet
  return rest
}

export function lifeSheetContentEqual(a: LifeMutableSheet, b: LifeMutableSheet): boolean {
  return JSON.stringify(lifeSheetWithoutHistory(a)) === JSON.stringify(lifeSheetWithoutHistory(b))
}

export function buildLifeSheetDiffs(before: LifeMutableSheet, after: LifeMutableSheet): LifeFieldDiff[] {
  const diffs: LifeFieldDiff[] = []
  const push = (path: string, label: string, previousText: string, currentText: string) => {
    if (previousText === currentText) return
    diffs.push({ path, label, previousText, currentText })
  }
  for (const [key, label] of SCALAR_LABELS) {
    // 标量只记有变化的字段：原先值 → 现在值
    push(String(key), label, previewScalar(key, before[key]), previewScalar(key, after[key]))
  }
  diffs.push(
    ...diffListEntries('realEstates', '住所', toRealEstateEntries(before.realEstates), toRealEstateEntries(after.realEstates)),
    ...diffListEntries('vehicles', '车产', toVehicleEntries(before.vehicles), toVehicleEntries(after.vehicles)),
    ...diffListEntries('family', '家庭', toFamilyEntries(before.family), toFamilyEntries(after.family)),
    ...diffListEntries(
      'socialCircle',
      '社交圈',
      toSocialEntries(before.socialCircle),
      toSocialEntries(after.socialCircle),
    ),
    ...diffListEntries('pets', '宠物', toPetEntries(before.pets), toPetEntries(after.pets)),
  )
  return diffs.slice(0, 40)
}

/** 识别 JSON 条目类型并格式化单条 */
function formatParsedItem(raw: unknown, index = 0): string {
  if (!raw || typeof raw !== 'object') return ''
  const o = raw as Record<string, unknown>
  if ('placeKind' in o || 'isPrimary' in o || ('location' in o && !('relation' in o))) {
    return formatOneRealEstate(raw, index)
  }
  if ('model' in o || ('boughtAt' in o && !('species' in o))) return formatOneVehicle(raw, index)
  if ('livesWithSubject' in o || 'alive' in o) return formatOneFamily(raw)
  if ('species' in o || 'acquiredPlace' in o) return formatOnePet(raw)
  if ('relation' in o || 'attitude' in o || 'occupationOrSchool' in o) return formatOneSocial(raw)
  return ''
}

function tryParseJson(raw: string): unknown | null {
  const t = raw.trim()
  if (!(t.startsWith('[') || t.startsWith('{'))) return null
  try {
    return JSON.parse(t) as unknown
  } catch {
    return null
  }
}

const FIELD_ZH: Record<string, string> = {
  name: '姓名',
  gender: '性别',
  age: '现在年龄',
  ageAtStart: '开篇年龄',
  relation: '关系',
  occupationOrSchool: '职业/学业',
  residence: '住址',
  attitude: '态度',
  note: '备注',
  birthdayMD: '生日',
  alive: '在世',
  health: '健康',
  livesWithSubject: '同住',
  label: '称呼',
  placeKind: '地点类型',
  location: '地址',
  layout: '户型',
  area: '面积',
  floor: '楼层',
  model: '车型',
  boughtAt: '购入',
  valueWan: '价值(万元)',
  species: '种类',
  acquiredAt: '养于',
  acquiredPlace: '地点',
}

function fieldPreview(_key: string, v: unknown): string {
  if (v == null) return '（空）'
  if (typeof v === 'boolean') return v ? '是' : '否'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v.trim() || '（空）'
  return String(v)
}

/** 两个同结构对象：只展示有变动的字段 */
function formatObjectOnlyChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { previousText: string; currentText: string } {
  const name = String(before.name || after.name || before.label || after.label || '').trim()
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  keys.delete('id')
  const prevLines: string[] = []
  const nextLines: string[] = []
  for (const key of keys) {
    const b = fieldPreview(key, before[key])
    const a = fieldPreview(key, after[key])
    if (b === a) continue
    const zh = FIELD_ZH[key] || key
    prevLines.push(`${zh}：${b}`)
    nextLines.push(`${zh}：${a}`)
  }
  if (!prevLines.length && !nextLines.length) {
    return {
      previousText: formatParsedItem(before) || '（无变化）',
      currentText: formatParsedItem(after) || '（无变化）',
    }
  }
  const head = name ? `「${name}」` : ''
  return {
    previousText: [head, ...prevLines].filter(Boolean).join('\n'),
    currentText: [head, ...nextLines].filter(Boolean).join('\n'),
  }
}

/** 把历史里已存的 JSON 预览尽量转成可读文案（旧记录兼容） */
export function humanizeLifeHistoryPreviewText(raw: string): string {
  const t = (raw || '').trim()
  if (!t || t === '（空）' || t === '（无）' || t === '（已删除）') return t || '（空）'
  const parsed = tryParseJson(t)
  if (parsed == null) return t
  if (Array.isArray(parsed)) {
    if (!parsed.length) return '（无）'
    const lines = parsed.map((x, i) => formatParsedItem(x, i)).filter(Boolean)
    return lines.length ? lines.join('\n') : t
  }
  if (typeof parsed === 'object') {
    return formatParsedItem(parsed) || t
  }
  return t
}

/**
 * 展示用：旧 JSON 整段对照 → 可读文案，且尽量只标差异字段。
 */
export function formatLifeHistoryDiffPair(
  previousText: string,
  currentText: string,
): { previousText: string; currentText: string } {
  const prevRaw = (previousText || '').trim()
  const nextRaw = (currentText || '').trim()
  const prevParsed = tryParseJson(prevRaw)
  const nextParsed = tryParseJson(nextRaw)

  if (prevParsed != null && nextParsed != null) {
    if (
      !Array.isArray(prevParsed) &&
      !Array.isArray(nextParsed) &&
      typeof prevParsed === 'object' &&
      typeof nextParsed === 'object'
    ) {
      return formatObjectOnlyChangedFields(
        prevParsed as Record<string, unknown>,
        nextParsed as Record<string, unknown>,
      )
    }
    if (Array.isArray(prevParsed) && Array.isArray(nextParsed)) {
      // 整表 JSON：拆成条目级差异文案
      const beforeEntries = prevParsed
        .map((raw, i) => {
          const line = formatParsedItem(raw, i)
          if (!line) return null
          return {
            key: listEntryKey(raw, `i-${i}-${line}`),
            line,
            fingerprint: contentFingerprint(raw),
          }
        })
        .filter((x): x is ListEntry => !!x)
      const afterEntries = nextParsed
        .map((raw, i) => {
          const line = formatParsedItem(raw, i)
          if (!line) return null
          return {
            key: listEntryKey(raw, `i-${i}-${line}`),
            line,
            fingerprint: contentFingerprint(raw),
          }
        })
        .filter((x): x is ListEntry => !!x)
      const itemDiffs = diffListEntries('list', '条目', beforeEntries, afterEntries)
      if (itemDiffs.length === 1) {
        // 单条变更：若两侧仍是可解析对象，再压成字段级
        const only = itemDiffs[0]!
        const b = beforeEntries.find((e) => only.path.endsWith(e.key))
        const a = afterEntries.find((e) => only.path.endsWith(e.key))
        if (b && a && only.previousText !== '（无）' && only.currentText !== '（已删除）') {
          const bRaw = prevParsed.find((x, i) => listEntryKey(x, `i-${i}`) === b.key || formatParsedItem(x, i) === b.line)
          const aRaw = nextParsed.find((x, i) => listEntryKey(x, `i-${i}`) === a.key || formatParsedItem(x, i) === a.line)
          if (bRaw && aRaw && typeof bRaw === 'object' && typeof aRaw === 'object') {
            return formatObjectOnlyChangedFields(
              bRaw as Record<string, unknown>,
              aRaw as Record<string, unknown>,
            )
          }
        }
        return { previousText: only.previousText, currentText: only.currentText }
      }
      if (itemDiffs.length > 1) {
        return {
          previousText: itemDiffs.map((d) => `【${d.label}】${d.previousText}`).join('\n'),
          currentText: itemDiffs.map((d) => `【${d.label}】${d.currentText}`).join('\n'),
        }
      }
    }
  }

  return {
    previousText: humanizeLifeHistoryPreviewText(prevRaw || '（空）'),
    currentText: humanizeLifeHistoryPreviewText(nextRaw || '（空）'),
  }
}

export function normalizeLifeChangeHistory(raw: unknown): LifeChangeEvent[] {
  if (!Array.isArray(raw)) return []
  const out: LifeChangeEvent[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Partial<LifeChangeEvent>
    const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : ''
    const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0
    const summary = typeof r.summary === 'string' ? r.summary.trim() : ''
    const source =
      r.source === 'align' || r.source === 'inline' || r.source === 'manual' || r.source === 'sync_circle'
        ? r.source
        : 'manual'
    if (!id || !at || !summary) continue
    const diffs: LifeFieldDiff[] = Array.isArray(r.diffs)
      ? r.diffs
          .map((d) => {
            if (!d || typeof d !== 'object') return null
            const x = d as Partial<LifeFieldDiff>
            const path = typeof x.path === 'string' ? x.path.trim() : ''
            const label = typeof x.label === 'string' ? x.label.trim() : path
            if (!path && !label) return null
            return {
              path: path || label,
              label: label || path,
              ...formatLifeHistoryDiffPair(
                typeof x.previousText === 'string' ? x.previousText : '',
                typeof x.currentText === 'string' ? x.currentText : '',
              ),
            }
          })
          .filter((x): x is LifeFieldDiff => !!x)
          .slice(0, 40)
      : []
    out.push({ id, at, summary: summary.slice(0, 200), source, diffs })
    if (out.length >= LIFE_CHANGE_HISTORY_MAX) break
  }
  return out
}

export function appendLifeChangeHistory(
  sheet: LifeMutableSheet,
  params: {
    before: LifeMutableSheet
    summary: string
    source: LifeChangeEvent['source']
    at?: number
  },
): LifeMutableSheet {
  const diffs = buildLifeSheetDiffs(params.before, sheet)
  if (!diffs.length) return sheet
  const at = params.at ?? Date.now()
  const event: LifeChangeEvent = {
    id: `life-${params.source}-${at}`,
    at,
    summary: params.summary.trim().slice(0, 200) || '账本有更新',
    source: params.source,
    diffs,
  }
  return {
    ...sheet,
    changeHistory: [event, ...(sheet.changeHistory ?? [])].slice(0, LIFE_CHANGE_HISTORY_MAX),
  }
}

/** 手动编辑：短时间内合并进上一条「手动编辑」 */
export function appendOrCoalesceManualHistory(
  before: LifeMutableSheet,
  after: LifeMutableSheet,
): LifeMutableSheet {
  if (lifeSheetContentEqual(before, after)) return after
  const diffs = buildLifeSheetDiffs(before, after)
  if (!diffs.length) return after
  const now = Date.now()
  const hist = [...(after.changeHistory ?? [])]
  const latest = hist[0]
  if (
    latest &&
    latest.source === 'manual' &&
    now - latest.at <= LIFE_MANUAL_HISTORY_COALESCE_MS
  ) {
    const mergedByPath = new Map<string, LifeFieldDiff>()
    for (const d of latest.diffs) mergedByPath.set(d.path, d)
    for (const d of diffs) {
      const prev = mergedByPath.get(d.path)
      mergedByPath.set(d.path, {
        path: d.path,
        label: d.label,
        previousText: prev?.previousText ?? d.previousText,
        currentText: d.currentText,
      })
    }
    const mergedDiffs = [...mergedByPath.values()]
    hist[0] = {
      ...latest,
      at: now,
      summary: `手动编辑 · ${mergedDiffs.length} 处`,
      diffs: mergedDiffs.slice(0, 40),
    }
    return { ...after, changeHistory: hist.slice(0, LIFE_CHANGE_HISTORY_MAX) }
  }
  return appendLifeChangeHistory(after, {
    before,
    summary: `手动编辑 · ${diffs.length} 处`,
    source: 'manual',
    at: now,
  })
}

export function lifeChangeSourceLabel(source: LifeChangeEvent['source']): string {
  switch (source) {
    case 'align':
      return '按记忆对齐'
    case 'inline':
      return '同请求同步'
    case 'sync_circle':
      return '共同社交圈'
    case 'manual':
    default:
      return '手动编辑'
  }
}
