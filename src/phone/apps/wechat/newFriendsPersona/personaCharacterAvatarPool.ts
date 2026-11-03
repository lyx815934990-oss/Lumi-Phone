import type { Gender } from './types'

/**
 * 人设 AI / 多人卡生成用头像：从下列人物图库抽（与 image/ 目录对齐）。
 * ✅ 长辈男/女 · 抽象搞笑 · 男E阳光 · 男I清冷 · 女可爱活泼 · 女清冷御姐
 * ❌ 随机网友头像（以及壁纸/聊天背景类目录）
 * 落库用可移植 `/image/…` 路径，勿 eager 成 /assets 哈希。
 */

function listImageDirAvatarPaths(folder: string, globKeys: string[]): string[] {
  const prefix = `/image/${folder}/`
  const paths = globKeys
    .map((key) => {
      const file = key.replace(/\\/g, '/').split('/').pop()?.split('?')[0]?.trim()
      if (!file) return ''
      return `${prefix}${file}`
    })
    .filter(Boolean)
  paths.sort()
  return paths
}

const ELDER_MALE = listImageDirAvatarPaths(
  '40岁以上长辈头像男',
  Object.keys(import.meta.glob('../../../../../image/40岁以上长辈头像男/*.{png,jpg,jpeg,webp,gif}')),
)
const ELDER_FEMALE = listImageDirAvatarPaths(
  '40岁以上长辈头像女',
  Object.keys(import.meta.glob('../../../../../image/40岁以上长辈头像女/*.{png,jpg,jpeg,webp,gif}')),
)
const ABSTRACT = listImageDirAvatarPaths(
  '抽象搞笑男女通用',
  Object.keys(import.meta.glob('../../../../../image/抽象搞笑男女通用/*.{png,jpg,jpeg,webp,gif}')),
)
const MALE_SUNNY = listImageDirAvatarPaths(
  '微信头像男E型阳光',
  Object.keys(import.meta.glob('../../../../../image/微信头像男E型阳光/*.{png,jpg,jpeg,webp,gif}')),
)
const MALE_COOL = listImageDirAvatarPaths(
  '微信头像男I型清冷',
  Object.keys(import.meta.glob('../../../../../image/微信头像男I型清冷/*.{png,jpg,jpeg,webp,gif}')),
)
const FEMALE_CUTE = listImageDirAvatarPaths(
  '微信头像女可爱活泼',
  Object.keys(import.meta.glob('../../../../../image/微信头像女可爱活泼/*.{png,jpg,jpeg,webp,gif}')),
)
const FEMALE_COOL = listImageDirAvatarPaths(
  '微信头像女清冷和御姐',
  Object.keys(import.meta.glob('../../../../../image/微信头像女清冷和御姐/*.{png,jpg,jpeg,webp,gif}')),
)

const MALE_YOUNG = [...MALE_SUNNY, ...MALE_COOL]
const FEMALE_YOUNG = [...FEMALE_COOL, ...FEMALE_CUTE]
const ALL_PERSONA = [
  ...ELDER_MALE,
  ...ELDER_FEMALE,
  ...ABSTRACT,
  ...MALE_YOUNG,
  ...FEMALE_YOUNG,
]

function pickOne(list: string[]): string {
  if (!list.length) return ''
  return list[Math.floor(Math.random() * list.length)] || ''
}

function avatarBasename(url: string): string {
  const noq = (url.split('?')[0] ?? url).replace(/\\/g, '/')
  return (noq.split('/').pop() ?? '').trim().toLowerCase()
}

/** 把完整路径 + 文件名都记入占用集，避免同图不同前缀重复 */
export function rememberPersonaAvatarUsed(used: Set<string>, url: string): void {
  const t = url.trim()
  if (!t) return
  used.add(t)
  const bn = avatarBasename(t)
  if (bn) used.add(bn)
}

export function isPersonaAvatarUsed(used: Set<string> | undefined, url: string): boolean {
  if (!used?.size) return false
  const t = url.trim()
  if (!t) return true
  if (used.has(t)) return true
  const bn = avatarBasename(t)
  return Boolean(bn && used.has(bn))
}

function poolFor(gender?: Gender | null, age?: number | null): string[] {
  const elder = typeof age === 'number' && Number.isFinite(age) && age >= 40
  if (gender === 'male') {
    if (elder) return [...ELDER_MALE, ...ABSTRACT, ...MALE_YOUNG]
    return [...MALE_YOUNG, ...ABSTRACT, ...ELDER_MALE]
  }
  if (gender === 'female') {
    if (elder) return [...ELDER_FEMALE, ...ABSTRACT, ...FEMALE_YOUNG]
    return [...FEMALE_YOUNG, ...ABSTRACT, ...ELDER_FEMALE]
  }
  return ALL_PERSONA
}

/**
 * 按性别（及可选年龄）从人物头像池随机一张。
 * 传入 `used` 时：优先未占用 → 全库未占用 → 仅当全池已用完才允许重复。
 */
export function pickRandomPersonaCharacterAvatar(
  gender?: Gender | null,
  used?: Set<string>,
  age?: number | null,
): string {
  const primary = poolFor(gender, age).filter(Boolean)
  const unusedPrimary = used?.size ? primary.filter((u) => !isPersonaAvatarUsed(used, u)) : primary
  let url = pickOne(unusedPrimary)
  if (!url && used?.size) {
    url = pickOne(ALL_PERSONA.filter((u) => !isPersonaAvatarUsed(used, u)))
  }
  if (!url) url = pickOne(primary.length ? primary : ALL_PERSONA)
  if (url && used) rememberPersonaAvatarUsed(used, url)
  return url
}
