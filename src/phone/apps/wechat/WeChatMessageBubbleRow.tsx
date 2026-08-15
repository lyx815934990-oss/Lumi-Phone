import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type { WeChatBubbleTheme } from '../../types'
import { useCustomization } from '../../CustomizationContext'
import { BubbleEdgeStickers } from './bubbleEdgeStickers'
import { BubbleFaceLayer, BubbleFrameLayer } from './bubbleFrame'
import {
  formatTelegramBubbleTime,
  TelegramBubbleMeta,
  TelegramBubbleTail,
  telegramBubbleCornerRadius,
} from './wechatBubbleTelegramUi'
import { ImessageBubbleTail, imessageBubbleCornerRadius } from './wechatBubbleImessageUi'
import { WechatBubbleTail } from './wechatBubbleWechatUi'
import { TalkmakerInlineReplyBlock, TelegramInlineReplyBlock } from './wechatMessengerSpecialBubbles'
import {
  formatTalkmakerExternalTime,
  TalkmakerExternalTimestamp,
} from './wechatBubbleTalkmakerUi'
import { WeChatChatMixedText } from './WeChatChatMixedText'
import {
  bubbleSideFontFamilyCss,
  bubbleSideHasCustomFont,
} from './wechatBubbleSideFonts'
import {
  ChatGroupSenderNicknameWithRank,
  ChatGroupSpeakerRankOnAvatar,
} from './group/ChatGroupSpeakerAvatarWrap'
import { WeChatAvatarChromeWrap, WeChatAvatarSizeGutter } from './WeChatAvatarChromeWrap'
import { useWeChatLongPress } from './hooks/useWeChatLongPress'
import { useChatSkinEngine } from './WeChatChatSkinEngineContext'
import { composeMultiSelectLeading } from './chatHistory/MultiSelectAvatarSlot'
import {
  CHAT_BUBBLE_ENTER_ANIMATE,
  CHAT_BUBBLE_ENTER_INITIAL,
  CHAT_BUBBLE_ENTER_SPRING,
  LIQUID_GLASS_BUBBLE_ENTER_ANIMATE,
  LIQUID_GLASS_BUBBLE_ENTER_INITIAL,
  LIQUID_GLASS_BUBBLE_ENTER_SPRING,
  chatBubbleTransformOrigin,
} from './chatBubbleEnterMotion'
import { isLiquidGlassMinimalPackActive } from './bubblePack/liquidGlassMinimalPack'
import { normalizeBubbleBadge } from './bubbleBadge'

/** 聊天气泡最大宽：100vw - 左右基准线 24px×2 - 头像列预留 80px（40 头像 + 12 间距 + 28 冗余） */
const CHAT_BUBBLE_MAX = 'max-w-[calc(100vw-24px-24px-80px)]'
/** 主题抽屉等窄容器内预览：不超过父宽，公式与聊天一致 */
const PREVIEW_BUBBLE_MAX = 'max-w-[min(100%,calc(100vw-24px-24px-80px))]'

/** 气泡内嵌引用预览（与微信一致：宽度随气泡，不超出） */
export type WeChatBubbleReplyPreview = {
  senderName: string
  content: string
  onClick?: () => void
}

function ChatBubbleReplyPreview({
  preview,
  isSelf,
  insetStyle,
  tailStyle = 'wechat',
}: {
  preview: WeChatBubbleReplyPreview
  isSelf: boolean
  insetStyle?: CSSProperties
  tailStyle?: 'wechat' | 'imessage' | 'telegram' | 'talkmaker'
}) {
  if (tailStyle === 'telegram') {
    return (
      <TelegramInlineReplyBlock
        senderName={preview.senderName}
        content={preview.content}
        isSelf={isSelf}
        onClick={preview.onClick}
      />
    )
  }
  if (tailStyle === 'talkmaker') {
    return (
      <TalkmakerInlineReplyBlock
        senderName={preview.senderName}
        content={preview.content}
        onClick={preview.onClick}
      />
    )
  }

  const muted = isSelf ? 'rgba(0,0,0,0.45)' : '#8e8e8e'
  const inner = (
    <span className="flex min-w-0 items-start gap-1.5">
      <span className="mt-[2px] h-[calc(100%-4px)] min-h-[1.25rem] w-px shrink-0 bg-[#d4d4d4]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] leading-snug" style={{ color: muted }}>
          {preview.senderName}：
        </span>
        <span className="line-clamp-2 block text-[13px] leading-[1.35]" style={{ color: muted }}>
          <WeChatChatMixedText text={preview.content || '…'} />
        </span>
      </span>
    </span>
  )
  const shellCls =
    'mb-1.5 block w-full max-w-full rounded-[999px] px-3 py-1.5 text-left'
  const shellStyle: CSSProperties = insetStyle ?? {
    background: isSelf ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.06)',
  }
  if (preview.onClick) {
    return (
      <button
        type="button"
        data-wx-bubble-reply
        onClick={preview.onClick}
        className={shellCls}
        style={shellStyle}
      >
        {inner}
      </button>
    )
  }
  return (
    <div data-wx-bubble-reply className={shellCls} style={shellStyle}>
      {inner}
    </div>
  )
}

export type WeChatMessageBubbleRowProps = {
  messageText: string
  messagePrefixIcon?: ReactNode
  /** 气泡顶部引用条（宽度与气泡一致） */
  replyPreview?: WeChatBubbleReplyPreview
  /** 引用条内嵌区域样式（遇见浅金气泡等） */
  replyPreviewInsetStyle?: CSSProperties
  /** 群助手：黑底白字极简高冷 */
  luxuryDarkAdminBubble?: boolean
  isSelf: boolean
  bubble: WeChatBubbleTheme
  showAvatar: boolean
  showBubbleTail: boolean
  /** 聊天页用 CSS 变量上色；预览用实色 */
  variant: 'chat' | 'preview'
  /** 附加在根行上的 class（如聊天动效） */
  rowClassName?: string
  /** 气泡内容块附加 class */
  bubbleContentClassName?: string
  /** 合并进气泡内容块 style（如遇见水滴渐变/阴影；有 `background` 时不使用 theme 纯色底） */
  chatBubbleSurfaceStyle?: CSSProperties
  /** 聊天页头像点击缩放反馈 */
  avatarTapMotion?: boolean
  /**
   * 是否在本行绘制头像（与 `showAvatar` 同时为真才显示图）。
   * 双方连续合并时均仅**首条**为 true；后续行保留同宽占位，气泡与首条对齐。
   */
  showAvatarColumn?: boolean
  /** 聊天页己方行：气泡左侧附加控件（如发送失败重试），不改变基准线 */
  chatAccessory?: ReactNode
  /** 聊天页：叠在己方气泡右下角（如发送中呼吸点） */
  chatBubbleOverlay?: ReactNode
  /** 聊天页：主题驱动的细边框（如 IndexedDB chatTheme） */
  chatBubbleShowBorder?: boolean
  chatBubbleBorderColor?: string
  /** 聊天页：若提供则气泡与三角尖角使用该实色（支持 rgba），避免仅依赖外层 `--wx-*` 被父级样式覆盖导致改色不生效。 */
  chatSolidBubbleBg?: string
  /** iMessage 切角尾巴遮罩色（须与聊天室背景一致，默认 `--wx-chat-room-bg`） */
  bubbleTailMaskColor?: string
  /** 聊天页己方头像（与资料一致）；无则保留灰色占位 */
  chatSelfAvatarUrl?: string
  /** 聊天页对方头像（角色微信头像或 Lumi 助手图）；无则灰色占位，勿与己方混淆 */
  chatOtherAvatarUrl?: string
  /** 群聊等：头像右侧展示的发送者昵称 */
  chatOtherSenderNickname?: string
  /** 群聊：对方头像左上角头衔（群主/管理员） */
  chatOtherAvatarRankBadge?: 'owner' | 'admin' | null
  /** 群聊：己方头像左上角头衔 */
  chatSelfAvatarRankBadge?: 'owner' | 'admin' | null
  /** 群聊：头衔是否与昵称并排；关闭显示成员昵称时为 false，头衔叠头像角 */
  groupRankShowBesideNickname?: boolean
  /** 聊天页：点击对方头像 */
  onOtherAvatarClick?: () => void
  /** 长按气泡触发操作面板（微信一致） */
  onBubbleLongPress?: (anchorRect: DOMRect) => void
  /** 面板打开时，气泡显示选中态 */
  bubbleSelected?: boolean
  /** 多选模式：替换头像槽位为复选框 */
  multiSelectAvatar?: ReactNode
  /** Telegram：气泡内嵌时间戳（毫秒） */
  messageTimestampMs?: number
  /** Telegram：己方双勾已读 */
  telegramShowReadChecks?: boolean
  /**
   * 气泡译文（与语音「转文字」同交互）：有值时旁侧显示灰底「翻译」按钮，
   * 展开后面板贴在文字气泡下方并衔接圆角。
   */
  translationText?: string
  translationExpanded?: boolean
  onTranslationToggle?: () => void
}

function BubbleMessageTail({
  isSelf,
  show,
  color,
  tailMode,
  avatarMidlinePx,
}: {
  isSelf: boolean
  show: boolean
  color?: string
  tailMode: 'avatarMidline' | 'bubbleCenter'
  avatarMidlinePx: number
}) {
  if (!show) return null
  const fill = color ?? (isSelf ? 'var(--wx-self-bubble-bg)' : 'var(--wx-other-bubble-bg)')
  const positionStyle: CSSProperties =
    tailMode === 'bubbleCenter'
      ? { top: '50%', transform: 'translateY(-50%)' }
      : { top: avatarMidlinePx, transform: 'translateY(-50%)' }
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-0"
      style={{
        ...positionStyle,
        width: 0,
        height: 0,
        ...(isSelf
          ? {
              right: -5,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '8px solid',
              borderLeftColor: fill,
            }
          : {
              left: -5,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '8px solid',
              borderRightColor: fill,
            }),
      }}
    />
  )
}

function measureBubbleSingleLine(el: HTMLElement): boolean {
  const cs = getComputedStyle(el)
  const pt = parseFloat(cs.paddingTop) || 0
  const pb = parseFloat(cs.paddingBottom) || 0
  let lh = parseFloat(cs.lineHeight)
  if (!Number.isFinite(lh) || lh <= 0) {
    const fs = parseFloat(cs.fontSize) || 15
    lh = fs * 1.5
  }
  const textBlockHeight = el.scrollHeight - pt - pb
  return textBlockHeight <= lh * 1.35 + 0.5
}

function useMessageBubbleSingleLine(contentRef: RefObject<HTMLDivElement | null>, text: string) {
  const [singleLine, setSingleLine] = useState(false)
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    let raf = 0
    let roBusy = false
    const measureNow = () => {
      const node = contentRef.current
      if (!node) return
      const next = measureBubbleSingleLine(node)
      setSingleLine((prev) => (prev === next ? prev : next))
    }
    const scheduleMeasure = () => {
      if (roBusy) return
      roBusy = true
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        roBusy = false
        measureNow()
      })
    }
    measureNow()
    const ro = new ResizeObserver(scheduleMeasure)
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      roBusy = false
    }
  }, [text])
  return singleLine
}

export function WeChatMessageBubbleRow({
  messageText,
  messagePrefixIcon,
  luxuryDarkAdminBubble = false,
  isSelf,
  bubble,
  showAvatar,
  showBubbleTail,
  variant,
  rowClassName = '',
  bubbleContentClassName = '',
  chatBubbleSurfaceStyle,
  avatarTapMotion = false,
  showAvatarColumn = true,
  chatAccessory,
  chatBubbleOverlay,
  chatBubbleShowBorder = false,
  chatBubbleBorderColor = '#e5e5e5',
  chatSolidBubbleBg,
  bubbleTailMaskColor: _bubbleTailMaskColor = 'var(--wx-chat-room-bg, #EDEDED)',
  chatSelfAvatarUrl,
  chatOtherAvatarUrl,
  chatOtherSenderNickname,
  chatOtherAvatarRankBadge = null,
  chatSelfAvatarRankBadge = null,
  groupRankShowBesideNickname = true,
  onOtherAvatarClick,
  onBubbleLongPress,
  bubbleSelected = false,
  multiSelectAvatar,
  replyPreview,
  replyPreviewInsetStyle,
  messageTimestampMs,
  telegramShowReadChecks = true,
  translationText,
  translationExpanded = false,
  onTranslationToggle,
}: WeChatMessageBubbleRowProps) {
  const { state: customizationState } = useCustomization()
  const liquidGlassEnter = isLiquidGlassMinimalPackActive(customizationState.wechatTheme)
  const bubbleEnterInitial = liquidGlassEnter ? LIQUID_GLASS_BUBBLE_ENTER_INITIAL : CHAT_BUBBLE_ENTER_INITIAL
  const bubbleEnterAnimate = liquidGlassEnter ? LIQUID_GLASS_BUBBLE_ENTER_ANIMATE : CHAT_BUBBLE_ENTER_ANIMATE
  const bubbleEnterSpring = liquidGlassEnter ? LIQUID_GLASS_BUBBLE_ENTER_SPRING : CHAT_BUBBLE_ENTER_SPRING
  const edgeStickers =
    customizationState.wechatTheme.bubbleEdgeStickers?.[isSelf ? 'self' : 'other'] ?? []
  const bubbleFrame =
    customizationState.wechatTheme.bubbleFrames?.[isSelf ? 'self' : 'other'] ?? null
  const bubbleBadge = normalizeBubbleBadge(
    customizationState.wechatTheme.bubbleBadges?.[isSelf ? 'self' : 'other'],
  )
  const showBubbleBadge = Boolean(bubbleBadge?.enabled && bubbleBadge.text.trim())
  const contentRef = useRef<HTMLDivElement>(null)
  const singleLine = useMessageBubbleSingleLine(contentRef, messageText)
  /** 聊天 40px；预览同尺寸以对齐规则一致 */
  const avatarPx = variant === 'chat' ? 40 : 40
  /** css 引擎：清空微信/iMessage/Telegram/Talkmaker 主题尾巴与排版差异，只留原始壳给 scopedCss */
  const cssSkin = useChatSkinEngine() === 'css'
  const liquidGlassCssTail = cssSkin && Boolean(showBubbleTail)
  const tailStyle = cssSkin ? undefined : bubble.bubbleTailStyle
  const templateFont = Boolean(tailStyle)
  const sideHasCustomFont = bubbleSideHasCustomFont(bubble, isSelf ? 'self' : 'other')
  const useFullStackFont = templateFont || sideHasCustomFont
  const sideFontFamilyCss = sideHasCustomFont ? bubbleSideFontFamilyCss(isSelf ? 'self' : 'other') : undefined
  const isImessageTail = !cssSkin && tailStyle === 'imessage'
  const isTelegramTail = !cssSkin && tailStyle === 'telegram'
  const isTalkmakerTail = !cssSkin && tailStyle === 'talkmaker'
  /** 微信 App 预设，或气泡包显式 showBubbleTail 且未选其它 Messenger 尾巴（外观工坊）；液态玻璃几何尖角 */
  const isWechatTail =
    liquidGlassCssTail ||
    (!cssSkin &&
      !isImessageTail &&
      !isTelegramTail &&
      !isTalkmakerTail &&
      (tailStyle === 'wechat' || (Boolean(showBubbleTail) && !tailStyle)))
  const showAvatarVisual = showAvatar && showAvatarColumn
  /** 合并组内无头像行仍占头像+间距宽，与首条气泡对齐 */
  const reserveAvatarGutter = showAvatar
  const hasTranslation = Boolean(translationText?.trim()) && typeof onTranslationToggle === 'function'
  const translationOpen = hasTranslation && translationExpanded === true
  /** 单行时头像与气泡垂直居中；译文展开后高度变大，须顶对齐以免头像下移 */
  const alignWithAvatarMid = Boolean(
    singleLine && reserveAvatarGutter && !isTalkmakerTail && !translationOpen,
  )
  const isAltMessengerTail = isImessageTail || isTelegramTail || isTalkmakerTail
  const showTail =
    showBubbleTail &&
    !multiSelectAvatar &&
    (isAltMessengerTail || isWechatTail ? true : showAvatarVisual)
  const tailMode: 'avatarMidline' | 'bubbleCenter' = alignWithAvatarMid ? 'bubbleCenter' : 'avatarMidline'

  const bubbleBgChat = isSelf ? 'var(--wx-self-bubble-bg)' : 'var(--wx-other-bubble-bg)'
  const bubbleTextChat = isSelf ? 'var(--wx-self-bubble-text)' : 'var(--wx-other-bubble-text)'
  const bubbleBgPreview = isSelf ? bubble.selfBubbleBg : bubble.otherBubbleBg
  const bubbleTextPreview = isSelf ? 'var(--wx-self-bubble-text)' : 'var(--wx-other-bubble-text)'
  const bubbleRadiusPx = isSelf ? bubble.selfBubbleRadiusPx : bubble.otherBubbleRadiusPx
  const bubbleRadius = cssSkin
    ? `${bubbleRadiusPx}px`
    : isTelegramTail || isTalkmakerTail
      ? telegramBubbleCornerRadius(isSelf, bubbleRadiusPx, showTail)
      : isImessageTail
        ? imessageBubbleCornerRadius(isSelf, bubbleRadiusPx, showTail)
        : `${bubbleRadiusPx}px`
  const solidChatBg = variant === 'chat' ? chatSolidBubbleBg?.trim() : ''
  let bubbleBgChatResolved = solidChatBg ? solidChatBg : bubbleBgChat
  let bubbleTextResolved = variant === 'chat' ? bubbleTextChat : bubbleTextPreview
  const luxuryDark = variant === 'chat' && !isSelf && luxuryDarkAdminBubble
  if (luxuryDark) {
    bubbleBgChatResolved = '#0a0a0a'
    bubbleTextResolved = '#f5f5f5'
  }

  const textCls = cssSkin
    ? 'text-[15px]'
    : isWechatTail
      ? 'text-[15.5px]'
      : isAltMessengerTail || variant === 'chat'
        ? isTalkmakerTail
          ? 'text-[15px]'
          : 'text-[16px]'
        : 'text-[14px]'
  const bubblePadCls = cssSkin
    ? 'p-0'
    : isTelegramTail
      ? 'px-3 py-2'
      : isTalkmakerTail
        ? 'px-3 py-2'
        : isImessageTail
          ? 'px-4 py-2.5'
          : isWechatTail
            ? 'px-3 py-2.5'
            : 'px-3 py-2'
  const talkmakerTimeLabel =
    isTalkmakerTail && typeof messageTimestampMs === 'number'
      ? formatTalkmakerExternalTime(messageTimestampMs)
      : isTalkmakerTail && variant === 'preview'
        ? '19:40'
        : null
  const telegramTimeLabel =
    isTelegramTail && typeof messageTimestampMs === 'number'
      ? formatTelegramBubbleTime(messageTimestampMs)
      : isTelegramTail && variant === 'preview'
        ? '14:32'
        : null
  const messageBodyVisible = messageText.replace(/\u200b/g, '').trim().length > 0
  const messageBody = messageBodyVisible ? (
    <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      <WeChatChatMixedText
        text={messageText}
        templateFont={useFullStackFont}
        style={sideFontFamilyCss ? { fontFamily: sideFontFamilyCss } : undefined}
      />
      {telegramTimeLabel ? (
        <TelegramBubbleMeta
          isSelf={isSelf}
          timeLabel={telegramTimeLabel}
          showReadChecks={isSelf && telegramShowReadChecks}
        />
      ) : null}
    </span>
  ) : null

  const avatarMotionCls =
    avatarTapMotion && variant === 'chat'
      ? 'cursor-pointer transition-transform duration-150 ease-out active:scale-95'
      : ''

  const bubbleMax = variant === 'chat' ? CHAT_BUBBLE_MAX : PREVIEW_BUBBLE_MAX
  const rowAlign = alignWithAvatarMid ? 'items-center' : 'items-start'
  const selfChatAvatarSrc = variant === 'chat' && isSelf ? chatSelfAvatarUrl?.trim() : ''
  const otherChatAvatarSrc = variant === 'chat' && !isSelf ? chatOtherAvatarUrl?.trim() : ''
  const rankBeside = groupRankShowBesideNickname !== false

  const onLongPress = useCallback(
    () => {
      if (!onBubbleLongPress) return
      const el = contentRef.current
      if (!el) return
      onBubbleLongPress(el.getBoundingClientRect())
    },
    [onBubbleLongPress],
  )

  const { bind } = useWeChatLongPress({
    enabled: variant === 'chat' && !!onBubbleLongPress,
    ms: 500,
    moveThresholdPx: 10,
    onLongPress: () => onLongPress(),
  })

  const translationTrimmed = translationText?.trim() || ''
  const translationFirstChar = translationTrimmed.charAt(0)
  const translationRest = translationTrimmed.slice(1)

  const bubbleSurfaceStyle: CSSProperties = {
    ...(cssSkin || chatBubbleSurfaceStyle?.background
      ? cssSkin
        ? { backgroundColor: 'transparent' }
        : {}
      : bubbleFrame
        ? { backgroundColor: 'transparent' }
        : {
            backgroundColor: variant === 'chat' ? bubbleBgChatResolved : bubbleBgPreview,
          }),
    color: variant === 'chat' ? bubbleTextResolved : bubbleTextPreview,
    borderRadius: translationOpen
      ? `${bubbleRadiusPx}px ${bubbleRadiusPx}px 0 0`
      : bubbleRadius,
    ...(cssSkin
      ? {}
      : isTelegramTail
        ? { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)' }
        : isWechatTail
          ? { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)' }
          : {}),
    ...(sideFontFamilyCss ? { fontFamily: sideFontFamilyCss } : {}),
    userSelect: variant === 'chat' ? 'none' : undefined,
    WebkitUserSelect: variant === 'chat' ? ('none' as any) : undefined,
    WebkitTouchCallout: variant === 'chat' ? ('none' as any) : undefined,
    ...(cssSkin
      ? {}
      : variant === 'chat' && luxuryDark
        ? { border: '1px solid rgba(255,255,255,0.12)' }
        : variant === 'chat' && chatBubbleShowBorder && !chatBubbleSurfaceStyle
          ? { border: `1px solid ${chatBubbleBorderColor}` }
          : {}),
    ...chatBubbleSurfaceStyle,
    // 有边框时底色交给 face 层，防止盖住边框
    ...(bubbleFrame ? { backgroundColor: 'transparent', backgroundImage: 'none' } : null),
  }

  const bubbleFaceStyle: CSSProperties | null = bubbleFrame
    ? {
        borderRadius: translationOpen
          ? `${bubbleRadiusPx}px ${bubbleRadiusPx}px 0 0`
          : bubbleRadius,
        backgroundColor:
          cssSkin || chatBubbleSurfaceStyle?.background
            ? undefined
            : variant === 'chat'
              ? bubbleBgChatResolved
              : bubbleBgPreview,
        ...(chatBubbleSurfaceStyle?.background
          ? {
              background: chatBubbleSurfaceStyle.background as string,
              backgroundImage: chatBubbleSurfaceStyle.backgroundImage as string | undefined,
              backgroundSize: chatBubbleSurfaceStyle.backgroundSize as string | undefined,
              backgroundPosition: chatBubbleSurfaceStyle.backgroundPosition as
                | string
                | undefined,
            }
          : null),
      }
    : null

  const bubbleInner = (
    <>
      {replyPreview ? (
        <ChatBubbleReplyPreview
          preview={replyPreview}
          isSelf={isSelf}
          insetStyle={replyPreviewInsetStyle}
          tailStyle={tailStyle}
        />
      ) : null}
      {messageBodyVisible ? (
        messagePrefixIcon ? (
          <span className="inline-flex items-center gap-1.5 align-middle">
            <span className="inline-flex shrink-0">{messagePrefixIcon}</span>
            {messageBody}
          </span>
        ) : (
          messageBody
        )
      ) : null}
      {variant === 'chat' && bubbleSelected ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: bubbleRadius,
            background: 'rgba(0,0,0,0.08)',
          }}
          aria-hidden
        />
      ) : null}
    </>
  )

  const bubbleTailColor =
    variant === 'preview' ? bubbleBgPreview : solidChatBg ? solidChatBg : isSelf ? bubble.selfBubbleBg : bubble.otherBubbleBg

  const translationPanelClassName = isSelf
    ? 'border-[#7ed957] bg-[var(--wx-self-bubble-bg,#95EC69)] text-[#191919]'
    : 'border-[#ececec] bg-[var(--wx-other-bubble-bg,#ffffff)] text-[#191919]'

  const translationPanel = hasTranslation ? (
    <AnimatePresence initial={false}>
      {translationOpen ? (
        <motion.div
          key="wx-text-translation-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className={`w-fit max-w-full overflow-hidden border border-t-0 ${translationPanelClassName}`}
          style={{
            borderWidth: 0.5,
            borderBottomLeftRadius: bubbleRadiusPx,
            borderBottomRightRadius: bubbleRadiusPx,
          }}
        >
          <div className="border-t border-dashed border-black/10 px-3 py-2.5 text-[13px] leading-[1.7] break-words">
            {translationFirstChar ? (
              <span className="mr-[1px] text-[17px] leading-none text-[#191919]">{translationFirstChar}</span>
            ) : null}
            <span>{translationRest}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  ) : null

  const translationToggleBtn = hasTranslation ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onTranslationToggle?.()
      }}
      className="shrink-0 self-center rounded bg-[#E5E5E5] px-2 py-0.5 text-[12px] text-gray-600 active:opacity-70"
    >
      翻译
    </button>
  ) : null

  const bubbleBlock = (
    <div
      data-wx-bubble-side={isSelf ? 'self' : 'other'}
      data-wx-msg-kind="text"
      className={`relative min-w-0 ${bubbleMax} ${
        isAltMessengerTail ? (isSelf ? 'mr-3' : 'ml-3') : ''
      }`}
    >
      {isImessageTail && showTail ? null : (isTelegramTail || isTalkmakerTail) && showTail ? (
        <TelegramBubbleTail isSelf={isSelf} bubbleColor={bubbleTailColor} />
      ) : isWechatTail && showTail ? null : !isAltMessengerTail ? (
        <BubbleMessageTail
          isSelf={isSelf}
          show={showTail}
          tailMode={tailMode}
          avatarMidlinePx={avatarPx / 2}
          color={variant === 'preview' ? bubbleBgPreview : solidChatBg ? solidChatBg : undefined}
        />
      ) : null}
      <div className={`inline-flex max-w-full ${isSelf ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-start gap-1.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex min-w-0 flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
            {variant === 'chat' ? (
              <div className="relative inline-block max-w-full overflow-visible">
                {isWechatTail && showTail ? (
                  <WechatBubbleTail isSelf={isSelf} bubbleColor={bubbleTailColor} />
                ) : null}
                {isImessageTail && showTail ? (
                  <ImessageBubbleTail isSelf={isSelf} bubbleColor={bubbleTailColor} />
                ) : null}
                <motion.div
                  ref={contentRef}
                  data-wx-bubble-content
                  className={`relative z-[1] inline-block max-w-full overflow-visible ${bubblePadCls} leading-[1.4] select-none ${textCls} ${bubbleContentClassName}`}
                  style={{
                    ...bubbleSurfaceStyle,
                    ...chatBubbleTransformOrigin(isSelf, tailStyle),
                  }}
                  initial={bubbleEnterInitial}
                  animate={bubbleEnterAnimate}
                  transition={bubbleEnterSpring}
                  whileTap={onBubbleLongPress ? { scale: 0.97, opacity: 0.92 } : undefined}
                  {...bind}
                >
                  {/* 图层：气泡底(face) < 边框 < 贴纸 < 文字 */}
                  {bubbleFaceStyle ? <BubbleFaceLayer style={bubbleFaceStyle} /> : null}
                  <BubbleFrameLayer frame={bubbleFrame} />
                  <BubbleEdgeStickers stickers={edgeStickers} />
                  <span data-wx-bubble-text="" className="relative z-[3]">
                    {bubbleInner}
                  </span>
                </motion.div>
                {showBubbleBadge ? (
                  <span data-wx-bubble-badge={isSelf ? 'self' : 'other'} aria-hidden>
                    {bubbleBadge!.text}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="relative inline-block max-w-full overflow-visible">
                {isWechatTail && showTail ? (
                  <WechatBubbleTail isSelf={isSelf} bubbleColor={bubbleTailColor} />
                ) : null}
                {isImessageTail && showTail ? (
                  <ImessageBubbleTail isSelf={isSelf} bubbleColor={bubbleTailColor} />
                ) : null}
                <div
                  ref={contentRef}
                  data-wx-bubble-content
                  className={`relative z-[1] inline-block max-w-full overflow-visible ${bubblePadCls} leading-[1.4] select-none transition-[transform,opacity,background-color] duration-150 ease-out ${textCls} ${bubbleContentClassName}`}
                  style={bubbleSurfaceStyle}
                >
                  {bubbleFaceStyle ? <BubbleFaceLayer style={bubbleFaceStyle} /> : null}
                  <BubbleFrameLayer frame={bubbleFrame} />
                  <BubbleEdgeStickers stickers={edgeStickers} />
                  <span data-wx-bubble-text="" className="relative z-[3]">
                    {bubbleInner}
                  </span>
                </div>
                {showBubbleBadge ? (
                  <span data-wx-bubble-badge={isSelf ? 'self' : 'other'} aria-hidden>
                    {bubbleBadge!.text}
                  </span>
                ) : null}
              </div>
            )}
            {translationPanel}
          </div>
          {translationToggleBtn}
        </div>
      </div>
      {variant === 'chat' && isSelf ? chatBubbleOverlay : null}
    </div>
  )

  const renderedBubble =
    variant === 'chat' && isTalkmakerTail && talkmakerTimeLabel ? (
      <div className={`flex max-w-full items-end gap-1 ${isSelf ? 'justify-end' : ''}`}>
        {isSelf ? <TalkmakerExternalTimestamp timeLabel={talkmakerTimeLabel} /> : null}
        {bubbleBlock}
        {!isSelf ? <TalkmakerExternalTimestamp timeLabel={talkmakerTimeLabel} /> : null}
      </div>
    ) : (
      bubbleBlock
    )

  if (variant === 'chat') {
    if (!isSelf) {
      return (
        <div className={`w-full max-w-full shrink-0 overflow-visible ${rowClassName}`}>
          {!showAvatar && !multiSelectAvatar ? (
            <div className="ml-[24px] mr-auto min-w-0">{renderedBubble}</div>
          ) : showAvatarVisual || multiSelectAvatar ? (
            <div
              className={`ml-[24px] mr-auto flex max-w-full flex-row gap-[12px] ${
                !multiSelectAvatar && (chatOtherSenderNickname?.trim() || (rankBeside && chatOtherAvatarRankBadge))
                  ? 'items-start'
                  : rowAlign
              }`}
            >
              {composeMultiSelectLeading(
                multiSelectAvatar,
                rankBeside || !chatOtherAvatarRankBadge ? (
                <WeChatAvatarChromeWrap side="other">
                {otherChatAvatarSrc ? (
                  <img
                    src={otherChatAvatarSrc}
                    alt=""
                    width={avatarPx}
                    height={avatarPx}
                    className={`h-10 w-10 shrink-0 object-cover ${avatarMotionCls}`}
                    style={{
                      borderRadius: `${bubble.avatarRadiusPx}px`,
                      border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                    }}
                    onClick={onOtherAvatarClick}
                    aria-hidden
                  />
                ) : (
                  <div
                    className={`h-10 w-10 shrink-0 ${avatarMotionCls}`}
                    style={{
                      borderRadius: `${bubble.avatarRadiusPx}px`,
                      background: 'rgba(0,0,0,0.06)',
                      border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                    }}
                    onClick={onOtherAvatarClick}
                    aria-hidden
                  />
                )}
                </WeChatAvatarChromeWrap>
              ) : (
                <ChatGroupSpeakerRankOnAvatar chromeSide="other" rankBadge={chatOtherAvatarRankBadge}>
                  {otherChatAvatarSrc ? (
                    <img
                      src={otherChatAvatarSrc}
                      alt=""
                      width={avatarPx}
                      height={avatarPx}
                      className={`h-10 w-10 shrink-0 object-cover ${avatarMotionCls}`}
                      style={{
                        borderRadius: `${bubble.avatarRadiusPx}px`,
                        border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                      }}
                      onClick={onOtherAvatarClick}
                      aria-hidden
                    />
                  ) : (
                    <div
                      className={`h-10 w-10 shrink-0 ${avatarMotionCls}`}
                      style={{
                        borderRadius: `${bubble.avatarRadiusPx}px`,
                        background: 'rgba(0,0,0,0.06)',
                        border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                      }}
                      onClick={onOtherAvatarClick}
                      aria-hidden
                    />
                  )}
                </ChatGroupSpeakerRankOnAvatar>
              ),
              showAvatarColumn,
              )}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                {!multiSelectAvatar && rankBeside ? (
                  <ChatGroupSenderNicknameWithRank nickname={chatOtherSenderNickname} rankBadge={chatOtherAvatarRankBadge ?? null} />
                ) : !multiSelectAvatar && chatOtherSenderNickname?.trim() ? (
                  <span
                    className={`max-w-[min(200px,calc(100vw-24px-24px-40px-12px))] truncate leading-snug ${
                      isTalkmakerTail ? 'text-xs text-gray-700' : 'text-[11px]'
                    }`}
                    style={{ color: isTalkmakerTail ? '#555555' : 'var(--wx-text-muted, #888)' }}
                  >
                    {chatOtherSenderNickname.trim()}
                  </span>
                ) : null}
                {renderedBubble}
              </div>
            </div>
          ) : reserveAvatarGutter ? (
            <div className={`ml-[24px] mr-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
              {composeMultiSelectLeading(
                multiSelectAvatar,
                rankBeside || !chatOtherAvatarRankBadge ? (
                  <WeChatAvatarSizeGutter side="other" />
                ) : (
                  <ChatGroupSpeakerRankOnAvatar chromeSide="other" rankBadge={chatOtherAvatarRankBadge}>
                    <div className="h-10 w-10 shrink-0" aria-hidden />
                  </ChatGroupSpeakerRankOnAvatar>
                ),
              showAvatarColumn,
              )}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                {!multiSelectAvatar && rankBeside ? (
                  <ChatGroupSenderNicknameWithRank nickname={chatOtherSenderNickname} rankBadge={chatOtherAvatarRankBadge ?? null} />
                ) : null}
                {renderedBubble}
              </div>
            </div>
          ) : (
            <div className="ml-[24px] mr-auto min-w-0">{renderedBubble}</div>
          )}
        </div>
      )
    }

    if (isTalkmakerTail) {
      return (
        <div
          className={`flex w-full max-w-full shrink-0 items-end justify-end gap-[4px] overflow-visible ${rowClassName}`}
        >
          {chatAccessory}
          <div className="mr-[24px] ml-auto min-w-0">{renderedBubble}</div>
        </div>
      )
    }

    return (
      <div
        className={`flex w-full max-w-full shrink-0 items-end justify-end gap-[4px] overflow-visible ${rowClassName}`}
      >
        {chatAccessory}
        {!showAvatar && !multiSelectAvatar ? (
          <div className="mr-[24px] ml-auto min-w-0">{bubbleBlock}</div>
        ) : showAvatarVisual || multiSelectAvatar ? (
          <div className={`mr-[24px] ml-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
            {bubbleBlock}
            {composeMultiSelectLeading(
              multiSelectAvatar,
              rankBeside || !chatSelfAvatarRankBadge ? (
              <WeChatAvatarChromeWrap side="self">
              {selfChatAvatarSrc ? (
                <img
                  src={selfChatAvatarSrc}
                  alt=""
                  width={avatarPx}
                  height={avatarPx}
                  className="h-10 w-10 shrink-0 object-cover"
                  style={{
                    borderRadius: `${bubble.avatarRadiusPx}px`,
                    border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                  }}
                  aria-hidden
                />
              ) : (
                <div
                  className="h-10 w-10 shrink-0"
                  style={{
                    borderRadius: `${bubble.avatarRadiusPx}px`,
                    background: 'rgba(0,0,0,0.04)',
                  }}
                  aria-hidden
                />
              )}
              </WeChatAvatarChromeWrap>
            ) : (
              <ChatGroupSpeakerRankOnAvatar chromeSide="self" rankBadge={chatSelfAvatarRankBadge}>
                {selfChatAvatarSrc ? (
                  <img
                    src={selfChatAvatarSrc}
                    alt=""
                    width={avatarPx}
                    height={avatarPx}
                    className="h-10 w-10 shrink-0 object-cover"
                    style={{
                      borderRadius: `${bubble.avatarRadiusPx}px`,
                      border: '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)',
                    }}
                    aria-hidden
                  />
                ) : (
                  <div
                    className="h-10 w-10 shrink-0"
                    style={{
                      borderRadius: `${bubble.avatarRadiusPx}px`,
                      background: 'rgba(0,0,0,0.04)',
                    }}
                    aria-hidden
                  />
                )}
              </ChatGroupSpeakerRankOnAvatar>
                ),
              showAvatarColumn,
              )}
          </div>
        ) : reserveAvatarGutter ? (
          <div className={`mr-[24px] ml-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
            {bubbleBlock}
            {composeMultiSelectLeading(
              multiSelectAvatar,
              rankBeside || !chatSelfAvatarRankBadge ? (
                <WeChatAvatarSizeGutter side="self" />
              ) : (
                <ChatGroupSpeakerRankOnAvatar chromeSide="self" rankBadge={chatSelfAvatarRankBadge}>
                  <div className="h-10 w-10 shrink-0" aria-hidden />
                </ChatGroupSpeakerRankOnAvatar>
                ),
              showAvatarColumn,
              )}
          </div>
        ) : (
          <div className="mr-[24px] ml-auto min-w-0">{bubbleBlock}</div>
        )}
      </div>
    )
  }

  /* ---------- preview（主题面板）：与聊天相同像素规则，宽度随容器 ---------- */
  if (!isSelf) {
    return (
      <div className={`w-full max-w-full shrink-0 overflow-x-hidden ${rowClassName}`}>
        {!showAvatar ? (
          <div className="ml-[24px] mr-auto min-w-0">{bubbleBlock}</div>
        ) : showAvatarVisual ? (
          <div className={`ml-[24px] mr-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
            <WeChatAvatarChromeWrap side="other">
            <div
              className="h-10 w-10 shrink-0"
              style={{
                borderRadius: `${bubble.avatarRadiusPx}px`,
                background: 'rgba(0,0,0,0.06)',
              }}
              aria-hidden
            />
            </WeChatAvatarChromeWrap>
            {bubbleBlock}
          </div>
        ) : reserveAvatarGutter ? (
          <div className={`ml-[24px] mr-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
            <WeChatAvatarSizeGutter side="other" />
            {bubbleBlock}
          </div>
        ) : (
          <div className="ml-[24px] mr-auto min-w-0">{bubbleBlock}</div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex w-full max-w-full shrink-0 items-end justify-end overflow-x-hidden ${rowClassName}`}>
      {!showAvatar ? (
        <div className="mr-[24px] ml-auto min-w-0">{bubbleBlock}</div>
      ) : showAvatarVisual ? (
        <div className={`mr-[24px] ml-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
          {bubbleBlock}
          <WeChatAvatarChromeWrap side="self">
          <div
            className="h-10 w-10 shrink-0"
            style={{
              borderRadius: `${bubble.avatarRadiusPx}px`,
              background: 'rgba(0,0,0,0.04)',
            }}
            aria-hidden
          />
          </WeChatAvatarChromeWrap>
        </div>
      ) : reserveAvatarGutter ? (
        <div className={`mr-[24px] ml-auto flex max-w-full flex-row ${rowAlign} gap-[12px]`}>
          {bubbleBlock}
          <WeChatAvatarSizeGutter side="self" />
        </div>
      ) : (
        <div className="mr-[24px] ml-auto min-w-0">{bubbleBlock}</div>
      )}
    </div>
  )
}
