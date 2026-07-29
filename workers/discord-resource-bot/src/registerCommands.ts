import type { Env } from './types'

const COMMANDS = [
  {
    name: '分享资源',
    description: '在论坛帖内挂载链接和/或最多 5 个文件',
    options: [
      {
        type: 3,
        name: '标题',
        description: '资源标题',
        required: true,
        max_length: 100,
      },
      {
        type: 3,
        name: '链接',
        description: '资源链接（网盘/网页等，可选）',
        required: false,
      },
      {
        type: 11,
        name: '文件1',
        description: '上传文件 1（JSON/Word/TXT 等）',
        required: false,
      },
      {
        type: 11,
        name: '文件2',
        description: '上传文件 2',
        required: false,
      },
      {
        type: 11,
        name: '文件3',
        description: '上传文件 3',
        required: false,
      },
      {
        type: 11,
        name: '文件4',
        description: '上传文件 4',
        required: false,
      },
      {
        type: 11,
        name: '文件5',
        description: '上传文件 5',
        required: false,
      },
      {
        type: 3,
        name: '说明',
        description: '补充说明（可选）',
        required: false,
        max_length: 500,
      },
    ],
  },
  {
    name: '查看资源下载记录',
    description: '弹窗筛选下载溯源，并可一键打开私信',
  },
]

/** 通过 Cloudflare 调 Discord API 注册命令（避免国内本机连不上 Discord） */
export async function registerGuildCommands(env: Env) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_APPLICATION_ID || !env.DISCORD_GUILD_ID) {
    throw new Error('缺少 DISCORD_BOT_TOKEN / DISCORD_APPLICATION_ID / DISCORD_GUILD_ID')
  }

  const url = `https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Discord 注册失败 ${res.status}: ${text}`)
  }

  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // keep text
  }

  return {
    ok: true,
    guildId: env.DISCORD_GUILD_ID,
    applicationId: env.DISCORD_APPLICATION_ID,
    commands: Array.isArray(body)
      ? body.map((c: { name?: string }) => c.name)
      : ['分享资源', '查看资源下载记录'],
    tip: '现已支持：链接 + 文件1～文件5（可多选）',
  }
}
