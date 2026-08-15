import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'
import { Pressable } from '../../../../components/Pressable'
import { personaDb } from '../../newFriendsPersona/idb'
import { generateBingeDatasetWithAi } from './bingeAi'
import { BingeAIGenerateModal } from './BingeAIGenerateModal'
import {
  clearBingeDataset,
  hasBingeContent,
  loadBingeDataset,
  saveBingeDataset,
} from './bingeStorage'
import { CommentsScreen } from './screens/CommentsScreen'
import { DetailScreen } from './screens/DetailScreen'
import { FavoritesScreen } from './screens/FavoritesScreen'
import { ForumDetailScreen, ForumsScreen } from './screens/ForumsScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SearchResultsScreen, SearchesScreen } from './screens/SearchScreens'
import { emptyBingeDataset, type BingeDataset, type BingeScreen } from './types'
import './bingeApp.css'

const EASE = [0.25, 0.1, 0.25, 1] as const

function screenTitle(top: BingeScreen): string | null {
  switch (top.kind) {
    case 'home':
      return null
    case 'detail':
      return '详情'
      case 'history':
      return '观看轨迹'
    case 'favorites':
      return '收藏'
    case 'forums':
      return '讨论组'
    case 'forum':
      return '讨论组'
    case 'comments':
      return '评论'
    case 'searches':
      return '站内搜索'
    case 'searchResults':
      return '站内结果'
    default:
      return null
  }
}

export function BingeApp({
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
  /** 标题用角色卡真实姓名，不用微信备注 */
  const [realName, setRealName] = useState(() => characterName?.trim() || '')
  const [dataset, setDataset] = useState<BingeDataset>(() => emptyBingeDataset())
  const [loaded, setLoaded] = useState(false)
  const [stack, setStack] = useState<BingeScreen[]>([{ kind: 'home' }])
  const [overlay, setOverlay] = useState<'none' | 'more'>('none')
  const [genOpen, setGenOpen] = useState(false)
  const [genBusy, setGenBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const cid = characterId.trim()
      const ch = cid ? await personaDb.getCharacter(cid) : null
      if (cancelled) return
      setRealName(ch?.name?.trim() || characterName?.trim() || '')
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, characterName])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await loadBingeDataset(characterId)
      if (cancelled) return
      setDataset(rows)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [characterId])

  const top = stack[stack.length - 1] ?? { kind: 'home' as const }
  const canBack = stack.length > 1
  const title = screenTitle(top)

  const push = (screen: BingeScreen) => setStack((s) => [...s, screen])
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const openItem = (itemId: string) => push({ kind: 'detail', itemId })

  const persist = async (next: BingeDataset) => {
    setDataset(next)
    await saveBingeDataset(characterId, next)
  }

  const onGenerate = async (bias: string) => {
    setGenBusy(true)
    setError(null)
    try {
      const next = await generateBingeDatasetWithAi({
        apiConfig,
        characterId,
        playerIdentityId,
        playerDisplayName,
        useLumiProjectAssistantPrompt,
        bias,
        previousDataset: dataset,
      })
      await persist(next)
      setStack([{ kind: 'home' }])
      setGenOpen(false)
      onToast?.('追剧痕迹已更新')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const onClear = async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('确认清除当前追剧观影记录吗？该操作不可撤销。')
      if (!ok) return
    }
    await clearBingeDataset(characterId)
    setDataset(emptyBingeDataset())
    setStack([{ kind: 'home' }])
    setOverlay('none')
    onToast?.('已清除追剧记录')
  }

  const detailItem = useMemo(() => {
    if (top.kind !== 'detail') return null
    return dataset.items.find((x) => x.id === top.itemId) ?? null
  }, [dataset.items, top])

  const forum = useMemo(() => {
    if (top.kind !== 'forum') return null
    return dataset.forums.find((x) => x.id === top.forumId) ?? null
  }, [dataset.forums, top])

  return (
    <motion.div
      className="binge-app absolute inset-0 z-[40] flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]"
        style={{ borderBottom: '1px solid var(--bg-hairline)', background: 'var(--bg-paper)' }}
      >
        <Pressable
          type="button"
          className="flex h-9 items-center gap-0.5 rounded-full px-1.5 text-[14px]"
          style={{ color: '#6B5A78' }}
          onClick={() => {
            if (canBack) pop()
            else onClose()
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.7} />
          {canBack ? '返回' : '桌面'}
        </Pressable>
        <div className="min-w-0 flex-1 text-center text-[14px] font-medium" style={{ color: '#101012' }}>
          {title || '追剧馆'}
        </div>
        <Pressable
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: '#8b8b8f' }}
          onClick={() => setOverlay('more')}
          aria-label="更多"
        >
          <MoreHorizontal size={20} strokeWidth={1.6} />
        </Pressable>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!loaded ? (
          <div className="binge-empty">加载中…</div>
        ) : !hasBingeContent(dataset) && top.kind === 'home' ? (
          <div className="flex flex-col items-center px-6 pt-16 text-center">
            <p className="text-[15px] font-medium" style={{ color: '#101012' }}>
              还没有追剧痕迹
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#8b8b8f' }}>
              用「更多 → AI 生成痕迹」根据人设生成 TA 的观影与阅读记录。你只能查看，不能新建。
            </p>
            <Pressable
              type="button"
              className="mt-6 rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
              style={{ background: '#6B5A78' }}
              onClick={() => setGenOpen(true)}
            >
              AI 生成痕迹
            </Pressable>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${top.kind}:${'itemId' in top ? top.itemId : ''}${'forumId' in top ? top.forumId : ''}${'query' in top ? top.query : ''}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {top.kind === 'home' ? (
                <HomeScreen
                  data={dataset}
                  characterName={realName}
                  onNavigate={push}
                  onOpenItem={openItem}
                />
              ) : null}
              {top.kind === 'detail' && detailItem ? (
                <DetailScreen
                  item={detailItem}
                  onToggleFavorite={() => {
                    void persist({
                      ...dataset,
                      items: dataset.items.map((x) =>
                        x.id === detailItem.id ? { ...x, favorited: !x.favorited } : x,
                      ),
                    })
                  }}
                  onOpenForum={
                    detailItem.forumId
                      ? () => push({ kind: 'forum', forumId: detailItem.forumId! })
                      : undefined
                  }
                />
              ) : null}
              {top.kind === 'detail' && !detailItem ? (
                <div className="binge-empty">内容不存在</div>
              ) : null}
              {top.kind === 'history' ? <HistoryScreen data={dataset} onOpenItem={openItem} /> : null}
              {top.kind === 'favorites' ? <FavoritesScreen data={dataset} onOpenItem={openItem} /> : null}
              {top.kind === 'forums' ? (
                <ForumsScreen forums={dataset.forums} onOpen={(id) => push({ kind: 'forum', forumId: id })} />
              ) : null}
              {top.kind === 'forum' && forum ? <ForumDetailScreen forum={forum} /> : null}
              {top.kind === 'forum' && !forum ? <div className="binge-empty">讨论组不存在</div> : null}
              {top.kind === 'comments' ? <CommentsScreen data={dataset} onOpenItem={openItem} /> : null}
              {top.kind === 'searches' ? (
                <SearchesScreen
                  data={dataset}
                  onClear={() => void persist({ ...dataset, searches: [] })}
                  onSearch={(query) => push({ kind: 'searchResults', query })}
                />
              ) : null}
              {top.kind === 'searchResults' ? (
                <SearchResultsScreen data={dataset} query={top.query} onOpenItem={openItem} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {overlay === 'more' ? (
          <>
            <motion.button
              type="button"
              className="absolute inset-0 z-[50]"
              style={{ background: 'rgba(16,16,18,0.28)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOverlay('none')}
            />
            <motion.div
              className="absolute inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] z-[51] overflow-hidden rounded-[18px] border bg-white shadow-lg"
              style={{ borderColor: '#E6E4E0' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Pressable
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14px]"
                onClick={() => {
                  setOverlay('none')
                  setGenOpen(true)
                }}
              >
                <Sparkles size={18} strokeWidth={1.6} style={{ color: '#6B5A78' }} />
                AI 生成痕迹
              </Pressable>
              <div style={{ height: 1, background: '#E6E4E0' }} />
              <Pressable
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14px]"
                style={{ color: '#9a4a4a' }}
                onClick={() => void onClear()}
              >
                <Trash2 size={18} strokeWidth={1.6} />
                清除数据
              </Pressable>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <BingeAIGenerateModal
        open={genOpen}
        busy={genBusy}
        error={error}
        onClose={() => {
          if (!genBusy) setGenOpen(false)
        }}
        onSubmit={(bias) => void onGenerate(bias)}
      />
    </motion.div>
  )
}
