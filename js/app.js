/* ============================================================
   app.js —— 页面主逻辑
   天气 → 场景 / 立绘 / 指标 → AI（或本地）建议 → 渲染
   ============================================================ */

(() => {
  'use strict';

  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const el = {
    boot: $('#boot'),
    sceneImgA: $('#sceneImgA'), sceneImgB: $('#sceneImgB'),
    sceneTint: $('#sceneTint'), sceneFx: $('#sceneFx'),
    cityInput: $('#cityInput'), searchResults: $('#searchResults'),
    geoBtn: $('#geoBtn'), settingsBtn: $('#settingsBtn'),
    cityName: $('#cityName'), condText: $('#condText'), tempNow: $('#tempNow'),
    feelsNow: $('#feelsNow'), rangeText: $('#rangeText'), weatherIcon: $('#weatherIcon'),
    mWind: $('#mWind'), mHumidity: $('#mHumidity'), mPrecip: $('#mPrecip'),
    mUv: $('#mUv'), mSunrise: $('#mSunrise'), mSunset: $('#mSunset'),
    hourlyStrip: $('#hourlyStrip'), updatedAt: $('#updatedAt'),
    figureImg: $('#figureImg'), tierName: $('#tierName'), tierTip: $('#tierTip'),
    outfitTitle: $('#outfitTitle'), outfitSummary: $('#outfitSummary'),
    outfitSlots: $('#outfitSlots'), paletteRow: $('#paletteRow'),
    travelSummary: $('#travelSummary'), travelTips: $('#travelTips'),
    dailyNote: $('#dailyNote'), aiChip: $('#aiChip'), sourceChip: $('#sourceChip'),
    rerollBtn: $('#rerollBtn'), statusLeft: $('#statusLeft'),
    modal: $('#settingsModal'), cfgBaseUrl: $('#cfgBaseUrl'), cfgModel: $('#cfgModel'),
    cfgKey: $('#cfgKey'), cfgTemp: $('#cfgTemp'), tempVal: $('#tempVal'),
    cfgSave: $('#cfgSave'), cfgStatus: $('#cfgStatus'), promptPreview: $('#promptPreview'),
    cfgFetchModels: $('#cfgFetchModels'), modelList: $('#modelList')
  };

  let currentWeather = null;
  let currentTier = null;
  let rerollCount = 0;
  let fx = null;

  const LS_CITY = 'yunshan.lastCity';

  /* ============================================================
     天气 → 视觉映射
     ============================================================ */
  function figureFor(w){
    const t = w.feelsLike;
    const rainy = w.group === 'rain' || w.group === 'storm';
    if (rainy && t >= 14) return RAIN_TIER;
    return pickTier(t);
  }

  function tintFor(w){
    const hour = Number(String(w.localTime || '').slice(11, 13));
    if (!w.isDay) return 'is-night';
    if (hour >= 16 && hour <= 19) return 'is-dusk';
    if (w.group === 'rain' || w.group === 'storm') return 'is-rain';
    if (w.group === 'snow') return 'is-snow';
    return '';
  }

  function swapScene(src){
    const active = el.sceneImgA.classList.contains('is-active') ? el.sceneImgA : el.sceneImgB;
    if (active.getAttribute('src') === src) return;          // 当前已是目标场景
    const next = active === el.sceneImgA ? el.sceneImgB : el.sceneImgA;
    const show = () => { next.classList.add('is-active'); active.classList.remove('is-active'); };
    if (next.getAttribute('src') === src){
      if (next.complete) show(); else next.onload = show;
    } else {
      next.onload = show;
      next.src = src;
    }
  }

  function setTier(t){
    if (currentTier && currentTier.key === t.key) return;
    currentTier = t;
    el.figureImg.style.opacity = '0';
    setTimeout(() => {
      el.figureImg.src = t.img;
      el.figureImg.style.opacity = '1';
    }, 220);
    el.tierName.textContent = t.name;
    el.tierTip.textContent = t.tip;
  }

  /* ============================================================
     渲染
     ============================================================ */
  function renderWeather(w){
    el.cityName.textContent = w.city + (w.country ? ' · ' + w.country : '');
    el.condText.textContent = w.condition + (w.isDay ? '' : ' · 夜间');
    el.tempNow.textContent = w.temp;
    el.feelsNow.textContent = w.feelsLike;
    el.rangeText.textContent = `${w.tempMin}° ~ ${w.tempMax}°`;
    el.weatherIcon.innerHTML = iconFor(w.code, w.isDay);

    el.mWind.innerHTML = `${w.wind} <small>km/h</small><span class="metric__sub">${w.windDir}</span>`;
    el.mHumidity.textContent = w.humidity + '%';
    el.mPrecip.textContent = w.precipProb + '%';
    el.mUv.textContent = w.uv;
    el.mSunrise.textContent = w.sunrise;
    el.mSunset.textContent = w.sunset;

    el.updatedAt.textContent = '更新于 ' + w.localTime.slice(11);
    el.sourceChip.textContent = 'Open-Meteo · ' + w.timezone;

    // 24 小时
    el.hourlyStrip.innerHTML = '';
    w.hours.forEach((h, i) => {
      const d = document.createElement('div');
      d.className = 'hour' + (i === 0 ? ' is-now' : '');
      d.innerHTML =
        `<div class="hour__t">${String(h.time).slice(11, 13)}:00</div>` +
        `<div class="hour__i">${iconFor(h.code, true)}</div>` +
        `<div class="hour__v">${Math.round(h.temp)}°</div>` +
        (h.pop != null && h.pop > 0 ? `<div class="hour__p">${h.pop}%</div>` : '<div class="hour__p">&nbsp;</div>');
      el.hourlyStrip.appendChild(d);
    });
  }

  function renderAdvice(res){
    const o = res.outfit, t = res.travel;
    el.outfitTitle.textContent = o.title;
    el.outfitSummary.textContent = o.summary;

    const slots = [
      ['上装', o.upper], ['下装', o.lower], ['外搭', o.outer],
      ['鞋履', o.shoes], ['材质', o.materials], ['配色', o.colors]
    ];
    el.outfitSlots.innerHTML = '';
    slots.forEach(([k, v]) => {
      const li = document.createElement('div');
      li.className = 'slot';
      li.innerHTML = `<dt>${k}</dt><dd>${escapeHtml(v || '—')}</dd>`;
      el.outfitSlots.appendChild(li);
    });

    const acc = (o.accessories || []).filter(Boolean);
    if (acc.length){
      const li = document.createElement('div');
      li.className = 'slot';
      li.innerHTML = `<dt>配饰</dt><dd>${escapeHtml(acc.join('、'))}</dd>`;
      el.outfitSlots.appendChild(li);
    }

    // 配色色板
    el.paletteRow.innerHTML = '';
    (res.palette || []).forEach(p => {
      const s = document.createElement('span');
      s.className = 'swatch';
      s.innerHTML = `<i style="background:${escapeHtml(p.hex)}"></i>${escapeHtml(p.name)}`;
      el.paletteRow.appendChild(s);
    });

    el.travelSummary.textContent = t.summary;
    el.travelTips.innerHTML = '';
    const lines = [];
    if (t.layers) lines.push('穿搭层数：' + t.layers);
    if (t.route) lines.push(t.route);
    (t.gear || []).forEach(g => lines.push('必带：' + g));
    (t.cautions || []).forEach(c => lines.push('注意：' + c));
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line;
      el.travelTips.appendChild(li);
    });

    el.dailyNote.textContent = res.daily_note || '';

    // 来源标识
    if (res.source === 'ai'){
      el.aiChip.textContent = 'AI · ' + (res.model || '在线模型');
      el.aiChip.className = 'chip chip--live';
      el.statusLeft.textContent = '数据来源：Open-Meteo · 建议模型：' + (res.model || '在线大模型');
    } else if (res.source === 'fallback'){
      el.aiChip.textContent = '已降级';
      el.aiChip.className = 'chip';
      el.statusLeft.textContent = '数据来源：Open-Meteo · 模型调用失败（' + (res.error || '未知错误') + '），已使用本地规则引擎';
    } else {
      el.aiChip.textContent = '演示模式';
      el.aiChip.className = 'chip chip--ai';
      el.statusLeft.textContent = '数据来源：Open-Meteo · 建议模型：本地规则引擎（未配置 API Key）';
    }
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================
     数据流
     ============================================================ */
  async function loadPlace(place, opts = {}){
    try {
      const w = await Weather.fetchWeather(place);
      currentWeather = w;
      renderWeather(w);
      swapScene(SCENES[w.group] || SCENES.cloud);
      el.sceneTint.className = 'scene-tint ' + tintFor(w);
      setTier(figureFor(w));
      updateFx(w);
      if (!opts.silent) try { localStorage.setItem(LS_CITY, JSON.stringify(place)); } catch (e) {}
      await refreshAdvice();
    } catch (e){
      el.cityName.textContent = place.name;
      el.condText.textContent = '天气获取失败：' + e.message;
    }
  }

  async function refreshAdvice(){
    if (!currentWeather) return;
    const variant = rerollCount > 0
      ? '请给出一套与上次不同的方案：更换配色与材质方向，但同样要贴合今日气温与天气。'
      : '';
    const res = await AI.recommend(currentWeather, variant, rerollCount);
    renderAdvice(res);
  }

  /* ============================================================
     城市搜索
     ============================================================ */
  let searchTimer = null;
  el.cityInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = el.cityInput.value.trim();
    if (!q){ el.searchResults.hidden = true; return; }
    searchTimer = setTimeout(async () => {
      try {
        const list = await Weather.searchCities(q);
        renderResults(list);
      } catch (e){
        el.searchResults.innerHTML = '<div class="empty">搜索失败：' + escapeHtml(e.message) + '</div>';
        el.searchResults.hidden = false;
      }
    }, 350);
  });

  function renderResults(list){
    if (!list.length){
      el.searchResults.innerHTML = '<div class="empty">没有找到匹配的城市</div>';
    } else {
      el.searchResults.innerHTML = '';
      list.forEach(c => {
        const b = document.createElement('button');
        b.innerHTML = `${escapeHtml(c.name)}<small>${escapeHtml([c.admin, c.country].filter(Boolean).join(' · '))}</small>`;
        b.addEventListener('click', () => {
          el.searchResults.hidden = true;
          el.cityInput.value = c.name;
          loadPlace(c);
        });
        el.searchResults.appendChild(b);
      });
    }
    el.searchResults.hidden = false;
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) el.searchResults.hidden = true;
  });

  /* 定位 */
  el.geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation){
      el.condText.textContent = '当前浏览器不支持定位，请使用搜索';
      return;
    }
    el.geoBtn.style.opacity = '.5';
    navigator.geolocation.getCurrentPosition(async (pos) => {
      el.geoBtn.style.opacity = '1';
      const { latitude: lat, longitude: lon } = pos.coords;
      let name = '当前位置', country = '';
      const rev = await Weather.reverseName(lat, lon);
      if (rev){ name = rev.name; country = rev.country; }
      loadPlace({ name, country, lat, lon });
    }, () => {
      el.geoBtn.style.opacity = '1';
      el.condText.textContent = '定位被拒绝，请使用城市搜索';
    }, { timeout: 8000 });
  });

  /* ============================================================
     粒子特效（雨 / 雪 / 浮尘）
     ============================================================ */
  function updateFx(w){
    const type = (w.group === 'rain' || w.group === 'storm') ? 'rain'
              : (w.group === 'snow') ? 'snow'
              : (w.group === 'fog') ? 'mist'
              : 'dust';
    if (fx && fx.type === type) return;
    fx = createFx(el.sceneFx, type);
  }

  function createFx(canvas, type){
    if (fx && fx.stop) fx.stop();
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, parts = [], raf = 0, alive = true;

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function seed(){
      const n = type === 'rain' ? 190 : type === 'snow' ? 150 : type === 'mist' ? 26 : 60;
      parts = [];
      for (let i = 0; i < n; i++) parts.push(spawn(true));
    }
    function spawn(anywhere){
      if (type === 'rain'){
        return { x: Math.random() * (W + 200) - 100, y: anywhere ? Math.random() * H : -20,
                 len: 12 + Math.random() * 22, v: 7 + Math.random() * 9, o: 0.12 + Math.random() * 0.3 };
      }
      if (type === 'snow'){
        return { x: Math.random() * W, y: anywhere ? Math.random() * H : -10,
                 r: 1 + Math.random() * 2.6, v: 0.5 + Math.random() * 1.1,
                 dx: (Math.random() - 0.5) * 0.7, o: 0.35 + Math.random() * 0.5, p: Math.random() * 6.28 };
      }
      if (type === 'mist'){
        return { x: Math.random() * W, y: Math.random() * H, r: 60 + Math.random() * 120,
                 vx: 0.12 + Math.random() * 0.25, o: 0.03 + Math.random() * 0.05 };
      }
      return { x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.6,
               v: 0.06 + Math.random() * 0.22, dx: (Math.random() - 0.5) * 0.3,
               o: 0.14 + Math.random() * 0.3, p: Math.random() * 6.28 };
    }
    function frame(){
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      if (type === 'rain'){
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(190,220,240,1)';
        for (const p of parts){
          ctx.globalAlpha = p.o;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.22, p.y + p.len);
          ctx.stroke();
          p.y += p.v; p.x -= p.v * 0.22;
          if (p.y > H + 20){ Object.assign(p, spawn(false)); p.x = Math.random() * (W + 200) - 60; }
        }
      } else if (type === 'snow'){
        ctx.fillStyle = 'rgba(240,248,255,1)';
        for (const p of parts){
          ctx.globalAlpha = p.o;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(Date.now() / 900 + p.p) * 8, p.y, p.r, 0, 6.283);
          ctx.fill();
          p.y += p.v; p.x += p.dx + Math.sin(Date.now() / 700 + p.p) * 0.3;
          if (p.y > H + 8) Object.assign(p, spawn(false));
          if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        }
      } else if (type === 'mist'){
        for (const p of parts){
          ctx.globalAlpha = p.o;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(225,235,240,1)');
          g.addColorStop(1, 'rgba(225,235,240,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          p.x += p.vx;
          if (p.x - p.r > W) p.x = -p.r;
        }
      } else {
        ctx.fillStyle = 'rgba(240,235,210,1)';
        for (const p of parts){
          ctx.globalAlpha = p.o;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(Date.now() / 1100 + p.p) * 12, p.y, p.r, 0, 6.283);
          ctx.fill();
          p.y -= p.v;
          if (p.y < -8) Object.assign(p, spawn(false));
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    resize();
    frame();
    return {
      type,
      stop(){ alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); }
    };
  }

  /* ============================================================
     视差
     ============================================================ */
  window.addEventListener('mousemove', (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty('--mx', (x * 26).toFixed(1) + 'px');
    document.documentElement.style.setProperty('--my', (y * 18).toFixed(1) + 'px');
  });

  /* ============================================================
     换一套
     ============================================================ */
  el.rerollBtn.addEventListener('click', async () => {
    el.rerollBtn.classList.add('is-busy');
    rerollCount++;
    await refreshAdvice();
    el.rerollBtn.classList.remove('is-busy');
  });

  /* ============================================================
     设置面板
     ============================================================ */
  el.promptPreview.textContent = SYSTEM_PROMPT;

  function openModal(){
    const c = AI.getConfig();
    el.cfgBaseUrl.value = c.baseUrl;
    el.cfgModel.value = c.model;
    el.cfgKey.value = c.key;
    el.cfgTemp.value = c.temperature;
    el.tempVal.textContent = c.temperature;
    el.cfgStatus.textContent = '';
    el.cfgStatus.className = 'modal__status';
    el.modal.hidden = false;
  }
  el.settingsBtn.addEventListener('click', openModal);
  $$('[data-close]').forEach(b => b.addEventListener('click', () => { el.modal.hidden = true; }));
  el.cfgTemp.addEventListener('input', () => { el.tempVal.textContent = el.cfgTemp.value; });

  el.cfgSave.addEventListener('click', async () => {
    AI.saveConfig({
      baseUrl: el.cfgBaseUrl.value.trim(),
      model: el.cfgModel.value.trim(),
      key: el.cfgKey.value.trim(),
      temperature: Number(el.cfgTemp.value)
    });
    el.cfgStatus.textContent = '正在测试连接…';
    el.cfgStatus.className = 'modal__status';
    const r = await AI.test();
    el.cfgStatus.textContent = r.message;
    el.cfgStatus.className = 'modal__status ' + (r.ok ? 'is-ok' : 'is-err');
    if (r.ok && currentWeather) refreshAdvice();
  });

  /* 拉取账号可用模型：避免手填模型名出错 */
  el.cfgFetchModels.addEventListener('click', async () => {
    const base = el.cfgBaseUrl.value.trim();
    const key = el.cfgKey.value.trim();
    if (!key){
      el.cfgStatus.textContent = '请先填写 API Key，再拉取模型列表';
      el.cfgStatus.className = 'modal__status is-err';
      return;
    }
    if (!base){
      el.cfgStatus.textContent = '请先填写接口地址';
      el.cfgStatus.className = 'modal__status is-err';
      return;
    }
    el.cfgFetchModels.classList.add('is-busy');
    el.cfgStatus.textContent = '正在读取模型列表…';
    el.cfgStatus.className = 'modal__status';
    const r = await AI.listModels(base, key);
    el.cfgFetchModels.classList.remove('is-busy');
    el.cfgStatus.textContent = r.message;
    el.cfgStatus.className = 'modal__status ' + (r.ok ? 'is-ok' : 'is-err');
    if (r.ok && r.models.length){
      el.modelList.innerHTML = '';
      r.models.forEach(id => {
        const o = document.createElement('option');
        o.value = id;
        el.modelList.appendChild(o);
      });
      // 当前填的模型不存在于列表时，自动选一个文本模型
      const cur = el.cfgModel.value.trim();
      if (!r.models.includes(cur)){
        const prefer = r.models.find(m => /^MiniMax-M\d/i.test(m) && !/highspeed/i.test(m))
                   || r.models.find(m => /text|chat/i.test(m))
                   || r.models[0];
        el.cfgModel.value = prefer;
      }
      el.cfgStatus.textContent = r.message + '，已填入「' + el.cfgModel.value + '」';
    }
  });

  /* ============================================================
     启动
     ============================================================ */
  async function boot(){
    AI.loadConfig();

    // 上次访问的城市
    let place = null;
    try {
      const raw = localStorage.getItem(LS_CITY);
      if (raw) place = JSON.parse(raw);
    } catch (e) {}

    if (!place) place = DEMO_CITIES[0];

    try {
      await loadPlace(place);
    } catch (e) { /* 已在 loadPlace 内处理 */ }

    setTimeout(() => el.boot.classList.add('is-hidden'), 420);

    // 首次访问尝试定位（静默，失败不打扰）
    if (!localStorage.getItem(LS_CITY) && navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const rev = await Weather.reverseName(lat, lon);
        loadPlace({ name: rev?.name || '当前位置', country: rev?.country || '', lat, lon });
      }, () => {}, { timeout: 6000 });
    }
  }

  boot();
})();
