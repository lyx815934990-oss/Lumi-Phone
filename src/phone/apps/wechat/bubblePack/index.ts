export type {
  LumiBubblePackEmbeddedAsset,
  LumiBubblePackMeta,
  LumiBubblePackSkinEngine,
  LumiWeChatBubblePack,
} from './types'
export {
  LUMI_BUBBLE_PACK_EXT,
  LUMI_BUBBLE_PACK_FORMAT,
  LUMI_BUBBLE_PACK_SKIN_VAR_PREFIXES,
  LUMI_BUBBLE_PACK_VERSION,
  LUMI_BUBBLE_PACK_VERSION_MIN,
  isCssSkinEngine,
  normalizeLumiBubblePackSkinEngine,
} from './types'

export {
  bubblePackFromScopedCssOnly,
  extractBubblePackJsonText,
  looksLikeBubbleScopedCss,
  parseLumiBubblePack,
  parseLumiBubblePackFile,
  serializeLumiBubblePack,
  stripBubblePackFence,
} from './parse'

export { applyBubblePack, buildBubblePackFromCurrent, patchWeChatAvatarChrome } from './apply'
export type { ApplyBubblePackArgs, ApplyBubblePackScope, BuildBubblePackFromCurrentParams } from './apply'

export {
  buildBubblePackAiPrompt,
  buildBubblePackEmptyTemplate,
  buildBubblePackEmptyTemplateText,
  buildBubblePackUserBriefTemplate,
  bubblePackDownloadFilename,
} from './aiKit'

export {
  OFFICIAL_BUBBLE_PACK_SAMPLES,
  SAMPLE_IMESSAGE_BUBBLE_PACK,
  SAMPLE_WECHAT_CLASSIC_BUBBLE_PACK,
  bubblePackFromPreset,
} from './samples'

export {
  ensureFrostedBubbleCss,
  extractBubbleBackdropBlurPx,
  normalizeBubblePackScopedCss,
  wrapWeChatChatSkinScopedCss,
} from './scopedCss'

export {
  LUMI_CSS_SKIN_STARTER_SCOPED_CSS,
  buildCssSkinEnginePackHints,
  ensureCssSkinSpecialRules,
} from './cssSkinStarter'

export {
  generateBubblePackWithLumiAssistant,
  buildLumiBubbleAssistantSystemPrompt,
  forceNuojijiCssSkinPack,
} from './lumiBubbleAssistantAi'
export type {
  LumiBubbleAssistantAssetHint,
  LumiBubbleAssistantGenerateArgs,
  LumiBubbleAssistantProgress,
  LumiBubbleAssistantResult,
  LumiBubbleAssistantTurn,
} from './lumiBubbleAssistantAi'

export {
  BUBBLE_ASSIST_BRIEF_FIELDS,
  buildBubbleAssistBriefExportForExternalAi,
  composeBubbleAssistBriefText,
  emptyBubbleAssistBrief,
  hasBubbleAssistBriefContent,
} from './bubbleAssistBrief'
export type {
  BubbleAssistBrief,
  BubbleAssistBriefFieldId,
  BubbleAssistBriefFieldMeta,
} from './bubbleAssistBrief'
