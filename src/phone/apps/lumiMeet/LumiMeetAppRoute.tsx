import { LumiMeetApp } from './LumiMeetApp'
import { LumiMeetProvider } from './LumiMeetStore'

/** Provider 置于路由层，避免与 LumiMeetApp 同文件热更新时子树脱离 Context */
export function LumiMeetAppRoute({ onBack }: { onBack: () => void }) {
  return (
    <LumiMeetProvider>
      <LumiMeetApp onBack={onBack} />
    </LumiMeetProvider>
  )
}
