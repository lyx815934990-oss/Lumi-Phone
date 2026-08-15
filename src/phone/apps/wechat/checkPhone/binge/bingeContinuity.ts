import { hasBingeContent, MEDIA_KIND_LABEL, type BingeDataset } from './types'

export function formatBingeContinuityBrief(data: BingeDataset | null | undefined): string {
  if (!data || !hasBingeContent(data)) return ''
  const lines: string[] = [
    '【既有追剧记录·连续性锚定】',
    '新一轮须承接已在追/已看完的作品名与大致进度气质；可推进进度、新增作品，勿把已收藏神作改成从未看过或改名换姓。',
  ]
  const items = (data.items || []).slice(0, 10)
  if (items.length) {
    lines.push('既有作品：')
    for (const it of items) {
      const fav = it.favorited ? '收藏' : ''
      lines.push(
        `- 《${it.title}》｜${MEDIA_KIND_LABEL[it.kind]}｜${it.status}｜${it.progressLabel}${fav ? '｜已收藏' : ''}`,
      )
    }
  }
  const forums = (data.forums || []).slice(0, 4)
  if (forums.length) {
    lines.push(`既有讨论组：${forums.map((f) => f.name).join('、')}`)
  }
  return lines.join('\n')
}
