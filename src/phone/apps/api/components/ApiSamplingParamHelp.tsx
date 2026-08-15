import { AnimatePresence, motion } from 'framer-motion'
import { CircleHelp, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { apiTheme } from '../theme'

export type ApiSamplingHelpKey =
  | 'temperature'
  | 'topP'
  | 'maxTokens'
  | 'frequencyPenalty'
  | 'presencePenalty'
  | 'stream'
  | 'section'

type HelpContent = {
  title: string
  what: string
  recommend: string
  tips?: string[]
}

const HELP: Record<ApiSamplingHelpKey, HelpContent> = {
  section: {
    title: '模型输出参数',
    what: '用来微调「模型怎么说话」：发散还是稳、写多长、会不会啰嗦重复。留空就跟系统默认走；只有你想改手感时再填。',
    recommend: '日常聊天：温度约 0.7～0.9，其它先留空即可。',
    tips: [
      '主 API 与子 API（如聊天气泡）可分别设置。',
      '改完后新开一轮对话更明显；不必每个都填满。',
    ],
  },
  temperature: {
    title: '温度（temperature）',
    what: '控制回答有多「活泼」。数值越高越敢联想、越有变化；越低越老实、越重复固定说法。',
    recommend: '普通聊天推荐 0.7～0.9；写设定/要稳一点可 0.3～0.6；想更跳脱可到 1.0～1.2。一般别超过 1.5。',
    tips: [
      '太高容易胡说或跑题；太低容易像复读机。',
      '可填范围 0～2；留空则用各功能内部默认（多为约 0.7）。',
    ],
  },
  topP: {
    title: 'Top P',
    what: '另一种控制随机性的开关：只从「比较靠谱的那一截候选词」里抽。数值越小越保守，越大可选词越广。',
    recommend: '多数情况建议留空（不传）。若要调，可试 0.9～1.0；很少需要低于 0.8。',
    tips: [
      '一般只调温度或只调 Top P，不要两个同时拧得很极端。',
      '可填范围 0～1。',
    ],
  },
  maxTokens: {
    title: '最大 Token',
    what: '限制这一次回答最长能写多少。Token 粗略理解成「字词计数单位」，中文大约 1 个字接近 1～2 个 token（因模型而异）。',
    recommend:
      '想自己掌控长度就在这里调。填写后，聊天 / 约会剧情 / 查手机全系 / 起名 / 摘要 / 弹幕等凡走本配置的请求都会用这个上限。系统默认 12800；长文可再试 16384～32768。',
    tips: [
      '留空（系统默认）：按 12800 传给接口；若某功能自带更小的内置上限（如起名/短摘要），仍优先用该功能上限。',
      '设太小会把话截断；设太大通常不会让短回复变长，只是上限更高，也可能更贵更慢。',
      '滑杆 256～128000（步进 256）。实际还受服务商与模型上下文限制；拉满不代表模型真能输出那么长。',
    ],
  },
  frequencyPenalty: {
    title: '频率惩罚（frequency_penalty）',
    what: '已经说过的词，再说会越来越「不划算」。用来减轻翻来覆去用同一个词、同一句式。',
    recommend: '日常推荐 0～0.3；啰嗦重复明显时可试 0.3～0.6。很少需要超过 1。',
    tips: [
      '过高会让句子别扭、用词生硬。',
      '可填范围 -2～2；负数反而更容易重复（一般别用负值）。',
    ],
  },
  presencePenalty: {
    title: '存在惩罚（presence_penalty）',
    what: '只要某个话题/词出现过，就轻微推动模型换新话题或新说法。比「频率惩罚」更偏「别老待在同一件事上」。',
    recommend: '日常推荐 0～0.3；觉得聊来聊去总绕同一点时可试 0.3～0.6。',
    tips: [
      '和频率惩罚可以一起小幅使用，但别两个都拉很高。',
      '可填范围 -2～2；留空即不传。',
    ],
  },
  stream: {
    title: '流式输出（SSE）',
    what: '让服务器一段一段往回推数据。本应用会先收齐再显示完整回复，所以界面上看起来仍是「等一下再整段出来」，不是边出字边显示。',
    recommend: '默认关闭即可。只有中转站要求必须开 stream、或不开会报错时，再打开。',
    tips: [
      'OpenAI 兼容接口才生效；Gemini 原生地址会忽略。',
      '若开启后解析失败，先关掉流式再试。',
    ],
  },
}

export function ApiSamplingParamHelpButton({
  helpKey,
  zIndex = 58000,
}: {
  helpKey: ApiSamplingHelpKey
  zIndex?: number
}) {
  const [open, setOpen] = useState(false)
  const content = HELP[helpKey]

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 active:scale-95"
        style={{ color: apiTheme.subText }}
        aria-label={`${content.title}说明`}
      >
        <CircleHelp className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key={`api-sampling-help-${helpKey}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`api-sampling-help-title-${helpKey}`}
                  className="fixed inset-0 flex items-end justify-center px-0 sm:items-center sm:px-5"
                  style={{ zIndex, background: 'rgba(17,24,39,0.28)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className="flex max-h-[min(88dvh,560px)] w-full max-w-[min(400px,100vw)] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.1)] sm:rounded-[24px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
                      <p
                        id={`api-sampling-help-title-${helpKey}`}
                        className="min-w-0 flex-1 text-[16px] font-semibold"
                        style={{ color: apiTheme.text }}
                      >
                        {content.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                        aria-label="关闭"
                      >
                        <X className="size-4" style={{ color: apiTheme.subText }} />
                      </button>
                    </div>
                    <div className="space-y-3 overflow-y-auto px-5 py-4">
                      <section className="rounded-2xl bg-[#fafafa] px-4 py-3.5 ring-1 ring-black/5">
                        <p className="text-[12px] font-semibold" style={{ color: apiTheme.text }}>
                          是做什么的
                        </p>
                        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: apiTheme.subText }}>
                          {content.what}
                        </p>
                      </section>
                      <section className="rounded-2xl bg-amber-50/80 px-4 py-3.5 ring-1 ring-amber-100">
                        <div className="flex items-start gap-2.5">
                          <Lightbulb
                            className="mt-0.5 size-4 shrink-0 text-amber-600/90"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-amber-950/90">普通推荐</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-amber-950/75">
                              {content.recommend}
                            </p>
                          </div>
                        </div>
                      </section>
                      {content.tips?.length ? (
                        <section className="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/5">
                          <p className="text-[12px] font-semibold" style={{ color: apiTheme.text }}>
                            小提示
                          </p>
                          <ul className="mt-2 space-y-2">
                            {content.tips.map((tip) => (
                              <li
                                key={tip}
                                className="flex gap-2.5 text-[13px] leading-relaxed"
                                style={{ color: apiTheme.subText }}
                              >
                                <span
                                  className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300"
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}
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
