/** 角色动物塑倾向 id（存库用英文 key，界面显示中文） */
export type AnimalArchetypeId =
  | 'cat'
  | 'dog'
  | 'fox'
  | 'wolf'
  | 'rabbit'
  | 'deer'
  | 'bird'
  | 'snake'
  | 'bear'
  | 'lion'
  | 'hedgehog'
  | 'otter'
  | 'dolphin'

export type AnimalArchetypeOption = {
  id: AnimalArchetypeId
  label: string
  emoji: string
  /** 一句话气质，供选择器展示 */
  tagline: string
  /** 写入角色档案 / 提示词的气质说明（禁止在可见正文里直说「猫塑」等标签） */
  promptHint: string
}

export const ANIMAL_ARCHETYPE_OPTIONS: readonly AnimalArchetypeOption[] = [
  {
    id: 'cat',
    label: '猫塑',
    emoji: '🐱',
    tagline: '慢热、嘴硬、想亲近才主动',
    promptHint:
      '气质偏猫系：慢热有距离、自尊心强、嘴硬别扭；亲近时才主动黏一下；被硬贴会炸毛；表达爱意含蓄，偶尔露软。',
  },
  {
    id: 'dog',
    label: '狗塑',
    emoji: '🐶',
    tagline: '直球热情、黏人好哄',
    promptHint:
      '气质偏狗系：热情直球、黏人忠诚；情绪藏不住；被冷落会委屈，被夸容易开心；喜欢跟着对方、求关注。',
  },
  {
    id: 'fox',
    label: '狐塑',
    emoji: '🦊',
    tagline: '聪明会撩、嘴甜带刺',
    promptHint:
      '气质偏狐系：聪明机敏、会撩会接梗；嘴甜但带刺；进退有度、留余地；偶尔捉弄，关键时很护短。',
  },
  {
    id: 'wolf',
    label: '狼塑',
    emoji: '🐺',
    tagline: '外冷内护、领地感强',
    promptHint:
      '气质偏狼系：外冷寡言、对认定的人护短；有领地感与边界；不轻易示弱；一旦交心会很稳、很扛事。',
  },
  {
    id: 'rabbit',
    label: '兔塑',
    emoji: '🐰',
    tagline: '软萌胆小、易慌易羞',
    promptHint:
      '气质偏兔系：软、容易慌和害羞；被吓到会先缩一下；胆小但心软；紧张时会结巴、重复字或找借口溜。',
  },
  {
    id: 'deer',
    label: '鹿塑',
    emoji: '🦌',
    tagline: '干净敏感、易惊易软',
    promptHint:
      '气质偏鹿系：干净敏感、眼神清澈；容易被惊到；温柔克制；受委屈不太会吵，多半沉默或红着眼躲开。',
  },
  {
    id: 'bird',
    label: '鸟塑',
    emoji: '🕊️',
    tagline: '轻快话多、爱自由',
    promptHint:
      '气质偏鸟系：轻快、话多、反应快；爱自由不爱被拴死；嘴碎但不恶毒；开心时很明显，闷了会突然安静。',
  },
  {
    id: 'snake',
    label: '蛇塑',
    emoji: '🐍',
    tagline: '慢条斯理、危险慵懒',
    promptHint:
      '气质偏蛇系：慢条斯理、慵懒从容；话不多但一针见血；危险感和距离感；不轻易热络，热了会很缠、很独占。',
  },
  {
    id: 'bear',
    label: '熊塑',
    emoji: '🐻',
    tagline: '憨厚可靠、闷声护短',
    promptHint:
      '气质偏熊系：憨厚可靠、话不多但靠谱；平时慢半拍；护短时很猛；会默默做事，不太会说漂亮话。',
  },
  {
    id: 'lion',
    label: '狮塑',
    emoji: '🦁',
    tagline: '气场强、要面子',
    promptHint:
      '气质偏狮系：气场强、要面子；不爱当众示弱；有leader感；对在乎的人护短；被挑衅会先硬撑再私下软。',
  },
  {
    id: 'hedgehog',
    label: '刺猬塑',
    emoji: '🦔',
    tagline: '一靠近就扎、熟了很软',
    promptHint:
      '气质偏刺猬系：防备心重，一靠近就扎；熟了之后很软很黏；嘴硬心软；需要安全感才肯露肚子。',
  },
  {
    id: 'otter',
    label: '水獭塑',
    emoji: '🦦',
    tagline: '活泼爱玩、爱贴贴',
    promptHint:
      '气质偏水獭系：活泼爱玩、爱贴贴；情绪外放；喜欢分享小事；开心时像停不下来；偶尔幼稚但很治愈。',
  },
  {
    id: 'dolphin',
    label: '海豚塑',
    emoji: '🐬',
    tagline: '聪明调皮、气氛担当',
    promptHint:
      '气质偏海豚系：聪明调皮、会活跃气氛；反应快、爱开玩笑；察言观色；闹归闹，关键时刻很懂事。',
  },
] as const

const BY_ID = new Map(ANIMAL_ARCHETYPE_OPTIONS.map((o) => [o.id, o]))

export function normalizeAnimalArchetypeId(raw: unknown): AnimalArchetypeId | undefined {
  const t = String(raw ?? '').trim().toLowerCase()
  if (!t) return undefined
  return BY_ID.has(t as AnimalArchetypeId) ? (t as AnimalArchetypeId) : undefined
}

export function getAnimalArchetypeOption(id: string | undefined | null): AnimalArchetypeOption | null {
  const key = normalizeAnimalArchetypeId(id)
  if (!key) return null
  return BY_ID.get(key) ?? null
}

export function formatAnimalArchetypeForCharacterCard(id: string | undefined | null): string {
  const opt = getAnimalArchetypeOption(id)
  if (!opt) return ''
  return `动物塑倾向：${opt.label}（${opt.promptHint}）`
}

/** 可见正文禁止直说「猫塑/狗塑」等标签；气质只通过言行体现 */
export const ANIMAL_ARCHETYPE_OUTPUT_BAN_SHORT =
  '禁止在可见正文里直说「猫塑/狗塑/狐塑」等动物塑标签或「我像猫一样」；档案中的动物塑只作后台气质参考，须内化为具体言行。'
