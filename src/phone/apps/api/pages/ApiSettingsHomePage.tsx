import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPresetEditPath } from '../apiPresetRoutes'
import { API_LINK_PREVIEW_ROUTE, LINK_PREVIEW_FEATURE_TITLE } from '../linkPreviewDisplayLabels'
import { useApiSettings } from '../ApiSettingsContext'
import { useImageGenSettings } from '../useImageGenSettings'
import { apiTheme } from '../theme'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PresetCard } from '../components/PresetCard'
import { TopNav } from '../components/TopNav'

type HomeTab = 'presets' | 'features'

export function ApiSettingsHomePage({ onBack }: { onBack: () => void }) {
  const nav = useNavigate()
  const { presets, currentPresetId, currentPreset, setCurrentPresetId, deletePreset, duplicatePreset, linkPreview } =
    useApiSettings()
  const { configured: imageGenConfigured, imageGen } = useImageGenSettings()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [tab, setTab] = useState<HomeTab>('presets')

  const mainConfigured = useMemo(() => {
    const p = currentPreset
    if (!p) return false
    return !!p.main.apiUrl.trim() && !!p.main.apiKey.trim()
  }, [currentPreset])

  const mainTestTag = useMemo(() => {
    const t = currentPreset?.main.lastTest
    if (!t) return '未测试'
    return t.ok ? '连接成功' : '连接失败'
  }, [currentPreset?.main.lastTest])

  const imageGenTag = useMemo(() => {
    if (!currentPreset) return '生图未配置'
    if (!imageGen.enabled) return '生图已关闭'
    return imageGenConfigured ? '生图已就绪' : '生图待填 Key'
  }, [currentPreset, imageGen.enabled, imageGenConfigured])

  const activeStatusTags = useMemo(() => {
    if (!currentPreset) return []
    return [
      { text: mainConfigured ? '主接口已配置' : '主接口未配置' },
      { text: mainTestTag },
      { text: imageGenTag },
    ]
  }, [currentPreset, mainConfigured, mainTestTag, imageGenTag])

  const linkPreviewTag = useMemo(() => {
    if (!linkPreview.enabled) return { text: '已关闭', on: false }
    const t = linkPreview.lastTest
    if (!linkPreview.apiKey.trim()) {
      return t?.ok ? { text: '匿名可用', on: true } : { text: '已启用', on: true }
    }
    if (!t) return { text: '已配置', on: true }
    return t.ok ? { text: '连接正常', on: true } : { text: '连接失败', on: false }
  }, [linkPreview])

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      style={{ background: apiTheme.bg, fontFamily: apiTheme.font }}
    >
      <TopNav title="API设置" onBack={onBack} />

      <div className="mx-4 mt-3 flex gap-1.5" style={{ gap: 6 }}>
        {(
          [
            { id: 'presets' as const, label: 'API 预设' },
            { id: 'features' as const, label: '功能设置' },
          ] as const
        ).map((item) => {
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="min-w-0 flex-1 text-[13px] font-medium transition-colors"
              style={{
                padding: 9,
                borderRadius: 10,
                background: selected ? apiTheme.accent : apiTheme.tabIdle,
                color: selected ? apiTheme.onAccent : apiTheme.subText,
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          tab === 'presets' ? 'pb-[calc(92px+env(safe-area-inset-bottom,0px))]' : 'pb-[calc(20px+env(safe-area-inset-bottom,0px))]'
        }`}
      >
        {tab === 'presets' ? (
          <>
            {presets.length ? (
              <div className="mt-1">
                {presets.map((p) => {
                  const active = p.id === currentPresetId
                  return (
                    <PresetCard
                      key={p.id}
                      name={p.name}
                      modelId={p.main.modelId}
                      modelMeta={
                        p.main.modelId?.trim()
                          ? p.main.modelUserMetaById?.[p.main.modelId.trim()]
                          : undefined
                      }
                      websiteUrl={p.main.websiteUrl}
                      active={active}
                      statusTags={active ? activeStatusTags : undefined}
                      footerHint={
                        active
                          ? '编辑时可切换「主接口 / 副接口 / 生图」并测试连接。'
                          : undefined
                      }
                      onActivate={() => setCurrentPresetId(p.id)}
                      onEdit={() => nav(apiPresetEditPath(p.id))}
                      onDuplicate={() => {
                        const nid = duplicatePreset(p.id)
                        if (nid) nav(apiPresetEditPath(nid))
                      }}
                      onDelete={() => setDeleteId(p.id)}
                    />
                  )
                })}
              </div>
            ) : (
              <div
                className="mx-4 mt-4 rounded-2xl px-5 py-8 text-center"
                style={{ background: apiTheme.card, border: `1px solid ${apiTheme.borderSoft}` }}
              >
                <p className="text-[14px] font-medium" style={{ color: apiTheme.text }}>
                  还没有任何预设
                </p>
                <p className="mt-2 text-[13px]" style={{ color: apiTheme.subText }}>
                  点击下方按钮新建你的第一个 API 预设。
                </p>
              </div>
            )}
          </>
        ) : (
          <section
            className="mx-4 mt-4 rounded-2xl p-4"
            style={{ background: apiTheme.card, border: `1px solid ${apiTheme.borderSoft}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold" style={{ color: apiTheme.text }}>
                  {LINK_PREVIEW_FEATURE_TITLE}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: apiTheme.subText }}>
                  微信发 https 时自动识别正文或视频图文（抖音 / 小红书 / B 站等）。
                </p>
                <span
                  className="mt-2.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: linkPreviewTag.on ? apiTheme.accentMuted : apiTheme.tabIdle,
                    color: linkPreviewTag.on ? apiTheme.accent : apiTheme.subText,
                  }}
                >
                  {linkPreviewTag.text}
                </span>
              </div>
              <button
                type="button"
                onClick={() => nav(API_LINK_PREVIEW_ROUTE)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80"
                style={{
                  color: apiTheme.accent,
                  border: `1px solid ${apiTheme.borderStrong}`,
                  background: apiTheme.accentSoft,
                }}
              >
                配置
              </button>
            </div>
          </section>
        )}
      </div>

      {tab === 'presets' ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-4"
          style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={() => nav('/new')}
            className="pointer-events-auto w-full text-[15px] font-medium transition-all duration-200 ease-out hover:brightness-105"
            style={{
              background: apiTheme.accent,
              color: apiTheme.onAccent,
              borderRadius: 14,
              padding: 13,
              boxShadow: apiTheme.shadowAccent,
            }}
          >
            + 新建 API 预设
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!deleteId}
        title="确认删除？"
        message="删除后不可恢复。"
        confirmText="删除"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deletePreset(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
