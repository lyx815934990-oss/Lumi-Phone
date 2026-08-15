/** 绮幕 · 柔和黑白 + 克制珍珠白微光 */
export const qimuInk = {
  page: '#f7f7f7',
  surface: '#fafafa',
  card: '#ffffff',
  line: 'rgba(0,0,0,0.06)',
  lineStrong: 'rgba(0,0,0,0.10)',
  title: '#1a1a1a',
  body: '#5c5c5c',
  mute: '#9a9a9a',
  iconBg: '#efefef',
  scrim: 'rgba(0,0,0,0.38)',
  glass: 'rgba(255,255,255,0.72)',
  glassDark: 'rgba(18,18,18,0.42)',
  /** 珍珠白渐变（进度条 / 幕间光晕） */
  pearl: 'linear-gradient(90deg, #f5f5f5 0%, #e8e6e1 35%, #f7f4ee 55%, #dedad3 100%)',
  pearlGlow: '0 0 24px rgba(232, 220, 200, 0.45)',
  wingInput:
    'linear-gradient(180deg, rgba(250,247,240,0.95) 0%, rgba(245,240,230,0.92) 100%)',
  stageInput: '#f0f0f0',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  display:
    '"Songti SC", "STSong", "Noto Serif SC", "Playfair Display", Georgia, "Times New Roman", serif',
} as const
