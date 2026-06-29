import { useEffect, useState } from "react";
import { History, ExternalLink, Download, AlertTriangle, Loader2 } from "lucide-react";
import { AppDetails } from "../../types";
import { formatDate } from "../../utils/format";

interface VersionHistoryProps {
  details: AppDetails;
}

interface VersionEntry {
  version: string;
  date: string;
}

type LoadState = "loading" | "real" | "estimated";

function buildEstimatedVersions(currentVer: string): string[] | null {
  const m = currentVer.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  const major = parseInt(m[1]) || 0;
  const minor = m[2] !== undefined ? parseInt(m[2]) : 0;
  const patch = m[3] !== undefined ? parseInt(m[3]) : 0;
  const out = [`${major}.${minor}.${patch}`];
  const candidates = [
    `${major}.${minor}.${Math.max(0, patch - 1)}`,
    `${major}.${Math.max(0, minor - 1)}.0`,
    `${Math.max(0, major - 1)}.0.0`,
    `${major}.${Math.max(0, minor - 1)}.${Math.max(0, patch - 1)}`,
    `${Math.max(0, major - 1)}.${minor}.0`,
  ];
  for (const c of candidates) {
    if (out.length >= 4) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export default function VersionHistory({ details }: VersionHistoryProps) {
  const currentVer = details.version || "1.0.0";
  const baseDate = details.updated ? new Date(details.updated) : new Date();
  const isVaries =
    currentVer.toLowerCase().includes("varies") || !/^\d+/.test(currentVer);

  const [realVersions, setRealVersions] = useState<VersionEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setRealVersions([]);

    async function fetchVersions() {
      try {
        const res = await fetch(
          `/api/versions?id=${encodeURIComponent(details.appId)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          if (!controller.signal.aborted) setLoadState("estimated");
          return;
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        const versions: VersionEntry[] = Array.isArray(data?.versions)
          ? data.versions
          : [];
        if (versions.length > 0) {
          setRealVersions(versions);
          setLoadState("real");
        } else {
          setLoadState("estimated");
        }
      } catch {
        if (!controller.signal.aborted) setLoadState("estimated");
      }
    }

    fetchVersions();
    return () => controller.abort();
  }, [details.appId]);

  const estimatedDates = [
    baseDate,
    new Date(baseDate.getTime() - 18 * 24 * 3600 * 1000),
    new Date(baseDate.getTime() - 52 * 24 * 3600 * 1000),
    new Date(baseDate.getTime() - 110 * 24 * 3600 * 1000),
  ];

  let histories: Array<{
    ver: string;
    date: string;
    label: string;
    isCurrent: boolean;
    isEstimated: boolean;
  }>;

  if (loadState === "real" && realVersions.length > 0) {
    const seen = new Set<string>();
    const filtered = realVersions.filter((v) => {
      if (seen.has(v.version)) return false;
      seen.add(v.version);
      return true;
    });
    const hasCurrent = filtered.some(
      (v) => v.version === currentVer && !isVaries
    );
    const list = hasCurrent ? filtered : [
      { version: currentVer, date: formatDate(baseDate.getTime()) },
      ...filtered,
    ];
    histories = list.slice(0, 8).map((v, i) => ({
      ver: v.version,
      date: v.date || formatDate(baseDate.getTime()),
      label: i === 0 ? "当前版本" : "历史版本",
      isCurrent: i === 0,
      isEstimated: false,
    }));
  } else {
    const versions = isVaries
      ? [currentVer]
      : buildEstimatedVersions(currentVer) ?? [currentVer];
    histories = versions.map((ver, i) => ({
      ver,
      date: formatDate(estimatedDates[i].getTime()),
      label: i === 0 ? "当前版本" : "估算版本",
      isCurrent: i === 0,
      isEstimated: i !== 0,
    }));
  }

  const bannerText =
    loadState === "real"
      ? "当前版本号来自 Google Play 实时数据，历史版本号及发布日期来自 APKPure 存档。"
      : loadState === "estimated"
      ? "当前版本号为 Google Play 实时数据，历史版本号为系统估算，仅供参考。如需精确历史版本，请前往 APKPure 版本存档。"
      : "正在从 APKPure 获取真实版本历史...";

  return (
    <div className="pt-8 border-t border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>版本历史</span>
          {loadState === "loading" && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          )}
        </h3>
        <a
          href={`https://apkpure.com/cn/${details.appId}/versions`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
        >
          <span>查看 APKPure 完整版本存档</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div
        className={`flex items-start gap-2 border rounded-2xl p-3 mb-5 ${
          loadState === "real"
            ? "bg-emerald-50/60 border-emerald-100"
            : loadState === "estimated"
            ? "bg-amber-50/60 border-amber-100"
            : "bg-slate-50 border-slate-100"
        }`}
      >
        <AlertTriangle
          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            loadState === "real"
              ? "text-emerald-600"
              : "text-amber-600"
          }`}
        />
        <p
          className={`text-xs leading-relaxed ${
            loadState === "real"
              ? "text-emerald-700"
              : "text-amber-700"
          }`}
        >
          {bannerText}
        </p>
      </div>

      <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
        {histories.map((hist, i) => (
          <div key={i} className="relative">
            <span
              className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                hist.isCurrent
                  ? "border-blue-500 scale-110"
                  : "border-slate-300"
              }`}
            >
              {hist.isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </span>

            <div className="bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-blue-100 rounded-2xl p-4 transition-all duration-300 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    V {hist.ver}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      hist.isCurrent
                        ? "bg-blue-50 text-blue-700"
                        : hist.isEstimated
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {hist.label}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {hist.isCurrent
                    ? "更新日期"
                    : hist.isEstimated
                    ? "估算日期"
                    : "发布日期"}
                  : {hist.date}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100/60 flex justify-end">
                <a
                  href={
                    hist.isCurrent
                      ? `/api/download-apk?id=${details.appId}`
                      : `https://apkpure.com/cn/${details.appId}/versions`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1 rounded-lg"
                >
                  <Download className="w-3 h-3" />
                  <span>{hist.isCurrent ? "下载当前版本" : "在 APKPure 查找"}</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
