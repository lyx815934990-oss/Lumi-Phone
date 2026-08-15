import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useCustomization } from '../../CustomizationContext'
import { Pressable } from '../../components/Pressable'
import type { WeChatTabId } from '../../types'
import { WeChatUnreadBadgeText } from './wechatUnreadCountText'
import {
  isLumiShellDarkBackground,
  LUMI_LIQUID_NAV,
  LUMI_SHELL,
  LUMI_SHELL_FONT,
} from './lumiShellTheme'

type TabId = WeChatTabId

function TabIcon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.92 }}
      aria-hidden
    >
      <path d={path} />
    </svg>
  )
}

const BUILTIN: Record<TabId, string> = {
  messages: 'M7 7h10a3 3 0 0 1 3 3v4.6a3 3 0 0 1-3 3H12l-3 3v-3H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z',
  contacts: 'M16 19a4 4 0 0 0-8 0 M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  dates: 'M12 21s-7-4.6-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.4-7 10-7 10z',
  discover: 'M12 2l3.2 6.5L22 12l-6.8 3.5L12 22l-3.2-6.5L2 12l6.8-3.5L12 2z',
  profile: 'M20 21c0-4.2-3.6-7-8-7s-8 2.8-8 7 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

export function WeChatLiquidTabBar({
  active,
  onChange,
  messagesUnreadCount = 0,
  contactsUnreadCount = 0,
  discoverUnreadCount = 0,
}: {
  active: TabId
  onChange: (id: TabId) => void
  messagesUnreadCount?: number
  contactsUnreadCount?: number
  discoverUnreadCount?: number
}) {
  const { state } = useCustomization()
  const { wechatTheme } = state
  const items = wechatTheme.tabBarItems
  const dark = isLumiShellDarkBackground(wechatTheme.background)
  const navRef = useRef<HTMLElement | null>(null)
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [indicatorX, setIndicatorX] = useState(0)

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.id === active),
  )

  useLayoutEffect(() => {
    const nav = navRef.current
    const btn = btnRefs.current[activeIndex]
    if (!nav || !btn) return
    const navBox = nav.getBoundingClientRect()
    const btnBox = btn.getBoundingClientRect()
    const size = LUMI_LIQUID_NAV.indicatorSizePx
    const x = btnBox.left - navBox.left + (btnBox.width - size) / 2
    setIndicatorX(x)
  }, [activeIndex, items.length, active])

  const glassBg = dark ? 'rgba(16, 16, 18, 0.5)' : 'rgba(247, 246, 244, 0.55)'
  const insetHighlight = dark ? 'inset 0 1px 0 rgba(255, 255, 255, 0.07)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.85)'
  const dropShadow = dark
    ? '0 10px 30px rgba(0, 0, 0, 0.35)'
    : '0 10px 30px rgba(16, 16, 18, 0.15)'
  const borderCol = dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.6)'

  return (
    <nav
      ref={navRef}
      className="pointer-events-auto absolute z-[40]"
      style={{
        bottom: `calc(${LUMI_LIQUID_NAV.bottomPx}px + env(safe-area-inset-bottom, 0px))`,
        left: `${LUMI_LIQUID_NAV.sidePct}%`,
        right: `${LUMI_LIQUID_NAV.sidePct}%`,
        height: LUMI_LIQUID_NAV.heightPx,
        borderRadius: LUMI_LIQUID_NAV.radiusPx,
        background: glassBg,
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: `1px solid ${borderCol}`,
        boxShadow: `${dropShadow}, ${insetHighlight}`,
        fontFamily: LUMI_SHELL_FONT,
      }}
      aria-label="主导航"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/2"
        style={{
          width: LUMI_LIQUID_NAV.indicatorSizePx,
          height: LUMI_LIQUID_NAV.indicatorSizePx,
          marginTop: -LUMI_LIQUID_NAV.indicatorSizePx / 2,
          borderRadius: LUMI_LIQUID_NAV.indicatorSizePx / 2,
          background: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 16, 18, 0.08)',
        }}
        animate={{ x: indicatorX }}
        transition={{ duration: 0.32, ease: [0.34, 1.4, 0.64, 1] }}
      />

      <div className="relative flex h-full items-center justify-around px-1">
        {items.map((it, index) => {
          const isActive = it.id === active
          const badgeCount =
            it.id === 'messages'
              ? messagesUnreadCount
              : it.id === 'contacts'
                ? contactsUnreadCount
                : it.id === 'discover'
                  ? discoverUnreadCount
                  : 0
          const showBadge = badgeCount > 0
          const color = isActive ? LUMI_SHELL.ink : LUMI_SHELL.mist
          const iconNode = it.iconUrl?.trim() ? (
            <img
              src={it.iconUrl}
              alt=""
              className="h-[22px] w-[22px] rounded-[6px] object-cover"
              aria-hidden
            />
          ) : (
            <TabIcon path={BUILTIN[it.id]} active={isActive} />
          )
          return (
            <Pressable
              key={it.id}
              ref={(el) => {
                btnRefs.current[index] = el
              }}
              onClick={() => onChange(it.id)}
              className="relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px]"
              style={{ color }}
              aria-label={showBadge ? `${it.label}，未读 ${badgeCount} 条` : it.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {showBadge ? (
                <span className="relative inline-flex shrink-0">
                  {iconNode}
                  <motion.span
                    className="pointer-events-none absolute -right-1.5 -top-1 z-[1] flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full px-[4px] text-[9px] leading-none text-white"
                    style={{
                      background: LUMI_SHELL.badgeRed,
                      boxShadow: `0 0 0 1.5px ${dark ? 'rgba(16,16,18,0.9)' : 'rgba(247,246,244,0.95)'}`,
                      fontFamily: LUMI_SHELL_FONT,
                    }}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.2 }}
                    key={`${it.id}-${badgeCount}`}
                  >
                    <WeChatUnreadBadgeText count={badgeCount} />
                  </motion.span>
                </span>
              ) : (
                iconNode
              )}
              <span
                className="max-w-full truncate text-[10px] leading-none tracking-[0.02em]"
                style={{ fontWeight: isActive ? 650 : 450, color }}
              >
                {it.label}
              </span>
            </Pressable>
          )
        })}
      </div>
    </nav>
  )
}
