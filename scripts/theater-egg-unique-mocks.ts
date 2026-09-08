/** 50 张互不相同的静态样卡 HTML（按 id）——高密度可读内容版 */
export type MockFn = () => string

const s = (html: string) => html.trim()

export const THEATER_EGG_UNIQUE_MOCKS: Record<string, MockFn> = {
  '01': () => s(`
<div class="phone" style="background:#f7f8fa">
  <div class="ph-status">草稿箱 · 9:41 · 未同步 2</div>
  <div class="stats-strip">
    <span>未发送 <b>8</b></span><span>今日编辑 <b>5</b></span><span>自动存 <b>23:41</b></span>
  </div>
  <div style="padding:12px 14px;display:flex;justify-content:space-between;align-items:center">
    <div><div style="font-size:18px;font-weight:700">未发送</div><div class="m">上次打开：便利店灯下 · 雨未停</div></div>
    <span class="badge-red">8</span>
  </div>
  <div class="draft open">
    <div class="draft-top"><b>祁洵</b><span class="m">23:40</span></div>
    <div class="draft-prev">其实我想说的不是没事……</div>
    <div class="draft-body">其实我想说的不是「没事」。伞还可以再往中间挪一点。关东煮我点了两份——你别先走。路口那盏灯坏了，我还能站一会儿。靠过来一点，好吗。</div>
    <div class="draft-meta">字数 86 · 已改 11 次 · 标签：雨夜 / 别先走</div>
  </div>
  <div class="draft"><div class="draft-top"><b>祁洵</b><span class="m">昨夜 01:06</span></div><div class="draft-prev">灯坏了也没关系，我…… <span class="dot-r"></span></div><div class="m" style="margin-top:4px">未写完 · 光标停在「我」后面</div></div>
  <div class="draft"><div class="draft-top"><b>备注·便利店</b><span class="m">周一 22:18</span></div><div class="draft-prev">到了说一声。关东煮柜还热着。</div></div>
  <div class="draft"><div class="draft-top"><b>祁洵</b><span class="m">上周日</span></div><div class="draft-prev">那句还是删了吧……太直白。</div></div>
  <div class="draft"><div class="draft-top"><b>祁洵</b><span class="m">9/1</span></div><div class="draft-prev">伞借你，记得还——或别还也行。</div></div>
  <div class="draft"><div class="draft-top"><b>群发·取消</b><span class="m">8/28</span></div><div class="draft-prev">雨停了吗 / 你到家了吗 / ……已清空</div></div>
  <div class="draft"><div class="draft-top"><b>祁洵</b><span class="m">8/20</span></div><div class="draft-prev">靠过来一点——打完又怕太近。</div></div>
  <div class="tip-bar">提示：展开草稿可继续编辑；发送键灰显因「内容含未确认情绪词」</div>
  <div style="padding:14px;display:flex;gap:8px"><button class="b">存草稿</button><button class="b">另存备注</button><button class="b dis">发送</button></div>
  <div class="foot-meta">草稿箱容量 12/50 · 同步失败：弱网 · 祁洵会话置顶</div>
</div>`),

  '02': () => s(`
<div class="phone" style="background:#faf8f4">
  <div class="ph-bar">共享相册 · 雨夜 · 冲突待处理</div>
  <div class="stats-strip soft">
    <span>双方共有 48</span><span>争议 3</span><span>最近删除 3</span>
  </div>
  <div class="warn">冲突：同一批雨夜照片被双方处理不同 · 需手动合并</div>
  <div class="split2">
    <div>
      <div class="col-h del">你 · 已删除</div>
      <div class="thumb gone"></div><div class="thumb gone"></div><div class="thumb gone"></div>
      <div class="m" style="padding:6px">① 伞下侧脸 ② 便利店橱窗 ③ 关东煮蒸汽</div>
      <div class="m" style="padding:0 6px 6px">移入最近删除 · 剩余 29 天</div>
    </div>
    <div>
      <div class="col-h keep">对方 · 仍保留</div>
      <div class="thumb" style="background:linear-gradient(135deg,#c4b09a,#8a7060)"></div>
      <div class="thumb" style="background:linear-gradient(135deg,#8a9ab0,#5a6a78)"></div>
      <div class="thumb" style="background:linear-gradient(135deg,#a8c4b8,#6a8a7a)"></div>
      <div class="m" style="padding:6px">含「伞下侧脸」· 备注：别删这张</div>
      <div class="m" style="padding:0 6px 6px">祁洵 · 23:52 加星</div>
    </div>
  </div>
  <div class="related">
    <div class="rel-h">相关备注（对方可见）</div>
    <div class="rel-i">「靠过来一点」那帧在第二张边缘</div>
    <div class="rel-i">灯坏了之后拍的，噪点多，但人在</div>
    <div class="rel-i">若恢复删除侧，将覆盖对方版本时间戳</div>
  </div>
  <div class="note">点按保留侧第 1 张：备注「别删这张」· 别先走三个字写在相册描述里</div>
  <div class="foot-meta">相册名：雨夜未命名 · 创建人：你 / 祁洵 · 存储 128MB</div>
</div>`),

  '03': () => s(`
<div class="phone dark-ui" style="background:#1a222c;color:#e8eef4;max-width:320px;margin:0 auto;border-radius:16px;overflow:hidden">
  <div style="text-align:center;padding:16px 12px 8px">
    <div class="m" style="color:#9ab0c4">SMART BOX · A-12 · 南门便利店旁</div>
    <div style="font-size:15px;font-weight:700;margin-top:4px">取件码</div>
    <div style="letter-spacing:.4em;font-size:28px;font-weight:700;margin:12px 0;font-family:ui-monospace,Consolas,monospace">8 8 2 1</div>
    <div class="m" style="color:#9ab0c4">有效期至今日 23:59 · 已催取 1 次</div>
  </div>
  <div class="stats-strip dark">
    <span>格口 B07</span><span>温区 热</span><span>重约 0.8kg</span>
  </div>
  <div class="keypad">${[1,2,3,4,5,6,7,8,9,'清空',0,'开柜'].map((k)=>`<div class="key">${k}</div>`).join('')}</div>
  <div style="margin:12px;padding:10px;border-radius:8px;background:#243040;font-size:12px">
    <div>格口 <b style="color:#f5e3a8">B07</b> 已弹开 · 请在 60 秒内取物</div>
    <div class="m" style="color:#9ab0c4;margin-top:6px">寄件备注：两份关东煮 · 别先走 · 伞放在柜门内侧挂钩</div>
    <div class="m" style="color:#9ab0c4;margin-top:4px">寄件人：祁洵 · 收件人：同址 · 灯坏了也能找见柜号</div>
  </div>
  <div class="related dark">
    <div class="rel-i">历史：昨日同柜取过「未寄出的信」</div>
    <div class="rel-i">提示：靠过来一点再关柜门，别夹到伞骨</div>
  </div>
  <div class="foot-meta dark">客服热线已脱敏 · 异常开柜将录像 15 秒</div>
</div>`),

  '04': () => s(`
<div class="phone" style="background:#f3faf7">
  <div class="ph-bar" style="background:#e8f5f0">市一院 · 内科 · 小程序</div>
  <div class="stats-strip teal">
    <span>候诊 21</span><span>已叫 17</span><span>雨天加号 +3</span>
  </div>
  <div style="padding:16px;text-align:center">
    <div class="m">当前叫号</div>
    <div style="font-size:48px;font-weight:800;color:#2d6b57;line-height:1.1">17</div>
    <div style="margin-top:8px;font-size:14px">你的号 <b>21</b> · 前方约 4 人 · 预计 18 分</div>
    <div class="prog"><i style="width:62%"></i></div>
  </div>
  <div class="panel">
    <div class="m">电子病历备注 · 祁洵陪同登记</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.6">主诉：雨夜后心率偏快，便利店灯下站过久。医嘱旁注：独处时易加重——建议有人陪；共伞半径内情绪更稳。</div>
  </div>
  <div class="list-dense">
    <div class="li"><b>检验单</b><span class="m">心电图 · 已完成</span></div>
    <div class="li"><b>检验单</b><span class="m">血常规 · 排队中</span></div>
    <div class="li"><b>处方</b><span class="m">待开 · 医生备注「少说没事」</span></div>
    <div class="li"><b>陪同</b><span class="m">祁洵 · 候诊椅 04</span></div>
    <div class="li"><b>下次复诊</b><span class="m">若再「别先走」式站桩需复诊</span></div>
    <div class="li"><b>温馨提示</b><span class="m">关东煮可在门诊楼便利店取</span></div>
  </div>
  <div class="tip-bar">请勿离开候诊区 · 过号需重新取号 · 灯坏了的走廊请走另一侧</div>
  <div class="foot-meta">就诊卡尾号 8821 · 今日第 2 次打开 · 网络良好</div>
</div>`),

  '05': () => s(`
<div class="phone dark-ui" style="background:#1a2430;color:#e8eef4">
  <div class="ph-bar" style="border-color:#2a3848">乘车记录 · 9/4 · 周报</div>
  <div class="stats-strip dark">
    <span>里程 42.6km</span><span>异常 1</span><span>雨天 4 段</span>
  </div>
  <div class="timeline">
    <div class="tl"><span>08:12</span><div><b>进站 · 南门</b><div class="m">正常 · 闸机 3 · 携折叠伞</div></div></div>
    <div class="tl"><span>08:41</span><div><b>换乘 · 中环</b><div class="m">停留 3 分 · 人流中等</div></div></div>
    <div class="tl"><span>18:20</span><div><b>进站 · 公司口</b><div class="m">加班回程 · 天气转雨</div></div></div>
    <div class="tl"><span>19:05</span><div><b>出站 · 便利店站</b><div class="m">短停买关东煮 · 两份</div></div></div>
    <div class="tl hot"><span>23:18</span><div><b>异常停留 · 便利店站</b><div class="m" style="color:#f5e3a8">停留 26 分 · 灯坏了也能站 · 备注：等祁洵</div></div></div>
    <div class="tl"><span>23:44</span><div><b>再次进站</b><div class="m">雨势加大 · 伞已共开</div></div></div>
    <div class="tl"><span>23:47</span><div><b>出站 · 小区口</b><div class="m">雨未停 · 「别先走」通话 12 秒</div></div></div>
  </div>
  <div class="panel" style="background:#243040;color:#c8d4e0">系统提示：异常停留可申诉。申诉理由草稿：「靠过来一点」不算滞留。</div>
  <div class="foot-meta dark">本周碳排放抵扣已计算 · 下次雨夜请备干毛巾</div>
</div>`),

  '06': () => s(`
<div class="ticket">
  <div class="ticket-h">CITY PARK · 停车缴费</div>
  <div class="ticket-no">NO. P-8821 · 地库 B2</div>
  <div class="stats-strip soft" style="margin:8px 0">
    <span>过夜</span><span>雨夜入场</span><span>副驾有伞</span>
  </div>
  <div class="ticket-row"><span>车牌</span><span>京A·D**</span></div>
  <div class="ticket-row"><span>车主备注</span><span>祁洵（临停授权）</span></div>
  <div class="ticket-row"><span>入场</span><span>昨日 23:58 · 大雨</span></div>
  <div class="ticket-row"><span>出场</span><span>今日 07:12 · 小雨</span></div>
  <div class="ticket-row"><span>闸机</span><span>入口 3 → 出口 1</span></div>
  <div class="ticket-row big"><span>时长</span><span class="gold">7 小时 14 分</span></div>
  <div class="ticket-row"><span>费用</span><span>¥56.00</span></div>
  <div class="ticket-row"><span>优惠</span><span>无 · 过夜全价</span></div>
  <div class="dash"></div>
  <div class="m" style="line-height:1.7">备注：过夜 · 副驾位有一把未取的伞。后座纸袋里两份关东煮空盒。仪表台便签：「别先走——灯坏了我也等。」出场时雨刷仍在摆。</div>
  <div class="tip-bar" style="margin-top:10px">缴费后 15 分钟内离场 · 超时将重新计费</div>
  <div class="foot-meta">电子发票可发至邮箱 · 客服工单：伞遗失招领已关联</div>
</div>`),

  '07': () => s(`
<div class="phone dark-ui" style="background:#152028;color:#e8eef4">
  <div class="ph-bar">共享单车 · 行程已结束</div>
  <div class="stats-strip dark">
    <span>19 分</span><span>2.4 km</span><span>¥3.5</span><span>雨天加价 0</span>
  </div>
  <div class="map">
    <svg viewBox="0 0 300 140" width="100%" height="140"><path d="M30 110 C80 100,120 40,270 35" fill="none" stroke="#5a9ad4" stroke-width="3" stroke-dasharray="6 4"/><circle cx="30" cy="110" r="7" fill="#7ab0e0"/><circle cx="180" cy="55" r="6" fill="#e8a060"/><circle cx="270" cy="35" r="7" fill="#f5e3a8"/></svg>
    <span class="map-tag l">起点 · 便利店</span>
    <span class="map-tag m">异常停 · 灯下</span>
    <span class="map-tag r">终点 · 南门</span>
  </div>
  <div class="list-dense dark">
    <div class="li"><b>23:08</b><span>开锁 · 车号 8821 · 电量 78%</span></div>
    <div class="li"><b>23:14</b><span>途经 · 雨变大 · 速度下降</span></div>
    <div class="li hot-li"><b>23:19</b><span>异常停 · 灯坏了路口 · 停留 4 分</span></div>
    <div class="li"><b>23:23</b><span>继续骑行 · 备注：等祁洵共伞段</span></div>
    <div class="li"><b>23:27</b><span>关东煮袋挂车篮 · 重量检测通过</span></div>
    <div class="li"><b>23:27</b><span>还车 · 南门桩 · 「别先走」通话同步</span></div>
  </div>
  <div class="panel" style="background:#1e3038">发票抬头：个人 · 行程备注：靠过来一点那段路最慢。</div>
  <div class="foot-meta dark">本月骑行 11 次 · 异常停留申诉通道已开</div>
</div>`),

  '08': () => s(`
<div class="phone" style="background:#eef6f2">
  <div class="ph-bar">空气 · 过敏预警 · 雨后峰值</div>
  <div class="stats-strip teal">
    <span>指数 72</span><span>偏高</span><span>适宜共伞</span>
  </div>
  <div style="padding:16px;display:flex;align-items:flex-end;gap:12px">
    <div style="font-size:56px;font-weight:800;color:#2d6b57;line-height:1">72</div>
    <div><div style="font-weight:700;color:#c47a40">偏高</div><div class="m">适宜共伞 · 不宜先走 · 灯下久站需注意</div></div>
  </div>
  <div style="padding:0 14px 8px">
    ${[['花粉','低','路边法国梧桐'],['尘螨','中','回南湿气'],['「祁洵」','高敏','雨夜触发明显'],['冷空气','中','开伞瞬间'],['未读消息','低','已读不回例外'],['关东煮蒸汽','中','吸入后心跳↑'],['便利店日光灯','中','灯坏了反而稳'],['「别先走」三字','高','声纹过敏？']].map((row,i)=>`<div class="allergen ${i===2||i===7?'bad':''}"><span><b>${row[0]}</b><div class="m">${row[2]}</div></span><span>${row[1]}</span></div>`).join('')}
  </div>
  <div class="tip-bar">点开「祁洵」：建议保持一臂距离内的伞半径 · 靠过来一点可降低指数</div>
  <div class="foot-meta">数据更新于 23:40 · 仅供剧情戏仿 · 非医疗建议</div>
</div>`),

  '09': () => s(`
<div class="phone dark-ui" style="background:#12161c;color:#e8eef4">
  <div class="ph-bar">智能门锁 · 电量 64% · 固件 3.2</div>
  <div class="stats-strip dark">
    <span>今日开锁 6</span><span>失败 2</span><span>访客 1</span>
  </div>
  <div class="timeline">
    <div class="tl"><span>18:40</span><div><b>指纹 · 成功 · 你</b><div class="m">下班 · 伞架空</div></div></div>
    <div class="tl"><span>22:01</span><div><b>指纹 · 成功 · 你</b><div class="m">便利店回来 · 关东煮入柜</div></div></div>
    <div class="tl fail"><span>23:12</span><div><b>指纹 · 失败 ×2</b><div class="m" style="color:#e8a090">雨水打湿 · 建议擦干</div></div></div>
    <div class="tl"><span>23:14</span><div><b>密码 · 成功 · 祁洵</b><div class="m">临时授权有效 · 「靠过来一点」语音备注</div></div></div>
    <div class="tl"><span>23:16</span><div><b>门开 12 秒</b><div class="m">两人入内 · 伞滴水传感器触发</div></div></div>
    <div class="tl hot"><span>01:06</span><div><b>门开 48 秒 · 备注：不该这个点</b><div class="m" style="color:#f5e3a8">灯坏了玄关夜灯 · 仍摸到鞋</div></div></div>
    <div class="tl"><span>01:08</span><div><b>门关闭 · 自动上锁</b><div class="m">「别先走」未在门外说完</div></div></div>
  </div>
  <div class="tip-bar dark">访客密码将于明日 08:00 失效 · 可续期一次</div>
  <div class="foot-meta dark">电量预计可用 11 天 · 低电将短信通知祁洵</div>
</div>`),

  '10': () => s(`
<div class="phone" style="background:#fff8f4">
  <div class="ph-bar">外卖追踪 · 配送中 · 雨夜加急</div>
  <div class="stats-strip soft">
    <span>骑手距你 0.6km</span><span>预计 23:50</span><span>同址叠单</span>
  </div>
  <div class="map light">
    <div class="rider">骑手</div>
    <div class="route-line"></div>
    <span class="map-tag l">店</span><span class="map-tag r">同址收</span>
  </div>
  <div class="order"><b>订单 A · #8821A</b> 关东煮×2<div class="m">备注：少辣，留一份 · 伞挂门把手</div><div class="m">下单人：你 · 23:22</div></div>
  <div class="order twin"><b>订单 B · #8821B</b> 关东煮×2<div class="m">备注：谁点了两份？……谢谢 · 别先走我马上到</div><div class="m">下单人：祁洵 · 23:23</div></div>
  <div class="list-dense">
    <div class="li"><b>商家</b><span>已出餐 · 保温袋双份</span></div>
    <div class="li"><b>骑手</b><span>已取餐 · 雨衣就位</span></div>
    <div class="li"><b>异常</b><span>同址叠单 · 系统建议合并</span></div>
    <div class="li"><b>定位</b><span>便利店路口 · 灯坏了请看手机光</span></div>
    <div class="li"><b>联系</b><span>骑手备注：靠过来一点接餐</span></div>
    <div class="li"><b>发票</b><span>两单分开 · 情感合并另议</span></div>
  </div>
  <div class="warn" style="margin:10px">同址叠单 · 预计 23:50 送达 · 雨势可能延误 3–5 分</div>
  <div class="foot-meta">客服会话已关联「关东煮双人套」活动页</div>
</div>`),

  '11': () => s(`
<div class="phone" style="background:#f7f4ee">
  <div class="ph-bar">会议室 · 3F · 今日 · 冲突高亮</div>
  <div class="stats-strip soft">
    <span>预约 4</span><span>重叠 1</span><span>发起人：对方</span>
  </div>
  <div class="hours">${['10','12','14','16','18','20'].map(h=>`<span>${h}</span>`).join('')}</div>
  <div class="rooms">
    <div class="room"><b>有事</b><i style="left:10%;width:20%"></i><span class="room-meta">10:00–12:00 · 你</span></div>
    <div class="room on"><b>见面？</b><i style="left:40%;width:28%"></i><em>overlapping</em><span class="room-meta">14:00–16:48 · 祁洵</span></div>
    <div class="room"><b>别忘了</b><i style="left:70%;width:18%"></i><span class="room-meta">18:00–19:30 · 你</span></div>
    <div class="room"><b>待定</b><span class="room-meta">空闲 · 可锁</span></div>
    <div class="room"><b>雨夜复盘</b><i style="left:55%;width:22%"></i><span class="room-meta">16:00–18:00 · 冲突旁支</span></div>
    <div class="room"><b>关东煮茶歇</b><i style="left:5%;width:15%"></i><span class="room-meta">非正式 · 便利店灯下</span></div>
  </div>
  <div class="panel"><div class="m">已选 · 见面？</div><div style="margin-top:4px;line-height:1.6">地点：便利店灯下包厢 · 发起：对方 · 备注：（空）→ 系统建议填「靠过来一点 / 别先走」。</div></div>
  <div class="tip-bar">连续三周同一时段重叠 · HR 匿名墙已有帖（见样卡 14）</div>
  <div class="foot-meta">日历同步：企微 / 私人 · 冲突未自动拒绝</div>
</div>`),

  '12': () => s(`
<div class="doc">
  <div class="doc-h">体检报告解读 · WJ-09</div>
  <div class="m" style="margin-bottom:8px">受检人：祁洵（化名）· 采样日 9/3 · 雨夜后次晨</div>
  <div class="stats-strip soft" style="margin-bottom:10px">
    <span>异常 2</span><span>建议复测 1</span><span>陪检：有</span>
  </div>
  <table>
    <tr><td>血压</td><td>正常</td><td>120/78</td></tr>
    <tr><td>血脂</td><td>正常</td><td>—</td></tr>
    <tr><td>血常规</td><td>正常</td><td>—</td></tr>
    <tr><td>肝功</td><td>正常</td><td>—</td></tr>
    <tr class="hi"><td>心率</td><td>偏高</td><td>独处时 · 共伞后回落</td></tr>
    <tr><td>睡眠</td><td>不足</td><td>雨夜相关 · 灯坏了仍醒</td></tr>
    <tr><td>焦虑自评</td><td>轻度</td><td>「没事」高频</td></tr>
    <tr><td>营养</td><td>尚可</td><td>关东煮过量备注</td></tr>
  </table>
  <div class="doc-note">医生建议（戏仿）：把伞往中间挪的人，心率更稳。便利店久站不如靠过来一点。嘱咐家属：听到「别先走」时请当真。</div>
  <div class="related">
    <div class="rel-i">复测预约：若再异常停留＞20 分请复诊</div>
    <div class="rel-i">关联病历：内科候诊号 21（样卡 04）</div>
  </div>
  <div class="m" style="margin-top:8px">仅供剧情 · 不构成医嘱</div>
</div>`),

  '13': () => s(`
<div class="phone" style="background:#faf9f7">
  <div class="ph-bar">匿名树洞 · 热榜 #3 · 雨夜专场</div>
  <div class="stats-strip soft">
    <span>热度 12.4w</span><span>评论 386</span><span>转发 2.1w</span>
  </div>
  <div class="post">
    <div class="m">匿名 · 洋葱头 · 23:58 发布</div>
    <div style="font-size:14px;margin:8px 0;line-height:1.7">雨停了他还站着。我想问要不要共伞，嘴比手快点了两份关东煮。便利店灯坏了一盏，他脸上半明半暗。我说靠过来一点，他说没事。我又说别先走——这回他没回没事。</div>
    <div class="m">标签：#共伞 #关东煮配额 #灯坏了</div>
  </div>
  ${[['路过的灯','23:59','这就叫命中注定吧，灯都配合坏了'],['不取关','00:01','两份是默认配额，三份才叫爱'],['柜门证人','00:03','楼里那盏坏灯我也看见了，伞骨歪的那把'],['修罗场观众','00:05','别先走三个字我磕到了，循环听'],['便利店夜班','00:08','关东煮是我热的，收据我还留着'],['雨声后期','00:12','靠过来一点那段环境音我单抽出了'],['匿名医生','00:15','心率偏高可参考样卡 12（误）'],['洋葱头本人','00:20','……谢谢你们，祁洵如果刷到请装没看见']].map(([u,t,c])=>`<div class="cmt"><b>${u}</b> <span class="m">${t}</span><div style="margin-top:4px">${c}</div></div>`).join('')}
  <div class="foot-meta">热榜刷新于 00:22 · 举报通道：剧情向勿当真</div>
</div>`),

  '14': () => s(`
<div class="phone" style="background:#f5f5f5">
  <div class="ph-bar">茶水间吐槽墙 · 匿名区</div>
  <div class="chip-row"><span class="chip on">今日热帖</span><span class="chip">匿名</span><span class="chip">本周</span><span class="chip">已归档</span></div>
  <div class="stats-strip soft">
    <span>新帖 9</span><span>回复 47</span><span>禁言 2</span>
  </div>
  <div class="post office">
    <div><b>工位八卦</b> · 不点名只点座 · 09:12</div>
    <p style="line-height:1.6">谁又能解释「会议室·见面？」连续三周同一时段？还有人雨夜在便利店灯下对账关东煮？靠过来一点是商务礼仪吗？</p>
  </div>
  <div class="cmt"><b>HR观察员</b> <span class="m">09:15</span><div>建议走流程而不是走心；「别先走」写入考勤会很麻烦</div></div>
  <div class="cmt"><b>保洁阿姨</b> <span class="m">09:18</span><div>我只负责关灯，不负责关感情；灯坏了请报修单</div></div>
  <div class="cmt"><b>前台小叶</b> <span class="m">09:22</span><div>访客登记里出现过「祁洵」· 雨伞滴了一地</div></div>
  <div class="cmt"><b>IT运维</b> <span class="m">09:30</span><div>会议室日历冲突告警已忽略三次，系统也累了</div></div>
  <div class="cmt"><b>夜班保安</b> <span class="m">09:41</span><div>监控里两人共一把伞，像素很糊，但很甜</div></div>
  <div class="cmt"><b>本人？</b> <span class="m">10:02</span><div>……谢谢你们，关东煮发票我可以交行政报销吗</div></div>
  <div class="tip-bar">版规：禁止人肉 · 允许磕糖 · 灯坏了先报修再聊八卦</div>
  <div class="foot-meta">本墙由行政部戏仿维护 · 非官方公告</div>
</div>`),

  '15': () => s(`
<div class="phone" style="background:#fff">
  <div class="ph-bar">相亲评分 · 本场 · 雨夜加赛</div>
  <div class="stats-strip soft">
    <span>综合 3.2</span><span>评委 5</span><span>暴击维 1</span>
  </div>
  <div style="padding:12px;display:flex;gap:12px;align-items:center">
    <div class="avatar">祁</div>
    <div><b>化名·阿洵</b><div class="m">综合 3.2 / 5 · 场次 #8821</div><div class="m">关键词：伞 / 关东煮 / 没事</div></div>
  </div>
  <svg viewBox="0 0 200 160" width="100%" height="160" style="display:block">${radar()}</svg>
  <div class="list-dense">
    <div class="li"><b>外貌</b><span>4.0 · 雨湿刘海加分</span></div>
    <div class="li"><b>谈吐</b><span>3.5 · 慢热</span></div>
    <div class="li hot-li"><b>表达欲</b><span>1.2 · 「总说没事」暴击</span></div>
    <div class="li"><b>稳定</b><span>3.8 · 灯坏了也不先走</span></div>
    <div class="li"><b>共情</b><span>4.2 · 会把伞往中间挪</span></div>
    <div class="li"><b>行动力</b><span>4.5 · 默认点两份</span></div>
  </div>
  <div class="warn" style="margin:0 12px">暴击维：表达欲 1.2 · 「总说没事」· 建议补一句「靠过来一点」</div>
  <div class="panel">评语：伞给得很及时，话给得很慢。便利店灯下表现 A，语言区待补考。别先走——这句是他今晚最高分。</div>
  <div class="foot-meta">评分仅供剧情 · 下一位候选人排队中</div>
</div>`),

  '16': () => s(`
<div class="phone" style="background:#f7f2ea">
  <div class="ph-bar">十年同学会 · 签到墙 · 桌号动态</div>
  <div class="stats-strip soft">
    <span>到场 86/120</span><span>+1 席 12</span><span>雨天改室内</span>
  </div>
  <div class="seats">${Array.from({length:12},(_,i)=>`<div class="seat ${i===4?'me':i===5?'plus':''}">${i===4?'你':i===5?'+1':i+1}</div>`).join('')}</div>
  <div class="list-dense">
    <div class="li"><b>席位 01</b><span>班长 · 已签 · 带娃</span></div>
    <div class="li"><b>席位 02</b><span>学委 · 迟到 · 堵在雨里</span></div>
    <div class="li"><b>席位 03</b><span>体委 · 已签 · 点了关东煮拼盘</span></div>
    <div class="li"><b>席位 04</b><span>空 · 改签未到</span></div>
    <div class="li hot-li"><b>席位 05 · 你</b><span>携带人：祁洵（雨夜来的那位）</span></div>
    <div class="li"><b>席位 06</b><span>+1 位 · 伞架已满</span></div>
    <div class="li"><b>席位 07–08</b><span>情侣档 · 共伞入场</span></div>
    <div class="li"><b>席位 09</b><span>匿名签到 · 只写「别先走」</span></div>
  </div>
  <div class="panel"><b>席位 05 备注</b><div class="m" style="margin-top:4px;line-height:1.6">携带人备注：祁洵（雨夜来的那位）。餐叙意愿：靠过来一点坐。忌口：无。灯坏了的角落请勿安排拍照。</div></div>
  <div class="foot-meta">签到截止 20:00 · 过时改桌需找司仪</div>
</div>`),

  '17': () => s(`
<div class="phone" style="background:#ededed">
  <div class="wx-h">阳光花园业主群 · 328 人</div>
  <div class="stats-strip soft">
    <span>未读 46</span><span>禁言 2</span><span>置顶 1</span>
  </div>
  <div class="wx-pin">公告：今晚检修，便利店路段灯可能不亮。雨天请慢行。关东煮店照常营业。</div>
  <div class="wx-msg l"><b>物业小张</b><div class="bub">已知悉，会尽快。检修约 23:00–01:00。</div><div class="m">22:10</div></div>
  <div class="wx-msg l"><b>热心王姐</b><div class="bub">那伞够不够分？我们楼道就一把公共伞。</div><div class="m">22:12</div></div>
  <div class="wx-msg r"><div class="bub g">灯坏了也没关系，人别先走就行。</div><div class="m">22:13 · 你</div></div>
  <div class="wx-msg l"><b>热心王姐</b><div class="bub">？这是物业群啊姐妹们</div><div class="m">22:13</div></div>
  <div class="wx-msg l"><b>祁洵？</b><div class="bub">……靠过来一点，群里说话也行。</div><div class="m">22:14</div></div>
  <div class="wx-msg l"><b>夜跑团</b><div class="bub">便利店集合改到灯还能亮的那一侧。</div><div class="m">22:16</div></div>
  <div class="wx-msg l"><b>管理员</b><div class="bub sys">已禁言 2 人 · 请勿发散情感话题</div><div class="m">22:18</div></div>
  <div class="wx-msg r"><div class="bub g">收到。关东煮我先垫两份。</div><div class="m">22:19 · 你</div></div>
  <div class="tip-bar">你已被提醒：发言含「别先走」类关键词 · 下次可能折叠</div>
  <div class="foot-meta">群主：业委会 · 本消息仅群内可见</div>
</div>`),

  '18': () => s(`
<div class="poster">
  <div class="poster-h">失物招领</div>
  <div class="stats-strip soft" style="margin-bottom:8px">
    <span>张贴点 · 便利店窗</span><span>有效 7 日</span>
  </div>
  <div class="poster-body">
    <p><b>物品：</b>黑色折叠伞一把，骨略歪，只共淋过一场雨。伞柄胶带上写着铅笔字：「靠过来一点」。</p>
    <p><b>发现地点：</b>小区南门 → 便利店路口，灯坏了的那根电线杆旁。</p>
    <p><b>认领条件：</b>能说出「靠过来一点」出现的路口；或能对上关东煮双人套收据尾号 8821。</p>
    <p><b>附加物：</b>伞袋内一张便签——「别先走」。字迹被雨洇开一半。</p>
    <p><b>联系方式：</b><span class="blur">138****8821</span> <button class="b tiny">揭开</button></p>
    <p><b>备注：</b>若无人认领，将转交祁洵（门禁访客记录里的那位）。</p>
  </div>
  <div class="related">
    <div class="rel-i">已有 3 人留言「是我的伞」· 均未通过暗号</div>
    <div class="rel-i">监控模糊：共伞两人走向相反方向后折返</div>
  </div>
  <div class="poster-f">张贴日 9/4 · 撕角有效 · 请勿覆盖其他告示</div>
</div>`),

  '19': () => s(`
<div class="phone" style="background:#f4f6f8">
  <div class="ph-bar">图书馆 · 3F 静音区 · 预约系统</div>
  <div class="stats-strip soft">
    <span>余位 4</span><span>闭馆 01:12:40</span><span>雨声外放关</span>
  </div>
  <div class="lib-grid">${Array.from({length:16},(_,i)=>`<div class="lib ${i===5?'on':i===6?'note':''}">${i+1}</div>`).join('')}</div>
  <div class="slip">邻座纸条：闭馆前十分钟，便利店见。伞我带着。关东煮你点。靠过来一点写作业也行。——祁洵</div>
  <div class="list-dense">
    <div class="li"><b>B05</b><span>空 · 充电器占用中</span></div>
    <div class="li hot-li"><b>B06 · 你</b><span>已签到 · 倒计时同步</span></div>
    <div class="li"><b>B07</b><span>邻座 · 留条中 · 灯管闪</span></div>
    <div class="li"><b>B08</b><span>已预约 · 未到</span></div>
    <div class="li"><b>C01–C04</b><span>考研区 · 勿打扰</span></div>
    <div class="li"><b>服务台</b><span>失物：折叠伞一把待领</span></div>
  </div>
  <div class="m" style="padding:10px 14px">你的预约：B06 · 闭馆倒计时 01:12:40 · 超时座位释放</div>
  <div class="tip-bar">静音区禁止通话；「别先走」请用纸条传递</div>
  <div class="foot-meta">馆方提示：灯坏了请勿自行修理 · 报修码 3F-12</div>
</div>`),

  '20': () => s(`
<div class="phone dark-ui" style="background:#1a1a1c;color:#eee">
  <div class="ph-bar">选座 · 《未命名的雨夜》· 厅 3</div>
  <div class="stats-strip dark">
    <span>余票 18</span><span>锁座 04:59</span><span>双人优惠</span>
  </div>
  <div class="screen">SCREEN</div>
  <div class="cinema">${Array.from({length:40},(_,i)=>{const r=Math.floor(i/8),c=i%8;const mid=r===2&&(c===3||c===5);const empty=r===2&&c===4;return `<div class="cs ${mid?'pick':empty?'gap':c%7===0?'sold':''}"></div>`}).join('')}</div>
  <div style="padding:12px;font-size:12px;line-height:1.7">已选 <b style="color:#f5e3a8">F4 / F6</b> · <span style="color:#f5e3a8">中间空一格</span> · 锁座 04:59<br>空位备注：留给伞、留给犹豫、留给「靠过来一点」。</div>
  <div class="list-dense dark">
    <div class="li"><b>场次</b><span>今日 21:40 · 字幕中文</span></div>
    <div class="li"><b>搭档</b><span>待邀请 · 祁洵？</span></div>
    <div class="li"><b>套餐</b><span>关东煮味爆米花？系统无此 SKU</span></div>
    <div class="li"><b>无障碍</b><span>厅内灯可控 · 坏了请呼唤服务</span></div>
    <div class="li"><b>退改</b><span>开场前 30 分 · 「别先走」不构成退票理由</span></div>
    <div class="li"><b>取票</b><span>取票码 8821 · 便利店亦可代取</span></div>
  </div>
  <div class="foot-meta dark">影城会员：银卡 · 本片想看列表 +1</div>
</div>`),

  '21': () => s(`
<div class="board">
  <div class="m" style="opacity:.7;margin-bottom:8px">DEPARTURE · GATE UPDATES · 雨夜特情</div>
  <div class="board-row"><span>航班</span><span>MU8821</span></div>
  <div class="board-row"><span>目的地</span><span>家的方向</span></div>
  <div class="board-row"><span>经停</span><span>便利店灯下 · 可选</span></div>
  <div class="board-row"><span>计划</span><span>23:10</span></div>
  <div class="board-row"><span>预计</span><span>23:48 · 滑动中</span></div>
  <div class="board-row blink"><span>状态</span><span>延误 · 登机口变更</span></div>
  <div class="board-row"><span>登机口</span><span>A12 → B07</span></div>
  <div class="board-row"><span>理由</span><span>气流不稳 · 像你们的对话</span></div>
  <div class="board-row"><span>行李</span><span>折叠伞 1 · 关东煮禁运</span></div>
  <div class="board-row"><span>旅客</span><span>祁洵 / 你 · 未值机齐</span></div>
  <div class="m" style="margin-top:12px;line-height:1.7;opacity:.85">广播摘录：请持有「靠过来一点」口令的旅客前往新登机口；请勿在灯坏了的廊桥独自停留；重复——别先走，航班会等雨小一点。</div>
  <div class="foot-meta dark" style="opacity:.6;margin-top:10px">BOARD TIME LOCAL · 仅供剧情戏仿</div>
</div>`),

  '22': () => s(`
<div class="form">
  <div class="form-h">酒店入住登记单 · 夜审前</div>
  <div class="stats-strip soft" style="margin-bottom:8px">
    <span>房 1208</span><span>大床</span><span>雨夜到店</span>
  </div>
  <div class="form-row"><label>住客</label><div>祁洵</div></div>
  <div class="form-row"><label>证件</label><div>尾号 8821 · 已核验</div></div>
  <div class="form-row"><label>房型</label><div>大床 · 1 晚 → 续住待确认</div></div>
  <div class="form-row strike"><label>同住</label><div><s>1</s> → <b class="gold">2</b> <span class="m">涂改痕迹 · 前台已见证</span></div></div>
  <div class="form-row"><label>到店</label><div>23:41 · 伞架滴水</div></div>
  <div class="form-row"><label>特殊需求</label><div>台灯修好 / 勿先走催退房</div></div>
  <div class="form-row"><label>押金</label><div>¥300 · 可转关东煮券？否</div></div>
  <div class="form-row"><label>备注</label><div>靠过来一点写在房卡套内侧</div></div>
  <div class="toggle"><span class="on">涂改稿</span><span>原稿</span></div>
  <div class="m" style="line-height:1.7;margin:8px 0">脚注：原稿同住栏为 1；涂改发生在便利店外通话之后。夜审系统将「别先走」识别为特殊备注并标黄。灯坏了的楼层请走安全通道。</div>
  <div class="sign">前台签字 ________ · 住客确认 ________</div>
  <div class="foot-meta">单号 H-8821 · 打印联交客 · 底联留店</div>
</div>`),

  '23': () => s(`
<div class="safe">
  <div class="m" style="margin-bottom:8px">HOTEL SAFE · 房 1208 · 已开锁</div>
  <div class="dial"><div class="dial-n">0</div></div>
  <div class="pass"><i></i><i></i><i class="on"></i><i></i></div>
  <div class="safe-ok">锁舌已开 · 内物完整</div>
  <div class="stats-strip dark" style="margin:8px 0;justify-content:center">
    <span>物品 7</span><span>上次开启 01:06</span>
  </div>
  <ul class="safe-list">
    <li>旧伞骨一根 · 胶带字：靠过来一点</li>
    <li>未寄出的信 · 抬头：祁洵</li>
    <li>两张电影票根 · 《未命名的雨夜》F4/F6</li>
    <li>关东煮积分卡 · 差 12 分兑汽水</li>
    <li>写着「别先走」的便签 · 雨渍</li>
    <li>便利店收据 · 双份 · 尾号 8821</li>
    <li>备用门禁卡 · 备注：灯坏了摸黑用</li>
  </ul>
  <div class="m" style="margin-top:10px;line-height:1.6">操作日志：密码第三次正确；失败两次因手指有雨。关闭前请确认无遗漏。</div>
  <div class="foot-meta dark">保险箱电池 88% · 强开将报警至前台</div>
</div>`),

  '24': () => s(`
<div class="will">
  <div class="will-h">戏仿遗嘱 · 财产清册</div>
  <div class="m" style="margin-bottom:8px">立约场景：雨夜 · 便利店外 · 灯坏了也能签字</div>
  <div class="stats-strip soft" style="margin-bottom:10px">
    <span>条款 8</span><span>见证人：灯</span><span>执行人：你</span>
  </div>
  <ol>
    <li>黑色折叠伞 → 留给会把它往中间挪的人</li>
    <li>未读完的书 → 留给催我睡觉的人</li>
    <li>便利店积分 → 留给点两份的人</li>
    <li>关东煮常点清单 → 默认双人套永不删除</li>
    <li>门锁访客密码 → 雨夜有效，晴天需重申</li>
    <li class="hi">那句「没事」的解释权 → <b>留给你</b></li>
    <li>雨夜路口的站桩习惯 → 共同继承 · 条件：别先走</li>
    <li>「靠过来一点」的使用权 → 仅限共伞半径内</li>
  </ol>
  <div class="m" style="margin:10px 0;line-height:1.7">附言：若灯修好了，本清册仍有效。若关东煮涨价，积分条款按新价折算。本文件为剧情戏仿，无法律效力。</div>
  <div class="sign">立约人：祁洵 · 见证人：灯 · 日期：9/4</div>
</div>`),

  '25': () => s(`
<div class="phone" style="background:#f0f4f8">
  <div class="queue-screen">
    <div>窗口 <b>03</b> · 补件综合</div>
    <div style="font-size:42px;font-weight:800">A017</div>
    <div class="m">你的号 A021 · 请耐心等待 · 前方 4 人</div>
  </div>
  <div class="stats-strip soft">
    <span>已叫 A017</span><span>你的 A021</span><span>雨天窗口慢</span>
  </div>
  <div class="checklist">
    <div class="ok">身份证</div><div class="ok">照片</div><div class="bad">户口页 · 缺</div><div class="ok">申请表</div>
    <div class="ok">居住证明</div><div class="bad">关系说明 · 空</div><div class="ok">缴费回执</div><div class="ok">雨夜情况说明？</div>
  </div>
  <div class="list-dense">
    <div class="li"><b>缺件指引</b><span>户口页可至自助机补打</span></div>
    <div class="li"><b>关系说明</b><span>可写「共伞同伴 / 祁洵」</span></div>
    <div class="li"><b>窗口建议</b><span>勿写「没事」作理由</span></div>
    <div class="li"><b>便民</b><span>一楼便利店可买档案袋</span></div>
    <div class="li"><b>无障碍</b><span>灯坏了走 B 通道</span></div>
    <div class="li"><b>叫号提醒</b><span>短信将发：别先走太远</span></div>
  </div>
  <div class="warn">材料缺一 · 请到补件窗口 · 过号需重新取号</div>
  <div class="foot-meta">取号时间 09:12 · 预估办理 12 分 · 靠过来一点看屏幕更清</div>
</div>`),

  '26': () => s(`
<div class="phone" style="background:#1a1520;color:#f0e6f2">
  <div class="ph-bar" style="border-color:#2a2030">冷静期协议 · 电子签</div>
  <div class="stats-strip dark">
    <span>已过撤回窗</span><span>条款 12</span><span>双方已签</span>
  </div>
  <div style="text-align:center;padding:24px">
    <div class="m">剩余</div>
    <div style="font-size:40px;font-family:ui-monospace,Consolas,monospace;font-weight:700">71:12:08</div>
    <div class="ring"><i style="--p:35"></i></div>
    <div class="m" style="margin-top:8px">起算：雨夜便利店外 · 灯坏了那一刻</div>
  </div>
  <div class="list-dense dark">
    <div class="li"><b>甲方</b><span>你 · 已签</span></div>
    <div class="li"><b>乙方</b><span>祁洵 · 已签</span></div>
    <div class="li"><b>标的</b><span>「没事」与「别先走」之争议</span></div>
    <div class="li"><b>履行地</b><span>共伞半径内</span></div>
    <div class="li"><b>违约</b><span>单方面先走 · 需请关东煮×2</span></div>
    <div class="li"><b>例外</b><span>靠过来一点可中断倒计时 10 分</span></div>
  </div>
  <div style="padding:0 16px 12px;display:flex;gap:8px">
    <button class="b dis" style="flex:1">撤回（已过窗口）</button>
  </div>
  <div class="m" style="padding:0 16px 16px;line-height:1.7">条款摘要：倒计时结束前可撤回；结束后按钮将永久灰死。冷静期内禁止删除共享相册雨夜分组。</div>
  <div class="foot-meta dark">协议编号 CL-8821 · 存证哈希已脱敏</div>
</div>`),

  '27': () => s(`
<div class="phone" style="background:#faf8f3">
  <div class="ph-bar">合租分账 · 9 月 · 待确认</div>
  <div style="padding:12px;font-size:28px;font-weight:800">¥1,286 <span class="m" style="font-size:12px">待分摊 · 2 人</span></div>
  <div class="stats-strip soft">
    <span>你应付 ¥643</span><span>祁洵 ¥643</span><span>异常 1</span>
  </div>
  ${[['水费','¥42','抄表日 9/1'],['电费','¥186','含台灯通宵'],['网费','¥99','合约未到期'],['燃气','¥35','几乎未用'],['异常·深夜外卖柜','¥64','同址关东煮×2'],['清洁','¥80','公区'],['伞架沥水垫','¥28','雨季新增'],['公摊·灯具报修','¥52','灯坏了已换']].map(([n,p,m],i)=>`<div class="bill ${i===4?'bad':''}"><span><b>${n}</b><div class="m">${m}</div></span><span>${p}</span></div>`).join('')}
  <div class="panel">异常项备注：同一地址两单关东煮 · 建议情感入账。分摊规则：谁说「别先走」谁今晚请。靠过来一点可协商免息。</div>
  <div class="tip-bar">确认后将推送收款码 · 24 小时内未付将记「没事」一次</div>
  <div class="foot-meta">账本同步：合租群 · 导出 Excel 可用</div>
</div>`),

  '28': () => s(`
<div class="vet">
  <div class="vet-h">宠物医院病历卡 · 复诊</div>
  <div class="vet-pet">名：豆豆 · 品种：英短 · 今日复诊 · 监护人：你 / 临时：祁洵</div>
  <div class="stats-strip soft" style="margin:8px 0">
    <span>体重正常</span><span>疫苗齐</span><span>雷声敏感</span>
  </div>
  <div class="vet-row"><span>体温</span><span>正常 · 38.4℃</span></div>
  <div class="vet-row"><span>精神</span><span>尚可 · 对雷声敏感</span></div>
  <div class="vet-row"><span>食欲</span><span>偏好关东煮气味（勿喂）</span></div>
  <div class="vet-row"><span>睡眠</span><span>雨夜惊醒 2 次</span></div>
  <div class="vet-row"><span>社交</span><span>对「靠过来一点」有反应</span></div>
  <div class="vet-row"><span>环境</span><span>灯坏了会躲进伞堆</span></div>
  <div class="vet-advice">医嘱：主人近期冷战，建议增加陪同抚摸时长。动物比人先和好。复诊提示：若再听到「别先走」而门长时间半开，请检查门锁与情绪。</div>
  <div class="related">
    <div class="rel-i">下次预约：两周后 · 可与雨夜散步绑定</div>
    <div class="rel-i">费用：¥168 · 已付 · 发票抬头个人</div>
  </div>
  <div class="foot-meta">病历号 PET-8821 · 仅供剧情戏仿</div>
</div>`),

  '29': () => s(`
<div class="phone" style="background:#eef2f0;color:#243028">
  <div class="ph-bar">导航 · 纪念园 · 已到达</div>
  <div class="stats-strip soft">
    <span>步行 0m</span><span>雨 小</span><span>停留 12 分</span>
  </div>
  <div class="map light" style="height:120px;display:flex;align-items:flex-end;justify-content:center;padding:12px">
    <div style="text-align:center"><div style="font-size:28px">❦</div><div style="font-size:12px">已到达 · 碑前 · 伞可共</div></div>
  </div>
  <div class="wall">
    <div><b>留言 01</b> · 伞还在，人会来。</div>
    <div><b>留言 02</b> · 今年花换了白的。</div>
    <div><b>留言 03</b> · 别先走——写给还在路上的人。</div>
    <div><b>留言 04</b> · 便利店的关东煮热了，回来吃。</div>
    <div><b>留言 05</b> · 灯坏了也看得见字。</div>
    <div><b>留言 06</b> · 祁洵到了。靠过来一点。</div>
    <div><b>留言 07</b> · 雨小了，我们走吧——一起。</div>
  </div>
  <div class="tip-bar">导航结束语：目的地不只是坐标，也是愿意等的人。</div>
  <div class="foot-meta">离线地图已缓存 · 回程建议共伞模式</div>
</div>`),

  '30': () => s(`
<div class="capsule">
  <div class="cap-time"><div><div class="m">埋下</div><b>2024.09.04</b></div><div><div class="m">开启</div><b class="gold">今天</b></div></div>
  <div class="stats-strip soft" style="margin-bottom:10px">
    <span>密封 365 天</span><span>地点：便利店旁</span>
  </div>
  <div class="cap-body">
    <div class="m">写给一年后的你们 · 署名：祁洵 & 你</div>
    <p style="line-height:1.8">如果伞还在，就再往中间挪一寸。关东煮默认两份。灯坏了也可以站一会儿。若有人说「没事」，请追问一次。若要走，请先听见「别先走」。靠过来一点——这句话一年过期。</p>
    <p style="line-height:1.8;margin-top:8px">附：票根两张、积分卡一张、被雨洇开的便签复印件。打开时若仍在下雨，请就地共伞读完。</p>
  </div>
  <div class="related">
    <div class="rel-i">解封校验：口令「8821」或指纹任一</div>
    <div class="rel-i">后续：可再埋下一封 · 周期自选</div>
  </div>
  <button class="b">已解封</button>
  <div class="foot-meta">胶囊编号 TC-8821 · 剧情道具 · 无实物快递</div>
</div>`),

  '31': () => s(`
<div class="bug">
  <div class="bug-h"><span class="sev">P1</span> Issue #AFF-8821</div>
  <div class="bug-t">好感度在共伞后未按预期上涨</div>
  <div class="stats-strip dark" style="margin:8px 0">
    <span>Assignee: 你</span><span>Sprint: 雨夜</span><span>Watchers: 3</span>
  </div>
  <div class="bug-sec"><b>复现步骤</b><ol>
    <li>雨夜共伞，路径：便利店 → 灯坏了路口</li>
    <li>点两份关东煮（订单 A/B 同址）</li>
    <li>说「没事」并已读</li>
    <li>对方已读不回超过 6 分</li>
    <li>补说「靠过来一点」——仍无回调</li>
    <li>再说「别先走」——好感度抖动 ±1</li>
  </ol></div>
  <div class="bug-grid"><div><div class="m">期望</div>心动+30</div><div><div class="m">实际</div>沉默+1</div></div>
  <div class="bug-sec"><b>环境</b><div class="m" style="margin-top:4px">OS：雨 · 设备：折叠伞 · 网络：弱 · 灯：坏</div></div>
  <div class="bug-sec"><b>评论</b>
    <div class="m" style="margin-top:6px">@祁洵：这不是 bug，是 feature。</div>
    <div class="m">@QA：建议加断言「共伞半径内必须有一句真话」。</div>
  </div>
  <div class="bug-st">状态：Open → Investigating · 优先级不可降</div>
</div>`),

  '32': () => s(`
<div class="changelog">
  <div class="ver">v2.3.1</div>
  <div class="m">关系版本 · 2025.09.04 · 构建号 8821</div>
  <div class="stats-strip dark" style="margin:8px 0">
    <span>Added 5</span><span>Fixed 4</span><span>Breaking 2</span>
  </div>
  <div class="cl-h">Added</div>
  <ul>
    <li>共伞半径同步 · 含「靠过来一点」手势</li>
    <li>关东煮双人套默认勾选</li>
    <li>灯坏了模式：夜间 UI 降亮</li>
    <li>便利店集合点收藏</li>
    <li>雨声环境音可选</li>
  </ul>
  <div class="cl-h">Fixed</div>
  <ul>
    <li>「没事」语义歧义 · 增加二次确认</li>
    <li>已读不回计时器漂移</li>
    <li>共享相册冲突合并崩溃</li>
    <li>门锁湿指纹误拒</li>
  </ul>
  <div class="cl-h break">Breaking Changes</div>
  <ul>
    <li>撤回「先走」默认策略 · API 改名 leave → stay</li>
    <li>冷静期协议强制电子签</li>
  </ul>
  <div class="m" style="margin-top:12px;line-height:1.7">升级备注：由祁洵触发的热更新将在共伞时静默安装。若拒绝「别先走」补丁，将回滚至 v2.2.0（更孤独）。</div>
</div>`),

  '33': () => s(`
<div class="phone" style="background:#f7f4ee">
  <div class="ph-bar">成就墙 · 12/15 · 隐藏 1</div>
  <div class="stats-strip soft">
    <span>完成度 80%</span><span>本周 +2</span><span>雨夜加成</span>
  </div>
  <div class="ach">${['雨','伞','灯','煮','读','?','站','留','夜','讯','柜','门'].map((t)=>`<div class="ach-i ${t==='?'?'q':''}">${t}</div>`).join('')}</div>
  <div class="list-dense">
    <div class="li"><b>雨</b><span>完成 · 首次共淋</span></div>
    <div class="li"><b>伞</b><span>完成 · 往中间挪≥3 次</span></div>
    <div class="li"><b>灯</b><span>完成 · 灯坏了仍停留</span></div>
    <div class="li"><b>煮</b><span>完成 · 关东煮双份</span></div>
    <div class="li"><b>读</b><span>完成 · 已读并回复非「没事」</span></div>
    <div class="li hot-li"><b>？</b><span>隐藏 · 条件半遮</span></div>
    <div class="li"><b>站 / 留 / 夜</b><span>完成 · 路口三联</span></div>
    <div class="li"><b>讯 / 柜 / 门</b><span>完成 · 取件与归家</span></div>
  </div>
  <div class="panel"><div class="m">隐藏成就条件（半遮）</div><div style="margin-top:4px">在灯坏的路口……████ 不先走；口令含「靠过来一点」与祁洵同时在场。</div></div>
  <div class="foot-meta">成就同步至相册封面 · 可分享不可作假</div>
</div>`),

  '34': () => s(`
<div class="phone dark-ui" style="background:#1e2438;color:#e8e4f0">
  <div class="ph-bar">技能栏 · 雨夜副本</div>
  <div class="stats-strip dark">
    <span>蓝量 62%</span><span>连携就绪</span><span>CD 同步</span>
  </div>
  <div class="skills">
    ${[['告白','CD 4:12','高耗蓝'],['抱抱','就绪','近战'],['共伞','CD 0:48','防御'],['点两份','就绪','补给'],['靠过来','就绪','位移'],['别先走','CD 1:02','控制'],['修灯','CD 9:99','环境'],['没事','禁用','易暴击失败']].map(([n,c,t],i)=>`<div class="sk ${i===1||i===3||i===4?'ready':i===7?'dim':''}"><div class="sk-icon">${n[0]}</div><b>${n}</b><div class="m">${c}</div><div class="m">${t}</div></div>`).join('')}
  </div>
  <div class="panel" style="background:#2a3458">释放预览：靠过来一点 → 共伞 → 点两份。连招名：便利店灯下。目标：祁洵（友好）。</div>
  <div class="tip-bar dark">提示：在「灯坏了」地形中，别先走的控制时长 +20%</div>
  <div class="foot-meta dark">角色等级 16 · 称号：未发送草稿最多的人</div>
</div>`),

  '35': () => s(`
<div class="phone dark-ui" style="background:#141820;color:#e8eef4">
  <div class="ph-bar">读取存档 · 多周目</div>
  <div class="stats-strip dark">
    <span>槽位 6</span><span>自动 开</span><span>云同步</span>
  </div>
  ${[
    ['自动','雨夜灯下 · 尚未开口','23:41 · 2.1MB'],
    ['槽位 A','如果说了靠过来一点','22:10 · 1.8MB'],
    ['槽位 B','如果说了「没事」','21:02 · 1.9MB'],
    ['槽位 C','如果先走了','20:40 · 坏档？'],
    ['槽位 D','关东煮两份都收下','19:55 · 1.6MB'],
    ['槽位 E','灯坏了仍等待结局','18:12 · 2.0MB'],
    ['槽位 F','便利店外祁洵线','上周 · 只读'],
  ].map((x,i)=>`<div class="save ${i===0?'on':''}"><div class="m">${x[0]} · ${x[2]}</div><b>${x[1]}</b></div>`).join('')}
  <div class="tip-bar dark">警告：读取槽位 C 可能导致「别先走」成就锁定</div>
  <div class="foot-meta dark">上次游玩：祁洵线 · 好度 67%</div>
</div>`),

  '36': () => s(`
<div class="phone" style="background:#1a2030;color:#e8eef4">
  <div class="ph-bar">房间投票 · 踢人 · 房号 8821</div>
  <div class="stats-strip dark">
    <span>在线 10</span><span>已投 10</span><span>你未投</span>
  </div>
  <div class="vote-target">对象：总是说没事的人</div>
  <div class="vote-reason">理由：雨夜不先走，耽误大家刷副本；便利店灯下挂机；关东煮双开占背包。</div>
  <div class="vote-bars">
    <div><span>同意踢 6</span><div class="bar"><i style="width:60%"></i></div></div>
    <div><span>拒绝踢 4</span><div class="bar"><i style="width:40%;background:#8eb8e5"></i></div></div>
  </div>
  <div class="list-dense dark">
    <div class="li"><b>同意</b><span>输出位×2 · 坦克 · 治疗 · 路人×2</span></div>
    <div class="li"><b>拒绝</b><span>祁洵 · 你的号 · 观测者 · 灯神</span></div>
    <div class="li"><b>弃权</b><span>无</span></div>
    <div class="li"><b>附加动议</b><span>改投「靠过来一点」惩罚</span></div>
    <div class="li"><b>地图</b><span>雨夜便利店 · Hard</span></div>
    <div class="li"><b>备注</b><span>别先走党正在拉票</span></div>
  </div>
  <div class="m" style="padding:12px">倒计时 00:18 · 你的一票尚未投出 · 弃权视为站在伞下</div>
  <div class="foot-meta dark">投票记录可回放 · 踢出后仍可共伞私聊</div>
</div>`),

  '37': () => s(`
<div class="phone dark-ui" style="background:#10141c;color:#e8e4f0;text-align:center;padding:20px">
  <div class="spin"></div>
  <div style="margin-top:12px;font-weight:700">匹配中…</div>
  <div class="m">预计等待 12 秒 · 延迟 38ms · 雨区服务器</div>
  <div class="stats-strip dark" style="margin:12px 0;justify-content:center">
    <span>队列 128</span><span>跨区 关</span>
  </div>
  <div class="tags-cloud">
    <span>日常本</span><span class="hot">修罗场本</span><span>共伞本</span><span>前任本</span>
    <span>关东煮本</span><span>灯坏了本</span><span>别先走本</span><span>便利店本</span>
  </div>
  <div class="list-dense dark" style="text-align:left">
    <div class="li"><b>匹配偏好</b><span>祁洵标签优先</span></div>
    <div class="li"><b>禁用图</b><span>晴天公园（太亮）</span></div>
    <div class="li"><b>语音</b><span>开 · 安全词就绪</span></div>
    <div class="li"><b>难度</b><span>Hard · 可降</span></div>
    <div class="li"><b>队友</b><span>随机或指定</span></div>
    <div class="li"><b>惩罚</b><span>逃跑 = 请关东煮</span></div>
  </div>
  <div class="reveal">揭晓：<b>雨夜便利店 · 难度 Hard</b><br><span class="m">目标：让「靠过来一点」被听见</span></div>
  <div class="foot-meta dark">匹配号 M-8821 · 可取消至进入加载</div>
</div>`),

  '38': () => s(`
<div class="phone dark-ui" style="background:#16121c;color:#f0e6f2">
  <div class="ph-bar">本场结算 · DEFEAT? · 可申诉</div>
  <div class="stats-strip dark">
    <span>时长 26:12</span><span>输出 低</span><span>承伤 高</span>
  </div>
  ${[['嘴伤','42%'],['冷暴力','28%'],['糖分','18%'],['沉默','12%'],['共伞减伤','-8%'],['关东煮回复','+6%']].map(([n,w])=>`<div class="dmg"><span>${n}</span><div class="bar"><i style="width:${String(w).replace('-','').replace('+','')}"></i></div><span>${w}</span></div>`).join('')}
  <div class="list-dense dark">
    <div class="li"><b>击杀</b><span>0 · 未说出口的话×3</span></div>
    <div class="li"><b>助攻</b><span>灯坏了环境击杀×1</span></div>
    <div class="li"><b>死亡</b><span>「没事」被反弹</span></div>
    <div class="li"><b>MVP</b><span>关东煮 ×2</span></div>
    <div class="li"><b>背锅</b><span>那句没事</span></div>
    <div class="li"><b>翻盘点</b><span>若说出别先走</span></div>
  </div>
  <div class="panel" style="background:#1e1828">评价：靠过来一点完成度 B-。祁洵伤害统计显示其「等待」技能全场最高。再开一局？</div>
  <div class="foot-meta dark">录像已保存 7 天 · 可剪辑共伞高光</div>
</div>`),

  '39': () => s(`
<div class="phone nsfw-ui">
  <div class="ph-bar">夜色商城 · 购物车 · 匿名配送</div>
  <div class="stats-strip dark">
    <span>已选 8</span><span>凑单差 ¥12</span><span>包邮盒</span>
  </div>
  ${[
    ['超薄系列 · 盒装','¥68','评分 4.8 · 「包装严」'],
    ['润滑·温感','¥45','雨夜适用备注'],
    ['盲盒配件','¥99','内含「靠过来一点」卡'],
    ['氛围烛光灯','¥32','备用：灯坏了'],
    ['眼罩·轻压','¥56','助眠兼氛围'],
    ['护理湿巾·大包','¥28','事后清单关联'],
    ['香薰·木质','¥72','便利店无同款'],
    ['收纳袋·匿名','¥18','快递单无品名'],
  ].map(([n,p,m])=>`<div class="cart"><label><input type="checkbox" checked> <span><b>${n}</b><div class="m">${m}</div></span></label><span>${p}</span></div>`).join('')}
  <div class="warn">凑单还差 ¥12 · 解锁匿名包邮盒 · 建议加购关东煮味口罩（戏仿）</div>
  <div class="cmt m">评价 A：包装很严实，快递小哥什么都不知道。</div>
  <div class="cmt m">评价 B：说明书写着别先走——我笑了。</div>
  <div class="cmt m">评价 C：和祁洵分摊后单件更香。</div>
  <div style="padding:12px"><button class="b pink">结算 ¥418</button></div>
  <div class="foot-meta dark">收货：门禁柜 B07 · 勿放伞架旁防潮</div>
</div>`),

  '40': () => s(`
<div class="phone nsfw-ui">
  <div class="ph-bar">图鉴 · 已解锁 11/24 · 新亮 1</div>
  <div class="stats-strip dark">
    <span>收集率 46%</span><span>本周 +3</span><span>隐藏 2</span>
  </div>
  <div class="grid4">${Array.from({length:16},(_,i)=>`<div class="cell ${i<11?'on':''} ${i===10?'new':''}">${i<11?['A','B','C','D','E','F','G','H','I','J','K'][i]:'···'}</div>`).join('')}</div>
  <div class="list-dense dark">
    <div class="li"><b>A–F</b><span>基础姿态 · 已录入</span></div>
    <div class="li hot-li"><b>G · 新</b><span>「靠过来一点」· 雨夜</span></div>
    <div class="li"><b>H</b><span>共伞半径内耳语</span></div>
    <div class="li"><b>I</b><span>灯坏了摸黑确认</span></div>
    <div class="li"><b>J</b><span>关东煮后放松态</span></div>
    <div class="li"><b>K</b><span>别先走挽留成功</span></div>
    <div class="li"><b>L–X</b><span>未解锁 · 条件与祁洵相关</span></div>
    <div class="li"><b>隐藏</b><span>需连续两夜便利店线</span></div>
  </div>
  <div class="panel">本轮新亮：G · 「靠过来一点」· 录入时间 23:44 · 可设为封面</div>
  <div class="foot-meta dark">图鉴云端加密 · 密码与私密相册同步</div>
</div>`),

  '41': () => s(`
<div class="phone nsfw-ui">
  <div class="ph-bar">事后清理清单 · 今日 · 雨夜场</div>
  <div class="stats-strip dark">
    <span>完成 6/10</span><span>跳过 0</span><span>待办 4</span>
  </div>
  ${[
    ['更换床品','23:50','已完成'],
    ['洗澡','00:05','已完成'],
    ['水杯加水','00:08','已完成'],
    ['安全套处理','00:10','已完成'],
    ['窗开通风','00:12','已完成'],
    ['湿巾与垃圾分类','00:15','已完成'],
    ['检查门锁','—','待做 · 灯坏了玄关'],
    ['伞沥干挂回','—','待做'],
    ['关东煮空盒丢掉','—','待做'],
    ['……（自定义）','—','光标闪烁'],
  ].map((row,i)=>`<label class="todo ${i<6?'done':''}"><input type="checkbox" ${i<6?'checked':''}> <span><b>${row[0]}</b><div class="m">${row[1]} · ${row[2]}</div></span></label>`).join('')}
  <div class="cmt m">备注：祁洵负责第 7 项；你负责「别先走」情绪复盘。</div>
  <div class="cmt m">靠过来一点喝水，别空肚睡。</div>
  <div class="m" style="padding:8px 12px">最后一项留白 · 可写给明天的自己</div>
  <div class="foot-meta dark">清单模板可保存 · 下次雨夜自动带出</div>
</div>`),

  '42': () => s(`
<div class="phone nsfw-ui" style="text-align:center">
  <div class="ph-bar">安全词仪表盘 · 会话 #8821</div>
  <div class="stats-strip dark" style="justify-content:center">
    <span>黄 1</span><span>红 1</span><span>已恢复</span>
  </div>
  <div class="gauge"><div class="g-y">黄</div><div class="g-r on">红</div></div>
  <div style="font-size:22px;font-weight:800;margin:8px">当前：红 · 已停止</div>
  <div class="m">立即停止 · 已记录 · 双方确认中</div>
  <div class="log">
    23:41 黄→试探 · 关键词「慢一点」<br>
    23:42 继续 · 共伞式靠近<br>
    23:44 红→停止 · 安全词触发<br>
    23:45 双方确认呼吸 · 水已递到<br>
    23:46 灯坏了 · 改用手电确认表情<br>
    23:48 状态回黄 · 仅拥抱<br>
    23:50 口头确认：靠过来一点可以 · 别先走<br>
    00:02 记录封存 · 可导出给信任人
  </div>
  <div class="panel" style="text-align:left">协议：红灯后 20 分钟内禁止重启高强度；关东煮与水分必须到场；祁洵为本次安全官。</div>
  <div class="foot-meta dark">仪表盘本地加密 · 云端默认关</div>
</div>`),

  '43': () => s(`
<div class="phone nsfw-ui">
  <div class="ph-bar">设备固件 · Nova Link</div>
  <div class="dev">Nova Link · <span class="pink">已配对</span></div>
  <div class="stats-strip dark">
    <span>电量 81%</span><span>信号稳</span><span>双人同步</span>
  </div>
  <div class="m" style="padding:0 12px">当前 2.3.0 → 最新 2.4.1 · 包大小 14MB</div>
  <ul class="cl">
    <li>优化「靠近」响应曲线 · 映射口令靠过来一点</li>
    <li>修复误触断开 · 雨手模式</li>
    <li>新增双人同步模式 · 与祁洵设备</li>
    <li>灯坏了环境：自动降亮指示灯</li>
    <li>安全词红灯硬中断延迟 &lt; 80ms</li>
    <li>修复关东煮蒸汽导致的湿度误报</li>
    <li>别先走场景：会话保持不断连</li>
  </ul>
  <div class="prog"><i style="width:100%"></i></div>
  <div class="m" style="padding:8px 12px">更新完成 · 连接稳定 · 校准：便利店 Wi-Fi 下已测</div>
  <div class="cmt m">更新日志注释：本固件不含「没事」自动回复。</div>
  <div class="foot-meta dark">序列号已脱敏 · 保修至明年雨季</div>
</div>`),

  '44': () => s(`
<div class="ticket nsfw-ticket">
  <div class="ticket-h">HOTEL · 迷你吧消费</div>
  <div class="ticket-no" style="opacity:.8">房 1208 · 账单 MB-8821</div>
  <div class="stats-strip dark" style="margin:8px 0">
    <span>条目 7</span><span>夜审未结</span><span>可签认</span>
  </div>
  <div class="ticket-row"><span>房号</span><span>1208</span></div>
  <div class="ticket-row"><span>住客</span><span>祁洵 / +1</span></div>
  <div class="ticket-row"><span>23:12</span><span>气泡水 ×2</span></div>
  <div class="ticket-row"><span>23:40</span><span>巧克力</span></div>
  <div class="ticket-row"><span>00:02</span><span>毛巾加收 ×2</span></div>
  <div class="ticket-row"><span>00:10</span><span>香薰补充</span></div>
  <div class="ticket-row hi"><span>00:15</span><span>房内服务 · 备注私密</span></div>
  <div class="ticket-row"><span>00:40</span><span>雨伞烘干（借物）</span></div>
  <div class="ticket-row big"><span>合计</span><span>¥186</span></div>
  <div class="m" style="line-height:1.7;margin-top:8px">脚注：00:15 服务单仅打印「遵客嘱」。灯坏了已报修。迷你吧不含关东煮，已外送。请于退房前签字；「别先走」不延期账单。</div>
  <div class="sign">客人签 ________ · 日期 9/4</div>
  <div class="foot-meta dark">此联交前台 · 底联入夜审</div>
</div>`),

  '45': () => s(`
<div class="phone nsfw-ui">
  <div class="ph-bar">试穿反馈卡 · 会话存档</div>
  <div class="stats-strip dark">
    <span>尺码 4.5</span><span>触感 5.0</span><span>羞耻 3.8</span>
  </div>
  <div class="fit-visual"></div>
  <div class="score"><span>尺码 4.5</span><span>触感 5.0</span><span>羞耻 3.8</span><span>稳定 4.2</span></div>
  <div class="list-dense dark">
    <div class="li"><b>款式</b><span>夜色系列 · 黑</span></div>
    <div class="li"><b>场景</b><span>雨夜 · 房内灯调暗</span></div>
    <div class="li"><b>搭档</b><span>祁洵 · 安全词已设</span></div>
    <div class="li"><b>建议</b><span>再紧一点需黄灯确认</span></div>
    <div class="li"><b>禁忌</b><span>勿在灯坏了时强行调整</span></div>
    <div class="li"><b>售后</b><span>可换码 · 隐私退货</span></div>
  </div>
  <div class="bub-me">我觉得……还可以再紧一点。靠过来一点帮我看看。</div>
  <div class="bub-ta">TA：那就别急着脱。别先走，呼吸跟上。</div>
  <div class="bub-me">……好。关东煮味的空气清新剂是你喷的吗。</div>
  <div class="bub-ta">TA：是便利店袋没扔。笑一下。</div>
  <div class="foot-meta dark">反馈已匿名化可上传商城 · 默认仅本地</div>
</div>`),

  '46': () => s(`
<div class="phone nsfw-ui" style="text-align:center">
  <div class="ph-bar">私密相册 · 已解锁</div>
  <div class="lock">✱ ✱ ✱ ✱</div>
  <div class="m">密码正确 · 失败 0 · 生物识别备用</div>
  <div class="stats-strip dark" style="justify-content:center">
    <span>9 张</span><span>仅你可见</span><span>云关</span>
  </div>
  <div class="grid3">${Array.from({length:9},(_,i)=>`<div class="thumb nsfw-t" title="${i}"></div>`).join('')}</div>
  <div class="list-dense dark" style="text-align:left">
    <div class="li"><b>01–03</b><span>雨夜轮廓 · 无脸</span></div>
    <div class="li"><b>04</b><span>共伞剪影 · 灯坏了噪点</span></div>
    <div class="li"><b>05</b><span>便利店袋 · 关东煮蒸汽</span></div>
    <div class="li"><b>06</b><span>便签：别先走</span></div>
    <div class="li"><b>07</b><span>靠过来一点 · 手部特写</span></div>
    <div class="li"><b>08–09</b><span>祁洵可见权限：关</span></div>
  </div>
  <div class="m" style="padding:8px">点开一格：雨夜 · 仅你可见 · 长按可粉碎删除</div>
  <div class="foot-meta dark">相册密钥与门锁访客码不同 · 请勿写在同一便签</div>
</div>`),

  '47': () => s(`
<div class="phone nsfw-ui" style="text-align:center">
  <div class="ph-bar">RP 剧本抽卡 · 本场</div>
  <div class="stats-strip dark" style="justify-content:center">
    <span>稀有度 SR</span><span>时长 45 分</span><span>安全词开</span>
  </div>
  <div class="tarot">雨夜便利店</div>
  <div class="panel" style="text-align:left">
    <div class="m">规则</div>
    <div style="line-height:1.8;margin-top:6px">
      1. 称呼用职务名或化名「阿洵」<br>
      2. 安全词优先于一切剧情<br>
      3. 灯坏了也不许先走<br>
      4. 关东煮可作为道具与休止符<br>
      5. 「靠过来一点」为许可口令<br>
      6. 「没事」触发黄灯复盘<br>
      7. 结束必须口头确认状态
    </div>
  </div>
  <div class="list-dense dark" style="text-align:left">
    <div class="li"><b>场景</b><span>便利店外 → 共伞 → 室内</span></div>
    <div class="li"><b>角色</b><span>你 / 祁洵</span></div>
    <div class="li"><b>难度</b><span>Hard · 可中途降</span></div>
    <div class="li"><b>禁止</b><span>真实冷暴力演出</span></div>
    <div class="li"><b>奖励</b><span>图鉴 G 进度</span></div>
    <div class="li"><b>失败</b><span>请对方关东煮×2</span></div>
  </div>
  <div class="foot-meta dark">卡背编号 RP-8821 · 可收藏不可转卖</div>
</div>`),

  '48': () => s(`
<div class="phone nsfw-ui" style="text-align:center">
  <div class="ph-bar">边缘控制 · 计时 · 会话中</div>
  <div class="stats-strip dark" style="justify-content:center">
    <span>轮次 3</span><span>暂停 1</span><span>红灯 0</span>
  </div>
  <div class="timer-ring">12:48</div>
  <div style="display:flex;gap:8px;justify-content:center;margin:12px"><button class="b">暂停</button><button class="b pink">继续</button><button class="b">结束</button></div>
  <div class="list-dense dark" style="text-align:left">
    <div class="li"><b>目标</b><span>呼吸平稳 · 不抢跑</span></div>
    <div class="li"><b>口令</b><span>靠过来一点 = 允许靠近</span></div>
    <div class="li"><b>停止</b><span>安全词 / 红灯</span></div>
    <div class="li"><b>场景音</b><span>雨 · 可关</span></div>
    <div class="li"><b>照明</b><span>灯坏了备用手电</span></div>
    <div class="li"><b>补给</b><span>水 · 关东煮味糖？否</span></div>
  </div>
  <div class="panel">结算预览：呼吸平稳 · 评价「靠过来一点」完成度 A · 「别先走」未滥用。祁洵操作分 4.7。</div>
  <div class="cmt m">备注：计时不含便利店排队那 4 分。</div>
  <div class="foot-meta dark">历史最佳 18:02 · 本机记录</div>
</div>`),

  '49': () => s(`
<div class="phone nsfw-ui">
  <div class="ph-bar">敏感点热力图 · 采样夜</div>
  <div class="stats-strip dark">
    <span>热点 4</span><span>置信 高</span><span>可导出</span>
  </div>
  <div class="heat">
    <div class="hz" style="top:18%;left:42%">耳</div>
    <div class="hz hot" style="top:48%;left:50%">颈</div>
    <div class="hz" style="top:62%;left:30%">腕</div>
    <div class="hz" style="top:72%;left:58%">肩</div>
  </div>
  <div class="list-dense dark">
    <div class="li"><b>耳</b><span>中 · 雨声背景下更明显</span></div>
    <div class="li hot-li"><b>颈</b><span>高 · 叫名字时 · 祁洵备注</span></div>
    <div class="li"><b>腕</b><span>中 · 共伞拉手时</span></div>
    <div class="li"><b>肩</b><span>低–中 · 靠过来一点触发</span></div>
    <div class="li"><b>回避</b><span>灯突然亮起时全身紧张</span></div>
    <div class="li"><b>安抚</b><span>别先走 + 稳定呼吸</span></div>
    <div class="li"><b>采样</b><span>便利店归来后 40 分内</span></div>
    <div class="li"><b>免责</b><span>剧情热力 · 非医疗设备</span></div>
  </div>
  <div class="panel">颈 · 备注：叫名字时更明显；关东煮后敏感度短暂下降。建议下次在灯坏了环境下复测对比。</div>
  <div class="foot-meta dark">图层已加密 · 分享需二次密码</div>
</div>`),

  '50': () => s(`
<div class="phone" style="background:#ededed">
  <div class="wx-h">祁洵 · 清晨 07:12</div>
  <div class="stats-strip soft">
    <span>已读</span><span>语音 1</span><span>更正 1</span>
  </div>
  <div class="wx-msg l"><div class="bub">早。伞还在门口。</div><div class="m">07:12 · 已读</div></div>
  <div class="wx-msg r"><div class="bub g">你怎么起这么早</div><div class="m">07:18 · 已读 ← 晚 6 分</div></div>
  <div class="wx-msg l"><div class="bub">雨停了一点。灯还没修。</div><div class="m">07:19</div></div>
  <div class="wx-msg r"><div class="bub g">那你别先走，我下来。</div><div class="m">07:20</div></div>
  <div class="wx-msg l"><div class="bub">靠过来一点——楼梯口滑。</div><div class="m">07:21</div></div>
  <div class="wx-msg l"><div class="bub">🎙 0:06<br><s>想吃广东煮</s></div><div class="m">07:22 · 语音转文字已更正</div></div>
  <div class="wx-msg r"><div class="bub g">收到。便利店见。两份。</div><div class="m">07:23</div></div>
  <div class="wx-msg l"><div class="bub">嗯。昨晚……谢谢你没先走。</div><div class="m">07:24 · 已读</div></div>
  <div class="fix">正解：关东煮 · 两份 · 少辣 · 伞我带着</div>
  <div class="tip-bar">会话置顶中 · 草稿箱仍有 8 条未发送（见样卡 01）</div>
  <div class="foot-meta">信号良好 · 电池 64% · 天气：小雨转阴</div>
</div>`),
}

function radar() {
  return `<polygon points="100,20 160,55 140,120 60,120 40,55" fill="rgba(201,162,75,.25)" stroke="#c9a24b" stroke-width="2"/>
  <text x="100" y="14" text-anchor="middle" font-size="9" fill="#8a7a60">外貌</text>
  <text x="175" y="55" font-size="9" fill="#8a7a60">谈吐</text>
  <text x="150" y="135" font-size="9" fill="#c45c2c">表达欲</text>
  <text x="40" y="135" font-size="9" fill="#8a7a60">稳定</text>
  <text x="8" y="55" font-size="9" fill="#8a7a60">共情</text>`
}

export const EXTRA_CSS = `
.phone{max-width:380px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,.14)}
.ph-status,.ph-bar,.wx-h{padding:10px 14px;font-size:13px;font-weight:650;border-bottom:1px solid rgba(0,0,0,.06)}
.dark-ui .ph-bar,.nsfw-ui .ph-bar{border-bottom-color:rgba(255,255,255,.08)}
.m{font-size:11px;opacity:.65}
.badge-red{background:#e85d2c;color:#fff;border-radius:99px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.draft{margin:0 12px 8px;padding:10px;border-radius:10px;background:#fff;border:1px solid #e8e0d4}
.draft.open{background:#fff8e8;border-color:#c9a24b}
.draft-top{display:flex;justify-content:space-between;font-size:12px}
.draft-prev{font-size:12px;margin-top:4px;color:#6a6056}
.draft-body{margin-top:8px;padding-top:8px;border-top:1px dashed #e0d4c0;font-size:13px;line-height:1.7}
.draft-meta{margin-top:6px;font-size:10px;opacity:.55}
.dot-r{display:inline-block;width:7px;height:7px;border-radius:50%;background:#e85d2c;margin-left:4px}
.b{border:0;border-radius:10px;padding:8px 14px;background:#efe6d8;font-size:12px;cursor:default}
.b.dis{opacity:.4;text-decoration:line-through}
.b.tiny{padding:2px 8px;font-size:10px}
.b.pink{background:#e8a0bf;color:#2a1520}
.split2{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px}
.col-h{font-size:11px;font-weight:700;padding:6px;border-radius:6px;margin-bottom:6px}
.col-h.del{background:#f0e0d4;color:#8a5040}
.col-h.keep{background:#e0f0e8;color:#2d6b57}
.thumb{height:52px;border-radius:6px;margin-bottom:6px;background:#ddd}
.thumb.gone{opacity:.35;background:repeating-linear-gradient(45deg,#ccc,#ccc 4px,#eee 4px,#eee 8px)}
.warn,.note,.fix{margin:8px 12px;padding:8px 10px;border-radius:8px;background:#fff3e0;font-size:12px;color:#8a6b28}
.fix{background:#e8f5e0;color:#2d6b37}
.panel{margin:10px 12px;padding:10px;border-radius:10px;background:rgba(0,0,0,.04);font-size:12px}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}
.key{background:#243040;border-radius:10px;padding:14px 0;text-align:center;font-size:14px}
.prog{height:8px;border-radius:99px;background:rgba(0,0,0,.08);overflow:hidden;margin-top:12px}
.prog>i{display:block;height:100%;background:#2d6b57}
.timeline{padding:8px 14px}
.tl{display:grid;grid-template-columns:52px 1fr;gap:8px;padding:8px 0;border-left:2px solid #3a4a5c;padding-left:12px;margin-left:8px;font-size:12px}
.tl.hot{border-left-color:#c9a24b}
.tl.fail{border-left-color:#e85d2c}
.ticket,.doc,.form,.will,.poster,.bug,.changelog,.vet,.capsule,.safe{max-width:380px;margin:0 auto;padding:16px;border-radius:12px;background:#faf3e4;box-shadow:0 10px 28px rgba(0,0,0,.1);font-size:13px}
.ticket-h,.doc-h,.form-h,.will-h,.poster-h,.bug-h,.vet-h{font-weight:800;letter-spacing:.08em;margin-bottom:8px}
.ticket-no{font-size:11px;opacity:.65;margin-bottom:6px;font-family:ui-monospace,Consolas,monospace}
.ticket-row,.form-row,.vet-row,.bill,.cart,.dmg{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed rgba(0,0,0,.08);gap:8px;align-items:flex-start}
.ticket-row.big{font-size:18px;font-weight:800;border-bottom:0;margin-top:8px}
.ticket-row.hi{background:rgba(232,160,191,.12);margin:0 -4px;padding:8px;border-radius:6px}
.gold{color:#8a6b28}
.dash{border-top:1px dashed #c4b8a0;margin:10px 0}
.map{position:relative;height:150px;background:#243040;margin:8px}
.map.light{background:linear-gradient(160deg,#d8e4f0,#c4d4e0)}
.map-tag{position:absolute;font-size:10px;background:rgba(0,0,0,.45);color:#fff;padding:2px 6px;border-radius:4px}
.map-tag.l{left:8px;bottom:8px}.map-tag.r{right:8px;top:8px}.map-tag.m{left:40%;top:40%}
.allergen{display:flex;justify-content:space-between;padding:8px 10px;background:#fff;border-radius:8px;margin-bottom:6px;font-size:12px;align-items:center;gap:8px}
.allergen.bad{background:#fff0e8;outline:1px solid #e8a090}
.order{margin:8px 12px;padding:10px;border-radius:10px;background:#fff;border:1px solid #f0e0d4;font-size:13px}
.order.twin{border-color:#e8a0bf}
.rider{position:absolute;left:55%;top:40%;background:#e85d2c;color:#fff;font-size:10px;padding:4px 8px;border-radius:99px}
.route-line{position:absolute;left:15%;right:15%;top:50%;height:2px;background:#5a9ad4;opacity:.6}
.hours{display:flex;justify-content:space-between;padding:8px 14px;font-size:10px;opacity:.6}
.rooms{padding:0 12px 12px}
.room{position:relative;height:auto;min-height:36px;background:#efe6d8;border-radius:8px;margin-bottom:8px;padding:8px 10px;font-size:12px}
.room i{position:absolute;top:8px;bottom:8px;background:#c9a24b88;border-radius:4px}
.room.on{outline:2px solid #c9a24b}
.room em{float:right;font-size:10px;color:#c45c2c;font-style:normal}
.room-meta{display:block;font-size:10px;opacity:.6;margin-top:4px;position:relative;z-index:1}
.doc table{width:100%;border-collapse:collapse;font-size:12px}
.doc td{padding:8px;border-bottom:1px solid #e8e0d4}
.doc tr.hi td{background:#fff8e8;font-weight:700}
.doc-note{margin-top:10px;padding:10px;background:#fff;border-radius:8px;line-height:1.6}
.post{margin:12px;padding:12px;background:#fff;border-radius:12px}
.cmt{margin:0 12px 8px;padding:8px 10px;background:#fff;border-radius:8px;font-size:12px;line-height:1.5}
.chip-row{padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:11px;padding:4px 10px;border-radius:99px;background:#eee}
.chip.on{background:#c9a24b33;color:#8a6b28}
.avatar{width:48px;height:48px;border-radius:50%;background:#d8c4a8;display:flex;align-items:center;justify-content:center;font-weight:800}
.seats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}
.seat{aspect-ratio:1;background:#efe6d8;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px}
.seat.me{background:#c9a24b;color:#fff;font-weight:700}
.seat.plus{background:#fff8e8;outline:1px dashed #c9a24b}
.wx-pin{margin:8px 12px;padding:8px;background:#fffbe8;border-radius:6px;font-size:11px;line-height:1.5}
.wx-msg{padding:6px 12px;display:flex;flex-direction:column;font-size:12px}
.wx-msg.l{align-items:flex-start}.wx-msg.r{align-items:flex-end}
.bub{background:#fff;padding:8px 10px;border-radius:10px;max-width:80%;margin-top:2px;line-height:1.5}
.bub.g{background:#95ec69}
.bub.sys{background:#eee;color:#666}
.poster{background:#f0e4d0;border:2px solid #2a1e14;max-width:360px;margin:0 auto;padding:16px}
.poster-body p{margin:8px 0;font-size:13px;line-height:1.6}
.blur{filter:blur(4px);user-select:none}
.lib-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:12px}
.lib{aspect-ratio:1.2;background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;border:1px solid #dde3ea}
.lib.on{background:#c9a24b;color:#fff}
.lib.note{outline:2px dashed #c9a24b}
.slip{margin:0 12px;padding:10px;background:#fff8e8;border-radius:8px;font-size:12px;transform:rotate(-1deg);line-height:1.6}
.screen{text-align:center;padding:8px;margin:8px 24px;background:#333;border-radius:4px;font-size:10px;letter-spacing:.3em}
.cinema{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;padding:8px 16px 16px}
.cs{aspect-ratio:1;background:#3a3a40;border-radius:3px}
.cs.sold{opacity:.3}.cs.pick{background:#c9a24b}.cs.gap{background:transparent;outline:1px dashed #f5e3a8}
.board{max-width:380px;margin:0 auto;background:#0c1018;color:#f5e3a8;padding:16px;border-radius:8px;font-family:ui-monospace,Consolas,monospace}
.board-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2a3040;font-size:13px;gap:12px}
.board-row.blink{animation:blink 1.2s infinite}
@keyframes blink{50%{opacity:.55}}
.form{background:#fff}
.form-row.strike s{color:#999}
.form-row label{opacity:.65;min-width:72px}
.toggle{display:flex;gap:0;margin:12px 0;border:1px solid #ddd;border-radius:8px;overflow:hidden;width:fit-content}
.toggle span{padding:6px 12px;font-size:11px}
.toggle .on{background:#c9a24b;color:#fff}
.sign{margin-top:12px;font-size:12px;opacity:.7}
.safe{text-align:center;background:#2a2420;color:#f5e3a8}
.dial{width:120px;height:120px;margin:0 auto 12px;border-radius:50%;border:6px solid #c9a24b;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800}
.pass{display:flex;gap:8px;justify-content:center;margin-bottom:12px}
.pass i{width:10px;height:10px;border-radius:50%;background:#5a5048}
.pass i.on{background:#c9a24b}
.safe-ok{color:#a8d5ba;margin-bottom:8px}
.safe-list{text-align:left;font-size:12px;line-height:1.8}
.will{background:#faf8f3}
.will ol{padding-left:18px;line-height:1.7}
.will li.hi{background:#fff8e8;padding:6px;border-radius:6px;margin:6px 0}
.queue-screen{margin:12px;padding:20px;text-align:center;background:#1a3048;color:#e8eef4;border-radius:12px}
.checklist{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px}
.checklist div{padding:10px;border-radius:8px;font-size:12px;text-align:center}
.checklist .ok{background:#e0f0e8}.checklist .bad{background:#ffe8e0;outline:1px solid #e85d2c}
.ring{width:80px;height:80px;margin:16px auto;border-radius:50%;border:6px solid #3a3040;border-top-color:#e8a0bf}
.bill{padding:8px 12px}
.bill.bad{background:#fff0e8;margin:0 8px;padding:8px;border-radius:6px}
.vet{background:#f3faf7}
.vet-advice{margin-top:10px;padding:10px;background:#fff;border-radius:8px;font-size:12px;line-height:1.6}
.wall{margin:12px;display:flex;flex-direction:column;gap:8px}
.wall div{background:#fff;padding:10px;border-radius:8px;font-size:12px;line-height:1.5}
.capsule{background:#efe8dc;text-align:center}
.cap-time{display:flex;justify-content:space-around;margin-bottom:12px}
.cap-body{background:#faf3e4;padding:14px;border-radius:10px;text-align:left;margin-bottom:12px}
.bug{background:#1e2230;color:#e8eef4;font-family:ui-monospace,Consolas,monospace;font-size:12px}
.sev{background:#e85d2c;color:#fff;padding:2px 6px;border-radius:4px;margin-right:8px}
.bug-t{font-size:14px;font-weight:700;margin:8px 0}
.bug-sec{margin:10px 0}
.bug-sec ol{padding-left:18px;line-height:1.7}
.bug-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.bug-st{margin-top:8px;opacity:.85}
.changelog{background:#0f1410;color:#c8e0c8;font-family:ui-monospace,Consolas,monospace}
.changelog ul{padding-left:18px;line-height:1.7}
.ver{font-size:28px;font-weight:800;color:#7dcea0}
.cl-h{margin-top:12px;color:#7dcea0;font-weight:700}
.cl-h.break{color:#e8a0a0}
.ach{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}
.ach-i{aspect-ratio:1;background:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.ach-i.q{border:2px dashed #c9a24b;background:#fff8e8;color:#c9a24b;animation:pulse 1.2s infinite}
@keyframes pulse{50%{opacity:.6}}
.skills{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px}
.sk{background:#2a3458;border-radius:12px;padding:12px;text-align:center}
.sk.ready{outline:2px solid #c9a24b}
.sk.dim{opacity:.45}
.sk-icon{width:36px;height:36px;margin:0 auto 6px;border-radius:50%;background:#3a4570;display:flex;align-items:center;justify-content:center}
.save{margin:8px 12px;padding:12px;border-radius:10px;background:#1e2838;border:1px solid #2a3848}
.save.on{border-color:#c9a24b;background:#2a2430}
.vote-target{margin:12px;padding:12px;background:#2a2038;border-radius:10px;font-weight:700}
.vote-reason{margin:0 12px 12px;font-size:12px;opacity:.8;line-height:1.5}
.vote-bars{padding:0 12px;display:grid;gap:8px;font-size:12px}
.bar{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:4px}
.bar>i{display:block;height:100%;background:#c9a24b}
.spin{width:48px;height:48px;margin:0 auto;border-radius:50%;border:3px solid #3a4570;border-top-color:#c9a24b;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.tags-cloud{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:16px 0}
.tags-cloud span{font-size:11px;padding:4px 8px;border-radius:99px;background:#2a3458}
.tags-cloud .hot{background:#c9a24b;color:#1a1520}
.reveal{margin-top:8px;padding:10px;background:#1e2838;border-radius:8px;font-size:13px;line-height:1.6}
.nsfw-ui{background:linear-gradient(180deg,#1c1520,#120e18);color:#f0e6f2}
.nsfw-ui .ph-bar{border-bottom-color:rgba(255,255,255,.08)}
.cart{padding:10px 12px;display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px;gap:8px;align-items:flex-start}
.cart label{display:flex;gap:8px;align-items:flex-start;text-align:left;flex:1}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}
.cell{aspect-ratio:1;border-radius:8px;background:#2a2030;display:flex;align-items:center;justify-content:center;font-size:12px;color:#666}
.cell.on{background:#e8a0bf55;color:#f0c0d4;font-weight:700}
.cell.new{outline:2px solid #e8a0bf;animation:pulse 1s infinite}
.todo{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px;text-align:left}
.todo.done span{opacity:.5;text-decoration:line-through}
.gauge{display:flex;justify-content:center;gap:12px;padding:16px}
.g-y,.g-r{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;opacity:.4}
.g-y{background:#c9a24b}.g-r{background:#e85d2c}.g-r.on,.g-y.on{opacity:1;transform:scale(1.08)}
.log{margin:12px;padding:10px;background:#2a2030;border-radius:8px;font-size:11px;text-align:left;line-height:1.8}
.dev{padding:12px;font-size:15px;font-weight:700}
.pink{color:#e8a0bf}
.cl{font-size:12px;line-height:1.8;padding:0 12px;text-align:left}
.nsfw-ticket{background:#2a2030;color:#f0e6f2}
.fit-visual{height:100px;margin:12px;border-radius:12px;background:linear-gradient(160deg,#3a2a40,#e8a0bf55)}
.score{display:flex;justify-content:space-around;font-size:11px;padding:8px;opacity:.85;flex-wrap:wrap;gap:4px}
.bub-me,.bub-ta{margin:8px 12px;padding:10px;border-radius:12px;font-size:12px;text-align:left;line-height:1.5}
.bub-me{background:#2a2030}.bub-ta{background:#e8a0bf33}
.lock{font-size:22px;letter-spacing:.4em;padding:16px;color:#e8a0bf}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:12px}
.nsfw-t{height:64px;border-radius:6px;background:linear-gradient(135deg,#3a2a40,#5a3a50)}
.tarot{margin:16px auto;width:140px;height:200px;border-radius:12px;border:2px solid #e8a0bf;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#2a2030,#1a1520);font-weight:700}
.timer-ring{width:120px;height:120px;margin:16px auto;border-radius:50%;border:6px solid #e8a0bf;display:flex;align-items:center;justify-content:center;font-size:24px;font-family:ui-monospace,Consolas,monospace;font-weight:700}
.heat{position:relative;height:180px;margin:12px;border-radius:12px;background:radial-gradient(circle at 50% 40%,#e85d2c55,#2a2030 70%)}
.hz{position:absolute;font-size:10px;padding:4px 8px;border-radius:99px;background:#2a2030;border:1px solid #e8a0bf55}
.hz.hot{background:#e85d2c;color:#fff;font-weight:700}
.stats-strip{display:flex;flex-wrap:wrap;gap:8px 12px;padding:8px 12px;font-size:11px;background:rgba(0,0,0,.04);border-bottom:1px solid rgba(0,0,0,.05)}
.stats-strip b{font-weight:700}
.stats-strip.soft{background:#f3efe6}
.stats-strip.teal{background:#e8f5f0;color:#2d6b57}
.stats-strip.dark{background:rgba(255,255,255,.04);border-bottom-color:rgba(255,255,255,.06);color:inherit}
.tip-bar{margin:8px 12px;padding:8px 10px;border-radius:8px;background:#eef2ff;font-size:11px;line-height:1.5;color:#3a4a6a}
.tip-bar.dark{background:#243040;color:#9ab0c4}
.foot-meta{padding:10px 14px 14px;font-size:10px;opacity:.55;line-height:1.4}
.foot-meta.dark{color:inherit}
.list-dense{padding:4px 12px 10px}
.list-dense .li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed rgba(0,0,0,.08);font-size:12px;align-items:flex-start}
.list-dense.dark .li{border-bottom-color:rgba(255,255,255,.08)}
.list-dense .li>span{opacity:.75;text-align:right;max-width:62%}
.list-dense .hot-li{background:#fff8e8;margin:0 -4px;padding:8px 4px;border-radius:6px}
.list-dense.dark .hot-li{background:#2a2430}
.related{margin:8px 12px;padding:10px;border-radius:10px;background:rgba(0,0,0,.03);font-size:12px}
.related.dark{background:#243040}
.rel-h{font-weight:700;margin-bottom:6px;font-size:11px}
.rel-i{padding:4px 0;line-height:1.5;opacity:.85}
.rel-i+ .rel-i{border-top:1px dashed rgba(0,0,0,.06)}
`
