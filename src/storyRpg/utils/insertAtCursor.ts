/** 在 textarea 光标处插入文本，并将光标置于 open/close 之间 */
export function insertPairAtCursor(
  el: HTMLTextAreaElement,
  open: string,
  close: string,
  currentValue: string,
): { nextValue: string; cursor: number } {
  const start = el.selectionStart ?? currentValue.length
  const end = el.selectionEnd ?? start
  const before = currentValue.slice(0, start)
  const after = currentValue.slice(end)
  const nextValue = `${before}${open}${close}${after}`
  const cursor = start + open.length
  return { nextValue, cursor }
}

export function applyTextareaCursor(el: HTMLTextAreaElement, cursor: number) {
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(cursor, cursor)
  })
}
