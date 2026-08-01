import { MomentImageViewer } from '../../../components/moments/MomentImageViewer'

type Props = {
  open: boolean
  src: string
  onClose: () => void
  /** AI 配图提示词；有值时大图底部显示重新生成 */
  regenPrompt?: string
  regenerating?: boolean
  onRegenerate?: (prompt: string) => void | Promise<void>
  onSavePrompt?: (prompt: string) => void | Promise<void>
}

/** 聊天图片全屏预览（复用朋友圈查看器：缩放、双击放大；AI 图可重新生成） */
export function ChatImageLightbox({
  open,
  src,
  onClose,
  regenPrompt,
  regenerating = false,
  onRegenerate,
  onSavePrompt,
}: Props) {
  if (!src.trim()) return null
  const allowRegen = Boolean(onRegenerate && (regenPrompt?.trim() || onSavePrompt))
  return (
    <MomentImageViewer
      open={open}
      images={[src.trim()]}
      onClose={onClose}
      prompts={regenPrompt?.trim() ? [regenPrompt.trim()] : undefined}
      allowImageRegen={allowRegen}
      regenerating={regenerating}
      onRegenerate={
        onRegenerate
          ? async (_index, prompt) => {
              await onRegenerate(prompt)
            }
          : undefined
      }
      onSavePrompt={
        onSavePrompt
          ? async (_index, prompt) => {
              await onSavePrompt(prompt)
            }
          : undefined
      }
    />
  )
}
