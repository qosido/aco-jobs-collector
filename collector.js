const fs = require("fs");

const LIST_URL =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981";

const INCLUDE_KEYWORDS = [
  "플루트",
  "플룻",
  "관악",
  "관현악",
  "오케스트라",
  "음악강사",
  "음악 강사",
  "예술강사",
  "예술 강사",
  "예체능강사",
  "예체능 강사",
  "전공실기",
  "전공 실기",
  "앙상블",
  "악기강사",
  "악기 강사",
  "방과후"
];

async function main() {
  console.log("인천교육청 수집 v3 시작");

  const response = await fetch(LIST_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  console.log("HTML length:", html.length);

  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  const allJobs = [];

  for (const match of rows) {
    const row = match[0];

    const cells = [
      ...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    ].map(m => cleanText(m[1]));

    // 실제 채용공고 표는 8개 열
    if (cells.length < 8) continue;

    const [
      postedAt,
      recruitStatus,
      organization,
      jobType,
      rawTitle,
      deadline,
      startDate,
      endDate
    ] = cells;

    // 등록일 형식이 아니면 공고 행이 아님
    if (!/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(postedAt)) {
      continue;
    }

    const title = rawTitle
      .replace(/^\s*N\s*/i, "")
      .trim();

    const nttSn = extractNttSn(row);

    const detailUrl = nttSn
      ? `https://www.ice.go.kr/ice/na/ntt/selectNttInfo.do?mi=10997&bbsId=1981&nttSn=${nttSn}`
      : "";

    const fullText =
      `${organization} ${jobType} ${title}`.replace(/\s+/g, " ");

    allJobs.push({
      id: nttSn ? `ice_${nttSn}` : makeId(`${organization}_${title}`),
      source: "인천교육청",
      postedAt: normalizeDate(postedAt),
      recruitStatus,
      organization,
      jobType,
      title,
      deadline: normalizeDate(deadline),
      startDate: normalizeDate(startDate),
      endDate: normalizeDate(endDate),
      region: "인천",
      url: detailUrl,
      tags: makeTags(fullText),
      matched: INCLUDE_KEYWORDS.some(k => fullText.includes(k))
    });
  }

  console.log("실제 공고 행:", allJobs.length);

  // 현재는 관련 키워드 공고만 최종 jobs에 저장
  const matchedJobs = allJobs.filter(job => job.matched);

  const output = {
    updatedAt: new Date().toISOString(),

    diagnostics: {
      htmlLength: html.length,
      totalTrCount: rows.length,
      parsedPostCount: allJobs.length,
      matchedCount: matchedJobs.length
    },

    // 진단용: 첫 페이지 공고를 전부 보여줌
    debugSample: allJobs.slice(0, 20),

    count: matchedJobs.length,
    jobs: matchedJobs.map(({ matched, ...job }) => job)
  };

  fs.writeFileSync(
    "jobs.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("완료");
  console.log("공고:", allJobs.length);
  console.log("관련 공고:", matchedJobs.length);
}

function extractNttSn(row) {
  const patterns = [
    /[?&]nttSn=(\d+)/i,
    /nttSn['"]?\s*[:=]\s*['"]?(\d+)/i,
    /nttSn[^0-9]{0,20}(\d{5,})/i,
    /selectNttInfo[^0-9]{0,100}(\d{5,})/i
  ];

  for (const pattern of patterns) {
    const match = row.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function cleanText(html = "") {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

function normalizeDate(value = "") {
  const match = value.match(
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/
  );

  if (!match) return "";

  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function makeTags(text) {
  const tags = [];

  if (/플루트|플룻/.test(text)) tags.push("플루트");
  if (/관악/.test(text)) tags.push("관악");
  if (/오케스트라|관현악/.test(text)) tags.push("오케스트라");
  if (/전공실기|전공 실기/.test(text)) tags.push("전공실기");
  if (/방과후/.test(text)) tags.push("방과후");
  if (/예체능/.test(text)) tags.push("예체능");
  if (/강사/.test(text)) tags.push("강사");

  return [...new Set(tags)];
}

function makeId(text) {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return `ice_${(hash >>> 0).toString(36)}`;
}

main().catch(error => {
  console.error("수집 실패:", error);
  process.exit(1);
});
