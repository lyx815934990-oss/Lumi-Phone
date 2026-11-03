import type { Gender } from './types'

/** 人设姓名骰子语言（单选；掷骰只从该语言姓名池抽取） */
export type PersonaNameLanguage = 'zh' | 'ja' | 'en' | 'ko' | 'fr' | 'ru'

export const PERSONA_NAME_LANGUAGE_OPTIONS: ReadonlyArray<{
  id: PersonaNameLanguage
  label: string
  en: string
}> = [
  { id: 'zh', label: '中文', en: 'ZH' },
  { id: 'ja', label: '日语', en: 'JA' },
  { id: 'en', label: '英语', en: 'EN' },
  { id: 'ko', label: '韩语', en: 'KO' },
  { id: 'fr', label: '法语', en: 'FR' },
  { id: 'ru', label: '俄语', en: 'RU' },
]

export const DEFAULT_PERSONA_NAME_LANGUAGE: PersonaNameLanguage = 'zh'

const LS_KEY = 'lumi-persona-name-language-v1'
const LS_KEY_LEGACY = 'lumi-persona-name-languages-v1'

function isPersonaNameLanguage(x: unknown): x is PersonaNameLanguage {
  return typeof x === 'string' && PERSONA_NAME_LANGUAGE_OPTIONS.some((o) => o.id === x)
}

export function loadPersonaNameLanguage(): PersonaNameLanguage {
  if (typeof window === 'undefined') return DEFAULT_PERSONA_NAME_LANGUAGE
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (raw && isPersonaNameLanguage(raw)) return raw
    // 兼容旧版多选存储：取第一项
    const legacy = window.localStorage.getItem(LS_KEY_LEGACY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown
      if (Array.isArray(parsed)) {
        const first = parsed.find(isPersonaNameLanguage)
        if (first) return first
      }
    }
    return DEFAULT_PERSONA_NAME_LANGUAGE
  } catch {
    return DEFAULT_PERSONA_NAME_LANGUAGE
  }
}

export function savePersonaNameLanguage(lang: PersonaNameLanguage) {
  if (typeof window === 'undefined') return
  const next = isPersonaNameLanguage(lang) ? lang : DEFAULT_PERSONA_NAME_LANGUAGE
  try {
    window.localStorage.setItem(LS_KEY, next)
  } catch {
    /* ignore */
  }
}

function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]!
}

function pickGiven(pool: readonly string[], preferSingle = 0.55): string {
  if (Math.random() < preferSingle || pool.length < 2) return pick(pool)
  const a = pick(pool)
  let b = pick(pool)
  let guard = 0
  while (b === a && guard < 6) {
    b = pick(pool)
    guard += 1
  }
  return a === b ? a : `${a}${b}`
}

// ——— 中文：小说向、克制好听 ———
const ZH_MALE_SUR = [
  '顾', '沈', '陆', '季', '谢', '周', '贺', '裴', '宋', '许', '林', '程', '闻', '秦', '萧', '傅', '喻', '楚', '靳', '晏',
  '叶', '莫', '祁', '孟', '荀', '褚', '穆', '商', '虞', '薛', '卓', '易', '池', '纪', '乔', '骆', '戚', '任', '邵', '段',
  '严', '韩', '唐', '尹', '岑', '梁', '魏', '路', '俞', '方', '江', '苏', '卫', '时', '厉', '司', '温', '言', '霍', '慕',
  '盛', '阮', '凌', '白', '夜', '渡', '栖', '川', '北', '南',
  '闵', '耿', '简', '聂', '童', '邢', '蓝', '冷', '封', '柯', '容', '湛', '怀', '靳', '迟', '栾', '裘', '宓', '苻', '酆',
] as const

const ZH_FEMALE_SUR = [
  '苏', '林', '温', '江', '许', '沈', '季', '顾', '白', '姜', '陆', '夏', '黎', '阮', '虞', '奚', '钟', '柳', '乔', '谢',
  '明', '楼', '慕', '池', '冉', '宣', '尹', '岑', '甄', '嵇', '卞', '卫', '段', '方', '易', '程', '贺', '裴', '宋', '秦',
  '萧', '傅', '喻', '楚', '靳', '叶', '莫', '祁', '晚', '洛', '知', '唐', '云', '孟', '安', '姚', '颜', '宁', '芮', '清',
  '听', '眠', '浅', '微',
  '蓝', '闵', '童', '简', '柯', '容', '怀', '迟', '宓', '荀', '褚', '栾', '耿', '邢', '封', '聂', '冷', '裘', '湛', '郦',
] as const

const ZH_MALE_GIVEN_SINGLE = [
  '砚', '舟', '言', '峥', '临', '予', '景', '行', '川', '烬', '屿', '珩', '晏', '知', '辞', '澈', '珣', '朔', '叙', '湛',
  '珂', '墨', '洵', '衍', '樾', '谌', '骁', '恪', '昀', '翊', '朗', '逾', '聿', '琅', '晗', '璋', '璞', '泊', '戟', '旌',
  '渊', '琛', '泽', '瑾', '宸', '越', '淮', '卿', '凛', '修', '屹', '霖', '垣', '策', '陌', '衡', '铭', '澄', '安', '白',
  '徽', '远', '杳', '序', '敛', '霁', '听', '澜', '乔', '栖', '既', '望', '舒', '南', '星', '野', '弋', '疏', '禾', '简',
] as const

const ZH_MALE_GIVEN_COMPOUND = [
  '予川', '景行', '清和', '既明', '听澜', '望舒', '南乔', '晚舟', '知白', '予安', '星野', '清晏', '既白', '临川', '叙年',
  '听风', '清川', '既望', '南星', '晚白', '怀瑾', '若白', '清扬', '叙白', '栖野', '既安', '听雨', '望川', '予澄', '知夏',
] as const

const ZH_FEMALE_GIVEN_SINGLE = [
  '杳', '宁', '昭', '澄', '予', '绾', '晚', '棠', '柚', '岚', '微', '怜', '禾', '清', '瓷', '漪', '玥', '栀', '遥', '熹',
  '蘅', '翎', '莞', '霁', '纾', '妧', '旖', '浔', '旎', '泠', '纭', '霓', '纨', '缇', '岫', '柠', '溪', '舒', '糯', '柒',
  '笙', '鸢', '洛', '穗', '知', '苒', '卿', '念', '薇', '沁', '沅', '芙', '芜', '荞', '吟', '姝', '瑶', '霂', '昕', '初',
  '栖', '柔', '筠', '汀', '若', '辞', '眠', '浅', '听', '雪', '南', '枝', '然', '既', '桃', '杏', '桑', '竹', '萱', '芝',
] as const

const ZH_FEMALE_GIVEN_COMPOUND = [
  '晚晴', '听雪', '清欢', '予安', '望舒', '浅夏', '眠月', '知微', '安然', '南枝', '栖迟', '既白', '清和', '听澜', '宁远',
  '清栀', '晚荷', '听雨', '南溪', '柔安', '若雪', '予澄', '望川', '浅秋', '眠花', '知夏', '安禾', '南棠', '栖月', '听风',
] as const

function randomZh(gender: Gender): string {
  const sur = gender === 'female' ? ZH_FEMALE_SUR : gender === 'male' ? ZH_MALE_SUR : [...ZH_MALE_SUR, ...ZH_FEMALE_SUR]
  const singles =
    gender === 'female'
      ? ZH_FEMALE_GIVEN_SINGLE
      : gender === 'male'
        ? ZH_MALE_GIVEN_SINGLE
        : [...ZH_MALE_GIVEN_SINGLE, ...ZH_FEMALE_GIVEN_SINGLE]
  const compounds =
    gender === 'female'
      ? ZH_FEMALE_GIVEN_COMPOUND
      : gender === 'male'
        ? ZH_MALE_GIVEN_COMPOUND
        : [...ZH_MALE_GIVEN_COMPOUND, ...ZH_FEMALE_GIVEN_COMPOUND]
  const first = pick(sur)
  if (compounds.length && Math.random() < 0.35) return `${first}${pick(compounds)}`
  return `${first}${pickGiven(singles, 0.58)}`
}

// ——— 日语：汉字姓名，文雅轻小说感 ———
const JA_MALE_SUR = [
  '橘', '青葉', '雪見', '白石', '逢坂', '神崎', '月島', '桜庭', '水無月', '星野', '霧島', '遠野', '黒澤', '綾瀬', '七瀬',
  '御影', '氷室', '鳴海', '鳳', '涼風', '花村', '朝霧', '夜凪', '海崎', '天野', '如月', '桐生', '瀬名', '叶', '藍沢',
  '紫藤', '白銀', '月見', '蒼井', '雨音', '風間', '雪乃', '光崎', '朝比奈', '夜空', '海原', '天城', '桐原', '瀬川', '叶野',
  '藍井', '桜木', '水島', '星川', '霧雨',
] as const

const JA_FEMALE_SUR = [
  '雪村', '白咲', '月詠', '桜井', '水瀬', '星見', '霧島', '遠坂', '黒羽', '綾小路', '七海', '御子柴', '氷川', '鳴沢',
  '鳳凰寺', '涼宮', '花咲', '朝倉', '夜月', '海野', '天音', '如月', '桐谷', '瀬戸', '叶月', '藍原', '橘', '白石', '逢坂',
  '紫苑', '白百合', '月見里', '蒼乃', '雨宮', '風花', '雪乃', '光月', '朝日', '夜桜', '海咲', '天羽', '桐島', '瀬名', '叶咲',
  '藍咲', '桜坂', '水希', '星咲', '霧乃',
] as const

const JA_MALE_GIVEN = [
  '悠真', '陽翔', '蒼', '蓮', '朔', '律', '澪', '奏', '暁', '碧', '迅', '凛', '晴人', '大和', '伊織', '海斗', '琉生',
  '詩音', '月彦', '夜凪', '零', '昴', '彗', '樹', '遥', '颯', '恒', '静', '淳', '嶺',
  '悠人', '陽向', '蒼真', '蓮也', '朔也', '律人', '澪太', '奏太', '暁斗', '碧人', '迅也', '凛太郎', '晴翔', '大和也', '伊吹',
  '海翔', '琉希', '詩也', '月人', '夜斗',
] as const

const JA_FEMALE_GIVEN = [
  '美咲', '結衣', '葵', '凛', '澪', '詩', '月', '雪', '花', '遥', '凪', '咲良', '陽菜', '心春', '紬', '紡', '灯',
  '彩葉', '瑞希', '玲奈', '千早', '琴音', '白', '澄', '柔', '杏', '柚', '茜', '碧', '望',
  '美月', '結菜', '葵衣', '凛花', '澪奈', '詩織', '月奈', '雪乃', '花音', '遥香', '凪咲', '咲希', '陽月', '心結', '紬希',
  '紡音', '灯里', '彩乃', '瑞穂', '玲花',
] as const

function randomJa(gender: Gender): string {
  const sur = gender === 'female' ? JA_FEMALE_SUR : gender === 'male' ? JA_MALE_SUR : [...JA_MALE_SUR, ...JA_FEMALE_SUR]
  const given = gender === 'female' ? JA_FEMALE_GIVEN : gender === 'male' ? JA_MALE_GIVEN : [...JA_MALE_GIVEN, ...JA_FEMALE_GIVEN]
  return `${pick(sur)}${pick(given)}`
}

// ——— 英语：好听、略文学/轻贵族感 ———
const EN_MALE_FIRST = [
  'Adrian', 'Elliot', 'Julian', 'Silas', 'Theo', 'Lucian', 'Cassian', 'Felix', 'Orion', 'Rowan', 'Asher', 'Caleb',
  'Damien', 'Evan', 'Finn', 'Gabriel', 'Hugo', 'Isaac', 'Jasper', 'Kai', 'Leo', 'Miles', 'Noah', 'Owen', 'Quinn',
  'Rhys', 'Sebastian', 'Tristan', 'Vincent', 'Xavier', 'Ethan', 'Nathan', 'Oliver', 'Arthur', 'Liam',
  'Atlas', 'Bennett', 'Cyrus', 'Dorian', 'Emmett', 'Forrest', 'Gray', 'Holden', 'Ira', 'Jude', 'Knox', 'Levi',
  'Marcus', 'Nolan', 'Oscar', 'Pierce', 'Reid', 'Soren', 'Tobias', 'Wesley',
] as const

const EN_FEMALE_FIRST = [
  'Elena', 'Aurora', 'Celeste', 'Lila', 'Iris', 'Vivienne', 'Seraphine', 'Ophelia', 'Isabella', 'Amelia', 'Chloe',
  'Diana', 'Evelyn', 'Freya', 'Grace', 'Hazel', 'Ivy', 'Juliette', 'Luna', 'Maya', 'Nora', 'Olivia', 'Penelope',
  'Quinn', 'Rose', 'Stella', 'Thea', 'Uma', 'Vera', 'Willow', 'Aria', 'Elise', 'Sophie', 'Clara', 'Mila',
  'Adeline', 'Bianca', 'Cora', 'Dahlia', 'Elowen', 'Faye', 'Gemma', 'Helena', 'Isla', 'Juniper', 'Keira', 'Lyra',
  'Maeve', 'Noelle', 'Odette', 'Phoebe', 'Remi', 'Sienna', 'Talia', 'Wren',
] as const

const EN_SUR = [
  'Ashford', 'Vale', 'Crowne', 'Hart', 'Blackwood', 'Whitmore', 'Sterling', 'Everett', 'Monroe', 'Hayes', 'Brooks',
  'Callahan', 'Darcy', 'Ellington', 'Fairchild', 'Greystone', 'Holloway', 'Kensington', 'Lovelace', 'Montclair',
  'North', 'Prescott', 'Quill', 'Ravenswood', 'Sinclair', 'Thorne', 'Underwood', 'Vaughn', 'West', 'York',
  'Beaumont', 'Caldwell', 'Delaney', 'Ellsworth', 'Fitzgerald', 'Hawthorne', 'Ingram', 'Langley', 'Meridian', 'Norwood',
  'Osborne', 'Pembroke', 'Radcliffe', 'Sullivan', 'Tennyson', 'Upton', 'Winthrop', 'Ashbury', 'Bellamy', 'Carrington',
] as const

function randomEn(gender: Gender): string {
  const first =
    gender === 'female' ? pick(EN_FEMALE_FIRST) : gender === 'male' ? pick(EN_MALE_FIRST) : pick([...EN_MALE_FIRST, ...EN_FEMALE_FIRST])
  return `${first} ${pick(EN_SUR)}`
}

// ——— 韩语：好听常用名 ———
const KO_MALE_SUR = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '유', '홍',
  '고', '문', '양', '손', '배', '백', '허', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '진', '민', '류',
] as const
const KO_FEMALE_SUR = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '유', '홍',
  '고', '문', '양', '손', '배', '백', '허', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '진', '민', '류',
] as const

const KO_MALE_GIVEN = [
  '서준', '도윤', '하준', '은우', '시우', '지호', '준서', '건우', '우진', '선우', '연우', '현우', '민준', '지후', '준우',
  '시현', '태윤', '주원', '이안', '로운', '재윤', '승민', '지환', '유준', '태양',
  '하람', '도현', '은호', '시온', '지안', '준혁', '건희', '우빈', '선재', '연준', '현서', '민재', '지성', '준영', '시원',
  '태오', '주호', '이준', '로원', '재민',
] as const

const KO_FEMALE_GIVEN = [
  '서연', '서윤', '지우', '하은', '지아', '수아', '예은', '소율', '하윤', '채원', '지민', '윤서', '다은', '예린', '수빈',
  '예나', '시아', '유나', '아린', '소은', '나은', '지원', '은채', '도아', '라온',
  '서아', '하린', '지유', '수연', '예서', '소희', '하율', '채은', '지혜', '윤아', '다현', '예지', '수민', '예솔', '시연',
  '유림', '아윤', '소연', '나윤', '지율',
] as const

function randomKo(gender: Gender): string {
  const sur = gender === 'female' ? KO_FEMALE_SUR : gender === 'male' ? KO_MALE_SUR : [...KO_MALE_SUR, ...KO_FEMALE_SUR]
  const given = gender === 'female' ? KO_FEMALE_GIVEN : gender === 'male' ? KO_MALE_GIVEN : [...KO_MALE_GIVEN, ...KO_FEMALE_GIVEN]
  return `${pick(sur)}${pick(given)}`
}

// ——— 法语 ———
const FR_MALE_FIRST = [
  'Étienne', 'Lucien', 'Raphaël', 'Théo', 'Antoine', 'Gabriel', 'Hugo', 'Louis', 'Maxime', 'Nathan', 'Olivier',
  'Paul', 'Quentin', 'Romain', 'Sébastien', 'Thomas', 'Victor', 'Yves', 'Adrien', 'Baptiste', 'Clément', 'Damien',
  'Alexis', 'Benjamin', 'Cédric', 'Diego', 'Émile', 'Fabien', 'Guillaume', 'Henri', 'Ismaël', 'Jules', 'Kevin', 'Léo',
  'Mathis', 'Nicolas', 'Oscar', 'Pierre', 'Rémi', 'Simon', 'Tristan', 'Valentin',
] as const

const FR_FEMALE_FIRST = [
  'Élise', 'Camille', 'Claire', 'Léa', 'Juliette', 'Manon', 'Chloé', 'Inès', 'Sophie', 'Alice', 'Amélie', 'Aurélie',
  'Céleste', 'Diane', 'Élodie', 'Florence', 'Iris', 'Jade', 'Louise', 'Margot', 'Noémie', 'Rose', 'Victoire', 'Zoé',
  'Anaïs', 'Blanche', 'Capucine', 'Delphine', 'Éva', 'Faustine', 'Gisèle', 'Héloïse', 'Isaure', 'Jeanne', 'Lila', 'Maëlys',
  'Nina', 'Ophélie', 'Pénélope', 'Romane', 'Solène', 'Thaïs', 'Valentine', 'Yasmine',
] as const

const FR_SUR = [
  'Moreau', 'Laurent', 'Dupont', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Lefebvre',
  'Morel', 'Fournier', 'Girard', 'Bonnet', 'Lambert', 'Fontaine', 'Rousseau', 'Blanc', 'Guerin', 'Chevalier', 'Marchand',
  'Beaumont', 'Clément', 'Delacroix', 'Faure', 'Garnier', 'Henry', 'Joly', 'Lemoine', 'Mercier', 'Noël', 'Perrin', 'Renaud',
  'Simon', 'Thomas', 'Vidal', 'Armand', 'Bertrand', 'Cartier',
] as const

function randomFr(gender: Gender): string {
  const first =
    gender === 'female' ? pick(FR_FEMALE_FIRST) : gender === 'male' ? pick(FR_MALE_FIRST) : pick([...FR_MALE_FIRST, ...FR_FEMALE_FIRST])
  return `${first} ${pick(FR_SUR)}`
}

// ——— 俄语 ———
const RU_MALE_FIRST = [
  'Александр', 'Дмитрий', 'Максим', 'Иван', 'Артём', 'Никита', 'Михаил', 'Даниил', 'Егор', 'Андрей', 'Кирилл',
  'Роман', 'Владимир', 'Тимур', 'Лев', 'Марк', 'Фёдор', 'Павел', 'Илья', 'Степан',
  'Алексей', 'Борис', 'Василий', 'Глеб', 'Денис', 'Евгений', 'Захар', 'Игорь', 'Константин', 'Леонид', 'Матвей', 'Николай',
  'Олег', 'Пётр', 'Руслан', 'Сергей', 'Тимофей', 'Филипп', 'Юрий', 'Ярослав',
] as const

const RU_FEMALE_FIRST = [
  'Анна', 'Мария', 'София', 'Алиса', 'Виктория', 'Полина', 'Елизавета', 'Дарья', 'Варвара', 'Милана', 'Ксения',
  'Вера', 'Ольга', 'Елена', 'Наталья', 'Ирина', 'Татьяна', 'Юлия', 'Арина', 'Диана',
  'Александра', 'Василиса', 'Галина', 'Ева', 'Жанна', 'Злата', 'Инна', 'Карина', 'Лариса', 'Маргарита', 'Ника', 'Оксана',
  'Раиса', 'Светлана', 'Таисия', 'Ульяна', 'Фаина', 'Элина', 'Яна', 'Любовь',
] as const

const RU_MALE_SUR = [
  'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Фёдоров',
  'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев',
  'Орлов', 'Андреев', 'Макаров', 'Никитин', 'Захаров', 'Зайцев', 'Соловьёв', 'Борисов', 'Яковлев', 'Григорьев',
  'Романов', 'Воробьёв', 'Сергеев', 'Киселёв', 'Максимов', 'Поляков', 'Владимиров', 'Королёв', 'Белов', 'Медведев',
] as const

const RU_FEMALE_SUR = [
  'Иванова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Петрова', 'Соколова', 'Михайлова', 'Новикова', 'Фёдорова',
  'Морозова', 'Волкова', 'Алексеева', 'Лебедева', 'Семёнова', 'Егорова', 'Павлова', 'Козлова', 'Степанова', 'Николаева',
  'Орлова', 'Андреева', 'Макарова', 'Никитина', 'Захарова', 'Зайцева', 'Соловьёва', 'Борисова', 'Яковлева', 'Григорьева',
  'Романова', 'Воробьёва', 'Сергеева', 'Киселёва', 'Максимова', 'Полякова', 'Владимирова', 'Королёва', 'Белова', 'Медведева',
] as const

function randomRu(gender: Gender): string {
  if (gender === 'female') return `${pick(RU_FEMALE_FIRST)} ${pick(RU_FEMALE_SUR)}`
  if (gender === 'male') return `${pick(RU_MALE_FIRST)} ${pick(RU_MALE_SUR)}`
  return Math.random() < 0.5
    ? `${pick(RU_MALE_FIRST)} ${pick(RU_MALE_SUR)}`
    : `${pick(RU_FEMALE_FIRST)} ${pick(RU_FEMALE_SUR)}`
}

function rollOneLanguage(lang: PersonaNameLanguage, gender: Gender): string {
  switch (lang) {
    case 'ja':
      return randomJa(gender)
    case 'en':
      return randomEn(gender)
    case 'ko':
      return randomKo(gender)
    case 'fr':
      return randomFr(gender)
    case 'ru':
      return randomRu(gender)
    case 'zh':
    default:
      return randomZh(gender)
  }
}

/** 从指定语言姓名池掷姓名；未传则默认中文 */
export function randomPersonaName(gender: Gender, language?: PersonaNameLanguage): string {
  return rollOneLanguage(language ?? DEFAULT_PERSONA_NAME_LANGUAGE, gender)
}

/** @deprecated 兼容旧调用；等价于仅中文 */
export function randomChineseName(gender: Gender): string {
  return randomPersonaName(gender, 'zh')
}
