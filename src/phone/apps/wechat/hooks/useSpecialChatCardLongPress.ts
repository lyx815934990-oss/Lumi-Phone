import { useCallback, useRef } from 'react'

import { useLongPress } from './useWeChatLongPress'

/** 特殊消息卡：长按打开操作面板（多选 / 删除 / 撤回等） */
export function useSpecialChatCardLongPress(
  onLongPress?: (anchorRect: DOMRect) => void,
  selected = false,
) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const handleLongPress = useCallback(() => {
    if (!onLongPress) return
    const el = anchorRef.current
    if (!el) return
    onLongPress(el.getBoundingClientRect())
  }, [onLongPress])

  const { bind, pressing } = useLongPress({
    enabled: !!onLongPress,
    ms: 500,
    moveThresholdPx: 10,
    onLongPress: () => handleLongPress(),
  })

  const pressStyle = {
    transform: pressing && !selected ? 'scale(0.98)' : 'scale(1)',
    opacity: pressing && !selected ? 0.92 : 1,
  } as const

  return { anchorRef, bind, pressStyle }
}
