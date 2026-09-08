/** E/F 类 39–50：NSFW 成人拟真（物证/玩法）——意象化、可交互、有质感 */
import { page, N, VELVET } from './shared.ts'

const base = `
.stage{max-width:800px;margin:0 auto;padding:0 12px 32px}
.shell{border-radius:16px;overflow:hidden;border:1px solid rgba(232,160,191,.25);box-shadow:0 20px 50px rgba(0,0,0,.45);background:linear-gradient(180deg,#1c1520,#120e18);color:#f0e6f2}
.title-custom{margin:0;padding:14px 16px;font-size:17px;color:#f0c0d4;border-bottom:1px solid rgba(255,255,255,.08)}
.stats{display:flex;flex-wrap:wrap;gap:10px;padding:8px 14px;font-size:11px;opacity:.85}
.row{margin:6px 12px;padding:10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:12px;line-height:1.55}
.btn{margin:8px 12px;padding:9px 14px;border:0;border-radius:10px;background:#e8a0bf;color:#1a1018;font-weight:700;cursor:pointer}
.btn.dis{opacity:.4;pointer-events:none}
.av{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#2a2030;margin-right:6px}
.npc{margin:10px 12px;padding:10px;background:rgba(232,160,191,.08);border-radius:10px;font-size:12px;display:flex;gap:8px}
.foot{padding:10px 14px 16px;font-size:10px;opacity:.5}
.hero{width:100%;height:110px;object-fit:cover;display:block;opacity:.9}
.check{display:flex;gap:8px;align-items:flex-start}
`

const img = (p: string, a: string) =>
  `<img class="hero" alt="${a}" src="https://image.pollinations.ai/prompt/${encodeURIComponent(p)}">`

export const PAGES_EF: Record<string, string> = {
  '39': page({
    id: '39', title: '情趣购物车', emoji: '🛒', foreword: `结算前还停着——像那句没发出去的话。`,
    prev: '38', next: '40',
    css: `body{${VELVET}}${base}.row label{cursor:pointer;flex:1}`,
    body: `<div class="stage">${img('velvet shopping bag soft neon pink dark boutique abstract no people', '购物车')}<div class="shell"><p class="title-custom">成人商城 · 购物车</p><div class="stats"><span>3 件</span><span>匿名包装</span><span>雨夜达</span></div>
<div class="row check"><input type="checkbox" checked id="c1"><label for="c1"><b>低语耳机</b><div class="m">备注：想听你说${N.stay}</div></label><span>¥128</span></div>
<div class="row check"><input type="checkbox" checked id="c2"><label for="c2"><b>共伞氛围灯</b><div class="m">${N.lamp}替代品</div></label><span>¥89</span></div>
<div class="row check"><input type="checkbox" id="c3"><label for="c3"><b>温感杯垫</b><div class="m">${N.food}双人夜</div></label><span>¥45</span></div>
<div class="row">匿名评价：包装很严实，骑手停在坏灯下面也没拆。 · ★★★★★</div>
<div class="row">合计 <b id="sum">¥217</b></div>
<button class="btn" type="button" id="pay">按住确认结算（点按演示）</button>
<div class="npc"><span class="av">🎀</span><div><b>客服</b>：意象化商品，剧情戏仿。</div></div>
<div class="foot">禁违法违禁 · 成人向物证</div></div></div>`,
    script: `(function(){function sum(){var t=0;if(c1.checked)t+=128;if(c2.checked)t+=89;if(c3.checked)t+=45;document.getElementById("sum").textContent="¥"+t}var c1=document.getElementById("c1"),c2=document.getElementById("c2"),c3=document.getElementById("c3");c1.addEventListener("change",sum);c2.addEventListener("change",sum);c3.addEventListener("change",sum);document.getElementById("pay").addEventListener("click",function(){this.textContent="已下单 · 匿名面单";this.classList.add("dis")});sum()})();`,
  }),
  '40': page({
    id: '40', title: '体位图鉴', emoji: '📖', foreword: `图鉴未全亮——差一页雨夜补完。`,
    prev: '39', next: '41',
    css: `body{${VELVET}}${base}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}.cell{aspect-ratio:1;border-radius:10px;background:#2a2030;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;cursor:pointer}.cell.on{background:#e8a0bf44;color:#f0c0d4;font-weight:700}.cell.new{outline:2px solid #e8a0bf}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">图鉴墙 · 解锁进度</p><div class="stats"><span>12/24</span><span>新解锁 1</span></div><div class="grid"><div class="cell on">01</div><div class="cell on">02</div><div class="cell">??</div><div class="cell on new" id="n">雨夜</div><div class="cell">??</div><div class="cell on">06</div><div class="cell">??</div><div class="cell">??</div><div class="cell on">09</div><div class="cell">??</div><div class="cell on">11</div><div class="cell">??</div></div><div class="row" id="desc">点亮格查看意象名</div><button class="btn" type="button" id="pulse">闪烁新解锁</button><div class="npc"><span class="av">📕</span><div><b>图鉴</b>：无写实人体，仅编号意象。</div></div><div class="foot">成人向 · 克制</div></div></div>`,
    script: `(function(){var cells=document.querySelectorAll(".cell");for(var i=0;i<cells.length;i++){cells[i].addEventListener("click",function(){document.getElementById("desc").textContent=this.classList.contains("on")?("已解锁 · "+this.textContent):"未解锁"})}var n=document.getElementById("n");document.getElementById("pulse").addEventListener("click",function(){n.style.boxShadow="0 0 16px #e8a0bf";setTimeout(function(){n.style.boxShadow="none"},700)})})();`,
  }),
  '41': page({
    id: '41', title: '清理清单', emoji: '✅', foreword: `事后清单还差一项：把那句实话说完。`,
    prev: '40', next: '42',
    css: `body{${VELVET}}${base}.todo{display:flex;gap:8px;align-items:flex-start}.todo.done span{opacity:.45;text-decoration:line-through}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">事后清理清单</p><div class="stats"><span>完成 4/7</span><span>温柔模式</span></div>
<div class="row todo" data-t="1"><input type="checkbox" checked><span>换床单 · 雨气还在</span></div>
<div class="row todo" data-t="2"><input type="checkbox" checked><span>水杯续热 · 像${N.food}</span></div>
<div class="row todo" data-t="3"><input type="checkbox" checked><span>窗外${N.umbrella}收回</span></div>
<div class="row todo" data-t="4"><input type="checkbox" checked><span>灯调暗 · 别让${N.lamp}扫兴</span></div>
<div class="row todo" data-t="5"><input type="checkbox"><span>把「没事」从快捷回复删掉</span></div>
<div class="row todo" data-t="6"><input type="checkbox"><span>发送草稿：${N.stay}</span></div>
<div class="row todo" data-t="7"><input type="checkbox"><span>拥抱确认 · ${N.closer}</span></div>
<button class="btn" type="button" id="sync">同步完成度</button>
<div class="npc"><span class="av">🧴</span><div id="prog"><b>清单</b>：勾选会更新。</div></div>
<div class="foot">意象化 · 非教学</div></div></div>`,
    script: `(function(){function sync(){var boxes=document.querySelectorAll(".todo input");var n=0;for(var i=0;i<boxes.length;i++){if(boxes[i].checked){n++;boxes[i].parentElement.classList.add("done")}else boxes[i].parentElement.classList.remove("done")}document.getElementById("prog").textContent="完成 "+n+"/"+boxes.length}var boxes=document.querySelectorAll(".todo input");for(var i=0;i<boxes.length;i++)boxes[i].addEventListener("change",sync);document.getElementById("sync").addEventListener("click",sync);sync()})();`,
  }),
  '42': page({
    id: '42', title: '安全词仪表', emoji: '🛡️', foreword: `黄灯亮了——要不要把伞往中间挪。`,
    prev: '41', next: '43',
    css: `body{${VELVET}}${base}.gauge{display:flex;justify-content:center;gap:16px;padding:16px}.g{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;opacity:.35}.g.on{opacity:1;transform:scale(1.08);box-shadow:0 0 20px currentColor}.gy{background:#c9a24b;color:#1a1810}.gr{background:#e85d2c;color:#fff}.gg{background:#3dff9a;color:#102018}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">安全词 · 仪表盘</p><div class="stats"><span>词：伞</span><span>备用：灯</span></div><div class="gauge"><div class="g gg" id="g">绿</div><div class="g gy on" id="y">黄</div><div class="g gr" id="r">红</div></div><div class="row" id="msg">黄灯：节奏放慢 · ${N.closer}先问一句</div><button class="btn" type="button" data-l="g">切绿</button><button class="btn" type="button" data-l="y">切黄</button><button class="btn" type="button" data-l="r">切红</button><div class="npc"><span class="av">🛡️</span><div><b>协议</b>：红灯即停。剧情向。</div></div><div class="foot">互动切换</div></div></div>`,
    script: `(function(){var map={g:["继续 · 呼吸平稳","g"],y:["放慢 · 先问愿不愿意","y"],r:["立即停 · 喝水盖毯","r"]};var btns=document.querySelectorAll(".btn[data-l]");for(var i=0;i<btns.length;i++){btns[i].addEventListener("click",function(){var l=this.getAttribute("data-l");document.getElementById("g").classList.remove("on");document.getElementById("y").classList.remove("on");document.getElementById("r").classList.remove("on");document.getElementById(l).classList.add("on");document.getElementById("msg").textContent=map[l][0]})}})();`,
  }),
  '43': page({
    id: '43', title: '玩具固件', emoji: '🔌', foreword: `固件更新 73%——日志写着雨夜模式。`,
    prev: '42', next: '44',
    css: `body{${VELVET}}${base}.bar{height:10px;margin:12px;background:#2a2030;border-radius:99px;overflow:hidden}.bar>i{display:block;height:100%;width:73%;background:linear-gradient(90deg,#e8a0bf,#c9a24b);transition:width .3s}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">固件更新</p><div class="stats"><span>设备 · Aura</span><span>v1.4.2 → v1.5.0</span></div><div class="bar"><i id="bar"></i></div><div class="row" id="pct">73%</div><div class="row">更新说明：+ ${N.rain}氛围曲线 · + 共${N.umbrella}同步震动（克制）</div><button class="btn" type="button" id="go">继续更新</button><div class="npc"><span class="av">📟</span><div><b>设备</b>：请勿在更新时拔线。</div></div><div class="foot">意象化</div></div></div>`,
    script: `(function(){var w=73;var bar=document.getElementById("bar");var pct=document.getElementById("pct");document.getElementById("go").addEventListener("click",function(){var t=this;var iv=setInterval(function(){w=Math.min(100,w+3);bar.style.width=w+"%";pct.textContent=w+"%";if(w>=100){clearInterval(iv);pct.textContent="完成 · 雨夜模式已启用";t.classList.add("dis")}},120)})})();`,
  }),
  '44': page({
    id: '44', title: '迷你吧消费单', emoji: '🧾', foreword: `房单上多了两杯——像默认有人留下。`,
    prev: '43', next: '45',
    css: `body{${VELVET}}${base}.ticket{margin:12px;padding:14px;border-radius:8px;background:linear-gradient(180deg,#2a2030,#1a1520);border:1px dashed #e8a0bf55;font-family:ui-monospace,Consolas,monospace}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">酒店迷你吧 · 消费单</p><div class="ticket"><div class="row" style="margin:0;border:0">房号 1208</div><div class="row" style="margin:4px 0;border:0">香槟 ×1 · ¥168</div><div class="row" style="margin:4px 0;border:0">水 ×2 · ¥30</div><div class="row" style="margin:4px 0;border:0">巧克力学费 · ¥48</div><div class="row" style="margin:4px 0;border:0">备注：${N.rain} · 请勿打扰</div><div class="row" style="margin:4px 0;border:0"><b>合计 ¥246</b></div></div><button class="btn" type="button" id="stamp">盖章 · 挂账</button><div class="npc"><span class="av">🛎️</span><div id="st"><b>前台</b>：印章待盖。</div></div><div class="foot">单据质感</div></div></div>`,
    script: `(function(){document.getElementById("stamp").addEventListener("click",function(){document.getElementById("st").textContent="已挂账 · 章：雨夜 1208";this.classList.add("dis")})})();`,
  }),
  '45': page({
    id: '45', title: '试穿反馈卡', emoji: '👗', foreword: `评分写满——最一行是：别先走。`,
    prev: '44', next: '46',
    css: `body{${VELVET}}${base}.stars{letter-spacing:4px;color:#f5e3a8;font-size:18px}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">试穿反馈</p><div class="stats"><span>款式 · 夜色</span><span>匿名</span></div><div class="row">贴合 <span class="stars" id="s1">★★★★☆</span></div><div class="row">氛围 <span class="stars" id="s2">★★★★★</span></div><div class="row">是否想被看见 <span class="stars" id="s3">★★★☆☆</span></div><div class="row">文字反馈：镜子里的人说「${N.closer}」。我回「${N.stay}」。</div><button class="btn" type="button" id="up">全部 +1 星（演示）</button><div class="npc"><span class="av">✨</span><div><b>店员</b>：反馈已收。雨还在下。</div></div><div class="foot">成人向反馈卡</div></div></div>`,
    script: `(function(){document.getElementById("up").addEventListener("click",function(){document.getElementById("s1").textContent="★★★★★";document.getElementById("s3").textContent="★★★★☆";this.classList.add("dis")})})();`,
  }),
  '46': page({
    id: '46', title: '私密相册柜', emoji: '🔒', foreword: `密码是伞——输对才见那张加星的。`,
    prev: '45', next: '47',
    css: `body{${VELVET}}${base}.lock{font-size:28px;letter-spacing:.4em;text-align:center;padding:16px;color:#e8a0bf}.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}.key{padding:12px;border:0;border-radius:10px;background:#2a2030;color:#f0e6f2;cursor:pointer;font-weight:700}.vault{display:none}.vault.on{display:block}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">私密相册 · 保险柜</p><div class="lock" id="code">····</div><div class="keys"><button class="key" data-k="1">1</button><button class="key" data-k="2">2</button><button class="key" data-k="3">3</button><button class="key" data-k="4">4</button><button class="key" data-k="5">5</button><button class="key" data-k="6">6</button><button class="key" data-k="7">7</button><button class="key" data-k="8">8</button><button class="key" data-k="9">9</button><button class="key" data-k="C">清</button><button class="key" data-k="0">0</button><button class="key" data-k="OK">开</button></div><div class="vault" id="vault"><div class="row">★ 伞下侧脸 · 备注：别删</div><div class="row">${N.rain}蒸汽 · 加锁</div><div class="row">未发送截图 · 仅本地</div></div><div class="npc"><span class="av">🔐</span><div><b>提示</b>：演示密码 2580</div></div><div class="foot">物证向</div></div></div>`,
    script: `(function(){var buf="";var code=document.getElementById("code");var vault=document.getElementById("vault");function paint(){code.textContent=(buf+"····").slice(0,4).split("").join(" ")}var keys=document.querySelectorAll(".key");for(var i=0;i<keys.length;i++){keys[i].addEventListener("click",function(){var k=this.getAttribute("data-k");if(k==="C"){buf="";vault.classList.remove("on");paint();return}if(k==="OK"){if(buf==="2580")vault.classList.add("on");else code.textContent="错误";return}if(buf.length<4)buf+=k;paint()})}paint()})();`,
  }),
  '47': page({
    id: '47', title: 'RP 抽卡', emoji: '🃏', foreword: `抽到「雨夜便利店」——稀有。`,
    prev: '46', next: '48',
    css: `body{${VELVET}}${base}.card{width:140px;height:200px;margin:16px auto;border-radius:12px;border:2px solid #e8a0bf;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#2a2030,#1a1520);font-weight:700;transition:transform .5s}.card.flip{transform:rotateY(180deg)}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">角色扮演 · 抽卡</p><div class="stats"><span>今日剩 2 抽</span><span>保底 10</span></div><div class="card" id="card">?</div><div class="row" id="res">点击抽卡</div><button class="btn" type="button" id="draw">抽一张</button><div class="npc"><span class="av">🎴</span><div><b>卡池</b>：含「${N.stay}」「共伞」「坏灯」。</div></div><div class="foot">玩法向</div></div></div>`,
    script: `(function(){var pool=["雨夜便利店 SSR","共伞 R","坏灯停留 SR","未发送草稿 SSR","关东煮双人 R"];var i=0;document.getElementById("draw").addEventListener("click",function(){var c=document.getElementById("card");c.classList.add("flip");setTimeout(function(){c.classList.remove("flip");c.textContent=pool[i%pool.length].split(" ")[1];document.getElementById("res").textContent=pool[i%pool.length];i++},250)})})();`,
  }),
  '48': page({
    id: '48', title: '边缘计时', emoji: '⏱️', foreword: `计时器走着——黄灯协议生效中。`,
    prev: '47', next: '49',
    css: `body{${VELVET}}${base}.timer{font-size:36px;text-align:center;padding:20px;font-family:ui-monospace,Consolas,monospace;color:#e8a0bf}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">边缘控制 · 计时</p><div class="stats"><span>协议：黄</span><span>可暂停</span></div><div class="timer" id="t">00:00</div><button class="btn" type="button" id="start">开始</button><button class="btn" type="button" id="pause">暂停</button><button class="btn" type="button" id="reset">归零</button><div class="npc"><span class="av">⏱️</span><div><b>提醒</b>：安全词优先于计时。</div></div><div class="foot">玩法向</div></div></div>`,
    script: `(function(){var sec=0,on=false,iv;function paint(){var m=Math.floor(sec/60),s=sec%60;document.getElementById("t").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}document.getElementById("start").addEventListener("click",function(){if(on)return;on=true;iv=setInterval(function(){sec++;paint()},1000)});document.getElementById("pause").addEventListener("click",function(){on=false;clearInterval(iv)});document.getElementById("reset").addEventListener("click",function(){sec=0;paint()});paint()})();`,
  }),
  '49': page({
    id: '49', title: '敏感热力图', emoji: '🌡️', foreword: `热区集中在——被叫停的那句别先走。`,
    prev: '48', next: '50',
    css: `body{${VELVET}}${base}.heat{position:relative;height:180px;margin:12px;border-radius:12px;background:radial-gradient(circle at 50% 40%,#e85d2c55,#2a2030 70%)}.hz{position:absolute;font-size:10px;padding:4px 8px;border-radius:99px;background:#2a2030;border:1px solid #e8a0bf55;cursor:pointer}.hz.hot{background:#e85d2c;color:#fff;font-weight:700}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">敏感点 · 热力图</p><div class="stats"><span>采样 26 分</span><span>峰值：语音</span></div><div class="heat"><div class="hz" style="left:20%;top:30%" data-t="呼吸">A</div><div class="hz hot" style="left:48%;top:36%" data-t="别先走">B</div><div class="hz" style="left:70%;top:50%" data-t="共伞">C</div></div><div class="row" id="info">点热区查看</div><button class="btn" type="button" id="peak">只看峰值</button><div class="npc"><span class="av">🌡️</span><div><b>图例</b>：意象热区，无写实。</div></div><div class="foot">玩法向</div></div></div>`,
    script: `(function(){var hz=document.querySelectorAll(".hz");for(var i=0;i<hz.length;i++){hz[i].addEventListener("click",function(){document.getElementById("info").textContent="热区："+this.getAttribute("data-t")})}document.getElementById("peak").addEventListener("click",function(){for(var j=0;j<hz.length;j++){if(!hz[j].classList.contains("hot"))hz[j].style.opacity=".25"}})})();`,
  }),
  '50': page({
    id: '50', title: '晨间事后聊天', emoji: '💬', foreword: `早晨的对话框——终于没再发没事。`,
    prev: '49',
    css: `body{${VELVET}}${base}.bub{margin:8px 12px;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.5;max-width:85%}.me{background:#2a2030;margin-left:auto}.ta{background:#e8a0bf33}`,
    body: `<div class="stage"><div class="shell"><p class="title-custom">聊天 · 晨间</p><div class="stats"><span>09:12</span><span>已读</span><span>雨停了</span></div>
<div class="bub ta"><span class="av">☔</span>${N.name}：醒了吗。伞还在门口。</div>
<div class="bub me">醒了。草稿我还留着。</div>
<div class="bub ta">哪一句。</div>
<div class="bub me" id="line">其实不是没事。你${N.stay}。</div>
<div class="bub ta">……我看到了。昨晚灯修好了。</div>
<div class="bub me">那我们还去${N.store}吗。</div>
<div class="bub ta">去。${N.food}还是两份。</div>
<button class="btn" type="button" id="send">补发昨晚草稿</button>
<div class="npc"><span class="av">☀️</span><div id="ok"><b>系统</b>：发送键不再灰显。</div></div>
<div class="foot">收束 · #50</div></div></div>`,
    script: `(function(){document.getElementById("send").addEventListener("click",function(){document.getElementById("ok").textContent="已补发 · 对方正在输入…";this.classList.add("dis")})})();`,
  }),
}
