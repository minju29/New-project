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

const reportTabs = [
  { id: "overview", label: "종합 현황" },
  { id: "nonconformance", label: "부적합 분석" },
  { id: "statistics", label: "통계상세" },
  { id: "trend", label: "추이분석" },
];

const unacceptableRateData = {
  specimens: [
    { key: "CC-25-01", color: "#0869f4" },
    { key: "CC-25-02", color: "#ff7a00" },
    { key: "CC-25-03", color: "#25a636" },
  ],
  tests: [
    { code: "ALT", name: "Alanine transferase (ALT)", values: [1.67, 1.89, 1.12] },
    { code: "ALB", name: "Albumin", values: [0.64, 0.91, 0.72] },
    { code: "ALP", name: "Alkaline phosphatase", values: [0.25, 0.43, 0.51] },
    { code: "Amylase", name: "Amylase", values: [0.55, 0.59, 0.68] },
    { code: "AST", name: "Aspartate aminotransferase", values: [0.18, 0.12, 0.21] },
    { code: "BUN", name: "Blood urea nitrogen", values: [0.31, 0.58, 0.86] },
    { code: "Calcium (Ca)", name: "Calcium (Ca)", values: [1.38, 1.18, 1.01] },
    { code: "Chloride (Cl)", name: "Chloride (Cl)", values: [1.03, 1.06, 0.33] },
    { code: "Creatinine", name: "Creatinine", values: [0.29, 0.14, 0.05] },
    { code: "Direct bilirubin", name: "Direct bilirubin", values: [0.55, 0.27, 0.13] },
    { code: "GGT", name: "Gamma-GT", values: [4.67, 5.58, 3.62] },
    { code: "Glucose", name: "Glucose", values: [1.58, 1.62, 1.04] },
    { code: "HDL-C", name: "HDL cholesterol", values: [4.98, 5.78, 4.75] },
    { code: "Iron (Fe)", name: "Iron (Fe)", values: [1.2, 3.26, 0.94] },
    { code: "LDL-C", name: "LDL cholesterol", values: [0.22, 0.27, 0.28] },
    { code: "LDL-c", name: "LDL-c", values: [0.31, 0.76, 0.42] },
    { code: "Phosphorus (P)", name: "Phosphorus (P)", values: [3.3, 4.75, 3.8] },
    { code: "Potassium (K)", name: "Potassium (K)", values: [0.28, 0.41, 0.2] },
    { code: "Sodium (Na)", name: "Sodium (Na)", values: [0.54, 0.74, 0.87] },
    { code: "Total bilirubin", name: "Total bilirubin", values: [0.82, 1.39, 0.58] },
    { code: "Total CO2", name: "Total CO2", values: [0.46, 0.33, 0.21] },
    { code: "Total cholesterol", name: "Total cholesterol", values: [2.95, 4.25, 3.34] },
    { code: "Total protein", name: "Total protein", values: [0.62, 1.19, 0.41] },
    { code: "Urea nitrogen", name: "Urea nitrogen", values: [0.19, 0.27, 0.16] },
    { code: "Uric Acid (UA)", name: "Uric Acid (UA)", values: [1.93, 4.1, 3.08] },
  ],
};

const makerBaseData = [
  { name: "Roche", count: 7, color: "#0869f4" },
  { name: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.", count: 6, color: "#7954dd" },
  { name: "SNIBE Co.,Ltd", count: 4, color: "#0894b5" },
  { name: "Biotecnica", count: 3, color: "#db2877" },
  { name: "(주)대성메디텍", count: 1, color: "#f59e0b" },
  { name: "Biosystems", count: 1, color: "#51ad3f" },
  { name: "Tokyo Boeki Medisys Inc.", count: 1, color: "#f97316" },
];

const institutionRows = [
  { code: "1000003010", name: "로터요양병원", result: "0123", standardSdi: "-6.04", detailSdi: "-6.93", maker: "(주)대성메디텍", instrument: "Others" },
  { code: "1000002102", name: "큰사랑 요양병원", result: "222", standardSdi: "4.96", detailSdi: "4.58", maker: "Biosystems", instrument: "A15" },
  { code: "1000001870", name: "속편한내과 서울암검", result: "0057", standardSdi: "-13.38", detailSdi: "-12.53", maker: "Biotecnica", instrument: "BT 1500" },
  { code: "1000001183", name: "권오윤내과의원", result: "259", standardSdi: "9.07", detailSdi: "9.91", maker: "Biotecnica", instrument: "BT 1500" },
  { code: "1000003612", name: "인새운혜내과의원", result: "145", standardSdi: "-3.60", detailSdi: "-3.74", maker: "Biotecnica", instrument: "BT 1500" },
  { code: "1000002030", name: "울산백구보건소", result: "165", standardSdi: "-", detailSdi: "-", maker: "Roche", instrument: "cobas4000 c311" },
  { code: "100000P074", name: "분당구보건소", result: "0230", standardSdi: "5.84", detailSdi: "22.96", maker: "Roche", instrument: "cobas4000 c311" },
  { code: "1000001523", name: "동순천 내과의원", result: "212", standardSdi: "3.84", detailSdi: "16.54", maker: "Roche", instrument: "cobas c111" },
  { code: "1000000541", name: "동아병원", result: "0178", standardSdi: "3.17", detailSdi: "4.14", maker: "Roche", instrument: "cobas pro c503" },
  { code: "1000001002", name: "온누리병원", result: "154", standardSdi: "-3.69", detailSdi: "-4.43", maker: "Roche", instrument: "cobas pure c303" },
  { code: "1000004421", name: "서울중앙검진센터", result: "187", standardSdi: "4.21", detailSdi: "5.02", maker: "SNIBE Co.,Ltd", instrument: "MAGLUMI X8" },
  { code: "1000003921", name: "한마음내과", result: "201", standardSdi: "-4.88", detailSdi: "-5.16", maker: "SNIBE Co.,Ltd", instrument: "MAGLUMI 4000" },
  { code: "1000003220", name: "새빛의원", result: "0182", standardSdi: "5.42", detailSdi: "6.10", maker: "SNIBE Co.,Ltd", instrument: "MAGLUMI 800" },
  { code: "1000002782", name: "미래검사센터", result: "097", standardSdi: "-5.10", detailSdi: "-5.34", maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.", instrument: "BS-600M" },
  { code: "1000002442", name: "푸른내과의원", result: "176", standardSdi: "3.99", detailSdi: "4.72", maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.", instrument: "BS-800M" },
  { code: "1000002388", name: "삼성드림병원", result: "0204", standardSdi: "-6.11", detailSdi: "-6.55", maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.", instrument: "BS-2000M" },
  { code: "1000002129", name: "강남메디컬센터", result: "164", standardSdi: "6.18", detailSdi: "7.03", maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.", instrument: "BS-600M" },
  { code: "1000001988", name: "우리들병원", result: "0133", standardSdi: "-4.37", detailSdi: "-4.96", maker: "Shenzhen Mindray Bio-Medical Electronics Co., Ltd.", instrument: "BS-800M" },
  { code: "1000001765", name: "정다운의원", result: "219", standardSdi: "4.04", detailSdi: "4.56", maker: "Biotecnica", instrument: "BT 3000" },
  { code: "1000001531", name: "해피검진의학과", result: "0105", standardSdi: "-5.57", detailSdi: "-6.02", maker: "Biotecnica", instrument: "BT 1500" },
  { code: "1000001420", name: "성모진단검사의학과", result: "246", standardSdi: "5.28", detailSdi: "5.87", maker: "Biosystems", instrument: "BA400" },
  { code: "1000001277", name: "동탄연세의원", result: "183", standardSdi: "-3.92", detailSdi: "-4.11", maker: "Tokyo Boeki Medisys Inc.", instrument: "BiOLiS 50i" },
  { code: "1000001188", name: "청라메디랩", result: "0228", standardSdi: "4.76", detailSdi: "5.30", maker: "Roche", instrument: "cobas c311" },
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

      const props = arc.getProps(["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"], true);
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function downloadInstitutionExcel({ selectedTest, selectedSpecimen, rows }) {
  const tableRows = rows.map((row, index) => ({
    no: index + 1,
    ...row,
  }));
  const safeFileName = `${selectedTest.code}_${selectedSpecimen.key}_기관목록`.replace(/[\\/:*?"<>|]/g, "_");

  const headerCells = institutionColumns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join("");
  const bodyRows = tableRows
    .map((row) => (
      `<tr>${institutionColumns
        .map((column) => `<td style="mso-number-format:'\\@';">${escapeHtml(row[column.key] ?? "")}</td>`)
        .join("")}</tr>`
    ))
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

function getMakerData(selection) {
  const selectedValue = unacceptableRateData.tests[selection.testIndex].values[selection.specimenIndex];
  const bumpIndex = (selection.testIndex + selection.specimenIndex) % makerBaseData.length;

  return makerBaseData.map((maker, index) => ({
    ...maker,
    count: index === bumpIndex ? maker.count + Math.round(selectedValue) : maker.count,
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

    const generatedRows = Array.from({ length: missingCount }, (_, extraIndex) => {
      const sequence = makerIndex * 100 + extraIndex + 1;
      const sdiSign = (makerIndex + extraIndex) % 2 === 0 ? 1 : -1;
      const standardSdi = (sdiSign * (3.85 + (sequence % 9) * 0.31)).toFixed(2);

      return {
        code: String(1000005000 + sequence),
        name: generatedNames[(makerIndex + extraIndex) % generatedNames.length],
        result: String(100 + ((sequence * 17) % 180)).padStart(4, "0"),
        standardSdi,
        detailSdi: (Number(standardSdi) + sdiSign * 0.47).toFixed(2),
        maker: maker.name,
        instrument: getGeneratedInstrument(maker.name),
      };
    });

    return [...matchingRows, ...generatedRows];
  });
}

function getTrendData(selection) {
  const selectedRate = unacceptableRateData.tests[selection.testIndex].values[selection.specimenIndex];
  const base = 48 + Math.round(selectedRate * 6) + (selection.testIndex % 6) * 3 + selection.specimenIndex * 4;

  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(2024, 6 + index, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const shortYear = String(date.getFullYear()).slice(2);
    const wave = Math.sin((index + selection.testIndex) * 0.85) * 9;
    const seasonal = index % 6 === 2 ? 10 : index % 6 === 5 ? -6 : 0;
    const drift = Math.round(index * 0.9);

    return {
      label: `${shortYear}.${month}`,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
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

  return Math.max(1, Math.round(rate * 2.35) + ((testIndex + specimenIndex) % 2));
}

function getTotalUnacceptableInstitutionCount(testIndex) {
  return unacceptableRateData.specimens.reduce(
    (total, _specimen, specimenIndex) => total + getUnacceptableInstitutionCount(testIndex, specimenIndex),
    0,
  );
}

function getSdiValue(testIndex, specimenIndex) {
  const rate = unacceptableRateData.tests[testIndex].values[specimenIndex];
  const direction = (testIndex + specimenIndex) % 2 === 0 ? 1 : -1;
  const base = 0.52 + rate * 0.72 + (testIndex % 5) * 0.28 + specimenIndex * 0.34;

  return Number((direction * Math.min(5.4, base)).toFixed(2));
}

function getNonconformanceInstitutionRows(testIndex, specimenIndex) {
  const count = getUnacceptableInstitutionCount(testIndex, specimenIndex);
  const selectedTest = unacceptableRateData.tests[testIndex];
  const selectedSpecimen = unacceptableRateData.specimens[specimenIndex];
  const rowOffset = testIndex * 5 + specimenIndex * 3;

  return Array.from({ length: count }, (_, index) => {
    const sourceRow = institutionRows[(rowOffset + index) % institutionRows.length];
    const sdiSign = (testIndex + specimenIndex + index) % 2 === 0 ? 1 : -1;
    const sdi = sdiSign * (3.05 + ((testIndex + index) % 7) * 0.37 + specimenIndex * 0.18);

    return {
      ...sourceRow,
      code: sourceRow.code,
      name: sourceRow.name,
      result: String(100 + ((testIndex + 1) * 13 + (specimenIndex + 1) * 17 + index * 9) % 180).padStart(4, "0"),
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
  tooltipEl.style.transform = alignLeft ? "translate(-100%, -50%)" : "translate(12px, -50%)";
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
        datasets: unacceptableRateData.specimens.map((specimen, specimenIndex) => ({
          label: specimen.key,
          data: unacceptableRateData.tests.map((test) => test.values[specimenIndex]),
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
      setZoomLevel((currentZoom) => clampZoom(currentZoom + (event.deltaY < 0 ? 0.25 : -0.25)));
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
          <button type="button" onClick={() => changeZoom(zoomLevel - 0.25)} aria-label="그래프 축소">
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
          <button type="button" onClick={() => changeZoom(zoomLevel + 0.25)} aria-label="그래프 확대">
            +
          </button>
          <button type="button" onClick={() => changeZoom(1)} aria-label="그래프 확대 초기화">
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
          <canvas ref={canvasRef} aria-label="검사항목별 Unacceptable Rate 막대그래프" />
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

  return <canvas ref={canvasRef} aria-label="제조사별 Unacceptable 기관 수 비율 도넛 차트" />;
}

function TrendLineChart({ selection }) {
  const canvasRef = useRef(null);
  const selectedTest = unacceptableRateData.tests[selection.testIndex];
  const selectedSpecimen = unacceptableRateData.specimens[selection.specimenIndex];

  useEffect(() => {
    const trendData = getTrendData(selection);
    const maxValue = Math.max(...trendData.map((item) => item.value));
    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: trendData.map((item) => item.label),
        datasets: [
          {
            label: `${selectedTest.name} / ${selectedSpecimen.key}`,
            data: trendData.map((item) => item.value),
            borderColor: "#0869f4",
            backgroundColor: "rgba(8, 105, 244, 0.12)",
            borderWidth: 2,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#0869f4",
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 5,
            tension: 0.28,
            fill: true,
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
              title(items) {
                const item = trendData[items[0].dataIndex];
                return `${item.year}년 ${item.month}월`;
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
              autoSkip: true,
              maxTicksLimit: 12,
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
  }, [selection.testIndex, selection.specimenIndex, selectedSpecimen.key, selectedTest.name]);

  return (
    <div className="trend-chart">
      <div className="trend-selection">
        <span>선택 검사</span>
        <strong>{selectedTest.name}</strong>
        <span>선택 검체</span>
        <strong>{selectedSpecimen.key}</strong>
      </div>
      <div className="trend-canvas">
        <canvas ref={canvasRef} aria-label="선택한 검사 검체의 2년간 Unacceptable 기관 수 추이" />
      </div>
    </div>
  );
}

function SelectedTestDetail({ selection }) {
  const [showInstitutionGrid, setShowInstitutionGrid] = useState(false);
  const [institutionPage, setInstitutionPage] = useState(1);
  const selectedTest = unacceptableRateData.tests[selection.testIndex];
  const selectedSpecimen = unacceptableRateData.specimens[selection.specimenIndex];
  const makers = getMakerData(selection);
  const total = makers.reduce((sum, maker) => sum + maker.count, 0);
  const selectedInstitutionRows = getInstitutionRowsForMakers(makers);
  const institutionTotalPages = Math.max(1, Math.ceil(selectedInstitutionRows.length / institutionPageSize));
  const institutionStartIndex = (institutionPage - 1) * institutionPageSize;
  const visibleInstitutionRows = selectedInstitutionRows.slice(
    institutionStartIndex,
    institutionStartIndex + institutionPageSize,
  );
  const institutionEndIndex = Math.min(institutionStartIndex + visibleInstitutionRows.length, selectedInstitutionRows.length);

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
        <div className="donut-box">
          <MakerDoughnutChart makers={makers} />
          <button
            type="button"
            className="donut-center"
            aria-controls="institution-list-grid"
            aria-expanded={showInstitutionGrid}
            onClick={toggleInstitutionGrid}
          >
            <strong>총 {total}개</strong>
            <span>기관</span>
          </button>
        </div>
        <div className="maker-list">
          {makers.map((maker) => (
            <div className="maker-item" key={maker.name}>
              <i style={{ backgroundColor: maker.color }} />
              <b>{maker.name}</b>
              <span>{maker.count} 기관 ({formatPercent((maker.count / total) * 100)})</span>
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
                전체 {selectedInstitutionRows.length}개 중 {institutionStartIndex + 1}-{institutionEndIndex} 표시
              </span>
              <button
                type="button"
                className="excel-button"
                onClick={() => downloadInstitutionExcel({
                  selectedTest,
                  selectedSpecimen,
                  rows: selectedInstitutionRows,
                })}
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
          <div className="institution-grid" role="grid" aria-label="Unacceptable 기관 목록">
            <div className="institution-grid-row institution-grid-header" role="row">
              {institutionColumns.map((column) => (
                <span role="columnheader" key={column.key}>{column.label}</span>
              ))}
            </div>
            {visibleInstitutionRows.map((row, index) => (
              <div className="institution-grid-row" role="row" key={`${row.code}-${row.instrument}`}>
                {institutionColumns.map((column) => (
                  <span role="gridcell" key={column.key}>
                    {column.key === "no" ? institutionStartIndex + index + 1 : row[column.key]}
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
                  className={pageNumber === institutionPage ? "active" : undefined}
                  aria-current={pageNumber === institutionPage ? "page" : undefined}
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

function NonconformanceInstitutionGrid({ rows, selectedTest, selectedSpecimen, onClose }) {
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
      <div className="institution-grid" role="grid" aria-label="부적합 분석 Unacceptable 기관 목록">
        <div className="institution-grid-row institution-grid-header" role="row">
          {nonconformanceInstitutionColumns.map((column) => (
            <span role="columnheader" key={column.key}>{column.label}</span>
          ))}
        </div>
        {rows.map((row, index) => (
          <div className="institution-grid-row" role="row" key={`${row.code}-${row.specimenKey}-${index}`}>
            {nonconformanceInstitutionColumns.map((column) => (
              <span role="gridcell" key={column.key}>
                {column.key === "no" ? index + 1 : row[column.key]}
              </span>
            ))}
          </div>
        ))}
      </div>
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
        datasets: unacceptableRateData.specimens.map((specimen, specimenIndex) => ({
          label: specimen.key,
          data: unacceptableRateData.tests.map((_test, testIndex) => getSdiValue(testIndex, specimenIndex)),
          backgroundColor: unacceptableRateData.tests.map((_test, testIndex) => (
            testIndex === selectedTestIndex ? specimen.color : colorWithAlpha(specimen.color, 0.24)
          )),
          borderColor: unacceptableRateData.tests.map((_test, testIndex) => (
            testIndex === selectedTestIndex ? specimen.color : colorWithAlpha(specimen.color, 0.44)
          )),
          borderWidth: 1,
          borderRadius: 2,
          barPercentage: 0.82,
          categoryPercentage: 0.72,
        })),
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
                return context.index === selectedTestIndex ? "#a00056" : "#1f2d4d";
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
    if (!scrollNode) return undefined;

    const handleWheel = (event) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      event.stopPropagation();
      setZoomLevel((currentZoom) => clampZoom(currentZoom + (event.deltaY < 0 ? 0.25 : -0.25)));
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
          <button type="button" onClick={() => changeZoom(zoomLevel - 0.25)} aria-label="SDI 그래프 축소">
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
          <button type="button" onClick={() => changeZoom(zoomLevel + 0.25)} aria-label="SDI 그래프 확대">
            +
          </button>
          <button type="button" onClick={() => changeZoom(1)} aria-label="SDI 그래프 확대 초기화">
            100%
          </button>
        </div>
      </div>
      <p className="sdi-selection">선택 검사: {selectedTest.code}</p>
      <div ref={scrollRef} className="chart-scroll" aria-label="검사항목별 SDI 그래프 스크롤 영역">
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
  const selectedTargetTest = institutionTarget ? unacceptableRateData.tests[institutionTarget.testIndex] : null;
  const selectedTargetSpecimen = institutionTarget
    ? unacceptableRateData.specimens[institutionTarget.specimenIndex]
    : null;
  const selectedRows = institutionTarget
    ? getNonconformanceInstitutionRows(institutionTarget.testIndex, institutionTarget.specimenIndex)
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
      if (currentTarget?.testIndex === testIndex && currentTarget?.specimenIndex === specimenIndex) {
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

        <div className="unacc-card-scroll" aria-label="검사항목별 Unacceptable 상세현황 카드 목록">
          <div className="unacc-card-grid">
            {unacceptableRateData.tests.map((test, testIndex) => {
              const totalUnacceptableCount = getTotalUnacceptableInstitutionCount(testIndex);
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
                      <strong>{getParticipatingCount(testIndex).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>1개이상 Unacc판정받은기관</span>
                      <strong className="danger">{totalUnacceptableCount || "-"}</strong>
                    </div>
                  </div>

                  <div className="unacc-specimen-grid">
                    {unacceptableRateData.specimens.map((specimen, specimenIndex) => {
                      const count = getUnacceptableInstitutionCount(testIndex, specimenIndex);

                      return (
                        <div className="unacc-specimen-cell" key={specimen.key}>
                          <span>{specimen.key}</span>
                          <b>{formatPercent(test.values[specimenIndex])}</b>
                          <button
                            type="button"
                            className="unacc-count-button"
                            aria-controls="nonconformance-institution-list"
                            aria-expanded={
                              institutionTarget?.testIndex === testIndex
                              && institutionTarget?.specimenIndex === specimenIndex
                            }
                            onClick={(event) => toggleInstitutionList(event, testIndex, specimenIndex)}
                          >
                            {count}기관
                          </button>
                        </div>
                      );
                    })}
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
        <NonconformanceSdiChart selectedTestIndex={selectedTestIndex} onSelectTest={setSelectedTestIndex} />
      </article>
    </section>
  );
}

function App() {
  const [selection, setSelection] = useState({ testIndex: 0, specimenIndex: 0 });
  const [activeTab, setActiveTab] = useState("overview");
  const activeTabLabel = reportTabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>2025년 1회차 일반화학검사</h1>
        <div className="user-menu">
          <button type="button" aria-label="알림">
            <span className="bell" />
          </button>
          <span className="avatar" aria-hidden="true" />
          <strong>홍길동</strong>
        </div>
      </header>

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
          <button type="button">통계확인 완료</button>
        </div>
      </section>

      <nav className="tabbar" aria-label="분석 탭">
        {reportTabs.map((tab) => (
          <button
            type="button"
            className={activeTab === tab.id ? "active" : undefined}
            aria-current={activeTab === tab.id ? "page" : undefined}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

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
                    <p>최근 2년간 월별 기관 수 추이</p>
                  </div>
                  <span>단위: 기관</span>
                </div>
                <TrendLineChart selection={selection} />
              </article>
            </section>
          </>
        ) : activeTab === "nonconformance" ? (
          <NonconformanceAnalysis />
        ) : (
          <section className="panel tab-empty-panel">
            <h2>{activeTabLabel}</h2>
            <p>이 탭의 분석 화면은 다음 단계에서 구성할 수 있도록 영역만 준비했습니다.</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
