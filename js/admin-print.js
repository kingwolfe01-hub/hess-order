/**
 * 何嘉仁經銷商後台 - 單據列印與原版報表產出核心 (admin-print.js)
 * 功用：
 * 1. 批次各校空白對帳單 (A4 滿版、含 QR 碼、防跨頁裁切、動態單雙數冊支援)
 * 2. 1:1 何嘉仁原版空白訂購單 (精準校名合成鍵解析與自動帶入業務資訊)
 * 3. 批次或單校核章原版訂購單 (QR 碼線上核對、即時執行防列印卡死)
 */

(function(window) {
  'use strict';

  const STATEMENT_FRONTEND_BASE_URL = window.STATEMENT_FRONTEND_BASE_URL || "https://kingwolfe01-hub.github.io/hess-order/%E5%B0%8D%E5%B8%B3%E5%96%AE%E5%89%8D%E5%8F%B0.html";
  const ORDER_FRONTEND_BASE_URL = window.ORDER_FRONTEND_BASE_URL || "https://kingwolfe01-hub.github.io/hess-order/";

  function getBookMappingForTerm(termVal) {
    const parts = (termVal || '115-2').split('-');
    const sem = parts[1] || '2';
    const isSem2 = (sem === '2');

    if (isSem2) {
      // 雙數冊 (第 2, 4, 6, 8 冊)
      return [
        { key: 'WOSP-G1-B2-課本', col: 'WowPh_G1_第2冊_課本', name: 'WOW Story Phonics 2 課本', price: 210 },
        { key: 'WOSP-G1-B2-習作', col: 'WowPh_G1_第2冊_習作', name: 'WOW Story Phonics 2 習作', price: 85 },
        { key: 'WOSP-G2-B4-課本', col: 'WowPh_G2_第4冊_課本', name: 'WOW Story Phonics 4 課本', price: 210 },
        { key: 'WOSP-G2-B4-習作', col: 'WowPh_G2_第4冊_習作', name: 'WOW Story Phonics 4 習作', price: 85 },
        { key: 'Wow-G1-B2-課本', col: 'Wow_G1_第2冊_課本', name: 'WOW Story 2 課本', price: 210 },
        { key: 'Wow-G1-B2-習作', col: 'Wow_G1_第2冊_習作', name: 'WOW Story 2 習作', price: 85 },
        { key: 'Wow-G2-B4-課本', col: 'Wow_G2_第4冊_課本', name: 'WOW Story 4 課本', price: 210 },
        { key: 'Wow-G2-B4-習作', col: 'Wow_G2_第4冊_習作', name: 'WOW Story 4 習作', price: 85 },
        { key: 'FW-G1-B2-課本', col: 'FW_G1_第2冊_課本', name: 'Fun World 2 課本', price: 210 },
        { key: 'FW-G1-B2-習作', col: 'FW_G1_第2冊_習作', name: 'Fun World 2 習作', price: 85 },
        { key: 'FW-G2-B4-課本', col: 'FW_G2_第4冊_課本', name: 'Fun World 4 課本', price: 210 },
        { key: 'FW-G2-B4-習作', col: 'FW_G2_第4冊_習作', name: 'Fun World 4 習作', price: 85 },
        { key: 'GM-G1-B2-課本', col: 'GM_G1_第2冊_課本', name: 'Go Magic! 2 課本', price: 210 },
        { key: 'GM-G1-B2-習作', col: 'GM_G1_第2冊_習作', name: 'Go Magic! 2 習作', price: 85 },
        { key: 'GM-G2-B4-課本', col: 'GM_G2_第4冊_課本', name: 'Go Magic! 4 課本', price: 210 },
        { key: 'GM-G2-B4-習作', col: 'GM_G2_第4冊_習作', name: 'Go Magic! 4 習作', price: 85 },
        { key: 'SF-G3-B2-開通卡', col: 'SF_G3_第2冊_開通卡', name: 'Super Fun 2 學生電子書開通卡', price: 180 },
        { key: 'SF-G4-B4-開通卡', col: 'SF_G4_第4冊_開通卡', name: 'Super Fun 4 學生電子書開通卡', price: 180 },
        { key: 'SF-G5-B6-開通卡', col: 'SF_G5_第6冊_開通卡', name: 'Super Fun 6 學生電子書開通卡', price: 180 },
        { key: 'SF-G6-B8-開通卡', col: 'SF_G6_第8冊_開通卡', name: 'Super Fun 8 學生電子書開通卡', price: 180 }
      ];
    } else {
      // 單數冊 (第 1, 3, 5, 7 冊)
      return [
        { key: 'WOSP-G1-B1-課本', col: 'WowPh_G1_第1冊_課本', name: 'WOW Story Phonics 1 課本', price: 210 },
        { key: 'WOSP-G1-B1-習作', col: 'WowPh_G1_第1冊_習作', name: 'WOW Story Phonics 1 習作', price: 85 },
        { key: 'WOSP-G2-B3-課本', col: 'WowPh_G2_第3冊_課本', name: 'WOW Story Phonics 3 課本', price: 210 },
        { key: 'WOSP-G2-B3-習作', col: 'WowPh_G2_第3冊_習作', name: 'WOW Story Phonics 3 習作', price: 85 },
        { key: 'Wow-G1-B1-課本', col: 'Wow_G1_第1冊_課本', name: 'WOW Story 1 課本', price: 210 },
        { key: 'Wow-G1-B1-習作', col: 'Wow_G1_第1冊_習作', name: 'WOW Story 1 習作', price: 85 },
        { key: 'Wow-G2-B3-課本', col: 'Wow_G2_第3冊_課本', name: 'WOW Story 3 課本', price: 210 },
        { key: 'Wow-G2-B3-習作', col: 'Wow_G2_第3冊_習作', name: 'WOW Story 3 習作', price: 85 },
        { key: 'FW-G1-B1-課本', col: 'FW_G1_第1冊_課本', name: 'Fun World 1 課本', price: 210 },
        { key: 'FW-G1-B1-習作', col: 'FW_G1_第1冊_習作', name: 'Fun World 1 習作', price: 85 },
        { key: 'FW-G2-B3-課本', col: 'FW_G2_第3冊_課本', name: 'Fun World 3 課本', price: 210 },
        { key: 'FW-G2-B3-習作', col: 'FW_G2_第3冊_習作', name: 'Fun World 3 習作', price: 85 },
        { key: 'GM-G1-B1-課本', col: 'GM_G1_第1冊_課本', name: 'Go Magic! 1 課本', price: 210 },
        { key: 'GM-G1-B1-習作', col: 'GM_G1_第1冊_習作', name: 'Go Magic! 1 習作', price: 85 },
        { key: 'GM-G2-B3-課本', col: 'GM_G2_第3冊_課本', name: 'Go Magic! 3 課本', price: 210 },
        { key: 'GM-G2-B3-習作', col: 'GM_G2_第3冊_習作', name: 'Go Magic! 3 習作', price: 85 },
        { key: 'SF-G3-B1-開通卡', col: 'SF_G3_第1冊_開通卡', name: 'Super Fun 1 學生電子書開通卡', price: 180 },
        { key: 'SF-G4-B3-開通卡', col: 'SF_G4_第3冊_開通卡', name: 'Super Fun 3 學生電子書開通卡', price: 180 },
        { key: 'SF-G5-B5-開通卡', col: 'SF_G5_第5冊_開通卡', name: 'Super Fun 5 學生電子書開通卡', price: 180 },
        { key: 'SF-G6-B7-開通卡', col: 'SF_G6_第7冊_開通卡', name: 'Super Fun 7 學生電子書開通卡', price: 180 }
      ];
    }
  }

  window.batchPrintBlankStatements = function() {
    const orders = window.allOrders || window.allOrdersData || [];
    if (!orders || orders.length === 0) {
      alert("⚠️ 目前後台尚未載入訂單資料，請先點擊頂部的「重新讀取」按鈕！");
      return;
    }

    const termVal = document.getElementById('selectTerm')?.value || '115-2';
    const [acadYear, sem] = termVal.split('-');
    const bookMapping = getBookMappingForTerm(termVal);

    let targetOrders = [];
    const checkedBoxes = document.querySelectorAll('.order-chk:checked, #ordersTbody input[type="checkbox"]:checked');
    const checkedIds = Array.from(checkedBoxes).map(cb => cb.value).filter(Boolean);

    if (checkedIds.length > 0) {
      targetOrders = orders.filter(o => checkedIds.includes(String(o.orderId || o['訂單編號'] || o.orderNo)));
    }
    if (targetOrders.length === 0) {
      targetOrders = orders;
    }

    const confirmMsg = `即將為【${targetOrders.length} 所學校】批次產生 A4 滿版空白對帳單 (學期：${acadYear}-${sem})：\n\n` +
      `• QR Code：四周等距絕對置中\n` +
      `• 跨頁防護：徹底消除分頁重疊，每校一張 A4\n` +
      `• 冊別切換：自動切換為${sem === '2' ? '雙數冊' : '單數冊'}教材品項\n\n` +
      `是否立即開啟連續列印預覽？`;

    if (!confirm(confirmMsg)) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert("⚠️ 瀏覽器阻擋了彈出視窗，請允許彈出視窗以進行批次列印！");
      return;
    }

    const now = new Date();
    const rocYear = now.getFullYear() - 1911;
    const dateStr = `${rocYear}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;

    let docHtml = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <title>批次空白對帳單 - 鍠嘉文化教育用品社</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&family=Noto+Serif+TC:wght@700;900&family=JetBrains+Mono:wght@500;700&display=swap');
          body { font-family: 'Noto Sans TC', sans-serif; background-color: #ffffff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .font-serif-tc { font-family: 'Noto Serif TC', serif; }
          .font-mono-num { font-family: 'JetBrains Mono', monospace; }
          @page { size: A4 portrait; margin: 4mm 6mm; }
          .a4-page { width: 100%; max-width: 960px; max-height: 275mm; margin: 0 auto; padding: 4mm 6mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; page-break-after: always; break-after: page; }
          .stamp-normal { height: 50px !important; width: auto !important; max-width: 130px !important; object-fit: contain !important; }
          .qr-center-box { width: 84px; height: 84px; border: 1.5px solid #cbd5e1; border-radius: 8px; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 5px; box-sizing: border-box; }
          .qr-center-box img { width: 100% !important; height: 100% !important; max-width: 74px !important; max-height: 74px !important; display: block; margin: auto; object-fit: contain; }
          @media print {
            .no-print { display: none !important; }
            .a4-page { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; padding: 4mm 6mm !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
          <span class="text-xs">已排版完成 <strong>${targetOrders.length}</strong> 所學校空白對帳單 (${acadYear}-${sem})</span>
          <button onclick="window.print()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition">🖨️ 立即連續列印</button>
        </div>
    `;

    targetOrders.forEach((order, idx) => {
      const city = order.schoolCity || order['縣市'] || '';
      const district = order.schoolDistrict || order['鄉鎮市區'] || '';
      const sName = (order.school || order['學校名稱'] || order.schoolName || '').replace(/國民小學|國小/g, '').trim();
      const fullSchool = sName ? `${city}${district}${sName}國民小學` : '';
      const phone = order.contactPhone || order['聯絡電話'] || '';
      const person = order.contactPerson || order['承辦人'] ? `教師 ${order.contactPerson || order['承辦人']}` : '';
      const address = order.address || order['學校地址'] || order.schoolAddress || '';
      const orderNo = order.orderId || order['訂單編號'] || order.orderNo || `HJ-${acadYear}${sem}-${sName}`;

      let rowsHtml = '';
      let rowIdx = 1;

      bookMapping.forEach(bm => {
        let qty = parseInt(order[bm.col], 10) || 0;
        if (qty <= 0 && order.items) {
          qty = parseInt(order.items[bm.col], 10) || parseInt(order.items[bm.key], 10) || 0;
        }
        if (qty > 0 && rowIdx <= 9) {
          rowsHtml += `
            <tr class="border-b border-slate-400 text-center text-xs h-[10.5mm]">
              <td class="border border-slate-600 py-1.5 font-mono-num text-slate-500">${rowIdx++}</td>
              <td class="border border-slate-600 py-1.5 px-3 text-left font-bold text-slate-800 text-[13px]">${bm.name}</td>
              <td class="border border-slate-600 py-1.5 bg-amber-50/50 font-mono-num font-bold text-slate-700 text-sm">${qty}</td>
              <td class="border border-slate-600 py-1.5 text-emerald-800 font-mono-num font-bold text-sm"></td>
              <td class="border border-slate-600 py-1.5 text-red-600 font-mono-num font-bold text-sm"></td>
              <td class="border border-slate-600 py-1.5 bg-blue-50/40 font-mono-num font-bold text-sm"></td>
              <td class="border border-slate-600 py-1.5 font-mono-num text-slate-600 text-xs">${bm.price}</td>
              <td class="border border-slate-600 py-1.5 bg-amber-50/30 font-mono-num font-bold text-red-700 text-sm"></td>
              <td class="border border-slate-600 py-1.5 text-xs text-slate-600"></td>
            </tr>
          `;
        }
      });

      for (let i = rowIdx; i <= 9; i++) {
        rowsHtml += `
          <tr class="border-b border-slate-400 text-center text-xs h-[10.5mm]">
            <td class="border border-slate-600 py-1.5 font-mono-num text-slate-400">${i}</td>
            <td class="border border-slate-600 py-1.5 px-3 text-left"></td>
            <td class="border border-slate-600 py-1.5 bg-amber-50/50"></td>
            <td class="border border-slate-600 py-1.5"></td>
            <td class="border border-slate-600 py-1.5"></td>
            <td class="border border-slate-600 py-1.5 bg-blue-50/40"></td>
            <td class="border border-slate-600 py-1.5"></td>
            <td class="border border-slate-600 py-1.5 bg-amber-50/30"></td>
            <td class="border border-slate-600 py-1.5"></td>
          </tr>
        `;
      }

      docHtml += `
        <div class="a4-page border border-slate-200">
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <div class="grid grid-cols-12 border-b-2 border-slate-800 pb-1.5 text-xs leading-snug items-center">
                <div class="col-span-6 pr-4 flex items-center justify-between">
                  <div class="space-y-0.5">
                    <h2 class="text-base font-black text-slate-900 tracking-wide font-serif-tc">鍠嘉文化教育用品社</h2>
                    <div class="text-slate-700 text-xs space-y-0.5">
                      <p><span class="font-bold">地 址：</span>彰化縣員林市員大路一段250巷15號</p>
                      <p><span class="font-bold">電 話：</span><span class="font-mono-num font-semibold">04-8392577</span></p>
                      <p><span class="font-bold">傳 真：</span><span class="font-mono-num font-semibold">04-8285424</span></p>
                    </div>
                  </div>
                  <div class="flex flex-col items-center justify-center pl-2 flex-shrink-0">
                    <div class="qr-center-box shadow-2xs">
                      <img id="qr_img_${idx}" alt="線上核對 QR Code">
                    </div>
                    <span class="text-[9px] text-slate-700 font-bold tracking-tight mt-1 text-center">📱 掃描線上核對</span>
                  </div>
                </div>
                <div class="col-span-6 pl-4 border-l-2 border-slate-300 space-y-1 text-xs text-slate-700">
                  <p class="flex items-center"><span class="font-bold whitespace-nowrap">學校名稱：</span><span class="font-bold text-slate-900 border-b border-slate-400 flex-1 px-1 text-sm">${fullSchool}</span></p>
                  <p class="flex items-center"><span class="font-bold whitespace-nowrap">電  話：</span><span class="font-mono-num border-b border-slate-400 flex-1 px-1 font-semibold">${phone}</span></p>
                  <p class="flex items-center"><span class="font-bold whitespace-nowrap">承  辦  人：</span><span class="font-semibold text-slate-900 border-b border-slate-400 flex-1 px-1">${person}</span></p>
                  <p class="flex items-center"><span class="font-bold whitespace-nowrap">地  址：</span><span class="border-b border-slate-400 flex-1 px-1 text-[11px]">${address}</span></p>
                </div>
              </div>

              <div class="flex justify-between items-center py-1.5 px-1 border-b border-slate-400">
                <div class="flex items-baseline gap-4 flex-wrap">
                  <h1 class="text-2xl font-black text-slate-900 tracking-widest font-serif-tc border-b-2 border-slate-900 pb-0.5">對帳單</h1>
                  <div class="text-xs text-slate-700 flex items-center gap-1.5">
                    <span class="font-bold">單據號碼：</span>
                    <span class="font-mono-num font-black text-red-700 border-b border-slate-400 px-1 text-sm">${orderNo}</span>
                  </div>
                  <div class="text-xs text-slate-700 flex items-center gap-1">
                    <span class="font-bold">開單日期：</span>
                    <span class="font-mono-num font-bold text-slate-800 border-b border-slate-400 px-1 text-xs">${dateStr}</span>
                  </div>
                </div>
                <div class="flex items-center pr-2">
                  <img src="assets/stamp.png" alt="鍠嘉文化教育用品社 印章" class="stamp-normal select-none pointer-events-none transform -rotate-1" onerror="this.style.display='none'">
                </div>
              </div>

              <table class="w-full border-collapse border-2 border-slate-700 text-center my-1.5 text-xs leading-normal">
                <thead>
                  <tr class="bg-slate-100 font-bold border-b-2 border-slate-700 text-slate-900 text-xs h-7">
                    <th class="border border-slate-600 py-1 w-10">編號</th>
                    <th class="border border-slate-600 py-1 px-3 text-left w-56">書名</th>
                    <th class="border border-slate-600 py-1 w-18 bg-amber-50/50">訂量</th>
                    <th class="border border-slate-600 py-1 w-18 text-emerald-800">增訂量</th>
                    <th class="border border-slate-600 py-1 w-18 text-red-700">退書量</th>
                    <th class="border border-slate-600 py-1 w-18 bg-blue-100/50">結帳量</th>
                    <th class="border border-slate-600 py-1 w-16">學生價</th>
                    <th class="border border-slate-600 py-1 w-24 bg-amber-50/50">結帳金額</th>
                    <th class="border border-slate-600 py-1 w-20">備註</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
                <tfoot>
                  <tr class="font-bold bg-slate-50 border-t-2 border-slate-800 text-sm h-8">
                    <td colspan="7" class="border border-slate-600 py-1 px-4 text-right tracking-wider text-slate-900 font-bold">應付書款金額：</td>
                    <td class="border border-slate-600 py-1 font-mono-num font-black text-red-700 text-lg"></td>
                    <td class="border border-slate-600 py-1 text-xs text-slate-600 font-medium">元整</td>
                  </tr>
                </tfoot>
              </table>

              <div class="border-2 border-slate-500 p-3 text-xs rounded-lg bg-slate-50/70 leading-relaxed my-1">
                <div class="font-bold text-slate-900 flex items-center gap-2 text-xs border-b border-slate-300 pb-1">
                  <span class="w-2 h-3.5 bg-red-700 rounded-sm"></span><span>說明事項 ：</span>
                </div>
                <div class="grid grid-cols-12 gap-4 py-1.5 items-stretch">
                  <div class="col-span-6 flex flex-col justify-between text-slate-800 pr-3 border-r border-slate-300">
                    <div class="space-y-2">
                      <p class="font-bold text-slate-900 text-xs leading-snug">一、發票如需配合學校做特殊規定開立時，請於本欄指示說明：</p>
                      <div class="pl-2 space-y-2.5 text-xs text-slate-800 mt-1">
                        <p class="flex items-center"><span>發票抬頭：</span><span class="flex-1 border-b border-slate-600 ml-1">&nbsp;</span></p>
                        <p class="flex items-center"><span>統一編號：</span><span class="inline-block border-b border-slate-600 w-40 text-center font-mono-num font-bold mx-1">&nbsp;</span><span class="text-[10px] text-slate-500">(學校統編 8 碼)</span></p>
                        <p class="flex items-center"><span>發票張數：</span><span class="inline-block border-b border-slate-600 w-16 text-center mx-1">&nbsp;</span><span>張</span></p>
                        <p class="flex items-center"><span>分批金額(1)：</span><span class="inline-block border-b border-slate-600 w-40 text-center mx-1">&nbsp;</span><span>元</span></p>
                        <p class="flex items-center"><span>分批金額(2)：</span><span class="inline-block border-b border-slate-600 w-40 text-center mx-1">&nbsp;</span><span>元</span></p>
                      </div>
                    </div>
                    <p class="pt-1.5 text-xs font-bold text-slate-900">二、(1) 退書請通知業務到校收回。</p>
                  </div>
                  <div class="col-span-6 flex flex-col justify-between text-slate-800 pl-1">
                    <div class="space-y-2">
                      <p class="font-bold text-slate-900 text-xs">(2) 書款請利用下列方式擇一辦理：</p>
                      <div class="bg-red-50/80 border-2 border-red-600 p-2.5 rounded-xl space-y-1 text-xs">
                        <p class="font-black text-red-950 text-xs">□ 1. 供應商銀行匯款帳號 (附匯款同意書)：</p>
                        <p class="pl-4 text-slate-800"><span class="font-bold">銀 行：</span>台中銀行員林分行</p>
                        <p class="pl-4 text-slate-800"><span class="font-bold">帳 號：</span><span class="font-mono-num font-black text-red-700 text-sm tracking-wider">067221057230</span></p>
                        <p class="pl-4 text-slate-800"><span class="font-bold">戶 名：</span>鍠嘉文化教育用品社 黃依華</p>
                      </div>
                      <div class="bg-white border-2 border-slate-400 p-2.5 rounded-xl text-xs space-y-0.5">
                        <p class="font-black text-slate-900 text-xs">□ 2. 開立禁止背書轉讓支票：</p>
                        <p class="pl-4 text-slate-700 text-[11px] leading-relaxed">抬頭指定「<strong>鍠嘉文化教育用品社</strong>」（可直接交由業務收回）</p>
                      </div>
                    </div>
                    <p class="text-[11px] text-slate-600 pt-1 font-medium">三、如有任何問題歡迎來電洽詢 (04)8392577。</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="pt-1.5 border-t-2 border-slate-400">
              <div class="flex justify-between items-center text-xs md:text-sm text-slate-900 px-8 font-serif-tc font-bold">
                <div>校長：_________________________</div>
                <div>教務處：_________________________</div>
                <div>經辦人：_________________________</div>
              </div>
              <div class="text-center text-[10px] text-slate-500 mt-1">※ 彰化縣員林市員大路一段250巷15號 ｜ 電話：04-8392577 ｜ 傳真：04-8285424</div>
            </div>
          </div>
        </div>
      `;
    });

    // ★ BUG 5 修復：使用即時執行函式生成 QR 碼並於 window.onload 列印，絕不依賴可能漏觸發的 DOMContentLoaded！
    docHtml += `
      <script>
        (function() {
          const targetOrders = ${JSON.stringify(targetOrders)};
          const baseUrl = "${STATEMENT_FRONTEND_BASE_URL}";
          function initQrs() {
            targetOrders.forEach((order, idx) => {
              const sName = (order.school || order['學校名稱'] || order.schoolName || '').replace(/國民小學|國小/g, '').trim();
              const orderNo = order.orderId || order['訂單編號'] || order.orderNo || ('HJ-${acadYear}${sem}-' + sName);
              const targetUrl = baseUrl + '?orderId=' + encodeURIComponent(orderNo);
              try {
                const qr = new QRious({ value: targetUrl, size: 200, level: 'L', background: '#ffffff', foreground: '#0f172a', padding: 0 });
                const img = document.getElementById('qr_img_' + idx);
                if (img) img.src = qr.toDataURL('image/png');
              } catch (e) {}
            });
            setTimeout(function() { window.print(); }, 500);
          }
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            initQrs();
          } else {
            window.onload = initQrs;
          }
        })();
      <\/script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(docHtml);
    printWin.document.close();
  };

  window.printBlankOrderForm = function(prefillSchoolObj) {
    const termSelect = document.getElementById('selectTerm');
    const termVal = termSelect ? termSelect.value : '115-2';
    const [acadYear, sem] = termVal.split('-');
    const isSem2 = (sem === '2');

    const semTitle = isSem2 ? '第二學期' : '第一學期';
    const lowHint = isSem2 ? '預訂下學期：一年級第2冊、二年級第4冊 (雙數冊)' : '預訂上學期：一年級第1冊、二年級第3冊 (單數冊)';
    const midHint = isSem2 ? '預訂下學期為雙數冊：2、4、6、8 冊' : '預訂上學期為單數冊：1、3、5、7 冊';
    const vols = isSem2 ? { g1: 2, g2: 4, g3: 2, g4: 4, g5: 6, g6: 8 } : { g1: 1, g2: 3, g3: 1, g4: 3, g5: 5, g6: 7 };
    const weeks = isSem2
      ? ['12/21 - 12/24', '12/28 - 12/31', '1/4 - 1/8', '1/11 - 1/15', '1/18 - 1/22']
      : ['7/13 - 7/17', '7/20 - 7/24', '7/27 - 7/31', '8/3 - 8/7', '8/10 - 8/14'];

    let targetSchool = null;
    const db = (typeof SCHOOL_DATABASE !== 'undefined' && Array.isArray(SCHOOL_DATABASE) && SCHOOL_DATABASE.length > 0)
      ? SCHOOL_DATABASE
      : (window.FULL_SCHOOL_DB || []);

    // ★ BUG 2 修復：支援合成鍵（如 '彰化_彰化市_中山'）與正向命中比對，完整提取電話、地址與業務員
    if (typeof prefillSchoolObj === 'string' && prefillSchoolObj.trim()) {
      const raw = prefillSchoolObj.trim();
      if (raw.includes('_')) {
        const parts = raw.split('_');
        const pCity = parts[0];
        const pDist = parts[1];
        const pName = parts[2].replace(/國民小學|國小/g, '').trim();
        targetSchool = db.find(s => s.name === pName && (!pDist || s.district === pDist));
      }
      if (!targetSchool) {
        const q = raw.replace(/國民小學|國小/g, '').trim();
        targetSchool = db.find(s => s.name === q || (s.name && q.includes(s.name)) || (s.short_name && q.includes(s.short_name)) || s.school_id === q);
      }
      if (!targetSchool) {
        targetSchool = { name: raw.replace(/國民小學|國小/g, '').trim() };
      }
    } else if (typeof prefillSchoolObj === 'number') {
      targetSchool = db[prefillSchoolObj] || null;
    } else if (prefillSchoolObj && typeof prefillSchoolObj === 'object') {
      targetSchool = prefillSchoolObj;
      const rawN = (targetSchool.name || targetSchool.school_name || targetSchool.short_name || targetSchool['學校名稱'] || '').replace(/國民小學|國小/g, '').trim();
      if (rawN && (!targetSchool.phone && !targetSchool['聯絡電話'])) {
        const matchDb = db.find(s => s.name === rawN || (s.name && s.name.includes(rawN)));
        if (matchDb) targetSchool = Object.assign({}, matchDb, targetSchool);
      }
    }

    let cityStr = '________', distStr = '________', nameStr = '____________', phoneStr = '', addrStr = '', salesmanStr = '';
    if (targetSchool) {
      const rawCity = targetSchool.city || targetSchool.county || targetSchool['縣市'] || '彰化';
      cityStr = rawCity.replace(/[縣市]$/, '');
      const rawDist = targetSchool.district || targetSchool['鄉鎮市區'] || targetSchool['鄉鎮'] || '';
      distStr = rawDist.replace(/[市鎮鄉區]$/, '') || '________';
      const rawName = targetSchool.name || targetSchool.short_name || targetSchool.school_name || targetSchool['學校名稱'] || '';
      nameStr = rawName.replace(/國民小學|國小/g, '').trim() || '____________';
      phoneStr = targetSchool.phone || targetSchool['聯絡電話'] || targetSchool['學校電話'] || '';
      addrStr = targetSchool.address || targetSchool['學校地址'] || '';
      const sm = targetSchool.salesman || targetSchool['負責業務'] || targetSchool['服務業務'] || '';
      salesmanStr = sm ? ` ｜ 服務業務：<strong>${sm}</strong>` : '';
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert("⚠️ 瀏覽器阻擋了彈出視窗，請允許彈出視窗以列印空白訂書單！");
      return;
    }

    const lowSeries = [
      { title: 'WOW! STORY Phonics' },
      { title: 'WOW! STORY (低年級)' },
      { title: 'Fun World (低年級)' },
      { title: 'Go Magic! (低年級)' }
    ];

    let lowRowsHtml = '';
    lowSeries.forEach((s, idx) => {
      const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';
      lowRowsHtml += `
        <tr class="${bgClass} h-[7.6mm]">
          <td rowspan="2" class="border border-slate-500 px-2 font-black text-slate-900 text-xs">${s.title}</td>
          <td class="border border-slate-500 text-slate-700 font-semibold">一年級</td>
          <td class="border border-slate-500 font-mono-num font-bold text-slate-900">${vols.g1}</td>
          <td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td>
        </tr>
        <tr class="${bgClass} h-[7.6mm]">
          <td class="border border-slate-500 text-slate-700 font-semibold">二年級</td>
          <td class="border border-slate-500 font-mono-num font-bold text-slate-900">${vols.g2}</td>
          <td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td>
        </tr>
      `;
    });

    const orderDocHtml = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <title>${acadYear}學年度${semTitle} 國小英語教材空白訂購單</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&family=Noto+Serif+TC:wght@700;900&family=JetBrains+Mono:wght@500;700&display=swap');
          body { font-family: 'Noto Sans TC', sans-serif; background-color: #ffffff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .font-serif-tc { font-family: 'Noto Serif TC', serif; }
          .font-mono-num { font-family: 'JetBrains Mono', monospace; }
          @page { size: A4 portrait; margin: 4mm 6mm; }
          .a4-page { width: 100%; max-width: 960px; max-height: 275mm; margin: 0 auto; padding: 3mm 5mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
          .qr-center-box { width: 78px; height: 78px; border: 1.5px solid #cbd5e1; border-radius: 6px; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 5px; box-sizing: border-box; }
          .qr-center-box img { width: 100% !important; height: 100% !important; max-width: 68px !important; max-height: 68px !important; display: block; margin: auto; object-fit: contain; }
          .stamp-normal { height: 48px !important; width: auto !important; object-fit: contain !important; }
          @media print { .no-print { display: none !important; } .a4-page { padding: 3mm 5mm !important; } }
        </style>
      </head>
      <body>
        <div class="no-print fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
          <span class="text-xs font-bold">📄 國小英語教材空白訂購單</span>
          <button onclick="window.print()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition">🖨️ 立即列印</button>
        </div>
        <div class="a4-page">
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <div class="border-b-2 border-slate-800 pb-1.5 mb-1.5 flex justify-between items-center">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="bg-slate-800 text-white font-black text-xs px-2 py-0.5 rounded">HESS 何嘉仁</span>
                    <span class="text-xs font-bold text-slate-600">經銷商信函 附件二</span>
                    <span class="bg-slate-900 text-white font-black text-xs px-2 py-0.5 rounded">首筆訂購單</span>
                  </div>
                  <h1 class="text-2xl font-black text-slate-900 tracking-wide font-serif-tc whitespace-nowrap">${acadYear}學年度${semTitle} 國小【英語教材】訂購單</h1>
                  <div class="text-xs text-slate-700 font-medium">經銷商：<strong>鍠嘉文化教育用品社</strong> ｜ 電話：(04) 839-2577 ｜ 傳真：(04) 828-5424${salesmanStr}</div>
                  <div class="inline-block bg-slate-100 border border-slate-300 rounded px-2 py-0.5 text-[10px] text-slate-700 font-mono-num">🌐 線上訂書單網址：<span class="underline font-bold">${ORDER_FRONTEND_BASE_URL}</span></div>
                </div>
                <div class="flex items-center gap-2.5 bg-slate-50 border border-slate-300 p-1.5 rounded-lg flex-shrink-0">
                  <div class="qr-center-box shadow-2xs"><img id="order_blank_qr" alt="線上填報 QR Code"></div>
                  <div class="text-xs space-y-0.5 pr-1">
                    <p class="font-black text-slate-900 text-xs">📱 線上填報系統</p>
                    <p class="font-bold text-slate-700 text-[11px]">掃碼直接線上訂書</p>
                    <p class="text-[10px] text-slate-500">免手寫・自動加總</p>
                  </div>
                </div>
              </div>
              <div class="border border-slate-500 rounded p-2 text-xs space-y-1.5 mb-2 bg-white">
                <div class="flex justify-between items-center">
                  <div class="font-bold text-slate-900 text-xs">訂購單位：<span class="font-mono-num px-1 font-bold">${cityStr}</span>縣/市 <span class="font-mono-num px-1 font-bold">${distStr}</span>區/鄉/鎮 <span class="font-black text-sm px-1 text-slate-900">${nameStr}</span>國民小學</div>
                  <div class="font-bold text-slate-900 text-xs">填報日期：<span class="font-mono-num underline px-2">${acadYear}</span>年_______月_______日</div>
                </div>
                <div class="grid grid-cols-12 gap-2 pt-0.5">
                  <div class="col-span-4 flex items-center font-bold"><span>承辦人員：</span><span class="flex-1 border-b border-slate-600 ml-1">&nbsp;</span></div>
                  <div class="col-span-4 flex items-center font-bold"><span>聯絡電話：</span><span class="flex-1 border-b border-slate-600 ml-1 font-mono-num px-1">${phoneStr}</span></div>
                  <div class="col-span-4 flex items-center font-bold"><span>承辦信箱：</span><span class="flex-1 border-b border-slate-600 ml-1">&nbsp;</span></div>
                </div>
                <div class="flex items-center font-bold pt-0.5"><span>學校地址：</span><span class="flex-1 border-b border-slate-600 ml-1 px-1">${addrStr}</span></div>
                <div class="grid grid-cols-12 gap-2 pt-0.5">
                  <div class="col-span-7 flex items-center font-bold"><span>指送地點：</span><span class="flex-1 border-b border-slate-600 ml-1 px-2 font-black">教務處</span></div>
                  <div class="col-span-5 flex items-center font-bold"><span>單據備註：</span><span class="flex-1 border-b border-slate-600 ml-1">&nbsp;</span></div>
                </div>
                <div class="flex items-center pt-1 border-t border-dashed border-slate-300 font-bold text-[11px]">
                  <span class="mr-2">送書期間：</span>
                  <div class="flex flex-wrap items-center gap-3 font-mono-num">${weeks.map(w => `<span>□ ${w}</span>`).join('')}</div>
                </div>
              </div>
              <div class="mb-2">
                <div class="bg-slate-800 text-white font-bold text-xs py-1 px-2.5 flex justify-between items-center rounded-t">
                  <span>《非審定版》一 ～ 二年級 (低年級)</span><span class="text-[10px] font-normal">${lowHint}</span>
                </div>
                <table class="w-full border-collapse border border-slate-600 text-center text-xs">
                  <thead>
                    <tr class="bg-slate-100 font-bold text-slate-900 h-7">
                      <th class="border border-slate-500 w-44">系列名稱</th><th class="border border-slate-500 w-16">年級</th><th class="border border-slate-500 w-12">冊別</th>
                      <th class="border border-slate-500 w-32">課本 (含線上聽)</th><th class="border border-slate-500 w-32">習作 (含線上聽)</th><th class="border border-slate-500 w-32">教師用書</th><th class="border border-slate-500">備註</th>
                    </tr>
                  </thead>
                  <tbody>${lowRowsHtml}</tbody>
                </table>
              </div>
              <div class="mb-1.5">
                <div class="bg-red-800 text-white font-bold text-xs py-1 px-2.5 flex justify-between items-center rounded-t">
                  <span>《審定版》三 ～ 六年級 (Super Fun)</span><span class="text-[10px] font-normal">${midHint}</span>
                </div>
                <table class="w-full border-collapse border border-slate-600 text-center text-xs">
                  <thead>
                    <tr class="bg-slate-100 font-bold text-slate-900 h-7">
                      <th class="border border-slate-500 w-44">系列名稱</th><th class="border border-slate-500 w-16">年級</th><th class="border border-slate-500 w-12">冊別</th>
                      <th class="border border-slate-500 w-28">課本</th><th class="border border-slate-500 w-28">習作</th><th class="border border-slate-500 w-32">學生電子書開通卡</th><th class="border border-slate-500 w-28">教師用書</th><th class="border border-slate-500">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="h-[7.6mm]"><td rowspan="4" class="border border-slate-500 font-black text-slate-900 text-xs">Super Fun<br><span class="text-[10px] font-bold">(審定版)</span></td><td class="border border-slate-500 font-semibold">三年級</td><td class="border border-slate-500 font-mono-num font-bold">${vols.g3}</td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td></tr>
                    <tr class="h-[7.6mm]"><td class="border border-slate-500 font-semibold">四年級</td><td class="border border-slate-500 font-mono-num font-bold">${vols.g4}</td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td></tr>
                    <tr class="h-[7.6mm]"><td class="border border-slate-500 font-semibold">五年級</td><td class="border border-slate-500 font-mono-num font-bold">${vols.g5}</td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td></tr>
                    <tr class="h-[7.6mm]"><td class="border border-slate-500 font-semibold">六年級</td><td class="border border-slate-500 font-mono-num font-bold">${vols.g6}</td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td><td class="border border-slate-500"></td></tr>
                  </tbody>
                  <tfoot>
                    <tr class="bg-slate-100 font-bold h-7 text-xs">
                      <td colspan="3" class="border border-slate-500 text-right pr-2">訂單總量合計：</td>
                      <td class="border border-slate-500 text-right pr-1">本</td><td class="border border-slate-500 text-right pr-1">本</td><td class="border border-slate-500 text-right pr-1">張</td><td class="border border-slate-500 text-right pr-1">份</td><td class="border border-slate-500"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div class="border-t-2 border-slate-700 pt-2 mt-0.5 grid grid-cols-12 gap-4 items-stretch">
              <div class="col-span-7 flex flex-col justify-between pr-3 border-r border-slate-300">
                <div class="space-y-1">
                  <h3 class="font-black text-slate-900 text-xs">訂購注意事項與回傳指示：</h3>
                  <p class="text-[11px] text-slate-700 leading-tight">1. 推薦線上填報：請掃描右上角 QR Code 或連至 <span class="underline font-mono-num font-bold">${ORDER_FRONTEND_BASE_URL}</span> 線上填送。</p>
                  <div class="bg-slate-50 border border-slate-300 p-2 rounded text-[11px] space-y-0.5">
                    <p class="font-bold text-slate-900">回傳傳真 Fax：(04) 828-5424 ｜ 服務電話：(04) 839-2577</p>
                    <p class="text-slate-700">門市通訊處：彰化縣員林市員大路一段250巷15號</p>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-1"><span class="font-black text-slate-900 text-xs">經銷商核章：</span><img src="assets/stamp.png" alt="鍠嘉文化教育用品社 印章" class="stamp-normal mr-6" onerror="this.style.display='none'"></div>
              </div>
              <div class="col-span-5 flex flex-col justify-between pl-1">
                <div>
                  <h3 class="font-black text-slate-900 text-xs mb-1">學校簽核審查欄：</h3>
                  <div class="grid grid-cols-3 border border-slate-500 rounded text-center divide-x divide-slate-500">
                    <div><div class="bg-slate-100 font-bold text-[11px] py-1 border-b border-slate-400">承辦人</div><div class="h-16"></div></div>
                    <div><div class="bg-slate-100 font-bold text-[11px] py-1 border-b border-slate-400">主任</div><div class="h-16"></div></div>
                    <div><div class="bg-slate-100 font-bold text-[11px] py-1 border-b border-slate-400">校長</div><div class="h-16"></div></div>
                  </div>
                </div>
                <div class="text-center text-[10px] text-slate-500 pt-0.5">※ 本訂購單經學校核章並回傳後，視同正式要約成立。</div>
              </div>
            </div>
          </div>
        </div>
        <script>
          (function() {
            function initQr() {
              try {
                const qr = new QRious({ value: "${ORDER_FRONTEND_BASE_URL}", size: 200, level: 'L', background: '#ffffff', foreground: '#0f172a', padding: 0 });
                const img = document.getElementById('order_blank_qr');
                if (img) img.src = qr.toDataURL('image/png');
              } catch (e) {}
              setTimeout(function() { window.print(); }, 400);
            }
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              initQr();
            } else {
              window.onload = initQr;
            }
          })();
        <\/script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(orderDocHtml);
    printWin.document.close();
  };

  window.generateBatchPDF = function(specificOrders) {
    const orders = window.allOrders || window.allOrdersData || [];
    if (!orders || orders.length === 0) {
      alert("⚠️ 目前後台尚未載入訂單資料，請先點擊頂部的「重新讀取」按鈕！");
      return;
    }

    let exportList = [];
    if (Array.isArray(specificOrders) && specificOrders.length > 0) {
      exportList = specificOrders;
    } else if (specificOrders && typeof specificOrders === 'object') {
      exportList = [specificOrders];
    } else {
      const checkedBoxes = document.querySelectorAll('.order-chk:checked, #ordersTbody input[type="checkbox"]:checked');
      const checkedIds = Array.from(checkedBoxes).map(cb => cb.value).filter(Boolean);
      if (checkedIds.length > 0) {
        exportList = orders.filter(o => checkedIds.includes(String(o.orderId || o['訂單編號'] || o.orderNo)));
      }
      if (exportList.length === 0) exportList = orders;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) return alert("⚠️ 請允許彈出視窗以產生原版訂購單 PDF！");

    const termSelect = document.getElementById('selectTerm');
    const termVal = termSelect ? termSelect.value : '115-2';
    const [acadYear, sem] = termVal.split('-');
    const isSem2 = (sem === '2');
    const semTitle = isSem2 ? '第二學期' : '第一學期';
    const lowHint = isSem2 ? '預訂下學期：一年級第2冊、二年級第4冊 (雙數冊)' : '預訂上學期：一年級第1冊、二年級第3冊 (單數冊)';
    const midHint = isSem2 ? '預訂下學期為雙數冊：2、4、6、8 冊' : '預訂上學期為單數冊：1、3、5、7 冊';
    const vols = isSem2 ? { g1: 2, g2: 4, g3: 2, g4: 4, g5: 6, g6: 8 } : { g1: 1, g2: 3, g3: 1, g4: 3, g5: 5, g6: 7 };
    const allWeeks = isSem2
      ? ['12/21 - 12/24', '12/28 - 12/31', '1/4 - 1/8', '1/11 - 1/15', '1/18 - 1/22']
      : ['7/13 - 7/17', '7/20 - 7/24', '7/27 - 7/31', '8/3 - 8/7', '8/10 - 8/14'];

    const schoolDb = (typeof SCHOOL_DATABASE !== 'undefined' && Array.isArray(SCHOOL_DATABASE) && SCHOOL_DATABASE.length > 0)
      ? SCHOOL_DATABASE
      : (window.FULL_SCHOOL_DB || []);

    const lowSeriesConfig = [
      { title: 'WOW! STORY Phonics', prefix: 'WOSP', colPrefix: 'WowPh' },
      { title: 'WOW! STORY (低年級)', prefix: 'Wow', colPrefix: 'Wow' },
      { title: 'Fun World (低年級)', prefix: 'FW', colPrefix: 'FW' },
      { title: 'Go Magic! (低年級)', prefix: 'GM', colPrefix: 'GM' }
    ];

    let pagesHtml = '';

    exportList.forEach((order, idx) => {
      const rawSchoolName = (order.school || order['學校名稱'] || order.schoolName || '').replace(/國民小學|國小/g, '').trim();
      const dbMatch = schoolDb.find(s => s.name === rawSchoolName) || {};
      const city = order.schoolCity || order['縣市'] || dbMatch.city || '彰化';
      const district = (order.schoolDistrict || order['鄉鎮市區'] || dbMatch.district || '').replace(/[市鎮鄉區]$/, '');
      const orderNo = order.orderId || order['訂單編號'] || order.orderNo || `HJ-${acadYear}${sem}-${rawSchoolName}`;
      const contactPerson = order.contactPerson || order['承辦人'] || order['承辦人員'] || '';
      const phone = order.contactPhone || order['聯絡電話'] || dbMatch.phone || '';
      const email = order.contactEmail || order['email'] || order['承辦信箱'] || '';
      const address = order.address || order['學校地址'] || dbMatch.address || '';
      const deliveryLocation = order.deliveryLocation || order['校內指送地點'] || order['指送處室'] || '教務處';
      const remark = order.remark || order['單據備註/原因'] || order['單據備註'] || '全校常規訂購';
      const salesman = order.salesman || order['負責業務'] || dbMatch.salesman || '黃亮智';
      const orderTypeRaw = order.orderType || order['單據類別'] || order['單別'] || '首筆訂購單';
      const badgeLabel = orderTypeRaw.includes('改單') ? '✏️ 改單 (數量變更)' : (orderTypeRaw.includes('增訂') ? '➕ 增訂 (追加補單)' : '首筆訂購單');

      let orderDateStr = order.timestamp || order['填報日期'] || order['填單時間'] || order.orderDate || '';
      if (orderDateStr && String(orderDateStr).includes('T')) orderDateStr = String(orderDateStr).split('T')[0];

      const rawDelivery = order.deliveryDates || order['送書期間'] || order['送書週次'] || '';
      let matchedAnyWeek = false;
      const deliveryWeeksHtml = allWeeks.map(w => {
        const isChecked = String(rawDelivery).replace(/\s+/g, '').includes(w.replace(/\s+/g, ''));
        if (isChecked) matchedAnyWeek = true;
        return `<span class="inline-flex items-center gap-1 font-mono-num ${isChecked ? 'text-red-700 font-black underline' : 'text-slate-600'}">${isChecked ? '☑' : '□'} ${w}</span>`;
      }).join('');
      const extraDeliveryText = (!matchedAnyWeek && rawDelivery) ? `<span class="ml-2 text-red-700 font-black underline">★ 指定：${rawDelivery}</span>` : '';

      const getQty = (prefix, colPrefix, gradeNum, kind) => {
        const vol = vols['g' + gradeNum];
        const gKey = 'G' + gradeNum;
        const candidates = [
          `${colPrefix}_${gKey}_第${vol}冊_${kind}`, `${colPrefix}_${gKey}_${kind}`,
          `${prefix}-${gKey}-B${vol}-${kind}`, `${prefix}-${gKey}-${kind}`,
          `${prefix}_${gKey}_第${vol}冊_${kind}`, `${prefix}_${gKey}_${kind}`
        ];
        for (const k of candidates) {
          if (order[k] !== undefined && order[k] !== '' && order[k] !== '-') {
            const v = parseInt(order[k], 10);
            if (!isNaN(v) && v > 0) return v;
          }
          if (order.items && order.items[k] !== undefined) {
            const v = parseInt(order.items[k], 10);
            if (!isNaN(v) && v > 0) return v;
          }
        }
        return 0;
      };

      let calcSumTb = 0, calcSumWb = 0, calcSumCard = 0, calcSumTc = 0;
      let lowRowsHtml = '';
      lowSeriesConfig.forEach((s, sIdx) => {
        const bgClass = sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';
        const g1Tb = getQty(s.prefix, s.colPrefix, 1, '課本'), g1Wb = getQty(s.prefix, s.colPrefix, 1, '習作'), g1Tc = getQty(s.prefix, s.colPrefix, 1, '教用');
        const g2Tb = getQty(s.prefix, s.colPrefix, 2, '課本'), g2Wb = getQty(s.prefix, s.colPrefix, 2, '習作'), g2Tc = getQty(s.prefix, s.colPrefix, 2, '教用');
        calcSumTb += (g1Tb + g2Tb); calcSumWb += (g1Wb + g2Wb); calcSumTc += (g1Tc + g2Tc);
        lowRowsHtml += `
          <tr class="${bgClass} h-[7.4mm]">
            <td rowspan="2" class="border border-slate-500 px-2 font-black text-slate-900 text-xs">${s.title}</td>
            <td class="border border-slate-500 text-slate-700 font-semibold">一年級</td><td class="border border-slate-500 font-mono-num font-bold text-red-700">${vols.g1}</td>
            <td class="border border-slate-500 font-mono-num font-bold text-slate-900 text-sm">${g1Tb || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-slate-900 text-sm">${g1Wb || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-blue-900 text-sm">${g1Tc || ''}</td><td class="border border-slate-500"></td>
          </tr>
          <tr class="${bgClass} h-[7.4mm]">
            <td class="border border-slate-500 text-slate-700 font-semibold">二年級</td><td class="border border-slate-500 font-mono-num font-bold text-red-700">${vols.g2}</td>
            <td class="border border-slate-500 font-mono-num font-bold text-slate-900 text-sm">${g2Tb || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-slate-900 text-sm">${g2Wb || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-blue-900 text-sm">${g2Tc || ''}</td><td class="border border-slate-500"></td>
          </tr>`;
      });

      let midRowsHtml = '';
      [{ label: '三年級', num: 3, vol: vols.g3 }, { label: '四年級', num: 4, vol: vols.g4 }, { label: '五年級', num: 5, vol: vols.g5 }, { label: '六年級', num: 6, vol: vols.g6 }].forEach((g, gIdx) => {
        const tb = getQty('SF', 'SF', g.num, '課本'), wb = getQty('SF', 'SF', g.num, '習作'), card = getQty('SF', 'SF', g.num, '開通卡'), tc = getQty('SF', 'SF', g.num, '教用');
        calcSumTb += tb; calcSumWb += wb; calcSumCard += card; calcSumTc += tc;
        midRowsHtml += `
          <tr class="h-[7.4mm]">
            ${gIdx === 0 ? `<td rowspan="4" class="border border-slate-500 font-black text-slate-900 text-xs">Super Fun<br><span class="text-[10px] font-bold text-slate-500">(審定版)</span></td>` : ''}
            <td class="border border-slate-500 font-semibold text-slate-700">${g.label}</td><td class="border border-slate-500 font-mono-num font-bold text-red-700">${g.vol}</td>
            <td class="border border-slate-500 font-mono-num font-bold text-slate-900 text-sm">${tb || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-slate-900 text-sm">${wb || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-emerald-800 text-sm">${card || ''}</td><td class="border border-slate-500 font-mono-num font-bold text-blue-900 text-sm">${tc || ''}</td><td class="border border-slate-500"></td>
          </tr>`;
      });

      const finalTb = calcSumTb || parseInt(order.totalTextbook || order['課本總計'], 10) || 0;
      const finalWb = calcSumWb || parseInt(order.totalWorkbook || order['習作總計'], 10) || 0;
      const finalCard = calcSumCard || parseInt(order.totalCard || order['開通卡總計'], 10) || 0;
      const finalTc = calcSumTc || parseInt(order.totalTeacher || order['教用總計'], 10) || 0;

      pagesHtml += `
        <div class="a4-page">
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <div class="border-b-2 border-red-700 pb-1.5 mb-1.5 flex justify-between items-center">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="bg-red-700 text-white font-black text-xs px-2 py-0.5 rounded">HESS 何嘉仁</span>
                    <span class="text-xs font-bold text-slate-600">經銷商信函 附件二</span>
                    <span class="bg-slate-800 text-white font-black text-xs px-2 py-0.5 rounded">${badgeLabel}</span>
                    <span class="font-mono-num font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">${orderNo}</span>
                  </div>
                  <h1 class="text-2xl font-black text-slate-900 tracking-wide font-serif-tc whitespace-nowrap">${acadYear}學年度${semTitle} 國小【英語教材】訂購單</h1>
                  <div class="text-xs text-slate-700 font-medium">經銷商：<strong>鍠嘉文化教育用品社</strong> ｜ 電話：(04) 839-2577 ｜ 傳真：(04) 828-5424 ｜ 服務業務：<strong>${salesman}</strong></div>
                </div>
                <div class="flex items-center gap-2.5 bg-slate-50 border border-slate-300 p-1.5 rounded-lg flex-shrink-0">
                  <div class="qr-center-box shadow-2xs"><img id="batch_order_qr_${idx}" alt="線上核對 QR Code"></div>
                  <div class="text-xs space-y-0.5 pr-1">
                    <p class="font-black text-red-700 text-xs">📱 線上核對碼</p>
                    <p class="font-mono-num font-bold text-slate-700 text-[10px]">${orderNo}</p>
                    <p class="text-[10px] text-emerald-700 font-bold">✅ 已建檔核對</p>
                  </div>
                </div>
              </div>
              <div class="border border-slate-500 rounded p-2 text-xs space-y-1.5 mb-2 bg-white">
                <div class="flex justify-between items-center">
                  <div class="font-bold text-slate-900 text-xs">訂購單位：<span class="font-bold border-b border-slate-500 px-1">${city}</span>縣/市 <span class="font-bold border-b border-slate-500 px-1">${district}</span>區/鄉/鎮 <span class="font-black text-sm border-b border-slate-800 px-1.5 text-red-900">${rawSchoolName}</span>國民小學</div>
                  <div class="font-bold text-slate-900 text-xs">填報日期：<span class="font-mono-num font-bold border-b border-slate-500 px-2">${orderDateStr || `${acadYear}年`}</span></div>
                </div>
                <div class="grid grid-cols-12 gap-2 pt-0.5">
                  <div class="col-span-4 flex items-center font-bold"><span>承辦人員：</span><span class="flex-1 border-b border-slate-600 ml-1 px-1 text-slate-900">${contactPerson}</span></div>
                  <div class="col-span-4 flex items-center font-bold"><span>聯絡電話：</span><span class="flex-1 border-b border-slate-600 ml-1 font-mono-num px-1">${phone}</span></div>
                  <div class="col-span-4 flex items-center font-bold"><span>承辦信箱：</span><span class="flex-1 border-b border-slate-600 ml-1 font-mono-num px-1 text-[11px]">${email}</span></div>
                </div>
                <div class="flex items-center font-bold pt-0.5"><span>學校地址：</span><span class="flex-1 border-b border-slate-600 ml-1 px-1">${address}</span></div>
                <div class="grid grid-cols-12 gap-2 pt-0.5">
                  <div class="col-span-7 flex items-center font-bold"><span>指送地點：</span><span class="flex-1 border-b border-slate-600 ml-1 px-2 font-black text-red-900 bg-amber-50/50">${deliveryLocation}</span></div>
                  <div class="col-span-5 flex items-center font-bold"><span>單據備註：</span><span class="flex-1 border-b border-slate-600 ml-1 px-1 text-slate-700">${remark}</span></div>
                </div>
                <div class="flex items-center pt-1 border-t border-dashed border-slate-300 font-bold text-[11px]">
                  <span class="text-red-800 mr-2 whitespace-nowrap">送書期間 (指定送貨週次)：</span>
                  <div class="flex flex-wrap items-center gap-3">${deliveryWeeksHtml}${extraDeliveryText}</div>
                </div>
              </div>
              <div class="mb-2">
                <div class="bg-red-800 text-white font-bold text-xs py-1 px-2.5 flex justify-between items-center rounded-t"><span>《非審定版》一 ～ 二年級 (低年級)</span><span class="text-[10px] font-normal">${lowHint}</span></div>
                <table class="w-full border-collapse border border-slate-600 text-center text-xs">
                  <thead><tr class="bg-slate-100 font-bold text-slate-900 h-7"><th class="border border-slate-500 w-44">系列名稱</th><th class="border border-slate-500 w-16">年級</th><th class="border border-slate-500 w-12">冊別</th><th class="border border-slate-500 w-32 bg-amber-50/60">課本 (含線上聽)</th><th class="border border-slate-500 w-32 bg-amber-50/60">習作 (含線上聽)</th><th class="border border-slate-500 w-32 bg-blue-50/60">教師用書</th><th class="border border-slate-500">備註</th></tr></thead>
                  <tbody>${lowRowsHtml}</tbody>
                </table>
              </div>
              <div class="mb-1.5">
                <div class="bg-red-800 text-white font-bold text-xs py-1 px-2.5 flex justify-between items-center rounded-t"><span>《審定版》三 ～ 六年級 (Super Fun)</span><span class="text-[10px] font-normal">${midHint}</span></div>
                <table class="w-full border-collapse border border-slate-600 text-center text-xs">
                  <thead><tr class="bg-slate-100 font-bold text-slate-900 h-7"><th class="border border-slate-500 w-44">系列名稱</th><th class="border border-slate-500 w-16">年級</th><th class="border border-slate-500 w-12">冊別</th><th class="border border-slate-500 w-28 bg-amber-50/60">課本</th><th class="border border-slate-500 w-28 bg-amber-50/60">習作</th><th class="border border-slate-500 w-32 bg-emerald-50/60">學生電子書開通卡</th><th class="border border-slate-500 w-28 bg-blue-50/60">教師用書</th><th class="border border-slate-500">備註</th></tr></thead>
                  <tbody>${midRowsHtml}</tbody>
                  <tfoot><tr class="bg-slate-100 font-bold h-7 text-xs"><td colspan="3" class="border border-slate-500 text-right pr-2">全校訂購總量合計：</td><td class="border border-slate-500 font-mono-num text-red-700 font-black text-sm">${finalTb} 本</td><td class="border border-slate-500 font-mono-num text-red-700 font-black text-sm">${finalWb} 本</td><td class="border border-slate-500 font-mono-num text-emerald-800 font-black text-sm">${finalCard} 張</td><td class="border border-slate-500 font-mono-num text-blue-900 font-black text-sm">${finalTc} 份</td><td class="border border-slate-500 text-[10px] text-slate-500">系統自動加總</td></tr></tfoot>
                </table>
              </div>
            </div>
            <div class="border-t-2 border-slate-700 pt-2 mt-0.5 grid grid-cols-12 gap-4 items-stretch">
              <div class="col-span-7 flex flex-col justify-between pr-3 border-r border-slate-300">
                <div class="space-y-1">
                  <h3 class="font-black text-slate-900 text-xs">訂購注意事項與回傳指示：</h3>
                  <p class="text-[11px] text-slate-700 leading-tight">1. 數量變更或補訂請掃描右上角 QR Code 或連至 <span class="underline font-mono-num font-bold">${ORDER_FRONTEND_BASE_URL}</span> 辦理。</p>
                  <div class="bg-slate-50 border border-slate-300 p-2 rounded text-[11px] space-y-0.5">
                    <p class="font-bold text-slate-900">回傳傳真 Fax：(04) 828-5424 ｜ 服務電話：(04) 839-2577</p>
                    <p class="text-slate-700">門市通訊處：彰化縣員林市員大路一段250巷15號</p>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-1"><span class="font-black text-slate-900 text-xs">經銷商核章：</span><img src="assets/stamp.png" alt="鍠嘉文化教育用品社 印章" class="stamp-normal mr-6" onerror="this.style.display='none'"></div>
              </div>
              <div class="col-span-5 flex flex-col justify-between pl-1">
                <div>
                  <h3 class="font-black text-slate-900 text-xs mb-1">學校簽核審查欄：</h3>
                  <div class="grid grid-cols-3 border border-slate-500 rounded text-center divide-x divide-slate-500">
                    <div><div class="bg-slate-100 font-bold text-[11px] py-1 border-b border-slate-400">承辦人</div><div class="h-16"></div></div>
                    <div><div class="bg-slate-100 font-bold text-[11px] py-1 border-b border-slate-400">主任</div><div class="h-16"></div></div>
                    <div><div class="bg-slate-100 font-bold text-[11px] py-1 border-b border-slate-400">校長</div><div class="h-16"></div></div>
                  </div>
                </div>
                <div class="text-center text-[10px] text-slate-500 pt-0.5">※ 本訂購單經學校核章並回傳後，視同正式要約成立。</div>
              </div>
            </div>
          </div>
        </div>`;
    });

    const batchDocHtml = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8"><title>${acadYear}學年度${semTitle} 國小英語教材訂購單</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&family=Noto+Serif+TC:wght@700;900&family=JetBrains+Mono:wght@500;700&display=swap');
          body { font-family: 'Noto Sans TC', sans-serif; background-color: #ffffff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .font-serif-tc { font-family: 'Noto Serif TC', serif; } .font-mono-num { font-family: 'JetBrains Mono', monospace; }
          @page { size: A4 portrait; margin: 4mm 6mm; }
          .a4-page { width: 100%; max-width: 960px; max-height: 275mm; margin: 0 auto; padding: 3mm 5mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; page-break-after: always; break-after: page; }
          .qr-center-box { width: 78px; height: 78px; border: 1.5px solid #cbd5e1; border-radius: 6px; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 5px; box-sizing: border-box; }
          .qr-center-box img { width: 100% !important; height: 100% !important; max-width: 68px !important; max-height: 68px !important; display: block; margin: auto; object-fit: contain; }
          .stamp-normal { height: 48px !important; width: auto !important; object-fit: contain !important; }
          @media print { .no-print { display: none !important; } .a4-page { padding: 3mm 5mm !important; margin: 0 !important; border: none !important; box-shadow: none !important; } }
        </style>
      </head>
      <body>
        <div class="no-print fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
          <span class="text-xs">已產出 <strong>${exportList.length}</strong> 所學校【何嘉仁原版訂購單】</span>
          <button onclick="window.print()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition">🖨️ 立即列印 / 另存 PDF</button>
        </div>
        ${pagesHtml}
        <script>
          (function() {
            const exportList = ${JSON.stringify(exportList)};
            const baseUrl = "${ORDER_FRONTEND_BASE_URL}";
            function initQrs() {
              exportList.forEach((order, idx) => {
                const sName = (order.school || order['學校名稱'] || order.schoolName || '').replace(/國民小學|國小/g, '').trim();
                const orderNo = order.orderId || order['訂單編號'] || order.orderNo || ('HJ-${acadYear}${sem}-' + sName);
                const targetUrl = baseUrl + '?orderId=' + encodeURIComponent(orderNo);
                try {
                  const qr = new QRious({ value: targetUrl, size: 200, level: 'L', background: '#ffffff', foreground: '#0f172a', padding: 0 });
                  const img = document.getElementById('batch_order_qr_' + idx);
                  if (img) img.src = qr.toDataURL('image/png');
                } catch (e) {}
              });
              setTimeout(function() { window.print(); }, 500);
            }
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              initQrs();
            } else {
              window.onload = initQrs;
            }
          })();
        <\/script>
      </body>
      </html>`;

    printWin.document.open();
    printWin.document.write(batchDocHtml);
    printWin.document.close();
  };

  window.printSingleOrder = function(orderIdOrObj) {
    if (!orderIdOrObj) return window.generateBatchPDF();
    if (typeof orderIdOrObj === 'object') return window.generateBatchPDF([orderIdOrObj]);
    const orders = window.allOrders || window.allOrdersData || [];
    const searchId = String(orderIdOrObj).trim();
    const found = orders.find(o => {
      const oId = String(o.orderId || o['訂單編號'] || o['單號'] || o.orderNo || '').trim();
      return oId === searchId;
    });
    if (found) window.generateBatchPDF([found]);
    else window.generateBatchPDF();
  };

})(window);
