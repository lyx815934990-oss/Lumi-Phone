import type { DanmakuBullet, StoryComment, StoryNode } from '../types'

export const DEMO_COMMENTS: StoryComment[] = [
  {
    id: 'c1',
    nick: '夜航船',
    avatarHue: 220,
    text: '这一段雨声描写太有电影感了，鸡皮疙瘩。',
    likes: 128,
    highlight: true,
  },
  {
    id: 'c2',
    nick: '纸月亮',
    avatarHue: 42,
    text: '等等，他刚才那个停顿是不是在说谎？',
    likes: 56,
  },
  {
    id: 'c3',
    nick: '第七站台',
    avatarHue: 310,
    text: '作者你是懂暧昧拉扯的……',
    likes: 89,
    highlight: true,
  },
]

export const DEMO_NODES: StoryNode[] = [
  {
    id: 'n1',
    kind: 'ai',
    storyTimeLabel: '19:30 PM, 雨',
    summary: '初遇：便利店外的雨夜，两人第一次正式对话。',
    summaryBody:
      '【本轮锚点】雨夜 · 便利店外\n\n【本轮事件】两人在雨夜便利店外第一次正式对话；气氛谨慎却带着好奇，沉默第一次有了形状。',
    isHighlight: false,
    chainOfThought: `[scene] convenience_store_exterior, rain_heavy
[emotion] cautious_curiosity → guarded_warmth
[pacing] slow_burn, sensory_first
[constraint] no_direct_confession_yet`,
    content: `雨丝在霓虹灯下拉成细密的银线。**这声音比任何白噪音都更适合掩盖心跳。**

你推开便利店的玻璃门，冷气与潮气在门槛处撞在一起。收银台后的少年抬头——那是你第三次在这家店遇见同一个人。

「又是你。」他递过塑料袋时，指尖不小心擦过你的手背，*像是不小心，又像不是。*

> 雨还在下。而你们之间的沉默，第一次有了可以被听见的形状。`,
    comments: DEMO_COMMENTS,
    createdAt: Date.now() - 120_000,
  },
  {
    id: 'n2',
    kind: 'player',
    storyTimeLabel: '',
    content: '「嗯，雨太大了。」我接过袋子，**其实只是想再多看他一眼。**',
    createdAt: Date.now() - 60_000,
  },
  {
    id: 'n3',
    kind: 'ai',
    storyTimeLabel: '19:42 PM, 雨渐小',
    summary: '高光：共享一把伞的提议，关系微妙升温。',
    summaryBody:
      '【本轮锚点】雨渐小 · 店门口\n\n【本轮事件】少年犹豫后递出备用伞，耳尖微红；共享一把伞成为关系升温的节点。',
    isHighlight: true,
    chainOfThought: `[beat] offer_umbrella — classic but earned
[tension] micro_hesitation_before_speech
[visual] gold_rim_light_on_wet_pavement`,
    content: `他把收银台旁备用伞取下来，犹豫了一秒。

「如果不介意——」他顿了顿，声音被雨声削薄，「这把伞，可以一起用。」

**你注意到他耳尖泛红，在冷色灯光下几乎不可见。** 可你还是看见了。`,
    images: [
      {
        id: 'img1',
        url: 'https://images.unsplash.com/photo-1519699089857-2f4f48f837bd?w=600&q=80',
        caption: '雨夜 · 便利店外',
      },
    ],
    comments: [
      ...DEMO_COMMENTS,
      {
        id: 'c4',
        nick: '嗑学家',
        avatarHue: 18,
        text: '啊啊啊啊高光时刻！！！',
        likes: 234,
        highlight: true,
      },
    ],
    createdAt: Date.now(),
  },
]

export function createDemoDanmaku(nodes: StoryNode[]): DanmakuBullet[] {
  const texts = nodes
    .filter((n) => n.kind === 'ai')
    .flatMap((n) => n.comments?.map((c) => c.text) ?? [])
    .slice(0, 8)
  return texts.map((text, i) => ({
    id: `dm-${i}`,
    text,
    top: 8 + (i % 5) * 16,
    durationSec: 10 + (i % 4) * 2,
    hue: 38 + i * 24,
  }))
}
