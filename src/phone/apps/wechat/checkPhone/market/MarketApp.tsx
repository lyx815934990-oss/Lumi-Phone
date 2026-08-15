import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'
import { Pressable } from '../../../../components/Pressable'
import { personaDb } from '../../newFriendsPersona/idb'
import { generateMarketDatasetWithAi } from './marketAi'
import { MarketAIGenerateModal } from './MarketAIGenerateModal'
import {
  clearMarketDataset,
  hasMarketContent,
  loadMarketDataset,
  saveMarketDataset,
} from './marketStorage'
import { BrowseScreen } from './screens/BrowseScreen'
import { DetailScreen } from './screens/DetailScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ReviewsScreen } from './screens/ReviewsScreen'
import { emptyMarketDataset, type MarketDataset, type MarketScreen } from './types'
import './marketApp.css'

const EASE = [0.25, 0.1, 0.25, 1] as const

function screenTitle(top: MarketScreen): string | null {
  switch (top.kind) {
    case 'home':
      return null
    case 'detail':
      return '订单详情'
    case 'browse':
      return '浏览记录'
    case 'reviews':
      return '评价手账'
    default:
      return null
  }
}

export function MarketApp({
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
  const [dataset, setDataset] = useState<MarketDataset>(() => emptyMarketDataset())
  const [loaded, setLoaded] = useState(false)
  const [stack, setStack] = useState<MarketScreen[]>([{ kind: 'home' }])
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
      const rows = await loadMarketDataset(characterId)
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

  const push = (screen: MarketScreen) => setStack((s) => [...s, screen])
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const openOrder = (orderId: string) => push({ kind: 'detail', orderId })

  const persist = async (next: MarketDataset) => {
    setDataset(next)
    await saveMarketDataset(characterId, next)
  }

  const onGenerate = async (bias: string) => {
    setGenBusy(true)
    setError(null)
    try {
      const next = await generateMarketDatasetWithAi({
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
      onToast?.('团购痕迹已更新')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const onClear = async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('确认清除当前团购生活记录吗？该操作不可撤销。')
      if (!ok) return
    }
    await clearMarketDataset(characterId)
    setDataset(emptyMarketDataset())
    setStack([{ kind: 'home' }])
    setOverlay('none')
    onToast?.('已清除团购记录')
  }

  const detailOrder = useMemo(() => {
    if (top.kind !== 'detail') return null
    return dataset.orders.find((x) => x.id === top.orderId) ?? null
  }, [dataset.orders, top])

  return (
    <motion.div
      className="market-app absolute inset-0 z-[40] flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]"
        style={{ borderBottom: '1px solid var(--mk-hairline)', background: 'var(--mk-paper)' }}
      >
        <Pressable
          type="button"
          className="flex h-9 items-center gap-0.5 rounded-full px-1.5 text-[14px]"
          style={{ color: '#3C8C86' }}
          onClick={() => {
            if (canBack) pop()
            else onClose()
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.7} />
          {canBack ? '返回' : '桌面'}
        </Pressable>
        <div className="min-w-0 flex-1 text-center text-[14px] font-medium">{title || '团购中心'}</div>
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
          <div className="market-empty">加载中…</div>
        ) : !hasMarketContent(dataset) && top.kind === 'home' ? (
          <div className="flex flex-col items-center px-6 pt-16 text-center">
            <p className="text-[15px] font-medium">还没有团购痕迹</p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#8b8b8f' }}>
              用「更多 → AI 生成痕迹」根据人设生成订房、订位、买券与评价。你只能查看，不能下单或核销。
            </p>
            <Pressable
              type="button"
              className="mt-6 rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
              style={{ background: '#3C8C86' }}
              onClick={() => setGenOpen(true)}
            >
              AI 生成痕迹
            </Pressable>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${top.kind}:${'orderId' in top ? top.orderId : ''}`}
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
                  onOpenOrder={openOrder}
                />
              ) : null}
              {top.kind === 'detail' && detailOrder ? <DetailScreen order={detailOrder} /> : null}
              {top.kind === 'detail' && !detailOrder ? <div className="market-empty">订单不存在</div> : null}
              {top.kind === 'browse' ? <BrowseScreen data={dataset} /> : null}
              {top.kind === 'reviews' ? <ReviewsScreen data={dataset} onOpenOrder={openOrder} /> : null}
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
                <Sparkles size={18} strokeWidth={1.6} style={{ color: '#3C8C86' }} />
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

      <MarketAIGenerateModal
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
