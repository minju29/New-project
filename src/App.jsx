import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  ScatterController,
  PointElement,
  Tooltip,
} from "chart.js";
import {
  AckButton,
  AckContentTabs,
  AckDialog,
  AckResponsiveDialog,
} from "@ADS/ui";
import { AckDataGrid } from "@ADS/data-grid";
import { Bell, CircleUserRound } from "lucide-react";
import { statisticsRows } from "./statisticsData.js";
import { trendTableData } from "./trendData.js";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  LineController,
  LineElement,
  ScatterController,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

const mockSummary = [
  { label: "참여기관 수", value: "1,990", unit: "기관" },
  { label: "검사항목 수", value: "29", unit: "종목" },
  { label: "검체 수", value: "3", unit: "개" },
];

const urineSummary = [
  { label: "참여기관 수", value: "1,922", unit: "기관" },
  { label: "검사항목 수", value: "11", unit: "종목" },
];

const urineImageSpecimens = ["CUI-25-01", "CUI-25-02", "CUI-25-03", "CUI-25-04"].map(
  (name) => ({
    name,
    fileName: `${name}.png`,
  }),
);

const urineUnacceptableRateData = {
  specimens: [
    { key: "CU-25-01", color: "#0869f4" },
    { key: "CU-25-02", color: "#ff7a00" },
    { key: "CU-25-03", color: "#25a636" },
    { key: "CUI-25-01", color: "#b32572" },
    { key: "CUI-25-02", color: "#7954dd" },
    { key: "CUI-25-03", color: "#0894b5" },
    { key: "CUI-25-04", color: "#f59e0b" },
  ],
  tests: [
    { name: "pH", values: [0.63, 2.36, 0.84, null, null, null, null] },
    { name: "Protein", values: [0.73, 0.16, 3.48, null, null, null, null] },
    { name: "Glucose", values: [0.31, 0.47, 2.09, null, null, null, null] },
    { name: "Ketone", values: [0.05, 0.27, 3.76, null, null, null, null] },
    { name: "Bilirubin", values: [0.05, 0.43, 0.32, null, null, null, null] },
    { name: "Blood", values: [0.73, 0.94, 0.31, null, null, null, null] },
    { name: "Urobilinogen", values: [0.16, 0.21, 0.91, null, null, null, null] },
    { name: "Nitrite", values: [0.11, 0.22, 0.76, null, null, null, null] },
    { name: "Leukocyte", values: [0.49, 0.44, 3.9, null, null, null, null] },
    {
      name: "Specific Gravity",
      values: [10.12, 1.65, 1.71, null, null, null, null],
    },
    {
      name: "Urine sediment",
      values: [null, null, null, 4.41, 3.21, 3.01, 0],
    },
  ],
};

const urineMakerColors = [
  "#0869f4",
  "#ff7a00",
  "#25a636",
  "#b32572",
  "#7954dd",
  "#0894b5",
  "#db2877",
  "#f59e0b",
  "#51ad3f",
  "#f97316",
  "#4b5563",
  "#14b8a6",
];

const reportTabs = [
  { id: "overview", label: "종합 현황" },
  { id: "nonconformance", label: "부적합 분석" },
  { id: "statistics-quantitative", label: "통계상세(정량)" },
  { id: "statistics-qualitative", label: "통계상세(정성)" },
  { id: "trend", label: "추이분석" },
];

const dashboardTabs = reportTabs.filter(
  (tab) => tab.id !== "statistics-qualitative",
);

const pageRoutes = [
  { id: "dashboard", path: "dashboard" },
  { id: "new-page", path: "new-page" },
];

const defaultPageId = pageRoutes[0].id;

function getPageIdFromHash() {
  if (typeof window === "undefined") return defaultPageId;

  const rawPath = window.location.hash
    .replace(/^#\/?/, "")
    .split(/[/?]/)[0];
  const route = pageRoutes.find((pageRoute) => pageRoute.path === rawPath);

  return route?.id ?? defaultPageId;
}

function getDataUrl(fileName) {
  return new URL(`data/${fileName}`, window.location.href).toString();
}

function getPublicAssetUrl(path) {
  return new URL(path, window.location.href).toString();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const headers = rows[0]?.map((header) => header.replace(/^\uFEFF/, "").trim());
  if (!headers) return [];

  return rows.slice(1).map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ""]),
    ),
  );
}

function getUrineTestKey(test) {
  return test.name === "Urine sediment" ? test.name : `-${test.name}`;
}

function getUrineSpecimenOrder(specimenKey) {
  const orderText = specimenKey.split("-").at(-1);
  const order = Number(orderText);

  return Number.isFinite(order) ? order : null;
}

function formatUrineCell(value) {
  if (value === undefined || value === null || value === "[NULL]") return "";
  return value;
}

const unacceptableRateData = {
  specimens: [
    { key: "CC-25-01", color: "#0869f4" },
    { key: "CC-25-02", color: "#ff7a00" },
    { key: "CC-25-03", color: "#25a636" },
  ],
  tests: [
    {
      code: "ALT",
      name: "Alanine transferase (ALT)",
      values: [1.67, 1.89, 1.12],
    },
    { code: "ALB", name: "Albumin", values: [0.64, 0.91, 0.72] },
    { code: "ALP", name: "Alkaline phosphatase", values: [0.25, 0.43, 0.51] },
    { code: "Amylase", name: "Amylase", values: [0.55, 0.59, 0.68] },
    {
      code: "AST",
      name: "Aspartate aminotransferase",
      values: [0.18, 0.12, 0.21],
    },
    { code: "BUN", name: "Blood urea nitrogen", values: [0.31, 0.58, 0.86] },
    { code: "Calcium (Ca)", name: "Calcium (Ca)", values: [1.38, 1.18, 1.01] },
    {
      code: "Chloride (Cl)",
      name: "Chloride (Cl)",
      values: [1.03, 1.06, 0.33],
    },
    { code: "Creatinine", name: "Creatinine", values: [0.29, 0.14, 0.05] },
    {
      code: "Direct bilirubin",
      name: "Direct bilirubin",
      values: [0.55, 0.27, 0.13],
    },
    { code: "GGT", name: "Gamma-GT", values: [4.67, 5.58, 3.62] },
    { code: "Glucose", name: "Glucose", values: [1.58, 1.62, 1.04] },
    { code: "HDL-C", name: "HDL cholesterol", values: [4.98, 5.78, 4.75] },
    { code: "Iron (Fe)", name: "Iron (Fe)", values: [1.2, 3.26, 0.94] },
    { code: "LDL-C", name: "LDL cholesterol", values: [0.22, 0.27, 0.28] },
    { code: "LDL-c", name: "LDL-c", values: [0.31, 0.76, 0.42] },
    {
      code: "Phosphorus (P)",
      name: "Phosphorus (P)",
      values: [3.3, 4.75, 3.8],
    },
    { code: "Potassium (K)", name: "Potassium (K)", values: [0.28, 0.41, 0.2] },
    { code: "Sodium (Na)", name: "Sodium (Na)", values: [0.54, 0.74, 0.87] },
    {
      code: "Total bilirubin",
      name: "Total bilirubin",
      values: [0.82, 1.39, 0.58],
    },
    { code: "Total CO2", name: "Total CO2", values: [0.46, 0.33, 0.21] },
    {
      code: "Total cholesterol",
      name: "Total cholesterol",
      values: [2.95, 4.25, 3.34],
    },
    {
      code: "Total protein",
      name: "Total protein",
      values: [0.62, 1.19, 0.41],
    },
    {
      code: "Urea nitrogen",
      name: "Urea nitrogen",
      values: [0.19, 0.27, 0.16],
    },
    {
      code: "Uric Acid (UA)",
      name: "Uric Acid (UA)",
      values: [1.93, 4.1, 3.08],
    },
  ],
};

const makerBaseData = [
  { name: "Roche", count: 7, color: "#0869f4" },
  {
    name: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.",
    count: 6,
    color: "#7954dd",
  },
  { name: "SNIBE Co.,Ltd", count: 4, color: "#0894b5" },
  { name: "Biotecnica", count: 3, color: "#db2877" },
  { name: "(주)대성메디텍", count: 1, color: "#f59e0b" },
  { name: "Biosystems", count: 1, color: "#51ad3f" },
  { name: "Tokyo Boeki Medisys Inc.", count: 1, color: "#f97316" },
];

const institutionRows = [
  {
    code: "1000003010",
    name: "로터요양병원",
    result: "0123",
    standardSdi: "-6.04",
    detailSdi: "-6.93",
    maker: "(주)대성메디텍",
    instrument: "Others",
  },
  {
    code: "1000002102",
    name: "큰사랑 요양병원",
    result: "222",
    standardSdi: "4.96",
    detailSdi: "4.58",
    maker: "Biosystems",
    instrument: "A15",
  },
  {
    code: "1000001870",
    name: "속편한내과 서울암검",
    result: "0057",
    standardSdi: "-13.38",
    detailSdi: "-12.53",
    maker: "Biotecnica",
    instrument: "BT 1500",
  },
  {
    code: "1000001183",
    name: "권오윤내과의원",
    result: "259",
    standardSdi: "9.07",
    detailSdi: "9.91",
    maker: "Biotecnica",
    instrument: "BT 1500",
  },
  {
    code: "1000003612",
    name: "인새운혜내과의원",
    result: "145",
    standardSdi: "-3.60",
    detailSdi: "-3.74",
    maker: "Biotecnica",
    instrument: "BT 1500",
  },
  {
    code: "1000002030",
    name: "울산백구보건소",
    result: "165",
    standardSdi: "-",
    detailSdi: "-",
    maker: "Roche",
    instrument: "cobas4000 c311",
  },
  {
    code: "100000P074",
    name: "분당구보건소",
    result: "0230",
    standardSdi: "5.84",
    detailSdi: "22.96",
    maker: "Roche",
    instrument: "cobas4000 c311",
  },
  {
    code: "1000001523",
    name: "동순천 내과의원",
    result: "212",
    standardSdi: "3.84",
    detailSdi: "16.54",
    maker: "Roche",
    instrument: "cobas c111",
  },
  {
    code: "1000000541",
    name: "동아병원",
    result: "0178",
    standardSdi: "3.17",
    detailSdi: "4.14",
    maker: "Roche",
    instrument: "cobas pro c503",
  },
  {
    code: "1000001002",
    name: "온누리병원",
    result: "154",
    standardSdi: "-3.69",
    detailSdi: "-4.43",
    maker: "Roche",
    instrument: "cobas pure c303",
  },
  {
    code: "1000004421",
    name: "서울중앙검진센터",
    result: "187",
    standardSdi: "4.21",
    detailSdi: "5.02",
    maker: "SNIBE Co.,Ltd",
    instrument: "MAGLUMI X8",
  },
  {
    code: "1000003921",
    name: "한마음내과",
    result: "201",
    standardSdi: "-4.88",
    detailSdi: "-5.16",
    maker: "SNIBE Co.,Ltd",
    instrument: "MAGLUMI 4000",
  },
  {
    code: "1000003220",
    name: "새빛의원",
    result: "0182",
    standardSdi: "5.42",
    detailSdi: "6.10",
    maker: "SNIBE Co.,Ltd",
    instrument: "MAGLUMI 800",
  },
  {
    code: "1000002782",
    name: "미래검사센터",
    result: "097",
    standardSdi: "-5.10",
    detailSdi: "-5.34",
    maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.",
    instrument: "BS-600M",
  },
  {
    code: "1000002442",
    name: "푸른내과의원",
    result: "176",
    standardSdi: "3.99",
    detailSdi: "4.72",
    maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.",
    instrument: "BS-800M",
  },
  {
    code: "1000002388",
    name: "삼성드림병원",
    result: "0204",
    standardSdi: "-6.11",
    detailSdi: "-6.55",
    maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.",
    instrument: "BS-2000M",
  },
  {
    code: "1000002129",
    name: "강남메디컬센터",
    result: "164",
    standardSdi: "6.18",
    detailSdi: "7.03",
    maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.",
    instrument: "BS-600M",
  },
  {
    code: "1000001988",
    name: "우리들병원",
    result: "0133",
    standardSdi: "-4.37",
    detailSdi: "-4.96",
    maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.",
    instrument: "BS-800M",
  },
  {
    code: "1000001765",
    name: "정다운의원",
    result: "219",
    standardSdi: "4.04",
    detailSdi: "4.56",
    maker: "Biotecnica",
    instrument: "BT 3000",
  },
  {
    code: "1000001531",
    name: "해피검진의학과",
    result: "0105",
    standardSdi: "-5.57",
    detailSdi: "-6.02",
    maker: "Biotecnica",
    instrument: "BT 1500",
  },
  {
    code: "1000001420",
    name: "성모진단검사의학과",
    result: "246",
    standardSdi: "5.28",
    detailSdi: "5.87",
    maker: "Biosystems",
    instrument: "BA400",
  },
  {
    code: "1000001277",
    name: "동탄연세의원",
    result: "183",
    standardSdi: "-3.92",
    detailSdi: "-4.11",
    maker: "Tokyo Boeki Medisys Inc.",
    instrument: "BiOLiS 50i",
  },
  {
    code: "1000001188",
    name: "청라메디랩",
    result: "0228",
    standardSdi: "4.76",
    detailSdi: "5.30",
    maker: "Roche",
    instrument: "cobas c311",
  },
];

const institutionPageSize = 10;

const institutionColumns = [
  { key: "no", label: "No" },
  { key: "code", label: "기관코드" },
  { key: "name", label: "기관명" },
  { key: "result", label: "결과" },
  { key: "standardSdi", label: "기준SDI" },
  { key: "detailSdi", label: "세부SDI" },
  { key: "maker", label: "장비회사" },
  { key: "instrument", label: "장비명" },
];

const nonconformanceInstitutionColumns = [
  { key: "no", label: "No" },
  { key: "code", label: "기관코드" },
  { key: "name", label: "기관명" },
  { key: "result", label: "결과" },
  { key: "standardSdi", label: "기준SDI" },
  { key: "detailSdi", label: "세부SDI" },
  { key: "maker", label: "장비회사" },
  { key: "instrument", label: "장비명" },
];

const urineNonconformanceInstitutionColumns = [
  { key: "no", label: "No" },
  { key: "code", label: "기관코드" },
  { key: "name", label: "기관명" },
  { key: "result", label: "결과" },
  { key: "answer", label: "정답" },
  { key: "standardSdi", label: "기준SDI" },
  { key: "detailSdi", label: "세부SDI" },
  { key: "maker", label: "장비회사" },
  { key: "instrument", label: "장비명" },
];

const urineSedimentNonconformanceInstitutionColumns = [
  { key: "no", label: "No" },
  { key: "code", label: "기관코드" },
  { key: "name", label: "기관명" },
  { key: "result", label: "결과" },
  { key: "answer", label: "정답" },
];

const institutionColumnDescriptions = {
  no: "목록의 순번입니다.",
  code: "기관을 구분하는 고유 코드입니다.",
  name: "Unacceptable 결과가 확인된 기관명입니다.",
  result: "기관이 입력한 검사 결과입니다.",
  answer: "해당 검체의 판정 기준 정답입니다.",
  standardSdi: "기준분류 기준 SDI 값입니다.",
  detailSdi: "세부분류 기준 SDI 값입니다.",
  maker: "검사에 사용한 장비 회사입니다.",
  instrument: "검사에 사용한 장비명입니다.",
};

// 행 순번(No)을 데이터에 주입 ? 그리드 showRowNumbers는 헤더 컬럼을 만들지 않아 값과 겹치므로 명시 컬럼 사용
const withRowNo = (rows) => rows.map((row, index) => ({ ...row, __no: index + 1 }));

// 명시적 No 컬럼 정의 (showRowNumbers 대체)
const rowNoColumn = {
  field: "__no",
  headerName: "No",
  width: 56,
  minWidth: 56,
  align: "center",
  headerAlign: "center",
  sortable: false,
  cellRenderer: ({ row }) => row.__no,
};

// {key,label}[] → AckDataGrid 컬럼 정의. "no"는 rowNoColumn으로 대체(제외).
const toInstitutionGridColumns = (cols) => [
  rowNoColumn,
  ...cols
    .filter((column) => column.key !== "no")
    .map((column) => ({
      field: column.key,
      headerName: column.label,
      align: "left",
      tooltip: "overflow",
    })),
];

// 요검사 개요 기관 그리드 ? 필드명≠헤더, [NULL] 정리 필요한 컬럼은 cellRenderer 적용.
const urineInstitutionGridColumns = [
  rowNoColumn,
  { field: "기관코드", headerName: "기관코드", tooltip: "overflow" },
  { field: "기관명", headerName: "기관명", tooltip: "overflow" },
  { field: "검체명", headerName: "검체명", tooltip: "overflow" },
  { field: "검사명", headerName: "검사명", tooltip: "overflow" },
  {
    field: "rslt",
    headerName: "결과",
    tooltip: "overflow",
    cellRenderer: ({ row }) => formatUrineCell(row.rslt),
  },
  { field: "제조사명", headerName: "제조사명", tooltip: "overflow" },
  {
    field: "정답",
    headerName: "정답",
    tooltip: "overflow",
    cellRenderer: ({ row }) => formatUrineCell(row["정답"]),
  },
  { field: "기준SDI", headerName: "기준분류SDI", align: "right" },
  { field: "세부SDI", headerName: "세부SDI", align: "right" },
];

const statisticsColumns = [
  { key: "testItem", label: "검사항목", type: "text" },
  { key: "specimenName", label: "검체명", type: "text" },
  { key: "baseCategory", label: "기준분류", type: "text" },
  { key: "detailCategory", label: "세분류", type: "text" },
  { key: "n", label: "기관수(N)", type: "number" },
  { key: "mean", label: "Mean", type: "number" },
  { key: "median", label: "Median", type: "number" },
  { key: "sd", label: "SD", type: "number" },
  { key: "cv", label: "CV(%)", type: "number" },
  { key: "min", label: "Min", type: "number" },
  { key: "max", label: "Max", type: "number" },
];

const statisticsScopeOptions = [
  { value: "all", label: "전체" },
  { value: "overall", label: "전체 통계" },
  { value: "base", label: "기준분류 통계" },
  { value: "detail", label: "세분류 통계" },
];

// 통계 숫자 컬럼 정렬용 비교자 ? 화학(number)/요검사 CSV(string) 혼합값을 숫자로 파싱해 정렬. null은 뒤로.
const numCmp = (a, b) => {
  const na = parseStatisticNumber(a);
  const nb = parseStatisticNumber(b);
  if (na === null && nb === null) return 0;
  if (na === null) return 1;
  if (nb === null) return -1;
  return na - nb;
};

// 통계 숫자 컬럼 키 (범위 필터·정규화 대상)
const STAT_NUMERIC_KEYS = statisticsColumns
  .filter((column) => column.type === "number")
  .map((column) => column.key);

// AckDataGrid의 number 필터는 field 값을 숫자로 비교하므로, 요검사 CSV의 문자열("1,816" 등)을
// 미리 숫자로 정규화해 그리드에 넘긴다. 표시는 cellRenderer의 formatStatisticValue가 담당.
const normalizeStatisticsRows = (rows) =>
  rows.map((row) => {
    const normalized = { ...row };
    for (const key of STAT_NUMERIC_KEYS) {
      normalized[key] = parseStatisticNumber(row[key]);
    }
    return normalized;
  });

// AckDataGrid용 통계 컬럼 정의. 숫자 컬럼은 범위(number) 필터 + formatStatisticValue 표시,
// 텍스트 컬럼은 체크리스트 필터.
const STAT_COL_WIDTH = { testItem: 240, specimenName: 116 };
const statisticsGridColumns = statisticsColumns.map((column) => {
  const isNumber = column.type === "number";
  return {
    field: column.key,
    headerName: column.label,
    align: isNumber ? "right" : "left",
    headerAlign: isNumber ? "right" : "left",
    sortable: true,
    filter: isNumber ? "number" : "checklist",
    tooltip: "overflow",
    cellRenderer: ({ row }) => formatStatisticValue(row, column),
    ...(STAT_COL_WIDTH[column.key]
      ? { width: STAT_COL_WIDTH[column.key], minWidth: STAT_COL_WIDTH[column.key] }
      : {}),
    ...(isNumber ? { comparator: (a, b) => numCmp(a, b) } : {}),
  };
});

const qualitativeBaseColumns = [
  { key: "프로그램명", label: "프로그램명", className: "col-program", type: "text", width: 74 },
  { key: "상위검사명", label: "상위검사명", className: "col-parent-test", type: "text", width: 80 },
  { key: "검사명", label: "검사명", className: "col-test", type: "text", width: 76 },
  { key: "검체명", label: "검체명", className: "col-specimen", type: "text", width: 78 },
  { key: "기준분류", label: "기준분류", className: "col-category", type: "text", width: 132 },
  { key: "보고된 결과", label: "보고된 결과", className: "col-result number-cell", type: "text", width: 72 },
];

const qualitativeSelectionColumns = [
  { key: "결과선택기관수_전체", label: "전체", className: "col-count number-cell", type: "number", width: 28 },
  { key: "결과선택기관수_선택", label: "선택", className: "col-count number-cell", type: "number", width: 28 },
  { key: "결과선택기관수_비율", label: "비율", className: "col-rate number-cell", type: "number", width: 31 },
];

const qualitativeOperatorColumns = [
  { key: "운영자 정답(INTENDED)", label: "운영자 정답", className: "col-answer qualitative-operator-cell", type: "text", cellType: "answer", width: 158 },
  { key: "운영자 Remark", label: "운영자 Remark", className: "col-remark qualitative-operator-cell", type: "text", cellType: "remark", width: 86 },
  { key: "운영자 판정", label: "운영자 판정", className: "col-judgment qualitative-operator-cell", type: "text", cellType: "judgment", width: 92 },
];

const qualitativeColumns = [
  ...qualitativeBaseColumns,
  ...qualitativeSelectionColumns,
  ...qualitativeOperatorColumns,
];
const qualitativeTableWidth = qualitativeColumns.reduce(
  (total, column) => total + column.width,
  0,
);

const urineResultDistributionAxisLabels = ["4.0", "4.5", "5.0", "5.5", "6.0", "6.5"];

const doughnutPercentLabels = {
  id: "doughnutPercentLabels",
  afterDatasetsDraw(chart, _args, options) {
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0].data;
    const total = values.reduce((sum, value) => sum + value, 0);
    const { ctx } = chart;

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "700 12px Segoe UI, Malgun Gothic, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc, index) => {
      const pct = (values[index] / total) * 100;
      if (pct < (options.minPercent ?? 4)) return;

      const props = arc.getProps(
        ["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"],
        true,
      );
      const angle = (props.startAngle + props.endAngle) / 2;
      const radius = (props.innerRadius + props.outerRadius) / 2;
      const x = props.x + Math.cos(angle) * radius;
      const y = props.y + Math.sin(angle) * radius;

      ctx.fillText(`${pct.toFixed(2)}%`, x, y);
    });

    ctx.restore();
  },
};

function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

function parseStatisticNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const numericValue = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function getStatisticPrecision(row, column) {
  const decimalPlaces = parseStatisticNumber(row.decimalPlaces);

  if (
    decimalPlaces !== null &&
    ["mean", "median", "min", "max"].includes(column.key)
  ) {
    return decimalPlaces;
  }

  return 2;
}

function formatStatisticValue(row, column) {
  const value = row[column.key];

  if (value === null || value === undefined || value === "") return "-";
  if (column.type === "number") {
    const numericValue = parseStatisticNumber(value);

    if (numericValue === null) return "-";
    if (column.key === "n") return numericValue.toLocaleString();
    if (row.decimalPlaces !== undefined && ["sd", "cv"].includes(column.key)) {
      return String(value).replace(/,/g, "");
    }

    return numericValue.toFixed(getStatisticPrecision(row, column));
  }

  return value;
}

function rowMatchesStatisticsScope(row, scope) {
  const hasBaseCategory = Boolean(row.baseCategory);
  const hasDetailCategory = Boolean(row.detailCategory);

  if (scope === "overall") return !hasBaseCategory && !hasDetailCategory;
  if (scope === "base") return hasBaseCategory && !hasDetailCategory;
  if (scope === "detail") return hasDetailCategory;

  return true;
}

function getStatisticsRows() {
  return statisticsRows;
}

const chemistryDataFileName = "chemi_2025_04/2025_04_120_일반화학.csv";
const chemistryDetailColors = [
  "#0869f4",
  "#ff7a00",
  "#25a636",
  "#b32572",
  "#7954dd",
  "#0894b5",
  "#db2877",
  "#f59e0b",
  "#51ad3f",
  "#f97316",
  "#4b5563",
  "#14b8a6",
];

function getChemistryJudgment(row) {
  return row["판정"] ?? row[Object.keys(row).at(-1)] ?? "";
}

function getSetSize(value) {
  return value instanceof Set ? value.size : 0;
}

function sortChemistryLabels(left, right) {
  return String(left).localeCompare(String(right), "ko", {
    numeric: true,
    sensitivity: "base",
  });
}

function toChemistryInstitutionRow(row, detailName) {
  return {
    code: row.instcd,
    name: row.cmpynm,
    result: row.rslt,
    standardSdi: row.sdi_l1,
    detailSdi: row.sdi_l2,
    maker: detailName,
    instrument: row.stndchassinm || row.detlchassinm || "-",
    testCode: row.testcd,
    specimenKey: row.gmatrnm,
  };
}

function createChemistryDashboardData(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ...unacceptableRateData,
      summary: mockSummary,
    };
  }

  const institutionSet = new Set();
  const specimenMap = new Map();
  const testMap = new Map();

  for (const row of rows) {
    const institutionCode = row.instcd;
    const specimenKey = row.gmatrnm;
    const testCode = row.testcd;
    const testName = row.testhngnm || testCode;
    const detailName = row.detlchassinm || row.detlchassicd || "미분류";

    if (!institutionCode || !specimenKey || !testCode) continue;

    institutionSet.add(institutionCode);

    if (!specimenMap.has(specimenKey)) {
      specimenMap.set(specimenKey, {
        key: specimenKey,
        color: chemistryDetailColors[specimenMap.size % chemistryDetailColors.length],
      });
    }

    if (!testMap.has(testCode)) {
      testMap.set(testCode, {
        code: testCode,
        name: testName,
        specimenBuckets: new Map(),
      });
    }

    const test = testMap.get(testCode);
    if (!test.specimenBuckets.has(specimenKey)) {
      test.specimenBuckets.set(specimenKey, {
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        details: new Map(),
      });
    }

    const specimenBucket = test.specimenBuckets.get(specimenKey);
    specimenBucket.totalInstitutions.add(institutionCode);

    if (!specimenBucket.details.has(detailName)) {
      specimenBucket.details.set(detailName, {
        name: detailName,
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        unacceptableRowsByInstitution: new Map(),
      });
    }

    const detail = specimenBucket.details.get(detailName);
    detail.totalInstitutions.add(institutionCode);

    if (String(getChemistryJudgment(row)).trim().toUpperCase() === "N") {
      specimenBucket.unacceptableInstitutions.add(institutionCode);
      detail.unacceptableInstitutions.add(institutionCode);
      if (!detail.unacceptableRowsByInstitution.has(institutionCode)) {
        detail.unacceptableRowsByInstitution.set(
          institutionCode,
          toChemistryInstitutionRow(row, detailName),
        );
      }
    }
  }

  const specimens = Array.from(specimenMap.values()).sort((a, b) =>
    sortChemistryLabels(a.key, b.key),
  );

  const tests = Array.from(testMap.values()).map((test) => {
    const values = [];
    const unacceptableCounts = [];
    const participatingCounts = [];
    const specimenDetails = [];

    for (const specimen of specimens) {
      const bucket = test.specimenBuckets.get(specimen.key);
      const participatingCount = getSetSize(bucket?.totalInstitutions);
      const unacceptableCount = getSetSize(bucket?.unacceptableInstitutions);

      values.push(
        participatingCount > 0 ? (unacceptableCount / participatingCount) * 100 : 0,
      );
      unacceptableCounts.push(unacceptableCount);
      participatingCounts.push(participatingCount);

      const details = Array.from(bucket?.details.values() ?? [])
        .map((detail, index) => {
          const detailTotal = getSetSize(detail.totalInstitutions);
          const detailUnacceptable = getSetSize(detail.unacceptableInstitutions);

          return {
            name: detail.name,
            count: detailTotal,
            total: detailTotal,
            unacceptableCount: detailUnacceptable,
            rate: detailTotal > 0 ? (detailUnacceptable / detailTotal) * 100 : 0,
            color: chemistryDetailColors[index % chemistryDetailColors.length],
            rows: Array.from(detail.unacceptableRowsByInstitution.values()),
          };
        })
        .filter((detail) => detail.total > 0)
        .sort((a, b) => b.count - a.count || sortChemistryLabels(a.name, b.name));

      specimenDetails.push(details);
    }

    return {
      code: test.code,
      name: test.name,
      values,
      unacceptableCounts,
      participatingCounts,
      specimenDetails,
    };
  });

  return {
    specimens,
    tests,
    summary: [
      {
        label: "참여기관 수",
        value: institutionSet.size.toLocaleString(),
        unit: "기관",
      },
      {
        label: "검사항목 수",
        value: tests.length.toLocaleString(),
        unit: "종목",
      },
      {
        label: "검체 수",
        value: specimens.length.toLocaleString(),
        unit: "개",
      },
    ],
  };
}

function parseChemistryNumericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function createChemistryNonconformanceData(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      specimens: [],
      tests: [],
    };
  }

  const specimenMap = new Map();
  const testMap = new Map();

  for (const row of rows) {
    const institutionCode = row.instcd;
    const specimenKey = row.gmatrnm;
    const testCode = row.testcd;
    const testName = row.testhngnm || testCode;

    if (!institutionCode || !specimenKey || !testCode) continue;

    if (!specimenMap.has(specimenKey)) {
      specimenMap.set(specimenKey, {
        key: specimenKey,
        color: chemistryDetailColors[specimenMap.size % chemistryDetailColors.length],
      });
    }

    if (!testMap.has(testCode)) {
      testMap.set(testCode, {
        code: testCode,
        name: testName,
        specimenBuckets: new Map(),
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        sdiPoints: [],
      });
    }

    const test = testMap.get(testCode);
    test.totalInstitutions.add(institutionCode);

    if (!test.specimenBuckets.has(specimenKey)) {
      test.specimenBuckets.set(specimenKey, {
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        unacceptableRowsByInstitution: new Map(),
      });
    }

    const bucket = test.specimenBuckets.get(specimenKey);
    bucket.totalInstitutions.add(institutionCode);

    const judgment = String(getChemistryJudgment(row)).trim().toUpperCase();
    const isUnacceptable = judgment === "N";

    if (isUnacceptable) {
      test.unacceptableInstitutions.add(institutionCode);
      bucket.unacceptableInstitutions.add(institutionCode);
      if (!bucket.unacceptableRowsByInstitution.has(institutionCode)) {
        bucket.unacceptableRowsByInstitution.set(
          institutionCode,
          toChemistryInstitutionRow(row, row.detlchassinm || row.detlchassicd || "미분류"),
        );
      }
    }

    const standardSdi = parseChemistryNumericValue(row.sdi_l1);
    const detailSdi = parseChemistryNumericValue(row.sdi_l2);

    if (standardSdi !== null && detailSdi !== null) {
      test.sdiPoints.push({
        x: standardSdi,
        y: detailSdi,
        specimenKey,
        institutionCode,
        institutionName: row.cmpynm || institutionCode,
        result: row.rslt,
        judgment,
        isUnacceptable,
      });
    }
  }

  const specimens = Array.from(specimenMap.values()).sort((a, b) =>
    sortChemistryLabels(a.key, b.key),
  );

  const tests = Array.from(testMap.values())
    .map((test) => ({
      code: test.code,
      name: test.name,
      participatingCount: getSetSize(test.totalInstitutions),
      totalUnacceptableCount: getSetSize(test.unacceptableInstitutions),
      specimenSummaries: specimens.map((specimen) => {
        const bucket = test.specimenBuckets.get(specimen.key);
        const participatingCount = getSetSize(bucket?.totalInstitutions);
        const unacceptableCount = getSetSize(bucket?.unacceptableInstitutions);

        return {
          key: specimen.key,
          color: specimen.color,
          participatingCount,
          unacceptableCount,
          rate:
            participatingCount > 0
              ? (unacceptableCount / participatingCount) * 100
              : 0,
          rows: Array.from(bucket?.unacceptableRowsByInstitution.values() ?? []),
        };
      }),
      sdiPoints: test.sdiPoints,
    }))
    .sort((a, b) => sortChemistryLabels(a.name, b.name));

  return {
    specimens,
    tests,
  };
}

function getMakerData(selection, data = unacceptableRateData) {
  const selectedTest = data.tests[selection.testIndex];
  const detailRows = selectedTest?.specimenDetails?.[selection.specimenIndex];

  if (Array.isArray(detailRows) && detailRows.length > 0) {
    return detailRows;
  }

  const selectedValue = selectedTest?.values?.[selection.specimenIndex] ?? 0;
  const bumpIndex =
    (selection.testIndex + selection.specimenIndex) % makerBaseData.length;

  return makerBaseData.map((maker, index) => ({
    ...maker,
    rate: undefined,
    rows: undefined,
    count:
      index === bumpIndex
        ? maker.count + Math.round(selectedValue)
        : maker.count,
  }));
}

function getGeneratedInstrument(makerName) {
  if (makerName === "Roche") return "cobas pure c303";
  if (makerName.includes("Mindray")) return "BS-600M";
  if (makerName.includes("SNIBE")) return "MAGLUMI X8";
  if (makerName === "Biotecnica") return "BT 1500";
  if (makerName === "Biosystems") return "A15";
  if (makerName.includes("Tokyo")) return "BiOLiS 50i";
  return "Others";
}

function getInstitutionRowsForMakers(makers) {
  if (makers.some((maker) => Array.isArray(maker.rows))) {
    return makers.flatMap((maker) => maker.rows ?? []);
  }

  const generatedNames = [
    "가온의원",
    "누리검진센터",
    "라온내과",
    "서울메디랩",
    "연세바른병원",
    "중앙진단의학과",
    "하늘보건소",
  ];

  return makers.flatMap((maker, makerIndex) => {
    const matchingRows = institutionRows
      .filter((row) => row.maker === maker.name)
      .slice(0, maker.count);
    const missingCount = maker.count - matchingRows.length;

    if (missingCount <= 0) return matchingRows;

    const generatedRows = Array.from(
      { length: missingCount },
      (_, extraIndex) => {
        const sequence = makerIndex * 100 + extraIndex + 1;
        const sdiSign = (makerIndex + extraIndex) % 2 === 0 ? 1 : -1;
        const standardSdi = (sdiSign * (3.85 + (sequence % 9) * 0.31)).toFixed(
          2,
        );

        return {
          code: String(1000005000 + sequence),
          name: generatedNames[
            (makerIndex + extraIndex) % generatedNames.length
          ],
          result: String(100 + ((sequence * 17) % 180)).padStart(4, "0"),
          standardSdi,
          detailSdi: (Number(standardSdi) + sdiSign * 0.47).toFixed(2),
          maker: maker.name,
          instrument: getGeneratedInstrument(maker.name),
        };
      },
    );

    return [...matchingRows, ...generatedRows];
  });
}

function getTrendData(selection, data = unacceptableRateData) {
  const trendPeriods = trendTableData.allPeriods.map((period) => ({
    label: period.key,
    year: period.year,
    round: period.round,
  }));
  const selectedRate =
    data.tests[selection.testIndex]?.values?.[selection.specimenIndex] ?? 0;
  const base =
    48 +
    Math.round(selectedRate * 6) +
    (selection.testIndex % 6) * 3 +
    selection.specimenIndex * 4;

  return trendPeriods.map((period, index) => {
    const wave = Math.sin((index + selection.testIndex) * 0.85) * 9;
    const seasonal = index === 2 ? 10 : index === 4 ? -6 : 0;
    const drift = Math.round(index * 1.4);

    return {
      label: period.label,
      year: period.year,
      round: period.round,
      value: Math.max(12, Math.round(base + wave + seasonal + drift)),
    };
  });
}

function colorWithAlpha(hex, alpha) {
  const normalizedHex = hex.replace("#", "");
  const red = parseInt(normalizedHex.slice(0, 2), 16);
  const green = parseInt(normalizedHex.slice(2, 4), 16);
  const blue = parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getParticipatingCount(testIndex) {
  return Math.max(820, 1990 - testIndex * 43 - (testIndex % 4) * 17);
}

function getUnacceptableInstitutionCount(testIndex, specimenIndex) {
  const rate = unacceptableRateData.tests[testIndex].values[specimenIndex];

  if (rate <= 0) return 0;

  return Math.max(
    1,
    Math.round(rate * 2.35) + ((testIndex + specimenIndex) % 2),
  );
}

function getTotalUnacceptableInstitutionCount(testIndex) {
  return unacceptableRateData.specimens.reduce(
    (total, _specimen, specimenIndex) =>
      total + getUnacceptableInstitutionCount(testIndex, specimenIndex),
    0,
  );
}

function getSdiValue(testIndex, specimenIndex) {
  const rate = unacceptableRateData.tests[testIndex].values[specimenIndex];
  const direction = (testIndex + specimenIndex) % 2 === 0 ? 1 : -1;
  const base =
    0.52 + rate * 0.72 + (testIndex % 5) * 0.28 + specimenIndex * 0.34;

  return Number((direction * Math.min(5.4, base)).toFixed(2));
}

function getNonconformanceInstitutionRows(testIndex, specimenIndex) {
  const count = getUnacceptableInstitutionCount(testIndex, specimenIndex);
  const selectedTest = unacceptableRateData.tests[testIndex];
  const selectedSpecimen = unacceptableRateData.specimens[specimenIndex];
  const rowOffset = testIndex * 5 + specimenIndex * 3;

  return Array.from({ length: count }, (_, index) => {
    const sourceRow =
      institutionRows[(rowOffset + index) % institutionRows.length];
    const sdiSign = (testIndex + specimenIndex + index) % 2 === 0 ? 1 : -1;
    const sdi =
      sdiSign *
      (3.05 + ((testIndex + index) % 7) * 0.37 + specimenIndex * 0.18);

    return {
      ...sourceRow,
      code: sourceRow.code,
      name: sourceRow.name,
      result: String(
        100 +
          (((testIndex + 1) * 13 + (specimenIndex + 1) * 17 + index * 9) % 180),
      ).padStart(4, "0"),
      standardSdi: sdi.toFixed(2),
      detailSdi: (sdi + sdiSign * 0.31).toFixed(2),
      maker: sourceRow.maker,
      instrument: sourceRow.instrument,
      testCode: selectedTest.code,
      specimenKey: selectedSpecimen.key,
    };
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function renderDoughnutTooltip(context, makers) {
  const { chart, tooltip } = context;
  const parent = chart.canvas.parentNode;
  let tooltipEl = parent.querySelector(".donut-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "donut-tooltip";
    parent.appendChild(tooltipEl);
  }

  if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
    tooltipEl.style.opacity = "0";
    return;
  }

  const dataIndex = tooltip.dataPoints[0].dataIndex;
  const maker = makers[dataIndex];
  const total = makers.reduce((sum, item) => sum + item.count, 0);
  const detailShare = total > 0 ? (maker.count / total) * 100 : 0;
  const unacceptableCount = maker.unacceptableCount ?? maker.count;
  const unacceptableRate = Number.isFinite(maker.rate)
    ? maker.rate
    : maker.total > 0
      ? (unacceptableCount / maker.total) * 100
      : 0;
  const alignLeft = tooltip.caretX > chart.width / 2;

  tooltipEl.innerHTML = `
    <strong>${escapeHtml(maker.name)}</strong>
    <span>전체 ${maker.count.toLocaleString()} 기관 (${formatPercent(detailShare)})</span>
    <span>Unacceptable ${unacceptableCount.toLocaleString()} 기관 (${formatPercent(unacceptableRate)})</span>
  `;
  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = `${chart.canvas.offsetLeft + tooltip.caretX}px`;
  tooltipEl.style.top = `${chart.canvas.offsetTop + tooltip.caretY}px`;
  tooltipEl.style.transform = alignLeft
    ? "translate(-100%, -50%)"
    : "translate(12px, -50%)";
}

function renderUrineDoughnutTooltip(context, makers) {
  const { chart, tooltip } = context;
  const parent = chart.canvas.parentNode;
  let tooltipEl = parent.querySelector(".donut-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "donut-tooltip";
    parent.appendChild(tooltipEl);
  }

  if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
    tooltipEl.style.opacity = "0";
    return;
  }

  const dataIndex = tooltip.dataPoints[0].dataIndex;
  const maker = makers[dataIndex];
  const alignLeft = tooltip.caretX > chart.width / 2;

  tooltipEl.innerHTML = `
    <strong>${escapeHtml(maker.name)}</strong>
    <span>${maker.count} 기관 (${maker.rate.toFixed(2)}%)</span>
  `;
  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = `${chart.canvas.offsetLeft + tooltip.caretX}px`;
  tooltipEl.style.top = `${chart.canvas.offsetTop + tooltip.caretY}px`;
  tooltipEl.style.transform = alignLeft
    ? "translate(-100%, -50%)"
    : "translate(12px, -50%)";
}

function UnacceptableRateChart({ data = unacceptableRateData, onSelect }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const baseChartWidth = Math.max(860, data.tests.length * 36);
  const chartWidth = Math.round(baseChartWidth * zoomLevel);
  const maxRate = Math.max(
    8,
    ...data.tests.flatMap((test) => test.values.map((value) => Number(value) || 0)),
  );

  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));

  const changeZoom = (nextZoom) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: data.tests.map((test) => test.name),
        datasets: data.specimens.map((specimen, specimenIndex) => ({
          label: specimen.key,
          data: data.tests.map((test) => test.values[specimenIndex]),
          backgroundColor: specimen.color,
          borderColor: specimen.color,
          borderRadius: 2,
          barPercentage: 0.78,
          categoryPercentage: 0.7,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        onClick(_event, elements) {
          if (!elements.length) return;

          const [{ datasetIndex, index }] = elements;
          onSelect({
            testIndex: index,
            specimenIndex: datasetIndex,
          });
        },
        interaction: {
          intersect: true,
          mode: "nearest",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#fff",
            bodyColor: "#25304a",
            borderColor: "#d9e1ed",
            borderWidth: 1,
            displayColors: true,
            padding: 12,
            titleColor: "#25304a",
            callbacks: {
              title(items) {
                return data.tests[items[0].dataIndex].name;
              },
              label(item) {
                const test = data.tests[item.dataIndex];
                const count = test.unacceptableCounts?.[item.datasetIndex];
                const total = test.participatingCounts?.[item.datasetIndex];
                const suffix = Number.isFinite(count) && Number.isFinite(total)
                  ? ` (${count.toLocaleString()} / ${total.toLocaleString()}기관)`
                  : "";
                return `${item.dataset.label}: ${formatPercent(item.parsed.y)}${suffix}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#1f2d4d",
              font: {
                size: 10,
              },
              maxRotation: 50,
              minRotation: 50,
            },
          },
          y: {
            min: 0,
            max: Math.ceil(maxRate / 2) * 2,
            border: {
              color: "#cfd7e6",
            },
            grid: {
              color: "#dce3ed",
            },
            ticks: {
              color: "#1f2d4d",
              font: {
                size: 11,
              },
              stepSize: 1,
              callback(value) {
                return formatPercent(value);
              },
            },
          },
        },
      },
    });
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [data, onSelect, maxRate]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [chartWidth]);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    if (!scrollNode) return undefined;

    const handleWheel = (event) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      event.stopPropagation();
      setZoomLevel((currentZoom) =>
        clampZoom(currentZoom + (event.deltaY < 0 ? 0.25 : -0.25)),
      );
    };

    scrollNode.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollNode.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div className="rate-chart">
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="검체 범례">
          {data.specimens.map((specimen) => (
            <span key={specimen.key}>
              <i style={{ backgroundColor: specimen.color }} />
              {specimen.key}
            </span>
          ))}
        </div>
        <div className="chart-zoom" aria-label="그래프 확대 축소">
          <button
            type="button"
            onClick={() => changeZoom(zoomLevel - 0.25)}
            aria-label="그래프 축소"
          >
            -
          </button>
          <input
            type="range"
            min="75"
            max="200"
            step="25"
            value={Math.round(zoomLevel * 100)}
            aria-label="그래프 확대율"
            onChange={(event) => changeZoom(Number(event.target.value) / 100)}
          />
          <button
            type="button"
            onClick={() => changeZoom(zoomLevel + 0.25)}
            aria-label="그래프 확대"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1)}
            aria-label="그래프 확대 초기화"
          >
            100%
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="chart-scroll"
        aria-label="검사항목별 Unacceptable Rate 그래프 스크롤 영역"
      >
        <div className="chart-canvas" style={{ width: `${chartWidth}px` }}>
          <canvas
            ref={canvasRef}
            aria-label="검사항목별 Unacceptable Rate 막대그래프"
          />
        </div>
      </div>
    </div>
  );
}

function MakerDoughnutChart({ makers }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: makers.map((maker) => maker.name),
        datasets: [
          {
            data: makers.map((maker) => maker.count),
            backgroundColor: makers.map((maker) => maker.color),
            borderColor: "#fff",
            borderWidth: 1,
            hoverOffset: 3,
          },
        ],
      },
      plugins: [doughnutPercentLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "48%",
        plugins: {
          doughnutPercentLabels: {
            minPercent: 4,
          },
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
            external: (context) => renderDoughnutTooltip(context, makers),
          },
        },
      },
    });

    return () => {
      canvasRef.current?.parentNode?.querySelector(".donut-tooltip")?.remove();
      chart.destroy();
    };
  }, [makers]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="세분류별 기관 비율 및 Unacceptable 기관 수 도넛 차트"
    />
  );
}


function DetailBreakdownChart({ makers }) {
  const canvasRef = useRef(null);
  const unacceptableCanvasRef = useRef(null);
  const chartHeight = Math.max(340, makers.length * 38);
  const unacceptableChartHeight = Math.max(300, makers.length * 34);

  useEffect(() => {
    if (
      !canvasRef.current ||
      !unacceptableCanvasRef.current ||
      makers.length === 0
    ) {
      return undefined;
    }

    const unacceptableCounts = makers.map(
      (maker) => maker.unacceptableCount ?? maker.count,
    );
    const acceptableCounts = makers.map((maker, index) =>
      Math.max(0, maker.count - unacceptableCounts[index]),
    );
    const maxCount = Math.max(...makers.map((maker) => maker.count), 1);
    const maxUnacceptableCount = Math.max(...unacceptableCounts, 1);

    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: makers.map((maker) => maker.name),
        datasets: [
          {
            label: "Unacceptable 기관",
            data: unacceptableCounts,
            backgroundColor: "rgba(244, 63, 94, 0.82)",
            borderColor: "#e11d48",
            borderWidth: 1,
            borderRadius: 3,
            stack: "institution",
            barPercentage: 0.72,
            categoryPercentage: 0.72,
          },
          {
            label: "Acceptable 기관",
            data: acceptableCounts,
            backgroundColor: "rgba(37, 48, 74, 0.14)",
            borderColor: "#cfd7e6",
            borderWidth: 1,
            borderRadius: 3,
            stack: "institution",
            barPercentage: 0.72,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            position: "top",
            align: "start",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: "#25304a",
              font: {
                size: 11,
                weight: 700,
              },
            },
          },
          tooltip: {
            backgroundColor: "#fff",
            bodyColor: "#25304a",
            borderColor: "#d9e1ed",
            borderWidth: 1,
            displayColors: true,
            padding: 10,
            titleColor: "#111827",
            callbacks: {
              afterBody(items) {
                const maker = makers[items[0].dataIndex];
                const unacceptableCount = unacceptableCounts[items[0].dataIndex] ?? 0;
                const unacceptableRate = Number.isFinite(maker.rate)
                  ? maker.rate
                  : maker.total > 0
                    ? (unacceptableCount / maker.total) * 100
                    : 0;

                return [
                  `전체: ${maker.count.toLocaleString()} 기관`,
                  `Unacceptable: ${unacceptableCount.toLocaleString()} 기관 (${formatPercent(unacceptableRate)})`,
                ];
              },
              label(item) {
                return `${item.dataset.label}: ${Number(item.parsed.x).toLocaleString()} 기관`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            suggestedMax: Math.ceil(maxCount * 1.12),
            border: {
              color: "#cfd7e6",
            },
            grid: {
              color: "#e6ebf2",
            },
            ticks: {
              color: "#25304a",
              precision: 0,
              font: {
                size: 11,
              },
            },
          },
          y: {
            stacked: true,
            grid: {
              display: false,
            },
            ticks: {
              color: "#111827",
              font: {
                size: 11,
                weight: 700,
              },
              callback(value) {
                const label = this.getLabelForValue(value);
                return label.length > 16 ? `${label.slice(0, 16)}...` : label;
              },
            },
          },
        },
      },
    });

    const unacceptableChart = new Chart(unacceptableCanvasRef.current, {
      type: "bar",
      data: {
        labels: makers.map((maker) => maker.name),
        datasets: [
          {
            label: "Unacceptable 기관수",
            data: unacceptableCounts,
            backgroundColor: "rgba(244, 63, 94, 0.82)",
            borderColor: "#e11d48",
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.7,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#fff",
            bodyColor: "#25304a",
            borderColor: "#d9e1ed",
            borderWidth: 1,
            displayColors: false,
            padding: 10,
            titleColor: "#111827",
            callbacks: {
              label(item) {
                const maker = makers[item.dataIndex];
                const count = unacceptableCounts[item.dataIndex] ?? 0;
                const rate = Number.isFinite(maker.rate)
                  ? maker.rate
                  : maker.total > 0
                    ? (count / maker.total) * 100
                    : 0;

                return `Unacceptable: ${count.toLocaleString()} 기관 (${formatPercent(rate)})`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxUnacceptableCount * 1.18),
            border: {
              color: "#cfd7e6",
            },
            grid: {
              color: "#e6ebf2",
            },
            ticks: {
              color: "#25304a",
              precision: 0,
              font: {
                size: 11,
              },
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#111827",
              font: {
                size: 11,
                weight: 700,
              },
              callback(value) {
                const label = this.getLabelForValue(value);
                return label.length > 16 ? `${label.slice(0, 16)}...` : label;
              },
            },
          },
        },
      },
    });

    return () => {
      chart.destroy();
      unacceptableChart.destroy();
    };
  }, [makers]);

  if (makers.length === 0) {
    return (
      <div className="maker-chart-empty">
        <b>표시할 세분류 데이터가 없습니다.</b>
      </div>
    );
  }

  return (
    <div className="maker-chart-stack">
      <div className="maker-chart-panel">
        <canvas
          ref={canvasRef}
          style={{ height: `${chartHeight}px` }}
          aria-label="세분류별 전체 기관 수 안의 Unacceptable 기관 수 누적 막대그래프"
        />
      </div>
      <div className="maker-chart-panel unacceptable-count-chart-panel">
        <h5>세분류별 Unacceptable 기관수</h5>
        <canvas
          ref={unacceptableCanvasRef}
          style={{ height: `${unacceptableChartHeight}px` }}
          aria-label="detlchassinm 별 Unacceptable 기관수 막대그래프"
        />
      </div>
    </div>
  );
}

function TrendLineChart({ selection, data = unacceptableRateData }) {
  const canvasRef = useRef(null);
  const selectedTest = data.tests[selection.testIndex] ?? data.tests[0];
  const selectedSpecimen =
    data.specimens[selection.specimenIndex] ?? data.specimens[0];

  useEffect(() => {
    const trendData = getTrendData(selection, data);
    const maxValue = Math.max(...trendData.map((item) => item.value));
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: trendData.map((item) => item.label),
        datasets: [
          {
            type: "bar",
            label: "기관 수",
            data: trendData.map((item) => item.value),
            backgroundColor: "rgba(8, 105, 244, 0.24)",
            borderColor: "#0869f4",
            borderWidth: 1,
            borderRadius: 999,
            barThickness: 4,
            categoryPercentage: 0.7,
            order: 2,
          },
          {
            type: "line",
            label: `${selectedTest.name} / ${selectedSpecimen.key}`,
            data: trendData.map((item) => item.value),
            showLine: false,
            borderColor: "#0869f4",
            backgroundColor: "#fff",
            borderWidth: 0,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#0869f4",
            pointBorderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            filter(item) {
              return item.dataset.type === "line";
            },
            callbacks: {
              title(items) {
                const item = trendData[items[0].dataIndex];
                return `${item.label} 회차`;
              },
              label(item) {
                return `기관 수: ${item.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#1f2d4d",
              font: {
                size: 10,
              },
              maxRotation: 0,
              autoSkip: false,
              maxTicksLimit: trendData.length,
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.ceil((maxValue + 10) / 10) * 10,
            border: {
              color: "#cfd7e6",
            },
            grid: {
              color: "#dce3ed",
            },
            ticks: {
              color: "#1f2d4d",
              font: {
                size: 11,
              },
              precision: 0,
            },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [
    selection.testIndex,
    selection.specimenIndex,
    data,
    selectedSpecimen?.key,
    selectedTest?.name,
  ]);

  if (!selectedTest || !selectedSpecimen) return null;

  return (
    <div className="trend-chart">
      <div className="trend-selection">
        <span>선택 검사</span>
        <strong>{selectedTest.name}</strong>
        <span>선택 검체</span>
        <strong>{selectedSpecimen.key}</strong>
      </div>
      <div className="trend-canvas">
        <canvas
          ref={canvasRef}
          aria-label="선택한 검사 검체의 회차별 Unacceptable 기관 수 롤리팝 차트"
        />
      </div>
    </div>
  );
}

function SelectedTestDetail({ selection, data = unacceptableRateData }) {
  const [showInstitutionGrid, setShowInstitutionGrid] = useState(false);
  const selectedTest = data.tests[selection.testIndex] ?? data.tests[0];
  const selectedSpecimen =
    data.specimens[selection.specimenIndex] ?? data.specimens[0];
  const makers = getMakerData(selection, data);
  const total = makers.reduce((sum, maker) => sum + maker.count, 0);
  const selectedInstitutionRows = getInstitutionRowsForMakers(makers);

  useEffect(() => {
    setShowInstitutionGrid(false);
  }, [selection.testIndex, selection.specimenIndex]);

  const toggleInstitutionGrid = () => {
    setShowInstitutionGrid((current) => !current);
  };

  if (!selectedTest || !selectedSpecimen) return null;

  return (
    <>
      <div className="selection-row">
        <div>
          <span>선택 검사</span>
          <strong>{selectedTest.name}</strong>
        </div>
        <div>
          <span>선택 검체</span>
          <strong>{selectedSpecimen.key}</strong>
        </div>
      </div>

      <h4>세분류별 Unacceptable 기관수 ({selectedSpecimen.key} 기준)</h4>
      <div className="donut-layout chemistry-detail-donut-layout">
        <div
          className="donut-box"
          role="button"
          tabIndex={0}
          aria-controls="institution-list-grid"
          aria-expanded={showInstitutionGrid}
          onClick={toggleInstitutionGrid}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleInstitutionGrid();
            }
          }}
        >
          <MakerDoughnutChart makers={makers} />
          <div className="donut-center" aria-hidden="true">
            <strong>총 {total.toLocaleString()}개</strong>
            <span>기관</span>
          </div>
        </div>
        <DetailBreakdownChart makers={makers} />
      </div>

      {showInstitutionGrid && (
        <div className="institution-list" id="institution-list-grid">
          <div className="institution-list-head">
            <h4>Unacceptable 기관 목록</h4>
            <div className="institution-list-actions">
              <span>전체 {selectedInstitutionRows.length.toLocaleString()}개 기관</span>
            </div>
          </div>
          <AckDataGrid
            className="institution-data-grid"
            data={withRowNo(selectedInstitutionRows)}
            columns={toInstitutionGridColumns(institutionColumns)}
            getRowId={(row, index) =>
              `${row.code ?? ""}-${row.instrument ?? ""}-${index}`
            }
            paginationMode="pagination"
            pageSize={institutionPageSize}
            density="compact"
            domLayout="autoHeight"
            stickyHeader
            enableExcelExport
            excelFileName={`${selectedTest.code}_${selectedSpecimen.key}_기관목록.xlsx`}
            aria-label="Unacceptable 기관 목록"
          />
        </div>
      )}
    </>
  );
}

function NonconformanceInstitutionGrid({
  rows,
  selectedTest,
  selectedSpecimen,
  onClose,
  columns = nonconformanceInstitutionColumns,
}) {
  return (
    <div className="nonconformance-list" id="nonconformance-institution-list">
      <div className="institution-list-head">
        <h4>
          {selectedTest.code} / {selectedSpecimen.key} Unacceptable 기관 목록
        </h4>
        <div className="institution-list-actions">
          <span>전체 {rows.length}개 기관</span>
          <AckButton variant="secondary" size="small" onClick={onClose}>
            닫기
          </AckButton>
        </div>
      </div>
      <AckDataGrid
        className="institution-data-grid"
        data={withRowNo(rows)}
        columns={toInstitutionGridColumns(columns)}
        getRowId={(row, index) =>
          `${row.code ?? ""}-${row.instrument ?? ""}-${index}`
        }
        paginationMode="pagination"
        pageSize={institutionPageSize}
        density="compact"
        domLayout="autoHeight"
        stickyHeader
        aria-label="부적합 분석 Unacceptable 기관 목록"
      />
    </div>
  );
}

function NonconformanceSdiChart({ selectedTest, specimens }) {
  const l1CanvasRef = useRef(null);
  const l2CanvasRef = useRef(null);
  const points = selectedTest?.sdiPoints ?? [];

  useEffect(() => {
    if (!selectedTest || points.length === 0) return undefined;

    const createSdiChart = (canvas, axisKey, titleText) => {
      if (!canvas) return null;

      const datasets = specimens
        .map((specimen) => {
          const specimenPoints = points
            .filter((point) => point.specimenKey === specimen.key)
            .map((point, index) => ({
              ...point,
              x: index + 1,
              y: axisKey === "l1" ? point.x : point.y,
              sdiValue: axisKey === "l1" ? point.x : point.y,
            }));

          return {
            label: specimen.key,
            data: specimenPoints,
            pointRadius: specimenPoints.map((point) =>
              point.isUnacceptable ? 5 : 3,
            ),
            pointHoverRadius: specimenPoints.map((point) =>
              point.isUnacceptable ? 7 : 5,
            ),
            pointBackgroundColor: specimenPoints.map((point) =>
              point.isUnacceptable
                ? "#e11d48"
                : colorWithAlpha(specimen.color, 0.58),
            ),
            pointBorderColor: specimenPoints.map((point) =>
              point.isUnacceptable ? "#be123c" : specimen.color,
            ),
            pointBorderWidth: specimenPoints.map((point) =>
              point.isUnacceptable ? 1.5 : 1,
            ),
          };
        })
        .filter((dataset) => dataset.data.length > 0);

      return new Chart(canvas, {
        type: "scatter",
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: {
            intersect: false,
            mode: "nearest",
          },
          plugins: {
            legend: {
              position: "top",
              align: "start",
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                color: "#25304a",
                font: {
                  size: 11,
                  weight: 700,
                },
              },
            },
            tooltip: {
              backgroundColor: "#fff",
              bodyColor: "#25304a",
              borderColor: "#d9e1ed",
              borderWidth: 1,
              displayColors: true,
              padding: 10,
              titleColor: "#111827",
              callbacks: {
                title(items) {
                  const point = items[0].raw;
                  return point.institutionName;
                },
                label(item) {
                  const point = item.raw;
                  return [
                    "검체: " + point.specimenKey,
                    titleText + ": " + point.sdiValue.toFixed(2),
                    "결과: " + (point.result || "-"),
                    "판정: " + (point.judgment || "-"),
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "기관 순번",
                color: "#25304a",
                font: {
                  size: 12,
                  weight: "700",
                },
              },
              border: {
                color: "#cfd7e6",
              },
              grid: {
                color: "#eef2f7",
              },
              ticks: {
                color: "#1f2d4d",
                maxTicksLimit: 8,
                font: {
                  size: 11,
                },
              },
            },
            y: {
              min: -6,
              max: 6,
              title: {
                display: true,
                text: titleText,
                color: "#25304a",
                font: {
                  size: 12,
                  weight: "700",
                },
              },
              border: {
                color: "#cfd7e6",
              },
              grid: {
                color(context) {
                  return context.tick.value === 0 ? "#8792a5" : "#dce3ed";
                },
              },
              ticks: {
                color: "#1f2d4d",
                stepSize: 2,
                font: {
                  size: 11,
                },
              },
            },
          },
        },
      });
    };

    const charts = [
      createSdiChart(l1CanvasRef.current, "l1", "SDI_L1"),
      createSdiChart(l2CanvasRef.current, "l2", "SDI_L2"),
    ];

    return () => {
      charts.forEach((chart) => chart?.destroy());
    };
  }, [points, selectedTest, specimens]);

  if (!selectedTest || points.length === 0) {
    return (
      <div className="sdi-empty-state">
        선택 검사에 표시할 SDI 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="sdi-chart">
      <p className="sdi-selection">
        선택 검사: {selectedTest.name} · 참여기관 {selectedTest.participatingCount.toLocaleString()}개 · SDI 데이터 {points.length.toLocaleString()}건
      </p>
      <div className="sdi-split-grid">
        <div className="sdi-split-item">
          <h4>SDI_L1 분포</h4>
          <div className="sdi-canvas chemistry-sdi-scatter-canvas">
            <canvas ref={l1CanvasRef} aria-label="선택 검사 SDI_L1 분포도" />
          </div>
        </div>
        <div className="sdi-split-item">
          <h4>SDI_L2 분포</h4>
          <div className="sdi-canvas chemistry-sdi-scatter-canvas">
            <canvas ref={l2CanvasRef} aria-label="선택 검사 SDI_L2 분포도" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NonconformanceAnalysis({ rows = [] }) {
  const nonconformanceData = useMemo(
    () => createChemistryNonconformanceData(rows),
    [rows],
  );
  const [selectedTestIndex, setSelectedTestIndex] = useState(0);
  const [institutionTarget, setInstitutionTarget] = useState(null);
  const selectedTest =
    nonconformanceData.tests[selectedTestIndex] ?? nonconformanceData.tests[0];
  const selectedTargetTest = institutionTarget
    ? nonconformanceData.tests[institutionTarget.testIndex]
    : null;
  const selectedTargetSpecimen = institutionTarget
    ? selectedTargetTest?.specimenSummaries[institutionTarget.specimenIndex]
    : null;
  const selectedRows = selectedTargetSpecimen?.rows ?? [];

  useEffect(() => {
    setSelectedTestIndex((currentIndex) => {
      const maxIndex = Math.max(nonconformanceData.tests.length - 1, 0);
      return Math.min(currentIndex, maxIndex);
    });
    setInstitutionTarget(null);
  }, [nonconformanceData.tests.length]);

  const selectCard = (testIndex) => {
    setSelectedTestIndex(testIndex);
  };

  const handleCardKeyDown = (event, testIndex) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectCard(testIndex);
  };

  const toggleInstitutionList = (event, testIndex, specimenIndex) => {
    event.stopPropagation();
    setSelectedTestIndex(testIndex);
    setInstitutionTarget((currentTarget) => {
      if (
        currentTarget?.testIndex === testIndex &&
        currentTarget?.specimenIndex === specimenIndex
      ) {
        return null;
      }

      return { testIndex, specimenIndex };
    });
  };

  if (nonconformanceData.tests.length === 0) {
    return (
      <section className="nonconformance-view">
        <article className="panel nonconformance-card-panel">
          <div className="panel-head">
            <div>
              <h3>검사항목별 Unacceptable 상세현황</h3>
              <p>CSV 데이터를 불러오는 중입니다</p>
            </div>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="nonconformance-view">
      <article className="panel nonconformance-card-panel">
        <div className="panel-head">
          <div>
            <h3>검사항목별 Unacceptable 상세현황</h3>
            <p>검체별 Unacceptable 기관수</p>
          </div>
          <span>선택 검사: {selectedTest?.name}</span>
        </div>

        <div
          className="unacc-card-scroll"
          aria-label="검사항목별 Unacceptable 상세현황 카드 목록"
        >
          <div className="unacc-card-grid">
            {nonconformanceData.tests.map((test, testIndex) => {
              const isSelected = selectedTestIndex === testIndex;

              return (
                <article
                  className={"unacc-card" + (isSelected ? " selected" : "")}
                  key={test.code}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => selectCard(testIndex)}
                  onKeyDown={(event) => handleCardKeyDown(event, testIndex)}
                >
                  <div className="unacc-card-title">
                    <h4>{test.name}</h4>
                  </div>

                  <div className="unacc-card-metrics">
                    <div>
                      <span>참여기관</span>
                      <strong>{test.participatingCount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>1개이상 Unacc판정받은기관</span>
                      <strong className="danger">
                        {test.totalUnacceptableCount || "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="unacc-specimen-grid">
                    {test.specimenSummaries.map((specimen, specimenIndex) => (
                      <div
                        className="unacc-specimen-cell"
                        key={specimen.key}
                      >
                        <span>{specimen.key}</span>
                        <b>{formatPercent(specimen.rate)}</b>
                        <button
                          type="button"
                          className="unacc-count-button"
                          aria-controls="nonconformance-institution-list"
                          aria-expanded={
                            institutionTarget?.testIndex === testIndex &&
                            institutionTarget?.specimenIndex === specimenIndex
                          }
                          onClick={(event) =>
                            toggleInstitutionList(event, testIndex, specimenIndex)
                          }
                        >
                          {specimen.unacceptableCount.toLocaleString()}기관
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {institutionTarget && selectedTargetTest && selectedTargetSpecimen && (
          <NonconformanceInstitutionGrid
            rows={selectedRows}
            selectedTest={selectedTargetTest}
            selectedSpecimen={selectedTargetSpecimen}
            onClose={() => setInstitutionTarget(null)}
          />
        )}
      </article>

      <article className="panel sdi-panel">
        <div className="panel-head">
          <div>
            <h3>선택 검사 SDI 분포도</h3>
            <p>카드에서 선택한 검사에 대한 SDI_L1, SDI_L2 분포</p>
          </div>
          <span>단위: SDI</span>
        </div>
        <NonconformanceSdiChart
          selectedTest={selectedTest}
          specimens={nonconformanceData.specimens}
        />
      </article>
    </section>
  );
}

function formatQualitativeValue(value) {
  return formatUrineCell(value);
}

function formatQualitativeCount(value) {
  const cell = formatQualitativeValue(value);
  if (!cell) return "";

  const numericValue = Number(String(cell).replace(/,/g, ""));
  return Number.isFinite(numericValue) ? numericValue.toLocaleString() : cell;
}

function formatQualitativeRate(value) {
  const cell = formatQualitativeValue(value);
  if (!cell) return "";
  if (String(cell).includes("%")) return cell;

  const numericValue = Number(String(cell).replace(/,/g, ""));
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)}%` : cell;
}

const QUALITATIVE_NUMERIC_KEYS = [
  "결과선택기관수_전체",
  "결과선택기관수_선택",
  "결과선택기관수_비율",
];

const normalizeQualitativeStatisticsRows = (rows) =>
  rows.map((row) => {
    const normalized = { ...row };
    for (const key of QUALITATIVE_NUMERIC_KEYS) {
      normalized[key] = parseStatisticNumber(row[key]);
    }
    return normalized;
  });

function getQualitativeJudgmentClass(value) {
  return String(value).toLowerCase() === "unacceptable"
    ? "is-unacceptable"
    : "is-acceptable";
}

function QualitativeAnswerCell({ value }) {
  const cellValue = formatQualitativeValue(value);

  return (
    <span className="qualitative-answer-cell" title={cellValue}>
      {cellValue}
    </span>
  );
}

function QualitativeRemarkCell({ value }) {
  const cellValue = formatQualitativeValue(value) || "-";

  return (
    <span className="qualitative-remark-cell" title={cellValue}>
      {cellValue}
    </span>
  );
}

function QualitativeJudgmentCell({ value }) {
  const cellValue = formatQualitativeValue(value);

  return (
    <span
      className={`qualitative-judgment-cell ${getQualitativeJudgmentClass(
        cellValue,
      )}`}
      title={cellValue}
    >
      {cellValue}
    </span>
  );
}

const qualitativeGridColumns = [
  {
    field: "프로그램명",
    headerName: "프로그램명",
    autoMerge: true,
    width: 74,
    filter: "checklist",
    sortable: true,
    tooltip: "overflow",
  },
  {
    field: "상위검사명",
    headerName: "상위검사명",
    autoMerge: true,
    width: 90,
    filter: "checklist",
    sortable: true,
    tooltip: "overflow",
  },
  {
    field: "검사명",
    headerName: "검사명",
    width: 80,
    filter: "checklist",
    sortable: true,
    tooltip: "overflow",
  },
  {
    field: "검체명",
    headerName: "검체명",
    width: 82,
    filter: "checklist",
    sortable: true,
    tooltip: "overflow",
  },
  {
    field: "기준분류",
    headerName: "기준분류",
    autoMerge: true,
    width: 132,
    filter: "checklist",
    sortable: true,
    tooltip: "overflow",
  },
  {
    field: "보고된 결과",
    headerName: "보고된 결과",
    width: 74,
    align: "right",
    filter: "checklist",
    sortable: true,
  },
  {
    headerName: "결과선택기관수",
    children: [
      {
        field: "결과선택기관수_전체",
        headerName: "전체",
        width: 56,
        align: "right",
        headerAlign: "right",
        filter: "number",
        sortable: true,
        comparator: numCmp,
        cellRenderer: ({ row }) =>
          formatQualitativeCount(row["결과선택기관수_전체"]),
      },
      {
        field: "결과선택기관수_선택",
        headerName: "선택",
        width: 56,
        align: "right",
        headerAlign: "right",
        filter: "number",
        sortable: true,
        comparator: numCmp,
        cellRenderer: ({ row }) =>
          formatQualitativeCount(row["결과선택기관수_선택"]),
      },
      {
        field: "결과선택기관수_비율",
        headerName: "비율",
        width: 62,
        align: "right",
        headerAlign: "right",
        filter: "number",
        sortable: true,
        comparator: numCmp,
        cellRenderer: ({ row }) =>
          formatQualitativeRate(row["결과선택기관수_비율"]),
      },
    ],
  },
  {
    headerName: "운영자 정답(INTENDED)",
    children: [
      {
        field: "운영자 정답(INTENDED)",
        headerName: "운영자 정답",
        width: 158,
        filter: "checklist",
        sortable: true,
        tooltip: "overflow",
        cellRenderer: ({ row }) => (
          <QualitativeAnswerCell value={row["운영자 정답(INTENDED)"]} />
        ),
      },
      {
        field: "운영자 Remark",
        headerName: "운영자 Remark",
        width: 86,
        filter: "checklist",
        sortable: true,
        tooltip: "overflow",
        cellRenderer: ({ row }) => (
          <QualitativeRemarkCell value={row["운영자 Remark"]} />
        ),
      },
      {
        field: "운영자 판정",
        headerName: "운영자 판정",
        width: 92,
        filter: "checklist",
        sortable: true,
        cellRenderer: ({ row }) => (
          <QualitativeJudgmentCell value={row["운영자 판정"]} />
        ),
      },
    ],
  },
];

function UrineQualitativeStatistics({ rows }) {
  const sourceRows = rows ?? [];
  const gridRows = useMemo(
    () => normalizeQualitativeStatisticsRows(sourceRows),
    [sourceRows],
  );

  return (
    <section className="statistics-view qualitative-statistics-view">
      <article className="panel statistics-panel qualitative-statistics-panel">
        <div className="panel-head statistics-head">
          <div>
            <h3>검사항목별 정성 판정</h3>
            <p>운영자 정답 및 판정 결과를 한 화면에서 확인합니다</p>
          </div>
          <div className="statistics-actions">
            <span>전체 {sourceRows.length.toLocaleString()}건</span>
          </div>
        </div>

        <AckDataGrid
          data={gridRows}
          columns={qualitativeGridColumns}
          getRowId={(row, index) =>
            `${row["검사명"]}-${row["검체명"]}-${row["기준분류"]}-${row["보고된 결과"]}-${index}`
          }
          enableSorting
          enableColumnFilters
          paginationMode="pagination"
          pageSize={50}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          enableExcelExport
          excelFileName="검사항목별_정성판정.xlsx"
          aria-label="소변검사 정성 판정"
        />
      </article>
    </section>
  );
}

function StatisticsDetail({ rows: providedRows } = {}) {
  const [statisticsScope, setStatisticsScope] = useState("all");
  const rows = providedRows ?? getStatisticsRows();
  const scopeCounts = Object.fromEntries(
    statisticsScopeOptions.map((option) => [
      option.value,
      rows.filter((row) => rowMatchesStatisticsScope(row, option.value))
        .length,
    ]),
  );
  const scopedRows = rows.filter((row) =>
    rowMatchesStatisticsScope(row, statisticsScope),
  );

  return (
    <section className="statistics-view">
      <article className="panel statistics-panel">
        <div className="panel-head statistics-head">
          <div>
            <h3>검체별 기본통계</h3>
            <p>
              컬럼 헤더 필터·정렬로 원하는 통계 row만 확인하고, 엑셀로 내려받을
              수 있습니다
            </p>
          </div>
          <div className="statistics-actions">
            <span>
              전체 {rows.length.toLocaleString()}건 / 범위{" "}
              {scopedRows.length.toLocaleString()}건
            </span>
          </div>
        </div>

        <div className="statistics-scope-tabs" aria-label="통계 범위 선택">
          {statisticsScopeOptions.map((option) => (
            <button
              type="button"
              className={statisticsScope === option.value ? "active" : ""}
              key={option.value}
              onClick={() => setStatisticsScope(option.value)}
            >
              <span>{option.label}</span>
              <em>{scopeCounts[option.value].toLocaleString()}</em>
            </button>
          ))}
        </div>

        <AckDataGrid
          className="statistics-grid"
          data={normalizeStatisticsRows(scopedRows)}
          columns={statisticsGridColumns}
          getRowId={(row, index) => row.id ?? `stat-${index}`}
          enableSorting
          enableMultiSort
          enableColumnFilters
          paginationMode="pagination"
          pageSize={50}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          enableExcelExport
          enableVisibleExcelExport
          excelFileName="검체별_기본통계.xlsx"
          aria-label="검체별 기본통계"
        />
      </article>
    </section>
  );
}

function formatTrendRate(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toFixed(1)}%`;
}

function formatTrendChange(value) {
  if (value === null || value === undefined || value === "") return "-";

  const roundedValue = Number(value.toFixed(1));
  if (Math.abs(roundedValue) < 0.1) return "0";

  return `${roundedValue > 0 ? "+" : ""}${roundedValue.toFixed(1)}`;
}

function getTrendRateTone(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (Number(value) >= 5) return "high";
  if (Number(value) >= 2) return "warning";
  return "low";
}

function getTrendChangeTone(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (Number(value) >= 3) return "surge";
  if (Number(value) > 0.05) return "up";
  if (Number(value) < -0.05) return "down";
  return "flat";
}

function getTrendChangeIcon(tone) {
  if (tone === "surge" || tone === "up") return "▲";
  if (tone === "down") return "▼";
  if (tone === "flat") return "→";
  return "";
}

function formatTrendCount(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString()}기관`;
}

// 추이 히트맵 셀 ? 셀을 꽉 채우는 배경으로 rate 톤(high/warning/low/empty) 표현
const trendRateCellStyles = {
  low: { backgroundColor: "#e7f5ec" },
  warning: { backgroundColor: "#fff3cf" },
  high: { backgroundColor: "#ffe7ea" },
  empty: { backgroundColor: "#f4f6f9" },
  current: { backgroundColor: "#b8daf8" },
};

function getTrendRateCellStyle(value, isCurrent) {
  if (isCurrent) return trendRateCellStyles.current;
  return trendRateCellStyles[getTrendRateTone(value?.rate)];
}
function TrendRateGridCell({ value, isCurrent }) {
  const rate = value?.rate;
  const tone = getTrendRateTone(rate);
  const title =
    rate === null || rate === undefined
      ? "해당 회차 데이터 없음"
      : `${value?.specimenName ? `${value.specimenName} / ` : ""}Unacceptable 기관수 ${Number(
          value.unacceptableCount,
        ).toLocaleString()} / 참여기관수 ${Number(
          value.participatingCount,
        ).toLocaleString()}`;

  return (
    <div
      className={`trend-rate-cell is-${tone}${isCurrent ? " is-current" : ""}`}
      title={title}
    >
      {formatTrendRate(rate)}
    </div>
  );
}

function TrendChangeGridCell({ value }) {
  const tone = getTrendChangeTone(value);

  return (
    <div className={`trend-change-cell is-${tone}`}>
      <span aria-hidden="true">{getTrendChangeIcon(tone)}</span>
      {formatTrendChange(value)}
    </div>
  );
}

// 동적 기간 컬럼 + 검사항목(고정) + 추세. AckDataGrid용.
function buildTrendGridColumns(periods, nameHeader) {
  return [
    {
      field: "displayName",
      headerName: nameHeader,
      pinned: "left",
      minWidth: 240,
      sortable: true,
      tooltip: "overflow",
      cellRenderer: ({ row }) => (
        <div className="trend-name-cell">{row.displayName}</div>
      ),
    },
    ...periods.map((period, index) => ({
      field: `periodValues.${index}`,
      colId: `period-${index}`,
      headerName: period.label,
      align: "center",
      headerAlign: "center",
      minWidth: 96,
      sortable: false,
      cellRenderer: ({ row }) => (
        <TrendRateGridCell
          value={row.periodValues[index]}
          isCurrent={period.isCurrent}
        />
      ),
      cellStyle: ({ row, value }) =>
        getTrendRateCellStyle(value ?? row.periodValues[index], period.isCurrent),
    })),
    {
      field: "trendValue",
      colId: "trend",
      headerName: "추세",
      align: "center",
      headerAlign: "center",
      minWidth: 88,
      sortable: false,
      cellRenderer: ({ row }) => <TrendChangeGridCell value={row.trendValue} />,
    },
  ];
}

const chemistryTrendGridColumns = buildTrendGridColumns(
  trendTableData.periods,
  "검사항목",
);

function TrendAnalysisChart({ row }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !row) return undefined;

    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: row.chartValues.map((item) => item.label),
        datasets: [
          {
            type: "bar",
            label: "참여기관수",
            data: row.chartValues.map((item) => item.participatingCount),
            yAxisID: "participants",
            backgroundColor: "rgba(247, 190, 196, 0.58)",
            borderColor: "rgba(247, 190, 196, 0.95)",
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.48,
            categoryPercentage: 0.64,
            order: 2,
          },
          {
            type: "line",
            label: "Unacceptable Rate (%)",
            data: row.chartValues.map((item) => item.rate),
            yAxisID: "rate",
            borderColor: "#ef3434",
            backgroundColor: "#ef3434",
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 5,
            tension: 0.32,
            spanGaps: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              color: "#6d7a8c",
              font: {
                size: 11,
                weight: "700",
              },
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                if (context.dataset.yAxisID === "rate") {
                  return `${context.dataset.label}: ${formatTrendRate(
                    context.parsed.y,
                  )}`;
                }

                return `${context.dataset.label}: ${formatTrendCount(
                  context.parsed.y,
                )}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              borderDash: [2, 6],
              color: "#d7dee8",
            },
            ticks: {
              color: "#7d8898",
              font: {
                size: 11,
                weight: "700",
              },
            },
          },
          rate: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "Unacceptable Rate (%)",
              color: "#7d8898",
              font: {
                size: 11,
                weight: "800",
              },
            },
            grid: {
              color: "#e7ebf1",
            },
            ticks: {
              color: "#93a0b1",
              callback(value) {
                return `${value}%`;
              },
            },
          },
          participants: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "참여기관수",
              color: "#7d8898",
              font: {
                size: 11,
                weight: "800",
              },
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: "#93a0b1",
              precision: 0,
            },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [row]);

  return (
    <div className="trend-combo-chart">
      <canvas
        ref={canvasRef}
        aria-label="회차별 참여기관수와 Unacceptable Rate 추이 그래프"
      />
    </div>
  );
}

function TrendAnalysis() {
  const { rows } = trendTableData;
  const [selectedCode, setSelectedCode] = useState(rows[0]?.code ?? "");
  const chartPanelRef = useRef(null);
  const selectedRow = rows.find((row) => row.code === selectedCode) ?? rows[0];

  const selectTrendRow = (rowCode) => {
    setSelectedCode(rowCode);
    window.requestAnimationFrame(() => {
      chartPanelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };

  return (
    <section className="trend-analysis-view">
      <article className="panel trend-analysis-panel">
        <div className="trend-analysis-title">
          <h3>검체별 전체 검사항목 x 4회차 추이 테이블</h3>
          <span>▲▼ = 직전 회차 대비 변화</span>
        </div>

        <AckDataGrid
          className="trend-grid"
          data={rows}
          columns={chemistryTrendGridColumns}
          getRowId={(row) => row.code}
          getRowClass={(row) =>
            row.code === selectedRow?.code ? "is-selected" : undefined
          }
          onRowClick={(row) => selectTrendRow(row.code)}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          aria-label="검체별 전체 검사항목 추이"
        />
      </article>

      {selectedRow && (
        <article
          className="panel trend-analysis-chart-panel"
          ref={chartPanelRef}
        >
          <div className="panel-head">
            <div>
              <h3>회차별 Unacc Rate 추이</h3>
              <p>{selectedRow.displayName}</p>
            </div>
            <span>막대: 참여기관수 · 선: Unacceptable Rate (%)</span>
          </div>
          <TrendAnalysisChart row={selectedRow} />
        </article>
      )}
    </section>
  );
}

function StatisticsConfirmModal({ dialogType, onConfirm, onCancel, onClose }) {
  const isConfirmDialog = dialogType === "confirm";
  const message =
    dialogType === "success"
      ? "통계확인이 완료되었습니다"
      : dialogType === "cancel"
        ? "취소되었습니다"
        : "정말로 통계확인하시겠습니까?";

  return (
    <AckDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="통계확인"
      maxWidth="sm:max-w-[360px]"
      footer={
        isConfirmDialog ? (
          <>
            <AckButton variant="secondary" onClick={onCancel}>
              아니오
            </AckButton>
            <AckButton variant="primary" onClick={onConfirm}>
              예
            </AckButton>
          </>
        ) : (
          <AckButton variant="primary" onClick={onClose}>
            확인
          </AckButton>
        )
      }
    >
      <p className="statistics-confirm-message">{message}</p>
    </AckDialog>
  );
}

function AppHeader({ title }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="user-menu">
        <button type="button" aria-label="알림">
          <Bell size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <CircleUserRound size={24} strokeWidth={2} aria-hidden="true" />
        <strong>홍길동</strong>
      </div>
    </header>
  );
}

function TatStatusHeader({
  isStatisticsConfirmed,
  onOpenStatisticsConfirm,
  onResetStatisticsConfirm,
}) {
  return (
    <section className="tat-strip status-header" aria-labelledby="tat-title">
      <div>
        <h2 id="tat-title">TAT 현황</h2>
        <p>
          결과 마감: 2026-02-05 · 목표 TAT: 5일 · 보고서 목표일: 2026-02-10
        </p>
      </div>
      <div className="tat-progress">
        <span>경과</span>
        <strong>4일</strong>
        <div className="progress-track" aria-label="TAT 경과율">
          <span style={{ width: "62%" }} />
        </div>
        <span>남은 기간</span>
        <strong className="danger">1일</strong>
        <AckButton
          variant="primary"
          size="xsmall"
          disabled={isStatisticsConfirmed}
          onClick={onOpenStatisticsConfirm}
        >
          통계확인 완료
        </AckButton>
        {isStatisticsConfirmed && (
          <AckButton
            variant="secondary"
            size="xsmall"
            onClick={onResetStatisticsConfirm}
          >
            통계취소
          </AckButton>
        )}
      </div>
    </section>
  );
}

function ReportTabbar({ activeTab, onTabChange, tabs = reportTabs }) {
  return (
    <AckContentTabs
      className="report-tabs"
      value={activeTab}
      onValueChange={onTabChange}
      size="lg"
    >
      <AckContentTabs.List aria-label="분석 탭">
        {tabs.map((tab) => (
          <AckContentTabs.Tab value={tab.id} key={tab.id}>
            {tab.label}
          </AckContentTabs.Tab>
        ))}
      </AckContentTabs.List>
    </AckContentTabs>
  );
}

function ImageSpecimenModal({ onClose }) {
  const [selectedSpecimenName, setSelectedSpecimenName] = useState(
    urineImageSpecimens[0].name,
  );
  const selectedSpecimen =
    urineImageSpecimens.find((specimen) => specimen.name === selectedSpecimenName) ??
    urineImageSpecimens[0];

  return (
    <AckResponsiveDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="이미지 검체"
      maxWidth="sm:max-w-[980px]"
    >
      <div className="image-specimen-selector" aria-label="이미지 검체 목록">
        {urineImageSpecimens.map((specimen) => (
          <button
            type="button"
            className={specimen.name === selectedSpecimen.name ? "active" : undefined}
            onClick={() => setSelectedSpecimenName(specimen.name)}
            key={specimen.name}
          >
            {specimen.name}
          </button>
        ))}
      </div>
      <img
        className="image-specimen-preview"
        src={getPublicAssetUrl(`images/urine-specimens/${selectedSpecimen.fileName}`)}
        alt={`${selectedSpecimen.name} 이미지 검체`}
      />
    </AckResponsiveDialog>
  );
}

function UrineOverview({ onOpenImageSpecimen }) {
  return (
    <section className="summary-grid urine-summary-grid" aria-label="주요 지표">
      {urineSummary.map((item) => (
        <article className="summary-card" key={item.label}>
          <span className="summary-icon" aria-hidden="true" />
          <div>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.unit}</span>
          </div>
        </article>
      ))}

      <article className="summary-card urine-specimen-card">
        <span className="summary-icon" aria-hidden="true" />
        <div>
          <p>검체 수</p>
          <div className="urine-specimen-counts">
            <div>
              <span>일반검체</span>
              <strong>3</strong>
              <em>개</em>
            </div>
            <button type="button" onClick={onOpenImageSpecimen}>
              <span>이미지 검체</span>
              <strong>4</strong>
              <em>개</em>
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function getUrineXAxisLabelIndex(chart, event) {
  const x = event.x ?? event.native?.offsetX;
  const y = event.y ?? event.native?.offsetY;
  const xScale = chart.scales.x;

  if (x === undefined || y === undefined || !xScale) return null;
  if (y < chart.chartArea.bottom - 18 || y > chart.height) return null;

  const lastIndex = xScale.ticks.length - 1;

  for (let index = 0; index <= lastIndex; index += 1) {
    const currentX = xScale.getPixelForTick(index);
    const left =
      index === 0
        ? xScale.left
        : (xScale.getPixelForTick(index - 1) + currentX) / 2;
    const right =
      index === lastIndex
        ? xScale.right
        : (currentX + xScale.getPixelForTick(index + 1)) / 2;

    if (x >= left && x <= right) return index;
  }

  return null;
}

function createUrineAxisLabelHitboxes(chart) {
  const xScale = chart.scales.x;

  if (!xScale) return [];

  const top = Math.max(chart.chartArea.bottom - 10, 0);
  const height = Math.max(chart.height - top, 54);
  const lastIndex = xScale.ticks.length - 1;

  return urineUnacceptableRateData.tests.map((test, index) => {
    const centerX = xScale.getPixelForTick(index);
    const leftBoundary =
      index === 0
        ? xScale.left
        : (xScale.getPixelForTick(index - 1) + centerX) / 2;
    const rightBoundary =
      index === lastIndex
        ? xScale.right
        : (centerX + xScale.getPixelForTick(index + 1)) / 2;
    const width = Math.max(56, rightBoundary - leftBoundary);

    return {
      name: test.name,
      left: centerX,
      top,
      width,
      height,
    };
  });
}

function UrineUnacceptableRateChart({ selectedTestIndex, onSelect }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [axisLabelHitboxes, setAxisLabelHitboxes] = useState([]);
  const previousZoomLevelRef = useRef(zoomLevel);
  const baseChartWidth = Math.max(860, urineUnacceptableRateData.tests.length * 78);
  const baseChartHeight = 294;
  const chartWidth = Math.round(baseChartWidth * zoomLevel);
  const chartHeight = Math.round(baseChartHeight * zoomLevel);

  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));

  const changeZoom = (nextZoom) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  const selectTest = (testIndex) => {
    onSelect({
      testIndex,
      specimenIndex: 0,
    });
  };

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: urineUnacceptableRateData.tests.map((test) => test.name),
        datasets: urineUnacceptableRateData.specimens.map((specimen, index) => ({
          label: specimen.key,
          data: urineUnacceptableRateData.tests.map((test) => test.values[index]),
          backgroundColor: specimen.color,
          borderColor: specimen.color,
          borderWidth: 1,
          borderRadius: 2,
          maxBarThickness: 16,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        onClick(event, _elements, chartInstance) {
          const testIndex = getUrineXAxisLabelIndex(chartInstance, event);
          if (testIndex === null) return;

          selectTest(testIndex);
        },
        onHover(event, _elements, chartInstance) {
          const target = event.native?.target;
          if (!target) return;

          target.style.cursor =
            getUrineXAxisLabelIndex(chartInstance, event) === null
              ? "default"
              : "pointer";
        },
        onResize(chartInstance) {
          setAxisLabelHitboxes(createUrineAxisLabelHitboxes(chartInstance));
        },
        interaction: {
          intersect: true,
          mode: "nearest",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title(items) {
                return urineUnacceptableRateData.tests[items[0].dataIndex].name;
              },
              label(context) {
                if (context.raw === null || context.raw === undefined) {
                  return "";
                }

                return `${context.dataset.label}: ${Number(context.raw).toFixed(2)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#25304a",
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 11,
            grid: {
              color: "#d7dee8",
            },
            ticks: {
              color: "#25304a",
              callback(value) {
                return `${Number(value).toFixed(2)}%`;
              },
            },
          },
        },
      },
    });

    chartRef.current = chart;
    setAxisLabelHitboxes(createUrineAxisLabelHitboxes(chart));

    return () => {
      chart.destroy();
      chartRef.current = null;
      setAxisLabelHitboxes([]);
    };
  }, [onSelect]);

  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.resize();
    setAxisLabelHitboxes(createUrineAxisLabelHitboxes(chartRef.current));

    window.requestAnimationFrame(() => {
      const scrollNode = scrollRef.current;
      if (!scrollNode) return;

      if (zoomLevel >= previousZoomLevelRef.current) {
        scrollNode.scrollTop = scrollNode.scrollHeight - scrollNode.clientHeight;
      }

      previousZoomLevelRef.current = zoomLevel;
    });
  }, [chartWidth, chartHeight, zoomLevel]);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    if (!scrollNode) return undefined;

    const handleWheel = (event) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      event.stopPropagation();
      setZoomLevel((currentZoom) =>
        clampZoom(currentZoom + (event.deltaY < 0 ? 0.25 : -0.25)),
      );
    };

    scrollNode.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollNode.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <article className="panel chart-panel">
      <div className="panel-head">
        <div>
          <h3>검사항목별 Unacceptable Rate</h3>
          <p>Unacceptable이 1건 이상인 검사만 표시</p>
        </div>
        <span>단위: %</span>
      </div>
      <div className="rate-chart">
        <div className="chart-toolbar">
          <div className="chart-legend" aria-label="검체 범례">
            {urineUnacceptableRateData.specimens.map((specimen) => (
              <span key={specimen.key}>
                <i style={{ backgroundColor: specimen.color }} />
                {specimen.key}
              </span>
            ))}
          </div>
          <div className="chart-zoom" aria-label="그래프 확대 축소">
            <button
              type="button"
              onClick={() => changeZoom(zoomLevel - 0.25)}
              aria-label="그래프 축소"
            >
              -
            </button>
            <input
              type="range"
              min="75"
              max="200"
              step="25"
              value={Math.round(zoomLevel * 100)}
              aria-label="그래프 확대율"
              onChange={(event) => changeZoom(Number(event.target.value) / 100)}
            />
            <button
              type="button"
              onClick={() => changeZoom(zoomLevel + 0.25)}
              aria-label="그래프 확대"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              aria-label="그래프 확대 초기화"
            >
              100%
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="chart-scroll"
          aria-label="소변검사 검사항목별 Unacceptable Rate 그래프 스크롤 영역"
        >
          <div
            className="chart-canvas"
            style={{
              width: `max(100%, ${chartWidth}px)`,
              height: `${chartHeight}px`,
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="소변검사 검사항목별 Unacceptable Rate 막대그래프"
            />
            <div className="axis-label-click-layer" aria-label="검사항목 선택">
              {axisLabelHitboxes.map((hitbox, index) => (
                <button
                  type="button"
                  className={
                    selectedTestIndex === index
                      ? "axis-label-hitbox active"
                      : "axis-label-hitbox"
                  }
                  style={{
                    left: `${hitbox.left}px`,
                    top: `${hitbox.top}px`,
                    width: `${hitbox.width}px`,
                    height: `${hitbox.height}px`,
                  }}
                  title={hitbox.name}
                  aria-label={`${hitbox.name} 검사 선택`}
                  key={hitbox.name}
                  onClick={() => selectTest(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function UrineMakerDoughnutChart({ makers }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || makers.length === 0) return undefined;

    const urineRateLabels = {
      id: "urineRateLabels",
      afterDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        const values = chart.data.datasets[0].data;
        const { ctx } = chart;

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "700 12px Segoe UI, Malgun Gothic, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        meta.data.forEach((arc, index) => {
          const value = Number(values[index]);
          if (value < 0.5) return;

          const props = arc.getProps(
            ["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"],
            true,
          );
          const angle = (props.startAngle + props.endAngle) / 2;
          const radius = (props.innerRadius + props.outerRadius) / 2;
          const x = props.x + Math.cos(angle) * radius;
          const y = props.y + Math.sin(angle) * radius;

          ctx.fillText(`${value.toFixed(2)}%`, x, y);
        });

        ctx.restore();
      },
    };

    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: makers.map((maker) => maker.name),
        datasets: [
          {
            data: makers.map((maker) => maker.rate),
            backgroundColor: makers.map((maker) => maker.color),
            borderColor: "#fff",
            borderWidth: 1,
            hoverOffset: 3,
          },
        ],
      },
      plugins: [urineRateLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "48%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
            external: (context) => renderUrineDoughnutTooltip(context, makers),
          },
        },
      },
    });

    return () => {
      chart.destroy();
      canvasRef.current?.parentNode?.querySelector(".donut-tooltip")?.remove();
    };
  }, [makers]);

  return <canvas ref={canvasRef} aria-label="제조사별 Unacceptable rate 도넛 그래프" />;
}

function UrineSelectedTestDetail({ selection, doughnutRows, institutionRows }) {
  const [activeInstitutionSpecimenKey, setActiveInstitutionSpecimenKey] =
    useState(null);
  const selectedTest = urineUnacceptableRateData.tests[selection.testIndex];
  const selectedTestKey = getUrineTestKey(selectedTest);
  const selectedSpecimenDetails = urineUnacceptableRateData.specimens
    .map((specimen, specimenIndex) => {
      const value = selectedTest.values[specimenIndex];
      const selectedMakerRows = doughnutRows.filter(
        (row) =>
          row["검체명"] === specimen.key &&
          row["검사명"] === selectedTestKey &&
          Number(row["Unacceptable rate"]) > 0,
      );
      const selectedInstitutionRows = institutionRows.filter(
        (row) =>
          row["검체명"] === specimen.key && row["검사명"] === selectedTestKey,
      );
      const makers = selectedMakerRows.map((row, index) => {
        const makerName = row["제조사"];
        const institutionCount = selectedInstitutionRows.filter(
          (institution) => institution["제조사명"] === makerName,
        ).length;

        return {
          name: makerName,
          rate: Number(row["Unacceptable rate"]),
          count: institutionCount,
          color: urineMakerColors[index % urineMakerColors.length],
        };
      });

      return {
        specimen,
        value,
        makers,
        institutionRows: selectedInstitutionRows,
      };
    })
    .filter(
      (detail) =>
        (detail.value !== null && detail.value !== undefined) ||
        detail.makers.length > 0 ||
        detail.institutionRows.length > 0,
    );
  const activeDetail = selectedSpecimenDetails.find(
    (detail) => detail.specimen.key === activeInstitutionSpecimenKey,
  );
  const activeInstitutionRows = activeDetail?.institutionRows ?? [];

  useEffect(() => {
    setActiveInstitutionSpecimenKey(null);
  }, [selection.testIndex]);

  const toggleInstitutionGrid = (specimenKey) => {
    setActiveInstitutionSpecimenKey((current) =>
      current === specimenKey ? null : specimenKey,
    );
  };

  return (
    <article className="panel detail-panel">
      <div className="panel-head">
        <h3>선택한 검사 상세</h3>
      </div>
      <div className="selection-row">
        <div>
          <span>선택 검사</span>
          <strong>{selectedTest.name}</strong>
        </div>
        <div>
          <span>검체 수</span>
          <strong>{selectedSpecimenDetails.length}개</strong>
        </div>
      </div>

      <div className="urine-specimen-detail-list">
        {selectedSpecimenDetails.map((detail) => (
          <section
            className="urine-specimen-detail-card"
            key={detail.specimen.key}
          >
            <h4>
              제조사별 Unacceptable Rate ({detail.specimen.key} 기준)
              {detail.value !== null && detail.value !== undefined && (
                <span>{Number(detail.value).toFixed(2)}%</span>
              )}
            </h4>
            {detail.makers.length > 0 ? (
              <div className="donut-layout urine-specimen-donut-layout">
                <div
                  className={`donut-box urine-specimen-donut-box ${
                    detail.institutionRows.length === 0 ? "is-static" : ""
                  }`}
                  role={detail.institutionRows.length > 0 ? "button" : undefined}
                  tabIndex={detail.institutionRows.length > 0 ? 0 : undefined}
                  aria-controls="urine-institution-list-grid"
                  aria-expanded={
                    activeInstitutionSpecimenKey === detail.specimen.key
                  }
                  onClick={() => {
                    if (detail.institutionRows.length > 0) {
                      toggleInstitutionGrid(detail.specimen.key);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      detail.institutionRows.length > 0 &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      toggleInstitutionGrid(detail.specimen.key);
                    }
                  }}
                >
                  <UrineMakerDoughnutChart makers={detail.makers} />
                  <div className="donut-center" aria-hidden="true">
                    <strong>총 {detail.institutionRows.length}개</strong>
                    <span>기관</span>
                  </div>
                </div>
                <div className="maker-list">
                  {detail.makers.map((maker) => (
                    <div
                      className="maker-item"
                      key={`${detail.specimen.key}-${maker.name}`}
                    >
                      <i style={{ backgroundColor: maker.color }} />
                      <b>{maker.name}</b>
                      <span>
                        {maker.count} 기관 ({maker.rate.toFixed(2)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="urine-detail-empty">
                표시할 제조사 데이터가 없습니다.
              </div>
            )}
          </section>
        ))}
      </div>

      {activeDetail && (
        <div className="institution-list" id="urine-institution-list-grid">
          <div className="institution-list-head">
            <h4>
              {selectedTest.name} / {activeDetail.specimen.key} Unacceptable 기관
              목록
            </h4>
            <div className="institution-list-actions">
              <span>전체 {activeInstitutionRows.length}개 기관</span>
            </div>
          </div>
          <AckDataGrid
            className="institution-data-grid"
            data={withRowNo(activeInstitutionRows)}
            columns={urineInstitutionGridColumns}
            getRowId={(row, index) =>
              `${row["기관코드"] ?? ""}-${row["검체명"] ?? ""}-${row["검사명"] ?? ""}-${index}`
            }
            paginationMode="pagination"
            pageSize={institutionPageSize}
            density="compact"
            domLayout="autoHeight"
            stickyHeader
            enableExcelExport
            excelFileName={`${selectedTest.name}_${activeDetail.specimen.key}_Unacceptable기관목록.xlsx`}
            aria-label="소변검사 Unacceptable 기관 목록"
          />
        </div>
      )}
    </article>
  );
}

function UrineTrendLineChart({ selection, trendRows }) {
  const canvasRef = useRef(null);
  const selectedTest = urineUnacceptableRateData.tests[selection.testIndex];
  const selectedTestKey = getUrineTestKey(selectedTest);
  const selectedSpecimenCount = selectedTest.values.filter(
    (value) => value !== null && value !== undefined,
  ).length;

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const selectedRows = trendRows.filter(
      (row) => row["검사명"] === selectedTestKey,
    );
    const periods = Array.from(
      new Set(selectedRows.map((row) => `${row["회차년도"]}-${row["회차"]}`)),
    ).sort(
      (left, right) =>
        getUrineTrendPeriodSortValue(left) -
        getUrineTrendPeriodSortValue(right),
    );
    const rowsBySpecimen = new Map();

    selectedRows.forEach((row) => {
      const specimenOrder = Number(row["횟수"]);
      const count = Number(String(row["Unaccep"]).replace(/,/g, ""));
      const period = `${row["회차년도"]}-${row["회차"]}`;

      if (!Number.isFinite(specimenOrder) || !Number.isFinite(count)) return;
      if (!rowsBySpecimen.has(specimenOrder)) {
        rowsBySpecimen.set(specimenOrder, new Map());
      }

      rowsBySpecimen.get(specimenOrder).set(period, count);
    });

    const specimenDetails = urineUnacceptableRateData.specimens
      .map((specimen, specimenIndex) => ({
        specimen,
        value: selectedTest.values[specimenIndex],
      }))
      .filter(
        (detail) => detail.value !== null && detail.value !== undefined,
      );
    const maxCount = Math.max(
      10,
      ...Array.from(rowsBySpecimen.values()).flatMap((rowsByPeriod) =>
        Array.from(rowsByPeriod.values()),
      ),
    );

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: periods,
        datasets: specimenDetails.map(({ specimen }) => {
          const specimenOrder = getUrineSpecimenOrder(specimen.key);
          const rowsByPeriod = rowsBySpecimen.get(specimenOrder) ?? new Map();

          return {
            label: specimen.key,
            data: periods.map((period) => rowsByPeriod.get(period) ?? null),
            borderColor: specimen.color,
            backgroundColor: specimen.color,
            pointBackgroundColor: "#fff",
            pointBorderColor: specimen.color,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.25,
            spanGaps: true,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxHeight: 8,
              boxWidth: 12,
              color: "#25304a",
              font: {
                size: 11,
                weight: 700,
              },
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${Number(
                  context.raw,
                ).toLocaleString()} 기관`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#25304a",
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxCount * 1.15),
            grid: {
              color: "#d7dee8",
            },
            ticks: {
              color: "#25304a",
              precision: 0,
            },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [selection.testIndex, selectedTest, selectedTestKey, trendRows]);

  return (
    <article className="panel trend-panel">
      <div className="panel-head">
        <div>
          <h3>선택한 검사 Unacceptable 기관 수 추이</h3>
          <p>검체별 회차 추이 차트</p>
        </div>
        <span>단위: 기관</span>
      </div>
      <div className="trend-selection">
        <span>선택 검사</span>
        <strong>{selectedTest.name}</strong>
        <span>검체 수</span>
        <strong>{selectedSpecimenCount}개</strong>
      </div>
      <div className="trend-canvas">
        <canvas
          ref={canvasRef}
          aria-label="소변검사 선택 검사의 검체별 회차별 Unacceptable 기관 수 추이"
        />
      </div>
    </article>
  );
}

function getUrineTrendPeriodKey(row) {
  return `${row["회차년도"]}-${row["회차"]}`;
}

function getUrineTrendPeriodSortValue(periodKey) {
  const [year, number] = String(periodKey).split("-");
  return Number(year) * 100 + Number(number);
}

function formatUrineTrendTestName(testName) {
  return String(testName ?? "").replace(/^-/, "");
}

function createUrineTrendAnalysisData(rows) {
  const periodMap = new Map();
  const rowMap = new Map();

  rows.forEach((row) => {
    const periodKey = getUrineTrendPeriodKey(row);
    const testCode = row["검사코드"];
    const testName = row["검사명"];
    const specimenOrder = Number(row["횟수"]);
    const groupKey = `${testCode}-${specimenOrder}`;
    const rate = parseStatisticNumber(row["unaccep rate"]);
    const unacceptableCount = parseStatisticNumber(row["Unaccep"]);
    const participatingCount = parseStatisticNumber(row["기관수"]);

    if (!testCode || !Number.isFinite(specimenOrder)) return;

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        key: periodKey,
        label: periodKey,
        sortValue: getUrineTrendPeriodSortValue(periodKey),
      });
    }

    if (!rowMap.has(groupKey)) {
      rowMap.set(groupKey, {
        code: groupKey,
        testCode,
        testName,
        displayTestName: formatUrineTrendTestName(testName),
        specimenOrder,
        specimenNamesByPeriod: new Map(),
        valuesByPeriod: new Map(),
      });
    }

    const trendRow = rowMap.get(groupKey);
    trendRow.specimenNamesByPeriod.set(periodKey, row["검체명"]);
    trendRow.valuesByPeriod.set(periodKey, {
      periodKey,
      rate,
      unacceptableCount,
      participatingCount,
      specimenName: row["검체명"],
    });
  });

  const periods = Array.from(periodMap.values()).sort(
    (left, right) => left.sortValue - right.sortValue,
  );
  const currentPeriod = periods.at(-1);
  const rowsByTrend = Array.from(rowMap.values())
    .sort((left, right) => {
      const testCompare = String(left.testCode).localeCompare(
        String(right.testCode),
        "ko",
        {
          numeric: true,
          sensitivity: "base",
        },
      );

      if (testCompare !== 0) return testCompare;
      return left.specimenOrder - right.specimenOrder;
    })
    .map((row) => {
      const periodValues = periods.map((period) => {
        const value = row.valuesByPeriod.get(period.key);

        return (
          value ?? {
            periodKey: period.key,
            rate: null,
            unacceptableCount: null,
            participatingCount: null,
            specimenName: "",
          }
        );
      });
      const chartValues = periodValues.map((value, index) => ({
        ...value,
        label: periods[index].label,
      }));
      const availableValues = periodValues.filter((value) => value.rate !== null);
      const currentValue = row.valuesByPeriod.get(currentPeriod?.key);
      const currentSpecimenName =
        currentValue?.specimenName ??
        availableValues.at(-1)?.specimenName ??
        `${row.specimenOrder}검체`;
      const latestValue = availableValues.at(-1);
      const previousValue = availableValues.at(-2);
      const trendValue =
        latestValue && previousValue
          ? Number(latestValue.rate) - Number(previousValue.rate)
          : null;

      return {
        code: row.code,
        displayName: `${row.displayTestName} / ${currentSpecimenName}`,
        periodValues,
        chartValues,
        trendValue,
      };
    });

  return {
    periods: periods.map((period) => ({
      ...period,
      isCurrent: period.key === currentPeriod?.key,
    })),
    rows: rowsByTrend,
  };
}

function UrineTrendAnalysis({ rows }) {
  const { periods, rows: trendRows } = createUrineTrendAnalysisData(rows);
  const trendGridColumns = useMemo(
    () => buildTrendGridColumns(periods, "검사항목 / 검체"),
    [periods],
  );
  const [selectedCode, setSelectedCode] = useState(trendRows[0]?.code ?? "");
  const chartPanelRef = useRef(null);
  const selectedRow =
    trendRows.find((row) => row.code === selectedCode) ?? trendRows[0];

  useEffect(() => {
    if (!selectedCode && trendRows[0]?.code) {
      setSelectedCode(trendRows[0].code);
    }
  }, [selectedCode, trendRows]);

  const selectTrendRow = (rowCode) => {
    setSelectedCode(rowCode);
    window.requestAnimationFrame(() => {
      chartPanelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };

  if (trendRows.length === 0) {
    return (
      <section className="panel tab-empty-panel">
        <h2>추이분석</h2>
        <p>표시할 소변검사 추이 데이터가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="trend-analysis-view urine-trend-analysis-view">
      <article className="panel trend-analysis-panel">
        <div className="trend-analysis-title">
          <h3>검사항목/검체별 Unacceptable Rate 추이 테이블</h3>
          <span>추세 = 직전 회차 대비 변화</span>
        </div>

        <AckDataGrid
          className="trend-grid"
          data={trendRows}
          columns={trendGridColumns}
          getRowId={(row) => row.code}
          getRowClass={(row) =>
            row.code === selectedRow?.code ? "is-selected" : undefined
          }
          onRowClick={(row) => selectTrendRow(row.code)}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          aria-label="검사항목/검체별 Unacceptable Rate 추이"
        />
      </article>

      {selectedRow && (
        <article
          className="panel trend-analysis-chart-panel"
          ref={chartPanelRef}
        >
          <div className="panel-head">
            <div>
              <h3>회차별 Unacc Rate 추이</h3>
              <p>{selectedRow.displayName}</p>
            </div>
            <span>막대: 참여기관수 · 선: Unacceptable Rate (%)</span>
          </div>
          <TrendAnalysisChart row={selectedRow} />
        </article>
      )}
    </section>
  );
}

function createUrineNonconformanceCards(rows) {
  const cardMap = new Map();

  rows.forEach((row) => {
    const testCode = row.testCode;
    const participating = Number(String(row.participating).replace(/,/g, ""));
    const totalUnacceptable = Number(
      String(row.totalUnacceptable).replace(/,/g, ""),
    );
    const count = Number(String(row.count).replace(/,/g, ""));

    if (!testCode) return;

    if (!cardMap.has(testCode)) {
      cardMap.set(testCode, {
        testCode,
        testName: row.testName,
        displayName: String(row.testName).replace(/^-/, ""),
        participating: Number.isFinite(participating) ? participating : 0,
        totalUnacceptable: Number.isFinite(totalUnacceptable)
          ? totalUnacceptable
          : 0,
        specimens: [],
      });
    }

    const card = cardMap.get(testCode);
    card.specimens.push({
      specimen: row.specimen,
      count: Number.isFinite(count) ? count : 0,
      rate:
        Number.isFinite(participating) && participating > 0
          ? (count / participating) * 100
          : 0,
    });
  });

  return Array.from(cardMap.values());
}

function parseDistributionNumber(value) {
  const numericValue = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function getDistributionSortNumber(label) {
  const numericValue = Number(String(label).replace(/[^\d.-]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : Number.POSITIVE_INFINITY;
}

function sortDistributionRows(left, right) {
  const leftNumber = getDistributionSortNumber(left.label);
  const rightNumber = getDistributionSortNumber(right.label);

  if (leftNumber !== rightNumber) return leftNumber - rightNumber;

  return String(left.label).localeCompare(String(right.label), "ko", {
    numeric: true,
    sensitivity: "base",
  });
}

function createFallbackResultDistributionRows({ card, specimen }) {
  const specimenIndex = Math.max(
    card.specimens.findIndex(
      (cardSpecimen) => cardSpecimen.specimen === specimen.specimen,
    ),
    0,
  );
  const totalCount = card.participating || 1900;
  const mockWeights = [
    [0.001, 0.002, 0.006, 0.12, 0.78, 0.091],
    [0, 0.001, 0.004, 0.16, 0.74, 0.095],
    [0.002, 0.003, 0.011, 0.2, 0.68, 0.104],
    [0.001, 0.004, 0.014, 0.24, 0.6, 0.141],
  ];
  const weights = mockWeights[specimenIndex % mockWeights.length];
  const rows = urineResultDistributionAxisLabels.map((label, index) => ({
    label,
    count: Math.round(totalCount * weights[index]),
  }));
  const rowTotal = rows.reduce((sum, row) => sum + row.count, 0);

  rows[rows.length - 1].count += totalCount - rowTotal;

  return {
    totalCount,
    rows,
  };
}

function createResultDistributionRows({ card, specimen, rows }) {
  const specimenRows = rows.filter(
    (row) =>
      row.specimen === specimen.specimen &&
      (row.testCode === card.testCode ||
        row.testName === card.testName ||
        row.testName === card.displayName),
  );

  if (specimenRows.length === 0) {
    const fallbackDistribution = createFallbackResultDistributionRows({
      card,
      specimen,
    });

    return {
      totalCount: fallbackDistribution.totalCount,
      rows: fallbackDistribution.rows.sort(sortDistributionRows).map((row) => ({
        ...row,
        percent:
          fallbackDistribution.totalCount > 0
            ? (row.count / fallbackDistribution.totalCount) * 100
            : 0,
      })),
    };
  }

  const distributionRows = specimenRows.map((row) => ({
    label: formatUrineCell(row.result) || "미입력",
    count: parseDistributionNumber(row.count) ?? 0,
  }));
  const csvTotal = parseDistributionNumber(specimenRows[0].total);
  const countTotal = distributionRows.reduce((sum, row) => sum + row.count, 0);
  const totalCount = csvTotal ?? countTotal;

  return {
    totalCount,
    rows: distributionRows.sort(sortDistributionRows).map((row) => ({
      ...row,
      percent: totalCount > 0 ? (row.count / totalCount) * 100 : 0,
    })),
  };
}

function UrineResultDistributionChart({ card, specimen, resultDistributionRows }) {
  const distribution = createResultDistributionRows({
    card,
    specimen,
    rows: resultDistributionRows,
  });

  return (
    <article className="result-distribution-card">
      <div className="result-distribution-head">
        <h4>결과값 분포({specimen.specimen})</h4>
        <i aria-hidden="true">i</i>
      </div>

      <div className="result-distribution-bars">
        {(() => {
          const maxCount = Math.max(
            ...distribution.rows.map((row) => row.count),
            0,
          );

          return distribution.rows.map((row) => {
            const width = Math.max(row.percent, row.count > 0 ? 0.8 : 0);

            return (
              <div
                className={`result-distribution-row${
                  row.count === maxCount ? " is-major" : ""
                }`}
                key={`${specimen.specimen}-${row.label}`}
                title={`${row.label}: ${row.percent.toFixed(
                  1,
                )}% (${row.count.toLocaleString()}기관)`}
              >
                <span className="result-distribution-label">{row.label}</span>
                <span className="result-distribution-track">
                  <span
                    className="result-distribution-fill"
                    style={{ width: `${Math.min(width, 100)}%` }}
                  />
                </span>
                <strong>
                  {row.percent.toFixed(1)}% ({row.count.toLocaleString()})
                </strong>
              </div>
            );
          });
        })()}
      </div>

      <div className="result-distribution-axis" aria-hidden="true">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </article>
  );
}

function UrineResultDistributionSection({
  selectedCard,
  resultDistributionRows,
  institutionTarget,
}) {
  if (!selectedCard) return null;

  return (
    <div className="result-distribution-section">
      <div className="institution-list-head">
        <h4>{selectedCard.displayName} 검체별 결과값 분포</h4>
        <span>검체 {selectedCard.specimens.length.toLocaleString()}개</span>
      </div>
      <div className="result-distribution-grid">
        {selectedCard.specimens.map((specimen) => (
          <div
            className={
              institutionTarget?.specimen === specimen.specimen
                ? "result-distribution-shell selected"
                : "result-distribution-shell"
            }
            key={specimen.specimen}
          >
            <UrineResultDistributionChart
              card={selectedCard}
              specimen={specimen}
              resultDistributionRows={resultDistributionRows}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function parseSdiNumber(value) {
  const numericValue = Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function clampSdiForChart(value) {
  return Math.max(-6, Math.min(6, value));
}

function averageValues(values) {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createSpecificGravitySdiChartRows(rows) {
  const specimenMap = new Map();

  rows
    .filter((row) => row.testName === "-Specific Gravity")
    .forEach((row) => {
      if (!specimenMap.has(row.specimen)) {
        specimenMap.set(row.specimen, {
          specimen: row.specimen,
          standardValues: [],
        });
      }

      const specimenRow = specimenMap.get(row.specimen);
      const standardSdi = parseSdiNumber(row.standardSdi);

      if (standardSdi !== null) {
        specimenRow.standardValues.push(clampSdiForChart(standardSdi));
      }
    });

  return Array.from(specimenMap.values())
    .sort((left, right) =>
      String(left.specimen).localeCompare(String(right.specimen), "ko", {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map((row) => ({
      specimen: row.specimen,
      standardSdi: averageValues(row.standardValues),
      standardCount: row.standardValues.length,
    }));
}

function UrineSpecificGravitySdiChart({ rows }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const sdiRows = createSpecificGravitySdiChartRows(rows);
  const baseChartWidth = Math.max(980, sdiRows.length * 190);
  const chartWidth = Math.round(baseChartWidth * zoomLevel);
  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));

  const changeZoom = (nextZoom) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: sdiRows.map((row) => row.specimen),
        datasets: [
          {
            label: "기준SDI",
            data: sdiRows.map((row) => row.standardSdi),
            backgroundColor: sdiRows.map(
              (row, index) =>
                urineUnacceptableRateData.specimens.find(
                  (specimen) => specimen.key === row.specimen,
                )?.color ??
                urineUnacceptableRateData.specimens[index]?.color ??
                "#0869f4",
            ),
            borderColor: sdiRows.map(
              (row, index) =>
                urineUnacceptableRateData.specimens.find(
                  (specimen) => specimen.key === row.specimen,
                )?.color ??
                urineUnacceptableRateData.specimens[index]?.color ??
                "#0869f4",
            ),
            borderWidth: 1,
            borderRadius: 2,
            barPercentage: 0.72,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label(item) {
                const sourceRow = sdiRows[item.dataIndex];

                return `${item.dataset.label}: ${Number(item.parsed.y).toFixed(
                  2,
                )} (${sourceRow.standardCount.toLocaleString()}건)`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "검체명",
              color: "#25304a",
              font: {
                size: 12,
                weight: "700",
              },
            },
            grid: {
              display: false,
            },
            ticks: {
              color: "#1f2d4d",
              font: {
                size: 11,
                weight: "700",
              },
            },
          },
          y: {
            min: -6,
            max: 6,
            title: {
              display: true,
              text: "SDI",
              color: "#25304a",
              font: {
                size: 12,
                weight: "700",
              },
            },
            border: {
              color: "#cfd7e6",
            },
            grid: {
              color(context) {
                return context.tick.value === 0 ? "#8792a5" : "#dce3ed";
              },
            },
            ticks: {
              color: "#1f2d4d",
              font: {
                size: 11,
              },
              stepSize: 2,
            },
          },
        },
      },
    });

    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [sdiRows]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [chartWidth]);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    if (!scrollNode) return undefined;

    const handleWheel = (event) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      event.stopPropagation();
      setZoomLevel((currentZoom) =>
        clampZoom(currentZoom + (event.deltaY < 0 ? 0.25 : -0.25)),
      );
    };

    scrollNode.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollNode.removeEventListener("wheel", handleWheel);
    };
  }, []);

  if (sdiRows.length === 0) {
    return <div className="urine-detail-empty">표시할 SDI 데이터가 없습니다.</div>;
  }

  return (
    <div className="sdi-chart">
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="Specific Gravity SDI 범례">
          {sdiRows.map((row, index) => {
            const color =
              urineUnacceptableRateData.specimens.find(
                (specimen) => specimen.key === row.specimen,
              )?.color ??
              urineUnacceptableRateData.specimens[index]?.color ??
              "#0869f4";

            return (
              <span key={row.specimen}>
                <i style={{ backgroundColor: color }} />
                {row.specimen}
              </span>
            );
          })}
        </div>
        <div className="chart-zoom" aria-label="SDI 그래프 확대 축소">
          <button
            type="button"
            onClick={() => changeZoom(zoomLevel - 0.25)}
            aria-label="SDI 그래프 축소"
          >
            -
          </button>
          <input
            type="range"
            min="75"
            max="200"
            step="25"
            value={Math.round(zoomLevel * 100)}
            aria-label="SDI 그래프 확대율"
            onChange={(event) => changeZoom(Number(event.target.value) / 100)}
          />
          <button
            type="button"
            onClick={() => changeZoom(zoomLevel + 0.25)}
            aria-label="SDI 그래프 확대"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1)}
            aria-label="SDI 그래프 확대 초기화"
          >
            100%
          </button>
        </div>
      </div>
      <p className="sdi-selection">선택 검사: Specific Gravity</p>
      <div
        ref={scrollRef}
        className="chart-scroll"
        aria-label="Specific Gravity SDI 그래프 스크롤 영역"
      >
        <div className="sdi-canvas" style={{ width: `${chartWidth}px` }}>
          <canvas
            ref={canvasRef}
            aria-label="Specific Gravity 검체별 SDI 분포 막대그래프"
          />
        </div>
      </div>
    </div>
  );
}

function isSpecificGravityCard(card) {
  return card?.testName === "-Specific Gravity";
}

function UrineNonconformanceAnalysis({ rows, institutionRows, resultDistributionRows }) {
  const [selectedTestCode, setSelectedTestCode] = useState("");
  const [institutionTarget, setInstitutionTarget] = useState(null);
  const cards = createUrineNonconformanceCards(rows);
  const selectedCard =
    cards.find((card) => card.testCode === selectedTestCode) ?? cards[0];
  const selectedCardIsSpecificGravity = isSpecificGravityCard(selectedCard);
  const selectedInstitutionRows = institutionTarget
    ? institutionRows.filter(
        (row) =>
          row.testName === institutionTarget.testName &&
          row.specimen === institutionTarget.specimen,
      )
    : [];

  const selectCard = (card) => {
    setSelectedTestCode(card.testCode);
    setInstitutionTarget(null);
  };

  const toggleInstitutionList = (event, card, specimen) => {
    event.stopPropagation();
    setSelectedTestCode(card.testCode);
    setInstitutionTarget((currentTarget) => {
      if (
        currentTarget?.testName === card.testName &&
        currentTarget?.specimen === specimen.specimen
      ) {
        return null;
      }

      return {
        testName: card.testName,
        testCode: card.testCode,
        displayName: card.displayName,
        specimen: specimen.specimen,
      };
    });
  };

  return (
    <section className="nonconformance-view urine-nonconformance-view">
      <article className="panel nonconformance-card-panel urine-nonconformance-panel">
        <div className="panel-head">
          <div>
            <h3>검사항목별 Unacceptable 상세현황</h3>
            <p>검체별 비교를 통해 특정 검체 문제 여부 파악</p>
          </div>
          <span>선택 검사: {selectedCard?.displayName ?? "-"}</span>
        </div>

        {cards.length > 0 ? (
          <div
            className="unacc-card-scroll urine-unacc-card-scroll"
            aria-label="소변검사 검사항목별 Unacceptable 상세현황 카드 목록"
          >
            <div className="unacc-card-grid">
              {cards.map((card) => {
                const isSelected = selectedCard?.testCode === card.testCode;

                return (
                  <article
                    className={`unacc-card${isSelected ? " selected" : ""}`}
                    key={card.testCode}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => selectCard(card)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      selectCard(card);
                    }}
                  >
                    <div className="unacc-card-title">
                      <h4>{card.displayName}</h4>
                    </div>

                    <div className="unacc-card-metrics">
                      <div>
                        <span>참여기관</span>
                        <strong>{card.participating.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span>1개이상 Unacc판정받은기관</span>
                        <strong className="danger">
                          {card.totalUnacceptable.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div
                      className={`unacc-specimen-grid ${
                        card.specimens.length > 3 ? "has-four" : ""
                      }`}
                    >
                      {card.specimens.map((specimen) => (
                        <div
                          className="unacc-specimen-cell"
                          key={specimen.specimen}
                          title={`${specimen.specimen} ${formatPercent(
                            specimen.rate,
                          )} ${specimen.count.toLocaleString()}기관`}
                        >
                          <span>{specimen.specimen}</span>
                          <b>{formatPercent(specimen.rate)}</b>
                          <button
                            type="button"
                            className="unacc-count-button"
                            aria-controls="nonconformance-institution-list"
                            aria-expanded={
                              institutionTarget?.testName === card.testName &&
                              institutionTarget?.specimen === specimen.specimen
                            }
                            onClick={(event) =>
                              toggleInstitutionList(event, card, specimen)
                            }
                          >
                            {specimen.count.toLocaleString()}기관
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="urine-detail-empty">표시할 부적합 분석 데이터가 없습니다.</div>
        )}

        {institutionTarget && (
          <NonconformanceInstitutionGrid
            rows={selectedInstitutionRows}
            selectedTest={{ code: institutionTarget.displayName }}
            selectedSpecimen={{ key: institutionTarget.specimen }}
            onClose={() => setInstitutionTarget(null)}
            columns={
              institutionTarget.testName === "Urine sediment"
                ? urineSedimentNonconformanceInstitutionColumns
                : urineNonconformanceInstitutionColumns
            }
          />
        )}

        {selectedCard && !selectedCardIsSpecificGravity && (
          <UrineResultDistributionSection
            selectedCard={selectedCard}
            resultDistributionRows={resultDistributionRows}
            institutionTarget={institutionTarget}
          />
        )}
      </article>

      {selectedCardIsSpecificGravity && (
        <article className="panel sdi-panel urine-specific-gravity-sdi-panel">
          <div className="panel-head">
            <div>
              <h3>Specific Gravity SDI 분포</h3>
              <p>일반화학 부적합분석의 SDI 그래프 형식으로 표시합니다</p>
            </div>
            <span>단위: SDI</span>
          </div>
          <UrineSpecificGravitySdiChart rows={institutionRows} />
        </article>
      )}
    </section>
  );
}

function NewPage({
  isStatisticsConfirmed,
  onOpenStatisticsConfirm,
  onResetStatisticsConfirm,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isImageSpecimenOpen, setIsImageSpecimenOpen] = useState(false);
  const [urineSelection, setUrineSelection] = useState({
    testIndex: 0,
    specimenIndex: 0,
  });
  const [urineDoughnutRows, setUrineDoughnutRows] = useState([]);
  const [urineInstitutionRows, setUrineInstitutionRows] = useState([]);
  const [urineTrendRows, setUrineTrendRows] = useState([]);
  const [urineNonconformanceRows, setUrineNonconformanceRows] = useState([]);
  const [urineResultDistributionRows, setUrineResultDistributionRows] =
    useState([]);
  const [urineStatisticsRows, setUrineStatisticsRows] = useState([]);
  const [urineQualitativeStatisticsRows, setUrineQualitativeStatisticsRows] =
    useState([]);
  const [urineNonconformanceInstitutionRows, setUrineNonconformanceInstitutionRows] =
    useState([]);
  const activeTabLabel = reportTabs.find((tab) => tab.id === activeTab)?.label;

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch(getDataUrl("urine-doughnut.csv")).then((response) =>
        response.text(),
      ),
      fetch(getDataUrl("urine-institutions.csv")).then((response) =>
        response.text(),
      ),
      fetch(getDataUrl("urine-trend.csv")).then((response) => response.text()),
      fetch(getDataUrl("urine-statistics-quantitative.csv")).then((response) =>
        response.text(),
      ),
      fetch(getDataUrl("urine-statistics-qualitative.csv")).then((response) =>
        response.text(),
      ),
      fetch(getDataUrl("urine-nonconformance.csv")).then((response) =>
        response.text(),
      ),
      fetch(getDataUrl("urine-result-distribution.csv")).then((response) =>
        response.text(),
      ),
      fetch(getDataUrl("urine-nonconformance-institutions.csv")).then(
        (response) => response.text(),
      ),
    ])
      .then(
        ([
          doughnutCsv,
          institutionCsv,
          trendCsv,
          statisticsCsv,
          qualitativeStatisticsCsv,
          nonconformanceCsv,
          resultDistributionCsv,
          nonconformanceInstitutionCsv,
        ]) => {
        if (!isMounted) return;
        setUrineDoughnutRows(parseCsv(doughnutCsv));
        setUrineInstitutionRows(parseCsv(institutionCsv));
        setUrineTrendRows(parseCsv(trendCsv));
        setUrineStatisticsRows(parseCsv(statisticsCsv));
        setUrineQualitativeStatisticsRows(parseCsv(qualitativeStatisticsCsv));
        setUrineNonconformanceRows(parseCsv(nonconformanceCsv));
        setUrineResultDistributionRows(parseCsv(resultDistributionCsv));
        setUrineNonconformanceInstitutionRows(
          parseCsv(nonconformanceInstitutionCsv),
        );
      },
      )
      .catch(() => {
        if (!isMounted) return;
        setUrineDoughnutRows([]);
        setUrineInstitutionRows([]);
        setUrineTrendRows([]);
        setUrineStatisticsRows([]);
        setUrineQualitativeStatisticsRows([]);
        setUrineNonconformanceRows([]);
        setUrineResultDistributionRows([]);
        setUrineNonconformanceInstitutionRows([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <AppHeader title="2025년 1회차 소변검사" />
      <TatStatusHeader
        isStatisticsConfirmed={isStatisticsConfirmed}
        onOpenStatisticsConfirm={onOpenStatisticsConfirm}
        onResetStatisticsConfirm={onResetStatisticsConfirm}
      />
      <ReportTabbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="dashboard">
        {activeTab === "overview" ? (
          <>
            <UrineOverview
              onOpenImageSpecimen={() => setIsImageSpecimenOpen(true)}
            />
            <section className="content-grid urine-overview-grid">
              <UrineUnacceptableRateChart
                selectedTestIndex={urineSelection.testIndex}
                onSelect={setUrineSelection}
              />
              <UrineSelectedTestDetail
                selection={urineSelection}
                doughnutRows={urineDoughnutRows}
                institutionRows={urineInstitutionRows}
              />
              <UrineTrendLineChart
                selection={urineSelection}
                trendRows={urineTrendRows}
              />
            </section>
          </>
        ) : activeTab === "nonconformance" ? (
          <UrineNonconformanceAnalysis
            rows={urineNonconformanceRows}
            institutionRows={urineNonconformanceInstitutionRows}
            resultDistributionRows={urineResultDistributionRows}
          />
        ) : activeTab === "statistics-quantitative" ? (
          <StatisticsDetail rows={urineStatisticsRows} />
        ) : activeTab === "statistics-qualitative" ? (
          <UrineQualitativeStatistics rows={urineQualitativeStatisticsRows} />
        ) : activeTab === "trend" ? (
          <UrineTrendAnalysis rows={urineTrendRows} />
        ) : (
          <section className="panel tab-empty-panel" aria-label="새 페이지 탭 영역">
            <h2>{activeTabLabel}</h2>
          </section>
        )}
      </main>

      {isImageSpecimenOpen && (
        <ImageSpecimenModal onClose={() => setIsImageSpecimenOpen(false)} />
      )}
    </div>
  );
}

function App() {
  const [selection, setSelection] = useState({
    testIndex: 0,
    specimenIndex: 0,
  });
  const [activePage, setActivePage] = useState(getPageIdFromHash);
  const [activeTab, setActiveTab] = useState("overview");
  const [isStatisticsConfirmed, setIsStatisticsConfirmed] = useState(false);
  const [statisticsDialog, setStatisticsDialog] = useState(null);
  const [chemistryRows, setChemistryRows] = useState([]);
  const chemistryDashboardData = useMemo(
    () => createChemistryDashboardData(chemistryRows),
    [chemistryRows],
  );
  const chemistrySummary = chemistryDashboardData.summary;
  const activeTabLabel = dashboardTabs.find((tab) => tab.id === activeTab)?.label;

  useEffect(() => {
    const syncActivePageWithUrl = () => {
      setActivePage(getPageIdFromHash());
    };

    syncActivePageWithUrl();
    window.addEventListener("hashchange", syncActivePageWithUrl);

    return () => {
      window.removeEventListener("hashchange", syncActivePageWithUrl);
    };
  }, []);

  useEffect(() => {
    document.title =
      activePage === "new-page"
        ? "소변검사 대시보드"
        : "일반화학검사 대시보드";
  }, [activePage]);

  useEffect(() => {
    let isActive = true;

    fetch(getPublicAssetUrl(chemistryDataFileName))
      .then((response) => response.arrayBuffer())
      .then((buffer) => new TextDecoder("euc-kr").decode(buffer))
      .then((csvText) => {
        if (isActive) setChemistryRows(parseCsv(csvText));
      })
      .catch(() => {
        if (isActive) setChemistryRows([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setSelection((currentSelection) => {
      const maxTestIndex = Math.max(chemistryDashboardData.tests.length - 1, 0);
      const maxSpecimenIndex = Math.max(chemistryDashboardData.specimens.length - 1, 0);
      const nextSelection = {
        testIndex: Math.min(currentSelection.testIndex, maxTestIndex),
        specimenIndex: Math.min(currentSelection.specimenIndex, maxSpecimenIndex),
      };

      if (
        nextSelection.testIndex === currentSelection.testIndex &&
        nextSelection.specimenIndex === currentSelection.specimenIndex
      ) {
        return currentSelection;
      }

      return nextSelection;
    });
  }, [chemistryDashboardData]);

  useEffect(() => {
    if (!dashboardTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab]);

  const openStatisticsConfirm = () => {
    if (isStatisticsConfirmed) return;
    setStatisticsDialog("confirm");
  };

  const confirmStatistics = () => {
    setIsStatisticsConfirmed(true);
    setStatisticsDialog("success");
  };

  const cancelStatistics = () => {
    setStatisticsDialog("cancel");
  };

  const resetStatisticsConfirm = () => {
    setIsStatisticsConfirmed(false);
  };

  const statisticsConfirmModal = statisticsDialog ? (
    <StatisticsConfirmModal
      dialogType={statisticsDialog}
      onConfirm={confirmStatistics}
      onCancel={cancelStatistics}
      onClose={() => setStatisticsDialog(null)}
    />
  ) : null;

  if (activePage === "new-page") {
    return (
      <>
        <NewPage
          isStatisticsConfirmed={isStatisticsConfirmed}
          onOpenStatisticsConfirm={openStatisticsConfirm}
          onResetStatisticsConfirm={resetStatisticsConfirm}
        />
        {statisticsConfirmModal}
      </>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader title="2025년 04회차 일반화학검사" />
      <TatStatusHeader
        isStatisticsConfirmed={isStatisticsConfirmed}
        onOpenStatisticsConfirm={openStatisticsConfirm}
        onResetStatisticsConfirm={resetStatisticsConfirm}
      />
      <ReportTabbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={dashboardTabs}
      />

      <main className="dashboard">
        {activeTab === "overview" ? (
          <>
            <section className="summary-grid" aria-label="주요 지표">
              {chemistrySummary.map((item) => (
                <article className="summary-card" key={item.label}>
                  <span className="summary-icon" aria-hidden="true" />
                  <div>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                    <span>{item.unit}</span>
                  </div>
                </article>
              ))}
            </section>

            <section className="content-grid">
              <article className="panel chart-panel">
                <div className="panel-head">
                  <div>
                    <h3>검사항목별 Unacceptable Rate</h3>
                    <p>Unacceptable이 1건 이상인 검사만 표시</p>
                  </div>
                  <span>단위: %</span>
                </div>
                <UnacceptableRateChart
                  data={chemistryDashboardData}
                  onSelect={setSelection}
                />
              </article>

              <article className="panel detail-panel">
                <div className="panel-head">
                  <h3>선택한 검사 상세</h3>
                </div>
                <SelectedTestDetail
                  data={chemistryDashboardData}
                  selection={selection}
                />
              </article>

              <article className="panel trend-panel">
                <div className="panel-head">
                  <div>
                    <h3>선택한 검사(검체) Unacceptable 기관 수 추이</h3>
                    <p>회차별 기관 수 롤리팝 차트</p>
                  </div>
                  <span>단위: 기관</span>
                </div>
                <TrendLineChart data={chemistryDashboardData} selection={selection} />
              </article>
            </section>
          </>
        ) : activeTab === "nonconformance" ? (
          <NonconformanceAnalysis rows={chemistryRows} />
        ) : activeTab === "statistics-quantitative" ? (
          <StatisticsDetail />
        ) : activeTab === "trend" ? (
          <TrendAnalysis />
        ) : (
          <section className="panel tab-empty-panel">
            <h2>{activeTabLabel}</h2>
            <p>
              이 탭의 분석 화면은 다음 단계에서 구성할 수 있도록 영역만
              준비했습니다.
            </p>
          </section>
        )}
      </main>

      {statisticsConfirmModal}
    </div>
  );
}

export default App;


