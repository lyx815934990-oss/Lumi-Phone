export type EvolutionEntryGuideScene =
  | 'none'
  | 'linked-chat-room'
  | 'linked-chat-settings'
  | 'diary-discover'
  | 'diary-archive'
  | 'diary-settings'
  | 'diary-reader'

export type EvolutionEntryGuideStep = {
  target: string | null
  title: string
  body: string
  scene: EvolutionEntryGuideScene
  centered?: boolean
  isOutro?: boolean
  cardPlacement?: 'auto' | 'above' | 'below'
}

export type EvolutionEntryGuide = {
  id: string
  title: string
  steps: EvolutionEntryGuideStep[]
}

export const EVO_ENTRY_COACH_TARGET_ATTR = 'data-evo-entry-coach'
export const EVO_ENTRY_COACH_ROOT_ATTR = 'data-evo-entry-coach-root'
export const EVO_ENTRY_COACH_SCOPE = 'evolution-entry'

export const EVOLUTION_FEATURE_ENTRY_GUIDES: Record<string, EvolutionEntryGuide> = {
  'linked-chat-mode': {
    id: 'linked-chat-mode',
    title: '联动聊天模式',
    steps: [
      {
        target: null,
        scene: 'none',
        centered: true,
        title: '联动聊天怎么开',
        body: '开关在「私聊 → 聊天信息」里。接下来用高亮带你走一遍入口，约半分钟；可随时跳过。',
      },
      {
        target: 'linked-chat-info',
        scene: 'linked-chat-room',
        cardPlacement: 'below',
        title: '进入聊天信息',
        body: '打开任意有人脉关系的角色私聊，点右上角「···」或头像旁入口，进入「聊天信息」页。',
      },
      {
        target: 'linked-chat-switch',
        scene: 'linked-chat-settings',
        cardPlacement: 'above',
        title: '打开联动开关',
        body: '在聊天信息列表里找到「联动聊天模式」，打开即可。同人脉圈相关角色会共享这个开关。',
      },
      {
        target: null,
        scene: 'none',
        centered: true,
        isOutro: true,
        title: '可以去开启了',
        body: '记得选有人脉关系的角色；无人脉时开关会灰掉。开启后对方才可能传话或私下确认。',
      },
    ],
  },
  'diary-multilang': {
    id: 'diary-multilang',
    title: '日记多语言与翻译',
    steps: [
      {
        target: null,
        scene: 'none',
        centered: true,
        title: '日记语言怎么设',
        body: '书写语言与同步翻译在「私语档案」的日记设置里。接下来高亮带你找到入口。',
      },
      {
        target: 'diary-entry',
        scene: 'diary-discover',
        cardPlacement: 'below',
        title: '打开私语档案',
        body: '微信 → 发现 → 点「私语档案」，进入日记藏书阁。',
      },
      {
        target: 'diary-settings-btn',
        scene: 'diary-archive',
        cardPlacement: 'below',
        title: '点开日记设置',
        body: '在档案首页，点角色卡片右侧的设置齿轮，打开「日记设置」。',
      },
      {
        target: 'diary-lang-block',
        scene: 'diary-settings',
        cardPlacement: 'above',
        title: '书写语言与同步翻译',
        body: '在这里选择日记正文语言；非中文时可开「同步翻译」，生成时自动附带简体译文。',
      },
      {
        target: 'diary-translate-btn',
        scene: 'diary-reader',
        cardPlacement: 'below',
        title: '详情页一键翻译',
        body: '打开某篇日记后，右上角可点「翻译」切换简体中文译文，再点「原文」回到原语言正文。',
      },
      {
        target: null,
        scene: 'none',
        centered: true,
        isOutro: true,
        title: '设置完成',
        body: '之后新生成的日记会按所选语言书写；已有日记也可在详情页随时切换译文。',
      },
    ],
  },
}

export function getEvolutionEntryGuide(guideId: string | undefined | null): EvolutionEntryGuide | null {
  const id = String(guideId ?? '').trim()
  if (!id) return null
  return EVOLUTION_FEATURE_ENTRY_GUIDES[id] ?? null
}
