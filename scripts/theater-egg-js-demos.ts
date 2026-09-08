/**
 * 酒馆格式完整 HTML+JS 示范（无缩进风格的内容主体；外层由生成器包壳）
 * 用于 01 / 13 / 31 三张样卡，证明 JS 互动可跑。
 */

function leftAlign(html: string): string {
  return html
    .split('\n')
    .map((l) => l.replace(/^\s+/, ''))
    .filter((l) => l.length)
    .join('\n')
}

export const THEATER_EGG_JS_DEMOS: Record<string, string> = {
  '01': leftAlign(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;padding:16px;font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#ebe4d8;color:#2a2622;overflow:auto;height:auto}
.wrap{max-width:800px;margin:0 auto;background:#f7f8fa;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,.12)}
.title-custom{margin:0;padding:14px 16px;font-size:18px;font-weight:700;background:#fff;border-bottom:1px solid #e8e0d4}
.stats{display:flex;gap:12px;padding:8px 14px;font-size:11px;background:#f0ece4}
.draft{margin:8px 12px;padding:10px;border-radius:10px;background:#fff;border:1px solid #e8e0d4;cursor:pointer}
.draft.open{border-color:#c9a24b;background:#fffaf0}
.draft .body{display:none;margin-top:8px;font-size:13px;line-height:1.55}
.draft.open .body{display:block}
.avatar{width:28px;height:28px;border-radius:50%;background:#e8e0d4;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:6px}
.npc{margin:10px 12px;padding:10px;border-radius:10px;background:#eef2ff;font-size:12px}
.hero{width:100%;height:120px;object-fit:cover;display:block}
.btn{margin:12px;padding:10px 14px;border:0;border-radius:8px;background:#c9a24b;color:#fff;font-weight:700;cursor:pointer}
.btn.dis{opacity:.45;pointer-events:none}
.foot{padding:10px 14px 16px;font-size:10px;opacity:.55}
</style>
</head>
<body>
<div class="wrap" id="app">
<img class="hero" alt="rain umbrella night convenience store steam" src="https://image.pollinations.ai/prompt/rainy%20night%20empty%20convenience%20store%20umbrella%20steam%20warm%20light%20no%20people">
<p class="title-custom">未发送 · 草稿箱</p>
<div class="stats"><span>未发送 <b id="cnt">3</b></span><span>自动存 23:41</span><span>祁洵置顶</span></div>
<div class="draft open" data-id="1"><div><span class="avatar">☔</span><b>祁洵</b> · 23:40</div><div class="body">其实我想说的不是「没事」。伞还可以再往中间挪一点。关东煮我点了两份——你别先走。</div></div>
<div class="draft" data-id="2"><div><span class="avatar">📝</span><b>祁洵</b> · 昨夜</div><div class="body">灯坏了也没关系，我还能站一会儿。靠过来一点，好吗。</div></div>
<div class="draft" data-id="3"><div><span class="avatar">🏪</span><b>备注·便利店</b></div><div class="body">到了说一声。关东煮柜还热着。</div></div>
<div class="npc"><span class="avatar">🧑</span><b>路人甲</b>：灯坏了也站着，关东煮点两份的人很少只是路过。</div>
<button class="btn dis" id="send" type="button">发送（灰显）</button>
<button class="btn" id="toggle" type="button">展开/收起全部草稿</button>
<div class="foot">小剧场 JS 示范 · 点击草稿切换展开 · 禁 createElement</div>
</div>
<script>
(function(){
var drafts=document.querySelectorAll(".draft");
var openAll=true;
function sync(){
var n=0;
for(var i=0;i<drafts.length;i++){if(drafts[i].classList.contains("open"))n++}
var c=document.getElementById("cnt");
if(c)c.textContent=String(drafts.length);
}
for(var i=0;i<drafts.length;i++){
drafts[i].addEventListener("click",function(){
this.classList.toggle("open");
sync();
});
}
var t=document.getElementById("toggle");
if(t)t.addEventListener("click",function(){
openAll=!openAll;
for(var j=0;j<drafts.length;j++){
if(openAll)drafts[j].classList.add("open");
else drafts[j].classList.remove("open");
}
if(drafts[0])drafts[0].classList.add("open");
sync();
});
sync();
})();
</script>
</body>
</html>`),

  '13': leftAlign(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;padding:16px;font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#1a2030;color:#e8eef4;overflow:auto;height:auto}
.wrap{max-width:800px;margin:0 auto;background:#121820;border-radius:16px;overflow:hidden}
.title-custom{margin:0;padding:14px;font-size:17px;font-weight:700;border-bottom:1px solid #2a3448}
.tab{display:flex;gap:0}
.tab button{flex:1;padding:10px;border:0;background:#1a2230;color:#9ab0c4;cursor:pointer}
.tab button.on{background:#243044;color:#f5e3a8;font-weight:700}
.panel{display:none;padding:12px}
.panel.on{display:block}
.post{padding:10px;margin-bottom:8px;border-radius:10px;background:#1a2434;font-size:13px;line-height:1.5}
.avatar{width:26px;height:26px;border-radius:50%;background:#2a3848;display:inline-flex;align-items:center;justify-content:center;margin-right:6px}
.hero{width:100%;height:110px;object-fit:cover;display:block}
.hot{color:#f5e3a8;font-size:11px}
</style>
</head>
<body>
<div class="wrap">
<img class="hero" alt="anonymous wall night rain" src="https://image.pollinations.ai/prompt/anonymous%20confession%20wall%20neon%20rain%20city%20night%20no%20people">
<p class="title-custom">匿名树洞 · 热榜</p>
<div class="tab">
<button type="button" class="on" data-tab="hot">热榜</button>
<button type="button" data-tab="new">最新</button>
<button type="button" data-tab="npc">路人区</button>
</div>
<div class="panel on" id="hot">
<div class="post"><span class="avatar">🐸</span><b>青蛙不下雨</b><div class="hot">热评 · 128</div>灯坏了也站着算不算表白。关东煮点了两份。</div>
<div class="post"><span class="avatar">🌂</span><b>伞往中间</b>别删那张伞下的。别先走三个字我看见了。</div>
<div class="post"><span class="avatar">🕯️</span><b>便利店蒸汽</b>草稿箱红点还在，发送键灰着。</div>
</div>
<div class="panel" id="new">
<div class="post"><span class="avatar">📡</span><b>弱网重试</b>同步失败 1 次。会话仍置顶。</div>
<div class="post"><span class="avatar">🎟️</span><b>取件码8821</b>格口 B07 热区。备注：两份关东煮。</div>
</div>
<div class="panel" id="npc">
<div class="post"><span class="avatar">🧑‍💼</span><b>店员备忘</b>那位先生问了三次够不够热，又问灯什么时候修。</div>
<div class="post"><span class="avatar">🚕</span><b>夜班司机</b>小区口雨没停，有两个人共一把伞。</div>
</div>
</div>
<script>
(function(){
var buttons=document.querySelectorAll(".tab button");
var panels=document.querySelectorAll(".panel");
for(var i=0;i<buttons.length;i++){
buttons[i].addEventListener("click",function(){
var id=this.getAttribute("data-tab");
for(var j=0;j<buttons.length;j++)buttons[j].classList.remove("on");
this.classList.add("on");
for(var k=0;k<panels.length;k++){
panels[k].classList.remove("on");
if(panels[k].id===id)panels[k].classList.add("on");
}
});
}
})();
</script>
</body>
</html>`),

  '31': leftAlign(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;padding:16px;font-family:ui-monospace,Consolas,"PingFang SC",sans-serif;background:#0e1016;color:#c8f0d8;overflow:auto;height:auto}
.wrap{max-width:800px;margin:0 auto;border:1px solid #2a4a3a;border-radius:12px;padding:14px;background:#12161c}
.title-custom{margin:0 0 10px;font-size:16px;color:#7dffb0}
.bar{height:10px;background:#1a2820;border-radius:99px;overflow:hidden;margin:8px 0 14px}
.bar>i{display:block;height:100%;width:42%;background:linear-gradient(90deg,#3dff9a,#c9a24b);transition:width .4s}
.row{display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px dashed #243028}
.npc{margin-top:12px;padding:8px;background:#1a2420;border-radius:8px;font-size:12px}
.avatar{display:inline-flex;width:24px;height:24px;border-radius:50%;align-items:center;justify-content:center;background:#243028;margin-right:6px}
button{margin-top:12px;margin-right:8px;padding:8px 12px;border:1px solid #3dff9a55;background:#1a2820;color:#7dffb0;border-radius:8px;cursor:pointer}
.hero{width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:10px}
</style>
</head>
<body>
<div class="wrap">
<img class="hero" alt="game system panel glitch" src="https://image.pollinations.ai/prompt/retro%20game%20ui%20affection%20meter%20glitch%20green%20terminal%20no%20people">
<p class="title-custom">好感度 Bug 报告</p>
<div class="row"><span>目标</span><span>祁洵</span></div>
<div class="row"><span>显示值</span><span id="shown">42%</span></div>
<div class="row"><span>真实值</span><span id="real">91%</span></div>
<div class="bar"><i id="bar"></i></div>
<div class="row"><span>异常</span><span>雨夜停留后数值不同步</span></div>
<div class="npc"><span class="avatar">🐛</span>系统旁白：检测到「别先走」关键词，好感条卡住。点击「强制刷新」或「伪装正常」。</div>
<button type="button" id="fix">强制刷新</button>
<button type="button" id="fake">伪装正常</button>
</div>
<script>
(function(){
var shown=document.getElementById("shown");
var real=document.getElementById("real");
var bar=document.getElementById("bar");
var mode="bug";
function paint(){
if(mode==="bug"){shown.textContent="42%";real.textContent="91%";bar.style.width="42%"}
else if(mode==="fix"){shown.textContent="91%";real.textContent="91%";bar.style.width="91%"}
else{shown.textContent="50%";real.textContent="91%";bar.style.width="50%"}
}
document.getElementById("fix").addEventListener("click",function(){mode="fix";paint()});
document.getElementById("fake").addEventListener("click",function(){mode="fake";paint()});
paint();
})();
</script>
</body>
</html>`),
}
