import type { WeChatPersonaContact } from '../../../types'

export function CharacterPickerModal({
  contacts,
  onPick,
  onClose,
}: {
  contacts: WeChatPersonaContact[]
  onPick: (contact: WeChatPersonaContact) => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/35 p-4">
      <div className="bc-card w-full max-w-[400px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f0e4dc] px-4 py-3">
          <p className="text-[15px] font-semibold">选择和谁一起拼</p>
          <button type="button" onClick={onClose} className="text-[13px] text-[#9a8f8a]">
            取消
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {contacts.length ? (
            <ul className="flex flex-col gap-1">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[#fff5f8] active:bg-[#ffeef4]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5ebe4] text-[13px] font-semibold text-[#c9a66b]">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        c.remarkName.slice(0, 1)
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{c.remarkName}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-8 text-center text-[13px] leading-relaxed text-[#9a8f8a]">
              通讯录里还没有角色，先去加好友再来拼豆吧～
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
