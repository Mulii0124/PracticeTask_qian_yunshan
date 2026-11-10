# 云山行 · AI 穿搭与出行助手

> 网页设计课程作业 · AI 辅助生成
> 一个把 **实时天气** 翻译成 **穿搭方案** 和 **出行建议** 的单页网站。
> 视觉基调取自中式青绿山水 + 水墨写意，3D 写实渲染；立绘随体感温度自动更换。

![桌面端布局](screenshot-desktop.png)

<details>
<summary>移动端（响应式）截图</summary>

![移动端布局](screenshot-mobile.png)

</details>

### 素材总览

![素材总览](gen/preview-assets.png)

---

## 一、项目定位

大多数天气网站只告诉你"今天 18 度，多云"。但真正的问题是：**18 度该穿什么？带不带伞？**。

云山行把这两个问题接在一起：左边是气象事实，中间是一个穿好衣服的人，右边是可执行的建议。

- **天气是输入，不是背景板** —— 体感温度决定立绘换哪一身，天气类型决定背景切哪张山野，降水概率决定要不要带伞。
- **AI 真正参与决策** —— 穿搭与出行文案由大模型基于实时气象数据生成，不是写死的模板。
- **没有 API Key 也能跑** —— 未配置模型时自动降级为本地规则引擎，页面功能完整，答辩现场断网也不慌。

## 二、功能一览

| 模块 | 说明 |
|---|---|
| 实时天气 | 温度 / 体感 / 最高最低温、天气状态、风力风向、湿度、降水概率、紫外线强度、日出日落 |
| 24 小时预报 | 横向滚动的小时级预报，带天气动效图标与降水概率 |
| 3D 场景层 | 4 张山野背景按天气类型交叉淡入切换；3 层视差云雾；Canvas 粒子（雨 / 雪 / 雾 / 浮尘） |
| 昼夜与天气色调 | 夜间自动叠加深蓝调，黄昏叠加暖橙调，雨雪叠加冷色调 |
| 人物立绘 | 5 套穿搭立绘，按体感温度与天气自动切换，带呼吸浮动动画与接地阴影 |
| 穿搭推荐 | 上装 / 下装 / 外搭 / 鞋履 / 配饰 / 材质 / 配色 + 可视化色板 |
| 出行建议 | 穿搭层数、必带物品、时段路线建议、注意事项 |
| 今日笺 | 一句不超过 30 字的当日提示 |
| 城市搜索 | 接入 Open-Meteo 地理编码，支持中英文城市名 |
| 定位 | 浏览器 Geolocation + OpenStreetMap 反查地名 |
| 换一套 | 重新生成一套配色与配饰方向不同的方案 |
| AI 配置面板 | 在页面内填 Base URL / 模型 / API Key，自带连通性测试；面板内可直接查看完整系统提示词 |
| 降级机制 | 模型调用失败自动回落到本地规则引擎，并在状态栏注明原因 |

## 三、技术栈

- **纯静态**：HTML + CSS + 原生 JavaScript，零依赖、零构建、零后端
- **天气数据**：Open-Meteo Forecast & Geocoding API（**免注册、免密钥**）
- **可选 AI**：任意 OpenAI 兼容的 `chat/completions` 接口（MiniMax / DeepSeek / Moonshot / 智谱 / 通义 / SiliconFlow / Ollama 均可）
- **动效**：CSS 3D transform + Canvas 2D 粒子系统，全站尊重 `prefers-reduced-motion`

## 四、文件结构

```
ai-outfit-assistant/
├── index.html              # 页面结构
├── css/
│   └── style.css           # 视觉系统：3D 场景、玻璃面板、天气动效、响应式
├── js/
│   ├── config.js           # 天气字典、穿搭分级、AI 提示词、本地降级规则引擎
│   ├── weather.js          # Open-Meteo 天气 / 城市搜索 / 地名反查
│   ├── ai.js               # 大模型调用层（JSON 容错解析 + 自动降级）
│   └── app.js              # 页面主逻辑：数据流、渲染、粒子系统、交互
├── assets/img/
│   ├── scenes/             # 4 张 3D 山野背景（AI 生成）
│   └── characters/         # 5 张穿搭立绘（AI 生成 + 抠图，透明背景）
├── gen/
│   ├── requests.json       # 图像生成提示词全文（可复现）
│   ├── manifest.json       # 素材节点 ID 与说明
│   ├── finalize.py         # 抠图后裁边 / 缩放 / 压缩
│   ├── preview.py          # 生成素材总览图
│   ├── desktop-check.html  # 开发辅助：在窄屏面板里校验 1440px 桌面布局
│   └── preview-assets.png  # 素材总览
├── screenshot-desktop.png  # 成品截图（桌面端）
└── screenshot-mobile.png   # 成品截图（移动端）
```

## 五、本地运行

直接双击 `index.html` 大概率能用，但**推荐用本地服务器**，否则浏览器可能拦截定位与跨域请求：

```bash
cd ai-outfit-assistant
python -m http.server 8123
# 然后打开 http://127.0.0.1:8123
```

部署到任何静态托管（GitHub Pages / Vercel / Netlify / 校园服务器）均可，纯静态无需服务端。

## 六、接入大模型

1. 点右上角 **「AI 设置」**（金色齿轮按钮）打开「AI 配置」面板；
2. 填写三项：

   | 字段 | 示例 | 说明 |
   |---|---|---|
   | 接口地址 Base URL | `https://api.minimax.chat/v1` | 不要带 `/chat/completions`，程序会自动拼接 |
   | 模型 Model | `MiniMax-M2` | 任意支持中文与 JSON 输出的模型 |
   | API Key | `sk-...` | 只保存在你自己浏览器的 localStorage，不经过任何第三方 |

3. 点 **保存并测试**，显示"连接正常"即接入成功，页面右上角的标签会从「演示模式」变成「AI · 模型名」。

> 不配置也能用：此时由 `js/config.js` 中的本地规则引擎生成建议，状态栏会标注"本地规则引擎（未配置 API Key）"。

## 七、AI 使用说明

> 这一节对应作业评分表里常见的"AI 使用说明"项，如实记录本项目中 AI 参与的全部环节。

### 7.1 图像生成（9 张）

使用 **MiniMax 图像生成**能力，提示词全文保存在 `gen/requests.json`，可完整复现。

**场景图（4 张，16:9 / 2K）** — 提示词结构：

```
Cinematic 3D render of a vast Chinese landscape, realistic ancient China,
fused with traditional green-and-blue landscape painting (qinglue shanshui)
and ink-wash aesthetics. <天气与光线条件描述>. Atmospheric perspective,
drifting mist, soft volumetric light, photorealistic PBR materials,
ultra detailed, wide establishing shot, no people, no text, no watermark
```

**人物立绘（5 张，3:4 / 2K）** — 提示词结构：

```
Cinematic 3D game character render, full body standing, three-quarter view,
realistic ancient Chinese clothing. <具体服装描述>. Anatomically correct adult
proportions, detailed fabric folds and cloth physics, soft rim lighting,
semi-realistic realistic rendering, character concept art, centered composition,
isolated on a solid pure white background, no scenery, no ground shadow, no text
```

**关键设计决策**：所有立绘统一使用"纯白背景 + 同一机位 + 同一光照"，这样抠图后可以无缝替换，视觉上像同一个人的不同穿搭，而不是五张拼贴。

**后处理**：AI 抠图工具去除背景 → `gen/finalize.py`（Pillow）裁掉透明边、等比缩放到 1200px 高、压缩体积。

### 7.2 代码生成

使用 AI 编程助手生成本项目的 HTML / CSS / JS 初版，随后**逐文件人工审查并修正**了以下实际缺陷（这些是初版真实存在的问题，也是本项目区别于"直接抄 AI 输出"的关键）：

| # | 问题 | 修正 |
|---|---|---|
| 1 | 场景图交叉淡入时，若目标图与当前活动图 `src` 相同会提前 `return`，导致切换城市后背景停留在上一城市 | 改为比较"当前活动图"与目标 src，并处理缓存命中情况 |
| 2 | 本地规则引擎多个温度分支的文案带 `体感` 前缀，与模板拼接后出现"体感体感寒冷" | 统一去掉分支内的前缀 |
| 3 | 建议摘要拼接时句号重复（`…不易干爽。。`） | 改为按分句截取并清理尾部标点 |
| 4 | 立绘超出中列容器，把穿搭分级徽章挤出视口 | 中列改为视口高度约束 + 立绘 `flex` 自适应 |
| 5 | "换一套"在本地降级模式下输出完全不变 | 本地引擎加入配饰 / 配色 / 点句的轮换表 |
| 6 | 立绘由 JPG 换成透明 PNG 后，代码中路径未同步 | 同步更新 `config.js` 与 `index.html` |

另外还补充了初版没有的能力：昼夜色调切换、天气粒子系统、24 小时预报条、配置面板的连通性测试与提示词预览。

### 7.3 运行时大模型调用（核心功能）

这是 AI **真正参与功能逻辑**的部分，而非装饰。

**系统提示词**（完整版可在页面的「AI 配置 → 查看系统提示词」中直接看到）：

```
你是一位精通中式东方美学的穿搭顾问兼出行策划师，同时具备严谨的天气数据解读能力。
风格要求：语言凝练雅致，可以适度使用中式意象（月白、青竹、鸦青、松针、绛紫等）来描述服装与配色，
但每一条都必须落到可执行的具体信息：材质、厚度、颜色、款式、随身物品。禁止只有意象没有实操。

严格只输出一个 JSON 对象，不要输出任何解释文字，不要用 Markdown 代码块包裹，不要输出 JSON 以外的字符。
（后接完整 JSON 结构定义）
```

**用户提示词**由实时天气动态拼装：地点、时间、天气状态、当前温度 / 体感 / 最高最低温、风力风向、阵风、湿度、降水量与概率、云量、紫外线、日出日落。

**输出结构**：模型必须返回固定 JSON（`outfit` / `travel` / `daily_note` 三段），前端据此渲染。工程上的三点处理：

1. **容错解析**：容忍模型输出的 ```` ```json ```` 包裹、前后废话、尾随逗号（`js/ai.js` 的 `parseLoose`）；
2. **字段补全**：模型漏字段时用本地规则引擎的结果兜底，绝不出现空白卡片；
3. **故障降级**：接口超时 / 报错 / 返回非 JSON，自动切回本地引擎，并在状态栏写明失败原因与错误信息。

**交互闭环**：点「换一套」会追加一条额外指令（"更换配色与材质方向，但同样要贴合今日气温与天气"），让模型给出不同方案，而不是简单重试。

## 八、数据来源

| 数据 | 来源 | 协议 |
|---|---|---|
| 实时天气 / 小时预报 / 紫外线 | [Open-Meteo](https://open-meteo.com/) Forecast API | CC BY 4.0，免密钥 |
| 城市检索 | Open-Meteo Geocoding API | 同上 |
| 地名反查 | [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) | ODbL |
| 全部美术资源 | AI 生成（MiniMax 图像生成） | 本项目自用 |

## 九、已知限制

- **定位功能需要安全上下文**：`file://` 直接打开时浏览器会禁用 Geolocation，请用本地服务器或部署到 HTTPS。
- **AI 建议受模型输出质量影响**：不同模型对"中文 + 严格 JSON"的遵循度不同；程序已做容错，但极端情况可能退回本地引擎。
- **立绘是预生成的 5 张**，不是实时 3D 模型；极端气温（如 35°C 或 -15°C）会取最接近的一档。
- **Nominatim 有速率限制**（约 1 次/秒），仅用于定位后的地名反查，不影响主流程。

## 十、美术风格说明

整体视觉取向为**写实中式山水**：青绿设色的层叠远山、大气透视、水墨云雾、写实 PBR 材质与柔和体积光，交互参考了当代国产开放世界武侠游戏的美术方向。**所有图像均由 AI 生成**，不含任何第三方游戏截图、角色或素材，仅在"色调与氛围"层面向中式写实武侠审美致意。

字体使用 Google Fonts 的 Noto Serif SC（思源宋体），已配置系统衬线字体作为回退，离线时仍可正常显示。
