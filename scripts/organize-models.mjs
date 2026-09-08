/**
 * 整理 建模模型：分类 → 去重 → 中文命名
 * 输出到 建模模型/已整理/
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.resolve('建模模型')
const OUT = path.join(ROOT, '已整理')
const SOURCE_PRIORITY = ['家具1', '家具4', '家具5', '家具6', '家具2', '家具3', '食物1']

function isHashSegment(seg) {
  if (!seg || seg.length < 5) return false
  const hasDigit = /[0-9]/.test(seg)
  const hasLower = /[a-z]/.test(seg)
  const hasUpper = /[A-Z]/.test(seg)
  if (hasDigit && hasLower && hasUpper) return true
  if (seg.length >= 8 && hasLower && hasUpper && !/\s/.test(seg)) return true
  return false
}

function normalizeKey(filename) {
  const base = path.basename(filename, '.glb')
  const parts = base.split('-').filter(Boolean)
  while (parts.length > 1 && isHashSegment(parts[parts.length - 1])) {
    parts.pop()
  }
  let stripped = parts.join('-')
  return stripped
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** 英文 → 中文（精确匹配，小写） */
const CN_EXACT = {
  // 床
  'bed': '床',
  'bed single': '单人床',
  'bed double': '双人床',
  'bed king': '特大床',
  'bed bunk': '上下铺',
  'bunk bed': '上下铺',
  'double bed': '双人床',
  'single bed': '单人床',
  'cabinet bed': '床底柜',
  'cabinet bed drawer': '床底抽屉柜',
  'cabinet bed drawer table': '床底抽屉桌',

  // 沙发
  'couch': '沙发',
  'couch small': '小沙发',
  'couch medium': '中沙发',
  'couch large': '大沙发',
  'couch wide': '宽沙发',
  'l couch': 'L型沙发',
  'two seater couch': '双人沙发',
  'three seater couch': '三人沙发',
  'lounge sofa': '休闲沙发',
  'lounge sofa corner': '转角沙发',
  'lounge sofa long': '长沙发',
  'lounge sofa ottoman': '沙发脚凳',
  'lounge design sofa': '设计款沙发',
  'lounge design sofa corner': '设计款转角沙发',
  'lounge chair': '休闲椅',
  'lounge chair relax': '躺椅',
  'lounge design chair': '设计款单椅',
  'armchair': '扶手椅',
  'club arm chair': '俱乐部扶手椅',
  'wooden arm chair': '木质扶手椅',
  'rocking chair': '摇椅',
  'ottoman coffe table': '脚凳茶几',

  // 桌
  'desk': '书桌',
  'desk corner': '转角书桌',
  'adjustable desk': '升降桌',
  'standing desk': '站立书桌',
  'computer desk': '电脑桌',
  'executive desk': '老板桌',
  'l shaped desk': 'L型书桌',
  'light desk': '台灯桌',
  'table': '餐桌',
  'table round': '圆桌',
  'table round large': '大圆桌',
  'table round small': '小圆桌',
  'table large circular': '大圆餐桌',
  'table glass': '玻璃餐桌',
  'table cross': '十字腿餐桌',
  'table cross cloth': '铺桌布餐桌',
  'table cloth': '铺桌布长桌',
  'wood kitchen table': '木质餐桌',
  'modern kitchen table': '现代餐桌',
  'side table': '边几',
  'side table drawers': '抽屉边几',
  'end table': '边桌',
  'night stand': '床头柜',
  'bench': '长凳',
  'bench cushion': '软垫长凳',
  'bench cushion low': '矮软垫凳',
  'stool': '凳子',
  'stool bar': '吧台凳',
  'stool bar square': '方形吧台凳',
  'kitchen bar': '厨房吧台',
  'kitchen bar end': '厨房吧台端',

  // 茶几
  'coffee table': '茶几',
  'table coffee': '茶几',
  'table coffee square': '方茶几',
  'table coffee glass': '玻璃茶几',
  'table coffee glass square': '方玻璃茶几',
  'rounded coffee table': '圆角茶几',
  'ottoman coffe table': '脚凳茶几',

  // 椅
  'chair': '椅子',
  'chair desk': '书椅',
  'chair cushion': '软垫椅',
  'chair rounded': '圆角椅',
  'chair modern cushion': '现代软垫椅',
  'chair modern frame cushion': '现代框架椅',
  'office chair': '办公椅',
  'executive chair': '老板椅',
  'wooden chair': '木椅',
  'wood kitchen chair': '厨房木椅',
  'minimalist modern chair': '极简现代椅',

  // 绿植
  'potted plant': '盆栽',
  'plant small1': '小盆栽1',
  'plant small2': '小盆栽2',
  'plant small3': '小盆栽3',
  'houseplant': '室内绿植',
  'plant white pot': '白盆绿植',
  'cactus': '仙人掌',
  'dead houseplant': '枯萎绿植',
  'flowers': '花束',

  // 装饰
  'rug': '地毯',
  'rug round': '圆地毯',
  'rug rectangle': '矩形地毯',
  'rug rounded': '圆角地毯',
  'rug square': '方地毯',
  'rug doormat': '门垫',
  'round rug': '圆形地毯',
  'wool carpet': '羊毛地毯',
  'pillow': '抱枕',
  'pillow blue': '蓝色抱枕',
  'pillow blue long': '蓝色长抱枕',
  'pillow long': '长抱枕',
  'cushions': '靠垫',
  'books': '书本',
  'book stack': '书堆',
  'painting': '挂画',
  'painting canvas': '画布',
  'blank picture frame': '空白相框',
  'doll': '玩偶',
  'globe': '地球仪',
  'piggy bank': '存钱罐',
  'present': '礼物盒',
  'trophy': '奖杯',
  'telescope': '望远镜',
  'rubber duck': '橡皮鸭',
  'dartboard': '飞镖盘',
  'darts': '飞镖',
  'skateboard': '滑板',
  'rubik\'s cube': '魔方',
  'polaroids': '拍立得照片',
  'bear': '熊头挂饰',
  'bird house': '鸟屋',
  'pumpkin': '南瓜',
  'candlestick': '烛台',
  'chandelier': '吊灯',
  'alarm clock': '闹钟',
  'analog clock': '指针钟',
  'grandfathers clock': '落地钟',
  'wall corkboard': '软木板',
  'message board': '留言板',
  'curtains double': '双层窗帘',
  'fireplace': '壁炉',
  'mirror': '镜子',
  'bathroom mirror': '浴室镜',

  // 收纳
  'bookshelf': '书架',
  'bookcase closed': '封闭书柜',
  'bookcase closed doors': '带门书柜',
  'bookcase closed wide': '宽封闭书柜',
  'bookcase open': '开放书柜',
  'bookcase open low': '矮开放书柜',
  'medium book shelf': '中型书架',
  'large book shelf': '大型书架',
  'small bookshelf': '小书架',
  'cabinet': '柜子',
  'dresser': '梳妆台',
  'wide dresser': '宽梳妆台',
  'bachelor dresser': '单身 dresser',
  'lingerie dresser': '内衣柜',
  'wardrobe': '衣柜',
  'large wardrobe': '大衣柜',
  'medium wardrobe': '中衣柜',
  'small wardrobe': '小衣柜',
  'file cabinet': '文件柜',
  'cube cabinet': '方格柜',
  'floating shelf': '浮动搁板',
  'shelf': '搁板',
  'shelf small': '小搁板',
  'shelf large': '大搁板',
  'drawer': '抽屉柜',
  'coat rack': '衣帽架',
  'coat rack standing': '立式衣帽架',
  'towel rack': '毛巾架',
  'cardboard box closed': '封闭纸箱',
  'cardboard box open': '打开纸箱',
  'cardboard box': '纸箱',
  'cardboard boxes': '纸箱组',
  'empty box': '空盒子',
  'safe': '保险柜',
  'toolbox': '工具箱',
  'tissue box': '纸巾盒',
  'trashcan': '垃圾桶',
  'trashcan small': '小垃圾桶',
  'trashcan large': '大垃圾桶',
  'trash bin': '垃圾桶',

  // 灯光
  'lamp': '灯',
  'lamp round floor': '圆形落地灯',
  'lamp round table': '圆形台灯',
  'lamp square floor': '方形落地灯',
  'lamp square table': '方形台灯',
  'lamp square ceiling': '方形吸顶灯',
  'lamp wall': '壁灯',
  'desk lamp': '台灯',
  'table lamp': '桌灯',
  'floor lamp': '落地灯',
  'bedside lamp': '床头灯',
  'lamp with shade': '带罩灯',
  'ceiling fan': '吊扇',
  'ceiling light': '吸顶灯',
  'ceiling lamp': '天花灯',
  'light ceiling': '吸顶灯',
  'light ceiling single': '单头吸顶灯',
  'light chandelier': '枝形吊灯',
  'light cube': '立方灯',
  'light floor': '落地灯',
  'light icosahedron': '二十面体灯',
  'light stand': '立灯',

  // 厨房
  'kitchen cabinet': '厨房底柜',
  'kitchen cabinet drawer': '厨房抽屉柜',
  'kitchen cabinet upper': '厨房吊柜',
  'kitchen cabinet upper corner': '厨房转角吊柜',
  'kitchen cabinet upper double': '双门吊柜',
  'kitchen cabinet upper low': '矮吊柜',
  'kitchen cabinet corner inner': '厨房内转角柜',
  'kitchen cabinet corner round': '厨房圆角柜',
  'kitchen sink': '厨房水槽',
  'kitchen stove': '燃气灶',
  'kitchen stove electric': '电灶',
  'kitchen fridge': '冰箱',
  'kitchen fridge built in': '嵌入式冰箱',
  'kitchen fridge large': '大冰箱',
  'kitchen fridge small': '小冰箱',
  'kitchen coffee machine': '咖啡机',
  'kitchen microwave': '微波炉',
  'kitchen blender': '搅拌机',
  'fridge': '冰箱',
  'refrigirator': '冰箱',
  'stove': '炉灶',
  'gas stove': '燃气灶',
  'oven': '烤箱',
  'oven solo': '独立烤箱',
  'toaster': '烤面包机',
  'air fryer': '空气炸锅',
  'blender': '搅拌机',
  'coffee machine': '咖啡机',
  'dish washer': '洗碗机',
  'hood large': '大抽油烟机',
  'hood modern': '现代抽油烟机',
  'sink kitchen cabinet': '水槽厨柜',
  'steel sink kitchen cabinet': '不锈钢水槽柜',
  'wooden kitchen sink': '木质水槽台',
  'frying pan': '煎锅',
  'fry pan': '平底锅',
  'sauce pan': '汤锅',
  'pot': '锅',
  'bowl': '碗',
  'plate': '盘子',
  'square plate': '方盘',
  'fork': '叉子',
  'spoon': '勺子',
  'knife': '刀',
  'mug': '马克杯',
  'cup': '杯子',
  'glass cup': '玻璃杯',
  'plastic cup': '塑料杯',
  'coffee cup': '咖啡杯',
  'tea cup': '茶杯',
  'cup of tea': '茶杯',
  'coffee cup': '咖啡杯',
  'milkjar': '奶罐',

  // 卫浴
  'bathtub': '浴缸',
  'toilet': '马桶',
  'toilet square': '方形马桶',
  'bathroom sink': '洗手台',
  'bathroom sink square': '方形洗手台',
  'bathroom cabinet': '浴室柜',
  'bathroom cabinet drawer': '浴室抽屉柜',
  'bathroom toilet paper': '厕纸',
  'toilet paper stack': '厕纸堆',
  'shower': '淋浴',
  'shower round': '圆形淋浴',
  'washer': '洗衣机',
  'dryer': '烘干机',
  'washer dryer stacked': '洗烘一体机',
  'washing machine': '洗衣机',

  // 墙面门窗
  'wall': '墙段',
  'wall corner': '转角墙',
  'wall corner rond': '圆角墙',
  'wall half': '半墙',
  'wall doorway': '墙门洞',
  'wall doorway wide': '宽墙门洞',
  'doorway': '门洞',
  'doorway front': '正门洞',
  'doorway open': '开放门洞',
  'door': '门',
  'door double': '双开门',
  'wall window': '墙窗',
  'wall window slide': '推拉窗',
  'window large': '大窗',
  'window small': '小窗',
  'window round': '圆窗',
  'floor full': '整地板',
  'floor half': '半地板',
  'floor corner': '转角地板',
  'floor corner round': '圆角地板',
  'paneling': '墙板',
  'stairs': '楼梯',
  'stairs corner': '转角楼梯',
  'stairs open': '开放楼梯',
  'stairs open single': '单段开放楼梯',
  'column round': '圆柱',

  // 办公电子
  'computer': '电脑',
  'computer screen': '显示器',
  'monitor': '显示器',
  'computer keyboard': '键盘',
  'keyboard': '键盘',
  'computer mouse': '鼠标',
  'mouse': '鼠标',
  'mousepad': '鼠标垫',
  'laptop': '笔记本',
  'laptop bag': '电脑包',
  'printer': '打印机',
  'television modern': '现代电视',
  'television vintage': '复古电视',
  'television antenna': '天线电视',
  'cabinet television': '电视柜',
  'cabinet television doors': '带门电视柜',
  'tv': '电视',
  'speaker': '音箱',
  'speaker small': '小音箱',
  'speakers': '音箱组',
  'bass speakers': '低音音箱',
  'headphones': '耳机',
  'phone': '电话',
  'office phone': '办公电话',
  'radio': '收音机',
  'stapler': '订书机',
  'notebook': '笔记本',
  'binder': '文件夹',
  'briefcase': '公文包',
  'calendar': '日历',
  'magazine': '杂志',
  'sticky notes': '便签',
  'pens': '笔',
  'pencil': '铅笔',
  'colored pencil': '彩色铅笔',
  'eraser': '橡皮',
  'glue': '胶水',
  'scissors': '剪刀',
  'desk toy': '桌面玩具',
  'desk fan': '桌面风扇',
  'mug with office tool': '办公杯',

  // 运动休闲
  'treadmill': '跑步机',
  'dumbbell': '哑铃',
  'dumbell': '哑铃',
  'barbell': '杠铃',
  'punching bag': '沙袋',
  'gymmat': '健身垫',
  'barbecue': '烧烤架',
  'baseball bat': '棒球棍',
  'basket ball': '篮球',
  'football': '橄榄球',
  'volleyball ball': '排球',
  'angle brush': '角形画笔',
  'fan brush': '扇形画笔',
  'filbert brush': '榛形画笔',
  'round brush': '圆头画笔',
  'wash brush': '水洗画笔',
  'bachelor dresser': '单身梳妆台',
  'bag flat': '扁包装袋',
  'barrel': '木桶',
  'bins': '收纳箱组',
  'boxing gloves': '拳击手套',
  'caldron': '大坩埚',
  'candy bar': '巧克力棒',
  'carton': '纸盒',
  'carton small': '小纸盒',
  'chinese': '中式餐盒',
  'chips': '薯片',
  'coconut': '椰子',
  'coconut half': '半个椰子',
  'crushed soda can': '压扁汽水罐',
  'double door tall cabinet': '双门高柜',
  'dual monitors on sit stand arm': '双显示器支架',
  'fish bones': '鱼骨',
  'frikandel': '荷兰炸肉卷',
  'fruit bowl': '水果碗',
  'ginger bread': '姜饼',
  'hamburger': '汉堡',
  'jar': '玻璃罐',
  'protein powder': '蛋白粉',
  'small stack of paper': '一叠纸',
  'wine glass': '红酒杯',
  'americanfootball ball': '美式足球',
  'bass': '贝斯',
  'bass speakers': '低音音箱',
  'book stack': '书堆',
  'broccoli': '西兰花',
  'croissant': '可颂',
  'mortar': '研钵',
  'whisk': '打蛋器',
  'flute': '长笛',
  'cooking': '厨具',
  'maki': '寿司卷',
  'sushi': '寿司',
  'sub': '潜艇堡',
  'frappe': '星冰乐',
  'flute': '长笛',
  'bag': '包装袋',
  'bottle': '瓶子',
  'can': '罐头',
  'can open': '开盖罐头',
  'can small': '小罐头',
  'chocolate': '巧克力',
  'chopstic': '筷子',
  'chopstick': '筷子',
  'cooking fork': '烹饪叉',
  'cooking knife': '厨刀',
  'cooking spoon': '烹饪勺',
  'cooking spatula': '锅铲',
  'corn dog': '玉米热狗',
  'cutting board round': '圆形砧板',
  'cutting board japanese': '日式砧板',
  'bacon raw': '生培根',
  'cheese cut': '切开的奶酪',
  'cheese slicer': '奶酪切片器',
  'hot dog raw': '生热狗',
  'ice cream cne': '甜筒冰淇淋',
  'ice cream scoop': '冰淇淋球',
  'ice cream scoop mint': '薄荷冰淇淋球',
  'ice cream scoop chocolate': '巧克力冰淇淋球',
  'fries empty': '空薯条盒',
  'meat patty': '肉饼',
  'meat ribs': '排骨',
  'meat tenderizer': '松肉锤',
  'mincemeat pie': '碎肉馅饼',
  'mussel open': '打开的贻贝',
  'peanut butter': '花生酱',
  'popsicle stick': '冰棒棍',
  'pot stew lid': '炖锅盖',
  'pan stew': '炖锅',
  'rolling pin': '擀面杖',
  'sausage half': '半根香肠',
  'styrofoam dinner': '泡沫餐盒',
  'styrofoam': '泡沫盒',
  'sub': '潜艇堡',
  'sushi salmon': '三文鱼寿司',
  'sushi egg': '玉子寿司',
  'maki salmon': '三文鱼卷',
  'maki roe': '鱼籽卷',
  'maki vegetable': '蔬菜卷',
  'tajine': '塔吉锅',
  'tajine lid': '塔吉锅盖',
  'whipped cream': '鲜奶油',
  'whisk': '打蛋器',
  'wholer ham': '整火腿',
  'lollypop': '棒棒糖',
  'glass': '玻璃杯',
  'shaker': '调味瓶',
  'skewer': '烤串',
  'skewer vegetables': '蔬菜烤串',
  'peanut': '花生',
  'mussel': '贻贝',
  'meat': '肉',
  'candy bar wrapper': '巧克力棒包装',
  'chocolate wrapper': '巧克力包装',
  'chopstic decorative': '装饰筷子',
  'ginger bread cutter': '姜饼模具',
  'ice cream cup': '冰淇淋杯',
  'loaf round': '圆面包',
  'pizza cutter': '披萨刀',
  'plate broken': '碎盘子',
  'plate rectangle': '长方盘',
  'bowl cereal': '麦片碗',
  'burger cheese double': '双层芝士汉堡',
  'cake slicer': '蛋糕铲',
  'cooking knife chopping': '剁骨厨刀',
  'frikandel speciaal': '荷兰特色炸肉卷',
  'plate sauerkraut': '酸菜盘',
  'popsicle chocolate': '巧克力冰棒',
  'soda can crushed': '压扁汽水罐',
  'utensil fork': '餐叉',
  'utensil knife': '餐刀',
  'utensil spoon': '汤匙',
  'cabinet bed drawer tabl': '床底抽屉桌',
  'double door base cabinet': '双门底柜',
  'double door upper cabin': '双门吊柜',
  'drawers base cabinet': '抽屉底柜',
  'drawers double door bas': '双门抽屉底柜',
  'open base cabinet': '开放底柜',
  'single door base cabinet': '单门底柜',
  'single door tall cabine': '单门高柜',
  'single door upper cabinet': '单门吊柜',
  'kitchen stool': '厨房凳',
  'stool bar': '吧台凳',
  'stool bar square': '方形吧台凳',
  'table cloth': '铺桌布长桌',
  'table cross': '十字腿餐桌',
  'table cross cloth': '铺桌布餐桌',
  'table round large': '大圆桌',
  'table round small': '小圆桌',
  'candlestick': '烛台',
  'crushed soda can': '压扁汽水罐',
  'dartboard': '飞镖盘',
  'darts': '飞镖',
  'curtains double': '双层窗帘',
  'cushions': '靠垫',
  'gymmat': '健身垫',
  'milkjar': '牛奶罐',
  'refrigirator': '冰箱',
  'ms gundam rx 78 2 with weapons': '高达模型',
  'drum set': '架子鼓',
  'guitar': '吉他',
  'flute': '长笛',
  'watering can': '浇水壶',
  'ladder': '梯子',
  'mailbox': '邮箱',
  'hammer': '锤子',
  'wrench': '扳手',
  'screwdriver': '螺丝刀',
  'hand rake': '手耙',
  'hand saw': '手锯',
  'hoe': '锄头',
  'hair dryer': '吹风机',
  'propane tank': '燃气罐',
  'closed umbrella': '收拢伞',
  'cctv camera': '监控摄像头',
  'fire extinguisher': '灭火器',
  'fire exit sign': '安全出口标志',
  'manhole cover': '井盖',
  'air vent': '通风口',
  'electrical outlet': '电源插座',
  'light switch': '电灯开关',

  // 电视柜等
  'television modern': '现代电视',

  // 食物 - Kenney food kit
  'apple': '苹果',
  'apple half': '半颗苹果',
  'avocado': '牛油果',
  'advocado half': '半个牛油果',
  'banana': '香蕉',
  'orange': '橙子',
  'lemon': '柠檬',
  'lemon half': '半颗柠檬',
  'pear': '梨',
  'pear half': '半颗梨',
  'grapes': '葡萄',
  'strawberry': '草莓',
  'watermelon': '西瓜',
  'pineapple': '菠萝',
  'cherry': '樱桃',
  'cherries': '樱桃',
  'tomato': '番茄',
  'tomato slice': '番茄片',
  'carrot': '胡萝卜',
  'broccoli': '西兰花',
  'cabbage': '卷心菜',
  'cauliflower': '花菜',
  'corn': '玉米',
  'onion': '洋葱',
  'onion half': '半个洋葱',
  'mushroom': '蘑菇',
  'mushroom half': '半个蘑菇',
  'pepper': '甜椒',
  'paprika': '彩椒',
  'paprika slice': '彩椒片',
  'eggplant': '茄子',
  'beet': '甜菜',
  'celery stick': '芹菜',
  'leek': '韭葱',
  'radish': '萝卜',
  'pumpkin basic': '小南瓜',
  'bread': '面包',
  'loaf': '长面包',
  'loaf baguette': '法棍',
  'loaf round': '圆面包',
  'croissant': '可颂',
  'waffle': '华夫饼',
  'pancakes': '松饼',
  'donut': '甜甜圈',
  'donut chocolate': '巧克力甜甜圈',
  'donut sprinkles': '糖针甜甜圈',
  'cookie': '曲奇',
  'cookie chocolate': '巧克力曲奇',
  'cupcake': '纸杯蛋糕',
  'muffin': '玛芬',
  'cake': '蛋糕',
  'cake birthday': '生日蛋糕',
  'pie': '派',
  'pudding': '布丁',
  'ice cream': '冰淇淋',
  'ice cream cup': '冰淇淋杯',
  'popsicle': '冰棒',
  'sundae': '圣代',
  'burger': '汉堡',
  'burger cheese': '芝士汉堡',
  'burger double': '双层汉堡',
  'hot dog': '热狗',
  'pizza': '披萨',
  'pizza box': '披萨盒',
  'taco': '塔可',
  'sub': '潜艇堡',
  'sandwich': '三明治',
  'sushi salmon': '三文鱼寿司',
  'sushi egg': '玉子寿司',
  'maki salmon': '三文鱼卷',
  'maki roe': '鱼籽卷',
  'dim sum': '点心',
  'rice ball': '饭团',
  'salad': '沙拉',
  'soup bowl': '汤碗',
  'bowl': '碗',
  'bowl soup': '汤碗',
  'bowl broth': '汤碗',
  'plate dinner': '餐盘',
  'plate deep': '深盘',
  'fries': '薯条',
  'bacon': '培根',
  'sausage': '香肠',
  'meat raw': '生肉',
  'meat cooked': '熟肉',
  'fish': '鱼',
  'turkey': '火鸡',
  'whole ham': '整火腿',
  'egg': '鸡蛋',
  'egg cooked': '熟鸡蛋',
  'egg half': '半个鸡蛋',
  'cheese': '奶酪',
  'bottle ketchup': '番茄酱',
  'bottle oil': '油瓶',
  'bottle musterd': '芥末酱',
  'soy': '酱油',
  'honey': '蜂蜜',
  'soda': '苏打',
  'speakers': '音箱组',
  'pot': '锅',
  'curtains double': '双层窗帘',
  'cushions': '靠垫',
  'soda can': '汽水罐',
  'soda bottle': '汽水瓶',
  'soda glass': '汽水杯',
  'wine red': '红酒',
  'wine white': '白葡萄酒',
  'glass wine': '酒杯',
  'cup coffee': '咖啡杯',
  'cup tea': '茶杯',
  'cup saucer': '茶杯碟',
  'cocktail': '鸡尾酒',
  'mug': '马克杯',
  'frappe': '星冰乐',
  'celery stick': '芹菜',
  'cutting board': '砧板',
  'ginger bread': '姜饼',
  'ice cream': '冰淇淋',
  'utensil fork': '餐叉',
  'utensil knife': '餐刀',
  'utensil spoon': '汤匙',
  'whipped cream': '鲜奶油',
  'wine red': '红酒',
  'wine white': '白葡萄酒',
  'whisk': '打蛋器',
  'rollingpin': '擀面杖',
  'frying pan': '煎锅',
  'frying pan lid': '煎锅盖',
  'pot stew': '炖锅',
  'pot lid': '锅盖',
  'pan': '平底锅',
  'steamer': '蒸笼',
  'cutting board': '砧板',
  'utensil fork': '餐叉',
  'utensil knife': '餐刀',
  'utensil spoon': '汤匙',
  'chopstick': '筷子',
  'cooking knife': '厨刀',
  'cooking spoon': '汤勺',
  'cooking spatula': '锅铲',
  'shaker salt': '盐瓶',
  'shaker pepper': '胡椒瓶',
  'pepper mill': '胡椒研磨器',
  'knife block': '刀架',
  'mortar': '研钵',
  'mortar pestle': '研钵',
}

/** 关键词 → 分类文件夹 */
const CATEGORY_RULES = [
  { cat: '01-床', re: /\b(bed|bunk|cabb?inet bed)\b/i },
  { cat: '02-沙发', re: /\b(couch|sofa|lounge sofa|lounge design sofa|seater couch|l couch|ottoman)\b/i },
  { cat: '02-沙发', re: /\b(armchair|arm chair|rocking chair|lounge chair|lounge design chair)\b/i },
  { cat: '15-椅子', re: /\b(chair|stool)\b/i },
  { cat: '03-桌', re: /\b(desk|table(?! lamp)|night stand|end table|side table|bench|kitchen bar|kitchen table|standing desk|table cloth|table cross|table round)\b/i },
  { cat: '04-茶几', re: /\b(coffee table|table coffee|rounded coffee)\b/i },
  { cat: '05-绿植', re: /\b(plant|houseplant|cactus|flowers?|potted)\b/i },
  { cat: '06-装饰', re: /\b(rug|carpet|pillow|cushion|painting|frame|doll|globe|trophy|telescope|dartboard|darts|skateboard|rubik|polaroid|bear|bird house|pumpkin|candle|chandelier|clock|curtain|fireplace|mirror|corkboard|message board|present|piggy|duck|canvas|books(?!helf|case| stack)|candlestick|curtains|cushions)\b/i },
  { cat: '07-收纳柜', re: /\b(bookcase|bookshelf|book shelf|wardrobe|dresser|cabinet|drawer|shelf|coat rack|towel rack|cardboard|toolbox|safe|file cabinet|cube cabinet|floating shelf|trash|tissue|bins|trashcan)\b/i },
  { cat: '08-灯光', re: /\b(lamp|light|ceiling fan|chandelier)\b/i },
  { cat: '09-厨房电器', re: /\b(kitchen|fridge|stove|oven|toaster|blender|coffee machine|microwave|dish washer|air fryer|hood|sink kitchen|frying|fry pan|sauce pan|barbecue|refrigirator)\b/i },
  { cat: '10-卫浴', re: /\b(bathtub|toilet|bathroom|shower|washer|dryer|washing machine)\b/i },
  { cat: '11-墙面门窗', re: /\b(wall|door|window|floor full|floor half|floor corner|paneling|stairs|column|doorway)\b/i },
  { cat: '12-办公电子', re: /\b(computer|monitor|keyboard|mouse|laptop|printer|television|tv|speaker|headphone|phone|radio|stapler|notebook|binder|briefcase|calendar|magazine|sticky|office|cctv|dual monitors?|headphones|mousepad|speakers)\b/i },
  { cat: '16-台面小物', re: /\b(cup|mug|glass|plate|bowl|fork|spoon|knife|pen|pencil|brush|eraser|glue|scissors|jar|milkjar|protein|hamburger|chips|fruit bowl|tea cup|coffee cup|glass cup|plastic cup|square plate|polaroids|sticky notes|pens|book stack|small stack of paper|wine glass|caldron|barrel|carton|empty box|crushed soda|soda can|pot(?! stew)|soda)\b/i },
  { cat: '13-运动休闲', re: /\b(treadmill|dumbbell|dumbell|barbell|punching|gymmat|gym|baseball|basket ball|football|volleyball|americanfootball|drum set|guitar|flute|watering|ladder|mailbox|hammer|wrench|screwdriver|hand rake|hand saw|hoe|hair dryer|propane|umbrella|fire exit|fire extinguisher|manhole|air vent|electrical outlet|light switch|gundam|boxing|bass speakers|bass)\b/i },
]

const FOOD_SOURCE = '食物1'

function md5(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(buf).digest('hex')
}

function toChinese(key) {
  if (CN_EXACT[key]) return CN_EXACT[key]

  const noNum = key.replace(/\s+\d+$/, '')
  if (noNum !== key && CN_EXACT[noNum]) {
    const suffix = key.slice(noNum.length).trim()
    return CN_EXACT[noNum] + (suffix ? suffix : '')
  }

  const parts = key.split(/[\s_-]+/).filter(Boolean)
  const translated = parts.map((p) => CN_EXACT[p] ?? null)
  if (translated.every(Boolean)) return translated.join('')

  return key
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

function categorize(key, relPath) {
  if (relPath.startsWith(FOOD_SOURCE)) return '14-食物'
  for (const { cat, re } of CATEGORY_RULES) {
    if (re.test(key)) return cat
  }
  return '99-其他'
}

function sourceRank(relPath) {
  const top = relPath.split(/[\\/]/)[0]
  const idx = SOURCE_PRIORITY.indexOf(top)
  return idx === -1 ? 99 : idx
}

function hasHashSuffix(filename) {
  return /[-_][A-Za-z0-9]{6,}\.glb$/i.test(filename)
}

function collectGlbs(dir, base = '') {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === '已整理') continue
      out.push(...collectGlbs(full, rel))
    } else if (ent.name.toLowerCase().endsWith('.glb')) {
      out.push({ rel, full, name: ent.name })
    }
  }
  return out
}

function uniqueFilename(dir, baseName) {
  let name = `${baseName}.glb`
  let n = 2
  while (fs.existsSync(path.join(dir, name))) {
    name = `${baseName}_${n}.glb`
    n++
  }
  return name
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('找不到目录:', ROOT)
    process.exit(1)
  }

  const files = collectGlbs(ROOT)
  console.log(`扫描到 ${files.length} 个 GLB 文件`)

  /** @type {Map<string, {rel:string,full:string,name:string,key:string,hash:string,rank:number,hasHash:boolean,size:number}[]>} */
  const groups = new Map()

  for (const f of files) {
    const key = normalizeKey(f.name)
    const hash = md5(f.full)
    const rank = sourceRank(f.rel)
    const hasHash = hasHashSuffix(f.name)
    const size = fs.statSync(f.full).size
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ ...f, key, hash, rank, hasHash, size })
  }

  /** pick winners per normalized key */
  const picked = []
  const skipped = []

  for (const [key, list] of groups) {
    // sort: prefer no hash suffix, then source priority, then larger file (more detail?)
    list.sort((a, b) => {
      if (a.hasHash !== b.hasHash) return a.hasHash ? 1 : -1
      if (a.rank !== b.rank) return a.rank - b.rank
      return b.size - a.size
    })

    // dedupe by content hash within group
    const seenHash = new Set()
    let winner = null
    for (const item of list) {
      if (seenHash.has(item.hash)) continue
      seenHash.add(item.hash)
      if (!winner) winner = item
    }

    if (winner) picked.push(winner)
    for (const item of list) {
      if (item !== winner && item.hash === winner?.hash) {
        skipped.push({ reason: '重复文件(相同内容)', ...item })
      } else if (item !== winner) {
        skipped.push({ reason: '重复款式(保留更优版本)', ...item })
      }
    }
  }

  // rebuild output dir
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  const manifest = []
  const catCounts = {}

  for (const item of picked.sort((a, b) => a.key.localeCompare(b.key))) {
    const cat = categorize(item.key, item.rel)
    catCounts[cat] = (catCounts[cat] || 0) + 1
    const cn = toChinese(item.key)
    const outDir = path.join(OUT, cat)
    fs.mkdirSync(outDir, { recursive: true })
    const outName = uniqueFilename(outDir, cn)
    const outPath = path.join(outDir, outName)
    fs.copyFileSync(item.full, outPath)

    manifest.push({
      id: path.basename(outName, '.glb'),
      category: cat,
      chineseName: path.basename(outName, '.glb'),
      englishKey: item.key,
      source: item.rel,
      output: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    })
  }

  fs.writeFileSync(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalInput: files.length,
        totalOutput: picked.length,
        totalSkipped: skipped.length,
        categories: catCounts,
        items: manifest,
        skipped: skipped.map((s) => ({
          reason: s.reason,
          key: s.key,
          source: s.rel,
        })),
      },
      null,
      2,
    ),
    'utf8',
  )

  // 中文索引 readme
  const lines = ['# 模型整理索引', '', `共 ${picked.length} 个模型（原 ${files.length} 个，去重 ${skipped.length} 个）`, '']
  for (const cat of Object.keys(catCounts).sort()) {
    lines.push(`## ${cat} (${catCounts[cat]})`)
    for (const m of manifest.filter((x) => x.category === cat)) {
      lines.push(`- ${m.chineseName} ← \`${m.source}\``)
    }
    lines.push('')
  }
  fs.writeFileSync(path.join(OUT, 'README.md'), lines.join('\n'), 'utf8')

  console.log('\n整理完成 →', OUT)
  console.log('输出:', picked.length, '跳过:', skipped.length)
  console.log('分类统计:', catCounts)
}

main()
