import {
  activeLyricIndex,
  formatLyricTime,
  type ParsedLyricLine,
} from '../../../../components/discoverListen/listenLyricParse'
import {
  getSyncListeningRecentTracks,
  type SyncListeningRecentTrack,
} from '../../../../components/discoverListen/syncListeningRecentTracks'
import { useMusicStore } from '../../../../stores/useMusicStore'

/** 当前私聊角色是否处于「一起听」同步会话 */
export function isActiveSyncListeningWithCharacter(characterId: string): boolean {
  const cid = characterId.trim()
  if (!cid) return false
  const { syncListening } = useMusicStore.getState()
  if (!syncListening) return false
  const companionId = syncListening.companion.characterId?.trim()
  return Boolean(companionId && companionId === cid)
}

function lyricContextAtTime(
  lyrics: ParsedLyricLine[],
  currentTimeMs: number,
  durationMs: number,
): { current?: string; prev?: string; next?: string } {
  if (!lyrics.length) return {}
  const idx = activeLyricIndex(lyrics, currentTimeMs, durationMs)
  const current = lyrics[idx]?.text?.trim()
  const prev = idx > 0 ? lyrics[idx - 1]?.text?.trim() : ''
  const next = idx < lyrics.length - 1 ? lyrics[idx + 1]?.text?.trim() : ''
  return {
    ...(current ? { current } : {}),
    ...(prev ? { prev } : {}),
    ...(next ? { next } : {}),
  }
}

function nearbyLyricLines(
  lyrics: ParsedLyricLine[],
  currentTimeMs: number,
  durationMs: number,
  radius = 3,
): string[] {
  if (!lyrics.length) return []
  const idx = activeLyricIndex(lyrics, currentTimeMs, durationMs)
  const start = Math.max(0, idx - radius)
  const end = Math.min(lyrics.length - 1, idx + radius)
  const seen = new Set<string>()
  const out: string[] = []
  for (let i = start; i <= end; i += 1) {
    const text = lyrics[i]?.text?.trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
  }
  return out
}

/** 去掉哼唱识别无关的空白与标点 */
export function normalizeLyricHumText(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[，。！？、；：「」『』""''（）()[\]【】《》…~～·,.!?;:'"`-]+/g, '')
    .toLowerCase()
}

function stripLyricHumFillers(text: string): string {
  return text
    .replace(/^(嗯+|啊+|哈+|哦+|呀+|呢+|哇+|嘿+|喔+|唔+|诶+|欸+|em+|um+|la+|啦+|呐+|哪+)+/giu, '')
    .replace(/(嗯+|啊+|哈+|哦+|呀+|呢+|哇+|嘿+|喔+|唔+|诶+|欸+|em+|um+|la+|啦+|呐+|哪+)+$/giu, '')
    .trim()
}

function longestCommonSubstringLen(a: string, b: string): number {
  if (!a || !b) return 0
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = new Array<number>(cols).fill(0)
  let best = 0
  for (let i = 1; i < rows; i += 1) {
    const cur = new Array<number>(cols).fill(0)
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1
        if (cur[j] > best) best = cur[j]
      }
    }
    prev = cur
  }
  return best
}

export type LyricHumMatchResult = {
  lyricLine: string
  score: number
  /** current | prev | next | nearby */
  relation: 'current' | 'prev' | 'next' | 'nearby'
  /** 匹配来自刚切走的歌（非当前播放） */
  fromRecentTrack?: SyncListeningRecentTrack
}

/** 用户消息与歌词行的近似匹配分（0~1+，越高越像哼唱） */
export function scoreLyricHumMatch(userMessage: string, lyricLine: string): number {
  const userRaw = stripLyricHumFillers(userMessage.trim())
  const lyricRaw = lyricLine.trim()
  if (!userRaw || !lyricRaw) return 0

  const user = normalizeLyricHumText(userRaw)
  const lyric = normalizeLyricHumText(lyricRaw)
  if (user.length < 2 || lyric.length < 2) return 0

  if (user === lyric) return 1.2

  if (lyric.includes(user)) {
    const cover = user.length / lyric.length
    if (user.length >= 2 && cover >= 0.35) return 0.75 + cover * 0.35
  }

  if (user.includes(lyric)) {
    const cover = lyric.length / user.length
    if (lyric.length >= 2 && cover >= 0.35) return 0.75 + cover * 0.35
  }

  const lcs = longestCommonSubstringLen(user, lyric)
  const minLen = Math.min(user.length, lyric.length)
  const ratio = lcs / minLen
  if (lcs >= 3 && ratio >= 0.62) return ratio
  if (lcs >= 4 && ratio >= 0.5) return ratio * 0.95

  return 0
}

export function detectLyricHumMatch(
  userMessage: string,
  lyrics: ParsedLyricLine[],
  currentTimeMs: number,
  durationMs: number,
): LyricHumMatchResult | null {
  const cleaned = extractUserMessageForLyricHum(userMessage)
  if (!cleaned || cleaned.length > 120) return null
  if (!lyrics.length) return null

  const ctx = lyricContextAtTime(lyrics, currentTimeMs, durationMs)
  const candidates: Array<{ line: string; relation: LyricHumMatchResult['relation'] }> = []

  if (ctx.current) candidates.push({ line: ctx.current, relation: 'current' })
  if (ctx.prev) candidates.push({ line: ctx.prev, relation: 'prev' })
  if (ctx.next) candidates.push({ line: ctx.next, relation: 'next' })

  for (const line of nearbyLyricLines(lyrics, currentTimeMs, durationMs, 3)) {
    if (candidates.some((c) => c.line === line)) continue
    candidates.push({ line, relation: 'nearby' })
  }

  let best: LyricHumMatchResult | null = null
  for (const candidate of candidates) {
    let score = scoreLyricHumMatch(cleaned, candidate.line)
    if (candidate.relation === 'current') score += 0.08
    else if (candidate.relation === 'next') score += 0.04
    else if (candidate.relation === 'prev') score += 0.02
    if (!best || score > best.score) {
      best = { lyricLine: candidate.line, score, relation: candidate.relation }
    }
  }

  if (!best || best.score < 0.68) return null
  return best
}

function detectLyricHumMatchWithRecents(
  userMessage: string,
  lyrics: ParsedLyricLine[],
  currentTimeMs: number,
  durationMs: number,
): LyricHumMatchResult | null {
  const current = detectLyricHumMatch(userMessage, lyrics, currentTimeMs, durationMs)
  let best = current

  for (const recent of getSyncListeningRecentTracks()) {
    const match = detectLyricHumMatch(
      userMessage,
      recent.lyrics,
      recent.lastPositionMs,
      recent.durationMs,
    )
    if (!match) continue
    const adjusted = { ...match, fromRecentTrack: recent }
    if (!best || adjusted.score > best.score) best = adjusted
  }

  return best
}

function buildSyncListeningRecentTracksBias(): string {
  const recent = getSyncListeningRecentTracks()
  if (!recent.length) return ''

  const lines = [
    '[一起听·刚听过的歌] 用户若问「刚才那首」，参照下列（**不是**此刻在播的）；**未问勿主动翻旧账聊上一首歌词**。',
  ]

  recent.forEach((track, index) => {
    lines.push(
      `${index + 1}. 《${track.title}》${track.artist ? ` — ${track.artist}` : ''}`,
    )
    if (track.lyricsExcerpt.trim()) {
      lines.push(`   歌词节选（仅用户提起时参考）：\n${track.lyricsExcerpt.trim()}`)
    }
  })

  lines.push('提起上一首时自然接话即可，勿报切歌前的具体时间，勿对旧歌词小题大作。')
  return lines.join('\n')
}

/** 去掉语音转写前缀等包装，只留用户原话 */
export function extractUserMessageForLyricHum(raw: string): string {
  let text = raw.trim()
  if (!text) return ''
  text = text.replace(/^（这是一条用户语音转写[^）]*）\n?/u, '').trim()
  return text
}

export type SyncListeningLyricHumBiasOptions = {
  forProactive?: boolean
}

/**
 * 若用户消息近似当前播放歌词，注入「用户在哼唱」偏向。
 */
export function buildSyncListeningLyricHumBias(
  characterId: string,
  userMessage: string,
  options?: SyncListeningLyricHumBiasOptions,
): string {
  if (options?.forProactive) return ''
  if (!isActiveSyncListeningWithCharacter(characterId)) return ''

  const { isPlaying, currentTrack, currentTimeMs, durationMs, lyrics } = useMusicStore.getState()
  const playingTitle = currentTrack?.title?.trim() || ''
  if (!isPlaying || !playingTitle || playingTitle === '暂无播放') return ''

  const cleaned = extractUserMessageForLyricHum(userMessage)
  if (!cleaned) return ''

  const match = detectLyricHumMatchWithRecents(cleaned, lyrics, currentTimeMs, durationMs)
  if (!match) return ''

  const title = match.fromRecentTrack?.title.trim() ?? playingTitle
  const ctx = match.fromRecentTrack
    ? lyricContextAtTime(
        match.fromRecentTrack.lyrics,
        match.fromRecentTrack.lastPositionMs,
        match.fromRecentTrack.durationMs,
      )
    : lyricContextAtTime(lyrics, currentTimeMs, durationMs)

  const lines = [
    '[一起听·哼唱识别] 用户消息像歌词哼唱/接唱，按默契接话即可，不必点破「你在唱歌词」。',
    `曲目：《${title}》`,
    `相关句：「${match.lyricLine}」`,
  ]

  if (ctx.next && ctx.next !== match.lyricLine) {
    lines.push(`可参考下一句：「${ctx.next}」`)
  } else if (ctx.current && ctx.current !== match.lyricLine) {
    lines.push(`可参考：「${ctx.current}」`)
  }

  lines.push('勿报时间进度；自然 echo 或接下一句即可。')

  return lines.join('\n')
}

function buildLyricTimelineBias(
  lyrics: ParsedLyricLine[],
  currentTimeMs: number,
  durationMs: number,
): string {
  if (!lyrics.length) return ''
  if (lyrics.length === 1 && lyrics[0]?.text === '暂无歌词') return ''
  const idx = activeLyricIndex(lyrics, currentTimeMs, durationMs)
  const start = Math.max(0, idx - 8)
  const end = Math.min(lyrics.length - 1, idx + 14)
  const lines = [
    '[一起听·歌词时间轴] 仅供内部跳进度；别把下列句子当对白主线，勿小题大作：',
  ]
  for (let i = start; i <= end; i += 1) {
    const row = lyrics[i]!
    const text = row.text.trim()
    if (!text) continue
    lines.push(`[${formatLyricTime(row.timeMs)}] ${text}`)
  }
  return lines.join('\n')
}

/**
 * 一起听实时进度 bias：在角色每轮回复前注入，使其知晓用户此刻播放到哪一句。
 * 非真实听音频，而是读取播放器 currentTime + LRC 行。
 */
export type SyncListeningPlaybackBiasOptions = {
  /** 角色主动开口：仍注入进度供理解歌词，但对白禁止报时 */
  forProactive?: boolean
}

export function buildSyncListeningPlaybackBias(
  characterId: string,
  options?: SyncListeningPlaybackBiasOptions,
): string {
  if (!isActiveSyncListeningWithCharacter(characterId)) return ''

  const { currentTrack, currentTimeMs, durationMs, isPlaying, lyrics } = useMusicStore.getState()
  const title = currentTrack?.title?.trim() || ''
  const trackAlive = Boolean(title && title !== '暂无播放')

  /** 曲目已清掉 / 播放器空闲：共听名义可能还在，但不再当作「正在一起听」 */
  if (!trackAlive) {
    return [
      '[一起听·状态] 用户已停止播放（当前无在播曲目）。**不要**假装还在一起听、接唱或聊进度；可自然换话题。若用户仍想听歌，等其再开播放或你发 `共听邀请`。',
      '禁止 `点歌` / `跳进度` / `切下一首` / `切上一首`，直至用户再次真正开始共听播放。',
    ].join('\n')
  }

  const artist = currentTrack?.artist?.trim()
  const pos = formatLyricTime(currentTimeMs)
  const dur = durationMs > 0 ? formatLyricTime(durationMs) : '未知'
  const status = isPlaying ? '播放中' : '已暂停'

  const lines = [
    isPlaying
      ? '[一起听·背景] 你正与用户同步听同一首歌（以下为客户端参考，不是你真的听到声音；**勿在对白里报进度/时间码**）。'
      : '[一起听·背景] 共听会话仍在，但用户**已暂停播放**（以下为客户端参考；**勿在对白里报进度/时间码**）。',
    `曲目：《${title}》${artist ? ` — ${artist}` : ''}`,
    `内部参考：${pos} / ${dur}（${status}）`,
  ]

  if (isPlaying) {
    const ctx = lyricContextAtTime(lyrics, currentTimeMs, durationMs)
    if (ctx.current) {
      lines.push(`内部·附近歌词（轻参考，勿小题大作）：「${ctx.current}」`)
      if (ctx.prev) lines.push(`内部·上一句：「${ctx.prev}」`)
      if (ctx.next) lines.push(`内部·下一句：「${ctx.next}」`)
    }

    const timeline = buildLyricTimelineBias(lyrics, currentTimeMs, durationMs)
    if (timeline.trim()) {
      lines.push(timeline)
    }

    lines.push(
      '【歌词分寸】歌词/时间轴是静默参考，别太当回事：勿每轮点评、勿因某句吃飞醋、勿引申成剧情审讯、勿叫用户跳过某段。',
      '优先读**用户当下情绪与话题**（开心就轻快接、低落就温柔接、在吐槽就顺着聊），共听只是背景；歌词最多偶尔轻点氛围，点到为止。',
      '用户没提歌词、也没哼唱时：不要大段引用或深挖歌词意思；若情绪正好对上歌感，可轻轻带一句氛围，仍以用户情绪为准。',
      '用户明确聊歌词、哼唱接近歌词、或问进度时：再自然接歌词；仍禁止报时间码。',
    )
    if (options?.forProactive) {
      lines.push(
        '【主动开口】禁止报时；可按用户近期情绪轻开口，歌名/氛围点到为止，别把歌词当正经事深挖或吃醋。',
      )
    }
  } else {
    lines.push(
      '用户已暂停：勿接唱、勿假装歌还在播、勿主动继续「接着聊这首/这句歌词」。',
      '用户若自己还提这首歌，可简短接话；否则优先跟用户当前话题，不要把对话拉回听歌。',
    )
    if (options?.forProactive) {
      lines.push('【主动开口】播放已暂停，不要因共听名义主动找用户聊歌。')
    }
  }

  const recentBias = buildSyncListeningRecentTracksBias()
  if (recentBias.trim()) {
    lines.push(recentBias)
  }

  return lines.join('\n')
}
