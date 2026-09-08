/**
 * 人生账本「按记忆对齐」模型输出：纯文本块（非 JSON），便于稳定生成与解析。
 */

export const ALIGN_TEXT_FORMAT_BLOCK = `输出格式（硬约束 · 禁止 JSON / 代码围栏 / Markdown）：
只输出纯文本，以 <<<LIFE_ALIGN>>> 开头、<<<END_LIFE_ALIGN>>> 结尾。

无变化示例：
<<<LIFE_ALIGN>>>
[LIFE_ALIGN]
subject：character
status：无变化
<<<END_LIFE_ALIGN>>>

有更新示例（空白项须尽量补齐；列表用 @@段名 + 以“-”开头的条目行，字段用 键=值，分号分隔）：
<<<LIFE_ALIGN>>>
[LIFE_ALIGN]
subject：character
name：姓名
gender：female
genderChangeNote：
occupationMain：主业
occupationSide：副业
savings：存款
relationshipStatus：感情
educationTrack：undergrad
educationGradeAtStart：3
educationNote：现在年级备注
extraNote：
storyStartDay：
ageAtStart：
currentAge：21
@@realEstates
- label=学校宿舍；placeKind=dorm；location=虚构市+区+校名+楼栋房间；ownedBySubject=否；isPrimary=是；tenure=rent；valueWan=
- label=自家住所；placeKind=home；location=…；ownedBySubject=否；isPrimary=否；valueWan=280
@@vehicles
- model=无；note=无车产；valueWan=
@@family
- name=真实姓名；relation=父亲；gender=男；age=50；ageAtStart=48；birthdayMD=3月12日；alive=是；occupationOrSchool=具体岗位；residence=具体地址；livesWithSubject=否
@@socialCircle
- name=真实姓名；gender=女；age=21；ageAtStart=19；relation=大学同学；occupationOrSchool=…；residence=…；attitude=…
@@pets
- name=；species=；age=
<<<END_LIFE_ALIGN>>>

角色+玩家一次对齐：同一个包络内连续写两个 [LIFE_ALIGN] 块，subject 分别为 character 与 player。
布尔写 是/否。educationTrack：junior_high|high_school|undergrad|master|phd|working|other|空。
placeKind：home|dorm|rent|family|work|other。tenure：own|rent|空。
`

function parseBoolish(raw: string): boolean | undefined {
  const t = raw.trim().toLowerCase()
  if (!t) return undefined
  if (['1', 'true', 'yes', 'y', '是', '对', '有'].includes(t)) return true
  if (['0', 'false', 'no', 'n', '否', '不', '无'].includes(t)) return false
  return undefined
}

function parseItemFields(line: string): Record<string, string> {
  const body = line.trim().replace(/^[-•*、]\s*/, '')
  const out: Record<string, string> = {}
  for (const part of body.split(/[；;]/).map((x) => x.trim()).filter(Boolean)) {
    const m = /^([^=：:]+)[=：:]([\s\S]*)$/.exec(part)
    if (!m) continue
    out[m[1]!.trim()] = (m[2] ?? '').trim()
  }
  return out
}

function mapItemAliases(raw: Record<string, string>): Record<string, unknown> {
  const alias: Record<string, string> = {
    label: 'label',
    称呼: 'label',
    placeKind: 'placeKind',
    类型: 'placeKind',
    tenure: 'tenure',
    权属: 'tenure',
    ownedBySubject: 'ownedBySubject',
    本人产权: 'ownedBySubject',
    isPrimary: 'isPrimary',
    主居: 'isPrimary',
    location: 'location',
    地址: 'location',
    area: 'area',
    layout: 'layout',
    floor: 'floor',
    valueWan: 'valueWan',
    价值: 'valueWan',
    估值: 'valueWan',
    payKind: 'payKind',
    loanRemaining: 'loanRemaining',
    monthlyPayment: 'monthlyPayment',
    note: 'note',
    备注: 'note',
    model: 'model',
    车型: 'model',
    boughtAt: 'boughtAt',
    购入: 'boughtAt',
    name: 'name',
    姓名: 'name',
    relation: 'relation',
    关系: 'relation',
    gender: 'gender',
    性别: 'gender',
    age: 'age',
    年龄: 'age',
    现在年龄: 'age',
    ageAtStart: 'ageAtStart',
    开篇年龄: 'ageAtStart',
    birthdayMD: 'birthdayMD',
    生日: 'birthdayMD',
    alive: 'alive',
    在世: 'alive',
    health: 'health',
    occupationOrSchool: 'occupationOrSchool',
    职业: 'occupationOrSchool',
    residence: 'residence',
    住址: 'residence',
    livesWithSubject: 'livesWithSubject',
    同居: 'livesWithSubject',
    attitude: 'attitude',
    态度: 'attitude',
    species: 'species',
    物种: 'species',
    acquiredAt: 'acquiredAt',
    acquiredPlace: 'acquiredPlace',
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const canon = alias[k] || alias[k.toLowerCase()]
    if (!canon) continue
    if (['ownedBySubject', 'isPrimary', 'alive', 'livesWithSubject'].includes(canon)) {
      const b = parseBoolish(v)
      if (b !== undefined) out[canon] = b
      continue
    }
    out[canon] = v
  }
  return out
}

function parseAlignSectionList(block: string, section: string): Record<string, unknown>[] {
  const re = new RegExp(`@@${section}\\b[\\s\\S]*?(?=\\n@@|\\n\\[LIFE_ALIGN\\]|$)`, 'i')
  const m = re.exec(block)
  if (!m) return []
  const body = m[0].replace(new RegExp(`^@@${section}\\s*`, 'i'), '')
  const items: Record<string, unknown>[] = []
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('@@') || t.startsWith('[')) continue
    if (!/^[-•*]/.test(t) && !t.includes('=') && !t.includes('：') && !t.includes(':')) continue
    const mapped = mapItemAliases(parseItemFields(t))
    if (Object.keys(mapped).length) items.push(mapped)
  }
  return items
}

const ALIGN_FIELD_ALIASES: Record<string, string> = {
  status: 'status',
  状态: 'status',
  noChange: 'noChange',
  无变化: 'noChange',
  currentAge: 'currentAge',
  当前年龄: 'currentAge',
  现在几岁: 'currentAge',
  name: 'name',
  姓名: 'name',
  gender: 'gender',
  性别: 'gender',
  genderChangeNote: 'genderChangeNote',
  性别说明: 'genderChangeNote',
  occupationMain: 'occupationMain',
  主业: 'occupationMain',
  职业: 'occupationMain',
  occupationSide: 'occupationSide',
  副业: 'occupationSide',
  savings: 'savings',
  存款: 'savings',
  relationshipStatus: 'relationshipStatus',
  感情: 'relationshipStatus',
  educationTrack: 'educationTrack',
  学历轨道: 'educationTrack',
  educationGradeAtStart: 'educationGradeAtStart',
  开篇学年: 'educationGradeAtStart',
  educationNote: 'educationNote',
  学历备注: 'educationNote',
  extraNote: 'extraNote',
  补充: 'extraNote',
  storyStartDay: 'storyStartDay',
  开篇日: 'storyStartDay',
  ageAtStart: 'ageAtStart',
  开篇岁数: 'ageAtStart',
}

function parseAlignBlockToObject(block: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const line of block.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith('@@') || trimmed.startsWith('-')) continue
    const m = /^([^：:]+)[：:]([\s\S]*)$/.exec(trimmed)
    if (!m) continue
    const rawKey = m[1]!.trim().replace(/\s+/g, '')
    const canon = ALIGN_FIELD_ALIASES[rawKey] || ALIGN_FIELD_ALIASES[rawKey.toLowerCase()]
    if (!canon || canon === 'subject') continue
    const val = (m[2] ?? '').trim()
    if (canon === 'status' || canon === 'noChange') {
      if (/无变化|无更新|unchanged|no[_ ]?change|true/i.test(val) || rawKey === '无变化') obj.noChange = true
      continue
    }
    if (canon === 'currentAge' || canon === 'ageAtStart' || canon === 'educationGradeAtStart') {
      if (/^\d{1,3}$/.test(val)) obj[canon] = Number(val)
      else if (val) obj[canon] = val
      continue
    }
    obj[canon] = val
  }
  const pick = (...names: string[]) => {
    for (const n of names) {
      const items = parseAlignSectionList(block, n)
      if (items.length) return items
    }
    return [] as Record<string, unknown>[]
  }
  const realEstates = pick('realEstates', '住所', '房产')
  const vehicles = pick('vehicles', '车产', '车辆')
  const family = pick('family', '家庭')
  const socialCircle = pick('socialCircle', '社交圈', '人脉')
  const pets = pick('pets', '宠物')
  if (realEstates.length) obj.realEstates = realEstates
  if (vehicles.length) obj.vehicles = vehicles
  if (family.length) obj.family = family
  if (socialCircle.length) obj.socialCircle = socialCircle
  if (pets.length) obj.pets = pets
  return obj
}

function extractAlignBlocks(text: string): string[] {
  const src = String(text ?? '').trim()
  if (!src) return []
  const fence = /```(?:text|markdown|life)?\s*([\s\S]*?)```/i.exec(src)
  let work = (fence ? fence[1] : src).trim()
  const sm = /<<<LIFE_ALIGN>>>/i.exec(work)
  if (sm) {
    const rest = work.slice(sm.index + sm[0].length)
    const em = /<<<END_LIFE_ALIGN>>>/i.exec(rest)
    work = em ? rest.slice(0, em.index) : rest
  }
  const parts = work.split(/\[LIFE_ALIGN\]/i).slice(1)
  if (parts.length) return parts.map((p) => p.trim()).filter(Boolean)
  if (/status\s*[:：]\s*(无变化|无更新)/i.test(work) || /subject\s*[:：]/i.test(work) || /@@realEstates/i.test(work)) {
    return [work.trim()]
  }
  return []
}

function parseAlignJsonLegacy(text: string): Record<string, unknown> | null {
  const t = text.trim()
  if (!t) return null
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)
  const raw = (fence ? fence[1] : t).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    if (o.sheet && typeof o.sheet === 'object') return o.sheet as Record<string, unknown>
    return o
  } catch {
    return null
  }
}

function parsePairAlignJsonLegacy(
  text: string,
): { character: Record<string, unknown>; player: Record<string, unknown> } | null {
  const root = parseAlignJsonLegacy(text)
  if (!root) return null
  const charRaw = root.character ?? root.char
  const playerRaw = root.player ?? root.user
  if (!charRaw || typeof charRaw !== 'object' || !playerRaw || typeof playerRaw !== 'object') return null
  return {
    character: charRaw as Record<string, unknown>,
    player: playerRaw as Record<string, unknown>,
  }
}

export function parseAlignText(text: string): Record<string, unknown> | null {
  const blocks = extractAlignBlocks(text)
  if (!blocks.length) return parseAlignJsonLegacy(text)
  if (blocks.length === 1) return parseAlignBlockToObject(blocks[0]!)
  for (const b of blocks) {
    if (/subject\s*[:：]\s*(character|角色)/i.test(b)) return parseAlignBlockToObject(b)
  }
  return parseAlignBlockToObject(blocks[0]!)
}

export function parsePairAlignText(
  text: string,
): { character: Record<string, unknown>; player: Record<string, unknown> } | null {
  const blocks = extractAlignBlocks(text)
  if (!blocks.length) return parsePairAlignJsonLegacy(text)
  let character: Record<string, unknown> | null = null
  let player: Record<string, unknown> | null = null
  for (const b of blocks) {
    const head = b.slice(0, 240)
    const subj = /(?:subject|主体|对象)\s*[:：]\s*([^\n]+)/i.exec(head)?.[1]?.trim().toLowerCase() || ''
    const obj = parseAlignBlockToObject(b)
    if (/player|玩家|user|身份/.test(subj)) player = obj
    else if (/character|char|角色|npc/.test(subj)) character = obj
    else if (!character) character = obj
    else if (!player) player = obj
  }
  if (character && player) return { character, player }
  return null
}
