/**
 * 查手机 · 健康 AI 标记块解析
 */

import {
  BODY_SECTION_META,
  emptyHealthDataset,
  type BodySection,
  type BodySectionId,
  type CheckupReport,
  type ConsultCaseChart,
  type ConsultRxLine,
  type ConsultSession,
  type ConsultTurn,
  type HealthDataset,
  type HealthVisit,
  type LabFlag,
  type LabItem,
  type Medication,
  type VisitExam,
} from './types'

function fieldMap(block: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([^：:]{1,28})\s*[：:]\s*(.*)$/)
    if (!m) continue
    map[m[1]!.trim()] = m[2]!.trim()
  }
  return map
}

function pick(map: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (map[k]?.trim()) return map[k]!.trim()
  }
  return ''
}

function extractBlocks(raw: string, start: string, end: string): string[] {
  const out: string[] = []
  const re = new RegExp(`${start}([\\s\\S]*?)${end}`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) out.push(m[1] || '')
  return out
}

function parseFlag(raw: string): LabFlag {
  const s = raw.trim()
  if (/偏高|升高|高/.test(s)) return 'high'
  if (/偏低|降低|低/.test(s)) return 'low'
  if (/异常|阳性/.test(s)) return 'abnormal'
  return 'normal'
}

function parseSectionId(raw: string): BodySectionId | null {
  const s = raw.trim().toLowerCase()
  const table: Record<string, BodySectionId> = {
    surface: 'surface',
    体表: 'surface',
    皮肤: 'surface',
    senses: 'senses',
    五官: 'senses',
    respiratory: 'respiratory',
    呼吸: 'respiratory',
    circulatory: 'circulatory',
    循环: 'circulatory',
    血管: 'circulatory',
    digestive: 'digestive',
    消化: 'digestive',
    urogenital: 'urogenital',
    泌尿: 'urogenital',
    生殖: 'urogenital',
    musculo: 'musculo',
    骨骼: 'musculo',
    肌肉: 'musculo',
    neuro: 'neuro',
    神经: 'neuro',
    mental: 'mental',
    心理: 'mental',
    精神: 'mental',
    lifestyle: 'lifestyle',
    生活: 'lifestyle',
  }
  return table[s] ?? table[raw.trim()] ?? null
}

function parseVisit(block: string, index: number): HealthVisit | null {
  const map = fieldMap(block)
  const hospital = pick(map, '医院', 'hospital')
  if (!hospital) return null
  const exams: VisitExam[] = []
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^检查[：:]\s*(.+?)(?:\s*[|｜]\s*(.+))?$/)
    if (!m) continue
    exams.push({ name: m[1]!.trim(), result: m[2]?.trim() || undefined })
  }
  return {
    id: pick(map, 'id', 'ID') || `v_${index + 1}`,
    hospital,
    department: pick(map, '科室', 'department') || '内科',
    doctor: pick(map, '医生', 'doctor') || undefined,
    visitedAtLabel: pick(map, '时间', '就诊时间') || '近期',
    chiefComplaint: pick(map, '主诉', 'chief') || '不适就诊',
    exams,
    diagnosis: pick(map, '诊断', 'diagnosis') || '待进一步观察',
    advice: pick(map, '医嘱', '建议', 'advice') || '注意休息，不适随诊。',
    followUp: pick(map, '复诊', 'followUp') || undefined,
  }
}

function parseBody(block: string): BodySection | null {
  const map = fieldMap(block)
  const id = parseSectionId(pick(map, '系统', 'id', '章节'))
  if (!id) return null
  const meta = BODY_SECTION_META.find((x) => x.id === id)
  const body =
    pick(map, '正文', '内容', 'body') ||
    block
      .split(/\r?\n/)
      .filter((l) => !/^系统[：:]|^id[：:]|^章节[：:]|^状态[：:]|^标题[：:]/i.test(l.trim()))
      .join('\n')
      .trim()
  if (!body) return null
  return {
    id,
    title: pick(map, '标题') || meta?.title || id,
    body,
    statusLabel: pick(map, '状态', 'status') || undefined,
  }
}

function parseCheckup(block: string, index: number): CheckupReport | null {
  const map = fieldMap(block)
  const orgName = pick(map, '机构', '医院', 'org')
  if (!orgName) return null
  const labs: LabItem[] = []
  for (const line of block.split(/\r?\n/)) {
    // 指标：名称|结果|参考|标志
    const m = line.match(/^指标[：:]\s*(.+?)\s*[|｜]\s*(.+?)\s*[|｜]\s*(.+?)(?:\s*[|｜]\s*(.+))?$/)
    if (!m) continue
    labs.push({
      name: m[1]!.trim(),
      value: m[2]!.trim(),
      refRange: m[3]!.trim(),
      flag: parseFlag(m[4] || '正常'),
    })
  }

  const vitals = {
    age: pick(map, '年龄', 'age') || undefined,
    height: pick(map, '身高', 'height') || undefined,
    weight: pick(map, '体重', 'weight') || undefined,
    bmi: pick(map, 'BMI', 'bmi', '体质指数') || undefined,
    bloodSugar: pick(map, '血糖', '空腹血糖', 'glucose') || undefined,
    bodyFat: pick(map, '体脂率', '体脂', 'bodyFat') || undefined,
    bloodPressure: pick(map, '血压', 'bloodPressure') || undefined,
  }
  const hasVitals = Object.values(vitals).some((v) => !!v?.trim())

  // 若模型只把基础项写进「指标：」，从 labs 回填 vitals
  const findLab = (...names: string[]) =>
    labs.find((l) => names.some((n) => l.name.includes(n)))?.value
  if (!vitals.height) vitals.height = findLab('身高')
  if (!vitals.weight) vitals.weight = findLab('体重')
  if (!vitals.bmi) vitals.bmi = findLab('BMI', '体质指数')
  if (!vitals.bloodSugar) vitals.bloodSugar = findLab('空腹血糖', '血糖')
  if (!vitals.bodyFat) vitals.bodyFat = findLab('体脂')
  if (!vitals.age) vitals.age = findLab('年龄')
  if (!vitals.bloodPressure) vitals.bloodPressure = findLab('血压')

  const ensuredLabs = [...labs]
  const ensureLab = (name: string, value: string | undefined, ref: string) => {
    if (!value?.trim()) return
    if (ensuredLabs.some((l) => l.name.includes(name.slice(0, 2)))) return
    ensuredLabs.push({ name, value: value.trim(), refRange: ref, flag: 'normal' })
  }
  ensureLab('身高', vitals.height, '—')
  ensureLab('体重', vitals.weight, '—')
  ensureLab('BMI', vitals.bmi, '18.5-23.9')
  ensureLab('空腹血糖', vitals.bloodSugar, '3.9-6.1 mmol/L')
  ensureLab('体脂率', vitals.bodyFat, '按性别参考')

  return {
    id: pick(map, 'id') || `ck_${index + 1}`,
    orgName,
    packageName: pick(map, '套餐', 'package') || '常规体检',
    dateLabel: pick(map, '日期', '时间') || '近期',
    vitals: hasVitals || Object.values(vitals).some((v) => !!v) ? vitals : undefined,
    labs: ensuredLabs,
    summary: pick(map, '结论', '总结', 'summary') || '总体大致正常，个别指标需关注。',
    advice: pick(map, '建议', 'advice') || '保持作息，按医嘱复查。',
  }
}

function parseMed(block: string, index: number): Medication | null {
  const map = fieldMap(block)
  const name = pick(map, '药名', '名称', 'name')
  if (!name) return null
  return {
    id: pick(map, 'id') || `med_${index + 1}`,
    name,
    dose: pick(map, '用法', '剂量', 'dose') || '按医嘱',
    note: pick(map, '备注', 'note') || undefined,
  }
}

function parseConsultSpeaker(raw: string): ConsultTurn['speaker'] | null {
  const s = raw.trim().toLowerCase()
  if (/^(患|患者|病人|角色|patient|pt)$/i.test(s)) return 'patient'
  // 注意：不能把「医生/医师」当说话人——那是元数据字段「医生：张三」
  if (/^(医|doctor|dr)$/i.test(s)) return 'doctor'
  return null
}

const CONSULT_META_LINE =
  /^(id|ID|医院|hospital|科室|department|医生|doctor|时间|面诊时间|日期|主题|主诉|topic|关联就诊|visitId|性别|年龄体型|年龄及体型|来诊原因|原因|脉诊|望诊|舌诊|诊断|方题|方注|处方题|煎服|用法说明|解说|备注|性别)\s*[：:]/i

const CONSULT_CHART_LIST_LINE =
  /^(问|问诊|问诊点|药|药材|处方)\s*[：:]/i

function parseConsultRxLine(raw: string): ConsultRxLine | null {
  const text = raw.trim()
  if (!text) return null
  const parts = text.split(/[|｜]/)
  const herb = (parts[0] || '').trim()
  if (!herb) return null
  const note = (parts[1] || '').trim() || undefined
  return { text: herb, note }
}

function parseConsultChart(block: string, map: Record<string, string>): ConsultCaseChart | undefined {
  const inquiry: string[] = []
  const rxLines: ConsultRxLine[] = []
  for (const lineRaw of block.split(/\r?\n/)) {
    const line = lineRaw.trim()
    if (!line) continue
    const q = line.match(/^(?:问|问诊|问诊点)\s*[：:]\s*(.+)$/)
    if (q) {
      const item = q[1]!.trim().replace(/^\d+[\.、．)\s]+/, '')
      if (item) inquiry.push(item)
      continue
    }
    const rx = line.match(/^(?:药|药材|处方)\s*[：:]\s*(.+)$/)
    if (rx) {
      const row = parseConsultRxLine(rx[1]!)
      if (row) rxLines.push(row)
    }
  }

  const chart: ConsultCaseChart = {
    gender: pick(map, '性别', 'gender') || undefined,
    ageBody: pick(map, '年龄体型', '年龄及体型', 'ageBody') || undefined,
    reason: pick(map, '来诊原因', '原因', 'reason') || undefined,
    inquiry: inquiry.length ? inquiry : undefined,
    pulse: pick(map, '脉诊', 'pulse') || undefined,
    inspection: pick(map, '望诊', 'inspection') || undefined,
    tongue: pick(map, '舌诊', 'tongue') || undefined,
    diagnosis: pick(map, '诊断', 'diagnosis') || undefined,
    rxTitle: pick(map, '方题', '方注', '处方题', 'rxTitle') || undefined,
    rxLines: rxLines.length ? rxLines : undefined,
    prepNote: pick(map, '煎服', '用法说明', 'prepNote') || undefined,
    explanation: pick(map, '解说', 'explanation') || undefined,
    remark: pick(map, '备注', 'remark') || undefined,
  }

  const has =
    chart.gender ||
    chart.ageBody ||
    chart.reason ||
    (chart.inquiry && chart.inquiry.length) ||
    chart.pulse ||
    chart.inspection ||
    chart.tongue ||
    chart.diagnosis ||
    (chart.rxLines && chart.rxLines.length) ||
    chart.prepNote ||
    chart.explanation ||
    chart.remark
  return has ? chart : undefined
}

function parseConsult(block: string, index: number): ConsultSession | null {
  const map = fieldMap(block)
  const hospital = pick(map, '医院', 'hospital')
  if (!hospital) return null
  const doctorName = pick(map, '医生', 'doctor') || undefined
  const turns: ConsultTurn[] = []
  for (const lineRaw of block.split(/\r?\n/)) {
    const line = lineRaw.trim()
    if (!line || CONSULT_META_LINE.test(line) || CONSULT_CHART_LIST_LINE.test(line)) continue

    const pipe = line.match(/^(?:对话|句)[：:]\s*(.+?)\s*[|｜]\s*(.+)$/)
    if (pipe) {
      const sp = parseConsultSpeaker(pipe[1]!)
      const text = pipe[2]!.trim()
      if (sp && text && text !== doctorName) turns.push({ speaker: sp, text })
      continue
    }
    // 对白只用「患：」「医：」；「医生：」留给元数据，避免把姓名吃进对白
    const short = line.match(/^(患|患者|病人|医)\s*[：:]\s*(.+)$/)
    if (short) {
      const sp = parseConsultSpeaker(short[1]!)
      const text = short[2]!.trim()
      if (sp && text && text !== doctorName) turns.push({ speaker: sp, text })
    }
  }
  if (turns.length < 4) return null
  const chart = parseConsultChart(block, map)
  return {
    id: pick(map, 'id', 'ID') || `cs_${index + 1}`,
    hospital,
    department: pick(map, '科室', 'department') || '门诊',
    doctor: doctorName,
    consultedAtLabel: pick(map, '时间', '面诊时间', '日期') || '近期',
    topic: pick(map, '主题', '主诉', 'topic') || '门诊面诊',
    linkedVisitId: pick(map, '关联就诊', 'visitId') || undefined,
    turns,
    ...(chart ? { chart } : {}),
  }
}

export const HEALTH_MARKUP_FORMAT = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出标记块；每行「字段名：值」。
- 就诊 3~8 条 <<HL_VISIT>>；全身系统须覆盖下列 id：surface/senses/respiratory/circulatory/digestive/urogenital/musculo/neuro/mental/lifestyle，各写一条 <<HL_BODY>>。
- 体检至少 1 份 <<HL_CHECKUP>>：必须写齐基础值「年龄/身高/体重/BMI/血糖/体脂率」（可另加血压）；再写 6~14 条「指标：」；用药 0~6 条 <<HL_MED>>。
- 面诊记录 2~5 条 <<HL_CONSULT>>：须含「病案记录单」字段（来诊原因/问诊点/脉诊望诊舌诊/诊断/处方）+ 当面问诊对话；对话每条至少 6~14 句，对白行只用「患：」「医：」（不要用「医生：」，「医生：」只写接诊人姓名元数据）。也可「对话：患|内容」。
- 正文用病历口吻，有人物侧写颗粒；禁止恐吓绝症堆砌；心理章写门诊印象而非网文标签。
- 生殖相关只写有无异常与建议，克制、非猎奇。
- 可选 <<HL_PROFILE>> 血型/过敏/紧急联系人（可同步年龄身高体重 BMI）。
- 面诊病案单要像纸质门诊记录：问诊用多条「问：」要点；处方用「药：药名 剂量」可选「｜用意」批注；中西医皆可，贴合科室。
- 面诊对话要像真实门诊问诊：医生追问症状/诱因/作息，角色用符合人设的口语回答；可与某条就诊 id 关联。
- 禁止把「医生：张三」这类元数据写进对白正文。
- 体检基础值须贴合人设年龄与体型，BMI 与身高体重自洽；血糖用 mmol/L，体脂用 %。

<<HL_PROFILE>>
血型：A型
过敏：青霉素（疑似）
紧急：家里那个
年龄：28岁
身高：172 cm
体重：61.5 kg
BMI：20.8
<<END_HL_PROFILE>>

<<HL_VISIT>>
id：v1
医院：市立第一医院
科室：呼吸内科
医生：周医师
时间：上周三 14:20
主诉：干咳两周伴咽痒
检查：血常规|大致正常
检查：胸片|未见明显实变
诊断：上呼吸道感染（轻）
医嘱：多饮水，必要时复诊
复诊：症状加重随诊
<<END_HL_VISIT>>

<<HL_CONSULT>>
id：cs1
医院：市立第一医院
科室：中医内科
医生：倪医师
时间：上周三 14:20
主题：口干咽痒伴眠差
关联就诊：v1
性别：女
年龄体型：28岁，偏瘦
来诊原因：近两周口干咽痒，夜间干咳，眠浅易醒，自觉心绪紧。
问：睡眠浅，多梦，约凌晨两三点易醒
问：小便偏黄，夜尿不多
问：精神尚可，午后略乏
问：手足不温，腰腹怕凉
问：口渴欲饮温水
问：大便一日一行，略干
脉诊：弦细略数
望诊：面色偏白，神情紧
舌诊：淡红，苔薄白略腻
诊断：少阳不利，兼有阴虚内热；情志内伤，睡眠失养。
方题：和解少阳，兼顾安神
药：柴胡 10g｜疏解少阳
药：黄芩 8g｜清少阳郁热
药：白芍 12g
药：茯神 15g｜安神定志
药：酸枣仁 15g
煎服：7剂，水煎至约200ml，早晚饭后温服
解说：先调气机与睡眠，忌熬夜冷饮；若咳加重再复诊。
备注：过敏史见档案，勿加辛燥。
患：医生，我最近嗓子一直痒，晚上咳醒。
医：有没有发烧、黄痰？手脚凉不凉？
患：不烧，痰不多，手脚是有点凉，心里也闷。
医：舌苔看着略腻，脉弦细。先按少阳不利调一周。
患：好，那我注意早点睡。
医：对，温水，别熬夜；一周后来看睡眠。
患：谢谢医生。
<<END_HL_CONSULT>>

<<HL_BODY>>
系统：mental
标题：心理与精神
状态：随访中
正文：情绪基线偏紧，近期压力源与人际反复有关；睡眠片段化；建议规律作息与必要时心理科随访。无急性自伤风险表述。
<<END_HL_BODY>>

<<HL_CHECKUP>>
id：ck1
机构：康宁体检中心
套餐：青年综合套餐
日期：两个月前
年龄：28岁
身高：172 cm
体重：61.5 kg
BMI：20.8
血糖：5.2 mmol/L
体脂率：18.6%
血压：118/76 mmHg
指标：血红蛋白|142 g/L|130-175|正常
指标：谷丙转氨酶|48 U/L|9-50|偏高
指标：空腹血糖|5.2 mmol/L|3.9-6.1|正常
指标：体脂率|18.6%|男10-20 / 女18-28|正常
结论：肝酶轻度偏高，余大致正常。基础体征平稳。
建议：减少熬夜饮酒，三个月复查肝功。
<<END_HL_CHECKUP>>

<<HL_MED>>
id：m1
药名：氯雷他定
用法：必要时 1 片
备注：过敏季
<<END_HL_MED>>
`.trim()

export function parseHealthMarkup(raw: string): HealthDataset | null {
  if (!raw?.trim()) return null
  const text = raw.replace(/```/g, '')
  const visits = extractBlocks(text, '<<HL_VISIT>>', '<<END_HL_VISIT>>')
    .map((b, i) => parseVisit(b, i))
    .filter((x): x is HealthVisit => !!x)

  const bodyMap = new Map<BodySectionId, BodySection>()
  for (const b of extractBlocks(text, '<<HL_BODY>>', '<<END_HL_BODY>>')) {
    const sec = parseBody(b)
    if (sec) bodyMap.set(sec.id, sec)
  }
  // 按固定顺序输出，缺章用占位
  const bodySections: BodySection[] = BODY_SECTION_META.map((meta) => {
    const hit = bodyMap.get(meta.id)
    if (hit) return { ...hit, title: hit.title || meta.title }
    return {
      id: meta.id,
      title: meta.title,
      body: '（本次生成未覆盖该系统，建议重新生成痕迹。）',
      statusLabel: '未录入',
    }
  })

  const checkups = extractBlocks(text, '<<HL_CHECKUP>>', '<<END_HL_CHECKUP>>')
    .map((b, i) => parseCheckup(b, i))
    .filter((x): x is CheckupReport => !!x)

  const medications = extractBlocks(text, '<<HL_MED>>', '<<END_HL_MED>>')
    .map((b, i) => parseMed(b, i))
    .filter((x): x is Medication => !!x)

  const consults = extractBlocks(text, '<<HL_CONSULT>>', '<<END_HL_CONSULT>>')
    .map((b, i) => parseConsult(b, i))
    .filter((x): x is ConsultSession => !!x)

  if (visits.length < 2 && bodyMap.size < 6 && checkups.length < 1) return null

  const data = emptyHealthDataset()
  data.visits = visits
  data.bodySections = bodySections
  data.checkups = checkups
  data.medications = medications
  data.consults = consults
  data.latestVisitId = visits[0]?.id

  const profileBlock = extractBlocks(text, '<<HL_PROFILE>>', '<<END_HL_PROFILE>>')[0]
  if (profileBlock) {
    const map = fieldMap(profileBlock)
    data.profile = {
      bloodType: pick(map, '血型') || undefined,
      allergies: pick(map, '过敏') || undefined,
      emergencyContact: pick(map, '紧急', '紧急联系人') || undefined,
      age: pick(map, '年龄') || undefined,
      height: pick(map, '身高') || undefined,
      weight: pick(map, '体重') || undefined,
      bmi: pick(map, 'BMI', 'bmi', '体质指数') || undefined,
    }
  }
  // 用最新体检 vitals 回填档案基础值
  const latestCk = checkups[0]
  if (latestCk?.vitals) {
    data.profile = {
      ...data.profile,
      age: data.profile.age || latestCk.vitals.age,
      height: data.profile.height || latestCk.vitals.height,
      weight: data.profile.weight || latestCk.vitals.weight,
      bmi: data.profile.bmi || latestCk.vitals.bmi,
    }
  }

  return data
}

export function isHealthDatasetReady(data: HealthDataset | null): boolean {
  if (!data) return false
  const bodyOk = data.bodySections.filter((s) => s.statusLabel !== '未录入').length >= 6
  return (data.visits.length >= 2 || bodyOk) && (data.checkups.length >= 1 || bodyOk)
}
