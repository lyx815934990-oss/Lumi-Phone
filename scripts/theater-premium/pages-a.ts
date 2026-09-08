/** A 类 01–12：日常物证 · App 拟真 */
import { page, N, PAPER, TICKET } from './shared.ts'

const MW = `max-width:800px;margin:0 auto;`
const img = (prompt: string, alt: string) =>
  `<img class="hero" alt="${alt}" src="https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}">`

const base = `
.stage{${MW}padding:0 12px 32px}
.hero{width:100%;max-width:800px;margin:0 auto;height:132px;object-fit:cover;display:block;border-radius:0 0 4px 4px}
.shell{${MW}border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(20,16,12,.2);margin-top:-8px;position:relative}
.title-custom{margin:0;padding:14px 16px;font-size:18px;font-weight:750}
.stats{display:flex;flex-wrap:wrap;gap:10px 14px;padding:8px 14px;font-size:11px}
.stats b{font-weight:750}
.av{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:6px;background:rgba(0,0,0,.06);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);flex-shrink:0}
.npc{margin:10px 12px;padding:10px 12px;border-radius:12px;font-size:12px;line-height:1.55;display:flex;gap:8px;align-items:flex-start}
.tip{margin:8px 12px;padding:8px 10px;border-radius:8px;font-size:12px;line-height:1.55}
.foot{padding:10px 14px 18px;font-size:10px;opacity:.55;line-height:1.5}
.btn{border:0;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer}
.btn:active{transform:translateY(1px)}
.btn.dis{opacity:.4;pointer-events:none}
.row{padding:10px 12px;margin:0 12px 8px;border-radius:12px;font-size:13px;line-height:1.55;cursor:pointer}
.m{font-size:11px;opacity:.62}
`

export const PAGES_A: Record<string, string> = {
  '01': page({
    id: '01',
    title: '未发送草稿箱',
    emoji: '📝',
    foreword: `其实我想说的不是没事——光标还停在「我」后面。`,
    next: '02',
    css:
      base +
      `
body{background:linear-gradient(165deg,#d8dee8,#c8d0dc 40%,#b8c4d4);color:#1a2430}
.shell{background:linear-gradient(180deg,#f7f8fa,#eef1f5);border:1px solid rgba(255,255,255,.7);backdrop-filter:blur(12px)}
.title-custom{background:rgba(255,255,255,.85);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
.badge{background:#e85d2c;color:#fff;border-radius:99px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px}
.stats{background:#e8ecf2;border-bottom:1px solid #dde3ea}
.row{background:#fff;border:1px solid #e4e9f0;box-shadow:0 4px 14px rgba(30,40,60,.05)}
.row.open{border-color:#c9a24b;background:linear-gradient(180deg,#fffdf6,#fff8ea)}
.row .body{display:none;margin-top:8px;padding-top:8px;border-top:1px dashed #e8e0d0;font-size:13px;color:#2a2622}
.row.open .body{display:block}
.tip{background:#eef2ff;color:#3a4a6a;border:1px solid #d8e0f5}
.npc{background:#fff;border:1px solid #e4e9f0}
.btn{background:#c9a24b;color:#fff;margin:4px 6px}
.actions{padding:8px 12px 4px;display:flex;flex-wrap:wrap;gap:4px}
`,
    body: `
<div class="stage">
${img('rainy night phone screen glow soft blur empty street convenience store warm light no people', '雨夜手机光')}
<div class="shell">
<p class="title-custom"><span>未发送 · 草稿箱</span><span class="badge" id="badge">8</span></p>
<div class="stats"><span>今日编辑 <b>5</b></span><span>自动存 <b>23:41</b></span><span>${N.store}灯下 · 雨未停</span></div>
<div class="row open" data-d="1"><div><span class="av">☔</span><b>${N.name}</b> <span class="m">23:40 · 已改 11 次</span></div><div class="m" style="margin-top:4px">其实我想说的不是没事……</div><div class="body">其实我想说的不是「没事」。${N.umbrella}还可以再往中间挪一点。${N.food}我点了两份——你${N.stay}。路口那盏${N.lamp}，我还能站一会儿。${N.closer}，好吗。</div></div>
<div class="row" data-d="2"><div><span class="av">💡</span><b>${N.name}</b> <span class="m">昨夜 01:06</span></div><div class="m" style="margin-top:4px">${N.lamp}也没关系，我……</div><div class="body">光标停在「我」后面。后面本该是「想留你一会儿」，删了又粘了三遍。</div></div>
<div class="row" data-d="3"><div><span class="av">🏪</span><b>备注·${N.store}</b> <span class="m">周一 22:18</span></div><div class="m" style="margin-top:4px">到了说一声。柜还热着。</div><div class="body">南门${N.store}旁。${N.food}柜温检测：仍热。别装没看见红点。</div></div>
<div class="row" data-d="4"><div><span class="av">🌂</span><b>${N.name}</b> <span class="m">上周日</span></div><div class="m" style="margin-top:4px">那句还是删了吧……太直白。</div><div class="body">「${N.stay}」太直白。可是不写，雨声更吵。</div></div>
<div class="row" data-d="5"><div><span class="av">🌧️</span><b>${N.name}</b> <span class="m">9/1</span></div><div class="m" style="margin-top:4px">${N.umbrella}借你，记得还——或别还也行。</div><div class="body">伞骨有点歪。歪的那把，才是我们的。</div></div>
<div class="row" data-d="6"><div><span class="av">📭</span><b>群发·取消</b> <span class="m">8/28</span></div><div class="m" style="margin-top:4px">雨停了吗 / 你到家了吗 / ……已清空</div><div class="body">三条都没发出去。清空键按得很轻，像怕被听见。</div></div>
<div class="row" data-d="7"><div><span class="av">🪞</span><b>${N.name}</b> <span class="m">8/20</span></div><div class="m" style="margin-top:4px">${N.closer}——打完又怕太近。</div><div class="body">发送键灰着。内容含「未确认情绪词」。</div></div>
<div class="row" data-d="8"><div><span class="av">🎫</span><b>备注·停车</b> <span class="m">昨夜</span></div><div class="m" style="margin-top:4px">副驾有一把未取的伞</div><div class="body">过夜 7 小时 14 分。票根另存。</div></div>
<div class="tip">提示：点草稿展开全文；发送键灰显——系统判定「说出口会改变今晚」。</div>
<div class="actions"><button class="btn" type="button" id="expand">全部展开/收起</button><button class="btn dis" type="button">发送</button><button class="btn" type="button" id="save">存草稿</button></div>
<div class="npc"><span class="av">🧑</span><div><b>路人甲</b>：${N.lamp}也站着，${N.food}点两份的人很少只是路过。</div></div>
<div class="foot">草稿箱 8/50 · 弱网同步失败 · 会话「${N.name}」置顶 · 小剧场示范</div>
</div></div>`,
    script: `
(function(){
var rows=document.querySelectorAll(".row[data-d]");
var openAll=true;
function paint(){var n=0;for(var i=0;i<rows.length;i++){if(rows[i].classList.contains("open"))n++}var b=document.getElementById("badge");if(b)b.textContent=String(rows.length)}
for(var i=0;i<rows.length;i++){rows[i].addEventListener("click",function(){this.classList.toggle("open");paint()})}
var ex=document.getElementById("expand");
if(ex)ex.addEventListener("click",function(){openAll=!openAll;for(var j=0;j<rows.length;j++){if(openAll)rows[j].classList.add("open");else rows[j].classList.remove("open")}if(rows[0])rows[0].classList.add("open");paint()});
var sv=document.getElementById("save");
if(sv)sv.addEventListener("click",function(){sv.textContent="已保存 · 23:41";setTimeout(function(){sv.textContent="存草稿"},900)});
paint();
})();`,
  }),

  '02': page({
    id: '02',
    title: '共享相册冲突',
    emoji: '📷',
    foreword: `同一张伞下侧脸——你删了，他加星了。`,
    prev: '01',
    next: '03',
    css:
      base +
      `
body{background:linear-gradient(160deg,#e8e0d4,#d4c8b8);color:#2a2420}
.shell{background:#faf8f4;border:1px solid #e5dcc8}
.title-custom{background:#f3efe6;border-bottom:1px solid #e5dcc8}
.warn{margin:8px 12px;padding:8px 10px;border-radius:8px;background:#fff3e0;border:1px solid #f0d0a0;font-size:12px;color:#7a4a10}
.split{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 12px}
.col{border-radius:12px;padding:10px;min-height:200px}
.col.del{background:#f5e8e6;border:1px dashed #d8a090}
.col.keep{background:#e8f0ea;border:1px solid #b0d0b8}
.col h4{margin:0 0 8px;font-size:12px}
.thumb{height:56px;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:.2s}
.thumb:hover{transform:scale(1.02)}
.thumb.gone{background:repeating-linear-gradient(45deg,#ddd,#ddd 4px,#eee 4px,#eee 8px);opacity:.55}
.note{display:none;margin:8px 12px;padding:10px;border-radius:10px;background:#fff;border:1px solid #e5dcc8;font-size:12px;line-height:1.55}
.note.on{display:block}
.npc{background:#fff;border:1px solid #e5dcc8}
.btn{background:#5a8a6a;color:#fff;margin:8px 12px}
`,
    body: `
<div class="stage">
${img('shared photo album conflict rain umbrella steam abstract collage no people', '相册冲突')}
<div class="shell">
<p class="title-custom">共享相册 · ${N.rain} · 冲突待处理</p>
<div class="stats"><span>共有 <b>48</b></span><span>争议 <b>3</b></span><span>最近删除 <b>3</b></span></div>
<div class="warn">冲突：同一批雨夜照片被双方处理不同 · 需手动合并</div>
<div class="split">
<div class="col del"><h4>你 · 已删除</h4>
<div class="thumb gone" data-n="删·伞下侧脸"></div>
<div class="thumb gone" data-n="删·便利店橱窗"></div>
<div class="thumb gone" data-n="删·关东煮蒸汽"></div>
<div class="m">移入最近删除 · 剩余 29 天</div></div>
<div class="col keep"><h4>${N.name} · 仍保留</h4>
<div class="thumb" style="background:linear-gradient(135deg,#c4b09a,#8a7060)" data-n="留·伞下侧脸 · 备注：别删这张"></div>
<div class="thumb" style="background:linear-gradient(135deg,#8a9ab0,#5a6a78)" data-n="留·灯坏了之后 · 噪点多但人在"></div>
<div class="thumb" style="background:linear-gradient(135deg,#a8c4b8,#6a8a7a)" data-n="留·靠过来一点 · 边缘有字"></div>
<div class="m">23:52 加星 · ${N.stay}</div></div>
</div>
<div class="note" id="note">点选色块查看备注</div>
<button class="btn" type="button" id="merge">尝试合并（演示）</button>
<div class="npc"><span class="av">🗂️</span><div><b>同步日志</b>：弱网重试 2 次。若恢复删除侧，将覆盖对方时间戳。</div></div>
<div class="foot">相册「雨夜未命名」· 创建人：你 / ${N.name} · 128MB</div>
</div></div>`,
    script: `
(function(){
var note=document.getElementById("note");
var thumbs=document.querySelectorAll(".thumb");
for(var i=0;i<thumbs.length;i++){thumbs[i].addEventListener("click",function(){if(!note)return;note.textContent=this.getAttribute("data-n")||"";note.classList.add("on")})}
var m=document.getElementById("merge");
if(m)m.addEventListener("click",function(){m.textContent="已生成冲突报告 · 未自动覆盖";m.classList.add("dis")});
})();`,
  }),

  '03': page({
    id: '03',
    title: '快递柜取件',
    emoji: '📦',
    foreword: `取件码 8821——热区，两份关东煮。`,
    prev: '02',
    next: '04',
    css:
      base +
      `
body{background:#1a222c;color:#e8eef4}
.shell{background:linear-gradient(180deg,#243040,#1a2430);border:1px solid #2a3848;color:#e8eef4}
.title-custom{text-align:center;border-bottom:1px solid #2a3848;letter-spacing:.2em}
.code{text-align:center;font-size:32px;letter-spacing:.35em;font-family:ui-monospace,Consolas,monospace;font-weight:800;color:#f5e3a8;padding:12px;text-shadow:0 0 20px #c9a24b55}
.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}
.key{padding:14px 0;border:0;border-radius:10px;background:#2a3848;color:#e8eef4;font-size:16px;font-weight:700;cursor:pointer}
.key.ok{background:#c9a24b;color:#1a1810}
.door{margin:12px;padding:14px;border-radius:12px;background:#121820;border:1px dashed #3a4858;text-align:center;opacity:.45;transition:.4s}
.door.open{opacity:1;border-color:#c9a24b;box-shadow:0 0 24px #c9a24b33}
.npc{background:#243040;color:#c8d4e0}
.tip{background:#243040;color:#9ab0c4}
`,
    body: `
<div class="stage">
${img('smart locker panel night rain neon keypad warm metal no people', '快递柜屏')}
<div class="shell">
<p class="title-custom">SMART BOX · A-12</p>
<div class="stats" style="justify-content:center"><span>南门${N.store}旁</span><span>格口 B07 · 热</span><span>催取 1</span></div>
<div class="code" id="code">····</div>
<div class="keys">
<button class="key" type="button" data-k="1">1</button><button class="key" type="button" data-k="2">2</button><button class="key" type="button" data-k="3">3</button>
<button class="key" type="button" data-k="4">4</button><button class="key" type="button" data-k="5">5</button><button class="key" type="button" data-k="6">6</button>
<button class="key" type="button" data-k="7">7</button><button class="key" type="button" data-k="8">8</button><button class="key" type="button" data-k="9">9</button>
<button class="key" type="button" data-k="C">清空</button><button class="key" type="button" data-k="0">0</button><button class="key ok" type="button" data-k="OK">开柜</button>
</div>
<div class="door" id="door">格口锁定 · 输入 8821 开柜</div>
<div class="tip">寄件备注：两份${N.food} · ${N.stay} · 请在 60 秒内取物</div>
<div class="npc"><span class="av">🧑‍💼</span><div><b>柜机旁白</b>：异常开柜将录像 15 秒。那位先生问了三次够不够热。</div></div>
<div class="foot">客服已脱敏 · 有效期今日 23:59</div>
</div></div>`,
    script: `
(function(){
var buf="";var code=document.getElementById("code");var door=document.getElementById("door");
function paint(){if(code)code.textContent=(buf+"····").slice(0,4).split("").join(" ")}
var keys=document.querySelectorAll(".key");
for(var i=0;i<keys.length;i++){keys[i].addEventListener("click",function(){
var k=this.getAttribute("data-k");
if(k==="C"){buf="";if(door){door.classList.remove("open");door.textContent="格口锁定 · 输入 8821 开柜"}paint();return}
if(k==="OK"){if(buf==="8821"){if(door){door.classList.add("open");door.textContent="B07 已弹开 · 两份关东煮 · 蒸汽扑面"}}else{if(door){door.textContent="密码错误 · 已记录"}}return}
if(buf.length<4)buf+=k;paint();
})}
paint();
})();`,
  }),

  '04': page({
    id: '04',
    title: '医院挂号屏',
    emoji: '🏥',
    foreword: `号序往前跳——病历备注写着：独处时易加重。`,
    prev: '03',
    next: '05',
    css: base + `
body{background:linear-gradient(180deg,#e8f5f0,#d0e8e0);color:#1a3a30}
.shell{background:#f3faf7;border:1px solid #c8e0d4}
.title-custom{background:#e8f5f0;border-bottom:1px solid #c8e0d4;color:#2d6b57}
.big{text-align:center;padding:16px}
.big .n{font-size:56px;font-weight:800;color:#2d6b57;line-height:1}
.prog{height:8px;background:#d0e8e0;border-radius:99px;margin:12px 24px;overflow:hidden}
.prog>i{display:block;height:100%;width:62%;background:linear-gradient(90deg,#3a9a78,#c9a24b);transition:width .5s}
.panel{margin:8px 12px;padding:12px;border-radius:12px;background:#fff;border:1px solid #d0e8e0;font-size:13px;line-height:1.6}
.btn{background:#2d6b57;color:#fff;margin:8px 12px}
.npc{background:#fff;border:1px solid #d0e8e0}
`,
    body: `
<div class="stage">
${img('hospital waiting hall soft mint light empty chairs calm no people', '候诊厅')}
<div class="shell">
<p class="title-custom">市一院 · 内科 · 小程序</p>
<div class="stats"><span>雨夜后复诊</span><span>网络良好</span><span>卡尾 8821</span></div>
<div class="big"><div class="m">当前叫号</div><div class="n" id="cur">17</div><div style="margin-top:8px">你的号 <b id="mine">21</b> · 前方约 <b id="wait">4</b> 人</div></div>
<div class="prog"><i id="bar"></i></div>
<div class="panel"><b>电子病历备注</b><br>主诉：${N.rain}后心率偏快。医嘱旁注：独处时易加重——建议有人陪。患者口述：「${N.lamp}的走廊我也站得住。」</div>
<div class="panel"><b>当日流水</b><br>08:12 取号 · 08:40 候诊 · 09:05 叫号将至 · 备注同步：${N.name}已设为紧急联系人（未确认）</div>
<button class="btn" type="button" id="tick">模拟叫号 +1</button>
<div class="npc"><span class="av">👩‍⚕️</span><div><b>导诊</b>：请勿离开候诊区。${N.lamp}的走廊请走另一侧。</div></div>
<div class="foot">过号需重新取号 · 今日第 2 次打开</div>
</div></div>`,
    script: `(function(){var cur=17,mine=21;function paint(){var c=document.getElementById("cur"),w=document.getElementById("wait"),b=document.getElementById("bar");if(c)c.textContent=String(cur);if(w)w.textContent=String(Math.max(mine-cur,0));if(b)b.style.width=Math.min(100,((cur-10)/(mine-10+4))*100)+"%"}var t=document.getElementById("tick");if(t)t.addEventListener("click",function(){if(cur<mine){cur++;paint();if(cur===mine)t.textContent="请到诊室"}});paint()})();`,
  }),

  '05': page({
    id: '05',
    title: '地铁乘车记录',
    emoji: '🚇',
    foreword: `便利店站停留 26 分——灯坏了也能站。`,
    prev: '04',
    next: '06',
    css: base + `
body{background:#121820;color:#d8e4f0}
.shell{background:linear-gradient(180deg,#1a2430,#121820);border:1px solid #2a3848}
.title-custom{border-bottom:1px solid #2a3848}
.tl{display:flex;gap:12px;padding:10px 14px;border-left:3px solid #2a3848;margin-left:18px;font-size:13px}
.tl span{font-family:ui-monospace,Consolas,monospace;opacity:.7;min-width:48px}
.tl.hot{border-color:#c9a24b;background:rgba(201,162,75,.08)}
.btn{background:#c9a24b;color:#1a1810;margin:8px 12px}
.npc{background:#243040}
`,
    body: `
<div class="stage">
${img('subway tunnel night rain reflection abstract lights no people', '地铁夜')}
<div class="shell">
<p class="title-custom">乘车记录 · 9/4</p>
<div class="stats"><span>里程 42.6 km</span><span>异常 1</span><span>雨未停</span></div>
<div class="tl"><span>08:12</span><div><b>进站 · 南门</b><div class="m">正常</div></div></div>
<div class="tl"><span>08:41</span><div><b>换乘 · 中环</b><div class="m">停留 3 分</div></div></div>
<div class="tl"><span>18:20</span><div><b>出站 · 公司</b><div class="m">正常</div></div></div>
<div class="tl hot" id="hot"><span>23:18</span><div><b>异常停留 · ${N.store}站</b><div class="m">停留 26 分 · ${N.lamp}也能站 · ${N.food}蒸汽</div></div></div>
<div class="tl"><span>23:47</span><div><b>出站 · 小区口</b><div class="m">${N.umbrella}歪了一点</div></div></div>
<div class="tl"><span>23:52</span><div><b>步行</b><div class="m">共伞半径记录：偏近</div></div></div>
<button class="btn" type="button" id="focus">定位异常点</button>
<div class="npc"><span class="av">🎫</span><div><b>闸机旁白</b>：本周碳排放已计算。下次${N.rain}请备干毛巾。</div></div>
<div class="foot">申诉通道已开 · 剧情戏仿</div>
</div></div>`,
    script: `(function(){var h=document.getElementById("hot");var b=document.getElementById("focus");if(b&&h)b.addEventListener("click",function(){h.scrollIntoView({behavior:"smooth",block:"center"});h.style.boxShadow="0 0 0 2px #c9a24b";setTimeout(function(){h.style.boxShadow="none"},1200)})})();`,
  }),

  '06': page({
    id: '06',
    title: '停车场小票',
    emoji: '🅿️',
    foreword: `过夜七小时——副驾还有一把伞。`,
    prev: '05',
    next: '07',
    css: `
body{background:#2a2824;color:#2a2218;${PAPER}}
.stage{max-width:420px;margin:16px auto 40px;padding:0 12px}
.ticket{${TICKET}border-radius:4px;padding:18px 16px 22px;box-shadow:0 16px 40px rgba(0,0,0,.35);position:relative;font-family:"Courier New",ui-monospace,Consolas,"PingFang SC",monospace}
.ticket::before,.ticket::after{content:"";position:absolute;left:0;right:0;height:12px;background:radial-gradient(circle,transparent 4px,#2a2824 5px);background-size:12px 12px}
.ticket::before{top:-6px}.ticket::after{bottom:-6px;transform:rotate(180deg)}
.title-custom{text-align:center;font-size:15px;letter-spacing:.2em;margin-bottom:8px}
.no{text-align:center;font-size:11px;opacity:.7;margin-bottom:12px}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed rgba(0,0,0,.15);font-size:13px}
.row.big{font-size:16px;font-weight:800;color:#8a5a10;border-bottom:2px solid #c9a24b55;margin:8px 0}
.stamp{position:absolute;right:18px;top:70px;width:72px;height:72px;border:3px solid #c45a4a;border-radius:50%;color:#c45a4a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;transform:rotate(-18deg);opacity:.85;letter-spacing:.05em}
.btn{display:block;width:100%;margin-top:14px;padding:10px;border:1px dashed #8a6b28;background:#fff8ee;cursor:pointer;font-weight:700}
.npc{margin-top:14px;padding:10px;background:rgba(255,255,255,.7);border-radius:10px;font-size:12px}
.av{display:inline-flex;width:26px;height:26px;border-radius:50%;align-items:center;justify-content:center;background:#efe4d0;margin-right:6px}
`,
    body: `
<div class="stage">
<div class="ticket" id="ticket">
<div class="stamp" id="stamp">已缴费</div>
<p class="title-custom">CITY PARK · 停车缴费</p>
<div class="no">NO. P-8821 · 热敏纸质感</div>
<div class="row"><span>车牌</span><span>京A·D**</span></div>
<div class="row"><span>入场</span><span>昨日 23:58</span></div>
<div class="row"><span>出场</span><span>今日 07:12</span></div>
<div class="row big"><span>时长</span><span>7 小时 14 分</span></div>
<div class="row"><span>费用</span><span>¥56.00</span></div>
<div class="row"><span>备注</span><span>过夜 · 副驾 ${N.umbrella}</span></div>
<div class="row"><span>天气</span><span>${N.rain} · ${N.lamp}</span></div>
<div class="row"><span>关联</span><span>${N.food}小票 · 草稿未发</span></div>
<button class="btn" type="button" id="flip">翻转查看背面招领</button>
</div>
<div class="npc"><span class="av">🧾</span><b>收费员</b>：电子发票可发邮箱。伞遗失招领已关联工单。</div>
</div>`,
    script: `(function(){var s=document.getElementById("stamp");var b=document.getElementById("flip");var back=false;if(b)b.addEventListener("click",function(){back=!back;if(back){b.textContent="正面 · 缴费信息";if(s)s.textContent="招领中"}else{b.textContent="翻转查看背面招领";if(s)s.textContent="已缴费"}})})();`,
  }),

  '07': page({
    id: '07', title: '骑行轨迹', emoji: '🚲', foreword: `轨迹在便利店绕了一圈——像犹豫。`,
    prev: '06', next: '08',
    css: base + `body{background:#0e1410;color:#c8f0d0}.shell{background:#121a14;border:1px solid #2a3a28}.path{height:160px;margin:12px;border-radius:12px;background:radial-gradient(circle at 30% 40%,#2a4a30,#121a14 70%);position:relative;overflow:hidden}.dot{position:absolute;width:10px;height:10px;border-radius:50%;background:#7dffb0;box-shadow:0 0 12px #7dffb0}.dot.hot{background:#c9a24b;width:14px;height:14px}.btn{background:#2a4a30;color:#9dffc2;margin:8px 12px;border:1px solid #3dff9a55}.npc{background:#1a2820}`,
    body: `<div class="stage">${img('bike path night city park rain green map abstract no people', '骑行')}<div class="shell"><p class="title-custom">共享单车 · 轨迹回放</p><div class="stats"><span>11.2 km</span><span>异常停留 1</span><span>${N.rain}</span></div><div class="path" id="path"><div class="dot" style="left:12%;top:70%"></div><div class="dot" style="left:35%;top:50%"></div><div class="dot hot" id="hot" style="left:58%;top:42%" title="便利店"></div><div class="dot" style="left:82%;top:30%"></div></div><div class="row" style="background:#1a2820;cursor:default"><b>${N.store}旁</b> 停留 14 分 · ${N.lamp} · 车锁未关又开</div><div class="row" style="background:#1a2820;cursor:default"><b>终点小区</b> 共还车 · 车筐里有${N.food}袋</div><button class="btn" type="button" id="pulse">高亮异常点</button><div class="npc"><span class="av">🐛</span><div><b>运维</b>：异常停留申诉已开。像有人在等一句「${N.stay}」。</div></div><div class="foot">本月 11 次 · 戏仿</div></div></div>`,
    script: `(function(){var h=document.getElementById("hot");var b=document.getElementById("pulse");if(b&&h)b.addEventListener("click",function(){h.style.transform="scale(1.8)";setTimeout(function(){h.style.transform="scale(1)"},600)})})();`,
  }),

  '08': page({
    id: '08', title: '过敏预警', emoji: '⚠️', foreword: `距离过近会预警——可他偏偏靠过来一点。`,
    prev: '07', next: '09',
    css: base + `body{background:#1a2030;color:#e8eef4}.shell{background:#121826;border:1px solid #2a3448}.radar{width:180px;height:180px;margin:16px auto;border-radius:50%;border:2px solid #4a90ff55;background:radial-gradient(circle,#1a3050,#121826 70%);position:relative;overflow:hidden}.radar::after{content:"";position:absolute;inset:0;background:conic-gradient(from 0deg,transparent 0 70%,#4a90ff33 100%);animation:spin 3s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.blip{position:absolute;width:12px;height:12px;border-radius:50%;background:#ff6b6b;left:58%;top:42%;box-shadow:0 0 12px #ff6b6b}.btn{background:#4a90ff;color:#fff;margin:8px 12px}.npc{background:#1a2434}`,
    body: `<div class="stage">${img('medical radar ui blue dark interface abstract no people', '预警')}<div class="shell"><p class="title-custom">社交距离 · 过敏预警</p><div class="stats"><span>目标 ${N.name}</span><span id="dist">当前 0.4 m</span><span>阈值：高</span></div><div class="radar"><div class="blip" id="blip"></div></div><div class="row" style="background:#1a2434;cursor:default">触发词：${N.closer} / ${N.stay} / ${N.umbrella}</div><div class="row" style="background:#1a2434;cursor:default">建议：保持一臂${N.umbrella}半径 · 或关闭预警装作没事</div><button class="btn" type="button" id="mute">暂时静音 5 秒</button><div class="npc"><span class="av">🩺</span><div><b>系统</b>：非医疗建议。数据更新于 23:40。</div></div><div class="foot">仅供剧情 · ${N.store}旁实测</div></div></div>`,
    script: `(function(){var d=document.getElementById("dist");var b=document.getElementById("mute");var on=true;setInterval(function(){if(!on||!d)return;d.textContent="当前 "+(0.3+Math.random()*0.5).toFixed(2)+" m"},800);if(b)b.addEventListener("click",function(){on=false;b.textContent="已静音";setTimeout(function(){on=true;b.textContent="暂时静音 5 秒"},5000)})})();`,
  }),

  '09': page({
    id: '09', title: '门锁日志', emoji: '🔐', foreword: `访客密码还有效——备注写着：雨夜可进。`,
    prev: '08', next: '10',
    css: base + `body{background:#141820;color:#e0e6f0}.shell{background:#1a222c;border:1px solid #2a3440}.row{background:#243040;border:1px solid #2a3848}.row.hot{border-color:#c9a24b}.btn{background:#3a4a5a;color:#e8eef4;margin:8px 12px}.npc{background:#243040}`,
    body: `<div class="stage">${img('smart door lock panel night hallway soft metal no people', '门锁')}<div class="shell"><p class="title-custom">智能门锁 · 开锁日志</p><div class="stats"><span>电量 78%</span><span>访客码有效</span><span>明日 08:00 失效</span></div><div class="row" style="cursor:default"><b>23:51</b> 指纹 · 你 · 成功</div><div class="row hot" style="cursor:default"><b>23:52</b> 访客码 · ${N.name} · 成功 · 备注：${N.rain}可进</div><div class="row" style="cursor:default"><b>23:53</b> 门未关到位 · 提醒已发</div><div class="row" style="cursor:default"><b>00:02</b> 门关闭 · 内外都安静</div><div class="row" style="cursor:default"><b>00:10</b> 试错 0 · 无异常撬动</div><button class="btn" type="button" id="renew">续期访客码一晚</button><div class="npc"><span class="av">🏠</span><div><b>门锁</b>：低电将短信通知${N.name}。像默认他该知道。</div></div><div class="foot">预计可用 11 天</div></div></div>`,
    script: `(function(){var b=document.getElementById("renew");if(b)b.addEventListener("click",function(){b.textContent="已续期至后天 08:00";b.classList.add("dis")})})();`,
  }),

  '10': page({
    id: '10', title: '外卖追踪', emoji: '🛵', foreword: `骑手停在坏掉的灯下面——两份关东煮。`,
    prev: '09', next: '11',
    css: base + `body{background:#f0ebe3;color:#2a2420}.shell{background:#fffaf3;border:1px solid #e5dcc8}.step{padding:10px 14px;border-left:3px solid #ddd;margin-left:16px;font-size:13px}.step.on{border-color:#e85d2c;background:#fff5f0}.btn{background:#e85d2c;color:#fff;margin:8px 12px}.npc{background:#fff;border:1px solid #e5dcc8}`,
    body: `<div class="stage">${img('food delivery night rain street steam warm bag no people', '外卖')}<div class="shell"><p class="title-custom">骑手实时追踪 · ${N.food}</p><div class="stats"><span>单号 WX8821</span><span>双人套</span><span>预计 23:40</span></div><div class="step" data-s="0"><b>已接单</b><div class="m">店员：多给了纸巾</div></div><div class="step on" data-s="1" id="cur"><b>配送中</b><div class="m">${N.store}站停留 · ${N.lamp}</div></div><div class="step" data-s="2"><b>即将送达</b><div class="m">备注：${N.stay}</div></div><div class="step" data-s="3"><b>已完成</b><div class="m">待确认</div></div><button class="btn" type="button" id="next">推进状态</button><div class="npc"><span class="av">🛵</span><div><b>骑手</b>：雨大，我把伞往中间挪了挪保温袋。</div></div><div class="foot">客服已关联活动页</div></div></div>`,
    script: `(function(){var i=1;var steps=document.querySelectorAll(".step");var b=document.getElementById("next");if(b)b.addEventListener("click",function(){if(i>=steps.length-1){b.textContent="已送达";b.classList.add("dis");return}steps[i].classList.remove("on");i++;steps[i].classList.add("on")})})();`,
  }),

  '11': page({
    id: '11', title: '会议室看板', emoji: '📅', foreword: `日历又重叠——同一时段，同一个他。`,
    prev: '10', next: '12',
    css: base + `body{background:#e8eef4;color:#1a2430}.shell{background:#fff;border:1px solid #d0d8e0}.cal{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px}.slot{padding:10px;border-radius:10px;background:#f4f7fa;border:1px solid #e0e6ec;font-size:12px;cursor:pointer}.slot.hit{background:#fff3e0;border-color:#e0a060;box-shadow:0 0 0 2px #e0a06033}.btn{background:#3a6ea5;color:#fff;margin:8px 12px}.npc{background:#f4f7fa}`,
    body: `<div class="stage">${img('office calendar board soft daylight glass meeting room empty no people', '会议室')}<div class="shell"><p class="title-custom">会议室预约 · 本周</p><div class="stats"><span>冲突 2</span><span>企微同步</span><span>私人日历开</span></div><div class="cal"><div class="slot" data-t="A101 10:00 你·周会">A101 · 10:00<br>你 · 周会</div><div class="slot hit" data-t="B07 12:30 你与祁洵同时预约">B07 · 12:30<br><b>冲突</b> 你 / ${N.name}</div><div class="slot" data-t="茶水间 15:00">茶水间 · 15:00<br>空</div><div class="slot hit" data-t="雨夜复盘 23:00 私人">私人 · 23:00<br>${N.rain}复盘 · 重叠</div></div><div class="tip" id="tip" style="background:#eef2ff">点选时段查看详情</div><button class="btn" type="button" id="anon">生成 HR 匿名墙草稿</button><div class="npc"><span class="av">👔</span><div><b>同事乙</b>：连续三周同一时段……墙见样卡 14。</div></div><div class="foot">冲突未自动拒绝</div></div></div>`,
    script: `(function(){var tip=document.getElementById("tip");var slots=document.querySelectorAll(".slot");for(var i=0;i<slots.length;i++){slots[i].addEventListener("click",function(){if(tip)tip.textContent=this.getAttribute("data-t")||""})}var a=document.getElementById("anon");if(a)a.addEventListener("click",function(){a.textContent="已复制到剪贴板（演示）"})})();`,
  }),

  '12': page({
    id: '12', title: '体检报告', emoji: '📋', foreword: `心率偏快——解读页写：雨夜后见面相关。`,
    prev: '11', next: '13',
    css: base + `body{background:#f2f0ea;color:#2a2824}.shell{background:#fffcf7;border:1px solid #e0d8c8}.row{background:#f7f4ee;border:1px solid #ebe4d8;cursor:default}.row.hot{border-color:#e8a090;background:#fff5f2}.btn{background:#6a8a7a;color:#fff;margin:8px 12px}.npc{background:#f7f4ee}`,
    body: `<div class="stage">${img('medical report paper mint stamp soft desk no people', '体检')}<div class="shell"><p class="title-custom">体检报告解读 · 摘要</p><div class="stats"><span>编号 H-8821</span><span>日期 9/3</span><span>医生备注开</span></div><div class="row"><b>血压</b> 正常偏高 · 注明紧张情境</div><div class="row hot"><b>心率</b> 偏快 · 解读：${N.rain}后见面相关？</div><div class="row"><b>睡眠</b> 碎片化 · 01:06 仍有亮屏</div><div class="row"><b>建议</b> 有人陪 · 少在${N.lamp}的路口站太久</div><div class="row"><b>紧急联系</b> ${N.name}（待确认）</div><button class="btn" type="button" id="reveal">展开医生旁注</button><div class="tip" id="doc" style="display:none;background:#eef6f2">旁注：患者反复提及「${N.stay}」。非病理，属心事。</div><div class="npc"><span class="av">🩺</span><div><b>护士</b>：报告仅供剧情。回去记得把伞擦干。</div></div><div class="foot">戏仿 · 非医疗建议</div></div></div>`,
    script: `(function(){var b=document.getElementById("reveal");var d=document.getElementById("doc");if(b&&d)b.addEventListener("click",function(){d.style.display="block";b.classList.add("dis")})})();`,
  }),
}
