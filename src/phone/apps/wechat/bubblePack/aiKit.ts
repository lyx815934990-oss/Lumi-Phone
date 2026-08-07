import { WECHAT_CHAT_SKIN_DEFAULTS, WECHAT_CHAT_SKIN_SELECTOR_DOC } from '../wechatChatSkinVars'
import { buildCssSkinEnginePackHints, LUMI_CSS_SKIN_STARTER_SCOPED_CSS } from './cssSkinStarter'
import { serializeLumiBubblePack } from './parse'
import { SAMPLE_WECHAT_CLASSIC_BUBBLE_PACK } from './samples'
import {
  LUMI_BUBBLE_PACK_EXT,
  LUMI_BUBBLE_PACK_FORMAT,
  LUMI_BUBBLE_PACK_VERSION,
  type LumiWeChatBubblePack,
} from './types'

function skinVarDocLines(): string[] {
  return [
    '--wx-chat-header-bg / --wx-chat-header-text / --wx-chat-header-border / --wx-chat-header-muted',
    '--wx-chat-input-bar-bg / --wx-chat-input-bar-border',
    '--wx-chat-input-shell-bg / --wx-chat-input-shell-border / --wx-chat-input-shell-radius',
    '--wx-chat-input-btn-color / --wx-chat-input-text-color / --wx-chat-input-placeholder',
    '--wx-special-rp-* / --wx-special-tf-* / --wx-special-voice-* / --wx-special-loc-*（含 loc-bg / loc-border）',
    '磨砂时顶栏与输入壳建议半透明：--wx-chat-header-*、--wx-chat-input-bar-*、--wx-chat-input-shell-*',
    `默认参考色：红包强调 ${WECHAT_CHAT_SKIN_DEFAULTS.specialRpAccent}；语音己方底 ${WECHAT_CHAT_SKIN_DEFAULTS.specialVoiceBgSelf}`,
  ]
}

export function buildBubblePackUserBriefTemplate(): string {
  return [
    '--- 在下方填写你的美化需求（留空表示不改该项），与「AI 提示词」一起发给 AI ---',
    '',
    '【顶栏 / 标题栏】',
    '（例：磨砂白底、细灰底边、标题字重偏细）',
    '',
    '【文字气泡 · 己方】',
    '（例：雾蓝半透明、圆角 20px、字色深灰、不要尾巴）',
    '',
    '【文字气泡 · 对方】',
    '（例：暖白实色、略窄、不要阴影）',
    '',
    '【气泡尾巴样式】',
    '（css 引擎下用 scopedCss 画尾巴；不要用尾巴去切换主题皮）',
    '',
    '【聊天室背景】',
    '（纯色如 #F3F3F3；渐变可写 linear 135° #FFF5E1→#FFF0F5；或沿用默认壁纸）',
    '',
    '【输入栏】',
    '（例：浅灰底条、输入框纯白圆角、侧栏图标黑色）',
    '',
    '【语音消息】',
    '（例：播放钮改玫瑰金、波形已播放段更深）',
    '',
    '【红包】',
    '（例：奶油磨砂卡、祝福语金色；禁止微信默认橙卡）',
    '',
    '【转账】',
    '（例：同系磨砂卡、金额更大；禁止微信默认橙卡）',
    '',
    '【位置】',
    '（例：地图 pin 改蓝色）',
    '',
    '【整体风格 / 参考】',
    '（例：极简北欧 / 糯叽机磨砂粉）',
    '',
    '【保持不变】',
    '（例：不要改字体；只动红包和顶栏）',
  ].join('\n')
}

/** 可直接丢给外部 AI 的完整提示词 */
export function buildBubblePackAiPrompt(): string {
  return [
    '你是 Lumi 手机模拟器里「糯叽机式」聊天气泡 CSS 助手。输出可导入的 JSON 气泡包；视觉像糯叽机一样用 CSS 从零画，不套任何内置主题皮。',
    '',
    '## 输出硬性规则',
    `- 只输出一个 JSON 对象（可包在 \`\`\`json 代码块\`\`\` 里），format 必须为 "${LUMI_BUBBLE_PACK_FORMAT}"，version 必须为 ${LUMI_BUBBLE_PACK_VERSION}。`,
    '- **硬性：`"skinEngine": "css"`**：DOM 只留最原始结构壳；**禁止**套微信橙卡 / Lumi 铂金卡 / iMessage / Telegram 主题皮；**禁止**只靠 skinOverrides 给主题皮换色。',
    '- **视觉必须写在 scopedCss**：文字气泡、顶栏、输入栏、红包、转账、语音、通话、位置、收藏全部用 `[data-wx-*]` + `!important` 从零绘制。',
    '- preset.bubble.selfBubbleBg / otherBubbleBg 写 `"transparent"`；颜色、圆角、阴影、磨砂一律放 CSS。',
    '- scopedCss 禁止 html/body/:root/@import；气泡面用 `[data-wx-bubble-content]`，勿编造 class。',
    '- 用户分项留空时：按整体风格用 CSS 推导补齐全部特殊消息，禁止交空壳或主题橙卡。',
    '- skinOverrides 仅可选；不能替代 scopedCss 里的红包/转账绘制。',
    '- 不要编造远程图片 URL；聊天背景可用 solid / image / gradient。',
    '- 头像框/角标只引用用户已上传的 assetId；未提供则不要写 avatarChrome。',
    '',
    ...buildCssSkinEnginePackHints(),
    '',
    '## chatRoomDefaultBg',
    '- solid：`{ "mode": "solid", "color": "#F3F3F3" }`',
    '- image：`{ "mode": "image", "imageUrl": "...", "fallbackColor": "#EDEDED" }`',
    '- gradient：`{ "mode": "gradient", "css": "linear-gradient(135deg,#FFF5E1,#FFF0F5)" }` 或 colorStart/colorEnd',
    '',
    '## 包结构示例',
    '{',
    `  "format": "${LUMI_BUBBLE_PACK_FORMAT}",`,
    `  "version": ${LUMI_BUBBLE_PACK_VERSION},`,
    '  "meta": { "id": "my-skin", "name": "名称", "description": "说明" },',
    '  "preset": {',
    '    "id": "my-skin",',
    '    "name": "名称",',
    '    "description": "说明",',
    '    "bubble": {',
    '      "selfBubbleBg": "transparent",',
    '      "otherBubbleBg": "transparent",',
    '      "selfBubbleRadiusPx": 16,',
    '      "otherBubbleRadiusPx": 16,',
    '      "showAvatar": true,',
    '      "avatarRadiusPx": 8,',
    '      "showBubbleTail": false,',
    '      "mergeConsecutiveAvatarGroup": false',
    '    },',
    '    "selfBubbleText": "#191919",',
    '    "otherBubbleText": "#191919",',
    '    "chatRoomDefaultBg": { "mode": "solid", "color": "#F3F3F3" },',
    '    "wechatThemePatch": { "chatInputBg": "transparent", "chatInputBorder": "transparent" },',
    '    "chatThemePatch": { "inputBar": { "layout": "lumi", "borderRadius": 18, "borderColor": "transparent", "backgroundColor": "transparent", "buttonColor": "#191919", "buttonSize": 22 } }',
    '  },',
    '  "skinEngine": "css",',
    '  "scopedCss": "（必填）完整 CSS",',
    '  "skinOverrides": {}',
    '}',
    '',
    '## 选择器',
    ...WECHAT_CHAT_SKIN_SELECTOR_DOC.map((line) => `- ${line}`),
    '- 禁止编造 class；气泡表面必须用 `[data-wx-bubble-content]`。',
    '',
    '## skinOverrides 可选变量（不能替代 scopedCss）',
    ...skinVarDocLines().map((l) => `- ${l}`),
    '',
    '## 磨砂 / frosted',
    '- 气泡底写在 scopedCss（半透明 + backdrop-filter）；preset 气泡色保持 transparent。',
    '- 红包/转账也要用 scopedCss 画同系风格，禁止微信默认橙卡。',
    '',
    '## 用户怎么提需求',
    '1. 文末有「需求填写模版」；用户按【】区块填空后整段发给你；',
    '2. 你输出完整气泡包 JSON，用户导入 .lumiBubblePack 或粘贴 JSON 即可。',
    '',
    '--- 需求填写模版（请让用户在下方填空后再发给你）---',
    buildBubblePackUserBriefTemplate(),
  ].join('\n')
}

/** 空模版：合法可导入；默认纯 CSS 引擎 + 起步 scopedCss */
export function buildBubblePackEmptyTemplate(): LumiWeChatBubblePack {
  const sample = SAMPLE_WECHAT_CLASSIC_BUBBLE_PACK
  return {
    ...sample,
    meta: {
      id: 'my-custom-bubble',
      name: '我的气泡',
      description: '糯叽机式纯 CSS 皮肤',
      author: '',
    },
    preset: {
      ...sample.preset,
      id: 'my-custom-bubble',
      name: '我的气泡',
      description: '糯叽机式纯 CSS 皮肤',
      bubble: {
        ...sample.preset.bubble,
        selfBubbleBg: 'transparent',
        otherBubbleBg: 'transparent',
        showBubbleTail: false,
        bubbleTailStyle: undefined,
      },
    },
    skinEngine: 'css',
    scopedCss: LUMI_CSS_SKIN_STARTER_SCOPED_CSS,
  }
}

export function buildBubblePackEmptyTemplateText(): string {
  return serializeLumiBubblePack(buildBubblePackEmptyTemplate())
}

export function bubblePackDownloadFilename(name: string): string {
  const safe = (name || 'bubble').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'bubble'
  return `${safe}${LUMI_BUBBLE_PACK_EXT}`
}
