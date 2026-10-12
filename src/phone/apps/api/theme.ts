/** API 设置应用统一色板：暖石灰石调，避免纯黑硬对比 */
export const apiTheme = {
  bg: '#FAFAF9',
  card: '#FFFFFF',
  text: '#3A3936',
  subText: '#9A9A95',
  /** 更浅的辅助字（旁注、未开始步骤） */
  muted: '#B8B4AE',
  /** 最浅说明字 */
  faint: '#C8C4BC',
  /** 主按钮 / 选中态 */
  accent: '#6B6862',
  /** 浅底按钮、选中次级填充 */
  accentSoft: '#F7F5F1',
  /** 胶囊选中底 */
  accentMuted: '#E8E6E1',
  /** Tab 未选中底 */
  tabIdle: '#F3F1ED',
  border: '#E7E5E0',
  borderSoft: '#ECEAE5',
  borderStrong: '#D4D0C8',
  hairline: '#F1ECE7',
  chip: '#F0EEEA',
  /** 分组小标签 */
  sectionLabel: '#A39E96',
  onAccent: '#FFFFFF',
  danger: '#B07A7A',
  shadow: '0 2px 10px rgba(90, 86, 78, 0.06)',
  shadowAccent: '0 4px 14px rgba(107, 104, 98, 0.22)',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const
