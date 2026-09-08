import { resolveCharacterAvatarUrl } from '../../utils/characterAvatarUrl'
import { getCharacterAppearanceRefImages } from '../wechat/characterAppearanceRefImages'
import { personaDb } from '../wechat/newFriendsPersona/idb'

/** 纸片人优先全身 → 半身 → 头像 */
export async function resolvePaperDollImageUrl(characterId: string): Promise<string> {
  const cid = characterId.trim()
  if (!cid || cid === 'default') return ''
  try {
    const ch = await personaDb.getCharacter(cid)
    if (!ch) return ''
    const refs = getCharacterAppearanceRefImages(ch)
    const preferred =
      refs.find((r) => r.kind === 'full')?.url ||
      refs.find((r) => r.kind === 'half')?.url ||
      refs.find((r) => r.kind === 'face')?.url ||
      ch.appearanceRefUrl ||
      ch.avatarUrl ||
      ''
    return resolveCharacterAvatarUrl({ avatarUrl: preferred })
  } catch {
    return ''
  }
}

/** 后续接入图生 3D 时的操作指引（官网快捷入口） */
export type PaperDoll3dToolLink = {
  label: string
  href: string
  /** 工具站分组 */
  group: 'generate' | 'rig' | 'docs'
}

/** 推荐建模网站（人物页置顶展示） */
export type PaperDoll3dRecommendedSite = {
  id: string
  label: string
  href: string
  /** 角标，如「国内推荐」 */
  badge?: string
  /** 一句话说明 */
  summary: string
  /** 使用提示 */
  tips?: string
  /** 对应工具分组，便于归类 */
  kind: 'generate' | 'rig'
}

export const PAPER_DOLL_3D_RECOMMENDED: PaperDoll3dRecommendedSite[] = [
  {
    id: 'hunyuan',
    label: '腾讯混元3D',
    href: 'https://3d.hunyuan.tencent.com/',
    badge: '国内推荐',
    summary: '图生 / 文生 3D，国内访问相对友好，适合从立绘起步。',
    tips: '生成类型选 Normal，开启 PBR 贴图；勿选 Geometry 白模。导出 GLB 后在本页「导入 OC 模型」上传。',
    kind: 'generate',
  },
  {
    id: 'tripo',
    label: 'Tripo 图生 3D',
    href: 'https://www.tripo3d.ai/',
    badge: '速度快',
    summary: '单图出模快，拓扑较干净，适合快速试效果。',
    tips: '海外站，国内多半需代理。导出 GLB 即可导入小窝。',
    kind: 'generate',
  },
  {
    id: 'meshy',
    label: 'Meshy 图生 3D',
    href: 'https://www.meshy.ai/features/image-to-3d',
    badge: '功能全',
    summary: '图生 3D + 后续绑骨/动画生态较完整，社区资源多。',
    tips: '海外站。若要走走路动画，可继续在 Mixamo 绑骨。',
    kind: 'generate',
  },
  {
    id: 'mixamo',
    label: 'Mixamo 自动绑骨',
    href: 'https://www.mixamo.com/',
    badge: '小窝兼容首选',
    summary: '免费自动绑骨 + 动作库。小窝内置动作全部按 Mixamo 骨名编写。',
    tips: '混元模型请先导出「无骨/静模」或去掉旧骨，再上传 Mixamo 重新绑；导出 With Skin 的 FBX 导入小窝。',
    kind: 'rig',
  },
  {
    id: 'accurig',
    label: 'AccuRIG 免费绑骨',
    href: 'https://www.reallusion.com/accuRIG/',
    badge: '混元常用',
    summary: 'Reallusion 免费本地绑骨，混元/AI 模比 Mixamo 网页更稳，可再进 iClone/ActorCore 动作库。',
    tips: '适合混元 FBX；绑完若要进小窝播内置动作，仍建议最终转到 Mixamo 骨名或导出兼容人型。',
    kind: 'rig',
  },
]

export const PAPER_DOLL_3D_TOOLS: PaperDoll3dToolLink[] = [
  { label: '腾讯混元3D', href: 'https://3d.hunyuan.tencent.com/', group: 'generate' },
  { label: 'Meshy 图生 3D', href: 'https://www.meshy.ai/features/image-to-3d', group: 'generate' },
  { label: 'Tripo 图生 3D', href: 'https://www.tripo3d.ai/', group: 'generate' },
  { label: 'Rodin (Hyper3D)', href: 'https://hyperhuman.deemos.com/rodin', group: 'generate' },
  { label: 'Luma AI 图生 3D', href: 'https://lumalabs.ai/genie', group: 'generate' },
  { label: 'Mixamo 自动绑骨', href: 'https://www.mixamo.com/', group: 'rig' },
  { label: 'AccuRIG 绑骨', href: 'https://www.reallusion.com/accuRIG/', group: 'rig' },
  { label: 'VRoid Hub', href: 'https://hub.vroid.com/', group: 'rig' },
  { label: 'Ready Player Me', href: 'https://readyplayer.me/', group: 'rig' },
  { label: 'Meshy 文档 / API', href: 'https://docs.meshy.ai/en/api/quick-start', group: 'docs' },
]

export const PAPER_DOLL_3D_TOOL_GROUP_LABELS: Record<PaperDoll3dToolLink['group'], string> = {
  generate: '图生 3D',
  rig: '绑骨 / 人型',
  docs: '文档',
}

export const PAPER_DOLL_3D_GUIDE_STEPS = [
  {
    id: 'prepare',
    title: '准备全身立绘',
    body: '建议白底/透明底、正面全身、四肢分开，分辨率尽量清晰。可在人设的「外观参考图」里上传全身图。',
    links: [] as { label: string; href: string }[],
  },
  {
    id: 'generate',
    title: '用图生 3D 生成模型',
    body: '把立绘上传到图生 3D 工具（国内优先试腾讯混元3D），导出带贴图的 GLB。点下方链接会在新标签页打开官网。',
    links: PAPER_DOLL_3D_TOOLS.filter((t) => t.group === 'generate').map(({ label, href }) => ({
      label,
      href,
    })),
  },
  {
    id: 'rig',
    title: '（可选）绑骨 / 做成可动人型',
    body: '若要走路动画，需要 Humanoid/VRM 骨骼。点下方链接在新标签页打开绑骨网站。',
    links: PAPER_DOLL_3D_TOOLS.filter((t) => t.group === 'rig').map(({ label, href }) => ({
      label,
      href,
    })),
  },
  {
    id: 'import',
    title: '导入小窝',
    body: '在上方「导入 OC」上传混元「绑骨蒙皮」后的 FBX。小窝会自动把内置动作重定向到混元骨架；纯几何模无法播放动作。',
    links: [] as { label: string; href: string }[],
  },
  {
    id: 'place',
    title: '拎起摆放 OC',
    body: '切到顶部「摆放」模式 → 点「拎起 OC」→ 拖动悬空跟手（被拎起动作）→ 松手落到高亮格。',
    links: [] as { label: string; href: string }[],
  },
] as const

/** 人物页：拎起摆放 OC 分步说明 */
export const OC_PLACEMENT_STEPS = [
  {
    id: 'enable-3d',
    title: '开启 3D 并导入模型',
    body: '在本页打开「3D 动作（内置骨骼）」，并在「导入 OC 模型」上传 GLB/FBX。',
  },
  {
    id: 'ghost-mode',
    title: '进入摆放模式',
    body: '点顶部工具栏的「摆放」。底部会出现蓝色「家具目录」和橙色「拎起 OC」两个按钮。',
  },
  {
    id: 'pick-up',
    title: '拎起 OC',
    body: '在摆放模式底部点橙色「拎起 OC」，角色会悬空并播放被拎起动作，落点有 1×1 高亮格。',
  },
  {
    id: 'drag-drop',
    title: '拖动并松手放置',
    body: '按住拖到目标格子，松手落到地面。可随时再拎起调整。',
  },
] as const
