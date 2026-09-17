import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { BottomSheet } from '../../voiceprint/components/BottomSheet'
import {
  bindCharacterVoiceId,
  clearBoundCharacterVoiceId,
  lookupBoundVoiceIdForCharacter,
} from '../../voiceprint/characterVoiceMapStorage'
import {
  fetchMiniMaxVoices,
  readMiniMaxCredentialsFromLocalStorage,
  type MiniMaxVoiceInfo,
} from '../../voiceprint/services/minimaxApi'
import { VC } from './voiceCallTheme'

/**
 * 通话页内快捷绑定角色音色（不依赖 VoiceStoreProvider）。
 */
export function CallVoiceBindSheet({
  open,
  characterId,
  peerName,
  onClose,
  onBound,
}: {
  open: boolean
  characterId: string
  peerName: string
  onClose: () => void
  onBound?: (voiceId: string, voiceName: string) => void
}) {
  const [query, setQuery] = useState('')
  const [voices, setVoices] = useState<MiniMaxVoiceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boundVoiceId, setBoundVoiceId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const refreshBound = useCallback(async () => {
    const id = await lookupBoundVoiceIdForCharacter(characterId)
    setBoundVoiceId(id)
  }, [characterId])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setError(null)
    void refreshBound()
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const creds = readMiniMaxCredentialsFromLocalStorage()
        if (!creds.apiKey.trim()) {
          if (!cancelled) setError('请先在声纹档案配置 MiniMax API Key')
          return
        }
        const list = await fetchMiniMaxVoices(creds)
        if (!cancelled) setVoices(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '获取音色列表失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, refreshBound])

  const sections = useMemo(() => {
    const kw = query.trim().toLowerCase()
    const filtered = !kw
      ? voices
      : voices.filter(
          (v) =>
            (v.voice_name || '').toLowerCase().includes(kw) ||
            v.voice_id.toLowerCase().includes(kw),
        )
    const mine: MiniMaxVoiceInfo[] = []
    const system: MiniMaxVoiceInfo[] = []
    for (const v of filtered) {
      if (v.voice_type === 'system') system.push(v)
      else mine.push(v)
    }
    return [
      mine.length ? { key: 'mine', label: '我的音色', items: mine } : null,
      system.length ? { key: 'system', label: '系统音色', items: system } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; items: MiniMaxVoiceInfo[] }>
  }, [query, voices])

  const bind = async (v: MiniMaxVoiceInfo) => {
    if (!characterId.trim() || busyId) return
    setBusyId(v.voice_id)
    try {
      await bindCharacterVoiceId(characterId, v.voice_id)
      setBoundVoiceId(v.voice_id)
      onBound?.(v.voice_id, v.voice_name || v.voice_id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '绑定失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <BottomSheet
      open={open}
      title={`为「${peerName || '对方'}」绑定音色`}
      onClose={onClose}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-2">
          <Search size={14} className="text-[#6b7280]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索音色名 / voice_id"
            className="w-full bg-transparent text-[13px] text-[#111] outline-none placeholder:text-[#9ca3af]"
          />
        </div>
        {boundVoiceId ? (
          <Pressable
            type="button"
            className="rounded-full border border-black/10 bg-white/70 px-3 py-2 text-[12px] text-[#111] active:bg-black/5"
            onClick={() => {
              void (async () => {
                await clearBoundCharacterVoiceId(characterId)
                setBoundVoiceId('')
              })()
            }}
          >
            清除
          </Pressable>
        ) : null}
      </div>

      {boundVoiceId ? (
        <p className="mt-2 text-[11px]" style={{ color: VC.mist }}>
          当前已绑定：<span className="font-mono">{boundVoiceId}</span>
        </p>
      ) : (
        <p className="mt-2 text-[11px]" style={{ color: VC.mist }}>
          未绑定：通话合成将无法使用角色声纹，请从下方选择。
        </p>
      )}

      {error ? (
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</p>
      ) : null}

      <div className="mt-3 space-y-3">
        {loading ? (
          <p className="py-8 text-center text-[12px] text-[#9ca3af]">加载音色中…</p>
        ) : (
          sections.map((sec) => (
            <div key={sec.key}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                {sec.label}
              </p>
              <div className="space-y-1.5">
                {sec.items.map((v) => {
                  const selected = boundVoiceId === v.voice_id
                  return (
                    <Pressable
                      key={v.voice_id}
                      type="button"
                      disabled={!!busyId}
                      onClick={() => void bind(v)}
                      className="flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left active:bg-black/5 disabled:opacity-50"
                      style={{
                        borderColor: selected ? 'rgba(16,16,18,0.35)' : 'rgba(0,0,0,0.08)',
                        background: selected ? 'rgba(16,16,18,0.04)' : '#fff',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-[#111]">
                          {v.voice_name || v.voice_id}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-[#9ca3af]">{v.voice_id}</div>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#6b7280]">
                        {busyId === v.voice_id ? '绑定中…' : selected ? '已选' : '绑定'}
                      </span>
                    </Pressable>
                  )
                })}
              </div>
            </div>
          ))
        )}
        {!loading && !sections.length && !error ? (
          <p className="py-8 text-center text-[12px] text-[#9ca3af]">暂无可选音色</p>
        ) : null}
      </div>
    </BottomSheet>
  )
}
