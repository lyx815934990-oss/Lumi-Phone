/** 内置 Mixamo 动作库（public/home-animations） */

export type HomeAvatarClipId =
  | 'walk-slow'
  | 'walk-normal'
  | 'turn-left'
  | 'run'
  | 'sleep'
  | 'angry'
  | 'curious'
  | 'wave'
  | 'kiss'
  | 'picked-up'
  | 'fall-air'
  | 'fall-land'

export const HOME_AVATAR_BASE_URL = '/home-animations'

export const HOME_AVATAR_BASE_MESH = `${HOME_AVATAR_BASE_URL}/avatar-base.fbx`

export const HOME_AVATAR_CLIPS: Record<
  HomeAvatarClipId,
  { file: string; label: string; loop?: boolean }
> = {
  'walk-slow': { file: 'walk-slow.fbx', label: '慢走', loop: true },
  'walk-normal': { file: 'walk-normal.fbx', label: '正常走路', loop: true },
  'turn-left': { file: 'turn-left.fbx', label: '左转', loop: false },
  run: { file: 'run.fbx', label: '跑动', loop: true },
  sleep: { file: 'sleep.fbx', label: '睡觉', loop: true },
  angry: { file: 'angry.fbx', label: '生气', loop: false },
  curious: { file: 'curious.fbx', label: '好奇', loop: false },
  wave: { file: 'avatar-base.fbx', label: '打招呼', loop: false },
  kiss: { file: 'kiss.fbx', label: 'Kiss', loop: false },
  'picked-up': { file: 'picked-up.fbx', label: '被拎起', loop: true },
  'fall-air': { file: 'fall-air.fbx', label: '下落过程', loop: true },
  'fall-land': { file: 'fall-land.fbx', label: '下落着地', loop: false },
}

/** 漫游优先启用的动作 */
export const HOME_AVATAR_WALK_CLIPS: HomeAvatarClipId[] = [
  'walk-slow',
  'walk-normal',
  'turn-left',
]

export function homeAvatarClipUrl(id: HomeAvatarClipId): string {
  return `${HOME_AVATAR_BASE_URL}/${HOME_AVATAR_CLIPS[id].file}`
}
