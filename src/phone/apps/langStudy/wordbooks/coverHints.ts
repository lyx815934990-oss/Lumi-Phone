/**
 * 常见教材封面：优先豆瓣图床（国内可访问）。
 * 仅作展示；刷记词表用本地词库。
 */
export const LOCAL_BOOK_COVER_HINTS: Record<string, string> = {
  'minna-shokyu-1': 'https://img9.doubanio.com/view/subject/l/public/s29491878.jpg',
  'minna-shokyu-2': 'https://img9.doubanio.com/view/subject/l/public/s29491879.jpg',
  'hyojun-shokyu-1': 'https://img9.doubanio.com/view/subject/l/public/s28325521.jpg',
  'hyojun-shokyu-2': 'https://img9.doubanio.com/view/subject/l/public/s28325522.jpg',
  'jlpt-n5': 'https://img9.doubanio.com/view/subject/l/public/s29715891.jpg',
  'jlpt-n4': 'https://img9.doubanio.com/view/subject/l/public/s29715892.jpg',
  'cet4-core': 'https://img9.doubanio.com/view/subject/l/public/s33945687.jpg',
  'cet6-core': 'https://img9.doubanio.com/view/subject/l/public/s33945688.jpg',
}

export function coverHintForBookId(bookId: string | null | undefined): string | undefined {
  if (!bookId) return undefined
  return LOCAL_BOOK_COVER_HINTS[bookId]
}
