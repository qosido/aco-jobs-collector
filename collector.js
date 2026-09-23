const fs = require("fs");

/* =========================================================
   ACO ON JOB COLLECTOR v5 FIXED
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
  "https://work.sen.go.kr/work/search/recInfo/BD_selectSrchRecInfo.do";

const SEN_DETAIL_BASE =
  "https://work.sen.go.kr/work/search/recInfo/BD_selectRecDetail.do";

const ARTMORE_SEARCH_URL =
  "https://www.artmore.kr/sub/recruit/search_list.do";

const ARTMORE_DETAIL_BASE =
  "https://www.artmore.kr/sub/recruit/search_view.do";

const ARTINFO_SEARCH_URL =
  "https://www.artinfokorea.com/jobs";

const ARTINFO_DETAIL_BASE =
  "https://www.artinfokorea.com/jobs";

const LESSONINFO_SEARCH_URL =
  "https://www.lessoninfo.co.kr/music-jobs";

const LESSONINFO_KEYWORDS = [
  "플루트",
  "플룻"
];

const LESSONINFO_MAX_PAGES_PER_KEYWORD = 5;
const LESSONINFO_USE_PLAYWRIGHT = true;

const GOE_SEARCH_URL =
  "https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancList.do";

const GOE_DETAIL_BASE =
  "https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancView.do";

const GOE_REGIONS = [
  "부천시",
  "김포시",
  "시흥시",
  "광명시"
];

const GOE_KEYWORDS = [
  "플루트",
  "플룻",
  "리코더",
  "우쿨렐레",
  "우쿠렐레",
  "칼림바",
  "음악",
  "관악",
  "관현악",
  "오케스트라",
  "악기",
  "방과후"
];

const GOE_MAX_PAGES_PER_QUERY = 3;

/*
 * 레슨인포에서 사용자가 직접 확인한 '인천 전체' 검색값.
 */
const LESSONINFO_INCHEON = {
  wrArea0: "20130716174916_3863",
  wrArea1All: "20131126132601_5023_all"
};

const ICE_MAX_PAGES = 10;
const SEN_MAX_PAGES_PER_KEYWORD = 3;
const ARTMORE_MAX_PAGES_PER_KEYWORD = 10;

const ARTMORE_KEYWORDS = [
  "플루트",
  "플룻"
];

const ARTINFO_KEYWORDS = [
  "플루트",
  "플룻",
  "flute"
];

const ARTMORE_ALLOWED_REGIONS = [
  "서울",
  "인천",
  "부천",
  "김포",
  "시흥",
  "광명"
];

const ARTMORE_AREA_CODES = {
  인천: "2000-2053",
  부천: "2000-2083-2097",
  광명: "2000-2083-2098",
  시흥: "2000-2083-2112",
  김포: "2000-2083-2123"
};

let iceSessionCookie = "";
let lessoninfoSessionCookie = "";

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

const KEYWORD_GROUPS = [
  { tag: "플루트", aliases: ["플루트", "플룻", "flute"] },
  { tag: "리코더", aliases: ["리코더", "recorder"] },
  { tag: "우쿨렐레", aliases: ["우쿨렐레", "우쿠렐레", "우크렐레", "우클렐레", "ukulele"] },
  { tag: "칼림바", aliases: ["칼림바", "kalimba"] },
  { tag: "관악·오케스트라", aliases: ["관악", "관현악", "오케스트라", "윈드오케스트라", "윈드 오케스트라", "앙상블", "합주"] },
  { tag: "음악", aliases: ["음악", "악기", "기악", "예술강사", "음악강사"] },
  { tag: "스포츠", aliases: ["스포츠", "체육", "축구", "농구", "배드민턴", "탁구"] },
  { tag: "미술", aliases: ["미술", "회화", "디자인", "공예"] },
  { tag: "영상", aliases: ["영상", "미디어", "사진", "콘텐츠"] },
  { tag: "무용", aliases: ["무용", "댄스", "발레"] }
];

async function main() {
  console.log("==================================");
  console.log("ACO ON Jobs Collector v12");
  console.log("ICE + SEN + ARTMORE + ARTINFO + LESSONINFO + GOE");
  console.log("==================================");

  let iceJobs = [];
  let senJobs = [];
  let artmoreJobs = [];
  let artinfoJobs = [];
  let lessoninfoJobs = [];
  let goeJobs = [];

  let iceDiagnostics = {};
  let senDiagnostics = {};
  let artmoreDiagnostics = {};
  let artinfoDiagnostics = {};
  let lessoninfoDiagnostics = {};
  let goeDiagnostics = {};

  try {
    const result = await collectIceJobs();
    iceJobs = result.jobs;
    iceDiagnostics = result.diagnostics;
    console.log(`\n[인천교육청] ${iceJobs.length}개 수집 완료`);
  } catch (error) {
    console.error("[인천교육청] 수집 실패:", error);
    iceDiagnostics = { error: String(error) };
  }

  try {
    const result = await collectSenJobs();
    senJobs = result.jobs;
    senDiagnostics = result.diagnostics;
    console.log(`\n[서울교육] ${senJobs.length}개 수집 완료`);
  } catch (error) {
    console.error("[서울교육] 수집 실패:", error);
    senDiagnostics = { error: String(error) };
  }

  try {
    const result = await collectArtmoreJobs();
    artmoreJobs = result.jobs;
    artmoreDiagnostics = result.diagnostics;
    console.log(`\n[아트모아] ${artmoreJobs.length}개 수집 완료`);
  } catch (error) {
    console.error("[아트모아] 수집 실패:", error);
    artmoreDiagnostics = { error: String(error) };
  }

  try {
    const result = await collectArtinfoJobs();
    artinfoJobs = result.jobs;
    artinfoDiagnostics = result.diagnostics;
    console.log(`\n[아트인포] ${artinfoJobs.length}개 수집 완료`);
  } catch (error) {
    console.error("[아트인포] 수집 실패:", error);
    artinfoDiagnostics = { error: String(error) };
  }

  try {
    const result = await collectLessoninfoJobs();
    lessoninfoJobs = result.jobs;
    lessoninfoDiagnostics = result.diagnostics;
    console.log(`\n[레슨인포] ${lessoninfoJobs.length}개 수집 완료`);
  } catch (error) {
    console.error("[레슨인포] 수집 실패:", error);
    lessoninfoDiagnostics = { error: String(error) };
  }

  try {
    const result = await collectGoeJobs();
    goeJobs = result.jobs;
    goeDiagnostics = result.diagnostics;
    console.log(`\n[경기도교육청] ${goeJobs.length}개 수집 완료`);
  } catch (error) {
    console.error("[경기도교육청] 수집 실패:", error);
    goeDiagnostics = { error: String(error) };
  }

  const combined = dedupeCombined([
    ...iceJobs,
    ...senJobs,
    ...artmoreJobs,
    ...artinfoJobs,
    ...lessoninfoJobs,
    ...goeJobs
  ]);

  combined.sort((a, b) => {
    return (
      String(b.postedAt || "").localeCompare(String(a.postedAt || "")) ||
      String(b.deadline || "").localeCompare(String(a.deadline || ""))
    );
  });

  const activeCount =
    combined.filter(job => job.isActive).length;

  const output = {
    updatedAt: new Date().toISOString(),
    diagnostics: {
      ice: iceDiagnostics,
      sen: senDiagnostics,
      artmore: artmoreDiagnostics,
      artinfo: artinfoDiagnostics,
      lessoninfo: lessoninfoDiagnostics,
      goe: goeDiagnostics
    },
    sourceCounts: {
      ice: iceJobs.length,
      sen: senJobs.length,
      artmore: artmoreJobs.length,
      artinfo: artinfoJobs.length,
      lessoninfo: lessoninfoJobs.length,
      goe: goeJobs.length
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
  console.log(`인천교육청: ${iceJobs.length}`);
  console.log(`서울교육: ${senJobs.length}`);
  console.log(`아트모아: ${artmoreJobs.length}`);
  console.log(`아트인포: ${artinfoJobs.length}`);
  console.log(`레슨인포: ${lessoninfoJobs.length}`);
  console.log(`경기도교육청: ${goeJobs.length}`);
  console.log(`통합: ${combined.length}`);
  console.log(`현재 모집: ${activeCount}`);
  console.log("==================================");
}

async function collectIceJobs() {
  const allJobs = [];
  const seenFingerprints = new Set();

  let pagesCollected = 0;
  let duplicatedPageDetected = false;

  let firstPageHtmlLength = 0;
  let firstPageTrCount = 0;
  let firstPageTdCount = 0;
  let firstPageHasArtInstructor = false;
  let firstPageHasRecruiting = false;
  let firstPagePreview = "";

  for (let page = 1; page <= ICE_MAX_PAGES; page++) {
    console.log(`[인천] ${page}페이지`);

    const html = await fetchIcePage(page);

    if (page === 1) {
      firstPageHtmlLength = html.length;
      firstPageTrCount = (html.match(/<tr\b/gi) || []).length;
      firstPageTdCount = (html.match(/<td\b/gi) || []).length;
      firstPageHasArtInstructor = html.includes("예체능강사");
      firstPageHasRecruiting = html.includes("모집중");

      const plain = cleanText(html);
      firstPagePreview = plain.slice(0, 500);

      console.log("[인천 진단]");
      console.log(`  HTML 길이: ${firstPageHtmlLength}`);
      console.log(`  TR 개수: ${firstPageTrCount}`);
      console.log(`  TD 개수: ${firstPageTdCount}`);
      console.log(`  예체능강사 포함: ${firstPageHasArtInstructor}`);
      console.log(`  모집중 포함: ${firstPageHasRecruiting}`);
    }

    const jobs = parseIceJobs(html);

    console.log(`  파싱 결과: ${jobs.length}개`);

    if (!jobs.length) break;

    const fingerprint = jobs
      .map(job => `${job.organization}|${job.title}|${job.postedAt}`)
      .join("::");

    if (seenFingerprints.has(fingerprint)) {
      duplicatedPageDetected = true;
      break;
    }

    seenFingerprints.add(fingerprint);
    allJobs.push(...jobs);
    pagesCollected++;

    if (jobs.length < 10) break;
    await sleep(350);
  }

  const jobs = dedupeBySourceId(allJobs);

  return {
    jobs,
    diagnostics: {
      pagesCollected,
      rawCount: allJobs.length,
      uniqueCount: jobs.length,
      duplicatedPageDetected,
      firstPageHtmlLength,
      firstPageTrCount,
      firstPageTdCount,
      firstPageHasArtInstructor,
      firstPageHasRecruiting,
      firstPagePreview
    }
  };
}

async function fetchIcePage(page) {
  async function bootstrapIceSession() {
    iceSessionCookie = "";

    const bootstrap = await fetchWithTimeout(
      ICE_LIST_URL,
      {
        method: "GET",
        headers: {
          ...browserHeaders(),
          "Cache-Control": "no-cache"
        }
      }
    );

    if (!bootstrap.ok) {
      throw new Error(
        `ICE bootstrap HTTP ${bootstrap.status}`
      );
    }

    let setCookies = [];

    if (
      typeof bootstrap.headers.getSetCookie === "function"
    ) {
      setCookies =
        bootstrap.headers.getSetCookie();
    } else {
      const raw =
        bootstrap.headers.get("set-cookie");

      if (raw) {
        setCookies = [raw];
      }
    }

    iceSessionCookie =
      setCookies
        .map(cookie =>
          cookie.split(";")[0]
        )
        .filter(Boolean)
        .join("; ");

    await bootstrap.text();

    console.log(
      `[인천] 세션 준비 / 쿠키 ${iceSessionCookie ? "있음" : "없음"}`
    );
  }

  async function requestIcePage() {
    const form = new URLSearchParams();

    form.set("bbsId", "1981");
    form.set("nttSn", "");
    form.set("mi", "10997");
    form.set("currPage", String(page));
    form.set("bbsTypeChk", "list");
    form.set("srchAt1", "Y");
    form.set("srchAt2", "");
    form.set("srchAt3", "");
    form.set("srchAt4", "Y");
    form.set("srchAt5", "Y");
    form.set("searchValue1", "예체능강사");
    form.set("srch1", "예체능강사");
    form.set("arrAt1", "N");
    form.set("rcritAt", "");
    form.set("listCo", "10");
    form.set("searchType", "sj");

    const headers = {
      ...browserHeaders(),
      "Content-Type":
        "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer":
        ICE_LIST_URL,
      "Origin":
        "https://www.ice.go.kr",
      "Cache-Control":
        "no-cache"
    };

    if (iceSessionCookie) {
      headers["Cookie"] =
        iceSessionCookie;
    }

    const response = await fetchWithTimeout(
      ICE_SEARCH_URL,
      {
        method: "POST",
        headers,
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

  if (!iceSessionCookie) {
    await bootstrapIceSession();
  }

  let body =
    await requestIcePage();

  /*
   * 인천교육청은 간헐적으로 77바이트 안팎의 빈 응답을 준다.
   * 이 경우 새 세션을 만든 뒤 2회까지 다시 시도한다.
   */
  for (
    let retry = 1;
    body.length < 500 && retry <= 2;
    retry++
  ) {
    console.log(
      `[인천] 짧은 응답 ${body.length} bytes → 세션 재생성 후 재시도 ${retry}`
    );

    await sleep(
      700 * retry
    );

    await bootstrapIceSession();

    body =
      await requestIcePage();
  }

  if (body.length < 500) {
    console.log(
      "[인천] 최종 짧은 응답:",
      JSON.stringify(body)
    );
  }

  return body;
}

function parseIceJobs(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const jobs = [];

  for (const rowMatch of rows) {
    const rowHtml = rowMatch[0];
    const rawCells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];

    if (rawCells.length < 8) continue;

    const cells = rawCells.map(cell => cleanText(cell[1]));

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

    if (!hasDate(postedRaw)) continue;

    const title = rawTitle.replace(/^\s*N\s*/i, "").trim();
    const nttSn = extractIceNttSn(rawCells[4]?.[1] || rowHtml);

    const searchText = normalizeSearchText(
      [organization, jobType, title].join(" ")
    );

    const tags = detectTags(searchText);
    const instrumentTags = getInstrumentTags(tags);
    const recruitStatus = normalizeStatus(statusRaw);

    jobs.push({
      id: nttSn ? `ice_${nttSn}` : makeId(`${organization}|${title}|${postedRaw}`),
      source: "인천교육청",
      sourceId: "ice",
      sourceItemId: nttSn || "",
      postedAt: normalizeDate(postedRaw),
      recruitStatus,
      isActive: isActiveStatus(recruitStatus),
      organization,
      jobType,
      title,
      deadline: normalizeDate(deadlineRaw),
      startDate: normalizeDate(startRaw),
      endDate: normalizeDate(endRaw),
      region: "인천",
      url: nttSn ? `${ICE_DETAIL_BASE}&nttSn=${nttSn}` : ICE_LIST_URL,
      tags,
      instrumentTags,
      searchText,
      autoCollected: true
    });
  }

  return jobs;
}

function extractIceNttSn(html = "") {
  const decoded = decodeHtml(html);

  const patterns = [
    /[?&]nttSn=(\d+)/i,
    /nttSn\s*[=:]\s*["']?(\d+)/i,
    /nttSn[^0-9]{0,30}(\d{5,})/i,
    /selectNttInfo[\s\S]{0,150}?(\d{5,})/i,
    /(?:fn|go|select|view)[A-Za-z0-9_]*\s*\(\s*["'](\d{5,})["']/i
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) return match[1];
  }

  return "";
}

async function collectSenJobs() {
  const allJobs = [];
  let requests = 0;
  let parsedBlocks = 0;

  for (const keyword of SEN_KEYWORDS) {
    console.log(`\n[서울] 검색: ${keyword}`);

    for (let page = 1; page <= SEN_MAX_PAGES_PER_KEYWORD; page++) {
      const html = await fetchSenPage(keyword, page);
      requests++;

      const jobs = parseSenJobs(html, keyword);
      parsedBlocks += jobs.length;

      console.log(`  ${page}페이지: ${jobs.length}개`);

      if (!jobs.length) break;

      allJobs.push(...jobs);

      if (jobs.length < 15) break;
      await sleep(250);
    }

    await sleep(300);
  }

  const jobs = dedupeBySourceId(allJobs);

  return {
    jobs,
    diagnostics: {
      keywords: SEN_KEYWORDS,
      requests,
      rawCount: allJobs.length,
      uniqueCount: jobs.length,
      parsedBlocks
    }
  };
}

async function fetchSenPage(keyword, page) {
  const params = new URLSearchParams({
    q_currPage: String(page),
    q_rowPerPage: "15",
    q_sortBy: "regDt",
    q_srchText: keyword,
    q_srchType: "rcrtTtl",
    q_recClosed: "closed",
    q_srchArea: "",
    q_srchJob: "",
    q_srchSchl: "",
    q_jobCategory: "",
    q_mySrchArea: "",
    q_tabId: "",
    q_today: ""
  });

  const url = `${SEN_SEARCH_URL}?${params.toString()}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      ...browserHeaders(),
      "Referer": "https://work.sen.go.kr/"
    }
  });

  if (!response.ok) throw new Error(`SEN HTTP ${response.status}`);
  return response.text();
}

function parseSenJobs(html, searchKeyword) {
  const jobs = [];
  const blocks = extractSenJobBlocks(html);

  for (const block of blocks) {
    const idMatch = block.match(
      /BD_selectRecDetail\.do\?[^"'<>]*q_rcrtSn=(\d+)/i
    );

    if (!idMatch) continue;

    const rcrtSn = idMatch[1];
    const detailUrl = `${SEN_DETAIL_BASE}?q_rcrtSn=${rcrtSn}`;
    const text = cleanText(block);

    const organization = extractSenOrganization(text);
    const postedAt = extractSenPostedAt(text);
    const title = extractSenTitleFromText(text, organization);

    if (!title) continue;

    const region = extractSenRegion(text);
    const reception = extractSenDateRange(text, "접수기간");
    const employment = extractSenDateRange(text, "채용기간");
    const jobType = extractSenJobType(text);

    const subjectText =
      text.match(
        /과목\(담당업무\)\s*(.*?)(?=\s+채용인원|\s+보수\/임금|\s+모집정보)/i
      )?.[1] || "";

    const normalizedText = normalizeSearchText(
      [organization, title, subjectText].join(" ")
    );

    const tags = detectTags(normalizedText);
    const instrumentTags = getInstrumentTags(tags);
    const deadline = reception.end || "";

    const recruitStatus = deadline
      ? (deadline >= koreaToday() ? "모집중" : "모집종료")
      : "확인필요";

    jobs.push({
      id: `sen_${rcrtSn}`,
      source: "서울교육일자리포털",
      sourceId: "sen",
      sourceItemId: rcrtSn,
      postedAt,
      recruitStatus,
      isActive: isActiveStatus(recruitStatus),
      organization,
      jobType,
      title,
      deadline,
      startDate: employment.start || "",
      endDate: employment.end || "",
      region,
      url: detailUrl,
      tags,
      instrumentTags,
      matchedKeywords: [searchKeyword],
      searchText: normalizedText,
      autoCollected: true
    });
  }

  return jobs;
}

function extractSenJobBlocks(html) {
  const blocks = [];

  const lis = [
    ...html.matchAll(
      /<li[^>]*>[\s\S]*?BD_selectRecDetail\.do\?[\s\S]*?<\/li>/gi
    )
  ];

  for (const match of lis) blocks.push(match[0]);

  if (!blocks.length) {
    const trs = [
      ...html.matchAll(
        /<tr[^>]*>[\s\S]*?BD_selectRecDetail\.do\?[\s\S]*?<\/tr>/gi
      )
    ];

    for (const match of trs) blocks.push(match[0]);
  }

  if (!blocks.length) {
    const linkPositions = [
      ...html.matchAll(
        /BD_selectRecDetail\.do\?[^"'<>]*q_rcrtSn=\d+/gi
      )
    ];

    for (let i = 0; i < linkPositions.length; i++) {
      const current = linkPositions[i];
      const start = Math.max(0, current.index - 1800);
      const next = linkPositions[i + 1];
      const end = next
        ? Math.min(html.length, next.index - 50)
        : Math.min(html.length, current.index + 5000);

      blocks.push(html.slice(start, end));
    }
  }

  const map = new Map();

  for (const block of blocks) {
    const idMatch = block.match(/q_rcrtSn=(\d+)/i);
    if (!idMatch) continue;

    const id = idMatch[1];

    if (!map.has(id) || block.length < map.get(id).length) {
      map.set(id, block);
    }
  }

  return [...map.values()];
}

function extractSenOrganization(text = "") {
  /*
   * 서울교육 검색결과에서 공고 기관은 보통
   * "학교명 | 전화번호 | 등록일 : YYYY-MM-DD"
   * 형태로 나타난다.
   *
   * 페이지 상단 메뉴/필터 텍스트가 앞에 섞일 수 있으므로,
   * 전화번호 바로 앞의 마지막 덩어리만 기관명으로 사용한다.
   */
  const phoneMatches = [
    ...text.matchAll(
      /([^|]{1,80}?)\s*\|\s*(0\d{1,2}-\d{3,4}-\d{4})\s*\|\s*등록일\s*:/gi
    )
  ];

  if (phoneMatches.length) {
    const raw = phoneMatches[phoneMatches.length - 1][1]
      .replace(/\s+/g, " ")
      .trim();

    /*
     * 혹시 앞쪽 메뉴 문구가 같은 덩어리에 남아 있어도
     * 학교/유치원/기관명으로 보이는 마지막 부분만 취한다.
     */
    const schoolLike = raw.match(
      /([가-힣A-Za-z0-9·()\-]{2,50}(?:병설유치원|유치원|초등학교|중학교|고등학교|학교|교육지원청|교육청|센터|재단))$/
    );

    return schoolLike
      ? schoolLike[1].trim()
      : raw;
  }

  /*
   * 전화번호 패턴이 없는 경우에는 등록일 앞쪽의
   * 마지막 학교/기관명 후보를 사용한다.
   */
  const beforePosted =
    text.split(/등록일\s*:/i)[0] || text;

  const candidates = [
    ...beforePosted.matchAll(
      /([가-힣A-Za-z0-9·()\-]{2,50}(?:병설유치원|유치원|초등학교|중학교|고등학교|학교|교육지원청|교육청|센터|재단))/g
    )
  ];

  if (candidates.length) {
    return candidates[candidates.length - 1][1]
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

function extractSenPostedAt(text = "") {
  const match = text.match(
    /등록일\s*:\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2})/i
  );

  return match ? normalizeDate(match[1]) : "";
}

function extractSenTitleFromText(text = "", organization = "") {
  let match = text.match(
    /조회수\s*:\s*\d+\s*(.*?)(?=\s+과목\(담당업무\))/i
  );

  if (match) {
    return match[1]
      .replace(/-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  match = text.match(
    /등록일\s*:\s*\d{4}[./-]\d{1,2}[./-]\d{1,2}\s*(.*?)(?=\s+과목\(담당업무\))/i
  );

  if (match) {
    return match[1]
      .replace(/조회수\s*:\s*\d+/i, "")
      .replace(/-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const subjectIndex = text.indexOf("과목(담당업무)");

  if (subjectIndex > 0) {
    let before = text.slice(0, subjectIndex).trim();

    if (organization) {
      before = before.replace(organization, "");
    }

    before = before
      .replace(/\|\s*[\d-]+\s*\|/g, " ")
      .replace(/등록일\s*:[^ ]+/g, " ")
      .replace(/조회수\s*:\s*\d+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return before;
  }

  return "";
}

function extractSenRegion(text = "") {
  const direct = text.match(
    /모집정보\s+(강남구|강동구|강북구|강서구|관악구|광진구|구로구|금천구|노원구|도봉구|동대문구|동작구|마포구|서대문구|서초구|성동구|성북구|송파구|양천구|영등포구|용산구|은평구|종로구|중구|중랑구)\s+접수기간/i
  );

  if (direct) {
    return `서울 ${direct[1]}`;
  }

  const districts = [
    "강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구",
    "노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구",
    "성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"
  ];

  const start = text.indexOf("모집정보");
  const scoped = start >= 0 ? text.slice(start) : text;

  for (const district of districts) {
    if (scoped.includes(district)) {
      return `서울 ${district}`;
    }
  }

  return "서울";
}

function extractSenDateRange(text = "", label = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `${escaped}\\s*(\\d{4}[./-]\\d{1,2}[./-]\\d{1,2})(?:\\s+\\d{1,2}:\\d{2})?\\s*~\\s*(\\d{4}[./-]\\d{1,2}[./-]\\d{1,2})(?:\\s+\\d{1,2}:\\d{2})?`,
    "i"
  );

  const match = text.match(regex);

  if (!match) {
    return { start: "", end: "" };
  }

  return {
    start: normalizeDate(match[1]),
    end: normalizeDate(match[2])
  };
}

function extractSenJobType(text = "") {
  const match = text.match(
    /직무분야\s*(.*?)(?=\s+(?:이메일지원|방문접수|우편접수|홈페이지지원|~\s*\d{4}|$))/i
  );

  if (match) {
    return match[1].replace(/\s+/g, " ").trim();
  }

  if (text.includes("기간제교원")) return "기간제교원";
  if (text.includes("시간강사")) return "시간강사";
  if (text.includes("방과후")) return "방과후강사";

  return "강사";
}


/* =========================================================
   아트모아
   - 플루트 / 플룻만 검색
   - 전국 검색 후 서울/인천/부천/김포/시흥/광명만 유지
   ========================================================= */

async function collectArtmoreJobs() {
  const allJobs = [];
  let requests = 0;
  let rawParsedCount = 0;
  let regionFilteredCount = 0;
  const keywordCounts = {};

  for (const keyword of ARTMORE_KEYWORDS) {
    console.log(`\n[아트모아] 검색: ${keyword}`);
    let keywordRaw = 0;

    for (let page = 1; page <= ARTMORE_MAX_PAGES_PER_KEYWORD; page++) {
      const html = await fetchArtmorePage(keyword, page);
      requests++;

      const parsed = parseArtmoreJobs(html, keyword);
      rawParsedCount += parsed.length;
      keywordRaw += parsed.length;

      const allowed = parsed.filter(job =>
        isArtmoreAllowedRegion(job.region, job.searchText)
      );

      regionFilteredCount += allowed.length;
      allJobs.push(...allowed);

      console.log(
        `  ${page}페이지: 파싱 ${parsed.length} / 지역통과 ${allowed.length}`
      );

      if (parsed.length < 10) break;
      await sleep(300);
    }

    keywordCounts[keyword] = keywordRaw;
    await sleep(400);
  }

  const jobs = dedupeBySourceId(allJobs);

  return {
    jobs,
    diagnostics: {
      keywords: ARTMORE_KEYWORDS,
      allowedRegions: ARTMORE_ALLOWED_REGIONS,
      knownAreaCodes: ARTMORE_AREA_CODES,
      requests,
      rawParsedCount,
      regionFilteredCount,
      uniqueCount: jobs.length,
      keywordCounts
    }
  };
}

async function fetchArtmorePage(keyword, page) {
  const form = new URLSearchParams();

  form.append("page", String(page));
  form.append("listSize", "10");
  form.append("sort_type", "1");
  form.append("exclude_end_yn", "");
  form.append("artmore_yn", "");
  form.append("search_cd", "");
  form.append("search_nm", "");
  form.append("search_val", "");
  form.append("keyword", keyword);

  form.append("array_keyword_kind", "1");
  form.append("array_keyword_kind", "2");
  form.append("array_keyword_kind", "3");

  form.append("school_code", "");
  form.append("school_type", "");
  form.append("merit_type", "");
  form.append("pay_type", "");
  form.append("reg_date", "");
  form.append("last_date", "");

  const response = await fetchWithTimeout(
    ARTMORE_SEARCH_URL,
    {
      method: "POST",
      headers: {
        ...browserHeaders(),
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": ARTMORE_SEARCH_URL,
        "Origin": "https://www.artmore.kr"
      },
      body: form.toString()
    }
  );

  if (!response.ok) {
    throw new Error(`ARTMORE HTTP ${response.status}`);
  }

  const body = await response.text();

  if (page === 1) {
    console.log(`[아트모아] ${keyword} HTML 길이: ${body.length}`);
  }

  return body;
}

function parseArtmoreJobs(html, searchKeyword) {
  const jobs = [];

  const rows = [
    ...html.matchAll(
      /<tr[^>]*>[\s\S]*?rec_idx=\d+[\s\S]*?<\/tr>/gi
    )
  ];

  for (const rowMatch of rows) {
    const rowHtml = rowMatch[0];
    const idMatch = rowHtml.match(/rec_idx=(\d+)/i);
    if (!idMatch) continue;

    const recIdx = idMatch[1];
    const cells = [
      ...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    ];
    const cellText = cells.map(cell => cleanText(cell[1]));
    const rowText = cleanText(rowHtml);

    let title = "";
    const titlePatterns = [
      new RegExp(
        `<a[^>]+href=["'][^"']*search_view\\.do\\?[^"']*rec_idx=${recIdx}[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`,
        "i"
      ),
      new RegExp(
        `<a[^>]+[^>]*rec_idx=${recIdx}[^>]*>([\\s\\S]*?)<\\/a>`,
        "i"
      )
    ];

    for (const pattern of titlePatterns) {
      const match = rowHtml.match(pattern);
      if (!match) continue;

      const candidate = cleanText(match[1])
        .replace(/^(진행중|마감)\s*/i, "")
        .trim();

      if (candidate.length >= 3) {
        title = candidate;
        break;
      }
    }

    if (!title && cellText.length >= 2) {
      title = cellText[1]
        .replace(/^(진행중|마감)\s*/i, "")
        .replace(/\s+(경력무관|신입|경력).*$/i, "")
        .trim();
    }

    if (!title) continue;

    let organization = cellText[0] || "";
    organization = organization
      .replace(/관심기업등록/gi, "")
      .replace(/Image/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const region = extractArtmoreRegion(rowText);

    const postedMatch = rowText.match(
      /(\d{4}[./-]\d{1,2}[./-]\d{1,2})\s*등록/i
    );
    const deadlineMatch = rowText.match(
      /(\d{4}[./-]\d{1,2}[./-]\d{1,2})\s*마감/i
    );

    const postedAt = postedMatch ? normalizeDate(postedMatch[1]) : "";
    const deadline = deadlineMatch ? normalizeDate(deadlineMatch[1]) : "";

    let recruitStatus = "확인필요";

    if (/진행중/i.test(rowText) || /채용시까지/i.test(rowText)) {
      recruitStatus = "모집중";
    } else if (deadline) {
      recruitStatus = deadline >= koreaToday() ? "모집중" : "모집종료";
    } else if (/마감/i.test(rowText)) {
      recruitStatus = "모집종료";
    }

    const employmentType = extractArtmoreEmploymentType(rowText);
    const searchText = normalizeSearchText(
      [organization, title, region, rowText].join(" ")
    );

    const tags = detectTags(
      normalizeSearchText(`${title} ${searchKeyword}`)
    );

    if (!tags.includes("플루트")) tags.unshift("플루트");

    jobs.push({
      id: `artmore_${recIdx}`,
      source: "아트모아",
      sourceId: "artmore",
      sourceItemId: recIdx,
      postedAt,
      recruitStatus,
      isActive: isActiveStatus(recruitStatus),
      organization,
      jobType: employmentType || "예술·공연",
      title,
      deadline,
      startDate: "",
      endDate: "",
      region,
      address: extractArtmoreAddress(rowText),
      url: `${ARTMORE_DETAIL_BASE}?rec_idx=${recIdx}`,
      tags: [...new Set(tags)],
      instrumentTags: ["플루트"],
      matchedKeywords: [searchKeyword],
      searchText,
      autoCollected: true
    });
  }

  return jobs;
}

function extractArtmoreRegion(text = "") {
  const patterns = [
    /(서울(?:특별시)?\s*[가-힣]+구)/,
    /(인천(?:광역시)?\s*[가-힣]+구)/,
    /(경기(?:도)?\s*부천시(?:\s*[가-힣]+구)?)/,
    /(경기(?:도)?\s*김포시)/,
    /(경기(?:도)?\s*시흥시)/,
    /(경기(?:도)?\s*광명시)/,
    /(부천시(?:\s*[가-힣]+구)?)/,
    /(김포시)/,
    /(시흥시)/,
    /(광명시)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    let result = match[1].replace(/\s+/g, " ").trim();

    if (/^(부천시|김포시|시흥시|광명시)/.test(result)) {
      result = `경기 ${result}`;
    }

    return result;
  }

  return "";
}

function isArtmoreAllowedRegion(region = "", searchText = "") {
  const text = `${region} ${searchText}`;

  return (
    /서울(?:특별시)?/.test(text) ||
    /인천(?:광역시)?/.test(text) ||
    /부천시/.test(text) ||
    /김포시/.test(text) ||
    /시흥시/.test(text) ||
    /광명시/.test(text)
  );
}

function extractArtmoreEmploymentType(text = "") {
  const types = [
    "정규직",
    "계약직",
    "시간선택제",
    "인턴",
    "파견근로",
    "대체인력",
    "프리랜서",
    "관계없음"
  ];

  return [...new Set(types.filter(type => text.includes(type)))].join(", ");
}

function extractArtmoreAddress(text = "") {
  const match = text.match(
    /((?:서울(?:특별시)?|인천(?:광역시)?|경기(?:도)?)\s+[가-힣0-9·\-\s]+(?:로|길)\s*\d+(?:-\d+)?(?:\s*\([^)]+\))?)/i
  );

  return match
    ? match[1].replace(/\s+/g, " ").trim()
    : "";
}


/* =========================================================
   아트인포
   - 전문 연주/예술단체 공고
   - 지역 제한 없음
   - 플루트 / 플룻 / flute 각각 검색 후 job id로 중복 제거
   ========================================================= */

async function collectArtinfoJobs() {
  const discovered = new Map();
  let searchRequests = 0;
  let detailRequests = 0;
  const keywordCounts = {};

  for (const keyword of ARTINFO_KEYWORDS) {
    console.log(`\n[아트인포] 검색: ${keyword}`);

    const html = await fetchArtinfoSearch(keyword);
    searchRequests++;

    const ids = extractArtinfoIds(html);
    keywordCounts[keyword] = ids.length;

    console.log(`  검색결과 링크: ${ids.length}개`);

    for (const id of ids) {
      if (!discovered.has(id)) {
        discovered.set(id, new Set());
      }
      discovered.get(id).add(keyword);
    }

    await sleep(300);
  }

  const jobs = [];

  for (const [id, matchedSet] of discovered.entries()) {
    try {
      const html = await fetchArtinfoDetail(id);
      detailRequests++;

      const job = parseArtinfoDetail(
        html,
        id,
        [...matchedSet]
      );

      if (job) {
        jobs.push(job);
      }
    } catch (error) {
      console.error(`[아트인포] 상세 ${id} 실패:`, error);
    }

    await sleep(180);
  }

  return {
    jobs: dedupeBySourceId(jobs),
    diagnostics: {
      keywords: ARTINFO_KEYWORDS,
      regionFilter: "전체",
      searchRequests,
      detailRequests,
      discoveredCount: discovered.size,
      uniqueCount: jobs.length,
      keywordCounts
    }
  };
}

async function fetchArtinfoSearch(keyword) {
  const params = new URLSearchParams({
    jobTimeType: "FULL_TIME",
    keyword
  });

  const response = await fetchWithTimeout(
    `${ARTINFO_SEARCH_URL}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        ...browserHeaders(),
        "Referer": "https://www.artinfokorea.com/"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`ARTINFO SEARCH HTTP ${response.status}`);
  }

  return response.text();
}

function extractArtinfoIds(html = "") {
  const ids = new Set();

  for (const match of html.matchAll(/href=["'](?:https:\/\/www\.artinfokorea\.com)?\/jobs\/(\d+)(?:[?#][^"']*)?["']/gi)) {
    ids.add(match[1]);
  }

  return [...ids];
}

async function fetchArtinfoDetail(id) {
  const response = await fetchWithTimeout(
    `${ARTINFO_DETAIL_BASE}/${id}`,
    {
      method: "GET",
      headers: {
        ...browserHeaders(),
        "Referer": ARTINFO_SEARCH_URL
      }
    }
  );

  if (!response.ok) {
    throw new Error(`ARTINFO DETAIL HTTP ${response.status}`);
  }

  return response.text();
}

function parseArtinfoDetail(html, id, matchedKeywords = []) {
  const text = cleanText(html);

  let title = "";

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag) {
    title = cleanText(titleTag[1])
      .replace(/^채용\s*[|｜-]\s*/i, "")
      .replace(/\s*[|｜-]\s*아트인포.*$/i, "")
      .trim();
  }

  if (!title) {
    const heading = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    if (heading) {
      title = cleanText(heading[1]);
    }
  }

  if (!title || title === "ARTINFO") {
    return null;
  }

  const postedAt = extractArtinfoPostedAt(text);
  const address = extractArtinfoAddress(text);
  const region = extractArtinfoRegion(address || text);
  const organization = extractArtinfoOrganization(
    text,
    title,
    address,
    postedAt
  );

  const deadline = extractArtinfoDeadline(text, postedAt);
  const recruitStatus = inferArtinfoStatus(postedAt, deadline, text);

  const normalizedText = normalizeSearchText(
    [organization, title, text.slice(0, 2500)].join(" ")
  );

  let tags = detectTags(
    normalizeSearchText(
      `${title} ${matchedKeywords.join(" ")}`
    )
  );

  if (!tags.includes("플루트")) {
    tags = ["플루트", ...tags.filter(tag => tag !== "기타 예체능")];
  }

  return {
    id: `artinfo_${id}`,
    source: "아트인포",
    sourceId: "artinfo",
    sourceItemId: String(id),
    postedAt,
    recruitStatus,
    isActive: isActiveStatus(recruitStatus),
    organization,
    jobType: "전문 연주·예술",
    title,
    deadline,
    startDate: "",
    endDate: "",
    region,
    address,
    url: `${ARTINFO_DETAIL_BASE}/${id}`,
    tags: [...new Set(tags)],
    instrumentTags: ["플루트"],
    matchedKeywords,
    searchText: normalizedText,
    autoCollected: true
  };
}

function extractArtinfoPostedAt(text = "") {
  /* 상세 상단의 등록일이 보통 본문 내 첫 YYYY.MM.DD 형식 날짜다. */
  const match = text.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
  return match ? normalizeDate(match[0]) : "";
}

function extractArtinfoAddress(text = "") {
  const patterns = [
    /((?:서울|서울특별시)\s+[가-힣]+구\s+[가-힣0-9·()\-\s]+(?:로|길)\s*\d+(?:-\d+)?(?:\s+[^\n]{0,40})?)/,
    /((?:인천|인천광역시)\s+[가-힣]+구\s+[가-힣0-9·()\-\s]+(?:로|길)\s*\d+(?:-\d+)?(?:\s+[^\n]{0,40})?)/,
    /((?:경기|경기도)\s+[가-힣]+시(?:\s+[가-힣]+구)?\s+[가-힣0-9·()\-\s]+(?:로|길)\s*\d+(?:-\d+)?(?:\s+[^\n]{0,40})?)/,
    /((?:강원|강원도|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주|제주특별자치도)\s+[가-힣]+(?:시|군)\s+[가-힣0-9·()\-\s]+(?:로|길)\s*\d+(?:-\d+)?(?:\s+[^\n]{0,40})?)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1]
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return "";
}

function extractArtinfoRegion(value = "") {
  const patterns = [
    /(서울(?:특별시)?\s+[가-힣]+구)/,
    /(인천(?:광역시)?\s+[가-힣]+구)/,
    /((?:경기|경기도)\s+[가-힣]+시(?:\s+[가-힣]+구)?)/,
    /((?:강원|강원도|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주|제주특별자치도)\s+[가-힣]+(?:시|군))/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1].replace(/\s+/g, " ").trim();
  }

  return "";
}

function extractArtinfoOrganization(text, title, address, postedAt) {
  let scoped = text;

  const titlePos = scoped.indexOf(title);
  if (titlePos >= 0) {
    scoped = scoped.slice(titlePos + title.length, titlePos + title.length + 700);
  } else {
    scoped = scoped.slice(0, 1000);
  }

  if (address) {
    const addrPos = scoped.indexOf(address);
    if (addrPos >= 0) {
      scoped = scoped.slice(addrPos + address.length);
    }
  }

  if (postedAt) {
    const dateVariants = [
      postedAt,
      postedAt.replace(/-/g, "."),
      postedAt.replace(/-/g, "/")
    ];

    let datePos = -1;
    for (const date of dateVariants) {
      datePos = scoped.indexOf(date);
      if (datePos >= 0) break;
    }

    if (datePos > 0) {
      scoped = scoped.slice(0, datePos);
    }
  }

  scoped = scoped
    .replace(/^(플루트|플룻|flute|호른|바이올린|비올라|첼로|더블베이스|오보에|클라리넷|바순|트럼펫|트롬본|타악기)(\s+외\s+\d+)?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  /* 주소 뒤 ~ 등록일 앞 구간의 끝부분이 기관명인 구조를 활용 */
  const chunks = scoped.split(/\s{2,}|\||채용 사이트 바로가기/i).filter(Boolean);
  const candidate = (chunks[chunks.length - 1] || scoped).trim();

  return candidate.length <= 80 ? candidate : "";
}

function extractArtinfoDeadline(text = "", postedAt = "") {
  const fullDatePatterns = [
    /(?:지원\s*마감|접수\s*마감|접수마감일|마감일|원서접수기간|접수기간)[^\d]{0,30}(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})[^~\n]{0,40}~[^\d]{0,20}(20\d{2})?[.\/-]?(\d{1,2})[.\/-](\d{1,2})/i,
    /(?:지원\s*마감|접수\s*마감|접수마감일|마감일)[^\d]{0,30}(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/i
  ];

  for (const pattern of fullDatePatterns) {
    const m = text.match(pattern);
    if (!m) continue;

    if (m[4] !== undefined) {
      const year = m[4] || m[1];
      return `${year}-${String(m[5]).padStart(2, "0")}-${String(m[6]).padStart(2, "0")}`;
    }

    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }

  /* "~6/30", "5.8.(목)"처럼 연도가 생략된 경우 등록연도를 사용 */
  if (postedAt) {
    const year = postedAt.slice(0, 4);
    const m = text.match(/(?:지원\s*마감|접수\s*마감|접수마감일|마감일|원서접수기간|접수기간)[\s\S]{0,120}?(?:~|까지)\s*(\d{1,2})[.\/-](\d{1,2})(?:\D|$)/i);
    if (m) {
      return `${year}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
    }
  }

  return "";
}

function inferArtinfoStatus(postedAt, deadline, text = "") {
  if (/채용\s*시까지|상시\s*(?:채용|모집)/i.test(text)) {
    return "모집중";
  }

  if (deadline) {
    return deadline >= koreaToday()
      ? "모집중"
      : "모집종료";
  }

  if (postedAt) {
    const posted = new Date(`${postedAt}T00:00:00+09:00`);
    const now = new Date();
    const days = (now - posted) / 86400000;

    /* 마감일을 찾지 못한 오래된 공고를 활성으로 남기지 않는다. */
    if (days > 60) {
      return "모집종료";
    }
  }

  return "확인필요";
}


/* =========================================================
   레슨인포
   - 피아노강사·음악학원구인 게시판
   - 인천 전체
   - 제목+내용에서 플루트 / 플룻 각각 검색
   ========================================================= */

async function collectLessoninfoJobs() {
  if (!LESSONINFO_USE_PLAYWRIGHT) {
    throw new Error("LessonInfo Playwright mode is disabled");
  }

  const { chromium } = require("playwright");

  const allJobs = [];

  let browser = null;
  let searchRequests = 0;
  let rawParsedCount = 0;
  let domFallbackCount = 0;

  const keywordCounts = {};
  const firstPageHtmlLengths = {};
  const pageCounts = {};

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const context = await browser.newContext({
      locale: "ko-KR",

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 Chrome/153 Safari/537.36"
    });

    const page = await context.newPage();

    /*
     * 먼저 메인 채용 페이지를 한 번 열어
     * PHP/사이트 쿠키와 브라우저 세션을 준비한다.
     */
    await page.goto(
      "https://www.lessoninfo.co.kr/music-jobs",
      {
        waitUntil: "domcontentloaded",
        timeout: 45000
      }
    );

    await page.waitForTimeout(1200);

    for (const keyword of LESSONINFO_KEYWORDS) {
      console.log(`\n[레슨인포/브라우저] 검색: ${keyword}`);

      let keywordRaw = 0;
      let pagesVisited = 0;
      let previousFingerprint = "";

      for (
        let pageNo = 1;
        pageNo <= LESSONINFO_MAX_PAGES_PER_KEYWORD;
        pageNo++
      ) {
        const url =
          buildLessoninfoSearchUrl(
            keyword,
            pageNo
          );

        console.log(
          `  ${pageNo}페이지 열기`
        );

        await page.goto(
          url,
          {
            waitUntil:
              "domcontentloaded",

            timeout:
              45000
          }
        );

        /*
         * 광고/부가 스크립트가 많아 networkidle은 피하고,
         * 본문 렌더링 시간을 짧게 준다.
         */
        await page.waitForTimeout(
          1800
        );

        searchRequests++;
        pagesVisited++;

        const html =
          await page.content();

        if (pageNo === 1) {
          firstPageHtmlLengths[keyword] =
            html.length;
        }

        /*
         * 1차: 기존 HTML 파서 재사용
         */
        let parsed =
          parseLessoninfoJobs(
            html,
            keyword
          );

        /*
         * 2차: HTML 구조가 달라 파서가 못 잡으면
         * 실제 브라우저 DOM에서 링크/행을 직접 추출.
         */
        if (!parsed.length) {
          const domItems =
            await extractLessoninfoJobsFromDom(
              page,
              keyword
            );

          if (domItems.length) {
            parsed =
              domItems;

            domFallbackCount +=
              domItems.length;
          }
        }

        rawParsedCount +=
          parsed.length;

        keywordRaw +=
          parsed.length;

        console.log(
          `  ${pageNo}페이지: ${parsed.length}개`
        );

        if (!parsed.length) {
          break;
        }

        const fingerprint =
          parsed
            .map(job =>
              job.sourceItemId ||
              job.title
            )
            .join("|");

        /*
         * 페이지 번호가 적용되지 않아 같은 내용이 반복되면 중단.
         */
        if (
          pageNo > 1 &&
          fingerprint ===
            previousFingerprint
        ) {
          console.log(
            "  같은 페이지 반복 감지 → 종료"
          );

          break;
        }

        previousFingerprint =
          fingerprint;

        allJobs.push(
          ...parsed
        );

        /*
         * 화면 한 페이지가 대략 10개 안팎이므로
         * 10개 미만이면 마지막 페이지로 판단.
         */
        if (
          parsed.length < 10
        ) {
          break;
        }
      }

      keywordCounts[keyword] =
        keywordRaw;

      pageCounts[keyword] =
        pagesVisited;
    }

    const jobs =
      dedupeBySourceId(
        allJobs
      );

    return {
      jobs,

      diagnostics: {
        mode:
          "playwright",

        keywords:
          LESSONINFO_KEYWORDS,

        region:
          "인천 전체",

        searchField:
          "wr_subject||wr_content",

        searchRequests,

        rawParsedCount,

        domFallbackCount,

        uniqueCount:
          jobs.length,

        keywordCounts,

        pageCounts,

        firstPageHtmlLengths
      }
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function buildLessoninfoSearchUrl(
  keyword,
  pageNo = 1
) {
  const params =
    new URLSearchParams();

  params.append(
    "mode",
    "search"
  );

  params.append(
    "sca",
    ""
  );

  params.append(
    "sort",
    ""
  );

  params.append(
    "wr_area_0[0]",
    LESSONINFO_INCHEON.wrArea0
  );

  params.append(
    `wr_area_1[${LESSONINFO_INCHEON.wrArea0}][0]`,
    LESSONINFO_INCHEON.wrArea1All
  );

  params.append(
    "search_field",
    "wr_subject||wr_content"
  );

  params.append(
    "search_keyword",
    keyword
  );

  params.append(
    "area_sels[0]",
    `${LESSONINFO_INCHEON.wrArea0}/${LESSONINFO_INCHEON.wrArea1All}`
  );

  if (pageNo > 1) {
    params.append(
      "page",
      String(pageNo)
    );
  }

  return (
    `${LESSONINFO_SEARCH_URL}?${params.toString()}`
  );
}

async function extractLessoninfoJobsFromDom(
  page,
  searchKeyword
) {
  const rawItems =
    await page.evaluate(() => {
      const results = [];

      const rows =
        Array.from(
          document.querySelectorAll(
            "tr"
          )
        );

      for (const row of rows) {
        const rowText =
          (row.innerText || "")
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        if (!rowText) {
          continue;
        }

        /*
         * 실제 채용글 행에는 지역표시가 붙어있다.
         */
        if (
          !/(인천|서울|경기)\s*(전체|[가-힣]+구|[가-힣]+시)/.test(
            rowText
          )
        ) {
          continue;
        }

        const anchors =
          Array.from(
            row.querySelectorAll(
              "a[href]"
            )
          );

        let best = null;

        for (const anchor of anchors) {
          const title =
            (anchor.innerText || "")
              .replace(
                /\s*N\s*$/i,
                ""
              )
              .replace(
                /\s+/g,
                " "
              )
              .trim();

          const href =
            anchor.href || "";

          if (
            title.length < 4
          ) {
            continue;
          }

          if (
            /^(서울|인천|경기|전체|글쓰기|검색|등록안내)$/i.test(
              title
            )
          ) {
            continue;
          }

          if (
            !/board\.php|music-jobs|mode=(?:view|read)/i.test(
              href
            )
          ) {
            continue;
          }

          if (
            !best ||
            title.length >
              best.title.length
          ) {
            best = {
              title,
              href
            };
          }
        }

        if (!best) {
          continue;
        }

        results.push({
          title:
            best.title,

          href:
            best.href,

          rowText
        });
      }

      return results;
    });

  const jobs = [];

  for (
    const item of rawItems
  ) {
    const region =
      extractLessoninfoRegion(
        item.rowText
      );

    /*
     * 사용자가 선택한 조건은 인천 전체.
     */
    if (
      !/인천/.test(
        `${region} ${item.rowText}`
      )
    ) {
      continue;
    }

    const itemId =
      extractLessoninfoItemId(
        item.href,
        item.title,
        region
      );

    const postedAt =
      extractLessoninfoPostedAt(
        item.rowText
      );

    const tags =
      detectTags(
        normalizeSearchText(
          `${item.title} ${searchKeyword}`
        )
      );

    if (
      !tags.includes(
        "플루트"
      )
    ) {
      tags.unshift(
        "플루트"
      );
    }

    const recruitStatus =
      /(마감|구인완료|모집완료|채용완료)/.test(
        item.title
      )
        ? "모집종료"
        : "모집중";

    jobs.push({
      id:
        `lessoninfo_${itemId}`,

      source:
        "레슨인포",

      sourceId:
        "lessoninfo",

      sourceItemId:
        itemId,

      postedAt,

      recruitStatus,

      isActive:
        isActiveStatus(
          recruitStatus
        ),

      organization:
        extractLessoninfoOrganization(
          item.title
        ),

      jobType:
        "음악학원·레슨강사",

      title:
        item.title,

      deadline:
        "",

      startDate:
        "",

      endDate:
        "",

      region,

      address:
        "",

      url:
        item.href,

      tags:
        [
          ...new Set(tags)
        ],

      instrumentTags:
        ["플루트"],

      matchedKeywords:
        [searchKeyword],

      searchText:
        normalizeSearchText(
          `${region} ${item.title} ${item.rowText}`
        ),

      autoCollected:
        true
    });
  }

  return jobs;
}
/* Legacy fetch-based LessonInfo fallback kept for diagnostics; Playwright collector above is the active path. */
async function fetchLessoninfoPage(
  keyword,
  page
) {
  async function bootstrapLessoninfoSession() {
    lessoninfoSessionCookie = "";

    const bootstrap =
      await fetchWithTimeout(
        "https://www.lessoninfo.co.kr/music-jobs",
        {
          method: "GET",

          headers: {
            ...browserHeaders(),

            "Cache-Control":
              "no-cache"
          }
        },
        30000
      );

    if (!bootstrap.ok) {
      throw new Error(
        `LESSONINFO bootstrap HTTP ${bootstrap.status}`
      );
    }

    let setCookies = [];

    if (
      typeof bootstrap.headers.getSetCookie === "function"
    ) {
      setCookies =
        bootstrap.headers.getSetCookie();
    } else {
      const raw =
        bootstrap.headers.get("set-cookie");

      if (raw) {
        setCookies = [raw];
      }
    }

    lessoninfoSessionCookie =
      setCookies
        .map(cookie =>
          cookie.split(";")[0]
        )
        .filter(Boolean)
        .join("; ");

    await bootstrap.text();

    console.log(
      `[레슨인포] 세션 준비 / 쿠키 ${lessoninfoSessionCookie ? "있음" : "없음"}`
    );
  }

  function buildLessoninfoUrl() {
    const params =
      new URLSearchParams();

    params.append(
      "mode",
      "search"
    );

    params.append(
      "sca",
      ""
    );

    params.append(
      "sort",
      ""
    );

    params.append(
      "wr_area_0[0]",
      LESSONINFO_INCHEON.wrArea0
    );

    params.append(
      `wr_area_1[${LESSONINFO_INCHEON.wrArea0}][0]`,
      LESSONINFO_INCHEON.wrArea1All
    );

    params.append(
      "search_field",
      "wr_subject||wr_content"
    );

    params.append(
      "search_keyword",
      keyword
    );

    params.append(
      "area_sels[0]",
      `${LESSONINFO_INCHEON.wrArea0}/${LESSONINFO_INCHEON.wrArea1All}`
    );

    if (page > 1) {
      params.append(
        "page",
        String(page)
      );
    }

    return (
      `${LESSONINFO_SEARCH_URL}?${params.toString()}`
    );
  }

  async function requestLessoninfo() {
    const headers = {
      ...browserHeaders(),

      "Referer":
        "https://www.lessoninfo.co.kr/music-jobs",

      "Cache-Control":
        "no-cache"
    };

    if (lessoninfoSessionCookie) {
      headers["Cookie"] =
        lessoninfoSessionCookie;
    }

    const response =
      await fetchWithTimeout(
        buildLessoninfoUrl(),
        {
          method: "GET",
          headers
        },
        30000
      );

    if (!response.ok) {
      throw new Error(
        `LESSONINFO HTTP ${response.status}`
      );
    }

    return response.text();
  }

  if (!lessoninfoSessionCookie) {
    await bootstrapLessoninfoSession();
  }

  let body =
    await requestLessoninfo();

  /*
   * 정상 검색 페이지는 수십~수백 KB 수준이다.
   * 5 KB 미만은 세션/보안 중간페이지로 보고 새 세션으로 재시도한다.
   */
  for (
    let retry = 1;
    body.length < 5000 && retry <= 2;
    retry++
  ) {
    console.log(
      `[레슨인포] 짧은 응답 ${body.length} bytes → 세션 재생성 후 재시도 ${retry}`
    );

    await sleep(
      800 * retry
    );

    await bootstrapLessoninfoSession();

    body =
      await requestLessoninfo();
  }

  if (page === 1) {
    console.log(
      `[레슨인포] ${keyword} HTML 길이: ${body.length}`
    );

    if (body.length < 5000) {
      console.log(
        "[레슨인포] 짧은 응답 내용:",
        JSON.stringify(
          cleanText(body).slice(0, 700)
        )
      );
    }
  }

  return body;
}

function parseLessoninfoJobs(
  html,
  searchKeyword
) {
  const jobs = [];

  /*
   * 검색결과는 표 형태이므로 tr 단위로 먼저 분리한다.
   * 레슨인포는 게시판 링크 형식이 여러 번 바뀐 적이 있어
   * 특정 URL 하나에만 의존하지 않고 '지역 + 제목 링크'를 함께 본다.
   */
  const rows = [
    ...html.matchAll(
      /<tr[^>]*>[\s\S]*?<\/tr>/gi
    )
  ];

  for (const rowMatch of rows) {
    const rowHtml =
      rowMatch[0];

    const rowText =
      cleanText(
        rowHtml
      );

    /*
     * 실제 채용글 행은 검색 화면에서 지역명이 함께 노출된다.
     */
    if (
      !/(인천|서울|경기)\s*(전체|[가-힣]+구|[가-힣]+시)/.test(
        rowText
      )
    ) {
      continue;
    }

    const anchors = [
      ...rowHtml.matchAll(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      )
    ];

    if (!anchors.length) {
      continue;
    }

    let title = "";
    let href = "";

    /*
     * 메뉴/지역 링크를 제외하고 가장 제목다운 앵커를 선택.
     */
    for (const anchor of anchors) {
      const candidate =
        cleanText(
          anchor[2]
        )
          .replace(
            /\s*N\s*$/i,
            ""
          )
          .trim();

      const candidateHref =
        decodeHtml(
          anchor[1]
        );

      if (
        candidate.length < 4 ||
        /^(서울|인천|경기|전체|글쓰기|검색|등록안내)$/i.test(
          candidate
        )
      ) {
        continue;
      }

      if (
        /mode=(?:view|read)|board\.php|music-jobs/i.test(
          candidateHref
        )
      ) {
        /*
         * 제목은 보통 지역명보다 훨씬 길다.
         */
        if (
          !title ||
          candidate.length > title.length
        ) {
          title =
            candidate;

          href =
            candidateHref;
        }
      }
    }

    if (!title) {
      continue;
    }

    const region =
      extractLessoninfoRegion(
        rowText
      );

    /*
     * 인천 전체 검색 결과지만 게시글에 여러 희망지역이 함께 붙을 수 있다.
     * 최소한 인천이 포함된 행만 유지한다.
     */
    if (
      !/인천/.test(
        `${region} ${rowText}`
      )
    ) {
      continue;
    }

    const absoluteUrl =
      lessoninfoAbsoluteUrl(
        href
      );

    const itemId =
      extractLessoninfoItemId(
        href,
        title,
        region
      );

    const postedAt =
      extractLessoninfoPostedAt(
        rowText
      );

    const searchText =
      normalizeSearchText(
        `${region} ${title} ${rowText}`
      );

    const tags =
      detectTags(
        normalizeSearchText(
          `${title} ${searchKeyword}`
        )
      );

    if (
      !tags.includes(
        "플루트"
      )
    ) {
      tags.unshift(
        "플루트"
      );
    }

    /*
     * 레슨인포 목록은 별도 마감일이 없는 게시물이 많다.
     * 검색 결과에 노출되어 있는 글은 우선 모집중으로 취급하고,
     * 제목에 마감/완료가 명시된 경우에만 종료 처리한다.
     */
    const recruitStatus =
      /(마감|구인완료|모집완료|채용완료)/.test(
        title
      )
        ? "모집종료"
        : "모집중";

    jobs.push({
      id:
        `lessoninfo_${itemId}`,

      source:
        "레슨인포",

      sourceId:
        "lessoninfo",

      sourceItemId:
        itemId,

      postedAt,

      recruitStatus,

      isActive:
        isActiveStatus(
          recruitStatus
        ),

      organization:
        extractLessoninfoOrganization(
          title
        ),

      jobType:
        "음악학원·레슨강사",

      title,

      deadline:
        "",

      startDate:
        "",

      endDate:
        "",

      region,

      address:
        "",

      url:
        absoluteUrl ||
        LESSONINFO_SEARCH_URL,

      tags:
        [
          ...new Set(tags)
        ],

      instrumentTags:
        ["플루트"],

      matchedKeywords:
        [searchKeyword],

      searchText,

      autoCollected:
        true
    });
  }

  return jobs;
}

function extractLessoninfoRegion(
  text = ""
) {
  const matches = [
    ...text.matchAll(
      /((?:서울|인천|경기)\s*(?:전체|[가-힣]+구|[가-힣]+시))/g
    )
  ];

  if (!matches.length) {
    return "인천";
  }

  /*
   * 인천 검색이므로 인천 표기가 있으면 우선 사용.
   */
  const incheon =
    matches.find(match =>
      match[1].startsWith(
        "인천"
      )
    );

  return (
    incheon?.[1] ||
    matches[0][1]
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function extractLessoninfoPostedAt(
  text = ""
) {
  /*
   * YYYY-MM-DD / YYYY.MM.DD 형식이 있으면 우선.
   */
  const full =
    text.match(
      /(\d{4}[./-]\d{1,2}[./-]\d{1,2})/
    );

  if (full) {
    return normalizeDate(
      full[1]
    );
  }

  /*
   * 게시판에서 MM.DD만 표시하는 경우 현재 연도를 붙인다.
   */
  const short =
    text.match(
      /(?:^|\s)(\d{1,2})[./](\d{1,2})(?:\s|$)/
    );

  if (short) {
    const today =
      koreaToday();

    const year =
      today.slice(
        0,
        4
      );

    return `${year}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
  }

  return "";
}

function extractLessoninfoItemId(
  href = "",
  title = "",
  region = ""
) {
  const decoded =
    decodeHtml(
      href
    );

  const patterns = [
    /[?&](?:wr_id|code|idx|no|num)=([^&#]+)/i,
    /\/(\d{3,})(?:[/?#]|$)/
  ];

  for (const pattern of patterns) {
    const match =
      decoded.match(
        pattern
      );

    if (match) {
      return String(
        match[1]
      )
        .replace(
          /[^A-Za-z0-9_-]/g,
          ""
        )
        .slice(
          0,
          80
        );
    }
  }

  return makeId(
    `${region}|${title}|${decoded}`
  ).replace(
    /^job_/,
    ""
  );
}

function lessoninfoAbsoluteUrl(
  href = ""
) {
  if (!href) {
    return "";
  }

  const decoded =
    decodeHtml(
      href
    );

  try {
    return new URL(
      decoded,
      "https://www.lessoninfo.co.kr/"
    ).toString();
  } catch {
    return "";
  }
}

function extractLessoninfoOrganization(
  title = ""
) {
  /*
   * 제목에 '[기관명]' 또는 '(기관명)'이 있으면 보조적으로 사용.
   * 그렇지 않으면 레슨인포는 기관명을 별도 제공하지 않는 경우가 많아 공란 유지.
   */
  const bracket =
    title.match(
      /^\s*[\[(]([^\])]{2,40})[\])]\s*/
    );

  return bracket
    ? bracket[1].trim()
    : "";
}


/* =========================================================
   경기도교육청
   ========================================================= */

async function collectGoeJobs() {
  const allJobs = [];
  let requests = 0;
  let rawCount = 0;
  let pagesCollected = 0;
  const queryCounts = {};

  /*
   * 부천시 + 음악 첫 페이지 진단값
   */
  const diagnosticsSample = {
    region: "부천시",
    keyword: "음악",
    htmlLength: 0,
    trCount: 0,
    tdCount: 0,
    anchorCount: 0,
    hasKeyword: false,
    hasOccupationText: false,
    hasPbancSn: false,
    hasViewFunction: false,
    preview: ""
  };

  for (const region of GOE_REGIONS) {
    for (const keyword of GOE_KEYWORDS) {
      const queryKey = `${region}:${keyword}`;
      let queryRaw = 0;
      let previousFingerprint = "";

      console.log(`\n[경기도교육청] ${region} / ${keyword}`);

      for (
        let page = 1;
        page <= GOE_MAX_PAGES_PER_QUERY;
        page++
      ) {
        const html = await fetchGoePage(
          region,
          keyword,
          page
        );

        requests++;

        if (
          region === "부천시" &&
          keyword === "음악" &&
          page === 1
        ) {
          diagnosticsSample.htmlLength =
            html.length;

          diagnosticsSample.trCount =
            (html.match(/<tr\b/gi) || []).length;

          diagnosticsSample.tdCount =
            (html.match(/<td\b/gi) || []).length;

          diagnosticsSample.anchorCount =
            (html.match(/<a\b/gi) || []).length;

          diagnosticsSample.hasKeyword =
            html.includes("음악");

          diagnosticsSample.hasOccupationText =
            html.includes("초중등시간강사");

          diagnosticsSample.hasPbancSn =
            /pbancSn/i.test(html);

          diagnosticsSample.hasViewFunction =
            /hnfpPbancView|view|goView|fnView/i.test(html);

          diagnosticsSample.preview =
            cleanText(html).slice(0, 1200);

          console.log("[경기도교육청 진단]");
          console.log(
            `  HTML 길이: ${diagnosticsSample.htmlLength}`
          );
          console.log(
            `  TR: ${diagnosticsSample.trCount}, TD: ${diagnosticsSample.tdCount}, A: ${diagnosticsSample.anchorCount}`
          );
          console.log(
            `  음악 포함: ${diagnosticsSample.hasKeyword}`
          );
          console.log(
            `  pbancSn 포함: ${diagnosticsSample.hasPbancSn}`
          );
        }

        const jobs = parseGoeJobs(
          html,
          region,
          keyword
        );

        rawCount += jobs.length;
        queryRaw += jobs.length;

        console.log(
          `  ${page}페이지: ${jobs.length}개`
        );

        if (!jobs.length) break;

        const fingerprint =
          jobs
            .map(job =>
              job.sourceItemId ||
              job.title
            )
            .join("|");

        if (
          page > 1 &&
          fingerprint === previousFingerprint
        ) {
          console.log(
            "  같은 페이지 반복 감지 → 종료"
          );
          break;
        }

        previousFingerprint =
          fingerprint;

        allJobs.push(...jobs);
        pagesCollected++;

        if (jobs.length < 50) {
          break;
        }

        await sleep(250);
      }

      queryCounts[queryKey] =
        queryRaw;

      await sleep(250);
    }
  }

  const jobs =
    dedupeBySourceId(allJobs);

  return {
    jobs,
    diagnostics: {
      regions:
        GOE_REGIONS,
      keywords:
        GOE_KEYWORDS,
      occupation:
        "초중등시간강사(자유학기활동강사 특기적성(방과후) 포함)",
      occupationCode:
        "B",
      requests,
      pagesCollected,
      rawCount,
      uniqueCount:
        jobs.length,
      queryCounts,
      sample:
        diagnosticsSample
    }
  };
}
async function fetchGoePage(
  region,
  keyword,
  page
) {
  const form =
    new URLSearchParams();

  form.set("mi", "10502");
  form.set("pbancSn", "");
  form.set("currPage", String(page));
  form.set("srchEcptDtl", "Y");
  form.set("srchTodayPb", "N");
  form.set("srchLgnNm", region);

  form.set(
    "srchOcptNm",
    "초중등시간강사(자유학기활동강사 특기적성(방과후) 포함)"
  );

  form.set("srchOcptCd", "B");
  form.set("pageIndex", "50");
  form.set("orderbyType", "reg");
  form.set("searchType", "sj");
  form.set("searchValue", keyword);
  form.set("btchDlYn", "");
  form.set("cndNo", "");
  form.set("srchSchlSe", "");

  const response =
    await fetchWithTimeout(
      GOE_SEARCH_URL,
      {
        method: "POST",
        headers: {
          ...browserHeaders(),
          "Content-Type":
            "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer":
            GOE_SEARCH_URL,
          "Origin":
            "https://www.goe.go.kr"
        },
        body:
          form.toString()
      },
      30000
    );

  if (!response.ok) {
    throw new Error(
      `GOE HTTP ${response.status}`
    );
  }

  return response.text();
}

function parseGoeJobs(
  html,
  region,
  searchKeyword
) {
  const jobs = [];
  const rows = [
    ...html.matchAll(
      /<tr[^>]*>[\s\S]*?<\/tr>/gi
    )
  ];

  for (const rowMatch of rows) {
    const rowHtml =
      rowMatch[0];

    const cells = [
      ...rowHtml.matchAll(
        /<td[^>]*>([\s\S]*?)<\/td>/gi
      )
    ];

    if (cells.length < 4) {
      continue;
    }

    const cellText =
      cells.map(cell =>
        cleanText(cell[1])
      );

    const rowText =
      cleanText(rowHtml);

    const pbancSn =
      extractGoePbancSn(rowHtml);

    const anchors = [
      ...rowHtml.matchAll(
        /<a\b[^>]*>([\s\S]*?)<\/a>/gi
      )
    ];

    let title = "";

    for (const anchor of anchors) {
      const candidate =
        cleanText(anchor[1])
          .replace(/^\s*N\s*/i, "")
          .trim();

      if (
        candidate.length >= 4 &&
        candidate.length > title.length
      ) {
        title =
          candidate;
      }
    }

    if (!title) {
      title =
        cellText
          .filter(Boolean)
          .sort(
            (a, b) =>
              b.length - a.length
          )[0] || "";
    }

    if (!title) {
      continue;
    }

    const dates =
      [
        ...rowText.matchAll(
          /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g
        )
      ].map(match =>
        [
          match[1],
          match[2].padStart(2, "0"),
          match[3].padStart(2, "0")
        ].join("-")
      );

    const postedAt =
      dates[0] || "";

    const deadline =
      dates.length > 1
        ? dates[dates.length - 1]
        : "";

    const organization =
      extractGoeOrganization(
        rowText,
        title
      );

    const normalizedText =
      normalizeSearchText(
        `${organization} ${title} ${rowText}`
      );

    const tags =
      detectTags(
        normalizeSearchText(
          `${title} ${searchKeyword}`
        )
      );

    const instrumentTags =
      getInstrumentTags(tags);

    const recruitStatus =
      guessGoeStatus(
        rowText,
        deadline
      );

    jobs.push({
      id:
        pbancSn
          ? `goe_${pbancSn}`
          : makeId(
              `${region}|${organization}|${title}|${postedAt}`
            ),
      source:
        "경기도교육청",
      sourceId:
        "goe",
      sourceItemId:
        pbancSn || "",
      postedAt,
      recruitStatus,
      isActive:
        isActiveStatus(
          recruitStatus
        ),
      organization,
      jobType:
        "초중등시간강사·방과후",
      title,
      deadline,
      startDate:
        "",
      endDate:
        "",
      region:
        `경기 ${region}`,
      address:
        "",
      url:
        pbancSn
          ? `${GOE_DETAIL_BASE}?mi=10502&pbancSn=${pbancSn}`
          : GOE_SEARCH_URL,
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

function extractGoePbancSn(
  html = ""
) {
  const decoded =
    decodeHtml(html);

  const patterns = [
    /[?&]pbancSn=(\d+)/i,
    /pbancSn\s*[=:]\s*["']?(\d+)/i,
    /hnfpPbancView\.do[\s\S]{0,150}?(\d{4,})/i,
    /(?:fn|go|view|select)[A-Za-z0-9_]*\s*\(\s*["']?(\d{4,})["']?/i
  ];

  for (const pattern of patterns) {
    const match =
      decoded.match(pattern);

    if (match) {
      return match[1];
    }
  }

  return "";
}

function extractGoeOrganization(
  text = "",
  title = ""
) {
  const matches = [
    ...text.matchAll(
      /([가-힣A-Za-z0-9·()\-]{2,50}(?:유치원|초등학교|중학교|고등학교|학교|교육지원청|교육청|센터))/g
    )
  ];

  if (matches.length) {
    return matches[
      matches.length - 1
    ][1]
      .replace(/\s+/g, " ")
      .trim();
  }

  const titleMatch =
    title.match(
      /^(.{2,40}?(?:유치원|초등학교|중학교|고등학교|학교))/
    );

  return titleMatch
    ? titleMatch[1].trim()
    : "";
}

function guessGoeStatus(
  text = "",
  deadline = ""
) {
  const compact =
    text.replace(/\s+/g, "");

  if (
    compact.includes("모집중") ||
    compact.includes("접수중")
  ) {
    return "모집중";
  }

  if (
    compact.includes("마감") ||
    compact.includes("접수종료") ||
    compact.includes("모집종료")
  ) {
    return "모집종료";
  }

  if (deadline) {
    return (
      deadline >= koreaToday()
        ? "모집중"
        : "모집종료"
    );
  }

  return "확인필요";
}

function detectTags(text) {
  const result = [];

  for (const group of KEYWORD_GROUPS) {
    if (
      group.aliases.some(alias =>
        text.includes(normalizeSearchText(alias))
      )
    ) {
      result.push(group.tag);
    }
  }

  if (!result.length) result.push("기타 예체능");

  return [...new Set(result)];
}

function getInstrumentTags(tags) {
  return tags.filter(tag =>
    ["플루트", "리코더", "우쿨렐레", "칼림바"].includes(tag)
  );
}

function normalizeSearchText(value = "") {
  let result = value.toLowerCase().replace(/\s+/g, " ").trim();

  result = result
    .replace(/플룻/g, "플루트")
    .replace(/우쿠렐레|우크렐레|우클렐레/g, "우쿨렐레")
    .replace(/윈드\s*오케스트라/g, "오케스트라")
    .replace(/관현악/g, "관악 오케스트라");

  return result;
}

function normalizeStatus(value = "") {
  const text = value.replace(/\s+/g, "");

  if (text.includes("모집중")) return "모집중";
  if (text.includes("대기중") || text.includes("대기")) return "대기중";
  if (text.includes("종료") || text.includes("마감")) return "모집종료";

  return value.trim();
}

function isActiveStatus(status) {
  return (
    status === "모집중" ||
    status === "대기중" ||
    status === "확인필요"
  );
}

function normalizeDate(value = "") {
  const match = value.match(
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/
  );

  if (!match) return "";

  return [
    match[1],
    match[2].padStart(2, "0"),
    match[3].padStart(2, "0")
  ].join("-");
}

function hasDate(value = "") {
  return /\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(value);
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

function dedupeBySourceId(items) {
  const map = new Map();

  for (const job of items) {
    const key =
      job.sourceItemId ||
      [job.sourceId, job.organization, job.title, job.postedAt].join("|");

    if (!map.has(key)) {
      map.set(key, job);
      continue;
    }

    const old = map.get(key);

    if (old.matchedKeywords || job.matchedKeywords) {
      old.matchedKeywords = [
        ...new Set([
          ...(old.matchedKeywords || []),
          ...(job.matchedKeywords || [])
        ])
      ];
    }
  }

  return [...map.values()];
}

function dedupeCombined(items) {
  const map = new Map();

  for (const job of items) {
    const key = `${job.sourceId}:${job.sourceItemId || job.id}`;

    if (!map.has(key)) {
      map.set(key, job);
    }
  }

  return [...map.values()];
}

function koreaToday() {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  );

  return formatter.format(new Date());
}

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow"
    });
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

  return "job_" + (hash >>> 0).toString(36);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error("전체 수집 실패:", error);
  process.exit(1);
});
