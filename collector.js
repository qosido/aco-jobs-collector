const fs = require("fs");

/* =========================================================
   ACO ON JOB COLLECTOR v5
   - 인천교육청 예체능강사
   - 서울교육일자리포털 음악/악기 관련 검색
   ========================================================= */

const ICE_SEARCH_URL =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do";

const ICE_LIST_URL =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981";

const ICE_DETAIL_BASE =
  "https://www.ice.go.kr/ice/na/ntt/selectNttInfo.do?mi=10997&bbsId=1981";

const SEN_SEARCH_URL =
  "https://work.sen.go.kr/work/search/recInfo/BD_selectMainSrch.do";

const SEN_DETAIL_BASE =
  "https://work.sen.go.kr/work/search/recInfo/BD_selectRecDetail.do";

const ICE_MAX_PAGES = 10;
const SEN_MAX_PAGES_PER_KEYWORD = 3;

const SEN_KEYWORDS = [
  "플루트",
  "플룻",
  "리코더",
  "우쿨렐레",
  "우쿠렐레",
  "칼림바",
  "오케스트라",
  "관악",
  "관현악",
  "음악",
  "악기",
  "앙상블"
];

/* =========================================================
   표기 통합 / 자동 태그
   ========================================================= */

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
      "앙상블",
      "합주"
    ]
  },
  {
    tag: "음악",
    aliases: [
      "음악",
      "악기",
      "기악",
      "예술강사",
      "음악강사"
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

/* =========================================================
   MAIN
   ========================================================= */

async function main() {
  console.log("==================================");
  console.log("ACO ON Jobs Collector v5");
  console.log("==================================");

  let iceJobs = [];
  let senJobs = [];
  let iceDiagnostics = {};
  let senDiagnostics = {};

  /* ---------- 인천 ---------- */

  try {
    const result = await collectIceJobs();

    iceJobs = result.jobs;
    iceDiagnostics = result.diagnostics;

    console.log(
      `\n[인천교육청] ${iceJobs.length}개 수집 완료`
    );
  } catch (error) {
    console.error(
      "[인천교육청] 수집 실패:",
      error
    );

    iceDiagnostics = {
      error: String(error)
    };
  }

  /* ---------- 서울 ---------- */

  try {
    const result = await collectSenJobs();

    senJobs = result.jobs;
    senDiagnostics = result.diagnostics;

    console.log(
      `\n[서울교육] ${senJobs.length}개 수집 완료`
    );
  } catch (error) {
    /*
     * 서울 쪽에 문제가 생겨도
     * 인천 데이터까지 날리지 않음
     */
    console.error(
      "[서울교육] 수집 실패:",
      error
    );

    senDiagnostics = {
      error: String(error)
    };
  }

  /* ---------- 통합 ---------- */

  const combined = dedupeCombined([
    ...iceJobs,
    ...senJobs
  ]);

  combined.sort((a, b) => {
    return (
      String(b.postedAt || "").localeCompare(
        String(a.postedAt || "")
      ) ||
      String(b.deadline || "").localeCompare(
        String(a.deadline || "")
      )
    );
  });

  const activeCount =
    combined.filter(job => job.isActive).length;

  const output = {
    updatedAt: new Date().toISOString(),

    diagnostics: {
      ice: iceDiagnostics,
      sen: senDiagnostics
    },

    sourceCounts: {
      ice: iceJobs.length,
      sen: senJobs.length
    },

    count: combined.length,
    activeCount,

    jobs: combined
  };

  fs.writeFileSync(
    "jobs.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("\n==================================");
  console.log(`인천: ${iceJobs.length}`);
  console.log(`서울: ${senJobs.length}`);
  console.log(`통합: ${combined.length}`);
  console.log(`현재 모집: ${activeCount}`);
  console.log("==================================");
}

/* =========================================================
   인천교육청
   ========================================================= */

async function collectIceJobs() {
  const allJobs = [];

  const seenFingerprints = new Set();

  let pagesCollected = 0;
  let duplicatedPageDetected = false;

  for (
    let page = 1;
    page <= ICE_MAX_PAGES;
    page++
  ) {
    console.log(
      `[인천] ${page}페이지`
    );

    const html =
      await fetchIcePage(page);

    const jobs =
      parseIceJobs(html);

    if (!jobs.length) {
      break;
    }

    const fingerprint =
      jobs
        .map(job =>
          `${job.organization}|${job.title}|${job.postedAt}`
        )
        .join("::");

    if (
      seenFingerprints.has(fingerprint)
    ) {
      duplicatedPageDetected = true;
      break;
    }

    seenFingerprints.add(fingerprint);

    allJobs.push(...jobs);
    pagesCollected++;

    if (jobs.length < 10) {
      break;
    }

    await sleep(350);
  }

  const jobs =
    dedupeBySourceId(allJobs);

  return {
    jobs,

    diagnostics: {
      pagesCollected,
      rawCount: allJobs.length,
      uniqueCount: jobs.length,
      duplicatedPageDetected
    }
  };
}

async function fetchIcePage(page) {
  const form =
    new URLSearchParams();

  form.set("bbsId", "1981");
  form.set("nttSn", "");
  form.set("mi", "10997");

  form.set(
    "currPage",
    String(page)
  );

  form.set(
    "bbsTypeChk",
    "list"
  );

  form.set("srchAt1", "Y");
  form.set("srchAt2", "");
  form.set("srchAt3", "");
  form.set("srchAt4", "Y");
  form.set("srchAt5", "Y");

  form.set(
    "searchValue1",
    "예체능강사"
  );

  form.set(
    "srch1",
    "예체능강사"
  );

  form.set("arrAt1", "N");
  form.set("rcritAt", "");

  form.set(
    "listCo",
    "10"
  );

  form.set(
    "searchType",
    "sj"
  );

  const response =
    await fetchWithTimeout(
      ICE_SEARCH_URL,
      {
        method: "POST",

        headers: {
          ...browserHeaders(),

          "Content-Type":
            "application/x-www-form-urlencoded; charset=UTF-8",

          "Referer":
            ICE_LIST_URL
        },

        body:
          form.toString()
      }
    );

  if (!response.ok) {
    throw new Error(
      `ICE HTTP ${response.status}`
    );
  }

  return response.text();
}

function parseIceJobs(html) {
  const rows = [
    ...html.matchAll(
      /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    )
  ];

  const jobs = [];

  for (const rowMatch of rows) {
    const rowHtml =
      rowMatch[0];

    const rawCells = [
      ...rowHtml.matchAll(
        /<td[^>]*>([\s\S]*?)<\/td>/gi
      )
    ];

    if (
      rawCells.length < 8
    ) {
      continue;
    }

    const cells =
      rawCells.map(cell =>
        cleanText(cell[1])
      );

    const [
      postedRaw,
      statusRaw,
      organization,
      jobType,
      rawTitle,
      deadlineRaw,
      startRaw,
      endRaw
    ] = cells;

    if (
      !hasDate(postedRaw)
    ) {
      continue;
    }

    const title =
      rawTitle
        .replace(
          /^\s*N\s*/i,
          ""
        )
        .trim();

    const nttSn =
      extractIceNttSn(
        rawCells[4]?.[1] ||
          rowHtml
      );

    const searchText =
      normalizeSearchText(
        [
          organization,
          jobType,
          title
        ].join(" ")
      );

    const tags =
      detectTags(searchText);

    const instrumentTags =
      getInstrumentTags(tags);

    const recruitStatus =
      normalizeStatus(
        statusRaw
      );

    jobs.push({
      id:
        nttSn
          ? `ice_${nttSn}`
          : makeId(
              `${organization}|${title}|${postedRaw}`
            ),

      source:
        "인천교육청",

      sourceId:
        "ice",

      sourceItemId:
        nttSn || "",

      postedAt:
        normalizeDate(postedRaw),

      recruitStatus,

      isActive:
        isActiveStatus(
          recruitStatus
        ),

      organization,
      jobType,
      title,

      deadline:
        normalizeDate(
          deadlineRaw
        ),

      startDate:
        normalizeDate(
          startRaw
        ),

      endDate:
        normalizeDate(
          endRaw
        ),

      region:
        "인천",

      url:
        nttSn
          ? `${ICE_DETAIL_BASE}&nttSn=${nttSn}`
          : ICE_LIST_URL,

      tags,
      instrumentTags,

      searchText,

      autoCollected:
        true
    });
  }

  return jobs;
}

function extractIceNttSn(
  html = ""
) {
  const decoded =
    decodeHtml(html);

  const patterns = [
    /[?&]nttSn=(\d+)/i,

    /nttSn\s*[=:]\s*["']?(\d+)/i,

    /nttSn[^0-9]{0,30}(\d{5,})/i,

    /selectNttInfo[\s\S]{0,150}?(\d{5,})/i,

    /(?:fn|go|select|view)[A-Za-z0-9_]*\s*\(\s*["'](\d{5,})["']/i
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      decoded.match(pattern);

    if (match) {
      return match[1];
    }
  }

  return "";
}

/* =========================================================
   서울교육일자리포털
   ========================================================= */

async function collectSenJobs() {
  const allJobs = [];

  let requests = 0;
  let parsedBlocks = 0;

  /*
   * 검색어별 결과를 가져온 뒤
   * rcrtSn 기준으로 중복 제거
   */
  for (
    const keyword of
    SEN_KEYWORDS
  ) {
    console.log(
      `\n[서울] 검색: ${keyword}`
    );

    for (
      let page = 1;
      page <=
        SEN_MAX_PAGES_PER_KEYWORD;
      page++
    ) {
      const html =
        await fetchSenPage(
          keyword,
          page
        );

      requests++;

      const jobs =
        parseSenJobs(
          html,
          keyword
        );

      parsedBlocks +=
        jobs.length;

      console.log(
        `  ${page}페이지: ${jobs.length}개`
      );

      if (!jobs.length) {
        break;
      }

      allJobs.push(...jobs);

      /*
       * 한 페이지 최대 15개.
       * 15개 미만이면 마지막 페이지로 추정.
       */
      if (jobs.length < 15) {
        break;
      }

      await sleep(250);
    }

    await sleep(300);
  }

  const jobs =
    dedupeBySourceId(
      allJobs
    );

  return {
    jobs,

    diagnostics: {
      keywords:
        SEN_KEYWORDS,

      requests,

      rawCount:
        allJobs.length,

      uniqueCount:
        jobs.length,

      parsedBlocks
    }
  };
}

async function fetchSenPage(
  keyword,
  page
) {
  const params =
    new URLSearchParams({
      q_currPage:
        String(page),

      q_rowPerPage:
        "15",

      q_sortBy:
        "regDt",

      q_type:
        "rcrt",

      q_searchWord:
        keyword,

      /*
       * 사용자가 실제 브라우저에서
       * 확인한 값 그대로 사용
       */
      q_recClosed:
        "closed"
    });

  const url =
    `${SEN_SEARCH_URL}?${params.toString()}`;

  const response =
    await fetchWithTimeout(
      url,
      {
        method: "GET",

        headers: {
          ...browserHeaders(),

          "Referer":
            "https://work.sen.go.kr/"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `SEN HTTP ${response.status}`
    );
  }

  return response.text();
}

/*
 * 서울교육 검색결과는
 * 상세 URL의 q_rcrtSn을 기준으로 공고 인식.
 *
 * 표 / 리스트 등 HTML 구조가 변해도
 * 상세 링크가 들어있는 가장 가까운 tr 또는 li를 잡도록 구성.
 */
function parseSenJobs(
  html,
  searchKeyword
) {
  const jobs = [];

  const blocks =
    extractSenBlocks(html);

  for (
    const block of blocks
  ) {
    const idMatch =
      block.match(
        /BD_selectRecDetail\.do\?[^"'<>]*q_rcrtSn=(\d+)/i
      );

    if (!idMatch) {
      continue;
    }

    const rcrtSn =
      idMatch[1];

    const detailUrl =
      `${SEN_DETAIL_BASE}?q_rcrtSn=${rcrtSn}`;

    const title =
      extractSenTitle(
        block,
        rcrtSn
      );

    if (!title) {
      continue;
    }

    const text =
      cleanText(block);

    const normalizedText =
      normalizeSearchText(
        text
      );

    const dates =
      extractAllDates(text);

    /*
     * 날짜 배치는 서울교육 HTML 구조를
     * 완전히 확정한 뒤 더 정밀하게 다듬을 예정.
     *
     * 현재는 가장 앞쪽 = 등록일,
     * 가장 뒤쪽 = 마감일 후보.
     */
    const postedAt =
      dates[0] || "";

    const deadline =
      dates.length > 1
        ? dates[
            dates.length - 1
          ]
        : "";

    const organization =
      guessOrganization(
        text,
        title
      );

    const region =
      guessSeoulRegion(text);

    const tags =
      detectTags(
        normalizedText
      );

    const instrumentTags =
      getInstrumentTags(tags);

    /*
     * 검색 결과에 상태가 명시되면 사용.
     * 없으면 마감일 기준으로 추정.
     */
    const recruitStatus =
      guessSenStatus(
        text,
        deadline
      );

    jobs.push({
      id:
        `sen_${rcrtSn}`,

      source:
        "서울교육일자리포털",

      sourceId:
        "sen",

      sourceItemId:
        rcrtSn,

      postedAt,

      recruitStatus,

      isActive:
        isActiveStatus(
          recruitStatus
        ),

      organization,

      jobType:
        guessSenJobType(
          text
        ),

      title,

      deadline,

      startDate:
        "",

      endDate:
        "",

      region,

      url:
        detailUrl,

      tags,
      instrumentTags,

      matchedKeywords:
        [searchKeyword],

      searchText:
        normalizedText,

      autoCollected:
        true
    });
  }

  return jobs;
}

function extractSenBlocks(
  html
) {
  const results = [];

  /*
   * 1순위: table row
   */
  const trs = [
    ...html.matchAll(
      /<tr[^>]*>[\s\S]*?BD_selectRecDetail\.do\?[\s\S]*?<\/tr>/gi
    )
  ];

  for (const match of trs) {
    results.push(
      match[0]
    );
  }

  /*
   * tr에서 못 찾으면 li 구조 시도
   */
  if (!results.length) {
    const lis = [
      ...html.matchAll(
        /<li[^>]*>[\s\S]*?BD_selectRecDetail\.do\?[\s\S]*?<\/li>/gi
      )
    ];

    for (
      const match of lis
    ) {
      results.push(
        match[0]
      );
    }
  }

  /*
   * 그래도 없으면 상세 링크 주변 영역을
   * 진단용으로 잡음.
   */
  if (!results.length) {
    const linkRegex =
      /<a[^>]+href=["'][^"']*BD_selectRecDetail\.do\?[^"']*q_rcrtSn=\d+[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;

    const links = [
      ...html.matchAll(
        linkRegex
      )
    ];

    for (
      const link of links
    ) {
      results.push(
        link[0]
      );
    }
  }

  return results;
}

function extractSenTitle(
  block,
  rcrtSn
) {
  const pattern =
    new RegExp(
      `<a[^>]+href=["'][^"']*BD_selectRecDetail\\.do\\?[^"']*q_rcrtSn=${rcrtSn}[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`,
      "i"
    );

  const match =
    block.match(pattern);

  if (!match) {
    return "";
  }

  return cleanText(
    match[1]
  );
}

function guessOrganization(
  text,
  title
) {
  const schoolRegex =
    /([가-힣A-Za-z0-9·\-\s]{2,40}(?:초등학교|중학교|고등학교|학교|교육지원청|교육청|센터|재단))/;

  const match =
    text.match(
      schoolRegex
    );

  if (match) {
    return match[1]
      .replace(/\s+/g, " ")
      .trim();
  }

  /*
   * 제목 앞부분에 학교명이 있는 경우
   */
  const titleMatch =
    title.match(
      /^(.{2,30}?(?:초등학교|중학교|고등학교|학교))/
    );

  return titleMatch
    ? titleMatch[1].trim()
    : "";
}

function guessSeoulRegion(
  text
) {
  const districts = [
    "종로구",
    "중구",
    "용산구",
    "성동구",
    "광진구",
    "동대문구",
    "중랑구",
    "성북구",
    "강북구",
    "도봉구",
    "노원구",
    "은평구",
    "서대문구",
    "마포구",
    "양천구",
    "강서구",
    "구로구",
    "금천구",
    "영등포구",
    "동작구",
    "관악구",
    "서초구",
    "강남구",
    "송파구",
    "강동구"
  ];

  for (
    const district of districts
  ) {
    if (
      text.includes(district)
    ) {
      return `서울 ${district}`;
    }
  }

  return "서울";
}

function guessSenJobType(
  text
) {
  const candidates = [
    "예체능강사",
    "시간강사",
    "방과후강사",
    "방과후학교",
    "협력강사",
    "외부강사",
    "기간제교사",
    "강사"
  ];

  const found =
    candidates.filter(item =>
      text.includes(item)
    );

  return found.length
    ? [...new Set(found)]
        .join(", ")
    : "강사";
}

function guessSenStatus(
  text,
  deadline
) {
  const normalized =
    text.replace(/\s+/g, "");

  if (
    normalized.includes(
      "모집중"
    ) ||
    normalized.includes(
      "접수중"
    )
  ) {
    return "모집중";
  }

  if (
    normalized.includes(
      "대기중"
    )
  ) {
    return "대기중";
  }

  if (
    normalized.includes(
      "마감"
    ) ||
    normalized.includes(
      "모집종료"
    ) ||
    normalized.includes(
      "접수종료"
    )
  ) {
    return "모집종료";
  }

  if (deadline) {
    const today =
      koreaToday();

    return deadline >= today
      ? "모집중"
      : "모집종료";
  }

  /*
   * 정확히 판단할 수 없으면
   * 데이터를 버리지 않고 확인필요 상태.
   */
  return "확인필요";
}

/* =========================================================
   공통
   ========================================================= */

function detectTags(text) {
  const result = [];

  for (
    const group of
    KEYWORD_GROUPS
  ) {
    if (
      group.aliases.some(alias =>
        text.includes(
          normalizeSearchText(
            alias
          )
        )
      )
    ) {
      result.push(
        group.tag
      );
    }
  }

  if (!result.length) {
    result.push(
      "기타 예체능"
    );
  }

  return [
    ...new Set(result)
  ];
}

function getInstrumentTags(
  tags
) {
  return tags.filter(tag =>
    [
      "플루트",
      "리코더",
      "우쿨렐레",
      "칼림바"
    ].includes(tag)
  );
}

function normalizeSearchText(
  value = ""
) {
  let result =
    value
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  result =
    result
      .replace(
        /플룻/g,
        "플루트"
      )
      .replace(
        /우쿠렐레|우크렐레|우클렐레/g,
        "우쿨렐레"
      )
      .replace(
        /윈드\s*오케스트라/g,
        "오케스트라"
      )
      .replace(
        /관현악/g,
        "관악 오케스트라"
      );

  return result;
}

function normalizeStatus(
  value = ""
) {
  const text =
    value.replace(
      /\s+/g,
      ""
    );

  if (
    text.includes("모집중")
  ) {
    return "모집중";
  }

  if (
    text.includes("대기중") ||
    text.includes("대기")
  ) {
    return "대기중";
  }

  if (
    text.includes("종료") ||
    text.includes("마감")
  ) {
    return "모집종료";
  }

  return value.trim();
}

function isActiveStatus(
  status
) {
  return (
    status === "모집중" ||
    status === "대기중" ||
    status === "확인필요"
  );
}

function extractAllDates(
  value = ""
) {
  const matches = [
    ...value.matchAll(
      /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g
    )
  ];

  const result =
    matches.map(match =>
      [
        match[1],
        match[2].padStart(
          2,
          "0"
        ),
        match[3].padStart(
          2,
          "0"
        )
      ].join("-")
    );

  return [
    ...new Set(result)
  ];
}

function normalizeDate(
  value = ""
) {
  const match =
    value.match(
      /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/
    );

  if (!match) {
    return "";
  }

  return [
    match[1],
    match[2].padStart(
      2,
      "0"
    ),
    match[3].padStart(
      2,
      "0"
    )
  ].join("-");
}

function hasDate(
  value = ""
) {
  return (
    /\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(
      value
    )
  );
}

function cleanText(
  html = ""
) {
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
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function decodeHtml(
  value = ""
) {
  return value
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&#160;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&apos;/gi,
      "'"
    );
}

function dedupeBySourceId(
  items
) {
  const map =
    new Map();

  for (
    const job of items
  ) {
    const key =
      job.sourceItemId ||
      [
        job.sourceId,
        job.organization,
        job.title,
        job.postedAt
      ].join("|");

    if (!map.has(key)) {
      map.set(
        key,
        job
      );
      continue;
    }

    /*
     * 서울 공고가 여러 검색어에 걸린 경우
     * 검색어 목록 합치기
     */
    const old =
      map.get(key);

    if (
      old.matchedKeywords ||
      job.matchedKeywords
    ) {
      old.matchedKeywords = [
        ...new Set([
          ...(old.matchedKeywords || []),
          ...(job.matchedKeywords || [])
        ])
      ];
    }
  }

  return [
    ...map.values()
  ];
}

function dedupeCombined(
  items
) {
  const map =
    new Map();

  for (
    const job of items
  ) {
    /*
     * 출처가 다르면 같은 학교/제목이어도
     * 원문 공고가 다를 수 있으므로 별도 유지.
     */
    const key =
      `${job.sourceId}:${job.sourceItemId || job.id}`;

    if (!map.has(key)) {
      map.set(
        key,
        job
      );
    }
  }

  return [
    ...map.values()
  ];
}

function koreaToday() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Seoul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
      }
    );

  return formatter.format(
    new Date()
  );
}

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 20000
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeout
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal,
        redirect:
          "follow"
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

function browserHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 Chrome/131 Safari/537.36",

    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

    "Accept-Language":
      "ko-KR,ko;q=0.9,en;q=0.8"
  };
}

function makeId(text) {
  let hash =
    2166136261;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {
    hash ^=
      text.charCodeAt(i);

    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (
    "job_" +
    (hash >>> 0)
      .toString(36)
  );
}

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

main().catch(error => {
  console.error(
    "전체 수집 실패:",
    error
  );

  process.exit(1);
});
