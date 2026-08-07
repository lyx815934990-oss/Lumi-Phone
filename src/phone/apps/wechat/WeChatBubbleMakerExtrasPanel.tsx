import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ApiConfig } from '../api/types'
import type { WeChatTheme } from '../../types'
import { Pressable } from '../../components/Pressable'
import { compressAvatarDataUrl, MAX_AVATAR_DATA_URL_LEN } from './avatarCompress'
import {
  emptyWeChatAvatarChrome,
  WECHAT_AVATAR_BADGE_CORNERS,
  type WeChatAvatarBadgeChrome,
  type WeChatAvatarBadgeCorner,
  type WeChatAvatarChrome,
  type WeChatAvatarChromeAssetMeta,
} from './wechatAvatarChrome'
import {
  listWeChatAvatarChromeAssets,
  persistWeChatAvatarChromeAsset,
  resolveWeChatAvatarChromeAssetUrls,
} from './wechatAvatarChromePersist'
import {
  generateBubblePackWithLumiAssistant,
  type LumiBubbleAssistantTurn,
  type LumiWeChatBubblePack,
} from './bubblePack'
import { serializeLumiBubblePack } from './bubblePack/parse'

type Props = {
  wechatTheme: WeChatTheme
  setWeChatTheme: (patch: Partial<WeChatTheme>) => void
  apiConfig: ApiConfig | null | undefined
  /** 套用助手生成的气泡包 */
  onApplyPack: (pack: LumiWeChatBubblePack) => void | Promise<void>
  /** 确认植入后滚到气泡预览区 */
  onScrollToPreview?: () => void
  /** wechat=微信主题气泡页；studio=主题制作机 */
  surface?: 'wechat' | 'studio'
  /** 默认两项都显示；主题制作机可只挂头像装饰 */
  sections?: Array<'chrome' | 'assist'>
}

function CornerPicker({
  value,
  onChange,
}: {
  value: WeChatAvatarBadgeCorner
  onChange: (c: WeChatAvatarBadgeCorner) => void
}) {
  const labels: Record<WeChatAvatarBadgeCorner, string> = {
    tl: '左上',
    tr: '右上',
    bl: '左下',
    br: '右下',
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {WECHAT_AVATAR_BADGE_CORNERS.map((c) => (
        <Pressable
          key={c}
          onClick={() => onChange(c)}
          className="rounded-[10px] border px-2 py-1 text-[11px]"
          style={{
            borderColor: 'var(--wx-border)',
            background: value === c ? 'rgba(0,0,0,0.08)' : 'transparent',
            color: 'var(--wx-text)',
          }}
        >
          {labels[c]}
        </Pressable>
      ))}
    </div>
  )
}

function AssetThumb({
  assetId,
  urls,
  selected,
  onPick,
  label,
}: {
  assetId: string
  urls: Record<string, string>
  selected: boolean
  onPick: () => void
  label: string
}) {
  const src = urls[assetId]
  return (
    <Pressable
      onClick={onPick}
      className="flex w-[64px] flex-col items-center gap-1"
      title={label}
    >
      <div
        className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[10px] border"
        style={{
          borderColor: selected ? 'var(--wx-text)' : 'var(--wx-border)',
          background: 'rgba(0,0,0,0.03)',
          boxShadow: selected ? '0 0 0 1px var(--wx-text)' : undefined,
        }}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
            …
          </span>
        )}
      </div>
      <span className="w-full truncate text-center text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
        {label}
      </span>
    </Pressable>
  )
}

export function WeChatBubbleMakerExtrasPanel({
  wechatTheme,
  setWeChatTheme,
  apiConfig,
  onApplyPack,
  onScrollToPreview,
  surface = 'wechat',
  sections = ['chrome', 'assist'],
}: Props) {
  const showChrome = sections.includes('chrome')
  const showAssist = sections.includes('assist')
  const chrome = wechatTheme.avatarChrome ?? emptyWeChatAvatarChrome()
  const [assets, setAssets] = useState<WeChatAvatarChromeAssetMeta[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement | null>(null)
  const uploadTargetRef = useRef<'library' | 'selfFrame' | 'otherFrame' | 'selfBadge' | 'otherBadge'>(
    'library',
  )

  const [assistText, setAssistText] = useState('')
  const [assistExpand, setAssistExpand] = useState(false)
  const [assistBusy, setAssistBusy] = useState(false)
  const [assistError, setAssistError] = useState('')
  const [priorTurns, setPriorTurns] = useState<LumiBubbleAssistantTurn[]>([])
  /** 已生成、待用户确认植入的包 */
  const [pendingPack, setPendingPack] = useState<LumiWeChatBubblePack | null>(null)
  const [pendingCode, setPendingCode] = useState('')
  const [implantBusy, setImplantBusy] = useState(false)
  const [lastImplantedId, setLastImplantedId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pendingCodeRef = useRef<HTMLDivElement | null>(null)

  const refreshAssets = useCallback(async () => {
    const list = await listWeChatAvatarChromeAssets()
    setAssets(list)
    const map = await resolveWeChatAvatarChromeAssetUrls(list.map((a) => a.id))
    setUrls(map)
  }, [])

  useEffect(() => {
    void refreshAssets()
  }, [refreshAssets, chrome.selfFrameAssetId, chrome.otherFrameAssetId, chrome.selfBadge?.assetId, chrome.otherBadge?.assetId])

  const patchChrome = useCallback(
    (patch: Partial<WeChatAvatarChrome>) => {
      setWeChatTheme({
        avatarChrome: { ...emptyWeChatAvatarChrome(), ...chrome, ...patch },
      })
    },
    [chrome, setWeChatTheme],
  )

  const onFilePicked = useCallback(
    async (file: File | null) => {
      if (!file) return
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = () => reject(new Error('读取失败'))
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.readAsDataURL(file)
        })
        const compressed = await compressAvatarDataUrl(dataUrl, MAX_AVATAR_DATA_URL_LEN)
        const meta = await persistWeChatAvatarChromeAsset({
          dataUrl: compressed,
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 32) || '图标',
          mime: file.type || 'image/png',
        })
        await refreshAssets()
        const target = uploadTargetRef.current
        if (target === 'selfFrame') patchChrome({ selfFrameAssetId: meta.id })
        else if (target === 'otherFrame') patchChrome({ otherFrameAssetId: meta.id })
        else if (target === 'selfBadge') {
          patchChrome({
            selfBadge: {
              assetId: meta.id,
              corner: chrome.selfBadge?.corner ?? 'bl',
              scale: chrome.selfBadge?.scale ?? 0.4,
            },
          })
        } else if (target === 'otherBadge') {
          patchChrome({
            otherBadge: {
              assetId: meta.id,
              corner: chrome.otherBadge?.corner ?? 'br',
              scale: chrome.otherBadge?.scale ?? 0.4,
            },
          })
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : '上传失败')
      }
    },
    [chrome.otherBadge?.corner, chrome.otherBadge?.scale, chrome.selfBadge?.corner, chrome.selfBadge?.scale, patchChrome, refreshAssets],
  )

  const openUpload = (target: typeof uploadTargetRef.current) => {
    uploadTargetRef.current = target
    fileRef.current?.click()
  }

  const setBadge = (
    side: 'self' | 'other',
    next: WeChatAvatarBadgeChrome | null,
  ) => {
    if (side === 'self') patchChrome({ selfBadge: next })
    else patchChrome({ otherBadge: next })
  }

  const apiReady = !!(
    apiConfig?.apiUrl?.trim() &&
    apiConfig?.apiKey?.trim() &&
    apiConfig?.modelId?.trim()
  )

  const assetHints = useMemo(
    () => assets.map((a) => ({ id: a.id, name: a.name })),
    [assets],
  )

  const runAssistant = useCallback(
    async (mode: 'fresh' | 'revise') => {
      if (!apiConfig || !apiReady) {
        setAssistError('请先在 API 设置中配置 chatCard')
        return
      }
      const text = assistText.trim()
      if (!text) {
        setAssistError(mode === 'revise' ? '请输入改稿说明' : '请先描述想要的气泡风格')
        return
      }
      setAssistError('')
      setAssistBusy(true)
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const result = await generateBubblePackWithLumiAssistant({
          apiConfig,
          userText: text,
          assets: assetHints,
          // 首轮不传当前主题包，避免模型以现有预设为底稿
          priorTurns: mode === 'revise' ? priorTurns : undefined,
          signal: ac.signal,
        })
        const pack = result.pack
        const assistantContent = serializeLumiBubblePack(pack)
        setPendingPack(pack)
        setPendingCode(assistantContent)
        setLastImplantedId(null)
        if (mode === 'fresh') {
          setPriorTurns([
            { role: 'user', content: text },
            { role: 'assistant', content: assistantContent },
          ])
        } else {
          setPriorTurns((prev) => [
            ...prev,
            { role: 'user', content: text },
            { role: 'assistant', content: assistantContent },
          ])
        }
        setAssistText('')
        setAssistExpand(true)
        requestAnimationFrame(() => {
          pendingCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        setAssistError(err instanceof Error ? err.message : '生成失败')
      } finally {
        setAssistBusy(false)
      }
    },
    [apiConfig, apiReady, assistText, assetHints, priorTurns],
  )

  const confirmImplantPending = useCallback(async () => {
    if (!pendingPack) return
    setImplantBusy(true)
    setAssistError('')
    try {
      await onApplyPack(pendingPack)
      setLastImplantedId(pendingPack.meta.id)
      onScrollToPreview?.()
    } catch (err) {
      setAssistError(err instanceof Error ? err.message : '植入失败')
    } finally {
      setImplantBusy(false)
    }
  }, [onApplyPack, onScrollToPreview, pendingPack])

  const dismissPending = useCallback(() => {
    setPendingPack(null)
    setPendingCode('')
    setLastImplantedId(null)
  }, [])

  const stopAssistant = () => {
    abortRef.current?.abort()
    setAssistBusy(false)
  }

  const renderSideChrome = (side: 'self' | 'other') => {
    const isSelf = side === 'self'
    const frameId = isSelf ? chrome.selfFrameAssetId : chrome.otherFrameAssetId
    const badge = isSelf ? chrome.selfBadge : chrome.otherBadge
    const title = isSelf ? '用户侧（自己）' : '角色侧（对方）'
    return (
      <div className="rounded-[14px] border p-2.5" style={{ borderColor: 'var(--wx-border)' }}>
        <p className="text-[11px] font-medium" style={{ color: 'var(--wx-text)' }}>
          {title}
        </p>
        <p className="mt-1 text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
          头像框
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Pressable
            onClick={() => openUpload(isSelf ? 'selfFrame' : 'otherFrame')}
            className="rounded-[10px] border px-2 py-1 text-[11px]"
            style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text)' }}
          >
            上传框
          </Pressable>
          <Pressable
            onClick={() =>
              patchChrome(isSelf ? { selfFrameAssetId: null } : { otherFrameAssetId: null })
            }
            className="rounded-[10px] border px-2 py-1 text-[11px]"
            style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text-muted)' }}
          >
            清除框
          </Pressable>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {assets.map((a) => (
            <AssetThumb
              key={`frame-${side}-${a.id}`}
              assetId={a.id}
              urls={urls}
              selected={frameId === a.id}
              label={a.name}
              onPick={() =>
                patchChrome(isSelf ? { selfFrameAssetId: a.id } : { otherFrameAssetId: a.id })
              }
            />
          ))}
        </div>
        <p className="mt-2 text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
          角标贴纸
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Pressable
            onClick={() => openUpload(isSelf ? 'selfBadge' : 'otherBadge')}
            className="rounded-[10px] border px-2 py-1 text-[11px]"
            style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text)' }}
          >
            上传角标
          </Pressable>
          <Pressable
            onClick={() => setBadge(side, null)}
            className="rounded-[10px] border px-2 py-1 text-[11px]"
            style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text-muted)' }}
          >
            清除角标
          </Pressable>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {assets.map((a) => (
            <AssetThumb
              key={`badge-${side}-${a.id}`}
              assetId={a.id}
              urls={urls}
              selected={badge?.assetId === a.id}
              label={a.name}
              onPick={() =>
                setBadge(side, {
                  assetId: a.id,
                  corner: badge?.corner ?? (isSelf ? 'bl' : 'br'),
                  scale: badge?.scale ?? 0.4,
                })
              }
            />
          ))}
        </div>
        {badge ? (
          <div className="mt-2">
            <p className="text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
              角标位置
            </p>
            <CornerPicker
              value={badge.corner}
              onChange={(corner) => setBadge(side, { ...badge, corner })}
            />
            <label className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
              缩放 {(badge.scale ?? 0.4).toFixed(2)}
              <input
                type="range"
                min={0.2}
                max={1.2}
                step={0.05}
                value={badge.scale ?? 0.4}
                onChange={(e) =>
                  setBadge(side, { ...badge, scale: Number(e.target.value) })
                }
                className="flex-1"
              />
            </label>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          e.target.value = ''
          void onFilePicked(f)
        }}
      />

      {showChrome ? (
      <div className="rounded-[18px] border p-3" style={{ borderColor: 'var(--wx-border)', background: 'var(--wx-surface)' }}>
        <p className="text-[12px] font-medium" style={{ color: 'var(--wx-text)' }}>
          头像装饰 · 框与角标
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--wx-text-muted)' }}>
          上传 PNG/WebP 图标，分别挂到用户侧或角色侧头像；角标默认避开群头衔（左上），建议用右下/左下。导出气泡包时会默认内嵌这些图。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pressable
            onClick={() => openUpload('library')}
            className="rounded-[14px] border px-3 py-2 text-[12px]"
            style={{ borderColor: 'var(--wx-border)', background: 'rgba(0,0,0,0.06)', color: 'var(--wx-text)' }}
          >
            上传到资源库
          </Pressable>
        </div>
        <div className="mt-3 space-y-2">
          {renderSideChrome('other')}
          {renderSideChrome('self')}
        </div>
      </div>
      ) : null}

      {showAssist ? (
      <div className="rounded-[18px] border p-3" style={{ borderColor: 'var(--wx-border)', background: 'var(--wx-surface)' }}>
        <p className="text-[12px] font-medium" style={{ color: 'var(--wx-text)' }}>
          Lumi 气泡助手
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--wx-text-muted)' }}>
          {surface === 'studio'
            ? '直接描述你想要的效果即可自由生成，无需选预设模版；确认「植入」后写入微信主题并跳到上方舞台。'
            : '直接描述想要的效果即可自由生成；确认「植入预览」只写入主题制作机舞台，不会改聊天室。真机请到「微信 → 外观 → 聊天气泡」上传气泡文件。'}
        </p>
        <textarea
          value={assistText}
          onChange={(e) => setAssistText(e.target.value)}
          rows={3}
          placeholder={
            priorTurns.length
              ? '继续改：再圆一点、换雾蓝、去掉尾巴…'
              : '例如：磨砂奶白对方气泡、雾粉己方、圆角 18、无尾巴、输入栏浅灰…'
          }
          className="mt-2 w-full resize-none rounded-[14px] border px-3 py-2 text-[12px] outline-none"
          style={{
            borderColor: 'var(--wx-border)',
            background: 'transparent',
            color: 'var(--wx-text)',
          }}
          disabled={assistBusy}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Pressable
            onClick={() => void runAssistant(priorTurns.length && assistExpand ? 'revise' : 'fresh')}
            disabled={assistBusy}
            className="flex-1 rounded-[14px] border px-3 py-2 text-[12px]"
            style={{
              borderColor: 'var(--wx-border)',
              background: 'rgba(0,0,0,0.06)',
              color: 'var(--wx-text)',
              opacity: assistBusy ? 0.6 : 1,
            }}
          >
            {assistBusy
              ? '生成中…'
              : priorTurns.length && assistExpand
                ? '改稿生成'
                : '生成代码'}
          </Pressable>
          {assistBusy ? (
            <Pressable
              onClick={stopAssistant}
              className="rounded-[14px] border px-3 py-2 text-[12px]"
              style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text)' }}
            >
              停止
            </Pressable>
          ) : null}
          <Pressable
            onClick={() => setAssistExpand((v) => !v)}
            className="rounded-[14px] border px-3 py-2 text-[12px]"
            style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text)' }}
          >
            {assistExpand ? '收起改稿' : '展开改稿'}
          </Pressable>
        </div>
        {assistExpand ? (
          <div className="mt-2 space-y-1">
            <p className="text-[10px]" style={{ color: 'var(--wx-text-muted)' }}>
              已记录 {Math.floor(priorTurns.length / 2)} 轮；清空后可重新生成。
            </p>
            {priorTurns.length ? (
              <Pressable
                onClick={() => {
                  setPriorTurns([])
                  setAssistError('')
                  dismissPending()
                }}
                className="rounded-[10px] border px-2 py-1 text-[11px]"
                style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text-muted)' }}
              >
                清空对话
              </Pressable>
            ) : null}
          </div>
        ) : null}

        {pendingPack && pendingCode ? (
          <div ref={pendingCodeRef} className="mt-3 space-y-2">
            <div
              className="overflow-hidden rounded-[16px] border"
              style={{
                borderColor: 'var(--wx-border)',
                background: 'rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="flex items-center justify-between gap-2 border-b px-3 py-1.5"
                style={{ borderColor: 'var(--wx-border)' }}
              >
                <span className="text-[11px] font-medium" style={{ color: 'var(--wx-text)' }}>
                  气泡包代码 · {pendingPack.meta.name || pendingPack.meta.id}
                </span>
                <Pressable
                  onClick={() => {
                    void navigator.clipboard?.writeText(pendingCode).catch(() => {
                      window.alert('复制失败')
                    })
                  }}
                  className="rounded-[8px] border px-2 py-0.5 text-[10px]"
                  style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text-muted)' }}
                >
                  复制
                </Pressable>
              </div>
              <pre
                className="max-h-[220px] overflow-auto px-3 py-2 text-[10px] leading-relaxed"
                style={{ color: 'var(--wx-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {pendingCode}
              </pre>
            </div>

            <div
              className="rounded-[14px] border px-3 py-2.5"
              style={{ borderColor: 'var(--wx-border)', background: 'var(--wx-surface)' }}
            >
              <p className="text-[12px]" style={{ color: 'var(--wx-text)' }}>
                {lastImplantedId === pendingPack.meta.id
                  ? surface === 'studio'
                    ? '已写入制作机预览。聊天室不变；真机请到「外观 → 聊天气泡」上传。'
                    : '已植入当前主题。可继续改稿，或再次确认跳到预览。'
                  : surface === 'studio'
                    ? '是否写入制作机预览查看效果？'
                    : '是否现在植入并查看效果？'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--wx-text-muted)' }}>
                {surface === 'studio'
                  ? '确认后只更新主题制作机预览，不会同步到聊天室。'
                  : '确认后写入微信聊天气泡主题，并滚到上方「预览」面板。'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pressable
                  onClick={() => void confirmImplantPending()}
                  disabled={implantBusy}
                  className="flex-1 rounded-[12px] border px-3 py-2 text-[12px] font-medium"
                  style={{
                    borderColor: 'var(--wx-border)',
                    background: 'rgba(0,0,0,0.08)',
                    color: 'var(--wx-text)',
                    opacity: implantBusy ? 0.6 : 1,
                  }}
                >
                  {implantBusy
                    ? surface === 'studio'
                      ? '写入预览…'
                      : '植入中…'
                    : lastImplantedId === pendingPack.meta.id
                      ? '再次跳到预览'
                      : surface === 'studio'
                        ? '植入预览'
                        : '确认植入'}
                </Pressable>
                <Pressable
                  onClick={dismissPending}
                  disabled={implantBusy}
                  className="rounded-[12px] border px-3 py-2 text-[12px]"
                  style={{ borderColor: 'var(--wx-border)', color: 'var(--wx-text-muted)' }}
                >
                  暂不植入
                </Pressable>
              </div>
            </div>
          </div>
        ) : null}

        {!apiReady ? (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--wx-text-muted)' }}>
            未配置 API：可先手动上传框/角标；或到设置里配置 chatCard 后再用助手。
          </p>
        ) : null}
        {assistError ? (
          <p className="mt-2 text-[11px]" style={{ color: '#b42318' }}>
            {assistError}
          </p>
        ) : null}
      </div>
      ) : null}
    </div>
  )
}
