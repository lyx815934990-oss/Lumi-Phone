/**
 * 七夕开屏信封：仪式开屏 → 选角色 → 拆封 → 读告白信
 */

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveCharacterAvatarUrl } from '../../utils/characterAvatarUrl'
import { loadResolvedApiConfig } from '../api/loadResolvedApiConfig'
import { loadAccountsBundle } from '../wechat/wechatAccountPersistence'
import { personaDb } from '../wechat/newFriendsPersona/idb'
import type { Character } from '../wechat/newFriendsPersona/types'
import { formatPlayerIdentityDisplayName } from '../wechat/wechatCharacterPlayerIdentity'
import {
  listSavedQixiLetterIds,
  loadSavedQixiLetter,
  markQixiAutoOfferedTodayForUser,
  saveQixiLetter,
} from './qixiEnvelopeStorage'
import { QixiCeremonyIntro } from './QixiCeremonyIntro'
import { ensureQixiLetterFontLoaded, QIXI_LETTER_FONT_STACK } from './qixiFont'
import {
  generateQixiConfessionLetter,
  listQixiEnvelopeCharacters,
  type QixiLetterResult,
} from './qixiLetterAi'
import { saveQixiLetterToAlbum } from './saveQixiLetterImage'

const ENVELOPE_TEXTURE_URL = new URL('../../../../image/信封纹理纸.png', import.meta.url).toString()

type Phase = 'ceremony' | 'pick' | 'seal' | 'writing' | 'letter' | 'error'

export function QixiEnvelopeModal(props: {
  open: boolean
  onClose: () => void
  /** 首次自动弹出时播放仪式感开屏 */
  withCeremony?: boolean
}) {
  const { open, onClose, withCeremony = false } = props
  const [phase, setPhase] = useState<Phase>(withCeremony ? 'ceremony' : 'pick')
  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selected, setSelected] = useState<Character | null>(null)
  const [letter, setLetter] = useState<QixiLetterResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [writingHint, setWritingHint] = useState('正在落笔…')
  const [fontReady, setFontReady] = useState(false)
  const [saveHint, setSaveHint] = useState<string | null>(null)
  const [albumPreviewUrl, setAlbumPreviewUrl] = useState<string | null>(null)
  const [savedLetterIds, setSavedLetterIds] = useState<Set<string>>(() => listSavedQixiLetterIds())
  const runningRef = useRef(false)

  const shellControls = useAnimationControls()
  const flapControls = useAnimationControls()
  const sealControls = useAnimationControls()
  const letterControls = useAnimationControls()

  const handleDismiss = useCallback(() => {
    onClose()
  }, [onClose])

  const handleKeepLetter = useCallback(async () => {
    if (!letter) {
      onClose()
      return
    }
    setSaveHint('正在保存到系统相册…')
    const name = selected?.name?.trim() || selected?.wechatNickname?.trim() || 'TA'
    const res = await saveQixiLetterToAlbum(letter, name)
    setSaveHint(res.message || (res.ok ? '请保存到系统相册' : '保存失败'))
    if (res.previewUrl) {
      setAlbumPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return res.previewUrl ?? null
      })
      return
    }
    if (res.ok) onClose()
  }, [letter, onClose, selected])

  useEffect(() => {
    if (!open) return
    if (withCeremony) markQixiAutoOfferedTodayForUser()
    setPhase(withCeremony ? 'ceremony' : 'pick')
    setSelected(null)
    setLetter(null)
    setError(null)
    setSaveHint(null)
    setSavedLetterIds(listSavedQixiLetterIds())
    setLoadingList(true)
    void ensureQixiLetterFontLoaded().then(() => setFontReady(true))
    let cancelled = false
    void listQixiEnvelopeCharacters()
      .then((rows) => {
        if (!cancelled) setCharacters(rows)
      })
      .catch(() => {
        if (!cancelled) setCharacters([])
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, withCeremony])

  const startLetterGeneration = useCallback(async (character: Character) => {
    setPhase('writing')
    setWritingHint('正在写信…')
    setError(null)
    try {
      const [cfg, bundle] = await Promise.all([loadResolvedApiConfig('chatCard'), loadAccountsBundle()])
      if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
        throw new Error('请先在 API 设置中配置可用模型')
      }
      const wechatAccountId =
        character.wechatAccountId?.trim() || bundle?.currentAccountId?.trim() || null
      const account = wechatAccountId
        ? bundle?.accounts.find((a) => a.accountId === wechatAccountId) ?? null
        : null
      const { resolveAccountSessionIdentityId } = await import('../wechat/wechatAccountPersistence')
      const pid =
        character.playerIdentityId?.trim() ||
        (account ? resolveAccountSessionIdentityId(account) : '') ||
        '__none__'

      let playerIdentity = null as Awaited<ReturnType<typeof personaDb.getPlayerIdentity>>
      if (pid && pid !== '__none__') {
        playerIdentity = await personaDb.getPlayerIdentity(pid)
      }
      const playerDisplayName = formatPlayerIdentityDisplayName(playerIdentity, pid) || '你'

      const result = await generateQixiConfessionLetter({
        character,
        playerIdentity,
        playerDisplayName,
        wechatAccountId,
        apiConfig: cfg,
      })
      saveQixiLetter(character.id, result)
      setSavedLetterIds(listSavedQixiLetterIds())
      setLetter(result)
      setPhase('letter')
    } catch (e) {
      setError(e instanceof Error ? e.message : '写信失败')
      setPhase('error')
    }
  }, [])

  const handlePick = useCallback((c: Character) => {
    setSelected(c)
    const existing = loadSavedQixiLetter(c.id)
    if (existing) {
      setLetter(existing)
      setPhase('letter')
      return
    }
    setLetter(null)
    setPhase('seal')
    void shellControls.set({ scale: 1, opacity: 1 })
    void flapControls.set({ rotateX: 0 })
    void sealControls.set({ scale: 1, opacity: 1 })
    void letterControls.set({ opacity: 0, y: 0 })
  }, [shellControls, flapControls, sealControls, letterControls])

  const handleReveal = useCallback(async () => {
    if (!selected || runningRef.current) return
    runningRef.current = true
    try {
      await sealControls.start({
        scale: 0.2,
        opacity: 0,
        transition: { duration: 0.35, ease: 'easeIn' },
      })
      await flapControls.start({
        rotateX: -160,
        transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
      })
      await letterControls.start({
        opacity: 1,
        y: '-42%',
        transition: { duration: 0.65, ease: 'easeOut' },
      })
      await shellControls.start({
        scale: 0.92,
        opacity: 0.35,
        transition: { duration: 0.4 },
      })
      const existing = loadSavedQixiLetter(selected.id)
      if (existing) {
        setLetter(existing)
        setPhase('letter')
        return
      }
      await startLetterGeneration(selected)
    } finally {
      runningRef.current = false
    }
  }, [selected, sealControls, flapControls, letterControls, shellControls, startLetterGeneration])

  const letterFontStyle = fontReady ? { fontFamily: QIXI_LETTER_FONT_STACK } : undefined

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[2100] flex flex-col bg-[#1a0f14]/92 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
      >
        {phase === 'ceremony' ? (
          <QixiCeremonyIntro
            open
            onFinished={() => setPhase('pick')}
            onSkip={() => setPhase('pick')}
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196, 72, 98, 0.45), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(120, 40, 70, 0.35), transparent 50%)',
          }}
        />

        {phase !== 'ceremony' ? (
          <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[max(14px,env(safe-area-inset-top,0px))]">
            <div>
              <p className="text-[11px] tracking-[0.35em] text-[#f0c4ce]/70">QIXI · 2026</p>
              <h1 className="mt-1 text-[22px] font-medium tracking-wide text-[#fce8ee]">
                七夕信封
              </h1>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full px-3 py-1.5 text-[12px] tracking-widest text-white/55 hover:text-white/85"
            >
              关闭
            </button>
          </header>
        ) : null}

        {phase !== 'ceremony' ? (
          <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))]">
            {phase === 'pick' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="mb-3 text-[13px] leading-relaxed text-[#f0c4ce]/80">
                  点开一封写给你的信——请选择一位角色，由 TA 亲手写下今夜告白。
                </p>
                {loadingList ? (
                  <p className="py-10 text-center text-[13px] text-white/45">载入通讯录人设…</p>
                ) : characters.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-white/45">
                    暂无人设角色。请先在通讯录创建角色后再来。
                  </p>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-4">
                    {characters.map((c) => {
                      const name = c.name?.trim() || c.wechatNickname?.trim() || '未命名'
                      const avatar = resolveCharacterAvatarUrl({ avatarUrl: c.avatarUrl })
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => handlePick(c)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left transition hover:border-[#e8a0b0]/35 hover:bg-white/[0.1]"
                          >
                            <span className="flex size-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#3a2030]">
                              {avatar ? (
                                <img src={avatar} alt="" className="size-full object-cover" />
                              ) : (
                                <span className="flex size-full items-center justify-center text-[14px] text-[#f0c4ce]/70">
                                  {name.slice(0, 1)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] text-[#fce8ee]">{name}</span>
                              <span className="mt-0.5 block truncate text-[11px] text-white/40">
                                {savedLetterIds.has(c.id) ? '已写好 · 点开直接阅读' : '点击领取 TA 的信封'}
                              </span>
                            </span>
                            <span className="text-[11px] tracking-widest text-[#e8a0b0]/80">
                              {savedLetterIds.has(c.id) ? '阅读' : '开封'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ) : null}

            {phase === 'seal' && selected ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <p className="mb-6 text-center text-[13px] text-[#f0c4ce]/85">
                  来自{' '}
                  <span className="text-[#fce8ee]">
                    {selected.name?.trim() || selected.wechatNickname?.trim() || 'TA'}
                  </span>{' '}
                  的信封 · 轻触封缄拆开
                </p>
                <motion.div animate={shellControls} className="relative">
                  <div
                    className="relative h-[220px] w-[min(320px,88vw)]"
                    style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
                  >
                    <div
                      className="absolute inset-0 z-10 rounded-[10px] border border-black/12 shadow-[0_18px_56px_rgba(0,0,0,0.32)]"
                      style={{
                        backgroundImage: `url(${ENVELOPE_TEXTURE_URL})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'brightness(0.78) sepia(0.15)',
                      }}
                    />
                    <motion.div
                      animate={letterControls}
                      className="absolute bottom-2 left-4 right-4 top-6 z-20 overflow-hidden rounded-[8px] border border-black/10 bg-[#fff8f5] shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                      style={{ opacity: 0 }}
                    >
                      <div className="px-5 pt-6 text-center text-[13px] text-[#8a4058]/50">
                        七夕 · 只给你
                      </div>
                    </motion.div>
                    <div
                      className="absolute inset-0 z-30"
                      style={{
                        backgroundImage: `url(${ENVELOPE_TEXTURE_URL})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        clipPath: 'polygon(0% 0%, 50% 60%, 100% 0%, 100% 100%, 0% 100%)',
                        filter: 'brightness(0.85) sepia(0.12)',
                      }}
                    />
                    <motion.div
                      animate={flapControls}
                      className="absolute inset-0 z-40 drop-shadow-[0_2px_2px_rgba(0,0,0,0.12)]"
                      style={{
                        backgroundImage: `url(${ENVELOPE_TEXTURE_URL})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        clipPath: 'polygon(0% 0%, 100% 0%, 50% 60%)',
                        transformOrigin: 'top center',
                        filter: 'brightness(0.9) sepia(0.1)',
                      }}
                    />
                    <motion.button
                      type="button"
                      aria-label="拆开信封"
                      animate={sealControls}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => void handleReveal()}
                      className="absolute left-1/2 top-[58%] z-50 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2"
                    >
                      {/* 磨砂主盘（无高光） */}
                      <span
                        className="absolute inset-0 overflow-hidden rounded-full border border-[#8a4058]/35 shadow-[0_10px_28px_rgba(60,20,35,0.4)]"
                        style={{
                          background:
                            'linear-gradient(160deg, rgba(196,120,140,0.55) 0%, rgba(140,58,82,0.62) 55%, rgba(90,36,56,0.72) 100%)',
                          WebkitBackdropFilter: 'blur(8px) saturate(1.05)',
                          backdropFilter: 'blur(8px) saturate(1.05)',
                        }}
                      >
                        {/* 细密磨砂噪点 */}
                        <span
                          aria-hidden
                          className="absolute inset-0 opacity-[0.35] mix-blend-overlay"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                              `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.22 0 0 0 0 0.3 0 0 0 0.6 0'/></filter><rect width='120' height='120' filter='url(#n)'/></svg>`,
                            )}")`,
                            backgroundSize: '90px 90px',
                          }}
                        />
                        <span
                          aria-hidden
                          className="absolute inset-[8px] rounded-full border border-[#5c1f34]/35"
                        />
                        <span
                          aria-hidden
                          className="absolute inset-[15px] rounded-full border border-[#5c1f34]/28"
                        />
                      </span>
                      <span className="relative z-10 flex h-full w-full flex-col items-center justify-center">
                        <span className="text-[15px] font-medium tracking-[0.2em] text-[#2a1018]">
                          封
                        </span>
                        <span className="mt-0.5 text-[9px] tracking-[0.35em] text-[#3a1824]/80">
                          七夕
                        </span>
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('pick')
                    setSelected(null)
                  }}
                  className="mt-8 text-[12px] tracking-widest text-white/40 hover:text-white/70"
                >
                  换一位
                </button>
              </div>
            ) : null}

            {phase === 'writing' ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="relative mb-5 h-14 w-14">
                  {/* 笔尖落点光晕 */}
                  <motion.span
                    aria-hidden
                    className="absolute bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#e8a0b0]/50 blur-[3px]"
                    animate={{ opacity: [0.25, 0.7, 0.25], scale: [0.85, 1.2, 0.85] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                      y: [0, 3, 0, 2, 0],
                      rotate: [-18, -14, -18, -16, -18],
                    }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: '70% 85%' }}
                  >
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 44 44"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      {/* 笔杆 */}
                      <path
                        d="M28.2 6.4c1.1-1.1 2.9-1.1 4 0l5.4 5.4c1.1 1.1 1.1 2.9 0 4L18.8 34.6c-.3.3-.7.5-1.1.6l-7.2 1.8c-.9.2-1.7-.6-1.5-1.5l1.8-7.2c.1-.4.3-.8.6-1.1L28.2 6.4Z"
                        fill="url(#qixiPenBody)"
                        stroke="rgba(252,232,238,0.45)"
                        strokeWidth="0.8"
                      />
                      {/* 金属箍 */}
                      <path
                        d="M24.6 14.8l4.6 4.6"
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      {/* 笔尖 */}
                      <path
                        d="M12.4 31.6l-1.1 4.4 4.4-1.1-3.3-3.3Z"
                        fill="#f0c4ce"
                        stroke="#c44862"
                        strokeWidth="0.6"
                      />
                      {/* 笔尖细线 */}
                      <path
                        d="M12.8 32.2l2.4 2.4"
                        stroke="#6b2038"
                        strokeWidth="0.7"
                        strokeLinecap="round"
                        opacity="0.55"
                      />
                      <defs>
                        <linearGradient
                          id="qixiPenBody"
                          x1="14"
                          y1="34"
                          x2="36"
                          y2="8"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#c44862" />
                          <stop offset="0.45" stopColor="#e8a0b0" />
                          <stop offset="1" stopColor="#fce8ee" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </motion.div>
                  {/* 墨迹短划 */}
                  <motion.span
                    aria-hidden
                    className="absolute bottom-0 left-[22%] h-[1.5px] rounded-full bg-[#e8a0b0]/70"
                    animate={{ width: ['8px', '28px', '14px', '32px', '8px'], opacity: [0.35, 0.8, 0.5, 0.85, 0.35] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-[16px] text-[#fce8ee]">落笔中</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#f0c4ce]/75">{writingHint}</p>
                <p className="mt-4 text-[11px] text-white/35">与私语档案同档写作，通常很快</p>
              </div>
            ) : null}

            {phase === 'error' ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-[15px] text-[#fce8ee]">这封信没能写完</p>
                <p className="mt-2 text-[13px] text-[#f0c4ce]/70">{error}</p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (selected) void startLetterGeneration(selected)
                    }}
                    className="rounded-full bg-[#c44862] px-5 py-2 text-[13px] text-white"
                  >
                    再试一次
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('pick')}
                    className="rounded-full border border-white/20 px-5 py-2 text-[13px] text-white/70"
                  >
                    换角色
                  </button>
                </div>
              </div>
            ) : null}

            {phase === 'letter' && letter ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-2 shrink-0 text-center">
                  <p className="text-[18px] text-[#fce8ee]">{letter.title}</p>
                  <p className="mt-1 text-[11px] text-white/40">约 {letter.charCount} 字</p>
                </div>
                <article className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-[#d4b8c0]/55 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                  <div
                    className="qixi-lined-paper min-h-full px-5 py-5 text-[#2c1c24]"
                    style={{
                      backgroundColor: '#fffaf4',
                      backgroundImage: `
                        linear-gradient(90deg, transparent 0, transparent 28px, rgba(196, 90, 110, 0.28) 28px, rgba(196, 90, 110, 0.28) 29.5px, transparent 29.5px),
                        repeating-linear-gradient(
                          transparent 0,
                          transparent calc(42px - 1px),
                          rgba(120, 150, 190, 0.38) calc(42px - 1px),
                          rgba(120, 150, 190, 0.38) 42px
                        )
                      `,
                      paddingLeft: '40px',
                      paddingTop: '8px',
                      paddingBottom: '24px',
                    }}
                  >
                    {letter.greeting ? (
                      <p className="mb-0 text-[21px] leading-[42px]" style={letterFontStyle}>
                        {letter.greeting}
                      </p>
                    ) : null}
                    {letter.body.split(/\n\n+/).map((para, i) => (
                      <p
                        key={i}
                        className="mb-0 text-[21px] leading-[42px] tracking-wide"
                        style={{
                          textIndent: letter.greeting || i > 0 ? '2em' : undefined,
                          ...letterFontStyle,
                        }}
                      >
                        {para.replace(/\n/g, '')}
                      </p>
                    ))}
                    {letter.closing ? (
                      <p
                        className="mb-0 mt-0 text-[21px] leading-[42px]"
                        style={{ textIndent: '2em', ...letterFontStyle }}
                      >
                        {letter.closing}
                      </p>
                    ) : null}
                    {letter.signature || letter.signedAt ? (
                      <p
                        className="mt-[42px] text-right text-[21px] leading-[42px] text-[#6b4050]"
                        style={letterFontStyle}
                      >
                        {(letter.signature || '')
                          .split('\n')
                          .filter(Boolean)
                          .map((line, i) => (
                            <span key={`s-${i}`} className="block">
                              {line}
                            </span>
                          ))}
                        {letter.signedAt ? (
                          <span className="block">{letter.signedAt}</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </article>
                {saveHint ? (
                  <p className="mt-2 shrink-0 text-center text-[11px] text-[#f0c4ce]/70">{saveHint}</p>
                ) : null}
                <div className="mt-3 flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => {
                      if (!selected) return
                      setSaveHint(null)
                      void startLetterGeneration(selected)
                    }}
                    className="rounded-full border border-[#e8a0b0]/45 bg-white/10 px-5 py-2.5 text-[13px] tracking-widest text-[#fce8ee] disabled:opacity-50"
                  >
                    重写
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleKeepLetter()}
                    className="flex-1 rounded-full bg-[#c44862] py-2.5 text-[13px] tracking-widest text-white"
                  >
                    收好这封信
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {albumPreviewUrl ? (
          <div className="absolute inset-0 z-[30] flex flex-col bg-[#12080e]/96 px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-[max(16px,env(safe-area-inset-top,0px))]">
            <p className="shrink-0 text-center text-[13px] leading-relaxed text-[#fce8ee]">
              长按图片，选择「存储图像 / 保存图片」到系统相册
            </p>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
              <img
                src={albumPreviewUrl}
                alt="七夕信封"
                className="mx-auto w-full max-w-[360px] select-none rounded-xl"
                draggable={false}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (albumPreviewUrl) URL.revokeObjectURL(albumPreviewUrl)
                setAlbumPreviewUrl(null)
                onClose()
              }}
              className="mt-3 shrink-0 rounded-full bg-[#c44862] py-2.5 text-[13px] tracking-widest text-white"
            >
              已保存到相册
            </button>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}
