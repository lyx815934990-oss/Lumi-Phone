import { cotTheme } from '../cotTheme'

export function CotCapsuleSwitch({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 transition-opacity disabled:opacity-40"
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        background: checked ? cotTheme.gold : '#D5CDBF',
      }}
    >
      <span
        className="absolute top-[2px] rounded-full bg-white shadow-sm transition-transform"
        style={{
          width: 18,
          height: 18,
          left: 2,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}
