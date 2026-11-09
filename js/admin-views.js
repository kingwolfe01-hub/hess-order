/**
 * 經銷作業後台 - 訂單總表、出貨傳真大表與 1:1 空白訂書單列印模組
 */

window.reloadAllSystemData = function() {
  loadAllData();
  if (typeof loadReconciledData === 'function') loadReconciledData();
};

window.loadAllData = function() {
  const term = document.getElementById('selectTerm')?.value || '115-2';
  const btn = document.getElementById('btnReload');
  const tbody = document.getElementById('ordersTbody');

  if (btn) btn.innerHTML = '⏳ 讀取中...';
  if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="py-8 text-slate-500 font-semibold">正在由雲端試算表載入【${term}】訂單資料...</td></tr>`;

  function enrichOrdersIfNeeded(rawList, onDone) {
    let normalizedList = rawList.map(normalizeOrderData);
    const allZero = normalizedList.length > 0 && normalizedList.every(o => (parseInt(o.totalTextbook, 10) || 0) === 0);
    if (!allZero) return onDone(normalizedList);

    let completed = 0;
    normalizedList.forEach((ord, idx) => {
      if (!ord.orderId) {
        if (++completed === normalizedList.length) onDone(normalizedList);
        return;
      }
      setTimeout(() => {
        callJsonp(window.GAS_URL, { action: 'getOrderByNo', orderId: ord.orderId }, function(detailRes) {
          if (detailRes && detailRes.status === 'success' && detailRes.order) {
            normalizedList[idx] = normalizeOrderData({ ...ord, ...detailRes.order });
          }
          if (++completed === normalizedList.length) onDone(normalizedList);
        }, function() {
          if (++completed === normalizedList.length) onDone(normalizedList);
        });
      }, idx * 60);
    });
  }

  function handleSuccess(json) {
    const rawOrders = (json && (json.orders || json.results || json.schools)) || [];
    if (json && json.status === 'success' && rawOrders.length > 0) {
      enrichOrdersIfNeeded(rawOrders, function(finalOrders) {
        if (btn) btn.innerHTML = `重新讀取`;
        window.allOrders = finalOrders;
        document.getElementById('countOrders').textContent = window.allOrders.length;
        renderOrdersTable();
        renderDispatchTable();
        calculateKPI();
        renderUnsubmittedTable();
        if (typeof renderReconciledKPI === 'function') renderReconciledKPI();
        if (typeof renderUnreconciledTable === 'function') renderUnreconciledTable();
      });
    } else {
      if (btn) btn.innerHTML = `重新讀取`;
      window.allOrders = [];
      if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="py-8 text-slate-400">${(json && json.message) || '該學期目前尚無訂單紀錄'}</td></tr>`;
      resetKPI();
    }
  }

  callJsonp(window.GAS_URL, { action: 'getAllOrders', term: term }, handleSuccess, function() {
    const backupUrl = (window.GAS_URL === window.DEFAULT_PRIMARY_GAS_URL) ? window.FALLBACK_GAS_URL : window.DEFAULT_PRIMARY_GAS_URL;
    callJsonp(backupUrl, { action: 'getAllOrders', term: term }, function(json2) {
      window.GAS_URL = backupUrl;
      localStorage.setItem('HESS_ADMIN_GAS_URL', window.GAS_URL);
      handleSuccess(json2);
    }, function() {
      if (btn) btn.innerHTML = `重新讀取`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="py-8 text-red-600 font-bold">⚠️ 無法載入雲端訂單，請點選右上角「⚙️ API」確認網址。</td></tr>`;
    });
  });
};

window.calculateKPI = function() {
  let tb = 0, wb = 0, card = 0;
  window.allOrders.forEach(o => {
    tb += parseInt(o.totalTextbook, 10) || 0;
    wb += parseInt(o.totalWorkbook, 10) || 0;
    card += parseInt(o.totalCard, 10) || 0;
  });
  document.getElementById('kpiTb').textContent = tb.toLocaleString();
  document.getElementById('kpiWb').textContent = wb.toLocaleString();
  document.getElementById('kpiCard').textContent = card.toLocaleString();

  const totalBase = window.activeClientKeys.length || 1;
  const rate = Math.round((window.allOrders.length / totalBase) * 100);
  document.getElementById('kpiRate').textContent = `${rate}%`;
  document.getElementById('kpiSchoolsText').textContent = `${window.allOrders.length} / ${totalBase} 校`;
};

window.resetKPI = function() {
  ['kpiTb', 'kpiWb', 'kpiCard'].forEach(id => document.getElementById(id).textContent = '0');
  document.getElementById('kpiRate').textContent = '0%';
};

window.setFilterStatus = function(status) {
  window.currentFilterStatus = status;
  ['ALL', '待處理', '已傳真', '已送達'].forEach(s => {
    const id = s === 'ALL' ? 'fltAll' : (s === '待處理' ? 'fltPending' : (s === '已傳真' ? 'fltFaxed' : 'fltDone'));
    const el = document.getElementById(id);
    if (el) el.className = (s === status) ? "px-2 py-1 rounded-lg font-bold bg-slate-800 text-white" : "px-2 py-1 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200";
  });
  renderOrdersTable();
};

window.toggleSelectAllOrders = function(checked) {
  document.querySelectorAll('.order-chk').forEach(c => c.checked = checked);
};

window.updateStatus = function(orderId, st) {
  const target = (window.allOrders || []).find(o => {
    const oId = String(o.orderId || o['訂單編號'] || o['單號'] || o.orderNo || '').trim();
    return oId === String(orderId).trim();
  });
  if (target) target.status = st;
  postViaHiddenIframe(window.GAS_URL, { action: 'updateStatus', orderId: orderId, status: st });
};

window.deleteOrder = function(orderId, school) {
  if (!orderId) return alert('⚠️ 無法取得訂單單號！');
  const targetSchool = school || '該校';
  if (!confirm(`⚠️ 確定要從雲端試算表刪除【${targetSchool}】的訂單 (${orderId}) 嗎？\n\n此動作將同步從雲端資料庫中移除該筆紀錄。`)) return;

  window.allOrders = (window.allOrders || []).filter(o => {
    const oId = String(o.orderId || o['訂單編號'] || o['單號'] || o.orderNo || '').trim();
    return oId !== String(orderId).trim();
  });

  const cntEl = document.getElementById('countOrders');
  if (cntEl) cntEl.textContent = window.allOrders.length;

  renderOrdersTable();
  if (typeof renderDispatchTable === 'function') renderDispatchTable();
  if (typeof calculateKPI === 'function') calculateKPI();
  if (typeof renderUnsubmittedTable === 'function') renderUnsubmittedTable();
  if (typeof renderUnreconciledTable === 'function') renderUnreconciledTable();

  postViaHiddenIframe(window.GAS_URL, { action: 'deleteOrder', orderId: orderId }, function() {
    alert(`🗑️ 訂單【${orderId}】已成功從雲端試算表刪除！`);
  });
};

window.verifyOrder = function(orderId) {
  if (!orderId) return alert('⚠️ 無法取得訂單單號！');
  if (typeof printSingleOrder === 'function') {
    printSingleOrder(orderId);
  } else if (typeof generateBatchPDF === 'function') {
    generateBatchPDF([orderId]);
  } else {
    const url = `${window.GAS_URL || window.DEFAULT_PRIMARY_GAS_URL}?action=getOrderByNo&orderId=${encodeURIComponent(orderId)}`;
    window.open(url, '_blank');
  }
};

function getStatusColor(status) {
  if (!status) return 'text-slate-600';
  if (status.includes('已送達')) return 'text-emerald-700 bg-emerald-50';
  if (status.includes('已傳真')) return 'text-blue-700 bg-blue-50';
  if (status.includes('出貨中')) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

window.renderOrdersTable = function() {
  const q = (document.getElementById('orderFilter')?.value || '').trim().toLowerCase();
  const tbody = document.getElementById('ordersTbody');
  if (!tbody) return;

  const filtered = window.allOrders.filter(o => {
    const matchStatus = (window.currentFilterStatus === 'ALL' || (o.status && o.status.includes(window.currentFilterStatus)));
    const matchQ = !q || [o.school, o.orderId, o.contactPerson, o.deliveryLocation].some(v => v && v.toLowerCase().includes(q));
    return matchStatus && matchQ;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="py-8 text-slate-400">查無相符訂單</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-2 px-2 text-center"><input type="checkbox" value="${o.orderId}" class="order-chk accent-red-600 rounded"></td>
      <td class="py-2 px-3 text-left font-mono-num text-[11px] text-slate-500">${o.timestamp || ''}</td>
      <td class="py-2 px-3 font-mono-num font-bold text-red-700">${o.orderId}</td>
      <td class="py-2 px-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${o.orderType || '首單'}</span></td>
      <td class="py-2 px-3 text-left font-bold text-slate-900">${o.school}</td>
      <td class="py-2 px-3 text-left"><div>${o.contactPerson || ''}</div><div class="text-[10px] text-slate-400 font-mono-num">${o.contactPhone || ''}</div></td>
      <td class="py-2 px-3 text-left font-medium text-slate-800">${o.deliveryLocation || '教務處'}</td>
      <td class="py-2 px-2 font-mono-num font-bold text-red-700">${o.totalTextbook || '0 本'}</td>
      <td class="py-2 px-2 font-mono-num font-bold text-amber-700">${o.totalWorkbook || '0 本'}</td>
      <td class="py-2 px-2 font-mono-num font-bold text-emerald-700">${o.totalCard || '0 張'}</td>
      <td class="py-2 px-2 font-mono-num font-bold text-blue-800">${o.totalTeacher || '0 份'}</td>
      <td class="py-2 px-3">
        <select onchange="updateStatus('${o.orderId}', this.value)" class="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 font-bold outline-none ${getStatusColor(o.status)}">
          <option value="待處理" ${o.status === '待處理' ? 'selected' : ''}>待傳真何嘉仁</option>
          <option value="已傳真何嘉仁" ${o.status === '已傳真何嘉仁' ? 'selected' : ''}>已傳真何嘉仁</option>
          <option value="何嘉仁出貨中" ${o.status === '何嘉仁出貨中' ? 'selected' : ''}>何嘉仁出貨中</option>
          <option value="已送達學校" ${o.status === '已送達學校' ? 'selected' : ''}>已送達學校</option>
        </select>
      </td>
      <td class="py-2 px-3 whitespace-nowrap">
        <div class="flex items-center justify-center gap-1">
          <button type="button" onclick="openEditOrderModal('${escapeHtml(o.orderId)}')" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded text-[11px] font-bold shadow-xs transition" title="修改本單教材數量與指送處室">✏️ 修改</button>
          <button type="button" onclick="deleteOrder('${escapeHtml(o.orderId)}', '${escapeHtml(o.school)}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded text-[11px] font-bold shadow-xs transition" title="從雲端試算表刪除此筆訂單">🗑️ 刪除</button>
          <button type="button" onclick="verifyOrder('${escapeHtml(o.orderId)}')" class="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded text-[11px] font-bold shadow-xs transition" title="檢驗本單明細並開啟正式核章訂購單">📱 檢驗</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.renderDispatchTable = function() {
  const tbody = document.getElementById('dispatchTableBody');
  if (!tbody) return;
  const now = new Date();
  document.getElementById('dispatchGenTime').textContent = `${now.getFullYear()-1911}/${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  document.getElementById('dispatchOrderCount').textContent = window.allOrders.length;

  const colKeys = [
    'wosp_g1_tb','wosp_g1_wb','wosp_g2_tb','wosp_g2_wb',
    'wow_g1_tb','wow_g1_wb','wow_g2_tb','wow_g2_wb',
    'fw_g1_tb','fw_g1_wb','fw_g2_tb','fw_g2_wb',
    'gm_g1_tb','gm_g1_wb','gm_g2_tb','gm_g2_wb',
    'sf_g3_tb','sf_g3_wb','sf_g3_card',
    'sf_g4_tb','sf_g4_wb','sf_g4_card',
    'sf_g5_tb','sf_g5_wb','sf_g5_card',
    'sf_g6_tb','sf_g6_wb','sf_g6_card'
  ];

  let sums = { tbSum: 0, wbSum: 0, cardSum: 0, teacherSum: 0 };
  colKeys.forEach(k => sums[k] = 0);

  tbody.innerHTML = window.allOrders.map((o, idx) => {
    colKeys.forEach(k => sums[k] += (parseInt(o[k], 10) || 0));
    const rTb = parseInt(o.totalTextbook, 10) || 0;
    const rWb = parseInt(o.totalWorkbook, 10) || 0;
    const rCard = parseInt(o.totalCard, 10) || 0;
    const rTc = parseInt(o.totalTeacher, 10) || 0;
    sums.tbSum += rTb; sums.wbSum += rWb; sums.cardSum += rCard; sums.teacherSum += rTc;

    const cellsHtml = colKeys.map(k => {
      const v = parseInt(o[k], 10) || 0;
      return `<td class="border border-slate-300 py-1 font-mono-num">${v > 0 ? `<strong class="text-slate-900">${v}</strong>` : '<span class="text-slate-300">-</span>'}</td>`;
    }).join('');

    return `
      <tr class="hover:bg-slate-50 text-[10px]">
        <td class="border border-slate-300 py-1 px-1 font-mono-num">${idx + 1}</td>
        <td class="border border-slate-300 py-1 px-1.5 text-left font-bold text-slate-900">${o.school}</td>
        <td class="border border-slate-300 py-1 px-1">${o.orderType && o.orderType.includes('改') ? '改單' : (o.orderType && o.orderType.includes('增') ? '增訂' : '首單')}</td>
        <td class="border border-slate-300 py-1 px-1.5 text-left font-bold text-red-950 bg-amber-50/20">${o.deliveryLocation || '教務處'}</td>
        <td class="border border-slate-300 py-1 px-1.5 text-left"><div>${o.contactPerson || ''}</div><div class="text-[9px] text-slate-400 font-mono-num">${o.contactPhone || ''}</div></td>
        <td class="border border-slate-300 py-1 px-1 text-[9px]">${o.deliveryDates || '常規'}</td>
        ${cellsHtml}
        <td class="border border-slate-300 py-1 font-mono-num font-bold text-red-700 bg-amber-50/30">${rTb}</td>
        <td class="border border-slate-300 py-1 font-mono-num font-bold text-amber-700 bg-amber-50/30">${rWb}</td>
        <td class="border border-slate-300 py-1 font-mono-num font-bold text-emerald-700 bg-emerald-50/30">${rCard}</td>
        <td class="border border-slate-300 py-1 font-mono-num font-bold text-blue-800 bg-blue-50/30">${rTc}</td>
      </tr>
    `;
  }).join('');

  colKeys.forEach(k => {
    const el = document.getElementById('sum_' + k);
    if (el) el.textContent = sums[k] > 0 ? sums[k] : '-';
  });
  document.getElementById('dtTbSum').textContent = sums.tbSum;
  document.getElementById('dtWbSum').textContent = sums.wbSum;
  document.getElementById('dtCardSum').textContent = sums.cardSum;
  document.getElementById('dtTeacherSum').textContent = sums.teacherSum;
};

window.renderUnsubmittedTable = function() {
  const submittedKeys = new Set(window.allOrders.map(o => `${o.schoolCity || ''}_${o.schoolDistrict || ''}_${(o.school || '').replace(/國民小學|國小/g, '').trim()}`));
  const targetSchools = FULL_SCHOOL_DB.filter(s => window.activeClientKeys.includes(getSchoolCompositeKey(s)));
  const unsubmitted = targetSchools.filter(s => !submittedKeys.has(getSchoolCompositeKey(s)) && !window.allOrders.some(o => o.school.includes(s.name) && (o.schoolDistrict ? o.schoolDistrict === s.district : true)));

  document.getElementById('countUnsubmitted').textContent = unsubmitted.length;
  document.getElementById('unsubCountBig').textContent = unsubmitted.length;
  document.getElementById('unsubTotalBase').textContent = targetSchools.length;

  const q = (document.getElementById('unsubSearch')?.value || '').trim().toLowerCase();
  const filtered = unsubmitted.filter(s => !q || s.name.toLowerCase().includes(q) || (s.salesman && s.salesman.toLowerCase().includes(q)) || s.district.toLowerCase().includes(q));

  const tbody = document.getElementById('unsubmittedTbody');
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-emerald-600 font-bold">🎉 勾選之合作學校皆已完成回傳！</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((s) => {
    const compKey = getSchoolCompositeKey(s);
    return `
      <tr class="hover:bg-red-50/40">
        <td class="py-2 px-3 text-left font-medium text-slate-500">${s.fullCity || ''} ${s.district}</td>
        <td class="py-2 px-3 text-left font-bold text-slate-900">${s.name}國小</td>
        <td class="py-2 px-3 text-left font-mono-num text-slate-700">${s.phone}</td>
        <td class="py-2 px-3 text-left text-slate-500 text-[11px]">${s.address}</td>
        <td class="py-2 px-3 font-bold text-slate-800">${s.salesman || '業務專員'}</td>
        <td class="py-2 px-3 text-red-600 font-bold text-[11px]">尚未送單</td>
        <td class="py-2 px-3 no-print">
          <button type="button" onclick="printBlankOrderForm('${compKey}')" class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition">
            📄 印出該校空白單
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

window.exportToExcel = function() {
  if (window.allOrders.length === 0) return alert('目前無訂單資料可匯出！');
  const term = document.getElementById('selectTerm')?.value || '115-2';
  const rows = [
    [`何嘉仁 ${term} 英語教材經銷商各校出貨配送明細清冊 (鍠嘉文化教育用品社)`],
    ["序號", "訂單單號", "單別", "學校名稱", "校內指送處室", "承辦人員", "聯絡電話", "送書週次",
     "WOSP_G1課", "WOSP_G1習", "WOSP_G1教", "WOSP_G2課", "WOSP_G2習", "WOSP_G2教",
     "WOW_G1課", "WOW_G1習", "WOW_G1教", "WOW_G2課", "WOW_G2習", "WOW_G2教",
     "FW_G1課", "FW_G1習", "FW_G1教", "FW_G2課", "FW_G2習", "FW_G2教",
     "GM_G1課", "GM_G1習", "GM_G1教", "GM_G2課", "GM_G2習", "GM_G2教",
     "SF_G3課", "SF_G3習", "SF_G3卡", "SF_G3教", "SF_G4課", "SF_G4習", "SF_G4卡", "SF_G4教",
     "SF_G5課", "SF_G5習", "SF_G5卡", "SF_G5教", "SF_G6課", "SF_G6習", "SF_G6卡", "SF_G6教",
     "課本總計", "習作總計", "開通卡總計", "教用總計", "目前狀態"]
  ];
  window.allOrders.forEach((o, i) => {
    rows.push([
      i + 1, o.orderId, o.orderType || "首筆訂單", o.school, o.deliveryLocation || "教務處", o.contactPerson || '', o.contactPhone || '', o.deliveryDates || "常規",
      o.wosp_g1_tb||0, o.wosp_g1_wb||0, o.wosp_g1_tc||0, o.wosp_g2_tb||0, o.wosp_g2_wb||0, o.wosp_g2_tc||0,
      o.wow_g1_tb||0, o.wow_g1_wb||0, o.wow_g1_tc||0, o.wow_g2_tb||0, o.wow_g2_wb||0, o.wow_g2_tc||0,
      o.fw_g1_tb||0, o.fw_g1_wb||0, o.fw_g1_tc||0, o.fw_g2_tb||0, o.fw_g2_wb||0, o.fw_g2_tc||0,
      o.gm_g1_tb||0, o.gm_g1_wb||0, o.gm_g1_tc||0, o.gm_g2_tb||0, o.gm_g2_wb||0, o.gm_g2_tc||0,
      o.sf_g3_tb||0, o.sf_g3_wb||0, o.sf_g3_card||0, o.sf_g3_tc||0,
      o.sf_g4_tb||0, o.sf_g4_wb||0, o.sf_g4_card||0, o.sf_g4_tc||0,
      o.sf_g5_tb||0, o.sf_g5_wb||0, o.sf_g5_card||0, o.sf_g5_tc||0,
      o.sf_g6_tb||0, o.sf_g6_wb||0, o.sf_g6_card||0, o.sf_g6_tc||0,
      parseInt(o.totalTextbook,10)||0, parseInt(o.totalWorkbook,10)||0, parseInt(o.totalCard,10)||0, parseInt(o.totalTeacher,10)||0, o.status || "待處理"
    ]);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "出貨配送明細表");
  XLSX.writeFile(wb, `何嘉仁英語教材_${term}_出貨配送明細表.xlsx`);
};
