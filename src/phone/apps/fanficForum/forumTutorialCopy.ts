/** 同人通讯社 · 文字教程（与高亮引导共用段落） */

export type ForumTutorialSection = { title: string; body: string }

export const FORUM_HUB_TUTORIAL_SECTIONS: ForumTutorialSection[] = [
  {
    title: '这是什么',
    body: '同人通讯社是发现页里的同人创作社区：看网友代笔的本命/选角同人文，点赞评论互动，也可把整篇文连同楼评转发到微信私聊，和角色一起聊这篇文。',
  },
  {
    title: '首页与探索',
    body: '「首页」是通讯社电讯与通讯录角色入口；「探索」按时间刷已有帖子。点标题进详情，点写手名可进大咖主页约稿。',
  },
  {
    title: '如何生成同人文',
    body: '点左下角「投稿」：①「请网友写 · 本命」选通讯录好友，按你们的公开互动生成本命同人；②「请网友写 · 搜索原作角色」可搜原作多选角色、写一句想看的梗再生成。生成后会出现在对应角色板或广场板上。',
  },
  {
    title: '自己写 · 开发中',
    body: '投稿台里的「自己写 · 发帖」目前锁定为开发中，暂不能手写发帖。现阶段请用「请网友写」两条路径生成。开放后会在同一入口解锁。',
  },
  {
    title: '点赞与互动',
    body: '进帖子详情后可给正文点赞，也可给一级评论 / 楼中楼点赞与回复。私信 Tab 会收到点赞、评论等互动通知，以及网友私信；角标表示未读。',
  },
  {
    title: '转发到微信好友',
    body: '帖子详情右上角分享：选通讯录角色后，会在对方微信私聊里放下「同人通讯社」卡片。卡片自带正文、作者的话、楼评（含楼中楼）与点赞数据，方便和 TA 讨论这篇文。',
  },
  {
    title: '怎么再看说明',
    body: '首页左上角「关闭」旁的「教程」可随时打开本说明，或再走一遍界面高亮引导。',
  },
]

export const FORUM_POST_TUTORIAL_SECTIONS: ForumTutorialSection[] = [
  {
    title: '帖子详情',
    body: '这里是同人全文：作者的话、正文、点赞与楼下评论。可回复一级评论形成楼中楼。',
  },
  {
    title: '点赞与评论',
    body: '正文下方爱心为帖子点赞；评论区每条也可点赞。点「回复」可盖楼。示例帖可能仅供浏览。',
  },
  {
    title: '分享到微信',
    body: '右上角分享图标：发给通讯录好友后，私聊会出现同人卡片，点开可看全文与楼评，角色也能读到分享内容一起聊。',
  },
]

export function forumHubTutorialBody(title: string): string {
  return FORUM_HUB_TUTORIAL_SECTIONS.find((s) => s.title === title)?.body ?? ''
}

export function forumPostTutorialBody(title: string): string {
  return FORUM_POST_TUTORIAL_SECTIONS.find((s) => s.title === title)?.body ?? ''
}
