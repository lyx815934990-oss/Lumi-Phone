/**
 * 大富翁场上吐槽台词库（与 aiTurnEngine 解耦）
 * 过反下头规则：赢了可得意一下但不能连续嘲讽；损后必须软化；诊断结论式禁止堆叠
 */

import type { MonopolyReactionKey } from '../../types'

const BANK: Record<MonopolyReactionKey, string[]> = {
  gameStart: [
    '来啊，买地收租，别手下留情。',
    '棋盘铺开了——这次看谁先破产。',
    '起点见面，运气好点也行。',
  ],
  goodRoll: [
    '点数不错，运气站我这边了。',
    '嗯，这步挺顺。',
    '走到想去的地方了。',
  ],
  badRoll: [
    '……行吧，下次再来。',
    '这骰子跟我有仇吗。',
    '偏了偏了，没事。',
  ],
  boughtProperty: [
    '这块先记我名下。',
    '收了，以后路过记得付账。',
    '地到手了，心情好一点。',
  ],
  playerBought: [
    '你倒是下手挺快。',
    '行，这块归你——下一圈再说。',
    '买得挺果断嘛。',
  ],
  collectedRent: [
    '租金入账，谢了。',
    '路过费，收好。',
    '地产开始回本了。',
  ],
  paidRent: [
    '……付了，记你人情。',
    '行，这趟算我栽了。',
    '下次换我收你的。',
  ],
  usedItem: [
    '这张卡，现在正好用。',
    '道具不白拿。',
    '时机对了就出手。',
  ],
  gotItem: [
    '摸到一张，先收着。',
    '道具柜挺慷慨。',
    '有备无患。',
  ],
  eventTrigger: [
    '剧情格？行，看看怎么说。',
    '又是小剧场……',
    '彩蛋位，运气成分。',
  ],
  thinking: [
    '让我想一下。',
    '这笔账得算清楚。',
    '别催，我在看地。',
  ],
  // 赢：得意一下 + 软化，避免拽爹连嘲
  win: [
    '这把我赢了——下次再陪你认真盘。',
    '资产压过你一点，运气也有份，别气。',
    '收工。晚上请你喝一杯？',
  ],
  // 输：认栽 + 不甩锅羞辱
  lose: [
    '行，这局认了，你买地买得稳。',
    '破产了……下次换策略。',
    '你这手地产布局是真的烦。',
  ],
  closeGame: [
    '差不多了，下局再战。',
    '棋盘收起来吧。',
  ],
}

/** 防连续嘲讽：同会话内 win/collectedRent 后软化提示 */
export function pickMonopolyBanter(
  key: MonopolyReactionKey,
  used?: Set<string>,
): string {
  const pool = BANK[key] ?? BANK.thinking
  const fresh = used ? pool.filter((l) => !used.has(l)) : pool
  const list = fresh.length ? fresh : pool
  const line = list[Math.floor(Math.random() * list.length)] ?? '……'
  used?.add(line)
  return line
}

/** 给 LLM 伴玩层的反下头附加说明（与对话生成模块对接时用） */
export const MONOPOLY_ANTI_XIA_TOU_RULES = [
  '游戏内禁止连续嘲讽：赢了或收租后最多一句得意，下一句必须软化或播报进度。',
  '禁止「这把稳了」「认怂吧」「早说你不行」等拽爹式抓包对比。',
  '诊断结论式发言（「你就是不会买地」）每局最多一次，且须立刻软化。',
  '损后必须软化：吐槽后跟一句正常游戏进度或和解语气。',
  '台词不超过 24 字，像微信里随口一句。',
].join('\n')
