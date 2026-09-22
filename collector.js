const fs = require("fs");

const BASE =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do";

const PAGE_URL =
  `${BASE}?mi=10997&bbsId=1981`;

async function main() {
  console.log("인천교육청 예체능강사 수집 테스트 시작");

  // 1. 먼저 페이지를 열어 CSRF 토큰 획득
  const firstResponse = await fetch(PAGE_URL, {
    headers: browserHeaders()
  });

  if (!firstResponse.ok) {
    throw new Error(`초기 페이지 요청 실패: ${firstResponse.status}`);
  }

  const firstHtml = await firstResponse.text();

  console.log("초기 HTML length:", firstHtml.length);

  const csrf = extractCsrf(firstHtml);

  console.log("CSRF:", csrf ? "획득 성공" : "찾지 못함");

  if (!csrf) {
    throw new Error("CSRFToken을 찾지 못했습니다.");
  }

  // 2. 실제 사이트와 동일하게 예체능강사 검색 POST
  const form = new URLSearchParams();

  form.set("bbsId", "1981");
  form.set("nttSn", "");
  form.set("mi", "10997");
  form.set("currPage", "1");
  form.set("paramtrStrtpt", "");
  form.set("noLayout", "");
  form.set("bbsRequstNo", "");
  form.set("fileSn", "");
  form.set("bbsTypeChk", "list");

  form.set("srchAt1", "Y");
  form.set("srchAt2", "");
  form.set("srchAt3", "");
  form.set("srchAt4", "Y");
  form.set("srchAt5", "Y");

  form.set("searchValue1", "예체능강사");
  form.set("searchValue2", "");
  form.set("searchValue3", "");
  form.set("searchValue4", "");

  form.set("arrAt1", "N");
  form.set("arrAt2", "");
  form.set("arrAt3", "");

  form.set("srch1", "예체능강사");

  form.set("srchRsvBgnde", "");
  form.set("srchRsvEndde", "");
  form.set("rcritAt", "");
  form.set("srchRecBgnde", "");
  form.set("srchRecEndde", "");

  form.set("listCo", "10");
  form.set("searchType", "sj");
  form.set("searchValue", "");

  form.set("CSRFToken", csrf);

  const response = await fetch(BASE, {
    method: "POST",
    redirect: "follow",
    headers: {
      ...browserHeaders(),
      "Content-Type":
        "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": PAGE_URL
    },
    body: form.toString()
  });

  console.log("검색 HTTP:", response.status);

  if (!response.ok) {
    throw new Error(`검색 요청 실패: ${response.status}`);
  }

  const html = await response.text();

  console.log("검색 HTML length:", html.length);

  const rows = [
    ...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
  ];

  const allJobs = [];

  for (const match of rows) {
    const row = match[0];

    const cells = [
      ...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    ].map(m => cleanText(m[1]));

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

    if (!/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(postedAt)) {
      continue;
    }

    const title = rawTitle
      .replace(/^\s*N\s*/i, "")
      .trim();

    const nttSn = extractNttSn(row);

    allJobs.push({
      id: nttSn
        ? `ice_${nttSn}`
        : makeId(`${organization}_${title}`),

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

      url: nttSn
        ? `https://www.ice.go.kr/ice/na/ntt/selectNttInfo.do?bbsId=1981&mi=10997&nttSn=${nttSn}`
        : "",

      tags: makeTags(
        `${organization} ${jobType} ${title}`
      )
    });
  }

  console.log("예체능강사 공고:", allJobs.length);

  const output = {
    updatedAt: new Date().toISOString(),

    diagnostics: {
      csrfFound: !!csrf,
      htmlLength: html.length,
      totalTrCount: rows.length,
      parsedPostCount: allJobs.length
    },

    count: allJobs.length,
    jobs: allJobs
  };

  fs.writeFileSync(
    "jobs.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("jobs.json 저장 완료");
}

function extractCsrf(html) {
  const patterns = [
    /name=["']CSRFToken["'][^>]*value=["']([^"']+)["']/i,
    /value=["']([^"']+)["'][^>]*name=["']CSRFToken["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match) return match[1];
  }

  return "";
}

function browserHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

    "Accept-Language":
      "ko-KR,ko;q=0.9,en;q=0.8"
  };
}

function extractNttSn(row) {
  const patterns = [
    /[?&]nttSn=(\d+)/i,
    /nttSn['"]?\s*[:=]\s*['"]?(\d+)/i,
    /nttSn[^0-9]{0,30}(\d{5,})/i,
    /selectNttInfo[^0-9]{0,150}(\d{5,})/i
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
  if (/오케스트라|관현악/.test(text))
    tags.push("오케스트라");

  if (/전공실기|전공 실기/.test(text))
    tags.push("전공실기");

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
