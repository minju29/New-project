const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "hepatitis-dashboard", "data");
const publicDataDir = path.join(rootDir, "public", "data");
const outputPath = path.join(publicDataDir, "hepatitis-dashboard.json");

const sourceFiles = {
  common: "300_common.xlsx",
  raw: "300_instraw.xlsx",
};

function readSheet(fileName) {
  const workbook = XLSX.readFile(path.join(sourceDir, fileName), {
    cellDates: false,
  });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });
}

function asText(value) {
  return String(value ?? "").trim();
}

function asNumber(value) {
  const numericValue = Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function percent(count, total) {
  return total > 0 ? (count / total) * 100 : 0;
}

function getByIndex(row, keys, index) {
  return row[keys[index]];
}

function getPeriodKey(year, round) {
  return `${asText(year)}-${asText(round).padStart(2, "0")}`;
}

function getPeriodLabel(year, round) {
  return `${asText(year)}년 ${asText(round).padStart(2, "0")}회차`;
}

function sortByCountThenName(left, right) {
  return (
    right.total - left.total ||
    String(left.name).localeCompare(String(right.name), "ko", {
      numeric: true,
    })
  );
}

function upsertMap(map, key, createValue) {
  if (!map.has(key)) {
    map.set(key, createValue());
  }

  return map.get(key);
}

function toList(map, mapper = (value) => value) {
  return Array.from(map.values()).map(mapper);
}

function addCount(map, key, count) {
  const normalizedKey = asText(key) || "미입력";
  const row = upsertMap(map, normalizedKey, () => ({
    name: normalizedKey,
    total: 0,
    acceptable: 0,
    unacceptable: 0,
    notAvailable: 0,
  }));

  row.total += count;

  return row;
}

function addAcceptability(row, acceptability, count) {
  if (acceptability === "Unacceptable") {
    row.unacceptable += count;
  } else if (acceptability === "Not Available") {
    row.notAvailable += count;
  } else {
    row.acceptable += count;
  }
}

function summarizeBucket(bucket) {
  bucket.rate = percent(bucket.unacceptable, bucket.total);
  delete bucket._resultCounts;
  return bucket;
}

function buildData() {
  const commonRows = readSheet(sourceFiles.common);
  const rawRows = readSheet(sourceFiles.raw);
  const commonKeys = Object.keys(commonRows[0] ?? {});
  const rawKeys = Object.keys(rawRows[0] ?? {});

  const commonColumns = {
    year: 0,
    round: 1,
    specimenName: 2,
    testCode: 3,
    testName: 4,
    baseCategory: 6,
    detailCategory: 7,
    result: 10,
    count: 11,
    acceptability: 13,
  };

  const rawColumns = {
    program: 0,
    institutionCode: 1,
    year: 2,
    round: 3,
    times: 4,
    specimenCode: 5,
    specimenName: 6,
    testCode: 7,
    testName: 8,
    result: 12,
    baseCategory: 14,
    detailCategory: 16,
    answer: 17,
    judgment: 18,
    remark: 19,
  };

  const periods = Array.from(
    new Set(
      rawRows.map((row) =>
        getPeriodKey(
          getByIndex(row, rawKeys, rawColumns.year),
          getByIndex(row, rawKeys, rawColumns.round),
        ),
      ),
    ),
  ).sort();
  const latestPeriodKey = periods.at(-1);
  const [latestYear, latestRound] = latestPeriodKey.split("-");

  const latestRawRows = rawRows.filter(
    (row) =>
      getPeriodKey(
        getByIndex(row, rawKeys, rawColumns.year),
        getByIndex(row, rawKeys, rawColumns.round),
      ) === latestPeriodKey,
  );
  const latestCommonRows = commonRows.filter(
    (row) =>
      getPeriodKey(
        getByIndex(row, commonKeys, commonColumns.year),
        getByIndex(row, commonKeys, commonColumns.round),
      ) === latestPeriodKey,
  );

  const testMap = new Map();
  const specimenMap = new Map();
  const baseCategoryMap = new Map();
  const detailCategoryMap = new Map();
  const resultDistributionMap = new Map();
  const aggregateRows = [];

  for (const row of latestCommonRows) {
    const count = asNumber(getByIndex(row, commonKeys, commonColumns.count));
    if (count <= 0) continue;

    const testCode = asText(getByIndex(row, commonKeys, commonColumns.testCode));
    const testName = asText(getByIndex(row, commonKeys, commonColumns.testName));
    const specimenName = asText(
      getByIndex(row, commonKeys, commonColumns.specimenName),
    );
    const baseCategory = asText(
      getByIndex(row, commonKeys, commonColumns.baseCategory),
    );
    const detailCategory = asText(
      getByIndex(row, commonKeys, commonColumns.detailCategory),
    );
    const result = asText(getByIndex(row, commonKeys, commonColumns.result));
    const acceptability = asText(
      getByIndex(row, commonKeys, commonColumns.acceptability),
    );

    const test = upsertMap(testMap, testCode, () => ({
      code: testCode,
      name: testName,
      total: 0,
      acceptable: 0,
      unacceptable: 0,
      notAvailable: 0,
      specimens: new Map(),
      baseCategories: new Map(),
      detailCategories: new Map(),
      results: new Map(),
    }));

    const specimen = addCount(specimenMap, specimenName, count);
    const base = addCount(baseCategoryMap, baseCategory, count);
    const detail = addCount(detailCategoryMap, detailCategory, count);
    const resultBucket = addCount(resultDistributionMap, result, count);
    const testSpecimen = addCount(test.specimens, specimenName, count);
    const testBase = addCount(test.baseCategories, baseCategory, count);
    const testDetail = addCount(test.detailCategories, detailCategory, count);
    const testResult = addCount(test.results, result, count);

    for (const bucket of [
      test,
      specimen,
      base,
      detail,
      resultBucket,
      testSpecimen,
      testBase,
      testDetail,
      testResult,
    ]) {
      bucket.total += bucket === test ? count : 0;
      addAcceptability(bucket, acceptability, count);
    }

    aggregateRows.push({
      id: `agg-${aggregateRows.length + 1}`,
      specimenName,
      testCode,
      testName,
      baseCategory,
      detailCategory,
      result,
      count,
      acceptability,
    });
  }

  const tests = toList(testMap, (test) => {
    test.specimens = toList(test.specimens, summarizeBucket).sort(
      sortByCountThenName,
    );
    test.baseCategories = toList(test.baseCategories, summarizeBucket).sort(
      sortByCountThenName,
    );
    test.detailCategories = toList(test.detailCategories, summarizeBucket).sort(
      sortByCountThenName,
    );
    test.results = toList(test.results, summarizeBucket).sort(sortByCountThenName);
    return summarizeBucket(test);
  }).sort((left, right) => right.rate - left.rate || right.total - left.total);

  const institutionRows = latestRawRows.map((row, index) => {
    const result = asText(getByIndex(row, rawKeys, rawColumns.result));
    const answer = asText(getByIndex(row, rawKeys, rawColumns.answer));
    const explicitJudgment = asText(getByIndex(row, rawKeys, rawColumns.judgment));
    const calculatedJudgment =
      result && answer && result !== answer ? "Unacceptable" : "Acceptable";

    return {
      id: `inst-${index + 1}`,
      institutionCode: asText(
        getByIndex(row, rawKeys, rawColumns.institutionCode),
      ),
      institutionName: "",
      testCode: asText(getByIndex(row, rawKeys, rawColumns.testCode)),
      testName: asText(getByIndex(row, rawKeys, rawColumns.testName)),
      specimenName: asText(getByIndex(row, rawKeys, rawColumns.specimenName)),
      result,
      answer,
      baseCategory: asText(getByIndex(row, rawKeys, rawColumns.baseCategory)),
      detailCategory: asText(getByIndex(row, rawKeys, rawColumns.detailCategory)),
      judgment: explicitJudgment || calculatedJudgment,
      remark: asText(getByIndex(row, rawKeys, rawColumns.remark)),
    };
  });

  const trendMap = new Map();
  for (const row of commonRows) {
    const periodKey = getPeriodKey(
      getByIndex(row, commonKeys, commonColumns.year),
      getByIndex(row, commonKeys, commonColumns.round),
    );
    const period = upsertMap(trendMap, periodKey, () => ({
      key: periodKey,
      label: getPeriodLabel(
        getByIndex(row, commonKeys, commonColumns.year),
        getByIndex(row, commonKeys, commonColumns.round),
      ),
      total: 0,
      acceptable: 0,
      unacceptable: 0,
      notAvailable: 0,
      tests: new Map(),
    }));
    const count = asNumber(getByIndex(row, commonKeys, commonColumns.count));
    const testCode = asText(getByIndex(row, commonKeys, commonColumns.testCode));
    const testName = asText(getByIndex(row, commonKeys, commonColumns.testName));
    const acceptability = asText(
      getByIndex(row, commonKeys, commonColumns.acceptability),
    );
    const testTrend = upsertMap(period.tests, testCode, () => ({
      code: testCode,
      name: testName,
      total: 0,
      acceptable: 0,
      unacceptable: 0,
      notAvailable: 0,
    }));

    for (const bucket of [period, testTrend]) {
      bucket.total += count;
      addAcceptability(bucket, acceptability, count);
    }
  }

  const rawPeriodInstitutionMap = new Map();
  for (const row of rawRows) {
    const periodKey = getPeriodKey(
      getByIndex(row, rawKeys, rawColumns.year),
      getByIndex(row, rawKeys, rawColumns.round),
    );
    const set = upsertMap(rawPeriodInstitutionMap, periodKey, () => new Set());
    set.add(asText(getByIndex(row, rawKeys, rawColumns.institutionCode)));
  }

  const trend = toList(trendMap, (period) => {
    period.institutionCount = rawPeriodInstitutionMap.get(period.key)?.size ?? 0;
    period.tests = toList(period.tests, summarizeBucket).sort(
      (left, right) =>
        String(left.code).localeCompare(String(right.code), "ko", {
          numeric: true,
        }),
    );
    return summarizeBucket(period);
  }).sort((left, right) => left.key.localeCompare(right.key));

  const total = tests.reduce((sum, test) => sum + test.total, 0);
  const unacceptable = tests.reduce((sum, test) => sum + test.unacceptable, 0);
  const acceptable = tests.reduce((sum, test) => sum + test.acceptable, 0);
  const notAvailable = tests.reduce((sum, test) => sum + test.notAvailable, 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFiles,
    title: `${getPeriodLabel(latestYear, latestRound)} 간염바이러스항원항체검사`,
    programName:
      asText(getByIndex(rawRows[0] ?? {}, rawKeys, rawColumns.program)) ||
      "간염바이러스 항원항체검사(정성)",
    latestPeriod: {
      key: latestPeriodKey,
      year: latestYear,
      round: latestRound,
      label: getPeriodLabel(latestYear, latestRound),
    },
    summary: {
      institutionCount: new Set(
        latestRawRows.map((row) =>
          asText(getByIndex(row, rawKeys, rawColumns.institutionCode)),
        ),
      ).size,
      testCount: new Set(
        latestRawRows.map((row) =>
          asText(getByIndex(row, rawKeys, rawColumns.testCode)),
        ),
      ).size,
      specimenCount: new Set(
        latestRawRows.map((row) =>
          asText(getByIndex(row, rawKeys, rawColumns.specimenName)),
        ),
      ).size,
      resultCount: total,
      acceptableCount: acceptable,
      unacceptableCount: unacceptable,
      notAvailableCount: notAvailable,
      unacceptableRate: percent(unacceptable, total),
    },
    tests,
    specimens: toList(specimenMap, summarizeBucket).sort(sortByCountThenName),
    baseCategories: toList(baseCategoryMap, summarizeBucket).sort(
      sortByCountThenName,
    ),
    detailCategories: toList(detailCategoryMap, summarizeBucket)
      .sort(sortByCountThenName)
      .slice(0, 30),
    resultDistribution: toList(resultDistributionMap, summarizeBucket).sort(
      sortByCountThenName,
    ),
    aggregateRows: aggregateRows.sort(
      (left, right) =>
        right.count - left.count ||
        left.testCode.localeCompare(right.testCode, "ko", { numeric: true }),
    ),
    institutionRows,
    trend,
  };

  fs.mkdirSync(publicDataDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload), "utf8");
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  console.log(
    `${payload.latestPeriod.label}: ${payload.summary.institutionCount} institutions, ${payload.summary.testCount} tests, ${payload.summary.unacceptableCount}/${payload.summary.resultCount} unacceptable`,
  );
}

buildData();
