/**
 * 經銷作業後台 - 學校對帳單總管與未對帳催收模組 (第 1 階段防變形完修版)
 */

window.switchTab = function(tab) {
  const tabMap = {
    orders: { btn: 'tabBtnOrders', content: 'tabContentOrders' },
    dispatch: { btn: 'tabBtnDispatch', content: 'tabContentDispatch' },
    unsubmitted: { btn: 'tabBtnUnsubmitted', content: 'tabContentUnsubmitted' },
    reconcile: { btn: 'tabBtnReconcile', content: 'tabContentReconcile' },
    unreconciled: { btn: 'tabBtnUnreconciled', content: 'tabContentUnreconciled' },
    mailer: { btn: 'tabBtnMailer', content: 'tabContentMailer' }
  };

  Object.keys(tabMap).forEach(k => {
    const btn = document.getElementById(tabMap[k].btn);
    const content = document.getElementById(tabMap[k].content);
    if (btn) {
      if (k === tab) {
        btn.className = "px-4 py-2 rounded-t-xl bg-white text-red-700 border-t-2 border-red-700 shadow-sm transition whitespace-nowrap flex items-center gap-1";
      } else {
        btn.className = "px-4 py-2 rounded-t-xl text-slate-600 hover:text-slate-900 transition whitespace-nowrap flex items-center gap-1";
      }
    }
    if (content) {
      if (k === tab) content.classList.remove('hidden');
      else content.classList.add('hidden');
    }
  });

  if (tab === 'dispatch' && typeof renderDispatchTable === 'function') renderDispatchTable();
  if (tab === 'unsubmitted' && typeof renderUnsubmittedTable === 'function') renderUnsubmittedTable();
  if (tab === 'reconcile') renderReconciledTable();
  if (tab === 'unreconciled') renderUnreconciledTable();
  if (tab === 'mailer' && window.AdminMailer && typeof AdminMailer.fetchContacts === 'function') AdminMailer.fetchContacts();
};

window.loadReconciledData = function() {
  const term = document.getElementById('selectTerm')?.value || '115-2';
  const tbody = document.getElementById('reconciledTbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-slate-500 font-semibold">正在由雲端載入【${term}】對帳結算回報資料...</td></tr>`;

  const primaryUrl = window.GAS_URL || window.DEFAULT_PRIMARY_GAS_URL;

  callJsonp(primaryUrl, { action: 'getReconciledOrders', term: term }, function(json) {
    const rawList = (json && (json.orders || json.results || json.data)) || [];
    if (json && json.status === 'success' && Array.isArray(rawList)) {
      window.reconciledOrders = rawList.map(normalizeReconciledOrder);
      const cntEl = document.getElementById('countReconciled');
      if (cntEl) cntEl.textContent = window.reconciledOrders.length;
      renderReconciledTable();
      renderReconciledKPI();
      renderUnreconciledTable();
    } else {
      window.reconciledOrders = [];
      const cntEl = document.getElementById('countReconciled');
      if (cntEl) cntEl.textContent = '0';
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-slate-400">目前尚無學校回傳對帳單紀錄</td></tr>`;
      resetReconciledKPI();
      renderUnreconciledTable();
    }
  }, function() {
    // 備用端點嘗試
    const fallbackUrl = (primaryUrl === window.DEFAULT_PRIMARY_GAS_URL) ? window.FALLBACK_GAS_URL : window.DEFAULT_PRIMARY_GAS_URL;
    callJsonp(fallbackUrl, { action: 'getReconciledOrders', term: term }, function(json2) {
      const rawList2 = (json2 && (json2.orders || json2.results || json2.data)) || [];
      if (json2 && json2.status === 'success' && Array.isArray(rawList2)) {
        window.reconciledOrders = rawList2.map(normalizeReconciledOrder);
        const cntEl = document.getElementById('countReconciled');
        if (cntEl) cntEl.textContent = window.reconciledOrders.length;
        renderReconciledTable();
        renderReconciledKPI();
        renderUnreconciledTable();
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-red-600 font-bold">⚠️ 無法載入雲端對帳單資料，請確認網路連線。</td></tr>`;
      }
    }, function() {
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-red-600 font-bold">⚠️ 無法載入雲端對帳單資料，請確認網路連線。</td></tr>`;
    });
  });
};

window.normalizeReconciledOrder = function(raw) {
  if (!raw) return {};
  let o = { ...raw };

  const fullJsonStr = o['完整資料JSON'] || o.fullJson || o.rawJson;
  if (fullJsonStr && typeof fullJsonStr === 'string') {
    try {
      const parsed = JSON.parse(fullJsonStr);
      o = { ...parsed, ...o, items: parsed.items || o.items };
    } catch (e) {}
  }

  o.orderId = o.orderId || o['單據號碼'] || o.orderNo || '';
  o.school = (o.schoolName || o['學校名稱'] || o.school || '').replace(/國民小學|國小/g, '').trim();
  o.orderDate = o.orderDate || o['對帳日期'] || o.invoiceDate || o['回傳時間'] || '';
  o.contactPerson = o.contactPerson || o['承辦人'] || '';
  o.phone = o.schoolPhone || o.phone || o['聯絡電話'] || '';
  o.address = o.schoolAddress || o.address || o['學校地址'] || '';
  o.contactEmail = o.contactEmail || o.email || '';
  o.invoiceTitle = o.invoiceTitle || o['發票抬頭'] || o.school;

  let rawTaxId = o.invoiceTaxId !== undefined ? o.invoiceTaxId : (o.taxId !== undefined ? o.taxId : o['統一編號']);
  if (rawTaxId !== undefined && rawTaxId !== null && String(rawTaxId).trim() !== '' && String(rawTaxId) !== 'nan') {
    o.invoiceTaxId = String(rawTaxId).replace(/\.0$/, '').trim();
  } else {
    o.invoiceTaxId = '';
  }

  o.invoiceCount = parseInt(o.invoiceCount || o['發票張數'], 10) || 1;
  o.invoiceAmt1 = (o.invoiceAmt1 !== undefined ? o.invoiceAmt1 : o['分批金額(1)']) || '';
  o.invoiceAmt2 = (o.invoiceAmt2 !== undefined ? o.invoiceAmt2 : o['分批金額(2)']) || '';
  if (String(o.invoiceAmt1).endsWith('.0')) o.invoiceAmt1 = String(o.invoiceAmt1).replace(/\.0$/, '');
  if (String(o.invoiceAmt2).endsWith('.0')) o.invoiceAmt2 = String(o.invoiceAmt2).replace(/\.0$/, '');

  const payRaw = String(o.paymentMethod || o['付款方式'] || o.paymentOption || '1');
  o.paymentOption = payRaw.includes('2') || payRaw.includes('支票') ? 2 : 1;
  o.paymentLabel = o.paymentOption === 2 ? '2.支票付款' : '1.銀行匯款';
  o.status = o.status || o['開票狀態'] || '待開立';

  let itemsArr = [];
  if (Array.isArray(o.items)) {
    itemsArr = o.items.map(it => {
      const price = parseInt(it.price, 10) || 0;
      const settledQty = parseInt(it.settledQty !== undefined ? it.settledQty : it.qty, 10) || 0;
      const orderQty = parseInt(it.orderQty !== undefined ? it.orderQty : settledQty, 10) || 0;
      const appendQty = parseInt(it.appendQty, 10) || 0;
      const refundQty = parseInt(it.refundQty, 10) || 0;
      return {
        name: it.name || it.bookName || '英語教材',
        unit: it.unit || '本',
        price: price,
        orderQty: orderQty,
        appendQty: appendQty,
        refundQty: refundQty,
        settledQty: settledQty,
        qty: settledQty,
        subtotal: (it.subtotal && parseInt(it.subtotal, 10) > 0) ? parseInt(it.subtotal, 10) : (price * settledQty),
        remark: it.remark || ''
      };
    });
  }

  o.itemsList = itemsArr;
  o.items = itemsArr;

  const calcGrandTotal = itemsArr.reduce((sum, it) => sum + (it.subtotal || 0), 0);
  const rawGrandTotal = parseInt(o.grandTotal || o['應付總額'] || o['結算總額'], 10);
  o.grandTotal = (!isNaN(rawGrandTotal) && rawGrandTotal > 0) ? rawGrandTotal : calcGrandTotal;

  o.totalSettled = itemsArr.reduce((sum, it) => sum + (it.settledQty || 0), 0);
  o.totalAppend = itemsArr.reduce((sum, it) => sum + (it.appendQty || 0), 0);
  o.totalRefund = itemsArr.reduce((sum, it) => sum + (it.refundQty || 0), 0);

  o.isSplitNeeded = (o.invoiceCount === 2) || (parseInt(o.invoiceAmt1, 10) > 0 && parseInt(o.invoiceAmt2, 10) > 0) || String(o['付款與發票指示'] || '').includes('2張');

  return o;
};

window.renderReconciledKPI = function() {
  const recCount = window.reconciledOrders.length;
  const totalAmount = window.reconciledOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalRefund = window.reconciledOrders.reduce((sum, o) => sum + (o.totalRefund || 0), 0);
  const totalAppend = window.reconciledOrders.reduce((sum, o) => sum + (o.totalAppend || 0), 0);

  document.getElementById('reconcileKpiCount').textContent = recCount;
  document.getElementById('reconcileKpiAmount').textContent = '$' + totalAmount.toLocaleString();
  document.getElementById('reconcileKpiRefund').textContent = totalRefund + '本';
  document.getElementById('reconcileKpiAppend').textContent = totalAppend + '本';

  const totalOrdersCount = (window.allOrders && window.allOrders.length > 0) ? window.allOrders.length : (window.activeClientKeys ? window.activeClientKeys.length : 1);
  const rate = Math.min(100, Math.round((recCount / Math.max(1, totalOrdersCount)) * 100));
  document.getElementById('reconcileKpiRate').textContent = `${rate}%`;

  const ratioEl = document.getElementById('reconcileKpiRatioText');
  if (ratioEl) ratioEl.textContent = `${recCount} / ${totalOrdersCount} 校`;
};

window.resetReconciledKPI = function() {
  document.getElementById('reconcileKpiCount').textContent = '0';
  document.getElementById('reconcileKpiAmount').textContent = '$0';
  document.getElementById('reconcileKpiRefund').textContent = '0本';
  document.getElementById('reconcileKpiAppend').textContent = '0本';
  document.getElementById('reconcileKpiRate').textContent = '0%';
};

window.setReconcileFilter = function(flt) {
  window.currentReconcileFilter = flt;
  const btnMap = { 'ALL': 'recFltAll', 'REFUND': 'recFltRefund', 'SPLIT': 'recFltSplit', 'PENDING_INV': 'recFltPendingInv' };
  Object.entries(btnMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = (key === flt)
        ? "px-2.5 py-1 rounded-lg font-bold bg-slate-800 text-white"
        : "px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200";
    }
  });
  renderReconciledTable();
};

window.renderReconciledTable = function() {
  const q = (document.getElementById('reconcileFilter')?.value || '').trim().toLowerCase();
  const tbody = document.getElementById('reconciledTbody');
  if (!tbody) return;

  const filtered = window.reconciledOrders.filter(o => {
    if (window.currentReconcileFilter === 'REFUND' && o.totalRefund <= 0) return false;
    if (window.currentReconcileFilter === 'SPLIT' && !o.isSplitNeeded) return false;
    if (window.currentReconcileFilter === 'PENDING_INV' && o.status === '已開立') return false;

    if (!q) return true;
    const matchBasic = [o.school, o.orderId, o.invoiceTitle, o.invoiceTaxId, o.contactPerson].some(v => v && String(v).toLowerCase().includes(q));
    const matchBookName = (o.itemsList || []).some(it => it.name && it.name.toLowerCase().includes(q));
    return matchBasic || matchBookName;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-slate-400">查無符合條件的對帳單紀錄</td></tr>`;
    if (window.InvoiceManager && typeof InvoiceManager.updateSelectionUI === 'function') {
      InvoiceManager.updateSelectionUI();
    }
    return;
  }

  tbody.innerHTML = filtered.map((o, idx) => {
    const itemsBadgesHtml = (o.itemsList || []).map(it => {
      const isCard = String(it.name).includes('開通卡');
      const badgeColor = isCard ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-slate-800';
      return `<span class="inline-flex items-center gap-1 border ${badgeColor} px-2 py-0.5 rounded-md text-[11px] font-medium mr-1.5 mb-1"><span class="font-bold">${escapeHtml(it.name)}</span><span class="font-mono-num font-black text-red-700">${it.settledQty}${it.unit}</span></span>`;
    }).join('');

    const detailRowsHtml = (o.itemsList || []).map((it, i) => {
      const priceText = '$' + it.price;
      const subText = '$' + (it.subtotal || 0).toLocaleString();
      return `
        <tr class="hover:bg-blue-50/30 text-[11px] border-b border-slate-200">
          <td class="border border-slate-300 py-1 text-center font-mono-num text-slate-500">${i + 1}</td>
          <td class="border border-slate-300 py-1 px-2.5 text-left font-bold text-slate-800">${escapeHtml(it.name)}</td>
          <td class="border border-slate-300 py-1 text-center font-mono-num text-slate-600 bg-amber-50/30">${it.orderQty}</td>
          <td class="border border-slate-300 py-1 text-center font-mono-num font-bold ${it.appendQty > 0 ? 'text-emerald-700 bg-emerald-50/40' : 'text-slate-300'}">${it.appendQty > 0 ? '+' + it.appendQty : '-'}</td>
          <td class="border border-slate-300 py-1 text-center font-mono-num font-bold ${it.refundQty > 0 ? 'text-red-600 bg-red-50/40' : 'text-slate-300'}">${it.refundQty > 0 ? '-' + it.refundQty : '-'}</td>
          <td class="border border-slate-300 py-1 text-center font-mono-num font-black text-blue-900 bg-blue-50/50">${it.settledQty} ${it.unit}</td>
          <td class="border border-slate-300 py-1 text-center font-mono-num text-slate-700">${priceText}</td>
          <td class="border border-slate-300 py-1 px-2 text-right font-mono-num font-bold text-red-700 bg-amber-50/20">${subText}</td>
          <td class="border border-slate-300 py-1 px-2 text-center text-slate-500 text-[10px]">${escapeHtml(it.remark || '')}</td>
        </tr>
      `;
    }).join('');

    const detailRowId = `recDetailRow_${idx}`;
    const grandTotalText = '$' + o.grandTotal.toLocaleString();
    const amt1Num = parseInt(o.invoiceAmt1, 10) || 0;
    const amt2Num = parseInt(o.invoiceAmt2, 10) || 0;
    const splitHintText = '⚠️ 拆2張 (' + amt1Num.toLocaleString() + ' / ' + amt2Num.toLocaleString() + ')';
    const frontendUrl = (window.STATEMENT_FRONTEND_BASE_URL || '對帳單前台.html') + '?orderId=' + encodeURIComponent(o.orderId);

    // ★ BUG 1 徹底根除：Checkbox 與開票/拆單按鈕一律以唯一的 o.orderId 綁定，絕不使用 DOM 暫時序號！
    return `
      <tr class="hover:bg-slate-50/90 transition cursor-pointer" onclick="toggleReconcileDetail('${detailRowId}')">
        <td class="py-2.5 px-2 text-center whitespace-nowrap" onclick="event.stopPropagation()">
          <label class="inline-flex items-center justify-center gap-1 cursor-pointer select-none">
            <input type="checkbox" class="rec-order-chk w-4 h-4 rounded accent-indigo-600 cursor-pointer" value="${o.orderId}" data-order-id="${o.orderId}" onchange="InvoiceManager.updateSelectionUI()">
            <span class="text-[11px] text-slate-500 font-mono">${idx + 1}</span>
          </label>
        </td>
        <td class="py-2.5 px-3 text-left font-mono-num text-[11px] text-slate-600">${o.orderDate}</td>
        <td class="py-2.5 px-3 text-left">
          <div class="font-black text-slate-900 text-xs">${escapeHtml(o.school)}國小</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            ${o.invoiceTaxId ? `<span class="bg-slate-100 border border-slate-300 text-red-700 font-mono-num font-bold px-1.5 py-0.2 rounded text-[10px]">統編: ${o.invoiceTaxId}</span>` : `<span class="text-slate-400 text-[10px]">統編未填</span>`}
            <span class="text-[10px] text-slate-400 font-mono-num">${o.orderId}</span>
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5">${escapeHtml(o.contactPerson)} ${o.phone ? `(${o.phone})` : ''}</div>
        </td>
        <td class="py-2.5 px-3 text-left">
          <div class="flex flex-wrap items-center">${itemsBadgesHtml}</div>
          <div class="text-[10px] text-blue-600 font-bold mt-1">🔽 點擊展開 / 收合 9 欄對帳明細表 (共 ${o.itemsList.length} 項教材)</div>
        </td>
        <td class="py-2.5 px-2 font-mono-num text-xs">
          ${o.totalAppend > 0 ? `<span class="inline-block bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">+${o.totalAppend}</span>` : `<span class="text-slate-300">+0</span>`}
          <span class="text-slate-300 mx-0.5">/</span>
          ${o.totalRefund > 0 ? `<span class="inline-block bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded">-${o.totalRefund}</span>` : `<span class="text-slate-300">-0</span>`}
        </td>
        <td class="py-2.5 px-3 text-right font-mono-num font-black text-red-700 text-sm">${grandTotalText}</td>
        <td class="py-2.5 px-3 text-center">
          <div class="font-bold ${o.paymentOption === 2 ? 'text-purple-700' : 'text-slate-700'}">${o.paymentLabel}</div>
          ${o.isSplitNeeded ? `<div class="mt-0.5"><span class="bg-amber-100 border border-amber-300 text-amber-900 px-1.5 py-0.2 rounded text-[10px] font-bold">${splitHintText}</span></div>` : `<div class="text-[10px] text-slate-400">單張發票</div>`}
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === '已開立' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${o.status}</span>
        </td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap" onclick="event.stopPropagation()">
          <div class="flex items-center justify-center gap-1">
            <button type="button" onclick="toggleReconcileDetail('${detailRowId}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-bold">📋 細目</button>
            <a href="${frontendUrl}" target="_blank" class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">🔍 前台</a>
            ${o.isSplitNeeded
              ? `<button type="button" onclick="InvoiceManager.openSplitModal('${o.orderId}')" class="btn-invoice-action px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold shadow-xs transition ml-0.5">🔀 拆單</button>`
              : `<button type="button" onclick="InvoiceManager.exportSingleInvoice('${o.orderId}')" class="btn-invoice-action px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold shadow-xs transition ml-0.5">開票</button>`
            }
          </div>
        </td>
      </tr>
      <tr id="${detailRowId}" class="hidden bg-slate-100/70 detail-expand-row">
        <td colspan="9" class="p-3">
          <div class="bg-white border-2 border-blue-300 rounded-xl p-3 shadow-inner">
            <div class="flex flex-wrap justify-between items-center mb-2 pb-1.5 border-b border-slate-200 text-xs">
              <div class="font-black text-slate-800 flex items-center gap-2"><span class="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">對帳單 9 欄明細</span><span>${escapeHtml(o.school)}國小 （發票抬頭：${escapeHtml(o.invoiceTitle)} ｜ 統編：${o.invoiceTaxId || '無'}）</span></div>
              <div class="text-slate-500 font-mono-num text-[11px]">結帳總本數：<strong>${o.totalSettled}</strong> ｜ 應付書款總計：<strong class="text-red-700 text-sm">${grandTotalText}</strong> 元整</div>
            </div>
            <table class="w-full border-collapse border border-slate-300 text-center">
              <thead>
                <tr class="bg-slate-100 text-slate-700 font-bold text-[11px]">
                  <th class="border border-slate-300 py-1 w-10">編號</th><th class="border border-slate-300 py-1 px-3 text-left">書名 (品項名稱)</th>
                  <th class="border border-slate-300 py-1 w-16 bg-amber-50/50">訂量</th><th class="border border-slate-300 py-1 w-16 text-emerald-800">增訂量</th>
                  <th class="border border-slate-300 py-1 w-16 text-red-700">退書量</th><th class="border border-slate-300 py-1 w-20 bg-blue-50">結帳量</th>
                  <th class="border border-slate-300 py-1 w-16">學生價</th><th class="border border-slate-300 py-1 w-28 text-right pr-2">結帳金額</th><th class="border border-slate-300 py-1 w-28">備註</th>
                </tr>
              </thead>
              <tbody>${detailRowsHtml}</tbody>
            </table>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.InvoiceManager && typeof InvoiceManager.updateSelectionUI === 'function') {
    InvoiceManager.updateSelectionUI();
  }
};

window.toggleReconcileDetail = function(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.classList.toggle('hidden');
};

window.renderUnreconciledTable = function() {
  const reconciledOrderIds = new Set(window.reconciledOrders.map(o => o.orderId).filter(Boolean));
  const reconciledSchoolNames = new Set(window.reconciledOrders.map(o => (o.school || '').replace(/彰化縣|南投縣|國民小學|國小/g, '').trim()).filter(Boolean));

  const unreconciledList = (window.allOrders || []).filter(ord => {
    if (reconciledOrderIds.has(ord.orderId)) return false;
    const cleanOrdSchool = (ord.school || '').replace(/國民小學|國小/g, '').trim();
    const matchedByName = Array.from(reconciledSchoolNames).some(recName => recName.includes(cleanOrdSchool) || cleanOrdSchool.includes(recName));
    return !matchedByName;
  });

  document.getElementById('countUnreconciled').textContent = unreconciledList.length;
  document.getElementById('unreconcileCountBig').textContent = unreconciledList.length;
  document.getElementById('unreconcileTotalBase').textContent = (window.allOrders || []).length;

  const q = (document.getElementById('unreconcileSearch')?.value || '').trim().toLowerCase();
  const filtered = unreconciledList.filter(o => !q || [o.school, o.orderId, o.contactPerson, o.deliveryLocation].some(v => v && String(v).toLowerCase().includes(q)));

  const tbody = document.getElementById('unreconciledTbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-emerald-600 font-bold">🎉 太棒了！所有已訂書學校皆已完成對帳結算回傳！</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const frontendUrl = (window.STATEMENT_FRONTEND_BASE_URL || '對帳單前台.html') + '?orderId=' + encodeURIComponent(o.orderId);
    return `
      <tr class="hover:bg-red-50/40 transition">
        <td class="py-2.5 px-3 text-left font-mono-num font-bold text-red-700">${o.orderId}</td>
        <td class="py-2.5 px-3 text-left font-bold text-slate-900">${escapeHtml(o.school)}國小</td>
        <td class="py-2.5 px-3 text-left"><div>${escapeHtml(o.contactPerson || '')}</div><div class="text-[10px] text-slate-400 font-mono-num">${o.contactPhone || ''}</div></td>
        <td class="py-2.5 px-3 text-left font-medium text-slate-800">${escapeHtml(o.deliveryLocation || '教務處')}</td>
        <td class="py-2.5 px-2 font-mono-num font-bold text-red-700">${o.totalTextbook || '0 本'}</td>
        <td class="py-2.5 px-2 font-mono-num font-bold text-amber-700">${o.totalWorkbook || '0 本'}</td>
        <td class="py-2.5 px-2 font-mono-num font-bold text-emerald-700">${o.totalCard || '0 張'}</td>
        <td class="py-2.5 px-3 text-center no-print">
          <a href="${frontendUrl}" target="_blank" class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold inline-block">📄 開啟該校對帳單</a>
        </td>
      </tr>
    `;
  }).join('');
};
