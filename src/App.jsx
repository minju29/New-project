import { useEffect, useRef, useState } from "react";
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
  PointElement,
  Tooltip,
} from "chart.js";
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

const urineImageSpecimenPreview = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460">
    <rect width="720" height="460" fill="#f6f8fb"/>
    <rect x="52" y="42" width="616" height="376" rx="22" fill="#ffffff" stroke="#d6dee9" stroke-width="3"/>
    <rect x="93" y="82" width="260" height="296" rx="15" fill="#f2f5f9" stroke="#d1dbe8" stroke-width="2"/>
    <rect x="123" y="116" width="200" height="228" rx="9" fill="#fff7d6" stroke="#ead998" stroke-width="2"/>
    <g opacity="0.9">
      <rect x="145" y="140" width="155" height="22" rx="4" fill="#f6da64"/>
      <rect x="145" y="174" width="155" height="22" rx="4" fill="#f1bd50"/>
      <rect x="145" y="208" width="155" height="22" rx="4" fill="#e9925b"/>
      <rect x="145" y="242" width="155" height="22" rx="4" fill="#d7656d"/>
      <rect x="145" y="276" width="155" height="22" rx="4" fill="#9a5fa6"/>
      <rect x="145" y="310" width="155" height="22" rx="4" fill="#5676b9"/>
    </g>
    <rect x="394" y="94" width="218" height="54" rx="10" fill="#eef2f7"/>
    <rect x="394" y="176" width="218" height="54" rx="10" fill="#fff2f6"/>
    <rect x="394" y="258" width="218" height="54" rx="10" fill="#eef8f0"/>
    <circle cx="419" cy="121" r="9" fill="#0869f4"/>
    <circle cx="419" cy="203" r="9" fill="#a00056"/>
    <circle cx="419" cy="285" r="9" fill="#11a940"/>
    <rect x="442" y="112" width="128" height="10" rx="5" fill="#718096"/>
    <rect x="442" y="130" width="92" height="8" rx="4" fill="#a6b1c2"/>
    <rect x="442" y="194" width="132" height="10" rx="5" fill="#718096"/>
    <rect x="442" y="212" width="104" height="8" rx="4" fill="#a6b1c2"/>
    <rect x="442" y="276" width="118" height="10" rx="5" fill="#718096"/>
    <rect x="442" y="294" width="96" height="8" rx="4" fill="#a6b1c2"/>
  </svg>
`)}`;

const urineUnacceptableRateData = {
  specimens: [
    { key: "CU-25-01", color: "#0869f4" },
    { key: "CU-25-02", color: "#ff7a00" },
    { key: "CU-25-03", color: "#25a636" },
    { key: "CUI-25-01", color: "#a00056" },
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
  "#a00056",
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

function downloadUrineInstitutionCsv({ selectedTest, selectedSpecimen, rows }) {
  const headers = [
    "No",
    "기관코드",
    "기관명",
    "검체명",
    "검사명",
    "결과",
    "제조사명",
    "정답",
    "기준분류SDI",
    "세부SDI",
  ];
  const csvRows = [
    headers,
    ...rows.map((row, index) => [
      index + 1,
      row["기관코드"],
      row["기관명"],
      row["검체명"],
      row["검사명"],
      row["rslt"],
      row["제조사명"],
      row["정답"],
      row["기준SDI"],
      row["세부SDI"],
    ]),
  ];
  const csv = csvRows
    .map((row) =>
      row
        .map((value) => {
          const cell = formatUrineCell(value);
          return `"${String(cell).replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const safeFileName =
    `${selectedTest.name}_${selectedSpecimen.key}_Unacceptable기관목록`.replace(
      /[\\/:*?"<>|]/g,
      "_",
    );
  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

const qualitativeBaseColumns = [
  { key: "프로그램명", label: "프로그램명", className: "col-program", type: "text" },
  { key: "상위검사명", label: "상위검사명", className: "col-parent-test", type: "text" },
  { key: "검사명", label: "검사명", className: "col-test", type: "text" },
  { key: "검체명", label: "검체명", className: "col-specimen", type: "text" },
  { key: "기준분류", label: "기준분류", className: "col-category", type: "text" },
  { key: "보고된 결과", label: "보고된 결과", className: "col-result number-cell", type: "text" },
];

const qualitativeSelectionColumns = [
  { key: "결과선택기관수_전체", label: "전체", className: "col-count number-cell", type: "number" },
  { key: "결과선택기관수_선택", label: "선택", className: "col-count number-cell", type: "number" },
  { key: "결과선택기관수_비율", label: "비율", className: "col-rate number-cell", type: "number" },
];

const qualitativeExpectedColumns = [
  { key: "예상 정답(INTENDED)", label: "예상 정답", className: "col-answer qualitative-expected-cell", type: "text", cellType: "answer" },
  { key: "예상 Remark", label: "예상 Remark", className: "col-remark qualitative-expected-cell", type: "text", cellType: "remark" },
  { key: "예상 판정", label: "예상 판정", className: "col-judgment qualitative-expected-cell", type: "text", cellType: "judgment" },
];

const qualitativeOperatorColumns = [
  { key: "운영자 정답(INTENDED)", label: "운영자 정답", className: "col-answer qualitative-operator-cell", type: "text", cellType: "answer" },
  { key: "운영자 Remark", label: "운영자 Remark", className: "col-remark qualitative-operator-cell", type: "text", cellType: "remark" },
  { key: "운영자 판정", label: "운영자 판정", className: "col-judgment qualitative-operator-cell", type: "text", cellType: "judgment" },
];

const qualitativeCompareColumn = {
  key: "예상&운영자 정답 및 판정비교",
  label: "예상&운영자 정답 및 판정비교",
  className: "col-compare qualitative-compare-cell",
  type: "text",
  cellType: "comparison",
};

const qualitativeColumns = [
  ...qualitativeBaseColumns,
  ...qualitativeSelectionColumns,
  ...qualitativeExpectedColumns,
  ...qualitativeOperatorColumns,
  qualitativeCompareColumn,
];

const urineResultDistributionAxisLabels = ["4.0", "4.5", "5.0", "5.5", "6.0", "6.5"];

const numericCompareOperators = [
  { value: "", label: "비교" },
  { value: ">=", label: "≥" },
  { value: ">", label: ">" },
  { value: "=", label: "=" },
  { value: "<=", label: "≤" },
  { value: "<", label: "<" },
];

const textCompareOperators = [
  { value: "", label: "비교" },
  { value: "contains", label: "포함" },
  { value: "equals", label: "일치" },
  { value: "notContains", label: "제외" },
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

function createDefaultStatisticsFilters() {
  return Object.fromEntries(
    statisticsColumns.map((column) => [
      column.key,
      {
        search: "",
        operator: "",
        compareValue: "",
      },
    ]),
  );
}

function compareNumberValue(cellValue, operator, compareValue) {
  if (cellValue === null || cellValue === undefined || cellValue === "")
    return false;
  const cellNumber = parseStatisticNumber(cellValue);
  const targetNumber = parseStatisticNumber(compareValue);

  if (cellNumber === null || targetNumber === null) return false;
  if (operator === ">=") return cellNumber >= targetNumber;
  if (operator === ">") return cellNumber > targetNumber;
  if (operator === "=") return cellNumber === targetNumber;
  if (operator === "<=") return cellNumber <= targetNumber;
  if (operator === "<") return cellNumber < targetNumber;

  return true;
}

function compareTextValue(cellValue, operator, compareValue) {
  const normalizedCellValue = String(cellValue).toLowerCase();
  const normalizedCompareValue = String(compareValue).trim().toLowerCase();

  if (!normalizedCompareValue) return true;
  if (operator === "contains")
    return normalizedCellValue.includes(normalizedCompareValue);
  if (operator === "equals")
    return normalizedCellValue === normalizedCompareValue;
  if (operator === "notContains")
    return !normalizedCellValue.includes(normalizedCompareValue);

  return true;
}

function rowMatchesStatisticsFilters(row, filters, appliedComparisons) {
  return statisticsColumns.every((column) => {
    const filter = filters[column.key] ?? {};
    const comparisonFilter = appliedComparisons[column.key] ?? {};
    const rawValue = row[column.key];
    const displayValue = formatStatisticValue(row, column);
    const searchValue = filter.search.trim().toLowerCase();

    if (
      searchValue &&
      !String(displayValue).toLowerCase().includes(searchValue)
    ) {
      return false;
    }

    if (
      !comparisonFilter.operator ||
      !String(comparisonFilter.compareValue).trim()
    ) {
      return true;
    }

    if (column.type === "number") {
      return compareNumberValue(
        rawValue,
        comparisonFilter.operator,
        comparisonFilter.compareValue,
      );
    }

    return compareTextValue(
      rawValue,
      comparisonFilter.operator,
      comparisonFilter.compareValue,
    );
  });
}

function rowMatchesStatisticsScope(row, scope) {
  const hasBaseCategory = Boolean(row.baseCategory);
  const hasDetailCategory = Boolean(row.detailCategory);

  if (scope === "overall") return !hasBaseCategory && !hasDetailCategory;
  if (scope === "base") return hasBaseCategory && !hasDetailCategory;
  if (scope === "detail") return hasDetailCategory;

  return true;
}

function sortStatisticsRows(rows, sortConfig) {
  if (!sortConfig.key) return rows;

  const column = statisticsColumns.find(
    (statisticsColumn) => statisticsColumn.key === sortConfig.key,
  );
  if (!column) return rows;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = left.row[column.key];
      const rightValue = right.row[column.key];
      const leftIsEmpty =
        leftValue === null || leftValue === undefined || leftValue === "";
      const rightIsEmpty =
        rightValue === null || rightValue === undefined || rightValue === "";

      if (leftIsEmpty && rightIsEmpty) return left.index - right.index;
      if (leftIsEmpty) return 1;
      if (rightIsEmpty) return -1;

      let comparison;

      if (column.type === "number") {
        comparison =
          parseStatisticNumber(leftValue) - parseStatisticNumber(rightValue);
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), "ko", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (comparison === 0) return left.index - right.index;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    })
    .map((item) => item.row);
}

function getStatisticsRows() {
  return statisticsRows;
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

function downloadInstitutionExcel({ selectedTest, selectedSpecimen, rows }) {
  const tableRows = rows.map((row, index) => ({
    no: index + 1,
    ...row,
  }));
  const safeFileName =
    `${selectedTest.code}_${selectedSpecimen.key}_기관목록`.replace(
      /[\\/:*?"<>|]/g,
      "_",
    );

  const headerCells = institutionColumns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join("");
  const bodyRows = tableRows
    .map(
      (row) =>
        `<tr>${institutionColumns
          .map(
            (column) =>
              `<td style="mso-number-format:'\\@';">${escapeHtml(row[column.key] ?? "")}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: 'Malgun Gothic', Arial, sans-serif; font-size: 11pt; }
          th { background: #f3f5f8; font-weight: 700; }
          th, td { border: 1px solid #d5dce8; padding: 6px 8px; text-align: left; white-space: nowrap; }
          caption { padding: 8px 0 10px; font-weight: 700; text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <caption>${escapeHtml(selectedTest.name)} / ${escapeHtml(selectedSpecimen.key)} Unacceptable 기관 목록</caption>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadStatisticsExcel({ rows, scopeLabel, sortConfig }) {
  const safeDate = new Date().toISOString().slice(0, 10);
  const safeFileName = `검체별_기본통계_${safeDate}`.replace(
    /[\\/:*?"<>|]/g,
    "_",
  );
  const sortColumn = statisticsColumns.find(
    (column) => column.key === sortConfig.key,
  );
  const sortText = sortColumn
    ? `${sortColumn.label} ${sortConfig.direction === "asc" ? "오름차순" : "내림차순"}`
    : "정렬 없음";

  const headerCells = statisticsColumns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${statisticsColumns
          .map((column) => {
            const value = row[column.key];
            const isEmpty =
              value === null || value === undefined || value === "";
            const cellValue = isEmpty ? "-" : formatStatisticValue(row, column);
            const cellStyle =
              column.type === "number" && !isEmpty
                ? `mso-number-format:'${column.key === "n" ? "#,##0" : "0.00"}'; text-align:right;`
                : "mso-number-format:'\\@';";

            return `<td style="${cellStyle}">${escapeHtml(cellValue)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: 'Malgun Gothic', Arial, sans-serif; font-size: 11pt; }
          th { background: #eef2f7; color: #151b2f; font-weight: 700; }
          th, td { border: 1px solid #d5dce8; padding: 6px 8px; text-align: left; white-space: nowrap; }
          caption { padding: 8px 0 10px; font-weight: 700; text-align: left; }
          .meta td { background: #f9fafc; color: #556174; font-weight: 700; }
        </style>
      </head>
      <body>
        <table>
          <caption>검체별 기본통계</caption>
          <tbody class="meta">
            <tr><td>통계 범위</td><td>${escapeHtml(scopeLabel)}</td></tr>
            <tr><td>정렬</td><td>${escapeHtml(sortText)}</td></tr>
            <tr><td>다운로드 row 수</td><td>${rows.length.toLocaleString()}</td></tr>
          </tbody>
        </table>
        <br />
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getMakerData(selection) {
  const selectedValue =
    unacceptableRateData.tests[selection.testIndex].values[
      selection.specimenIndex
    ];
  const bumpIndex =
    (selection.testIndex + selection.specimenIndex) % makerBaseData.length;

  return makerBaseData.map((maker, index) => ({
    ...maker,
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

function getTrendData(selection) {
  const trendPeriods = trendTableData.allPeriods.map((period) => ({
    label: period.key,
    year: period.year,
    round: period.round,
  }));
  const selectedRate =
    unacceptableRateData.tests[selection.testIndex].values[
      selection.specimenIndex
    ];
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
  const alignLeft = tooltip.caretX > chart.width / 2;

  tooltipEl.innerHTML = `
    <strong>${escapeHtml(maker.name)}</strong>
    <span>${maker.count} 기관 (${formatPercent((maker.count / total) * 100)})</span>
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

function UnacceptableRateChart({ onSelect }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const baseChartWidth = Math.max(860, unacceptableRateData.tests.length * 36);
  const chartWidth = Math.round(baseChartWidth * zoomLevel);

  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));

  const changeZoom = (nextZoom) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: unacceptableRateData.tests.map((test) => test.code),
        datasets: unacceptableRateData.specimens.map(
          (specimen, specimenIndex) => ({
            label: specimen.key,
            data: unacceptableRateData.tests.map(
              (test) => test.values[specimenIndex],
            ),
            backgroundColor: specimen.color,
            borderColor: specimen.color,
            borderRadius: 2,
            barPercentage: 0.78,
            categoryPercentage: 0.7,
          }),
        ),
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
                return unacceptableRateData.tests[items[0].dataIndex].name;
              },
              label(item) {
                return `${item.dataset.label}: ${formatPercent(item.parsed.y)}`;
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
            max: 8,
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
  }, [onSelect]);

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
          {unacceptableRateData.specimens.map((specimen) => (
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
      aria-label="제조사별 Unacceptable 기관 수 비율 도넛 차트"
    />
  );
}

function TrendLineChart({ selection }) {
  const canvasRef = useRef(null);
  const selectedTest = unacceptableRateData.tests[selection.testIndex];
  const selectedSpecimen =
    unacceptableRateData.specimens[selection.specimenIndex];

  useEffect(() => {
    const trendData = getTrendData(selection);
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
    selectedSpecimen.key,
    selectedTest.name,
  ]);

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

function SelectedTestDetail({ selection }) {
  const [showInstitutionGrid, setShowInstitutionGrid] = useState(false);
  const [institutionPage, setInstitutionPage] = useState(1);
  const selectedTest = unacceptableRateData.tests[selection.testIndex];
  const selectedSpecimen =
    unacceptableRateData.specimens[selection.specimenIndex];
  const makers = getMakerData(selection);
  const total = makers.reduce((sum, maker) => sum + maker.count, 0);
  const selectedInstitutionRows = getInstitutionRowsForMakers(makers);
  const institutionTotalPages = Math.max(
    1,
    Math.ceil(selectedInstitutionRows.length / institutionPageSize),
  );
  const institutionStartIndex = (institutionPage - 1) * institutionPageSize;
  const visibleInstitutionRows = selectedInstitutionRows.slice(
    institutionStartIndex,
    institutionStartIndex + institutionPageSize,
  );
  const institutionEndIndex = Math.min(
    institutionStartIndex + visibleInstitutionRows.length,
    selectedInstitutionRows.length,
  );

  useEffect(() => {
    setShowInstitutionGrid(false);
    setInstitutionPage(1);
  }, [selection.testIndex, selection.specimenIndex]);

  const toggleInstitutionGrid = () => {
    if (!showInstitutionGrid) {
      setInstitutionPage(1);
    }
    setShowInstitutionGrid((current) => !current);
  };

  const moveInstitutionPage = (nextPage) => {
    setInstitutionPage(Math.min(institutionTotalPages, Math.max(1, nextPage)));
  };

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

      <h4>제조사별 Unacceptable 기관 수 비율 ({selectedSpecimen.key} 기준)</h4>
      <div className="donut-layout">
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
            <strong>총 {total}개</strong>
            <span>기관</span>
          </div>
        </div>
        <div className="maker-list">
          {makers.map((maker) => (
            <div className="maker-item" key={maker.name}>
              <i style={{ backgroundColor: maker.color }} />
              <b>{maker.name}</b>
              <span>
                {maker.count} 기관 ({formatPercent((maker.count / total) * 100)}
                )
              </span>
            </div>
          ))}
        </div>
      </div>

      {showInstitutionGrid && (
        <div className="institution-list" id="institution-list-grid">
          <div className="institution-list-head">
            <h4>Unacceptable 기관 목록</h4>
            <div className="institution-list-actions">
              <span>
                전체 {selectedInstitutionRows.length}개 중{" "}
                {institutionStartIndex + 1}-{institutionEndIndex} 표시
              </span>
              <button
                type="button"
                className="excel-button"
                onClick={() =>
                  downloadInstitutionExcel({
                    selectedTest,
                    selectedSpecimen,
                    rows: selectedInstitutionRows,
                  })
                }
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
          <div
            className="institution-grid"
            role="grid"
            aria-label="Unacceptable 기관 목록"
          >
            <div
              className="institution-grid-row institution-grid-header"
              role="row"
            >
              {institutionColumns.map((column) => (
                <span role="columnheader" key={column.key}>
                  {column.label}
                </span>
              ))}
            </div>
            {visibleInstitutionRows.map((row, index) => (
              <div
                className="institution-grid-row"
                role="row"
                key={`${row.code}-${row.instrument}`}
              >
                {institutionColumns.map((column) => (
                  <span role="gridcell" key={column.key}>
                    {column.key === "no"
                      ? institutionStartIndex + index + 1
                      : row[column.key]}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="institution-pagination" aria-label="기관 목록 페이지">
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={institutionPage === 1}
              onClick={() => moveInstitutionPage(institutionPage - 1)}
            >
              ‹
            </button>
            {Array.from({ length: institutionTotalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  type="button"
                  className={
                    pageNumber === institutionPage ? "active" : undefined
                  }
                  aria-current={
                    pageNumber === institutionPage ? "page" : undefined
                  }
                  key={pageNumber}
                  onClick={() => moveInstitutionPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="다음 페이지"
              disabled={institutionPage === institutionTotalPages}
              onClick={() => moveInstitutionPage(institutionPage + 1)}
            >
              ›
            </button>
            <span>10개씩 보기</span>
          </div>
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
  const [gridTooltip, setGridTooltip] = useState(null);
  const hasAnswerColumn = columns.some((column) => column.key === "answer");
  const showsOnlyResultAndAnswer =
    hasAnswerColumn &&
    columns.length === urineSedimentNonconformanceInstitutionColumns.length;
  const rowClassName = `institution-grid-row${
    hasAnswerColumn ? " has-answer-column" : ""
  }${showsOnlyResultAndAnswer ? " sediment-result-grid" : ""}`;

  const hideGridTooltip = () => {
    setGridTooltip(null);
  };

  const showGridTooltip = (event, value) => {
    const text = String(value ?? "");

    if (!text) {
      setGridTooltip(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const hasRoomAbove = rect.top > 90;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, 20),
      window.innerWidth - 20,
    );
    const top = hasRoomAbove ? rect.top - 8 : rect.bottom + 8;

    setGridTooltip({
      text,
      left,
      top,
      placement: hasRoomAbove ? "above" : "below",
    });
  };

  const renderGridCell = (value, key) => {
    const text = String(value ?? "");

    return (
      <span
        key={key}
        className={`institution-grid-cell institution-grid-cell-${key}`}
        role="gridcell"
        title={text}
        tabIndex={text ? 0 : undefined}
        onMouseEnter={(event) => showGridTooltip(event, text)}
        onMouseLeave={hideGridTooltip}
        onFocus={(event) => showGridTooltip(event, text)}
        onBlur={hideGridTooltip}
      >
        {text}
      </span>
    );
  };

  return (
    <div className="nonconformance-list" id="nonconformance-institution-list">
      <div className="institution-list-head">
        <h4>
          {selectedTest.code} / {selectedSpecimen.key} Unacceptable 기관 목록
        </h4>
        <div className="institution-list-actions">
          <span>전체 {rows.length}개 기관</span>
          <button type="button" className="excel-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
      <div
        className="institution-grid"
        role="grid"
        aria-label="부적합 분석 Unacceptable 기관 목록"
        onScroll={hideGridTooltip}
      >
        <div className={`${rowClassName} institution-grid-header`} role="row">
          {columns.map((column) => {
            const description = institutionColumnDescriptions[column.key];

            return (
              <span
                role="columnheader"
                key={column.key}
                title={description}
                tabIndex={description ? 0 : undefined}
                onMouseEnter={(event) => showGridTooltip(event, description)}
                onMouseLeave={hideGridTooltip}
                onFocus={(event) => showGridTooltip(event, description)}
                onBlur={hideGridTooltip}
              >
                {column.label}
                {description && (
                  <i className="column-indicator" aria-hidden="true">
                    i
                  </i>
                )}
              </span>
            );
          })}
        </div>
        {rows.map((row, index) => (
          <div
            className={rowClassName}
            role="row"
            key={`${row.code}-${row.specimenKey ?? row.specimen ?? selectedSpecimen.key}-${index}`}
          >
            {columns.map((column) =>
              renderGridCell(
                column.key === "no" ? index + 1 : row[column.key],
                column.key,
              ),
            )}
          </div>
        ))}
      </div>
      {gridTooltip && (
        <div
          className={`grid-cell-tooltip ${
            gridTooltip.placement === "below" ? "is-below" : ""
          }`}
          role="tooltip"
          style={{
            left: `${gridTooltip.left}px`,
            top: `${gridTooltip.top}px`,
          }}
        >
          {gridTooltip.text}
        </div>
      )}
    </div>
  );
}

function NonconformanceSdiChart({ selectedTestIndex, onSelectTest }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const selectedTest = unacceptableRateData.tests[selectedTestIndex];
  const baseChartWidth = Math.max(1640, unacceptableRateData.tests.length * 64);
  const chartWidth = Math.round(baseChartWidth * zoomLevel);
  const clampZoom = (nextZoom) => Math.min(2, Math.max(0.75, nextZoom));

  const changeZoom = (nextZoom) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: unacceptableRateData.tests.map((test) => test.code),
        datasets: unacceptableRateData.specimens.map(
          (specimen, specimenIndex) => ({
            label: specimen.key,
            data: unacceptableRateData.tests.map((_test, testIndex) =>
              getSdiValue(testIndex, specimenIndex),
            ),
            backgroundColor: unacceptableRateData.tests.map(
              (_test, testIndex) =>
                testIndex === selectedTestIndex
                  ? specimen.color
                  : colorWithAlpha(specimen.color, 0.24),
            ),
            borderColor: unacceptableRateData.tests.map((_test, testIndex) =>
              testIndex === selectedTestIndex
                ? specimen.color
                : colorWithAlpha(specimen.color, 0.44),
            ),
            borderWidth: 1,
            borderRadius: 2,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
          }),
        ),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        onClick(_event, elements) {
          if (!elements.length) return;
          onSelectTest(elements[0].index);
        },
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
                return unacceptableRateData.tests[items[0].dataIndex].code;
              },
              label(item) {
                return `${item.dataset.label} SDI: ${item.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "검사항목",
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
              color(context) {
                return context.index === selectedTestIndex
                  ? "#a00056"
                  : "#1f2d4d";
              },
              font(context) {
                return {
                  size: 10,
                  weight: context.index === selectedTestIndex ? "800" : "600",
                };
              },
              maxRotation: 0,
              minRotation: 0,
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
  }, [onSelectTest, selectedTestIndex]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [chartWidth]);

  useEffect(() => {
    const scrollNode = scrollRef.current;
    if (!scrollNode) return;

    const categoryWidth = chartWidth / unacceptableRateData.tests.length;
    const selectedCenter =
      categoryWidth * selectedTestIndex + categoryWidth / 2;
    const maxScrollLeft = Math.max(
      0,
      scrollNode.scrollWidth - scrollNode.clientWidth,
    );
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, selectedCenter - scrollNode.clientWidth / 2),
    );

    scrollNode.scrollTo({
      left: nextScrollLeft,
      behavior: "smooth",
    });
  }, [chartWidth, selectedTestIndex]);

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
    <div className="sdi-chart">
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="SDI 검체 범례">
          {unacceptableRateData.specimens.map((specimen) => (
            <span key={specimen.key}>
              <i style={{ backgroundColor: specimen.color }} />
              {specimen.key}
            </span>
          ))}
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
      <p className="sdi-selection">선택 검사: {selectedTest.code}</p>
      <div
        ref={scrollRef}
        className="chart-scroll"
        aria-label="검사항목별 SDI 그래프 스크롤 영역"
      >
        <div className="sdi-canvas" style={{ width: `${chartWidth}px` }}>
          <canvas ref={canvasRef} aria-label="검사항목별 SDI 분포 막대그래프" />
        </div>
      </div>
    </div>
  );
}

function NonconformanceAnalysis() {
  const [selectedTestIndex, setSelectedTestIndex] = useState(0);
  const [institutionTarget, setInstitutionTarget] = useState(null);
  const selectedTest = unacceptableRateData.tests[selectedTestIndex];
  const selectedTargetTest = institutionTarget
    ? unacceptableRateData.tests[institutionTarget.testIndex]
    : null;
  const selectedTargetSpecimen = institutionTarget
    ? unacceptableRateData.specimens[institutionTarget.specimenIndex]
    : null;
  const selectedRows = institutionTarget
    ? getNonconformanceInstitutionRows(
        institutionTarget.testIndex,
        institutionTarget.specimenIndex,
      )
    : [];

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

  return (
    <section className="nonconformance-view">
      <article className="panel nonconformance-card-panel">
        <div className="panel-head">
          <div>
            <h3>검사항목별 Unacceptable 상세현황</h3>
            <p>검체별 비교를 통해 특정 검체 문제 여부 파악</p>
          </div>
          <span>선택 검사: {selectedTest.code}</span>
        </div>

        <div
          className="unacc-card-scroll"
          aria-label="검사항목별 Unacceptable 상세현황 카드 목록"
        >
          <div className="unacc-card-grid">
            {unacceptableRateData.tests.map((test, testIndex) => {
              const totalUnacceptableCount =
                getTotalUnacceptableInstitutionCount(testIndex);
              const isSelected = selectedTestIndex === testIndex;

              return (
                <article
                  className={`unacc-card${isSelected ? " selected" : ""}`}
                  key={test.code}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => selectCard(testIndex)}
                  onKeyDown={(event) => handleCardKeyDown(event, testIndex)}
                >
                  <div className="unacc-card-title">
                    <h4>{test.code}</h4>
                  </div>

                  <div className="unacc-card-metrics">
                    <div>
                      <span>참여기관</span>
                      <strong>
                        {getParticipatingCount(testIndex).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span>1개이상 Unacc판정받은기관</span>
                      <strong className="danger">
                        {totalUnacceptableCount || "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="unacc-specimen-grid">
                    {unacceptableRateData.specimens.map(
                      (specimen, specimenIndex) => {
                        const count = getUnacceptableInstitutionCount(
                          testIndex,
                          specimenIndex,
                        );

                        return (
                          <div
                            className="unacc-specimen-cell"
                            key={specimen.key}
                          >
                            <span>{specimen.key}</span>
                            <b>{formatPercent(test.values[specimenIndex])}</b>
                            <button
                              type="button"
                              className="unacc-count-button"
                              aria-controls="nonconformance-institution-list"
                              aria-expanded={
                                institutionTarget?.testIndex === testIndex &&
                                institutionTarget?.specimenIndex ===
                                  specimenIndex
                              }
                              onClick={(event) =>
                                toggleInstitutionList(
                                  event,
                                  testIndex,
                                  specimenIndex,
                                )
                              }
                            >
                              {count}기관
                            </button>
                          </div>
                        );
                      },
                    )}
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
            <h3>검사항목별 SDI 분포</h3>
            <p>상단 카드에서 검사를 선택하면 해당 검사가 강조됩니다</p>
          </div>
          <span>단위: SDI</span>
        </div>
        <NonconformanceSdiChart
          selectedTestIndex={selectedTestIndex}
          onSelectTest={setSelectedTestIndex}
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

function getQualitativeJudgmentClass(value) {
  return String(value).toLowerCase() === "unacceptable"
    ? "is-unacceptable"
    : "is-acceptable";
}

function getQualitativeComparisonClass(value) {
  return String(value).toLowerCase() === "different"
    ? "is-different"
    : "is-same";
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

function formatQualitativeDisplayValue(row, column) {
  const value = row[column.key];

  if (column.key === "결과선택기관수_비율") return formatQualitativeRate(value);
  if (
    column.key === "결과선택기관수_전체" ||
    column.key === "결과선택기관수_선택"
  ) {
    return formatQualitativeCount(value);
  }
  if (column.cellType === "remark") return formatQualitativeValue(value) || "-";

  return formatQualitativeValue(value);
}

function createDefaultQualitativeFilters() {
  return Object.fromEntries(
    qualitativeColumns.map((column) => [
      column.key,
      {
        search: "",
        operator: "",
        compareValue: "",
      },
    ]),
  );
}

function rowMatchesQualitativeFilters(row, filters, appliedComparisons) {
  return qualitativeColumns.every((column) => {
    const filter = filters[column.key] ?? {};
    const comparisonFilter = appliedComparisons[column.key] ?? {};
    const rawValue = row[column.key];
    const displayValue = formatQualitativeDisplayValue(row, column);
    const searchValue = filter.search.trim().toLowerCase();

    if (
      searchValue &&
      !String(displayValue).toLowerCase().includes(searchValue)
    ) {
      return false;
    }

    if (
      !comparisonFilter.operator ||
      !String(comparisonFilter.compareValue).trim()
    ) {
      return true;
    }

    if (column.type === "number") {
      return compareNumberValue(
        rawValue,
        comparisonFilter.operator,
        comparisonFilter.compareValue,
      );
    }

    return compareTextValue(
      displayValue,
      comparisonFilter.operator,
      comparisonFilter.compareValue,
    );
  });
}

function sortQualitativeRows(rows, sortConfig) {
  if (!sortConfig.key) return rows;

  const column = qualitativeColumns.find(
    (qualitativeColumn) => qualitativeColumn.key === sortConfig.key,
  );
  if (!column) return rows;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftRawValue = left.row[column.key];
      const rightRawValue = right.row[column.key];
      const leftValue = formatQualitativeDisplayValue(left.row, column);
      const rightValue = formatQualitativeDisplayValue(right.row, column);
      const leftIsEmpty =
        leftRawValue === null || leftRawValue === undefined || leftRawValue === "";
      const rightIsEmpty =
        rightRawValue === null ||
        rightRawValue === undefined ||
        rightRawValue === "";

      if (leftIsEmpty && rightIsEmpty) return left.index - right.index;
      if (leftIsEmpty) return 1;
      if (rightIsEmpty) return -1;

      let comparison;

      if (column.type === "number") {
        comparison =
          parseStatisticNumber(leftRawValue) - parseStatisticNumber(rightRawValue);
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), "ko", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (comparison === 0) return left.index - right.index;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    })
    .map(({ row }) => row);
}

function downloadQualitativeExcel({ rows, sortConfig }) {
  const safeDate = new Date().toISOString().slice(0, 10);
  const safeFileName = `정성_판정비교_${safeDate}`.replace(
    /[\\/:*?"<>|]/g,
    "_",
  );
  const sortColumn = qualitativeColumns.find(
    (column) => column.key === sortConfig.key,
  );
  const sortText = sortColumn
    ? `${sortColumn.label} ${sortConfig.direction === "asc" ? "오름차순" : "내림차순"}`
    : "정렬 없음";
  const headerCells = qualitativeColumns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${qualitativeColumns
          .map((column) => {
            const cellValue = formatQualitativeDisplayValue(row, column);
            const cellStyle =
              column.type === "number"
                ? "mso-number-format:'0.00'; text-align:right;"
                : "mso-number-format:'\\@';";

            return `<td style="${cellStyle}">${escapeHtml(cellValue)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: 'Malgun Gothic', Arial, sans-serif; font-size: 11pt; }
          th { background: #eef2f7; color: #151b2f; font-weight: 700; }
          th, td { border: 1px solid #d5dce8; padding: 6px 8px; text-align: left; white-space: nowrap; }
          caption { padding: 8px 0 10px; font-weight: 700; text-align: left; }
          .meta td { background: #f9fafc; color: #556174; font-weight: 700; }
        </style>
      </head>
      <body>
        <table>
          <caption>검사항목별 정성 판정 비교</caption>
          <tbody class="meta">
            <tr><td>정렬</td><td>${escapeHtml(sortText)}</td></tr>
            <tr><td>다운로드 row 수</td><td>${rows.length.toLocaleString()}</td></tr>
          </tbody>
        </table>
        <br />
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function UrineQualitativeStatistics({ rows }) {
  const sourceRows = rows ?? [];
  const [filters, setFilters] = useState(createDefaultQualitativeFilters);
  const [appliedComparisons, setAppliedComparisons] = useState(
    createDefaultQualitativeFilters,
  );
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const filteredRows = sourceRows.filter((row) =>
    rowMatchesQualitativeFilters(row, filters, appliedComparisons),
  );
  const sortedRows = sortQualitativeRows(filteredRows, sortConfig);
  const hasActiveSort = Boolean(sortConfig.key);
  const hasActiveFilters = qualitativeColumns.some((column) => {
    const filter = filters[column.key];
    const comparisonFilter = appliedComparisons[column.key];

    return (
      filter.search ||
      comparisonFilter.operator ||
      comparisonFilter.compareValue
    );
  });
  const hasPendingComparisons = qualitativeColumns.some((column) => {
    const filter = filters[column.key];
    const comparisonFilter = appliedComparisons[column.key];

    return (
      filter.operator !== comparisonFilter.operator ||
      filter.compareValue !== comparisonFilter.compareValue
    );
  });

  const updateFilter = (columnKey, nextValue) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [columnKey]: {
        ...currentFilters[columnKey],
        ...nextValue,
      },
    }));
  };

  const applyComparisonFilters = () => {
    setAppliedComparisons(
      Object.fromEntries(
        qualitativeColumns.map((column) => [
          column.key,
          {
            search: "",
            operator: filters[column.key].operator,
            compareValue: filters[column.key].compareValue,
          },
        ]),
      ),
    );
  };

  const updateSort = (columnKey) => {
    setSortConfig((currentSort) => {
      if (currentSort.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }

      return {
        key: columnKey,
        direction: currentSort.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const resetSort = () => {
    setSortConfig({ key: "", direction: "asc" });
  };

  const resetFilters = () => {
    setFilters(createDefaultQualitativeFilters());
    setAppliedComparisons(createDefaultQualitativeFilters());
  };

  const renderSortHeader = (column, headerClassName, extraProps = {}) => {
    const isSorted = sortConfig.key === column.key;
    const sortLabel = isSorted
      ? sortConfig.direction === "asc"
        ? "오름차순"
        : "내림차순"
      : "정렬 없음";

    return (
      <th
        className={`${headerClassName} ${column.className}${
          isSorted ? " is-sorted" : ""
        }`}
        title={column.label}
        key={column.key}
        {...extraProps}
      >
        <button
          type="button"
          className="statistics-sort-button"
          title={column.label}
          aria-label={`${column.label} ${sortLabel}. 클릭하여 정렬`}
          onClick={() => updateSort(column.key)}
        >
          <span>{column.label}</span>
          <i aria-hidden="true">
            {isSorted ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
          </i>
        </button>
      </th>
    );
  };

  const renderFilterCell = (column) => {
    const filter = filters[column.key];
    const operators =
      column.type === "number" ? numericCompareOperators : textCompareOperators;

    return (
      <th className={column.className} key={`${column.key}-filter`}>
        <div className="statistics-filter">
          <input
            type="search"
            value={filter.search}
            placeholder="검색"
            aria-label={`${column.label} 검색`}
            onChange={(event) =>
              updateFilter(column.key, {
                search: event.target.value,
              })
            }
          />
          <div className="statistics-compare">
            <select
              value={filter.operator}
              aria-label={`${column.label} 비교 조건`}
              onChange={(event) =>
                updateFilter(column.key, {
                  operator: event.target.value,
                })
              }
            >
              {operators.map((operator) => (
                <option value={operator.value} key={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
            <input
              type={column.type === "number" ? "number" : "text"}
              value={filter.compareValue}
              placeholder="값"
              aria-label={`${column.label} 비교 값`}
              onChange={(event) =>
                updateFilter(column.key, {
                  compareValue: event.target.value,
                })
              }
            />
          </div>
        </div>
      </th>
    );
  };

  const renderBodyCell = (row, column) => {
    const cellValue = formatQualitativeDisplayValue(row, column);
    const className =
      column.cellType === "comparison"
        ? `${column.className} ${getQualitativeComparisonClass(cellValue)}`
        : column.className;

    return (
      <td className={className} title={cellValue} key={column.key}>
        {column.cellType === "answer" ? (
          <QualitativeAnswerCell value={row[column.key]} />
        ) : column.cellType === "remark" ? (
          <QualitativeRemarkCell value={row[column.key]} />
        ) : column.cellType === "judgment" ? (
          <QualitativeJudgmentCell value={row[column.key]} />
        ) : (
          cellValue
        )}
      </td>
    );
  };

  return (
    <section className="statistics-view qualitative-statistics-view">
      <article className="panel statistics-panel qualitative-statistics-panel">
        <div className="panel-head statistics-head">
          <div>
            <h3>검사항목별 정성 판정 비교</h3>
            <p>예상 정답과 운영자 정답 및 판정 차이를 한 화면에서 확인합니다</p>
          </div>
          <div className="statistics-actions">
            <span>
              전체 {sourceRows.length.toLocaleString()}건 / 표시{" "}
              {filteredRows.length.toLocaleString()}건
            </span>
            {hasPendingComparisons && <em>비교 조건 미적용</em>}
            <button
              type="button"
              className="primary"
              disabled={!hasPendingComparisons}
              onClick={applyComparisonFilters}
            >
              비교 실행
            </button>
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
            >
              필터 초기화
            </button>
            <button type="button" disabled={!hasActiveSort} onClick={resetSort}>
              정렬 초기화
            </button>
            <button
              type="button"
              disabled={sortedRows.length === 0}
              onClick={() =>
                downloadQualitativeExcel({
                  rows: sortedRows,
                  sortConfig,
                })
              }
            >
              엑셀 다운로드
            </button>
          </div>
        </div>

        <div className="qualitative-table-wrap">
          <table className="qualitative-table" aria-label="소변검사 정성 판정 비교">
            <thead>
              <tr>
                {qualitativeBaseColumns.map((column) =>
                  renderSortHeader(column, "qualitative-header-base", {
                    rowSpan: 2,
                  }),
                )}
                <th
                  className="qualitative-header-base col-selection-group"
                  colSpan={qualitativeSelectionColumns.length}
                >
                  결과선택기관수
                </th>
                <th
                  className="qualitative-header-expected"
                  colSpan={qualitativeExpectedColumns.length}
                >
                  예상 정답(INTENDED)
                </th>
                <th
                  className="qualitative-header-operator"
                  colSpan={qualitativeOperatorColumns.length}
                >
                  운영자 정답(INTENDED)
                </th>
                {renderSortHeader(
                  qualitativeCompareColumn,
                  "qualitative-header-compare",
                  { rowSpan: 2 },
                )}
              </tr>
              <tr>
                {qualitativeSelectionColumns.map((column) =>
                  renderSortHeader(column, "qualitative-header-base"),
                )}
                {qualitativeExpectedColumns.map((column) =>
                  renderSortHeader(column, "qualitative-header-expected"),
                )}
                {qualitativeOperatorColumns.map((column) =>
                  renderSortHeader(column, "qualitative-header-operator"),
                )}
              </tr>
              <tr className="statistics-filter-row qualitative-filter-row">
                {qualitativeColumns.map(renderFilterCell)}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <tr
                    key={`${row["검사명"]}-${row["검체명"]}-${row["기준분류"]}-${row["보고된 결과"]}-${index}`}
                  >
                    {qualitativeColumns.map((column) =>
                      renderBodyCell(row, column),
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="statistics-empty" colSpan={qualitativeColumns.length}>
                    조건에 맞는 정성 통계 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function StatisticsDetail({ rows: providedRows } = {}) {
  const [statisticsScope, setStatisticsScope] = useState("all");
  const [filters, setFilters] = useState(createDefaultStatisticsFilters);
  const [appliedComparisons, setAppliedComparisons] = useState(
    createDefaultStatisticsFilters,
  );
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
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
  const filteredRows = scopedRows.filter((row) =>
    rowMatchesStatisticsFilters(row, filters, appliedComparisons),
  );
  const sortedRows = sortStatisticsRows(filteredRows, sortConfig);
  const hasActiveSort = Boolean(sortConfig.key);
  const activeScopeLabel =
    statisticsScopeOptions.find((option) => option.value === statisticsScope)
      ?.label ?? "전체";
  const hasActiveFilters =
    statisticsScope !== "all" ||
    statisticsColumns.some((column) => {
      const filter = filters[column.key];
      const comparisonFilter = appliedComparisons[column.key];
      return (
        filter.search ||
        comparisonFilter.operator ||
        comparisonFilter.compareValue
      );
    });
  const hasPendingComparisons = statisticsColumns.some((column) => {
    const filter = filters[column.key];
    const comparisonFilter = appliedComparisons[column.key];

    return (
      filter.operator !== comparisonFilter.operator ||
      filter.compareValue !== comparisonFilter.compareValue
    );
  });

  const updateFilter = (columnKey, nextValue) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [columnKey]: {
        ...currentFilters[columnKey],
        ...nextValue,
      },
    }));
  };

  const applyComparisonFilters = () => {
    setAppliedComparisons(
      Object.fromEntries(
        statisticsColumns.map((column) => [
          column.key,
          {
            search: "",
            operator: filters[column.key].operator,
            compareValue: filters[column.key].compareValue,
          },
        ]),
      ),
    );
  };

  const updateSort = (columnKey) => {
    setSortConfig((currentSort) => {
      if (currentSort.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }

      return {
        key: columnKey,
        direction: currentSort.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const resetSort = () => {
    setSortConfig({ key: "", direction: "asc" });
  };

  const resetFilters = () => {
    setStatisticsScope("all");
    setFilters(createDefaultStatisticsFilters());
    setAppliedComparisons(createDefaultStatisticsFilters());
  };

  return (
    <section className="statistics-view">
      <article className="panel statistics-panel">
        <div className="panel-head statistics-head">
          <div>
            <h3>검체별 기본통계</h3>
            <p>
              컬럼별 검색과 비교 조건을 조합해 원하는 통계 row만 확인할 수
              있습니다
            </p>
          </div>
          <div className="statistics-actions">
            <span>
              전체 {rows.length.toLocaleString()}건 / 범위{" "}
              {scopedRows.length.toLocaleString()}건 / 표시{" "}
              {filteredRows.length.toLocaleString()}건
            </span>
            {hasPendingComparisons && <em>비교 조건 미적용</em>}
            <button
              type="button"
              className="primary"
              disabled={!hasPendingComparisons}
              onClick={applyComparisonFilters}
            >
              비교 실행
            </button>
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
            >
              필터 초기화
            </button>
            <button type="button" disabled={!hasActiveSort} onClick={resetSort}>
              정렬 초기화
            </button>
            <button
              type="button"
              disabled={sortedRows.length === 0}
              onClick={() =>
                downloadStatisticsExcel({
                  rows: sortedRows,
                  scopeLabel: activeScopeLabel,
                  sortConfig,
                })
              }
            >
              엑셀 다운로드
            </button>
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

        <div className="statistics-table-wrap">
          <table className="statistics-table">
            <thead>
              <tr>
                {statisticsColumns.map((column) => {
                  const isSorted = sortConfig.key === column.key;
                  const sortLabel = isSorted
                    ? sortConfig.direction === "asc"
                      ? "오름차순"
                      : "내림차순"
                    : "정렬 없음";

                  return (
                    <th
                      className={isSorted ? "is-sorted" : undefined}
                      key={column.key}
                    >
                      <button
                        type="button"
                        className="statistics-sort-button"
                        aria-label={`${column.label} ${sortLabel}. 클릭하여 정렬`}
                        onClick={() => updateSort(column.key)}
                      >
                        <span>{column.label}</span>
                        <i aria-hidden="true">
                          {isSorted
                            ? sortConfig.direction === "asc"
                              ? "▲"
                              : "▼"
                            : "↕"}
                        </i>
                      </button>
                    </th>
                  );
                })}
              </tr>
              <tr className="statistics-filter-row">
                {statisticsColumns.map((column) => {
                  const filter = filters[column.key];
                  const operators =
                    column.type === "number"
                      ? numericCompareOperators
                      : textCompareOperators;

                  return (
                    <th key={`${column.key}-filter`}>
                      <div className="statistics-filter">
                        <input
                          type="search"
                          value={filter.search}
                          placeholder="검색"
                          aria-label={`${column.label} 검색`}
                          onChange={(event) =>
                            updateFilter(column.key, {
                              search: event.target.value,
                            })
                          }
                        />
                        <div className="statistics-compare">
                          <select
                            value={filter.operator}
                            aria-label={`${column.label} 비교 조건`}
                            onChange={(event) =>
                              updateFilter(column.key, {
                                operator: event.target.value,
                              })
                            }
                          >
                            {operators.map((operator) => (
                              <option
                                value={operator.value}
                                key={operator.value}
                              >
                                {operator.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type={column.type === "number" ? "number" : "text"}
                            value={filter.compareValue}
                            placeholder="값"
                            aria-label={`${column.label} 비교 값`}
                            onChange={(event) =>
                              updateFilter(column.key, {
                                compareValue: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length > 0 ? (
                sortedRows.map((row) => (
                  <tr key={row.id}>
                    {statisticsColumns.map((column) => (
                      <td
                        className={
                          column.type === "number" ? "number-cell" : undefined
                        }
                        key={column.key}
                      >
                        {formatStatisticValue(row, column)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="statistics-empty"
                    colSpan={statisticsColumns.length}
                  >
                    조건에 맞는 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  const { periods, rows } = trendTableData;
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

        <div className="trend-table-wrap">
          <table className="trend-analysis-table">
            <thead>
              <tr>
                <th scope="col">검사항목</th>
                {periods.map((period) => (
                  <th
                    className={period.isCurrent ? "is-current" : undefined}
                    key={period.key}
                    scope="col"
                  >
                    {period.label}
                  </th>
                ))}
                <th scope="col">추세</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const changeTone = getTrendChangeTone(row.trendValue);
                const isSelected = selectedRow?.code === row.code;

                return (
                  <tr
                    className={isSelected ? "is-selected" : undefined}
                    key={row.code}
                    tabIndex={0}
                    onClick={() => selectTrendRow(row.code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectTrendRow(row.code);
                      }
                    }}
                  >
                    <th scope="row">{row.displayName}</th>
                    {row.periodValues.map((value, index) => {
                      const period = periods[index];
                      const rateTone = getTrendRateTone(value.rate);
                      const className = [
                        "trend-rate-cell",
                        `is-${rateTone}`,
                        period?.isCurrent ? "is-current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const countTitle =
                        value.rate === null
                          ? "해당 회차 데이터 없음"
                          : `Unacceptable 기관수 ${Number(
                              value.unacceptableCount,
                            ).toLocaleString()} / 검사시행 기관수 ${Number(
                              value.participatingCount,
                            ).toLocaleString()}`;

                      return (
                        <td
                          className={className}
                          key={`${row.code}-${value.periodKey}`}
                          title={countTitle}
                        >
                          {formatTrendRate(value.rate)}
                        </td>
                      );
                    })}
                    <td className={`trend-change-cell is-${changeTone}`}>
                      <span aria-hidden="true">
                        {getTrendChangeIcon(changeTone)}
                      </span>
                      {formatTrendChange(row.trendValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    <div className="modal-backdrop" role="presentation">
      <div
        className="statistics-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="statistics-confirm-title"
      >
        <h2 id="statistics-confirm-title">통계확인</h2>
        <p>{message}</p>
        <div className="statistics-confirm-actions">
          {isConfirmDialog ? (
            <>
              <button type="button" className="primary" onClick={onConfirm}>
                예
              </button>
              <button type="button" onClick={onCancel}>
                아니오
              </button>
            </>
          ) : (
            <button type="button" className="primary" onClick={onClose}>
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AppHeader({ title }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="user-menu">
        <button type="button" aria-label="알림">
          <span className="bell" />
        </button>
        <span className="avatar" aria-hidden="true" />
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
        <button
          type="button"
          disabled={isStatisticsConfirmed}
          onClick={onOpenStatisticsConfirm}
        >
          통계확인 완료
        </button>
        {isStatisticsConfirmed && (
          <button
            type="button"
            className="secondary"
            onClick={onResetStatisticsConfirm}
          >
            통계취소
          </button>
        )}
      </div>
    </section>
  );
}

function ReportTabbar({ activeTab, onTabChange, tabs = reportTabs }) {
  return (
    <nav className="tabbar" aria-label="분석 탭">
      {tabs.map((tab) => (
        <button
          type="button"
          className={activeTab === tab.id ? "active" : undefined}
          aria-current={activeTab === tab.id ? "page" : undefined}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function ImageSpecimenModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="image-specimen-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-specimen-title"
      >
        <div className="image-specimen-modal-head">
          <h2 id="image-specimen-title">이미지 검체</h2>
          <button type="button" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <img src={urineImageSpecimenPreview} alt="소변검사 이미지 검체 예시" />
      </div>
    </div>
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

function UrineUnacceptableRateChart({ onSelect }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const baseChartWidth = Math.max(860, urineUnacceptableRateData.tests.length * 78);
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
        onClick(_event, elements) {
          if (!elements.length) return;

          const [{ datasetIndex, index }] = elements;
          const value = urineUnacceptableRateData.tests[index].values[datasetIndex];
          if (value === null || value === undefined) return;

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

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [onSelect]);

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
          <div className="chart-canvas" style={{ width: `${chartWidth}px` }}>
            <canvas
              ref={canvasRef}
              aria-label="소변검사 검사항목별 Unacceptable Rate 막대그래프"
            />
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
  const [showInstitutionGrid, setShowInstitutionGrid] = useState(false);
  const [institutionPage, setInstitutionPage] = useState(1);
  const [gridTooltip, setGridTooltip] = useState(null);
  const selectedTest = urineUnacceptableRateData.tests[selection.testIndex];
  const selectedSpecimen =
    urineUnacceptableRateData.specimens[selection.specimenIndex];
  const selectedTestKey = getUrineTestKey(selectedTest);
  const selectedMakerRows = doughnutRows.filter(
    (row) =>
      row["검체명"] === selectedSpecimen.key &&
      row["검사명"] === selectedTestKey &&
      Number(row["Unacceptable rate"]) > 0,
  );
  const selectedInstitutionRows = institutionRows.filter(
    (row) =>
      row["검체명"] === selectedSpecimen.key && row["검사명"] === selectedTestKey,
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
  const total = selectedInstitutionRows.length;
  const institutionTotalPages = Math.max(
    1,
    Math.ceil(selectedInstitutionRows.length / institutionPageSize),
  );
  const institutionStartIndex = (institutionPage - 1) * institutionPageSize;
  const visibleInstitutionRows = selectedInstitutionRows.slice(
    institutionStartIndex,
    institutionStartIndex + institutionPageSize,
  );
  const institutionEndIndex = Math.min(
    institutionStartIndex + visibleInstitutionRows.length,
    selectedInstitutionRows.length,
  );

  useEffect(() => {
    setShowInstitutionGrid(false);
    setInstitutionPage(1);
    setGridTooltip(null);
  }, [selection.testIndex, selection.specimenIndex]);

  const toggleInstitutionGrid = () => {
    if (!showInstitutionGrid) {
      setInstitutionPage(1);
    }
    setShowInstitutionGrid((current) => !current);
  };

  const moveInstitutionPage = (nextPage) => {
    setGridTooltip(null);
    setInstitutionPage(Math.min(institutionTotalPages, Math.max(1, nextPage)));
  };

  const hideGridTooltip = () => {
    setGridTooltip(null);
  };

  const showGridTooltip = (event, value) => {
    const text = String(formatUrineCell(value));

    if (!text) {
      setGridTooltip(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const hasRoomAbove = rect.top > 90;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, 20),
      window.innerWidth - 20,
    );
    const top = hasRoomAbove ? rect.top - 8 : rect.bottom + 8;

    setGridTooltip({
      text,
      left,
      top,
      placement: hasRoomAbove ? "above" : "below",
    });
  };

  const renderInstitutionCell = (value) => {
    const text = String(formatUrineCell(value));

    return (
      <span
        role="gridcell"
        title={text}
        tabIndex={text ? 0 : undefined}
        onMouseEnter={(event) => showGridTooltip(event, text)}
        onMouseLeave={hideGridTooltip}
        onFocus={(event) => showGridTooltip(event, text)}
        onBlur={hideGridTooltip}
      >
        {text}
      </span>
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
          <span>선택 검체</span>
          <strong>{selectedSpecimen.key}</strong>
        </div>
      </div>

      <h4>제조사별 Unacceptable Rate ({selectedSpecimen.key} 기준)</h4>
      {makers.length > 0 ? (
        <div className="donut-layout">
          <div
            className="donut-box"
            role="button"
            tabIndex={0}
            aria-controls="urine-institution-list-grid"
            aria-expanded={showInstitutionGrid}
            onClick={toggleInstitutionGrid}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleInstitutionGrid();
              }
            }}
          >
            <UrineMakerDoughnutChart makers={makers} />
            <div className="donut-center" aria-hidden="true">
              <strong>총 {total}개</strong>
              <span>기관</span>
            </div>
          </div>
          <div className="maker-list">
            {makers.map((maker) => (
              <div className="maker-item" key={maker.name}>
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
        <div className="urine-detail-empty">표시할 제조사 데이터가 없습니다.</div>
      )}

      {showInstitutionGrid && (
        <div className="institution-list" id="urine-institution-list-grid">
          <div className="institution-list-head">
            <h4>Unacceptable 기관 목록</h4>
            <div className="institution-list-actions">
              <span>
                전체 {selectedInstitutionRows.length}개 중{" "}
                {selectedInstitutionRows.length > 0
                  ? `${institutionStartIndex + 1}-${institutionEndIndex}`
                  : "0"}
                표시
              </span>
              <button
                type="button"
                className="excel-button"
                onClick={() =>
                  downloadUrineInstitutionCsv({
                    selectedTest,
                    selectedSpecimen,
                    rows: selectedInstitutionRows,
                  })
                }
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
          <div
            className="institution-grid urine-institution-grid"
            role="grid"
            aria-label="소변검사 Unacceptable 기관 목록"
            onScroll={hideGridTooltip}
          >
            <div
              className="institution-grid-row institution-grid-header urine-institution-grid-row"
              role="row"
            >
              {[
                "No",
                "기관코드",
                "기관명",
                "검체명",
                "검사명",
                "결과",
                "제조사명",
                "정답",
                "기준분류SDI",
                "세부SDI",
              ].map((label) => (
                <span role="columnheader" key={label}>
                  {label}
                </span>
              ))}
            </div>
            {visibleInstitutionRows.map((row, index) => (
              <div
                className="institution-grid-row urine-institution-grid-row"
                role="row"
                key={`${row["기관코드"]}-${row["검체명"]}-${row["검사명"]}-${index}`}
              >
                {renderInstitutionCell(institutionStartIndex + index + 1)}
                {renderInstitutionCell(row["기관코드"])}
                {renderInstitutionCell(row["기관명"])}
                {renderInstitutionCell(row["검체명"])}
                {renderInstitutionCell(row["검사명"])}
                {renderInstitutionCell(row["rslt"])}
                {renderInstitutionCell(row["제조사명"])}
                {renderInstitutionCell(row["정답"])}
                {renderInstitutionCell(row["기준SDI"])}
                {renderInstitutionCell(row["세부SDI"])}
              </div>
            ))}
          </div>
          {gridTooltip && (
            <div
              className={`grid-cell-tooltip ${
                gridTooltip.placement === "below" ? "is-below" : ""
              }`}
              role="tooltip"
              style={{
                left: `${gridTooltip.left}px`,
                top: `${gridTooltip.top}px`,
              }}
            >
              {gridTooltip.text}
            </div>
          )}
          <div
            className="institution-pagination urine-institution-pagination"
            aria-label="기관 목록 페이지"
          >
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={institutionPage === 1}
              onClick={() => moveInstitutionPage(institutionPage - 1)}
            >
              ‹
            </button>
            <div className="urine-page-buttons">
              {Array.from({ length: institutionTotalPages }, (_, index) => (
                <button
                  type="button"
                  className={
                    institutionPage === index + 1 ? "active" : undefined
                  }
                  key={index + 1}
                  onClick={() => moveInstitutionPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="다음 페이지"
              disabled={institutionPage === institutionTotalPages}
              onClick={() => moveInstitutionPage(institutionPage + 1)}
            >
              ›
            </button>
            <span>
              {institutionPageSize}개씩 보기
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function UrineTrendLineChart({ selection, trendRows }) {
  const canvasRef = useRef(null);
  const selectedTest = urineUnacceptableRateData.tests[selection.testIndex];
  const selectedSpecimen =
    urineUnacceptableRateData.specimens[selection.specimenIndex];
  const selectedTestKey = getUrineTestKey(selectedTest);
  const selectedSpecimenOrder = getUrineSpecimenOrder(selectedSpecimen.key);
  const selectedRows = trendRows
    .filter(
      (row) =>
        row["검사명"] === selectedTestKey &&
        Number(row["횟수"]) === selectedSpecimenOrder,
    )
    .map((row) => ({
      period: `${row["회차년도"]}-${row["회차"]}`,
      count: Number(String(row["Unaccep"]).replace(/,/g, "")),
    }))
    .sort((left, right) => left.period.localeCompare(right.period));

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const lollipopLines = {
      id: "urineLollipopLines",
      beforeDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        const yScale = chart.scales.y;
        const baseY = yScale.getPixelForValue(0);
        const { ctx } = chart;

        ctx.save();
        ctx.strokeStyle = "#0d6efd";
        ctx.lineWidth = 3;
        meta.data.forEach((point) => {
          const props = point.getProps(["x", "y"], true);
          ctx.beginPath();
          ctx.moveTo(props.x, baseY);
          ctx.lineTo(props.x, props.y);
          ctx.stroke();
        });
        ctx.restore();
      },
    };

    const maxCount = Math.max(10, ...selectedRows.map((row) => row.count));
    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: selectedRows.map((row) => row.period),
        datasets: [
          {
            label: "Unacceptable 기관 수",
            data: selectedRows.map((row) => row.count),
            borderColor: "#0d6efd",
            backgroundColor: "#fff",
            pointBackgroundColor: "#fff",
            pointBorderColor: "#0d6efd",
            pointBorderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 7,
            showLine: false,
          },
        ],
      },
      plugins: [lollipopLines],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${Number(context.raw).toLocaleString()} 기관`;
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
  }, [selectedRows, selectedSpecimen.key, selectedTestKey]);

  return (
    <article className="panel trend-panel">
      <div className="panel-head">
        <div>
          <h3>선택한 검사(검체) Unacceptable 기관 수 추이</h3>
          <p>회차별 기관 수 롤리팝 차트</p>
        </div>
        <span>단위: 기관</span>
      </div>
      <div className="trend-selection">
        <span>선택 검사</span>
        <strong>{selectedTest.name}</strong>
        <span>선택 검체</span>
        <strong>{selectedSpecimen.key}</strong>
      </div>
      <div className="trend-canvas">
        <canvas
          ref={canvasRef}
          aria-label="소변검사 선택 검사 검체의 회차별 Unacceptable 기관 수 추이"
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

        <div className="trend-table-wrap">
          <table className="trend-analysis-table urine-trend-analysis-table">
            <thead>
              <tr>
                <th scope="col">검사항목 / 검체</th>
                {periods.map((period) => (
                  <th
                    className={period.isCurrent ? "is-current" : undefined}
                    key={period.key}
                    scope="col"
                  >
                    {period.label}
                  </th>
                ))}
                <th scope="col">추세</th>
              </tr>
            </thead>
            <tbody>
              {trendRows.map((row) => {
                const changeTone = getTrendChangeTone(row.trendValue);
                const isSelected = selectedRow?.code === row.code;

                return (
                  <tr
                    className={isSelected ? "is-selected" : undefined}
                    key={row.code}
                    tabIndex={0}
                    onClick={() => selectTrendRow(row.code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectTrendRow(row.code);
                      }
                    }}
                  >
                    <th scope="row">{row.displayName}</th>
                    {row.periodValues.map((value, index) => {
                      const period = periods[index];
                      const rateTone = getTrendRateTone(value.rate);
                      const className = [
                        "trend-rate-cell",
                        `is-${rateTone}`,
                        period?.isCurrent ? "is-current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const countTitle =
                        value.rate === null
                          ? "해당 회차 데이터 없음"
                          : `${value.specimenName} / Unacceptable 기관수 ${Number(
                              value.unacceptableCount,
                            ).toLocaleString()} / 참여기관수 ${Number(
                              value.participatingCount,
                            ).toLocaleString()}`;

                      return (
                        <td
                          className={className}
                          key={`${row.code}-${value.periodKey}`}
                          title={countTitle}
                        >
                          {formatTrendRate(value.rate)}
                        </td>
                      );
                    })}
                    <td className={`trend-change-cell is-${changeTone}`}>
                      <span aria-hidden="true">
                        {getTrendChangeIcon(changeTone)}
                      </span>
                      {formatTrendChange(row.trendValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

function UrineNonconformanceAnalysis({ rows, institutionRows, resultDistributionRows }) {
  const [selectedTestCode, setSelectedTestCode] = useState("");
  const [institutionTarget, setInstitutionTarget] = useState(null);
  const cards = createUrineNonconformanceCards(rows);
  const selectedCard =
    cards.find((card) => card.testCode === selectedTestCode) ?? cards[0];
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

        {selectedCard && (
          <UrineResultDistributionSection
            selectedCard={selectedCard}
            resultDistributionRows={resultDistributionRows}
            institutionTarget={institutionTarget}
          />
        )}
      </article>
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
            <section className="content-grid">
              <UrineUnacceptableRateChart onSelect={setUrineSelection} />
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
      <AppHeader title="2025년 1회차 일반화학검사" />
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
              {mockSummary.map((item) => (
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
                <UnacceptableRateChart onSelect={setSelection} />
              </article>

              <article className="panel detail-panel">
                <div className="panel-head">
                  <h3>선택한 검사 상세</h3>
                </div>
                <SelectedTestDetail selection={selection} />
              </article>

              <article className="panel trend-panel">
                <div className="panel-head">
                  <div>
                    <h3>선택한 검사(검체) Unacceptable 기관 수 추이</h3>
                    <p>회차별 기관 수 롤리팝 차트</p>
                  </div>
                  <span>단위: 기관</span>
                </div>
                <TrendLineChart selection={selection} />
              </article>
            </section>
          </>
        ) : activeTab === "nonconformance" ? (
          <NonconformanceAnalysis />
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
