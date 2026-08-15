import { motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LoreArchiveTag, LoreEntry } from '../../worldbook/loreArchiveTypes'
import { LORE_ARCHIVE_ENTRY_TAGS_CAP } from '../../worldbook/loreArchiveTypes'
import {
  WORLD_BOOK_CHAR_PLACEHOLDER,
  WORLD_BOOK_USER_PLACEHOLDER,
} from '../wechat/charUserPlaceholders'
import { LoreArchiveTagPill } from './LoreArchiveTagManager'
import type { LoreEditorCharacter } from './LoreArchiveCharacterPickerSheet'
import { LoreArchiveCharacterPickerSheet } from './LoreArchiveCharacterPickerSheet'
import { readSceneChoice, writeSceneChoice, type LoreSceneChoice } from './loreArchiveScene'
import { LA, LA_FONT_CN, laEase, laPageStyle } from './loreArchiveTheme'

export type { LoreEditorCharacter }

type EditTab = 'content' | 'tags' | 'scene' | 'roles'

type Props = {
  draft: LoreEntry
  isNew: boolean
  roster: LoreEditorCharacter[]
  tags: LoreArchiveTag[]
  onChange: (next: LoreEntry) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  onOpenTagManager: () => void
}

const EDIT_TABS: Array<{ id: EditTab; label: string }> = [
  { id: 'content', label: '内容' },
  { id: 'tags', label: '分类' },
  { id: 'scene', label: '场景' },
  { id: 'roles', label: '角色' },
]

const AutoGrowTextarea = forwardRef<
  HTMLTextAreaElement,
  { value: string; onChange: (v: string) => void; placeholder: string }
>(function AutoGrowTextarea({ value, onChange, placeholder }, forwardedRef) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const ref = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el
    if (typeof forwardedRef === 'function') forwardedRef(el)
    else if (forwardedRef) forwardedRef.current = el
  }
  const adjust = useCallback(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(260, el.scrollHeight)}px`
  }, [])
  useEffect(() => {
    adjust()
  }, [value, adjust])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={10}
      className="w-full resize-none bg-transparent text-[15px] outline-none"
      style={{ color: LA.ink, lineHeight: 1.7 }}
    />
  )
})

function GuideBlock({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="mb-6 rounded-2xl border px-4 py-3.5"
      style={{ borderColor: LA.hairline, background: LA.card }}
    >
      <p className="text-[13px] font-semibold" style={{ color: LA.ink }}>
        {title}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: LA.mist }}>
        {body}
      </p>
    </div>
  )
}

export function LoreEditor({
  draft,
  isNew,
  roster,
  tags,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onOpenTagManager,
}: Props) {
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const [tab, setTab] = useState<EditTab>('content')
  const [charPickerOpen, setCharPickerOpen] = useState(false)
  const scene = readSceneChoice(draft)

  const selectedTagIds = useMemo(
    () => new Set((draft.tagIds ?? []).map((x) => String(x ?? '').trim()).filter(Boolean)),
    [draft.tagIds],
  )

  const charAll = draft.characterScope.mode === 'all'
  const selectedCharIds =
    draft.characterScope.mode === 'characters' ? draft.characterScope.ids : []
  const selectedChars = useMemo(() => {
    const set = new Set(selectedCharIds)
    return roster.filter((c) => set.has(c.id))
  }, [roster, selectedCharIds])

  const setScene = (next: LoreSceneChoice) => {
    onChange({ ...draft, plateScope: writeSceneChoice(next), updatedAt: Date.now() })
  }

  const toggleTag = (tagId: string) => {
    const set = new Set(selectedTagIds)
    if (set.has(tagId)) set.delete(tagId)
    else {
      if (set.size >= LORE_ARCHIVE_ENTRY_TAGS_CAP) return
      set.add(tagId)
    }
    const nextIds = [...set]
    onChange({
      ...draft,
      tagIds: nextIds.length ? nextIds : undefined,
      updatedAt: Date.now(),
    })
  }

  const insertPlaceholder = (token: string) => {
    const el = contentRef.current
    if (!el) {
      onChange({ ...draft, content: `${draft.content}${token}`, updatedAt: Date.now() })
      return
    }
    const start = el.selectionStart ?? draft.content.length
    const end = el.selectionEnd ?? start
    const next = `${draft.content.slice(0, start)}${token}${draft.content.slice(end)}`
    onChange({ ...draft, content: next, updatedAt: Date.now() })
    queueMicrotask(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const tabIndex = EDIT_TABS.findIndex((t) => t.id === tab)
  const goNext = () => {
    if (tabIndex < EDIT_TABS.length - 1) setTab(EDIT_TABS[tabIndex + 1]!.id)
    else onSave()
  }
  const goPrev = () => {
    if (tabIndex > 0) setTab(EDIT_TABS[tabIndex - 1]!.id)
  }

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      style={laPageStyle}
      initial={{ y: '8%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '8%', opacity: 0 }}
      transition={{ duration: 0.2, ease: laEase }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
        style={{
          borderColor: LA.hairline,
          background: LA.card,
          paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
        }}
      >
        <button type="button" onClick={onCancel} className="text-[14px]" style={{ color: LA.mist }}>
          取消
        </button>
        <h1 className="text-[15px] font-semibold" style={{ color: LA.ink }}>
          {isNew ? '新建世界书' : '编辑世界书'}
        </h1>
        <button
          type="button"
          onClick={onSave}
          className="text-[14px] font-bold"
          style={{ color: LA.amber }}
        >
          保存
        </button>
      </header>

      <div
        className="flex shrink-0 gap-4 overflow-x-auto border-b px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ borderColor: LA.hairline, background: LA.card }}
      >
        {EDIT_TABS.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative shrink-0 pb-2.5 pt-2 text-[13px] transition-colors"
              style={{ color: on ? LA.amber : LA.mist, fontWeight: on ? 600 : 400 }}
            >
              {t.label}
              {on ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
                  style={{ background: LA.amber }}
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-5">
        {tab === 'content' ? (
          <div>
            <GuideBlock
              title="写什么"
              body="这里写设定、规则与背景。标题用于目录识别；正文会在匹配场景注入模型。"
            />
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value, updatedAt: Date.now() })}
              placeholder="给这篇世界书起个名字"
              className="w-full border-b bg-transparent pb-2 text-[20px] font-medium outline-none"
              style={{ borderColor: LA.hairline, color: LA.ink, fontFamily: LA_FONT_CN }}
            />
            <div className="mt-6 mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold" style={{ color: LA.ink }}>
                正文
              </p>
              <span className="text-[11px] tabular-nums" style={{ color: LA.mist }}>
                {draft.content.length} 字
              </span>
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => insertPlaceholder(WORLD_BOOK_CHAR_PLACEHOLDER)}
                className="rounded-full border px-3 py-1 text-[11px]"
                style={{ borderColor: LA.hairline, color: LA.mist }}
              >
                插入 {'{{char}}'}
              </button>
              <button
                type="button"
                onClick={() => insertPlaceholder(WORLD_BOOK_USER_PLACEHOLDER)}
                className="rounded-full border px-3 py-1 text-[11px]"
                style={{ borderColor: LA.hairline, color: LA.mist }}
              >
                插入 {'{{user}}'}
              </button>
            </div>
            <AutoGrowTextarea
              ref={contentRef}
              value={draft.content}
              onChange={(content) => onChange({ ...draft, content, updatedAt: Date.now() })}
              placeholder="在这里编写世界设定、人物背景、规则……"
            />
            {!isNew && onDelete ? (
              <div className="mt-12 flex justify-center">
                <button type="button" onClick={onDelete} className="text-[13px]" style={{ color: LA.ink }}>
                  删除此世界书
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'tags' ? (
          <div>
            <GuideBlock
              title="用分类整理"
              body="分类只影响你在档案室里的浏览与筛选，不会改变注入内容。可多选，也可在主页顶栏直接点分类查看。"
            />
            <p className="mb-3 text-[12px]" style={{ color: LA.mist }}>
              已选 {selectedTagIds.size}/{LORE_ARCHIVE_ENTRY_TAGS_CAP}
            </p>
            {tags.length === 0 ? (
              <p className="mb-4 text-[13px]" style={{ color: LA.mist }}>
                还没有分类，先去创建一个。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const on = selectedTagIds.has(tag.id)
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}>
                      <LoreArchiveTagPill name={tag.name} size="md" selected={on} />
                    </button>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={onOpenTagManager}
              className="mt-5 rounded-full border border-dashed px-4 py-2 text-[13px]"
              style={{ borderColor: LA.amber, color: LA.amber }}
            >
              + 管理 / 新建分类
            </button>
          </div>
        ) : null}

        {tab === 'scene' ? (
          <div>
            <GuideBlock
              title="何时生效"
              body="三选一：全局 / 线上聊天 / 线下约会。同一时间只能勾选一项。"
            />
            <div className="flex flex-col gap-2">
              {(
                [
                  ['global', '全局作用', '私聊、群聊、线下剧情与 VN 均生效'],
                  ['online', '线上聊天', '微信私聊与群聊'],
                  ['offline', '线下约会', '线下普通剧情与 VN'],
                ] as const
              ).map(([key, label, hint]) => {
                const on =
                  key === 'global' ? scene.global : key === 'online' ? scene.online : scene.offline
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'global') {
                        setScene({ global: true, online: false, offline: false })
                      } else if (key === 'online') {
                        setScene({ global: false, online: true, offline: false })
                      } else {
                        setScene({ global: false, online: false, offline: true })
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left"
                    style={{
                      borderColor: on ? LA.amber : LA.hairline,
                      background: on ? LA.amberSoft : LA.card,
                      transition: 'border-color 200ms ease, background 200ms ease',
                    }}
                  >
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: LA.ink }}>
                        {label}
                      </p>
                      <p className="mt-1 text-[11px]" style={{ color: LA.mist }}>
                        {hint}
                      </p>
                    </div>
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        borderColor: on ? LA.amber : LA.hairline,
                        background: on ? LA.amber : 'transparent',
                      }}
                    >
                      {on ? <Check className="size-3 text-white" strokeWidth={2.5} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {tab === 'roles' ? (
          <div>
            <GuideBlock
              title="对谁生效"
              body="默认对全部角色生效。若只想作用于部分通讯录角色，点下方更改后勾选；「全部角色」与「指定角色」互斥。"
            />
            <button
              type="button"
              onClick={() => setCharPickerOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left"
              style={{ borderColor: LA.hairline, background: LA.card }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium" style={{ color: LA.ink }}>
                  {charAll ? '全部角色' : `已指定 ${selectedChars.length} 人`}
                </p>
                {charAll ? (
                  <p className="mt-1 text-[11px]" style={{ color: LA.mist }}>
                    通讯录内角色均会匹配本条（仍受场景限制）
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {selectedChars.slice(0, 5).map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex h-8 w-8 overflow-hidden rounded-full border"
                          style={{ borderColor: LA.card, background: LA.paper }}
                        >
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span
                              className="flex h-full w-full items-center justify-center text-[11px]"
                              style={{ color: LA.mist }}
                            >
                              {c.name.slice(0, 1)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="inline-flex items-center gap-0.5 text-[13px] font-medium" style={{ color: LA.amber }}>
                更改
                <ChevronRight className="size-4" strokeWidth={1.6} />
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3"
        style={{
          borderColor: LA.hairline,
          background: LA.card,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={tabIndex === 0}
          className="rounded-full px-4 py-2 text-[13px] disabled:opacity-30"
          style={{ color: LA.mist }}
        >
          上一步
        </button>
        <span className="text-[11px] tabular-nums" style={{ color: LA.mist }}>
          {tabIndex + 1} / {EDIT_TABS.length}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full px-5 py-2 text-[13px] font-semibold text-white"
          style={{ background: LA.amber }}
        >
          {tabIndex === EDIT_TABS.length - 1 ? '完成并保存' : '下一步'}
        </button>
      </div>

      <LoreArchiveCharacterPickerSheet
        open={charPickerOpen}
        roster={roster}
        selectedIds={charAll ? null : selectedCharIds}
        onClose={() => setCharPickerOpen(false)}
        onConfirm={(next) => {
          onChange({
            ...draft,
            characterScope: next.mode === 'all' ? { mode: 'all' } : next,
            updatedAt: Date.now(),
          })
        }}
      />
    </motion.div>
  )
}
