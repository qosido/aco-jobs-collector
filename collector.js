const fs = require("fs");

const SEARCH_URL =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do";

const LIST_URL =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981";

const DETAIL_BASE =
  "https://www.ice.go.kr/ice/na/ntt/selectNttInfo.do?mi=10997&bbsId=1981";

const MAX_PAGES = 10;
const PAGE_SIZE = 10;

/*
 * 같은 악기를 다르게 표기하는 경우를 한 태그로 통합
 */
const KEYWORD_GROUPS = [
  {
    tag: "플루트",
    aliases: ["플루트", "플룻", "flute"]
  },
  {
    tag: "리코더",
    aliases: ["리코더", "recorder"]
  },
  {
    tag: "우쿨렐레",
    aliases: [
      "우쿨렐레",
      "우쿠렐레",
      "우크렐레",
      "우클렐레",
      "ukulele"
    ]
  },
  {
    tag: "칼림바",
    aliases: ["칼림바", "kalimba"]
  },
  {
    tag: "관악·오케스트라",
    aliases: [
      "관악",
      "관현악",
      "오케스트라",
      "윈드오케스트라",
      "윈드 오케스트라",
      "앙상블"
    ]
  },
  {
    tag: "음악",
    aliases: [
      "음악",
      "악기",
      "기악",
      "합주",
      "밴드",
      "예술강사"
    ]
  },
  {
    tag: "스포츠",
    aliases: [
      "스포츠",
      "체육",
      "축구",
      "농구",
      "배드민턴",
      "탁구"
    ]
  },
  {
    tag: "미술",
    aliases: [
      "미술",
      "회화",
      "디자인",
      "공예"
    ]
  },
  {
    tag: "영상",
    aliases: [
      "영상",
      "미디어",
      "사진",
      "콘텐츠"
    ]
  },
  {
    tag: "무용",
    aliases: [
      "무용",
      "댄스",
      "발레"
    ]
  }
];

async function main() {
  console.log("ACO ON - 인천교육청 예체능강사 수집 v4");
  console.log(`최대 ${MAX_PAGES}페이지 확인`);

  const allJobs = [];
  const seenFingerprints = new Set();

  let pagesCollected = 0;
  let duplicatedPageDetected = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`\n[${page}페이지] 요청 중...`);

    const html = await fetchPage(page);
    const jobs = parseJobs(html);

    console.log(`파싱된 공고: ${jobs.length}개`);

    if (!jobs.length) {
      console.log("공고가 없어 페이지 순회를 종료합니다.");
      break;
    }

    /*
     * 서버가 currPage 값을 무시하고 계속 1페이지를 돌려줄 경우
     * 무한 중복 수집을 막음
     */
    const pageFingerprint = jobs
      .map(job => `${job.organization}|${job.title}|${job.postedAt}`)
      .join("::");

    if (seenFingerprints.has(pageFingerprint)) {
      console.log("이미 수집한 페이지와 동일합니다. 순회를 종료합니다.");
      duplicatedPageDetected = true;
      break;
    }

    seenFingerprints.add(pageFingerprint);

    allJobs.push(...jobs);
    pagesCollected++;

    if (jobs.length < PAGE_SIZE) {
      console.log("마지막 페이지로 판단하여 종료합니다.");
      break;
    }

    await sleep(500);
  }

  const deduped = dedupeJobs(allJobs);

  /*
   * 최신 공고 우선
   */
  deduped.sort((a, b) => {
    return (
      String(b.postedAt).localeCompare(String(a.postedAt)) ||
      String(b.deadline).localeCompare(String(a.deadline))
    );
  });

  const output = {
    updatedAt: new Date().toISOString(),

    source: {
      id: "ice",
      name: "인천교육청",
      category: "예체능강사",
      url: LIST_URL
    },

    diagnostics: {
      pagesCollected,
      maxPages: MAX_PAGES,
      rawCount: allJobs.length,
      uniqueCount: deduped.length,
      duplicatedPageDetected
    },

    count: deduped.length,

    activeCount: deduped.filter(job => job.isActive).length,

    jobs: deduped
  };

  fs.writeFileSync(
    "jobs.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("\n==============================");
  console.log(`수집 페이지: ${pagesCollected}`);
  console.log(`원본 공고: ${allJobs.length}`);
  console.log(`중복 제거 후: ${deduped.length}`);
  console.log(
    `모집중/대기중: ${deduped.filter(job => job.isActive).length}`
  );
  console.log("==============================");
}

async function fetchPage(page) {
  const form = new URLSearchParams();

  form.set("bbsId", "1981");
  form.set("nttSn", "");
  form.set("mi", "10997");

  form.set("currPage", String(page));

  form.set("paramtrStrtpt", "");
  form.set("noLayout", "");
  form.set("bbsRequstNo", "");
  form.set("fileSn", "");

  form.set("bbsTypeChk", "list");

  /*
   * 브라우저에서 직접 확인한 예체능강사 검색값
   */
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

  /*
   * 모집상태는 수집 단계에서 제한하지 않음.
   * ACO ON 화면에서 모집중 + 대기중을 기본 표시.
   */
  form.set("rcritAt", "");

  form.set("srchRsvBgnde", "");
  form.set("srchRsvEndde", "");
  form.set("srchRecBgnde", "");
  form.set("srchRecEndde", "");

  form.set("listCo", String(PAGE_SIZE));
  form.set("searchType", "sj");
  form.set("searchValue", "");

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    20000
  );

  try {
    const response = await fetch(SEARCH_URL, {
      method: "POST",
      redirect: "follow",
      signal: controller.signal,

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 Chrome/131 Safari/537.36",

        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
          "ko-KR,ko;q=0.9,en;q=0.8",

        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",

        "Referer": LIST_URL
      },

      body: form.toString()
    });

    if (!response.ok) {
      throw new Error(
        `${page}페이지 요청 실패: HTTP ${response.status}`
      );
    }

    return await response.text();

  } finally {
    clearTimeout(timer);
  }
}

function parseJobs(html) {
  const rows = [
    ...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
  ];

  const jobs = [];

  for (const match of rows) {
    const rowHtml = match[0];

    const rawCells = [
      ...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    ];

    if (rawCells.length < 8) {
      continue;
    }

    const cellTexts = rawCells.map(match =>
      cleanText(match[1])
    );

    const [
      postedAtRaw,
      recruitStatusRaw,
      organizationRaw,
      jobTypeRaw,
      titleRaw,
      deadlineRaw,
      startDateRaw,
      endDateRaw
    ] = cellTexts;

    /*
     * 헤더/기타 행 제거
     */
    if (
      !/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(
        postedAtRaw
      )
    ) {
      continue;
    }

    const postedAt =
      normalizeDate(postedAtRaw);

    const recruitStatus =
      normalizeStatus(recruitStatusRaw);

    const organization =
      organizationRaw.trim();

    const jobType =
      jobTypeRaw.trim();

    const title =
      titleRaw
        .replace(/^\s*N\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();

    const deadline =
      normalizeDate(deadlineRaw);

    const startDate =
      normalizeDate(startDateRaw);

    const endDate =
      normalizeDate(endDateRaw);

    /*
     * 제목 셀의 원본 HTML에서 상세페이지 번호 찾기
     */
    const titleCellHtml =
      rawCells[4]?.[1] || "";

    const nttSn =
      extractNttSn(titleCellHtml) ||
      extractNttSn(rowHtml);

    const detailUrl = nttSn
      ? `${DETAIL_BASE}&nttSn=${nttSn}`
      : LIST_URL;

    const combinedText =
      normalizeSearchText(
        [
          organization,
          jobType,
          title
        ].join(" ")
      );

    const tags =
      detectTags(combinedText);

    const instrumentTags =
      tags.filter(tag =>
        [
          "플루트",
          "리코더",
          "우쿨렐레",
          "칼림바"
        ].includes(tag)
      );

    const isActive =
      recruitStatus === "모집중" ||
      recruitStatus === "대기중";

    const id = nttSn
      ? `ice_${nttSn}`
      : makeId(
          [
            organization,
            title,
            postedAt
          ].join("|")
        );

    jobs.push({
      id,

      source: "인천교육청",
      sourceId: "ice",

      postedAt,
      recruitStatus,

      isActive,

      organization,
      jobType,
      title,

      deadline,
      startDate,
      endDate,

      region: "인천",

      url: detailUrl,

      nttSn: nttSn || "",

      tags,
      instrumentTags,

      /*
       * 검색창에서 플룻/플루트,
       * 우쿠렐레/우쿨렐레 등을 동일하게 검색하기 위한 값
       */
      searchText: combinedText,

      autoCollected: true
    });
  }

  return jobs;
}

/*
 * 상세페이지 번호 추출
 *
 * href="?nttSn=123"
 * javascript 함수 인수
 * onclick 등 다양한 구조 대응
 */
function extractNttSn(html = "") {
  const decoded = decodeHtml(html);

  const patterns = [
    /[?&]nttSn=(\d+)/i,

    /nttSn\s*[=:]\s*["']?(\d+)/i,

    /nttSn[^0-9]{0,30}(\d{5,})/i,

    /selectNttInfo[\s\S]{0,150}?(\d{5,})/i,

    /(?:fn|go|select|view)[A-Za-z0-9_]*\s*\(\s*["'](\d{5,})["']/i,

    /onclick=["'][^"']*?["'](\d{5,})["']/i
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);

    if (match) {
      return match[1];
    }
  }

  /*
   * 제목 셀 내부 javascript 링크가
   * 단순 숫자 인수를 사용하는 경우 최후의 후보
   */
  const jsNumbers = [
    ...decoded.matchAll(
      /(?:javascript:|onclick)[\s\S]{0,300}?['"](\d{6,})['"]/gi
    )
  ];

  if (jsNumbers.length) {
    return jsNumbers[0][1];
  }

  return "";
}

function detectTags(text) {
  const result = [];

  for (const group of KEYWORD_GROUPS) {
    if (
      group.aliases.some(alias =>
        text.includes(
          normalizeSearchText(alias)
        )
      )
    ) {
      result.push(group.tag);
    }
  }

  if (!result.length) {
    result.push("기타 예체능");
  }

  return [...new Set(result)];
}

/*
 * 검색 표기 통일
 */
function normalizeSearchText(value = "") {
  let result = value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const replacements = [
    [/플룻/g, "플루트"],

    [/우쿠렐레/g, "우쿨렐레"],
    [/우크렐레/g, "우쿨렐레"],
    [/우클렐레/g, "우쿨렐레"],

    [/윈드\s*오케스트라/g, "오케스트라"],

    [/관현악/g, "관악 오케스트라"]
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(
      pattern,
      replacement
    );
  }

  return result;
}

function normalizeStatus(value = "") {
  const text =
    value.replace(/\s+/g, "");

  if (text.includes("모집중")) {
    return "모집중";
  }

  if (
    text.includes("대기중") ||
    text.includes("대기")
  ) {
    return "대기중";
  }

  if (
    text.includes("모집종료") ||
    text.includes("종료") ||
    text.includes("마감")
  ) {
    return "모집종료";
  }

  return value.trim();
}

function normalizeDate(value = "") {
  const match = value.match(
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/
  );

  if (!match) {
    return "";
  }

  return [
    match[1],
    match[2].padStart(2, "0"),
    match[3].padStart(2, "0")
  ].join("-");
}

function cleanText(html = "") {
  return decodeHtml(
    html
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        ""
      )
      .replace(
        /<br\s*\/?>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
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

function dedupeJobs(items) {
  const map = new Map();

  for (const job of items) {
    const key =
      job.nttSn ||
      [
        job.organization,
        job.title,
        job.postedAt
      ].join("|");

    if (!map.has(key)) {
      map.set(key, job);
      continue;
    }

    /*
     * 같은 공고가 여러 페이지에서 잡힌 경우
     * 상세 URL이 있는 쪽 우선
     */
    const old =
      map.get(key);

    if (
      old.url === LIST_URL &&
      job.url !== LIST_URL
    ) {
      map.set(key, job);
    }
  }

  return [...map.values()];
}

function makeId(text) {
  let hash = 2166136261;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {
    hash ^= text.charCodeAt(i);

    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return `ice_${(
    hash >>> 0
  ).toString(36)}`;
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

main().catch(error => {
  console.error("수집 실패:", error);
  process.exit(1);
});
