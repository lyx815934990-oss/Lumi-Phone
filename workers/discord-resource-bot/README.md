# Discord 论坛资源 Bot（Cloudflare Workers）

和 [lumi-gate](https://lumi-gate.lyx815934990.workers.dev/) 一样挂在 **Cloudflare** 上。  
用 Discord **HTTP Interactions**（不是常驻 WebSocket），适合 Workers。

## 功能

- `/分享资源`：在**论坛帖**内挂载**资源链接**（网盘 / 网页等；JSON、Word、TXT 请先传到网盘再填链接）
- 下载者须先给帖子**首条消息**添加**任意反应**，再点「获取资源」（仅本人可见）
- `/查看资源下载记录`：发帖人查看下载名单（仅本人可见）
- 元数据与下载记录存 **D1**（**不需要 R2 / 不需要绑银行卡**）

---

## 一、准备 Discord 应用

建议使用**已经在社区里、能管身份组的那只 Bot**（例如「Lumi 审核员」），不要用「Lumi的登录系统」。

1. [Discord Developer Portal](https://discord.com/developers/applications) → 打开该 Application  
2. 复制：
   - **Application ID** → `DISCORD_APPLICATION_ID`
   - **Public Key**（General Information）→ `DISCORD_PUBLIC_KEY`
   - **Bot Token** → `DISCORD_BOT_TOKEN`
3. Bot 权限建议：`Send Messages`、`Embed Links`、`Attach Files`、`Read Message History`、`Use Application Commands`
4. 确认 Bot 已在服务器内，且能访问论坛频道

---

## 二、部署到 Cloudflare

在本目录执行：

```bash
cd workers/discord-resource-bot
npm install

# 1) 创建 D1（若已创建可跳过）
npx wrangler d1 create discord-resource-bot
# 把输出的 database_id 填进 wrangler.toml

# 2) 编辑 wrangler.toml
#    DISCORD_GUILD_ID = 你们服务器 ID
#    DISCORD_APPLICATION_ID = Application ID
#    database_id = 上一步的 ID

# 3) 写入密钥
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN

# 4) 建表 + 部署
npm run db:migrate:remote
npm run deploy
```

部署成功后会得到类似：

`https://discord-resource-bot.<子域>.workers.dev`

---

## 三、接到 Discord（关键）

1. Developer Portal → 你的 Application → **General Information**  
2. **Interactions Endpoint URL** 填：

```text
https://discord-resource-bot.<子域>.workers.dev/interactions
```

3. 保存；Discord 会发 PING，Worker 回 PONG，显示 Verified  

> 注意：一个 Application **只能有一个** Interactions Endpoint。  
> 若这只 Bot 以后还要接别的交互，需合并到同一 Worker，或换另一只专用 Bot。

---

## 四、注册斜杠命令

```bash
# Windows PowerShell 示例
$env:DISCORD_BOT_TOKEN="你的Token"
$env:DISCORD_APPLICATION_ID="你的ApplicationID"
$env:DISCORD_GUILD_ID="你的服务器ID"
npm run register-commands
```

然后在论坛帖里输入 `/`，应看到 `分享资源`、`查看资源下载记录`。

---

## 五、使用方式

发帖人（论坛帖内）：

```text
/分享资源 标题:设定包 链接:https://...
```

下载者：给**首楼**任意反应 → 点「获取资源」  

发帖人：

```text
/查看资源下载记录
```

---

## 和本仓库其它东西的关系

| 服务 | 作用 |
|------|------|
| `lumi-gate`（已有 CF） | 网页答题 + **发放**身份组 |
| `user-system-api`（CF） | App 登录时**检查**身份组 |
| **本 Worker** | 论坛资源分享 / 下载统计 |

三者都可在 Cloudflare，但职责不同；本 Worker **不替代** lumi-gate。

---

## 本地调试

```bash
npm run db:migrate
npm run dev
```

Interactions 本地调试需内网穿透或用 `wrangler` + Discord 临时 URL；一般直接 deploy 更省事。
