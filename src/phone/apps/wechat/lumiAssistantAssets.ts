import { publicAssetUrl } from '../../../publicAssetUrl'

/** 规范路径：写入联系人 / 通知元数据时用（勿写 Vite /assets 哈希） */
export const LUMI_ASSISTANT_AVATAR_PATH = '/image/主屏幕图标.png'

/** Lumi 小助手固定头像（通讯录、聊天、通知共用；经 public 同步，可过 resolveCharacterAvatarUrl） */
export const LUMI_ASSISTANT_AVATAR_URL = publicAssetUrl(LUMI_ASSISTANT_AVATAR_PATH)
