/** 同人通讯社 · 界面高亮引导 */

import type { MemoryCoachStep } from '../wechat/memory/memoryCoachTypes'
import { forumHubTutorialBody, forumPostTutorialBody } from './forumTutorialCopy'

export const FORUM_COACH_TARGET_ATTR = 'data-forum-coach'
export const FORUM_COACH_ROOT_ATTR = 'data-forum-coach-root'
export const FORUM_HUB_COACH_SCOPE = 'fanfic-forum-hub'
export const FORUM_POST_COACH_SCOPE = 'fanfic-forum-post'

/** v1：生成 / 自写锁定 / 互动 / 转发微信 */
export const FORUM_HUB_COACH_SEEN_KEY = 'fanfic-forum-hub-coach-completed-v1'
export const FORUM_POST_COACH_SEEN_KEY = 'fanfic-forum-post-coach-completed-v1'

/** 这些步骤需要打开投稿台才能高亮到选项 */
export const FORUM_HUB_COACH_PUBLISH_SHEET_TARGETS = new Set([
  'forum-publish-ship',
  'forum-publish-custom',
  'forum-publish-self',
])

export const FORUM_HUB_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: null,
    centered: true,
    title: '欢迎来到同人通讯社',
    body: forumHubTutorialBody('这是什么'),
  },
  {
    target: 'forum-masthead',
    title: '首页电讯',
    body: forumHubTutorialBody('首页与探索'),
    cardPlacement: 'below',
  },
  {
    target: 'forum-feed',
    title: '同人文列表',
    body: '这里是已生成的同人文头条。点标题进详情可读全文、点赞评论；点写手名可进大咖主页约稿。',
    cardPlacement: 'below',
  },
  {
    target: 'forum-publish-fab',
    title: '投稿入口',
    body: '想生成新同人文？点左下角「投稿」打开发布台。',
    cardPlacement: 'above',
  },
  {
    target: 'forum-publish-ship',
    title: '请网友写 · 本命',
    body: '选通讯录好友，按公开互动生成你与 TA 的本命同人文。这是最常用的生成方式。',
    cardPlacement: 'below',
  },
  {
    target: 'forum-publish-custom',
    title: '请网友写 · 原作选角',
    body: '不依赖通讯录：搜索原作角色、多选、写一句想看的梗，请网友人格代笔。',
    cardPlacement: 'below',
  },
  {
    target: 'forum-publish-self',
    title: '自己写 · 开发中',
    body: forumHubTutorialBody('自己写 · 开发中'),
    cardPlacement: 'below',
  },
  {
    target: 'forum-tabs',
    title: '底部导航',
    body: '首页 / 探索刷帖；私信看互动通知与网友私信；个人改笔名、看关注的大咖。',
    cardPlacement: 'above',
  },
  {
    target: 'forum-tab-messages',
    title: '私信与互动',
    body: forumHubTutorialBody('点赞与互动'),
    cardPlacement: 'above',
  },
  {
    target: null,
    centered: true,
    title: '转发到微信好友',
    body: forumHubTutorialBody('转发到微信好友'),
  },
  {
    target: 'forum-tutorial',
    title: '教程在这里',
    body: forumHubTutorialBody('怎么再看说明'),
    cardPlacement: 'below',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '可以开始玩了',
    body: '先点「投稿」生成一篇，或打开已有电讯练手点赞与分享。进帖子详情时还会有一次短指引。',
  },
]

export const FORUM_POST_COACH_STEPS: MemoryCoachStep[] = [
  {
    target: null,
    centered: true,
    title: '帖子详情',
    body: forumPostTutorialBody('帖子详情'),
  },
  {
    target: 'forum-post-like',
    title: '点赞与评论',
    body: forumPostTutorialBody('点赞与评论'),
    cardPlacement: 'above',
  },
  {
    target: 'forum-post-share',
    title: '分享到微信',
    body: forumPostTutorialBody('分享到微信'),
    cardPlacement: 'below',
  },
  {
    target: null,
    centered: true,
    isOutro: true,
    title: '就这些',
    body: '点右上角分享发给通讯录好友后，私聊里会出现同人卡片；角色也能看到正文、作者的话和楼评。',
  },
]
