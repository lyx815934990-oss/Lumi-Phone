import { ChevronLeft } from 'lucide-react'

import { formatCoupleBoundDateLabel, type CoupleSpaceBinding } from './coupleSpaceTypes'
import './coupleSpaceTheme.css'

export function CoupleContractPage({
  binding,
  onBack,
}: {
  binding: CoupleSpaceBinding
  onBack: () => void
}) {
  return (
    <div className="couple-space-root">
      <header className="couple-space-header">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5"
          aria-label="返回"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="couple-space-title text-[16px]">情侣契约书</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <div className="couple-space-paper couple-space-lace-frame mt-2 rounded-2xl px-5 py-6">
          <p className="couple-space-title text-center text-[18px]">第一页记忆</p>
          <div className="couple-space-gold-line my-3" />
          <p className="text-center text-[11px] tracking-[0.12em] text-[color:var(--cs-ink-muted)]">
            {formatCoupleBoundDateLabel(binding.boundAt)}
          </p>
          <p className="couple-space-title mt-5 text-center text-[16px]">
            {binding.userDisplayName}
            <span className="mx-2 text-[color:var(--cs-gold)]">♡</span>
            {binding.charDisplayName}
          </p>
          {binding.acceptedReplyText.trim() ? (
            <blockquote className="mt-5 rounded-xl bg-white/55 px-3 py-3 text-[13px] leading-relaxed text-[color:var(--cs-ink-muted)]">
              「{binding.acceptedReplyText.trim()}」
            </blockquote>
          ) : null}
          {binding.relationshipStageAtBind ? (
            <p className="mt-4 text-center text-[10px] text-[color:var(--cs-ink-muted)]">
              当时关系阶段：{binding.relationshipStageAtBind}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
