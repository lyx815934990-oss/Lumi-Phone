import { useMemo } from 'react'
import type { ChatConversationSettingsRow } from '../newFriendsPersona/types'
import {
  normalizeWeChatChatLanguageCode,
  summarizeChatReplyLanguageSettings,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  WECHAT_CHAT_LANGUAGE_OPTIONS,
  weChatChatLanguageLabel,
} from '../wechatChatLanguage'

export type ChatReplyLanguageSettingsPatch = Partial<
  Pick<
    ChatConversationSettingsRow,
    | 'replyOutputLanguage'
    | 'replyVoiceLanguage'
    | 'translationSyncEnabled'
    | 'translationLanguage'
  >
>

function WxSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="relative h-8 w-[52px] shrink-0 self-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: on ? '#000000' : '#cccccc' }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out"
        style={{ left: on ? 26 : 4 }}
        aria-hidden
      />
    </button>
  )
}

function LangSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <select
      value={normalizeWeChatChatLanguageCode(value)}
      onChange={(e) => onChange(e.target.value)}
      className="mt-2 w-full rounded-xl border border-[#e5e5ea] bg-[#f7f7f7] px-3 py-2.5 text-[15px] text-black outline-none"
    >
      {WECHAT_CHAT_LANGUAGE_OPTIONS.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}（{o.native}）
        </option>
      ))}
    </select>
  )
}

export function summarizeChatReplyLanguageSettingsRow(
  row: ChatConversationSettingsRow | null | undefined,
): string {
  return summarizeChatReplyLanguageSettings({
    replyOutputLanguage: row?.replyOutputLanguage,
    replyVoiceLanguage: row?.replyVoiceLanguage,
    translationSyncEnabled: row?.translationSyncEnabled,
    translationLanguage: row?.translationLanguage,
  })
}

/** 聊天信息页内嵌：文字语言 / 语音语言 / 翻译 */
export function ChatReplyLanguageSettingsBlock({
  settings,
  onPatch,
}: {
  settings: ChatConversationSettingsRow
  onPatch: (partial: ChatReplyLanguageSettingsPatch) => void | Promise<void>
}) {
  const textLang = normalizeWeChatChatLanguageCode(
    settings.replyOutputLanguage,
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const voiceLang = normalizeWeChatChatLanguageCode(
    settings.replyVoiceLanguage || settings.replyOutputLanguage,
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const translationLang = normalizeWeChatChatLanguageCode(
    settings.translationLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  const syncOn = settings.translationSyncEnabled === true

  const hint = useMemo(() => {
    if (textLang === translationLang && syncOn) {
      return '文字语言与翻译语言相同，译文通常无必要；可改其一。'
    }
    return null
  }, [textLang, translationLang, syncOn])

  return (
    <div className="space-y-0">
      <div className="border-b border-[#f0f0f0] px-4 py-3.5">
        <p className="text-[16px] font-medium text-black">文字回复语言</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
          角色<strong className="font-normal text-[#666]">文字气泡</strong>
          按此语言输出。当前：{weChatChatLanguageLabel(textLang)}
        </p>
        <LangSelect
          value={textLang}
          onChange={(code) => void onPatch({ replyOutputLanguage: code })}
        />
      </div>

      <div className="border-b border-[#f0f0f0] px-4 py-3.5">
        <p className="text-[16px] font-medium text-black">语音语言</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
          角色发送的<strong className="font-normal text-[#666]">语音消息脚本</strong>
          按此语言口述（与音色无关，音色仍用声纹库绑定）。当前：
          {weChatChatLanguageLabel(voiceLang)}
        </p>
        <LangSelect
          value={voiceLang}
          onChange={(code) => void onPatch({ replyVoiceLanguage: code })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-3.5">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[16px] font-medium text-black">同步输出翻译</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
            开启后每轮回复一并落库译文，旁侧可随时展开。默认由当前聊天模型同轮输出；仅当「API 设置 → 翻译」勾选了「使用副接口」时，才改走翻译服务商。
          </p>
        </div>
        <WxSwitch on={syncOn} onToggle={() => void onPatch({ translationSyncEnabled: !syncOn })} />
      </div>

      {syncOn ? (
        <div className="px-4 py-3.5">
          <p className="text-[16px] font-medium text-black">翻译语言</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
            气泡下方译文语言。当前：{weChatChatLanguageLabel(translationLang)}
          </p>
          <LangSelect
            value={translationLang}
            onChange={(code) => void onPatch({ translationLanguage: code })}
          />
          {hint ? <p className="mt-2 text-[12px] text-[#c27c3e]">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
