/**
 * 國小英語教材訂購系統 - 表格生成與計算核心模組
 */
import { ORDER_RULE, LOW_GRADE_SERIES, HIGH_GRADE_SERIES } from './config.js';

/**
 * 產生低年級教材表格 HTML 字串
 * @param {string} semester - '1' 或 '2'
 * @returns {string} tbody 內部 HTML
 */
export function renderLowGradeTable(semester) {
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
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="課本" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-textbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-amber-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="習作" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-workbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-blue-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="教用" class="w-full text-center outline-none font-mono-num text-slate-800 calc-input q-teacher">
          </td>
          <td class="border border-slate-400 py-1.5 px-1">
            <input type="text" data-base="${g.baseCode}" data-kind="備註" class="w-full text-center outline-none text-[10px] text-slate-600 q-remark">
          </td>
        </tr>
      `;
    }).join('');
  }).join('');
}

/**
 * 產生中高年級教材表格 HTML 字串 (包含開通卡)
 * @param {string} semester - '1' 或 '2'
 * @returns {string} tbody 內部 HTML
 */
export function renderHighGradeTable(semester) {
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
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="課本" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-textbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-amber-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="習作" class="w-full text-center outline-none font-mono-num font-bold text-slate-900 calc-input q-workbook">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-emerald-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="開通卡" class="w-full text-center outline-none font-mono-num font-bold text-emerald-900 calc-input q-card">
          </td>
          <td class="border border-slate-400 py-1.5 px-1 bg-blue-50/30">
            <input type="number" min="0" data-base="${g.baseCode}" data-kind="教用" class="w-full text-center outline-none font-mono-num text-slate-800 calc-input q-teacher">
          </td>
          <td class="border border-slate-400 py-1.5 px-1">
            <input type="text" data-base="${g.baseCode}" data-kind="備註" class="w-full text-center outline-none text-[10px] text-slate-600 q-remark">
          </td>
        </tr>
      `;
    }).join('');
  }).join('');
}

/**
 * 計算表單全部數值加總
 * @param {HTMLElement} rootContainer - 包裹表格的容器 (預設為 document)
 * @returns {Object} 各項總計 { textbook, workbook, card, teacher }
 */
export function calculateTotals(rootContainer = document) {
  const sumValues = (selector) => {
    return Array.from(rootContainer.querySelectorAll(selector)).reduce((acc, input) => {
      const val = parseInt(input.value, 10);
      return acc + (isNaN(val) || val < 0 ? 0 : val);
    }, 0);
  };

  const totals = {
    textbook: sumValues('.q-textbook'),
    workbook: sumValues('.q-workbook'),
    card: sumValues('.q-card'),
    teacher: sumValues('.q-teacher')
  };

  // 即時更新畫面底部加總欄位
  const elTextbook = document.getElementById('totalTextbook');
  const elWorkbook = document.getElementById('totalWorkbook');
  const elCard = document.getElementById('totalCard');
  const elTeacher = document.getElementById('totalTeacher');

  if (elTextbook) elTextbook.textContent = `${totals.textbook} 本`;
  if (elWorkbook) elWorkbook.textContent = `${totals.workbook} 本`;
  if (elCard) elCard.textContent = `${totals.card} 張`;
  if (elTeacher) elTeacher.textContent = `${totals.teacher} 份`;

  return totals;
}

/**
 * 序列化當前訂單項目為 JSON 物件
 * @param {HTMLElement} rootContainer
 * @returns {Array} 包含各品項訂購數量的陣列
 */
export function serializeOrderItems(rootContainer = document) {
  const items = [];
  const inputs = rootContainer.querySelectorAll('input[data-base]');

  inputs.forEach((input) => {
    const val = input.value.trim();
    if (val !== '' && val !== '0') {
      items.push({
        base: input.dataset.base,
        kind: input.dataset.kind,
        value: input.type === 'number' ? parseInt(val, 10) : val
      });
    }
  });

  return items;
}