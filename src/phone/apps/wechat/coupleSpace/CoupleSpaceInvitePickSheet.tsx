import { AnimatePresence, motion } from 'framer-motion'
import { Heart, X } from 'lucide-react'
import { useMemo } from 'react'

import { Pressable } from '../../../components/Pressable'
import type { WeChatPersonaContact } from '../../../types'
import { isCoupleSpaceBound } from './coupleSpaceTypes'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

type Props = {
  open: boolean
  contacts: WeChatPersonaContact[]
  wechatAccountId?: string | null
  onClose: () => void
  onPick: (contact: WeChatPersonaContact) => void
}

export function CoupleSpaceInvitePickSheet({
  open,
  contacts,
  wechatAccountId,
  onClose,
  onPick,
}: Props) {
  const hydrated = useCoupleSpaceStore((s) => s.hydrated)
  const root = useCoupleSpaceStore((s) => s.root)

  const rows = useMemo(() => {
    const acc = wechatAccountId?.trim()
    const rooms = acc && hydrated ? root.byAccount[acc]?.rooms ?? {} : {}
    return contacts
      .map((c) => {
        const cid = c.characterId?.trim() || c.id?.trim() || ''
        const name = c.remarkName?.trim() || '未命名'
        const avatar = c.avatarUrl?.trim() || ''
        const bound = cid ? isCoupleSpaceBound(rooms[cid]) : false
        return { contact: c, cid, name, avatar, bound }
      })
      .filter((r) => r.cid)
      .sort((a, b) => {
        if (a.bound !== b.bound) return a.bound ? 1 : -1
        return a.name.localeCompare(b.name, 'zh')
      })
  }, [contacts, hydrated, root, wechatAccountId])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="couple-invite-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button type="button" className="absolute inset-0" aria-label="关闭" onClick={onClose} />
          <motion.div
            className="couple-invite-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            role="dialog"
            aria-label="选择邀请好友"
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[#4A3A35]">选择邀请对象</p>
                <p className="mt-0.5 text-[11px] text-[#B99A8E]">选一位好友，发送情侣空间专属邀约</p>
              </div>
              <Pressable
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FBEFEA] text-[#B99A8E] active:opacity-80"
                aria-label="关闭"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </Pressable>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              {rows.length === 0 ? (
                <div className="px-2 py-10 text-center">
                  <Heart className="mx-auto h-8 w-8 text-[#EAC7BC]" strokeWidth={1.4} />
                  <p className="mt-3 text-[13px] text-[#B99A8E]">还没有可邀请的好友</p>
                  <p className="mt-1 text-[12px] text-[#C9A99C]">先去微信添加角色好友吧</p>
                </div>
              ) : (
                <ul className="space-y-1.5 pb-2">
                  {rows.map(({ contact, cid, name, avatar, bound }) => (
                    <li key={cid}>
                      <Pressable
                        type="button"
                        disabled={bound}
                        onClick={() => {
                          if (bound) return
                          onPick(contact)
                        }}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-[#F0DDD4] bg-white px-3 py-2.5 text-left active:opacity-90 disabled:opacity-45"
                      >
                        {avatar ? (
                          <img
                            src={avatar}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FBEFEA] text-[14px] font-medium text-[#B87A6A]">
                            {name.slice(0, 1)}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-[#4A3A35]">
                            {name}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#B99A8E]">
                            {bound ? '已开通情侣空间' : '发送绑定邀请'}
                          </span>
                        </span>
                        {!bound ? (
                          <span className="shrink-0 rounded-full bg-gradient-to-r from-[#E8B4A8] to-[#D99C90] px-2.5 py-1 text-[11px] font-medium text-white">
                            邀请
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] text-[#C9A99C]">已绑定</span>
                        )}
                      </Pressable>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
