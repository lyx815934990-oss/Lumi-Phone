import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from 'discord.js'
import { config } from './config.js'
import { registerCommands } from './register-commands.js'
import { handleSetupVerifyCommand, handleVerifyInteraction } from './verifyHandler.js'
import { handleResourceInteraction } from './resourceHandler.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
})

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await registerCommands()
  } catch (error) {
    console.error('注册斜杠命令失败：', error)
  }
  console.log(`验证机器人已上线：${readyClient.user.tag}`)
  console.log(`服务器：${config.guildId} · 身份组：${config.verifiedRoleId || config.verifiedRoleName}`)
  console.log('资源分享：论坛帖内 /分享资源 · 查下载 /查看资源下载记录')
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (await handleSetupVerifyCommand(interaction)) return
    if (await handleVerifyInteraction(interaction)) return
    if (await handleResourceInteraction(interaction)) return
  } catch (error) {
    console.error('处理交互失败：', error)
    const payload = { content: '处理失败，请稍后重试或联系管理员。', ephemeral: true }
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {})
      } else {
        await interaction.reply(payload).catch(() => {})
      }
    }
  }
})

client.login(config.token)
