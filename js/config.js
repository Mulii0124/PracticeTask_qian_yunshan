/* ============================================================
   config.js —— 天气字典 / 穿搭分级 / AI 提示词 / 本地降级引擎
   ============================================================ */

/* ---------- 天气代码字典（WMO） ---------- */
const WMO = {
  0:  { label: '晴',           group: 'clear',   night: false },
  1:  { label: '晴间少云',     group: 'clear',   night: false },
  2:  { label: '多云',         group: 'cloud',   night: false },
  3:  { label: '阴',           group: 'cloud',   night: false },
  45: { label: '雾',           group: 'fog',     night: false },
  48: { label: '雾凇',         group: 'fog',     night: false },
  51: { label: '毛毛雨',       group: 'rain',    night: false },
  53: { label: '细雨',         group: 'rain',    night: false },
  55: { label: '密毛毛雨',     group: 'rain',    night: false },
  56: { label: '冻毛毛雨',     group: 'rain',    night: false },
  57: { label: '强冻毛毛雨',   group: 'rain',    night: false },
  61: { label: '小雨',         group: 'rain',    night: false },
  63: { label: '中雨',         group: 'rain',    night: false },
  65: { label: '大雨',         group: 'rain',    night: false },
  66: { label: '冻雨',         group: 'rain',    night: false },
  67: { label: '强冻雨',       group: 'rain',    night: false },
  71: { label: '小雪',         group: 'snow',    night: false },
  73: { label: '中雪',         group: 'snow',    night: false },
  75: { label: '大雪',         group: 'snow',    night: false },
  77: { label: '米雪',         group: 'snow',    night: false },
  80: { label: '阵雨',         group: 'rain',    night: false },
  81: { label: '强阵雨',       group: 'rain',    night: false },
  82: { label: '暴雨',         group: 'rain',    night: false },
  85: { label: '阵雪',         group: 'snow',    night: false },
  86: { label: '强阵雪',       group: 'snow',    night: false },
  95: { label: '雷阵雨',       group: 'storm',   night: false },
  96: { label: '雷雨伴冰雹',   group: 'storm',   night: false },
  99: { label: '强雷雨冰雹',   group: 'storm',   night: false }
};

function wmoOf(code){
  const k = Number(code);
  return WMO[k] || { label: '未知', group: 'cloud', night: false };
}

/* ---------- 穿搭分级 ---------- */
/* 按体感温度分层，每层对应一张人物立绘 */
const TIERS = [
  {
    key: 'summer', img: 'assets/img/characters/char-summer.png',
    name: '夏衫', tip: '单层透气，一件足够',
    min: 24, outer: false
  },
  {
    key: 'mild', img: 'assets/img/characters/char-mild.png',
    name: '春秋', tip: '叠穿两层，随温差增减',
    min: 16, outer: true
  },
  {
    key: 'autumn', img: 'assets/img/characters/char-autumn.png',
    name: '深秋', tip: '夹棉加护腕，早晚有风',
    min: 8, outer: true
  },
  {
    key: 'winter', img: 'assets/img/characters/char-winter.png',
    name: '冬裘', tip: '厚袍加披风，注意护颈',
    min: -99, outer: true
  }
];

/* 雨天专属立绘（温度较高时优先展示雨具装备） */
const RAIN_TIER = {
  key: 'rain', img: 'assets/img/characters/char-rain.png',
  name: '雨行', tip: '蓑衣斗笠，全天候防雨',
  min: -99, outer: true
};

function pickTier(apparentTemp){
  for (const t of TIERS){
    if (apparentTemp >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

/* 场景背景按天气分组选择 */
const SCENES = {
  clear: 'assets/img/scenes/scene-sunny.jpg',
  cloud: 'assets/img/scenes/scene-cloudy.jpg',
  rain:  'assets/img/scenes/scene-rain.jpg',
  snow:  'assets/img/scenes/scene-snow.jpg',
  storm: 'assets/img/scenes/scene-rain.jpg',
  fog:   'assets/img/scenes/scene-cloudy.jpg'
};

/* ---------- AI 提示词 ---------- */
const SYSTEM_PROMPT = `你是一位精通中式东方美学的穿搭顾问兼出行策划师，同时具备严谨的天气数据解读能力。
风格要求：语言凝练雅致，可以适度使用中式意象（月白、青竹、鸦青、松针、绛紫等）来描述服装与配色，
但每一条都必须落到可执行的具体信息：材质、厚度、颜色、款式、随身物品。禁止只有意象没有实操。

严格只输出一个 JSON 对象，不要输出任何解释文字，不要用 Markdown 代码块包裹，不要输出 JSON 以外的字符。

JSON 结构：
{
  "outfit": {
    "title": "四字以内的方案名",
    "summary": "一到两句总述，说明为什么这样穿（必须结合当日气温与体感温度）",
    "upper": "上装建议：材质 + 厚度 + 颜色 + 款式",
    "lower": "下装建议",
    "outer": "外搭建议，若不需要外搭则为空字符串",
    "shoes": "鞋履建议",
    "accessories": ["配饰1", "配饰2", "配饰3"],
    "materials": "面料与工艺要点",
    "colors": "配色方案",
    "style_note": "整体风格点睛一句"
  },
  "travel": {
    "summary": "一到两句出行总述",
    "layers": "建议的穿搭层数与穿脱方式",
    "gear": ["必带物品1", "必带物品2", "必带物品3"],
    "route": "时段与活动安排建议（结合昼夜、紫外线、风力）",
    "cautions": ["注意事项1", "注意事项2"]
  },
  "daily_note": "一句不超过 30 字的今日笺，诗意但不空洞"
}`;

function buildUserPrompt(w){
  const lines = [
    '请根据以下实时天气，给出今天的穿搭与出行方案。',
    '',
    '【地点】' + w.city + '（' + w.country + '）',
    '【时间】' + w.localTime,
    '【天气】' + w.condition + '，白天/夜间：' + (w.isDay ? '白天' : '夜间'),
    '【气温】当前 ' + w.temp + '°C，体感 ' + w.feelsLike + '°C，今日最高 ' + w.tempMax + '°C，最低 ' + w.tempMin + '°C',
    '【风】' + w.wind + '，阵风 ' + w.gust + '，风向 ' + w.windDir,
    '【湿度】' + w.humidity + '%',
    '【降水】当前降水 ' + w.precip + ' mm，24 小时降水概率 ' + w.precipProb + '%',
    '【云量】' + w.cloud + '%',
    '【紫外线】' + w.uv,
    '【日出/日落】' + w.sunrise + ' / ' + w.sunset
  ];
  if (w.variant) lines.push('', '【额外要求】' + w.variant);
  return lines.join('\n');
}

/* ---------- 本地降级规则引擎（无 API Key 时使用） ---------- */
/* 「换一套」时轮换的备选配饰 / 配色 / 点句，保证每次结果不同 */
const ACC_VARIANTS = [
  ['折扇或素色配饰', '发冠或发簪', '小荷包'],
  ['玉质发饰', '素面香囊', '窄腰带'],
  ['绢花簪', '竹骨折扇', '腕上素环'],
  ['绒面护腕', '素色香囊', '发带']
];
const COLOR_VARIANTS = [
  null,
  '鸦青配月白，点缀朱砂',
  '松针绿配米白，系一条赭石腰封',
  '绛紫配月白，滚一道藤黄边'
];
const NOTE_VARIANTS = [
  '衣取其形，色取其意，一处亮点胜过全身堆砌。',
  '不求繁复，只求一处线条干净。',
  '取一物点睛，余处留白。',
  '色可素，质不可粗。'
];
const ACCENT_VARIANTS = ['#D9B26A', '#C9705A', '#7FA3C4', '#8FB89E'];

function localRecommend(w, v = 0){
  const vi = Math.abs(Math.trunc(v || 0)) % ACC_VARIANTS.length;
  const t = w.feelsLike;
  const rainy = /雨|雷阵雨/.test(w.condition);
  const snowy = /雪/.test(w.condition);
  const foggy  = /雾/.test(w.condition);
  const windy = parseFloat(w.wind) >= 25;
  const humid = w.humidity >= 80;
  const uvHigh = w.uv >= 6;

  let band, upper, lower, outer, shoes, mat, color, layers, feel;
  if (t >= 28){
    band = '盛夏酷暑';
    upper = '真丝或棉麻质地短衫短褐，领口开低一寸，袖口挽起';
    lower = '宽松棉麻短裤或及膝薄裙，透气为先';
    outer = '';
    shoes = '露趾凉鞋或薄底布鞋，鞋面镂空';
    mat   = '真丝、苎麻、细棉，纱织通风';
    color = '月白配竹青，或素白配浅沙色';
    layers = '单层即可，室内空调场合可备一件薄外搭';
    feel  = '偏热';
  } else if (t >= 22){
    band = '初夏清爽';
    upper = '薄棉交领短衫，袖长七分，衣摆宽松';
    lower = '亚麻直筒长裤或薄纱半裙';
    outer = '薄针织开衫，晨间与空调房加穿';
    shoes = '软底布鞋或轻便皮质凉鞋';
    mat   = '精梳棉、亚麻混纺，薄而不透';
    color = '鸦青上装配月白下装，一深一浅';
    layers = '两层，早晚各增减一件';
    feel  = '舒适偏暖';
  } else if (t >= 16){
    band = '暮春初夏';
    upper = '交领中长衫，棉麻或薄绢质地';
    lower = '直筒长裤，或及踝长裙';
    outer = '薄夹克或轻披肩，防风也防晒';
    shoes = '软皮鞋或千层底布鞋';
    mat   = '细棉、绢纺，垂坠感好';
    color = '黛青配月白，点缀松针绿';
    layers = '两层叠穿，白天可脱外搭';
    feel  = '温和';
  } else if (t >= 10){
    band = '深秋微凉';
    upper = '夹棉中衣，内搭长袖棉衫';
    lower = '厚一点的长裤，束口更利落';
    outer = '棉夹克或短款对襟褙子，挡风优先';
    shoes = '厚底短靴，护住脚踝';
    mat   = '夹棉、灯芯绒、细羊毛混纺';
    color = '赭石配青灰，暖色压住秋凉';
    layers = '三层，内层排汗、中层保温、外层挡风';
    feel  = '偏凉';
  } else if (t >= 2){
    band = '初冬寒意';
    upper = '厚棉长衫，领口加高';
    lower = '加绒长裤，膝部加厚';
    outer = '带绒里长袍或羊毛大衣';
    shoes = '厚底皮靴，内衬羊毛袜';
    mat   = '羊毛、羊绒混纺、绒面内里';
    color = '深靛配炭灰，领口用白狐裘点缀';
    layers = '三层以上，重点护住颈、手腕、脚踝';
    feel  = '寒冷';
  } else {
    band = '隆冬严寒';
    upper = '贴身穿排汗内层，再套厚绒长衫';
    lower = '羽绒或双层加厚长裤';
    outer = '长款裘袍或羽绒派克服，白狐领或雪貂领';
    shoes = '高帮厚皮靴，雪地防滑鞋底';
    mat   = '白狐毛、雪貂皮、90 绒以上羽绒、羊绒内里';
    color = '鸦青、墨黑为底，围一条朱砂或藤黄围巾提亮';
    layers = '四层起，洋葱式穿法，颈部与手部重点保暖';
    feel  = '严寒';
  }

  let extra = '';
  if (rainy){
    extra = '今日有雨，外层请务必替换为防水面料：蓑衣、油纸伞或防水冲锋外套；鞋换防泼水短靴，勿穿麂皮与浅色帆布鞋。';
    if (t < 10) extra += ' 气温偏低，防水层内仍需保留羽绒或羊绒保暖层。';
  } else if (snowy){
    extra = '今日有雪，请选防滑鞋底并穿高帮靴，裤脚收进靴筒；备一副厚手套与口罩，避免长时间暴露在风雪中。';
  } else if (foggy){
    extra = '今日有雾，能见度低，浅色衣物与车辆同色请注意，建议穿带反光条或醒目色块的外层。';
  } else if (windy){
    extra = '今日风力偏大，外层请选带束口或系带的设计，长发与裙摆都会被吹乱；避开过于飘逸的雪纺。';
  }
  if (humid && !rainy){
    extra += ' 湿度偏高，优先选速干面料，棉质厚重衣物不易干爽。';
  }
  if (uvHigh && !rainy){
    extra += ' 紫外线较强，建议加一顶宽檐帽或薄纱防晒披肩，备防晒霜。';
  }

  const gear = [];
  if (rainy) gear.push('折叠伞或油纸伞', '防水鞋套或防泼水鞋');
  if (snowy) gear.push('厚手套与暖贴', '防滑鞋底');
  if (t <= 5) gear.push('羊绒围巾', '保温杯热水');
  if (uvHigh) gear.push('防晒霜', '遮阳帽或墨镜');
  if (windy) gear.push('发绳或帽绳', '防风外套');
  if (!gear.length) gear.push('水杯', '轻便小包', '折叠伞（以备突变天气）');
  if (humid) gear.push('纸巾或速干手帕');

  const route = [];
  if (uvHigh && w.isDay) route.push('午后紫外线偏强，11:00—15:00 尽量安排在檐下、廊道或有树荫的路径');
  else route.push('白日适合沿山径、水岸或古街长时间步行');
  if (w.isDay) route.push('日落前留出一段时间看暮色，山谷云海在傍晚最清晰');
  else route.push('夜间温差大，路线宜短，靠近有灯火与人流的街区');
  if (rainy) route.push('雨天石板路湿滑，避开临水木栈道与山脊窄径');
  if (snowy) route.push('雪后山径易滑，选择主路与有台阶标识的路线');

  const cautions = [];
  if (t >= 28) cautions.push('午后闷热，及时补水，避开正午长时间暴晒');
  if (t <= 0) cautions.push('注意手部与颈部失温，相机与手机备暖宝宝');
  if (rainy) cautions.push('雷雨天气勿在树下、水边停留');
  if (windy) cautions.push('风大时远离临时搭建物与高空坠物区域');
  if (humid) cautions.push('湿冷环境下注意排汗，避免棉衣汗湿后失温');
  cautions.push('随身带一件可收纳的外层，便于随温度调整');

  const palette = [
    { name: '主色', hex: pickColor(t) },
    { name: '辅色', hex: '#8C9A93' },
    { name: '点缀', hex: rainy ? '#7F9BB0' : ACCENT_VARIANTS[vi] }
  ];

  return {
    outfit: {
      title: band,
      summary: w.city + '今日' + w.condition + '，体感' + feel + '（' + w.feelsLike + '°C）。' +
               (extra ? extra.split('。')[0].replace(/[；，、\s]+$/, '') + '。'
                      : '按' + band + '的标准穿法即可从容应对。'),
      upper: upper,
      lower: lower,
      outer: outer || '不需要外搭，一件主衣足够',
      shoes: shoes,
      accessories: rainy ? ['油纸伞', '束袖布带', '防水手套'] :
                   (t <= 5 ? ['羊绒围巾', '羊毛手套', '皮质手套备'] :
                    ACC_VARIANTS[vi]),
      materials: mat,
      colors: COLOR_VARIANTS[vi] || color,
      style_note: rainy ? '雨天出行，宁素不繁，一色到底最利落。'
                        : NOTE_VARIANTS[vi]
    },
    travel: {
      summary: w.city + '今日' + w.condition + '，' + (rainy ? '雨具与防滑是重点' : (snowy ? '保暖与防滑并重' : '适合外出走动')) +
               '，预计' + (rainy ? '雨声伴行' : '山色宜人') + '。',
      layers: layers,
      gear: gear.slice(0, 4),
      route: route.join('；') + '。',
      cautions: cautions.slice(0, 3)
    },
    daily_note: buildNote(w, band),
    palette: palette
  };
}

function pickColor(t){
  if (t >= 26) return '#EDE3CE';
  if (t >= 18) return '#C9D6CE';
  if (t >= 10) return '#9A7B54';
  if (t >= 2)  return '#3D4C63';
  return '#232C3B';
}

function buildNote(w, band){
  const hour = Number(String(w.localTime || '').slice(11, 13));
  const part = hour < 6 ? '夜深' : hour < 11 ? '晨起' : hour < 15 ? '午后' : hour < 19 ? '日斜' : '入夜';
  const map = {
    '晴': '天光正好',
    '多云': '云卷云舒',
    '阴': '云影低垂',
    '小雨': '烟雨初落',
    '中雨': '雨打芭蕉',
    '大雨': '檐声如瀑',
    '雷阵雨': '惊雷过岭',
    '小雪': '初雪轻落',
    '中雪': '雪落无声',
    '大雪': '天地一白',
    '雾': '雾锁山径'
  };
  const key = Object.keys(map).find(k => w.condition.includes(k)) || '天光';
  return part + '「' + key + '」，' + band + '，宜' + (w.precipProb >= 50 ? '持伞而出' : '缓步远行') + '。';
}

/* ---------- 天气图标 SVG ---------- */
const ICONS = {
  sun: `<svg viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="12" fill="#E2BD76"/>
    <g class="wi-sun-rays" stroke="#E2BD76" stroke-width="2.6" stroke-linecap="round">
      <path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M50.4 13.6l-5 5M18.6 45.4l-5 5"/>
    </g></svg>`,

  moon: `<svg viewBox="0 0 64 64" fill="none">
    <path d="M42 40a15 15 0 01-19-19 17 17 0 1020 20 15 15 0 01-1-1z" fill="#C9D6E8"/>
    <circle cx="46" cy="18" r="1.8" fill="#E2BD76"/><circle cx="22" cy="16" r="1.2" fill="#E2BD76" opacity=".7"/>
    <circle cx="50" cy="30" r="1.1" fill="#E2BD76" opacity=".6"/></svg>`,

  cloud: `<svg viewBox="0 0 64 64" fill="none">
    <g class="wi-cloud">
      <path d="M20 46a11 11 0 010-22 15 15 0 0128.6 4.4A9.4 9.4 0 0148 46H20z" fill="#B9C7D2"/>
      <path d="M20 46a11 11 0 010-22 15 15 0 0128.6 4.4A9.4 9.4 0 0148 46H20z" fill="url(#cg)" opacity=".5"/>
      <defs><linearGradient id="cg" x1="20" y1="24" x2="48" y2="46"><stop stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#8FA6B8" stop-opacity="0"/></linearGradient></defs>
    </g></svg>`,

  partly: `<svg viewBox="0 0 64 64" fill="none">
    <circle cx="24" cy="24" r="10" fill="#E2BD76"/>
    <g class="wi-cloud"><path d="M24 52a10 10 0 010-20 13.5 13.5 0 0126 4 8.5 8.5 0 01-1 16H24z" fill="#C2CFDA"/></g></svg>`,

  rain: `<svg viewBox="0 0 64 64" fill="none">
    <g class="wi-cloud"><path d="M20 40a11 11 0 010-22 15 15 0 0128.6 4.4A9.4 9.4 0 0148 40H20z" fill="#93A6B6"/></g>
    <g stroke="#7FB6D8" stroke-width="2.8" stroke-linecap="round">
      <path class="wi-drop" d="M24 45v6" style="animation-delay:0s"/>
      <path class="wi-drop" d="M33 47v6" style="animation-delay:.35s"/>
      <path class="wi-drop" d="M42 45v6" style="animation-delay:.7s"/>
    </g></svg>`,

  storm: `<svg viewBox="0 0 64 64" fill="none">
    <g class="wi-cloud"><path d="M20 38a11 11 0 010-22 15 15 0 0128.6 4.4A9.4 9.4 0 0148 38H20z" fill="#7D8E9E"/></g>
    <path class="wi-bolt" d="M33 40l-9 12h7l-3 11 11-14h-7l4-9z" fill="#E2BD76"/></svg>`,

  snow: `<svg viewBox="0 0 64 64" fill="none">
    <g class="wi-cloud"><path d="M20 38a11 11 0 010-22 15 15 0 0128.6 4.4A9.4 9.4 0 0148 38H20z" fill="#C3D2DE"/></g>
    <g class="wi-flake" stroke="#DCEAFF" stroke-width="2" stroke-linecap="round">
      <path d="M24 44v10M20 46l8 6M28 46l-8 6"/>
      <path d="M40 44v10M36 46l8 6M44 46l-8 6"/>
    </g></svg>`,

  fog: `<svg viewBox="0 0 64 64" fill="none">
    <g class="wi-fog" stroke="#B7C6D2" stroke-width="3" stroke-linecap="round">
      <path d="M14 26h30M20 35h30M12 44h30M22 53h24"/>
    </g></svg>`
};

function iconFor(code, isDay){
  const g = wmoOf(code).group;
  if (g === 'clear')   return isDay ? ICONS.sun : ICONS.moon;
  if (g === 'cloud')   return code === 2 ? (isDay ? ICONS.partly : ICONS.cloud) : ICONS.cloud;
  if (g === 'rain')    return ICONS.rain;
  if (g === 'storm')   return ICONS.storm;
  if (g === 'snow')    return ICONS.snow;
  if (g === 'fog')     return ICONS.fog;
  return ICONS.cloud;
}

/* ---------- 演示城市（离线/无网时兜底） ---------- */
const DEMO_CITIES = [
  { name: '杭州', country: '中国', lat: 30.2936, lon: 120.1614 },
  { name: '成都', country: '中国', lat: 30.5728, lon: 104.0668 },
  { name: '大理', country: '中国', lat: 25.6065, lon: 100.2679 },
  { name: '北京', country: '中国', lat: 39.9042, lon: 116.4074 }
];
