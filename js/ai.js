/* ============================================================
   ai.js —— 大模型推荐层
   1) 已配置 API Key：走 OpenAI 兼容的 chat/completions 接口
   2) 未配置 / 调用失败：自动降级到 config.js 里的本地规则引擎
   API Key 只保存在浏览器 localStorage，不上传任何第三方服务器
   ============================================================ */

const AI = (() => {

  const LS_KEY = 'yunshan.ai.config';
  const DEFAULTS = {
    baseUrl: 'https://api.minimax.cn/v1',   // M Plan 订阅 Key 专用域名
    model: 'MiniMax-M3.1-Flash',
    key: '',
    temperature: 0.8
  };

  let cfg = { ...DEFAULTS };

  /* ---------- 配置读写 ---------- */
  function loadConfig(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) cfg = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) { /* localStorage 不可用时用默认值 */ }
    return cfg;
  }
  function saveConfig(next){
    cfg = { ...cfg, ...next };
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) {}
    return cfg;
  }
  function getConfig(){ return { ...cfg }; }
  function isConfigured(){ return !!(cfg.key && cfg.baseUrl && cfg.model); }

  /* ---------- 按服务商适配请求体 ----------
     MiniMax 的 M3 系列强制开启深度思考（thinking:disabled 直接 400），
     且 max_tokens 已弃用 —— 必须用 max_completion_tokens 给「思考 + 正文」留够预算，
     否则思考链会把预算吃光，正文 content 为空、finish_reason=length。
     reasoning_effort 默认是 max，显式降到 low 才能在几百 token 内出正文。 */
  const TOKEN_BUDGET = 16000;
  function isMiniMax(baseUrl){ return /minimax/i.test(String(baseUrl || '')); }
  function buildBody(messages, budget){
    const body = {
      model: cfg.model,
      messages: messages,
      temperature: Number(cfg.temperature),
      stream: false
    };
    if (isMiniMax(cfg.baseUrl)){
      body.max_completion_tokens = budget || TOKEN_BUDGET;
      body.reasoning_effort = 'low';
    } else {
      body.max_tokens = budget || 3000;
    }
    return body;
  }

  /* ---------- JSON 解析容错 ---------- */
  function parseLoose(text){
    if (!text) return null;
    let s = String(text).trim();
    // 去掉 ```json ... ``` 包裹
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    // 截取最外层 JSON
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    try { return JSON.parse(s); } catch (e) {}
    // 二次尝试：修复尾随逗号
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
    return null;
  }

  /* ---------- 调用大模型 ---------- */
  async function callModel(weather, variant){
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const body = buildBody([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserPrompt(weather) }
    ]);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + cfg.key
        },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error('HTTP ' + res.status + ' ' + t.slice(0, 160));
      }
      const data = await res.json();
      const choice = data?.choices?.[0] || {};
      const msg = choice.message || {};
      let content = msg.content;

      // 开启思考的模型，最终答案偶尔会落在 reasoning 字段里
      if (!content || !String(content).trim()){
        if (Array.isArray(msg.reasoning_details)){
          content = msg.reasoning_details.map(x => x?.text || '').join('\n');
        } else if (msg.reasoning_content){
          content = msg.reasoning_content;
        }
      }
      const obj = parseLoose(content);
      if (!obj || !obj.outfit){
        if (choice.finish_reason === 'length'){
          throw new Error('模型输出被长度上限截断（思考过程占满预算），请调大 max_completion_tokens 或降低 reasoning_effort');
        }
        throw new Error('返回内容不是预期的 JSON（finish_reason=' + (choice.finish_reason || '未知') + '）');
      }
      return { data: obj, raw: content, model: data?.model || cfg.model };
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  /* ---------- 拉取账号可用模型 ---------- */
  async function listModels(baseUrl, key){
    const url = baseUrl.replace(/\/+$/, '') + '/models';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + key },
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = 'HTTP ' + res.status;
        try {
          const j = JSON.parse(t);
          msg += ' ' + (j?.error?.message || j?.message || '');
        } catch (e) { msg += ' ' + t.slice(0, 120); }
        return { ok: false, message: msg };
      }
      const d = await res.json();
      const arr = d?.data || d?.models || [];
      const ids = arr
        .map(m => (typeof m === 'string' ? m : (m?.id || m?.name || m?.model)))
        .filter(Boolean);
      return { ok: true, models: ids, message: '拉取成功，共 ' + ids.length + ' 个可用模型' };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, message: e.name === 'AbortError' ? '请求超时' : e.message };
    }
  }

  /* ---------- 连通性测试 ---------- */
  async function test(){
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify(buildBody([{ role: 'user', content: '回复两个字：可用' }], 2048)),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      const choice = d?.choices?.[0] || {};
      const msg = choice.message || {};
      // 深度思考模型可能正文为空，此时取思考内容让用户看到模型确实在动
      const txt = msg.content || msg.reasoning_content || '';
      const preview = String(txt).trim().slice(0, 20);
      return { ok: true, message: '连接正常，模型回复：' + (preview || '（模型仅返回思考内容，finish_reason=' + (choice.finish_reason || '未知') + '）') };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, message: '连接失败：' + e.message };
    }
  }

  /* ---------- 补全缺失字段 ---------- */
  function fill(obj, weather){
    const base = localRecommend(weather);
    const o = obj.outfit || {};
    const t = obj.travel || {};
    const arr = (v, d) => (Array.isArray(v) && v.length) ? v : d;
    const str = (v, d) => (typeof v === 'string' && v.trim()) ? v.trim() : d;
    return {
      outfit: {
        title:     str(o.title, base.outfit.title),
        summary:   str(o.summary, base.outfit.summary),
        upper:     str(o.upper, base.outfit.upper),
        lower:     str(o.lower, base.outfit.lower),
        outer:     str(o.outer, base.outfit.outer),
        shoes:     str(o.shoes, base.outfit.shoes),
        accessories: arr(o.accessories, base.outfit.accessories),
        materials: str(o.materials, base.outfit.materials),
        colors:    str(o.colors, base.outfit.colors),
        style_note: str(o.style_note, base.outfit.style_note)
      },
      travel: {
        summary:  str(t.summary, base.travel.summary),
        layers:   str(t.layers, base.travel.layers),
        gear:     arr(t.gear, base.travel.gear),
        route:    str(t.route, base.travel.route),
        cautions: arr(t.cautions, base.travel.cautions)
      },
      daily_note: str(obj.daily_note, base.daily_note),
      palette: base.palette
    };
  }

  /* ---------- 对外主入口 ---------- */
  async function recommend(weather, variant, variantIndex = 0){
    if (isConfigured()){
      try {
        const r = await callModel(weather, variant);
        return { ...fill(r.data, weather), source: 'ai', model: r.model };
      } catch (e){
        const fb = localRecommend(weather, variantIndex);
        return { ...fb, source: 'fallback', error: e.message };
      }
    }
    return { ...localRecommend(weather, variantIndex), source: 'local' };
  }

  return { loadConfig, saveConfig, getConfig, isConfigured, recommend, test, listModels, parseLoose };
})();
