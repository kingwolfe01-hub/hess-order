/**
 * 國小英語教材訂購系統 - 學校搜尋與自動填入模組
 */

let schoolDatabase = [];

/**
 * 異步載入學校資料庫
 * @param {string} url - schools.json 路徑
 */
export async function initSchoolDatabase(url = './data/schools.json') {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`無法載入學校清單: ${response.status}`);
    }
    schoolDatabase = await response.json();
    return schoolDatabase;
  } catch (error) {
    console.error('學校資料庫載入失敗:', error);
    return [];
  }
}

/**
 * 簡易防抖函式 (Debounce)
 */
function debounce(func, delay = 150) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * 初始化學校搜尋框監聽
 * @param {Object} options - DOM 元素與回呼函數配置
 */
export function setupSchoolAutocomplete({
  inputEl,
  dropdownEl,
  onSelectSchool
}) {
  if (!inputEl || !dropdownEl) return;

  const handleSearch = () => {
    const query = inputEl.value.trim().toLowerCase();
    dropdownEl.innerHTML = '';

    if (!query) {
      dropdownEl.classList.add('hidden');
      return;
    }

    // 支援以校名、鄉鎮市區、縣市進行關鍵字匹配
    const matches = schoolDatabase.filter((school) => {
      return (
        school.name.toLowerCase().includes(query) ||
        school.district.toLowerCase().includes(query) ||
        school.city.toLowerCase().includes(query)
      );
    }).slice(0, 15); // 最多展示 15 筆建議

    if (matches.length === 0) {
      dropdownEl.innerHTML = `
        <div class="p-2 text-slate-400 text-center text-xs">
          無符合學校，請手動填寫表單欄位
        </div>
      `;
      dropdownEl.classList.remove('hidden');
      return;
    }

    // 產生建議選單列表
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
        if (typeof onSelectSchool === 'function') {
          onSelectSchool(school);
        }
      });

      dropdownEl.appendChild(item);
    });

    dropdownEl.classList.remove('hidden');
  };

  // 綁定輸入監聽 (帶防抖)
  inputEl.addEventListener('input', debounce(handleSearch, 150));

  // 點選其他地方時關閉下拉選單
  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.classList.add('hidden');
    }
  });
}

/**
 * 將選定的學校資料自動填入表單各輸入框
 * @param {Object} school - 學校物件
 */
export function fillSchoolForm(school) {
  if (!school) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('schoolCity', school.city);
  setVal('schoolDistrict', school.district);
  setVal('schoolName', school.name);
  setVal('contactPhone', school.phone);
  setVal('schoolAddress', school.address);

  // 指送地點：若學校資料有特定預設則帶入，否則預設教務處
  setVal('deliveryLocation', school.defaultDeliveryLocation || '教務處');

  // 服務業務展示連動
  const salesmanInfo = document.getElementById('salesmanInfo');
  if (salesmanInfo) {
    if (school.salesman) {
      salesmanInfo.textContent = `服務業務：${school.salesman}`;
      salesmanInfo.classList.remove('hidden');
    } else {
      salesmanInfo.classList.add('hidden');
    }
  }
}