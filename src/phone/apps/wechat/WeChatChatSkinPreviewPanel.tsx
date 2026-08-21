import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Activity, MoreHorizontal } from 'lucide-react'

import type { WeChatBubbleTheme, WeChatTheme } from '../../types'
import type { ChatTheme } from './chatTheme/types'
import { LocationChatRow } from './location/LocationChatRow'
import { WeChatMessageBubbleRow } from './WeChatMessageBubbleRow'
import { RedPacketChatRow } from './redPacket/RedPacketChatRow'
import { TransferBubbleFace } from './transfer/TransferBubble'
import { VoiceMessageBubble } from './VoiceMessageBubble'
import { ChatInputBar } from './voiceInput/ChatInputBar'
import {
  migrateMislabeledLumiDefaultBubble,
  resolveEffectiveChatInputBarForBubble,
} from './wechatBubblePresets'
import { chatDisplayFontCssVars, resolveChatDisplayFontFamily } from './wechatBubbleTemplateFonts'
import {
  chatBubbleSideFontCssVars,
  ensureWeChatBubbleSideFontsLoaded,
} from './wechatBubbleSideFonts'
import { resolveMessengerBubbleStyle } from './wechatMessengerSpecialBubbles'
import { weChatChatSkinCssProperties } from './wechatChatSkinVars'
import { wrapWeChatChatSkinScopedCss } from './bubblePack/scopedCss'
import { WeChatAvatarChromeProvider, WeChatAvatarChromeWrap } from './WeChatAvatarChromeWrap'
import { WeChatChatSkinEngineProvider } from './WeChatChatSkinEngineContext'
import './wechatChatSkinScope.css'

const SAMPLE_LOCATION = {
  locationId: 'skin-preview-location',
  name: '中央公园',
  address: '示例路 88 号',
  distance: '320m',
  latitude: 0,
  longitude: 0,
}

type Props = {
  wechatTheme: WeChatTheme
  chatTheme: ChatTheme
  bubble: WeChatBubbleTheme
  roomBgStyle?: CSSProperties
  tailMaskColor?: string
}

function previewBubbleTail(
  bubble: WeChatBubbleTheme,
  groupPosition: 'first' | 'last' | 'only',
): boolean {
  if (!bubble.showBubbleTail) return false
  const tailStyle = bubble.bubbleTailStyle
  if (tailStyle === 'imessage') {
    return groupPosition === 'last' || groupPosition === 'only'
  }
  if (tailStyle === 'telegram' || tailStyle === 'talkmaker') {
    return groupPosition === 'first' || groupPosition === 'only'
  }
  // 微信 App / 外观工坊几何尖角：按 showBubbleTail，不绑头像
  if (tailStyle === 'wechat' || !tailStyle) {
    return true
  }
  return bubble.showBubbleTail && bubble.showAvatar
}

function PreviewChatMessageRow({
  isSelf,
  bubble,
  showAvatarColumn = true,
  children,
}: {
  isSelf: boolean
  bubble: WeChatBubbleTheme
  showAvatarColumn?: boolean
  children: ReactNode
}) {
  const showAvatarVisual = bubble.showAvatar && showAvatarColumn
  const reserveAvatarGutter = bubble.showAvatar
  const avatarPlaceholder = (
    <WeChatAvatarChromeWrap side={isSelf ? 'self' : 'other'}>
      <div
        className="h-10 w-10 shrink-0"
        style={{
          borderRadius: `${bubble.avatarRadiusPx}px`,
          background: isSelf ? '#E5E5E5' : '#D4D4D4',
        }}
        aria-hidden
      />
    </WeChatAvatarChromeWrap>
  )

  if (!isSelf) {
    return (
      <div className="w-full max-w-full shrink-0 overflow-x-hidden">
        {!bubble.showAvatar ? (
          <div className="ml-[24px] mr-auto min-w-0">{children}</div>
        ) : showAvatarVisual ? (
          <div className="ml-[24px] mr-auto flex max-w-full flex-row items-start gap-[12px]">
            {avatarPlaceholder}
            {children}
          </div>
        ) : reserveAvatarGutter ? (
          <div className="ml-[24px] mr-auto flex max-w-full flex-row items-start gap-[12px]">
            <div className="h-10 w-10 shrink-0" aria-hidden />
            {children}
          </div>
        ) : (
          <div className="ml-[24px] mr-auto min-w-0">{children}</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-full shrink-0 items-end justify-end overflow-x-hidden">
      {!bubble.showAvatar ? (
        <div className="mr-[24px] ml-auto min-w-0">{children}</div>
      ) : showAvatarVisual ? (
        <div className="mr-[24px] ml-auto flex max-w-full flex-row items-start gap-[12px]">
          {children}
          {avatarPlaceholder}
        </div>
      ) : reserveAvatarGutter ? (
        <div className="mr-[24px] ml-auto flex max-w-full flex-row items-start gap-[12px]">
          {children}
          <div className="h-10 w-10 shrink-0" aria-hidden />
        </div>
      ) : (
        <div className="mr-[24px] ml-auto min-w-0">{children}</div>
      )}
    </div>
  )
}

/** 聊天气泡页统一预览：顶栏 + 文字/连续气泡 + 特殊消息 + 输入栏（与当前气泡模版一致） */
export function WeChatChatSkinPreviewPanel({
  wechatTheme,
  chatTheme,
  bubble,
  roomBgStyle,
  tailMaskColor = '#EDEDED',
}: Props) {
  const textareaRef = useRef<HTMLDivElement>(null)
  const effectiveBubble = useMemo(() => migrateMislabeledLumiDefaultBubble(bubble), [bubble])
  const inputBar = useMemo(
    () => resolveEffectiveChatInputBarForBubble(chatTheme.inputBar, effectiveBubble, wechatTheme),
    [chatTheme.inputBar, effectiveBubble, wechatTheme],
  )
  const previewChatTheme = useMemo(
    () => ({ ...chatTheme, inputBar }),
    [chatTheme, inputBar],
  )
  const messengerStyle = resolveMessengerBubbleStyle(effectiveBubble, wechatTheme.chatSkinEngine)
  const inputLayout = inputBar.layout ?? 'lumi'
  const mergeAvatarGroup =
    effectiveBubble.bubbleTailStyle === 'wechat' ? false : effectiveBubble.mergeConsecutiveAvatarGroup

  const bubbleTail = useCallback(
    (groupPosition: 'first' | 'last' | 'only') => previewBubbleTail(effectiveBubble, groupPosition),
    [effectiveBubble],
  )

  const scopeStyle: CSSProperties = {
    ...roomBgStyle,
    ...chatDisplayFontCssVars(resolveChatDisplayFontFamily(effectiveBubble)),
    ...chatBubbleSideFontCssVars(effectiveBubble),
    ...weChatChatSkinCssProperties(wechatTheme, previewChatTheme),
    '--wx-self-bubble-bg': effectiveBubble.selfBubbleBg,
    '--wx-self-bubble-text': wechatTheme.selfBubbleText,
    '--wx-self-bubble-radius': `${effectiveBubble.selfBubbleRadiusPx}px`,
    '--wx-other-bubble-bg': effectiveBubble.otherBubbleBg,
    '--wx-other-bubble-text': wechatTheme.otherBubbleText,
    '--wx-other-bubble-radius': `${effectiveBubble.otherBubbleRadiusPx}px`,
    '--wx-avatar-radius': `${effectiveBubble.avatarRadiusPx}px`,
    '--wx-timestamp-text': wechatTheme.timestampText,
  } as CSSProperties

  useEffect(() => {
    void ensureWeChatBubbleSideFontsLoaded(effectiveBubble)
  }, [
    effectiveBubble.selfFont?.id,
    effectiveBubble.selfFont?.family,
    effectiveBubble.otherFont?.id,
    effectiveBubble.otherFont?.family,
  ])

  return (
    <WeChatChatSkinEngineProvider engine={wechatTheme.chatSkinEngine}>
    <WeChatAvatarChromeProvider chrome={wechatTheme.avatarChrome}>
    <div
      data-wx-chat-skin-scope
      className="mt-3 overflow-hidden rounded-[14px] border border-black/5 shadow-sm"
      style={scopeStyle}
    >
      {wechatTheme.chatSkinScopedCss?.trim() ? (
        <style
          dangerouslySetInnerHTML={{
            __html: wrapWeChatChatSkinScopedCss(wechatTheme.chatSkinScopedCss),
          }}
        />
      ) : null}
      <header
        data-wx-chat-header
        className="relative shrink-0 overflow-hidden border-b"
        style={{
          height: 'var(--wx-chat-header-height, 56px)',
          minHeight: 'var(--wx-chat-header-height, 56px)',
          maxHeight: 'var(--wx-chat-header-height, none)',
          boxSizing: 'border-box',
          borderColor: 'var(--wx-chat-header-border, var(--wx-border))',
          backgroundColor: 'var(--wx-chat-header-bg, var(--wx-surface))',
          color: 'var(--wx-chat-header-text, var(--wx-text))',
        }}
      >
        <div
          aria-hidden
          data-wx-chat-header-surface="image"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: 'var(--wx-chat-header-bg-image, none)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(var(--wx-chat-header-bg-image-blur, 0px))',
            transform: 'scale(1.12)',
          }}
        />
        <div
          aria-hidden
          data-wx-chat-header-surface="overlay"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundColor: 'var(--wx-chat-header-bg-overlay, transparent)',
            opacity: 'var(--wx-chat-header-bg-overlay-opacity, 0)',
          }}
        />
        {/*
          与外观工坊 LivePreview 同构：顶栏元素均为相对 header 的绝对定位。
          皮肤 scopedCss（!important）会覆盖下方 fallback 坐标。
        */}
        <div
          data-wx-chat-header-title-wrap
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden
        />
        <span
          data-wx-chat-header-btn="back"
          className="absolute z-20 flex items-center justify-center rounded-full"
          style={{
            left: '7%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            color: 'var(--wx-chat-header-btn, var(--wx-chat-header-text, var(--wx-text)))',
          }}
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </span>
        <span
          data-wx-chat-header-btn="time"
          className="absolute z-20 flex items-center justify-center rounded-full"
          style={{
            left: '18%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            color: 'var(--wx-chat-header-btn, var(--wx-chat-header-text, var(--wx-text)))',
          }}
          aria-label="线上时间设置"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span
          data-wx-chat-header-avatar
          className="absolute z-[21] inline-flex items-center justify-center overflow-hidden"
          style={{
            left: '36%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            display: 'var(--wx-chat-header-avatar-display, flex)',
            width: 'var(--wx-chat-header-avatar-size, 28px)',
            height: 'var(--wx-chat-header-avatar-size, 28px)',
            borderRadius: 'var(--wx-chat-header-avatar-radius, 14px)',
            background: '#9ca3af',
            color: '#fff',
            fontSize: 9,
            fontWeight: 500,
            lineHeight: 1,
          }}
          aria-hidden
        >
          头像
        </span>
        <h1
          data-wx-chat-header-title
          className="absolute z-30 max-w-[70%] truncate text-center text-[17px] font-semibold tracking-[0.2px]"
          style={{
            left: '50%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            color: 'var(--wx-chat-header-text, var(--wx-text))',
          }}
        >
          预览对象
        </h1>
        <p
          data-wx-chat-header-sub
          className="absolute z-30 max-w-[70%] truncate text-center text-[11px] font-normal"
          style={{
            left: '50%',
            top: '68%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            color: 'var(--wx-chat-header-muted, var(--wx-text-muted))',
          }}
        >
          {(wechatTheme.chatSkinOverrides?.['--wx-chat-header-typing-text'] ?? '').trim() ||
            '对方正在输入…'}
        </p>
        <span
          data-wx-chat-header-btn="psyche"
          className="absolute z-20 flex items-center justify-center rounded-full"
          style={{
            left: '82%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            color: 'var(--wx-chat-header-btn, var(--wx-chat-header-text, var(--wx-text)))',
          }}
          aria-label="体征与心理监测"
        >
          <Activity size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <span
          data-wx-chat-header-btn="more"
          className="absolute z-20 flex items-center justify-center rounded-full"
          style={{
            left: '93%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            color: 'var(--wx-chat-header-btn, var(--wx-chat-header-text, var(--wx-text)))',
          }}
          aria-label="当前聊天设置"
        >
          <MoreHorizontal size={22} strokeWidth={2} aria-hidden />
        </span>
      </header>

      <div className="space-y-3 px-2 py-3">
        <p className="text-center text-[10px] leading-snug" style={{ color: 'var(--wx-text-muted)' }}>
          预览区与当前选中的气泡模版一致；切换模版或调整颜色后可即时查看。
        </p>

        {wechatTheme.timestampStyle === 'hidden' ? null : (
          <div className="flex justify-center">
            <span
              className="rounded-full px-3 py-1 text-[12px]"
              style={{
                color: 'var(--wx-timestamp-text)',
                background: 'rgba(0,0,0,0.03)',
                lineHeight: 1.1,
                fontFamily: 'var(--wx-chat-font, var(--wx-font))',
              }}
            >
              <span style={{ fontFamily: 'var(--wx-chat-font, var(--wx-font))' }}>今天&nbsp;</span>
              <span
                style={{
                  fontFamily: 'var(--wx-num-font)',
                  fontVariantNumeric: 'tabular-nums lining-nums',
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                  display: 'inline-block',
                }}
              >
                09:41
              </span>
            </span>
          </div>
        )}

        <p className="pt-1 text-center text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
          文字气泡
        </p>
        <WeChatMessageBubbleRow
          messageText="这是对方气泡预览：低饱和、留白、干净。"
          isSelf={false}
          bubble={effectiveBubble}
          showAvatar={effectiveBubble.showAvatar}
          showBubbleTail={bubbleTail('first')}
          variant="preview"
          showAvatarColumn
          bubbleTailMaskColor={tailMaskColor}
        />
        <WeChatMessageBubbleRow
          messageText={
            mergeAvatarGroup && effectiveBubble.showAvatar
              ? '连续对方消息：本行无头像，左侧占位与首条气泡对齐。'
              : '连续对方消息：每条均显示头像。'
          }
          isSelf={false}
          bubble={effectiveBubble}
          showAvatar={effectiveBubble.showAvatar}
          showBubbleTail={bubbleTail('last')}
          variant="preview"
          showAvatarColumn={!(mergeAvatarGroup && effectiveBubble.showAvatar)}
          bubbleTailMaskColor={tailMaskColor}
        />
        {mergeAvatarGroup && effectiveBubble.showAvatar ? (
          <>
            <WeChatMessageBubbleRow
              messageText="这是我方气泡预览：主色弱点缀，圆角克制。（同组首条右侧带头像）"
              isSelf
              bubble={effectiveBubble}
              showAvatar={effectiveBubble.showAvatar}
              showBubbleTail={bubbleTail('first')}
              variant="preview"
              showAvatarColumn
              bubbleTailMaskColor={tailMaskColor}
            />
            <WeChatMessageBubbleRow
              messageText="连续我方消息：本行无头像，右侧占位与首条气泡对齐。"
              isSelf
              bubble={effectiveBubble}
              showAvatar={effectiveBubble.showAvatar}
              showBubbleTail={bubbleTail('last')}
              variant="preview"
              showAvatarColumn={false}
              bubbleTailMaskColor={tailMaskColor}
            />
          </>
        ) : (
          <>
            <WeChatMessageBubbleRow
              messageText="这是我方气泡预览：主色弱点缀，圆角克制。"
              isSelf
              bubble={effectiveBubble}
              showAvatar={effectiveBubble.showAvatar}
              showBubbleTail={bubbleTail('first')}
              variant="preview"
              showAvatarColumn
              bubbleTailMaskColor={tailMaskColor}
            />
            <WeChatMessageBubbleRow
              messageText="连续我方消息：每条均显示头像。"
              isSelf
              bubble={effectiveBubble}
              showAvatar={effectiveBubble.showAvatar}
              showBubbleTail={bubbleTail('last')}
              variant="preview"
              showAvatarColumn
              bubbleTailMaskColor={tailMaskColor}
            />
          </>
        )}

        <p className="pt-1 text-center text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
          特殊消息
        </p>
        <RedPacketChatRow
          id="skin-preview-rp"
          isSelf={false}
          data={{ remark: 'Best Wishes', opened: false, amountYuan: 88 }}
          bubble={effectiveBubble}
          showAvatar={effectiveBubble.showAvatar}
          showAvatarColumn
          onOpen={() => {}}
        />
        <PreviewChatMessageRow isSelf={false} bubble={effectiveBubble}>
          <TransferBubbleFace
            messengerStyle={messengerStyle}
            status="pending"
            amountYuan={520}
            remark="示例转账"
            perspective="incoming"
          />
        </PreviewChatMessageRow>
        <PreviewChatMessageRow isSelf={false} bubble={effectiveBubble}>
          <VoiceMessageBubble
            isUser={false}
            duration={8}
            audioUrl=""
            transcriptText="对方语音转写预览"
            messengerStyle={messengerStyle}
            bubble={effectiveBubble}
            showBubbleTail={bubbleTail('only')}
            bubbleTailMaskColor={tailMaskColor}
          />
        </PreviewChatMessageRow>
        <PreviewChatMessageRow isSelf bubble={effectiveBubble}>
          <VoiceMessageBubble
            isUser
            duration={12}
            audioUrl=""
            transcriptText="己方语音转写预览"
            messengerStyle={messengerStyle}
            bubble={effectiveBubble}
            showBubbleTail={bubbleTail('only')}
            bubbleTailMaskColor={tailMaskColor}
          />
        </PreviewChatMessageRow>
        <LocationChatRow
          id="skin-preview-loc-other"
          isSelf={false}
          data={SAMPLE_LOCATION}
          bubble={effectiveBubble}
          showAvatar={effectiveBubble.showAvatar}
          showAvatarColumn
          showBubbleTail={bubbleTail('only')}
          bubbleTailMaskColor={tailMaskColor}
          variant="preview"
        />
        <LocationChatRow
          id="skin-preview-loc-self"
          isSelf
          data={SAMPLE_LOCATION}
          bubble={effectiveBubble}
          showAvatar={effectiveBubble.showAvatar}
          showAvatarColumn
          showBubbleTail={bubbleTail('only')}
          bubbleTailMaskColor={tailMaskColor}
          variant="preview"
        />
      </div>

      <div
        data-wx-chat-input-bar
        className="border-t px-2 py-2"
        style={{
          backgroundColor: 'var(--wx-chat-input-bar-bg, var(--wx-input-bg))',
          backgroundImage: 'var(--wx-chat-input-bar-bg-image, none)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderTopColor: 'var(--wx-chat-input-bar-border, #e5e5e5)',
        }}
      >
        <p className="mb-1.5 text-center text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
          输入栏
        </p>
        <ChatInputBar
          inputMode="text"
          btnPx={inputBar.buttonSize}
          btnColor={inputBar.buttonColor}
          layout={inputLayout}
          sendButtonColor={inputBar.sendButtonColor}
          borderRadius={inputBar.borderRadius}
          borderColor={inputBar.borderColor}
          backgroundColor={inputBar.backgroundColor}
          draft=""
          sendBusy={false}
          planeCanAct={false}
          plusMenuOpen={false}
          onToggleInputMode={() => {}}
          textareaRef={textareaRef}
          onVoicePointerDown={() => {}}
          onVoicePointerMove={() => {}}
          onVoicePointerUp={() => {}}
          onDraftChange={() => {}}
          onComposerKeyDown={() => {}}
          onToggleEmoji={() => {}}
          onTogglePlus={() => {}}
          onSend={() => {}}
        />
      </div>
    </div>
    </WeChatAvatarChromeProvider>
    </WeChatChatSkinEngineProvider>
  )
}
