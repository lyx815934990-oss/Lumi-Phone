import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'
import { Pressable } from '../../../../components/Pressable'
import { personaDb } from '../../newFriendsPersona/idb'
import { generateHealthDatasetWithAi } from './healthAi'
import { HealthAIGenerateModal } from './HealthAIGenerateModal'
import {
  clearHealthDataset,
  hasHealthContent,
  loadHealthDataset,
  normalizeHealthDataset,
  saveHealthDataset,
} from './healthStorage'
import { BodyBookScreen } from './screens/BodyBookScreen'
import { CheckupDetailScreen, CheckupsScreen } from './screens/CheckupsScreen'
import { ConsultDetailScreen, ConsultsScreen } from './screens/ConsultsScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MedsScreen } from './screens/MedsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { VisitDetailScreen, VisitsScreen } from './screens/VisitsScreen'
import { emptyHealthDataset, type HealthDataset, type HealthScreen } from './types'
import './healthApp.css'

const EASE = [0.25, 0.1, 0.25, 1] as const

function screenTitle(top: HealthScreen): string | null {
  switch (top.kind) {
    case 'home':
      return null
    case 'profile':
      return '基本信息'
    case 'visits':
      return '就诊记录'
    case 'visit':
      return '就诊详情'
    case 'body':
      return '全身健康册'
    case 'checkups':
      return '体检报告'
    case 'checkup':
      return '体检详情'
    case 'meds':
      return '用药医嘱'
    case 'consults':
      return '面诊记录'
    case 'consult':
      return '面诊详情'
    default:
      return null
  }
}

export function HealthApp({
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
  /** 病历封面用角色卡真实姓名，不用微信备注 */
  const [realName, setRealName] = useState(() => characterName?.trim() || '')
  const [dataset, setDataset] = useState<HealthDataset>(() => emptyHealthDataset())
  const [loaded, setLoaded] = useState(false)
  const [stack, setStack] = useState<HealthScreen[]>([{ kind: 'home' }])
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
      const name = ch?.name?.trim() || characterName?.trim() || ''
      setRealName(name)
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, characterName])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await loadHealthDataset(characterId)
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

  const push = (screen: HealthScreen) => setStack((s) => [...s, screen])
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))

  const persist = async (next: HealthDataset) => {
    const normalized = normalizeHealthDataset(next)
    setDataset(normalized)
    await saveHealthDataset(characterId, normalized)
  }

  const onGenerate = async (bias: string) => {
    setGenBusy(true)
    setError(null)
    try {
      const next = await generateHealthDatasetWithAi({
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
      onToast?.('健康痕迹已更新')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const onClear = async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('确认清除当前健康档案吗？该操作不可撤销。')
      if (!ok) return
    }
    await clearHealthDataset(characterId)
    setDataset(emptyHealthDataset())
    setStack([{ kind: 'home' }])
    setOverlay('none')
    onToast?.('已清除健康记录')
  }

  const visit = useMemo(() => {
    if (top.kind !== 'visit') return null
    return (dataset.visits ?? []).find((x) => x.id === top.visitId) ?? null
  }, [dataset.visits, top])

  const checkup = useMemo(() => {
    if (top.kind !== 'checkup') return null
    return (dataset.checkups ?? []).find((x) => x.id === top.checkupId) ?? null
  }, [dataset.checkups, top])

  const consult = useMemo(() => {
    if (top.kind !== 'consult') return null
    return (dataset.consults ?? []).find((x) => x.id === top.consultId) ?? null
  }, [dataset.consults, top])

  const consults = dataset.consults ?? []
  const visits = dataset.visits ?? []
  const checkups = dataset.checkups ?? []
  const medications = dataset.medications ?? []
  const bodySections = dataset.bodySections ?? []

  return (
    <motion.div
      className="health-app absolute inset-0 z-[40] flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2.5 pt-[max(10px,env(safe-area-inset-top))]"
        style={{
          borderBottom: '1px solid var(--hl-hairline)',
          background: 'rgba(247,246,244,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <Pressable
          type="button"
          className="flex h-9 items-center gap-0.5 rounded-full px-1.5 text-[14px]"
          style={{ color: '#5A6B7A' }}
          onClick={() => {
            if (canBack) pop()
            else onClose()
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.7} />
          {canBack ? '返回' : '桌面'}
        </Pressable>
        <div className="min-w-0 flex-1 text-center text-[14px] font-medium">{title || '健康'}</div>
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
          <div className="health-empty">加载中…</div>
        ) : !hasHealthContent(dataset) && top.kind === 'home' ? (
          <div className="flex flex-col items-center px-6 pt-16 text-center">
            <p className="text-[15px] font-medium">还没有健康痕迹</p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#8b8b8f' }}>
              用「更多 → AI 生成痕迹」根据人设生成就诊、面诊对话、全身健康册与体检报告。你只能查看，不能挂号或改诊断。
            </p>
            <Pressable
              type="button"
              className="mt-6 rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
              style={{ background: '#5A6B7A' }}
              onClick={() => setGenOpen(true)}
            >
              AI 生成痕迹
            </Pressable>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${top.kind}:${'visitId' in top ? top.visitId : ''}${'checkupId' in top ? top.checkupId : ''}${'consultId' in top ? top.consultId : ''}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {top.kind === 'home' ? (
                <HomeScreen data={dataset} characterName={realName} onNavigate={push} />
              ) : null}
              {top.kind === 'profile' ? (
                <ProfileScreen profile={dataset.profile} patientName={realName} />
              ) : null}
              {top.kind === 'visits' ? (
                <VisitsScreen visits={visits} onOpen={(id) => push({ kind: 'visit', visitId: id })} />
              ) : null}
              {top.kind === 'visit' && visit ? <VisitDetailScreen visit={visit} /> : null}
              {top.kind === 'visit' && !visit ? <div className="health-empty">记录不存在</div> : null}
              {top.kind === 'consults' ? (
                <ConsultsScreen
                  consults={consults}
                  onOpen={(id) => push({ kind: 'consult', consultId: id })}
                />
              ) : null}
              {top.kind === 'consult' && consult ? (
                <ConsultDetailScreen
                  consult={consult}
                  patientLabel={realName}
                  profile={dataset.profile}
                />
              ) : null}
              {top.kind === 'consult' && !consult ? <div className="health-empty">记录不存在</div> : null}
              {top.kind === 'body' ? <BodyBookScreen sections={bodySections} /> : null}
              {top.kind === 'checkups' ? (
                <CheckupsScreen
                  checkups={checkups}
                  onOpen={(id) => push({ kind: 'checkup', checkupId: id })}
                />
              ) : null}
              {top.kind === 'checkup' && checkup ? <CheckupDetailScreen report={checkup} /> : null}
              {top.kind === 'checkup' && !checkup ? <div className="health-empty">报告不存在</div> : null}
              {top.kind === 'meds' ? <MedsScreen meds={medications} /> : null}
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
                <Sparkles size={18} strokeWidth={1.6} style={{ color: '#5A6B7A' }} />
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

      <HealthAIGenerateModal
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
