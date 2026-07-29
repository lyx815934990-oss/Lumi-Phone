import {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js'
import { config } from './config.js'

const commands = [
  new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('在本频道发布入门验证面板（仅管理员）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('分享资源')
    .setDescription('在论坛帖内挂载资源（链接和/或上传文档）')
    .addStringOption((opt) =>
      opt.setName('标题').setDescription('资源标题').setRequired(true).setMaxLength(100),
    )
    .addStringOption((opt) =>
      opt.setName('链接').setDescription('资源链接（网盘/网页等，可选）').setRequired(false),
    )
    .addAttachmentOption((opt) =>
      opt.setName('文件').setDescription('上传文件：JSON / Word / TXT 等（可选）').setRequired(false),
    )
    .addStringOption((opt) =>
      opt.setName('说明').setDescription('补充说明（可选）').setRequired(false).setMaxLength(500),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('查看资源下载记录')
    .setDescription('查看谁下载了你分享的资源（仅自己可见）')
    .addStringOption((opt) =>
      opt
        .setName('资源编号')
        .setDescription('可选：只看某一个资源编号的下载名单')
        .setRequired(false),
    )
    .toJSON(),
]

const rest = new REST({ version: '10' }).setToken(config.token)

export async function registerCommands() {
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commands,
  })
  console.log(
    `已在服务器 ${config.guildId} 注册斜杠命令：/setup-verify · /分享资源 · /查看资源下载记录`,
  )
}

const isDirectRun = process.argv[1]?.endsWith('register-commands.js')
if (isDirectRun) {
  await registerCommands()
}
