import { motion } from 'framer-motion'

import { VoiceBubble } from './VoiceBubble'
import { TextBubble } from './TextBubble'
import { isVoiceKind, type VoiceLogMessage } from './types'

export function MessageUnit({
  msg,
  autoPlayToken,
  onListened,
}: {
  msg: VoiceLogMessage
  autoPlayToken?: number
  onListened?: (id: string) => void
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
        <VoiceBubble msg={msg} autoPlayToken={autoPlayToken} onListened={onListened} />
      ) : (
        <TextBubble msg={msg} />
      )}
    </motion.div>
  )
}
