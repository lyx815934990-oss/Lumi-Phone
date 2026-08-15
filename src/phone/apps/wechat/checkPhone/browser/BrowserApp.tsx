import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, CircleHelp, Clock3, Moon, Share2, Sparkles, SunMedium, Trash2 } from 'lucide-react'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'
import { Pressable } from '../../../../components/Pressable'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character } from '../../newFriendsPersona/types'
import { generateBrowserDatasetWithAi } from './browserAi'
import {
  clearBrowserDataset,
  hasBrowserContent,
  loadBrowserDataset,
  loadBrowserTutorialSeen,
  saveBrowserDataset,
  saveBrowserTutorialSeen,
} from './browserStorage'
import { BrowserAIGenerateModal } from './BrowserAIGenerateModal'
import { BrowserAddressBar } from './chrome/BrowserChromeTop'
import { BrowserBottomToolbar } from './chrome/BrowserBottomToolbar'
import { BrowserTutorial } from './BrowserTutorial'
import { ArticleScreen } from './screens/ArticleScreen'
import { BookmarksScreen } from './screens/BookmarksScreen'
import { ForumScreen } from './screens/ForumScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { NewTabScreen } from './screens/NewTabScreen'
import { SerpScreen } from './screens/SerpScreen'
import { SharedRecordsScreen } from './screens/SharedRecordsScreen'
import { SuggestScreen } from './screens/SuggestScreen'
import { TabsManager } from './screens/TabsManager'
import { emptyBrowserDataset } from './seedData'
import type {
  BrowserDataset,
  BrowserScreen,
  BrowserTab,
  FrequentSite,
  HistoryItem,
  RecentBrowseCard,
  SerpResult,
  SharedPageRecord,
  BookmarkItem,
} from './types'
import './browserApp.css'

const TUTORIAL_STEPS = [
  {
    key: 'welcome' as const,
    title: '偷看浏览器痕迹',
    text: '这里是角色手机里的浏览器。\n内容需要用「更多 → AI 生成痕迹」根据人设生成，你只能查看，不能新建标签。',
  },
  {
    key: 'desktop' as const,
    title: '返回查手机桌面',
    text: '左上角「桌面」按钮：退出浏览器，回到查手机桌面主页。\n不是网页后退，点它就会离开浏览器。',
  },
  {
    key: 'back' as const,
    title: '返回上一页',
    text: '底部工具栏左侧「上一页」：只在浏览器内后退到上一屏内容。\n没有上一页时按钮会灰掉，不会退出到桌面。',
  },
  {
    key: 'more' as const,
    title: '生成与查看',
    text: '点「更多」可打开历史、收藏、分享网页记录，以及「AI 生成痕迹」。\n之后若想再看本指引，可在「更多」里点「新手指引」随时重看。',
  },
]

function applyTabsFromDataset(data: BrowserDataset): BrowserTab[] {
  const empty = emptyBrowserDataset()
  return Array.isArray(data.openTabs) && data.openTabs.length ? data.openTabs : empty.openTabs
}

export function BrowserApp({
  onClose,
  characterId,
  characterName,
  playerIdentityId,
  playerDisplayName,
  useLumiProjectAssistantPrompt,
  onToast,
}: {
  onClose: () => void
  characterId: string
  characterName?: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  onToast?: (msg: string) => void
}) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const empty = emptyBrowserDataset()
  const [dataset, setDataset] = useState<BrowserDataset>(empty)
  const [loaded, setLoaded] = useState(false)
  const [tabs, setTabs] = useState<BrowserTab[]>(() => applyTabsFromDataset(empty))
  const [activeTabId, setActiveTabId] = useState(() => applyTabsFromDataset(empty)[0]!.id)
  const [stack, setStack] = useState<BrowserScreen[]>(['newtab'])
  const [forwardStack, setForwardStack] = useState<BrowserScreen[]>([])
  const [suggestQuery, setSuggestQuery] = useState('')
  const [overlay, setOverlay] = useState<'none' | 'tabs' | 'more'>('none')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [genOpen, setGenOpen] = useState(false)
  const [genBusy, setGenBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialTarget, setTutorialTarget] = useState<HTMLElement | null>(null)
  const [characterAvatarUrl, setCharacterAvatarUrl] = useState('')
  const [characterAliases, setCharacterAliases] = useState<string[]>(() =>
    [characterName].filter((x): x is string => !!String(x || '').trim()),
  )

  const desktopBtnRef = useRef<HTMLButtonElement | null>(null)
  const backBtnRef = useRef<HTMLButtonElement | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement | null>(null)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!
  const screen = activeTab?.screen ?? 'newtab'
  const hasContent = hasBrowserContent(dataset)

  const syncTabs = (data: BrowserDataset, preferTabId?: string) => {
    const nextTabs = applyTabsFromDataset(data)
    setTabs(nextTabs)
    const pick = (preferTabId && nextTabs.find((t) => t.id === preferTabId)) || nextTabs[0]!
    setActiveTabId(pick.id)
    setStack([pick.screen || 'newtab'])
    setForwardStack([])
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ch = characterId.trim()
        ? ((await personaDb.getCharacter(characterId.trim())) as Character | null)
        : null
      if (cancelled) return
      setCharacterAvatarUrl(String(ch?.avatarUrl || '').trim())
      const aliases = [characterName, ch?.name, ch?.wechatNickname]
        .map((x) => String(x || '').trim())
        .filter(Boolean)
      setCharacterAliases(Array.from(new Set(aliases)))
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, characterName])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [data, seen] = await Promise.all([
        loadBrowserDataset(characterId),
        loadBrowserTutorialSeen(characterId),
      ])
      if (cancelled) return
      setDataset(data)
      syncTabs(data)
      setLoaded(true)
      if (!seen) {
        setTutorialStep(0)
        setTutorialOpen(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [characterId])

  useEffect(() => {
    if (!tutorialOpen) return
    const key = TUTORIAL_STEPS[tutorialStep]?.key
    const tick = () => {
      if (key === 'desktop') setTutorialTarget(desktopBtnRef.current)
      else if (key === 'back') setTutorialTarget(backBtnRef.current)
      else if (key === 'more') setTutorialTarget(moreBtnRef.current)
      else setTutorialTarget(null)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [tutorialOpen, tutorialStep, loaded, overlay, screen])

  const closeTutorial = () => {
    setTutorialOpen(false)
    void saveBrowserTutorialSeen(characterId)
  }

  const persist = async (next: BrowserDataset) => {
    setDataset(next)
    await saveBrowserDataset(characterId, next)
  }

  const patchTab = (id: string, patch: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const navigate = (nextScreen: BrowserScreen, patch?: Partial<BrowserTab>) => {
    setStack((s) => [...s, nextScreen])
    setForwardStack([])
    patchTab(activeTabId, { screen: nextScreen, ...patch })
  }

  const goBack = () => {
    if (overlay !== 'none') {
      setOverlay('none')
      return
    }
    // 仅浏览器内后退，不退出到查手机桌面
    if (stack.length <= 1) return
    setStack((s) => {
      const cur = s[s.length - 1]!
      const prev = s[s.length - 2]!
      setForwardStack((f) => [cur, ...f])
      patchTab(activeTabId, { screen: prev })
      return s.slice(0, -1)
    })
  }

  const goForward = () => {
    if (!forwardStack.length) return
    const next = forwardStack[0]!
    setForwardStack((f) => f.slice(1))
    setStack((s) => [...s, next])
    patchTab(activeTabId, { screen: next })
  }

  const openSerp = (q: string) => {
    const query = q.trim()
    if (!query) return
    navigate('serp', {
      title: query,
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      query,
    })
  }

  const openPage = (pageKind: 'article' | 'forum', pageId: string) => {
    const id = String(pageId || '').trim()
    if (!id) {
      onToast?.('该页面暂无正文')
      return
    }
    if (pageKind === 'article' || dataset.articles[id]) {
      const page = dataset.articles[id]
      if (page) {
        navigate('article', { title: page.title, url: page.url, pageId: id, pageKind: 'article' })
        return
      }
    }
    if (pageKind === 'forum' || dataset.forums[id]) {
      const page = dataset.forums[id]
      if (page) {
        navigate('forum', { title: page.opNick, url: page.url, pageId: id, pageKind: 'forum' })
        return
      }
    }
    onToast?.('该页面正文未生成，请重新 AI 生成痕迹')
  }

  const openLinked = (
    title: string,
    opts: { pageKind?: 'article' | 'forum' | 'serp'; pageId?: string },
  ) => {
    if (opts.pageKind === 'forum' && opts.pageId) {
      openPage('forum', opts.pageId)
      return
    }
    if (opts.pageKind === 'article' && opts.pageId) {
      openPage('article', opts.pageId)
      return
    }
    if (opts.pageId) {
      openPage('article', opts.pageId)
      return
    }
    const byTitle = Object.values(dataset.articles).find((a) => a.title === title)
    if (byTitle) {
      openPage('article', byTitle.id)
      return
    }
    onToast?.('暂无对应正文，请重新 AI 生成痕迹')
  }

  const openRecent = (card: RecentBrowseCard) => {
    openLinked(card.title, { pageKind: card.pageKind, pageId: card.pageId })
  }

  const openFrequent = (site: FrequentSite) => {
    if (site.pageKind === 'forum' && site.pageId) {
      openPage('forum', site.pageId)
      return
    }
    if (site.pageKind === 'article' && site.pageId) {
      openPage('article', site.pageId)
      return
    }
    const host = String(site.host || '').toLowerCase()
    const hit = dataset.history.find((h) => {
      const hh = String(h.host || '').toLowerCase()
      return (
        (!!host && (hh.includes(host) || host.includes(hh))) &&
        !!h.pageId &&
        (h.pageKind === 'article' || h.pageKind === 'forum')
      )
    })
    if (hit?.pageKind === 'article' && hit.pageId) {
      openPage('article', hit.pageId)
      return
    }
    if (hit?.pageKind === 'forum' && hit.pageId) {
      openPage('forum', hit.pageId)
      return
    }
    const art = Object.values(dataset.articles).find((a) => a.siteName === site.name || a.url.includes(host))
    if (art) {
      openPage('article', art.id)
      return
    }
    const forum = Object.values(dataset.forums).find((f) => f.siteName === site.name || f.url.includes(host))
    if (forum) {
      openPage('forum', forum.id)
      return
    }
    onToast?.('该常去站点暂无详情页，可到历史记录里查看')
  }

  const openHistoryItem = (item: HistoryItem) => {
    // 搜索记录只读展示，禁止跳转到搜索页/结果页
    if (item.pageKind === 'serp' || /^搜索[：:]/.test(item.title)) return
    openLinked(item.title, { pageKind: item.pageKind, pageId: item.pageId })
  }

  const openBookmark = (item: BookmarkItem) => {
    openLinked(item.title, { pageKind: item.pageKind, pageId: item.pageId })
  }

  const openShared = (item: SharedPageRecord) => {
    openLinked(item.title, { pageKind: item.pageKind, pageId: item.pageId })
  }

  const openSerpResult = (r: SerpResult) => openPage(r.pageKind, r.pageId)

  const serpPack = dataset.serpByQuery[activeTab.query || ''] ?? dataset.serpByQuery.__default ?? {
    resultCountLabel: '约 0 条结果',
    results: [],
    related: [],
  }

  const showAddress = screen !== 'suggest' && overlay === 'none'
  const addressUrl = screen === 'serp' && activeTab.query ? activeTab.query : activeTab.url || ''

  const onGenerate = async (bias: string) => {
    setGenBusy(true)
    setError(null)
    try {
      const next = await generateBrowserDatasetWithAi({
        apiConfig,
        characterId,
        playerIdentityId,
        playerDisplayName,
        useLumiProjectAssistantPrompt,
        bias,
      })
      await persist(next)
      syncTabs(next)
      setGenOpen(false)
      onToast?.('浏览痕迹已更新')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const stepMeta = TUTORIAL_STEPS[tutorialStep] ?? TUTORIAL_STEPS[0]!

  return (
    <motion.div
      className="browser-app"
      data-theme={theme}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {showAddress ? (
        <BrowserAddressBar
          url={addressUrl}
          focused={false}
          desktopButtonRef={desktopBtnRef}
          onFocusSearch={() => {
            if (!hasContent) {
              setGenOpen(true)
              return
            }
            setSuggestQuery(activeTab.query || '')
            navigate('suggest', { screen: 'suggest' })
          }}
          onRefresh={() => onToast?.('已刷新')}
          onBackToDesktop={onClose}
        />
      ) : null}

      <div className="relative min-h-0 flex-1">
        {!loaded ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[var(--br-mist)]">加载中…</div>
        ) : !hasContent && screen === 'newtab' ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-28 text-center">
            <div className="browser-mono text-[11px] tracking-[0.18em] text-[var(--br-mist)]">EMPTY TRACE</div>
            <div className="mt-3 text-[17px] text-[var(--br-ink)]">还没有浏览痕迹</div>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[var(--br-mist)]">
              用 AI 根据角色人设与近期剧情生成浏览器历史、收藏、分享记录与打开中的标签页。
            </p>
            <Pressable
              type="button"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-[var(--br-hairline)] bg-[var(--br-card)] px-5 text-[13px] text-[var(--br-ink)] shadow-[var(--br-shadow)]"
              onClick={() => setGenOpen(true)}
            >
              <Sparkles size={15} strokeWidth={1.6} />
              AI 生成痕迹
            </Pressable>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTabId}-${screen}`}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {screen === 'newtab' ? (
                <NewTabScreen
                  frequents={dataset.frequents}
                  recents={dataset.recents}
                  onOpenRecent={openRecent}
                  onOpenFrequent={openFrequent}
                />
              ) : null}

              {screen === 'suggest' ? (
                <SuggestScreen
                  query={suggestQuery}
                  items={dataset.suggests}
                  onChangeQuery={setSuggestQuery}
                  onCancel={goBack}
                  onSubmit={openSerp}
                  onPick={openSerp}
                  onFill={setSuggestQuery}
                />
              ) : null}

              {screen === 'serp' ? (
                <SerpScreen
                  query={activeTab.query || ''}
                  resultCountLabel={serpPack.resultCountLabel}
                  results={serpPack.results}
                  related={serpPack.related}
                  onOpenResult={openSerpResult}
                  onRelated={openSerp}
                />
              ) : null}

              {screen === 'article' && activeTab.pageId && dataset.articles[activeTab.pageId] ? (
                <ArticleScreen
                  page={dataset.articles[activeTab.pageId]!}
                  bookmarked={false}
                  readOnly
                  onToggleBookmark={() => {}}
                />
              ) : null}

              {screen === 'forum' && activeTab.pageId && dataset.forums[activeTab.pageId] ? (
                <ForumScreen
                  page={dataset.forums[activeTab.pageId]!}
                  characterAvatarUrl={characterAvatarUrl}
                  characterAliases={characterAliases}
                />
              ) : null}

              {screen === 'history' ? (
                <HistoryScreen items={dataset.history} readOnly onOpen={openHistoryItem} />
              ) : null}

              {screen === 'bookmarks' ? (
                <BookmarksScreen
                  folders={dataset.bookmarkFolders}
                  bookmarks={dataset.bookmarks}
                  editing={false}
                  readOnly
                  onToggleEdit={() => {}}
                  onOpen={openBookmark}
                  onDeleteSelected={() => {}}
                />
              ) : null}

              {screen === 'shared' ? (
                <SharedRecordsScreen
                  items={dataset.sharedPages}
                  characterName={characterName}
                  onOpen={openShared}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        )}

        {overlay === 'none' && screen !== 'suggest' ? (
          <BrowserBottomToolbar
            canBack={stack.length > 1}
            canForward={forwardStack.length > 0}
            tabCount={tabs.length}
            backButtonRef={backBtnRef}
            moreButtonRef={moreBtnRef}
            onBack={goBack}
            onForward={goForward}
            onSharedRecords={() => {
              if (!hasContent) {
                setGenOpen(true)
                return
              }
              navigate('shared', { title: '分享网页记录', url: '' })
            }}
            onTabs={() => setOverlay('tabs')}
            onMore={() => setOverlay('more')}
          />
        ) : null}

        <AnimatePresence>
          {overlay === 'tabs' ? (
            <TabsManager
              tabs={tabs}
              activeTabId={activeTabId}
              onDone={() => setOverlay('none')}
              onSelect={(id) => {
                setActiveTabId(id)
                const tab = tabs.find((t) => t.id === id)
                setStack([tab?.screen || 'newtab'])
                setForwardStack([])
                setOverlay('none')
              }}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {overlay === 'more' ? (
            <motion.div
              className="absolute inset-0 z-30 flex items-end bg-black/20 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOverlay('none')
              }}
            >
              <motion.div
                className="browser-sheet w-full overflow-hidden"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {[
                  {
                    label: '历史记录',
                    icon: Clock3,
                    run: () => {
                      setOverlay('none')
                      if (!hasContent) {
                        setGenOpen(true)
                        return
                      }
                      navigate('history', { title: '历史记录', url: '' })
                    },
                  },
                  {
                    label: '收藏',
                    icon: Bookmark,
                    run: () => {
                      setOverlay('none')
                      if (!hasContent) {
                        setGenOpen(true)
                        return
                      }
                      navigate('bookmarks', { title: '收藏', url: '' })
                    },
                  },
                  {
                    label: '分享网页记录',
                    icon: Share2,
                    run: () => {
                      setOverlay('none')
                      if (!hasContent) {
                        setGenOpen(true)
                        return
                      }
                      navigate('shared', { title: '分享网页记录', url: '' })
                    },
                  },
                  {
                    label: theme === 'light' ? '深夜模式' : '浅色模式',
                    icon: theme === 'light' ? Moon : SunMedium,
                    run: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
                  },
                  {
                    label: 'AI 生成痕迹',
                    icon: Sparkles,
                    run: () => {
                      setOverlay('none')
                      setGenOpen(true)
                    },
                  },
                  {
                    label: '新手指引',
                    icon: CircleHelp,
                    run: () => {
                      setOverlay('none')
                      setTutorialStep(0)
                      setTutorialOpen(true)
                    },
                  },
                  {
                    label: '清除浏览数据',
                    icon: Trash2,
                    run: () => {
                      void (async () => {
                        const next = emptyBrowserDataset()
                        await clearBrowserDataset(characterId)
                        await persist(next)
                        syncTabs(next)
                        onToast?.('已清除浏览痕迹')
                        setOverlay('none')
                      })()
                    },
                  },
                ].map((opt, i) => (
                  <div key={opt.label}>
                    {i > 0 ? <div className="h-px bg-[var(--br-hairline)]" /> : null}
                    <Pressable
                      type="button"
                      className="flex h-12 w-full items-center gap-3 px-4 text-[14px] text-[var(--br-ink)]"
                      onClick={opt.run}
                    >
                      <opt.icon size={15} strokeWidth={1.6} className="text-[var(--br-mist)]" />
                      {opt.label}
                    </Pressable>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <BrowserTutorial
          open={tutorialOpen}
          step={tutorialStep}
          title={stepMeta.title}
          text={stepMeta.text}
          targetElement={tutorialTarget}
          canPrev={tutorialStep > 0}
          onPrev={() => setTutorialStep((v) => Math.max(0, v - 1))}
          onNext={() => {
            setTutorialStep((v) => {
              const next = v + 1
              if (next >= TUTORIAL_STEPS.length) {
                closeTutorial()
                return v
              }
              return next
            })
          }}
          onClose={closeTutorial}
          nextLabel={tutorialStep >= TUTORIAL_STEPS.length - 1 ? '完成' : '下一步'}
        />
      </div>

      <BrowserAIGenerateModal
        open={genOpen}
        busy={genBusy}
        error={error}
        onClose={() => {
          if (!genBusy) setGenOpen(false)
        }}
        onSubmit={onGenerate}
      />
    </motion.div>
  )
}
