import { AnimatePresence, motion } from 'framer-motion'
import { CircleHelp, MessageCircleHeart, MessagesSquare, ShieldCheck, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pressable } from '../../../components/Pressable'

/** 柔和黑白说明面板配色 */
const ink = {
  page: '#f4f4f4',
  surface: '#fafafa',
  card: '#ffffff',
  line: 'rgba(0,0,0,0.06)',
  title: '#1a1a1a',
  body: '#5c5c5c',
  mute: '#9a9a9a',
  iconBg: '#efefef',
  iconFg: '#6a6a6a',
  pathBg: '#f3f3f3',
  btn: '#2a2a2a',
  btnText: '#f7f7f7',
  scrim: 'rgba(0,0,0,0.38)',
} as const

function HelpSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section
      className="rounded-[18px] px-4 py-3.5"
      style={{
        background: ink.card,
        boxShadow: '0 1px 10px rgba(0,0,0,0.03)',
        border: `1px solid ${ink.line}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: ink.iconBg, color: ink.iconFg }}
        >
          {icon}
        </span>
        <p className="text-[14px] font-semibold tracking-tight" style={{ color: ink.title }}>
          {title}
        </p>
      </div>
      <div className="mt-2.5 space-y-2 pl-[2px] text-[13px] leading-[1.7]" style={{ color: ink.body }}>
        {children}
      </div>
    </section>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <span
        className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: '#c4c4c4' }}
        aria-hidden
      />
      <p className="min-w-0 flex-1">{children}</p>
    </div>
  )
}

function PathCard({
  index,
  title,
  desc,
}: {
  index: string
  title: string
  desc: string
}) {
  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: ink.pathBg }}>
      <div className="flex items-center gap-2">
        <span
          className="flex size-5 items-center justify-center rounded-full text-[11px] font-semibold"
          style={{ background: '#e4e4e4', color: ink.title }}
        >
          {index}
        </span>
        <p className="text-[13px] font-semibold" style={{ color: ink.title }}>
          {title}
        </p>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-[1.65]" style={{ color: ink.body }}>
        {desc}
      </p>
    </div>
  )
}

export function LinkedChatModeHelpButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[#b0b0b0] transition-colors hover:bg-black/[0.04] hover:text-[#8e8e8e] active:scale-95"
        aria-label="联动聊天模式说明"
      >
        <CircleHelp className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="linked-chat-mode-help"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="linked-chat-mode-help-title"
                  className="fixed inset-0 flex items-end justify-center sm:items-center sm:px-5"
                  style={{ zIndex: 58000, background: ink.scrim }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 18 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className="flex max-h-[min(86dvh,620px)] w-full max-w-[min(400px,100vw)] flex-col overflow-hidden rounded-t-[24px] sm:rounded-[22px]"
                    style={{
                      background: ink.page,
                      boxShadow: '0 -12px 40px rgba(0,0,0,0.12)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="shrink-0 px-5 pb-3.5 pt-4"
                      style={{ background: ink.surface, borderBottom: `1px solid ${ink.line}` }}
                    >
                      <div
                        className="mx-auto mb-3 h-1 w-9 rounded-full sm:hidden"
                        style={{ background: '#d0d0d0' }}
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            id="linked-chat-mode-help-title"
                            className="text-[17px] font-semibold tracking-tight"
                            style={{ color: ink.title }}
                          >
                            联动聊天模式
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: ink.mute }}>
                            人脉之间可以传话、打听，剧情更像真人社交
                          </p>
                        </div>
                        <Pressable
                          type="button"
                          onClick={() => setOpen(false)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full active:opacity-80"
                          style={{ background: ink.iconBg, color: ink.iconFg }}
                          aria-label="关闭"
                        >
                          <X className="size-[16px]" strokeWidth={1.75} aria-hidden />
                        </Pressable>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 [-webkit-overflow-scrolling:touch]">
                      <HelpSection
                        icon={<MessagesSquare className="size-3.5" strokeWidth={1.75} />}
                        title="开启后会发生什么"
                      >
                        <Bullet>
                          当前角色可能把你说的话转告人脉里有关系的人，或主动去打听对方情况。
                        </Bullet>
                        <Bullet>
                          常见动机：中立转告、八卦闲聊、告状、求情，以及口头说「我去问问他」；也可能因你捅破别人的秘密/好感而去私下确认。
                        </Bullet>
                        <Bullet>是否触发由剧情与性格决定，不是客户端抽概率。</Bullet>
                      </HelpSection>

                      <HelpSection
                        icon={<MessageCircleHeart className="size-3.5" strokeWidth={1.75} />}
                        title="常见结果"
                      >
                        <div className="space-y-2">
                          <PathCard
                            index="1"
                            title="对方主动私信你"
                            desc="被转告的人可能用普通私聊那样的多条短气泡找你。会不会发、发什么口气，由对方人设、和你的关系、以及当下状态（例如是否冷战）由模型判断，不是客户端按关键词强制。"
                          />
                          <PathCard
                            index="2"
                            title="只告诉当前角色"
                            desc="对方也可以只把经过私下告诉正在和你聊的人、不私信你（例如对方本就不会主动找、或正冷战故意晾着）。之后这个角色会按「已经知道怎么回事」来接话。"
                          />
                          <PathCard
                            index="3"
                            title="秘密被捅破后的连锁"
                            desc="你把 B 的秘密（比如喜欢 A）告诉了 A，A 可能私下直接去问 B；B 感觉秘密被攻破，又会反过来私信你：「你是不是跟他说了？」"
                          />
                        </div>
                      </HelpSection>

                      <HelpSection
                        icon={<ShieldCheck className="size-3.5" strokeWidth={1.75} />}
                        title="开关怎么同步"
                      >
                        <Bullet>
                          开关只在当前角色有人脉关系（人脉里还有与TA有关系的其他角色）时可用；无人脉关系时无法开启。
                        </Bullet>
                        <Bullet>
                          传话会写入双方关键词长期记忆：关键词围绕对话内容提炼（不写「传话/联动」这类空词）；正文用{' '}
                          {'{{char}}'} / {'{{id:…}}'} / {'{{user}}'}{' '}
                          指称，改名后展示与注入会同步；排版与线上摘要一致，可走向量召回，时间剧情优先。
                        </Bullet>
                        <Bullet>
                          同一人脉根下、彼此有关系的角色，聊天信息页里的这个开关状态共享。
                        </Bullet>
                        <Bullet>不会出现这边开着、那边关着的情况。</Bullet>
                        <Bullet>
                          联动触发时会弹出说明：谁因为什么原因，正在找谁线上聊天。
                        </Bullet>
                      </HelpSection>
                    </div>

                    <div
                      className="shrink-0 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                      style={{ background: ink.surface, borderTop: `1px solid ${ink.line}` }}
                    >
                      <Pressable
                        type="button"
                        onClick={() => setOpen(false)}
                        className="w-full rounded-full py-3 text-[15px] font-semibold tracking-wide active:opacity-88"
                        style={{ background: ink.btn, color: ink.btnText }}
                      >
                        知道了
                      </Pressable>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}
