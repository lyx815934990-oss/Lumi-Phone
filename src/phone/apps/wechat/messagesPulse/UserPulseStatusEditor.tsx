import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pressable } from '../../../components/Pressable'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import {
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  lumiThreadCapsuleStyle,
} from '../lumiShellTheme'
import { WeChatClassicEmojiPickerPanel } from '../stickers/WeChatClassicEmojiPickerPanel'
import { StatusComicBubble } from './StatusComicBubble'
import type { FriendPresence } from './types'
import { MURMUR_REACT_EMOJIS } from './murmurStorage'
import {
  DEFAULT_USER_PULSE_STATUS,
  USER_PULSE_ACTIVITY_PRESETS,
  type UserPulseStatus,
  loadUserPulseStatus,
  saveUserPulseStatus,
} from './userPulseStatusStorage'

function getWeChatPageRoot(): HTMLElement | null {
  return document.querySelector('[data-phone-page="wechat"]')
}

/** 高于悬浮底栏 z-[40]，与其它微信全屏浮层同级 */
const STATUS_EDITOR_Z = 5200

const PRESENCE_OPTS: Array<{ v: FriendPresence; label: string }> = [
  { v: 'online', label: '在线' },
  { v: 'away', label: '离开' },
  { v: 'offline', label: '离线' },
]

type EditorTab = 'presence' | 'thought'

export function UserPulseStatusEditor({
  open,
  playerIdentityId,
  selfName,
  selfAvatarUrl,
  onClose,
  onSaved,
}: {
  open: boolean
  playerIdentityId: string | null
  selfName: string
  selfAvatarUrl?: string
  onClose: () => void
  onSaved?: (status: UserPulseStatus) => void
}) {
  const [draft, setDraft] = useState<UserPulseStatus>({ ...DEFAULT_USER_PULSE_STATUS })
  const [editorTab, setEditorTab] = useState<EditorTab>('presence')
  const [emojiTab, setEmojiTab] = useState<'quick' | 'classic'>('quick')
  const [saving, setSaving] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalRoot(getWeChatPageRoot())
  }, [open])

  useEffect(() => {
    if (!open) return
    setEditorTab('presence')
    let cancelled = false
    void loadUserPulseStatus(playerIdentityId).then((s) => {
      if (!cancelled) setDraft(s)
    })
    return () => {
      cancelled = true
    }
  }, [open, playerIdentityId])

  const avatarSrc = resolveCharacterAvatarUrl({ avatarUrl: selfAvatarUrl }) || ''
  const previewEmoji = draft.statusEmoji
  const previewText = draft.statusText.trim()
    ? draft.statusText
    : draft.published
      ? '写点想法…'
      : '想法未发布'

  const canSave = useMemo(() => !saving, [saving])

  const persist = async (patch?: Partial<UserPulseStatus>) => {
    setSaving(true)
    try {
      const saved = await saveUserPulseStatus(playerIdentityId, { ...draft, ...patch })
      setDraft(saved)
      onSaved?.(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!portalRoot) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ fontFamily: LUMI_SHELL_FONT, zIndex: STATUS_EDITOR_Z }}
        >
          <button type="button" aria-label="关闭" className="absolute inset-0 bg-black/35" onClick={onClose} />
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 48 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="relative z-[1] flex max-h-[min(88vh,720px)] flex-col overflow-hidden rounded-t-[22px] bg-[#F7F6F4]"
          >
            <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
              <Pressable type="button" className="px-1 py-2 text-[15px]" style={{ color: LUMI_SHELL.mist }} onClick={onClose}>
                取消
              </Pressable>
              <h2 className="text-[16px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                设置我的状态
              </h2>
              <Pressable
                type="button"
                className="px-1 py-2 text-[15px] font-medium"
                style={{ color: canSave ? LUMI_SHELL.ink : LUMI_SHELL.mist }}
                disabled={!canSave}
                onClick={() => void persist({ published: true })}
              >
                {saving ? '…' : '完成'}
              </Pressable>
            </div>

            <div
              className="mx-4 mb-2 flex shrink-0 items-center gap-1 p-1"
              style={{
                ...lumiThreadCapsuleStyle(),
                borderRadius: 999,
              }}
              role="tablist"
              aria-label="状态分段"
            >
              {(
                [
                  { id: 'presence' as const, label: '在线状态' },
                  { id: 'thought' as const, label: '想法' },
                ] as const
              ).map((it) => {
                const on = editorTab === it.id
                return (
                  <button
                    key={it.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className="flex-1 rounded-full py-1.5 text-center text-[13px] font-medium"
                    style={{
                      color: on ? LUMI_SHELL.ink : LUMI_SHELL.mist,
                      background: on ? '#fff' : 'transparent',
                      boxShadow: on ? '0 2px 8px rgba(16,16,18,0.06)' : undefined,
                    }}
                    onClick={() => setEditorTab(it.id)}
                  >
                    {it.label}
                  </button>
                )
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2" style={{ paddingBottom: 28 }}>
              {/* 预览：想法气泡与在线状态分开 */}
              <div className="mb-4 flex flex-col items-center pt-2" style={{ ...lumiThreadCapsuleStyle(), padding: '20px 16px' }}>
                <StatusComicBubble emoji={previewEmoji} text={previewText} placement="above" maxWidth={160} />
                <div className="relative">
                  <div
                    className="overflow-hidden rounded-full"
                    style={{ width: 64, height: 64, border: `1px solid ${LUMI_SHELL.hairline}`, background: LUMI_SHELL.hairline }}
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[22px]" style={{ color: LUMI_SHELL.mist }}>
                        {(selfName || '?').slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
                    style={{
                      background:
                        draft.presence === 'online'
                          ? '#34C759'
                          : draft.presence === 'away'
                            ? '#F5A623'
                            : 'rgba(139,139,143,0.55)',
                      border: '2px solid #fff',
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                  {draft.presence === 'online' ? '在线' : draft.presence === 'away' ? '离开' : '离线'}
                </p>
                {draft.presenceLabel.trim() ? (
                  <p className="text-[14px] font-medium" style={{ color: LUMI_SHELL.ink }}>
                    {draft.presenceLabel.trim()}
                  </p>
                ) : null}
                <p className="text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                  {selfName || '我'} · 在线状态与想法互不影响
                </p>
              </div>

              {editorTab === 'presence' ? (
                <>
                  <p className="mb-2 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                    显示在头像旁，和想法气泡是两回事
                  </p>
                  <p className="mb-1.5 text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                    在线状态
                  </p>
                  <div className="mb-4 flex gap-2">
                    {PRESENCE_OPTS.map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        className="flex-1 rounded-full py-2 text-[13px]"
                        style={{
                          background: draft.presence === o.v ? LUMI_SHELL.ink : '#fff',
                          color: draft.presence === o.v ? '#fff' : LUMI_SHELL.ink,
                          border: `1px solid ${LUMI_SHELL.hairline}`,
                        }}
                        onClick={() => setDraft((d) => ({ ...d, presence: o.v }))}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <p className="mb-1.5 text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                    状态文案（如：学习中）
                  </p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {USER_PULSE_ACTIVITY_PRESETS.map((o) => {
                      const on = draft.presenceLabel === o.label
                      return (
                        <button
                          key={o.label}
                          type="button"
                          className="rounded-full px-2.5 py-1.5 text-[12px]"
                          style={{
                            background: on ? LUMI_SHELL.ink : '#fff',
                            color: on ? '#fff' : LUMI_SHELL.ink,
                            border: `1px solid ${LUMI_SHELL.hairline}`,
                          }}
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              presenceLabel: o.label,
                              presence: o.presence,
                            }))
                          }
                        >
                          {o.label}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    value={draft.presenceLabel}
                    onChange={(e) => setDraft((d) => ({ ...d, presenceLabel: e.target.value.slice(0, 16) }))}
                    placeholder="自定义，如：加班中、追剧中…"
                    className="mb-4 h-11 w-full rounded-[14px] px-3 text-[15px] outline-none"
                    style={{
                      background: '#fff',
                      border: `1px solid ${LUMI_SHELL.hairline}`,
                      color: LUMI_SHELL.ink,
                    }}
                    maxLength={16}
                  />
                </>
              ) : (
                <>
                  <p className="mb-2 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                    头像上方的漫画气泡，与在线状态分开
                  </p>
                  <input
                    value={draft.statusText}
                    onChange={(e) => setDraft((d) => ({ ...d, statusText: e.target.value.slice(0, 36) }))}
                    placeholder="今天在想什么…"
                    className="mb-3 h-11 w-full rounded-[14px] px-3 text-[15px] outline-none"
                    style={{
                      background: '#fff',
                      border: `1px solid ${LUMI_SHELL.hairline}`,
                      color: LUMI_SHELL.ink,
                    }}
                    maxLength={36}
                  />

                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-[12px]"
                      style={{
                        background: emojiTab === 'quick' ? LUMI_SHELL.ink : '#fff',
                        color: emojiTab === 'quick' ? '#fff' : LUMI_SHELL.ink,
                        border: `1px solid ${LUMI_SHELL.hairline}`,
                      }}
                      onClick={() => setEmojiTab('quick')}
                    >
                      快捷
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-[12px]"
                      style={{
                        background: emojiTab === 'classic' ? LUMI_SHELL.ink : '#fff',
                        color: emojiTab === 'classic' ? '#fff' : LUMI_SHELL.ink,
                        border: `1px solid ${LUMI_SHELL.hairline}`,
                      }}
                      onClick={() => setEmojiTab('classic')}
                    >
                      微信表情
                    </button>
                    {draft.statusEmoji ? (
                      <button
                        type="button"
                        className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[12px]"
                        style={{ color: LUMI_SHELL.mist }}
                        onClick={() => setDraft((d) => ({ ...d, statusEmoji: '' }))}
                      >
                        <X size={12} /> 清除表情
                      </button>
                    ) : null}
                  </div>

                  <div
                    className="mb-4 rounded-[14px] bg-white p-2"
                    style={{ border: `1px solid ${LUMI_SHELL.hairline}` }}
                  >
                    {emojiTab === 'quick' ? (
                      <div
                        className="max-h-[min(56vh,420px)] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                        role="list"
                        aria-label={`快捷 Unicode 表情（共 ${MURMUR_REACT_EMOJIS.length} 个）`}
                      >
                        <p className="mb-1 px-1 text-[11px] text-[#aeaeb2]">
                          全部快捷表情 · {MURMUR_REACT_EMOJIS.length}
                        </p>
                        <div className="grid grid-cols-8 gap-1.5 pb-1">
                          {MURMUR_REACT_EMOJIS.map((em) => {
                            const on = draft.statusEmoji === em
                            return (
                              <button
                                key={em}
                                type="button"
                                className="flex h-9 items-center justify-center rounded-[8px] text-[18px] active:bg-[#f0f0f0]"
                                style={{
                                  outline: on ? `1.5px solid ${LUMI_SHELL.ink}` : undefined,
                                }}
                                onClick={() => setDraft((d) => ({ ...d, statusEmoji: em }))}
                                role="listitem"
                              >
                                {em}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <WeChatClassicEmojiPickerPanel
                        size="tall"
                        selectedToken={draft.statusEmoji}
                        onInsert={(token) => setDraft((d) => ({ ...d, statusEmoji: token }))}
                      />
                    )}
                  </div>
                </>
              )}

              <label className="mb-1 flex items-center justify-between rounded-[14px] bg-white px-3 py-3" style={{ border: `1px solid ${LUMI_SHELL.hairline}` }}>
                <span className="text-[14px]" style={{ color: LUMI_SHELL.ink }}>
                  对好友与角色可见
                </span>
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
                />
              </label>
            </div>

            <div
              className="shrink-0 border-t px-4 pt-3"
              style={{
                borderColor: LUMI_SHELL.hairline,
                background: '#F7F6F4',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <Pressable
                type="button"
                className="w-full rounded-full py-3 text-center text-[14px]"
                style={{ color: '#E5484D', background: '#fff', border: `1px solid ${LUMI_SHELL.hairline}` }}
                onClick={() =>
                  void persist({
                    statusEmoji: '',
                    statusText: '',
                    presenceLabel: '',
                    published: false,
                    presence: 'offline',
                  })
                }
              >
                清除状态
              </Pressable>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  )
}
