import { ChevronDown } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pressable } from '../../../components/Pressable'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { personaDb } from '../newFriendsPersona/idb'
import { LUMI_SHELL, LUMI_SHELL_FONT, LUMI_SHELL_NUM_STYLE } from '../lumiShellTheme'
import type { FriendPulseContact } from './types'
import {
  DEFAULT_MURMUR_PUBLISH_SETTINGS,
  formatMurmurDuration,
  formatMurmurNextPublishHint,
  getMurmurLatestActivityMs,
  loadMurmurPublishSettings,
  murmurModeLabel,
  MURMUR_ADAPTIVE_COOLDOWN_PRESETS,
  MURMUR_PUBLISH_PRESETS,
  saveMurmurPublishSettings,
  type MurmurPublishMode,
  type MurmurPublishSettings,
} from './murmurSettings'

function resolvePortalRoot(): HTMLElement {
  return (
    (document.querySelector('[data-phone-page="wechat"]') as HTMLElement | null) ||
    (document.querySelector('[data-phone-shell]') as HTMLElement | null) ||
    document.body
  )
}

type RowState = {
  contact: FriendPulseContact
  settings: MurmurPublishSettings
  activityMs: number
  expanded: boolean
}

function Switch({
  on,
  disabled,
  onToggle,
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors"
      style={{
        background: on ? LUMI_SHELL.ink : 'rgba(16,16,18,0.12)',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform"
        style={{ left: on ? 23 : 3 }}
      />
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium tracking-wide" style={{ color: LUMI_SHELL.mist }}>
      {children}
    </p>
  )
}

function Segmented2({
  left,
  right,
  value,
  disabled,
  onChange,
}: {
  left: { id: MurmurPublishMode; label: string; desc: string }
  right: { id: MurmurPublishMode; label: string; desc: string }
  value: MurmurPublishMode
  disabled?: boolean
  onChange: (v: MurmurPublishMode) => void
}) {
  const opts = [left, right]
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-[14px] p-1"
      style={{ background: 'rgba(16,16,18,0.05)' }}
    >
      {opts.map((o) => {
        const on = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            className="rounded-[11px] px-2 py-2.5 text-center transition-colors"
            style={{
              background: on ? '#fff' : 'transparent',
              boxShadow: on ? '0 1px 4px rgba(16,16,18,0.08)' : undefined,
              opacity: disabled ? 0.45 : 1,
            }}
            onClick={() => onChange(o.id)}
          >
            <span
              className="block text-[13px] font-semibold leading-none"
              style={{ color: LUMI_SHELL.ink }}
            >
              {o.label}
            </span>
            <span
              className="mt-1 block text-[10px] leading-tight"
              style={{ color: LUMI_SHELL.mist }}
            >
              {o.desc}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PillRow({
  options,
  value,
  disabled,
  onPick,
}: {
  options: ReadonlyArray<{ id: string; label: string; seconds: number }>
  value: number
  disabled?: boolean
  onPick: (seconds: number) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((p) => {
        const on = value === p.seconds
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium"
            style={{
              background: on ? LUMI_SHELL.ink : '#fff',
              color: on ? '#fff' : LUMI_SHELL.ink,
              border: `1px solid ${on ? LUMI_SHELL.ink : LUMI_SHELL.hairline}`,
              opacity: disabled ? 0.45 : 1,
              ...LUMI_SHELL_NUM_STYLE,
            }}
            onClick={() => onPick(p.seconds)}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

function CustomIntervalRow({
  seconds,
  disabled,
  onCommit,
}: {
  seconds: number
  disabled?: boolean
  onCommit: (sec: number) => void
}) {
  const [h, setH] = useState(String(Math.floor(seconds / 3600)))
  const [m, setM] = useState(String(Math.round((seconds % 3600) / 60)))

  useEffect(() => {
    setH(String(Math.floor(seconds / 3600)))
    setM(String(Math.round((seconds % 3600) / 60)))
  }, [seconds])

  const commit = () => {
    const hh = Math.max(0, Math.min(48, Number(h) || 0))
    const mm = Math.max(0, Math.min(59, Number(m) || 0))
    onCommit(Math.max(15 * 60, hh * 3600 + mm * 60))
  }

  const fieldStyle = {
    background: '#fff',
    border: `1px solid ${LUMI_SHELL.hairline}`,
    color: LUMI_SHELL.ink,
    opacity: disabled ? 0.45 : 1,
    ...LUMI_SHELL_NUM_STYLE,
  } as const

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="shrink-0 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
        自定义
      </span>
      <input
        type="number"
        min={0}
        max={48}
        disabled={disabled}
        value={h}
        onChange={(e) => setH(e.target.value)}
        onBlur={commit}
        className="h-8 w-11 rounded-[10px] text-center text-[13px] outline-none"
        style={fieldStyle}
      />
      <span className="text-[11px]" style={{ color: LUMI_SHELL.mist }}>
        时
      </span>
      <input
        type="number"
        min={0}
        max={59}
        disabled={disabled}
        value={m}
        onChange={(e) => setM(e.target.value)}
        onBlur={commit}
        className="h-8 w-11 rounded-[10px] text-center text-[13px] outline-none"
        style={fieldStyle}
      />
      <span className="text-[11px]" style={{ color: LUMI_SHELL.mist }}>
        分
      </span>
      <button
        type="button"
        disabled={disabled}
        className="ml-auto h-8 rounded-full px-3 text-[12px] font-medium"
        style={{ background: LUMI_SHELL.ink, color: '#fff', opacity: disabled ? 0.45 : 1 }}
        onClick={commit}
      >
        应用
      </button>
    </div>
  )
}

function MetaLine({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
        {label}
      </span>
      <span
        className="min-w-0 text-right text-[12px] leading-snug"
        style={{ color: LUMI_SHELL.ink, ...(numeric ? LUMI_SHELL_NUM_STYLE : undefined) }}
      >
        {value}
      </span>
    </div>
  )
}

async function resolveSettingsContacts(propContacts: FriendPulseContact[]): Promise<FriendPulseContact[]> {
  const fromProp = propContacts
    .map((c) => ({
      characterId: String(c.characterId ?? '').trim(),
      remarkName: String(c.remarkName ?? '').trim() || '角色',
      avatarUrl: c.avatarUrl,
    }))
    .filter((c) => c.characterId)
  if (fromProp.length) return fromProp

  try {
    const chars = await Promise.race([
      personaDb.listCharacters(),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('listCharacters timeout')), 2500)
      }),
    ])
    return chars
      .map((c) => ({
        characterId: String(c.id ?? '').trim(),
        remarkName: String(c.name ?? c.wechatNickname ?? '').trim() || '角色',
        avatarUrl: c.avatarUrl,
      }))
      .filter((c) => c.characterId)
  } catch {
    return []
  }
}

function formatShortTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 碎碎念广场：按角色配置主动发布（定时 / 灵动）与下次预估 */
export function MurmurPublishSettingsSheet({
  open,
  contacts,
  onClose,
}: {
  open: boolean
  contacts: FriendPulseContact[]
  onClose: () => void
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [rows, setRows] = useState<RowState[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const contactsKey = contacts
    .map((c) => String(c.characterId ?? '').trim())
    .filter(Boolean)
    .join('|')

  useEffect(() => {
    if (!open) return
    setPortalRoot(resolvePortalRoot())
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const propSnapshot = contacts
      .map((c) => ({
        characterId: String(c.characterId ?? '').trim(),
        remarkName: String(c.remarkName ?? '').trim() || '角色',
        avatarUrl: c.avatarUrl,
      }))
      .filter((c) => c.characterId)

    if (propSnapshot.length) {
      setRows(
        propSnapshot.map((c, index) => ({
          contact: c,
          settings: { ...DEFAULT_MURMUR_PUBLISH_SETTINGS },
          activityMs: 0,
          expanded: index === 0,
        })),
      )
      setLoading(false)
    } else {
      setLoading(true)
      setRows([])
    }

    void (async () => {
      try {
        const list = propSnapshot.length ? propSnapshot : await resolveSettingsContacts([])
        if (cancelled) return
        if (!list.length) {
          setRows([])
          setLoading(false)
          return
        }

        const next = await Promise.all(
          list.map(async (c, index) => {
            let settings = { ...DEFAULT_MURMUR_PUBLISH_SETTINGS }
            try {
              settings = await loadMurmurPublishSettings(c.characterId)
            } catch {
              /* keep default */
            }
            return {
              contact: c,
              settings,
              activityMs: 0,
              expanded: settings.enabled || index === 0,
            } satisfies RowState
          }),
        )
        if (!cancelled) {
          setRows(next)
          setLoading(false)
        }

        for (const c of list) {
          if (cancelled) break
          try {
            const activityMs = await Promise.race([
              getMurmurLatestActivityMs(c.characterId),
              new Promise<number>((resolve) => {
                window.setTimeout(() => resolve(0), 800)
              }),
            ])
            if (cancelled || !activityMs) continue
            setRows((prev) =>
              prev.map((r) =>
                r.contact.characterId === c.characterId ? { ...r, activityMs } : r,
              ),
            )
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          if (!propSnapshot.length) setRows([])
          setLoading(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contactsKey])

  const patchRow = async (characterId: string, patch: Partial<MurmurPublishSettings>) => {
    setSavingId(characterId)
    try {
      const saved = await saveMurmurPublishSettings(characterId, patch)
      setRows((prev) =>
        prev.map((r) =>
          r.contact.characterId === characterId
            ? { ...r, settings: saved, expanded: true }
            : r,
        ),
      )
      try {
        window.dispatchEvent(new CustomEvent('wechat-storage-changed'))
      } catch {
        /* ignore */
      }
    } finally {
      setSavingId(null)
    }
  }

  const toggleExpand = (characterId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.contact.characterId === characterId
          ? { ...r, expanded: !r.expanded }
          : { ...r, expanded: false },
      ),
    )
  }

  if (!open) return null
  const root = portalRoot ?? (typeof document !== 'undefined' ? resolvePortalRoot() : null)
  if (!root) return null
  const useFixed = root === document.body

  return createPortal(
    <div
      className={`${useFixed ? 'fixed' : 'absolute'} inset-0 z-[5300] flex flex-col justify-end`}
      style={{ fontFamily: LUMI_SHELL_FONT }}
    >
      <button type="button" className="absolute inset-0 bg-black/35" aria-label="关闭" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[min(86vh,680px)] flex-col overflow-hidden rounded-t-[22px] bg-[#F7F6F4]">
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-black/15" />

        <div className="flex shrink-0 items-center px-4 pb-3 pt-2">
          <Pressable
            type="button"
            className="w-14 py-1 text-left text-[15px]"
            style={{ color: LUMI_SHELL.mist }}
            onClick={onClose}
          >
            关闭
          </Pressable>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-[16px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
              主动碎碎念
            </h2>
            <p className="mt-0.5 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
              开启后按灵动或定时自行发布
            </p>
          </div>
          <span className="w-14" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          {loading && !rows.length ? (
            <p className="py-12 text-center text-[13px]" style={{ color: LUMI_SHELL.mist }}>
              加载中…
            </p>
          ) : !rows.length ? (
            <p className="py-12 text-center text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
              暂无角色。请先在通讯录添加人设。
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {rows.map((row) => {
                const { contact, settings, activityMs, expanded } = row
                const src = resolveCharacterAvatarUrl({ avatarUrl: contact.avatarUrl }) || ''
                const busy = savingId === contact.characterId
                const locked = busy || !settings.enabled
                const nextHint = formatMurmurNextPublishHint(settings, {
                  activityMs,
                  now: nowTick,
                })
                const summary = !settings.enabled
                  ? '未开启'
                  : `${murmurModeLabel(settings.mode)} · ${
                      settings.mode === 'adaptive'
                        ? `冷却 ${formatMurmurDuration(settings.adaptiveMinCooldownSeconds)}`
                        : `间隔 ${formatMurmurDuration(settings.intervalSeconds)}`
                    }`

                return (
                  <div
                    key={contact.characterId}
                    className="overflow-hidden rounded-[18px] bg-white"
                    style={{ border: `1px solid ${LUMI_SHELL.hairline}` }}
                  >
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => toggleExpand(contact.characterId)}
                      >
                        <span
                          className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full"
                          style={{ background: LUMI_SHELL.hairline }}
                        >
                          {src ? (
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span
                              className="flex h-full w-full items-center justify-center text-[14px]"
                              style={{ color: LUMI_SHELL.mist }}
                            >
                              {(contact.remarkName || '?').slice(0, 1)}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[15px] font-semibold"
                            style={{ color: LUMI_SHELL.ink }}
                          >
                            {contact.remarkName}
                          </span>
                          <span
                            className="mt-0.5 block truncate text-[11px]"
                            style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
                          >
                            {summary}
                          </span>
                        </span>
                        <ChevronDown
                          size={16}
                          strokeWidth={2}
                          className="shrink-0 transition-transform"
                          style={{
                            color: LUMI_SHELL.mist,
                            transform: expanded ? 'rotate(180deg)' : undefined,
                          }}
                        />
                      </button>
                      <Switch
                        on={settings.enabled}
                        disabled={busy}
                        onToggle={() =>
                          void patchRow(contact.characterId, {
                            enabled: !settings.enabled,
                            mode: settings.mode || DEFAULT_MURMUR_PUBLISH_SETTINGS.mode,
                          })
                        }
                      />
                    </div>

                    {expanded ? (
                      <div
                        className="space-y-4 border-t px-3.5 pb-3.5 pt-3"
                        style={{ borderColor: LUMI_SHELL.hairline }}
                      >
                        <div
                          className="space-y-1.5 rounded-[14px] px-3 py-2.5"
                          style={{ background: 'rgba(16,16,18,0.035)' }}
                        >
                          <MetaLine
                            label="下次"
                            value={settings.enabled ? nextHint : '开启后显示'}
                            numeric
                          />
                          <MetaLine
                            label="上次"
                            value={
                              settings.lastPublishedAt > 0
                                ? formatShortTime(settings.lastPublishedAt)
                                : '尚未发布'
                            }
                            numeric
                          />
                          <MetaLine
                            label="剧情"
                            value={
                              activityMs > 0 ? formatShortTime(activityMs) : '暂无近况'
                            }
                            numeric
                          />
                        </div>

                        <div style={{ opacity: settings.enabled ? 1 : 0.45 }}>
                          <SectionLabel>发布模式</SectionLabel>
                          <Segmented2
                            value={settings.mode}
                            disabled={locked}
                            onChange={(mode) => void patchRow(contact.characterId, { mode })}
                            left={{
                              id: 'adaptive',
                              label: '灵动',
                              desc: '跟聊天与约会走',
                            }}
                            right={{
                              id: 'fixed',
                              label: '定时',
                              desc: '固定间隔尝试',
                            }}
                          />
                        </div>

                        {settings.mode === 'fixed' ? (
                          <div style={{ opacity: settings.enabled ? 1 : 0.45 }}>
                            <SectionLabel>
                              定时间隔 ·{' '}
                              <span style={LUMI_SHELL_NUM_STYLE}>
                                {formatMurmurDuration(settings.intervalSeconds)}
                              </span>
                            </SectionLabel>
                            <PillRow
                              options={MURMUR_PUBLISH_PRESETS}
                              value={settings.intervalSeconds}
                              disabled={locked}
                              onPick={(seconds) =>
                                void patchRow(contact.characterId, { intervalSeconds: seconds })
                              }
                            />
                            <CustomIntervalRow
                              seconds={settings.intervalSeconds}
                              disabled={locked}
                              onCommit={(sec) =>
                                void patchRow(contact.characterId, { intervalSeconds: sec })
                              }
                            />
                          </div>
                        ) : (
                          <div style={{ opacity: settings.enabled ? 1 : 0.45 }}>
                            <SectionLabel>
                              最短冷却 ·{' '}
                              <span style={LUMI_SHELL_NUM_STYLE}>
                                {formatMurmurDuration(settings.adaptiveMinCooldownSeconds)}
                              </span>
                            </SectionLabel>
                            <p className="mb-2 text-[11px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
                              发过之后至少隔这么久；有新聊天或约会剧情才会再试。
                            </p>
                            <PillRow
                              options={MURMUR_ADAPTIVE_COOLDOWN_PRESETS}
                              value={settings.adaptiveMinCooldownSeconds}
                              disabled={locked}
                              onPick={(seconds) =>
                                void patchRow(contact.characterId, {
                                  adaptiveMinCooldownSeconds: seconds,
                                })
                              }
                            />
                            <CustomIntervalRow
                              seconds={settings.adaptiveMinCooldownSeconds}
                              disabled={locked}
                              onCommit={(sec) =>
                                void patchRow(contact.characterId, {
                                  adaptiveMinCooldownSeconds: sec,
                                })
                              }
                            />
                          </div>
                        )}

                        <div style={{ opacity: settings.enabled ? 1 : 0.45 }}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-medium" style={{ color: LUMI_SHELL.ink }}>
                                安静时段
                              </p>
                              <p className="mt-0.5 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                                该时段不主动发布
                              </p>
                            </div>
                            <Switch
                              on={settings.quietHoursEnabled}
                              disabled={locked}
                              onToggle={() =>
                                void patchRow(contact.characterId, {
                                  quietHoursEnabled: !settings.quietHoursEnabled,
                                })
                              }
                            />
                          </div>
                          {settings.quietHoursEnabled ? (
                            <div className="flex items-center gap-2">
                              <select
                                disabled={locked}
                                value={settings.quietStartHour}
                                onChange={(e) =>
                                  void patchRow(contact.characterId, {
                                    quietStartHour: Number(e.target.value),
                                  })
                                }
                                className="h-9 flex-1 rounded-[12px] px-2.5 text-[13px] outline-none"
                                style={{
                                  background: '#fff',
                                  border: `1px solid ${LUMI_SHELL.hairline}`,
                                  color: LUMI_SHELL.ink,
                                  ...LUMI_SHELL_NUM_STYLE,
                                }}
                              >
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={`s-${i}`} value={i}>
                                    {String(i).padStart(2, '0')}:00
                                  </option>
                                ))}
                              </select>
                              <span className="text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                                —
                              </span>
                              <select
                                disabled={locked}
                                value={settings.quietEndHour}
                                onChange={(e) =>
                                  void patchRow(contact.characterId, {
                                    quietEndHour: Number(e.target.value),
                                  })
                                }
                                className="h-9 flex-1 rounded-[12px] px-2.5 text-[13px] outline-none"
                                style={{
                                  background: '#fff',
                                  border: `1px solid ${LUMI_SHELL.hairline}`,
                                  color: LUMI_SHELL.ink,
                                  ...LUMI_SHELL_NUM_STYLE,
                                }}
                              >
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={`e-${i}`} value={i}>
                                    {String(i).padStart(2, '0')}:00
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    root,
  )
}
