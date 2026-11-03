import { ArrowLeft, Loader2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ApiConfig } from '../../api/types'
import { WeChatThemePageBackdrop } from './WeChatThemePageBackdrop'
import {
  clampEnsembleNpcCount,
  clampEnsembleRomanceCount,
  PERSONA_PACK_PREMISE_OPTIONS,
} from './personaPack'
import {
  ENSEMBLE_EXTRA_CHIPS,
  ENSEMBLE_KIND_SEEDS,
  extraHintHasChip,
  fieldMatchesSeed,
  toggleExtraHintChip,
  type EnsembleKindSeed,
} from './personaEnsemblePresets'
import { persistEnsemblePack } from './personaPackPersist'
import {
  ensembleRomanceToPersist,
  generateEnsemblePackWithAi,
} from './personaEnsembleGenerate'
import { fillEnsembleMemberDossiers } from './personaEnsembleFillDossiers'
import { fillEnsembleRelationshipGraph } from './personaEnsembleRelationGraph'
import type { Character, PersonaPackPremiseKind } from './types'

const PAGE_BG = '#FAFAFA'

export function PersonaEnsembleGeneratePage({
  mode,
  playerIdentityId,
  wechatAccountId,
  apiConfig,
  onBack,
  onCreated,
}: {
  mode: 'custom' | 'ai'
  playerIdentityId: string
  wechatAccountId?: string | null
  apiConfig: ApiConfig | null
  onBack: () => void
  onCreated: (result: { packId: string; romance: Character[] }) => void
}) {
  const initialSeed = ENSEMBLE_KIND_SEEDS.dating_show
  const [title, setTitle] = useState(initialSeed.title)
  const [premiseKind, setPremiseKind] = useState<PersonaPackPremiseKind>('dating_show')
  const [premise, setPremise] = useState(initialSeed.premise)
  const [sharedRules, setSharedRules] = useState(initialSeed.sharedRules)
  const [extraHint, setExtraHint] = useState(initialSeed.extraHint)
  const [romanceCount, setRomanceCount] = useState(initialSeed.romanceCount)
  const [npcCount, setNpcCount] = useState(initialSeed.npcCount)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevSeedRef = useRef<EnsembleKindSeed>(initialSeed)

  const kindMeta = useMemo(
    () => PERSONA_PACK_PREMISE_OPTIONS.find((x) => x.id === premiseKind),
    [premiseKind],
  )
  const seed = ENSEMBLE_KIND_SEEDS[premiseKind]

  const applySeed = (nextKind: PersonaPackPremiseKind, force: boolean) => {
    const next = ENSEMBLE_KIND_SEEDS[nextKind]
    const prev = prevSeedRef.current
    setPremiseKind(nextKind)
    setTitle((cur) => (force || !cur.trim() || fieldMatchesSeed(cur, prev.title) ? next.title : cur))
    setPremise((cur) => (force || !cur.trim() || fieldMatchesSeed(cur, prev.premise) ? next.premise : cur))
    setSharedRules((cur) =>
      force || !cur.trim() || fieldMatchesSeed(cur, prev.sharedRules) ? next.sharedRules : cur,
    )
    setExtraHint((cur) =>
      force || !cur.trim() || fieldMatchesSeed(cur, prev.extraHint) ? next.extraHint : cur,
    )
    setRomanceCount((cur) => (force || cur === prev.romanceCount ? next.romanceCount : cur))
    setNpcCount((cur) => (force || cur === prev.npcCount ? next.npcCount : cur))
    prevSeedRef.current = next
  }

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }

  const runPersistBlanks = async () => {
    const romance = Array.from({ length: clampEnsembleRomanceCount(romanceCount) }, (_, i) => ({
      name: '',
      identity: `可攻略 ${i + 1}`,
    }))
    const npcs = Array.from({ length: clampEnsembleNpcCount(npcCount) }, (_, i) => ({
      name: '',
      identity: `NPC ${i + 1}`,
    }))
    const saved = await persistEnsemblePack({
      title,
      premiseKind,
      premise,
      sharedRules,
      playerIdentityId,
      wechatAccountId,
      romance,
      npcs,
    })
    onCreated({ packId: saved.pack.id, romance: saved.romance })
  }

  const runAi = async () => {
    if (!apiConfig) {
      window.alert('请先在全局配置里填好聊天 API')
      return
    }
    stop()
    const ac = new AbortController()
    abortRef.current = ac
    setBusy(true)
    setProgress('正在生成名单与关系…')
    setError(null)
    try {
      const draft = await generateEnsemblePackWithAi({
        apiConfig,
        premiseKind,
        titleHint: title,
        premiseHint: premise,
        extraHint,
        romanceCount: clampEnsembleRomanceCount(romanceCount),
        npcCount: clampEnsembleNpcCount(npcCount),
        playerDisplayName: '你',
        signal: ac.signal,
      })
      setProgress('正在写入演出卡…')
      const saved = await persistEnsemblePack({
        title: draft.title,
        premiseKind: draft.premiseKind,
        premise: draft.premise || premise,
        sharedRules: draft.sharedRules || sharedRules,
        playerIdentityId,
        wechatAccountId,
        romance: ensembleRomanceToPersist(draft.romance),
        npcs: draft.npcs,
        relations: draft.relations,
      })
      setProgress('正在完善多人卡关系图（彼此看法 / 对你的连线）…')
      try {
        await fillEnsembleRelationshipGraph({
          apiConfig,
          romance: saved.romance,
          npcs: saved.npcs,
          packTitle: saved.pack.title,
          premise: saved.pack.premise || premise,
          playerDisplayName: '你',
          signal: ac.signal,
        })
      } catch (relErr) {
        if (relErr instanceof Error && relErr.name === 'AbortError') throw relErr
        console.warn('[ensemble] relationship graph', relErr)
      }
      const fill = await fillEnsembleMemberDossiers({
        apiConfig,
        pack: saved.pack,
        romance: saved.romance,
        npcs: saved.npcs,
        signal: ac.signal,
        onProgress: (info) => {
          setProgress(
            `正在写「角色人设档案」${info.index}/${info.total}：${info.name}（${info.seat === 'npc' ? 'NPC' : '可攻略'}）`,
          )
        },
      })
      if (fill.failed.length) {
        const msg = `名单已保存，但有 ${fill.failed.length} 人档案未写全：\n${fill.failed.join('\n')}\n可稍后打开该角色用 AI 补全。`
        setError(msg)
        window.alert(msg)
      }
      onCreated({ packId: saved.pack.id, romance: saved.romance })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setError('已停止生成')
        return
      }
      const msg = e instanceof Error ? e.message : '多人卡生成失败'
      setError(msg)
      window.alert(msg)
    } finally {
      if (abortRef.current === ac) abortRef.current = null
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col" style={{ background: PAGE_BG }}>
      <WeChatThemePageBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 shrink-0 border-b border-neutral-100/90 bg-[#FAFAFA]/90 backdrop-blur-xl"
          style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-0.5 px-2 py-2">
            <button
              type="button"
              onClick={() => {
                if (busy) stop()
                onBack()
              }}
              className="rounded-full p-2.5 text-neutral-800 transition-colors hover:bg-neutral-200/40"
              aria-label="返回"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                Ensemble Card
              </p>
              <p className="truncate text-[16px] font-semibold tracking-tight text-neutral-900">
                {mode === 'ai' ? 'AI 生成多人卡' : '自定义多人卡'}
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="text-[13px] leading-relaxed text-neutral-500">
            已按卡种填好示例，改字再生成即可。可攻略默认进通讯录；NPC 默认不加，仍能在线下出场。
          </p>

          <div className="mt-4 flex items-end justify-between gap-2">
            <label className="text-[12px] font-medium text-neutral-500">卡种</label>
            <button
              type="button"
              disabled={busy}
              onClick={() => applySeed(premiseKind, true)}
              className="text-[11px] text-neutral-500 underline decoration-neutral-300 underline-offset-2 disabled:opacity-40"
            >
              恢复本卡种示例
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PERSONA_PACK_PREMISE_OPTIONS.map((opt) => {
              const on = premiseKind === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={busy}
                  onClick={() => applySeed(opt.id, false)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-800'
                  }`}
                >
                  <p className="text-[13px] font-semibold">{opt.label}</p>
                  <p className={`mt-0.5 text-[10px] leading-snug ${on ? 'text-white/70' : 'text-neutral-400'}`}>
                    {opt.hint}
                  </p>
                </button>
              )
            })}
          </div>
          {kindMeta ? (
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
              当前：{kindMeta.label}。换卡种会替换还没改过的栏，手改过的会留下。
            </p>
          ) : null}

          <label className="mt-4 block text-[12px] font-medium text-neutral-500">节目标题</label>
          <input
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] outline-none"
            placeholder="节目或世界的名字"
          />

          <label className="mt-4 block text-[12px] font-medium text-neutral-500">背景（这场戏发生在哪）</label>
          <textarea
            value={premise}
            disabled={busy}
            onChange={(e) => setPremise(e.target.value)}
            rows={5}
            className="mt-1 w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] leading-relaxed outline-none"
            placeholder="地点、为什么会碰到、公开场合和私下分别是什么"
          />

          <label className="mt-4 block text-[12px] font-medium text-neutral-500">共用规则（谁知道什么）</label>
          <textarea
            value={sharedRules}
            disabled={busy}
            onChange={(e) => setSharedRules(e.target.value)}
            rows={5}
            className="mt-1 w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] leading-relaxed outline-none"
            placeholder="镜头/公告/淘汰怎么算公开；私下约定谁能知道"
          />

          {mode === 'ai' ? (
            <>
              <label className="mt-4 block text-[12px] font-medium text-neutral-500">额外要求</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ENSEMBLE_EXTRA_CHIPS.map((chip) => {
                  const on = extraHintHasChip(extraHint, chip.text)
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setExtraHint((cur) => toggleExtraHintChip(cur, chip.text))}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        on
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={extraHint}
                disabled={busy}
                onChange={(e) => setExtraHint(e.target.value)}
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] leading-relaxed outline-none"
                placeholder="气质差、禁忌、NPC 要什么职能"
              />
            </>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-medium text-neutral-500">
              可攻略人数
              <input
                type="number"
                min={2}
                max={8}
                disabled={busy}
                value={romanceCount}
                onChange={(e) => setRomanceCount(clampEnsembleRomanceCount(Number(e.target.value)))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] outline-none"
              />
            </label>
            <label className="block text-[12px] font-medium text-neutral-500">
              NPC 人数
              <input
                type="number"
                min={0}
                max={8}
                disabled={busy}
                value={npcCount}
                onChange={(e) => setNpcCount(clampEnsembleNpcCount(Number(e.target.value)))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] outline-none"
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">{seed.npcHint}</p>

          {progress && busy ? (
            <p className="mt-3 text-[12px] leading-relaxed text-neutral-600">{progress}</p>
          ) : null}
          {error ? <p className="mt-3 text-[12px] leading-relaxed text-red-500">{error}</p> : null}
        </div>

        <div
          className="shrink-0 border-t border-neutral-100 bg-white px-4 pt-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          {mode === 'ai' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAi()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111827] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? '生成中…' : 'AI 生成人设档案并加入通讯录'}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void runPersistBlanks()
                  .catch((e) => {
                    const msg = e instanceof Error ? e.message : '创建失败'
                    setError(msg)
                    window.alert(msg)
                  })
                  .finally(() => setBusy(false))
              }}
              className="flex w-full items-center justify-center rounded-full bg-[#111827] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? '写入中…' : '创建空白席位并加入通讯录'}
            </button>
          )}
          <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-400">
            一次生成会：写名单 → 画彼此关系图和对你的连线 → 再按人补「角色人设档案」。可攻略默认进微信；NPC 需手动加好友。
          </p>
        </div>
      </div>
    </div>
  )
}
