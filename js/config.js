/**
 * 國小英語教材訂購系統 - 核心配置與規則模組
 */

// 預設學年與目標學期
export const DEFAULT_CONFIG = {
  academicYear: 115,
  semester: '2', // '2': 第二學期 (雙數冊), '1': 第一學期 (單數冊)
  dealer: {
    name: '鍠嘉文化教育用品社',
    phone: '(04) 839-2577',
    fax: '(04) 828-5424',
    address: '彰化縣員林市員大路一段250巷15號',
    salesman: '黃亮智'
  }
};

// 學期對應規則表
export const ORDER_RULE = {
  '2': {
    name: '第二學期',
    titleSuffix: '第二學期',
    lowGrades: { g1: 2, g2: 4 },
    midHighGrades: { g3: 2, g4: 4, g5: 6, g6: 8 },
    hintLow: '預訂下學期：一年級第2冊、二年級第4冊 (雙數冊)',
    hintMid: '預訂下學期為雙數冊：2、4、6、8 冊',
    deliveryWeeks: ['12/21 - 12/24', '12/28 - 12/31', '1/4 - 1/8', '1/11 - 1/15', '1/18 - 1/22']
  },
  '1': {
    name: '第一學期',
    titleSuffix: '第一學期',
    lowGrades: { g1: 1, g2: 3 },
    midHighGrades: { g3: 1, g4: 3, g5: 5, g6: 7 },
    hintLow: '預訂上學期：一年級第1冊、二年級第3冊 (單數冊)',
    hintMid: '預訂上學期為單數冊：1、3、5、7 冊',
    deliveryWeeks: ['7/13 - 7/17', '7/20 - 7/24', '7/27 - 7/31', '8/3 - 8/7', '8/10 - 8/14']
  }
};

// 單據型態定義
export const ORDER_TYPES = {
  initial: {
    badge: '首筆訂購單',
    badgeClass: 'bg-slate-800 text-white',
    titleSuffix: '(B版)',
    desc: '(全校常規訂購)',
    notice: ''
  },
  modify: {
    badge: '改單 (數量變更)',
    badgeClass: 'bg-amber-600 text-white',
    titleSuffix: '(改單 B版)',
    desc: '(數量異動，以本單為主)',
    notice: '⚠️ 本單據為「改單」，將完全覆蓋並取代原先之預訂數量，請務必重新核對！'
  },
  append: {
    badge: '增訂 (追加補單)',
    badgeClass: 'bg-emerald-600 text-white',
    titleSuffix: '(增訂 B版)',
    desc: '(額外追加數量，不影響原單)',
    notice: '📌 本單據為「增訂追加」，所填數量均為額外追加本數，原訂單數量依然保留！'
  }
};

// 低年級（非審定版）教材系列 Schema
export const LOW_GRADE_SERIES = [
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

// 中高年級（審定版）教材系列 Schema
export const HIGH_GRADE_SERIES = [
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