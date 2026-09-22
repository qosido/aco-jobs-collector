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
  console.log("ACO ON Jobs Collector v5 FIXED");
  console.log("==================================");

  let iceJobs = [];
  let senJobs = [];
  let iceDiagnostics = {};
  let senDiagnostics = {};

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

  const combined = dedupeCombined([...iceJobs, ...senJobs]);

  combined.sort((a, b) =>
    String(b.postedAt || "").localeCompare(String(a.postedAt || "")) ||
    String(b.deadline || "").localeCompare(String(a.deadline || ""))
  );

  const activeCount = combined.filter(job => job.isActive).length;

  const output = {
    updatedAt: new Date().toISOString(),
    diagnostics: { ice: iceDiagnostics, sen: senDiagnostics },
    sourceCounts: { ice: iceJobs.length, sen: senJobs.length },
    count: combined.length,
    activeCount,
    jobs: combined
  };

  fs.writeFileSync("jobs.json", JSON.stringify(output, null, 2), "utf8");

  console.log("\n==================================");
  console.log(`인천: ${iceJobs.length}`);
  console.log(`서울: ${senJobs.length}`);
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

  const response = await fetchWithTimeout(ICE_SEARCH_URL, {
    method: "POST",
    headers: {
      ...browserHeaders(),
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": ICE_LIST_URL
    },
    body: form.toString()
  });

  if (!response.ok) throw new Error(`ICE HTTP ${response.status}`);
  return response.text();
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
