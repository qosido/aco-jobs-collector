const fs = require("fs");

const URL =
  "https://www.ice.go.kr/ice/na/ntt/selectNttList.do";

async function main() {
  console.log("예체능강사 POST 테스트 시작");

  const form = new URLSearchParams();

  form.set("bbsId", "1981");
  form.set("mi", "10997");
  form.set("currPage", "1");
  form.set("bbsTypeChk", "list");

  form.set("srchAt1", "Y");
  form.set("srchAt4", "Y");
  form.set("srchAt5", "Y");

  form.set("searchValue1", "예체능강사");
  form.set("srch1", "예체능강사");

  form.set("arrAt1", "N");
  form.set("listCo", "10");
  form.set("searchType", "sj");

  const response = await fetch(URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9",
      "Content-Type":
        "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer":
        "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981"
    },
    body: form.toString()
  });

  const html = await response.text();

  console.log("HTTP:", response.status);
  console.log("HTML length:", html.length);

  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  const jobs = [];

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
      title,
      deadline,
      startDate,
      endDate
    ] = cells;

    if (!/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(postedAt)) {
      continue;
    }

    jobs.push({
      postedAt,
      recruitStatus,
      organization,
      jobType,
      title,
      deadline,
      startDate,
      endDate
    });
  }

  const output = {
    updatedAt: new Date().toISOString(),
    diagnostics: {
      status: response.status,
      finalUrl: response.url,
      htmlLength: html.length,
      parsedPostCount: jobs.length,
      hasArtInstructor: html.includes("예체능강사")
    },
    jobs
  };

  fs.writeFileSync(
    "jobs.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("완료:", jobs.length);
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
    .replace(/&#39;/gi, "'");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
