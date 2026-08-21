/** 可变人生账本：固定人设保留，按「角色线」独立记账（玩家身份卡 × char 各一份）。 */

import type { Gender } from '../newFriendsPersona/types'

export type LifePayKind = '' | 'full' | 'loan'

export type LifeEducationTrack =
  | ''
  | 'junior_high'
  | 'high_school'
  | 'undergrad'
  | 'master'
  | 'phd'
  | 'working'
  | 'other'

/** 本人可去/可住的地点类型 */
export type LifePlaceKind =
  | ''
  | 'home'
  | 'dorm'
  | 'rent'
  | 'family'
  | 'work'
  | 'other'

export type LifeRealEstate = {
  id: string
  /** 地点称呼：学校宿舍 / 自家住所 / 合租屋… */
  label: string
  placeKind: LifePlaceKind
  tenure: 'own' | 'rent' | ''
  /** 产权是否登记在本人名下 */
  ownedBySubject: boolean
  /** 是否为当前主要居住处 */
  isPrimary: boolean
  location: string
  area: string
  layout: string
  floor: string
  payKind: LifePayKind
  loanRemaining: string
  monthlyPayment: string
  note: string
}

export type LifeVehicle = {
  id: string
  boughtAt: string
  model: string
  payKind: LifePayKind
  loanRemaining: string
  monthlyPayment: string
  note: string
}

export type LifeFamilyMember = {
  id: string
  name: string
  /** 与本人关系：父亲 / 母亲 / 继父 / 哥哥…（勿写进 name） */
  relation: string
  gender: string
  /** 剧情「现在」年龄（展示/注入用；可由开篇年龄+剧情日推算） */
  age: string
  /** 故事开篇时的年龄；空则首次用 age 回填 */
  ageAtStart: string
  /** 生日月日，如 3月12日 / 03-12 */
  birthdayMD: string
  alive: boolean
  health: string
  occupationOrSchool: string
  residence: string
  livesWithSubject: boolean
}

/** 社交圈（同学/同事/朋友等，非核心家属） */
export type LifeSocialContact = {
  id: string
  name: string
  gender: string
  /** 剧情「现在」年龄 */
  age: string
  /** 故事开篇时的年龄 */
  ageAtStart: string
  birthdayMD: string
  /** 关系：同学 / 同事 / 朋友 / 前任… */
  relation: string
  occupationOrSchool: string
  residence: string
  /** 态度/亲疏 */
  attitude: string
  note: string
}

export type LifePet = {
  id: string
  acquiredAt: string
  acquiredPlace: string
  species: string
  name: string
  age: string
}

export type LifeMutableSheet = {
  name: string
  gender: Gender | ''
  genderChangeNote: string
  occupationMain: string
  occupationSide: string
  savings: string
  relationshipStatus: string
  educationTrack: LifeEducationTrack
  /** 开篇学年：1=初一/高一/大一/研一 */
  educationGradeAtStart: number | null
  educationNote: string
  realEstates: LifeRealEstate[]
  vehicles: LifeVehicle[]
  family: LifeFamilyMember[]
  socialCircle: LifeSocialContact[]
  pets: LifePet[]
  extraNote: string
  /** 本线开篇公历日（如 2023年9月1日）；空则用时间轴最早日 */
  storyStartDay: string
  /** 开篇年龄；空则用人设卡 age */
  ageAtStart: number | null
}

export type CharacterLifeMutableRow = {
  characterId: string
  updatedAt: number
  sheet: LifeMutableSheet
}

export type PlayerLifeMutableRow = {
  id: string
  playerIdentityId: string
  characterId: string
  updatedAt: number
  sheet: LifeMutableSheet
}

export type LifeCardOverlay = {
  name?: string
  age?: number
  gender?: Gender
  identity?: string
}

export type LifeStorySpan = {
  startDay: string | null
  nowDay: string | null
}

export type LifeResolvedSnapshot = {
  displayName: string
  cardName: string
  currentAge: number | null
  ageAtStart: number | null
  gender: Gender | ''
  cardGender: Gender | ''
  startDay: string | null
  nowDay: string | null
  educationLabel: string
  occupationMain: string
  occupationSide: string
  sheet: LifeMutableSheet
}
