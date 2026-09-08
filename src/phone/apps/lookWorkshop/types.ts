/** 外观工坊草稿 —— 控件数值源；导出时编译为 .lumiBubblePack */

import type { BubbleEdgeSticker } from '../wechat/bubbleEdgeStickers'
import type { BubbleFrame } from '../wechat/bubbleFrame'
import type { AvatarSticker } from '../wechat/avatarStickers'
import type {
  BubbleBadge,
  BubbleShadowDraft,
  GradientMode,
  GradientStop,
} from '../wechat/bubbleBadge'

export type SideKey = 'other' | 'self'

/** 连续发送时头像显示策略 */
export type AvatarClusterMode = 'every' | 'first' | 'last'

export type BubbleSideDraft = {
  bg: string
  /** 手写渐变 CSS（gradientMode=css 时使用） */
  bgGradient: string
  /** @deprecated 由 gradientMode 推导；保留兼容旧草稿 */
  useGradient: boolean
  /** off=纯色；stops=色标编辑；css=手写 */
  gradientMode: GradientMode
  gradientAngleDeg: number
  gradientStops: GradientStop[]
  /** 毛玻璃：透视聊天壁纸 */
  glassEnabled: boolean
  glassBlurPx: number
  glassSaturatePct: number
  /**
   * 液体玻璃边缘柔化（px）：越大边缘越糊、硬描边越弱。
   * 0 = 硬边；建议 6–14。
   */
  glassEdgeBlurPx: number
  /** 自定义背景图 data URL；空 = 仅用色/渐变 */
  bgImage: string
  /** 背景图自身模糊 */
  bgImageBlurPx: number
  text: string
  fontSizePx: number
  fontWeight: number
  lineHeight: number
  padT: number
  padR: number
  padB: number
  padL: number
  /** 普通文字气泡统一圆角 */
  radius: number
  borderColor: string
  borderWidth: number
  /** 手写 box-shadow（shadowDraft.useCss 时优先） */
  shadow: string
  shadowDraft: BubbleShadowDraft
  showTail: boolean
  /**
   * 连续气泡时尖角出现位置
   * every = 每条；first = 仅首条（及单条）；last = 仅末条（及单条）
   */
  tailCluster: 'every' | 'first' | 'last'
  /** 贴边：侧边（头像侧）/ 底部 */
  tailAnchor: 'side' | 'bottom'
  /**
   * 侧边尖角垂直定位：pct=相对气泡高度百分比；avatar=跟随头像垂直中心。
   * 二者互斥；底部贴边时忽略。
   */
  tailYMode: 'pct' | 'avatar'
  /**
   * 侧边尖角垂直位置（相对气泡高度 0–100%）：
   * 0%=顶、50%=中、100%=底；尖角中心对齐该比例，随气泡变高仍保持相对位置。
   * 仅 tailYMode=pct 时生效。（旧稿 tailOffsetYPx 会在 normalize 时换算成 %）
   */
  tailOffsetYPct: number
  /** @deprecated 已改用 tailOffsetYPct；仅兼容旧存档 */
  tailOffsetYPx?: number
  /** 底部贴边时：沿底边 0%=靠头像侧 … 100%=靠聊天中心侧 */
  tailOffsetXPct: number
  /**
   * 侧边尖角横向偏移（px）：正=更朝头像方向探出，负=更塞进气泡。
   * 底部贴边时忽略。
   */
  tailOffsetXPx: number
  /** 尖角横向长度 */
  tailLengthPx: number
  /** 尖端开口夹角（度）；越大开口越宽 */
  tailAngleDeg: number
  /** 尖端圆角 */
  tailRoundPx: number
  /**
   * 尖角整体倾斜（度）：绕贴边旋转。
   * 负=逆时针，正=顺时针；0=水平探出。
   */
  tailTiltDeg: number
  /**
   * 尖角表面：follow=跟随气泡条底色/渐变/玻璃；custom=独立配置。
   */
  tailSurfaceMode: 'follow' | 'custom'
  /** 尖角纯色底（custom 且无渐变时） */
  tailBg: string
  tailGradientMode: GradientMode
  tailGradientAngleDeg: number
  tailGradientStops: GradientStop[]
  /** 手写渐变 CSS（tailGradientMode=css） */
  tailBgGradient: string
  /** 尖角独立毛玻璃 */
  tailGlassEnabled: boolean
  tailGlassBlurPx: number
  tailGlassSaturatePct: number
  maxWidthPct: number
  minWidthPx: number
  /** 气泡文字自定义字体（空 = 默认） */
  font: LookWorkshopCustomFont | null
  /** 四边贴纸（沿边百分比定位；每侧最多 8 张） */
  edgeStickers: BubbleEdgeSticker[]
  /** 九宫格拉伸气泡框（空 image = 未启用） */
  frame: BubbleFrame | null
  /** 头像装饰贴纸（盖在头像上；支持 GIF；每侧最多 6 张） */
  avatarStickers: AvatarSticker[]
  /** 气泡外侧角标 */
  badge: BubbleBadge
  /** 本侧是否显示头像 */
  showAvatar: boolean
  /** 连续发送时本侧头像：every=每条 / first=仅首条 / last=仅末条 */
  avatarCluster: AvatarClusterMode
  /** 本侧头像圆角 */
  avatarRadiusPx: number
  avatarBorderColor: string
  avatarBorderWidth: number
  /** 头像距屏幕左右边的边距（对方=左边，自己=右边；默认 24） */
  avatarEdgeInsetPx: number
  /** 头像边长 */
  avatarSizePx: number
  /** 预览用示例头像占位色（方便在不同底色下调贴纸/抠图） */
  avatarPlaceholderColor: string
  /** 头像倾斜角度 */
  avatarRotateDeg: number
  /**
   * 相对气泡条的垂直位置：0%=顶对齐，50%=居中，100%=底对齐
   */
  avatarBubbleYPct: number
}

export type SpecialCardDraft = {
  followBubble: boolean
  bg: string
  borderColor: string
  borderWidth: number
  radius: number
  shadow: string
  accent: string
  titleColor: string
  mutedColor: string
  amountColor: string
}

/** 顶栏操作按钮：时间设置 / 生理检测（side 仅作未自由定位时的默认落点） */
export type HeaderBtnSide = 'left' | 'right'
export type HeaderAvatarPlacement = 'beside' | 'above'

/** 标题栏自由定位：相对标题栏宽高的中心点百分比 */
export type HeaderFreePos = {
  /** true = 绝对定位到 xPct/yPct；false = 默认流式布局 */
  free: boolean
  xPct: number
  yPct: number
}

export type HeaderChromeItemDraft = {
  /** 按钮点击热区边长 */
  sizePx: number
  pos: HeaderFreePos
  /** 自定义按钮图 data URL；空 = 默认矢量图标 */
  iconDataUrl: string
  /** 自定义图标显示边长 */
  iconSizePx: number
  /** 自定义图标圆角 */
  iconRadiusPx: number
}

export type HeaderBtnDraft = HeaderChromeItemDraft & {
  /** 未 free 时：左侧返回旁 / 右侧设置旁 */
  side: HeaderBtnSide
}

/** 输入栏单个按钮的自定义图标 */
export type InputBtnIconKey = 'voice' | 'keyboard' | 'emoji' | 'plus' | 'send'
export type InputBtnIconDraft = {
  /** data URL；空 = 默认矢量 */
  dataUrl: string
  sizePx: number
  radiusPx: number
}

/** 顶栏昵称 / 输入状态自定义字体 */
export type LookWorkshopCustomFont = {
  family: string
  fileName: string
  dataUrl: string
}

export type LookWorkshopDraft = {
  version: 1
  meta: { name: string; description: string; author: string }
  /** @deprecated 旧存档迁移到 other/self.showAvatar */
  showAvatar?: boolean
  /** @deprecated 旧存档迁移到 other/self.avatarCluster */
  avatarOnlyFirst?: boolean
  /** @deprecated 旧存档迁移到 other/self.avatar* */
  avatarRadiusPx?: number
  avatarBorderColor?: string
  avatarBorderWidth?: number
  gapSameSpeakerPx: number
  gapDifferentSpeakerPx: number
  msgAreaPadX: number
  msgAreaPadY: number
  /** char = other, user = self */
  other: BubbleSideDraft
  self: BubbleSideDraft
  /** 特殊消息（follow 时主要跟对应侧气泡） */
  voice: SpecialCardDraft
  transfer: SpecialCardDraft
  redPacket: SpecialCardDraft
  location: SpecialCardDraft
  voiceCall: SpecialCardDraft
  favorite: SpecialCardDraft
  listenTogether: SpecialCardDraft
  /** 顶栏 */
  header: {
    heightPx: number
    bg: string
    /** 背景：纯色 或 背景图，二选一 */
    bgMode: 'color' | 'image'
    /** 自定义背景图 data URL；bgMode=image 时生效 */
    bgImage: string
    /** 背景图自身模糊（与透视毛玻璃不同） */
    bgImageBlurPx: number
    /** 颜色遮罩（叠在背景图之上；仅 bgMode=image） */
    bgOverlayColor: string
    /** 遮罩不透明度 0–100 */
    bgOverlayOpacity: number
    useBlur: boolean
    blurPx: number
    textColor: string
    mutedColor: string
    borderColor: string
    showSubtitle: boolean
    /** 副标题 /「输入中」预览文案；导出后也会覆盖真机 typing 文案 */
    subtitleText: string
    titleSizePx: number
    titleWeight: number
    /** 昵称自定义字体（空 dataUrl = 默认） */
    titleFont: LookWorkshopCustomFont | null
    /** 输入状态自定义字体 */
    subtitleFont: LookWorkshopCustomFont | null
    /** 是否在标题区显示当前聊天角色头像 */
    showTitleAvatar: boolean
    titleAvatarSizePx: number
    titleAvatarRadiusPx: number
    titleAvatarPlacement: HeaderAvatarPlacement
    /** 顶栏按钮统一着色；空字符串则跟随 textColor */
    btnColor: string
    /** 返回 / 设置 / 时间 / 生理监测：始终显示，可自由拖动与自定义图标 */
    backBtn: HeaderChromeItemDraft
    moreBtn: HeaderChromeItemDraft
    timeBtn: HeaderBtnDraft
    psycheBtn: HeaderBtnDraft
    /** 标题头像自由定位（showTitleAvatar 时生效） */
    titleAvatarPos: HeaderFreePos
    /** 联系人昵称自由定位 */
    titlePos: HeaderFreePos
    /** 输入状态 / 副标题自由定位 */
    subtitlePos: HeaderFreePos
  }
  /** 输入栏 */
  input: {
    barBg: string
    /** 自定义栏背景图 data URL；空 = 仅用 barBg 色 */
    barBgImage: string
    /** 栏背景图自身模糊 */
    barBgImageBlurPx: number
    /** 栏颜色遮罩 */
    barBgOverlayColor: string
    /** 栏遮罩不透明度 0–100 */
    barBgOverlayOpacity: number
    barBorder: string
    useBlur: boolean
    blurPx: number
    shellBg: string
    shellBorder: string
    shellRadius: number
    textColor: string
    placeholderColor: string
    btnColor: string
    padY: number
    /**
     * 为 true 时：改任一按钮的尺寸/圆角会同步到全部按钮图标
     * （不影响已上传的图片）
     */
    btnIconSyncStyle: boolean
    btnIcons: {
      voice: InputBtnIconDraft
      /** 语音模式下「切回文字」/ 表情面板打开时的键盘图标 */
      keyboard: InputBtnIconDraft
      emoji: InputBtnIconDraft
      plus: InputBtnIconDraft
      send: InputBtnIconDraft
    }
  }
  /** 时间戳 */
  timestamp: {
    bg: string
    textColor: string
    radius: number
    padX: number
    padY: number
    /** 时间戳自定义字体（空 = 默认） */
    font: LookWorkshopCustomFont | null
  }
  /** 高级 */
  advanced: {
    roomBg: string
    /** 聊天室背景图 data URL；空 = 仅用 roomBg 纯色（便于预览液态玻璃） */
    roomBgImage: string
    globalBlurPx: number
    shadowStrength: number
  }
}

export type LookWorkshopSavedPack = {
  id: string
  name: string
  updatedAt: number
  draft: LookWorkshopDraft
}

export const LOOK_WORKSHOP_DRAFT_FORMAT = 'lumi-look-workshop-draft' as const

export type LookWorkshopArchiveFile = {
  format: typeof LOOK_WORKSHOP_DRAFT_FORMAT
  version: 1
  draft: LookWorkshopDraft
}
