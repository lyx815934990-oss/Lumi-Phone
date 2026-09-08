import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_STORY_APPEARANCE,
  type DatingStoryAppearance,
} from '../../phone/apps/wechat/dating/datingStoryAppearance'
import { buildStoryRpgThemeStyle } from '../theme/storyRpgThemeBridge'
import { useStoryRpgStore } from '../store/useStoryRpgStore'
import { DEMO_NODES } from '../demo/mockData'
import { StoryRpgHeader } from './header/StoryRpgHeader'
import { StoryFeed } from './feed/StoryFeed'
import { DirectorConsole } from './console/DirectorConsole'
import { AdvancedControlSheet } from './console/AdvancedControlSheet'
import '../theme/storyRpgTheme.css'

type Props = {
  /** 嵌入手机壳时设为 false，全屏预览设为 true */
  fullViewport?: boolean
  onBack?: () => void
}

/**
 * H5 AI 剧情互动 · 主页面
 * Story RPG · 移动端优先
 */
export function StoryRpgPage({ fullViewport = true }: Props) {
  const setNodes = useStoryRpgStore((s) => s.setNodes)
  const appendNode = useStoryRpgStore((s) => s.appendNode)
  const settings = useStoryRpgStore((s) => s.settings)
  const headerCompact = useStoryRpgStore((s) => s.headerCompact)
  const [loading, setLoading] = useState(false)
  const [appearance] = useState<DatingStoryAppearance>(DEFAULT_STORY_APPEARANCE)
  const themeStyle = useMemo(() => buildStoryRpgThemeStyle(appearance), [appearance])

  useEffect(() => {
    setNodes(DEMO_NODES)
  }, [setNodes])

  const handleSend = useCallback(
    async (text?: string) => {
      const payload = (text ?? '').trim()
      appendNode({
        id: `player-${Date.now()}`,
        kind: 'player',
        content: payload,
        storyTimeLabel: '',
        createdAt: Date.now(),
      })
      setLoading(true)
      await new Promise((r) => setTimeout(r, 800))
      appendNode({
        id: `ai-${Date.now()}`,
        kind: 'ai',
        content: `**（AI 续写占位）** 你刚才说的「${payload.slice(0, 24)}${payload.length > 24 ? '…' : ''}」在雨夜里有了回响。\n\n他微微侧头，等待你的下一句话。`,
        storyTimeLabel: '19:50 PM',
        summary: '演示：AI 自动续写响应',
        chainOfThought: settings.thinkingChainEnabled
          ? '[demo] echo_player_input → extend_scene → hold_tension'
          : undefined,
        comments: settings.commentModeEnabled
          ? [
              {
                id: `rc-${Date.now()}`,
                nick: '路人甲',
                avatarHue: 200,
                text: '这反应好真实！',
                likes: 12,
              },
            ]
          : undefined,
        createdAt: Date.now(),
      })
      setLoading(false)
    },
    [appendNode, settings.commentModeEnabled, settings.thinkingChainEnabled],
  )

  return (
    <div
      className={`story-rpg-root relative flex flex-col overflow-hidden ${fullViewport ? 'fixed inset-0 z-[9999]' : 'h-full min-h-0'}`}
      data-mode={settings.mode}
      data-day-night={appearance.dayNight}
      data-palette={appearance.paletteId}
      data-header-compact={headerCompact ? 'true' : 'false'}
      style={themeStyle}
    >
      <StoryRpgHeader />
      <StoryFeed />
      <DirectorConsole onSend={handleSend} loading={loading} />
      <AdvancedControlSheet />
    </div>
  )
}

export default StoryRpgPage
