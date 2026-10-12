/** 把很长的模型 id 拆成主标题 + 副信息，方便列表/卡片阅读 */
export function splitApiModelDisplay(modelId: string): {
  title: string
  badge?: string
  path?: string
} {
  const id = modelId.trim()
  if (!id) return { title: '' }

  const cnBracket = id.match(/^【([^】]{1,40})】(.*)$/)
  if (cnBracket) {
    const rest = cnBracket[2].trim()
    return { title: rest || id, badge: cnBracket[1].trim() }
  }

  const square = id.match(/^\[([^\]]{1,40})\]\s*(.*)$/)
  if (square) {
    const rest = square[2].trim()
    return { title: rest || id, badge: square[1].trim() }
  }

  const slash = id.lastIndexOf('/')
  if (slash > 0 && slash < id.length - 1) {
    return { title: id.slice(slash + 1), path: id.slice(0, slash) }
  }

  return { title: id }
}
