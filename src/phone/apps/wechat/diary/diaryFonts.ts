import type { DiaryFontStyleCode } from './diaryTypes'

/** 写字好看的行书字体 */
import pingFangChangAnTtf from '../../../../../写字好看的行书字体/PingFangChangAnTi/PingFangChangAnTi-2.ttf?url'
import pingFangJiangJunTtf from '../../../../../写字好看的行书字体/PingFangJiangJunTi/PingFangJiangJunTi-2.ttf?url'
import yunFengJingLongTtf from '../../../../../写字好看的行书字体/YunFengJingLongXingShu/YunFengJingLongXingShu-2.ttf?url'

/** 写字好看的楷体字体 */
import hongLeiZhuoShuTtf from '../../../../../写字好看的楷体字体/HongLeiZhuoShuJianTi/HongLeiZhuoShuJianTi-2.ttf?url'
import pingFangJiangNanTtf from '../../../../../写字好看的楷体字体/PingFangJiangNanTi/PingFangJiangNanTi-2.ttf?url'
import shouShuTiTtf from '../../../../../写字好看的楷体字体/ShouShuTi/ShouShuTi-2.ttf?url'

/** 不怎么会写字的字体 */
import fuLuGuoQiTtf from '../../../../../不怎么会写字的字体/FuLuGuoQiTi/FuLuGuoQiTi-2.ttf?url'
import fuLuLingGanHeChaTtf from '../../../../../不怎么会写字的字体/FuLuLingGanHeChaTi/FuLuLingGanHeChaTi-2.ttf?url'
import jinNianYeYaoJiaYouTtf from '../../../../../不怎么会写字的字体/JinNianYeYaoJiaYouYa/JinNianYeYaoJiaYouYa-2.ttf?url'
import pingFangQingChunTtf from '../../../../../不怎么会写字的字体/PingFangQingChunTi/PingFangQingChunTi-2.ttf?url'
import pingFangXingChenTtf from '../../../../../不怎么会写字的字体/PingFangXingChenTi/PingFangXingChenTi-2.ttf?url'
import qingSongShouXieTtf from '../../../../../不怎么会写字的字体/QingSongShouXieTi2/QingSongShouXieTi2-2.ttf?url'
import xingQiBaRiJiTtf from '../../../../../不怎么会写字的字体/XingQiBadeDianZiRiJi/XingQiBadeDianZiRiJi-2.ttf?url'

export type DiaryFontFolder = 'xingshu' | 'kaiti' | 'clumsy'

export type DiaryFontPreset = {
  id: string
  label: string
  folder: DiaryFontFolder
  family: string
  src: string
  fallback: string
}

/** 三文件夹全量字体库（仅使用项目内本地 ttf） */
export const DIARY_FONT_LIBRARY: DiaryFontPreset[] = [
  // 写字好看的行书字体
  {
    id: 'yun-feng-jing-long',
    label: '云峰静龙行书',
    folder: 'xingshu',
    family: 'DiaryYunFengJingLong',
    src: yunFengJingLongTtf,
    fallback: "'STXingkai', 'KaiTi', cursive",
  },
  {
    id: 'ping-fang-chang-an',
    label: '平方长安体',
    folder: 'xingshu',
    family: 'DiaryPingFangChangAn',
    src: pingFangChangAnTtf,
    fallback: "'STXingkai', 'KaiTi', cursive",
  },
  {
    id: 'ping-fang-jiang-jun',
    label: '平方将军体',
    folder: 'xingshu',
    family: 'DiaryPingFangJiangJun',
    src: pingFangJiangJunTtf,
    fallback: "'STXingkai', 'LiSu', cursive",
  },
  // 写字好看的楷体字体
  {
    id: 'hong-lei-zhuo-shu',
    label: '鸿雷拙书简体',
    folder: 'kaiti',
    family: 'DiaryHongLeiZhuoShu',
    src: hongLeiZhuoShuTtf,
    fallback: "'STKaiti', 'KaiTi', serif",
  },
  {
    id: 'ping-fang-jiang-nan',
    label: '平方江南体',
    folder: 'kaiti',
    family: 'DiaryPingFangJiangNan',
    src: pingFangJiangNanTtf,
    fallback: "'STKaiti', 'KaiTi', serif",
  },
  {
    id: 'shou-shu',
    label: '手书体',
    folder: 'kaiti',
    family: 'DiaryShouShu',
    src: shouShuTiTtf,
    fallback: "'STKaiti', 'KaiTi', serif",
  },
  // 不怎么会写字的字体
  {
    id: 'qing-song-shou-xie',
    label: '青松手写体',
    folder: 'clumsy',
    family: 'DiaryQingSongShouXie',
    src: qingSongShouXieTtf,
    fallback: "'STKaiti', 'PingFang SC', cursive",
  },
  {
    id: 'xing-qi-ba-ri-ji',
    label: '星期八的电子日记',
    folder: 'clumsy',
    family: 'DiaryXingQiBaRiJi',
    src: xingQiBaRiJiTtf,
    fallback: "'STKaiti', cursive",
  },
  {
    id: 'ping-fang-xing-chen',
    label: '平方星辰体',
    folder: 'clumsy',
    family: 'DiaryPingFangXingChen',
    src: pingFangXingChenTtf,
    fallback: "'STKaiti', 'PingFang SC', cursive",
  },
  {
    id: 'ping-fang-qing-chun',
    label: '平方青春体',
    folder: 'clumsy',
    family: 'DiaryPingFangQingChun',
    src: pingFangQingChunTtf,
    fallback: "'STKaiti', cursive",
  },
  {
    id: 'fu-lu-ling-gan-he-cha',
    label: '福禄灵感喝茶体',
    folder: 'clumsy',
    family: 'DiaryFuLuLingGanHeCha',
    src: fuLuLingGanHeChaTtf,
    fallback: "'FangSong', cursive",
  },
  {
    id: 'jin-nian-ye-yao-jia-you',
    label: '今年也要加油呀',
    folder: 'clumsy',
    family: 'DiaryJinNianYeYaoJiaYou',
    src: jinNianYeYaoJiaYouTtf,
    fallback: "'STKaiti', cursive",
  },
  {
    id: 'fu-lu-guo-qi',
    label: '福禄国气体',
    folder: 'clumsy',
    family: 'DiaryFuLuGuoQi',
    src: fuLuGuoQiTtf,
    fallback: "'FangSong', cursive",
  },
]

/** AI font_style → 从哪个文件夹里选字 */
const STYLE_POOL_IDS: Record<DiaryFontStyleCode, string[]> = {
  sharp: ['yun-feng-jing-long', 'ping-fang-chang-an'],
  wild: ['ping-fang-jiang-jun', 'yun-feng-jing-long'],
  neat: ['hong-lei-zhuo-shu', 'ping-fang-jiang-nan', 'shou-shu'],
  lazy: ['fu-lu-ling-gan-he-cha', 'fu-lu-guo-qi', 'jin-nian-ye-yao-jia-you', 'xing-qi-ba-ri-ji'],
  elegant: ['ping-fang-xing-chen', 'ping-fang-qing-chun', 'qing-song-shou-xie'],
}

const presetById = new Map(DIARY_FONT_LIBRARY.map((p) => [p.id, p]))
const presetByFamily = new Map(DIARY_FONT_LIBRARY.map((p) => [p.family, p]))

/** 兼容旧版 5 代号展示 */
export const DIARY_FONT_PRESETS = (
  ['sharp', 'neat', 'lazy', 'elegant', 'wild'] as DiaryFontStyleCode[]
).map((code) => {
  const firstId = STYLE_POOL_IDS[code][0]!
  const font = presetById.get(firstId)!
  return { code, label: font.label, family: font.family, src: font.src, fallback: font.fallback }
})

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const ALL_FONT_STYLES: DiaryFontStyleCode[] = ['sharp', 'neat', 'lazy', 'elegant', 'wild']

/** 文化水平正常：行书 + 楷体 */
export const LITERATE_DIARY_FONT_STYLES: DiaryFontStyleCode[] = ['sharp', 'neat', 'wild']

/** 文盲 / 不常写字 */
export const ILLITERATE_DIARY_FONT_STYLES: DiaryFontStyleCode[] = ['lazy', 'elegant']

/** 无 AI 笔迹代号时的兜底绑定（重置字体后也会走这里） */
export function pickDiaryFontForRebind(
  charId: string,
  salt: string,
  avoidFamily?: string | null,
): string {
  const start = hashSeed(`${charId}:${salt}`) % ALL_FONT_STYLES.length
  for (let i = 0; i < ALL_FONT_STYLES.length; i += 1) {
    const style = ALL_FONT_STYLES[(start + i) % ALL_FONT_STYLES.length]!
    const family = resolveDiaryFontFamily(style, `${charId}:rebind:${salt}`)
    if (!avoidFamily || family !== avoidFamily) return family
  }
  return resolveDiaryFontFamily(ALL_FONT_STYLES[start]!, charId)
}

/** 首次绑定时：按 AI 风格代号 + 角色 id 从对应文件夹池中确定性选一款字体 */
export function resolveDiaryFontFamily(
  code: DiaryFontStyleCode | string | null | undefined,
  charId?: string | null,
): string {
  const style = String(code ?? '').trim().toLowerCase() as DiaryFontStyleCode
  const poolIds = STYLE_POOL_IDS[style]
  if (poolIds?.length) {
    const idx = hashSeed(`${charId ?? ''}:${style}`) % poolIds.length
    const picked = presetById.get(poolIds[idx]!)
    if (picked) return picked.family
  }
  if (code && presetByFamily.has(code)) return code
  return presetById.get(STYLE_POOL_IDS.neat[0]!)!.family
}

/**
 * 非中文日记的字形回退（接在中文笔迹主字体之后）。
 * 浏览器按字符选字：汉字尽量用主笔迹；假名/谚文等主字体没有的字，落到对应语言字体。
 */
const DIARY_LANG_SCRIPT_FALLBACKS: Record<string, string> = {
  // 主笔迹缺字后的系统日文回退（不要放在中文笔迹前面，否则会抢走汉字）
  ja: "'YuKyokasho', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS PGothic'",
  ko: "'Nanum Pen Script', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Nanum Gothic'",
  en: "'Segoe Print', 'Comic Sans MS', 'Chalkboard SE', cursive",
  fr: "'Segoe Print', 'Comic Sans MS', cursive",
  de: "'Segoe Print', 'Comic Sans MS', cursive",
  es: "'Segoe Print', 'Comic Sans MS', cursive",
  ru: "'Segoe Print', 'Comic Sans MS', cursive",
}

/** 语言码 → 脚本回退栈（仅用于主笔迹缺字时） */
export function diaryLanguageScriptFallback(language?: string | null): string {
  const code = String(language ?? '')
    .trim()
    .toLowerCase()
  if (!code || code === 'zh-cn' || code === 'zh-tw' || code.startsWith('zh')) return ''
  const short = code.split('-')[0] || code
  return DIARY_LANG_SCRIPT_FALLBACKS[short] || DIARY_LANG_SCRIPT_FALLBACKS[code] || ''
}

export function diaryFontStack(family: string | null | undefined, language?: string | null): string {
  const preset = family ? presetByFamily.get(family) : null
  const base = preset
    ? `'${preset.family}', ${preset.fallback}`
    : (() => {
        const fallback = presetById.get(STYLE_POOL_IDS.neat[0]!)!
        return `'${fallback.family}', ${fallback.fallback}`
      })()
  const script = diaryLanguageScriptFallback(language)
  if (!script) return base
  const primary = base.split(',')[0]?.trim() || base
  const rest = base.includes(',') ? base.slice(base.indexOf(',') + 1).trim() : ''
  const short = String(language ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0]
  /**
   * 日语：仅假名范围的 DiaryJaKana 放最前（unicode-range 不会抢汉字）；
   * 中文笔迹其次；系统日文字体再次（补子集缺字）。
   */
  if (short === 'ja') {
    const mid = rest ? `${primary}, ${script}, ${rest}` : `${primary}, ${script}`
    return `'DiaryJaKana', ${mid}`
  }
  return rest ? `${primary}, ${script}, ${rest}` : `${primary}, ${script}`
}

export function diaryFontLabel(family: string | null | undefined): string | null {
  return family ? (presetByFamily.get(family)?.label ?? null) : null
}

let injectPromise: Promise<void> | null = null
const loadedFamilies = new Set<string>()

/**
 * 日语假名专用补字（unicode-range 仅覆盖假名，不会抢走汉字笔迹）。
 * 本地子集来自 Klee One（手写感），约 28KB；缺字时再落到系统日文字体。
 */
const DIARY_JA_KANA_SRC = `${import.meta.env.BASE_URL}diary-fonts/klee-one-kana.woff2`
const DIARY_JA_KANA_FACE_CSS = `
@font-face{
  font-family:'DiaryJaKana';
  font-style:normal;
  font-weight:400;
  font-display:swap;
  src:url('${DIARY_JA_KANA_SRC}') format('woff2');
  unicode-range:U+3040-309F,U+30A0-30FF,U+31F0-31FF,U+FF66-FF9D,U+3005,U+30FC,U+3099-309C;
}`.replace(/\s+/g, ' ').trim()

function injectFontFaces(): void {
  if (typeof document === 'undefined') return
  const styleId = 'diary-handwriting-fonts'
  if (document.getElementById(styleId)) return
  const css =
    DIARY_FONT_LIBRARY.map(
      (p) => `@font-face{font-family:'${p.family}';src:url('${p.src}') format('truetype');font-display:swap;}`,
    ).join('') + DIARY_JA_KANA_FACE_CSS
  const el = document.createElement('style')
  el.id = styleId
  el.textContent = css
  document.head.appendChild(el)
}

async function loadFontFamily(family: string): Promise<void> {
  if (loadedFamilies.has(family)) return
  const preset = presetByFamily.get(family)
  if (!preset || typeof document === 'undefined' || !('fonts' in document)) {
    loadedFamilies.add(family)
    return
  }
  try {
    const face = new FontFace(preset.family, `url(${preset.src})`)
    const loaded = await face.load()
    document.fonts.add(loaded)
    loadedFamilies.add(family)
  } catch {
    loadedFamilies.add(family)
  }
}

export async function ensureDiaryFontsLoaded(families: Array<string | null | undefined>): Promise<void> {
  if (!injectPromise) {
    injectPromise = Promise.resolve().then(() => injectFontFaces())
  }
  await injectPromise
  const unique = [...new Set(families.map((f) => f?.trim()).filter(Boolean) as string[])]
  await Promise.all(unique.map((f) => loadFontFamily(f)))
}

/** 预加载三文件夹内全部 13 款字体 */
export async function preloadAllDiaryFonts(): Promise<void> {
  await ensureDiaryFontsLoaded(DIARY_FONT_LIBRARY.map((p) => p.family))
}
