# Lumi Discord 入门验证机器人

在 Discord 频道内完成验证：**按钮答题、仅本人可见（Ephemeral）、10 题全对自动给身份组**。  
同时支持论坛资源分享（本目录为 Node 常驻版）。

> **推荐**：若要和 lumi-gate 一样挂在 Cloudflare，请用  
> [`workers/discord-resource-bot`](../workers/discord-resource-bot/README.md)（HTTP Interactions + D1/R2）。

不依赖 RoleLogic；本目录可部署到 **Render Worker** 或本机常驻运行。

---

## 功能

### 入门验证
- `#验证区` 发布验证面板（`/setup-verify`）
- 用户点「开始验证」→ 确认已读公告 → **10 道选择题**（按钮作答）
- 全程 **仅答题者本人可见**
- **全部答对** → 自动添加 `Lumi`（或你配置的身份组）

### 论坛资源分享（新）
- 在**论坛帖**内使用 `/share-resource`：可填链接、上传 JSON/Word/TXT 等文件，或两者都有
- 下载者须先给帖子**首条消息添加任意反应**，再点「获取资源」
- 资源以 **仅本人可见** 方式下发；机器人记录下载者
- 发帖人用 `/my-downloads`（仅自己可见）查看谁下载了自己的资源

---

## 一、Discord 开发者后台

1. 打开 [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. 左侧 **Bot** → **Add Bot** → 复制 **Token**（即 `DISCORD_TOKEN`）
3. 开启 **SERVER MEMBERS INTENT**
4. 左侧 **OAuth2 → General**：复制 **Client ID**（即 `DISCORD_CLIENT_ID`）
5. **OAuth2 → URL Generator**：
   - Scopes：`bot`、`applications.commands`
   - Permissions：`Manage Roles`、`Send Messages`、`Embed Links`、`Read Message History`、`Attach Files`、`Add Reactions`（可选）
   - 用生成的链接把机器人拉进你的服务器

### 服务器内设置

1. 创建身份组 **Lumi**（或沿用现有验证组）
2. **把机器人身份组拖到 Lumi 上面**
3. `#项目链接`：`@everyone` 关闭查看，**Lumi** 开启查看
4. 复制 **服务器 ID**、**Lumi 身份组 ID**（开发者模式右键复制）
5. 确认机器人能进入你们的**论坛频道**，并有发消息、读历史权限

---

## 二、本地试运行（可选）

```bash
cd discord-verify-bot
cp .env.example .env
# 编辑 .env 填入 Token、Client ID、GUILD_ID、VERIFIED_ROLE_ID

npm install
npm start
```

日志出现 `验证机器人已上线` 且包含 `/share-resource · /my-downloads` 即表示命令已注册。

---

## 三、论坛资源：怎么用

### 发帖人挂载资源

1. 打开论坛里的某个帖子（进入帖子线程）
2. 输入斜杠命令，例如：

```text
/share-resource title:角色卡模板 link:https://example.com/pack note:请勿二次分发
```

或只上传文件：

```text
/share-resource title:设定文档 file:(选择 .json / .docx / .txt)
```

链接和文件可以同时填。

3. 机器人会在帖子里发出「获取资源」面板

### 下载者领取

1. 给该帖**首条消息**点任意反应（👍、❤️ 或其他表情均可）
2. 点击面板上的 **获取资源**
3. 机器人以**仅你可见**的方式发送链接和/或文件

### 发帖人查看下载名单

```text
/my-downloads
```

或只看某一个资源：

```text
/my-downloads resource_id:资源ID
```

名单仅命令使用者自己可见。

---

## 四、云托管（选一种）

### 方案 A：Render（付费）

1. [render.com](https://render.com) → **New +** → **Background Worker**
2. 连仓库，**Root Directory** 填 `discord-verify-bot`
3. Build：`npm install`，Start：`npm start`
4. 填环境变量（见下文）
5. Deploy 后看 Logs 有 `验证机器人已上线`

> 注意：Render 磁盘默认不持久。重新部署后，本地缓存的上传文件与下载记录可能丢失。若需要长期保留，后续可接到数据库 / R2。

### 方案 B：免费 Discord 机器人面板

上传 `discord-verify-bot`（不要上传 `.env`），环境变量与本地相同，启动 `npm start`。

### 方案 C：本机常开

国内直连 Discord 可能超时，需稳定代理；电脑关机 bot 即下线。

---

## 五、上线后操作（验证区）

1. 确认服务 Running
2. 在 `#验证区` 执行 **`/setup-verify`**（需管理员）
3. 置顶验证面板

---

## 六、修改题目

编辑 `questions.json` 后重启服务或重新 Deploy。

---

## 七、环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DISCORD_TOKEN` | ✅ | Bot Token |
| `DISCORD_CLIENT_ID` | ✅ | Application ID |
| `GUILD_ID` | ✅ | 服务器 ID |
| `VERIFIED_ROLE_ID` | ✅* | 验证通过后给的身份组 ID |
| `VERIFIED_ROLE_NAME` | ✅* | 无 ID 时用名称匹配，默认 `Lumi` |
| `COOLDOWN_MINUTES` | | 答错冷却，默认 10 |
| `ANNOUNCE_CHANNEL_ID` | | 预留，暂未使用 |

\* `VERIFIED_ROLE_ID` 与 `VERIFIED_ROLE_NAME` 至少配置一种；**推荐用 ID**。

---

## 八、常见问题

### `/share-resource` 提示要在论坛帖内使用
必须先进入论坛频道里的某个帖子线程，再输入命令；不能在普通文字频道使用。

### 点了「获取资源」提示先添加反应
请给帖子**最上方那条首楼消息**加表情，而不是给机器人面板消息加点赞。

### `/share-resource` / `/my-downloads` 不显示
等 1～2 分钟或重启 bot（启动时会自动注册命令）。

### 全对但没有身份组
- 机器人身份组是否在 **Lumi 上面**
- `VERIFIED_ROLE_ID` 是否填对

---

## 文件结构

```
discord-verify-bot/
  package.json
  questions.json
  render.yaml
  .env.example
  data/                 # 下载记录与上传文件缓存（勿提交 secrets）
  src/
    index.js
    config.js
    register-commands.js
    verifyHandler.js
    resourceHandler.js  # 论坛资源分享
    resourceStore.js
```

---

## 许可

与 Lumi 项目配套使用，MIT。
