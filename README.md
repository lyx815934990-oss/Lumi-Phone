# React + TypeScript + Vite

## 近期改动同步

### 微信 · 语音通话（接通后）
- 等待接听页：底部仅保留挂断按钮。
- 居中文稿改为歌词页：一行一条，user/char 分色，顶部渐隐，可上下滑看历史。
- **底栏三键**：功能整合 / 按住说话 / 挂断；自动合成、键盘、免提、记录、绑音色收进「功能」。
- **自动合成默认关闭**：歌词旁播放键为轻量透明样式；点 ▶ 按需合成；功能里开「自动」仍弹确认（计费连播）。
- 关闭自动后可一条条手动生成；通话音频在拨打/接听时解锁，开场白与后续条共用播放桥。
- 模型尾声 `[EPILOGUE] / 无变化` 等协议块会从通话正文剥离；回复按短句拆成多条语音条。
- **全局悬浮通话球**：最小化后挂在 PhoneShell，切到桌面或其他 App 仍可拖动显示；点击会拉回微信并展开通话。
- **发送逻辑对齐线上**：回车只把内容发到通话页；点「发送」会催回复；空回车/空点「回复」在上一条是用户时催角色继续说；按住说话同样只上屏不自动催。
- **语音识别内置**：SenseVoice 已内置，私聊与通话「按住说话」无需再配副接口；可识别语气情感并注入角色回复。
- **向量记忆默认**：语义召回固定走内置硅基流动 `BAAI/bge-m3`，配置页只保留开关与口语说明，无需再填 Key / 选本地。
- **控制台提示**：私聊当轮回复会打 `[向量记忆] 本轮调用成功/失败/未调用…` 日志，便于确认本轮是否跑通向量召回。

---

## Lumi Pulse（微博模拟）

- 路径：`src/phone/apps/lumiPulse/`
- 视觉：Soft Pastel Light Luxury（暖白 `#FCFCFC`、烟粉 `#E5989B`、雾霾蓝 `#A2B2C6`）
- 四 Tab：首页 / 发现 / 消息 / 我；数据按 `currentPOVId` 隔离
- 组件：`PostCard`、`TrendingItem`、`NotificationCell`、`MediaWaterfall`

---

- `wechatChatAi.ts` 中 `splitInlineStickerPayloadsFromPlainText`：续行无 `<<SPEAKER>>` 时，多行会合并为一段。若**整段**没有 `[表情包]` 标记，旧逻辑会整段视为**一条**气泡，导致多行/表情包全挤在一条里。现改为**始终**先按换行切物理行，再对每行做行内 `[表情包]` 拆分，与解析层 `count=17` 的拆分意图一致。

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
