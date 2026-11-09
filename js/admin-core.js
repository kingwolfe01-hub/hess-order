/**
 * 經銷作業後台 - 核心通訊與資料轉譯模組 (防超時與防連結變形版)
 */

window._PROTO = 'https:' + '//';
// 旗艦整合版 GAS 端點 (支援訂單、對帳、發票與郵件推播)
window.DEFAULT_PRIMARY_GAS_URL = window._PROTO + "script.google.com/macros/s/AKfycbz4gTP3UE9GjlSPEefmPa9UXc--mOUgZFzTpbFsQ24oQJBlt5Ra0TYvtg2LnvjS_WOK/exec";
window.FALLBACK_GAS_URL = window._PROTO + "script.google.com/macros/s/AKfycbyC6ibSq2874CKZIJVgqrJRYMB9UKOD2pXI_-iRceYdmn67BwiYo6sa_4y4_UwUyWKt/exec";

var _savedGas = localStorage.getItem('HESS_ADMIN_GAS_URL') || localStorage.getItem('GAS_API_URL') || '';
if (_savedGas.indexOf('[') !== -1 || _savedGas.indexOf(')') !== -1 || !_savedGas.startsWith('http')) {
  localStorage.removeItem('HESS_ADMIN_GAS_URL');
  localStorage.removeItem('GAS_API_URL');
  _savedGas = '';
}
window.GAS_URL = _savedGas || window.DEFAULT_PRIMARY_GAS_URL;
window.GAS_API_URL = window.GAS_URL;

window.ORDER_FRONTEND_BASE_URL = "https://kingwolfe01-hub.github.io/hess-order/";
window.STATEMENT_FRONTEND_BASE_URL = "https://kingwolfe01-hub.github.io/hess-order/%E5%B0%8D%E5%B8%B3%E5%96%AE%E5%89%8D%E5%8F%B0.html";

window.FULL_SCHOOL_DB = (typeof SCHOOL_DATABASE !== 'undefined' && Array.isArray(SCHOOL_DATABASE) && SCHOOL_DATABASE.length > 0) 
  ? SCHOOL_DATABASE 
  : (typeof window.SCHOOL_DATABASE !== 'undefined' && Array.isArray(window.SCHOOL_DATABASE) && window.SCHOOL_DATABASE.length > 0)
    ? window.SCHOOL_DATABASE
    : [
        {"city": "彰化", "fullCity": "彰化縣", "district": "彰化市", "name": "中山", "phone": "04-7222033", "address": "彰化市中山路二段678號", "salesman": "黃亮智"},
        {"city": "彰化", "fullCity": "彰化縣", "district": "彰化市", "name": "大竹", "phone": "04-7381436", "address": "彰化市彰南路二段164巷41號", "salesman": "黃亮智"},
        {"city": "彰化", "fullCity": "彰化縣", "district": "員林市", "name": "青山", "phone": "04-8310401", "address": "彰化縣員林市出水里湶洲巷3號", "salesman": "黃依華"}
      ];

window.allOrders = [];
window.reconciledOrders = [];
window.currentFilterStatus = 'ALL';
window.currentReconcileFilter = 'ALL';
window.activeClientKeys = [];
window.currentEditingOrderId = null;

window.escapeHtml = function(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

window.capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

window.getSchoolCompositeKey = function(schoolObj) {
  if (!schoolObj) return '';
  return `${schoolObj.city || ''}_${schoolObj.district || ''}_${(schoolObj.name || '').replace(/國民小學|國小/g, '').trim()}`;
};

window.formatToWesternDate = function(rawStr) {
  if (!rawStr) {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
  const str = String(rawStr).trim();
  if (str.indexOf("年") !== -1) {
    const m = str.match(/(\d+)年(\d+)月(\d+)日/);
    if (m) {
      let yr = parseInt(m[1], 10);
      if (yr < 1911) yr += 1911;
      return `${yr}/${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`;
    }
  }
  const parts = str.split(/[-\/]/);
  if (parts.length === 3) {
    let yr = parseInt(parts[0], 10);
    if (!isNaN(yr)) {
      if (yr < 1911) yr += 1911;
      return `${yr}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    }
  }
  const pd = new Date(str);
  if (!isNaN(pd.getTime())) {
    let yr = pd.getFullYear();
    if (yr < 1911) yr += 1911;
    return `${yr}/${pd.getMonth() + 1}/${pd.getDate()}`;
  }
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
};

window.getOrderTotal = function(order) {
  if (!order) return 0;
  if (order.grandTotal && Number(order.grandTotal) > 0) return Number(order.grandTotal);
  if (order['應付總額'] && Number(order['應付總額']) > 0) return Number(order['應付總額']);
  return (order.items || order.itemsList || []).reduce((sum, it) => sum + ((it.price || 0) * (it.settledQty || it.qty || 0)), 0);
};

// 防崩潰 JSONP：超時後保留空函式，絕不報 hess_jsonp_xxx is not defined
window.callJsonp = function(url, params, onSuccess, onError) {
  const targetUrl = url || window.GAS_URL || window.DEFAULT_PRIMARY_GAS_URL;
  const callbackName = 'hess_jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  const queryParams = { ...params, callback: callbackName };
  const queryString = Object.keys(queryParams)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(queryParams[k]))
    .join('&');

  let isCompleted = false;
  const timer = setTimeout(() => {
    if (isCompleted) return;
    isCompleted = true;
    window[callbackName] = function() {};
    const sc = document.getElementById(callbackName);
    if (sc) sc.remove();
    if (onError) onError(new Error('JSONP Timeout'));
  }, 25000);

  window[callbackName] = function(response) {
    if (isCompleted) return;
    isCompleted = true;
    clearTimeout(timer);
    window[callbackName] = function() {};
    const sc = document.getElementById(callbackName);
    if (sc) sc.remove();
    if (onSuccess) onSuccess(response);
  };

  const script = document.createElement('script');
  script.id = callbackName;
  script.src = `${targetUrl}?${queryString}`;
  script.onerror = function() {
    if (isCompleted) return;
    isCompleted = true;
    clearTimeout(timer);
    window[callbackName] = function() {};
    script.remove();
    if (onError) onError(new Error('JSONP Load Error'));
  };
  document.body.appendChild(script);
};

window.postViaHiddenIframe = function(url, payload, onComplete) {
  const targetUrl = url || window.GAS_URL || window.DEFAULT_PRIMARY_GAS_URL;
  let iframe = document.getElementById('hidden_admin_frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.name = 'hidden_admin_frame';
    iframe.id = 'hidden_admin_frame';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = targetUrl;
  form.target = 'hidden_admin_frame';
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'data';
  input.value = JSON.stringify(payload);
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => {
    if (form.parentNode) document.body.removeChild(form);
    if (onComplete) onComplete();
  }, 700);
};

window.normalizeOrderData = function(raw) {
  if (!raw) return {};
  let o = { ...raw };

  const rawJsonStr = o['原始JSON備份'] || o.rawJson || o.jsonBackup;
  if (rawJsonStr && typeof rawJsonStr === 'string') {
    try {
      const parsed = JSON.parse(rawJsonStr);
      o = { ...parsed, ...o, items: parsed.items || o.items };
    } catch (e) {}
  }

  o.timestamp = o.timestamp || o['填報時間'] || o.orderDate || o['填報日期'] || '';
  o.orderId = o.orderId || o.orderNo || o['訂單編號'] || o['單號'] || '';
  o.orderType = o.orderTypeLabel || o['單據類別'] || o.orderType || '首筆訂單';
  if (o.orderType === 'initial') o.orderType = '首筆訂單';
  if (o.orderType === 'modify') o.orderType = '改單 (數量變更)';
  if (o.orderType === 'append') o.orderType = '增訂 (追加補單)';

  o.schoolCity = o.schoolCity || o['縣市'] || '';
  o.schoolDistrict = o.schoolDistrict || o['鄉鎮市區'] || '';
  o.school = (o.school || o.schoolName || o['學校名稱'] || '').replace(/國民小學|國小/g, '').trim();
  o.contactPerson = o.contactPerson || o['承辦人'] || o['承辦人員'] || '';
  o.contactPhone = o.contactPhone || o['聯絡電話'] || o.phone || '';
  o.contactEmail = o.contactEmail || o['email'] || o['承辦信箱'] || o.email || '';
  o.address = o.address || o.schoolAddress || o['學校地址'] || '';
  o.deliveryLocation = o.deliveryLocation || o['校內指送地點'] || o['指送處室'] || '教務處';
  o.deliveryDates = o.deliveryDates || o['送書期間'] || o['送書週次'] || (Array.isArray(o.deliveryWeeks) ? o.deliveryWeeks.join(', ') : '') || '常規';
  o.remark = o.remark || o.orderRemark || o['單據備註/原因'] || o['單據備註'] || '';
  o.status = o.status || o['出貨狀態'] || o['作業進度'] || '待處理';

  const items = (o.items && typeof o.items === 'object') ? o.items : {};
  const getFromItems = (prefix, kind) => {
    for (const [k, v] of Object.entries(items)) {
      if (k.startsWith(prefix + '-') && k.endsWith('-' + kind)) return parseInt(v, 10) || 0;
    }
    return 0;
  };

  const pickQty = (flatKey, itemPrefix, itemKind, sheetKeys) => {
    if (o[flatKey] !== undefined && o[flatKey] !== '' && parseInt(o[flatKey], 10) > 0) return parseInt(o[flatKey], 10);
    const fromIt = getFromItems(itemPrefix, itemKind);
    if (fromIt > 0) return fromIt;
    for (const sk of sheetKeys) {
      if (o[sk] !== undefined && o[sk] !== '' && parseInt(o[sk], 10) > 0) return parseInt(o[sk], 10);
    }
    return 0;
  };

  o.wosp_g1_tb = pickQty('wosp_g1_tb', 'WOSP-G1', '課本', ['WowPh_G1_第2冊_課本', 'WowPh_G1_第1冊_課本']);
  o.wosp_g1_wb = pickQty('wosp_g1_wb', 'WOSP-G1', '習作', ['WowPh_G1_第2冊_習作', 'WowPh_G1_第1冊_習作']);
  o.wosp_g1_tc = pickQty('wosp_g1_tc', 'WOSP-G1', '教用', ['WowPh_G1第2冊_教用', 'WowPh_G1_第2冊_教用', 'WowPh_G1第1冊_教用']);
  o.wosp_g2_tb = pickQty('wosp_g2_tb', 'WOSP-G2', '課本', ['WowPh_G2_第4冊_課本', 'WowPh_G2_第3冊_課本']);
  o.wosp_g2_wb = pickQty('wosp_g2_wb', 'WOSP-G2', '習作', ['WowPh_G2_第4冊_習作', 'WowPh_G2_第3冊_習作']);
  o.wosp_g2_tc = pickQty('wosp_g2_tc', 'WOSP-G2', '教用', ['WowPh_G2第4冊_教用', 'WowPh_G2_第4冊_教用', 'WowPh_G2第3冊_教用']);

  o.wow_g1_tb = pickQty('wow_g1_tb', 'Wow-G1', '課本', ['Wow_G1_第2冊_課本', 'Wow_G1_第1冊_課本']);
  o.wow_g1_wb = pickQty('wow_g1_wb', 'Wow-G1', '習作', ['Wow_G1_第2冊_習作', 'Wow_G1_第1冊_習作']);
  o.wow_g1_tc = pickQty('wow_g1_tc', 'Wow-G1', '教用', ['Wow_G1_第2冊_教用', 'Wow_G1_第1冊_教用']);
  o.wow_g2_tb = pickQty('wow_g2_tb', 'Wow-G2', '課本', ['Wow_G2_第4冊_課本', 'Wow_G2_第3冊_課本']);
  o.wow_g2_wb = pickQty('wow_g2_wb', 'Wow-G2', '習作', ['Wow_G2_第4冊_習作', 'Wow_G2_第3冊_習作']);
  o.wow_g2_tc = pickQty('wow_g2_tc', 'Wow-G2', '教用', ['Wow_G2_第4冊_教用', 'Wow_G2_第3冊_教用']);

  o.fw_g1_tb = pickQty('fw_g1_tb', 'FW-G1', '課本', ['FW_G1_第2冊_課本', 'FW_G1_第1冊_課本']);
  o.fw_g1_wb = pickQty('fw_g1_wb', 'FW-G1', '習作', ['FW_G1_第2冊_習作', 'FW_G1_第1冊_習作']);
  o.fw_g1_tc = pickQty('fw_g1_tc', 'FW-G1', '教用', ['FW_G1_第2冊_教用', 'FW_G1_第1冊_教用']);
  o.fw_g2_tb = pickQty('fw_g2_tb', 'FW-G2', '課本', ['FW_G2_第4冊_課本', 'FW_G2_第3冊_課本']);
  o.fw_g2_wb = pickQty('fw_g2_wb', 'FW-G2', '習作', ['FW_G2_第4冊_習作', 'FW_G2_第3冊_習作']);
  o.fw_g2_tc = pickQty('fw_g2_tc', 'FW-G2', '教用', ['FW_G2_第4冊_教用', 'FW_G2_第3冊_教用']);

  o.gm_g1_tb = pickQty('gm_g1_tb', 'GM-G1', '課本', ['GM_G1_第2冊_課本', 'GM_G1_第1冊_課本']);
  o.gm_g1_wb = pickQty('gm_g1_wb', 'GM-G1', '習作', ['GM_G1_第2冊_習作', 'GM_G1_第1冊_習作']);
  o.gm_g1_tc = pickQty('gm_g1_tc', 'GM-G1', '教用', ['GM_G1_第2冊_教用', 'GM_G1_第1冊_教用']);
  o.gm_g2_tb = pickQty('gm_g2_tb', 'GM-G2', '課本', ['GM_G2_第4冊_課本', 'GM_G2_第3冊_課本']);
  o.gm_g2_wb = pickQty('gm_g2_wb', 'GM-G2', '習作', ['GM_G2_第4冊_習作', 'GM_G2_第3冊_習作']);
  o.gm_g2_tc = pickQty('gm_g2_tc', 'GM-G2', '教用', ['GM_G2_第4冊_教用', 'GM_G2_第3冊_教用']);

  o.sf_g3_tb = pickQty('sf_g3_tb', 'SF-G3', '課本', ['SF_G3_第2冊_課本', 'SF_G3_第1冊_課本']);
  o.sf_g3_wb = pickQty('sf_g3_wb', 'SF-G3', '習作', ['SF_G3_第2冊_習作', 'SF_G3_第1冊_習作']);
  o.sf_g3_card = pickQty('sf_g3_card', 'SF-G3', '開通卡', ['SF_G3_第2冊_開通卡', 'SF_G3_第1冊_開通卡']);
  o.sf_g3_tc = pickQty('sf_g3_tc', 'SF-G3', '教用', ['SF_G3_第2冊_教用', 'SF_G3_第1冊_教用']);

  o.sf_g4_tb = pickQty('sf_g4_tb', 'SF-G4', '課本', ['SF_G4_第4冊_課本', 'SF_G4_第3冊_課本']);
  o.sf_g4_wb = pickQty('sf_g4_wb', 'SF-G4', '習作', ['SF_G4_第4冊_習作', 'SF_G4_第3冊_習作']);
  o.sf_g4_card = pickQty('sf_g4_card', 'SF-G4', '開通卡', ['SF_G4_第4冊_開通卡', 'SF_G4_第3冊_開通卡']);
  o.sf_g4_tc = pickQty('sf_g4_tc', 'SF-G4', '教用', ['SF_G4_第4冊_教用', 'SF_G4_第3冊_教用']);

  o.sf_g5_tb = pickQty('sf_g5_tb', 'SF-G5', '課本', ['SF_G5_第6冊_課本', 'SF_G5_第5冊_課本']);
  o.sf_g5_wb = pickQty('sf_g5_wb', 'SF-G5', '習作', ['SF_G5_第6冊_習作', 'SF_G5_第5冊_習作']);
  o.sf_g5_card = pickQty('sf_g5_card', 'SF-G5', '開通卡', ['SF_G5_第6冊_開通卡', 'SF_G5_第5冊_開通卡']);
  o.sf_g5_tc = pickQty('sf_g5_tc', 'SF-G5', '教用', ['SF_G5_第6冊_教用', 'SF_G5_第5冊_教用']);

  o.sf_g6_tb = pickQty('sf_g6_tb', 'SF-G6', '課本', ['SF_G6_第8冊_課本', 'SF_G6_第7冊_課本']);
  o.sf_g6_wb = pickQty('sf_g6_wb', 'SF-G6', '習作', ['SF_G6_第8冊_習作', 'SF_G6_第7冊_習作']);
  o.sf_g6_card = pickQty('sf_g6_card', 'SF-G6', '開通卡', ['SF_G6_第8冊_開通卡', 'SF_G6_第7冊_開通卡']);
  o.sf_g6_tc = pickQty('sf_g6_tc', 'SF-G6', '教用', ['SF_G6_第8冊_教用', 'SF_G6_第7冊_教用']);

  const calcTb = o.wosp_g1_tb + o.wosp_g2_tb + o.wow_g1_tb + o.wow_g2_tb + o.fw_g1_tb + o.fw_g2_tb + o.gm_g1_tb + o.gm_g2_tb + o.sf_g3_tb + o.sf_g4_tb + o.sf_g5_tb + o.sf_g6_tb;
  const calcWb = o.wosp_g1_wb + o.wosp_g2_wb + o.wow_g1_wb + o.wow_g2_wb + o.fw_g1_wb + o.fw_g2_wb + o.gm_g1_wb + o.gm_g2_wb + o.sf_g3_wb + o.sf_g4_wb + o.sf_g5_wb + o.sf_g6_wb;
  const calcCard = o.sf_g3_card + o.sf_g4_card + o.sf_g5_card + o.sf_g6_card;
  const calcTc = o.wosp_g1_tc + o.wosp_g2_tc + o.wow_g1_tc + o.wow_g2_tc + o.fw_g1_tc + o.fw_g2_tc + o.gm_g1_tc + o.gm_g2_tc + o.sf_g3_tc + o.sf_g4_tc + o.sf_g5_tc + o.sf_g6_tc;

  const rawTb = parseInt(o.totalTextbook || o['課本總計'], 10);
  const rawWb = parseInt(o.totalWorkbook || o['習作總計'], 10);
  const rawCard = parseInt(o.totalCard || o['開通卡總計'], 10);
  const rawTc = parseInt(o.totalTeacher || o['教用總計'], 10);

  o.totalTextbook = `${!isNaN(rawTb) && rawTb > 0 ? rawTb : calcTb} 本`;
  o.totalWorkbook = `${!isNaN(rawWb) && rawWb > 0 ? rawWb : calcWb} 本`;
  o.totalCard     = `${!isNaN(rawCard) && rawCard > 0 ? rawCard : calcCard} 張`;
  o.totalTeacher  = `${!isNaN(rawTc) && rawTc > 0 ? rawTc : calcTc} 份`;

  return o;
};
