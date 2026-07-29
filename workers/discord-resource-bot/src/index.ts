import {
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from './discord'
import {
  buildDownloadsQueryModal,
  handleDownloadsModalSubmit,
  handleGetResourceButton,
  handleShareResource,
  isDownloadsModalSubmit,
  isGetResourceButton,
} from './handlers'
import { registerGuildCommands } from './registerCommands'
import { jsonResponse, verifyDiscordRequest, type Env } from './types'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return jsonResponse({
        ok: true,
        service: 'discord-resource-bot',
        hint: 'POST /interactions · GET /register-commands?key=BotToken',
      })
    }

    if (request.method === 'GET' && url.pathname === '/register-commands') {
      const key = url.searchParams.get('key')?.trim() || ''
      if (!key || key !== env.DISCORD_BOT_TOKEN) {
        return jsonResponse({ ok: false, error: 'unauthorized' }, 401)
      }
      try {
        const result = await registerGuildCommands(env)
        return jsonResponse(result)
      } catch (error) {
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          500,
        )
      }
    }

    if (request.method !== 'POST' || url.pathname !== '/interactions') {
      return new Response('Not Found', { status: 404 })
    }

    if (!env.DISCORD_PUBLIC_KEY || !env.DISCORD_BOT_TOKEN || !env.DISCORD_APPLICATION_ID) {
      return jsonResponse({ error: 'missing discord secrets/vars' }, 500)
    }

    const verified = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY)
    if (!verified.ok) {
      return new Response('Bad request signature.', { status: 401 })
    }

    const interaction = JSON.parse(verified.body) as {
      type: number
      token: string
      application_id?: string
      data?: { name?: string; custom_id?: string; components?: unknown[] }
      channel_id?: string
      guild_id?: string
      member?: { user: { id: string; username: string; global_name?: string | null } }
      user?: { id: string; username: string; global_name?: string | null }
      id: string
    }

    if (interaction.type === InteractionType.Ping) {
      return jsonResponse({ type: InteractionResponseType.Pong })
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      const name = interaction.data?.name
      if (name === '分享资源' || name === 'share-resource') {
        ctx.waitUntil(
          handleShareResource(env, interaction).catch((error) => {
            console.error('分享资源未捕获错误', error)
          }),
        )
        return jsonResponse({
          type: InteractionResponseType.DeferredChannelMessageWithSource,
          data: { flags: MessageFlags.Ephemeral },
        })
      }
      if (name === '查看资源下载记录' || name === 'my-downloads') {
        // 弹窗必须直接返回，不能 deferred
        return jsonResponse({
          type: InteractionResponseType.Modal,
          data: buildDownloadsQueryModal(),
        })
      }
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '未知命令。', flags: MessageFlags.Ephemeral },
      })
    }

    if (interaction.type === InteractionType.ModalSubmit && isDownloadsModalSubmit(interaction)) {
      ctx.waitUntil(
        handleDownloadsModalSubmit(env, interaction).catch((error) => {
          console.error('下载溯源弹窗未捕获错误', error)
        }),
      )
      return jsonResponse({
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
      })
    }

    if (interaction.type === InteractionType.MessageComponent && isGetResourceButton(interaction)) {
      ctx.waitUntil(
        handleGetResourceButton(env, interaction).catch((error) => {
          console.error('获取资源未捕获错误', error)
        }),
      )
      return jsonResponse({
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
      })
    }

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: '未处理的交互。', flags: MessageFlags.Ephemeral },
    })
  },
}
