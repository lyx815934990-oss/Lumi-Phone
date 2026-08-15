import {
  BookOpen,
  Bookmark,
  ChevronRight,
  CreditCard,
  Fingerprint,
  Images,
  Settings,
  Smile,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

import { resolveProfileAvatarPreviewUrl } from '../phone/utils/characterAvatarUrl'
import { DEFAULT_PUBLIC_AVATAR_PATH } from '../phone/types'
import {
  LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM,
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  lumiThreadCapsuleStyle,
} from '../phone/apps/wechat/lumiShellTheme'

function MemoryTraceNeuronGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="6" cy="8" r="1.35" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="18" cy="8" r="1.35" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="7" cy="16.5" r="1.35" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="17" cy="16.5" r="1.35" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7.35 8.45 10.4 11M16.65 8.45 13.6 11M8.2 15.25 10.35 13.35M15.8 15.25 13.65 13.35"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type WeChatMeInstagramProfileProps = {
  /** 微信昵称 */
  nickname?: string
  /** 个性签名（可多行） */
  signature?: string
  /** 头像地址 */
  avatarUrl?: string
  /** 点击顶部个人名片（如打开资料编辑） */
  onOpenProfileCard?: () => void
  /** 打开「思维溯源」面板 */
  onOpenMemoryTrace?: () => void
  /** 列表项点击 */
  onMenuItemClick?: (id: MenuRowId) => void
  className?: string
}

export type MenuRowId = 'favorites' | 'album' | 'memory' | 'identity' | 'card' | 'emoji' | 'settings'
  | 'persona'

type MenuRow = {
  id: MenuRowId
  label: string
  en?: string
  icon: LucideIcon
}

const MENU_ROWS: MenuRow[] = [
  { id: 'favorites', label: '收藏', en: 'Favorites', icon: Bookmark },
  { id: 'album', label: '相册', en: 'Album', icon: Images },
  { id: 'memory', label: '记忆', en: 'Memory', icon: BookOpen },
  { id: 'identity', label: '身份', en: 'Identity', icon: User },
  { id: 'persona', label: '角色人设', en: 'Persona', icon: Fingerprint },
  { id: 'card', label: '卡包', en: 'Cards', icon: CreditCard },
  { id: 'emoji', label: '表情', en: 'Stickers', icon: Smile },
  { id: 'settings', label: '设置', en: 'Settings', icon: Settings },
]

const softCard = {
  background: LUMI_SHELL.card,
  borderRadius: LUMI_SHELL.cardRadiusPx,
  border: `1px solid ${LUMI_SHELL.hairline}`,
  boxShadow: '0 8px 28px rgba(16,16,18,0.045)',
} as const

/**
 * 微信「我的」页：Lumi 纸感名片 + 柔和功能列表。
 */
export function WeChatMeInstagramProfile({
  nickname = '微信昵称',
  signature = '个性签名：生活不止眼前的苟且，还有诗和远方。',
  avatarUrl,
  onOpenProfileCard,
  onOpenMemoryTrace,
  onMenuItemClick,
  className = '',
}: WeChatMeInstagramProfileProps) {
  const avatarSrc = resolveProfileAvatarPreviewUrl(avatarUrl)

  const profileInner = (
    <>
      <div
        className="mx-auto flex items-center justify-center rounded-full"
        style={{
          width: 112,
          height: 112,
          background: LUMI_SHELL.card,
          boxShadow: '0 8px 24px rgba(16,16,18,0.08)',
          border: `2.5px solid ${LUMI_SHELL.card}`,
        }}
      >
        <img
          src={avatarSrc}
          alt=""
          width={108}
          height={108}
          className="h-[108px] w-[108px] shrink-0 rounded-full object-cover"
          style={{ border: `1px solid ${LUMI_SHELL.hairline}` }}
          loading="lazy"
          onError={(e) => {
            const fallback = resolveProfileAvatarPreviewUrl(DEFAULT_PUBLIC_AVATAR_PATH)
            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
          }}
        />
      </div>
      <h1
        className="mt-4 text-center text-[20px] font-semibold leading-tight tracking-tight"
        style={{ color: LUMI_SHELL.ink, letterSpacing: '-0.02em' }}
      >
        {nickname}
      </h1>
      <p
        className="mx-auto mt-2 max-w-[300px] text-center text-[13px] leading-relaxed"
        style={{ color: LUMI_SHELL.mist }}
      >
        {signature}
      </p>
    </>
  )

  return (
    <div
      className={`h-full min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ background: 'transparent', fontFamily: LUMI_SHELL_FONT, color: LUMI_SHELL.ink }}
    >
      <div
        className="mx-auto flex w-full max-w-[520px] flex-col px-4 pt-4"
        style={{ gap: 20, paddingBottom: LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM }}
      >
        <header>
          {onOpenProfileCard ? (
            <button
              type="button"
              onClick={onOpenProfileCard}
              className="relative w-full overflow-hidden px-5 py-7 text-center outline-none transition-transform active:scale-[0.992]"
              style={softCard}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 80% at 50% 0%, rgba(16,16,18,0.035) 0%, transparent 55%)',
                }}
              />
              <div className="relative">{profileInner}</div>
            </button>
          ) : (
            <div className="relative overflow-hidden px-5 py-7 text-center" style={softCard}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 80% at 50% 0%, rgba(16,16,18,0.035) 0%, transparent 55%)',
                }}
              />
              <div className="relative">{profileInner}</div>
            </div>
          )}
        </header>

        {onOpenMemoryTrace ? (
          <section aria-label="思维溯源">
            <motion.button
              type="button"
              onClick={onOpenMemoryTrace}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
              className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left outline-none"
              style={{
                ...lumiThreadCapsuleStyle(),
                color: LUMI_SHELL.ink,
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(16,16,18,0.04)', color: '#B8973A' }}
              >
                <MemoryTraceNeuronGlyph className="size-[22px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-tight">思维溯源</span>
                <span
                  className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: LUMI_SHELL.mist }}
                >
                  AI MEMORY TRACE
                </span>
              </span>
              <ChevronRight className="ml-auto size-4 shrink-0" strokeWidth={1.75} style={{ color: LUMI_SHELL.mist }} aria-hidden />
            </motion.button>
          </section>
        ) : null}

        <section aria-label="功能列表">
          <div
            className="px-1 pb-2.5 pt-0.5 text-[11px] font-semibold tracking-[0.08em]"
            style={{ color: LUMI_SHELL.mist }}
          >
            功能
          </div>
          <div className="overflow-hidden" style={softCard}>
            <ul>
              {MENU_ROWS.map((row, idx) => {
                const Icon = row.icon
                const isLast = idx === MENU_ROWS.length - 1
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onMenuItemClick?.(row.id)}
                      className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                      style={{
                        borderBottom: isLast ? undefined : `1px solid ${LUMI_SHELL.hairline}`,
                      }}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(16,16,18,0.04)' }}
                      >
                        <Icon className="size-[18px] shrink-0" strokeWidth={1.75} style={{ color: LUMI_SHELL.ink }} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium leading-tight" style={{ color: LUMI_SHELL.ink }}>
                          {row.label}
                        </span>
                        {row.en ? (
                          <span
                            className="mt-0.5 block text-[11px] tracking-[0.06em]"
                            style={{ color: LUMI_SHELL.mist }}
                          >
                            {row.en}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight
                        className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                        strokeWidth={1.75}
                        style={{ color: LUMI_SHELL.mist }}
                        aria-hidden
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default WeChatMeInstagramProfile
