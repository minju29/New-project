import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const urineImageSpecimens = [
  "CUI-25-01",
  "CUI-25-02",
  "CUI-25-03",
  "CUI-25-04",
].map((name) => ({
  name,
  fileName: `${name}.png`,
}));

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
    {
      name: "Urobilinogen",
      values: [0.16, 0.21, 0.91, null, null, null, null],
    },
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

const hepatitisDashboardTabs = reportTabs.filter(
  (tab) => tab.id !== "statistics-quantitative",
);

const pageRoutes = [
  { id: "dashboard", path: "dashboard" },
  { id: "new-page", path: "new-page" },
  { id: "hepatitis-dashboard", path: "hepatitis-dashboard" },
];

const defaultPageId = pageRoutes[0].id;

function getPageIdFromHash() {
  if (typeof window === "undefined") return defaultPageId;

  const rawPath = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
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

  const headers = rows[0]?.map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );
  if (!headers) return [];

  return rows
    .slice(1)
    .map((values) =>
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
  { key: "instrument", label: "기준분류" },
  { key: "maker", label: "세분류" },
];

const nonconformanceInstitutionColumns = [
  { key: "no", label: "No" },
  { key: "code", label: "기관코드" },
  { key: "name", label: "기관명" },
  { key: "result", label: "결과" },
  { key: "standardSdi", label: "기준SDI" },
  { key: "detailSdi", label: "세부SDI" },
  { key: "instrument", label: "기준분류" },
  { key: "maker", label: "세분류" },
];

const participationInstitutionGridColumns = [
  { field: "code", headerName: "기관코드", tooltip: "overflow", minWidth: 88 },
  { field: "name", headerName: "기관명", tooltip: "overflow", minWidth: 128 },
  { field: "testName", headerName: "검사명", tooltip: "overflow", minWidth: 118 },
  {
    field: "specimenName",
    headerName: "검체명",
    tooltip: "overflow",
    minWidth: 72,
  },
  { field: "result", headerName: "결과", tooltip: "overflow", minWidth: 64 },
  {
    field: "standardSdi",
    headerName: "기준분류SDI",
    tooltip: "overflow",
    minWidth: 92,
  },
  {
    field: "detailSdi",
    headerName: "세분류SDI",
    tooltip: "overflow",
    minWidth: 86,
  },
  { field: "judgment", headerName: "판정", tooltip: "overflow", minWidth: 64 },
  {
    field: "baseCategory",
    headerName: "기준분류",
    tooltip: "overflow",
    minWidth: 136,
  },
  {
    field: "detailCategory",
    headerName: "세분류",
    tooltip: "overflow",
    minWidth: 126,
  },
];

const chemistryTestListGridColumns = [
  {
    field: "code",
    headerName: "검사코드",
    tooltip: "overflow",
    minWidth: 76,
  },
  {
    field: "name",
    headerName: "검사항목명",
    tooltip: "overflow",
    minWidth: 304,
  },
];

const urineParticipationGridColumns = [
  { field: "code", headerName: "기관코드", tooltip: "overflow", minWidth: 88 },
  { field: "name", headerName: "기관명", tooltip: "overflow", minWidth: 128 },
  { field: "testName", headerName: "검사명", tooltip: "overflow", minWidth: 118 },
  {
    field: "specimenName",
    headerName: "검체명",
    tooltip: "overflow",
    minWidth: 72,
  },
  { field: "result", headerName: "결과", tooltip: "overflow", minWidth: 64 },
  { field: "answer", headerName: "정답", tooltip: "overflow", minWidth: 76 },
  { field: "maker", headerName: "제조사", tooltip: "overflow", minWidth: 126 },
  {
    field: "standardSdi",
    headerName: "기준SDI",
    tooltip: "overflow",
    minWidth: 92,
  },
  {
    field: "detailSdi",
    headerName: "세부SDI",
    tooltip: "overflow",
    minWidth: 86,
  },
];

const hepatitisParticipationGridColumns = [
  {
    field: "institutionCode",
    headerName: "기관코드",
    tooltip: "overflow",
    minWidth: 92,
  },
  {
    field: "institutionName",
    headerName: "기관명",
    tooltip: "overflow",
    minWidth: 104,
    cellRenderer: ({ row }) => row.institutionName || "-",
  },
  {
    field: "testName",
    headerName: "검사명",
    tooltip: "overflow",
    minWidth: 220,
  },
  {
    field: "specimenName",
    headerName: "검체명",
    tooltip: "overflow",
    minWidth: 92,
  },
  { field: "result", headerName: "결과", tooltip: "overflow", minWidth: 76 },
  { field: "answer", headerName: "정답", tooltip: "overflow", minWidth: 76 },
  { field: "judgment", headerName: "판정", tooltip: "overflow", minWidth: 96 },
  {
    field: "baseCategory",
    headerName: "기준분류",
    tooltip: "overflow",
    minWidth: 148,
  },
  {
    field: "detailCategory",
    headerName: "세분류",
    tooltip: "overflow",
    minWidth: 176,
  },
];

const hepatitisAggregateGridColumns = [
  {
    field: "specimenName",
    headerName: "검체명",
    tooltip: "overflow",
    minWidth: 92,
  },
  {
    field: "testCode",
    headerName: "검사코드",
    tooltip: "overflow",
    minWidth: 88,
  },
  {
    field: "testName",
    headerName: "검사명",
    tooltip: "overflow",
    minWidth: 220,
  },
  {
    field: "baseCategory",
    headerName: "기준분류",
    tooltip: "overflow",
    minWidth: 148,
  },
  {
    field: "detailCategory",
    headerName: "세분류",
    tooltip: "overflow",
    minWidth: 176,
  },
  { field: "result", headerName: "검사결과", tooltip: "overflow", minWidth: 96 },
  {
    field: "count",
    headerName: "건수",
    tooltip: "overflow",
    minWidth: 76,
    cellRenderer: ({ row }) => Number(row.count ?? 0).toLocaleString(),
  },
  {
    field: "acceptability",
    headerName: "판정",
    tooltip: "overflow",
    minWidth: 116,
  },
];

const urineNonconformanceInstitutionColumns = [
  { key: "no", label: "No" },
  { key: "code", label: "기관코드" },
  { key: "name", label: "기관명" },
  { key: "result", label: "결과" },
  { key: "answer", label: "정답" },
  { key: "standardSdi", label: "기준SDI" },
  { key: "detailSdi", label: "세부SDI" },
  { key: "instrument", label: "기준분류" },
  { key: "maker", label: "세분류" },
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
  maker: "검사에 사용한 세분류 데이터 입니다.",
  instrument: "검사에 사용한 기준분류 데이터 입니다.",
};

// 행 순번(No)을 데이터에 주입 ? 그리드 showRowNumbers는 헤더 컬럼을 만들지 않아 값과 겹치므로 명시 컬럼 사용
const withRowNo = (rows) =>
  rows.map((row, index) => ({ ...row, __no: index + 1 }));

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
      ? {
          width: STAT_COL_WIDTH[column.key],
          minWidth: STAT_COL_WIDTH[column.key],
        }
      : {}),
    ...(isNumber ? { comparator: (a, b) => numCmp(a, b) } : {}),
  };
});

const qualitativeBaseColumns = [
  {
    key: "프로그램명",
    label: "프로그램명",
    className: "col-program",
    type: "text",
    width: 74,
  },
  {
    key: "상위검사명",
    label: "상위검사명",
    className: "col-parent-test",
    type: "text",
    width: 80,
  },
  {
    key: "검사명",
    label: "검사명",
    className: "col-test",
    type: "text",
    width: 76,
  },
  {
    key: "검체명",
    label: "검체명",
    className: "col-specimen",
    type: "text",
    width: 78,
  },
  {
    key: "기준분류",
    label: "기준분류",
    className: "col-category",
    type: "text",
    width: 132,
  },
  {
    key: "보고된 결과",
    label: "보고된 결과",
    className: "col-result number-cell",
    type: "text",
    width: 72,
  },
];

const qualitativeSelectionColumns = [
  {
    key: "결과선택기관수_전체",
    label: "전체",
    className: "col-count number-cell",
    type: "number",
    width: 28,
  },
  {
    key: "결과선택기관수_선택",
    label: "선택",
    className: "col-count number-cell",
    type: "number",
    width: 28,
  },
  {
    key: "결과선택기관수_비율",
    label: "비율",
    className: "col-rate number-cell",
    type: "number",
    width: 31,
  },
];

const qualitativeOperatorColumns = [
  {
    key: "운영자 정답(INTENDED)",
    label: "운영자 정답",
    className: "col-answer qualitative-operator-cell",
    type: "text",
    cellType: "answer",
    width: 158,
  },
  {
    key: "운영자 Remark",
    label: "운영자 Remark",
    className: "col-remark qualitative-operator-cell",
    type: "text",
    cellType: "remark",
    width: 86,
  },
  {
    key: "운영자 판정",
    label: "운영자 판정",
    className: "col-judgment qualitative-operator-cell",
    type: "text",
    cellType: "judgment",
    width: 92,
  },
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

const urineResultDistributionAxisLabels = [
  "4.0",
  "4.5",
  "5.0",
  "5.5",
  "6.0",
  "6.5",
];

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

function getCsvField(row, keys, fallbackIndex) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }

  return Object.values(row)[fallbackIndex] ?? "";
}

function mapChemistryStatisticsRows(rows) {
  return rows.map((row, index) => ({
    id: `chemistry-stat-${index + 1}`,
    testCode: getCsvField(row, ["testCode", "검사코드"], 5),
    testItem: getCsvField(row, ["testItem", "하위검사명"], 6),
    specimenName: getCsvField(row, ["specimenName", "검체명"], 4),
    baseCategory: getCsvField(row, ["baseCategory", "기준분류명"], 7),
    detailCategory: getCsvField(row, ["detailCategory", "세분류명"], 8),
    n: getCsvField(row, ["n", "기관수"], 9),
    mean: getCsvField(row, ["mean", "평균_out"], 13),
    median: getCsvField(row, ["median", "중간값"], 10),
    sd: getCsvField(row, ["sd", "표준편차_out"], 14),
    cv: getCsvField(row, ["cv", "변동계수"], 15),
    min: getCsvField(row, ["min", "최소값"], 11),
    max: getCsvField(row, ["max", "최대값"], 12),
    q1: getCsvField(row, ["q1", "결과25"], 17),
    q3: getCsvField(row, ["q3", "결과75"], 18),
  }));
}

const chemistryDataFileName = "chemi_2025_04/2025_04_120_일반화학.csv";
const chemistryStatisticsDataFileName = "chemi_2025_04/2025_04_common.csv";
const chemistryTrendDataFiles = [
  {
    key: "2025-01",
    label: "2025-01회차",
    fileName: "chemi_2025_04/2025_01_120_일반화학.csv",
  },
  {
    key: "2025-02",
    label: "2025-02회차",
    fileName: "chemi_2025_04/2025_02_120_일반화학.csv",
  },
  {
    key: "2025-03",
    label: "2025-03회차",
    fileName: "chemi_2025_04/2025_03_120_일반화학.csv",
  },
  {
    key: "2025-04",
    label: "2025-04회차",
    fileName: "chemi_2025_04/2025_04_120_일반화학.csv",
  },
];
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

function toChemistryParticipationRow(row) {
  return {
    id: [
      row.testcd,
      row.gmatrnm,
      row.instcd,
      row.stndchassicd || row.stndchassinm,
      row.detlchassicd || row.detlchassinm,
      row.rslt,
    ].join("-"),
    code: row.instcd,
    name: row.cmpynm,
    testName: row.testhngnm || row.testcd,
    specimenName: row.gmatrnm,
    result: row.rslt,
    standardSdi: row.sdi_l1,
    detailSdi: row.sdi_l2,
    judgment: getChemistryJudgment(row),
    baseCategory: row.stndchassinm || row.stndchassicd || "미분류",
    detailCategory: row.detlchassinm || row.detlchassicd || "미분류",
  };
}

function toUrineParticipationRow(row, index = 0) {
  const rawTestName = row["검사명"] ?? row.testName ?? "";

  return {
    id: [
      row["검사명"] ?? row.testName,
      row["검체명"] ?? row.specimen,
      row["기관코드"] ?? row.code,
      row.rslt ?? row.result,
      index,
    ].join("-"),
    code: row["기관코드"] ?? row.code ?? "",
    name: row["기관명"] ?? row.name ?? "",
    testName: String(rawTestName).replace(/^-/, ""),
    specimenName: row["검체명"] ?? row.specimen ?? "",
    result: formatUrineCell(row.rslt ?? row.result),
    answer: formatUrineCell(row["정답"] ?? row.answer),
    maker: row["제조사명"] ?? row.maker ?? "",
    standardSdi: row["기준SDI"] ?? row.standardSdi ?? "",
    detailSdi: row["세부SDI"] ?? row.detailSdi ?? "",
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
    const baseName = row.stndchassinm || row.stndchassicd || "미분류";
    const detailName = row.detlchassinm || row.detlchassicd || "미분류";

    if (!institutionCode || !specimenKey || !testCode) continue;

    institutionSet.add(institutionCode);

    if (!specimenMap.has(specimenKey)) {
      specimenMap.set(specimenKey, {
        key: specimenKey,
        color:
          chemistryDetailColors[
            specimenMap.size % chemistryDetailColors.length
          ],
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
        baseCategories: new Map(),
        details: new Map(),
      });
    }

    const specimenBucket = test.specimenBuckets.get(specimenKey);
    specimenBucket.totalInstitutions.add(institutionCode);

    if (!specimenBucket.baseCategories.has(baseName)) {
      specimenBucket.baseCategories.set(baseName, {
        name: baseName,
        values: [],
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        details: new Map(),
      });
    }

    const baseCategory = specimenBucket.baseCategories.get(baseName);
    baseCategory.totalInstitutions.add(institutionCode);
    const resultValue = parseChemistryNumericValue(row.rslt);

    if (resultValue !== null) {
      baseCategory.values.push(resultValue);
    }

    if (!baseCategory.details.has(detailName)) {
      baseCategory.details.set(detailName, {
        name: detailName,
        values: [],
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        unacceptableRowsByInstitution: new Map(),
      });
    }

    const baseDetail = baseCategory.details.get(detailName);
    baseDetail.totalInstitutions.add(institutionCode);
    if (resultValue !== null) {
      baseDetail.values.push(resultValue);
    }

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
      const institutionRow = toChemistryInstitutionRow(row, detailName);

      specimenBucket.unacceptableInstitutions.add(institutionCode);
      baseCategory.unacceptableInstitutions.add(institutionCode);
      baseDetail.unacceptableInstitutions.add(institutionCode);
      if (!baseDetail.unacceptableRowsByInstitution.has(institutionCode)) {
        baseDetail.unacceptableRowsByInstitution.set(
          institutionCode,
          institutionRow,
        );
      }
      detail.unacceptableInstitutions.add(institutionCode);
      if (!detail.unacceptableRowsByInstitution.has(institutionCode)) {
        detail.unacceptableRowsByInstitution.set(
          institutionCode,
          institutionRow,
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
    const specimenBaseCategories = [];
    const specimenDetails = [];

    for (const specimen of specimens) {
      const bucket = test.specimenBuckets.get(specimen.key);
      const participatingCount = getSetSize(bucket?.totalInstitutions);
      const unacceptableCount = getSetSize(bucket?.unacceptableInstitutions);

      values.push(
        participatingCount > 0
          ? (unacceptableCount / participatingCount) * 100
          : 0,
      );
      unacceptableCounts.push(unacceptableCount);
      participatingCounts.push(participatingCount);

      const baseCategories = Array.from(bucket?.baseCategories.values() ?? [])
        .map((baseCategory, index) => {
          const baseTotal = getSetSize(baseCategory.totalInstitutions);
          const details = Array.from(baseCategory.details.values())
            .map((detail, detailIndex) => {
              const detailTotal = getSetSize(detail.totalInstitutions);
              const detailUnacceptable = getSetSize(
                detail.unacceptableInstitutions,
              );

              return {
                name: detail.name,
                values: detail.values,
                count: detailTotal,
                total: detailTotal,
                unacceptableCount: detailUnacceptable,
                rate:
                  detailTotal > 0
                    ? (detailUnacceptable / detailTotal) * 100
                    : 0,
                color:
                  chemistryDetailColors[
                    detailIndex % chemistryDetailColors.length
                  ],
                rows: Array.from(detail.unacceptableRowsByInstitution.values()),
              };
            })
            .filter((detail) => detail.total > 0)
            .sort(
              (a, b) =>
                b.count - a.count || sortChemistryLabels(a.name, b.name),
            );

          return {
            name: baseCategory.name,
            values: baseCategory.values,
            count: baseTotal,
            total: baseTotal,
            unacceptableCount: getSetSize(
              baseCategory.unacceptableInstitutions,
            ),
            color: chemistryDetailColors[index % chemistryDetailColors.length],
            details,
          };
        })
        .filter((baseCategory) => baseCategory.total > 0)
        .sort(
          (a, b) => b.count - a.count || sortChemistryLabels(a.name, b.name),
        );

      const details = Array.from(bucket?.details.values() ?? [])
        .map((detail, index) => {
          const detailTotal = getSetSize(detail.totalInstitutions);
          const detailUnacceptable = getSetSize(
            detail.unacceptableInstitutions,
          );

          return {
            name: detail.name,
            count: detailTotal,
            total: detailTotal,
            unacceptableCount: detailUnacceptable,
            rate:
              detailTotal > 0 ? (detailUnacceptable / detailTotal) * 100 : 0,
            color: chemistryDetailColors[index % chemistryDetailColors.length],
            rows: Array.from(detail.unacceptableRowsByInstitution.values()),
          };
        })
        .filter((detail) => detail.total > 0)
        .sort(
          (a, b) => b.count - a.count || sortChemistryLabels(a.name, b.name),
        );

      specimenBaseCategories.push(baseCategories);
      specimenDetails.push(details);
    }

    return {
      code: test.code,
      name: test.name,
      values,
      unacceptableCounts,
      participatingCounts,
      specimenBaseCategories,
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
        color:
          chemistryDetailColors[
            specimenMap.size % chemistryDetailColors.length
          ],
      });
    }

    if (!testMap.has(testCode)) {
      testMap.set(testCode, {
        code: testCode,
        name: testName,
        specimenBuckets: new Map(),
        totalInstitutions: new Set(),
        unacceptableInstitutions: new Set(),
        participatingRows: [],
        sdiPoints: [],
      });
    }

    const test = testMap.get(testCode);
    test.totalInstitutions.add(institutionCode);
    test.participatingRows.push(toChemistryParticipationRow(row));

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
          toChemistryInstitutionRow(
            row,
            row.detlchassinm || row.detlchassicd || "미분류",
          ),
        );
      }
    }

    const standardSdi = parseChemistryNumericValue(row.sdi_l1);
    const detailSdi = parseChemistryNumericValue(row.sdi_l2);

    if (standardSdi !== null && detailSdi !== null) {
      test.sdiPoints.push({
        x: standardSdi,
        y: detailSdi,
        standardCategory:
          row.stndchassinm || row.stndchassicd || "Unclassified",
        detailCategory: row.detlchassinm || row.detlchassicd || "Unclassified",
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
      participatingRows: test.participatingRows,
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
          rows: Array.from(
            bucket?.unacceptableRowsByInstitution.values() ?? [],
          ),
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

function getBaseCategoryData(selection, data = unacceptableRateData) {
  const selectedTest = data.tests[selection.testIndex];
  const baseCategoryRows =
    selectedTest?.specimenBaseCategories?.[selection.specimenIndex];

  return Array.isArray(baseCategoryRows) ? baseCategoryRows : [];
}

function groupSmallDetailMakers(makers, thresholdPercent = 1) {
  const total = makers.reduce((sum, maker) => sum + maker.count, 0);

  if (total <= 0) return makers;

  const visibleMakers = [];
  const otherMakers = [];

  makers.forEach((maker) => {
    const share = (maker.count / total) * 100;

    if (maker.name === "기타" || share <= thresholdPercent) {
      otherMakers.push(maker);
    } else {
      visibleMakers.push(maker);
    }
  });

  if (otherMakers.length === 0) return makers;

  const otherCount = otherMakers.reduce((sum, maker) => sum + maker.count, 0);
  const otherUnacceptableCount = otherMakers.reduce(
    (sum, maker) => sum + (maker.unacceptableCount ?? maker.count),
    0,
  );
  const otherRows = otherMakers.flatMap((maker) => maker.rows ?? []);

  return [
    ...visibleMakers,
    {
      name: "기타",
      count: otherCount,
      total: otherCount,
      unacceptableCount: otherUnacceptableCount,
      rate: otherCount > 0 ? (otherUnacceptableCount / otherCount) * 100 : 0,
      color: "#4b5563",
      rows: otherRows.length > 0 ? otherRows : undefined,
    },
  ];
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (sortedValues.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  return (
    sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
  );
}

function getBoxplotStats(values) {
  const sortedValues = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) {
    return {
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      whiskerMin: 0,
      whiskerMax: 0,
      count: 0,
    };
  }

  const q1 = percentile(sortedValues, 0.25);
  const median = percentile(sortedValues, 0.5);
  const q3 = percentile(sortedValues, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - iqr * 1.5;
  const upperFence = q3 + iqr * 1.5;
  const inFenceValues = sortedValues.filter(
    (value) => value >= lowerFence && value <= upperFence,
  );

  return {
    min: sortedValues[0],
    q1,
    median,
    q3,
    max: sortedValues[sortedValues.length - 1],
    whiskerMin: inFenceValues[0] ?? sortedValues[0],
    whiskerMax: inFenceValues.at(-1) ?? sortedValues.at(-1),
    count: sortedValues.length,
  };
}

function getBoxplotOutliers(values = [], stats) {
  if (!stats || stats.count === 0) return [];

  return values
    .filter(
      (value) =>
        Number.isFinite(value) &&
        (value < stats.whiskerMin || value > stats.whiskerMax),
    )
    .map((value) => ({ value }))
    .sort((a, b) => a.value - b.value);
}

function buildDetailUnacceptableBoxplotData(
  selection,
  selectedBaseCategoryName,
  data = unacceptableRateData,
) {
  if (!selectedBaseCategoryName) return [];

  const selectedTest = data.tests[selection.testIndex];
  const baseCategory = selectedTest?.specimenBaseCategories?.[
    selection.specimenIndex
  ]?.find((category) => category.name === selectedBaseCategoryName);

  if (!selectedTest || !baseCategory) return [];

  const getUnacceptableValues = (rows = []) =>
    rows
      .map((row) => parseChemistryNumericValue(row.result))
      .filter((value) => value !== null);

  const buildItem = ({
    label,
    color,
    values = [],
    unacceptableValues = [],
    unacceptableCount,
    total,
  }) => {
    const stats = getBoxplotStats(values);
    return {
      label,
      color,
      unacceptableValues,
      unacceptableCount,
      total,
      unacceptableRate: total > 0 ? (unacceptableCount / total) * 100 : 0,
      stats,
      outliers: getBoxplotOutliers(values, stats),
    };
  };

  const details = baseCategory.details
    .filter((detail) => (detail.total ?? detail.count ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.total ?? b.count ?? 0) - (a.total ?? a.count ?? 0) ||
        sortChemistryLabels(a.name, b.name),
    )
    .slice(0, 5);
  const allUnacceptableValues = getUnacceptableValues(
    baseCategory.details.flatMap((detail) => detail.rows ?? []),
  );

  return [
    buildItem({
      label: "전체",
      color: "#111827",
      values: baseCategory.values ?? [],
      unacceptableValues: allUnacceptableValues,
      unacceptableCount: baseCategory.unacceptableCount ?? 0,
      total: baseCategory.total ?? baseCategory.count ?? 0,
    }),
    ...details.map((detail) =>
      buildItem({
        label: detail.name,
        color: detail.color,
        values: detail.values ?? [],
        unacceptableValues: getUnacceptableValues(detail.rows),
        unacceptableCount: detail.unacceptableCount ?? 0,
        total: detail.total ?? detail.count ?? 0,
      }),
    ),
  ];
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

function getClickedXAxisLabelIndex(chart, event) {
  const xScale = chart?.scales?.x;

  if (!xScale || !Number.isFinite(event?.x) || !Number.isFinite(event?.y)) {
    return null;
  }

  const chartAreaBottom = chart.chartArea?.bottom ?? xScale.top;
  const canvasHeight =
    chart.height ?? chart.canvas?.clientHeight ?? xScale.bottom;
  const labelBandTop = chartAreaBottom - 8;
  const labelBandBottom = Math.max(xScale.bottom, canvasHeight) + 8;
  const isLabelBand =
    event.y >= labelBandTop &&
    event.y <= labelBandBottom &&
    event.x >= xScale.left - 12 &&
    event.x <= xScale.right + 12;

  if (!isLabelBand) return null;

  const index = Math.round(xScale.getValueForPixel(event.x));
  const labelCount = xScale.ticks?.length ?? 0;

  if (index < 0 || index >= labelCount) return null;

  const center = xScale.getPixelForValue(index);
  const nextCenter =
    index < labelCount - 1
      ? xScale.getPixelForValue(index + 1)
      : xScale.getPixelForValue(index - 1);
  const halfStep = Number.isFinite(nextCenter)
    ? Math.abs(nextCenter - center) / 2
    : 24;

  return Math.abs(event.x - center) <= halfStep ? index : null;
}

function getNativeChartPoint(chart, event) {
  const rect = chart?.canvas?.getBoundingClientRect();

  if (!rect) return null;

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function UnacceptableRateChart({
  data = unacceptableRateData,
  onSelect,
  selectedTestIndex,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const selectedTestIndexRef = useRef(selectedTestIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const baseChartWidth = Math.max(860, data.tests.length * 36);
  const baseChartHeight = 374;
  const chartWidth = Math.max(
    containerWidth,
    Math.round(baseChartWidth * zoomLevel),
  );
  const chartHeight = Math.round(baseChartHeight * zoomLevel);
  const chartViewportHeight = chartHeight + 31;
  const zoomPercent = Math.round(zoomLevel * 100);
  const yTickStep = zoomLevel >= 1.75 ? 0.25 : zoomLevel >= 1.25 ? 0.5 : 1;
  const maxRate = Math.max(
    8,
    ...data.tests.flatMap((test) =>
      test.values.map((value) => Number(value) || 0),
    ),
  );

  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));

  const changeZoom = (nextZoom) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  const selectTestIndex = useCallback(
    (testIndex) => {
      onSelect({
        testIndex,
        specimenIndex: 0,
      });
    },
    [onSelect],
  );

  const handleChartLabelClick = (event) => {
    const chart = chartRef.current;
    const point = getNativeChartPoint(chart, event);
    const index = getClickedXAxisLabelIndex(chart, point);

    if (index !== null) selectTestIndex(index);
  };

  const handleChartLabelHover = (event) => {
    const chart = chartRef.current;
    const point = getNativeChartPoint(chart, event);
    const index = getClickedXAxisLabelIndex(chart, point);

    if (chart?.canvas) {
      chart.canvas.style.cursor = index === null ? "default" : "pointer";
    }
  };

  useEffect(() => {
    selectedTestIndexRef.current = selectedTestIndex;
    chartRef.current?.update("none");
  }, [selectedTestIndex]);

  useEffect(() => {
    const scrollNode = scrollRef.current;

    if (!scrollNode) return undefined;

    setContainerWidth(Math.floor(scrollNode.clientWidth));

    if (typeof ResizeObserver === "undefined") return undefined;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.floor(entry.contentRect.width));
    });

    resizeObserver.observe(scrollNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
                const suffix =
                  Number.isFinite(count) && Number.isFinite(total)
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
              color(context) {
                return context.index === selectedTestIndexRef.current
                  ? "#0869f4"
                  : "#1f2d4d";
              },
              font(context) {
                return {
                  size: 10,
                  weight:
                    context.index === selectedTestIndexRef.current ? 800 : 600,
                };
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
              stepSize: yTickStep,
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
  }, [data, maxRate]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [chartHeight, chartWidth]);

  useEffect(() => {
    const chart = chartRef.current;
    const yScaleOptions = chart?.options?.scales?.y;

    if (!chart || !yScaleOptions?.ticks) return;

    yScaleOptions.ticks.stepSize = yTickStep;
    chart.update("none");
  }, [yTickStep]);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    if (!scrollNode) return undefined;

    const handleWheel = (event) => {
      if (!event.ctrlKey) {
        const isVerticalScroll =
          Math.abs(event.deltaY) > Math.abs(event.deltaX) && !event.shiftKey;

        if (isVerticalScroll) {
          event.preventDefault();
          window.scrollBy({
            top: event.deltaY,
            left: 0,
            behavior: "auto",
          });
        }

        return;
      }

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
            value={zoomPercent}
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
            {zoomPercent}%
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="chart-scroll"
        style={{ height: `${chartViewportHeight}px` }}
        aria-label="검사항목별 Unacceptable Rate 그래프 스크롤 영역"
      >
        <div
          className="chart-canvas"
          style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }}
          onClick={handleChartLabelClick}
          onMouseMove={handleChartLabelHover}
          onMouseLeave={() => {
            if (chartRef.current?.canvas) {
              chartRef.current.canvas.style.cursor = "default";
            }
          }}
        >
          <canvas
            ref={canvasRef}
            aria-label="검사항목별 Unacceptable Rate 막대그래프"
          />
        </div>
      </div>
    </div>
  );
}

function MakerDoughnutChart({
  makers,
  ariaLabel,
  onSegmentClick,
  selectedName,
}) {
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
            borderColor: makers.map((maker) =>
              maker.name === selectedName ? "#111827" : "#fff",
            ),
            borderWidth: makers.map((maker) =>
              maker.name === selectedName ? 3 : 1,
            ),
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
        onClick(_event, elements) {
          if (!onSegmentClick || elements.length === 0) return;

          const selectedMaker = makers[elements[0].index];
          if (selectedMaker) onSegmentClick(selectedMaker);
        },
        onHover(event, elements) {
          if (event.native?.target) {
            event.native.target.style.cursor =
              onSegmentClick && elements.length > 0 ? "pointer" : "default";
          }
        },
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
  }, [makers, onSegmentClick, selectedName]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={
        ariaLabel ?? "세분류별 기관 비율 및 Unacceptable 기관 수 도넛 차트"
      }
    />
  );
}

function hexToRgba(hex, alpha) {
  const normalizedHex = String(hex).replace("#", "");

  if (normalizedHex.length !== 6) return `rgba(8, 105, 244, ${alpha})`;

  const red = parseInt(normalizedHex.slice(0, 2), 16);
  const green = parseInt(normalizedHex.slice(2, 4), 16);
  const blue = parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatBoxplotValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "-";
  return Math.abs(numericValue) >= 100
    ? numericValue.toFixed(1)
    : numericValue.toFixed(2);
}

function DetailUnacceptableBoxplot({ boxplotData, selectedBaseCategoryName }) {
  const canvasRef = useRef(null);
  const stats = useMemo(
    () => boxplotData.filter((item) => item.stats.count > 0),
    [boxplotData],
  );
  const chartWidth = Math.max(560, stats.length * 74);
  const allValues = stats.flatMap((item) => [
    item.stats.whiskerMin,
    item.stats.q1,
    item.stats.median,
    item.stats.q3,
    item.stats.whiskerMax,
  ]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const yPadding =
    valueRange === 0
      ? Math.max(Math.abs(maxValue) * 0.05, 1)
      : valueRange * 0.08;
  const yMin = minValue - yPadding;
  const yMax = maxValue + yPadding;

  useEffect(() => {
    if (!canvasRef.current || stats.length === 0) return undefined;

    const boxplotPlugin = {
      id: "detailUnacceptableBoxplot",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;
        const categoryWidth =
          stats.length > 1
            ? Math.abs(xScale.getPixelForValue(1) - xScale.getPixelForValue(0))
            : chartArea.width / 2;
        const boxWidth = Math.min(44, categoryWidth * 0.42);

        ctx.save();
        ctx.lineWidth = 1.5;

        stats.forEach((item, index) => {
          const x = xScale.getPixelForValue(index);
          const { q1, median, q3, whiskerMin, whiskerMax } = item.stats;
          const minY = yScale.getPixelForValue(whiskerMin);
          const q1Y = yScale.getPixelForValue(q1);
          const medianY = yScale.getPixelForValue(median);
          const q3Y = yScale.getPixelForValue(q3);
          const maxY = yScale.getPixelForValue(whiskerMax);
          const color = index === 0 ? "#147782" : "#ff704d";
          const fillColor =
            index === 0
              ? "rgba(20, 119, 130, 0.16)"
              : "rgba(255, 112, 77, 0.14)";
          const left = x - boxWidth / 2;
          const top = Math.min(q1Y, q3Y);
          const height = Math.max(2, Math.abs(q3Y - q1Y));

          ctx.strokeStyle = "#4b5563";
          ctx.fillStyle = fillColor;

          ctx.beginPath();
          ctx.moveTo(x, maxY);
          ctx.lineTo(x, minY);
          ctx.moveTo(x - boxWidth * 0.32, maxY);
          ctx.lineTo(x + boxWidth * 0.32, maxY);
          ctx.moveTo(x - boxWidth * 0.32, minY);
          ctx.lineTo(x + boxWidth * 0.32, minY);
          ctx.stroke();

          ctx.strokeStyle = color;
          ctx.fillRect(left, top, boxWidth, height);
          ctx.strokeRect(left, top, boxWidth, height);

          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(left, medianY);
          ctx.lineTo(left + boxWidth, medianY);
          ctx.stroke();
          ctx.lineWidth = 1.5;

          (item.unacceptableValues ?? []).forEach((value, valueIndex) => {
            const pointY = yScale.getPixelForValue(value);
            if (pointY < chartArea.top || pointY > chartArea.bottom) return;

            const jitter = ((valueIndex % 7) - 3) * 3.2;
            ctx.fillStyle = "rgba(244, 114, 182, 0.34)";
            ctx.strokeStyle = "rgba(244, 114, 182, 0.72)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + jitter, pointY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        });

        ctx.restore();
      },
    };

    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: stats.map((item) => item.label),
        datasets: [
          {
            label: "Median",
            data: stats.map((item) => item.stats.median),
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: "rgba(0, 0, 0, 0)",
            hoverBackgroundColor: "rgba(0, 0, 0, 0)",
            borderWidth: 0,
          },
        ],
      },
      plugins: [boxplotPlugin],
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
              title(items) {
                return stats[items[0].dataIndex]?.label ?? "";
              },
              label(item) {
                const target = stats[item.dataIndex];
                if (!target) return "";

                return [
                  "Median " + formatBoxplotValue(target.stats.median),
                  "IQR(25~75%) " +
                    formatBoxplotValue(target.stats.q1) +
                    " ~ " +
                    formatBoxplotValue(target.stats.q3),
                  "Whisker " +
                    formatBoxplotValue(target.stats.whiskerMin) +
                    " ~ " +
                    formatBoxplotValue(target.stats.whiskerMax),
                  "Unacceptable rate " +
                    formatPercent(target.unacceptableRate ?? 0),
                  "Unacceptable 결과값 " +
                    (target.unacceptableValues?.length ?? 0).toLocaleString() +
                    "개",
                  "기관수 " + target.stats.count.toLocaleString() + "개",
                ];
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
                size: 11,
                weight: "700",
              },
              maxRotation: 0,
              autoSkip: false,
              callback(value) {
                const label = String(stats[value]?.label ?? value);
                return label.length > 12 ? `${label.slice(0, 11)}...` : label;
              },
            },
          },
          y: {
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: "결과값",
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
              callback(value) {
                return formatBoxplotValue(value);
              },
            },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [stats, yMin, yMax]);

  if (stats.length === 0) {
    return (
      <div className="detail-boxplot-empty">
        선택한 기준분류와 검체에 맞는 결과값이 없습니다.
      </div>
    );
  }

  return (
    <div className="detail-boxplot">
      <div className="detail-boxplot-head">
        <div>
          <h5>전체 및 세분류별 Boxplot</h5>
          <p>
            {selectedBaseCategoryName} 기준분류 안의 전체 결과와 기관수 Top5
            세분류 결과값 분포입니다.
          </p>
        </div>
        <div className="detail-boxplot-legend" aria-label="Boxplot 범례">
          <span>
            <i className="boxplot-legend-box" aria-hidden="true" />
            박스=전체 결과 분포(IQR 25~75%, 수염 1.5 IQR)
          </span>
          <span>
            <i className="boxplot-legend-point" aria-hidden="true" />
            핑크 점=Unacceptable 개별 결과값
          </span>
        </div>
      </div>
      <div className="detail-boxplot-scroll">
        <div className="detail-boxplot-canvas" style={{ width: chartWidth }}>
          <canvas
            ref={canvasRef}
            aria-label="전체 및 세분류별 결과값 Boxplot"
          />
        </div>
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
      <div className="trend-canvas">
        <canvas
          ref={canvasRef}
          aria-label="선택한 검사 검체의 회차별 Unacceptable 기관 수 롤리팝 차트"
        />
      </div>
    </div>
  );
}

function SelectedSpecimenTestDetail({
  selection,
  data = unacceptableRateData,
  statisticsRows = [],
  collapseVersion = 0,
}) {
  const [selectedBaseCategoryName, setSelectedBaseCategoryName] =
    useState(null);
  const selectedTest = data.tests[selection.testIndex] ?? data.tests[0];
  const selectedSpecimen =
    data.specimens[selection.specimenIndex] ?? data.specimens[0];
  const baseCategories = getBaseCategoryData(selection, data);
  const selectedBaseCategory =
    baseCategories.find(
      (baseCategory) => baseCategory.name === selectedBaseCategoryName,
    ) ?? null;
  const rawMakers = selectedBaseCategory?.details ?? [];
  const makers = useMemo(() => groupSmallDetailMakers(rawMakers), [rawMakers]);
  const baseTotal = baseCategories.reduce(
    (sum, baseCategory) => sum + baseCategory.count,
    0,
  );
  const total = selectedBaseCategory?.count ?? 0;
  const selectedInstitutionRows = selectedBaseCategory
    ? getInstitutionRowsForMakers(makers)
    : [];
  const detailBoxplotData = useMemo(
    () =>
      buildDetailUnacceptableBoxplotData(
        selection,
        selectedBaseCategoryName,
        data,
        statisticsRows,
      ),
    [
      data,
      selectedBaseCategoryName,
      selection.specimenIndex,
      selection.testIndex,
      statisticsRows,
    ],
  );

  useEffect(() => {
    setSelectedBaseCategoryName(null);
  }, [selection.testIndex, selection.specimenIndex]);

  useEffect(() => {
    setSelectedBaseCategoryName(null);
  }, [collapseVersion]);

  const selectBaseCategory = (baseCategory) => {
    setSelectedBaseCategoryName(baseCategory.name);
  };

  const collapseDetail = () => {
    setSelectedBaseCategoryName(null);
  };

  if (!selectedTest || !selectedSpecimen) return null;

  return (
    <section className="chemistry-specimen-detail">
      <div className="chemistry-specimen-detail-head">
        <h4>기준분류별 참가현황 ({selectedSpecimen.key} 기준)</h4>
        {selectedBaseCategory && (
          <button
            type="button"
            className="chemistry-collapse-button"
            onClick={collapseDetail}
          >
            접기
          </button>
        )}
      </div>
      <p className="chemistry-count-note">
        기준분류 기관수는 선택 검체의 기준분류별 참여기관 수이며, 세분류 도넛은
        선택한 기준분류 안에서 세분류별 비율을 다시 계산합니다.
      </p>
      <div className="donut-layout chemistry-detail-donut-layout">
        <div className="chemistry-base-selection-row">
          <div className="chemistry-donut-stack">
            <div className="chemistry-donut-block">
              <div className="donut-box">
                <MakerDoughnutChart
                  makers={baseCategories}
                  ariaLabel="기준분류별 참가현황 도넛 차트"
                  onSegmentClick={selectBaseCategory}
                  selectedName={selectedBaseCategoryName}
                />
                <div className="donut-center" aria-hidden="true">
                  <strong>총 {baseTotal.toLocaleString()}개</strong>
                  <span>기관</span>
                </div>
              </div>
            </div>
            {selectedBaseCategory && (
              <div className="chemistry-donut-block">
                <h5>세분류별 기관수</h5>
                <div className="donut-box">
                  <MakerDoughnutChart makers={makers} />
                  <div className="donut-center" aria-hidden="true">
                    <strong>총 {total.toLocaleString()}개</strong>
                    <span>기관</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {selectedBaseCategory && (
            <div
              className="institution-list chemistry-inline-institution-list"
              id={`institution-list-grid-${selection.specimenIndex}`}
            >
              <div className="institution-list-head">
                <h4>Unacceptable 기관 목록</h4>
                <div className="institution-list-actions">
                  <span>
                    전체 {selectedInstitutionRows.length.toLocaleString()}개
                    기관
                  </span>
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
        </div>
      </div>

      {selectedBaseCategory && (
        <DetailUnacceptableBoxplot
          boxplotData={detailBoxplotData}
          selectedBaseCategoryName={selectedBaseCategory.name}
        />
      )}
    </section>
  );
}

function SelectedTestDetail({
  selection,
  data = unacceptableRateData,
  statisticsRows = [],
}) {
  const [collapseVersion, setCollapseVersion] = useState(0);
  const selectedTest = data.tests[selection.testIndex] ?? data.tests[0];
  const selectedSpecimens = data.specimens
    .map((specimen, specimenIndex) => ({
      ...specimen,
      specimenIndex,
      participatingCount:
        selectedTest?.participatingCounts?.[specimenIndex] ?? 0,
    }))
    .filter((specimen) => specimen.participatingCount > 0);

  if (!selectedTest) return null;

  return (
    <>
      <div className="chemistry-detail-actions">
        <button
          type="button"
          className="chemistry-collapse-button"
          onClick={() => setCollapseVersion((version) => version + 1)}
        >
          전체접기
        </button>
      </div>

      <div className="chemistry-specimen-detail-list">
        {selectedSpecimens.map((specimen) => (
          <SelectedSpecimenTestDetail
            key={specimen.key}
            data={data}
            selection={{
              testIndex: selection.testIndex,
              specimenIndex: specimen.specimenIndex,
            }}
            statisticsRows={statisticsRows}
            collapseVersion={collapseVersion}
          />
        ))}
      </div>
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

function ParticipationInstitutionDialog({
  test,
  rows: rowsProp,
  title,
  excelFileName,
  onClose,
}) {
  const rows = rowsProp ?? test?.participatingRows ?? [];
  const uniqueInstitutionCount = new Set(rows.map((row) => row.code)).size;

  if (!test && !rowsProp) return null;

  return (
    <AckDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title ?? `${test.code} / ${test.name} 참여기관 리스트`}
      maxWidth="sm:max-w-[96vw]"
      footer={
        <AckButton variant="primary" onClick={onClose}>
          닫기
        </AckButton>
      }
    >
      <div className="participation-dialog">
        <div className="participation-dialog-summary">
          <span>참여기관 {uniqueInstitutionCount.toLocaleString()}개</span>
          <span>결과 {rows.length.toLocaleString()}건</span>
        </div>
        <AckDataGrid
          className="institution-data-grid participation-data-grid"
          data={rows}
          columns={participationInstitutionGridColumns}
          getRowId={(row, index) => `${row.id ?? row.code}-${index}`}
          paginationMode="pagination"
          pageSize={20}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          enableExcelExport
          excelFileName={excelFileName ?? `${test.code}_참여기관리스트.xlsx`}
          aria-label="참여기관 전체 리스트"
        />
      </div>
    </AckDialog>
  );
}

function ChemistryTestListDialog({
  rows,
  title = "검사항목 리스트",
  ariaLabel = "검사항목 리스트",
  onClose,
}) {
  return (
    <AckDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      maxWidth="sm:max-w-[760px]"
      footer={
        <AckButton variant="primary" onClick={onClose}>
          닫기
        </AckButton>
      }
    >
      <div className="test-list-dialog">
        <div className="participation-dialog-summary">
          <span>검사항목 {rows.length.toLocaleString()}개</span>
        </div>
        <AckDataGrid
          className="institution-data-grid test-list-data-grid"
          data={rows}
          columns={chemistryTestListGridColumns}
          getRowId={(row) => row.id}
          paginationMode="pagination"
          pageSize={20}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          aria-label={ariaLabel}
        />
      </div>
    </AckDialog>
  );
}

function UrineParticipationDialog({
  rows,
  title = "소변검사 참여기관 리스트",
  excelFileName = "소변검사_참여기관리스트.xlsx",
  onClose,
}) {
  const uniqueInstitutionCount = new Set(rows.map((row) => row.code)).size;

  return (
    <AckDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      maxWidth="sm:max-w-[96vw]"
      footer={
        <AckButton variant="primary" onClick={onClose}>
          닫기
        </AckButton>
      }
    >
      <div className="participation-dialog">
        <div className="participation-dialog-summary">
          <span>기관 {uniqueInstitutionCount.toLocaleString()}개</span>
          <span>결과 {rows.length.toLocaleString()}건</span>
        </div>
        <AckDataGrid
          className="institution-data-grid participation-data-grid"
          data={rows}
          columns={urineParticipationGridColumns}
          getRowId={(row, index) => `${row.id}-${index}`}
          paginationMode="pagination"
          pageSize={20}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          enableExcelExport
          excelFileName={excelFileName}
          aria-label={title}
        />
      </div>
    </AckDialog>
  );
}

function NonconformanceSdiChart({ selectedTest, specimens }) {
  const l1CanvasRef = useRef(null);
  const l2CanvasRef = useRef(null);
  const points =
    selectedTest?.sdiPoints?.filter((point) => point.isUnacceptable) ?? [];
  const unacceptableInstitutionCount = new Set(
    points.map((point) => point.institutionCode),
  ).size;

  useEffect(() => {
    if (!selectedTest || points.length === 0) return undefined;

    const createSdiChart = (canvas, axisKey, titleText, xAxisTitle) => {
      if (!canvas) return null;

      const sdiValues = points
        .map((point) => (axisKey === "l1" ? point.x : point.y))
        .filter((value) => Number.isFinite(value));
      const minValue = Math.min(...sdiValues);
      const maxValue = Math.max(...sdiValues);
      const padding = Math.max((maxValue - minValue) * 0.12, 1);
      const yMin = Math.floor(Math.min(-6, minValue - padding));
      const yMax = Math.ceil(Math.max(6, maxValue + padding));
      const yStepSize = yMax - yMin > 24 ? 5 : 2;
      const normalRangeBandPlugin = {
        id: `normal-sdi-range-${axisKey}`,
        beforeDatasetsDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          const yScale = scales.y;
          if (!chartArea || !yScale) return;

          const top = yScale.getPixelForValue(3);
          const bottom = yScale.getPixelForValue(-3);
          const bandTop = Math.max(chartArea.top, Math.min(top, bottom));
          const bandBottom = Math.min(chartArea.bottom, Math.max(top, bottom));

          ctx.save();
          ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
          ctx.fillRect(
            chartArea.left,
            bandTop,
            chartArea.right - chartArea.left,
            bandBottom - bandTop,
          );
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = "rgba(22, 163, 74, 0.55)";
          ctx.lineWidth = 1;
          [top, bottom].forEach((lineY) => {
            if (lineY < chartArea.top || lineY > chartArea.bottom) return;
            ctx.beginPath();
            ctx.moveTo(chartArea.left, lineY);
            ctx.lineTo(chartArea.right, lineY);
            ctx.stroke();
          });
          ctx.restore();
        },
      };

      const datasets = specimens
        .map((specimen) => {
          const specimenPoints = points
            .filter((point) => point.specimenKey === specimen.key)
            .map((point, index) => ({
              ...point,
              x:
                axisKey === "l1"
                  ? point.standardCategory
                  : point.detailCategory,
              y: axisKey === "l1" ? point.x : point.y,
              sdiValue: axisKey === "l1" ? point.x : point.y,
              categoryLabel:
                axisKey === "l1"
                  ? point.standardCategory
                  : point.detailCategory,
            }));

          return {
            label: specimen.key,
            data: specimenPoints,
            pointRadius: specimenPoints.map(() => 5),
            pointHoverRadius: specimenPoints.map(() => 7),
            pointBackgroundColor: specimenPoints.map(() =>
              colorWithAlpha(specimen.color, 0.72),
            ),
            pointBorderColor: specimenPoints.map(() => specimen.color),
            pointBorderWidth: specimenPoints.map(() => 1.5),
          };
        })
        .filter((dataset) => dataset.data.length > 0);

      return new Chart(canvas, {
        type: "scatter",
        data: { datasets },
        plugins: [normalRangeBandPlugin],
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
                    xAxisTitle + ": " + (point.categoryLabel || "-"),
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
              type: "category",
              offset: true,
              title: {
                display: true,
                text: xAxisTitle,
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
                autoSkip: false,
                maxRotation: 45,
                minRotation: 0,
                font: {
                  size: 10,
                },
              },
            },
            y: {
              min: yMin,
              max: yMax,
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
                stepSize: yStepSize,
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
      createSdiChart(l1CanvasRef.current, "l1", "기준분류SDI", "기준분류명"),
      createSdiChart(l2CanvasRef.current, "l2", "세분류SDI", "세분류명"),
    ];

    return () => {
      charts.forEach((chart) => chart?.destroy());
    };
  }, [points, selectedTest, specimens]);

  if (!selectedTest || points.length === 0) {
    return (
      <div className="sdi-empty-state">
        선택 검사에 표시할 Unacceptable SDI 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="sdi-chart">
      <p className="sdi-selection">
        선택 검사: {selectedTest.name} · Unacceptable 기관{" "}
        {unacceptableInstitutionCount.toLocaleString()}개 · SDI 데이터{" "}
        {points.length.toLocaleString()}건
      </p>
      <div className="sdi-split-grid">
        <div className="sdi-split-item">
          <h4>기준분류SDI 분포</h4>
          <div className="sdi-canvas chemistry-sdi-scatter-canvas">
            <canvas
              ref={l1CanvasRef}
              aria-label="선택 검사 기준분류SDI 분포도"
            />
          </div>
        </div>
        <div className="sdi-split-item">
          <h4>세분류SDI 분포</h4>
          <div className="sdi-canvas chemistry-sdi-scatter-canvas">
            <canvas ref={l2CanvasRef} aria-label="선택 검사 세분류SDI 분포도" />
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
  const [participationTargetIndex, setParticipationTargetIndex] =
    useState(null);
  const selectedTest =
    nonconformanceData.tests[selectedTestIndex] ?? nonconformanceData.tests[0];
  const participationTargetTest =
    participationTargetIndex !== null
      ? nonconformanceData.tests[participationTargetIndex]
      : null;
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
    setParticipationTargetIndex(null);
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

  const openParticipationDialog = (event, testIndex) => {
    event.stopPropagation();
    setSelectedTestIndex(testIndex);
    setParticipationTargetIndex(testIndex);
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
                    <button
                      type="button"
                      className="unacc-metric-button"
                      onClick={(event) =>
                        openParticipationDialog(event, testIndex)
                      }
                      aria-label={`${test.name} 참여기관 리스트 열기`}
                    >
                      <span>참여기관</span>
                      <strong>
                        {test.participatingCount.toLocaleString()}
                      </strong>
                    </button>
                    <div>
                      <span>1개이상 Unacc판정받은기관</span>
                      <strong className="danger">
                        {test.totalUnacceptableCount || "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="unacc-specimen-grid">
                    {test.specimenSummaries.map((specimen, specimenIndex) => (
                      <div className="unacc-specimen-cell" key={specimen.key}>
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
                            toggleInstitutionList(
                              event,
                              testIndex,
                              specimenIndex,
                            )
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

        {participationTargetTest && (
          <ParticipationInstitutionDialog
            test={participationTargetTest}
            onClose={() => setParticipationTargetIndex(null)}
          />
        )}
      </article>

      <article className="panel sdi-panel">
        <div className="panel-head">
          <div>
            <h3>선택 검사 Unacceptable SDI 분포도</h3>
            <p>
              카드에서 선택한 검사 중 Unacceptable 기관의 기준분류SDI, 세분류SDI
              분포
            </p>
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
      rows.filter((row) => rowMatchesStatisticsScope(row, option.value)).length,
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
        getTrendRateCellStyle(
          value ?? row.periodValues[index],
          period.isCurrent,
        ),
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

function createChemistryTrendAnalysisData(periodRows) {
  const periods = chemistryTrendDataFiles.map((period, index) => ({
    ...period,
    sortValue: index,
    isCurrent: index === chemistryTrendDataFiles.length - 1,
  }));
  const periodMap = new Map(periods.map((period) => [period.key, period]));
  const rowMap = new Map();

  periodRows.forEach(({ periodKey, rows }) => {
    const period = periodMap.get(periodKey);
    if (!period || !Array.isArray(rows)) return;

    rows.forEach((row) => {
      const institutionCode = row.instcd;
      const testCode = row.testcd;
      const testName = row.testhngnm || testCode;

      if (!institutionCode || !testCode) return;

      if (!rowMap.has(testCode)) {
        rowMap.set(testCode, {
          code: testCode,
          testCode,
          testName,
          valuesByPeriod: new Map(),
        });
      }

      const trendRow = rowMap.get(testCode);
      if (!trendRow.valuesByPeriod.has(period.key)) {
        trendRow.valuesByPeriod.set(period.key, {
          periodKey: period.key,
          totalInstitutions: new Set(),
          unacceptableInstitutions: new Set(),
        });
      }

      const periodValue = trendRow.valuesByPeriod.get(period.key);
      periodValue.totalInstitutions.add(institutionCode);

      if (String(getChemistryJudgment(row)).trim().toUpperCase() === "N") {
        periodValue.unacceptableInstitutions.add(institutionCode);
      }
    });
  });

  const rows = Array.from(rowMap.values())
    .sort(
      (left, right) =>
        sortChemistryLabels(left.testName, right.testName) ||
        sortChemistryLabels(left.testCode, right.testCode),
    )
    .map((row) => {
      const periodValues = periods.map((period) => {
        const rawValue = row.valuesByPeriod.get(period.key);
        const participatingCount = getSetSize(rawValue?.totalInstitutions);
        const unacceptableCount = getSetSize(
          rawValue?.unacceptableInstitutions,
        );

        return {
          periodKey: period.key,
          rate:
            participatingCount > 0
              ? (unacceptableCount / participatingCount) * 100
              : null,
          unacceptableCount: participatingCount > 0 ? unacceptableCount : null,
          participatingCount:
            participatingCount > 0 ? participatingCount : null,
        };
      });
      const chartValues = periodValues.map((value, index) => ({
        ...value,
        label: periods[index].label,
      }));
      const availableValues = periodValues.filter(
        (value) => value.rate !== null,
      );
      const latestValue = availableValues.at(-1);
      const previousValue = availableValues.at(-2);
      const trendValue =
        latestValue && previousValue
          ? Number(latestValue.rate) - Number(previousValue.rate)
          : null;

      return {
        code: row.code,
        displayName: row.testName,
        periodValues,
        chartValues,
        trendValue,
      };
    });

  return { periods, rows };
}

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

function TrendAnalysis({ periodRows }) {
  const { periods, rows } = useMemo(
    () => createChemistryTrendAnalysisData(periodRows),
    [periodRows],
  );
  const trendGridColumns = useMemo(
    () => buildTrendGridColumns(periods, "검사항목"),
    [periods],
  );
  const [selectedCode, setSelectedCode] = useState(rows[0]?.code ?? "");
  const chartPanelRef = useRef(null);
  const selectedRow = rows.find((row) => row.code === selectedCode) ?? rows[0];

  useEffect(() => {
    if (!selectedCode && rows[0]?.code) {
      setSelectedCode(rows[0].code);
    }
  }, [selectedCode, rows]);

  const selectTrendRow = (rowCode) => {
    setSelectedCode(rowCode);
    window.requestAnimationFrame(() => {
      chartPanelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };

  if (rows.length === 0) {
    return (
      <section className="panel tab-empty-panel">
        <h2>추이분석</h2>
        <p>표시할 일반화학 Unacceptable Rate 추이 데이터가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="trend-analysis-view">
      <article className="panel trend-analysis-panel">
        <div className="trend-analysis-title">
          <h3>검사항목별 Unacceptable Rate 추이 테이블</h3>
          <span>추세 = 직전 회차 대비 변화</span>
        </div>

        <AckDataGrid
          className="trend-grid"
          data={rows}
          columns={trendGridColumns}
          getRowId={(row) => row.code}
          getRowClass={(row) =>
            row.code === selectedRow?.code ? "is-selected" : undefined
          }
          onRowClick={(row) => selectTrendRow(row.code)}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          aria-label="검사항목별 Unacceptable Rate 추이"
        />
      </article>

      {selectedRow && (
        <article
          className="panel trend-analysis-chart-panel"
          ref={chartPanelRef}
        >
          <div className="panel-head">
            <div>
              <h3>회차별 Unacceptable Rate 추이</h3>
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
        <p>결과 마감: 2026-02-05 · 목표 TAT: 5일 · 보고서 목표일: 2026-02-10</p>
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
    urineImageSpecimens.find(
      (specimen) => specimen.name === selectedSpecimenName,
    ) ?? urineImageSpecimens[0];

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
            className={
              specimen.name === selectedSpecimen.name ? "active" : undefined
            }
            onClick={() => setSelectedSpecimenName(specimen.name)}
            key={specimen.name}
          >
            {specimen.name}
          </button>
        ))}
      </div>
      <img
        className="image-specimen-preview"
        src={getPublicAssetUrl(
          `images/urine-specimens/${selectedSpecimen.fileName}`,
        )}
        alt={`${selectedSpecimen.name} 이미지 검체`}
      />
    </AckResponsiveDialog>
  );
}

function UrineOverview({
  onOpenImageSpecimen,
  onOpenParticipationList,
  onOpenTestList,
}) {
  const handleSummaryCardKeyDown = (event, itemIndex) => {
    if (itemIndex !== 0 && itemIndex !== 1) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    if (itemIndex === 0) {
      onOpenParticipationList();
    } else {
      onOpenTestList();
    }
  };

  return (
    <section className="summary-grid urine-summary-grid" aria-label="주요 지표">
      {urineSummary.map((item, itemIndex) => {
        const isParticipationCard = itemIndex === 0;
        const isTestListCard = itemIndex === 1;
        const openCardDialog = isParticipationCard
          ? onOpenParticipationList
          : isTestListCard
            ? onOpenTestList
            : undefined;

        return (
          <article
            className="summary-card summary-card-clickable"
            key={item.label}
            role="button"
            tabIndex={0}
            aria-label={
              isParticipationCard
                ? "소변검사 참여기관 리스트 열기"
                : "소변검사 검사항목 리스트 열기"
            }
            onClick={openCardDialog}
            onKeyDown={(event) => handleSummaryCardKeyDown(event, itemIndex)}
          >
            <span className="summary-icon" aria-hidden="true" />
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              <span>{item.unit}</span>
            </div>
          </article>
        );
      })}

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
  const baseChartWidth = Math.max(
    860,
    urineUnacceptableRateData.tests.length * 78,
  );
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
        datasets: urineUnacceptableRateData.specimens.map(
          (specimen, index) => ({
            label: specimen.key,
            data: urineUnacceptableRateData.tests.map(
              (test) => test.values[index],
            ),
            backgroundColor: specimen.color,
            borderColor: specimen.color,
            borderWidth: 1,
            borderRadius: 2,
            maxBarThickness: 16,
          }),
        ),
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
        scrollNode.scrollTop =
          scrollNode.scrollHeight - scrollNode.clientHeight;
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

  return (
    <canvas
      ref={canvasRef}
      aria-label="제조사별 Unacceptable rate 도넛 그래프"
    />
  );
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
                  role={
                    detail.institutionRows.length > 0 ? "button" : undefined
                  }
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
              {selectedTest.name} / {activeDetail.specimen.key} Unacceptable
              기관 목록
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
      .filter((detail) => detail.value !== null && detail.value !== undefined);
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
      const availableValues = periodValues.filter(
        (value) => value.rate !== null,
      );
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

  return Number.isFinite(numericValue)
    ? numericValue
    : Number.POSITIVE_INFINITY;
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

function UrineResultDistributionChart({
  card,
  specimen,
  resultDistributionRows,
}) {
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
    return (
      <div className="urine-detail-empty">표시할 SDI 데이터가 없습니다.</div>
    );
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

function UrineNonconformanceAnalysis({
  rows,
  institutionRows,
  resultDistributionRows,
}) {
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
          <div className="urine-detail-empty">
            표시할 부적합 분석 데이터가 없습니다.
          </div>
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

function formatCount(value) {
  return Number(value ?? 0).toLocaleString();
}

function getHepatitisDataUrl() {
  return getDataUrl("hepatitis-dashboard.json");
}

function HepatitisParticipationDialog({ rows, onClose }) {
  const uniqueInstitutionCount = new Set(
    rows.map((row) => row.institutionCode).filter(Boolean),
  ).size;

  return (
    <AckDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="간염바이러스항원항체검사 참여기관 리스트"
      maxWidth="sm:max-w-[96vw]"
      footer={
        <AckButton variant="primary" onClick={onClose}>
          닫기
        </AckButton>
      }
    >
      <div className="participation-dialog hepatitis-dialog">
        <div className="participation-dialog-summary">
          <span>참여기관 {formatCount(uniqueInstitutionCount)}개</span>
          <span>결과 {formatCount(rows.length)}건</span>
        </div>
        <AckDataGrid
          className="institution-data-grid participation-data-grid"
          data={rows}
          columns={hepatitisParticipationGridColumns}
          getRowId={(row, index) => row.id ?? `hepatitis-inst-${index}`}
          paginationMode="pagination"
          pageSize={20}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          enableExcelExport
          excelFileName="간염바이러스항원항체검사_참여기관리스트.xlsx"
          aria-label="간염바이러스항원항체검사 참여기관 리스트"
        />
      </div>
    </AckDialog>
  );
}

function HepatitisSummaryCards({ data, onOpenParticipationList, onOpenTestList }) {
  const cards = [
    {
      label: "참여기관 수",
      value: data.summary.institutionCount,
      unit: "기관",
      onClick: onOpenParticipationList,
    },
    {
      label: "검사항목 수",
      value: data.summary.testCount,
      unit: "종목",
      onClick: onOpenTestList,
    },
    { label: "검체 수", value: data.summary.specimenCount, unit: "개" },
    {
      label: "Unacceptable rate",
      value: formatPercent(data.summary.unacceptableRate),
      unit: "",
    },
  ];

  return (
    <section
      className="summary-grid hepatitis-summary-grid"
      aria-label="간염바이러스항원항체검사 주요 지표"
    >
      {cards.map((card) => {
        const Component = card.onClick ? "button" : "article";
        return (
          <Component
            className={
              "summary-card" + (card.onClick ? " summary-card-clickable" : "")
            }
            key={card.label}
            onClick={card.onClick}
            type={card.onClick ? "button" : undefined}
            aria-label={card.onClick ? `${card.label} 리스트 열기` : undefined}
          >
            <p>{card.label}</p>
            <strong>{typeof card.value === "number" ? formatCount(card.value) : card.value}</strong>
            {card.unit && <span>{card.unit}</span>}
          </Component>
        );
      })}
    </section>
  );
}

function getHepatitisSpecimens(data) {
  return (data?.specimens ?? [])
    .slice()
    .sort((left, right) => sortChemistryLabels(left.name, right.name));
}

function getHepatitisAggregateRows(data, testCode, specimenName, baseCategory) {
  return (data?.aggregateRows ?? []).filter(
    (row) =>
      (!testCode || row.testCode === testCode) &&
      (!specimenName || row.specimenName === specimenName) &&
      (!baseCategory || row.baseCategory === baseCategory),
  );
}

function summarizeHepatitisRows(rows, keyName) {
  const bucketMap = new Map();

  rows.forEach((row) => {
    const name = row[keyName] || "미분류";
    const count = Number(row.count ?? 0);

    if (!Number.isFinite(count) || count <= 0) return;
    if (!bucketMap.has(name)) {
      bucketMap.set(name, {
        name,
        total: 0,
        acceptable: 0,
        unacceptable: 0,
        notAvailable: 0,
      });
    }

    const bucket = bucketMap.get(name);
    bucket.total += count;
    if (row.acceptability === "Unacceptable") {
      bucket.unacceptable += count;
    } else if (row.acceptability === "Not Available") {
      bucket.notAvailable += count;
    } else {
      bucket.acceptable += count;
    }
  });

  return Array.from(bucketMap.values())
    .map((bucket) => ({
      ...bucket,
      rate: bucket.total > 0 ? (bucket.unacceptable / bucket.total) * 100 : 0,
    }))
    .sort(
      (left, right) =>
        right.total - left.total || sortChemistryLabels(left.name, right.name),
    );
}

function createHepatitisResultDistributionRows(rows) {
  return summarizeHepatitisRows(rows, "result").map((row) => ({
    label: row.name,
    count: row.total,
    unacceptable: row.unacceptable,
    rate: row.rate,
  }));
}

function createHepatitisNonconformanceCards(data) {
  return (data?.tests ?? [])
    .map((test) => ({
      testCode: test.code,
      testName: test.name,
      displayName: test.name,
      participating: test.total,
      totalUnacceptable: test.unacceptable,
      specimens: test.specimens.map((specimen) => ({
        specimen: specimen.name,
        count: specimen.unacceptable,
        total: specimen.total,
        rate: specimen.rate,
      })),
    }))
    .sort(
      (left, right) =>
        right.totalUnacceptable - left.totalUnacceptable ||
        sortChemistryLabels(left.displayName, right.displayName),
    );
}

function createHepatitisTrendAnalysisData(data) {
  const periods = (data?.trend ?? []).map((period, index, rows) => ({
    key: period.key,
    label: period.label,
    isCurrent: index === rows.length - 1,
  }));

  const rows = (data?.tests ?? []).map((test) => {
    const periodValues = periods.map((period) => {
      const periodRow = data.trend
        .find((trendPeriod) => trendPeriod.key === period.key)
        ?.tests.find((trendTest) => trendTest.code === test.code);

      return {
        periodKey: period.key,
        rate: periodRow ? periodRow.rate : null,
        unacceptableCount: periodRow ? periodRow.unacceptable : null,
        participatingCount: periodRow ? periodRow.total : null,
      };
    });
    const chartValues = periodValues.map((value, index) => ({
      ...value,
      label: periods[index]?.label,
    }));
    const availableValues = periodValues.filter((value) => value.rate !== null);
    const latestValue = availableValues.at(-1);
    const previousValue = availableValues.at(-2);

    return {
      code: test.code,
      displayName: test.name,
      periodValues,
      chartValues,
      trendValue:
        latestValue && previousValue
          ? Number(latestValue.rate) - Number(previousValue.rate)
          : null,
    };
  });

  return { periods, rows };
}

function HepatitisResultDistributionMini({ rows, selectedLabel }) {
  const distributionRows = createHepatitisResultDistributionRows(rows);
  const total = distributionRows.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(1, ...distributionRows.map((row) => row.count));

  if (distributionRows.length === 0) {
    return (
      <div className="urine-detail-empty">
        표시할 결과 분포 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="result-distribution-card hepatitis-result-card">
      <div className="result-distribution-head">
        <h4>{selectedLabel} 결과값 분포</h4>
        <i>전체 {formatCount(total)}건</i>
      </div>
      <div className="result-distribution-bars">
        {distributionRows.map((row) => (
          <div
            className={`result-distribution-row ${
              row.unacceptable > 0 ? "is-major" : ""
            }`}
            key={row.label}
          >
            <span className="result-distribution-label">{row.label}</span>
            <div className="result-distribution-track">
              <span
                className="result-distribution-fill"
                style={{ width: `${(row.count / maxCount) * 100}%` }}
              />
            </div>
            <strong>
              {formatCount(row.count)}건 / Unacc {formatCount(row.unacceptable)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HepatitisRateChart({ data, selectedCode, onSelect }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const tests = data.tests;
  const specimens = getHepatitisSpecimens(data);
  const maxRate = Math.max(
    1,
    ...tests.flatMap((test) => test.specimens.map((specimen) => specimen.rate)),
  );
  const chartWidth = Math.round(Math.max(900, tests.length * 92) * zoomLevel);
  const chartHeight = Math.round(320 * zoomLevel);
  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));
  const changeZoom = (nextZoom) => setZoomLevel(clampZoom(nextZoom));

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    chartRef.current?.destroy();

    const labels = tests.map((test) => test.name);
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: specimens.map((specimen, specimenIndex) => ({
          label: specimen.name,
          data: tests.map(
            (test) =>
              test.specimens.find((item) => item.name === specimen.name)
                ?.rate ?? null,
          ),
          backgroundColor:
            chemistryDetailColors[specimenIndex % chemistryDetailColors.length],
          borderColor:
            chemistryDetailColors[specimenIndex % chemistryDetailColors.length],
          borderRadius: 3,
          maxBarThickness: 18,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        onClick: (_event, elements) => {
          const index = elements?.[0]?.index;
          if (index !== undefined && tests[index]) onSelect(tests[index].code);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => tests[items[0].dataIndex]?.name ?? "",
              label: (item) => `Unacceptable rate ${formatPercent(item.parsed.y)}`,
              afterLabel: (item) => {
                const test = tests[item.dataIndex];
                return `검사항목 전체 Unacceptable ${formatCount(
                  test.unacceptable,
                )} / ${formatCount(test.total)}건`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#334155" },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxRate * 1.25 * 10) / 10,
            ticks: {
              color: "#334155",
              maxTicksLimit: zoomLevel >= 1.5 ? 12 : 7,
              callback: (value) => `${Number(value).toFixed(2)}%`,
            },
            title: { display: true, text: "Unacceptable rate (%)" },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [tests, specimens, selectedCode, onSelect, maxRate, zoomLevel]);

  return (
    <article className="panel chart-panel hepatitis-rate-panel">
      <div className="panel-head">
        <div>
          <h3>검사항목별 Unacceptable Rate</h3>
          <p>{data.latestPeriod.label} 기준, 검체별 비율을 표시합니다.</p>
        </div>
        <span>단위: %</span>
      </div>
      <div className="rate-chart">
        <div className="chart-toolbar">
          <div className="chart-legend" aria-label="검체 범례">
            {specimens.map((specimen, index) => (
              <span key={specimen.name}>
                <i
                  style={{
                    backgroundColor:
                      chemistryDetailColors[index % chemistryDetailColors.length],
                  }}
                />
                {specimen.name}
              </span>
            ))}
          </div>
          <div className="chart-zoom" aria-label="그래프 확대 축소">
            <button type="button" onClick={() => changeZoom(zoomLevel - 0.25)}>
              -
            </button>
            <input
              type="range"
              min="75"
              max="200"
              step="25"
              value={Math.round(zoomLevel * 100)}
              aria-label="그래프 확대"
              onChange={(event) => changeZoom(Number(event.target.value) / 100)}
            />
            <button type="button" onClick={() => changeZoom(zoomLevel + 0.25)}>
              +
            </button>
            <button type="button" onClick={() => changeZoom(1)}>
              {Math.round(zoomLevel * 100)}%
            </button>
          </div>
        </div>
        <div className="chart-scroll">
          <div
            className="chart-canvas"
            style={{
              width: `max(100%, ${chartWidth}px)`,
              height: `${chartHeight}px`,
            }}
          >
            <canvas ref={canvasRef} aria-label="간염 검사항목별 Unacceptable rate" />
          </div>
        </div>
      </div>
    </article>
  );
}

function HepatitisDoughnutChart({
  items,
  selectedName,
  onSelect,
  centerTitle,
  centerSubtitle,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const topItems = useMemo(() => items.slice(0, 8), [items]);
  const total = topItems.reduce((sum, row) => sum + row.total, 0);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: topItems.map((item) => item.name),
        datasets: [
          {
            data: topItems.map((item) => item.total),
            backgroundColor: topItems.map(
              (_item, index) => chemistryDetailColors[index % chemistryDetailColors.length],
            ),
            borderColor: topItems.map((item) =>
              item.name === selectedName ? "#111827" : "#ffffff",
            ),
            borderWidth: topItems.map((item) =>
              item.name === selectedName ? 3 : 1,
            ),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "62%",
        onClick: (_event, elements) => {
          const index = elements?.[0]?.index;
          if (index !== undefined && topItems[index]) {
            onSelect?.(topItems[index].name);
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target;
          if (target) target.style.cursor = elements.length ? "pointer" : "default";
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (item) => {
                const current = topItems[item.dataIndex];
                return `${current.name}: ${formatCount(current.total)}건 (${formatPercent(
                  total > 0 ? (current.total / total) * 100 : 0,
                )})`;
              },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [topItems, selectedName, onSelect, total]);

  return (
    <>
      <canvas ref={canvasRef} aria-label="간염 분류별 현황" />
      <div className="donut-center" aria-hidden="true">
        <strong>{centerTitle ?? `총 ${formatCount(total)}건`}</strong>
        <span>{centerSubtitle ?? "집계"}</span>
      </div>
    </>
  );
}

function HepatitisSelectedTestDetail({ data, selectedTest }) {
  const [activeTarget, setActiveTarget] = useState(null);
  const specimenDetails = selectedTest.specimens.map((specimen) => {
    const rows = getHepatitisAggregateRows(
      data,
      selectedTest.code,
      specimen.name,
    );
    const baseCategories = summarizeHepatitisRows(rows, "baseCategory");

    return {
      specimen,
      rows,
      baseCategories,
    };
  });
  const activeRows = activeTarget
    ? getHepatitisAggregateRows(
        data,
        selectedTest.code,
        activeTarget.specimenName,
        activeTarget.baseCategory,
      ).filter((row) => row.acceptability === "Unacceptable")
    : [];
  const activeAllRows = activeTarget
    ? getHepatitisAggregateRows(
        data,
        selectedTest.code,
        activeTarget.specimenName,
        activeTarget.baseCategory,
      )
    : [];
  const activeDetailCategories = summarizeHepatitisRows(
    activeAllRows,
    "detailCategory",
  ).slice(0, 5);

  useEffect(() => {
    setActiveTarget(null);
  }, [selectedTest.code]);

  const toggleBaseCategory = (specimenName, baseCategory) => {
    setActiveTarget((current) =>
      current?.specimenName === specimenName &&
      current?.baseCategory === baseCategory
        ? null
        : { specimenName, baseCategory },
    );
  };

  return (
    <article className="panel detail-panel hepatitis-selected-panel">
      <div className="panel-head">
        <div>
          <h3>선택 검사 상세</h3>
          <p>
            {selectedTest.code} / {selectedTest.name}
          </p>
        </div>
        <span>{formatPercent(selectedTest.rate)}</span>
      </div>
      <div className="selection-row">
        <div>
          <span>선택 검사</span>
          <strong>{selectedTest.name}</strong>
        </div>
        <div>
          <span>검체 수</span>
          <strong>{selectedTest.specimens.length}개</strong>
        </div>
      </div>

      <div className="urine-specimen-detail-list">
        {specimenDetails.map((detail) => (
          <section
            className="urine-specimen-detail-card hepatitis-specimen-detail-card"
            key={detail.specimen.name}
          >
            <h4>
              기준분류별 Unacceptable Rate ({detail.specimen.name} 기준)
              <span>{formatPercent(detail.specimen.rate)}</span>
            </h4>
            {detail.baseCategories.length > 0 ? (
              <div className="donut-layout urine-specimen-donut-layout">
                <div className="donut-box urine-specimen-donut-box">
                  <HepatitisDoughnutChart
                    items={detail.baseCategories}
                    selectedName={
                      activeTarget?.specimenName === detail.specimen.name
                        ? activeTarget.baseCategory
                        : undefined
                    }
                    onSelect={(baseCategory) =>
                      toggleBaseCategory(detail.specimen.name, baseCategory)
                    }
                    centerTitle={`총 ${formatCount(detail.specimen.total)}건`}
                    centerSubtitle={detail.specimen.name}
                  />
                </div>
                <div className="maker-list">
                  {detail.baseCategories.map((base, index) => (
                    <button
                      type="button"
                      className={`maker-item hepatitis-maker-button ${
                        activeTarget?.specimenName === detail.specimen.name &&
                        activeTarget?.baseCategory === base.name
                          ? "active"
                          : ""
                      }`}
                      key={`${detail.specimen.name}-${base.name}`}
                      onClick={() =>
                        toggleBaseCategory(detail.specimen.name, base.name)
                      }
                    >
                      <i
                        style={{
                          backgroundColor:
                            chemistryDetailColors[
                              index % chemistryDetailColors.length
                            ],
                        }}
                      />
                      <b>{base.name}</b>
                      <span>
                        {formatCount(base.total)}건 ({formatPercent(base.rate)})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="urine-detail-empty">
                표시할 기준분류 데이터가 없습니다.
              </div>
            )}
          </section>
        ))}
      </div>

      {activeTarget && (
        <div className="institution-list hepatitis-selected-breakdown">
          <div className="institution-list-head">
            <h4>
              {selectedTest.name} / {activeTarget.specimenName} /{" "}
              {activeTarget.baseCategory} Unacceptable 집계
            </h4>
            <div className="institution-list-actions">
              <span>
                전체{" "}
                {formatCount(
                  activeRows.reduce((sum, row) => sum + Number(row.count ?? 0), 0),
                )}
                건
              </span>
              <AckButton
                variant="secondary"
                size="small"
                onClick={() => setActiveTarget(null)}
              >
                접기
              </AckButton>
            </div>
          </div>
          <div className="hepatitis-breakdown-layout">
            <div className="hepatitis-rank-list">
              <h4>세분류 Top5</h4>
              {activeDetailCategories.map((detail, index) => (
                <div className="hepatitis-rank-row" key={detail.name}>
                  <span>{index + 1}</span>
                  <b>{detail.name}</b>
                  <em>
                    {formatCount(detail.total)}건 / {formatPercent(detail.rate)}
                  </em>
                </div>
              ))}
            </div>
            <HepatitisResultDistributionMini
              rows={activeAllRows}
              selectedLabel={activeTarget.baseCategory}
            />
          </div>
          <AckDataGrid
            className="institution-data-grid"
            data={activeRows}
            columns={hepatitisAggregateGridColumns}
            getRowId={(row, index) => row.id ?? `hep-selected-${index}`}
            paginationMode="pagination"
            pageSize={10}
            density="compact"
            domLayout="autoHeight"
            stickyHeader
            enableExcelExport
            excelFileName={`${selectedTest.code}_${activeTarget.specimenName}_${activeTarget.baseCategory}_Unacceptable집계.xlsx`}
            aria-label="간염 선택검사 Unacceptable 집계"
          />
        </div>
      )}
    </article>
  );
}

function HepatitisOverviewTrendPanel({ data, selectedTest }) {
  const selectedTrendRow = createHepatitisTrendAnalysisData(data).rows.find(
    (row) => row.code === selectedTest.code,
  );

  return (
    <article className="panel trend-analysis-chart-panel hepatitis-overview-trend">
      <div className="panel-head">
        <div>
          <h3>회차별 Unacc Rate 추이</h3>
          <p>{selectedTest.name}</p>
        </div>
        <span>막대: 결과건수 / 선: Unacceptable Rate</span>
      </div>
      {selectedTrendRow ? (
        <TrendAnalysisChart row={selectedTrendRow} />
      ) : (
        <div className="urine-detail-empty">표시할 추이 데이터가 없습니다.</div>
      )}
    </article>
  );
}

function HepatitisOverview({
  data,
  selectedTest,
  onSelectTest,
  onOpenParticipationList,
  onOpenTestList,
}) {
  return (
    <>
      <HepatitisSummaryCards
        data={data}
        onOpenParticipationList={onOpenParticipationList}
        onOpenTestList={onOpenTestList}
      />
      <section className="content-grid hepatitis-overview-grid">
        <HepatitisRateChart
          data={data}
          selectedCode={selectedTest.code}
          onSelect={onSelectTest}
        />
        <HepatitisSelectedTestDetail data={data} selectedTest={selectedTest} />
        <HepatitisOverviewTrendPanel data={data} selectedTest={selectedTest} />
      </section>
    </>
  );
}

function HepatitisNonconformanceAnalysis({ data, selectedTest, onSelectTest }) {
  const [institutionTarget, setInstitutionTarget] = useState(null);
  const cards = createHepatitisNonconformanceCards(data);
  const selectedCard =
    cards.find((card) => card.testCode === selectedTest.code) ?? cards[0];
  const selectedRows = institutionTarget
    ? getHepatitisAggregateRows(
        data,
        institutionTarget.testCode,
        institutionTarget.specimen,
      ).filter((row) => row.acceptability === "Unacceptable")
    : [];

  const selectCard = (card) => {
    onSelectTest(card.testCode);
    setInstitutionTarget(null);
  };

  const toggleAggregateList = (event, card, specimen) => {
    event.stopPropagation();
    onSelectTest(card.testCode);
    setInstitutionTarget((currentTarget) => {
      if (
        currentTarget?.testCode === card.testCode &&
        currentTarget?.specimen === specimen.specimen
      ) {
        return null;
      }

      return {
        testName: card.testName,
        testCode: card.testCode,
        specimen: specimen.specimen,
      };
    });
  };

  return (
    <section className="nonconformance-view urine-nonconformance-view hepatitis-analysis-view">
      <article className="panel nonconformance-card-panel hepatitis-nonconformance-panel">
        <div className="panel-head">
          <div>
            <h3>검사항목별 Unacceptable 상세현황</h3>
            <p>검체별 비율과 집계 목록을 함께 확인합니다.</p>
          </div>
          <span>선택 검사: {selectedCard?.displayName ?? "-"}</span>
        </div>

        <div
          className="unacc-card-scroll urine-unacc-card-scroll"
          aria-label="간염 검사항목별 Unacceptable 상세현황 카드 목록"
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
                      <span>결과건수</span>
                      <strong>{formatCount(card.participating)}</strong>
                    </div>
                    <div>
                      <span>Unacceptable</span>
                      <strong className="danger">
                        {formatCount(card.totalUnacceptable)}
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
                        key={`${card.testCode}-${specimen.specimen}`}
                      >
                        <span>{specimen.specimen}</span>
                        <b>{formatPercent(specimen.rate)}</b>
                        <button
                          type="button"
                          className="unacc-count-button"
                          aria-expanded={
                            institutionTarget?.testCode === card.testCode &&
                            institutionTarget?.specimen === specimen.specimen
                          }
                          onClick={(event) =>
                            toggleAggregateList(event, card, specimen)
                          }
                        >
                          {formatCount(specimen.count)}건
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {institutionTarget && (
          <div className="nonconformance-list" id="hepatitis-aggregate-list">
            <div className="institution-list-head">
              <h4>
                {institutionTarget.testName} / {institutionTarget.specimen}{" "}
                Unacceptable 집계
              </h4>
              <div className="institution-list-actions">
                <span>
                  전체{" "}
                  {formatCount(
                    selectedRows.reduce(
                      (sum, row) => sum + Number(row.count ?? 0),
                      0,
                    ),
                  )}
                  건
                </span>
                <AckButton
                  variant="secondary"
                  size="small"
                  onClick={() => setInstitutionTarget(null)}
                >
                  접기
                </AckButton>
              </div>
            </div>
            <AckDataGrid
              className="institution-data-grid"
              data={selectedRows}
              columns={hepatitisAggregateGridColumns}
              getRowId={(row, index) => row.id ?? `hepatitis-unacc-${index}`}
              paginationMode="pagination"
              pageSize={10}
              density="compact"
              domLayout="autoHeight"
              stickyHeader
              enableExcelExport
              excelFileName={`${institutionTarget.testCode}_${institutionTarget.specimen}_간염_Unacceptable집계.xlsx`}
              aria-label="간염바이러스항원항체검사 Unacceptable 집계"
            />
          </div>
        )}

        {selectedCard && (
          <div className="result-distribution-section">
            <div className="result-distribution-grid">
              {selectedCard.specimens.map((specimen) => (
                <div
                  className={`result-distribution-shell ${
                    institutionTarget?.specimen === specimen.specimen
                      ? "selected"
                      : ""
                  }`}
                  key={`${selectedCard.testCode}-${specimen.specimen}-dist`}
                >
                  <HepatitisResultDistributionMini
                    rows={getHepatitisAggregateRows(
                      data,
                      selectedCard.testCode,
                      specimen.specimen,
                    )}
                    selectedLabel={specimen.specimen}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

function createHepatitisQualitativeStatisticsRows(data) {
  const groupMap = new Map();

  (data?.aggregateRows ?? []).forEach((row) => {
    const groupKey = [
      row.testCode,
      row.testName,
      row.specimenName,
      row.baseCategory,
    ].join("||");
    const resultKey = [groupKey, row.result, row.acceptability].join("||");
    const count = Number(row.count ?? 0);

    if (!Number.isFinite(count) || count <= 0) return;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        testCode: row.testCode,
        testName: row.testName,
        specimenName: row.specimenName,
        baseCategory: row.baseCategory,
        total: 0,
        acceptableResults: new Set(),
        resultMap: new Map(),
      });
    }

    const group = groupMap.get(groupKey);
    group.total += count;
    if (row.acceptability === "Acceptable") {
      group.acceptableResults.add(row.result);
    }
    if (!group.resultMap.has(resultKey)) {
      group.resultMap.set(resultKey, {
        result: row.result,
        acceptability: row.acceptability,
        count: 0,
      });
    }
    group.resultMap.get(resultKey).count += count;
  });

  return Array.from(groupMap.values()).flatMap((group, groupIndex) => {
    const intendedAnswer =
      Array.from(group.acceptableResults)
        .filter(Boolean)
        .sort(sortChemistryLabels)
        .join(", ") || "-";

    return Array.from(group.resultMap.values())
      .sort(
        (left, right) =>
          sortChemistryLabels(left.result, right.result) ||
          sortChemistryLabels(left.acceptability, right.acceptability),
      )
      .map((resultRow, resultIndex) => ({
        id: `hep-qual-${groupIndex}-${resultIndex}`,
        프로그램명: "간염바이러스항원항체검사",
        상위검사명: group.testCode,
        검사명: group.testName,
        검체명: group.specimenName,
        기준분류: group.baseCategory,
        "보고한 결과": resultRow.result,
        결과선택기관수_전체: group.total,
        결과선택기관수_선택: resultRow.count,
        결과선택기관수_비율:
          group.total > 0 ? (resultRow.count / group.total) * 100 : 0,
        "운영자 정답(INTENDED)": intendedAnswer,
        "운영자 Remark":
          resultRow.acceptability === "Not Available"
            ? "Not Available"
            : "",
        "운영자 판정": resultRow.acceptability,
      }));
  });
}

function HepatitisQualitativeStatistics({ data }) {
  const sourceRows = useMemo(
    () => createHepatitisQualitativeStatisticsRows(data),
    [data],
  );
  const gridRows = useMemo(
    () => normalizeQualitativeStatisticsRows(sourceRows),
    [sourceRows],
  );

  return (
    <section className="statistics-view qualitative-statistics-view hepatitis-statistics-view">
      <article className="panel statistics-panel qualitative-statistics-panel hepatitis-grid-panel">
        <div className="panel-head statistics-head">
          <div>
            <h3>검사항목별 정성 판정</h3>
            <p>운영자 정답 및 판정 결과를 한 화면에서 확인합니다.</p>
          </div>
          <div className="statistics-actions">
            <span>전체 {formatCount(sourceRows.length)}건</span>
          </div>
        </div>

        <AckDataGrid
          data={gridRows}
          columns={qualitativeGridColumns}
          getRowId={(row, index) => row.id ?? `hepatitis-qual-${index}`}
          enableSorting
          enableColumnFilters
          paginationMode="pagination"
          pageSize={50}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          enableExcelExport
          excelFileName="간염바이러스항원항체검사_검사항목별_정성판정.xlsx"
          aria-label="간염바이러스항원항체검사 정성 판정"
        />
      </article>
    </section>
  );
}

function HepatitisTrendChart({ trend }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      data: {
        labels: trend.map((row) => row.label),
        datasets: [
          {
            type: "bar",
            label: "참여기관수",
            data: trend.map((row) => row.institutionCount),
            backgroundColor: "rgba(8, 105, 244, 0.24)",
            borderColor: "#0869f4",
            borderWidth: 1,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "Unacceptable rate",
            data: trend.map((row) => row.rate),
            borderColor: "#ef4444",
            backgroundColor: "#ef4444",
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (item) =>
                item.dataset.yAxisID === "y1"
                  ? `${item.dataset.label}: ${formatPercent(item.parsed.y)}`
                  : `${item.dataset.label}: ${formatCount(item.parsed.y)}기관`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "참여기관수" },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            title: { display: true, text: "Unacceptable rate (%)" },
            grid: { drawOnChartArea: false },
            ticks: { callback: (value) => `${value}%` },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [trend]);

  return <canvas ref={canvasRef} aria-label="회차별 Unacceptable rate 추이" />;
}

function HepatitisTrendAnalysis({ data }) {
  const { periods, rows } = createHepatitisTrendAnalysisData(data);
  const trendGridColumns = useMemo(
    () => buildTrendGridColumns(periods, "검사항목"),
    [periods],
  );
  const [selectedCode, setSelectedCode] = useState(rows[0]?.code ?? "");
  const chartPanelRef = useRef(null);
  const selectedRow =
    rows.find((row) => row.code === selectedCode) ?? rows[0];

  useEffect(() => {
    if (!selectedCode && rows[0]?.code) {
      setSelectedCode(rows[0].code);
    }
  }, [selectedCode, rows]);

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
    <section className="trend-analysis-view urine-trend-analysis-view hepatitis-trend-view">
      <article className="panel trend-analysis-panel">
        <div className="trend-analysis-title">
          <h3>검사항목별 Unacceptable Rate 추이 테이블</h3>
          <span>추세 = 직전 회차 대비 변화</span>
        </div>
        <AckDataGrid
          className="trend-grid"
          data={rows}
          columns={trendGridColumns}
          getRowId={(row) => row.code}
          getRowClass={(row) =>
            row.code === selectedRow?.code ? "is-selected" : undefined
          }
          onRowClick={(row) => selectTrendRow(row.code)}
          density="compact"
          domLayout="autoHeight"
          stickyHeader
          aria-label="간염 검사항목별 Unacceptable Rate 추이"
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
            <span>막대: 결과건수 / 선: Unacceptable Rate (%)</span>
          </div>
          <TrendAnalysisChart row={selectedRow} />
        </article>
      )}
    </section>
  );
}

function HepatitisDashboard({
  isStatisticsConfirmed,
  onOpenStatisticsConfirm,
  onResetStatisticsConfirm,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedTestCode, setSelectedTestCode] = useState(null);
  const [isParticipationOpen, setIsParticipationOpen] = useState(false);
  const [isTestListOpen, setIsTestListOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(false);

    fetch(getHepatitisDataUrl())
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load hepatitis data");
        return response.json();
      })
      .then((payload) => {
        if (!isMounted) return;
        setData(payload);
        setSelectedTestCode(payload.tests[0]?.code ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setData(null);
        setLoadError(true);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTest =
    data?.tests.find((test) => test.code === selectedTestCode) ??
    data?.tests[0];

  const testListRows = useMemo(
    () =>
      data?.tests.map((test) => ({
        id: test.code,
        code: test.code,
        name: test.name,
      })) ?? [],
    [data],
  );

  return (
    <div className="app-shell">
      <AppHeader title={data?.title ?? "간염바이러스항원항체검사 대시보드"} />
      <TatStatusHeader
        isStatisticsConfirmed={isStatisticsConfirmed}
        onOpenStatisticsConfirm={onOpenStatisticsConfirm}
        onResetStatisticsConfirm={onResetStatisticsConfirm}
      />
      <ReportTabbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={hepatitisDashboardTabs}
      />

      <main className="dashboard hepatitis-dashboard">
        {isLoading ? (
          <section className="panel tab-empty-panel">
            <h2>데이터를 불러오는 중입니다</h2>
          </section>
        ) : loadError || !data || !selectedTest ? (
          <section className="panel tab-empty-panel">
            <h2>간염바이러스항원항체검사 데이터를 불러오지 못했습니다</h2>
          </section>
        ) : activeTab === "overview" ? (
          <>
            <HepatitisOverview
              data={data}
              selectedTest={selectedTest}
              onSelectTest={setSelectedTestCode}
              onOpenParticipationList={() => setIsParticipationOpen(true)}
              onOpenTestList={() => setIsTestListOpen(true)}
            />
            {isParticipationOpen && (
              <HepatitisParticipationDialog
                rows={data.institutionRows}
                onClose={() => setIsParticipationOpen(false)}
              />
            )}
            {isTestListOpen && (
              <ChemistryTestListDialog
                rows={testListRows}
                title="간염바이러스항원항체검사 검사항목 리스트"
                ariaLabel="간염바이러스항원항체검사 검사항목 리스트"
                onClose={() => setIsTestListOpen(false)}
              />
            )}
          </>
        ) : activeTab === "nonconformance" ? (
          <HepatitisNonconformanceAnalysis
            data={data}
            selectedTest={selectedTest}
            onSelectTest={setSelectedTestCode}
          />
        ) : activeTab === "statistics-qualitative" ? (
          <HepatitisQualitativeStatistics data={data} />
        ) : activeTab === "trend" ? (
          <HepatitisTrendAnalysis data={data} />
        ) : (
          <section className="panel tab-empty-panel">
            <h2>준비 중입니다</h2>
          </section>
        )}
      </main>
    </div>
  );
}

function NewPage({
  isStatisticsConfirmed,
  onOpenStatisticsConfirm,
  onResetStatisticsConfirm,
  dashboardTitle = "2025년 1회차 소변검사",
  dashboardName = "소변검사",
  tabs = reportTabs,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isImageSpecimenOpen, setIsImageSpecimenOpen] = useState(false);
  const [isUrineParticipationOpen, setIsUrineParticipationOpen] =
    useState(false);
  const [isUrineTestListOpen, setIsUrineTestListOpen] = useState(false);
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
  const [
    urineNonconformanceInstitutionRows,
    setUrineNonconformanceInstitutionRows,
  ] = useState([]);
  const activeTabLabel = reportTabs.find((tab) => tab.id === activeTab)?.label;
  const urineParticipationRows = useMemo(
    () => urineInstitutionRows.map(toUrineParticipationRow),
    [urineInstitutionRows],
  );
  const urineTestListRows = useMemo(() => {
    const testMap = new Map();

    urineNonconformanceRows.forEach((row) => {
      const code = row.testCode;
      const name = String(row.testName ?? "").replace(/^-/, "");

      if (code && !testMap.has(code)) {
        testMap.set(code, {
          id: code,
          code,
          name: name || code,
        });
      }
    });

    if (testMap.size === 0) {
      urineUnacceptableRateData.tests.forEach((test) => {
        testMap.set(test.name, {
          id: test.name,
          code: test.name,
          name: String(test.name).replace(/^-/, ""),
        });
      });
    }

    return Array.from(testMap.values()).sort(
      (left, right) =>
        sortChemistryLabels(left.name, right.name) ||
        sortChemistryLabels(left.code, right.code),
    );
  }, [urineNonconformanceRows]);

  const openUrineParticipationDialog = () => {
    if (urineParticipationRows.length === 0) return;
    setIsUrineParticipationOpen(true);
  };

  const openUrineTestListDialog = () => {
    if (urineTestListRows.length === 0) return;
    setIsUrineTestListOpen(true);
  };

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
      <AppHeader title={dashboardTitle} />
      <TatStatusHeader
        isStatisticsConfirmed={isStatisticsConfirmed}
        onOpenStatisticsConfirm={onOpenStatisticsConfirm}
        onResetStatisticsConfirm={onResetStatisticsConfirm}
      />
      <ReportTabbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      <main className="dashboard">
        {activeTab === "overview" ? (
          <>
            <UrineOverview
              onOpenImageSpecimen={() => setIsImageSpecimenOpen(true)}
              onOpenParticipationList={openUrineParticipationDialog}
              onOpenTestList={openUrineTestListDialog}
            />
            {isUrineParticipationOpen && (
              <UrineParticipationDialog
                rows={urineParticipationRows}
                title={`${dashboardName} 참여기관 리스트`}
                excelFileName={`${dashboardName}_참여기관리스트.xlsx`}
                onClose={() => setIsUrineParticipationOpen(false)}
              />
            )}
            {isUrineTestListOpen && (
              <ChemistryTestListDialog
                rows={urineTestListRows}
                title={`${dashboardName} 검사항목 리스트`}
                ariaLabel={`${dashboardName} 검사항목 리스트`}
                onClose={() => setIsUrineTestListOpen(false)}
              />
            )}
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
          <section
            className="panel tab-empty-panel"
            aria-label="새 페이지 탭 영역"
          >
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
  const [isChemistryParticipationOpen, setIsChemistryParticipationOpen] =
    useState(false);
  const [isChemistryTestListOpen, setIsChemistryTestListOpen] =
    useState(false);
  const [chemistryRows, setChemistryRows] = useState([]);
  const [chemistryStatisticsRows, setChemistryStatisticsRows] = useState([]);
  const [chemistryTrendPeriodRows, setChemistryTrendPeriodRows] = useState([]);
  const chemistryDashboardData = useMemo(
    () => createChemistryDashboardData(chemistryRows),
    [chemistryRows],
  );
  const chemistrySummary = chemistryDashboardData.summary;
  const chemistryParticipationRows = useMemo(
    () => chemistryRows.map(toChemistryParticipationRow),
    [chemistryRows],
  );
  const chemistryTestListRows = useMemo(
    () =>
      chemistryDashboardData.tests
        .map((test) => ({
          id: test.code,
          code: test.code,
          name: test.name,
        }))
        .sort(
          (left, right) =>
            sortChemistryLabels(left.name, right.name) ||
            sortChemistryLabels(left.code, right.code),
        ),
    [chemistryDashboardData.tests],
  );
  const activeTabLabel = dashboardTabs.find(
    (tab) => tab.id === activeTab,
  )?.label;

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
        : activePage === "hepatitis-dashboard"
          ? "간염바이러스항원항체검사 대시보드"
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

    fetch(getPublicAssetUrl(chemistryStatisticsDataFileName))
      .then((response) => response.arrayBuffer())
      .then((buffer) => new TextDecoder("euc-kr").decode(buffer))
      .then((csvText) => {
        if (isActive) {
          setChemistryStatisticsRows(
            mapChemistryStatisticsRows(parseCsv(csvText)),
          );
        }
      })
      .catch(() => {
        if (isActive) setChemistryStatisticsRows([]);
      });

    Promise.all(
      chemistryTrendDataFiles.map((period) =>
        fetch(getPublicAssetUrl(period.fileName))
          .then((response) => response.arrayBuffer())
          .then((buffer) => ({
            periodKey: period.key,
            rows: parseCsv(new TextDecoder("euc-kr").decode(buffer)),
          })),
      ),
    )
      .then((periodRows) => {
        if (isActive) setChemistryTrendPeriodRows(periodRows);
      })
      .catch(() => {
        if (isActive) setChemistryTrendPeriodRows([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setSelection((currentSelection) => {
      const maxTestIndex = Math.max(chemistryDashboardData.tests.length - 1, 0);
      const maxSpecimenIndex = Math.max(
        chemistryDashboardData.specimens.length - 1,
        0,
      );
      const nextSelection = {
        testIndex: Math.min(currentSelection.testIndex, maxTestIndex),
        specimenIndex: Math.min(
          currentSelection.specimenIndex,
          maxSpecimenIndex,
        ),
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

  const openChemistryParticipationDialog = () => {
    if (chemistryParticipationRows.length === 0) return;
    setIsChemistryParticipationOpen(true);
  };

  const openChemistryTestListDialog = () => {
    if (chemistryTestListRows.length === 0) return;
    setIsChemistryTestListOpen(true);
  };

  const handleSummaryCardKeyDown = (event, itemIndex) => {
    if (itemIndex !== 0 && itemIndex !== 1) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    if (itemIndex === 0) {
      openChemistryParticipationDialog();
    } else {
      openChemistryTestListDialog();
    }
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

  if (activePage === "hepatitis-dashboard") {
    return (
      <>
        <HepatitisDashboard
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
              {chemistrySummary.map((item, itemIndex) => {
                const isParticipationCard = itemIndex === 0;
                const isTestListCard = itemIndex === 1;
                const isClickableCard = isParticipationCard || isTestListCard;
                const openCardDialog = isParticipationCard
                  ? openChemistryParticipationDialog
                  : isTestListCard
                    ? openChemistryTestListDialog
                    : undefined;

                return (
                  <article
                    className={
                      "summary-card" +
                      (isClickableCard ? " summary-card-clickable" : "")
                    }
                    key={item.label}
                    role={isClickableCard ? "button" : undefined}
                    tabIndex={isClickableCard ? 0 : undefined}
                    aria-label={
                      isParticipationCard
                        ? "전체 참여기관 리스트 열기"
                        : isTestListCard
                          ? "검사항목 리스트 열기"
                          : undefined
                    }
                    onClick={openCardDialog}
                    onKeyDown={(event) =>
                      handleSummaryCardKeyDown(event, itemIndex)
                    }
                  >
                    <span className="summary-icon" aria-hidden="true" />
                    <div>
                      <p>{item.label}</p>
                      <strong>{item.value}</strong>
                      <span>{item.unit}</span>
                    </div>
                  </article>
                );
              })}
            </section>

            {isChemistryParticipationOpen && (
              <ParticipationInstitutionDialog
                rows={chemistryParticipationRows}
                title="전체 참여기관 리스트"
                excelFileName="전체_참여기관리스트.xlsx"
                onClose={() => setIsChemistryParticipationOpen(false)}
              />
            )}

            {isChemistryTestListOpen && (
              <ChemistryTestListDialog
                rows={chemistryTestListRows}
                onClose={() => setIsChemistryTestListOpen(false)}
              />
            )}

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
                  selectedTestIndex={selection.testIndex}
                />
              </article>

              <article className="panel detail-panel">
                <div className="panel-head">
                  <h3>선택한 검사 상세</h3>
                </div>
                <SelectedTestDetail
                  data={chemistryDashboardData}
                  selection={selection}
                  statisticsRows={chemistryStatisticsRows}
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
                <TrendLineChart
                  data={chemistryDashboardData}
                  selection={selection}
                />
              </article>
            </section>
          </>
        ) : activeTab === "nonconformance" ? (
          <NonconformanceAnalysis rows={chemistryRows} />
        ) : activeTab === "statistics-quantitative" ? (
          <StatisticsDetail rows={chemistryStatisticsRows} />
        ) : activeTab === "trend" ? (
          <TrendAnalysis periodRows={chemistryTrendPeriodRows} />
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
