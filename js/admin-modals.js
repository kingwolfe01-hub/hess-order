/**
 * 經銷作業後台 - 彈出視窗 (Modals) 動態渲染與表單互動模組
 */

window.injectAdminModals = function() {
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = `
    <!-- Modal 1: 合作學校勾選管理 -->
    <div id="clientModal" class="hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 no-print">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div class="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 class="text-sm font-black text-slate-900">☑️ 勾選本學期採用何嘉仁教材之合作學校</h3>
            <p class="text-xs text-slate-500">請勾選本學期確定合作的學校，系統將僅針對勾選校進行催單統計。</p>
          </div>
          <button type="button" onclick="closeClientModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold px-2">✕</button>
        </div>
        <div class="p-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <input type="text" id="modalSearch" oninput="renderModalList()" placeholder="🔍 快速過濾學校或鄉鎮..." class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none bg-slate-50 w-44">
            <button type="button" onclick="toggleAllClients(true)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700">全選</button>
            <button type="button" onclick="toggleAllClients(false)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700">全部取消</button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500">依業務員快選：</span>
            <button type="button" onclick="selectBySalesman('黃依華')" class="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded font-semibold">僅選 黃依華</button>
            <button type="button" onclick="selectBySalesman('黃亮智')" class="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold">僅選 黃亮智</button>
          </div>
        </div>
        <div class="p-3 overflow-y-auto flex-1 bg-slate-50/50">
          <div id="modalSchoolGrid" class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"></div>
        </div>
        <div class="p-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
          <div class="text-slate-600">
            已勾選合作學校：<strong id="modalSelectedCount" class="text-red-700 font-mono-num font-bold text-sm">0</strong> / <span id="modalTotalBaseCount">0</span> 所
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="closeClientModal()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold">取消</button>
            <button type="button" onclick="saveClientSelection()" class="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold shadow-sm">儲存並套用</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 2: 經銷商訂單修改編輯器 -->
    <div id="editOrderModal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 no-print">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        <div class="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div class="flex items-center gap-2">
            <span class="p-1.5 bg-amber-500 text-white rounded-lg text-sm">✏️</span>
            <div>
              <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>經銷商後台訂單修改</span>
                <span id="editModalSchoolBadge" class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold"></span>
                <span id="editModalOrderIdBadge" class="font-mono text-xs text-slate-500 font-semibold"></span>
              </h3>
              <p class="text-[11px] text-slate-500">修改完成儲存後將同步更新雲端試算表與何嘉仁傳真清冊。</p>
            </div>
          </div>
          <button type="button" onclick="closeEditOrderModal()" class="text-slate-400 hover:text-slate-600 text-xl font-bold px-2">✕</button>
        </div>

        <div class="p-4 overflow-y-auto flex-1 space-y-4 text-xs bg-slate-50/40">
          <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div class="font-bold text-slate-800 text-xs flex items-center gap-1 border-b pb-1.5">
              <span class="w-1.5 h-3 bg-red-700 rounded-sm"></span> 基本資訊與指送處室
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div><label class="block text-slate-500 mb-1 font-semibold">承辦人員：</label><input type="text" id="editContactPerson" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none"></div>
              <div><label class="block text-slate-500 mb-1 font-semibold">聯絡電話：</label><input type="text" id="editContactPhone" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 outline-none"></div>
              <div><label class="block text-red-700 mb-1 font-bold">校內指送處室：</label><input type="text" id="editDeliveryLocation" class="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 font-bold text-red-950 bg-amber-50/40 outline-none"></div>
              <div><label class="block text-slate-500 mb-1 font-semibold">送書週次：</label><input type="text" id="editDeliveryDates" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"></div>
              <div class="md:col-span-4"><label class="block text-slate-500 mb-1 font-semibold">單據備註：</label><input type="text" id="editOrderRemark" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"></div>
            </div>
          </div>

          <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div class="font-bold text-slate-800 text-xs border-b pb-1.5">低年級四大系列 (一年級、二年級 課/習/教)</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="lowGradeEditGrid"></div>
          </div>

          <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div class="font-bold text-slate-800 text-xs border-b pb-1.5">Super Fun 審定版 (3~6 年級 課本/習作/開通卡/教用)</div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-center" id="highGradeEditGrid"></div>
          </div>

          <div class="bg-amber-50/70 border border-amber-300 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-bold text-amber-900">📊 修改後全校總計即時運算：</span>
            <div class="flex items-center gap-3 font-bold font-mono">
              <span>課本總計: <strong id="m_total_tb" class="text-red-700 text-sm">0</strong> 本</span>
              <span>習作總計: <strong id="m_total_wb" class="text-amber-700 text-sm">0</strong> 本</span>
              <span>開通卡: <strong id="m_total_card" class="text-emerald-700 text-sm">0</strong> 張</span>
              <span>教師用書: <strong id="m_total_tc" class="text-blue-800 text-sm">0</strong> 份</span>
            </div>
          </div>
        </div>

        <div class="p-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
          <span class="text-slate-400">※ 儲存後將直接同步雲端試算表</span>
          <div class="flex items-center gap-2">
            <button type="button" onclick="closeEditOrderModal()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold">取消</button>
            <button type="button" onclick="saveEditOrder()" id="btnSaveEditOrder" class="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold shadow-sm">💾 儲存修改並同步雲端</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 3: API 網址設定 -->
    <div id="apiModal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="font-bold text-slate-800 text-sm">⚙️ Google Apps Script 後端網址設定</h3>
          <button type="button" onclick="closeApiModal()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        <div class="space-y-2 text-xs">
          <label class="block font-bold text-slate-700">目前使用的 GAS WebApp URL：</label>
          <input type="text" id="inputGasUrl" class="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs outline-none">
          <div class="flex flex-wrap gap-1.5 pt-1">
            <button type="button" onclick="setQuickUrl(window.DEFAULT_PRIMARY_GAS_URL)" class="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold">1. 旗艦整合端點 (S_WOK)</button>
            <button type="button" onclick="setQuickUrl(window.FALLBACK_GAS_URL)" class="px-2 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-bold">2. 備用端點 (UwUyWKt)</button>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t text-xs">
          <button type="button" onclick="closeApiModal()" class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold">取消</button>
          <button type="button" onclick="saveApiUrl()" class="px-4 py-1.5 bg-red-700 text-white rounded-lg font-bold">儲存並重新讀取</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalContainer);

  // 用迴圈動態產生編輯器內的 28 個教材輸入框 (取代原本 160 行重複 HTML)
  const lowSeries = [
    { key: 'wosp', title: '★ WOW! STORY Phonics', highlight: true },
    { key: 'wow',  title: 'WOW! STORY (低年級)', highlight: false },
    { key: 'fw',   title: 'Fun World (低年級)', highlight: false },
    { key: 'gm',   title: 'Go Magic! (低年級)', highlight: false }
  ];
  document.getElementById('lowGradeEditGrid').innerHTML = lowSeries.map(s => `
    <div class="border ${s.highlight ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'} rounded-lg p-2.5">
      <div class="font-bold text-slate-900 mb-1.5">${s.title}</div>
      <div class="grid grid-cols-6 gap-1.5 text-center items-center">
        <span class="col-span-2 text-slate-600 font-bold">一年級：</span>
        <input type="number" min="0" id="m_${s.key}_g1_tb" placeholder="課" class="col-span-1 border rounded py-1 text-center font-mono font-bold bg-white" oninput="calcEditModalTotals()">
        <input type="number" min="0" id="m_${s.key}_g1_wb" placeholder="習" class="col-span-1 border rounded py-1 text-center font-mono font-bold bg-white" oninput="calcEditModalTotals()">
        <input type="number" min="0" id="m_${s.key}_g1_tc" placeholder="教" class="col-span-2 border border-blue-200 rounded py-1 text-center font-mono font-bold bg-blue-50/40 text-blue-900" oninput="calcEditModalTotals()">
        <span class="col-span-2 text-slate-600 font-bold">二年級：</span>
        <input type="number" min="0" id="m_${s.key}_g2_tb" placeholder="課" class="col-span-1 border rounded py-1 text-center font-mono font-bold bg-white" oninput="calcEditModalTotals()">
        <input type="number" min="0" id="m_${s.key}_g2_wb" placeholder="習" class="col-span-1 border rounded py-1 text-center font-mono font-bold bg-white" oninput="calcEditModalTotals()">
        <input type="number" min="0" id="m_${s.key}_g2_tc" placeholder="教" class="col-span-2 border border-blue-200 rounded py-1 text-center font-mono font-bold bg-blue-50/40 text-blue-900" oninput="calcEditModalTotals()">
      </div>
    </div>
  `).join('');

  const highGrades = [
    { g: 3, label: '三年級' }, { g: 4, label: '四年級' }, { g: 5, label: '五年級' }, { g: 6, label: '六年級' }
  ];
  document.getElementById('highGradeEditGrid').innerHTML = highGrades.map(item => `
    <div class="border rounded-lg p-2 bg-slate-50/60 space-y-1">
      <div class="font-bold text-slate-800">${item.label}</div>
      <div class="grid grid-cols-3 gap-1">
        <input type="number" min="0" id="m_sf_g${item.g}_tb" placeholder="課本" class="border rounded py-1 text-center font-mono font-bold bg-white" oninput="calcEditModalTotals()">
        <input type="number" min="0" id="m_sf_g${item.g}_wb" placeholder="習作" class="border rounded py-1 text-center font-mono font-bold bg-white" oninput="calcEditModalTotals()">
        <input type="number" min="0" id="m_sf_g${item.g}_card" placeholder="卡片" class="border border-emerald-300 rounded py-1 text-center font-mono font-bold bg-emerald-50 text-emerald-800" oninput="calcEditModalTotals()">
      </div>
      <input type="number" min="0" id="m_sf_g${item.g}_tc" placeholder="教師用書" class="w-full border border-blue-200 rounded py-1 text-center font-mono font-bold bg-blue-50/40 text-blue-900" oninput="calcEditModalTotals()">
    </div>
  `).join('');
};

window.openApiModal = function() {
  const inp = document.getElementById('inputGasUrl');
  if (inp) inp.value = window.GAS_URL;
  const m = document.getElementById('apiModal');
  if (m) {
    m.classList.remove('hidden');
    m.style.setProperty('display', 'flex', 'important');
  }
};
window.closeApiModal = function() {
  const m = document.getElementById('apiModal');
  if (m) {
    m.classList.add('hidden');
    m.style.setProperty('display', 'none', 'important');
  }
};
window.setQuickUrl = function(url) { document.getElementById('inputGasUrl').value = url; };
window.saveApiUrl = function() {
  const val = document.getElementById('inputGasUrl').value.trim();
  if (val) {
    window.GAS_URL = val;
    window.GAS_API_URL = val;
    localStorage.setItem('HESS_ADMIN_GAS_URL', val);
    localStorage.setItem('GAS_API_URL', val);
  }
  closeApiModal();
  if (typeof reloadAllSystemData === 'function') {
    reloadAllSystemData();
  } else if (typeof loadAllData === 'function') {
    loadAllData();
  }
};

window.openClientModal = function() {
  const m = document.getElementById('clientModal');
  if (m) {
    m.classList.remove('hidden');
    m.style.setProperty('display', 'flex', 'important');
  }
  renderModalList();
};
window.closeClientModal = function() {
  const m = document.getElementById('clientModal');
  if (m) {
    m.classList.add('hidden');
    m.style.setProperty('display', 'none', 'important');
  }
};

window.initClientSelection = function() {
  const baseEl = document.getElementById('modalTotalBaseCount');
  if (baseEl) baseEl.textContent = FULL_SCHOOL_DB.length;
  const saved = localStorage.getItem('active_hess_client_keys');
  if (saved) {
    try { window.activeClientKeys = JSON.parse(saved); } catch(e) { window.activeClientKeys = FULL_SCHOOL_DB.map(getSchoolCompositeKey); }
  } else {
    window.activeClientKeys = FULL_SCHOOL_DB.map(getSchoolCompositeKey);
  }
  const lbl = document.getElementById('labelActiveClientCount');
  if (lbl) lbl.textContent = window.activeClientKeys.length;
};

window.renderModalList = function() {
  const q = (document.getElementById('modalSearch')?.value || '').trim().toLowerCase();
  const container = document.getElementById('modalSchoolGrid');
  if (!container) return;

  const filtered = FULL_SCHOOL_DB.filter(s => 
    !q || s.name.toLowerCase().includes(q) || s.district.toLowerCase().includes(q) || (s.salesman && s.salesman.toLowerCase().includes(q))
  );

  container.innerHTML = filtered.map(s => {
    const compKey = getSchoolCompositeKey(s);
    const isChecked = window.activeClientKeys.includes(compKey);
    return `
      <label class="flex items-center gap-1.5 p-1.5 rounded-lg border bg-white hover:bg-red-50/50 cursor-pointer transition ${isChecked ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}">
        <input type="checkbox" value="${compKey}" class="client-chk accent-red-600 rounded" ${isChecked ? 'checked' : ''} onchange="updateModalCount()">
        <span class="truncate font-semibold text-slate-800">${s.district} ${s.name}國小</span>
        <span class="text-[10px] text-slate-400 ml-auto whitespace-nowrap">${s.salesman || ''}</span>
      </label>
    `;
  }).join('');
  updateModalCount();
};

window.updateModalCount = function() {
  const checkedBoxes = document.querySelectorAll('.client-chk:checked');
  const cntEl = document.getElementById('modalSelectedCount');
  if (cntEl) cntEl.textContent = checkedBoxes.length;
};

window.toggleAllClients = function(check) {
  document.querySelectorAll('.client-chk').forEach(c => c.checked = check);
  updateModalCount();
};

window.selectBySalesman = function(salesman) {
  document.querySelectorAll('.client-chk').forEach(c => {
    const s = FULL_SCHOOL_DB.find(item => getSchoolCompositeKey(item) === c.value);
    if (s) c.checked = (s.salesman === salesman);
  });
  updateModalCount();
};

window.saveClientSelection = function() {
  window.activeClientKeys = Array.from(document.querySelectorAll('.client-chk:checked')).map(c => c.value);
  localStorage.setItem('active_hess_client_keys', JSON.stringify(window.activeClientKeys));
  document.getElementById('labelActiveClientCount').textContent = window.activeClientKeys.length;
  closeClientModal();
  calculateKPI();
  renderUnsubmittedTable();
  alert(`已儲存！本學期採用何嘉仁合作學校已設定為【${window.activeClientKeys.length} 所】！`);
};

window.openEditOrderModal = function(orderId) {
  if (!orderId) return alert('⚠️ 無法取得訂單單號！');
  const searchId = String(orderId).trim();
  const order = (window.allOrders || []).find(o => {
    const oId = String(o.orderId || o['訂單編號'] || o['單號'] || o.orderNo || '').trim();
    return oId === searchId;
  });
  if (!order) {
    return alert(`⚠️ 找不到單號【${orderId}】之訂單詳細資料！\n請先確認是否已點擊頂部「重新讀取」按鈕以同步雲端最新資料。`);
  }

  window.currentEditingOrderId = orderId;
  const badgeOrder = document.getElementById('editModalOrderIdBadge');
  if (badgeOrder) badgeOrder.textContent = orderId;
  const badgeSchool = document.getElementById('editModalSchoolBadge');
  if (badgeSchool) badgeSchool.textContent = order.school || '';

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('editContactPerson', order.contactPerson || '');
  setVal('editContactPhone', order.contactPhone || '');
  setVal('editDeliveryLocation', order.deliveryLocation || '教務處');
  setVal('editDeliveryDates', order.deliveryDates || '常規');
  setVal('editOrderRemark', order.remark || '');

  const fields = [
    'wosp_g1_tb','wosp_g1_wb','wosp_g1_tc','wosp_g2_tb','wosp_g2_wb','wosp_g2_tc',
    'wow_g1_tb','wow_g1_wb','wow_g1_tc','wow_g2_tb','wow_g2_wb','wow_g2_tc',
    'fw_g1_tb','fw_g1_wb','fw_g1_tc','fw_g2_tb','fw_g2_wb','fw_g2_tc',
    'gm_g1_tb','gm_g1_wb','gm_g1_tc','gm_g2_tb','gm_g2_wb','gm_g2_tc',
    'sf_g3_tb','sf_g3_wb','sf_g3_card','sf_g3_tc',
    'sf_g4_tb','sf_g4_wb','sf_g4_card','sf_g4_tc',
    'sf_g5_tb','sf_g5_wb','sf_g5_card','sf_g5_tc',
    'sf_g6_tb','sf_g6_wb','sf_g6_card','sf_g6_tc'
  ];
  fields.forEach(k => {
    const el = document.getElementById('m_' + k);
    if (el) el.value = (order[k] && parseInt(order[k], 10) > 0) ? parseInt(order[k], 10) : '';
  });

  calcEditModalTotals();
  const modal = document.getElementById('editOrderModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
  }
};

window.closeEditOrderModal = function() {
  const modal = document.getElementById('editOrderModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  window.currentEditingOrderId = null;
};

window.calcEditModalTotals = function() {
  const getNum = (id) => parseInt(document.getElementById(id)?.value, 10) || 0;
  const tb = getNum('m_wosp_g1_tb') + getNum('m_wosp_g2_tb') + getNum('m_wow_g1_tb') + getNum('m_wow_g2_tb') + getNum('m_fw_g1_tb') + getNum('m_fw_g2_tb') + getNum('m_gm_g1_tb') + getNum('m_gm_g2_tb') + getNum('m_sf_g3_tb') + getNum('m_sf_g4_tb') + getNum('m_sf_g5_tb') + getNum('m_sf_g6_tb');
  const wb = getNum('m_wosp_g1_wb') + getNum('m_wosp_g2_wb') + getNum('m_wow_g1_wb') + getNum('m_wow_g2_wb') + getNum('m_fw_g1_wb') + getNum('m_fw_g2_wb') + getNum('m_gm_g1_wb') + getNum('m_gm_g2_wb') + getNum('m_sf_g3_wb') + getNum('m_sf_g4_wb') + getNum('m_sf_g5_wb') + getNum('m_sf_g6_wb');
  const card = getNum('m_sf_g3_card') + getNum('m_sf_g4_card') + getNum('m_sf_g5_card') + getNum('m_sf_g6_card');
  const tc = getNum('m_wosp_g1_tc') + getNum('m_wosp_g2_tc') + getNum('m_wow_g1_tc') + getNum('m_wow_g2_tc') + getNum('m_fw_g1_tc') + getNum('m_fw_g2_tc') + getNum('m_gm_g1_tc') + getNum('m_gm_g2_tc') + getNum('m_sf_g3_tc') + getNum('m_sf_g4_tc') + getNum('m_sf_g5_tc') + getNum('m_sf_g6_tc');

  const setTotal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTotal('m_total_tb', tb);
  setTotal('m_total_wb', wb);
  setTotal('m_total_card', card);
  setTotal('m_total_tc', tc);
};

window.saveEditOrder = function() {
  if (!window.currentEditingOrderId) return;
  const getNum = (id) => parseInt(document.getElementById(id)?.value, 10) || 0;

  const payload = {
    action: "editOrder",
    orderId: window.currentEditingOrderId,
    contactPerson: document.getElementById('editContactPerson')?.value.trim() || '',
    contactPhone: document.getElementById('editContactPhone')?.value.trim() || '',
    deliveryLocation: document.getElementById('editDeliveryLocation')?.value.trim() || '教務處',
    deliveryDates: document.getElementById('editDeliveryDates')?.value.trim() || '常規',
    orderRemark: document.getElementById('editOrderRemark')?.value.trim() || ''
  };

  const fields = [
    'wosp_g1_tb','wosp_g1_wb','wosp_g1_tc','wosp_g2_tb','wosp_g2_wb','wosp_g2_tc',
    'wow_g1_tb','wow_g1_wb','wow_g1_tc','wow_g2_tb','wow_g2_wb','wow_g2_tc',
    'fw_g1_tb','fw_g1_wb','fw_g1_tc','fw_g2_tb','fw_g2_wb','fw_g2_tc',
    'gm_g1_tb','gm_g1_wb','gm_g1_tc','gm_g2_tb','gm_g2_wb','gm_g2_tc',
    'sf_g3_tb','sf_g3_wb','sf_g3_card','sf_g3_tc',
    'sf_g4_tb','sf_g4_wb','sf_g4_card','sf_g4_tc',
    'sf_g5_tb','sf_g5_wb','sf_g5_card','sf_g5_tc',
    'sf_g6_tb','sf_g6_wb','sf_g6_card','sf_g6_tc'
  ];
  fields.forEach(k => payload[k] = getNum('m_' + k));

  const btn = document.getElementById('btnSaveEditOrder');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ 同步雲端中...';
  }
  const targetOrderId = window.currentEditingOrderId;

  postViaHiddenIframe(window.GAS_URL, payload, function() {
    const target = (window.allOrders || []).find(o => {
      const oId = String(o.orderId || o['訂單編號'] || o['單號'] || o.orderNo || '').trim();
      return oId === String(targetOrderId).trim();
    });
    if (target) {
      Object.assign(target, payload);
      target.totalTextbook = (document.getElementById('m_total_tb')?.textContent || '0') + " 本";
      target.totalWorkbook = (document.getElementById('m_total_wb')?.textContent || '0') + " 本";
      target.totalCard = (document.getElementById('m_total_card')?.textContent || '0') + " 張";
      target.totalTeacher = (document.getElementById('m_total_tc')?.textContent || '0') + " 份";
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 儲存修改並同步雲端';
    }
    if (typeof renderOrdersTable === 'function') renderOrdersTable();
    if (typeof renderDispatchTable === 'function') renderDispatchTable();
    if (typeof calculateKPI === 'function') calculateKPI();
    closeEditOrderModal();
    alert(`✅ 訂單【${targetOrderId}】修改已成功同步送出至雲端試算表！`);
  });
};