import { INK_KICKER, INK_LEAD, INK_SECTION, INK_TITLE } from './personaEditorTabs'

export function ConnectionsTab({ children }: { children: React.ReactNode }) {
  return (
    <div className={INK_SECTION}>
      <header className="border-b border-[#D2D0CB] px-4 py-4">
        <p className={INK_KICKER}>07 NET · 关系拓扑</p>
        <h2 className={INK_TITLE}>人脉关系</h2>
        <p className={`${INK_LEAD} max-w-prose`}>
          首屏为关系图谱仪表盘；AI 生成与手动录入收纳于折叠卡片；已收录 NPC 在下方档案库中维护。
        </p>
      </header>
      <div className="px-3 pb-5 pt-4">{children}</div>
    </div>
  )
}
