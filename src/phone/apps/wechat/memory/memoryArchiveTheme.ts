/** 记忆档案馆 · 柔和极简视觉令牌 */
export const ARCHIVE_BG = '#F4F4F5'
export const ARCHIVE_INK = '#111111'
export const ARCHIVE_MUTED = '#8A8A8E'
/** 记忆馆正文衬线：显式宋体/Noto Serif 优先，避免用户把 --phone-font 设成无衬线时摘要仍变 sans */
export const ARCHIVE_SERIF =
  '"Noto Serif SC", "Songti SC", "STSong", "SimSun", var(--phone-font), Georgia, serif'
export const ARCHIVE_CARD_SHADOW = '0 1px 0 rgba(16,16,18,0.04), 0 8px 28px rgba(16,16,18,0.04)'

/** 档案馆正文/摘要块（与 {@link ARCHIVE_SERIF} 一致） */
export const archiveSerifTextStyle = { fontFamily: ARCHIVE_SERIF } as const

/** 记忆馆摘要/云卡正文容器 class（见 index.css `.memory-archive-serif-text`） */
export const MEMORY_ARCHIVE_SERIF_CLASS = 'memory-archive-serif-text'

/** 尾声延展 / 线下摘要等子页：柔和黑白 UI 片段 */
export const ARCHIVE_SOFT_CARD =
  'rounded-[18px] border border-black/[0.05] bg-white shadow-[0_8px_28px_rgba(16,16,18,0.04)]'
export const ARCHIVE_SOFT_CARD_OPEN =
  'open:shadow-[0_10px_36px_rgba(16,16,18,0.06)]'
export const ARCHIVE_SOFT_SECTION =
  'rounded-[20px] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_8px_28px_rgba(16,16,18,0.04)]'
export const ARCHIVE_SOFT_CHIP =
  'rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#5C5C60]'
export const ARCHIVE_SOFT_BTN_PRIMARY =
  'rounded-full bg-[#111] px-4 py-1.5 text-[12px] font-semibold text-white active:opacity-90 disabled:opacity-50'
export const ARCHIVE_SOFT_BTN_SECONDARY =
  'rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-medium text-[#333] active:bg-black/[0.03] disabled:opacity-50'
export const ARCHIVE_SOFT_TEXTAREA =
  'w-full resize-y rounded-2xl border border-black/[0.08] bg-[#FAFAFA] px-3 py-2.5 text-[13px] leading-relaxed text-[#111] outline-none focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/[0.04] disabled:opacity-60'
export const ARCHIVE_SOFT_BODY_PANEL =
  'rounded-2xl bg-black/[0.03] px-3.5 py-3.5 text-[13px] leading-[1.75] text-[#2A2A2A] ring-1 ring-black/[0.04]'
export const ARCHIVE_MONO_SCENE_CHIP =
  'rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#5C5C60] ring-1 ring-black/[0.04]'

/** 展陈杂志风 · 封面卡（保留常量供详情等复用） */
export const ARCHIVE_COVER_SHADOW = '0 12px 36px rgba(16,16,18,0.08), 0 2px 8px rgba(16,16,18,0.04)'
export const ARCHIVE_COVER_RADIUS = 20
/** 封面底部叠字渐变（深→透） */
export const ARCHIVE_COVER_SCRIM =
  'linear-gradient(180deg, rgba(16,16,18,0) 0%, rgba(16,16,18,0.18) 38%, rgba(16,16,18,0.78) 100%)'
/** 无头像时的中性底 */
export const ARCHIVE_COVER_FALLBACK_BG =
  'linear-gradient(155deg, #2A2A2E 0%, #1A1A1C 48%, #111114 100%)'
export const ARCHIVE_MAG_EN =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
export const ARCHIVE_MAG_TITLE =
  'text-[26px] font-semibold tracking-[-0.03em] text-[#111]'
export const ARCHIVE_MAG_KICKER =
  'text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A8A8E]'
export const ARCHIVE_MAG_STAT =
  'text-[11px] font-medium tabular-nums tracking-wide text-[#8A8A8E]'
export const ARCHIVE_COVER_CARD =
  'relative w-full overflow-hidden rounded-[20px] text-left active:opacity-[0.96]'
export const ARCHIVE_COVER_META_CHIP =
  'rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-[2px]'

/** 角色列表行卡 */
export const ARCHIVE_ROSTER_ROW =
  'flex w-full items-center gap-3.5 rounded-[18px] border border-black/[0.05] bg-white px-3.5 py-3 text-left shadow-[0_8px_28px_rgba(16,16,18,0.035)] active:bg-[#FAFAFA]'
