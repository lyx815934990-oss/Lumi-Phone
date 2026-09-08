import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  ariaLabel?: string
  active?: boolean
}

/** 标题栏统一胶囊按钮：需 forwardRef，供菜单 Trigger 使用 */
export const StoryHeaderIconButton = forwardRef<HTMLButtonElement, Props>(
  function StoryHeaderIconButton(
    { children, onClick, title, ariaLabel, active = false, className = '', type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2.5 font-[family-name:var(--sr-font-serif)] text-[12px] tracking-wide transition-all duration-200 ${
          active
            ? 'border-[var(--sr-gold)]/50 bg-[var(--sr-gold)]/15 text-[var(--sr-gold)] shadow-[0_0_12px_var(--sr-gold-glow)]'
            : 'border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text-muted)] hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]'
        } ${className}`}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
