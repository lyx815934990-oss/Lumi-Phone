import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { Keyboard, Mic, Paperclip, Plus, Smile } from 'lucide-react'
import { motion } from 'framer-motion'
import { Pressable } from '../../../components/Pressable'
import { wechatChatComposerFontStyle } from '../WeChatChatMixedText'
import { WeChatComposerField, WECHAT_COMPOSER_LINE_HEIGHT_PX, WECHAT_COMPOSER_MAX_HEIGHT_PX } from '../WeChatComposerField'
import { publicAssetUrl } from '../../../../publicAssetUrl'

const COMPOSER_ROW_CLASS = 'flex min-h-[36px] min-w-0 flex-1 items-center'
const COMPOSER_SIDE_BTN_CLASS = 'flex h-7 w-7 shrink-0 items-center justify-center text-[#8E8E93]'
const COMPOSER_TEXT_CLASS =
  'min-h-[24px] min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-6 outline-none placeholder:text-[#8E8E93]'
const COMPOSER_HOLD_CLASS =
  'select-none flex min-h-[24px] min-w-0 flex-1 items-center justify-start bg-transparent text-[16px] leading-6 text-[#8E8E93]'

function SendPlaneIcon({ color }: { color?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function resolveSendButtonColor(
  layout: 'wechat' | 'imessage' | 'telegram' | 'talkmaker' | 'twitter',
  sendButtonColor?: string,
): string {
  const custom = sendButtonColor?.trim()
  if (custom) return custom
  if (layout === 'imessage') return '#0B93F6'
  if (layout === 'telegram') return '#3390EC'
  if (layout === 'talkmaker') return '#FEE500'
  if (layout === 'twitter') return '#1D9BF0'
  return '#07C160'
}

function composerTextareaStyle(maxHeight = WECHAT_COMPOSER_MAX_HEIGHT_PX): CSSProperties {
  return {
    color: 'var(--wx-text)',
    maxHeight,
    ...wechatChatComposerFontStyle,
  }
}

function ImessageSendIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19V5m0 0l-6 6m6-6l6 6"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TelegramSendIcon() {
  return (
    <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

/** 微信 App 输入栏：语音 / 表情用主题贴图；加号 / 键盘仍为矢量 */
/** 贴图墨色约 #1D1D1F；已去浅灰底，改用 currentColor 与输入栏按钮色统一 */
const WECHAT_THEME_VOICE_BTN_URL = publicAssetUrl('/image/微信主题语音按钮.png')
const WECHAT_THEME_EMOJI_BTN_URL = publicAssetUrl('/image/微信主题表情按钮.png')
const WECHAT_THEME_KEYBOARD_BTN_URL = publicAssetUrl('/image/微信主题键盘按钮.png')

/** 微信主题输入栏贴图：mask + currentColor，夜间/日间跟随 --wx-chat-input-btn-color */
function WechatThemeAssetIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none block h-11 w-11 shrink-0 select-none"
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}

function WechatCircleVoiceIcon() {
  return <WechatThemeAssetIcon src={WECHAT_THEME_VOICE_BTN_URL} />
}

function WechatCircleSmileIcon() {
  return <WechatThemeAssetIcon src={WECHAT_THEME_EMOJI_BTN_URL} />
}

function WechatCirclePlusIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="12.25" stroke="currentColor" strokeWidth={1.7} />
      <path d="M16 10.4v11.2M10.4 16h11.2" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  )
}

function WechatCircleKeyboardIcon() {
  return <WechatThemeAssetIcon src={WECHAT_THEME_KEYBOARD_BTN_URL} />
}

export function ChatInputBar({
  inputMode,
  btnPx,
  btnColor,
  borderRadius,
  borderColor,
  backgroundColor,
  layout = 'lumi',
  wechatSendMode = 'enter',
  sendButtonColor,
  draft,
  sendBusy,
  planeCanAct,
  plusMenuOpen,
  onToggleInputMode,
  textareaRef,
  onVoicePointerDown,
  onVoicePointerMove,
  onVoicePointerUp,
  onDraftChange,
  onComposerKeyDown,
  onToggleEmoji,
  onShowKeyboard,
  emojiPanelOpen = false,
  onTogglePlus,
  onSend,
}: {
  inputMode: 'text' | 'voice'
  btnPx: number
  btnColor: string
  borderRadius: number
  borderColor: string
  /** 输入胶囊底色（X 风格等） */
  backgroundColor?: string
  layout?: 'lumi' | 'wechat' | 'imessage' | 'telegram' | 'talkmaker' | 'twitter'
  /** 微信模版：仅回车 / 回车+发送按钮 */
  wechatSendMode?: 'enter' | 'button'
  sendButtonColor?: string
  draft: string
  sendBusy: boolean
  planeCanAct: boolean
  plusMenuOpen: boolean
  onToggleInputMode: () => void
  textareaRef: RefObject<HTMLDivElement | null>
  onVoicePointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onVoicePointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onVoicePointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onDraftChange: (v: string) => void
  onComposerKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void
  onToggleEmoji: () => void
  /** 表情面板已展开时，点「键盘」收起面板并聚焦输入框 */
  onShowKeyboard?: () => void
  emojiPanelOpen?: boolean
  onTogglePlus: () => void
  onSend: () => void
}) {
  const onEmojiOrKeyboardClick = () => {
    if (emojiPanelOpen) onShowKeyboard?.()
    else onToggleEmoji()
  }
  const hasDraft = draft.trim().length > 0
  const sendBtnColor =
    layout === 'wechat' ||
    layout === 'imessage' ||
    layout === 'telegram' ||
    layout === 'talkmaker' ||
    layout === 'twitter'
      ? resolveSendButtonColor(layout, sendButtonColor)
      : undefined

  if (layout === 'twitter') {
    const shellBg = backgroundColor?.trim() || '#EFF3F4'
    const iconColor = btnColor || '#536471'
    const triggerBlue = sendBtnColor || '#1D9BF0'
    return (
      <div className="flex w-full max-w-full items-end gap-1.5 px-0.5">
        <Pressable
          type="button"
          data-wx-chat-input-btn="voice"
          aria-label={inputMode === 'text' ? '切换为语音输入' : '切换为文字输入'}
          onClick={onToggleInputMode}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ color: iconColor, minWidth: 32, minHeight: 32 }}
        >
          {inputMode === 'voice' ? (
            <Keyboard size={20} strokeWidth={1.75} aria-hidden />
          ) : (
            <Mic size={20} strokeWidth={1.75} aria-hidden />
          )}
        </Pressable>

        {inputMode === 'voice' ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onPointerDown={onVoicePointerDown}
            onPointerMove={onVoicePointerMove}
            onPointerUp={onVoicePointerUp}
            onPointerCancel={onVoicePointerUp}
            data-wx-chat-input-shell
            className="select-none flex min-h-[36px] min-w-0 flex-1 items-center justify-center text-[15px]"
            style={{
              borderRadius: 999,
              backgroundColor: shellBg,
              color: iconColor,
              touchAction: 'none',
            }}
          >
            按住说话
          </motion.button>
        ) : (
          <WeChatComposerField
            ref={textareaRef}
            data-wx-chat-input-shell
            className="min-h-[36px] min-w-0 flex-1 resize-none text-[15px] leading-snug outline-none"
            style={{
              borderRadius: 999,
              border: 'none',
              padding: '8px 14px',
              backgroundColor: shellBg,
              color: 'var(--wx-chat-input-text-color, #0F1419)',
              maxHeight: WECHAT_COMPOSER_MAX_HEIGHT_PX,
              ...wechatChatComposerFontStyle,
            }}
            placeholder="发送消息"
            aria-label="输入消息"
            value={draft}
            onChange={onDraftChange}
            onKeyDown={onComposerKeyDown}
          />
        )}

        <Pressable
          type="button"
          data-wx-chat-input-btn="emoji"
          aria-label={emojiPanelOpen ? '键盘' : '表情'}
          onClick={onEmojiOrKeyboardClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ color: iconColor, minWidth: 32, minHeight: 32 }}
        >
          {emojiPanelOpen ? (
            <Keyboard size={20} strokeWidth={1.75} aria-hidden />
          ) : (
            <Smile size={20} strokeWidth={1.75} aria-hidden />
          )}
        </Pressable>

        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center" style={{ minWidth: 32, minHeight: 32 }}>
          <Pressable
            type="button"
            data-wx-chat-input-btn="plus"
            aria-label={plusMenuOpen ? '收起更多功能' : '更多功能'}
            onClick={onTogglePlus}
            className="absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-150"
            style={{
              color: iconColor,
              opacity: hasDraft ? 0 : 1,
              pointerEvents: hasDraft ? 'none' : 'auto',
            }}
            tabIndex={hasDraft ? -1 : 0}
          >
            <Plus size={20} strokeWidth={1.75} className={plusMenuOpen ? 'rotate-45' : ''} aria-hidden />
          </Pressable>
          <Pressable
            type="button"
            data-wx-chat-input-btn="send"
            data-wx-send-ready={planeCanAct && !sendBusy ? '1' : '0'}
            onClick={onSend}
            disabled={sendBusy || !planeCanAct}
            className="absolute inset-0 flex items-center justify-center rounded-full text-white transition-opacity duration-150 active:scale-95 disabled:opacity-40"
            style={{
              backgroundColor: triggerBlue,
              opacity: hasDraft ? 1 : 0,
              pointerEvents: hasDraft ? 'auto' : 'none',
            }}
            aria-label="触发回复"
            tabIndex={hasDraft ? 0 : -1}
          >
            <ImessageSendIcon />
          </Pressable>
        </div>
      </div>
    )
  }

  if (layout === 'talkmaker') {
    return (
      <div className="flex w-full items-center gap-2 px-3 py-2">
          <Pressable
            type="button"
            aria-label={plusMenuOpen ? '收起更多功能' : '更多功能'}
            onClick={onTogglePlus}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-500"
          >
            <Plus size={28} strokeWidth={1.75} className={plusMenuOpen ? 'rotate-45' : ''} aria-hidden />
          </Pressable>
          <Pressable
            type="button"
            aria-label={emojiPanelOpen ? '键盘' : '表情'}
            onClick={onEmojiOrKeyboardClick}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-500"
          >
            {emojiPanelOpen ? (
              <Keyboard size={24} strokeWidth={1.5} aria-hidden />
            ) : (
              <Smile size={24} strokeWidth={1.5} aria-hidden />
            )}
          </Pressable>
          <div className="flex min-h-[36px] min-w-0 flex-1 items-center rounded-full bg-[#F2F2F2] px-4 py-1.5">
            {inputMode === 'voice' ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onPointerDown={onVoicePointerDown}
                onPointerMove={onVoicePointerMove}
                onPointerUp={onVoicePointerUp}
                onPointerCancel={onVoicePointerUp}
                className={COMPOSER_HOLD_CLASS}
                style={{ touchAction: 'none' }}
              >
                按住说话
              </motion.button>
            ) : (
              <>
                <WeChatComposerField
                  ref={textareaRef}
                  className={COMPOSER_TEXT_CLASS}
                  style={composerTextareaStyle()}
                  placeholder="发送消息..."
                  aria-label="输入消息"
                  value={draft}
                  onChange={onDraftChange}
                  onKeyDown={onComposerKeyDown}
                />
                <Pressable
                  type="button"
                  aria-label="语音输入"
                  onClick={onToggleInputMode}
                  className="ml-2 shrink-0 text-gray-400"
                >
                  <Mic size={20} strokeWidth={1.75} aria-hidden />
                </Pressable>
              </>
            )}
          </div>
          <Pressable
            type="button"
            onClick={onSend}
            disabled={sendBusy || !planeCanAct}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black shadow-sm transition-[transform,opacity] active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            style={{ backgroundColor: sendBtnColor }}
            aria-label={hasDraft ? '发送' : '请求 AI 回复'}
          >
          <TelegramSendIcon />
        </Pressable>
      </div>
    )
  }

  if (layout === 'telegram') {
    const telegramActionBtnClass = 'flex h-10 w-10 shrink-0 items-center justify-center'
    const telegramComposerRowClass = 'flex min-h-[40px] min-w-0 flex-1 items-center'

    return (
      <div className="flex w-full max-w-full items-end gap-1.5">
        <Pressable
          type="button"
          aria-label={plusMenuOpen ? '收起更多功能' : '附件'}
          onClick={onTogglePlus}
          className={`${telegramActionBtnClass} text-[#8E8E93]`}
        >
          <Paperclip size={24} strokeWidth={1.75} className="rotate-45" aria-hidden />
        </Pressable>

        {inputMode === 'voice' ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onPointerDown={onVoicePointerDown}
            onPointerMove={onVoicePointerMove}
            onPointerUp={onVoicePointerUp}
            onPointerCancel={onVoicePointerUp}
            className={`${telegramComposerRowClass} select-none justify-start rounded-[8px] bg-transparent text-[16px] leading-6 text-[#8E8E93]`}
            style={{ touchAction: 'none' }}
          >
            按住说话
          </motion.button>
        ) : (
          <div className={telegramComposerRowClass}>
            <WeChatComposerField
              ref={textareaRef}
              className={COMPOSER_TEXT_CLASS}
              style={composerTextareaStyle()}
              placeholder="Message"
              aria-label="输入消息"
              value={draft}
              onChange={onDraftChange}
              onKeyDown={onComposerKeyDown}
            />
            <Pressable
              type="button"
              aria-label={emojiPanelOpen ? '键盘' : '表情'}
              onClick={onEmojiOrKeyboardClick}
              className={`ml-2 ${telegramActionBtnClass} text-[#8E8E93]`}
            >
              {emojiPanelOpen ? (
                <Keyboard size={24} strokeWidth={1.5} aria-hidden />
              ) : (
                <Smile size={24} strokeWidth={1.5} aria-hidden />
              )}
            </Pressable>
          </div>
        )}

        <Pressable
          type="button"
          aria-label={inputMode === 'text' ? '切换为语音输入' : '切换为文字输入'}
          onClick={onToggleInputMode}
          className={`${telegramActionBtnClass} text-[#8E8E93]`}
        >
          <Mic size={24} strokeWidth={1.75} aria-hidden />
        </Pressable>

        <Pressable
          type="button"
          onClick={onSend}
          disabled={sendBusy || !planeCanAct}
          className={`${telegramActionBtnClass} rounded-full text-white shadow-md transition-[transform,opacity] active:scale-95 disabled:pointer-events-none disabled:opacity-40`}
          style={{ backgroundColor: sendBtnColor }}
          aria-label={hasDraft ? '发送并请求回复' : '请求 AI 回复'}
        >
          <TelegramSendIcon />
        </Pressable>
      </div>
    )
  }

  if (layout === 'imessage') {
    return (
      <div className="flex w-full max-w-full items-end gap-2">
        <Pressable
          type="button"
          aria-label={plusMenuOpen ? '收起更多功能' : '更多功能'}
          onClick={onTogglePlus}
          className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8E8E93]"
        >
          <Plus size={28} strokeWidth={1.75} className={plusMenuOpen ? 'rotate-45' : ''} aria-hidden />
        </Pressable>

        {inputMode === 'voice' ? (
          <div
            className={`${COMPOSER_ROW_CLASS} rounded-full border bg-white px-3 py-1 shadow-sm`}
            style={{ borderColor }}
          >
            <Pressable
              type="button"
              aria-label="切换为文字输入"
              onClick={onToggleInputMode}
              className={`mr-2 ${COMPOSER_SIDE_BTN_CLASS}`}
            >
              <Keyboard size={22} strokeWidth={1.5} aria-hidden />
            </Pressable>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onPointerDown={onVoicePointerDown}
              onPointerMove={onVoicePointerMove}
              onPointerUp={onVoicePointerUp}
              onPointerCancel={onVoicePointerUp}
              className={COMPOSER_HOLD_CLASS}
              style={{ touchAction: 'none' }}
            >
              按住说话
            </motion.button>
          </div>
        ) : (
          <div
            className={`${COMPOSER_ROW_CLASS} rounded-full border bg-white px-3 py-1 shadow-sm`}
            style={{ borderColor }}
          >
            <Pressable
              type="button"
              aria-label={emojiPanelOpen ? '键盘' : '表情'}
              onClick={onEmojiOrKeyboardClick}
              className={`mr-2 ${COMPOSER_SIDE_BTN_CLASS}`}
            >
              {emojiPanelOpen ? (
                <Keyboard size={24} strokeWidth={1.5} aria-hidden />
              ) : (
                <Smile size={24} strokeWidth={1.5} aria-hidden />
              )}
            </Pressable>
            <WeChatComposerField
              ref={textareaRef}
              className={COMPOSER_TEXT_CLASS}
              style={composerTextareaStyle()}
              placeholder="iMessage"
              aria-label="输入消息"
              value={draft}
              onChange={onDraftChange}
              onKeyDown={onComposerKeyDown}
            />
            <Pressable
              type="button"
              aria-label={inputMode === 'text' ? '切换为语音输入' : '切换为文字输入'}
              onClick={onToggleInputMode}
              className={`ml-2 ${COMPOSER_SIDE_BTN_CLASS}`}
            >
              <Mic size={24} strokeWidth={1.5} aria-hidden />
            </Pressable>
          </div>
        )}

        <Pressable
          type="button"
          onClick={onSend}
          disabled={sendBusy || !planeCanAct}
          className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-[transform,opacity] active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          style={{ backgroundColor: sendBtnColor }}
          aria-label={draft.trim() ? '发送并请求回复' : '请求 AI 回复'}
        >
          <ImessageSendIcon />
        </Pressable>
      </div>
    )
  }

  if (layout === 'wechat') {
  const wechatSideBtnClass =
    'flex h-11 w-8 shrink-0 items-center justify-center active:opacity-55'
  const wechatAssetSideBtnClass =
    'flex h-11 w-11 shrink-0 items-center justify-center active:opacity-55'
  const wechatSideBtnStyle: CSSProperties = { color: 'var(--wx-chat-input-btn-color, #191919)' }
  // 壳高 44 与侧钮对齐；正文行高用 WECHAT_COMPOSER_LINE_HEIGHT_PX，避免多行间距被拉成 44
  const wechatComposerShellClass =
    'box-border flex min-h-11 min-w-0 flex-1 items-center overflow-hidden px-3 py-0'
  const wechatComposerShellStyle: CSSProperties = {
    backgroundColor: 'var(--wx-chat-input-shell-bg, #ffffff)',
    border: 'none',
    borderRadius: 'var(--wx-chat-input-shell-radius, 6px)',
    minHeight: 44,
  }

  return (
    <div className="flex w-full max-w-full items-end gap-2.5">
      <Pressable
        type="button"
        aria-label={inputMode === 'text' ? '切换为语音输入' : '切换为文字输入'}
        onClick={onToggleInputMode}
        className={wechatAssetSideBtnClass}
        style={wechatSideBtnStyle}
      >
        {inputMode === 'voice' ? <WechatCircleKeyboardIcon /> : <WechatCircleVoiceIcon />}
      </Pressable>

      {inputMode === 'voice' ? (
        <div
          data-wx-chat-input-shell
          className={wechatComposerShellClass}
          style={{ ...wechatComposerShellStyle, height: 44 }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onPointerDown={onVoicePointerDown}
            onPointerMove={onVoicePointerMove}
            onPointerUp={onVoicePointerUp}
            onPointerCancel={onVoicePointerUp}
            className="select-none flex h-11 w-full items-center justify-center bg-transparent text-[15px] leading-none outline-none"
            style={{
              touchAction: 'none',
              color: 'var(--wx-chat-input-text-color, var(--wx-text))',
            }}
          >
            按住 说话
          </motion.button>
        </div>
      ) : (
        <div data-wx-chat-input-shell className={wechatComposerShellClass} style={wechatComposerShellStyle}>
          <WeChatComposerField
            ref={textareaRef}
            className="box-border min-w-0 flex-1 resize-none bg-transparent py-0 text-[15px] outline-none"
            style={{
              ...wechatChatComposerFontStyle,
              boxSizing: 'border-box',
              paddingTop: 0,
              paddingBottom: 0,
              margin: 0,
              maxHeight: WECHAT_COMPOSER_MAX_HEIGHT_PX,
              minHeight: WECHAT_COMPOSER_LINE_HEIGHT_PX,
              lineHeight: `${WECHAT_COMPOSER_LINE_HEIGHT_PX}px`,
              color: 'var(--wx-chat-input-text-color, var(--wx-text))',
              caretColor: 'var(--wx-chat-input-text-color, var(--wx-text))',
              WebkitTextFillColor: 'var(--wx-chat-input-text-color, var(--wx-text))',
            }}
            placeholder=""
            aria-label="输入消息"
            value={draft}
            onChange={onDraftChange}
            onKeyDown={onComposerKeyDown}
          />
        </div>
      )}

      <Pressable
        type="button"
        aria-label={emojiPanelOpen ? '键盘' : '表情'}
        onClick={onEmojiOrKeyboardClick}
        className={wechatAssetSideBtnClass}
        style={wechatSideBtnStyle}
      >
        {emojiPanelOpen ? <WechatCircleKeyboardIcon /> : <WechatCircleSmileIcon />}
      </Pressable>

      <Pressable
        type="button"
        aria-label={plusMenuOpen ? '收起更多功能' : '更多功能'}
        onClick={onTogglePlus}
        className={wechatSideBtnClass}
        style={wechatSideBtnStyle}
      >
        <span className={plusMenuOpen ? 'inline-flex rotate-45' : 'inline-flex'}>
          <WechatCirclePlusIcon />
        </span>
      </Pressable>

      {wechatSendMode === 'button' ? (
        <Pressable
          type="button"
          onClick={onSend}
          disabled={sendBusy || !planeCanAct}
          className="flex h-8 shrink-0 items-center justify-center rounded-[4px] px-2.5 text-[14px] font-medium leading-none text-white transition-[transform,opacity] active:scale-[0.97] active:opacity-85 disabled:pointer-events-none disabled:opacity-40"
          style={{ backgroundColor: sendBtnColor || '#07C160', minWidth: 52 }}
          aria-label={hasDraft ? '发送并请求回复' : '请求 AI 回复'}
        >
          {hasDraft ? '发送' : '回复'}
        </Pressable>
      ) : null}
    </div>
  )
  }

  const lumiShellBg = 'var(--wx-chat-input-shell-bg, #ffffff)'

  return (
    <div className="flex w-full max-w-full items-end gap-2">
      <Pressable
        type="button"
        data-wx-chat-input-btn="voice"
        data-wx-chat-input-icon={inputMode === 'voice' ? 'keyboard' : 'mic'}
        aria-label={inputMode === 'text' ? '切换为语音输入' : '切换为文字输入'}
        onClick={onToggleInputMode}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ color: btnColor }}
      >
        {inputMode === 'voice' ? (
          <Keyboard size={btnPx} strokeWidth={2} aria-hidden />
        ) : (
          <Mic size={btnPx} strokeWidth={2} aria-hidden />
        )}
      </Pressable>

      {inputMode === 'voice' ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onPointerDown={onVoicePointerDown}
          onPointerMove={onVoicePointerMove}
          onPointerUp={onVoicePointerUp}
          onPointerCancel={onVoicePointerUp}
          data-wx-chat-input-shell
          className="select-none flex min-h-[44px] min-w-0 flex-1 items-center justify-center border text-[15px] text-[#4b5563]"
          style={{
            borderRadius,
            borderColor,
            backgroundColor: lumiShellBg,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          按住说话
        </motion.button>
      ) : (
        <WeChatComposerField
          ref={textareaRef}
          data-wx-chat-input-shell
          className="min-h-[44px] min-w-0 flex-1 resize-none text-[16px] leading-snug outline-none"
          style={{
            borderRadius,
            border: `1px solid ${borderColor}`,
            padding: '10px 16px',
            backgroundColor: lumiShellBg,
            color: 'var(--wx-chat-input-text-color, var(--wx-text))',
            maxHeight: WECHAT_COMPOSER_MAX_HEIGHT_PX,
            ...wechatChatComposerFontStyle,
          }}
          placeholder="输入消息..."
          aria-label="输入消息"
          value={draft}
          onChange={onDraftChange}
          onKeyDown={onComposerKeyDown}
        />
      )}

      <Pressable
        type="button"
        data-wx-chat-input-btn="emoji"
        data-wx-chat-input-icon={emojiPanelOpen ? 'keyboard' : 'emoji'}
        aria-label={emojiPanelOpen ? '键盘' : '表情'}
        onClick={onEmojiOrKeyboardClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ color: btnColor }}
      >
        {emojiPanelOpen ? (
          <Keyboard size={btnPx} strokeWidth={2} aria-hidden />
        ) : (
          <Smile size={btnPx} strokeWidth={2} aria-hidden />
        )}
      </Pressable>
      <Pressable
        type="button"
        data-wx-chat-input-btn="plus"
        aria-label={plusMenuOpen ? '收起更多功能' : '更多功能'}
        onClick={onTogglePlus}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      >
        <Plus
          size={20}
          strokeWidth={2}
          className={`text-black transition-transform duration-200 ease-out ${plusMenuOpen ? 'rotate-45' : ''}`}
          aria-hidden
        />
      </Pressable>
      <Pressable
        type="button"
        data-wx-chat-input-btn="send"
        data-wx-send-ready={planeCanAct && !sendBusy ? '1' : '0'}
        onClick={onSend}
        disabled={sendBusy || !planeCanAct}
        className="mb-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[opacity,transform,box-shadow] active:scale-95 disabled:opacity-40"
        style={{ color: !planeCanAct || sendBusy ? '#a3a3a3' : btnColor }}
        aria-label={hasDraft ? '发送并请求回复' : '请求 AI 回复'}
      >
        <SendPlaneIcon />
      </Pressable>
    </div>
  )
}
