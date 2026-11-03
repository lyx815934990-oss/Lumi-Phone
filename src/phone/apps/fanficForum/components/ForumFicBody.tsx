/**
 * 同人文正文：与线下约会「普通剧情」同一套行内富文本。
 * - 旁白：纸灰正文色
 * - 对白：「…」→ 墨蓝斜体 + 浅底（与旁白明显区分）
 * - 内心：**…** → 朱砂斜体 + 浅红底
 * 兼容旧稿 <dlg>/<os>：展示前转成约会标记。
 */

import { parsePlotRichText } from '../../wechat/dating/plotRichText'
import { FORUM } from '../forumTheme'
import { convertForumLegacyMarkupToDatingProse } from '../forumAiShared'

const DIALOGUE_FG = '#2F5478'
const INNER_OS_FG = FORUM.textAccent

export function ForumFicBody({
  body,
  className = '',
}: {
  body: string
  className?: string
}) {
  const src = convertForumLegacyMarkupToDatingProse(body)
  const paragraphs = src.split(/\n{2,}/).filter((p) => p.trim())

  return (
    <div
      className={`forum-fic-prose sr-prose ${className}`.trim()}
      style={{
        fontSize: FORUM.font.body,
        color: FORUM.textSecondary,
        ['--plot-dialogue-fg' as string]: DIALOGUE_FG,
        ['--plot-inner-os-fg' as string]: INNER_OS_FG,
        ['--dating-font-size' as string]: `${FORUM.font.body}px`,
        lineHeight: 1.75,
      }}
    >
      <style>{`
        .forum-fic-prose .sr-plot-dialogue {
          color: ${DIALOGUE_FG} !important;
          background-color: rgba(47, 84, 120, 0.1);
          border-radius: 3px;
          padding: 0.05em 0.2em;
          font-style: italic;
          font-weight: 500;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .forum-fic-prose .sr-plot-inner-os {
          color: ${INNER_OS_FG} !important;
          background-color: rgba(139, 46, 34, 0.09);
          border-radius: 3px;
          padding: 0.05em 0.2em;
          font-style: italic;
          font-weight: 400;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
      `}</style>
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap break-words"
          style={{
            margin: '0 0 0.65em',
            lineHeight: 1.75,
            wordBreak: 'normal',
            overflowWrap: 'anywhere',
          }}
        >
          {parsePlotRichText(para)}
        </p>
      ))}
    </div>
  )
}
