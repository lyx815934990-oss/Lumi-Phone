import type { ReactNode } from 'react'
import { MemoryEngineSoftSwitch } from './MemoryEngineSoftSwitch'
import { DEFAULT_MEMORY_EMBEDDING_MODEL } from './memoryEmbeddingApi'

function EngineCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
      {title ? <h3 className="text-[16px] font-semibold tracking-tight text-gray-900">{title}</h3> : null}
      <div className={title ? 'mt-4 space-y-4' : 'space-y-4'}>{children}</div>
    </div>
  )
}

export function MemoryVectorRecallConfig({
  vectorRecallEnabled,
  onToggleVectorRecall,
}: {
  vectorRecallEnabled: boolean
  onToggleVectorRecall: () => void
}) {
  return (
    <div className="space-y-4">
      <EngineCard title="语义向量召回">
        <div data-memory-coach="vector-recall" className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-gray-900">开启语义召回</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              关掉后只靠关键词等方式找记忆；开着才能按「意思相近」多捞几条。
            </p>
          </div>
          <MemoryEngineSoftSwitch on={vectorRecallEnabled} onToggle={onToggleVectorRecall} />
        </div>

        <div
          data-memory-coach="extra-api"
          className="rounded-2xl border border-gray-100/90 bg-gray-50/70 px-4 py-3.5"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <p className="text-[13px] font-semibold text-gray-900">向量记忆 Key 已内置</p>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
            当前已配好云端向量，模型是{' '}
            <span className="font-medium text-gray-800">{DEFAULT_MEMORY_EMBEDDING_MODEL}</span>
            。你不用再填接口地址或密钥，打开上面开关就能用。
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
            简单说：聊天聊久了，角色不该只记得「刚说过的那几句」。语义召回会看着你们最近在聊啥，从长期记忆里把「意思接近」的旧事捞出来塞给角色——比如你提「上次那家店」，它更容易对上以前记下的约会/吐槽，而不是只会死磕几个关键字。
          </p>
        </div>

        {!vectorRecallEnabled ? (
          <p className="text-[11px] leading-relaxed text-gray-400">
            已关闭：不再按意思找记忆，只保留关键词和「始终注入」那类。
          </p>
        ) : null}
      </EngineCard>
    </div>
  )
}
