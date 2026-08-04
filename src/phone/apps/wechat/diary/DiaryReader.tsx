import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Languages, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCurrentApiConfig, useTranslationRuntime } from '../../api/ApiSettingsContext'
import { batchTranslateWeChatBubbleTexts } from '../wechatChatLanguage'
import { LinedDiarySheet } from './LinedDiarySheet'
import {
  buildDiaryVirtualPages,
  computeDiaryPageLayout,
  DIARY_SHEET_PADDING_LEFT,
  DIARY_SHEET_PADDING_RIGHT,
  type DiaryPageLayoutConfig,
} from './diaryPageLayout'
import { ensureDiaryFontsLoaded } from './diaryFonts'
import {
  ensureDiaryInUniverseTimeHasYear,
  loadDiaryStoryYearHint,
} from './diaryInUniverseTime'
import { isDiaryWritingChinese } from './diaryLanguage'
import { resolveCharacterRealName } from './resolveCharacterRealName'
import { useDiaryStore } from './useDiaryStore'

type DiaryReaderProps = {
  charId: string
  displayName: string
  focusEntryId?: string | null
  generating: boolean
  generateError: string | null
  onBack: () => void
  onForceGenerate?: () => void
  onDeleteEntry?: () => void
}

function EmptyReader({
  displayName,
  onForceGenerate,
  generating,
}: {
  displayName: string
  onForceGenerate: () => void
  generating: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-28 text-center">
      <p className="text-[16px] text-gray-600">尚未窥探到 {displayName} 的思绪</p>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-gray-400">
        点击下方按钮，让潜意识在纸页上留下第一行字迹。
      </p>
      <button
        type="button"
        disabled={generating}
        onClick={onForceGenerate}
        className="mt-8 rounded-full bg-gray-950 px-6 py-3 text-[14px] tracking-wide text-white transition-opacity disabled:opacity-50"
      >
        窥探最新思绪
      </button>
    </div>
  )
}

export function DiaryReader({
  charId,
  displayName,
  focusEntryId = null,
  generating,
  generateError,
  onBack,
  onForceGenerate,
  onDeleteEntry,
}: DiaryReaderProps) {
  const book = useDiaryStore((s) => s.getBook(charId))
  const patchEntryTranslation = useDiaryStore((s) => s.patchEntryTranslation)
  const chatApiConfig = useCurrentApiConfig()
  const translationRuntime = useTranslationRuntime()
  const allEntries = useMemo(() => book?.entries ?? [], [book?.entries])
  const sourceEntries = useMemo(() => {
    if (!focusEntryId) return allEntries
    const one = allEntries.find((e) => e.id === focusEntryId)
    return one ? [one] : []
  }, [allEntries, focusEntryId])
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [contentWidth, setContentWidth] = useState(280)
  const [pageLayout, setPageLayout] = useState<DiaryPageLayoutConfig>(() =>
    computeDiaryPageLayout(520),
  )
  const [fontsReady, setFontsReady] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [signatureName, setSignatureName] = useState(displayName)
  const [storyYearHint, setStoryYearHint] = useState<string | null>(null)
  const [showZhTranslation, setShowZhTranslation] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  /** 当前页按页缓存的简体译文（无整篇译文时使用） */
  const [pageZhCache, setPageZhCache] = useState<Record<string, { title: string; body: string }>>({})
  const measureRef = useRef<HTMLDivElement>(null)
  const canShowTranslateBtn = !isDiaryWritingChinese(book?.diaryOutputLanguage)

  useEffect(() => {
    let cancelled = false
    void resolveCharacterRealName(charId, displayName).then((name) => {
      if (!cancelled) setSignatureName(name)
    })
    return () => {
      cancelled = true
    }
  }, [charId, displayName])

  useEffect(() => {
    setPageIndex(0)
    setDirection(0)
    setShowZhTranslation(false)
    setTranslateError(null)
    setPageZhCache({})
  }, [charId, focusEntryId])

  const entries = useMemo(() => {
    if (!showZhTranslation) return sourceEntries
    return sourceEntries.map((e) => {
      const zhTitle = (e.translatedTitle ?? '').trim()
      const zhContent = (e.translatedContent ?? '').trim()
      if (!zhContent) return e
      return {
        ...e,
        title: zhTitle || e.title,
        content: zhContent,
      }
    })
  }, [showZhTranslation, sourceEntries])

  useEffect(() => {
    let cancelled = false
    void loadDiaryStoryYearHint(charId).then((year) => {
      if (!cancelled) setStoryYearHint(year)
    })
    return () => {
      cancelled = true
    }
  }, [charId])

  useEffect(() => {
    void ensureDiaryFontsLoaded([book?.fontFamily]).then(() => {
      setFontsReady((v) => v + 1)
    })
  }, [book?.fontFamily])

  useEffect(() => {
    const node = measureRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const sheetOuter = node.clientWidth
      const inner = sheetOuter - 24 - DIARY_SHEET_PADDING_LEFT - DIARY_SHEET_PADDING_RIGHT
      if (inner > 0) setContentWidth(inner)
      if (node.clientHeight > 0) setPageLayout(computeDiaryPageLayout(node.clientHeight))
    }
    const ro = new ResizeObserver(() => measure())
    ro.observe(node)
    measure()
    return () => ro.disconnect()
  }, [])

  const virtualPages = useMemo(() => {
    const pages = buildDiaryVirtualPages(
      entries,
      contentWidth,
      book?.fontFamily ?? null,
      pageLayout,
      // 看译文时按中文排版；原文按日记书写语言叠假名/谚文回退
      showZhTranslation ? 'zh-CN' : book?.diaryOutputLanguage,
    )
    if (!storyYearHint) return pages
    return pages.map((page) => ({
      ...page,
      inUniverseTime: ensureDiaryInUniverseTimeHasYear(page.inUniverseTime, storyYearHint),
    }))
  }, [
    book?.diaryOutputLanguage,
    book?.fontFamily,
    contentWidth,
    entries,
    fontsReady,
    pageLayout,
    showZhTranslation,
    storyYearHint,
  ])

  const total = virtualPages.length
  const currentRaw = total > 0 ? virtualPages[Math.min(pageIndex, total - 1)]! : null
  const current = useMemo(() => {
    if (!currentRaw) return null
    if (showZhTranslation) {
      const entryHasFullZh = sourceEntries.some(
        (e) => e.id === currentRaw.entryId && (e.translatedContent ?? '').trim(),
      )
      if (entryHasFullZh) return currentRaw
    }
    if (!showZhTranslation) return currentRaw
    const key = `${currentRaw.entryId}:${currentRaw.chunkIndex}`
    const cached = pageZhCache[key]
    if (!cached) return currentRaw
    return {
      ...currentRaw,
      title: currentRaw.isFirstChunk ? cached.title || currentRaw.title : currentRaw.title,
      body: cached.body || currentRaw.body,
    }
  }, [currentRaw, pageZhCache, showZhTranslation, sourceEntries])

  useEffect(() => {
    if (pageIndex > 0 && pageIndex >= total) {
      setPageIndex(Math.max(0, total - 1))
    }
  }, [pageIndex, total])

  const goPrev = () => {
    if (pageIndex <= 0) return
    setDirection(-1)
    setPageIndex((v) => v - 1)
  }

  const goNext = () => {
    if (pageIndex >= total - 1) return
    setDirection(1)
    setPageIndex((v) => v + 1)
  }

  const handleToggleTranslate = useCallback(async () => {
    if (!currentRaw) return
    setTranslateError(null)
    if (showZhTranslation) {
      setShowZhTranslation(false)
      setPageIndex(0)
      setDirection(0)
      return
    }

    const focus = sourceEntries.find((e) => e.id === currentRaw.entryId)
    if (focus && (focus.translatedContent ?? '').trim()) {
      setShowZhTranslation(true)
      setPageIndex(0)
      setDirection(0)
      return
    }

    const pageKey = `${currentRaw.entryId}:${currentRaw.chunkIndex}`
    if (pageZhCache[pageKey]?.body?.trim()) {
      setShowZhTranslation(true)
      return
    }

    if (!translationRuntime && !chatApiConfig) {
      setTranslateError('未配置翻译或聊天 API')
      return
    }

    setTranslating(true)
    try {
      // 优先整篇翻译并落库，阅读时可整篇切到中文重分页
      if (focus && focus.content.trim()) {
        const [zhTitle, zhContent] = await batchTranslateWeChatBubbleTexts({
          apiConfig: chatApiConfig,
          translationRuntime,
          texts: [focus.title, focus.content],
          targetLanguage: 'zh-CN',
          speakerName: displayName,
        })
        if (zhContent?.trim()) {
          patchEntryTranslation(charId, focus.id, {
            translatedTitle: (zhTitle ?? '').trim() || focus.title,
            translatedContent: zhContent.trim(),
          })
          setShowZhTranslation(true)
          setPageIndex(0)
          setDirection(0)
          return
        }
      }

      const texts = currentRaw.isFirstChunk
        ? [currentRaw.title, currentRaw.body]
        : [currentRaw.body]
      const out = await batchTranslateWeChatBubbleTexts({
        apiConfig: chatApiConfig,
        translationRuntime,
        texts,
        targetLanguage: 'zh-CN',
        speakerName: displayName,
      })
      const zhTitle = currentRaw.isFirstChunk ? (out[0] ?? '').trim() : currentRaw.title
      const zhBody = (currentRaw.isFirstChunk ? out[1] : out[0] ?? '').trim()
      if (!zhBody) {
        setTranslateError('翻译失败，请稍后重试')
        return
      }
      setPageZhCache((prev) => ({
        ...prev,
        [pageKey]: { title: zhTitle || currentRaw.title, body: zhBody },
      }))
      setShowZhTranslation(true)
    } catch {
      setTranslateError('翻译失败，请稍后重试')
    } finally {
      setTranslating(false)
    }
  }, [
    charId,
    chatApiConfig,
    currentRaw,
    displayName,
    pageZhCache,
    patchEntryTranslation,
    showZhTranslation,
    sourceEntries,
    translationRuntime,
  ])

  const entryLabel =
    current && entries.length > 1
      ? `第 ${current.entryIndex + 1} 篇`
      : null

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col bg-[#f7f6f3]"
      style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.02)' }}
    >
      <header
        className="relative z-10 flex shrink-0 items-center border-b border-black/[0.04] bg-[#f7f6f3]/90 px-3 pb-3 backdrop-blur-sm"
        style={{ paddingTop: 'max(10px, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          aria-label="返回藏书阁"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/[0.04]"
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[16px] font-medium text-gray-900">{displayName}</div>
          <div className="text-[10px] tracking-[0.2em] text-gray-400">
            {focusEntryId ? (showZhTranslation ? '阅读日记 · 中文' : '阅读日记') : '私语档案'}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-0.5">
          {canShowTranslateBtn && currentRaw ? (
            <button
              type="button"
              aria-label={showZhTranslation ? '显示原文' : '翻译成中文'}
              disabled={translating}
              onClick={() => void handleToggleTranslate()}
              className={`flex h-10 min-w-10 items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] transition-colors disabled:opacity-45 ${
                showZhTranslation
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-black/[0.04] hover:text-gray-800'
              }`}
            >
              <Languages className="size-3.5" strokeWidth={1.5} />
              <span>{translating ? '…' : showZhTranslation ? '原文' : '翻译'}</span>
            </button>
          ) : null}
          {focusEntryId && onDeleteEntry ? (
            !deleteConfirm ? (
              <button
                type="button"
                aria-label="删除这篇日记"
                onClick={() => setDeleteConfirm(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="size-4" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                aria-label="确认删除"
                onClick={() => {
                  onDeleteEntry()
                  setDeleteConfirm(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-[11px] text-white"
              >
                删
              </button>
            )
          ) : !canShowTranslateBtn || !currentRaw ? (
            <div className="w-10" />
          ) : null}
        </div>
      </header>

      <div ref={measureRef} className="relative min-h-0 flex-1 overflow-hidden">
        {!current ? (
          <EmptyReader
            displayName={displayName}
            generating={generating}
            onForceGenerate={onForceGenerate ?? (() => {})}
          />
        ) : (
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={`${current.entryId}:${current.chunkIndex}`}
              custom={direction}
              className="absolute inset-0 flex flex-col"
              variants={{
                enter: (d: number) => ({ x: d >= 0 ? 100 : -100, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d >= 0 ? -100 : 100, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            >
              <LinedDiarySheet
                page={current}
                fontFamily={book?.fontFamily ?? null}
                language={showZhTranslation ? 'zh-CN' : book?.diaryOutputLanguage}
                signatureName={signatureName}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {total > 0 ? (
        <div
          className={`absolute left-0 right-0 z-10 flex flex-col items-center gap-1 ${
            onForceGenerate
              ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          {entryLabel ? (
            <span className="text-[10px] tracking-[0.14em] text-gray-400">{entryLabel}</span>
          ) : null}
          <div className="flex items-center justify-center gap-5 text-gray-500">
            <button
              type="button"
              aria-label="上一页"
              disabled={pageIndex <= 0}
              onClick={goPrev}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm transition-colors hover:bg-white disabled:opacity-25"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} />
            </button>
            <span className="min-w-[5rem] text-center font-mono text-[13px] tabular-nums text-gray-600">
              {pageIndex + 1} / {total}
            </span>
            <button
              type="button"
              aria-label="下一页"
              disabled={pageIndex >= total - 1}
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm transition-colors hover:bg-white disabled:opacity-25"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : null}

      {generateError || translateError ? (
        <div className="absolute bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-10 rounded-xl border border-red-100 bg-red-50/90 px-3 py-2 text-center text-[12px] text-red-600">
          {translateError || generateError}
        </div>
      ) : null}

      {onForceGenerate ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-black/[0.04] bg-[#f7f6f3]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-sm">
          <button
            type="button"
            disabled={generating}
            onClick={onForceGenerate}
            className="mx-auto flex h-11 w-full max-w-[360px] items-center justify-center rounded-full bg-gray-950 text-[13px] tracking-wide text-white transition-opacity disabled:opacity-50"
          >
            <span className="mr-2 text-[11px] text-white/70">&#10022;</span>
            窥探最新思绪
            <span className="ml-2 text-[10px] text-white/45">Force Resonance</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
