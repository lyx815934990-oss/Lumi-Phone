/**
 * 互动模式气泡渲染（普通页 / 互动页共用，避免两种样式串台）
 */

import type { InteractiveBubble } from './datingInteractiveTypes'

function TypeCursor() {
  return (
    <span
      className="ml-0.5 inline-block h-[0.9em] w-[1.5px] animate-pulse align-[-0.08em]"
      style={{ background: 'var(--sr-gold)' }}
      aria-hidden
    />
  )
}

/**
 * 动描→居中旁白（无气泡）/
 * 内心→斜体无框 /
 * 对白→聊天气泡
 */
export function InteractiveBubbleBody({
  bubble,
  side,
  text,
  showCursor,
}: {
  bubble: InteractiveBubble
  side: 'user' | 'char'
  text: string
  showCursor?: boolean
}) {
  const cursor = showCursor ? <TypeCursor /> : null
  const size = 'var(--dating-font-size, 15px)'

  if (bubble.kind === 'action') {
    return (
      <p
        className="mx-auto w-full max-w-lg px-2 text-center leading-[1.85] tracking-[0.02em]"
        style={{
          color: 'var(--sr-text)',
          fontFamily: 'var(--dating-font-narrative, var(--sr-font-serif))',
          fontSize: size,
          fontStyle: 'normal',
          fontWeight: 400,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          borderRadius: 0,
          padding: 0,
          margin: '0 auto',
        }}
      >
        {text}
        {cursor}
      </p>
    )
  }

  if (bubble.kind === 'thought') {
    const isUser = side === 'user'
    return (
      <p
        className={`w-full max-w-[90%] leading-[1.7] ${isUser ? 'ml-auto text-right' : 'mr-auto text-left'}`}
        style={{
          color: 'var(--plot-inner-os-fg, var(--sr-gold-dim))',
          fontFamily: isUser
            ? 'var(--dating-font-inner-os, var(--dating-font-narrative, var(--sr-font-serif)))'
            : 'var(--dating-font-dialogue, var(--dating-font-narrative, var(--sr-font-serif)))',
          fontSize: `calc(${size} * 0.92)`,
          fontStyle: 'italic',
          fontWeight: 300,
          letterSpacing: '0.03em',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        <span
          className="mb-0.5 block text-[10px] not-italic tracking-[0.18em]"
          style={{
            color: 'var(--sr-text-faint)',
            fontFamily: 'var(--sr-font-ui)',
            fontWeight: 400,
          }}
        >
          内心
        </span>
        （{text}）{cursor}
      </p>
    )
  }

  const isUser = side === 'user'
  // 单层气泡：避免 w-fit + 子级 max-w-full 循环收缩导致「四个字就换行」
  return (
    <div
      className="w-max max-w-full whitespace-pre-wrap px-3.5 py-2.5"
      style={{
        fontFamily: isUser
          ? 'var(--dating-font-inner-os, var(--dating-font-narrative, var(--sr-font-serif)))'
          : 'var(--dating-font-dialogue, var(--dating-font-narrative, var(--sr-font-serif)))',
        fontSize: size,
        lineHeight: 1.65,
        color: isUser ? 'var(--sr-text)' : 'var(--plot-dialogue-fg, var(--sr-text-muted))',
        background: isUser ? 'var(--sr-gold-glow)' : 'var(--sr-panel)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        boxShadow: '0 1px 0 rgba(255,255,255,0.45) inset',
        border: '1px solid var(--sr-border)',
        borderLeft: isUser ? '1px solid var(--sr-border)' : '2.5px solid var(--sr-gold)',
        borderRight: isUser ? '2.5px solid var(--sr-gold)' : '1px solid var(--sr-border)',
        overflowWrap: 'break-word',
        wordBreak: 'normal',
      }}
    >
      <span style={{ fontStyle: 'italic', fontWeight: 400 }}>
        {text}
        {cursor}
      </span>
    </div>
  )
}

export function InteractiveBubbleStack({
  bubbles,
  side,
  characterName,
  characterAvatarUrl,
}: {
  bubbles: InteractiveBubble[]
  side: 'user' | 'char'
  characterName?: string
  characterAvatarUrl?: string
}) {
  if (!bubbles.length) return null
  const charName = characterName?.trim() || '角色'
  const avatar = characterAvatarUrl?.trim() || ''

  return (
    <div className="space-y-2.5">
      {side === 'char' ? (
        <div className="mb-1 flex items-center gap-2">
          {avatar ? (
            <img src={avatar} alt="" className="size-6 rounded-full object-cover opacity-90" />
          ) : (
            <span
              className="flex size-6 items-center justify-center rounded-full text-[10px]"
              style={{ background: 'var(--sr-panel)', color: 'var(--sr-gold)' }}
            >
              {charName.slice(0, 1)}
            </span>
          )}
          <span className="min-w-0 flex-1 text-[11px]" style={{ color: 'var(--sr-text-muted)' }}>
            {charName}
          </span>
        </div>
      ) : (
        <div className="mb-1 flex items-center justify-end gap-2">
          <p className="text-[11px]" style={{ color: 'var(--sr-text-muted)' }}>
            你
          </p>
        </div>
      )}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className={`flex w-full ${
            b.kind === 'action' ? 'justify-center' : side === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div className={b.kind === 'action' ? 'w-full max-w-lg' : 'max-w-[86%]'}>
            <InteractiveBubbleBody bubble={b} side={side} text={b.text} />
          </div>
        </div>
      ))}
    </div>
  )
}
