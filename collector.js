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
  "전공실기",
  "전공 실기",
  "앙상블",
  "악기강사",
  "악기 강사",
  "방과후 음악",
];

const EXCLUDE_KEYWORDS = [
  "재즈바",
  "재즈 바",
  "라이브바",
  "라이브 바",
  "펍",
];

async function main() {
  console.log("인천교육청 채용공고 수집 시작");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(LIST_URL, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    clearTimeout(timer);

    console.log("HTTP:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    console.log("HTML length:", html.length);

    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

    const jobs = [];

    for (const match of rows) {
      const row = match[0];
      const text = stripHtml(row).replace(/\s+/g, " ").trim();

      if (!INCLUDE_KEYWORDS.some((keyword) => text.includes(keyword))) {
        continue;
      }

      if (EXCLUDE_KEYWORDS.some((keyword) => text.includes(keyword))) {
        continue;
      }

      const linkMatch = row.match(
        /<a[^>]+href=["']([^"']*selectNttInfo[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i
      );

      if (!linkMatch) continue;

      const title = stripHtml(linkMatch[2])
        .replace(/\s+/g, " ")
        .trim();

      if (!title) continue;

      const url = new URL(
        decodeHtml(linkMatch[1]),
        LIST_URL
      ).href;

      const cells = [
        ...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
      ].map((m) =>
        stripHtml(m[1]).replace(/\s+/g, " ").trim()
      );

      jobs.push({
        id: makeId(url),
        source: "인천교육청",
        title,
        organization: findOrganization(cells),
        region: "인천",
        deadline: findLastDate(cells),
        url,
        tags: makeTags(text),
      });
    }

    const unique = dedupe(jobs);

    const output = {
      updatedAt: new Date().toISOString(),
      count: unique.length,
      jobs: unique,
    };

    fs.writeFileSync(
      "jobs.json",
      JSON.stringify(output, null, 2),
      "utf8"
    );

    console.log(`완료: ${unique.length}개`);
  } catch (error) {
    clearTimeout(timer);
    console.error("수집 실패:", error);
    process.exit(1);
  }
}

function stripHtml(value = "") {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function findOrganization(cells) {
  for (const cell of cells) {
    if (
      /초등학교|중학교|고등학교|학교|교육청|교육지원청|센터|재단/.test(
        cell
      )
    ) {
      return cell;
    }
  }

  return "";
}

function findLastDate(cells) {
  const dates = [];

  for (const cell of cells) {
    const matches = cell.match(
      /\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/g
    );

    if (matches) {
      dates.push(...matches.map(normalizeDate));
    }
  }

  dates.sort();

  return dates.at(-1) || "";
}

function normalizeDate(value) {
  const parts = value.replace(/[./]/g, "-").split("-");

  if (parts.length !== 3) return value;

  return [
    parts[0],
    parts[1].padStart(2, "0"),
    parts[2].padStart(2, "0"),
  ].join("-");
}

function makeTags(text) {
  const tags = [];

  if (/플루트|플룻/.test(text)) tags.push("플루트");
  if (/관악/.test(text)) tags.push("관악");
  if (/오케스트라|관현악/.test(text)) tags.push("오케스트라");
  if (/전공실기|전공 실기/.test(text)) tags.push("전공실기");
  if (/방과후/.test(text)) tags.push("방과후");
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

function dedupe(items) {
  const seen = new Set();

  return items.filter((job) => {
    if (seen.has(job.url)) return false;

    seen.add(job.url);
    return true;
  });
}

main();
