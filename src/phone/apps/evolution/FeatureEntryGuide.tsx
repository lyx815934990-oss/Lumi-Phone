import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Pressable } from '../../components/Pressable'
import { EvolutionFeatureEntryCoach } from './EvolutionFeatureEntryCoach'
import { getEvolutionEntryGuide } from './evolutionFeatureEntryGuides'

type FeatureEntryGuideProps = {
  entryGuideId?: string
  /** compact：推送弹窗；card：演进录详情模块卡 */
  variant?: 'compact' | 'card'
  className?: string
}

/**
 * 新增功能入口：启动聚光灯高亮教程（非路径文案展示）。
 */
export function FeatureEntryGuide({
  entryGuideId,
  variant = 'card',
  className = '',
}: FeatureEntryGuideProps) {
  const guide = getEvolutionEntryGuide(entryGuideId)
  const [open, setOpen] = useState(false)

  if (!guide) return variant === 'card' ? <div className="mb-4" /> : null

  if (variant === 'compact') {
    return (
      <>
        <Pressable
          type="button"
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#1C1C1E]/[0.08] bg-[#F4F4F5] px-3 py-2.5 text-[13px] font-medium text-[#1C1C1E] transition active:scale-[0.99] ${className}`}
        >
          <Sparkles className="size-3.5 shrink-0 text-[#1C1C1E]/55" strokeWidth={1.75} aria-hidden />
          高亮指引 · 带我找开关
        </Pressable>
        <EvolutionFeatureEntryCoach open={open} guide={guide} onClose={() => setOpen(false)} />
      </>
    )
  }

  return (
    <>
      <div className={`mt-3 mb-5 ${className}`}>
        <Pressable
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-[#1C1C1E]/[0.08] bg-gradient-to-br from-[#F4F4F5] via-white to-[#EEF0F3] px-3.5 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-white">
            <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1C1C1E]/45">
              入口高亮指引
            </span>
            <span className="mt-0.5 block text-[13px] font-medium text-[#1C1C1E]">
              像教程一样，逐步高亮开关位置
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[#1C1C1E] px-3 py-1.5 text-[12px] font-semibold text-white">
            开始
          </span>
        </Pressable>
      </div>
      <EvolutionFeatureEntryCoach open={open} guide={guide} onClose={() => setOpen(false)} />
    </>
  )
}
