import { useMemo } from 'react'

import { Pressable } from '../../../components/Pressable'
import {
  buildWechatClassicStickerGroups,
  buildWechatClassicStickerItems,
  wechatClassicEmojiToken,
} from './wechatClassicStickerPack'

type Props = {
  onInsert: (token: string) => void
  /**
   * 可视高度：
   * - default：聊天表情面板
   * - tall：状态/想法编辑（展示完整分类，更好滚动）
   */
  size?: 'default' | 'tall'
  /**
   * - grouped：按分类列出全套
   * - flat：全套扁平网格（快捷选表情）
   */
  layout?: 'grouped' | 'flat'
  /** 当前已选 token，如 `[微笑]`，用于高亮 */
  selectedToken?: string
}

/** 微信经典黄脸完整目录（按分类或扁平列出全部） */
export function WeChatClassicEmojiPickerPanel({
  onInsert,
  size = 'default',
  layout = 'grouped',
  selectedToken,
}: Props) {
  const groups = useMemo(() => buildWechatClassicStickerGroups(), [])
  const flatItems = useMemo(() => buildWechatClassicStickerItems(), [])
  const total = useMemo(
    () => (layout === 'flat' ? flatItems.length : groups.reduce((n, g) => n + g.items.length, 0)),
    [flatItems.length, groups, layout],
  )

  if (total === 0) {
    return (
      <div className="rounded-[12px] border border-[#eee] bg-white px-3 py-3 text-center text-[12px] text-gray-500">
        经典表情加载失败
      </div>
    )
  }

  const maxH = size === 'tall' ? 'max-h-[min(56vh,420px)]' : 'max-h-[min(42vh,288px)]'
  const selected = String(selectedToken ?? '').trim()

  return (
    <div
      className={`${maxH} overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]`}
      role="list"
      aria-label={`微信经典表情（共 ${total} 个）`}
    >
      <p className="mb-1 px-1 text-[11px] text-[#aeaeb2]">全部经典表情 · {total}</p>
      {layout === 'flat' ? (
        <div className="grid grid-cols-8 gap-1 pb-1">
          {flatItems.map((item) => {
            const token = wechatClassicEmojiToken(item.description)
            const on = selected === token
            return (
              <Pressable
                key={item.id}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onInsert(token)}
                className="flex h-9 w-full items-center justify-center rounded-[6px] active:bg-[#f0f0f0]"
                style={on ? { outline: '1.5px solid #1c1c1e' } : undefined}
                role="listitem"
                title={item.description}
              >
                <img
                  src={item.url}
                  alt={item.description}
                  className="h-[26px] w-[26px] object-contain"
                  draggable={false}
                />
              </Pressable>
            )
          })}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.categoryId} className="mb-2">
            <p className="sticky top-0 z-[1] bg-white/95 px-1 py-1 text-[11px] font-medium text-[#8e8e93] backdrop-blur-[6px]">
              {group.label}
              <span className="ml-1 font-normal text-[#c7c7cc]">{group.items.length}</span>
            </p>
            <div className="grid grid-cols-8 gap-1 pb-1">
              {group.items.map((item) => {
                const token = wechatClassicEmojiToken(item.description)
                const on = selected === token
                return (
                  <Pressable
                    key={item.id}
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => onInsert(token)}
                    className="flex h-9 w-full items-center justify-center rounded-[6px] active:bg-[#f0f0f0]"
                    style={on ? { outline: '1.5px solid #1c1c1e' } : undefined}
                    role="listitem"
                    title={item.description}
                  >
                    <img
                      src={item.url}
                      alt={item.description}
                      className="h-[26px] w-[26px] object-contain"
                      draggable={false}
                    />
                  </Pressable>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
