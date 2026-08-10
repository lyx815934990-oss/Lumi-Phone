import { useEffect, useMemo, useState } from 'react'

import { useCustomization } from '../CustomizationContext'
import { resolveProfileAvatarPreviewUrl } from '../utils/characterAvatarUrl'
import { resolvePersonalCardBackgroundUrl } from '../utils/personalCardAssets'
import {
  ensurePersonalCardFontLoaded,
  personalCardFontStack,
} from '../utils/personalCardFont'
import {
  DEFAULT_PERSONAL_CARD_STYLE,
  personalCardBottomFadeCss,
} from '../types'
import { PersonalCardEditModal } from './PersonalCardEditModal'

function formatDate(d: Date) {
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${w}`
}

function splitDateForNumberStyle(dateText: string) {
  const parts: Array<{ kind: 'num' | 'text'; value: string }> = []
  const re = /(\d+)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(dateText))) {
    const idx = m.index
    if (idx > last) parts.push({ kind: 'text', value: dateText.slice(last, idx) })
    parts.push({ kind: 'num', value: m[1] ?? '' })
    last = idx + (m[1]?.length ?? 0)
  }
  if (last < dateText.length) parts.push({ kind: 'text', value: dateText.slice(last) })
  return parts
}

export type PersonalCardProps = {
  /** 为 false 时不可点击（桌面组件编辑模式） */
  interactive?: boolean
}

export function PersonalCard({ interactive = true }: PersonalCardProps) {
  const {
    state,
    setPersonalCardProfile,
    setPersonalCardBackgroundUrl,
    setPersonalCardStyle,
  } = useCustomization()
  const {
    personalCardProfile: profile,
    personalCardBackgroundUrl,
    personalCardStyle = DEFAULT_PERSONAL_CARD_STYLE,
    theme,
  } = state
  const [editOpen, setEditOpen] = useState(false)
  const [fontReady, setFontReady] = useState(false)

  const dateText = formatDate(new Date())
  const dateParts = splitDateForNumberStyle(dateText)
  const bgStyle = useMemo(
    () => resolvePersonalCardBackgroundUrl(personalCardBackgroundUrl),
    [personalCardBackgroundUrl],
  )
  const fadeCss = useMemo(
    () => personalCardBottomFadeCss(theme.surface, theme.border, personalCardStyle),
    [theme.surface, theme.border, personalCardStyle],
  )

  // 加载自定义字体文件
  useEffect(() => {
    let cancelled = false
    const fam = personalCardStyle.customFontFamily
    const url = personalCardStyle.customFontDataUrl
    if (!fam || !url) {
      setFontReady(false)
      return
    }
    void ensurePersonalCardFontLoaded(fam, url, personalCardStyle.customFontFileName).then(
      (ok) => {
        if (!cancelled) setFontReady(ok)
      },
    )
    return () => {
      cancelled = true
    }
  }, [
    personalCardStyle.customFontFamily,
    personalCardStyle.customFontDataUrl,
    personalCardStyle.customFontFileName,
  ])

  const cardFont = fontReady
    ? personalCardFontStack(personalCardStyle.customFontFamily, theme.fontFamily)
    : undefined
  const titleColor = personalCardStyle.titleColor.trim() || theme.text
  const signatureColor = personalCardStyle.signatureColor.trim() || theme.textMuted
  const dateColor = personalCardStyle.dateColor.trim() || theme.textMuted
  const avatarRing = personalCardStyle.bottomColor.trim() || theme.surface

  const openEdit = interactive
    ? () => {
        setEditOpen(true)
      }
    : undefined

  return (
    <>
      <section
        data-desktop-static="true"
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={openEdit}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setEditOpen(true)
                }
              }
            : undefined
        }
        className={`relative flex h-full min-h-0 flex-col overflow-hidden${interactive ? ' cursor-pointer transition-opacity active:opacity-[0.97]' : ''}`}
        style={{
          background: 'transparent',
          borderRadius: 'var(--phone-radius-lg)',
          fontFamily: cardFont,
        }}
        aria-label={interactive ? '编辑桌面个人名片' : undefined}
      >
        <div
          className="min-h-0 w-full shrink-0 overflow-hidden"
          style={{
            height: '38%',
            borderRadius: 'var(--phone-radius-lg) var(--phone-radius-lg) 0 0',
            border: `1px solid ${theme.border}`,
            borderBottom: 'none',
            boxShadow: 'var(--phone-shadow)',
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.2) 100%), url(${JSON.stringify(bgStyle)})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundColor: theme.surfaceMuted,
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-4 pt-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 bottom-0"
            style={fadeCss.fill}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 bottom-0"
            style={fadeCss.edge}
          />

          <div
            className="relative z-[1] mx-auto flex w-full max-w-[280px] min-h-0 flex-1 flex-col items-center"
            style={{ marginTop: '-28px' }}
          >
            <div
              className="flex size-[56px] shrink-0 items-center justify-center overflow-hidden text-xl shadow-[var(--phone-shadow)]"
              style={{
                borderRadius: '999px',
                background: theme.surfaceMuted,
                border: `2px solid ${avatarRing}`,
                color: titleColor,
              }}
            >
              {profile.avatarImageUrl ? (
                <img
                  src={resolveProfileAvatarPreviewUrl(profile.avatarImageUrl)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>{profile.avatarEmoji}</span>
              )}
            </div>

            <div className="mt-2.5 flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2">
              <h2
                className="line-clamp-1 w-full text-center text-[1.05rem] font-semibold leading-snug tracking-[0.02em]"
                style={{ color: titleColor }}
                title={profile.displayName}
              >
                {profile.displayName}
              </h2>
              <p
                className="line-clamp-2 w-full px-1 text-center text-[12px] leading-[1.55]"
                style={{ color: signatureColor }}
                title={profile.signature}
              >
                {profile.signature}
              </p>
            </div>

            <p
              className="mt-2.5 shrink-0 text-[10px] leading-none tracking-[0.08em]"
              style={{ color: dateColor, opacity: 0.92 }}
            >
              {dateParts.map((p, idx) =>
                p.kind === 'num' ? (
                  <span
                    key={`${idx}-${p.value}`}
                    style={{
                      fontFamily: cardFont
                        ? cardFont
                        : 'var(--wx-num-font, var(--phone-num-font))',
                      fontVariantNumeric: 'tabular-nums lining-nums',
                      fontFeatureSettings: '"tnum" 1, "lnum" 1',
                      display: 'inline-block',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {p.value}
                  </span>
                ) : (
                  <span key={`${idx}-${p.value}`}>{p.value}</span>
                ),
              )}
            </p>
          </div>
        </div>
      </section>

      <PersonalCardEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        backgroundUrl={personalCardBackgroundUrl}
        cardStyle={personalCardStyle}
        onSave={({ profile: profilePatch, backgroundUrl, cardStyle }) => {
          setPersonalCardProfile(profilePatch)
          setPersonalCardBackgroundUrl(backgroundUrl)
          setPersonalCardStyle(cardStyle)
        }}
      />
    </>
  )
}
