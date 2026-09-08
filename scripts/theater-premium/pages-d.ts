/** D 类 31–38：游戏化 · 系统面板 */
import { page, N, TERMINAL } from './shared.ts'

const base = `
.stage{max-width:800px;margin:0 auto;padding:0 12px 32px}
.shell{border-radius:14px;overflow:hidden;border:1px solid #2a4a3a;box-shadow:0 0 40px #1a3a2844;background:#10161c}
.title-custom{margin:0;padding:14px 16px;font-size:16px;color:#7dffb0;border-bottom:1px solid #243028;letter-spacing:.08em}
.stats{display:flex;flex-wrap:wrap;gap:10px;padding:8px 14px;font-size:11px;opacity:.85}
.row{margin:6px 12px;padding:10px;border-radius:8px;background:#1a2420;border:1px solid #243028;font-size:12px;line-height:1.55}
.btn{margin:8px 12px;padding:9px 14px;border:1px solid #3dff9a55;background:#1a2820;color:#7dffb0;border-radius:8px;cursor:pointer;font-weight:700}
.btn.dis{opacity:.4;pointer-events:none}
.av{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#243028;margin-right:6px}
.npc{margin:10px 12px;padding:10px;background:#1a2420;border-radius:10px;font-size:12px;display:flex;gap:8px}
.foot{padding:10px 14px 16px;font-size:10px;opacity:.5}
.bar{height:10px;background:#1a2820;border-radius:99px;overflow:hidden;margin:8px 12px}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,#3dff9a,#c9a24b);transition:width .4s}
.hero{width:100%;height:110px;object-fit:cover;display:block}
`

const img = (p: string, a: string) =>
  `<img class="hero" alt="${a}" src="https://image.pollinations.ai/prompt/${encodeURIComponent(p)}">`

export const PAGES_D: Record<string, string> = {
  '31': page({
    id: '31', title: '好感度 Bug', emoji: '🐛', foreword: `显示 42%，真实 91%——雨夜后不同步。`,
    prev: '30', next: '32',
    css: `body{${TERMINAL}}${base}`,
    body: `<div class="stage">${img('retro game affection meter glitch green terminal no people', '好感bug')}<div class="shell"><p class="title-custom">好感度 Bug 报告</p><div class="stats"><span>目标 ${N.name}</span><span>版本 2.3.1</span><span>雨夜补丁失败</span></div><div class="row">显示值 <b id="shown">42%</b> · 真实值 <b id="real">91%</b></div><div class="bar"><i id="bar" style="width:42%"></i></div><div class="row">异常：${N.store}停留后数值卡住 · 关键词「${N.stay}」</div><div class="row">堆栈：HeartSync.delay / UmbrellaRadius.skew / LampBroken.flag</div><button class="btn" type="button" id="fix">强制刷新</button><button class="btn" type="button" id="fake">伪装正常</button><div class="npc"><span class="av">🐛</span><div><b>系统</b>：检测到「${N.closer}」后好感条抖动。</div></div><div class="foot">玩家可见 / 内部真实值仅 debug</div></div></div>`,
    script: `(function(){var mode="bug";var shown=document.getElementById("shown");var real=document.getElementById("real");var bar=document.getElementById("bar");function paint(){if(mode==="bug"){shown.textContent="42%";real.textContent="91%";bar.style.width="42%"}else if(mode==="fix"){shown.textContent="91%";real.textContent="91%";bar.style.width="91%"}else{shown.textContent="50%";real.textContent="91%";bar.style.width="50%"}}document.getElementById("fix").addEventListener("click",function(){mode="fix";paint()});document.getElementById("fake").addEventListener("click",function(){mode="fake";paint()});paint()})();`,
  }),
  '32': page({
    id: '32', title: '关系更新日志', emoji: '📜', foreword: `v2.3.1：新增「别先走」未发送状态。`,
    prev: '31', next: '33',
    css: `body{${TERMINAL}}${base}.row{cursor:pointer}.row.open .more{display:block}.more{display:none;margin-top:6px;opacity:.8}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">关系版本 · CHANGELOG</p><div class="stats"><span>当前 v2.3.1</span><span>频道 stable</span></div><div class="row open"><b>v2.3.1</b> · 昨夜<div class="more">+ 未发送草稿箱<br>+ ${N.lamp}场景停留计时<br>~ 修复共${N.umbrella}碰撞体积</div></div><div class="row"><b>v2.3.0</b> · 上周<div class="more">+ ${N.food}双人套默认<br>- 移除「没事」快捷回复</div></div><div class="row"><b>v2.2.8</b><div class="more">! 已知：日历重叠未拦截</div></div><div class="row"><b>v2.2.0</b><div class="more">初遇 ${N.store} 南门</div></div><button class="btn" type="button" id="exp">展开全部条目</button><div class="npc"><span class="av">📦</span><div><b>更新器</b>：回滚可能导致丢失「${N.stay}」。</div></div><div class="foot">点条目展开</div></div></div>`,
    script: `(function(){var rows=document.querySelectorAll(".row");for(var i=0;i<rows.length;i++){rows[i].addEventListener("click",function(){this.classList.toggle("open")})}var b=document.getElementById("exp");if(b)b.addEventListener("click",function(){for(var j=0;j<rows.length;j++)rows[j].classList.add("open")})})();`,
  }),
  '33': page({
    id: '33', title: '隐藏成就', emoji: '🏆', foreword: `成就「灯下共伞」差 1%——条件被隐藏。`,
    prev: '32', next: '34',
    css: `body{${TERMINAL}}${base}.ach{opacity:.45;filter:grayscale(1);transition:.3s}.ach.on{opacity:1;filter:none;border-color:#c9a24b}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">成就 · 隐藏条件</p><div class="stats"><span>已解锁 12</span><span>隐藏 3</span></div><div class="row ach" id="a1"><b>????</b><div class="m">在${N.lamp}的路口停留 ≥25 分</div></div><div class="row ach on" id="a2"><b>灯下共伞</b><div class="m">完成 · ${N.closer}</div></div><div class="row ach" id="a3"><b>????</b><div class="m">发送「${N.stay}」——当前：草稿未发</div></div><button class="btn" type="button" id="hint">显示模糊提示</button><div class="npc"><span class="av">🎮</span><div><b>成就系统</b>：剧透会降低掉率。</div></div><div class="foot">点亮演示</div></div></div>`,
    script: `(function(){var b=document.getElementById("hint");if(b)b.addEventListener("click",function(){document.getElementById("a1").classList.add("on");document.getElementById("a3").classList.add("on");b.textContent="已显示";b.classList.add("dis")})})();`,
  }),
  '34': page({
    id: '34', title: '技能冷却', emoji: '⏳', foreword: `告白技能冷却中——还剩 03:12。`,
    prev: '33', next: '35',
    css: `body{${TERMINAL}}${base}.ring{width:120px;height:120px;margin:16px auto;border-radius:50%;border:6px solid #3dff9a55;border-top-color:#7dffb0;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;animation:spin 1.2s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.ring.stop{animation:none;border-color:#c9a24b}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">技能冷却 · 告白</p><div class="stats"><span>CD 类型：情感</span><span>可加速：共${N.umbrella}</span></div><div class="ring" id="ring"><span id="t">03:12</span></div><div class="row">下一段语音：${N.stay}（锁定）</div><div class="row">加速道具：${N.food}×2 · ${N.rain}氛围</div><button class="btn" type="button" id="skip">跳过 CD（演示）</button><div class="npc"><span class="av">⚡</span><div><b>战斗外</b>：冷却结束前请勿连续发送没事。</div></div><div class="foot">轻量计时</div></div></div>`,
    script: `(function(){var sec=192;var t=document.getElementById("t");var r=document.getElementById("ring");var iv=setInterval(function(){if(sec<=0){clearInterval(iv);t.textContent="就绪";r.classList.add("stop");return}sec--;var m=Math.floor(sec/60),s=sec%60;t.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")},1000);document.getElementById("skip").addEventListener("click",function(){sec=0})})();`,
  }),
  '35': page({
    id: '35', title: '存档读档', emoji: '💾', foreword: `读档会丢掉「未发送」——确定吗？`,
    prev: '34', next: '36',
    css: `body{${TERMINAL}}${base}.slot{cursor:pointer}.slot.on{border-color:#7dffb0;box-shadow:0 0 0 1px #7dffb0}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">读档选择</p><div class="stats"><span>自动存 3</span><span>手动 2</span></div><div class="row slot on" data-s="1"><b>槽位 1</b> · ${N.rain}${N.store}<div class="m">好感 91%（隐）· 草稿未发</div></div><div class="row slot" data-s="2"><b>槽位 2</b> · 一周前<div class="m">还在说没事</div></div><div class="row slot" data-s="3"><b>槽位 3</b> · 初遇<div class="m">伞骨尚未歪</div></div><button class="btn" type="button" id="load">读档</button><div class="npc"><span class="av">⚠️</span><div id="warn"><b>警告</b>：将覆盖当前未发送草稿。</div></div><div class="foot">点选槽位</div></div></div>`,
    script: `(function(){var slots=document.querySelectorAll(".slot");var cur=1;for(var i=0;i<slots.length;i++){slots[i].addEventListener("click",function(){for(var j=0;j<slots.length;j++)slots[j].classList.remove("on");this.classList.add("on");cur=Number(this.getAttribute("data-s"))})}document.getElementById("load").addEventListener("click",function(){document.getElementById("warn").textContent="已读档至槽位 "+cur+"（演示）"})})();`,
  }),
  '36': page({
    id: '36', title: '投票踢人', emoji: '🗳️', foreword: `队友发起投票：是否踢出「装没事的人」。`,
    prev: '35', next: '37',
    css: `body{${TERMINAL}}${base}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">投票 · 踢出伪装</p><div class="stats"><span>赞成 <b id="y">3</b></span><span>反对 <b id="n">1</b></span><span>弃权 0</span></div><div class="bar"><i id="bar" style="width:75%"></i></div><div class="row">动议：踢出总说「没事」的玩家</div><div class="row">附议：${N.name} · 理由：${N.rain}证据确凿</div><button class="btn" type="button" id="yes">赞成</button><button class="btn" type="button" id="no">反对</button><div class="npc"><span class="av">🎭</span><div><b>队长</b>：投完之前请先把${N.food}吃完。</div></div><div class="foot">演示计数</div></div></div>`,
    script: `(function(){var y=3,n=1;function paint(){document.getElementById("y").textContent=String(y);document.getElementById("n").textContent=String(n);document.getElementById("bar").style.width=Math.round(y/(y+n)*100)+"%"}document.getElementById("yes").addEventListener("click",function(){y++;paint()});document.getElementById("no").addEventListener("click",function(){n++;paint()});paint()})();`,
  }),
  '37': page({
    id: '37', title: '副本匹配', emoji: '⚔️', foreword: `匹配「雨夜共伞本」——排队中。`,
    prev: '36', next: '38',
    css: `body{${TERMINAL}}${base}.load{height:6px;margin:16px 12px;background:#1a2820;border-radius:99px;overflow:hidden}.load>i{display:block;height:100%;width:10%;background:#7dffb0;transition:width .3s}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">副本匹配</p><div class="stats"><span>雨夜共伞本</span><span>难度：温虐</span></div><div class="load"><i id="ld"></i></div><div class="row" id="st">匹配中… 已等待 00:08</div><div class="row">队伍需求：会说${N.stay} · 会点双份${N.food}</div><button class="btn" type="button" id="go">加速匹配</button><div class="npc"><span class="av">🛰️</span><div><b>匹配服</b>：已为你预留${N.name}。</div></div><div class="foot">进度条演示</div></div></div>`,
    script: `(function(){var w=10;var ld=document.getElementById("ld");var st=document.getElementById("st");var iv=setInterval(function(){w=Math.min(100,w+4);ld.style.width=w+"%";if(w>=100){clearInterval(iv);st.textContent="匹配成功 · 进入便利店场景"}},400);document.getElementById("go").addEventListener("click",function(){w=Math.min(100,w+25);ld.style.width=w+"%"})})();`,
  }),
  '38': page({
    id: '38', title: '伤害统计', emoji: '📊', foreword: `本场最高伤害：未发送的真心话。`,
    prev: '37', next: '39',
    css: `body{${TERMINAL}}${base}.meter{height:14px;background:#1a2820;border-radius:4px;margin-top:6px;overflow:hidden}.meter>i{display:block;height:100%;background:linear-gradient(90deg,#e85d2c,#c9a24b)}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">结算 · 伤害统计</p><div class="stats"><span>时长 26:00</span><span>场景 ${N.store}</span></div><div class="row"><b>未发送草稿</b> 12,840<div class="meter"><i style="width:92%"></i></div></div><div class="row"><b>共伞碰撞</b> 8,200<div class="meter"><i style="width:70%"></i></div></div><div class="row"><b>${N.lamp}停留</b> 6,410<div class="meter"><i style="width:55%"></i></div></div><div class="row"><b>口头没事</b> 1,200<div class="meter"><i style="width:18%"></i></div></div><button class="btn" type="button" id="mvp">高亮 MVP</button><div class="npc"><span class="av">📈</span><div id="mvpt"><b>系统</b>：MVP 候选：你的草稿箱。</div></div><div class="foot">点击高亮</div></div></div>`,
    script: `(function(){document.getElementById("mvp").addEventListener("click",function(){document.getElementById("mvpt").textContent="MVP：未发送草稿 · 「"+ "别先走" +"」"})})();`,
  }),
}
