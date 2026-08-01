/** 轻量入口：勿在此 barrel 再导出 JBSGameFlow 等对局模块，避免误静态 import 拉进首包 */
export { JubenshaHallApp } from './JubenshaHallApp'
export { JUBENSHA_HALL_UNDER_DEV } from './jubenshaDevFlags'
export { JubenshaHallUnderDev } from './JubenshaHallUnderDev'
export type {
  JubenshaScript,
  PlayRecord,
  JubenshaRecord,
  JubenshaComment,
  JubenshaCompanion,
  JubenshaShelfCategory,
  ShelfConfig,
} from './types'
