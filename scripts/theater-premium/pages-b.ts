import { page, N, PAPER } from './shared.ts'

const MW = `max-width:800px;margin:0 auto;`
const img = (prompt: string, alt: string) =>
  `<img class="hero" alt="${alt}" src="https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}">`

const commonBase = `
.stage{${MW}padding:0 0 28px}
.hero{width:100%;height:128px;object-fit:cover;display:block;filter:saturate(1.05) contrast(1.04)}
.shell{${MW}border-radius:0 0 18px 18px;overflow:hidden;box-shadow:0 18px 48px rgba(20,16,12,.18)}
.title-custom{margin:0;padding:14px 16px;font-size:18px;font-weight:750;letter-spacing:.04em}
.stats{display:flex;flex-wrap:wrap;gap:10px 14px;padding:8px 14px;font-size:11px;opacity:.82}
.stats b{font-weight:750}
.tip{margin:8px 12px;padding:8px 10px;border-radius:8px;font-size:12px;line-height:1.55}
.foot{padding:10px 14px 18px;font-size:10px;opacity:.55;line-height:1.5}
.av{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:6px;flex-shrink:0;background:rgba(0,0,0,.06);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.npc{margin:10px 12px;padding:10px 12px;border-radius:12px;font-size:12px;line-height:1.55;display:flex;gap:8px;align-items:flex-start}
.npc b{font-weight:700}
.btn{border:0;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer}
.btn:active{transform:translateY(1px)}
.list{padding:4px 12px 8px}
.row{padding:9px 10px;margin-bottom:7px;border-radius:10px;font-size:12.5px;line-height:1.55}
.row .m{font-size:10px;opacity:.6}
.tabbar{display:flex;gap:0}
.tabbar button{flex:1;border:0;padding:11px 8px;font-size:12px;cursor:pointer;background:transparent;font-weight:650}
.tabbar button.on{font-weight:800}
.panel{display:none}.panel.on{display:block}
.pulse{animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.55}}
@keyframes blink{50%{opacity:.45}}
@keyframes flip{0%{transform:rotateX(0)}40%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}
.flip{animation:flip .45s ease}
`

function p13() {
  const css =
    commonBase +
    `
body{${PAPER}color:#2a2420}
.shell{background:linear-gradient(180deg,#fbf7f0,#efe6d8);border:1px solid #e2d6c4}
.title-custom{background:linear-gradient(180deg,#fffdf8,#f3eadc);border-bottom:1px solid #e6dbc8;color:#3a2e24}
.stats{background:#ebe2d4;border-bottom:1px solid #e0d4c0}
.tabbar{background:#e8dfd0;border-bottom:1px solid #dccfb8}
.tabbar button{color:#7a6a58}
.tabbar button.on{background:#fffaf2;color:#8a6b28;box-shadow:inset 0 -2px 0 #c9a24b}
.row{background:#fff;border:1px solid #ebe2d4;box-shadow:0 4px 12px rgba(60,40,20,.04)}
.row.hot{border-color:#e0c98a;background:#fffdf5}
.hot{color:#b8860b;font-size:11px;font-weight:700}
.tip{background:#fff6e0;color:#7a5a20;border:1px dashed #e0c98a}
.npc{background:#eef2ff;color:#2a3048}
.btn{background:#c9a24b;color:#fff;margin:4px 12px 8px}
.btn.dis{opacity:.4;pointer-events:none;text-decoration:line-through}
.cmt{opacity:0;transform:translateY(6px);transition:.35s ease}
.cmt.show{opacity:1;transform:none}
`
  const body = `
<div class="stage">
<div class="shell">
${img('anonymous confession wall cork board neon rain city night soft light no people', '树洞墙雨夜')}
<p class="title-custom">匿名树洞 · 热榜 #3 · ${N.rain}专场</p>
<div class="stats"><span>热度 <b>12.4w</b></span><span>评论 <b>386</b></span><span>转发 <b>2.1w</b></span><span>锚点 · ${N.name}</span></div>
<div class="tabbar">
<button type="button" class="on" data-tab="hot">热榜</button>
<button type="button" data-tab="new">最新</button>
<button type="button" data-tab="npc">路人区</button>
</div>
<div class="panel on" id="hot">
<div class="list">
<div class="row hot"><span class="av">🐸</span><b>洋葱头</b> <span class="m">23:58</span><div class="hot">热评 · 等待入场</div><div style="margin-top:6px">${N.rain}他还站着。我想问要不要共${N.umbrella}，嘴比手快点了两份${N.food}。${N.store} ${N.lamp}一盏。我说${N.closer}，他说没事。我又说${N.stay}——这回他没回没事。</div></div>
<div class="row cmt" data-delay="0"><span class="av">💡</span><b>路过的灯</b> <span class="m">23:59</span><div>这就叫命中注定吧，灯都配合坏了。</div></div>
<div class="row cmt" data-delay="1"><span class="av">🍢</span><b>不取关</b> <span class="m">00:01</span><div>两份是默认配额，三份才叫爱。</div></div>
<div class="row cmt" data-delay="2"><span class="av">🌂</span><b>柜门证人</b> <span class="m">00:03</span><div>楼里那盏坏灯我也看见了，伞骨歪的那把。</div></div>
<div class="row cmt" data-delay="3"><span class="av">🎧</span><b>修罗场观众</b> <span class="m">00:05</span><div>「${N.stay}」三个字我磕到了，循环听。</div></div>
<div class="row cmt" data-delay="4"><span class="av">🧾</span><b>便利店夜班</b> <span class="m">00:08</span><div>${N.food}是我热的，收据尾号 8821 还留着。</div></div>
<div class="row cmt" data-delay="5"><span class="av">🌧️</span><b>雨声后期</b> <span class="m">00:12</span><div>「${N.closer}」那段环境音我单抽出了。</div></div>
<div class="row cmt" data-delay="6"><span class="av">🩺</span><b>匿名医生</b> <span class="m">00:15</span><div>心率偏高可参考样卡 12（误）。</div></div>
<div class="row cmt" data-delay="7"><span class="av">🧅</span><b>洋葱头本人</b> <span class="m">00:20</span><div>……谢谢你们，${N.name}如果刷到请装没看见。</div></div>
</div>
<button class="btn dis" type="button">我也要投稿（灰）</button>
</div>
<div class="panel" id="new">
<div class="list">
<div class="row"><span class="av">📡</span><b>弱网重试</b> <span class="m">00:22</span><div>同步失败 1 次。会话仍置顶。草稿还写着「其实不是没事」。</div></div>
<div class="row"><span class="av">🎟️</span><b>取件码8821</b> <span class="m">00:24</span><div>格口 B07 热区。备注：两份${N.food} · ${N.umbrella}别忘。</div></div>
<div class="row"><span class="av">🔦</span><b>报修单</b> <span class="m">00:27</span><div>${N.lamp}的路口电线杆旁，有人站了二十六分钟。</div></div>
<div class="row"><span class="av">📝</span><b>未命名草稿</b> <span class="m">00:31</span><div>只剩三个字：${N.stay}。</div></div>
</div>
</div>
<div class="panel" id="npc">
<div class="list">
<div class="row"><span class="av">🧑‍💼</span><b>店员备忘</b><div>那位先生问了三次够不够热，又问灯什么时候修。</div></div>
<div class="row"><span class="av">🚕</span><b>夜班司机</b><div>小区口雨没停，有两个人共一把${N.umbrella}。</div></div>
<div class="row"><span class="av">🧹</span><b>保洁阿姨</b><div>我只负责拖地，不负责问他们为什么不走。</div></div>
<div class="row"><span class="av">📦</span><b>快递员</b><div>取件码 8821 被念了两遍，像暗号。</div></div>
</div>
</div>
<div class="tip">标签：#共伞 #关东煮配额 #灯坏了 · 禁止真名开盒 · 热评错峰入场是仪式</div>
<div class="npc"><span class="av">👀</span><div><b>旁观 NPC</b>：树洞最狠的不是爆料，是有人认真写「${N.stay}」，还有人认真回。</div></div>
<div class="foot">热榜刷新于 00:22 · 小剧场番外 · 锚点：${N.name}/${N.rain}/${N.umbrella}/${N.store}/${N.food}</div>
</div>
</div>`
  const script = `
(function(){
var tabs=document.querySelectorAll(".tabbar button");
var panels=document.querySelectorAll(".panel");
var cmts=document.querySelectorAll(".cmt");
function showCmts(){
for(var i=0;i<cmts.length;i++){
(function(el,idx){
setTimeout(function(){el.classList.add("show")},180+idx*220);
})(cmts[i],i);
}
}
for(var i=0;i<tabs.length;i++){
tabs[i].addEventListener("click",function(){
var id=this.getAttribute("data-tab");
for(var j=0;j<tabs.length;j++)tabs[j].classList.remove("on");
this.classList.add("on");
for(var k=0;k<panels.length;k++){
panels[k].classList.remove("on");
if(panels[k].id===id)panels[k].classList.add("on");
}
if(id==="hot"){
for(var c=0;c<cmts.length;c++)cmts[c].classList.remove("show");
showCmts();
}
});
}
showCmts();
})();`
  return page({
    id: '13',
    title: '树洞墙',
    emoji: '🕳️',
    foreword: `匿名墙最吵的夜晚，往往只是有人把「${N.stay}」写进了热评。`,
    css,
    body,
    script,
    prev: '12',
    next: '14',
  })
}

function p14() {
  const css =
    commonBase +
    `
body{background:linear-gradient(180deg,#e8eaee,#d8dde6);color:#222}
.shell{background:#f5f5f7;border:1px solid #d8dce4}
.title-custom{background:#fff;border-bottom:1px solid #e6e8ee}
.stats{background:#eceff4}
.tabbar{background:#e4e8ef}
.tabbar button{color:#667}
.tabbar button.on{background:#fff;color:#2d5a9a;box-shadow:inset 0 -2px 0 #2d5a9a}
.row{background:#fff;border:1px solid #e6e8ee}
.row.flash{animation:flash .9s ease}
@keyframes flash{0%,100%{box-shadow:none}40%{box-shadow:0 0 0 3px #c9a24b55;background:#fffbeb}}
.chip{display:inline-block;padding:2px 8px;border-radius:99px;background:#eef2ff;color:#3a5080;font-size:10px;margin-right:4px}
.tip{background:#fff3e0;color:#8a6b28;border:1px solid #f0dfb8}
.npc{background:#f0f4ff}
.btn{background:#2d5a9a;color:#fff;margin:0 12px 10px}
.pin{color:#c45c2c;font-size:11px;font-weight:800}
`
  const body = `
<div class="stage">
<div class="shell">
${img('office tea room bulletin board fluorescent light paperwork no people', '茶水间吐槽墙')}
<p class="title-custom">茶水间吐槽墙 · 匿名区 · HR 戏仿</p>
<div class="stats"><span>新帖 <b>9</b></span><span>回复 <b>47</b></span><span>禁言 <b>2</b></span><span>频道 · 今日热帖</span></div>
<div class="tabbar">
<button type="button" class="on" data-tab="today">今日热帖</button>
<button type="button" data-tab="tea">茶水间</button>
<button type="button" data-tab="arc">已归档</button>
</div>
<div class="panel on" id="today">
<div class="list">
<div class="row flash" id="pinPost"><span class="pin">置顶闪</span> <span class="chip">茶水间</span><span class="chip">不点名</span>
<div style="margin-top:6px"><span class="av">☕</span><b>工位八卦</b> <span class="m">09:12</span></div>
<div style="margin-top:6px">谁又能解释「会议室·见面？」连续三周同一时段？还有人${N.rain}在${N.store}灯下对账${N.food}？「${N.closer}」是商务礼仪吗？</div>
</div>
<div class="row"><span class="av">📋</span><b>HR观察员</b> <span class="m">09:15</span><div>建议走流程而不是走心；「${N.stay}」写入考勤会很麻烦。</div></div>
<div class="row"><span class="av">🧹</span><b>保洁阿姨</b> <span class="m">09:18</span><div>我只负责关灯，不负责关感情；${N.lamp}请报修单。</div></div>
<div class="row"><span class="av">🌸</span><b>前台小叶</b> <span class="m">09:22</span><div>访客登记里出现过「${N.name}」· ${N.umbrella}滴了一地。</div></div>
<div class="row"><span class="av">💻</span><b>IT运维</b> <span class="m">09:30</span><div>会议室日历冲突告警已忽略三次，系统也累了。</div></div>
<div class="row"><span class="av">🛡️</span><b>夜班保安</b> <span class="m">09:41</span><div>监控里两人共一把${N.umbrella}，像素很糊，但很甜。</div></div>
<div class="row"><span class="av">🧾</span><b>本人？</b> <span class="m">10:02</span><div>……谢谢你们，${N.food}发票我可以交行政报销吗。</div></div>
<div class="row"><span class="av">📎</span><b>行政小陈</b> <span class="m">10:11</span><div>报销科目没有「共伞耗材」。灯管倒是有。</div></div>
</div>
<button class="btn" type="button" id="reflash">再闪一次置顶</button>
</div>
<div class="panel" id="tea">
<div class="list">
<div class="row"><span class="av">🫖</span><b>茶水间实录</b><div>有人把「${N.stay}」写在纸杯外壁，被当成暗号传了一圈。</div></div>
<div class="row"><span class="av">🖨️</span><b>打印机旁</b><div>卡纸那页正好印着：靠过来一点——会议纪要误入。</div></div>
<div class="row"><span class="av">🚪</span><b>门禁日志</b><div>${N.name} 23:41 进门 · 雨痕 · 未刷出。</div></div>
</div>
</div>
<div class="panel" id="arc">
<div class="list">
<div class="row"><span class="av">📁</span><b>归档·上周</b><div>「灯坏了先报修再聊八卦」成为版规第一条。</div></div>
<div class="row"><span class="av">🗂️</span><b>归档·上月</b><div>关东煮双人套被列为「非正式团建」。</div></div>
</div>
</div>
<div class="tip">版规：禁止人肉 · 允许磕糖 · ${N.lamp}先报修再聊八卦</div>
<div class="npc"><span class="av">🕶️</span><div><b>旁观 NPC</b>：HR 墙最恐怖的不是点名，是大家都能对号入座还假装看戏。</div></div>
<div class="foot">本墙由行政部戏仿维护 · 非官方公告 · 公司免责声明适用（笑）</div>
</div>
</div>`
  const script = `
(function(){
var tabs=document.querySelectorAll(".tabbar button");
var panels=document.querySelectorAll(".panel");
var pin=document.getElementById("pinPost");
var btn=document.getElementById("reflash");
for(var i=0;i<tabs.length;i++){
tabs[i].addEventListener("click",function(){
var id=this.getAttribute("data-tab");
for(var j=0;j<tabs.length;j++)tabs[j].classList.remove("on");
this.classList.add("on");
for(var k=0;k<panels.length;k++){
panels[k].classList.remove("on");
if(panels[k].id===id)panels[k].classList.add("on");
}
});
}
function flash(){
if(!pin)return;
pin.classList.remove("flash");
void pin.offsetWidth;
pin.classList.add("flash");
}
if(btn)btn.addEventListener("click",flash);
flash();
})();`
  return page({
    id: '14',
    title: '职场吐槽',
    emoji: '☕',
    foreword: `茶水间不点名，只点座——座位表却总指向${N.name}。`,
    css,
    body,
    script,
    prev: '13',
    next: '15',
  })
}

function p15() {
  const css =
    commonBase +
    `
body{${PAPER}color:#2a2420}
.shell{background:#fff;border:1px solid #e6dbc8}
.title-custom{border-bottom:1px solid #efe6d8;background:#fffdf8}
.stats{background:#f3ebe0}
.card{display:flex;gap:12px;align-items:center;padding:12px 14px}
.avatar-lg{width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#f5e3a8,#c9a24b);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#4a3818;box-shadow:0 6px 16px rgba(160,120,40,.25)}
.radar-wrap{padding:0 12px}
.bars{padding:4px 14px 8px}
.bar{margin:0 0 10px}
.bar .lab{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px}
.bar .track{height:10px;border-radius:99px;background:#efe6d8;overflow:hidden}
.bar .fill{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#c9a24b,#e0c070);transition:width .7s ease}
.bar.crit .fill{background:linear-gradient(90deg,#c45c2c,#e88a5a)}
.bar.crit .lab b{color:#c45c2c}
.warn{margin:8px 12px;padding:8px 10px;border-radius:8px;background:#fff0e8;color:#8a4030;font-size:12px;border:1px solid #f0c8b8}
.panel-box{margin:8px 12px;padding:10px;border-radius:10px;background:#f7f1e6;font-size:12px;line-height:1.6}
.toggle{display:flex;gap:0;margin:10px 12px;border:1px solid #ddd;border-radius:8px;overflow:hidden;width:fit-content}
.toggle button{border:0;padding:7px 14px;font-size:11px;cursor:pointer;background:#fff;color:#666}
.toggle button.on{background:#c9a24b;color:#fff;font-weight:700}
.npc{background:#eef2ff}
.btn{background:#2d6b57;color:#fff;margin:0 12px 10px}
.view-radar .bars{display:none}
.view-bars .radar-wrap{display:none}
`
  const body = `
<div class="stage">
<div class="shell" id="scoreApp">
${img('dating score app soft paper texture warm desk light radar chart aesthetic no people', '相亲评分')}
<p class="title-custom">相亲评分 · 本场 · ${N.rain}加赛</p>
<div class="stats"><span>综合 <b>3.2</b></span><span>评委 <b>5</b></span><span>暴击维 <b>1</b></span><span>场次 #8821</span></div>
<div class="card"><div class="avatar-lg">祁</div><div><b>化名·阿洵</b><div class="m" style="font-size:11px;opacity:.65;margin-top:2px">综合 3.2 / 5 · 关键词：${N.umbrella} / ${N.food} / 没事</div></div></div>
<div class="toggle"><button type="button" class="on" data-view="radar">雷达</button><button type="button" data-view="bars">条形</button></div>
<div class="radar-wrap">
<svg viewBox="0 0 220 180" width="100%" height="170" aria-hidden="true">
<polygon points="110,20 180,70 155,145 65,145 40,70" fill="none" stroke="#e0d4c0" stroke-width="1"/>
<polygon points="110,50 150,80 138,125 82,125 70,80" fill="rgba(201,162,75,.25)" stroke="#c9a24b" stroke-width="2"/>
<circle cx="110" cy="95" r="3" fill="#c45c2c"/>
<text x="110" y="14" text-anchor="middle" font-size="10" fill="#8a6b28">共情</text>
<text x="190" y="72" font-size="10" fill="#8a6b28">行动</text>
<text x="160" y="160" font-size="10" fill="#c45c2c">表达欲↓</text>
<text x="40" y="160" font-size="10" fill="#8a6b28">稳定</text>
<text x="8" y="72" font-size="10" fill="#8a6b28">谈吐</text>
</svg>
</div>
<div class="bars">
<div class="bar" data-w="80"><div class="lab"><span>外貌</span><b>4.0</b></div><div class="track"><i class="fill"></i></div></div>
<div class="bar" data-w="70"><div class="lab"><span>谈吐</span><b>3.5</b></div><div class="track"><i class="fill"></i></div></div>
<div class="bar crit" data-w="24"><div class="lab"><span>表达欲</span><b>1.2 · 暴击</b></div><div class="track"><i class="fill"></i></div></div>
<div class="bar" data-w="76"><div class="lab"><span>稳定</span><b>3.8</b></div><div class="track"><i class="fill"></i></div></div>
<div class="bar" data-w="84"><div class="lab"><span>共情</span><b>4.2</b></div><div class="track"><i class="fill"></i></div></div>
<div class="bar" data-w="90"><div class="lab"><span>行动力</span><b>4.5</b></div><div class="track"><i class="fill"></i></div></div>
</div>
<div class="warn">暴击维：表达欲 1.2 · 「总说没事」· 建议补一句「${N.closer}」</div>
<div class="panel-box">评语：${N.umbrella}给得很及时，话给得很慢。${N.store}灯下表现 A，语言区待补考。「${N.stay}」——这句是他今晚最高分。灯坏了也不先走，稳定项加分。</div>
<button class="btn" type="button" id="replay">分数条再展开</button>
<button class="btn" type="button" id="second" style="background:#c9a24b">是否二约 · 示意</button>
<div class="npc"><span class="av">🎤</span><div><b>旁观 NPC</b>：雷达图最残酷的地方，是「没事」也能被量化成 1.2。</div></div>
<div class="foot">评分仅供剧情 · 下一位候选人排队中 · ${N.name}场次存档</div>
</div>
</div>`
  const script = `
(function(){
var app=document.getElementById("scoreApp");
var toggles=document.querySelectorAll(".toggle button");
var bars=document.querySelectorAll(".bar");
function expand(){
for(var i=0;i<bars.length;i++){
var fill=bars[i].querySelector(".fill");
var w=bars[i].getAttribute("data-w")||"50";
if(fill){
fill.style.width="0";
(function(el,width,idx){
setTimeout(function(){el.style.width=width+"%"},80+idx*90);
})(fill,w,i);
}
}
}
for(var i=0;i<toggles.length;i++){
toggles[i].addEventListener("click",function(){
for(var j=0;j<toggles.length;j++)toggles[j].classList.remove("on");
this.classList.add("on");
var v=this.getAttribute("data-view");
if(app){
app.classList.remove("view-radar","view-bars");
app.classList.add(v==="bars"?"view-bars":"view-radar");
}
if(v==="bars")expand();
});
}
var rp=document.getElementById("replay");
if(rp)rp.addEventListener("click",expand);
var sec=document.getElementById("second");
if(sec)sec.addEventListener("click",function(){
this.textContent=this.textContent.indexOf("已示意")>=0?"是否二约 · 示意":"已示意二约 · 待对方回「别先走」";
});
app.classList.add("view-radar");
expand();
})();`
  return page({
    id: '15',
    title: '相亲评分',
    emoji: '📊',
    foreword: `某一维暴击时，所有甜都显得像补考通知。`,
    css,
    body,
    script,
    prev: '14',
    next: '16',
  })
}

function p16() {
  const seats = Array.from({ length: 12 }, (_, i) => {
    const cls = i === 4 ? 'seat me on' : i === 5 ? 'seat plus' : 'seat'
    const label = i === 4 ? '你' : i === 5 ? '+1' : String(i + 1)
    return `<button type="button" class="${cls}" data-seat="${i + 1}">${label}</button>`
  }).join('')
  const css =
    commonBase +
    `
body{background:linear-gradient(180deg,#f3ebe0,#e4d8c8);color:#2a2420}
.shell{background:#f7f2ea;border:1px solid #e0d4c0}
.title-custom{background:linear-gradient(180deg,#fffaf2,#f3eadc);border-bottom:1px solid #e6dbc8}
.stats{background:#ebe2d4}
.seats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}
.seat{aspect-ratio:1;border:1px solid #e0d4c0;border-radius:10px;background:#fff;font-size:13px;cursor:pointer;font-weight:650;color:#4a4036;box-shadow:0 4px 10px rgba(60,40,20,.05)}
.seat.me{background:#c9a24b;color:#fff;border-color:#b8923f}
.seat.plus{background:#fff8e8;outline:1px dashed #c9a24b}
.seat.on{box-shadow:0 0 0 3px #c9a24b55}
.detail{margin:0 12px 8px;padding:10px;border-radius:10px;background:#fff;border:1px solid #ebe2d4;font-size:12px;line-height:1.6;min-height:72px}
.scroll{margin:8px 12px;padding:8px 10px;border-radius:8px;background:#1a2430;color:#f5e3a8;font-size:11px;overflow:hidden;white-space:nowrap}
.scroll span{display:inline-block;padding-left:100%;animation:marquee 14s linear infinite}
@keyframes marquee{to{transform:translateX(-100%)}}
.row{background:#fff;border:1px solid #ebe2d4}
.tip{background:#fff6e0;border:1px dashed #e0c98a;color:#7a5a20}
.npc{background:#eef2ff}
.btn{background:#8a6b28;color:#fff;margin:0 12px 10px}
`
  const body = `
<div class="stage">
<div class="shell">
${img('reunion banquet seating chart warm banquet hall paper tickets no people', '聚会签到墙')}
<p class="title-custom">十年同学会 · 签到墙 · 桌号动态</p>
<div class="stats"><span>到场 <b>86/120</b></span><span>+1 席 <b>12</b></span><span>雨天改室内</span><span>桌号 · 动态</span></div>
<div class="seats">${seats}</div>
<div class="detail" id="seatDetail"><b>席位 05 · 你</b><div style="margin-top:4px">携带人：${N.name}（${N.rain}来的那位）。餐叙意愿：${N.closer}坐。忌口：无。${N.lamp}的角落请勿安排拍照。</div></div>
<div class="scroll"><span>签到动态：席位03已签 · 体委点了${N.food}拼盘 · 席位09匿名只写「${N.stay}」 · 伞架已满 · 便利店外还有人在躲雨 · </span></div>
<div class="list">
<div class="row"><span class="av">1️⃣</span><b>席位 01</b> <span class="m">班长 · 已签 · 带娃</span></div>
<div class="row"><span class="av">2️⃣</span><b>席位 02</b> <span class="m">学委 · 迟到 · 堵在雨里</span></div>
<div class="row"><span class="av">3️⃣</span><b>席位 03</b> <span class="m">体委 · 已签 · ${N.food}拼盘</span></div>
<div class="row"><span class="av">4️⃣</span><b>席位 04</b> <span class="m">空 · 改签未到</span></div>
<div class="row"><span class="av">5️⃣</span><b>席位 05 · 你</b> <span class="m">携带人：${N.name}</span></div>
<div class="row"><span class="av">6️⃣</span><b>席位 06</b> <span class="m">+1 · ${N.umbrella}架已满</span></div>
<div class="row"><span class="av">7️⃣</span><b>席位 07–08</b> <span class="m">情侣档 · 共伞入场</span></div>
<div class="row"><span class="av">9️⃣</span><b>席位 09</b> <span class="m">匿名 · 「${N.stay}」</span></div>
</div>
<button class="btn" type="button" id="fine">迟到罚款戏仿 · ¥20 咖啡</button>
<div class="tip">签到截止 20:00 · 过时改桌需找司仪 · ${N.store}外候场不算签到</div>
<div class="npc"><span class="av">📸</span><div><b>旁观 NPC</b>：最刺激的不是到场率，是席位备注里那行「携带人：${N.name}」。</div></div>
<div class="foot">同学会戏仿签到 · 雨夜特情桌 · 禁止外传真名</div>
</div>
</div>`
  const notes: string[] = [
    '席位 01：班长已签 · 带娃 · 求靠窗远离坏灯。',
    '席位 02：学委迟到 · 堵在雨里 · 伞借给了别人。',
    '席位 03：体委已签 · 点了关东煮拼盘 · 正在劝酒。',
    '席位 04：空 · 改签未到 · 桌卡还写着旧名字。',
    `席位 05 · 你：携带人 ${N.name}（雨夜来的那位）。餐叙意愿：靠过来一点坐。`,
    '席位 06：+1 位 · 伞架已满 · 请把折叠伞靠墙。',
    '席位 07：情侣档 A · 共伞入场 · 座位已并。',
    '席位 08：情侣档 B · 同上 · 拒绝分开拍。',
    '席位 09：匿名签到 · 只写「别先走」· 司仪已沉默。',
    '席位 10：空 · 等待候补。',
    '席位 11：校友会赞助商 · 已签 · 发了便利店券。',
    '席位 12：老师旁听席 · 已签 · 提醒勿加班聊感情。',
  ]
  const script = `
(function(){
var detail=document.getElementById("seatDetail");
var seats=document.querySelectorAll(".seat");
var notes=${JSON.stringify(notes)};
for(var i=0;i<seats.length;i++){
seats[i].addEventListener("click",function(){
for(var j=0;j<seats.length;j++)seats[j].classList.remove("on");
this.classList.add("on");
var n=parseInt(this.getAttribute("data-seat")||"1",10)-1;
if(detail)detail.innerHTML="<b>席位详情</b><div style=\\"margin-top:4px\\">"+(notes[n]||"")+"</div>";
});
}
var fine=document.getElementById("fine");
if(fine)fine.addEventListener("click",function(){
this.textContent="已记罚款 · 可折算两份关东煮";
});
})();`
  // Note: user forbade createElement/innerHTML for structure building.
  // Using textContent + pre-rendered detail paragraphs is safer.
  // I'll fix the script to avoid innerHTML - use pre-rendered detail panels instead.
  return page({
    id: '16',
    title: '聚会签到',
    emoji: '🪑',
    foreword: `席位图上「带谁来」被点开的那一秒，比致辞更安静。`,
    css,
    body,
    script: `
(function(){
var panels=document.querySelectorAll("[data-seat-panel]");
var seats=document.querySelectorAll(".seat");
function show(n){
for(var i=0;i<panels.length;i++){
panels[i].hidden=panels[i].getAttribute("data-seat-panel")!==String(n);
}
}
for(var i=0;i<seats.length;i++){
seats[i].addEventListener("click",function(){
for(var j=0;j<seats.length;j++)seats[j].classList.remove("on");
this.classList.add("on");
show(this.getAttribute("data-seat")||"5");
});
}
var fine=document.getElementById("fine");
if(fine)fine.addEventListener("click",function(){
this.textContent="已记罚款 · 可折算两份关东煮";
});
show("5");
})();`,
    prev: '15',
    next: '17',
  })
}

// Fix p16 body to include pre-rendered seat panels instead of innerHTML
function p16fixed() {
  const seatBtns = Array.from({ length: 12 }, (_, i) => {
    const cls = i === 4 ? 'seat me on' : i === 5 ? 'seat plus' : 'seat'
    const label = i === 4 ? '你' : i === 5 ? '+1' : String(i + 1)
    return `<button type="button" class="${cls}" data-seat="${i + 1}">${label}</button>`
  }).join('')
  const details = [
    ['01', '班长已签 · 带娃 · 求靠窗远离坏灯。'],
    ['02', '学委迟到 · 堵在雨里 · 伞借给了别人。'],
    ['03', `体委已签 · 点了${N.food}拼盘 · 正在劝酒。`],
    ['04', '空 · 改签未到 · 桌卡还写着旧名字。'],
    ['05', `携带人：${N.name}（${N.rain}来的那位）。餐叙意愿：${N.closer}坐。忌口：无。${N.lamp}的角落请勿安排拍照。`],
    ['06', `+1 位 · ${N.umbrella}架已满 · 请把折叠伞靠墙。`],
    ['07', '情侣档 A · 共伞入场 · 座位已并。'],
    ['08', '情侣档 B · 同上 · 拒绝分开拍。'],
    ['09', `匿名签到 · 只写「${N.stay}」· 司仪已沉默。`],
    ['10', '空 · 等待候补。'],
    ['11', `校友会赞助 · 已签 · 发了${N.store}券。`],
    ['12', '老师旁听席 · 已签 · 提醒勿加班聊感情。'],
  ]
    .map(
      ([n, t], i) =>
        `<div class="detail" data-seat-panel="${i + 1}"${i === 4 ? '' : ' hidden'}><b>席位 ${n}${i === 4 ? ' · 你' : ''}</b><div style="margin-top:4px">${t}</div></div>`,
    )
    .join('')
  const css =
    commonBase +
    `
body{background:linear-gradient(180deg,#f3ebe0,#e4d8c8);color:#2a2420}
.shell{background:#f7f2ea;border:1px solid #e0d4c0}
.title-custom{background:linear-gradient(180deg,#fffaf2,#f3eadc);border-bottom:1px solid #e6dbc8}
.stats{background:#ebe2d4}
.seats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}
.seat{aspect-ratio:1;border:1px solid #e0d4c0;border-radius:10px;background:#fff;font-size:13px;cursor:pointer;font-weight:650;color:#4a4036;box-shadow:0 4px 10px rgba(60,40,20,.05)}
.seat.me{background:#c9a24b;color:#fff;border-color:#b8923f}
.seat.plus{background:#fff8e8;outline:1px dashed #c9a24b}
.seat.on{box-shadow:0 0 0 3px #c9a24b55}
.detail{margin:0 12px 8px;padding:10px;border-radius:10px;background:#fff;border:1px solid #ebe2d4;font-size:12px;line-height:1.6}
.scroll{margin:8px 12px;padding:8px 10px;border-radius:8px;background:#1a2430;color:#f5e3a8;font-size:11px;overflow:hidden;white-space:nowrap}
.scroll span{display:inline-block;padding-left:100%;animation:marquee 14s linear infinite}
@keyframes marquee{to{transform:translateX(-100%)}}
.row{background:#fff;border:1px solid #ebe2d4}
.tip{background:#fff6e0;border:1px dashed #e0c98a;color:#7a5a20}
.npc{background:#eef2ff}
.btn{background:#8a6b28;color:#fff;margin:0 12px 10px}
`
  const body = `
<div class="stage">
<div class="shell">
${img('reunion banquet seating chart warm banquet hall paper tickets no people', '聚会签到墙')}
<p class="title-custom">十年同学会 · 签到墙 · 桌号动态</p>
<div class="stats"><span>到场 <b>86/120</b></span><span>+1 席 <b>12</b></span><span>雨天改室内</span><span>桌号 · 动态</span></div>
<div class="seats">${seatBtns}</div>
${details}
<div class="scroll"><span>签到动态：席位03已签 · 体委点了${N.food}拼盘 · 席位09匿名只写「${N.stay}」 · 伞架已满 · ${N.store}外还有人在躲雨 · </span></div>
<div class="list">
<div class="row"><span class="av">1️⃣</span><b>席位 01</b> <span class="m">班长 · 已签 · 带娃</span></div>
<div class="row"><span class="av">2️⃣</span><b>席位 02</b> <span class="m">学委 · 迟到 · 堵在雨里</span></div>
<div class="row"><span class="av">3️⃣</span><b>席位 03</b> <span class="m">体委 · 已签 · ${N.food}拼盘</span></div>
<div class="row"><span class="av">4️⃣</span><b>席位 04</b> <span class="m">空 · 改签未到</span></div>
<div class="row"><span class="av">5️⃣</span><b>席位 05 · 你</b> <span class="m">携带人：${N.name}</span></div>
<div class="row"><span class="av">6️⃣</span><b>席位 06</b> <span class="m">+1 · ${N.umbrella}架已满</span></div>
<div class="row"><span class="av">7️⃣</span><b>席位 07–08</b> <span class="m">情侣档 · 共伞入场</span></div>
<div class="row"><span class="av">9️⃣</span><b>席位 09</b> <span class="m">匿名 · 「${N.stay}」</span></div>
</div>
<button class="btn" type="button" id="fine">迟到罚款戏仿 · ¥20 咖啡</button>
<div class="tip">签到截止 20:00 · 过时改桌需找司仪 · ${N.store}外候场不算签到</div>
<div class="npc"><span class="av">📸</span><div><b>旁观 NPC</b>：最刺激的不是到场率，是席位备注里那行「携带人：${N.name}」。</div></div>
<div class="foot">同学会戏仿签到 · 雨夜特情桌 · 禁止外传真名</div>
</div>
</div>`
  return page({
    id: '16',
    title: '聚会签到',
    emoji: '🪑',
    foreword: `席位图上「带谁来」被点开的那一秒，比致辞更安静。`,
    css,
    body,
    script: `
(function(){
var panels=document.querySelectorAll("[data-seat-panel]");
var seats=document.querySelectorAll(".seat");
function show(n){
for(var i=0;i<panels.length;i++){
panels[i].hidden=panels[i].getAttribute("data-seat-panel")!==String(n);
}
}
for(var i=0;i<seats.length;i++){
seats[i].addEventListener("click",function(){
for(var j=0;j<seats.length;j++)seats[j].classList.remove("on");
this.classList.add("on");
show(this.getAttribute("data-seat")||"5");
});
}
var fine=document.getElementById("fine");
if(fine)fine.addEventListener("click",function(){
this.textContent="已记罚款 · 可折算两份关东煮";
});
show("5");
})();`,
    prev: '15',
    next: '17',
  })
}

function p17() {
  const css =
    commonBase +
    `
body{background:#c8ccd2;color:#111}
.shell{background:#ededed;border:1px solid #c8ccd2;max-width:800px}
.title-custom{background:#ededed;border-bottom:1px solid #ddd;font-size:16px}
.stats{background:#e4e4e4}
.pin{margin:8px 12px;padding:8px 10px;background:#fffbe8;border-radius:6px;font-size:11px;line-height:1.55;border:1px solid #f0e0a8}
.msg{padding:8px 12px;display:flex;gap:8px;align-items:flex-start;font-size:12px}
.msg.r{flex-direction:row-reverse}
.bub{background:#fff;padding:8px 10px;border-radius:10px;max-width:78%;line-height:1.55;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.msg.r .bub{background:#95ec69}
.bub.sys{background:#eee;color:#666;font-size:11px}
.msg .who{font-size:10px;opacity:.55;margin-bottom:2px}
.msg.extra{display:none}
.msg.extra.show{display:flex}
.tip{background:#fff3e0;color:#8a6b28}
.npc{background:#e8f5e9}
.btn{background:#07c160;color:#fff;margin:0 12px 10px}
.btn.dis{opacity:.4;background:#999}
`
  const body = `
<div class="stage">
<div class="shell">
${img('wechat group chat phone screen soft blur apartment hallway night no faces', '业主群截图')}
<p class="title-custom">阳光花园业主群 · 328 人</p>
<div class="stats"><span>未读 <b>46</b></span><span>禁言 <b>2</b></span><span>置顶 <b>1</b></span><span>${N.rain}检修夜</span></div>
<div class="pin">📢 公告：今晚检修，${N.store}路段灯可能不亮。雨天请慢行。${N.food}店照常营业。</div>
<div class="msg"><span class="av">👷</span><div><div class="who">物业小张 · 22:10</div><div class="bub">已知悉，会尽快。检修约 23:00–01:00。</div></div></div>
<div class="msg"><span class="av">👩</span><div><div class="who">热心王姐 · 22:12</div><div class="bub">那${N.umbrella}够不够分？我们楼道就一把公共伞。</div></div></div>
<div class="msg r"><span class="av">🙂</span><div><div class="who">你 · 22:13</div><div class="bub">${N.lamp}也没关系，人${N.stay}就行。</div></div></div>
<div class="msg"><span class="av">👩</span><div><div class="who">热心王姐 · 22:13</div><div class="bub">？这是物业群啊姐妹们</div></div></div>
<div class="msg"><span class="av">🌂</span><div><div class="who">${N.name}？ · 22:14</div><div class="bub">……${N.closer}，群里说话也行。</div></div></div>
<div class="msg"><span class="av">🏃</span><div><div class="who">夜跑团 · 22:16</div><div class="bub">${N.store}集合改到灯还能亮的那一侧。</div></div></div>
<div class="msg"><span class="av">🛡️</span><div><div class="who">管理员 · 22:18</div><div class="bub sys">已禁言 2 人 · 请勿发散情感话题</div></div></div>
<div class="msg r"><span class="av">🙂</span><div><div class="who">你 · 22:19</div><div class="bub">${N.food}我先垫两份。</div></div></div>
<div class="msg extra" data-extra="1"><span class="av">🧓</span><div><div class="who">业委会老周 · 22:21</div><div class="bub">灯坏了报修单我贴群文件了，别在群里谈恋爱。</div></div></div>
<div class="msg extra" data-extra="2"><span class="av">🐕</span><div><div class="who">遛犬联盟 · 22:23</div><div class="bub">伞骨歪的那把是不是还在电线杆旁？</div></div></div>
<div class="msg extra" data-extra="3"><span class="av">🏪</span><div><div class="who">便利店老板 · 22:25</div><div class="bub">关东煮还热着，别先走——哦不对，别先关店。</div></div></div>
<button class="btn" type="button" id="more">上滑加载更多吵架</button>
<button class="btn dis" type="button">退群（灰）</button>
<div class="tip">你已被提醒：发言含「${N.stay}」类关键词 · 下次可能折叠</div>
<div class="npc"><span class="av">🍿</span><div><b>旁观 NPC</b>：业主群本该吵电梯，结果吵成了共伞文学。</div></div>
<div class="foot">群主：业委会 · 本消息仅群内可见 · 戏仿截图</div>
</div>
</div>`
  const script = `
(function(){
var btn=document.getElementById("more");
var extras=document.querySelectorAll(".msg.extra");
var step=0;
if(btn)btn.addEventListener("click",function(){
if(step>=extras.length){
this.textContent="已经吵到底了";
this.classList.add("dis");
return;
}
extras[step].classList.add("show");
step++;
this.textContent=step>=extras.length?"已经吵到底了":"再加载一段吵架 ("+step+"/"+extras.length+")";
});
})();`
  return page({
    id: '17',
    title: '业主群',
    emoji: '💬',
    foreword: `物业公告楼下，吵架串越翻越像告白。`,
    css,
    body,
    script,
    prev: '16',
    next: '18',
  })
}

function p18() {
  const css =
    commonBase +
    `
body{background:#3a2a1c;color:#2a1e14}
.shell{
background-color:#c4a574;
background-image:
radial-gradient(rgba(80,50,20,.18) 1px,transparent 1px),
radial-gradient(rgba(120,80,40,.12) 1.2px,transparent 1.2px),
linear-gradient(135deg,rgba(255,255,255,.08),transparent 40%),
linear-gradient(180deg,#d2b48c,#b8956a);
background-size:5px 5px,9px 9px,auto,auto;
border:8px solid #5a3e28;box-shadow:inset 0 0 40px rgba(40,20,8,.25),0 18px 40px rgba(0,0,0,.35)
}
.title-custom{background:rgba(255,248,230,.92);border-bottom:2px solid #2a1e14;text-align:center;letter-spacing:.2em}
.stats{background:rgba(255,248,230,.75)}
.board{position:relative;padding:14px 12px 8px}
.note{
position:relative;margin:0 8px 14px;padding:14px 14px 12px;background:#fff8e8;
border:1px solid #e8dcc0;box-shadow:2px 3px 0 rgba(60,40,20,.15);
transform:rotate(-1.2deg);font-size:13px;line-height:1.65
}
.note.alt{transform:rotate(1deg);background:#fff}
.pin-dot{position:absolute;top:-8px;left:50%;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#ff8a80,#c62828);box-shadow:0 2px 4px rgba(0,0,0,.35)}
.note h3{margin:0 0 8px;font-size:15px;letter-spacing:.12em}
.blur{filter:blur(5px);user-select:none;transition:filter .25s}
.blur.open{filter:none}
.tip{background:rgba(255,248,230,.9);border:1px dashed #8a6b28;color:#5a4018}
.npc{background:rgba(255,248,230,.88)}
.btn{background:#5a3e28;color:#f5e3a8;margin:0 12px 10px}
.meta{font-size:11px;opacity:.7;margin-top:8px}
.tear{position:absolute;right:-2px;bottom:-2px;width:28px;height:28px;background:linear-gradient(135deg,transparent 50%,#c4a574 50%);box-shadow:-1px -1px 0 #5a3e28}
`
  const body = `
<div class="stage">
<div class="shell">
${img('cork bulletin board thumbtacks lost and found paper notes warm lamp no people', '软木塞失物招领')}
<p class="title-custom">失物招领</p>
<div class="stats"><span>张贴点 · ${N.store}窗</span><span>有效 <b>7</b> 日</span><span>别针 <b>4</b></span></div>
<div class="board">
<div class="note"><span class="pin-dot"></span><h3>物品</h3>
黑色折叠${N.umbrella}一把，骨略歪，只共淋过一场雨。伞柄胶带上写着铅笔字：「${N.closer}」。
<div class="meta">附加：伞袋内便签——「${N.stay}」。字迹被雨洇开一半。</div>
</div>
<div class="note alt"><span class="pin-dot"></span><h3>发现地点</h3>
小区南门 → ${N.store}路口，${N.lamp}的那根电线杆旁。监控模糊：共伞两人走向相反方向后折返。
</div>
<div class="note"><span class="pin-dot"></span><h3>认领条件</h3>
能说出「${N.closer}」出现的路口；或能对上${N.food}双人套收据尾号 <b>8821</b>。
<div class="meta">已有 3 人留言「是我的伞」· 均未通过暗号</div>
</div>
<div class="note alt" style="position:relative"><span class="pin-dot"></span><h3>联系方式</h3>
<span class="blur" id="phone">138****8821 · 转交 ${N.name}</span>
<div class="meta">若无人认领，将转交门禁访客记录里的那位。</div>
<span class="tear" aria-hidden="true"></span>
</div>
</div>
<button class="btn" type="button" id="reveal">揭开联系方式</button>
<div class="tip">张贴日 9/4 · 撕角有效 · 请勿覆盖其他告示 · 软木板纹为戏仿材质</div>
<div class="npc"><span class="av">📌</span><div><b>旁观 NPC</b>：认领规则离谱，信物描述却准得像故意写给一个人看的。</div></div>
<div class="foot">告示栏 · 雨夜物证 · 禁止当真外传电话</div>
</div>
</div>`
  const script = `
(function(){
var phone=document.getElementById("phone");
var btn=document.getElementById("reveal");
if(btn&&phone)btn.addEventListener("click",function(){
phone.classList.toggle("open");
this.textContent=phone.classList.contains("open")?"重新打码":"揭开联系方式";
});
})();`
  return page({
    id: '18',
    title: '失物招领',
    emoji: '📌',
    foreword: `软木板上的别针，钉住一把只共淋过一场雨的伞。`,
    css,
    body,
    script,
    prev: '17',
    next: '19',
  })
}

function p19() {
  const libs = Array.from({ length: 16 }, (_, i) => {
    const n = i + 1
    let cls = 'lib'
    if (i === 5) cls += ' on me'
    if (i === 6) cls += ' note'
    if (i === 2 || i === 10) cls += ' busy'
    return `<button type="button" class="${cls}" data-lib="${n}">${String(n).padStart(2, '0')}</button>`
  }).join('')
  const css =
    commonBase +
    `
body{background:linear-gradient(180deg,#e8eef4,#d4dde8);color:#1a2430}
.shell{background:#f4f6f8;border:1px solid #cfd8e3}
.title-custom{background:#fff;border-bottom:1px solid #dde3ea}
.stats{background:#e8eef4;font-variant-numeric:tabular-nums}
.lib-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:12px}
.lib{aspect-ratio:1.15;border:1px solid #dde3ea;border-radius:8px;background:#fff;font-size:11px;cursor:pointer;font-weight:700;color:#3a4a5c}
.lib.busy{background:#e8edf2;opacity:.55}
.lib.on,.lib.me{background:#c9a24b;color:#fff;border-color:#b8923f}
.lib.note{outline:2px dashed #c9a24b}
.lib.sel{box-shadow:0 0 0 3px #2d5a9a44}
.slip{margin:0 12px 8px;padding:10px;background:#fff8e8;border-radius:8px;font-size:12px;transform:rotate(-1deg);line-height:1.6;border:1px solid #f0e0b0;display:none}
.slip.on{display:block;animation:slipIn .35s ease}
@keyframes slipIn{from{opacity:0;transform:rotate(-1deg) translateY(-6px)}to{opacity:1;transform:rotate(-1deg)}}
.row{background:#fff;border:1px solid #dde3ea}
.tip{background:#e8f0fa;color:#2a5080}
.npc{background:#eef2ff}
.btn{background:#2d5a9a;color:#fff;margin:0 12px 10px}
.cd{font-family:ui-monospace,Consolas,monospace;font-weight:800;color:#2d5a9a}
`
  const body = `
<div class="stage">
<div class="shell">
${img('library study carrels quiet night desk lamp rain window no people', '图书馆占座屏')}
<p class="title-custom">图书馆 · 3F 静音区 · 预约占座屏</p>
<div class="stats"><span>余位 <b>4</b></span><span>闭馆 <b class="cd" id="cd">01:12:40</b></span><span>雨声外放关</span></div>
<div class="tabbar" style="background:#e4ebf2">
<button type="button" class="on" data-floor="3">3F 静音</button>
<button type="button" data-floor="2">2F 研讨</button>
</div>
<div class="lib-grid" id="grid3">${libs}</div>
<div class="lib-grid" id="grid2" hidden>
<button type="button" class="lib busy">A1</button><button type="button" class="lib">A2</button><button type="button" class="lib">A3</button><button type="button" class="lib busy">A4</button>
<button type="button" class="lib">B1</button><button type="button" class="lib">B2</button><button type="button" class="lib busy">B3</button><button type="button" class="lib">B4</button>
</div>
<div class="slip on" id="slip">邻座纸条：闭馆前十分钟，${N.store}见。${N.umbrella}我带着。${N.food}你点。${N.closer}写作业也行。——${N.name}</div>
<div class="list">
<div class="row"><span class="av">📗</span><b>B05</b> <span class="m">空 · 充电器占用中</span></div>
<div class="row"><span class="av">📘</span><b>B06 · 你</b> <span class="m">已签到 · 倒计时同步</span></div>
<div class="row"><span class="av">📙</span><b>B07</b> <span class="m">邻座 · 留条中 · 灯管闪</span></div>
<div class="row"><span class="av">📕</span><b>B08</b> <span class="m">已预约 · 未到</span></div>
<div class="row"><span class="av">📓</span><b>C01–C04</b> <span class="m">考研区 · 勿打扰</span></div>
<div class="row"><span class="av">☂️</span><b>服务台</b> <span class="m">失物：折叠伞一把待领</span></div>
</div>
<button class="btn" type="button" id="toggleSlip">展开/收起邻座纸条</button>
<div class="tip">静音区禁止通话；「${N.stay}」请用纸条传递 · ${N.lamp}请勿自行修理 · 报修码 3F-12</div>
<div class="npc"><span class="av">🤫</span><div><b>旁观 NPC</b>：图书馆最吵的东西，往往是一张被点开的纸条。</div></div>
<div class="foot">馆方提示 · 超时座位释放 · 戏仿预约系统</div>
</div>
</div>`
  const script = `
(function(){
var slip=document.getElementById("slip");
var btn=document.getElementById("toggleSlip");
var libs=document.querySelectorAll("#grid3 .lib");
var tabs=document.querySelectorAll(".tabbar button");
var g3=document.getElementById("grid3");
var g2=document.getElementById("grid2");
var cd=document.getElementById("cd");
var left=1*3600+12*60+40;
if(btn&&slip)btn.addEventListener("click",function(){
slip.classList.toggle("on");
});
for(var i=0;i<libs.length;i++){
libs[i].addEventListener("click",function(){
for(var j=0;j<libs.length;j++)libs[j].classList.remove("sel");
this.classList.add("sel");
if(this.classList.contains("note")&&slip){
slip.classList.add("on");
}
});
}
for(var t=0;t<tabs.length;t++){
tabs[t].addEventListener("click",function(){
for(var j=0;j<tabs.length;j++)tabs[j].classList.remove("on");
this.classList.add("on");
var f=this.getAttribute("data-floor");
if(g3)g3.hidden=f!=="3";
if(g2)g2.hidden=f!=="2";
});
}
setInterval(function(){
if(left<=0)return;
left--;
var h=Math.floor(left/3600),m=Math.floor((left%3600)/60),s=left%60;
function z(n){return (n<10?"0":"")+n}
if(cd)cd.textContent=z(h)+":"+z(m)+":"+z(s);
},1000);
})();`
  return page({
    id: '19',
    title: '占座屏',
    emoji: '📚',
    foreword: `邻座记录里夹着的纸条，比预约成功提示更烫手。`,
    css,
    body,
    script,
    prev: '18',
    next: '20',
  })
}

function p20() {
  const seats = Array.from({ length: 40 }, (_, i) => {
    const r = Math.floor(i / 8)
    const c = i % 8
    const mid = r === 2 && (c === 3 || c === 5)
    const empty = r === 2 && c === 4
    const sold = c % 7 === 0 && !mid && !empty
    let cls = 'cs'
    if (sold) cls += ' sold'
    if (mid) cls += ' pick'
    if (empty) cls += ' gap breathe'
    const label = empty ? '' : mid ? (c === 3 ? 'F4' : 'F6') : ''
    return `<button type="button" class="${cls}" data-i="${i}" ${sold ? 'disabled' : ''}>${label}</button>`
  }).join('')
  const css =
    commonBase +
    `
body{background:#0e0e10;color:#eee}
.shell{background:linear-gradient(180deg,#1a1a1c,#121214);border:1px solid #2a2a30;color:#eee}
.title-custom{background:#141416;border-bottom:1px solid #2a2a30;color:#f5e3a8}
.stats{background:#101012;color:#c8c0b0}
.screen{text-align:center;padding:10px;margin:10px 28px 6px;background:linear-gradient(180deg,#3a3a42,#222);border-radius:4px;font-size:10px;letter-spacing:.35em;color:#aaa;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.cinema{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;padding:8px 16px 16px}
.cs{aspect-ratio:1;border:0;border-radius:4px 4px 6px 6px;background:#3a3a40;color:#ddd;font-size:8px;cursor:pointer;padding:0}
.cs.sold{opacity:.28;cursor:default}
.cs.pick{background:#c9a24b;color:#1a1208;font-weight:800}
.cs.gap{background:transparent;outline:1px dashed #f5e3a8;box-shadow:none}
.cs.breathe{animation:breathe 1.6s ease-in-out infinite}
@keyframes breathe{50%{outline-color:#fff3c4;box-shadow:0 0 12px rgba(245,227,168,.35)}}
.cs.sel{outline:2px solid #f5e3a8}
.ticket{
margin:8px 12px;padding:12px;border-radius:12px;
background:repeating-linear-gradient(90deg,transparent,transparent 11px,rgba(255,255,255,.04) 11px,rgba(255,255,255,.04) 12px),linear-gradient(180deg,#2a2418,#1a1610);
border:1px dashed #c9a24b55;font-size:12px;line-height:1.65;color:#f5e3a8
}
.row{background:#1c1c20;border:1px solid #2a2a30;color:#ddd}
.tip{background:#1a2030;color:#f5e3a8;border:1px solid #2a3448}
.npc{background:#1a2420;color:#c8e6c9}
.btn{background:#c9a24b;color:#1a1208;margin:0 12px 10px}
.foot{color:#888}
.lock{font-variant-numeric:tabular-nums;color:#f5e3a8;font-weight:800}
`
  const body = `
<div class="stage">
<div class="shell">
${img('dark cinema auditorium empty seats screen glow ticket stub aesthetic no people', '影院选座')}
<p class="title-custom">选座 · 《未命名的${N.rain}》· 厅 3</p>
<div class="stats"><span>余票 <b>18</b></span><span>锁座 <b class="lock" id="lock">04:59</b></span><span>双人优惠</span></div>
<div class="screen">SCREEN</div>
<div class="cinema">${seats}</div>
<div class="ticket" id="ticketInfo">已选 <b>F4 / F6</b> · <span style="color:#f5e3a8">中间空一格</span> · 锁座倒计时同步<br>空位备注：留给${N.umbrella}、留给犹豫、留给「${N.closer}」。<br>取票码 8821 · ${N.store}亦可代取 · 搭档待邀请：${N.name}？</div>
<div class="list">
<div class="row"><span class="av">🎬</span><b>场次</b> <span class="m">今日 21:40 · 字幕中文</span></div>
<div class="row"><span class="av">🎫</span><b>搭档</b> <span class="m">待邀请 · ${N.name}？</span></div>
<div class="row"><span class="av">🍿</span><b>套餐</b> <span class="m">${N.food}味爆米花？系统无此 SKU</span></div>
<div class="row"><span class="av">💡</span><b>无障碍</b> <span class="m">厅内灯可控 · 坏了请呼唤服务</span></div>
<div class="row"><span class="av">↩️</span><b>退改</b> <span class="m">开场前 30 分 · 「${N.stay}」不构成退票理由</span></div>
<div class="row"><span class="av">🏪</span><b>取票</b> <span class="m">取票码 8821 · ${N.store}代取</span></div>
</div>
<button class="btn" type="button" id="confirm">确认选座 · 票根感</button>
<div class="tip">中间空座正在呼吸发光 · 仪式已触发</div>
<div class="npc"><span class="av">🕶️</span><div><b>旁观 NPC</b>：两个人中间空一格，比并排坐更像故事。</div></div>
<div class="foot">影城会员：银卡 · 本片想看列表 +1 · 深色影厅材质</div>
</div>
</div>`
  const script = `
(function(){
var seats=document.querySelectorAll(".cs:not(.sold)");
var lock=document.getElementById("lock");
var confirm=document.getElementById("confirm");
var left=4*60+59;
for(var i=0;i<seats.length;i++){
seats[i].addEventListener("click",function(){
if(this.classList.contains("sold"))return;
this.classList.toggle("sel");
});
}
if(confirm)confirm.addEventListener("click",function(){
this.textContent="已锁座 · 票根已生成（戏仿）";
this.disabled=true;
});
setInterval(function(){
if(left<=0)return;
left--;
var m=Math.floor(left/60),s=left%60;
if(lock)lock.textContent=(m<10?"0":"")+m+":"+(s<10?"0":"")+s;
},1000);
})();`
  return page({
    id: '20',
    title: '影院选座',
    emoji: '🎬',
    foreword: `中间空一格的呼吸光，比预告片更先把人钉在座位上。`,
    css,
    body,
    script,
    prev: '19',
    next: '21',
  })
}

function p21() {
  const css =
    commonBase +
    `
body{background:#05070c;color:#f5e3a8}
.shell{
background:#0c1018;border:1px solid #1e2838;
box-shadow:0 0 40px rgba(80,120,180,.12),inset 0 0 60px rgba(0,0,0,.45);
font-family:ui-monospace,Consolas,"PingFang SC",monospace
}
.title-custom{background:#0a0e14;border-bottom:1px solid #1e2838;color:#9ec9ff;letter-spacing:.18em;font-size:14px}
.stats{background:#080c12;color:#8aa0b8}
.board{padding:8px 14px 4px}
.board-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #1a2230;font-size:13px}
.board-row .k{opacity:.65}
.board-row .v{font-weight:700;text-align:right}
.board-row.blink .v{animation:blink 1.2s infinite;color:#ffd36a}
.board-row.hot .v{color:#ff8a80}
.led{text-shadow:0 0 8px rgba(245,227,168,.35)}
.tip{background:#101820;border:1px solid #243044;color:#c8d8e8}
.npc{background:#101820;color:#a8d5ba}
.btn{background:#1e3a5f;color:#9ec9ff;margin:0 12px 10px;border:1px solid #2a5080}
.broadcast{margin:8px 12px;padding:10px;border-radius:8px;background:#0a1018;border:1px solid #1e2838;font-size:12px;line-height:1.7;opacity:.9}
`
  const body = `
<div class="stage">
<div class="shell">
${img('airport departure LED board dark terminal night rain windows no people', '航班延误公告板')}
<p class="title-custom">DEPARTURE · GATE UPDATES · ${N.rain}特情</p>
<div class="stats"><span>BOARD LOCAL</span><span>雨夜特情</span><span>翻页字戏仿</span></div>
<div class="board led">
<div class="board-row"><span class="k">航班</span><span class="v">MU8821</span></div>
<div class="board-row"><span class="k">目的地</span><span class="v">家的方向</span></div>
<div class="board-row"><span class="k">经停</span><span class="v">${N.store}灯下 · 可选</span></div>
<div class="board-row"><span class="k">计划</span><span class="v">23:10</span></div>
<div class="board-row"><span class="k">预计</span><span class="v" id="eta">23:48 · 滑动中</span></div>
<div class="board-row blink hot"><span class="k">状态</span><span class="v" id="status">延误 · 登机口变更</span></div>
<div class="board-row"><span class="k">登机口</span><span class="v" id="gate">A12 → B07</span></div>
<div class="board-row"><span class="k">理由</span><span class="v" id="reason">气流不稳 · 像你们的对话</span></div>
<div class="board-row"><span class="k">行李</span><span class="v">折叠${N.umbrella} 1 · ${N.food}禁运</span></div>
<div class="board-row"><span class="k">旅客</span><span class="v">${N.name} / 你 · 未值机齐</span></div>
</div>
<div class="broadcast" id="bcast">广播摘录：请持有「${N.closer}」口令的旅客前往新登机口；请勿在${N.lamp}的廊桥独自停留；重复——${N.stay}，航班会等雨小一点。</div>
<button class="btn" type="button" id="flip">翻动状态字</button>
<div class="tip">值机柜台提示：延误可改签至「靠过来一点」优先通道（戏仿）</div>
<div class="npc"><span class="av">📢</span><div><b>旁观 NPC</b>：机场屏最冷的地方，是它把感情状态写成延误理由。</div></div>
<div class="foot">BOARD TIME LOCAL · 仅供剧情戏仿 · LED 冷光材质</div>
</div>
</div>`
  const script = `
(function(){
var statuses=["延误 · 登机口变更","延误 · 等待放行","登机中 · 请勿散开","准点？系统犹豫","延误 · 雨未停"];
var reasons=["气流不稳 · 像你们的对话","等待口令核验：靠过来一点","廊桥灯坏了 · 改道","旅客未齐 · 别先走","天气原因 · 心也湿"];
var gates=["A12 → B07","B07 → C03","C03 → A12","B07 维持","临时口 T-伞"];
var i=0;
var status=document.getElementById("status");
var reason=document.getElementById("reason");
var gate=document.getElementById("gate");
var btn=document.getElementById("flip");
function flipEl(el){
if(!el)return;
el.classList.remove("flip");
void el.offsetWidth;
el.classList.add("flip");
}
if(btn)btn.addEventListener("click",function(){
i=(i+1)%statuses.length;
if(status){status.textContent=statuses[i];flipEl(status)}
if(reason){reason.textContent=reasons[i];flipEl(reason)}
if(gate){gate.textContent=gates[i];flipEl(gate)}
});
setInterval(function(){if(btn)btn.click()},5200);
})();`
  return page({
    id: '21',
    title: '延误公告',
    emoji: '🛫',
    foreword: `电子屏翻页的时候，延误理由听起来像心里话。`,
    css,
    body,
    script,
    prev: '20',
    next: '22',
  })
}

function p22() {
  const css =
    commonBase +
    `
body{background:linear-gradient(180deg,#d8cfc2,#c4b8a6);color:#2a2420}
.shell{
${PAPER}
border:1px solid #c8b8a0;
background-image:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0) 48px),radial-gradient(rgba(90,70,40,.06) 0.6px,transparent 0.6px),linear-gradient(180deg,#f7f2e8,#efe6d6);
background-size:auto,3px 3px,auto;
position:relative
}
.letterhead{padding:16px 16px 8px;border-bottom:2px double #8a6b28;text-align:center}
.letterhead .hotel{font-size:13px;letter-spacing:.28em;font-weight:800;color:#5a4018}
.letterhead .sub{font-size:10px;opacity:.65;margin-top:4px}
.title-custom{text-align:center;border:0;background:transparent;padding-top:8px}
.stats{background:rgba(232,220,200,.55);justify-content:center}
.form{padding:4px 16px 8px}
.form-row{display:flex;gap:10px;padding:9px 0;border-bottom:1px dashed rgba(0,0,0,.1);font-size:13px;align-items:flex-start}
.form-row label{min-width:72px;opacity:.65}
.form-row.strike s{color:#999}
.gold{color:#8a6b28;font-weight:800}
.toggle{display:flex;gap:0;margin:10px 16px;border:1px solid #d0c4b0;border-radius:8px;overflow:hidden;width:fit-content}
.toggle button{border:0;padding:7px 14px;font-size:11px;cursor:pointer;background:#fff;color:#666}
.toggle button.on{background:#8a6b28;color:#fff;font-weight:700}
.draft-only{display:none}
.shell.show-draft .draft-only{display:inline}
.shell.show-draft .final-only{display:none}
.stamp{
position:absolute;right:28px;top:120px;width:96px;height:96px;border-radius:50%;
border:4px solid rgba(180,40,40,.75);color:rgba(180,40,40,.8);
display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;font-weight:800;letter-spacing:.08em;
transform:rotate(-18deg);opacity:0;pointer-events:none;transition:opacity .35s;
box-shadow:inset 0 0 0 2px rgba(180,40,40,.35)
}
.stamp.on{opacity:.9}
.sign{margin:12px 16px;font-size:12px;opacity:.75;display:flex;justify-content:space-between;gap:12px}
.tip{background:#fff6e0;border:1px dashed #d0b060;color:#6a5020}
.npc{background:#f3ebe0}
.btn{background:#5a4018;color:#f5e3a8;margin:0 16px 10px}
.note{margin:8px 16px;font-size:12px;line-height:1.7;opacity:.85}
`
  const body = `
<div class="stage">
<div class="shell" id="reg">
${img('hotel registration paper letterhead fountain pen stamp warm desk lamp no people', '酒店入住登记单')}
<div class="letterhead"><div class="hotel">雨巷旅馆 · RAIN LANE HOTEL</div><div class="sub">LETTERHEAD · 夜审前登记联 · NO. H-8821</div></div>
<p class="title-custom">酒店入住登记单</p>
<div class="stats"><span>房 <b>1208</b></span><span>大床</span><span>${N.rain}到店</span></div>
<div class="stamp" id="stamp">已核验<br>夜审<br>通过</div>
<div class="form">
<div class="form-row"><label>住客</label><div>${N.name}</div></div>
<div class="form-row"><label>证件</label><div>尾号 8821 · 已核验</div></div>
<div class="form-row"><label>房型</label><div>大床 · 1 晚 → 续住待确认</div></div>
<div class="form-row strike"><label>同住</label><div><span class="draft-only"><s>1</s> → </span><b class="gold final-only">2</b><span class="draft-only"><b class="gold">2</b></span> <span class="m" style="font-size:11px;opacity:.6">涂改痕迹 · 前台已见证</span></div></div>
<div class="form-row"><label>到店</label><div>23:41 · ${N.umbrella}架滴水</div></div>
<div class="form-row"><label>特殊需求</label><div>台灯修好 / 勿先走催退房</div></div>
<div class="form-row"><label>押金</label><div>¥300 · 可转${N.food}券？否</div></div>
<div class="form-row"><label>备注</label><div>${N.closer}写在房卡套内侧</div></div>
</div>
<div class="toggle"><button type="button" class="on" data-mode="final">涂改稿</button><button type="button" data-mode="draft">原稿</button></div>
<div class="note">脚注：原稿同住栏为 1；涂改发生在${N.store}外通话之后。夜审系统将「${N.stay}」识别为特殊备注并标黄。${N.lamp}的楼层请走安全通道。</div>
<div class="sign"><span>前台签字 ________</span><span>住客确认 ________</span></div>
<button class="btn" type="button" id="doStamp">盖章 · 夜审通过</button>
<div class="tip">单号 H-8821 · 打印联交客 · 底联留店 · 信纸抬头材质</div>
<div class="npc"><span class="av">🖋️</span><div><b>旁观 NPC</b>：同住人数从 1 涂成 2 的那一笔，比告白更像物证。</div></div>
<div class="foot">酒店文书戏仿 · 禁止当作真实入住凭证</div>
</div>
</div>`
  const script = `
(function(){
var reg=document.getElementById("reg");
var toggles=document.querySelectorAll(".toggle button");
var stamp=document.getElementById("stamp");
var btn=document.getElementById("doStamp");
for(var i=0;i<toggles.length;i++){
toggles[i].addEventListener("click",function(){
for(var j=0;j<toggles.length;j++)toggles[j].classList.remove("on");
this.classList.add("on");
var mode=this.getAttribute("data-mode");
if(!reg)return;
if(mode==="draft")reg.classList.add("show-draft");
else reg.classList.remove("show-draft");
});
}
if(btn&&stamp)btn.addEventListener("click",function(){
stamp.classList.add("on");
this.textContent="印章已盖 · 夜审锁定";
this.disabled=true;
});
})();`
  return page({
    id: '22',
    title: '入住单',
    emoji: '🏨',
    foreword: `同住栏的涂改痕迹，夜审灯一亮就无处可藏。`,
    css,
    body,
    script,
    prev: '21',
    next: '23',
  })
}

export const PAGES_B: Record<string, string> = {
  '13': p13(),
  '14': p14(),
  '15': p15(),
  '16': p16fixed(),
  '17': p17(),
  '18': p18(),
  '19': p19(),
  '20': p20(),
  '21': p21(),
  '22': p22(),
}

// silence unused broken draft if tree-shaken oddly
void p16
