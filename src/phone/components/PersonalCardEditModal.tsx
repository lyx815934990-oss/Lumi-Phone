import { X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { canonicalPublicImagePath } from '../../publicAssetUrl'
import { compressAvatarDataUrl, MAX_AVATAR_DATA_URL_LEN } from '../apps/wechat/avatarCompress'
import { ImageCropperModal } from './ImageCropperModal'
import { Pressable } from './Pressable'
import type { PersonalCardStyle, Profile } from '../types'
import {
  DEFAULT_PERSONAL_CARD_BG_PATH,
  DEFAULT_PERSONAL_CARD_STYLE,
  DEFAULT_PUBLIC_AVATAR_PATH,
  newPersonalCardFontFamily,
  normalizePersonalCardStyle,
} from '../types'
import { normalizeProfileAvatarForSave, resolveProfileAvatarPreviewUrl } from '../utils/characterAvatarUrl'
import {
  normalizePersonalCardBackgroundForSave,
  resolvePersonalCardBackgroundUrl,
} from '../utils/personalCardAssets'

const MAX_CARD_BG_DATA_URL_LEN = 650_000
/** 名片字体 data URL 上限（localStorage 友好） */
const MAX_CARD_FONT_DATA_URL_LEN = 900_000
const FONT_ACCEPT =
  '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf'

type Props = {
  open: boolean
  onClose: () => void
  profile: Profile
  backgroundUrl: string
  cardStyle: PersonalCardStyle
  onSave: (patch: {
    profile: Partial<Profile>
    backgroundUrl: string
    cardStyle: PersonalCardStyle
  }) => void
}

/** 颜色行：拾色器 + HEX，空值表示跟随主题 */
function ColorRow({
  label,
  value,
  placeholder,
  onChange,
  onReset,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (hex: string) => void
  onReset: () => void
}) {
  const picker = value && /^#[0-9A-Fa-f]{6}$/i.test(value) ? value : placeholder
  return (
    <div className="flex items-center gap-2">
      <span className="w-[4.5rem] shrink-0 text-[12px] text-[#666]">{label}</span>
      <input
        type="color"
        value={picker}
        onChange={(e) => onChange(e.target.value)}
        className="size-8 shrink-0 cursor-pointer rounded border border-[#e5e5e5] bg-white p-0.5"
        aria-label={label}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-[10px] border border-[#e5e5e5] px-2.5 py-1.5 font-mono text-[12px] outline-none"
      />
      <Pressable
        type="button"
        className="shrink-0 text-[11px] text-[#888]"
        onClick={onReset}
      >
        默认
      </Pressable>
    </div>
  )
}

export function PersonalCardEditModal({
  open,
  onClose,
  profile,
  backgroundUrl,
  cardStyle,
  onSave,
}: Props) {
  const titleId = useId()
  const fontInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [signature, setSignature] = useState(profile.signature)
  const [avatarImageUrl, setAvatarImageUrl] = useState(profile.avatarImageUrl)
  const [bgUrl, setBgUrl] = useState(backgroundUrl)
  const [bgUrlDraft, setBgUrlDraft] = useState('')
  const [styleDraft, setStyleDraft] = useState(() => normalizePersonalCardStyle(cardStyle))
  const [avatarCropSrc, setAvatarCropSrc] = useState('')
  const [bgCropSrc, setBgCropSrc] = useState('')

  useEffect(() => {
    if (!open) return
    setDisplayName(profile.displayName)
    setSignature(profile.signature)
    setAvatarImageUrl(profile.avatarImageUrl)
    setBgUrl(backgroundUrl)
    setBgUrlDraft('')
    setStyleDraft(normalizePersonalCardStyle(cardStyle))
    setAvatarCropSrc('')
    setBgCropSrc('')
  }, [open, profile, backgroundUrl, cardStyle])

  const avatarPreview = useMemo(
    () => resolveProfileAvatarPreviewUrl(avatarImageUrl),
    [avatarImageUrl],
  )
  const bgPreview = useMemo(() => resolvePersonalCardBackgroundUrl(bgUrl), [bgUrl])

  if (!open) return null

  const patchStyle = (patch: Partial<PersonalCardStyle>) => {
    setStyleDraft((prev) => normalizePersonalCardStyle({ ...prev, ...patch }))
  }

  const onPickAvatar = (file: File | null) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (src) setAvatarCropSrc(src)
    }
    reader.readAsDataURL(file)
  }

  const onPickBackground = (file: File | null) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (src) setBgCropSrc(src)
    }
    reader.readAsDataURL(file)
  }

  const onPickFont = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      if (dataUrl.length > MAX_CARD_FONT_DATA_URL_LEN) {
        window.alert('字体文件过大，请选用较小的 ttf/otf/woff2。')
        return
      }
      patchStyle({
        customFontDataUrl: dataUrl,
        customFontFileName: file.name,
        customFontFamily: newPersonalCardFontFamily(),
      })
    }
    reader.readAsDataURL(file)
  }

  const applyBgUrlDraft = () => {
    const next = bgUrlDraft.trim()
    if (!next) return
    setBgUrl(canonicalPublicImagePath(next) || next)
    setBgUrlDraft('')
  }

  const save = () => {
    onSave({
      profile: {
        displayName: displayName.trim() || profile.displayName,
        signature: signature.trim(),
        avatarImageUrl: normalizeProfileAvatarForSave(avatarImageUrl),
      },
      backgroundUrl: normalizePersonalCardBackgroundForSave(bgUrl),
      cardStyle: normalizePersonalCardStyle(styleDraft),
    })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center px-4 py-6 sm:px-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />
      <ImageCropperModal
        open={!!avatarCropSrc}
        imageSrc={avatarCropSrc}
        title="裁剪头像"
        aspect={1}
        maxSide={1080}
        objectFit="horizontal-cover"
        onCancel={() => setAvatarCropSrc('')}
        onConfirm={async (dataUrl) => {
          const next = await compressAvatarDataUrl(dataUrl, MAX_AVATAR_DATA_URL_LEN)
          if (next.length > MAX_AVATAR_DATA_URL_LEN) {
            window.alert('头像图片过大，请换一张较小的图片。')
            return
          }
          setAvatarImageUrl(next)
          setAvatarCropSrc('')
        }}
      />
      <ImageCropperModal
        open={!!bgCropSrc}
        imageSrc={bgCropSrc}
        title="裁剪背景图"
        aspect={2}
        maxSide={1600}
        objectFit="horizontal-cover"
        onCancel={() => setBgCropSrc('')}
        onConfirm={async (dataUrl) => {
          const next = await compressAvatarDataUrl(dataUrl, MAX_CARD_BG_DATA_URL_LEN)
          if (next.length > MAX_CARD_BG_DATA_URL_LEN) {
            window.alert('背景图过大，请换一张较小的图片。')
            return
          }
          setBgUrl(next)
          setBgCropSrc('')
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(92vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] border bg-white shadow-[0_24px_60px_rgba(28,28,30,0.18)]"
        style={{ borderColor: '#e5e5e5' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#eee] px-5 pb-3 pt-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[18px] font-semibold text-[#111]">
                编辑桌面个人名片
              </h2>
              <p className="mt-1 text-[12px] text-[#888]">与微信资料独立 · 仅影响主屏名片</p>
            </div>
            <Pressable
              type="button"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e5e5e5] text-[#666] transition-colors hover:bg-[#f5f5f5]"
              aria-label="关闭"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </Pressable>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
          <div className="mt-1">
            <p className="text-[12px] text-[#666]">背景图预览</p>
            <div
              className="mt-2 h-24 w-full overflow-hidden rounded-[12px] border"
              style={{
                borderColor: '#e5e5e5',
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.2) 100%), url(${JSON.stringify(bgPreview)})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            />
            <label className="mt-2 block">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  onPickBackground(e.target.files?.[0] ?? null)
                  e.currentTarget.value = ''
                }}
              />
              <span className="flex w-full items-center justify-center rounded-[10px] border border-[#e5e5e5] py-2 text-[12px] text-[#333]">
                本地上传背景
              </span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                value={bgUrlDraft}
                onChange={(e) => setBgUrlDraft(e.target.value)}
                placeholder="背景图 URL（http/https）"
                className="min-w-0 flex-1 rounded-[10px] border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none"
              />
              <Pressable
                type="button"
                className="shrink-0 rounded-[10px] border border-[#e5e5e5] px-3 py-2 text-[12px]"
                onClick={applyBgUrlDraft}
              >
                应用
              </Pressable>
            </div>
            <Pressable
              type="button"
              className="mt-2 w-full text-center text-[11px] text-[#888]"
              onClick={() => setBgUrl(DEFAULT_PERSONAL_CARD_BG_PATH)}
            >
              恢复默认背景
            </Pressable>
          </div>

          <div className="mt-5 flex flex-col items-center gap-2">
            <label className="relative block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  onPickAvatar(e.target.files?.[0] ?? null)
                  e.currentTarget.value = ''
                }}
              />
              <img
                src={avatarPreview}
                alt=""
                className="size-20 rounded-full border border-[#e5e5e5] object-cover"
              />
              <span className="mt-1 block text-center text-[12px] text-[#666]">点击更换头像</span>
            </label>
            <Pressable
              type="button"
              className="text-[11px] text-[#888]"
              onClick={() => setAvatarImageUrl(DEFAULT_PUBLIC_AVATAR_PATH)}
            >
              恢复默认头像
            </Pressable>
          </div>

          <label className="mt-4 block">
            <span className="text-[12px] text-[#666]">昵称</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              className="mt-1 w-full rounded-[10px] border border-[#e5e5e5] px-3 py-2 text-[15px] outline-none"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-[12px] text-[#666]">个性签名</span>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              maxLength={120}
              rows={3}
              className="mt-1 w-full resize-none rounded-[10px] border border-[#e5e5e5] px-3 py-2 text-[14px] outline-none"
              placeholder="桌面名片上显示的签名"
            />
          </label>

          {/* 颜色 */}
          <div className="mt-5 rounded-[14px] border border-[#eee] bg-[#fafafa] px-3.5 py-3.5">
            <p className="text-[13px] font-medium text-[#222]">颜色</p>
            <p className="mt-0.5 text-[11px] text-[#888]">空值或点「默认」则跟随手机主题</p>
            <div className="mt-3 space-y-2.5">
              <ColorRow
                label="白底色"
                value={styleDraft.bottomColor}
                placeholder="#ffffff"
                onChange={(hex) => patchStyle({ bottomColor: hex })}
                onReset={() => patchStyle({ bottomColor: '' })}
              />
              <ColorRow
                label="昵称色"
                value={styleDraft.titleColor}
                placeholder="#1c1c1e"
                onChange={(hex) => patchStyle({ titleColor: hex })}
                onReset={() => patchStyle({ titleColor: '' })}
              />
              <ColorRow
                label="签名色"
                value={styleDraft.signatureColor}
                placeholder="#8e8e93"
                onChange={(hex) => patchStyle({ signatureColor: hex })}
                onReset={() => patchStyle({ signatureColor: '' })}
              />
              <ColorRow
                label="日期色"
                value={styleDraft.dateColor}
                placeholder="#8e8e93"
                onChange={(hex) => patchStyle({ dateColor: hex })}
                onReset={() => patchStyle({ dateColor: '' })}
              />
            </div>
          </div>

          {/* 自定义字体 */}
          <div className="mt-4 rounded-[14px] border border-[#eee] bg-[#fafafa] px-3.5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#222]">自定义字体</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#888]">
                  支持 ttf / otf / woff / woff2，仅作用于本名片文字
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Pressable
                  type="button"
                  className="rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-[11px] text-[#333]"
                  onClick={() => fontInputRef.current?.click()}
                >
                  上传字体
                </Pressable>
                {styleDraft.customFontDataUrl ? (
                  <Pressable
                    type="button"
                    className="rounded-[10px] border border-[#e5e5e5] px-2.5 py-1.5 text-[11px] text-[#888]"
                    onClick={() =>
                      patchStyle({
                        customFontDataUrl: '',
                        customFontFileName: '',
                        customFontFamily: '',
                      })
                    }
                  >
                    清除
                  </Pressable>
                ) : null}
              </div>
              <input
                ref={fontInputRef}
                type="file"
                accept={FONT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  onPickFont(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="mt-2 truncate rounded-[10px] border border-[#eee] bg-white px-2.5 py-2 text-[11px] text-[#555]">
              {styleDraft.customFontDataUrl
                ? styleDraft.customFontFileName || '已上传自定义字体'
                : '未上传 · 使用手机主题字体'}
            </p>
          </div>

          {/* 底部渐隐 */}
          <div className="mt-4 rounded-[14px] border border-[#eee] bg-[#fafafa] px-3.5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#222]">底部白底渐隐</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#888]">
                  开启后底边永远淡出无硬边；范围改渐变带高度，程度改带内过渡陡峭度
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={styleDraft.fadeEnabled}
                onClick={() => patchStyle({ fadeEnabled: !styleDraft.fadeEnabled })}
                className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                style={{ background: styleDraft.fadeEnabled ? '#111' : '#d4d4d8' }}
              >
                <span
                  className="absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform"
                  style={{ left: styleDraft.fadeEnabled ? 22 : 2 }}
                />
              </button>
            </div>
            <div
              className={`mt-3 space-y-3.5 ${styleDraft.fadeEnabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <div>
                <div className="flex items-center justify-between text-[12px] text-[#666]">
                  <span>渐隐范围</span>
                  <span className="tabular-nums text-[#333]">{styleDraft.fadeAmount}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#999]">只控制渐变带有多高（不改底边，底边始终透明）</p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={styleDraft.fadeAmount}
                  disabled={!styleDraft.fadeEnabled}
                  onChange={(e) => patchStyle({ fadeAmount: Number(e.target.value) })}
                  className="mt-2 w-full accent-[#111]"
                  aria-label="底部渐隐范围"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[#999]">
                  <span>窄带</span>
                  <span>适中</span>
                  <span>宽带</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] text-[#666]">
                  <span>渐隐程度</span>
                  <span className="tabular-nums text-[#333]">{styleDraft.fadeIntensity}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#999]">只控制渐变带内过渡颗粒度（缓/陡）</p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={styleDraft.fadeIntensity}
                  disabled={!styleDraft.fadeEnabled}
                  onChange={(e) => patchStyle({ fadeIntensity: Number(e.target.value) })}
                  className="mt-2 w-full accent-[#111]"
                  aria-label="底部渐隐程度"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[#999]">
                  <span>细腻</span>
                  <span>适中</span>
                  <span>陡峭</span>
                </div>
              </div>

              <Pressable
                type="button"
                className="text-[11px] text-[#888]"
                disabled={!styleDraft.fadeEnabled}
                onClick={() =>
                  patchStyle({
                    fadeEnabled: DEFAULT_PERSONAL_CARD_STYLE.fadeEnabled,
                    fadeAmount: DEFAULT_PERSONAL_CARD_STYLE.fadeAmount,
                    fadeIntensity: DEFAULT_PERSONAL_CARD_STYLE.fadeIntensity,
                  })
                }
              >
                恢复默认渐隐
              </Pressable>
            </div>
          </div>
        </div>

        <footer className="shrink-0 flex gap-2 border-t border-[#eee] px-5 py-4">
          <Pressable
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[12px] border border-[#e5e5e5] py-2.5 text-[15px]"
          >
            取消
          </Pressable>
          <Pressable
            type="button"
            onClick={save}
            className="flex-1 rounded-[12px] border border-[#111] bg-[#111] py-2.5 text-[15px] font-semibold text-white"
          >
            保存
          </Pressable>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
