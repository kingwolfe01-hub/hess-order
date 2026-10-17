/**
 * 何嘉仁 國小英語教材訂購系統 (B版) - 完整主程式 (串接 Google Sheets & 自動發信 & LINE 推播版)
 * 學校資料庫獨立於 js/schools.js
 * 支援 QRious 高清 QR Code、掃碼查驗網址與 63 欄試算表結構對齊
 */

// ==========================================
// 0. 後端 Google Apps Script 串接設定
// ==========================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby_e_CgUbsEliZKVNfjCxV37EXJnN6lIhjrp6i9VrxI0DEQm0PcmwT-N9vGP5y13fOX/exec";

// ==========================================
// 1. 系統配置與學期規則 (包含書單 Schema)
// ==========================================
const ORDER_RULE = {
  '2': {
    name: '第二學期',
    titleSuffix: '第二學期',
    bookType: '雙數冊',
    lowGrades: { g1: 2, g2: 4 },
    midHighGrades: { g3: 2, g4: 4, g5: 6, g6: 8 },
    hintLow: '預訂下學期：一年級第2冊、二年級第4冊 (雙數冊)',
    hintMid: '預訂下學期為雙數冊：2、4、6、8 冊',
    deliveryWeeks: ['12/21 - 12/24', '12/28 - 12/31', '1/4 - 1/8', '1/11 - 1/15', '1/18 - 1/22']
  },
  '1': {
    name: '第一學期',
    titleSuffix: '第一學期',
    bookType: '單數冊',
    lowGrades: { g1: 1, g2: 3 },
    midHighGrades: { g3: 1, g4: 3, g5: 5, g6: 7 },
    hintLow: '預訂上學期：一年級第1冊、二年級第3冊 (單數冊)',
    hintMid: '預訂上學期為單數冊：1、3、5、7 冊',
    deliveryWeeks: ['7/13 - 7/17', '7/20 - 7/24', '7/27 - 7/31', '8/3 - 8/7', '8/10 - 8/14']
  }
};

const ORDER_TYPES = {
  initial: {
    badge: '首筆訂購單',
    gasLabel: '首筆訂單',
    badgeClass: 'bg-slate-800 text-white',
    titleSuffix: '(B版)',
    desc: '(全校常規訂購)',
    notice: ''
  },
  modify: {
    badge: '改單 (數量變更)',
    gasLabel: '改單 (數量變更)',
    badgeClass: 'bg-amber-600 text-white',
    titleSuffix: '(改單 B版)',
    desc: '(數量異動，以本單為主)',
    notice: '⚠️ 本單據為「改單」，將完全覆蓋並取代原先之預訂數量，請務必重新核對！'
  },
  append: {
    badge: '增訂 (追加補單)',
    gasLabel: '增訂 (追加補單)',
    badgeClass: 'bg-emerald-600 text-white',
    titleSuffix: '(增訂 B版)',
    desc: '(額外追加數量，不影響原單)',
    notice: '📌 本單據為「增訂追加」，所填數量均為額外追加本數，原訂單數量依然保留！'
  }
};

const LOW_GRADE_SERIES = [
  {
    name: 'WOW! STORY',
    badge: 'Phonics',
    rowClass: 'bg-red-50/20',
    grades: [
      { gradeLabel: '一年級', key: 'g1', baseCode: 'WOSP-G1' },
      { gradeLabel: '二年級', key: 'g2', baseCode: 'WOSP-G2' }
    ]
  },
  {
    name: 'WOW! STORY',
    subLabel: '(低年級)',
    rowClass: '',
    grades: [
      { gradeLabel: '一年級', key: 'g1', baseCode: 'Wow-G1' },
      { gradeLabel: '二年級', key: 'g2', baseCode: 'Wow-G2' }
    ]
  },
  {
    name: 'Fun World',
    subLabel: '(低年級)',
    rowClass: 'bg-slate-50/40',
    grades: [
      { gradeLabel: '一年級', key: 'g1', baseCode: 'FW-G1' },
      { gradeLabel: '二年級', key: 'g2', baseCode: 'FW-G2' }
    ]
  },
  {
    name: 'Go Magic!',
    subLabel: '(低年級)',
    rowClass: '',
    grades: [
      { gradeLabel: '一年級', key: 'g1', baseCode: 'GM-G1' },
      { gradeLabel: '二年級', key: 'g2', baseCode: 'GM-G2' }
    ]
  }
];

const HIGH_GRADE_SERIES = [
  {
    name: 'Super Fun',
    subLabel: '(審定版)',
    grades: [
      { gradeLabel: '三年級', key: 'g3', baseCode: 'SF-G3' },
      { gradeLabel: '四年級', key: 'g4', baseCode: 'SF-G4' },
      { gradeLabel: '五年級', key: 'g5', baseCode: 'SF-G5' },
      { gradeLabel: '六年級', key: 'g6', baseCode: 'SF-G6' }
    ]
  }
];

// 全域狀態變數
let targetAcademicYear = 115;
let targetSemester = '2'; // 預設第二學期(雙數冊)
let currentOrderType = 'initial';
let currentSchool = null;
let isSubmitting = false;

// ==========================================
// 2. 表格動態渲染與加總運算
// ==========================================
function renderLowGradeTable(semester) {
  const rule = ORDER_RULE[semester] || ORDER_RULE['2'];
  return LOW_GRADE_SERIES.map((series) => {
    return series.grades.map((g, index) => {
      const volNum = rule.lowGrades[g.key];
      const isFirstRow = index === 0;

      let seriesTd = '';
      if (isFirstRow) {
        seriesTd = `
          <td rowspan="${series.grades.length}" class="border border-slate-400 py-1.5 px-1.5 font-bold bg-white text-slate-900">
            ${series.name}
            ${series.badge ? `<br><span class="text-[10px] font-black text-red-700 bg-red-100 px-1 py-0.2 rounded">${series.badge}</span>` : ''}
            ${series.subLabel ? `<br><span class="text-[9px] text-slate-500 font-normal">${series.subLabel}</span>` : ''}
          </td>
        `;
      }

      return `
        <tr class="${series.rowClass}">
          ${seriesTd}
          <td class="border border-slate-400 py-1.5 text-slate-700">${g.gradeLabel}</td>
          <td class="border border-slate-400 py-1.5 font-mono-num font-bold text-red-700 text-xs">${volNum}</td>
          <td class="border border-slate-400 py-1.5 px-1 bg-amber-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="課本" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-textbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-amber-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="習作" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-workbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-blue-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="教用" class="w-full text-center outline-none font-mono-num text-slate-800 calc-input q-teacher">
          </td>
          <td class="border border-slate-400 py-1.5 px-1">
            <input type="text" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="備註" class="w-full text-center outline-none text-[10px] text-slate-600 q-remark">
          </td>
        </tr>
      `;
    }).join('');
  }).join('');
}

function renderHighGradeTable(semester) {
  const rule = ORDER_RULE[semester] || ORDER_RULE['2'];
  return HIGH_GRADE_SERIES.map((series) => {
    return series.grades.map((g, index) => {
      const volNum = rule.midHighGrades[g.key];
      const isFirstRow = index === 0;

      let seriesTd = '';
      if (isFirstRow) {
        seriesTd = `
          <td rowspan="${series.grades.length}" class="border border-slate-400 py-1 px-1.5 font-bold bg-white text-slate-900">
            ${series.name}
            ${series.subLabel ? `<br><span class="text-[9px] text-slate-500 font-normal">${series.subLabel}</span>` : ''}
          </td>
        `;
      }

      return `
        <tr>
          ${seriesTd}
          <td class="border border-slate-400 py-1.5 text-slate-700">${g.gradeLabel}</td>
          <td class="border border-slate-400 py-1.5 font-mono-num font-bold text-red-700 text-xs">${volNum}</td>
          <td class="border border-slate-400 py-1.5 px-1 bg-amber-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="課本" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-textbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-amber-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="習作" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-workbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-emerald-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="開通卡" class="w-full text-center outline-none font-mono-num font-bold text-emerald-900 calc-input q-card">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-blue-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="教用" class="w-full text-center outline-none font-mono-num text-slate-800 calc-input q-teacher">
          </td>
          <td class="border border-slate-400 py-1.5 px-1">
            <input type="text" data-base="${g.baseCode}" data-vol="${volNum}" data-kind="備註" class="w-full text-center outline-none text-[10px] text-slate-600 q-remark">
          </td>
        </tr>
      `;
    }).join('');
  }).join('');
}

function calculateTotals() {
  const sumValues = (selector) => {
    return Array.from(document.querySelectorAll(selector)).reduce((acc, input) => {
      const val = parseInt(input.value, 10);
      return acc + (isNaN(val) || val < 0 ? 0 : val);
    }, 0);
  };

  const textbook = sumValues('.q-textbook');
  const workbook = sumValues('.q-workbook');
  const card = sumValues('.q-card');
  const teacher = sumValues('.q-teacher');

  const elTextbook = document.getElementById('totalTextbook');
  const elWorkbook = document.getElementById('totalWorkbook');
  const elCard = document.getElementById('totalCard');
  const elTeacher = document.getElementById('totalTeacher');

  if (elTextbook) elTextbook.textContent = `${textbook} 本`;
  if (elWorkbook) elWorkbook.textContent = `${workbook} 本`;
  if (elCard) elCard.textContent = `${card} 張`;
  if (elTeacher) elTeacher.textContent = `${teacher} 份`;

  updateQRCode();
}

function renderDeliveryWeeks(semester) {
  const container = document.getElementById('deliveryWeekContainer');
  if (!container) return;

  const rule = ORDER_RULE[semester] || ORDER_RULE['2'];
  container.innerHTML = '';

  rule.deliveryWeeks.forEach((weekText) => {
    const label = document.createElement('label');
    label.className = 'inline-flex items-center gap-1 cursor-pointer hover:text-red-700 transition';
    label.innerHTML = `
      <input type="checkbox" name="deliveryWeek" value="${weekText}" class="rounded border-slate-300 text-red-600 focus:ring-red-500">
      <span>${weekText}</span>
    `;
    container.appendChild(label);
  });
}

function updateTables(semester) {
  targetSemester = semester;
  const rule = ORDER_RULE[semester] || ORDER_RULE['2'];

  const elLabelSemester = document.getElementById('labelTargetSemester');
  const elHintLow = document.getElementById('hintLowSemester');
  const elHintMid = document.getElementById('hintMidSemester');

  if (elLabelSemester) elLabelSemester.textContent = rule.titleSuffix;
  if (elHintLow) elHintLow.textContent = rule.hintLow;
  if (elHintMid) elHintMid.textContent = rule.hintMid;

  // 切換學期按鈕樣式
  const btnSem2 = document.getElementById('btnTargetSem2');
  const btnSem1 = document.getElementById('btnTargetSem1');
  if (btnSem2 && btnSem1) {
    if (semester === '2') {
      btnSem2.className = 'px-2 py-0.5 rounded-md font-bold transition bg-white text-slate-900 shadow-sm';
      btnSem1.className = 'px-2 py-0.5 rounded-md font-medium transition text-slate-600 hover:text-slate-900';
    } else {
      btnSem1.className = 'px-2 py-0.5 rounded-md font-bold transition bg-white text-slate-900 shadow-sm';
      btnSem2.className = 'px-2 py-0.5 rounded-md font-medium transition text-slate-600 hover:text-slate-900';
    }
  }

  // 渲染表格內容
  const tbodyLow = document.getElementById('tbodyLowGrade');
  const tbodyHigh = document.getElementById('tbodyHighGrade');
  if (tbodyLow) tbodyLow.innerHTML = renderLowGradeTable(semester);
  if (tbodyHigh) tbodyHigh.innerHTML = renderHighGradeTable(semester);

  renderDeliveryWeeks(semester);
  calculateTotals();
}

// ==========================================
// 3. 學校即時搜尋與聯動 (讀取 js/schools.js)
// ==========================================
function setupSchoolSearch() {
  const inputEl = document.getElementById('schoolSearchInput');
  const dropdownEl = document.getElementById('schoolDropdown');
  if (!inputEl || !dropdownEl) return;

  const db = (typeof SCHOOL_DATABASE !== 'undefined') ? SCHOOL_DATABASE : [];

  inputEl.addEventListener('input', () => {
    const query = inputEl.value.trim().toLowerCase();
    dropdownEl.innerHTML = '';

    if (!query) {
      dropdownEl.classList.add('hidden');
      return;
    }

    const matches = db.filter((school) => {
      return (
        school.name.toLowerCase().includes(query) ||
        school.district.toLowerCase().includes(query) ||
        school.city.toLowerCase().includes(query)
      );
    }).slice(0, 15);

    if (matches.length === 0) {
      dropdownEl.innerHTML = `<div class="p-2 text-slate-400 text-center text-xs">無符合學校，可直接手動填寫欄位</div>`;
      dropdownEl.classList.remove('hidden');
      return;
    }

    matches.forEach((school) => {
      const item = document.createElement('div');
      item.className = 'px-3 py-1.5 hover:bg-red-50 cursor-pointer flex justify-between items-center transition';
      item.innerHTML = `
        <div>
          <span class="font-bold text-slate-800">${school.district} ${school.name}國小</span>
          <span class="text-[10px] text-slate-400 block">${school.address}</span>
        </div>
        <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
          業務: ${school.salesman || '黃亮智'}
        </span>
      `;

      item.addEventListener('click', () => {
        inputEl.value = `${school.district} ${school.name}國小`;
        dropdownEl.classList.add('hidden');
        fillSchoolForm(school);
      });

      dropdownEl.appendChild(item);
    });

    dropdownEl.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.classList.add('hidden');
    }
  });
}

function fillSchoolForm(school) {
  currentSchool = school;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('schoolCity', school.city);
  setVal('schoolDistrict', school.district);
  setVal('schoolName', school.name);
  setVal('contactPhone', school.phone);
  setVal('schoolAddress', school.address);
  setVal('deliveryLocation', school.defaultDeliveryLocation || '教務處');

  const salesmanInfo = document.getElementById('salesmanInfo');
  if (salesmanInfo) {
    if (school.salesman) {
      salesmanInfo.textContent = `服務業務：${school.salesman}`;
      salesmanInfo.classList.remove('hidden');
    } else {
      salesmanInfo.classList.add('hidden');
    }
  }

  refreshHistoryDropdown();
  updateQRCode();
}

// ==========================================
// 4. 單據狀態機、LocalStorage 存取與後端 GAS 同步
// ==========================================
function getStorageKey() {
  const schoolName = document.getElementById('schoolName')?.value.trim();
  if (!schoolName) return null;
  return `HESS_ORDER_${targetAcademicYear}_${targetSemester}_${schoolName}`;
}

function getSavedOrders() {
  const key = getStorageKey();
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function refreshHistoryDropdown() {
  const select = document.getElementById('schoolOrderHistorySelect');
  if (!select) return;

  const orders = getSavedOrders();
  select.innerHTML = '<option value="current">-- 填寫中新單據 --</option>';

  orders.forEach((ord, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    const typeLabel = ORDER_TYPES[ord.type]?.badge || ord.orderTypeLabel || ord.type;
    const displayNo = ord.orderId || ord.orderNo || '單據';
    const displayDate = ord.orderDate || ord.date || '';
    opt.textContent = `[${typeLabel}] ${displayNo} (${displayDate})`;
    select.appendChild(opt);
  });
}

function loadSavedOrder(index) {
  if (index === 'current') return;

  const orders = getSavedOrders();
  const order = orders[index];
  if (!order) return;

  changeOrderType(order.type || 'initial');

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  setVal('contactPerson', order.contactPerson || '');
  setVal('contactPhone', order.contactPhone || '');
  setVal('contactEmail', order.contactEmail || '');
  setVal('orderRemark', order.orderRemark ?? order.remark ?? '');
  setVal('deliveryLocation', order.deliveryLocation || '教務處');

  const savedWeeks = order.deliveryWeeks || (order.deliveryDates ? order.deliveryDates.split(', ') : []);
  const weekBoxes = document.querySelectorAll('input[name="deliveryWeek"]');
  weekBoxes.forEach(box => {
    box.checked = savedWeeks.includes(box.value);
  });

  document.querySelectorAll('.calc-input, .q-remark').forEach(input => input.value = '');

  // 相容回填：優先從 localItems 陣列回填，若無則解析 GAS 字典格式
  if (Array.isArray(order.localItems)) {
    order.localItems.forEach(item => {
      const input = document.querySelector(`input[data-base="${item.base}"][data-kind="${item.kind}"]`);
      if (input) input.value = item.value;
    });
  } else if (Array.isArray(order.items)) {
    order.items.forEach(item => {
      const input = document.querySelector(`input[data-base="${item.base}"][data-kind="${item.kind}"]`);
      if (input) input.value = item.value;
    });
  } else if (order.items && typeof order.items === 'object') {
    Object.entries(order.items).forEach(([key, val]) => {
      const parts = key.split('-');
      if (parts.length >= 4) {
        const base = `${parts[0]}-${parts[1]}`;
        const kind = parts[3];
        const input = document.querySelector(`input[data-base="${base}"][data-kind="${kind}"]`);
        if (input) input.value = val;
      }
    });
  }

  const displayOrderNo = order.orderId || order.orderNo || '';
  const badgeOrderNo = document.getElementById('badgeOrderNo');
  if (badgeOrderNo && displayOrderNo) {
    badgeOrderNo.textContent = `單號: ${displayOrderNo}`;
    badgeOrderNo.classList.remove('hidden');
  }

  const qrHint = document.getElementById('qrOrderTypeHint');
  if (qrHint && displayOrderNo) {
    qrHint.textContent = `已綁定: ${displayOrderNo}`;
  }

  calculateTotals();
  alert(`已載入：${displayOrderNo || '歷史單據'}`);
}

function createNewOrderForSchool() {
  const schoolName = document.getElementById('schoolName')?.value.trim();
  if (!schoolName) {
    alert('請先搜尋或輸入學校名稱！');
    return;
  }

  changeOrderType('modify');
  document.querySelectorAll('.calc-input').forEach(input => input.value = '');

  const select = document.getElementById('schoolOrderHistorySelect');
  if (select) select.value = 'current';

  const badgeOrderNo = document.getElementById('badgeOrderNo');
  if (badgeOrderNo) {
    badgeOrderNo.textContent = '';
    badgeOrderNo.classList.add('hidden');
  }

  const qrHint = document.getElementById('qrOrderTypeHint');
  if (qrHint) qrHint.textContent = '送出後自動綁定';

  calculateTotals();
  alert(`已為【${schoolName}國小】開啟第二筆單據填寫（預設為改單模式）。`);
}

/**
 * 收集表單資料並打包為與後端 Code.gs 100% 相容之結構
 */
function collectCurrentOrderData() {
  const rule = ORDER_RULE[targetSemester] || ORDER_RULE['2'];
  const typeCfg = ORDER_TYPES[currentOrderType] || ORDER_TYPES.initial;

  const schoolCity = document.getElementById('schoolCity')?.value.trim() || '';
  const schoolDistrict = document.getElementById('schoolDistrict')?.value.trim() || '';
  const schoolName = document.getElementById('schoolName')?.value.trim() || '';
  const y = document.getElementById('orderYear')?.value.trim() || '';
  const m = document.getElementById('orderMonth')?.value.trim() || '';
  const d = document.getElementById('orderDay')?.value.trim() || '';
  const orderDate = `${y}/${m}/${d}`;

  const deliveryWeeks = Array.from(document.querySelectorAll('input[name="deliveryWeek"]:checked')).map(cb => cb.value);

  const itemsMap = {};   // 供後端 Code.gs 解析寫入 63 欄試算表使用 (格式: WOSP-G1-B2-課本)
  const localItems = []; // 供前端本地歷史紀錄回填使用

  document.querySelectorAll('input[data-base]').forEach(input => {
    const val = input.value.trim();
    if (val && val !== '0') {
      const base = input.dataset.base;
      const vol = input.dataset.vol;
      const kind = input.dataset.kind;
      const parsedVal = input.type === 'number' ? (parseInt(val, 10) || 0) : val;

      localItems.push({ base, vol, kind, value: parsedVal });

      if (input.type === 'number' && parsedVal > 0) {
        const gasKey = `${base}-B${vol}-${kind}`;
        itemsMap[gasKey] = parsedVal;
      }
    }
  });

  const totalTextbook = document.getElementById('totalTextbook')?.textContent || '0 本';
  const totalWorkbook = document.getElementById('totalWorkbook')?.textContent || '0 本';
  const totalCard = document.getElementById('totalCard')?.textContent || '0 張';
  const totalTeacher = document.getElementById('totalTeacher')?.textContent || '0 份';

  return {
    academicYear: targetAcademicYear,
    semester: targetSemester,
    semesterText: rule.name,
    targetBookType: rule.bookType,
    type: currentOrderType,
    orderTypeLabel: typeCfg.gasLabel,
    schoolCity: schoolCity,
    schoolDistrict: schoolDistrict,
    schoolName: schoolName,
    orderDate: orderDate,
    contactPerson: document.getElementById('contactPerson')?.value.trim() || '',
    contactPhone: document.getElementById('contactPhone')?.value.trim() || '',
    contactEmail: document.getElementById('contactEmail')?.value.trim() || '',
    schoolAddress: document.getElementById('schoolAddress')?.value.trim() || '',
    deliveryLocation: document.getElementById('deliveryLocation')?.value.trim() || '教務處',
    orderRemark: document.getElementById('orderRemark')?.value.trim() || '',
    deliveryDates: deliveryWeeks.join(', '),
    deliveryWeeks: deliveryWeeks,
    items: itemsMap,
    localItems: localItems,
    totalTextbook: totalTextbook,
    totalWorkbook: totalWorkbook,
    totalCard: totalCard,
    totalTeacher: totalTeacher
  };
}

/**
 * 線上送出訂單：儲存本地紀錄、更新 QR 查驗碼、並傳送至 Google Apps Script
 */
async function submitOrder() {
  if (isSubmitting) return;

  const data = collectCurrentOrderData();

  if (!data.schoolName) {
    alert('請填寫或搜尋選擇「訂購學校」！');
    document.getElementById('schoolSearchInput')?.focus();
    return;
  }

  if (Object.keys(data.items).length === 0) {
    alert('訂單數量皆為 0，請至少填寫一項教材數量！');
    return;
  }

  if (data.contactEmail && !data.contactEmail.includes('@')) {
    alert('您填寫的「承辦信箱」格式似乎不正確，請包含 @ 符號（或留空）！');
    document.getElementById('contactEmail')?.focus();
    return;
  }

  const typeCode = currentOrderType.toUpperCase();
  const timeCode = Date.now().toString().slice(-4);
  const orderId = `${data.academicYear}${data.semester}-${data.schoolName}-${typeCode}-${timeCode}`;
  data.orderId = orderId;
  data.orderNo = orderId;

  // 1. 先存入瀏覽器 LocalStorage 備份
  const key = getStorageKey();
  if (key) {
    const orders = getSavedOrders();
    orders.unshift(data);
    localStorage.setItem(key, JSON.stringify(orders));
  }

  // 2. 更新畫面上的單號徽章與 QR Code
  const badgeOrderNo = document.getElementById('badgeOrderNo');
  if (badgeOrderNo) {
    badgeOrderNo.textContent = `單號: ${orderId}`;
    badgeOrderNo.classList.remove('hidden');
  }

  const qrHint = document.getElementById('qrOrderTypeHint');
  if (qrHint) qrHint.textContent = `已綁定: ${orderId}`;

  refreshHistoryDropdown();
  updateQRCode();

  // 3. 傳送至後端 Google Apps Script (寫入試算表 + 寄信給承辦人與管理員 + LINE 推播)
  const btnSubmit = document.getElementById('btnSubmitOrder');
  const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';

  try {
    isSubmitting = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('opacity-75', 'cursor-wait');
      btnSubmit.innerHTML = `<span>⏳ 雲端傳送中...</span>`;
    }

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(data)
    });

    let resultMsg = '✅ 已同步寫入雲端試算表並發送通知！';
    try {
      const resJson = await response.json();
      if (resJson && resJson.status === 'error') {
        resultMsg = `⚠️ 雲端回應提醒：${resJson.message}`;
      }
    } catch (parseErr) {
      // 若瀏覽器因跨網域跳轉限制無法讀取 JSON，資料實際上已送達 GAS
    }

    const emailNote = data.contactEmail
      ? `\n📧 電子確認收據已寄送至：${data.contactEmail}`
      : `\n(未填寫承辦信箱，僅發送內部通知)`;

    alert(
      `🎉 訂單已成功建立並上傳雲端！\n\n` +
      `單據號碼：${orderId}\n` +
      `訂購學校：${data.schoolCity}${data.schoolDistrict}${data.schoolName}國小\n` +
      `總量合計：課本 ${data.totalTextbook} / 習作 ${data.totalWorkbook}\n` +
      `${resultMsg}${emailNote}\n\n` +
      `請點擊「列印核章單」列印後呈主管核章！`
    );
  } catch (networkErr) {
    console.warn('POST 傳送改用 no-cors 備援模式:', networkErr);
    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      alert(
        `🎉 訂單已成功建立並送出！\n\n` +
        `單據號碼：${orderId}\n` +
        `訂購學校：${data.schoolName}國小\n` +
        `總量合計：課本 ${data.totalTextbook} / 習作 ${data.totalWorkbook}\n\n` +
        `請點擊「列印核章單」列印後呈主管核章！`
      );
    } catch (err2) {
      alert(`⚠️ 訂單已儲存於本機，但網路連線異常無法上傳雲端：\n${err2.message}`);
    }
  } finally {
    isSubmitting = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-75', 'cursor-wait');
      btnSubmit.innerHTML = originalBtnHtml;
    }
  }
}

function changeOrderType(type) {
  currentOrderType = type;
  const cfg = ORDER_TYPES[type] || ORDER_TYPES.initial;

  const btnInit = document.getElementById('btnOrderTypeInitial');
  const btnMod = document.getElementById('btnOrderTypeModify');
  const btnApp = document.getElementById('btnOrderTypeAppend');

  [btnInit, btnMod, btnApp].forEach(b => {
    if (b) {
      b.className = 'px-2.5 py-0.5 text-xs font-medium border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  });

  if (type === 'initial' && btnInit) {
    btnInit.className = 'px-2.5 py-0.5 text-xs font-bold rounded-l-md border border-slate-300 bg-white text-slate-800 shadow-sm';
  } else if (type === 'modify' && btnMod) {
    btnMod.className = 'px-2.5 py-0.5 text-xs font-bold border border-amber-500 bg-amber-500 text-white shadow-sm';
  } else if (type === 'append' && btnApp) {
    btnApp.className = 'px-2.5 py-0.5 text-xs font-bold rounded-r-md border border-emerald-500 bg-emerald-500 text-white shadow-sm';
  }

  const badge = document.getElementById('badgeOrderType');
  if (badge) {
    badge.textContent = cfg.badge;
    badge.className = `type-badge-stamp text-[10px] ${cfg.badgeClass}`;
  }

  const titleTag = document.getElementById('labelOrderTypeTitle');
  if (titleTag) titleTag.textContent = cfg.titleSuffix;

  const desc = document.getElementById('orderTypeDesc');
  if (desc) desc.textContent = cfg.desc;

  const bannerNotice = document.getElementById('bannerOrderNotice');
  const bannerNoticeText = document.getElementById('bannerOrderNoticeText');
  if (bannerNotice && bannerNoticeText) {
    if (cfg.notice) {
      bannerNoticeText.textContent = cfg.notice;
      bannerNotice.className = `mb-1.5 p-1 rounded text-[11px] flex items-center justify-between border ${
        type === 'modify' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
      }`;
      bannerNotice.classList.remove('hidden');
    } else {
      bannerNotice.classList.add('hidden');
    }
  }

  updateQRCode();
}

// ==========================================
// 5. 現代化 QRious 引擎渲染 (支援線上核驗網址與 UTF-8 中文)
// ==========================================
function toUtf8(str) {
  return unescape(encodeURIComponent(str));
}

function updateQRCode() {
  const qrBox = document.getElementById('qrcodeBox');
  if (!qrBox) return;

  const schoolName = document.getElementById('schoolName')?.value.trim() || '未填寫';
  const totalTb = document.getElementById('totalTextbook')?.textContent || '0';
  const tbNum = parseInt(totalTb, 10) || 0;
  const totalWb = document.getElementById('totalWorkbook')?.textContent || '0';
  const wbNum = parseInt(totalWb, 10) || 0;

  const badgeOrderNo = document.getElementById('badgeOrderNo')?.textContent || '';
  const cleanOrderNo = badgeOrderNo.replace('單號: ', '').trim();

  // 若已綁定單號，QR Code 直接指向後端 doGet 線上電子核驗收據網址！
  const rawPayload = cleanOrderNo
    ? `${GAS_WEB_APP_URL}?orderId=${encodeURIComponent(cleanOrderNo)}`
    : `HESS|${targetAcademicYear}-${targetSemester}|${schoolName}國小|${currentOrderType}|課本:${tbNum}|習作:${wbNum}`;

  qrBox.innerHTML = '';

  if (typeof QRious !== 'undefined') {
    try {
      const qr = new QRious({
        value: toUtf8(rawPayload),
        size: 160,
        level: 'M',
        background: '#ffffff',
        foreground: '#0f172a',
        padding: 4
      });

      const img = document.createElement('img');
      img.src = qr.toDataURL('image/png');
      img.alt = '線上核對 QR Code';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      qrBox.appendChild(img);
      return;
    } catch (err) {
      console.warn('QRious 渲染異常:', err);
    }
  }

  qrBox.innerHTML = `
    <div style="font-size:9px; font-weight:bold; color:#b91c1c; text-align:center; padding:4px; line-height:1.2;">
      <span>HESS</span><br>
      <span style="font-family:monospace; color:#334155;">${cleanOrderNo || '待送出'}</span>
    </div>
  `;
}

// ==========================================
// 6. 初始化與事件掛載
// ==========================================
function initOrderDate() {
  const today = new Date();
  const year = today.getFullYear() - 1911;
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = val;
  };

  setVal('orderYear', year);
  setVal('orderMonth', month);
  setVal('orderDay', day);
}

function clearForm() {
  if (!confirm('確定要清空目前填寫的數量與內容嗎？')) return;

  const sheet = document.querySelector('.a4-sheet');
  if (sheet) {
    sheet.querySelectorAll('input').forEach((input) => {
      if (!['orderYear', 'orderMonth', 'orderDay'].includes(input.id)) {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      }
    });
  }

  const elDeliveryLoc = document.getElementById('deliveryLocation');
  if (elDeliveryLoc) elDeliveryLoc.value = '教務處';

  const badgeOrderNo = document.getElementById('badgeOrderNo');
  if (badgeOrderNo) {
    badgeOrderNo.textContent = '';
    badgeOrderNo.classList.add('hidden');
  }

  const qrHint = document.getElementById('qrOrderTypeHint');
  if (qrHint) qrHint.textContent = '送出後自動綁定';

  calculateTotals();
}

function initApp() {
  initOrderDate();
  updateTables(targetSemester);

  // 學期切換按鈕
  document.getElementById('btnTargetSem2')?.addEventListener('click', () => updateTables('2'));
  document.getElementById('btnTargetSem1')?.addEventListener('click', () => updateTables('1'));

  // 單別切換按鈕
  document.getElementById('btnOrderTypeInitial')?.addEventListener('click', () => changeOrderType('initial'));
  document.getElementById('btnOrderTypeModify')?.addEventListener('click', () => changeOrderType('modify'));
  document.getElementById('btnOrderTypeAppend')?.addEventListener('click', () => changeOrderType('append'));

  // 清空按鈕
  document.getElementById('btnClearForm')?.addEventListener('click', clearForm);

  // 已存單據下拉選單載入
  document.getElementById('schoolOrderHistorySelect')?.addEventListener('change', (e) => {
    loadSavedOrder(e.target.value);
  });

  // 建立第二筆單據按鈕
  document.getElementById('btnCreateNewOrder')?.addEventListener('click', createNewOrderForSchool);

  // 線上送出按鈕
  document.getElementById('btnSubmitOrder')?.addEventListener('click', submitOrder);

  // 表格數值監聽 (事件委派)
  document.querySelector('.a4-sheet')?.addEventListener('input', (e) => {
    if (e.target && (e.target.classList.contains('calc-input') || e.target.id === 'schoolName')) {
      calculateTotals();
    }
  });

  // 學校搜尋框
  setupSchoolSearch();

  const autoBadge = document.getElementById('autoDetectBadge');
  if (autoBadge) autoBadge.textContent = '系統就緒';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}