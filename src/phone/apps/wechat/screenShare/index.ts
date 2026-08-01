export { ScreenShareConfirmSheet } from './ScreenShareConfirmSheet'
export { ScreenShareDock } from './ScreenShareDock'
export { installScreenShareReactionEngine } from './screenShareReactionEngine'
export {
  getScreenShareSession,
  getScreenShareStream,
  setScreenShareExternalPauseGetter,
  setScreenSharePaused,
  startScreenShareSession,
  stopScreenShareSession,
  subscribeScreenShareSession,
  isScreenShareEffectivelyPaused,
} from './screenShareSession'
export type { ScreenShareSessionState, ScreenShareStartParams } from './types'
