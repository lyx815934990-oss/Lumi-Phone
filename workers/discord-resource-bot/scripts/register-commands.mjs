/**
 * 本机注册（国内常超时）。推荐改用浏览器：
 * https://discord-resource-bot.xxx.workers.dev/register-commands?key=BotToken
 */

const token = process.env.DISCORD_BOT_TOKEN?.trim()
const appId = process.env.DISCORD_APPLICATION_ID?.trim()
const guildId = process.env.DISCORD_GUILD_ID?.trim()

if (!token || !appId || !guildId) {
  console.error('需要环境变量：DISCORD_BOT_TOKEN、DISCORD_APPLICATION_ID、DISCORD_GUILD_ID')
  process.exit(1)
}

const commands = [
  {
    name: '分享资源',
    description: '在论坛帖内挂载链接和/或最多 5 个文件',
    options: [
      { type: 3, name: '标题', description: '资源标题', required: true, max_length: 100 },
      { type: 3, name: '链接', description: '资源链接（可选）', required: false },
      { type: 11, name: '文件1', description: '上传文件 1', required: false },
      { type: 11, name: '文件2', description: '上传文件 2', required: false },
      { type: 11, name: '文件3', description: '上传文件 3', required: false },
      { type: 11, name: '文件4', description: '上传文件 4', required: false },
      { type: 11, name: '文件5', description: '上传文件 5', required: false },
      { type: 3, name: '说明', description: '补充说明（可选）', required: false, max_length: 500 },
    ],
  },
  {
    name: '查看资源下载记录',
    description: '弹窗筛选下载溯源，并可一键打开私信',
  },
]

const url = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
const res = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(commands),
})

if (!res.ok) {
  console.error('注册失败：', res.status, await res.text())
  process.exit(1)
}

console.log('已注册：/分享资源（链接+文件1～5）· /查看资源下载记录')
