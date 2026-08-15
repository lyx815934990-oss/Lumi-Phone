import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Pressable } from '../../../components/Pressable'
import { listCurtainPresets } from './store'
import type { CurtainQuest } from './types'
import { qimuInk } from './theme'

type Props = {
  onBack: () => void
  onSelect: (quest: CurtainQuest) => void
}

export function CurtainLobby({ onBack, onSelect }: Props) {
  const presets = listCurtainPresets()

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: qimuInk.page }}>
      <header
        className="relative flex min-h-[52px] shrink-0 items-center justify-center px-12 pb-2"
        style={{
          borderBottom: `1px solid ${qimuInk.line}`,
          background: qimuInk.surface,
          paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
        }}
      >
        <Pressable
          type="button"
          onClick={onBack}
          className="absolute left-3 flex size-9 items-center justify-center rounded-full active:opacity-70"
          style={{ color: qimuInk.title }}
          aria-label="返回发现"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={1.75} />
        </Pressable>
        <div className="text-center">
          <p
            className="text-[17px] font-semibold tracking-tight"
            style={{ color: qimuInk.title, fontFamily: qimuInk.display }}
          >
            绮幕
          </p>
          <p className="text-[11px] tracking-wide" style={{ color: qimuInk.mute }}>
            同台入戏 · 幕间可咬耳
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5">
        <p className="mb-3 text-[12px] tracking-wide" style={{ color: qimuInk.mute }}>
          选择一枚坐标笺
        </p>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {presets.map((quest, index) => (
            <motion.button
              key={quest.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(quest)}
              className="relative aspect-[3/4] w-[min(72vw,220px)] shrink-0 overflow-hidden rounded-[18px] border text-left active:scale-[0.98]"
              style={{
                borderColor: qimuInk.line,
                background: qimuInk.card,
                boxShadow: '0 8px 28px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, #bbb 0%, transparent 45%), radial-gradient(circle at 80% 70%, #999 0%, transparent 40%)',
                  filter: 'grayscale(1) blur(1px)',
                }}
                aria-hidden
              />
              <div className="relative flex h-full flex-col justify-between p-4">
                <p
                  className="text-[10px] font-medium leading-relaxed tracking-[0.08em]"
                  style={{ color: qimuInk.mute, fontFamily: qimuInk.mono }}
                >
                  {quest.fileCode}
                </p>
                <div>
                  <p
                    className="text-[15px] font-semibold leading-snug"
                    style={{ color: qimuInk.title, fontFamily: qimuInk.display }}
                  >
                    {quest.theme}
                  </p>
                  <p className="mt-2 text-[12px] leading-[1.55]" style={{ color: qimuInk.body }}>
                    幕令 · {quest.mainGoal}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: qimuInk.mute }}>
                    {quest.timeLimit >= 40
                      ? `约 ${quest.timeLimit} 日 · `
                      : `约 ${quest.timeLimit} 轮 · `}
                    {quest.cast && quest.cast.length >= 3
                      ? `${quest.cast.length} 席可选 · 未选化为 NPC`
                      : `${quest.roles.userRole} · ${quest.roles.charRole}`}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
