// 政府行政機關辦公日曆表 — 中華民國 115 年（2026）、116 年（2027）
// 資料依 2025 年修正之《紀念日及節日實施條例》：
//   - 勞動節（5/1）全國一致放假
//   - 新增／恢復：小年夜、教師節（9/28）、臺灣光復節（10/25）、行憲紀念日（12/25）
//
// ⚠️ 上線前務必由 HR 以綠谷提供的官方日曆表圖檔「逐日」核對，
//    特別是「彈性放假日」與「補行上班日（補班）」的實際日期。
//    本檔僅先建立確定的節日主體，未含全部補班日。

export type SeedHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
  type: "NATIONAL" | "FLEX" | "MAKEUP" | "DISASTER";
  appliesTo?: "ALL" | "LABOR";
  isWorkday?: boolean; // 補班日 = true
  note?: string;
};

export const HOLIDAYS_2026: SeedHoliday[] = [
  { date: "2026-01-01", name: "中華民國開國紀念日（元旦）", type: "NATIONAL" },

  // 春節（農曆新年初一 = 2026-02-17）連假 2/14–2/22
  { date: "2026-02-14", name: "春節連假", type: "NATIONAL" },
  { date: "2026-02-15", name: "春節連假", type: "NATIONAL" },
  { date: "2026-02-16", name: "小年夜", type: "NATIONAL" },
  { date: "2026-02-17", name: "農曆除夕", type: "NATIONAL" },
  { date: "2026-02-18", name: "春節（初一）", type: "NATIONAL" },
  { date: "2026-02-19", name: "春節（初二）", type: "NATIONAL" },
  { date: "2026-02-20", name: "春節（初三）", type: "NATIONAL" },
  { date: "2026-02-21", name: "春節連假", type: "NATIONAL" },
  { date: "2026-02-22", name: "春節連假", type: "NATIONAL" },

  { date: "2026-02-27", name: "和平紀念日（彈性放假）", type: "FLEX" },
  { date: "2026-02-28", name: "和平紀念日", type: "NATIONAL" },

  { date: "2026-04-03", name: "兒童節暨民族掃墓節（彈性放假）", type: "FLEX" },
  { date: "2026-04-04", name: "兒童節", type: "NATIONAL" },
  { date: "2026-04-05", name: "民族掃墓節（清明）", type: "NATIONAL" },
  { date: "2026-04-06", name: "民族掃墓節補假", type: "NATIONAL" },

  { date: "2026-05-01", name: "勞動節", type: "NATIONAL", appliesTo: "ALL", note: "2026 起全國一致放假" },

  { date: "2026-06-19", name: "端午節", type: "NATIONAL" },

  { date: "2026-09-25", name: "中秋節", type: "NATIONAL" },
  { date: "2026-09-28", name: "教師節", type: "NATIONAL", note: "2026 起恢復放假" },

  { date: "2026-10-09", name: "國慶日（彈性放假）", type: "FLEX" },
  { date: "2026-10-10", name: "國慶日", type: "NATIONAL" },

  { date: "2026-10-25", name: "臺灣光復節", type: "NATIONAL", note: "2026 起恢復放假" },
  { date: "2026-10-26", name: "臺灣光復節補假", type: "NATIONAL" },

  { date: "2026-12-25", name: "行憲紀念日", type: "NATIONAL", note: "2026 起恢復放假" },
];

export const HOLIDAYS_2027: SeedHoliday[] = [
  { date: "2027-01-01", name: "中華民國開國紀念日（元旦）", type: "NATIONAL" },

  // 春節（農曆新年初一 = 2027-02-06）連假 2/4–2/10
  { date: "2027-02-04", name: "小年夜", type: "NATIONAL" },
  { date: "2027-02-05", name: "農曆除夕", type: "NATIONAL" },
  { date: "2027-02-06", name: "春節（初一）", type: "NATIONAL" },
  { date: "2027-02-07", name: "春節（初二）", type: "NATIONAL" },
  { date: "2027-02-08", name: "春節（初三）", type: "NATIONAL" },
  { date: "2027-02-09", name: "春節連假", type: "NATIONAL" },
  { date: "2027-02-10", name: "春節連假", type: "NATIONAL" },

  { date: "2027-02-26", name: "和平紀念日（彈性放假）", type: "FLEX" },
  { date: "2027-02-28", name: "和平紀念日", type: "NATIONAL" },
  { date: "2027-03-01", name: "和平紀念日補假", type: "NATIONAL" },

  { date: "2027-04-02", name: "兒童節暨民族掃墓節（彈性放假）", type: "FLEX" },
  { date: "2027-04-04", name: "兒童節", type: "NATIONAL" },
  { date: "2027-04-05", name: "民族掃墓節（清明）", type: "NATIONAL" },
  { date: "2027-04-06", name: "兒童節補假", type: "NATIONAL" },

  { date: "2027-05-01", name: "勞動節", type: "NATIONAL", appliesTo: "ALL" },
  { date: "2027-05-03", name: "勞動節補假", type: "NATIONAL" },

  { date: "2027-06-09", name: "端午節", type: "NATIONAL" },

  { date: "2027-09-15", name: "中秋節", type: "NATIONAL" },
  { date: "2027-09-28", name: "教師節", type: "NATIONAL" },

  { date: "2027-10-08", name: "國慶日（彈性放假）", type: "FLEX" },
  { date: "2027-10-10", name: "國慶日", type: "NATIONAL" },
  { date: "2027-10-11", name: "國慶日補假", type: "NATIONAL" },

  { date: "2027-10-25", name: "臺灣光復節", type: "NATIONAL" },

  { date: "2027-12-25", name: "行憲紀念日", type: "NATIONAL" },
  { date: "2027-12-27", name: "行憲紀念日補假", type: "NATIONAL" },
];

export const ALL_SEED_HOLIDAYS = [...HOLIDAYS_2026, ...HOLIDAYS_2027];
