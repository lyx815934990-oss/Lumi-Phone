import type { PersonaPackPremiseKind } from './types'

export type EnsembleKindSeed = {
  title: string
  premise: string
  sharedRules: string
  extraHint: string
  romanceCount: number
  npcCount: number
  npcHint: string
}

export const ENSEMBLE_KIND_SEEDS: Record<PersonaPackPremiseKind, EnsembleKindSeed> = {
  dating_show: {
    title: '星湾心动季',
    premise:
      '海风别墅里录一季恋爱观察综艺。白天是任务、双人约会和镜头前的选择；晚上收工后才有走廊、阳台、厨房这些半私下空间。你是本季新加入的嘉宾，其余可攻略对象有人已相处过几周，有人刚进组。节目组全程跟拍公开环节，但收工后的对话默认不上星。',
    sharedRules:
      '公开任务、宴会、投票必须当镜头；收工后的走廊/房间对话默认不进成片，除非当事人自己说漏或被拍到。淘汰或心动选择只在公开仪式上生效，私下告白不算违约。可攻略对象彼此可以竞争、同盟或暧昧，但不要写成某一人的跟班。主持与导演知道台本和投票结果，不知道选手私下说了什么。',
    extraHint:
      '可攻略气质要拉开：至少一位外热内冷、一位慢热克制、一位好胜爱出风头。开局不要全员对你一见钟情。NPC 需要主持（控场、爱打趣）和导演/制片（盯进度、偶尔偏心）。全员成年。',
    romanceCount: 5,
    npcCount: 2,
    npcHint: '建议：主持 + 导演。他们不进通讯录，但任务和公布环节会出场。',
  },
  variety: {
    title: '昼夜任务局',
    premise:
      '室内棚 + 室外快闪的竞技综艺。每期一个主题任务，可攻略对象是常驻嘉宾，你是新加入的飞行嘉宾。输赢会上排行榜，但没有恋爱告白环节；亲近关系全靠任务间隙、后台和庆功局。',
    sharedRules:
      '任务进行中以输赢和镜头效果为先，禁止无故把比赛写成恋爱约会。后台、候场、庆功局才是可以拉近关系的地方。主持负责规则和起哄，编剧/PD 负责改规则和塞麦。嘉宾之间可以互怼、组队、护短，但公开场合要留体面。',
    extraHint:
      '可攻略做成反差嘉宾：一位好胜、一位佛系、一位嘴毒会护人。NPC 要有能控场的主持，以及会改规则的 PD。不要写成恋综。全员成年。',
    romanceCount: 4,
    npcCount: 2,
    npcHint: '建议：主持 + PD/编剧。任务规则由他们口播，私下不知道你和嘉宾的私聊。',
  },
  battle_royale: {
    title: '雾境第七夜',
    premise:
      '一群人被扔进有结界的雾境岛屿，第七夜前必须按规则活下来。物资点、安全屋、广播塔是公共空间；密林和废墟适合小队或两人行动。可攻略对象有人是队友，有人是竞争者，有人身份不明。你记得醒来前的最后一件事，其余人不全信你。',
    sharedRules:
      '结界、淘汰、物资刷新以共用规则为准，角色不能开天眼知道没亲眼见到的事。结盟、背叛、救援都要有当场动机。广播和公告是公开信息；两人之间的约定只有在场者知道。路人怪物/其他逃生者若无名字，不必建档。',
    extraHint:
      '可攻略拉开职能和立场：至少一位想组队、一位习惯独行、一位像知道规则内情。NPC 给一名规则解说/先遣观察员，以及一名黑市物资贩。不要开局就全员誓死效忠你。全员成年。',
    romanceCount: 5,
    npcCount: 2,
    npcHint: '建议：观察员/广播员 + 物资贩。他们知道公开规则，不知道你和小队的私下约定。',
  },
  custom: {
    title: '',
    premise:
      '同一套背景里有多名可攻略对象，并有若干不会默认加微信的配角。请写清：这是哪儿、大家为什么会碰到、公开场合和私下分别是什么。',
    sharedRules:
      '在场的人才知道当场细节。私下约定默认不传给未在场的人。可攻略对象地位平等，NPC 只负责推动场面，不要写成工具人可攻略。',
    extraHint: '写明你想要的题材、时代、禁忌，以及可攻略大概什么气质。全员成年。',
    romanceCount: 4,
    npcCount: 2,
    npcHint: '需要反复出场的配角再填人数；路人不用建档。',
  },
}

export const ENSEMBLE_EXTRA_CHIPS: ReadonlyArray<{ id: string; label: string; text: string }> = [
  {
    id: 'no-love-at-first-sight',
    label: '开局别全员心动',
    text: '开局不要全员对你一见钟情，关系要有温度差。',
  },
  {
    id: 'info-split',
    label: '公开/私下信息分开',
    text: '镜头前或公告里的信息才算公开；私下约定只有当时在场的人知道。',
  },
  {
    id: 'equal-romance',
    label: '可攻略彼此平等',
    text: '可攻略对象彼此可以竞争或同盟，不要写成某一人的跟班。',
  },
  {
    id: 'named-npc',
    label: 'NPC 要有职能',
    text: 'NPC 必须有明确职能（主持、导演、向导、商人等），不要做成可攻略候补。',
  },
  {
    id: 'adult',
    label: '全员成年',
    text: '所有出场角色均为成年人。',
  },
]

export function extraHintHasChip(extraHint: string, chipText: string): boolean {
  return extraHint.includes(chipText.trim())
}

export function toggleExtraHintChip(extraHint: string, chipText: string): string {
  const needle = chipText.trim()
  const cur = extraHint.trim()
  if (cur.includes(needle)) {
    return cur
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== needle)
      .join('\n')
  }
  return cur ? `${cur}\n${needle}` : needle
}

export function fieldMatchesSeed(value: string, seed: string): boolean {
  return value.trim() === seed.trim()
}
