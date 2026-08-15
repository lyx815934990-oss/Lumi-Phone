import { useMemo } from 'react'
import { ChevronRight, Mail, Phone, Video, Info } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import {
  GeometricAvatar,
  formatDuration,
  directionLabel,
  mediaLabel,
  displayCallTitle,
  formatCallWhen,
  inferCallListAnchor,
} from '../components/GeometricAvatar'
import { sortCallsNewestFirst } from '../phoneMarkup'
import type { CallRecord, PhoneContact } from '../types'

export function ContactDetailScreen({
  contact,
  calls,
  onOpenCall,
}: {
  contact: PhoneContact
  calls: CallRecord[]
  onOpenCall: (call: CallRecord) => void
}) {
  const history = useMemo(
    () =>
      sortCallsNewestFirst(
        calls.filter(
          (c) =>
            c.contactId === contact.id ||
            (c.phoneNumber &&
              contact.phoneNumber &&
              c.phoneNumber.replace(/\D/g, '') === contact.phoneNumber.replace(/\D/g, '')),
        ),
      ),
    [calls, contact],
  )

  const listAnchor = useMemo(() => inferCallListAnchor(history.length ? history : calls), [history, calls])

  const title = displayCallTitle(contact.remarkName, contact.displayName)
  const callerId =
    contact.displayName?.trim() && contact.displayName.trim() !== contact.remarkName.trim()
      ? contact.displayName.trim()
      : ''

  return (
    <div className="phone-scroll h-full overflow-y-auto pb-28">
      <div className="flex flex-col items-center px-6 pb-5 pt-4">
        <GeometricAvatar contact={contact} size={88} blocked={contact.isBlocked} />
        <div className="mt-4 text-center text-[24px] font-bold tracking-tight text-[var(--ph-ink)]">{title}</div>
        {callerId ? (
          <div className="mt-1 text-center text-[13px] text-[var(--ph-mist)]">来电显示 {callerId}</div>
        ) : null}
        <div className="mt-1 font-mono text-[14px] text-[var(--ph-mist)]">{contact.phoneNumber}</div>
        {contact.note ? (
          <p className="mt-3 max-w-[280px] text-center text-[13px] italic leading-relaxed text-[var(--ph-mist)]">
            {contact.note}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {contact.isEmergency ? (
            <span className="rounded-full bg-[rgba(217,83,79,0.12)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ph-danger)]">
              紧急
            </span>
          ) : null}
          {contact.isFavorite ? (
            <span className="rounded-full bg-[rgba(212,175,55,0.16)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ph-gold)]">
              收藏
            </span>
          ) : null}
          {contact.isBlocked ? (
            <span className="rounded-full bg-[rgba(217,83,79,0.1)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ph-danger)]">
              已拉黑
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex w-full max-w-[300px] justify-between px-2">
          {[
            { Icon: Info, label: '信息' },
            { Icon: Phone, label: '呼叫' },
            { Icon: Video, label: '视频' },
            { Icon: Mail, label: '邮件' },
          ].map(({ Icon, label }) => (
            <div key={label} className="phone-action-disabled flex flex-col items-center gap-1.5">
              <div className="phone-action-btn">
                <Icon size={20} strokeWidth={1.7} />
              </div>
              <span className="text-[11px] text-[var(--ph-mist)]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="mb-2 text-[13px] font-semibold text-[var(--ph-mist)]">通话历史</div>
        <div className="phone-card overflow-hidden">
          {history.map((call, idx) => (
            <div key={call.id}>
              {idx > 0 ? <div className="ml-4 h-px bg-[var(--ph-line)]" /> : null}
              <Pressable
                type="button"
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                onClick={() => onOpenCall(call)}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[14px] font-medium"
                    style={{ color: call.direction === 'missed' ? 'var(--ph-danger)' : 'var(--ph-ink)' }}
                  >
                    {mediaLabel(call.media)} · {directionLabel(call.direction)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--ph-mist)]">
                    {formatCallWhen(call, { anchor: listAnchor })} · {call.direction === 'missed' ? '未接通' : formatDuration(call.durationSec)}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--ph-mist)]" />
              </Pressable>
            </div>
          ))}
          {!history.length ? (
            <div className="px-4 py-10 text-center text-[13px] text-[var(--ph-mist)]">暂无与该联系人的通话</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
