import { useCallback, useState } from 'react'
import { accountNumStyle } from '../../userSystem/AccountNum'
import { changeUserUsername } from '../../userSystem/userSystemApi'
import type { UserProfile } from '../../userSystem/types'
import type { userAccountThemeTokens } from '../../userSystem/userAccountTheme'

type ThemeTokens = ReturnType<typeof userAccountThemeTokens>

type Props = {
  t: ThemeTokens
  inputCls: string
  dividerCls: string
  currentUsername: string
  onInfo: (message: string) => void
  onError: (message: string) => void
  onUpdated: (profile: UserProfile) => void
}

const inputStyle = {
  fontFamily: accountNumStyle.fontFamily,
  fontVariantNumeric: accountNumStyle.fontVariantNumeric,
} as const

export function UserAccountChangeUsernamePanel({
  t,
  inputCls,
  dividerCls,
  currentUsername,
  onInfo,
  onError,
  onUpdated,
}: Props) {
  const [open, setOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  const resetForm = useCallback(() => {
    setNewUsername('')
    setCurrentPassword('')
    setLocalError('')
  }, [])

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (prev) resetForm()
      return !prev
    })
    setLocalError('')
  }, [resetForm])

  const handleSubmit = useCallback(async () => {
    setLocalError('')
    onError('')
    const next = newUsername.trim()
    if (!next) {
      setLocalError('请填写新账号名')
      return
    }
    if (next.length < 2 || next.length > 32) {
      setLocalError('账号长度为 2–32 位')
      return
    }
    if (next === currentUsername) {
      setLocalError('新账号名与当前相同')
      return
    }
    if (!currentPassword) {
      setLocalError('请输入当前密码')
      return
    }

    setSubmitting(true)
    try {
      const r = await changeUserUsername({ currentPassword, newUsername: next })
      if (!r.ok) {
        setLocalError(r.error)
        return
      }
      onUpdated(r.profile)
      resetForm()
      setOpen(false)
      onInfo(r.message)
    } finally {
      setSubmitting(false)
    }
  }, [currentPassword, currentUsername, newUsername, onError, onInfo, onUpdated, resetForm])

  return (
    <div className={`rounded-[16px] border p-4 ${t.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium">修改账号名</p>
          <p className={`mt-1 text-[12px] leading-5 ${t.muted}`}>需验证当前密码。修改后请用新账号名登录。</p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-[10px] border px-3 py-1.5 text-[12px] ${t.secondaryBtn}`}
          onClick={handleToggle}
        >
          {open ? '取消' : '修改'}
        </button>
      </div>

      {open ? (
        <div className={`mt-4 space-y-3 border-t pt-4 ${dividerCls}`}>
          {localError ? (
            <div className={`rounded-[10px] border px-3 py-2 text-[13px] ${t.errorBox}`}>{localError}</div>
          ) : null}
          <label className="block">
            <span className={`mb-1 block text-[12px] ${t.label}`}>新账号名</span>
            <input
              type="text"
              className={inputCls}
              style={inputStyle}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="username"
              placeholder={currentUsername || '2–32 位'}
            />
          </label>
          <label className="block">
            <span className={`mb-1 block text-[12px] ${t.label}`}>当前密码</span>
            <input
              type="password"
              className={inputCls}
              style={inputStyle}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button
            type="button"
            className={`h-11 w-full rounded-[12px] text-[14px] font-medium disabled:opacity-50 ${t.primaryBtn}`}
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中…' : '确认修改'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
