import { motion } from 'framer-motion'
import { Pressable } from '../../../../../components/Pressable'
import { WebPageThumb } from '../components/WebPageThumb'
import type { BrowserTab } from '../types'

/** 只读标签页切换：内容来自生成数据，用户不可新建/关闭 */
export function TabsManager({
  tabs,
  activeTabId,
  onSelect,
  onDone,
}: {
  tabs: BrowserTab[]
  activeTabId: string
  onSelect: (id: string) => void
  onDone: () => void
}) {
  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col backdrop-blur-md"
      style={{ background: 'color-mix(in srgb, var(--br-paper) 92%, transparent)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <div>
          <div className="text-[15px] text-[var(--br-ink)]">{tabs.length} 个标签页</div>
          <div className="mt-0.5 text-[11px] text-[var(--br-mist)]">来自角色浏览器 · 仅可查看</div>
        </div>
        <Pressable type="button" className="text-[14px] text-[var(--br-ink)]" onClick={onDone}>
          完成
        </Pressable>
      </div>

      <div className="browser-scroll flex-1 overflow-y-auto px-4 pb-10">
        <div className="grid grid-cols-2 gap-3">
          {tabs.map((tab, i) => (
            <motion.div key={tab.id} className="relative" style={{ marginTop: i % 2 === 1 ? 10 : 0 }} layout>
              <Pressable
                type="button"
                className="w-full overflow-hidden rounded-[var(--br-radius-card)] border border-[var(--br-hairline)] bg-[var(--br-card)] text-left"
                style={{
                  outline: tab.id === activeTabId ? '1.5px solid var(--br-fog)' : undefined,
                  outlineOffset: 0,
                }}
                onClick={() => onSelect(tab.id)}
              >
                <WebPageThumb className="aspect-[4/3] w-full rounded-none border-0" title={tab.title} seed={tab.id} />
                <div className="flex items-center gap-1.5 px-2.5 py-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-[var(--br-hairline)] text-[8px]">
                    {(tab.title || '页').slice(0, 1)}
                  </span>
                  <span className="truncate text-[12px] text-[var(--br-ink)]">{tab.title || '标签页'}</span>
                </div>
              </Pressable>
            </motion.div>
          ))}
        </div>
        {!tabs.length ? (
          <div className="pt-16 text-center text-[13px] text-[var(--br-mist)]">暂无打开的标签</div>
        ) : null}
      </div>
    </motion.div>
  )
}
