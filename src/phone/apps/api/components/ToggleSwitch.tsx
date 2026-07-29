import { apiTheme } from '../theme'

/** 关浅灰、开主题色；白圆钮用 left 定位，避免 translateX 错位 */
export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-8 w-[52px] shrink-0 self-center rounded-full transition-colors duration-200 ease-out"
      style={{ background: checked ? apiTheme.accent : '#cccccc' }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out"
        style={{ left: checked ? 26 : 4 }}
        aria-hidden
      />
    </button>
  )
}
