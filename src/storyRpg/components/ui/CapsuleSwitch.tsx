type Props = {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}

/**
 * 主题胶囊开关 · 实色底板，避免玻璃透底发黑。
 * 注意：勿用 <label> 包住 <button>，否则点开关会「原生激活 + onClick」各触发一次，开关等于没动。
 */
export function CapsuleSwitch({ checked, onCheckedChange, label, disabled }: Props) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5 ${
        disabled ? 'cursor-not-allowed opacity-55' : ''
      }`}
    >
      {label ? (
        <span className={`text-[13px] ${disabled ? 'text-[var(--sr-text-muted)]' : 'text-[var(--sr-text)]'}`}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || undefined}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          onCheckedChange(!checked)
        }}
        className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-300 ${
          checked ? 'bg-[var(--sr-gold)]' : 'bg-[var(--sr-border)]'
        } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block size-[20px] rounded-full bg-[var(--sr-gold-on,#0f0f13)] shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            checked ? 'translate-x-[21px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
