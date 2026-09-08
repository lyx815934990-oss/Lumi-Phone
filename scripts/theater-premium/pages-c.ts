/** C 类 23–30：情感仪式 · 温虐（保险箱 / 遗嘱 / 叫号 / 冷静期 / 分账 / 宠物 / 扫墓 / 胶囊） */
import { page, N, PAPER } from './shared.ts'

const NPC = (rows: string[]) =>
  `<div class="npc-block">${rows
    .map((r) => {
      const m = r.match(/^(\S+)\s+([\s\S]*)$/)
      const av = m ? m[1] : '·'
      const text = m ? m[2] : r
      return `<div class="npc-row"><span class="av">${av}</span><span>${text}</span></div>`
    })
    .join('')}</div>`

const HERO = (prompt: string, alt: string) =>
  `<img class="hero" alt="${alt}" src="https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}">`

const DX = (id: string, title: string, hook: string, extra: string[]) =>
  `<div class="dense">
<div class="dx-h">关联碎片 · ${title} · #${id}</div>
<div class="dx-sub">${hook}</div>
<div class="dx-stats"><span>线索 <b>12</b></span><span>旁观 <b>8</b></span><span>结构 <b>9</b></span><span>仪式 <b>开</b></span></div>
<div class="dx-list">${extra.map((t, i) => `<div class="dx-row"><span class="dx-t">${String(i + 1).padStart(2, '0')}</span><span>${t}</span></div>`).join('')}</div>
</div>`

export const PAGES_C: Record<string, string> = {
  '23': page({
    id: '23',
    title: '保险箱密码盘',
    emoji: '🔐',
    foreword: `${N.rain}房 1208 · 箱体微凉 · 密码是你们都记得的四个数字`,
    prev: '22',
    next: '24',
    css: `
body{${PAPER}color:#2a2218}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:128px;object-fit:cover;border-radius:14px;display:block;box-shadow:0 12px 28px rgba(40,30,20,.2)}
.title-custom{padding:14px 4px 6px;font-size:20px;letter-spacing:.06em;color:#1e1810}
.meta{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;opacity:.7;margin-bottom:10px}
.safe{position:relative;padding:22px 18px 18px;border-radius:18px;background:
radial-gradient(ellipse at 30% 20%,#4a4540,#1c1a18 68%),
linear-gradient(145deg,#2e2a26,#141210);color:#f0e2c0;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 18px 40px rgba(0,0,0,.35);border:1px solid #5a5248}
.safe::before{content:"";position:absolute;inset:10px;border-radius:12px;border:1px solid rgba(201,162,75,.25);pointer-events:none}
.safe-h{font-size:11px;letter-spacing:.18em;opacity:.7;text-align:center;margin-bottom:14px}
.dial-wrap{display:flex;flex-direction:column;align-items:center;gap:12px}
.dial{width:132px;height:132px;border-radius:50%;background:
conic-gradient(from 0deg,#8a8070 0 8deg,#2a2622 8deg 22deg,#8a8070 22deg 30deg,#2a2622 30deg 100%);
box-shadow:inset 0 0 0 8px #c9a24b,inset 0 0 0 12px #1a1612,0 8px 20px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;position:relative;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.dial.spin{transform:rotate(108deg)}
.dial-n{width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a342e,#12100e);border:2px solid #c9a24b;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;font-family:ui-monospace,Consolas,monospace;color:#f5e3a8}
.pass{display:flex;gap:10px;justify-content:center;margin:8px 0}
.pass i{width:12px;height:12px;border-radius:50%;background:#3a342e;box-shadow:inset 0 1px 2px rgba(0,0,0,.5);transition:background .2s,box-shadow .2s}
.pass i.on{background:#c9a24b;box-shadow:0 0 10px #c9a24b88}
.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 8px}
.key{border:0;border-radius:10px;padding:12px 0;background:linear-gradient(180deg,#3a3530,#25211e);color:#f0e2c0;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 2px 0 #0e0c0a}
.key:active{transform:translateY(1px)}
.key.ok{background:linear-gradient(180deg,#5a4a2a,#3a3018);color:#f5e3a8}
.key.clr{opacity:.75;font-size:12px}
.status{text-align:center;min-height:22px;font-size:12px;color:#a8d5ba;margin:6px 0}
.status.bad{color:#e8a090}
.status.wait{color:#c9b890}
.vault{max-height:0;overflow:hidden;opacity:0;transition:max-height .55s ease,opacity .4s ease,margin .3s;margin:0}
.vault.open{max-height:520px;opacity:1;margin-top:12px}
.vault-h{font-size:12px;letter-spacing:.12em;color:#c9a24b;margin-bottom:8px;text-align:center}
.letter{padding:10px 12px;margin-bottom:8px;border-radius:10px;background:rgba(255,248,232,.06);border:1px solid rgba(201,162,75,.22);font-size:12px;line-height:1.65;text-align:left}
.letter b{color:#f5e3a8}
.stats{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;font-size:11px;opacity:.75;margin:10px 0}
.tip{margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.25);font-size:11px;line-height:1.55;opacity:.85}
.foot{margin-top:10px;font-size:10px;opacity:.5;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(40,32,24,.06);border:1px solid rgba(90,70,40,.12);font-size:12px;line-height:1.5;color:#2a2218}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#efe4d0,#d8c8a8);display:inline-flex;align-items:center;justify-content:center;font-size:15px;box-shadow:inset 0 1px 0 #fff8}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#f6f1e8;border:1px solid #e5dccb;font-size:12px;color:#2a2622}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(0,0,0,.03)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(0,0,0,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('metal hotel safe dial lock warm brass light cinematic no people', 'metal safe dial')}
<p class="title-custom">🔐 保险箱 · 密码盘</p>
<div class="meta"><span>房 1208</span><span>HOTEL SAFE</span><span>电池 88%</span><span>上次 01:06</span></div>
<div class="safe" id="safe">
<div class="safe-h">TURN · ENTER · OPEN</div>
<div class="dial-wrap">
<div class="dial" id="dial"><div class="dial-n" id="dialN">·</div></div>
<div class="pass" id="pass"><i></i><i></i><i></i><i></i></div>
</div>
<div class="keys">
<button type="button" class="key" data-k="8">8</button>
<button type="button" class="key" data-k="8">8</button>
<button type="button" class="key" data-k="2">2</button>
<button type="button" class="key" data-k="1">1</button>
<button type="button" class="key ok" data-k="ok">开锁</button>
<button type="button" class="key clr" data-k="clr">清除</button>
</div>
<div class="status wait" id="st">对准转盘 · 输入四位 · 提示：取件码尾号</div>
<div class="stats"><span>物品 6</span><span>失败计次 <b id="fail">0</b></span><span>强开将报警</span></div>
<div class="vault" id="vault">
<div class="vault-h">— 内物 · 书信清册 —</div>
<div class="letter"><b>① 旧伞骨</b> · 胶带字：「${N.closer}」· ${N.rain}残留</div>
<div class="letter"><b>② 未寄出的信</b> · 抬头：${N.name} · 末句涂改 11 次</div>
<div class="letter"><b>③ 电影票根 ×2</b> · 《未命名的${N.rain}》F4 / F6</div>
<div class="letter"><b>④ ${N.food}积分卡</b> · 差 12 分兑汽水 · 双人默认</div>
<div class="letter"><b>⑤ 便签</b> · 「${N.stay}」· 雨渍洇开 · 收件人：你</div>
<div class="letter"><b>⑥ ${N.store}收据</b> · 双份 · 尾号 8821 · 备注：${N.lamp}</div>
</div>
<div class="tip">操作日志：密码第三次正确则开锁；手指有雨时易误触。关闭前请确认无遗漏。口令与${N.store}取件码同源。</div>
<div class="foot">保险箱戏仿 · 无真实财物 · 剧情道具 SAFE-8821</div>
</div>
${NPC([
  '🧑 路人：雨里灯坏了还站着，伞再往中间一点就好了。',
  '🛎️ 前台：1208 箱体开过三次，第三次是 01:06，雨还在下。',
  '🏪 店员：那位先生问了三次关东煮够不够热，又问灯什么时候修。',
  '💬 祁洵？：别删伞下那张。别先走三个字我看见了。',
  '📝 你（自言）：草稿还在。其实想说的不是没事。',
  '🌧️ 雨声：靠过来一点——打完又怕太近。',
  '📦 系统：本区为「保险箱」番外旁观串，点击无跳转。',
  '🕯️ 温虐党：仪式感到位，锁舌打开那一下手是抖的。',
])}
${DX('23', '保险箱', '转盘对准 → 锁舌打开 → 旧物清单展开', [
  `【保险箱】打开瞬间命中关键词「${N.name}」· 关联「${N.store}」`,
  `23:33 南门${N.store}旁停留 · ${N.food}柜温：仍热`,
  `${N.rain}日志：路口${N.lamp} · 伞面往中间挪约 12cm · 「${N.closer}」`,
  `未发送草稿：「其实不是没事」· 已改 10 次 · 收件人：${N.name}`,
  `物件链：折叠伞 / 双人${N.food}小票 / 取件码 8821 / 停车过夜小票`,
  `地理：便利店站异常停留 26 分 · 出站小区口 · 雨未停`,
  `舆论：树洞墙有人写「灯坏了也站着算不算表白」· 热评 43`,
  `系统注记：样卡 #23 · C类 · 标签 互动·物证·甜`,
])}
</div>`,
    script: `
(function(){
var code="8821",buf="",fail=0,opened=false;
var dial=document.getElementById("dial");
var dialN=document.getElementById("dialN");
var dots=document.querySelectorAll("#pass i");
var st=document.getElementById("st");
var vault=document.getElementById("vault");
var failEl=document.getElementById("fail");
function paint(){
for(var i=0;i<dots.length;i++){
if(i<buf.length)dots[i].classList.add("on");else dots[i].classList.remove("on");
}
dialN.textContent=buf.length?buf.charAt(buf.length-1):"·";
}
function unlock(){
opened=true;
dial.classList.add("spin");
st.className="status";
st.textContent="锁舌已开 · 内物完整 · 书信清册展开";
vault.classList.add("open");
}
function reset(){
if(opened)return;
buf="";
paint();
st.className="status wait";
st.textContent="已清除 · 重新输入四位";
}
var keys=document.querySelectorAll(".key");
for(var k=0;k<keys.length;k++){
keys[k].addEventListener("click",function(){
if(opened)return;
var v=this.getAttribute("data-k");
if(v==="clr"){reset();return}
if(v==="ok"){
if(buf===code){unlock();return}
fail++;
if(failEl)failEl.textContent=String(fail);
buf="";
paint();
st.className="status bad";
st.textContent="密码错误 · 手指有雨？· 失败 "+fail+" 次";
dial.classList.remove("spin");
return;
}
if(buf.length>=4)return;
buf+=v;
paint();
st.className="status wait";
st.textContent="已输入 "+buf.length+"/4 · 口令与取件码同源";
if(buf.length===4&&buf===code){
st.textContent="对准完成 · 可点「开锁」";
}
});
}
paint();
})();
`,
  }),

  '24': page({
    id: '24',
    title: '遗嘱财产清单',
    emoji: '📜',
    foreword: `戏仿文书 · 正式但不真死 · 「留给你的」那一条会高亮`,
    prev: '23',
    next: '25',
    css: `
body{background:#2a241c;color:#2a2218}
.stage{max-width:440px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:120px;object-fit:cover;border-radius:12px;display:block;box-shadow:0 10px 28px rgba(0,0,0,.35)}
.title-custom{color:#f0e6d0;padding:14px 4px 8px;font-size:20px;letter-spacing:.08em}
.parch{position:relative;padding:28px 22px 24px;border-radius:4px;${PAPER}
background-image:
radial-gradient(rgba(90,70,40,.07) 0.6px,transparent 0.6px),
linear-gradient(180deg,#f7f0e2,#ebe0cc 40%,#e4d5b8);
box-shadow:0 16px 40px rgba(0,0,0,.4),inset 0 0 60px rgba(120,90,40,.08);
border:1px solid #c4b090}
.parch::after{content:"";position:absolute;width:64px;height:64px;right:18px;bottom:28px;border-radius:50%;
background:radial-gradient(circle at 35% 30%,#c45c4a,#7a2418 55%,#4a120c);
box-shadow:0 4px 12px rgba(80,20,10,.35),inset 0 2px 4px rgba(255,200,160,.25);
opacity:.92;transform:rotate(-12deg)}
.seal-txt{position:absolute;right:30px;bottom:48px;z-index:2;font-size:10px;color:#f5e3a8;letter-spacing:.2em;transform:rotate(-12deg);pointer-events:none;font-weight:700}
.will-h{text-align:center;font-weight:800;letter-spacing:.2em;font-size:15px;margin-bottom:4px}
.will-no{text-align:center;font-size:11px;opacity:.6;font-family:ui-monospace,Consolas,monospace;margin-bottom:12px}
.stats{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;font-size:11px;margin-bottom:12px;opacity:.8}
ol.will{margin:0;padding-left:20px;line-height:1.75;font-size:13px}
ol.will li{margin:6px 0;opacity:0;transform:translateY(6px);transition:opacity .4s ease,transform .4s ease}
ol.will li.show{opacity:1;transform:none}
ol.will li.hi{background:linear-gradient(90deg,#fff4d8,#fff8e800);padding:8px 8px;border-radius:6px;border-left:3px solid #c9a24b;list-style-position:inside;margin-left:-8px}
.note{margin-top:14px;padding:10px;border-radius:8px;background:rgba(255,255,255,.45);font-size:12px;line-height:1.65;border:1px dashed #c4b090}
.sign{margin-top:16px;font-size:12px;opacity:.75;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.btn{display:block;width:100%;margin-top:14px;padding:10px;border:0;border-radius:8px;background:linear-gradient(180deg,#3a3020,#2a2218);color:#f5e3a8;font-weight:700;cursor:pointer;letter-spacing:.08em}
.btn.done{opacity:.55;cursor:default}
.foot{margin-top:10px;font-size:10px;opacity:.5;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(240,230,210,.08);border:1px solid rgba(201,162,75,.2);font-size:12px;line-height:1.5;color:#e8dcc8}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#4a4030,#2a2418);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#1e1a14;border:1px solid #3a3228;font-size:12px;color:#e8dcc8}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(255,255,255,.04)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(255,255,255,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('old parchment will document wax seal candlelight desk no people', 'parchment will')}
<p class="title-custom">📜 戏仿遗嘱 · 财产清册</p>
<div class="parch" id="parch">
<div class="will-h">遗 嘱 财 产 清 册</div>
<div class="will-no">文号 XF-WILL-8821 · 立约场景：${N.rain} · ${N.store}外</div>
<div class="stats"><span>条款 8</span><span>见证人：灯</span><span>执行人：你</span><span>${N.lamp}也能签</span></div>
<ol class="will" id="will">
<li>黑色折叠伞 → 留给会把它往中间挪的人</li>
<li>未读完的书 → 留给催我睡觉的人</li>
<li>${N.store}积分 → 留给点两份的人</li>
<li>${N.food}常点清单 → 默认双人套永不删除</li>
<li>门锁访客密码 → ${N.rain}有效，晴天需重申</li>
<li class="hi">那句「没事」的解释权 → <b>留给你</b></li>
<li>${N.rain}路口的站桩习惯 → 共同继承 · 条件：${N.stay}</li>
<li>「${N.closer}」的使用权 → 仅限共伞半径内</li>
</ol>
<div class="note">附言：若灯修好了，本清册仍有效。若${N.food}涨价，积分条款按新价折算。本文件为剧情戏仿，无法律效力。立约人化名：${N.name}。</div>
<div class="sign"><span>立约人：${N.name} ________</span><span>见证人：灯 ________</span><span>日期：9/4</span></div>
<button type="button" class="btn" id="reveal">逐条展开清册</button>
<span class="seal-txt">印</span>
<div class="foot">禁止真自杀描写 · 仪式感=条目错峰 · 蜡封印仅装饰</div>
</div>
${NPC([
  '🕯️ 温虐党：仪式感到位，「留给你的」那一行手是抖的。',
  '🧑 路人：雨里灯坏了还站着，伞再往中间一点就好了。',
  '💼 同事乙：会议室看板又撞了吧？日历重叠这事迟早上墙。',
  '💬 祁洵？：别删伞下那张。别先走三个字我看见了。',
  '🏪 店员：那位先生问了三次关东煮够不够热。',
  '📝 你（自言）：草稿还在。其实想说的不是没事。',
  '🌧️ 雨声：靠过来一点——打完又怕太近。',
  '📦 系统：本区为「遗嘱清单」番外旁观串，点击无跳转。',
])}
${DX('24', '遗嘱清单', '「留给你的」条目逐条展开的郑重又反差', [
  `【遗嘱清单】打开瞬间命中关键词「雨」· 关联「${N.food}」`,
  `23:34 南门${N.store}旁停留 · ${N.food}柜温：仍热`,
  `${N.rain}日志：路口${N.lamp} · 伞面往中间挪约 12cm`,
  `未发送草稿：「其实不是没事」· 已改 11 次 · 收件人：${N.name}`,
  `文书头：戏仿文号 XF-WILL-8821 → 已渲染`,
  `特别留给 user 的一条高亮 · 解释权条款`,
  `见证人签字栏 · 灯 · 日期 9/4`,
  `系统注记：样卡 #24 · C类 · 标签 文件单据·BE·搞笑`,
])}
</div>`,
    script: `
(function(){
var items=document.querySelectorAll("#will li");
var btn=document.getElementById("reveal");
var i=0,timer=null;
function step(){
if(i>=items.length){
if(btn){btn.textContent="清册已展开";btn.classList.add("done")}
return;
}
items[i].classList.add("show");
i++;
timer=setTimeout(step,280);
}
if(btn)btn.addEventListener("click",function(){
if(btn.classList.contains("done"))return;
btn.classList.add("done");
btn.textContent="展开中…";
i=0;
for(var j=0;j<items.length;j++)items[j].classList.remove("show");
if(timer)clearTimeout(timer);
step();
});
})();
`,
  }),

  '25': page({
    id: '25',
    title: '登记叫号',
    emoji: '📟',
    foreword: `婚姻登记处 · 叫到号却材料缺一 · 荒诞停顿`,
    prev: '24',
    next: '26',
    css: `
body{background:linear-gradient(180deg,#d8e4f0,#c4d0dc);color:#1a2830}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:110px;object-fit:cover;border-radius:12px;display:block}
.title-custom{padding:12px 4px;font-size:19px;letter-spacing:.04em}
.board{padding:18px;border-radius:14px;background:linear-gradient(160deg,#1a3048,#0e1a28);color:#e8eef4;box-shadow:0 16px 36px rgba(20,40,60,.35);border:1px solid #2a4860}
.board-top{display:flex;justify-content:space-between;font-size:11px;opacity:.7;letter-spacing:.12em;margin-bottom:8px}
.num{text-align:center;font-size:52px;font-weight:800;font-family:ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#f5e3a8;text-shadow:0 0 24px rgba(245,227,168,.25)}
.num.flash{animation:flash 1s infinite}
@keyframes flash{50%{opacity:.45;color:#e8a090}}
.sub{text-align:center;font-size:12px;opacity:.8;margin:6px 0 12px}
.yours{display:flex;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.06);font-size:13px;margin-bottom:10px}
.stats{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;opacity:.75;margin-bottom:12px}
.check{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.check div{padding:10px;border-radius:8px;font-size:12px;text-align:center;background:rgba(255,255,255,.06)}
.check .ok{border:1px solid #3a6b57;color:#a8d5ba}
.check .bad{border:1px solid #c45c4a;color:#e8a090;animation:flash 1.2s infinite}
.warn{margin-top:12px;padding:10px;border-radius:8px;background:#fff3e022;color:#f5e3a8;font-size:12px;text-align:center}
.list{margin-top:12px}
.li{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.1);font-size:12px}
.btn{margin-top:12px;width:100%;padding:10px;border:0;border-radius:8px;background:#c9a24b;color:#1a1810;font-weight:700;cursor:pointer}
.paper{margin-top:12px;padding:12px;border-radius:10px;${PAPER}color:#2a2218;font-size:12px;line-height:1.6}
.foot{margin-top:8px;font-size:10px;opacity:.55;text-align:center;color:#1a2830}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(255,255,255,.55);border:1px solid rgba(40,60,80,.12);font-size:12px;line-height:1.5}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#c8d8e8,#a0b4c8);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#f0f4f8;border:1px solid #c8d4e0;font-size:12px;color:#1a2830}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(0,0,0,.03)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(0,0,0,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('government marriage registry LED queue number board blue no people', 'registry board')}
<p class="title-custom">📟 婚姻登记处 · 叫号屏</p>
<div class="board">
<div class="board-top"><span>窗口 03 · 补件综合</span><span id="clk">09:12:44</span></div>
<div class="num" id="cur">A017</div>
<div class="sub">当前办理 · 雨天窗口偏慢 · 请勿离开大厅过远</div>
<div class="yours"><span>你的号</span><b id="mine">A021</b><span>前方 <b id="ahead">4</b> 人</span></div>
<div class="stats"><span>已叫 A017</span><span>雨天加号</span><span>共伞候场区</span></div>
<div class="check" id="check">
<div class="ok">身份证 ✓</div>
<div class="ok">照片 ✓</div>
<div class="bad" data-miss="1">户口页 · 缺</div>
<div class="ok">申请表 ✓</div>
<div class="ok">居住证明 ✓</div>
<div class="bad" data-miss="1">关系说明 · 空</div>
<div class="ok">缴费回执 ✓</div>
<div class="ok">${N.rain}情况说明？</div>
</div>
<div class="warn" id="warn">材料缺一 · 叫到号也将停顿 · 请到补件窗口</div>
<button type="button" class="btn" id="nextCall">模拟叫下一号</button>
<div class="list">
<div class="li"><b>缺件指引</b><span>户口页可至自助机补打</span></div>
<div class="li"><b>关系说明</b><span>可写「共伞同伴 / ${N.name}」</span></div>
<div class="li"><b>窗口建议</b><span>勿写「没事」作理由</span></div>
<div class="li"><b>便民</b><span>一楼${N.store}可买档案袋</span></div>
<div class="li"><b>无障碍</b><span>${N.lamp}走 B 通道</span></div>
<div class="li"><b>叫号提醒</b><span>短信将发：${N.stay}太远</span></div>
</div>
</div>
<div class="paper">补件窗口纸条：关系说明栏允许写「${N.closer}」作为共同生活习惯说明。过号需重新取号。预估办理 12 分。</div>
<div class="foot">取号时间 09:12 · 戏仿登记 · 无真实办理效力</div>
${NPC([
  '👰 候场阿姨：年轻人材料缺一张也敢坐第一排。',
  '🤵 窗口：关系说明空着，系统过不了，别先走去抽烟。',
  '🧑 路人：伞架满了，雨还在下。',
  '💬 祁洵：户口页我去打，你看屏幕。',
  '🏪 店员：档案袋第三排，关东煮在热柜。',
  '📝 你（自言）：叫到 A021 之前把缺项补上。',
  '🌧️ 雨声：靠过来一点看屏幕更清。',
  '📦 系统：本区为「登记叫号」番外旁观串。',
])}
${DX('25', '登记叫号', '叫到号却材料缺一的荒诞停顿', [
  `【叫号屏】窗口+当前号 · 缺项闪烁`,
  `你的号 A021 vs 当前 A017 · 前方 4 人`,
  `材料清单：户口页缺 · 关系说明空`,
  `可写「共伞同伴 / ${N.name}」`,
  `${N.store}可买档案袋 · ${N.lamp}走 B 通道`,
  `短信提醒：${N.stay}太远`,
  `贴本轮：雨 · 伞 · 便利店 · 关东煮`,
  `系统注记：样卡 #25 · C类 · 标签 文件单据·甜·搞笑`,
])}
</div>`,
    script: `
(function(){
var n=17,mine=21;
var cur=document.getElementById("cur");
var ahead=document.getElementById("ahead");
var warn=document.getElementById("warn");
var btn=document.getElementById("nextCall");
var clk=document.getElementById("clk");
function pad(x){return x<10?"0"+x:String(x)}
function tick(){
var d=new Date();
if(clk)clk.textContent=pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
}
setInterval(tick,1000);tick();
function paint(){
if(cur)cur.textContent="A"+("00"+n).slice(-3);
var a=Math.max(0,mine-n);
if(ahead)ahead.textContent=String(a);
if(n>=mine){
cur.classList.add("flash");
warn.textContent="已叫到你的号 · 材料仍缺一 · 请到补件窗口 · 过号需重取";
}else{
cur.classList.remove("flash");
warn.textContent="材料缺一 · 叫到号也将停顿 · 请到补件窗口";
}
}
if(btn)btn.addEventListener("click",function(){
if(n<mine+2)n++;
paint();
});
var miss=document.querySelectorAll("[data-miss]");
for(var i=0;i<miss.length;i++){
miss[i].addEventListener("click",function(){
this.classList.remove("bad");
this.classList.add("ok");
this.textContent=this.textContent.replace("· 缺"," ✓").replace("· 空"," ✓");
this.removeAttribute("data-miss");
var left=document.querySelectorAll("[data-miss]").length;
if(left===0){
warn.textContent="材料已齐 · 请等待叫号 · 可坐候场区共伞";
cur.classList.remove("flash");
}
});
}
paint();
})();
`,
  }),

  '26': page({
    id: '26',
    title: '冷静期倒计时',
    emoji: '⏳',
    foreword: `电子签协议 · 倒计时走字 · 撤回按钮逐渐灰死`,
    prev: '25',
    next: '27',
    css: `
body{background:radial-gradient(ellipse at 50% 0%,#2a2030,#120e16 70%);color:#f0e6f2}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:110px;object-fit:cover;border-radius:12px;display:block;opacity:.9}
.title-custom{padding:12px 4px;font-size:19px;color:#f5e3a8}
.panel{padding:18px;border-radius:16px;background:linear-gradient(165deg,#1e1624,#141018);border:1px solid #3a2a40;box-shadow:0 16px 40px rgba(0,0,0,.4)}
.stats{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;opacity:.75;margin-bottom:14px}
.ring-wrap{display:flex;flex-direction:column;align-items:center;padding:8px 0 16px}
.lab{font-size:11px;opacity:.65;letter-spacing:.16em}
.time{font-size:40px;font-family:ui-monospace,Consolas,monospace;font-weight:700;margin:8px 0;letter-spacing:.04em}
.ring{width:120px;height:120px;border-radius:50%;background:conic-gradient(#c9a24b var(--p,35%),#2a2030 0);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #1a1420,inset 0 0 20px rgba(0,0,0,.4)}
.ring>i{width:88px;height:88px;border-radius:50%;background:#141018;display:flex;align-items:center;justify-content:center;font-size:13px;color:#c9a24b;font-style:normal}
.li{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.08);font-size:12px}
.clause{margin-top:12px;padding:10px;border-radius:8px;background:rgba(255,255,255,.04);font-size:12px;line-height:1.65;opacity:.85}
.btn{width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:linear-gradient(180deg,#e8a0bf,#c45c8a);color:#2a1520;font-weight:800;cursor:pointer;transition:opacity .4s,filter .4s}
.btn.dying{opacity:.55;filter:grayscale(.4)}
.btn.dead{opacity:.35;filter:grayscale(1);text-decoration:line-through;cursor:default;pointer-events:none}
.foot{margin-top:10px;font-size:10px;opacity:.45;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(232,160,191,.15);font-size:12px;line-height:1.5}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#3a2a40,#1a1420);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#1a1420;border:1px solid #2a2030;font-size:12px}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(255,255,255,.04)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(255,255,255,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('dark countdown timer ring violet night rain window no people', 'countdown ring')}
<p class="title-custom">⏳ 分手冷静期 · 电子签</p>
<div class="panel">
<div class="stats"><span>协议 CL-8821</span><span>条款 12</span><span>双方已签</span><span>勿教唆自伤</span></div>
<div class="ring-wrap">
<div class="lab">剩余撤回窗口</div>
<div class="time" id="cd">72:00:00</div>
<div class="ring" id="ring" style="--p:100%"><i id="pct">100%</i></div>
<div class="lab" style="margin-top:10px">起算：${N.rain}${N.store}外 · ${N.lamp}那一刻</div>
</div>
<div class="li"><b>甲方</b><span>你 · 已签</span></div>
<div class="li"><b>乙方</b><span>${N.name} · 已签</span></div>
<div class="li"><b>标的</b><span>「没事」与「${N.stay}」之争议</span></div>
<div class="li"><b>履行地</b><span>共伞半径内</span></div>
<div class="li"><b>违约</b><span>单方面先走 · 需请${N.food}×2</span></div>
<div class="li"><b>例外</b><span>「${N.closer}」可中断倒计时 10 分</span></div>
<div class="clause">条款摘要：倒计时结束前可撤回；结束后按钮将永久灰死。冷静期内禁止删除共享相册${N.rain}分组。本协议为剧情戏仿。</div>
<button type="button" class="btn" id="revoke">撤回冷静期申请</button>
<div class="foot">存证哈希已脱敏 · 演示加速：约 72 秒走完 72 小时</div>
</div>
${NPC([
  '⚖️ 法务旁白：这是戏仿协议，别当真去律师楼。',
  '💬 祁洵：按钮灰之前，你要不要先说一句真的。',
  '🧑 路人：雨里两个人盯着手机，像在等什么判决。',
  '🏪 店员：关东煮还热着，要不要先吃再冷静。',
  '📝 你（自言）：其实不是没事。草稿还在。',
  '🌧️ 雨声：靠过来一点——打完又怕太近。',
  '🕯️ 温虐党：撤回键一点点灰死，比分手台词狠。',
  '📦 系统：本区为「冷静期」番外旁观串。',
])}
${DX('26', '冷静期', '倒计时走字；撤回按钮逐渐灰死', [
  `协议标题戏仿 · CL-8821`,
  `剩余时分秒 + 进度环`,
  `撤回按钮态：可用 → dying → dead`,
  `起算：${N.rain}${N.store}外 · ${N.lamp}`,
  `例外：「${N.closer}」可中断 10 分`,
  `违约：单方面先走 · ${N.food}×2`,
  `禁止删除共享相册${N.rain}分组`,
  `系统注记：样卡 #26 · C类 · 标签 BE·互动·游戏UI`,
])}
</div>`,
    script: `
(function(){
var total=72*3600,left=total,demoFactor=3600;
var cd=document.getElementById("cd");
var ring=document.getElementById("ring");
var pct=document.getElementById("pct");
var btn=document.getElementById("revoke");
var dead=false,paused=false;
function pad(n){n=Math.floor(n);return n<10?"0"+n:String(n)}
function paint(){
var h=Math.floor(left/3600),m=Math.floor((left%3600)/60),s=Math.floor(left%60);
if(cd)cd.textContent=pad(h)+":"+pad(m)+":"+pad(s);
var p=Math.max(0,Math.min(100,(left/total)*100));
if(ring)ring.style.setProperty("--p",p+"%");
if(pct)pct.textContent=Math.round(p)+"%";
if(!btn||dead)return;
if(p<35){btn.classList.add("dying");btn.textContent="撤回窗口将关闭…"}
else{btn.classList.remove("dying");btn.textContent="撤回冷静期申请"}
}
if(btn)btn.addEventListener("click",function(){
if(dead)return;
paused=true;
btn.textContent="已撤回 · 倒计时中断";
btn.classList.add("dead");
dead=true;
if(cd)cd.textContent="—:—:—";
if(pct)pct.textContent="撤回";
});
setInterval(function(){
if(paused||dead)return;
left=Math.max(0,left-demoFactor);
paint();
if(left<=0){
dead=true;
if(btn){btn.classList.add("dead");btn.textContent="撤回（已过窗口）"}
if(pct)pct.textContent="0%";
}
},1000);
paint();
})();
`,
  }),

  '27': page({
    id: '27',
    title: '水电分账',
    emoji: '🧾',
    foreword: `合租账本 · 某项异常高 · 展开才是冷战物证`,
    prev: '26',
    next: '28',
    css: `
body{${PAPER}color:#2a2218}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:110px;object-fit:cover;border-radius:12px;display:block}
.title-custom{padding:12px 4px;font-size:19px}
.sheet{padding:16px;border-radius:14px;background:linear-gradient(180deg,#fffdf8,#f3ebe0);border:1px solid #e0d4c0;box-shadow:0 12px 32px rgba(60,40,20,.12)}
.total{font-size:28px;font-weight:800;margin:4px 0 8px}
.stats{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;opacity:.75;margin-bottom:10px}
.avrow{display:flex;gap:10px;margin-bottom:12px}
.avrow .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(145deg,#efe4d0,#d8c8a8);display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.bill{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:10px 8px;border-bottom:1px dashed rgba(0,0,0,.08);font-size:13px;cursor:pointer}
.bill.bad{background:linear-gradient(90deg,#fff0e8,#fff8f400);border-radius:8px;outline:1px solid #e8a09055}
.bill .m{font-size:11px;opacity:.6;margin-top:2px}
.detail{display:none;padding:8px 10px 10px;font-size:12px;line-height:1.6;background:#fff8f0;border-radius:0 0 8px 8px;margin-top:-4px;margin-bottom:6px;color:#6a4030}
.bill.open+.detail,.detail.open{display:block}
.tip{margin-top:10px;padding:8px 10px;border-radius:8px;background:#fff3e0;font-size:12px;color:#8a6b28}
.btn{width:100%;margin-top:10px;padding:10px;border:0;border-radius:8px;background:#2a2218;color:#f5e3a8;font-weight:700;cursor:pointer}
.btn.sent{opacity:.55}
.foot{margin-top:8px;font-size:10px;opacity:.5;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(40,32,24,.05);border:1px solid rgba(90,70,40,.1);font-size:12px;line-height:1.5}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#efe4d0,#d8c8a8);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#f6f1e8;border:1px solid #e5dccb;font-size:12px}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(0,0,0,.03)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(0,0,0,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('utility bill paper split receipt warm desk lamp no people', 'bill split paper')}
<p class="title-custom">🧾 合租水电 · 分账页</p>
<div class="sheet">
<div class="m" style="font-size:12px;opacity:.65">账期 9 月 · 待确认 · 合租群同步</div>
<div class="total">¥1,286 <span style="font-size:12px;font-weight:500;opacity:.6">待分摊 · 2 人</span></div>
<div class="stats"><span>你应付 ¥643</span><span>${N.name} ¥643</span><span>异常 1</span></div>
<div class="avrow"><span class="av">你</span><span class="av">祁</span></div>
<div class="bill" data-acc="1"><span><b>水费</b><div class="m">抄表日 9/1</div></span><span>¥42</span></div>
<div class="detail">市政抄表正常。两人在家天数接近。无争议。</div>
<div class="bill" data-acc="1"><span><b>电费</b><div class="m">含台灯通宵</div></span><span>¥186</span></div>
<div class="detail">${N.lamp}那晚台灯开了一夜。建议：谁说「没事」谁承担超额 30%。</div>
<div class="bill" data-acc="1"><span><b>网费</b><div class="m">合约未到期</div></span><span>¥99</span></div>
<div class="detail">合约到 12 月。早退需赔违约金——像冷静期条款。</div>
<div class="bill" data-acc="1"><span><b>燃气</b><div class="m">几乎未用</div></span><span>¥35</span></div>
<div class="detail">雨季很少开火。多数外卖与${N.food}。</div>
<div class="bill bad" data-acc="1" id="abn"><span><b>异常·深夜外卖柜</b><div class="m">同址${N.food}×2</div></span><span>¥64</span></div>
<div class="detail open" id="abnDetail">异常项备注：同一地址两单${N.food} · 建议情感入账。分摊规则：谁说「${N.stay}」谁今晚请。「${N.closer}」可协商免息。这是冷战物证，不是算术题。</div>
<div class="bill" data-acc="1"><span><b>清洁</b><div class="m">公区</div></span><span>¥80</span></div>
<div class="detail">公区含伞架沥水。雨季加收。</div>
<div class="bill" data-acc="1"><span><b>伞架沥水垫</b><div class="m">雨季新增</div></span><span>¥28</span></div>
<div class="detail">折叠伞常滴水。垫子上有「8821」记号笔。</div>
<div class="bill" data-acc="1"><span><b>公摊·灯具报修</b><div class="m">${N.lamp}已换</div></span><span>¥52</span></div>
<div class="detail">楼道灯已换。报修单备注：请勿在灯坏处独自停留过久。</div>
<div class="tip">确认后将推送收款码 · 24 小时内未付将记「没事」一次</div>
<button type="button" class="btn" id="collect">一键催收（戏仿）</button>
<div class="foot">账本同步：合租群 · 导出 Excel 可用 · BILL-8821</div>
</div>
${NPC([
  '🧮 合租第三方：异常项点开才好看，别装没看见。',
  '💬 祁洵：那两份关东煮我请，别算进冷战。',
  '🧑 路人：账单比聊天记录诚实。',
  '🏪 店员：双份小票尾号 8821，我记得。',
  '📝 你（自言）：电费那行台灯通宵……是我。',
  '🌧️ 雨声：靠过来一点对账，别隔着屏。',
  '💼 同事乙：你们合租群比项目群活跃。',
  '📦 系统：本区为「水电分账」番外旁观串。',
])}
${DX('27', '水电分账', '某项费用异常高成为冷战物证', [
  `账期+总额 ¥1,286 · 2 人分摊`,
  `异常项：深夜外卖柜 · ${N.food}×2 · ¥64`,
  `展开备注：情感入账 · 「${N.stay}」谁请`,
  `电费含台灯通宵 · ${N.lamp}`,
  `伞架沥水垫 · 雨季新增`,
  `一键催收戏仿`,
  `贴本轮：雨 · 伞 · 便利店 · 关东煮`,
  `系统注记：样卡 #27 · C类 · 标签 文件单据·搞笑·BE`,
])}
</div>`,
    script: `
(function(){
var bills=document.querySelectorAll(".bill");
for(var i=0;i<bills.length;i++){
bills[i].addEventListener("click",function(){
var next=this.nextElementSibling;
if(!next||!next.classList.contains("detail"))return;
var open=next.classList.contains("open");
var details=document.querySelectorAll(".detail");
for(var j=0;j<details.length;j++)details[j].classList.remove("open");
var bs=document.querySelectorAll(".bill");
for(var k=0;k<bs.length;k++)bs[k].classList.remove("open");
if(!open){next.classList.add("open");this.classList.add("open")}
});
}
var btn=document.getElementById("collect");
if(btn)btn.addEventListener("click",function(){
btn.classList.add("sent");
btn.textContent="已催收 · 等待对方确认情感入账";
});
})();
`,
  }),

  '28': page({
    id: '28',
    title: '宠物体检',
    emoji: '🐾',
    foreword: `病历卡 · 医嘱双关 · 动物比人先和好`,
    prev: '27',
    next: '29',
    css: `
body{background:linear-gradient(180deg,#e8f0ea,#d4e0d8);color:#1e2a22}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:110px;object-fit:cover;border-radius:12px;display:block}
.title-custom{padding:12px 4px;font-size:19px}
.card{padding:16px;border-radius:14px;background:linear-gradient(180deg,#f7fbf8,#eef4f0);border:1px solid #c8d8cc;box-shadow:0 12px 28px rgba(40,60,50,.12);position:relative;overflow:hidden}
.card::before{content:"";position:absolute;top:0;left:0;right:0;height:6px;background:repeating-linear-gradient(90deg,#2d6b57,#2d6b57 12px,#c9a24b 12px,#c9a24b 24px)}
.vet-h{font-weight:800;letter-spacing:.1em;margin:8px 0 6px}
.pet{padding:10px;border-radius:10px;background:#fff;border:1px dashed #c8d8cc;font-size:13px;line-height:1.55;margin-bottom:10px}
.stats{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;margin-bottom:10px;opacity:.8}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed rgba(0,0,0,.08);font-size:13px;gap:8px}
.pages{display:flex;gap:0;margin:12px 0;border:1px solid #c8d8cc;border-radius:8px;overflow:hidden;width:fit-content}
.pages button{padding:6px 12px;border:0;background:#fff;font-size:11px;cursor:pointer}
.pages button.on{background:#2d6b57;color:#fff}
.pane{display:none}
.pane.on{display:block}
.advice{margin-top:10px;padding:12px;border-radius:10px;background:#e8f5e0;color:#2d6b37;font-size:12px;line-height:1.65}
.owner{margin-top:10px;padding:10px;border-radius:8px;background:#fff8e8;font-size:12px;line-height:1.6;border:1px solid #e8dcc0}
.foot{margin-top:10px;font-size:10px;opacity:.5;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(255,255,255,.65);border:1px solid rgba(45,107,87,.12);font-size:12px;line-height:1.5}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#d8e8dc,#b0c8b8);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#f0f6f2;border:1px solid #c8d8cc;font-size:12px}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(0,0,0,.03)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(0,0,0,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('veterinary clinic pet exam card soft mint light no people', 'vet card')}
<p class="title-custom">🐾 宠物医院 · 病历卡</p>
<div class="card">
<div class="vet-h">复诊病历 · PET-8821</div>
<div class="pet"><b>名：豆豆</b> · 品种：英短 · 今日复诊<br>监护人：你 / 临时陪同：${N.name}</div>
<div class="stats"><span>体重正常</span><span>疫苗齐</span><span>雷声敏感</span><span>勿虐待描写</span></div>
<div class="pages">
<button type="button" class="on" data-p="vitals">体征</button>
<button type="button" data-p="advice">医嘱</button>
<button type="button" data-p="owner">主人备注</button>
</div>
<div class="pane on" id="vitals">
<div class="row"><span>体温</span><span>正常 · 38.4℃</span></div>
<div class="row"><span>精神</span><span>尚可 · 对雷声敏感</span></div>
<div class="row"><span>食欲</span><span>偏好${N.food}气味（勿喂）</span></div>
<div class="row"><span>睡眠</span><span>${N.rain}惊醒 2 次</span></div>
<div class="row"><span>社交</span><span>对「${N.closer}」有反应</span></div>
<div class="row"><span>环境</span><span>${N.lamp}会躲进伞堆</span></div>
</div>
<div class="pane" id="advice">
<div class="advice">医嘱：主人近期冷战，建议增加陪同抚摸时长。动物比人先和好。复诊提示：若再听到「${N.stay}」而门长时间半开，请检查门锁与情绪。多陪伴——是给猫的，也是给你们的。</div>
<div class="row"><span>下次预约</span><span>两周后 · 可与${N.rain}散步绑定</span></div>
<div class="row"><span>费用</span><span>¥168 · 已付 · 发票抬头个人</span></div>
</div>
<div class="pane" id="owner">
<div class="owner">主人备注栏：<br>· 豆豆不参与冷静期协议<br>· ${N.store}袋禁止给猫闻太久<br>· 若${N.name}来接，可放行<br>· 草稿箱那句「其实不是没事」与猫无关，请勿朗读<br>· 共伞回家时注意爪印</div>
</div>
<div class="foot">仅供剧情戏仿 · 禁止虐待动物描写 · 温柔疏离向</div>
</div>
${NPC([
  '🐱 豆豆（凝视）：你们吵的时候我听得见雷。',
  '👩‍⚕️ 值班医生：医嘱写「多陪伴」时我看了监护人两眼。',
  '💬 祁洵：我来接诊，伞在门口。',
  '🧑 路人：宠物医院门口两个人共一把伞。',
  '🏪 店员：关东煮香别给猫闻，上次被骂了。',
  '📝 你（自言）：动物比人先和好——刺耳但真。',
  '🌧️ 雨声：靠过来一点，豆豆才肯进手提箱。',
  '📦 系统：本区为「宠物体检」番外旁观串。',
])}
${DX('28', '宠物体检', '以宠物视角旁观主人冷战的温柔疏离', [
  `宠物名+品种：豆豆 · 英短`,
  `就诊原因：复诊 · 雷声敏感`,
  `体征正常项 · 环境：${N.lamp}躲伞堆`,
  `医嘱：多陪伴（双关）`,
  `主人备注栏 · ${N.name}可放行`,
  `仪式：翻页到医嘱`,
  `费用 ¥168 · PET-8821`,
  `系统注记：样卡 #28 · C类 · 标签 文件单据·甜·BE`,
])}
</div>`,
    script: `
(function(){
var buttons=document.querySelectorAll(".pages button");
var panes=document.querySelectorAll(".pane");
for(var i=0;i<buttons.length;i++){
buttons[i].addEventListener("click",function(){
var id=this.getAttribute("data-p");
for(var j=0;j<buttons.length;j++)buttons[j].classList.remove("on");
this.classList.add("on");
for(var k=0;k<panes.length;k++){
panes[k].classList.remove("on");
if(panes[k].id===id)panes[k].classList.add("on");
}
});
}
})();
`,
  }),

  '29': page({
    id: '29',
    title: '扫墓导航',
    emoji: '🕯️',
    foreword: `克制纪念 · 到达后留言墙展开 · 禁止血腥恐怖`,
    prev: '28',
    next: '30',
    css: `
body{background:linear-gradient(180deg,#e8ece8,#d0d8d2);color:#243028}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:110px;object-fit:cover;border-radius:12px;display:block;filter:saturate(.85)}
.title-custom{padding:12px 4px;font-size:19px}
.nav{padding:14px;border-radius:14px;background:linear-gradient(165deg,#f4f6f4,#e4ebe6);border:1px solid #c4d0c8;box-shadow:0 12px 28px rgba(40,50,45,.12)}
.bar{font-weight:700;font-size:14px;margin-bottom:8px}
.stats{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;opacity:.75;margin-bottom:10px}
.map{position:relative;height:140px;border-radius:12px;background:
radial-gradient(circle at 70% 40%,#c5d4c8 0 8px,transparent 9px),
linear-gradient(160deg,#c8d4cc,#a8b8b0);overflow:hidden;margin-bottom:10px}
.map-tag{position:absolute;font-size:10px;background:rgba(36,48,40,.7);color:#f0f4f0;padding:3px 8px;border-radius:4px}
.map-tag.a{left:10px;bottom:10px}.map-tag.b{right:10px;top:12px}
.pin{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);text-align:center}
.pin .sym{font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
.pin .lab{font-size:11px;margin-top:2px;color:#1e2a22;font-weight:650}
.arrive{text-align:center;padding:8px;border-radius:8px;background:#2d6b5722;color:#2d6b57;font-size:12px;font-weight:700;margin-bottom:10px;opacity:0;transition:opacity .5s}
.arrive.on{opacity:1}
.wall{max-height:0;overflow:hidden;opacity:0;transition:max-height .55s ease,opacity .45s}
.wall.on{max-height:420px;opacity:1}
.note{padding:8px 10px;margin-bottom:6px;border-radius:8px;background:#fff;border-left:3px solid #6a8a70;font-size:12px;line-height:1.55}
.flower{text-align:center;margin-top:10px;font-size:12px;opacity:.7}
.btn{width:100%;padding:10px;border:0;border-radius:8px;background:#243028;color:#e8f0e8;font-weight:700;cursor:pointer}
.btn.done{opacity:.55}
.tip{margin-top:10px;padding:8px;border-radius:8px;background:#fff8e8;font-size:12px;line-height:1.55}
.foot{margin-top:8px;font-size:10px;opacity:.5;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(255,255,255,.6);border:1px solid rgba(36,48,40,.1);font-size:12px;line-height:1.5}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#d0dcd4,#b0c0b8);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#eef2f0;border:1px solid #c4d0c8;font-size:12px}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(0,0,0,.03)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(0,0,0,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('quiet memorial garden mist path umbrella flowers solemn no people', 'memorial path')}
<p class="title-custom">🕯️ 纪念园 · 扫墓导航</p>
<div class="nav">
<div class="bar">导航 · 纪念园 · 目的地化名「灯下」</div>
<div class="stats"><span>步行剩余 <b id="dist">320</b> m</span><span>雨 小</span><span>共伞模式</span></div>
<div class="map">
<span class="map-tag a">${N.store}方向</span>
<span class="map-tag b">回程 · 伞可共</span>
<div class="pin"><div class="sym">❦</div><div class="lab" id="pinLab">前往中…</div></div>
</div>
<div class="arrive" id="arrive">已到达 · 碑前 · 请肃静</div>
<button type="button" class="btn" id="go">模拟到达终点</button>
<div class="wall" id="wall">
<div class="note"><b>留言 01</b> · 伞还在，人会来。</div>
<div class="note"><b>留言 02</b> · 今年花换了白的。</div>
<div class="note"><b>留言 03</b> · ${N.stay}——写给还在路上的人。</div>
<div class="note"><b>留言 04</b> · ${N.store}的${N.food}热了，回来吃。</div>
<div class="note"><b>留言 05</b> · ${N.lamp}也看得见字。</div>
<div class="note"><b>留言 06</b> · ${N.name}到了。「${N.closer}」。</div>
<div class="note"><b>留言 07</b> · 雨小了，我们走吧——一起。</div>
<div class="flower">献花示意 · 白菊 · 请勿踩踏草坪</div>
</div>
<div class="tip">导航结束语：目的地不只是坐标，也是愿意等的人。本页为克制纪念向戏仿，禁止血腥恐怖与美化自杀。</div>
<div class="foot">离线地图已缓存 · 回程建议共伞模式 · NAV-8821</div>
</div>
${NPC([
  '🕊️ 园丁：花换了白的，和往年一样。',
  '💬 祁洵：到了。伞我撑着，你看留言。',
  '🧑 路人：雨小了，碑前有两个人。',
  '🏪 店员：关东煮打包好了，回来再热。',
  '📝 你（自言）：别先走——写给还在路上的人。',
  '🌧️ 雨声：靠过来一点，字才不被打湿。',
  '🕯️ 温虐党：到达后留言淡入，比哭戏克制。',
  '📦 系统：本区为「扫墓导航」番外旁观串。',
])}
${DX('29', '扫墓导航', '导航到达后留言墙展开的克制纪念', [
  `导航卡片：目的地化名「灯下」`,
  `路线摘要：步行 · 雨小 · 共伞模式`,
  `到达态 · 碑前肃静`,
  `留言墙 7 条短 · 含「${N.stay}」`,
  `献花示意 · 白菊`,
  `${N.name}到了 · 「${N.closer}」`,
  `回程建议共伞模式`,
  `系统注记：样卡 #29 · C类 · 标签 BE·物证`,
])}
</div>`,
    script: `
(function(){
var dist=document.getElementById("dist");
var arrive=document.getElementById("arrive");
var wall=document.getElementById("wall");
var btn=document.getElementById("go");
var pinLab=document.getElementById("pinLab");
var d=320,timer=null,done=false;
function paint(){if(dist)dist.textContent=String(d)}
if(btn)btn.addEventListener("click",function(){
if(done)return;
btn.classList.add("done");
btn.textContent="前往中…";
if(timer)clearInterval(timer);
timer=setInterval(function(){
d=Math.max(0,d-40);
paint();
if(d<=0){
clearInterval(timer);
done=true;
if(pinLab)pinLab.textContent="已到达 · 碑前";
if(arrive)arrive.classList.add("on");
if(wall)wall.classList.add("on");
btn.textContent="已到达 · 留言已展开";
}
},200);
});
paint();
})();
`,
  }),

  '30': page({
    id: '30',
    title: '胶囊解封',
    emoji: '🫙',
    foreword: `时间胶囊 · 蜡封锁态 / 到日开盖 · 倒计时解封`,
    prev: '29',
    next: '31',
    css: `
body{background:radial-gradient(ellipse at 40% 10%,#3a2a20,#1a1410 65%);color:#f0e6d8}
.stage{max-width:420px;margin:12px auto 28px;padding:0 12px 24px}
.hero{width:100%;height:120px;object-fit:cover;border-radius:12px;display:block}
.title-custom{padding:12px 4px;font-size:19px;color:#f5e3a8}
.cap{position:relative;padding:22px 18px 20px;border-radius:16px;${PAPER}color:#2a2218;
box-shadow:0 18px 40px rgba(0,0,0,.45);border:1px solid #c4b090}
.cap-time{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;text-align:center}
.cap-time>div{flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,.4);border:1px solid #d8ccb4}
.cap-time .m{font-size:10px;opacity:.6;letter-spacing:.12em}
.cap-time b{display:block;margin-top:4px;font-size:16px}
.cap-time b.gold{color:#8a6b28}
.stats{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;font-size:11px;opacity:.75;margin-bottom:12px}
.seal-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;margin:8px 0 14px}
.wax{width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#c45c4a,#7a2418 55%,#4a120c);
box-shadow:0 6px 16px rgba(80,20,10,.35),inset 0 2px 4px rgba(255,200,160,.3);display:flex;align-items:center;justify-content:center;color:#f5e3a8;font-size:11px;font-weight:800;letter-spacing:.2em;transition:transform .5s,opacity .5s,filter .5s}
.wax.broken{transform:scale(1.08) rotate(18deg);opacity:.35;filter:blur(1px)}
.cd{font-family:ui-monospace,Consolas,monospace;font-size:22px;font-weight:700;color:#8a6b28}
.lock{position:relative}
.lock .veil{position:absolute;inset:0;border-radius:10px;background:rgba(42,34,24,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;color:#f5e3a8;font-size:13px;letter-spacing:.08em;transition:opacity .5s;z-index:2}
.lock.open .veil{opacity:0;pointer-events:none}
.body{padding:12px;border-radius:10px;background:rgba(255,255,255,.45);font-size:13px;line-height:1.75;border:1px solid #d8ccb4;min-height:120px}
.btn{width:100%;margin-top:12px;padding:11px;border:0;border-radius:8px;background:linear-gradient(180deg,#5a3a28,#3a2418);color:#f5e3a8;font-weight:700;cursor:pointer}
.btn.dis{opacity:.45;pointer-events:none}
.btn.alt{background:transparent;border:1px solid #c4b090;color:#5a4a38;margin-top:8px}
.rel{margin-top:10px;font-size:11px;opacity:.7;line-height:1.55}
.foot{margin-top:8px;font-size:10px;opacity:.5;text-align:center}
.npc-block{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.npc-row{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:rgba(240,230,210,.08);border:1px solid rgba(201,162,75,.2);font-size:12px;line-height:1.5;color:#e8dcc8}
.av{flex:0 0 32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#4a4030,#2a2418);display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.dense{margin-top:16px;padding:14px;border-radius:14px;background:#1e1a14;border:1px solid #3a3228;font-size:12px;color:#e8dcc8}
.dx-h{font-weight:700;font-size:14px}.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px}
.dx-list{border-radius:8px;overflow:hidden;background:rgba(255,255,255,.04)}
.dx-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(255,255,255,.08);line-height:1.45}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;min-width:22px}
`,
    body: `
<div class="stage">
${HERO('time capsule wax seal parchment letter warm candlelight no people', 'time capsule wax')}
<p class="title-custom">🫙 时间胶囊 · 解封倒计时</p>
<div class="cap">
<div class="cap-time">
<div><div class="m">埋下</div><b>2024.09.04</b></div>
<div><div class="m">开启</div><b class="gold" id="openDay">倒计时中</b></div>
</div>
<div class="stats"><span>密封 365 天</span><span>地点：${N.store}旁</span><span>TC-8821</span></div>
<div class="seal-wrap">
<div class="wax" id="wax">封</div>
<div class="cd" id="capCd">00:15</div>
</div>
<div class="lock" id="lock">
<div class="veil" id="veil">蜡封未解 · 倒计时结束前不可读</div>
<div class="body" id="letter">
<div class="m" style="font-size:11px;opacity:.65;margin-bottom:6px">写给一年后的你们 · 署名：${N.name} &amp; 你</div>
<p>如果伞还在，就再往中间挪一寸。${N.food}默认两份。${N.lamp}也可以站一会儿。若有人说「没事」，请追问一次。若要走，请先听见「${N.stay}」。「${N.closer}」——这句话一年过期。</p>
<p style="margin-top:8px">附：票根两张、积分卡一张、被雨洇开的便签复印件。打开时若仍在下雨，请就地共伞读完。</p>
</div>
</div>
<button type="button" class="btn dis" id="unseal">解封（等待倒计时）</button>
<button type="button" class="btn alt" id="skip">演示：加速至解封</button>
<div class="rel">解封校验：口令「8821」或指纹任一 · 后续可再埋下一封 · 再次封存将灰显</div>
<div class="foot">胶囊编号 TC-8821 · 剧情道具 · 无实物快递 · 仪式感=解封分层</div>
</div>
${NPC([
  '🕯️ 温虐党：蜡封裂开的那一下，比告白台词响。',
  '💬 祁洵：一年前写的，今天读给你听。',
  '🧑 路人：便利店旁两个人共伞读信。',
  '🏪 店员：关东煮我先给你们留两份。',
  '📝 你（自言）：「靠过来一点」一年过期——那就不让它过期。',
  '🌧️ 雨声：灯坏了也可以站一会儿。',
  '📦 系统：本区为「胶囊解封」番外旁观串。',
  '🫙 旁白：锁态与开盖两态，今天是开盖日。',
])}
${DX('30', '胶囊解封', '未到日锁态 / 到日开盖的两种时态切换', [
  `时间戳对照：埋下 2024.09.04 ↔ 开启今天`,
  `锁态：蜡封蒙层不可读`,
  `解封态：留言正文展开`,
  `写给未来的称谓：${N.name} & 你`,
  `口令 8821 · 共伞读完`,
  `附：票根 / 积分卡 / 雨洇便签`,
  `再次封存灰显`,
  `系统注记：样卡 #30 · C类 · 标签 互动·甜`,
])}
</div>`,
    script: `
(function(){
var left=15,opened=false;
var cd=document.getElementById("capCd");
var wax=document.getElementById("wax");
var lock=document.getElementById("lock");
var unseal=document.getElementById("unseal");
var skip=document.getElementById("skip");
var openDay=document.getElementById("openDay");
function pad(n){return n<10?"0"+n:String(n)}
function paint(){
if(cd)cd.textContent="00:"+pad(left);
}
function openCap(){
if(opened)return;
opened=true;
if(wax)wax.classList.add("broken");
if(lock)lock.classList.add("open");
if(unseal){unseal.classList.remove("dis");unseal.textContent="已解封 · 正文可读";unseal.classList.add("dis")}
if(openDay)openDay.textContent="今天";
if(cd)cd.textContent="OPEN";
if(skip){skip.classList.add("dis");skip.textContent="已解封"}
}
if(unseal)unseal.addEventListener("click",function(){
if(left>0||opened)return;
openCap();
});
if(skip)skip.addEventListener("click",function(){
if(opened)return;
left=0;
paint();
if(unseal)unseal.classList.remove("dis");
unseal.textContent="解封蜡印";
});
var t=setInterval(function(){
if(opened){clearInterval(t);return}
if(left>0){left--;paint()}
if(left<=0){
clearInterval(t);
if(unseal){unseal.classList.remove("dis");unseal.textContent="解封蜡印"}
if(cd)cd.textContent="READY";
}
},1000);
paint();
})();
`,
  }),
}
