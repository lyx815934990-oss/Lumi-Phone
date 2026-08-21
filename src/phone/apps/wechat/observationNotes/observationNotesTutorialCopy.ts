/** 私藏侧写 · 文字教程（列表页 / 档案页分开，高亮引导同源） */

export type ObsNotesTutorialSection = { title: string; body: string }

/** 联系人列表（预览）页：总览 + 自动更新 */
export const OBS_NOTES_HUB_TUTORIAL_SECTIONS: ObsNotesTutorialSection[] = [
  {
    title: '这是什么',
    body: '私藏侧写是「角色眼里的你」：姓名称呼、喜好雷点、性向身体亲密偏好（节奏/XP/敏感处/方式）、人格/能力判定、线上备注等。它规范 char 怎么看待、称呼、对待 user，和人生账本（剧情事实/资产）同级但分工不同——侧写管态度与认知，账本管客观现状。具体心动瞬间与深刻往事交给向量记忆召回，不写进侧写。',
  },
  {
    title: '有什么用',
    body: '开启后会注入聊天与线下约会提示词，让角色记得你喜欢什么、怎么叫你，避免每轮失忆或用过时印象抬杠。你改口时，侧写会跟着改，可嘴硬认怂再更新字段。',
  },
  {
    title: '开启「自动更新」时',
    body: '列表里给某角色打开自动更新后：线上私聊与线下约会的同一次主回复，模型可顺带交卷整理侧写（改称呼、修正偏好等）。体验是聊着聊着，档案会跟着变新，少点手动整理。',
  },
  {
    title: '关闭自动更新时',
    body: '关掉后，对话仍可注入「当前已有」侧写，但本轮不会自动改写。内容停在上次手动更新或自动写入的结果。适合想锁死认知时。',
  },
  {
    title: '点击卡片看详情',
    body: '列表里每一位联系人都是一张可点的角色卡片：点头像、名字或整块卡片，即可进入该角色的侧写详情，翻亲密偏好、判定等全文。右侧「自动更新」开关只负责开/关整理，不会打开档案。',
  },
  {
    title: '怎么再看说明',
    body: '本页标题栏「教程」可随时打开；也可再走一遍列表页高亮引导。打开某位联系人后，档案页另有针对手动更新等内容的说明。',
  },
]

/** 档案详情页：手动整理 / 字段 / 回滚（不重复总览） */
export const OBS_NOTES_DETAIL_TUTORIAL_SECTIONS: ObsNotesTutorialSection[] = [
  {
    title: '手动更新',
    body: '标题栏「手动更新」会先确认，再按线上/线下近端各 10 轮模型输出 + 最新侧写原稿/上一版对照**整份重写**并覆盖旧档。不读向量记忆与长期记忆。事实栏按本轮材料重判：没依据的写成「暂时不知道」，禁止照抄无证据的旧亲密认知。',
  },
  {
    title: '更新历史',
    body: '「历史」可对照相对上一版改了哪些字段，方便查看「我以为…我记住了」一类修正。',
  },
  {
    title: '删剧情会回滚吗',
    body: '线下约会若本轮改过侧写，删除该段剧情后会按剩余轮次重放，尽量回到删段前的侧写版本（仅对之后新生成且确实写过侧写的轮次生效）。',
  },
  {
    title: '怎么再看说明',
    body: '本页标题栏「教程」可随时打开档案相关说明，或再走一遍本页高亮。总览与自动更新开/关差异请回列表页点教程查看。',
  },
]

export function obsNotesHubTutorialBody(title: string): string {
  return OBS_NOTES_HUB_TUTORIAL_SECTIONS.find((s) => s.title === title)?.body ?? ''
}

export function obsNotesDetailTutorialBody(title: string): string {
  return OBS_NOTES_DETAIL_TUTORIAL_SECTIONS.find((s) => s.title === title)?.body ?? ''
}
