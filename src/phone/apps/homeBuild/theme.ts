/** Lumi机 · 3D家园建造 — UI 外壳 + Gizmo 专用色 */

import { LUMI_SHELL, LUMI_SHELL_FONT, LUMI_SHELL_NUM_STYLE } from '../wechat/lumiShellTheme'

export const HOME_BUILD = {
  ...LUMI_SHELL,
  /** 图纸蓝 — 本功能唯一强调色 */
  blueprint: '#2C6FAD',
  blueprintSoft: 'rgba(44, 111, 173, 0.08)',
  blueprintGrid: 'rgba(44, 111, 173, 0.10)',
  blueprintLine: 'rgba(44, 111, 173, 0.35)',
  /** Gizmo 轴色 — 仅用于 3D 视口内操控柄 */
  gizmoX: '#E5484D',
  gizmoY: '#2FA84F',
  gizmoZ: '#3D7DD6',
  /** 3D 幽灵模式墙体半透明 */
  ghostWallOpacity: 0.35,
  /** 2D 户型编辑暗色画布 */
  planBg: '#1a1a1e',
  planGrid: 'rgba(255, 255, 255, 0.14)',
  planWall: '#f5f5f5',
  planWallActive: '#E5484D',
  planRoomFill: 'rgba(255, 255, 255, 0.06)',
  planRoomSel: 'rgba(44, 111, 173, 0.22)',
  planLabel: 'rgba(255, 255, 255, 0.75)',
  panelRadiusPx: 20,
} as const

export const HOME_BUILD_FONT = LUMI_SHELL_FONT
export const HOME_BUILD_NUM_STYLE = LUMI_SHELL_NUM_STYLE

export const HOME_BUILD_MOTION = {
  modeSwitchMs: 700,
  floorSwitchMs: 150,
  placeLandMs: 150,
  snapLineMs: 200,
} as const
