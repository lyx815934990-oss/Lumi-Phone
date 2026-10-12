import { apiTheme } from '../theme'

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  right,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'password'
  right?: React.ReactNode
}) {
  return (
    <label className="block">
      {label.trim() ? (
        <p className="text-[12px] font-medium" style={{ color: apiTheme.subText }}>
          {label}
        </p>
      ) : null}
      <div className={label.trim() ? 'relative mt-1.5' : 'relative'}>
        <input
          value={value}
          type={type}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl bg-white py-2.5 text-[15px] outline-none transition-all duration-200 ease-out ${
            right ? 'pl-3.5 pr-11' : 'px-3.5'
          }`}
          style={{
            border: `1px solid ${apiTheme.border}`,
            color: apiTheme.text,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = apiTheme.accent
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = apiTheme.border
          }}
        />
        {right ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>
        ) : null}
      </div>
    </label>
  )
}

