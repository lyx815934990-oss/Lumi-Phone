import { motion } from 'framer-motion'
import type { StoryNode } from '../../types'
import { GlassPanel } from '../ui/GlassPanel'
import { renderStoryPlotContent } from '../../utils/storyPlotRichText'

type Props = {
  avatarUrl?: string
  characterName: string
  latestAiNode?: StoryNode
}

/** VN 模式：全屏立绘 + 底部对话框 */
export function VNModeLayout({ avatarUrl, characterName, latestAiNode }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f13]/20 via-transparent to-[#0f0f13]/90" />
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={characterName}
          className="absolute inset-x-0 bottom-[22%] mx-auto max-h-[68vh] max-w-[92vw] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
        />
      ) : (
        <div className="absolute inset-x-8 bottom-[28%] flex h-[50vh] items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-white/25">
          角色立绘
        </div>
      )}
      {latestAiNode ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="pointer-events-auto absolute inset-x-3 bottom-[calc(var(--sr-console-min-h)+12px)] z-10"
        >
          <GlassPanel className="border-[var(--sr-gold)]/20 p-4">
            <p className="mb-1 text-[11px] font-medium tracking-widest text-[var(--sr-gold)] uppercase">
              {characterName}
            </p>
            <div className="sr-prose">{renderStoryPlotContent(latestAiNode.content)}</div>
          </GlassPanel>
        </motion.div>
      ) : null}
    </div>
  )
}
