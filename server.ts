import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";

import gplayImport from "google-play-scraper";
const gplay = (gplayImport as any).default || gplayImport;

// Minimal .env loader (no external dependency). Loads .env if present so that
// PORT/LANG/COUNTRY from .env.example actually take effect.
(function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

const APP_ID_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const PORT = parseInt(process.env.PORT || "3000", 10);
const LANG = process.env.LANG || "zh";
const COUNTRY = process.env.COUNTRY || "us";

function isValidAppId(appId: string): boolean {
  return APP_ID_REGEX.test(appId);
}

function sanitizeString(input: string, maxLength: number = 200): string {
  return input.slice(0, maxLength).replace(/[<>"'&]/g, "");
}

// ---------- 内存缓存 ----------
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_TTL = {
  search: 5 * 60 * 1000,
  suggest: 5 * 60 * 1000,
  list: 5 * 60 * 1000,
  app: 10 * 60 * 1000,
  similar: 10 * 60 * 1000,
  reviews: 10 * 60 * 1000,
  versions: 30 * 60 * 1000,
  datasafety: 30 * 60 * 1000,
} as const;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
  if (cache.size > 500) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

const GPLAY_TIMEOUT = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number = GPLAY_TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Google Play 请求超时，请稍后重试")), ms)
    ),
  ]);
}

function sendApiError(res: any, error: unknown, fallbackMsg: string) {
  const msg = error instanceof Error ? error.message : fallbackMsg;
  console.error("API error:", msg);
  if (msg.includes("not found") || msg.includes("404") || msg.includes("App not found")) {
    return res.status(404).json({ error: "应用不存在或已下架" });
  }
  if (msg.includes("超时") || msg.includes("timeout")) {
    return res.status(504).json({ error: "请求超时，请稍后重试" });
  }
  return res.status(502).json({ error: fallbackMsg });
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "请求过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "搜索请求过于频繁，请稍后再试" },
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "下载请求过于频繁，请稍后再试" },
});

interface VersionEntry {
  version: string;
  date: string;
}

const APKPURE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchApkPureVersions(appId: string): Promise<VersionEntry[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    // APKPure 需要先访问应用主页，获取重定向后带 slug 的 URL
    const homeUrl = `https://apkpure.com/${appId}`;
    const homeRes = await fetch(homeUrl, {
      headers: {
        "User-Agent": APKPURE_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!homeRes.ok) {
      console.error(`APKPure home fetch failed: ${homeRes.status} for ${appId}`);
      return [];
    }
    const finalUrl = homeRes.url || homeUrl;

    // 尝试 /old-versions 和 /versions 两个路径
    for (const suffix of ["/old-versions", "/versions"]) {
      const versionsUrl = `${finalUrl}${suffix}`;
      const versionsRes = await fetch(versionsUrl, {
        headers: {
          "User-Agent": APKPURE_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: finalUrl,
        },
        signal: controller.signal,
      });
      if (!versionsRes.ok) continue;
      const html = await versionsRes.text();
      const versions = parseApkPureVersions(html);
      console.log(`APKPure ${suffix} for ${appId}: ${versions.length} versions (HTML ${html.length} bytes, url ${versionsUrl})`);
      if (versions.length > 0) return versions;
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseApkPureVersions(html: string): VersionEntry[] {
  const out: VersionEntry[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  const jsonRegex =
    /"version(?:Name)?"\s*:\s*"([^"]+)"[^}]*?"(?:updated?|date|releaseDate)"\s*:\s*"?(\d{4}-\d{2}-\d{2})"?/g;
  while ((m = jsonRegex.exec(html)) !== null) {
    const v = m[1].trim();
    const d = m[2].trim();
    if (v && d && !seen.has(v)) {
      seen.add(v);
      out.push({ version: v, date: d });
    }
  }
  if (out.length > 0) return out;

  const dataAttrRegex =
    /data-(?:dt-)?version="([^"]+)"[^>]*data-(?:dt-)?date="(\d{4}-\d{2}-\d{2})"/g;
  while ((m = dataAttrRegex.exec(html)) !== null) {
    const v = m[1].trim();
    const d = m[2].trim();
    if (v && d && !seen.has(v)) {
      seen.add(v);
      out.push({ version: v, date: d });
    }
  }
  if (out.length > 0) return out;

  const classRegex =
    /class="[^"]*version[^"]*"[^>]*>\s*(\d+\.\d+(?:\.\d+){0,2}[A-Za-z0-9.-]*)[\s\S]{0,500}?(\d{4}-\d{2}-\d{2})/g;
  while ((m = classRegex.exec(html)) !== null) {
    const v = m[1].trim();
    const d = m[2].trim();
    if (v && d && !seen.has(v)) {
      seen.add(v);
      out.push({ version: v, date: d });
    }
  }
  if (out.length > 0) return out;

  const monthRegex =
    /(\d+\.\d+(?:\.\d+){0,2}[A-Za-z0-9.-]*)[\s\S]{0,300}?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/g;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  while ((m = monthRegex.exec(html)) !== null) {
    const v = m[1].trim();
    const mon = months[m[2].substring(0, 3)] || "01";
    const dayRaw = m[3].replace(/[^0-9]/g, "");
    const day = dayRaw.padStart(2, "0");
    const d = `${m[4]}-${mon}-${day}`;
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push({ version: v, date: d });
    }
  }

  return out;
}

type ApkFormat = "apk" | "xapk" | "unknown";

async function probeApkPureFormat(appId: string): Promise<ApkFormat> {
  const apkUrl = `https://d.apkpure.com/b/APK/${appId}?version=latest`;
  const xapkUrl = `https://d.apkpure.com/b/XAPK/${appId}?version=latest`;

  for (const [url, fmt] of [[apkUrl, "apk"], [xapkUrl, "xapk"]] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": APKPURE_UA },
      });
      clearTimeout(timer);
      if (res.ok || (res.status >= 300 && res.status < 400)) {
        return fmt;
      }
    } catch {
      clearTimeout(timer);
    }
  }
  return "unknown";
}

const FORMAT_CACHE_TTL = 30 * 60 * 1000;

async function getCachedFormat(appId: string): Promise<ApkFormat> {
  const cacheKey = `fmt:${appId}`;
  const cached = getCached<ApkFormat>(cacheKey);
  if (cached) return cached;
  const format = await probeApkPureFormat(appId);
  setCached(cacheKey, format, FORMAT_CACHE_TTL);
  return format;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(globalLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.get("/api/search", searchLimiter, async (req, res) => {
    try {
      const query = sanitizeString((req.query.q as string) || "");
      if (!query) {
        return res.status(400).json({ error: "搜索关键词不能为空" });
      }
      const cacheKey = `search:${LANG}:${COUNTRY}:${query}`;
      const cached = getCached<unknown[]>(cacheKey);
      if (cached) return res.json(cached);

      const results = await withTimeout(gplay.search({
        term: query,
        num: 30,
        lang: LANG,
        country: COUNTRY,
      }));
      setCached(cacheKey, results, CACHE_TTL.search);
      res.json(results);
    } catch (error: unknown) {
      sendApiError(res, error, "搜索应用失败");
    }
  });

  app.get("/api/app", async (req, res) => {
    try {
      const appId = (req.query.id as string) || "";
      if (!appId || !isValidAppId(appId)) {
        return res.status(400).json({ error: "无效的应用 ID 格式" });
      }
      const cacheKey = `app:${LANG}:${COUNTRY}:${appId}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return res.json(cached);

      const details = await withTimeout(gplay.app({
        appId,
        lang: LANG,
        country: COUNTRY,
      }));
      setCached(cacheKey, details, CACHE_TTL.app);
      res.json(details);
    } catch (error: unknown) {
      sendApiError(res, error, "获取应用详情失败");
    }
  });

  app.get("/api/list", async (req, res) => {
    try {
      const collectionName = (req.query.collection as string) || "TOP_FREE";
      const categoryName = (req.query.category as string) || undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const perPage = 20;

      let collection = gplay.collection.TOP_FREE;
      if (collectionName === "TOP_PAID") collection = gplay.collection.TOP_PAID;
      if (collectionName === "GROSSING") collection = gplay.collection.GROSSING;

      const cacheKey = `list:${LANG}:${COUNTRY}:${collectionName}:${categoryName || "all"}`;
      let allApps = getCached<unknown[]>(cacheKey);
      if (!allApps) {
        allApps = await withTimeout(gplay.list({
          collection,
          category: categoryName,
          num: 60,
          lang: LANG,
          country: COUNTRY,
        } as any));
        setCached(cacheKey, allApps, CACHE_TTL.list);
      }

      const start = (page - 1) * perPage;
      const pageApps = allApps.slice(start, start + perPage);
      res.json({
        apps: pageApps,
        page,
        perPage,
        total: allApps.length,
        hasMore: start + perPage < allApps.length,
      });
    } catch (error: unknown) {
      sendApiError(res, error, "获取应用列表失败");
    }
  });

  app.get("/api/suggest", searchLimiter, async (req, res) => {
    try {
      const query = sanitizeString((req.query.q as string) || "");
      if (!query) {
        return res.status(400).json({ error: "搜索关键词不能为空" });
      }
      const cacheKey = `suggest:${LANG}:${COUNTRY}:${query}`;
      const cached = getCached<string[]>(cacheKey);
      if (cached) return res.json(cached);

      const results = await withTimeout(gplay.suggest({ term: query, lang: LANG, country: COUNTRY }));
      setCached(cacheKey, results, CACHE_TTL.suggest);
      res.json(results);
    } catch (error: unknown) {
      sendApiError(res, error, "获取建议失败");
    }
  });

  app.get("/api/similar", async (req, res) => {
    try {
      const appId = (req.query.id as string) || "";
      if (!appId || !isValidAppId(appId)) {
        return res.status(400).json({ error: "无效的应用 ID 格式" });
      }
      const cacheKey = `similar:${LANG}:${COUNTRY}:${appId}`;
      const cached = getCached<unknown[]>(cacheKey);
      if (cached) return res.json(cached);

      const results = await withTimeout(gplay.similar({
        appId,
        lang: LANG,
        country: COUNTRY,
      }));
      setCached(cacheKey, results, CACHE_TTL.similar);
      res.json(results);
    } catch (error: unknown) {
      sendApiError(res, error, "获取相似应用失败");
    }
  });

  app.get("/api/versions", searchLimiter, async (req, res) => {
    try {
      const appId = (req.query.id as string) || "";
      if (!appId || !isValidAppId(appId)) {
        return res.status(400).json({ error: "无效的应用 ID 格式" });
      }
      const cacheKey = `versions:${appId}`;
      const cached = getCached<{ source: string; versions: VersionEntry[] }>(cacheKey);
      if (cached) return res.json(cached);

      const versions = await fetchApkPureVersions(appId);
      const result = { source: versions.length > 0 ? "apkpure" : "none", versions };
      setCached(cacheKey, result, CACHE_TTL.versions);
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "获取版本历史失败";
      console.error("Versions error:", msg);
      res.json({ source: "none", versions: [] });
    }
  });

  app.get("/api/reviews", searchLimiter, async (req, res) => {
    try {
      const appId = (req.query.id as string) || "";
      if (!appId || !isValidAppId(appId)) {
        return res.status(400).json({ error: "无效的应用 ID 格式" });
      }
      const sortName = (req.query.sort as string) || "newest";
      const sortMap: Record<string, number> = {
        newest: gplay.sort.NEWEST,
        rating: gplay.sort.RATING,
        helpfulness: gplay.sort.HELPFULNESS,
      };
      const sort = sortMap[sortName] ?? gplay.sort.NEWEST;

      const cacheKey = `reviews:${LANG}:${COUNTRY}:${appId}:${sortName}`;
      const cached = getCached<unknown[]>(cacheKey);
      if (cached) return res.json(cached);

      const result = await withTimeout(gplay.reviews({
        appId,
        sort,
        num: 30,
        lang: LANG,
        country: COUNTRY,
      })) as { data?: unknown[] };
      const data = Array.isArray(result?.data) ? result.data : [];
      setCached(cacheKey, data, CACHE_TTL.reviews);
      res.json(data);
    } catch (error: unknown) {
      sendApiError(res, error, "获取评论失败");
    }
  });

  app.get("/api/data-safety", async (req, res) => {
    try {
      const appId = (req.query.id as string) || "";
      if (!appId || !isValidAppId(appId)) {
        return res.status(400).json({ error: "无效的应用 ID 格式" });
      }
      const cacheKey = `datasafety:${LANG}:${appId}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return res.json(cached);

      const [dataSafetyResult, permissionsResult] = await Promise.all([
        withTimeout((gplay.datasafety || gplay.dataSafety)({ appId, lang: LANG })).catch(() => null) as Promise<any>,
        withTimeout(gplay.permissions({ appId, lang: LANG, country: COUNTRY, short: true })).catch(() => []) as Promise<any>,
      ]);

      const result = {
        sharedData: dataSafetyResult?.sharedData || [],
        collectedData: dataSafetyResult?.collectedData || [],
        securityPractices: dataSafetyResult?.securityPractices || [],
        privacyPolicyUrl: dataSafetyResult?.privacyPolicyUrl || null,
        permissions: Array.isArray(permissionsResult) ? permissionsResult : [],
      };
      setCached(cacheKey, result, CACHE_TTL.datasafety);
      res.json(result);
    } catch (error: unknown) {
      sendApiError(res, error, "获取数据安全信息失败");
    }
  });

  app.get("/api/download-apk", downloadLimiter, async (req, res) => {
    const appId = (req.query.id as string) || "";
    if (!appId || !isValidAppId(appId)) {
      return res.status(400).json({ error: "无效的应用 ID 格式，仅支持标准包名（如 com.example.app）" });
    }

    const format = await getCachedFormat(appId);

    if (format === "xapk") {
      return res.redirect(302, `https://d.apkpure.com/b/XAPK/${appId}?version=latest`);
    }
    // 格式未知时默认尝试 APK（大多数应用都提供 APK 格式）
    return res.redirect(302, `https://d.apkpure.com/b/APK/${appId}?version=latest`);
  });

  app.get("/api/download-info", downloadLimiter, async (req, res) => {
    const appId = (req.query.id as string) || "";
    if (!appId || !isValidAppId(appId)) {
      return res.status(400).json({ error: "无效的应用 ID 格式" });
    }

    const format = await getCachedFormat(appId);

    if (format === "xapk") {
      return res.json({
        format: "xapk",
        url: `https://d.apkpure.com/b/XAPK/${appId}?version=latest`,
        warning: "该应用仅提供 XAPK 格式，需安装 XAPK 安装器（如 APKPure 应用）才能安装。",
      });
    }
    // 格式为 apk 或 unknown 时，默认提供 APK 下载链接（不跳转外部页面）
    return res.json({
      format: "apk",
      url: `https://d.apkpure.com/b/APK/${appId}?version=latest`,
    });
  });

  app.get("/api/*", (_req, res) => {
    res.status(404).json({ error: "未知的 API 接口" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use`);
    } else {
      console.error("Server error:", err.message);
    }
    process.exit(1);
  });
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
