import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  LORE_ARCHIVE_TAG_NAME_MAX,
  LORE_ARCHIVE_TAGS_CAP,
  type LoreArchiveTag,
} from '../../worldbook/loreArchiveTypes'
import { LA, LA_FONT_CN, laEase } from './loreArchiveTheme'

export function LoreArchiveTagPill({
  name,
  size = 'sm',
  onClick,
  onRemove,
  selected,
}: {
  name: string
  size?: 'sm' | 'md'
  onClick?: () => void
  onRemove?: () => void
  selected?: boolean
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border font-medium ${
        size === 'md' ? 'px-3 py-1.5 text-[12px]' : 'px-2.5 py-0.5 text-[10px]'
      }`}
      style={{
        borderColor: LA.amber,
        color: selected ? '#fff' : LA.amber,
        background: selected ? LA.amber : 'transparent',
        transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
      }}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="truncate">
          {name}
        </button>
      ) : (
        <span className="truncate">{name}</span>
      )}
      {onRemove ? (
        <button
          type="button"
          aria-label={`移除 ${name}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 text-[12px] leading-none opacity-80"
        >
          ×
        </button>
      ) : null}
    </span>
  )
}

type Props = {
  open: boolean
  tags: LoreArchiveTag[]
  entryCountByTagId: Record<string, number>
  onClose: () => void
  onUpsert: (input: { id?: string; name: string }) => LoreArchiveTag | null
  onRemove: (id: string) => void
}

export function LoreArchiveTagManagerSheet({
  open,
  tags,
  entryCountByTagId,
  onClose,
  onUpsert,
  onRemove,
}: Props) {
  const [draftName, setDraftName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDraftName('')
      setEditingId(null)
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!flashId) return
    const t = window.setTimeout(() => setFlashId(null), 600)
    return () => window.clearTimeout(t)
  }, [flashId])

  const submit = () => {
    const name = draftName.replace(/\s+/g, ' ').trim()
    if (!name) {
      setError('请填写标签名')
      return
    }
    const result = onUpsert({
      ...(editingId ? { id: editingId } : {}),
      name,
    })
    if (!result) {
      setError(
        tags.length >= LORE_ARCHIVE_TAGS_CAP && !editingId
          ? `最多 ${LORE_ARCHIVE_TAGS_CAP} 个标签`
          : '名称已存在或无效',
      )
      return
    }
    if (!editingId) setFlashId(result.id)
    setDraftName('')
    setEditingId(null)
    setError('')
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭"
            className="fixed inset-0 z-[44]"
            style={{ background: 'rgba(247, 246, 244, 0.72)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[45] flex items-center justify-center px-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="flex max-h-[min(82vh,640px)] w-full max-w-[420px] flex-col overflow-hidden rounded-[24px] border shadow-lg"
              style={{ fontFamily: LA_FONT_CN, background: LA.card, borderColor: LA.hairline }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: laEase }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
            <header className="flex shrink-0 items-center justify-between border-b px-5 py-4"
              style={{ borderColor: LA.hairline }}
            >
              <h2 className="text-[16px] font-semibold" style={{ color: LA.ink }}>
                管理分类
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[14px] font-medium"
                style={{ color: LA.amber }}
              >
                完成
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px]" style={{ color: LA.mist }}>
                  还没有标签
                </p>
              ) : (
                <ul>
                  {tags.map((tag) => {
                    const count = entryCountByTagId[tag.id] ?? 0
                    const flashing = flashId === tag.id
                    return (
                      <li
                        key={tag.id}
                        className="flex items-center gap-2 border-b px-5 py-3.5"
                        style={{
                          borderColor: LA.hairline,
                          background: flashing ? LA.amberSoft : 'transparent',
                          transition: 'background 600ms ease',
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <LoreArchiveTagPill name={tag.name} size="md" />
                          <p className="mt-1 text-[11px]" style={{ color: LA.mist }}>
                            使用于 {count} 篇
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`编辑 ${tag.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ color: LA.mist }}
                          onClick={() => {
                            setEditingId(tag.id)
                            setDraftName(tag.name)
                            setError('')
                          }}
                        >
                          <Pencil className="size-4" strokeWidth={1.6} />
                        </button>
                        <button
                          type="button"
                          aria-label={`删除 ${tag.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ color: LA.mist }}
                          onClick={() => {
                            if (
                              !window.confirm(
                                count > 0
                                  ? `删除标签「${tag.name}」？将从 ${count} 篇世界书上移除该标签。`
                                  : `删除标签「${tag.name}」？`,
                              )
                            ) {
                              return
                            }
                            if (editingId === tag.id) {
                              setEditingId(null)
                              setDraftName('')
                            }
                            onRemove(tag.id)
                          }}
                        >
                          <Trash2 className="size-4" strokeWidth={1.6} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div
              className="shrink-0 border-t px-4 py-3"
              style={{ borderColor: LA.hairline }}
            >
              {editingId ? (
                <p className="mb-2 text-[11px]" style={{ color: LA.mist }}>
                  正在编辑标签
                </p>
              ) : null}
              {error ? (
                <p className="mb-2 text-[12px]" style={{ color: '#9a4a4a' }}>
                  {error}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  value={draftName}
                  maxLength={LORE_ARCHIVE_TAG_NAME_MAX}
                  onChange={(e) => {
                    setDraftName(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit()
                  }}
                  placeholder={editingId ? '修改分类名' : '+ 新建分类'}
                  className="min-w-0 flex-1 rounded-full border px-4 py-2.5 text-[14px] outline-none"
                  style={{ borderColor: LA.hairline, background: LA.paper, color: LA.ink }}
                />
                <button
                  type="button"
                  aria-label="确认"
                  onClick={submit}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: LA.amber }}
                >
                  <Plus className="size-5" strokeWidth={1.8} />
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
