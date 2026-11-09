/**
 * 何嘉仁經銷商後台 - 電子發票開立與成套拆單模組 (admin-invoice.js)
 * 功用：
 * 1. 產出電子發票加值中心 / 發票機專用標準 26 欄 .xls (SheetJS BIFF8)
 * 2. 方案 B：成套連動拆單分配 (學生自費 vs 補助款，課習數量強制一致)
 * 3. 修正電話與統編文字格式保護、修復拆單金額計算與多條件過濾索引對應
 */

(function(window) {
  'use strict';

  let currentSplittingOrderId = null;
  let splitItemQuantities = [];

  function formatToWesternDate(rawStr) {
    if (typeof window.formatToWesternDate === 'function') {
      return window.formatToWesternDate(rawStr);
    }
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
  }

  function getOrderTotal(order) {
    if (typeof window.getOrderTotal === 'function') {
      return window.getOrderTotal(order);
    }
    if (!order) return 0;
    if (order.grandTotal && Number(order.grandTotal) > 0) return Number(order.grandTotal);
    if (order['應付總額'] && Number(order['應付總額']) > 0) return Number(order['應付總額']);
    return (order.items || order.itemsList || []).reduce((sum, it) => sum + ((it.price || 0) * (it.settledQty || it.qty || 0)), 0);
  }

  function escapeHtml(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getSeriesKey(bookName) {
    return String(bookName || '').replace(/(課本|習作|學生電子書開通卡|開通卡)/g, '').trim();
  }

  function getReconciledList() {
    if (window.reconciledOrders && Array.isArray(window.reconciledOrders) && window.reconciledOrders.length > 0) {
      return window.reconciledOrders;
    }
    const candidates = [
      'reconciledOrdersData', 'allReconciledOrders', 'reconciledOrders', 'allReconciledData',
      'reconciledData', 'currentReconciledOrders', 'currentReconciledData', 'reconciledList',
      'reconcileOrders', 'reconcileData', 'schoolOrders'
    ];
    for (let k of candidates) {
      if (window[k] && Array.isArray(window[k]) && window[k].length > 0) return window[k];
    }
    return parseDOMOrdersFallback();
  }

  function findOrder(orderIdOrIdx) {
    const list = getReconciledList();
    if (typeof orderIdOrIdx === 'string') {
      const found = list.find(o => o.orderId === orderIdOrIdx);
      if (found) return found;
    }
    const idx = parseInt(orderIdOrIdx, 10);
    if (!isNaN(idx) && list[idx]) return list[idx];
    return null;
  }

  function parseDOMOrdersFallback() {
    const rows = document.querySelectorAll('#reconciledTbody > tr');
    const list = [];
    rows.forEach((tr) => {
      if (tr.children.length < 8 || tr.classList.contains('detail-expand-row')) return;
      const tds = tr.children;
      const dateStr = tds[1] ? tds[1].innerText.trim() : '';
      const schBlock = tds[2] ? tds[2].innerText.trim() : '';
      const schLines = schBlock.split('\n').map(s => s.trim()).filter(Boolean);
      const schName = (schLines[0] || '學校').replace(/國民小學|國小/g, '').trim();
      let ordId = '';
      schLines.forEach(l => { if (l.includes('HJ-')) ordId = l.replace(/.*?(HJ-[^\s]+).*/, '$1'); });
      const amtStr = tds[5] ? tds[5].innerText.replace(/[^0-9]/g, '') : '0';
      const status = tds[7] ? tds[7].innerText.trim() : '待開立';
      const payStr = tds[6] ? tds[6].innerText.trim() : '1.銀行匯款';

      // 從品項徽章中解析 items
      const items = [];
      const badges = tds[3] ? tds[3].querySelectorAll('span.inline-flex') : [];
      badges.forEach(b => {
        const text = b.innerText.trim();
        const m = text.match(/(.+?)(\d+)(本|張)/);
        if (m) {
          items.push({
            name: m[1].trim(),
            settledQty: parseInt(m[2], 10) || 0,
            qty: parseInt(m[2], 10) || 0,
            unit: m[3],
            price: 100 // 預設單價
          });
        }
      });

      list.push({
        orderId: ordId || `HJ-1152-${schName}`,
        schoolName: schName,
        school: schName,
        orderDate: dateStr,
        invoiceDate: dateStr,
        grandTotal: parseInt(amtStr, 10) || 0,
        status: status,
        paymentMethod: payStr,
        items: items,
        itemsList: items
      });
    });
    return list;
  }

  function toggleSelectAll(checked) {
    const chks = document.querySelectorAll('#reconciledTbody .rec-order-chk');
    chks.forEach(cb => cb.checked = checked);
    const headerChk = document.getElementById('chkAllReconcile');
    if (headerChk) headerChk.checked = checked;
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const chks = document.querySelectorAll('#reconciledTbody .rec-order-chk:checked');
    const badge = document.getElementById('reconcileSelectedBadge');
    if (!badge) return;

    if (chks.length > 0) {
      let totalAmt = 0;
      chks.forEach(cb => {
        const orderId = cb.value || cb.getAttribute('data-order-id');
        const order = findOrder(orderId);
        if (order) totalAmt += getOrderTotal(order);
      });
      badge.textContent = `已選 ${chks.length} 所 ($${totalAmt.toLocaleString()})`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    const allChks = document.querySelectorAll('#reconciledTbody .rec-order-chk');
    const headerChk = document.getElementById('chkAllReconcile');
    if (headerChk && allChks.length > 0) {
      headerChk.checked = (chks.length === allChks.length);
    }
  }

  function exportOrdersToRealExcel(targetOrders, filename) {
    if (typeof XLSX === 'undefined') {
      alert('⚠️ 未偵測到 SheetJS 函式庫，無法匯出 Excel！');
      return;
    }

    const headers = [
      "單號", "發票日期", "買家", "買家電話", "買家地址", "買家統編", 
      "買家Email", "買家傳真", "買家負責人", "課稅別", "通關註記", "零稅率原因", 
      "憑證號碼", "載具號碼", "捐贈愛心碼", "信用卡末四碼", "幣別", "匯率", 
      "發票金額", "備註", "品名", "單價", "單位", "數量", "明細課稅別", "明細備註"
    ];

    const rows = [headers];

    targetOrders.forEach((order, schoolIdx) => {
      const orderNo = schoolIdx + 1;
      const total = getOrderTotal(order);
      const items = order.items || order.itemsList || [];
      const validItems = items.filter(it => (it.settledQty || it.qty || 0) > 0);
      const invoiceDateStr = formatToWesternDate(order.invoiceDate || order['對帳日期'] || order.orderDate);

      const buyerName = order.invoiceTitle || order.schoolName || order['學校名稱'] || (order.school ? order.school + "國民小學" : "");
      let phone = order.schoolPhone || order.phone || order['學校電話'] || order['聯絡電話'] || "";
      const address = order.schoolAddress || order.address || order['學校地址'] || "";
      let taxId = order.invoiceTaxId !== undefined ? order.invoiceTaxId : (order.taxId || order['統一編號'] || order['統編'] || "");
      const orderIdStr = order.orderId || order['訂單編號'] || order['單號'] || "";

      if (validItems.length === 0) {
        rows.push([
          orderNo, invoiceDateStr, buyerName, String(phone), address, taxId ? String(taxId) : "",
          "", "", "", order.taxType || "應稅", "", "", "", "", "", "", "", "",
          total, orderIdStr, "英語教材一批", total, "批", 1, "", ""
        ]);
        return;
      }

      validItems.forEach((it, itemIdx) => {
        const qty = it.settledQty || it.qty || 0;
        if (itemIdx === 0) {
          rows.push([
            orderNo, invoiceDateStr, buyerName, String(phone), address, taxId ? String(taxId) : "",
            "", "", "", order.taxType || "應稅", "", "", "", "", "", "", "", "",
            total, orderIdStr, it.name || "", Number(it.price) || 0, it.unit || "本",
            Number(qty) || 0, "", ""
          ]);
        } else {
          rows.push([
            orderNo, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
            it.name || "", Number(it.price) || 0, it.unit || "本", Number(qty) || 0, "", ""
          ]);
        }
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = 1; R <= range.e.r; ++R) {
        // ★ BUG 9 修復：同時將 C=3 (買家電話) 與 C=5 (買家統編) 強制保護為純文字字串，防止前導 0 遺失！
        [3, 5].forEach(colIdx => {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIdx });
          if (ws[cellAddress] && ws[cellAddress].v !== undefined) {
            ws[cellAddress].t = 's';
            ws[cellAddress].v = String(ws[cellAddress].v);
          }
        });
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "要匯入的發票資訊");
    XLSX.writeFile(wb, filename, { bookType: 'biff8' });
  }

  function exportBatchInvoices() {
    const allOrders = getReconciledList();
    if (!allOrders || allOrders.length === 0) {
      alert("⚠️ 目前對帳單總表尚無任何學校回傳資料！");
      return;
    }

    const checkedBoxes = document.querySelectorAll('#reconciledTbody .rec-order-chk:checked');
    let targetOrders = [];

    // ★ BUG 1 徹底根除：精準以 orderId 對應，絕不使用 DOM 順序作為陣列索引！
    if (checkedBoxes.length > 0) {
      const checkedIds = Array.from(checkedBoxes).map(cb => cb.value || cb.getAttribute('data-order-id')).filter(Boolean);
      targetOrders = allOrders.filter(o => checkedIds.includes(o.orderId));
    } else {
      const pendingOrders = allOrders.filter(o => (o.status || o['開票狀態'] || '待開立') !== '已開立');
      const exportAllCandidate = pendingOrders.length > 0 ? pendingOrders : allOrders;

      const confirmMsg = `💡 您尚未勾選特定學校。\n\n是否直接匯出目前清單中全部【${exportAllCandidate.length} 所】待開立學校的發票匯入檔？\n\n(若欲自選，請點「取消」後於第一欄勾選學校)`;
      if (!confirm(confirmMsg)) return;

      targetOrders = exportAllCandidate;
    }

    if (targetOrders.length === 0) {
      alert("查無相符的學校發票資料！");
      return;
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    exportOrdersToRealExcel(targetOrders, `批次發票匯入檔_${today}_共${targetOrders.length}校.xls`);
  }

  function exportSingleInvoice(orderIdOrIdx) {
    const order = findOrder(orderIdOrIdx);
    if (!order) return alert('⚠️ 找不到該筆學校資料！');
    const sName = order.schoolName || order['學校名稱'] || order.school || '學校';
    exportOrdersToRealExcel([order], `${sName}_發票匯入檔.xls`);
  }

  function ensureSplitModalDOM() {
    if (document.getElementById('invoiceSplitModal')) return;
    const modalDiv = document.createElement('div');
    modalDiv.id = 'invoiceSplitModal';
    // ★ BUG 11 修復：初始樣式僅設 hidden，移除衝突的 flex class
    modalDiv.className = 'fixed inset-0 bg-slate-900/60 z-50 items-center justify-center p-4 hidden';
    modalDiv.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-slate-800" id="invSplitModalTitle">🔀 依成套數量分配拆單 (方案 B：學生自費 ＆ 學生補助款)</h3>
            <p class="text-xs text-slate-500">課本與習作數量必然成套一致；輸入發票 (1) 數量後，發票 (2) 自動補齊差額</p>
          </div>
          <button type="button" onclick="InvoiceManager.closeSplitModal()" class="text-slate-400 hover:text-red-600 font-bold text-xl">&times;</button>
        </div>
        <div class="p-6 overflow-y-auto space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
              <div class="flex justify-between items-center">
                <span class="font-bold text-amber-900 text-sm">【發票 (1)】分配統計 (如: 補助款)</span>
                <span class="text-xs text-amber-700 font-semibold" id="invSplitTarget1Text">目標：$0</span>
              </div>
              <div class="flex justify-between items-baseline mt-2">
                <span class="text-xs text-slate-600">目前分配小計：</span>
                <span class="text-lg font-black font-mono-num text-amber-800" id="invSplitCurrent1Text">$0</span>
              </div>
              <div class="text-[11px] font-bold text-right mt-0.5" id="invSplitDiff1Text">差額：$0</div>
            </div>
            <div class="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
              <div class="flex justify-between items-center">
                <span class="font-bold text-blue-900 text-sm">【發票 (2)】分配統計 (如: 學生自費)</span>
                <span class="text-xs text-blue-700 font-semibold" id="invSplitTarget2Text">目標：$0</span>
              </div>
              <div class="flex justify-between items-baseline mt-2">
                <span class="text-xs text-slate-600">目前分配小計：</span>
                <span class="text-lg font-black font-mono-num text-blue-800" id="invSplitCurrent2Text">$0</span>
              </div>
              <div class="text-[11px] font-bold text-right mt-0.5" id="invSplitDiff2Text">差額：$0</div>
            </div>
          </div>
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="invChkSyncPairs" checked class="w-4 h-4 rounded text-blue-600 accent-blue-600">
              <label for="invChkSyncPairs" class="text-xs font-bold text-slate-700 cursor-pointer">
                🔗 開啟「課本與習作數量成套自動連動」（修改課本數量時，同套習作自動同步）
              </label>
            </div>
            <span class="text-[11px] text-slate-500">※ 每張發票品項課本與習作數量保證完全一致</span>
          </div>
          <table class="w-full border-collapse border border-slate-300 text-center text-xs">
            <thead class="bg-slate-100 font-bold text-slate-700">
              <tr>
                <th class="border border-slate-300 py-2 w-10">#</th>
                <th class="border border-slate-300 py-2 px-2 text-left">教材品名規格</th>
                <th class="border border-slate-300 py-2 w-14">單價</th>
                <th class="border border-slate-300 py-2 w-16 bg-slate-200/60">結帳總量</th>
                <th class="border border-slate-300 py-2 w-28 bg-amber-100/60 text-amber-900">發票(1) 數量</th>
                <th class="border border-slate-300 py-2 w-20 bg-amber-50">發票(1) 小計</th>
                <th class="border border-slate-300 py-2 w-28 bg-blue-100/60 text-blue-900">發票(2) 數量</th>
                <th class="border border-slate-300 py-2 w-20 bg-blue-50">發票(2) 小計</th>
              </tr>
            </thead>
            <tbody id="invSplitItemsTableBody"></tbody>
          </table>
        </div>
        <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <span class="text-xs font-bold" id="invSplitCheckSummary">驗證中...</span>
          <div class="flex gap-2">
            <button type="button" onclick="InvoiceManager.closeSplitModal()" class="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition">取消</button>
            <button type="button" onclick="InvoiceManager.confirmSplitAndExport()" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition">確認拆單並匯出 Excel</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
  }

  function openSplitModal(orderIdOrIdx) {
    ensureSplitModalDOM();
    const order = findOrder(orderIdOrIdx);
    if (!order) return alert('找不到該筆對帳資料！');

    currentSplittingOrderId = order.orderId;
    const sName = order.schoolName || order['學校名稱'] || order.school || '學校';
    document.getElementById('invSplitModalTitle').textContent = `🔀 依成套數量分配拆單 ｜ ${sName}國小`;

    const target1 = parseInt(order.invoiceAmt1 || order['分批金額1'] || order['分批金額(1)'], 10) || 0;
    const target2 = parseInt(order.invoiceAmt2 || order['分批金額2'] || order['分批金額(2)'], 10) || 0;
    document.getElementById('invSplitTarget1Text').textContent = `目標：$${target1.toLocaleString()}`;
    document.getElementById('invSplitTarget2Text').textContent = `目標：$${target2.toLocaleString()}`;

    const items = order.items || order.itemsList || [];
    splitItemQuantities = items.map(() => 0);

    // ★ BUG 3 修復：智慧成套配賦，不盲目全品項填滿，依成套組遞減配額
    if (target1 > 0 && items.length > 0) {
      let remainingTarget = target1;
      const handledSeries = new Set();

      items.forEach((it, i) => {
        const series = getSeriesKey(it.name);
        if (handledSeries.has(series)) return;

        // 尋找同系列成套 (課本+習作)
        const pairIndices = [];
        items.forEach((otherIt, oIdx) => {
          if (getSeriesKey(otherIt.name) === series) pairIndices.push(oIdx);
        });

        const pairUnitCost = pairIndices.reduce((sum, pIdx) => sum + (items[pIdx].price || 0), 0);
        if (pairUnitCost > 0 && remainingTarget >= pairUnitCost) {
          const minAvailableQty = Math.min(...pairIndices.map(pIdx => items[pIdx].settledQty || items[pIdx].qty || 0));
          const possiblePairs = Math.floor(remainingTarget / pairUnitCost);
          const allocatedPairs = Math.min(possiblePairs, minAvailableQty);

          pairIndices.forEach(pIdx => {
            splitItemQuantities[pIdx] = allocatedPairs;
          });
          remainingTarget -= (allocatedPairs * pairUnitCost);
          handledSeries.add(series);
        }
      });
    }

    renderSplitItemsTable(order);
    recalculateSplitSummary(order);

    const m = document.getElementById('invoiceSplitModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
  }

  function renderSplitItemsTable(order) {
    const tbody = document.getElementById('invSplitItemsTableBody');
    tbody.innerHTML = '';
    const items = order.items || order.itemsList || [];

    items.forEach((it, i) => {
      const totalQty = it.settledQty || it.qty || 0;
      const q1 = splitItemQuantities[i] !== undefined ? splitItemQuantities[i] : 0;
      const q2 = Math.max(0, totalQty - q1);
      const sub1 = (it.price || 0) * q1;
      const sub2 = (it.price || 0) * q2;

      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition";
      tr.innerHTML = `
        <td class="border border-slate-300 py-2 font-mono-num text-slate-500">${i + 1}</td>
        <td class="border border-slate-300 py-2 px-2 text-left font-bold text-slate-800">${escapeHtml(it.name)}</td>
        <td class="border border-slate-300 py-2 font-mono-num">$${it.price}</td>
        <td class="border border-slate-300 py-2 font-mono-num font-bold bg-slate-100">${totalQty}</td>
        <td class="border border-slate-300 py-1 bg-amber-50">
          <input type="number" min="0" max="${totalQty}" value="${q1}" oninput="InvoiceManager.onSplitQty1Change(${i}, this.value)" class="w-20 text-center font-bold font-mono-num bg-white border border-amber-300 rounded px-1.5 py-1 text-sm outline-none focus:border-amber-500">
        </td>
        <td class="border border-slate-300 py-2 font-mono-num font-bold text-amber-900 bg-amber-50/50">$${sub1.toLocaleString()}</td>
        <td class="border border-slate-300 py-1 bg-blue-50 font-bold font-mono-num text-sm text-blue-900">${q2}</td>
        <td class="border border-slate-300 py-2 font-mono-num font-bold text-blue-900 bg-blue-50/50">$${sub2.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function onSplitQty1Change(itemIdx, val) {
    const order = findOrder(currentSplittingOrderId);
    if (!order) return;
    const items = order.items || order.itemsList || [];
    const totalQty = items[itemIdx].settledQty || items[itemIdx].qty || 0;
    let newQty1 = Math.max(0, Math.min(parseInt(val, 10) || 0, totalQty));
    splitItemQuantities[itemIdx] = newQty1;

    if (document.getElementById('invChkSyncPairs').checked) {
      const sourceSeries = getSeriesKey(items[itemIdx].name);
      items.forEach((otherIt, oIdx) => {
        if (oIdx !== itemIdx && getSeriesKey(otherIt.name) === sourceSeries) {
          const otherTotal = otherIt.settledQty || otherIt.qty || 0;
          splitItemQuantities[oIdx] = Math.min(newQty1, otherTotal);
        }
      });
    }
    renderSplitItemsTable(order);
    recalculateSplitSummary(order);
  }

  function recalculateSplitSummary(order) {
    const items = order.items || order.itemsList || [];
    const target1 = parseInt(order.invoiceAmt1 || order['分批金額1'] || order['分批金額(1)'], 10) || 0;
    const target2 = parseInt(order.invoiceAmt2 || order['分批金額2'] || order['分批金額(2)'], 10) || 0;
    let cur1 = 0, cur2 = 0;
    items.forEach((it, i) => {
      const totalQty = it.settledQty || it.qty || 0;
      const q1 = splitItemQuantities[i] || 0;
      const q2 = Math.max(0, totalQty - q1);
      cur1 += (it.price || 0) * q1;
      cur2 += (it.price || 0) * q2;
    });

    document.getElementById('invSplitCurrent1Text').textContent = `$${cur1.toLocaleString()}`;
    document.getElementById('invSplitCurrent2Text').textContent = `$${cur2.toLocaleString()}`;

    const diff1 = cur1 - target1;
    const diff2 = cur2 - target2;
    const diff1El = document.getElementById('invSplitDiff1Text');
    if (target1 > 0) {
      diff1El.textContent = diff1 === 0 ? "✅ 恰好相符" : `差額：${diff1 > 0 ? '+' : ''}$${diff1.toLocaleString()}`;
      diff1El.className = diff1 === 0 ? "text-[11px] font-bold text-right mt-0.5 text-emerald-600" : "text-[11px] font-bold text-right mt-0.5 text-red-600";
    } else {
      diff1El.textContent = "未指定分批金額";
      diff1El.className = "text-[11px] font-bold text-right mt-0.5 text-slate-500";
    }

    const diff2El = document.getElementById('invSplitDiff2Text');
    if (target2 > 0) {
      diff2El.textContent = diff2 === 0 ? "✅ 恰好相符" : `差額：${diff2 > 0 ? '+' : ''}$${diff2.toLocaleString()}`;
      diff2El.className = diff2 === 0 ? "text-[11px] font-bold text-right mt-0.5 text-emerald-600" : "text-[11px] font-bold text-right mt-0.5 text-red-600";
    } else {
      diff2El.textContent = "未指定分批金額";
      diff2El.className = "text-[11px] font-bold text-right mt-0.5 text-slate-500";
    }

    const checkSummary = document.getElementById('invSplitCheckSummary');
    const orderTotal = getOrderTotal(order);
    if (cur1 + cur2 === orderTotal) {
      checkSummary.textContent = `✅ 完美匹配！發票(1)+發票(2) ＝ $${orderTotal.toLocaleString()} 元整，課本習作全數成套相符。`;
      checkSummary.className = "text-xs font-bold text-emerald-700";
    } else {
      checkSummary.textContent = "⚠️ 數量分配異常";
      checkSummary.className = "text-xs font-bold text-red-600";
    }
  }

  function confirmSplitAndExport() {
    const order = findOrder(currentSplittingOrderId);
    if (!order) return;
    const items = order.items || order.itemsList || [];
    const items1 = [], items2 = [];

    items.forEach((it, i) => {
      const totalQty = it.settledQty || it.qty || 0;
      const q1 = splitItemQuantities[i] || 0;
      const q2 = Math.max(0, totalQty - q1);
      if (q1 > 0) items1.push({ ...it, settledQty: q1, qty: q1 });
      if (q2 > 0) items2.push({ ...it, settledQty: q2, qty: q2 });
    });

    if (items1.length === 0 || items2.length === 0) {
      alert("請確認兩張發票皆有分配至少一項教材數量！");
      return;
    }

    const sName = order.schoolName || order['學校名稱'] || order.school || '學校';
    const splitOrder1 = { 
      ...order, 
      orderId: (order.orderId || 'HJ') + "-補助款", 
      invoiceTitle: (order.invoiceTitle || sName) + " (補助款)", 
      items: items1,
      itemsList: items1
    };
    const splitOrder2 = { 
      ...order, 
      orderId: (order.orderId || 'HJ') + "-自費", 
      invoiceTitle: (order.invoiceTitle || sName), 
      items: items2,
      itemsList: items2
    };

    exportOrdersToRealExcel([splitOrder1, splitOrder2], `${sName}_拆單2張發票匯入檔.xls`);
    closeSplitModal();
  }

  function closeSplitModal() {
    const m = document.getElementById('invoiceSplitModal');
    if (m) {
      m.classList.remove('flex');
      m.classList.add('hidden');
    }
    currentSplittingOrderId = null;
  }

  window.InvoiceManager = {
    formatToWesternDate,
    exportOrdersToRealExcel,
    exportBatchInvoices,
    exportSingleInvoice,
    openSplitModal,
    onSplitQty1Change,
    confirmSplitAndExport,
    closeSplitModal,
    toggleSelectAll,
    updateSelectionUI
  };

  // 快捷別名
  window.openSplitModal = openSplitModal;
  window.exportSingleInvoice = exportSingleInvoice;
  window.exportBatchInvoices = exportBatchInvoices;

})(window);
