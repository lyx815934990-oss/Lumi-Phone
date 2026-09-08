/** 统计正文字数（排除标点与空白） */
const PUNCT_RE =
  /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~，。！？；：、「」『』（）【】《》…—·\s]/gu

export function countWordsExcludingPunct(text: string): number {
  const stripped = String(text || '')
    .replace(PUNCT_RE, '')
    .replace(/\*+/g, '')
  return [...stripped].length
}
