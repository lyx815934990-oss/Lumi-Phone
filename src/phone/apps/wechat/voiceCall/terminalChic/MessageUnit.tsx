import { motion } from 'framer-motion'

import { VoiceBubble } from './VoiceBubble'
import { TextBubble } from './TextBubble'
import { isVoiceKind, type VoiceLogMessage } from './types'

export function MessageUnit({
  msg,
  autoPlayToken,
  onListened,
  onPlayingChange,
  onSaveAudio,
  onRequestPlay,
}: {
  msg: VoiceLogMessage
  autoPlayToken?: number
  onListened?: (id: string) => void
  onPlayingChange?: (id: string, playing: boolean) => void
  onSaveAudio?: (msg: VoiceLogMessage) => void
  /** 角色条尚未合成时：点播放 → 按需合成 */
  onRequestPlay?: (id: string) => void
}) {
  return (
    <motion.div
      className="w-full"
      style={{ marginBottom: 12 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {isVoiceKind(msg) ? (
        <VoiceBubble
          msg={msg}
          autoPlayToken={autoPlayToken}
          onListened={onListened}
          onPlayingChange={onPlayingChange}
          onSaveAudio={onSaveAudio}
          onRequestPlay={onRequestPlay}
        />
      ) : (
        <TextBubble msg={msg} />
      )}
    </motion.div>
  )
}
