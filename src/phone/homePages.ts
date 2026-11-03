/** 桌面页：0 账号中心 / 1 名片主屏 / 2+ 普通页（应用+组件） */

export const HOME_ACCOUNT_PAGE = 0
export const HOME_MAIN_PAGE = 1
/** 普通页最少可为 0（全部删空后只剩账号+主屏） */
export const MIN_NORMAL_PAGES = 0
export const MAX_NORMAL_PAGES = 8
export const DEFAULT_NORMAL_PAGES = 1

/** 组件/图标 page 索引上限：主屏 0 + 普通页 */
export const MAX_WIDGET_PAGES = 1 + MAX_NORMAL_PAGES

export function clampNormalPageCount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_NORMAL_PAGES
  return Math.max(MIN_NORMAL_PAGES, Math.min(MAX_NORMAL_PAGES, Math.floor(raw)))
}

/** 含账号中心的主屏翻页总页数 */
export function homePagerPageCount(normalPages: number): number {
  return 2 + clampNormalPageCount(normalPages)
}

/** 组件库可用页数：0=主屏，1..=普通页 */
export function widgetPageCount(normalPages: number): number {
  return 1 + clampNormalPageCount(normalPages)
}

/** home 页码 → 组件/图标 page（账号中心无对应） */
export function galleryPageFromHome(homePage: number): number {
  return Math.max(0, homePage - HOME_MAIN_PAGE)
}

export function homePageFromGallery(galleryPage: number): number {
  return galleryPage + HOME_MAIN_PAGE
}

export function isNormalHomePage(homePage: number): boolean {
  return homePage >= HOME_MAIN_PAGE + 1
}

export function lastHomePage(normalPages: number): number {
  return homePagerPageCount(normalPages) - 1
}
