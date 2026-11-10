/* ============================================================
   weather.js —— Open-Meteo 天气 / 城市搜索 / 地理编码
   全部使用免密钥的公开接口，可直接部署到任意静态托管
   ============================================================ */

const Weather = (() => {

  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  const GEO_URL      = 'https://geocoding-api.open-meteo.com/v1/search';
  const REVERSE_URL  = 'https://nominatim.openstreetmap.org/reverse';

  const CURRENT_VARS = [
    'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
    'precipitation', 'weather_code', 'cloud_cover',
    'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
  ].join(',');

  const HOURLY_VARS = ['temperature_2m', 'weather_code', 'precipitation_probability'].join(',');
  const DAILY_VARS = [
    'weather_code', 'temperature_2m_max', 'temperature_2m_min',
    'sunrise', 'sunset', 'uv_index_max', 'precipitation_probability_max'
  ].join(',');

  /* ---------- 工具 ---------- */
  const DIRS = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  function windDir(deg){
    if (deg == null) return '—';
    return DIRS[Math.round(((deg % 360) / 45)) % 8];
  }
  function uvLabel(uv){
    if (uv == null) return '—';
    if (uv < 3) return uv + ' 弱';
    if (uv < 6) return uv + ' 中等';
    if (uv < 8) return uv + ' 强';
    if (uv < 11) return uv + ' 很高';
    return uv + ' 极高';
  }
  function hhmm(iso){
    if (!iso) return '—';
    return String(iso).slice(11, 16);
  }

  /* ---------- 城市搜索 ---------- */
  async function searchCities(name){
    const url = `${GEO_URL}?name=${encodeURIComponent(name)}&count=8&language=zh&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('城市搜索失败 HTTP ' + res.status);
    const data = await res.json();
    return (data.results || []).map(r => ({
      name: r.name,
      country: r.country || '',
      admin: r.admin1 || '',
      lat: r.latitude,
      lon: r.longitude
    }));
  }

  /* ---------- 反查地名 ---------- */
  async function reverseName(lat, lon){
    try {
      const url = `${REVERSE_URL}?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-CN&zoom=10`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const d = await res.json();
      const a = d.address || {};
      const name = a.city || a.town || a.county || a.state || a.province;
      if (!name) return null;
      return { name, country: a.country || '' };
    } catch (e) {
      return null;
    }
  }

  /* ---------- 取天气 ---------- */
  async function fetchWeather(place){
    const url = `${FORECAST_URL}?latitude=${place.lat}&longitude=${place.lon}` +
      `&current=${CURRENT_VARS}&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
      `&timezone=auto&forecast_days=2&wind_speed_unit=kmh&timeformat=iso8601`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('天气接口 HTTP ' + res.status);
    const d = await res.json();

    const c = d.current || {};
    const day = d.daily || {};
    const h = d.hourly || {};

    const code = c.weather_code;
    const meta = wmoOf(code);

    // 从当前小时起取 24 小时
    let startIdx = 0;
    if (h.time && c.time) {
      const idx = h.time.findIndex(t => t >= c.time.slice(0, 13) + ':00');
      startIdx = idx >= 0 ? idx : 0;
    }
    const hours = [];
    for (let i = startIdx; i < Math.min(startIdx + 24, (h.time || []).length); i++) {
      hours.push({
        time: h.time[i],
        temp: h.temperature_2m[i],
        code: h.weather_code[i],
        pop: h.precipitation_probability ? h.precipitation_probability[i] : null
      });
    }

    return {
      city: place.name,
      country: place.country || '',
      lat: place.lat,
      lon: place.lon,
      timezone: d.timezone,
      localTime: (c.time || '').replace('T', ' ').slice(0, 16),

      condition: meta.label,
      group: meta.group,
      code: code,
      isDay: c.is_day === 1,

      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      tempMax: Math.round((day.temperature_2m_max || [])[0]),
      tempMin: Math.round((day.temperature_2m_min || [])[0]),

      humidity: c.relative_humidity_2m,
      precip: c.precipitation,
      precipProb: (day.precipitation_probability_max || [])[0] ?? 0,
      cloud: c.cloud_cover,

      wind: Math.round(c.wind_speed_10m),
      gust: Math.round(c.wind_gusts_10m),
      windDir: windDir(c.wind_direction_10m),

      uv: uvLabel((day.uv_index_max || [])[0]),
      sunrise: hhmm((day.sunrise || [])[0]),
      sunset: hhmm((day.sunset || [])[0]),

      hours: hours
    };
  }

  return { searchCities, reverseName, fetchWeather, windDir, uvLabel };
})();
