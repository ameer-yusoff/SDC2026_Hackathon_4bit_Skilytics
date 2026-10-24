import { db, marketSourcesTable, predictionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export type CareerArticle = {
  title: string;
  url: string;
  domain: string;
  seenAt: string;
  region: "my" | "global";
  topic?: "career" | "technology" | "ai";
};
export type CareerNews = {
  articles: CareerArticle[];
  fetchedAt: string | null;
  stale: boolean;
  providers: string[];
};
const TTL = 6 * 3600000;
const QUESTION = "PUBLIC_CAREER_NEWS_V1";
export const NEWS_TOPICS = {
 career: '(upskilling OR reskilling OR "workforce skills" OR "hiring demand" OR "future of work")',
 technology: '("enterprise technology" OR "digital transformation" OR "automation productivity" OR "cloud skills" OR "cybersecurity workforce")',
 ai: '("AI adoption" OR "AI workplace" OR "AI productivity" OR "AI agents" OR "artificial intelligence skills")',
};
export function newsUrl(provider: "rss" = "rss", region: "my" | "global" = "my", topic: keyof typeof NEWS_TOPICS = "career") {
  const u = new URL("https://news.google.com/rss/search");
  u.search = new URLSearchParams({
    q: NEWS_TOPICS[topic] + (region === "my" ? " Malaysia" : "") + " when:30d",
    hl: region === "my" ? "en-MY" : "en-US",
    gl: region === "my" ? "MY" : "US",
    ceid: region === "my" ? "MY:en" : "US:en",
  }).toString();
  return u.href;
}
const publishers = [
  "bernama.com",
  "thestar.com.my",
  "nst.com.my",
  "malaymail.com",
  "freemalaysiatoday.com",
  "theedgemalaysia.com",
  "hrmasia.com",
  "humanresourcesonline.net",
  "reuters.com",
  "bbc.com",
  "bbc.co.uk",
  "cnbc.com",
  "channelnewsasia.com",
  "business-times.com.sg",
  "businesstimes.com.sg",
  "scmp.com",
  "techcrunch.com",
  "computerweekly.com", "cio.com", "zdnet.com", "techrepublic.com",
  "weforum.org",
  "ilo.org",
  "oecd.org",
  "hrdcorp.gov.my",
  "thesun.my",
  "theguardian.com",
  "forbes.com",
  "hrdive.com",
  "microsoft.com", "blogs.microsoft.com", "blog.google", "openai.com", "anthropic.com", "nvidia.com", "news.mit.edu", "mdec.my", "digital.gov.my",
];
export function careerRelevant(title: string) {
 const career=/\b(upskill\w*|reskill\w*|future of work|workforce|workplace|career\w*|hiring|jobs?|employ\w*|skills?|training|recruit\w*|talent)\b|kemahiran|pekerja|kerjaya|latihan|技能|职业|職業|就业|就業|招聘|培训|培訓/i.test(title);
 const technology=/\b(AI|artificial intelligence|automation|technology|digital transformation|cloud|cybersecurity|machine learning|robotics)\b|人工智能|自动化|teknologi/i.test(title);
 const impact=/\b(productivity|adoption|enterprise|business|industry|industries|future of work|coding|workflow|research|skills?|workplace|workforce)\b|produktiviti|perniagaan|生产力|企业|行业/i.test(title);
 return career || (technology && impact);
}
export function newsTopic(title: string): keyof typeof NEWS_TOPICS {
 return /\b(AI|artificial intelligence|machine learning)\b|人工智能/i.test(title)?"ai":/\b(technology|automation|digital|cloud|cybersecurity|robotics)\b|teknologi|自动化/i.test(title)?"technology":"career";
}
function publicUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}
function allowedPublisher(domain: string) {
  return publishers.some((p) => domain === p || domain.endsWith("." + p));
}
function cleanArticle(a: CareerArticle, now: number): CareerArticle | null {
  const date = Date.parse(a.seenAt),
    u = publicUrl(a.url);
  if (
    !u ||
    (!allowedPublisher(u.hostname.replace(/^www\./, "")) &&
      u.hostname !== "news.google.com") ||
    !allowedPublisher(a.domain) ||
    !careerRelevant(a.title) ||
    !Number.isFinite(date) ||
    date > now + 86400000 ||
    date < now - 35 * 86400000
  )
    return null;
  return {
    ...a,
    topic: newsTopic(a.title),
    title: a.title.replace(/[\u0000-\u001f<>]/g, "").slice(0, 240),
    url: u.href,
    seenAt: new Date(date).toISOString(),
  };
}
function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
      const v =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return v > 0 && v <= 0x10ffff ? String.fromCodePoint(v) : "";
    })
    .replace(
      /&(amp|lt|gt|quot|apos);/g,
      (_, n: string) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[n]!,
    );
}
/** Bounded metadata-only RSS parser. Never expands DTDs or fetches article bodies. */
export function parseCareerRss(
  xml: string,
  region: "my" | "global",
  now = Date.now(),
): CareerArticle[] {
  if (xml.length > 2000000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("unsupported_news_xml");
  const tag = (body: string, name: string) =>
    decode(
      body.match(
        new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"),
      )?.[1] ?? "",
    );
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .slice(0, 100)
    .flatMap(([, body]) => {
      const source = publicUrl(
        decode(body.match(/<source\s+url="([^"]+)"/i)?.[1] ?? ""),
      );
      const a = cleanArticle(
        {
          title: tag(body, "title"),
          url: tag(body, "link"),
          domain: source?.hostname.replace(/^www\./, "") ?? "",
          seenAt: tag(body, "pubDate"),
          region,
        },
        now,
      );
      return a ? [a] : [];
    });
}
export class NewsFeedError extends Error {
  constructor(
    public code: string,
    public retryAfterMs = 0,
  ) {
    super(code);
  }
}
export async function fetchCareerFeed(
  provider: "rss" = "rss",
  region: "my" | "global" = "my",
  request: typeof fetch = fetch,
  topic: keyof typeof NEWS_TOPICS = "career",
) {
  let res: Response;
  try {
    res = await request(newsUrl(provider, region, topic), {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Skilytics/1.0 career research",
        Accept: "application/rss+xml, application/xml",
      },
    });
  } catch (error) {
    throw new NewsFeedError(
      error instanceof Error &&
        /timeout|abort/i.test(error.name + error.message)
        ? "news_timeout"
        : "news_network_error",
    );
  }
  if (res.status === 429) {
    const raw = res.headers.get("retry-after"),
      seconds = raw ? Number(raw) : NaN;
    const retry = Number.isFinite(seconds)
      ? seconds * 1000
      : raw
        ? Date.parse(raw) - Date.now()
        : 0;
    throw new NewsFeedError(
      "news_rate_limited",
      Math.max(15 * 60000, Number.isFinite(retry) ? retry : 0),
    );
  }
  if (!res.ok)
    throw new NewsFeedError(
      res.status === 401 || res.status === 403
        ? "news_access_denied"
        : `news_http_${res.status}`,
    );
  let body: string;
  try {
    body = await res.text();
  } catch {
    throw new NewsFeedError("news_timeout");
  }
  if (body.length > 2000000) throw new NewsFeedError("news_response_too_large");
  try {
    return parseCareerRss(body, region);
  } catch {
    throw new NewsFeedError("news_invalid_response");
  }
}
export function balancedNews(articles: CareerArticle[], limit = 24) {
  const buckets = (["career", "technology", "ai"] as const).flatMap(topic =>
    (["my", "global"] as const).map(region => articles.filter(a => newsTopic(a.title) === topic && a.region === region).sort((a,b) => Date.parse(b.seenAt)-Date.parse(a.seenAt))));
  const selected: CareerArticle[] = [];
  for(let n=0; selected.length<limit && buckets.some(b=>n<b.length); n++)
    for(const bucket of buckets)if(bucket[n] && selected.length<limit)selected.push(bucket[n]);
  return selected;
}
const NEWS_VERSION = "career-tech-ai-news-v4-balanced";
let memory: CareerNews | undefined,
  nextCheck = 0,
  running: Promise<CareerNews> | undefined;
async function status(
  id: string,
  ok: boolean,
  count: number,
  detail: string,
  error?: string,
) {
  const patch = {
    status: ok ? "ok" : "error",
    lastFetchedAt: new Date(),
    recordCount: count,
    version: NEWS_VERSION,
    dataDate: new Date().toISOString().slice(0, 10),
    detail,
    error: ok ? null : (error ?? detail),
  };
  await db
    .insert(marketSourcesTable)
    .values({ id, ...patch })
    .onConflictDoUpdate({ target: marketSourcesTable.id, set: patch });
}
async function refresh(force = false): Promise<CareerNews> {
  const [saved] = await db
    .select()
    .from(predictionsTable)
    .where(eq(predictionsTable.question, QUESTION))
    .orderBy(desc(predictionsTable.createdAt))
    .limit(1);
  if (saved) {
    try {
      const old = JSON.parse(saved.content) as CareerNews & {
        version?: string;
      };
      if (Array.isArray(old.articles))
        memory = {
          ...old,
          providers:(old.providers??[]).filter(p=>p==="rss"),
          articles: old.articles
            .map((a) => cleanArticle(a, Date.now()))
            .filter((a): a is CareerArticle => !!a),
          stale:
            old.version !== NEWS_VERSION ||
            Date.now() - saved.createdAt.getTime() >= TTL,
        };
      if (memory && !memory.stale && !force) {
        nextCheck = saved.createdAt.getTime() + TTL;
        return memory;
      }
    } catch {}
  }
  await db
    .delete(marketSourcesTable)
    .where(eq(marketSourcesTable.id, "gdelt_career_news"))
    .catch(() => {});
  const found: CareerArticle[] = [],
    providers = new Set<string>();
  const feeds=await Promise.allSettled((["career","technology","ai"] as const).flatMap(topic=>(["my","global"] as const).map(async region=>({topic,region,rows:await fetchCareerFeed("rss",region,fetch,topic)}))));
  let failures=0;
  for(const feed of feeds) {
   if(feed.status === "fulfilled") {found.push(...feed.value.rows.slice(0,4));providers.add("rss");}
   else failures++;
  }
  const seen = new Set<string>(),
    seenUrls = new Set<string>();
  const articles = balancedNews(found.filter((a) => {
    const key = a.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (seen.has(key) || seenUrls.has(a.url)) return false;
    seen.add(key);
    seenUrls.add(a.url);
    return true;
  }));
  await status("career_news_rss",articles.length>0,articles.length,
   `Public RSS: career, technology and AI workplace signals; Malaysia and global. ${failures}/6 searches unavailable. Headline metadata only; no article bodies or user data.`,
   articles.length?undefined:"news_unavailable");
  if (articles.length) {
    memory = {
      articles,
      providers: [...providers],
      fetchedAt: new Date().toISOString(),
      stale: false,
    };
    await db.insert(predictionsTable).values({
      question: QUESTION,
      horizonYears: 1,
      lang: "en",
      inputHash: QUESTION,
      content: JSON.stringify({ ...memory, version: NEWS_VERSION }),
      sources: [],
      model: "public-news-metadata",
    });
    nextCheck = Date.now() + TTL;
  } else {
    memory = {
      articles: (memory?.articles ?? []).map(a=>cleanArticle(a,Date.now())).filter((a):a is CareerArticle=>!!a),
      fetchedAt: memory?.fetchedAt ?? null,
      providers: memory?.providers ?? [],
      stale: true,
    };
    nextCheck = Date.now() + 15 * 60000;
  }
  return memory;
}
export function loadCareerNews(force = false) {
  if (!force && memory && Date.now() < nextCheck)
    return Promise.resolve(memory);
  if (!running)
    running = refresh(force).finally(() => {
      running = undefined;
    });
  return running;
}
