import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { Pressable } from '../../../components/Pressable'
import { useCustomization } from '../../../CustomizationContext'
import { phoneNumStyle } from '../../../types'
import { personaDb } from '../newFriendsPersona/idb'
import type { WeChatTimeConfig } from '../newFriendsPersona/types'
import {
  alignOnlineClockToLatestChatTime,
  applyOnlineChatTimeFusion,
  formatStoryTimeClockFromMs,
  isPreferSystemClockDespiteStoryFloor,
  isWeChatClockAlignedWithStoryFloor,
  looksLikeRealWallClockMs,
  resetOnlineClockToSystemTime,
  resolveCharacterChatMessageTimeFloor,
  resolveCharacterStoryTimeFloor,
  restoreOnlineClockToStoryTime,
  syncStoryTimelineNowFromOnlineClock,
  type StoryTimeFloorInfo,
} from '../time/applyOnlineChatTimeFusion'
import {
  formatWeChatChatTimestamp,
  isCharacterTimePerceptionEnabled,
  normalizeWeChatTimeConfig,
  parseDateTimeLocalValue,
  resolveWeChatCurrentTimeMs,
  toDateTimeLocalValue,
} from '../time/wechatTimeUtils'
import { useWeChatCurrentTime } from '../time/useWeChatCurrentTime'
import {
  composeStoryTimelineCalendarAnchorLabel,
  formatGregorianStoryDayFromMs,
} from '../memory/storyTimelineTypes'

/** 柔和黑白：炭黑 / 雾灰，避免纯黑硬边 */
const ink = {
  soft: '#3a3a3a',
  mid: '#5c5c5c',
  mute: '#8a8a8a',
  line: '#e8e8e8',
  wash: '#f4f4f4',
  card: '#fafafa',
  sheet: '#f6f6f6',
  hint: '#6e6e6e',
} as const

function WxSwitch({
  on,
  onToggle,
  disabled,
}: {
  on: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onToggle}
      className="relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-45"
      style={{ backgroundColor: on ? ink.soft : '#d4d4d4' }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-[left] duration-200 ease-out"
        style={{ left: on ? 26 : 4 }}
      />
    </button>
  )
}

function multiplierText(multiplier: number) {
  return `1 : ${Math.round(multiplier)}`
}

function SoftDialogShell({
  children,
  onBackdrop,
  confirming,
}: {
  children: ReactNode
  onBackdrop: () => void
  confirming?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[1260] flex items-center justify-center px-5"
      style={{ backgroundColor: 'rgba(28,28,28,0.28)' }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !confirming) onBackdrop()
      }}
    >
      <div
        className="w-full max-w-[360px] overflow-hidden rounded-[28px] border bg-white shadow-[0_18px_48px_rgba(0,0,0,0.10)]"
        style={{ borderColor: ink.line }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function SoftGhostBtn({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Pressable
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 flex-1 items-center justify-center rounded-full border text-[14px] font-medium transition-colors active:bg-[#f0f0f0] disabled:opacity-50 ${className}`}
      style={{ borderColor: ink.line, color: ink.soft, backgroundColor: ink.wash }}
    >
      {children}
    </Pressable>
  )
}

function SoftPrimaryBtn({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Pressable
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 flex-1 items-center justify-center rounded-full text-[14px] font-medium text-white transition-opacity active:opacity-88 disabled:opacity-50 ${className}`}
      style={{ backgroundColor: ink.soft }}
    >
      {children}
    </Pressable>
  )
}

function TimeUnsavedDialog({
  open,
  onCancel,
  onDiscard,
  onSave,
}: {
  open: boolean
  onCancel: () => void
  onDiscard: () => void
  onSave: () => void
}) {
  if (!open) return null
  return (
    <SoftDialogShell onBackdrop={onCancel}>
      <div className="px-6 pb-3 pt-6 text-center">
        <h2 className="text-[16px] font-semibold tracking-wide" style={{ color: ink.soft }}>
          未保存修改
        </h2>
        <p className="mt-2.5 text-[13px] leading-6" style={{ color: ink.mid }}>
          你有未保存的时间设置，确定要退出吗？未保存的内容将会丢失。
        </p>
      </div>
      <div className="flex flex-col gap-2.5 px-5 pb-5 pt-2">
        <SoftPrimaryBtn onClick={onSave}>保存并退出</SoftPrimaryBtn>
        <div className="flex gap-2.5">
          <SoftGhostBtn onClick={onCancel}>取消</SoftGhostBtn>
          <SoftGhostBtn onClick={onDiscard}>不保存退出</SoftGhostBtn>
        </div>
      </div>
    </SoftDialogShell>
  )
}

function ResetSystemClockDialog({
  open,
  onCancel,
  onConfirm,
  confirming,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  confirming?: boolean
}) {
  if (!open) return null
  return (
    <SoftDialogShell onBackdrop={onCancel} confirming={confirming}>
      <div className="px-6 pb-3 pt-6 text-center">
        <h2 className="text-[16px] font-semibold tracking-wide" style={{ color: ink.soft }}>
          重置为手机系统时间
        </h2>
        <p className="mt-2.5 text-[13px] leading-6" style={{ color: ink.mid }}>
          将把本角色线上「现在」改回手机当前时间（例如 2026 年），并解除剧情锚点锁定，不会再被对话里的剧情年月日拽走。
        </p>
        <p className="mt-2 text-[13px] leading-6" style={{ color: ink.mid }}>
          历史气泡若已按剧情钟落在更晚年份，新消息落库时仍会排在会话末尾（时间戳 ≥ 最后一条），但设置页与 AI 注入的「现在」以手机时间为准。
        </p>
        <p className="mt-2 text-[13px] leading-6" style={{ color: ink.mid }}>
          不会自动改写线下摘要或约会剧情正文。若要跟剧情日历，请用「对齐到最新剧情时间」。
        </p>
      </div>
      <div className="flex gap-2.5 px-5 pb-5 pt-2">
        <SoftGhostBtn disabled={confirming} onClick={onCancel}>
          取消
        </SoftGhostBtn>
        <SoftPrimaryBtn disabled={confirming} onClick={onConfirm}>
          {confirming ? '处理中…' : '确认重置'}
        </SoftPrimaryBtn>
      </div>
    </SoftDialogShell>
  )
}

function RestoreStoryClockDialog({
  open,
  storyLabel,
  onCancel,
  onConfirm,
  confirming,
}: {
  open: boolean
  storyLabel: string
  onCancel: () => void
  onConfirm: () => void
  confirming?: boolean
}) {
  if (!open) return null
  const label = storyLabel.trim() || '当前剧情锚点'
  return (
    <SoftDialogShell onBackdrop={onCancel} confirming={confirming}>
      <div className="px-6 pb-3 pt-6 text-center">
        <h2 className="text-[16px] font-semibold tracking-wide" style={{ color: ink.soft }}>
          对齐到最新剧情时间
        </h2>
        <p className="mt-2.5 text-[13px] leading-6" style={{ color: ink.mid }}>
          将把本角色线上时间对齐到最新剧情锚点（约会剧情 / 线下摘要），并恢复剧情对线上时钟的锁定。
        </p>
        <p className="mt-2 text-[13px] leading-6" style={{ color: ink.soft }}>
          目标：{label}
        </p>
        {label === '暂无剧情锚点' ? (
          <p className="mt-2 text-[12px] leading-5" style={{ color: ink.hint }}>
            当前没有可用剧情时间点时，确认后会提示无法对齐。
          </p>
        ) : null}
      </div>
      <div className="flex gap-2.5 px-5 pb-5 pt-2">
        <SoftGhostBtn disabled={confirming} onClick={onCancel}>
          取消
        </SoftGhostBtn>
        <SoftPrimaryBtn disabled={confirming} onClick={onConfirm}>
          {confirming ? '处理中…' : '确认对齐'}
        </SoftPrimaryBtn>
      </div>
    </SoftDialogShell>
  )
}

function AlignLatestChatClockDialog({
  open,
  chatLabel,
  onCancel,
  onConfirm,
  confirming,
}: {
  open: boolean
  chatLabel: string
  onCancel: () => void
  onConfirm: () => void
  confirming?: boolean
}) {
  if (!open) return null
  const label = chatLabel.trim() || '最近一条私聊消息'
  return (
    <SoftDialogShell onBackdrop={onCancel} confirming={confirming}>
      <div className="px-6 pb-3 pt-6 text-center">
        <h2 className="text-[16px] font-semibold tracking-wide" style={{ color: ink.soft }}>
          对齐到最新线上对话时间
        </h2>
        <p className="mt-2.5 text-[13px] leading-6" style={{ color: ink.mid }}>
          将线上「现在」拨到本会话最后一条消息附近。适合隔了几小时才回来、仍想接着上一句聊，避免显得晾了很久。
        </p>
        <p className="mt-2 text-[13px] leading-6" style={{ color: ink.soft }}>
          目标：{label}
        </p>
        {label === '暂无私聊消息' ? (
          <p className="mt-2 text-[12px] leading-5" style={{ color: ink.hint }}>
            当前没有私聊消息时，确认后会提示无法对齐。
          </p>
        ) : null}
      </div>
      <div className="flex gap-2.5 px-5 pb-5 pt-2">
        <SoftGhostBtn disabled={confirming} onClick={onCancel}>
          取消
        </SoftGhostBtn>
        <SoftPrimaryBtn disabled={confirming} onClick={onConfirm}>
          {confirming ? '处理中…' : '确认对齐'}
        </SoftPrimaryBtn>
      </div>
    </SoftDialogShell>
  )
}

export function ChatTimeSettingsScreen({
  open,
  characterId,
  peerDisplayName,
  onClose,
}: {
  open: boolean
  characterId: string
  peerDisplayName: string
  onClose: () => void
}) {
  const { state } = useCustomization()
  const disableTransitions = state.ui.disablePageTransitions
  const { currentTimeMs, reload } = useWeChatCurrentTime({ characterId })
  const [form, setForm] = useState<WeChatTimeConfig>(() => normalizeWeChatTimeConfig())
  const [timePerceptionEnabled, setTimePerceptionEnabled] = useState(true)
  const [storyFloor, setStoryFloor] = useState<StoryTimeFloorInfo>({
    label: '',
    floorMs: null,
    hasFloor: false,
  })
  const [chatFloorMs, setChatFloorMs] = useState<number | null>(null)
  const [floorHint, setFloorHint] = useState('')
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [alignChatConfirmOpen, setAlignChatConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [aligningChat, setAligningChat] = useState(false)
  const [preferSystemClock, setPreferSystemClock] = useState(false)

  const lockedByStory = !preferSystemClock && storyFloor.hasFloor && storyFloor.floorMs != null

  const load = useCallback(async () => {
    const cid = characterId.trim()
    if (!cid) return
    const [gs, row, floor, chatFloor] = await Promise.all([
      personaDb.getGlobalSettings(),
      personaDb.getCharacterTimeSettings(cid),
      resolveCharacterStoryTimeFloor(cid),
      resolveCharacterChatMessageTimeFloor(cid),
    ])
    setChatFloorMs(chatFloor.hasFloor ? chatFloor.floorMs : null)
    let config = normalizeWeChatTimeConfig(row?.config ?? gs.globalTimeConfig)
    let perception = isCharacterTimePerceptionEnabled(row)
    const preferSystem = isPreferSystemClockDespiteStoryFloor(row)
    let hint = ''
    setPreferSystemClock(preferSystem)
    if (!preferSystem && floor.hasFloor && floor.floorMs != null) {
      perception = true
      const live = resolveWeChatCurrentTimeMs(config)
      const aligned = isWeChatClockAlignedWithStoryFloor(live, floor.floorMs, config.mode, {
        customBaseTime: config.customBaseTime,
      })
      if (!aligned) {
        const intentionalAdvance =
          config.mode === 'custom' &&
          Number.isFinite(config.customBaseTime) &&
          config.customBaseTime > floor.floorMs &&
          !looksLikeRealWallClockMs(config.customBaseTime) &&
          live - floor.floorMs <= 5 * 365 * 86_400_000

        if (intentionalAdvance) {
          // 用户已把线上时钟推到更远的故事日（如 26→27）：写入剧情轴，勿打回旧锚点
          config = normalizeWeChatTimeConfig({
            ...config,
            mode: 'custom',
            customBaseTime: live,
            customAnchorRealTime: Date.now(),
          })
          await applyOnlineChatTimeFusion({
            characterId: cid,
            chosenTimeMs: live,
            timeMultiplier: config.timeMultiplier,
            timePerceptionEnabled: true,
            mode: 'custom',
          })
          hint = '已将剧情轴「当前锚点」同步到线上时间'
          const nextFloor = await resolveCharacterStoryTimeFloor(cid)
          setStoryFloor(nextFloor.hasFloor ? nextFloor : floor)
        } else {
          // 有剧情锚点时，线上「现在」须落在剧情日历上（默认=锚点）；不能拿真实墙钟 Math.max 糊弄
          config = normalizeWeChatTimeConfig({
            ...config,
            mode: 'custom',
            customBaseTime: floor.floorMs,
            customAnchorRealTime: Date.now(),
          })
          await applyOnlineChatTimeFusion({
            characterId: cid,
            chosenTimeMs: floor.floorMs,
            timeMultiplier: config.timeMultiplier,
            timePerceptionEnabled: true,
            mode: 'custom',
          })
          hint = '已按剧情时间点对齐线上当前时间，可再往后调'
          const nextFloor = await resolveCharacterStoryTimeFloor(cid)
          setStoryFloor(nextFloor.hasFloor ? nextFloor : floor)
        }
      } else if (config.customBaseTime < floor.floorMs) {
        config = normalizeWeChatTimeConfig({
          ...config,
          mode: 'custom',
          customBaseTime: floor.floorMs,
          customAnchorRealTime: Date.now(),
        })
        hint = '不能早于剧情时间点，已钳制到剧情锚点'
        setStoryFloor(floor)
      } else {
        // 线上时钟已流逝：把剧情「现在」推到同一时刻，设置页与 AI 注入一致
        await syncStoryTimelineNowFromOnlineClock({
          characterId: cid,
          liveTimeMs: live,
        })
        const nextFloor = await resolveCharacterStoryTimeFloor(cid)
        setStoryFloor(nextFloor.hasFloor ? nextFloor : floor)
      }
    } else {
      setStoryFloor(floor)
      if (preferSystem) {
        hint = '已解除剧情锁定：线上「现在」跟随手机系统时间；线下摘要请自行核对'
      }
    }
    if (chatFloor.hasFloor && chatFloor.floorMs != null && !preferSystem) {
      const liveAfter = resolveWeChatCurrentTimeMs(config)
      if (liveAfter < chatFloor.floorMs) {
        config = normalizeWeChatTimeConfig({
          ...config,
          mode: 'custom',
          customBaseTime: chatFloor.floorMs,
          customAnchorRealTime: Date.now(),
        })
        hint = '不能早于本会话最后一条消息时间，已对齐到消息之后'
      } else if (!hint) {
        hint = '若只想缩短「隔了很久才回」的体感：直接把时间拨到最后一条消息附近即可，不必先重置为系统时间'
      }
    } else if (preferSystem && !hint) {
      hint = '已解除剧情锁定：线上「现在」跟随手机系统时间'
    }
    setForm(config)
    setTimePerceptionEnabled(perception)
    setFloorHint(hint)
    setSavedSnapshot(JSON.stringify({ config, timePerceptionEnabled: perception }))
    void reload()
  }, [characterId, reload])

  useEffect(() => {
    if (!open) return
    void load()
  }, [load, open])

  const dirty =
    savedSnapshot !==
    JSON.stringify({ config: normalizeWeChatTimeConfig(form), timePerceptionEnabled })

  const setChosenTime = useCallback(
    (rawMs: number) => {
      let next = rawMs
      // 已脱离剧情、跟手机墙钟时：不要用「剧情戳消息」把拨钟再次抬回 2028
      const floors = [
        lockedByStory ? storyFloor.floorMs : null,
        preferSystemClock ? null : chatFloorMs,
      ].filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      const hardFloor = floors.length ? Math.max(...floors) : null
      if (hardFloor != null && next < hardFloor) {
        next = hardFloor
        setFloorHint(
          chatFloorMs != null && hardFloor === chatFloorMs
            ? '不能早于本会话最后一条消息，已钳制到消息之后'
            : '不能早于剧情时间点，已钳制到剧情锚点',
        )
      } else {
        setFloorHint('')
      }
      setForm((prev) => ({
        ...prev,
        mode: 'custom',
        customBaseTime: next,
        customAnchorRealTime: Date.now(),
      }))
    },
    [chatFloorMs, lockedByStory, preferSystemClock, storyFloor.floorMs],
  )

  const save = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      // 必须用流动中的「现在」作为新基点；若写 form.customBaseTime 会把已流逝的时间拨回保存前的起点
      const liveNow = resolveWeChatCurrentTimeMs(form)
      const result = await applyOnlineChatTimeFusion({
        characterId,
        chosenTimeMs: liveNow,
        timeMultiplier: form.timeMultiplier,
        timePerceptionEnabled: lockedByStory ? true : timePerceptionEnabled,
        mode: lockedByStory ? 'custom' : form.mode,
      })
      if (result.clamped) {
        setFloorHint(
          chatFloorMs != null && result.chosenTimeMs === chatFloorMs
            ? '不能早于本会话最后一条消息，已钳制到消息之后'
            : '不能早于剧情/会话时间下限，已自动钳制',
        )
      }
      const nextForm = normalizeWeChatTimeConfig({
        mode: lockedByStory || form.mode === 'custom' ? 'custom' : form.mode,
        customBaseTime: result.chosenTimeMs,
        customAnchorRealTime: Date.now(),
        timeMultiplier: form.timeMultiplier,
      })
      const perception = lockedByStory ? true : timePerceptionEnabled
      setForm(nextForm)
      setTimePerceptionEnabled(perception)
      setSavedSnapshot(JSON.stringify({ config: nextForm, timePerceptionEnabled: perception }))
      if (result.advancedStory) {
        setStoryFloor({
          label: result.storyLabel,
          floorMs: result.chosenTimeMs,
          hasFloor: true,
        })
      }
      void reload()
    } finally {
      setSaving(false)
    }
  }, [characterId, chatFloorMs, form, lockedByStory, reload, saving, timePerceptionEnabled])

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true)
      return
    }
    onClose()
  }, [dirty, onClose])

  const handleSaveAndExit = useCallback(async () => {
    await save()
    setConfirmOpen(false)
    onClose()
  }, [onClose, save])

  const handleRestoreToStoryTime = useCallback(async () => {
    if (restoring || resetting || aligningChat) return
    setRestoring(true)
    try {
      const result = await restoreOnlineClockToStoryTime(characterId)
      setRestoreConfirmOpen(false)
      setPreferSystemClock(false)
      setFloorHint(
        result.storyLabel.trim()
          ? `已对齐到最新剧情时间：${result.storyLabel.trim()}`
          : '已对齐到最新剧情时间',
      )
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setFloorHint(msg === 'no_story_floor' ? '暂无可对齐的剧情时间点' : '对齐失败，请稍后重试')
      setRestoreConfirmOpen(false)
    } finally {
      setRestoring(false)
    }
  }, [aligningChat, characterId, load, resetting, restoring])

  const handleAlignToLatestChat = useCallback(async () => {
    if (aligningChat || resetting || restoring) return
    setAligningChat(true)
    try {
      const result = await alignOnlineClockToLatestChatTime(characterId)
      setAlignChatConfirmOpen(false)
      setPreferSystemClock(false)
      setFloorHint(`已对齐到最新线上对话时间：${result.label}`)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setFloorHint(msg === 'no_chat_floor' ? '暂无可用的线上对话时间' : '对齐失败，请稍后重试')
      setAlignChatConfirmOpen(false)
    } finally {
      setAligningChat(false)
    }
  }, [aligningChat, characterId, load, resetting, restoring])

  const handleResetToSystemTime = useCallback(async () => {
    if (resetting || restoring || aligningChat) return
    setResetting(true)
    try {
      await resetOnlineClockToSystemTime(characterId)
      setResetConfirmOpen(false)
      setPreferSystemClock(true)
      setFloorHint('已重置为手机系统时间，并解除剧情锚点锁定')
      await load()
    } finally {
      setResetting(false)
    }
  }, [aligningChat, characterId, load, resetting, restoring])

  // currentTimeMs 每秒 tick，带动自定义时钟按倍率刷新展示
  const displayLiveMs = useMemo(() => {
    if (lockedByStory || form.mode === 'custom') {
      return resolveWeChatCurrentTimeMs(form)
    }
    return currentTimeMs
  }, [currentTimeMs, form, lockedByStory])

  /** 聊天时间戳预览：相对「当前线上现在」的几种常见展示 */
  const timestampPreviewRows = useMemo(() => {
    const now = displayLiveMs
    if (!Number.isFinite(now) || now <= 0) {
      return [{ label: '示例', stamp: '—' }]
    }
    const samples: Array<{ label: string; offsetMs: number }> = [
      { label: '今天 · 刚才', offsetMs: -2 * 60_000 },
      { label: '昨天', offsetMs: -26 * 60 * 60_000 },
      { label: '一周前', offsetMs: -7 * 24 * 60 * 60_000 },
      { label: '更早', offsetMs: -40 * 24 * 60 * 60_000 },
    ]
    return samples.map((s) => ({
      label: s.label,
      stamp: formatWeChatChatTimestamp(now + s.offsetMs, now),
    }))
  }, [displayLiveMs])

  const effectiveMinMs = useMemo(() => {
    const floors = [
      lockedByStory ? storyFloor.floorMs : null,
      preferSystemClock ? null : chatFloorMs,
    ].filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    return floors.length ? Math.max(...floors) : null
  }, [chatFloorMs, lockedByStory, preferSystemClock, storyFloor.floorMs])
  const minLocal = effectiveMinMs != null ? toDateTimeLocalValue(effectiveMinMs) : undefined

  /** 剧情时间点与线上「现在」同步流逝（有锚点时） */
  const liveStoryLabel = useMemo(() => {
    if (!lockedByStory) return ''
    const ms =
      storyFloor.floorMs != null && displayLiveMs < storyFloor.floorMs
        ? storyFloor.floorMs
        : displayLiveMs
    return composeStoryTimelineCalendarAnchorLabel({
      story_day: formatGregorianStoryDayFromMs(ms),
      story_time: formatStoryTimeClockFromMs(ms),
    }).trim()
  }, [displayLiveMs, lockedByStory, storyFloor.floorMs])
  const storyTimeDisplay = liveStoryLabel || storyFloor.label.trim() || '暂无剧情时间点'
  const latestChatLabel =
    typeof chatFloorMs === 'number' && Number.isFinite(chatFloorMs)
      ? new Date(chatFloorMs).toLocaleString('zh-CN', { hour12: false })
      : '暂无私聊消息'
  const storyAlignTargetLabel = storyFloor.label.trim() || '暂无剧情锚点'
  const actionsBusy = saving || resetting || restoring || aligningChat
  /** 设定框与「当前线上时间」同源，避免 system 模式下仍显示旧的 customBaseTime */
  const chosenTimeInputMs =
    lockedByStory || form.mode === 'custom' ? resolveWeChatCurrentTimeMs(form) : displayLiveMs

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[1230]"
            style={{ backgroundColor: 'rgba(28,28,28,0.22)' }}
            initial={disableTransitions ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={disableTransitions ? { opacity: 1 } : { opacity: 0 }}
            transition={disableTransitions ? { duration: 0 } : { duration: 0.2 }}
            onClick={requestClose}
          />
          <motion.div
            initial={disableTransitions ? false : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={disableTransitions ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
            transition={disableTransitions ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[1240] mx-auto flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden overflow-x-hidden overscroll-x-none touch-pan-y rounded-t-[32px] border shadow-[0_-14px_48px_rgba(0,0,0,0.08)]"
            style={{
              borderColor: ink.line,
              backgroundColor: ink.sheet,
              touchAction: 'pan-y',
              overscrollBehaviorX: 'none',
            }}
            drag={false}
            onPointerDownCapture={(e) => e.stopPropagation()}
            onTouchStartCapture={(e) => e.stopPropagation()}
            onTouchMoveCapture={(e) => e.stopPropagation()}
          >
              <header
                className="flex shrink-0 items-center px-4 pb-3 pt-4"
                style={{ borderBottom: `1px solid ${ink.line}` }}
              >
                <Pressable
                  type="button"
                  aria-label="返回"
                  onClick={requestClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-[#ececec]"
                  style={{ color: ink.soft }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Pressable>
                <div className="min-w-0 flex-1 px-2 text-center">
                  <h2 className="truncate text-[17px] font-semibold tracking-wide" style={{ color: ink.soft }}>
                    {peerDisplayName} 的时间设置
                  </h2>
                  <p className="mt-1 text-[12px]" style={{ color: ink.mute }}>
                    仅当前角色生效 · 融合剧情锚点
                  </p>
                </div>
                <div className="w-10 shrink-0" />
              </header>

              <div
                className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none overscroll-y-contain touch-pan-y px-4 py-4 [-webkit-overflow-scrolling:touch]"
                style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
              >
                <div className="min-w-0 max-w-full space-y-3">
                  <section
                    className="rounded-[22px] border bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
                    style={{ borderColor: ink.line }}
                  >
                    <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: ink.mute }}>
                      剧情时间点
                    </p>
                    <p
                      className="mt-1 text-[20px] font-semibold leading-snug tabular-nums"
                      style={{ ...phoneNumStyle, color: ink.soft }}
                    >
                      {storyTimeDisplay}
                    </p>
                    <p className="mt-2 text-[12px] leading-5" style={{ color: ink.mute }}>
                      {lockedByStory
                        ? '已有剧情锚点：与上方线上「现在」同步流逝；只能往后推。打开面板时若仍停在真实墙钟会自动对齐。保存时同步推进剧情轴。'
                        : preferSystemClock
                          ? '已解除剧情锚点对线上时钟的锁定，当前跟随设备本地时间。线下摘要时间点请自行到记忆档案馆核对。'
                          : '暂无剧情锚点时，可自由开关时间感知与系统/自定义时间。'}
                    </p>
                  </section>

                  <section
                    className="rounded-[22px] border bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
                    style={{ borderColor: ink.line }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[16px] font-medium" style={{ color: ink.soft }}>
                          启用时间感知
                        </p>
                        <p className="mt-1 text-[13px]" style={{ color: ink.mute }}>
                          {lockedByStory
                            ? '已有剧情时间点，时间感知已锁定开启，避免与剧情时序矛盾'
                            : '关闭后模型不再接收系统注入的「当前时间点」，仅根据聊天记录与对话语境推断时段'}
                        </p>
                      </div>
                      <WxSwitch
                        on={lockedByStory ? true : timePerceptionEnabled}
                        disabled={lockedByStory}
                        onToggle={() => {
                          if (lockedByStory) return
                          setTimePerceptionEnabled((v) => !v)
                        }}
                      />
                    </div>
                  </section>

                  <section
                    className="rounded-[22px] border bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
                    style={{ borderColor: ink.line }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[16px] font-medium" style={{ color: ink.soft }}>
                          使用自定义时间
                        </p>
                        <p className="mt-1 text-[13px]" style={{ color: ink.mute }}>
                          {lockedByStory
                            ? '已有剧情锚点时须用自定义时间，并与剧情轴同步推进'
                            : '关闭后该角色回退为系统时间'}
                        </p>
                      </div>
                      <WxSwitch
                        on={lockedByStory ? true : form.mode === 'custom'}
                        disabled={lockedByStory}
                        onToggle={() => {
                          if (lockedByStory) return
                          setForm((prev) => ({
                            ...prev,
                            mode: prev.mode === 'custom' ? 'system' : 'custom',
                            customAnchorRealTime: Date.now(),
                          }))
                        }}
                      />
                    </div>
                  </section>

                  <section
                    className="rounded-[22px] border bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
                    style={{ borderColor: ink.line }}
                  >
                    <div className="rounded-[18px] px-3.5 py-3" style={{ backgroundColor: ink.wash }}>
                      <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: ink.mute }}>
                        当前线上时间
                      </p>
                      <p
                        className="mt-1 text-[20px] font-semibold tabular-nums"
                        style={{ ...phoneNumStyle, color: ink.soft }}
                      >
                        {new Date(displayLiveMs).toLocaleString('zh-CN', { hour12: false })}
                      </p>
                    </div>
                    <div
                      className={`mt-4 ${lockedByStory || form.mode === 'custom' ? '' : 'pointer-events-none opacity-45'}`}
                    >
                      <label className="block text-[14px]" style={{ color: ink.mid }}>
                        <span>设定当前时间</span>
                        <input
                          type="datetime-local"
                          min={minLocal}
                          value={toDateTimeLocalValue(chosenTimeInputMs)}
                          onChange={(e) => setChosenTime(parseDateTimeLocalValue(e.target.value))}
                          className="mt-2 h-11 w-full min-w-0 max-w-full rounded-full border bg-white px-4 text-[14px] outline-none tabular-nums"
                          style={{ ...phoneNumStyle, borderColor: ink.line, color: ink.soft }}
                        />
                      </label>
                      {floorHint ? (
                        <p className="mt-2 text-[12px] leading-5" style={{ color: ink.hint }}>
                          {floorHint}
                        </p>
                      ) : null}
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[14px]" style={{ color: ink.mid }}>
                            时间流速
                          </span>
                          <span className="text-[13px] tabular-nums" style={{ ...phoneNumStyle, color: ink.mute }}>
                            {multiplierText(form.timeMultiplier)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={240}
                          value={Math.round(form.timeMultiplier)}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              mode: 'custom',
                              timeMultiplier: Math.max(1, Number(e.target.value) || 1),
                              customBaseTime: resolveWeChatCurrentTimeMs(prev),
                              customAnchorRealTime: Date.now(),
                            }))
                          }
                          className="mt-2 w-full"
                          style={{ accentColor: ink.soft }}
                        />
                        <input
                          type="number"
                          min={1}
                          max={86400}
                          step={1}
                          value={Math.round(form.timeMultiplier)}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              mode: 'custom',
                              timeMultiplier: Math.max(1, Number(e.target.value) || 1),
                              customBaseTime: resolveWeChatCurrentTimeMs(prev),
                              customAnchorRealTime: Date.now(),
                            }))
                          }
                          className="mt-3 h-11 w-full rounded-full border bg-white px-4 text-[14px] outline-none tabular-nums"
                          style={{ ...phoneNumStyle, borderColor: ink.line, color: ink.soft }}
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    className="rounded-[22px] border bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
                    style={{ borderColor: ink.line }}
                  >
                    <p className="text-[14px] font-medium" style={{ color: ink.soft }}>
                      时间戳预览
                    </p>
                    <p className="mt-1 text-[12px] leading-5" style={{ color: ink.mute }}>
                      聊天气泡上方的时间戳，相对当前线上「现在」：
                      <span className="tabular-nums" style={{ ...phoneNumStyle, color: ink.mid }}>
                        {new Date(displayLiveMs).toLocaleString('zh-CN', { hour12: false })}
                      </span>
                    </p>
                    <div className="mt-3 space-y-2">
                      {timestampPreviewRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-2"
                          style={{ backgroundColor: ink.wash }}
                        >
                          <span className="text-[12px]" style={{ color: ink.mute }}>
                            {row.label}
                          </span>
                          <span
                            className="text-[12px] tabular-nums"
                            style={{ ...phoneNumStyle, color: ink.soft }}
                          >
                            {row.stamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div
                className="shrink-0 px-4 pb-4 pt-3"
                style={{
                  borderTop: `1px solid ${ink.line}`,
                  backgroundColor: '#fff',
                  paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
                }}
              >
                <SoftGhostBtn
                  disabled={actionsBusy}
                  onClick={() => setAlignChatConfirmOpen(true)}
                  className="mb-2.5 w-full !flex-none text-[15px]"
                >
                  对齐到最新线上对话时间
                </SoftGhostBtn>
                <SoftGhostBtn
                  disabled={actionsBusy}
                  onClick={() => setRestoreConfirmOpen(true)}
                  className="mb-2.5 w-full !flex-none text-[15px]"
                >
                  对齐到最新剧情时间
                </SoftGhostBtn>
                <SoftGhostBtn
                  disabled={actionsBusy}
                  onClick={() => setResetConfirmOpen(true)}
                  className="mb-2.5 w-full !flex-none text-[15px]"
                >
                  重置为手机系统时间
                </SoftGhostBtn>
                <SoftPrimaryBtn
                  disabled={actionsBusy}
                  onClick={() => void save()}
                  className="w-full !flex-none text-[15px]"
                >
                  {saving ? '保存中…' : lockedByStory ? '保存并推进剧情时间' : '保存'}
                </SoftPrimaryBtn>
              </div>
          </motion.div>

          <TimeUnsavedDialog
            open={confirmOpen}
            onCancel={() => setConfirmOpen(false)}
            onDiscard={() => {
              setConfirmOpen(false)
              onClose()
            }}
            onSave={() => void handleSaveAndExit()}
          />
          <ResetSystemClockDialog
            open={resetConfirmOpen}
            confirming={resetting}
            onCancel={() => {
              if (resetting) return
              setResetConfirmOpen(false)
            }}
            onConfirm={() => void handleResetToSystemTime()}
          />
          <RestoreStoryClockDialog
            open={restoreConfirmOpen}
            storyLabel={storyAlignTargetLabel}
            confirming={restoring}
            onCancel={() => {
              if (restoring) return
              setRestoreConfirmOpen(false)
            }}
            onConfirm={() => void handleRestoreToStoryTime()}
          />
          <AlignLatestChatClockDialog
            open={alignChatConfirmOpen}
            chatLabel={latestChatLabel}
            confirming={aligningChat}
            onCancel={() => {
              if (aligningChat) return
              setAlignChatConfirmOpen(false)
            }}
            onConfirm={() => void handleAlignToLatestChat()}
          />
        </>
      ) : null}
    </AnimatePresence>
  )
}
