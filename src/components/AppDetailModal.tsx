import { useState, useEffect, useRef } from "react";
import { AppDetails, AppListItem } from "../types";
import {
  X, Star, ExternalLink, Loader2, ShieldAlert,
  Bookmark, BookmarkCheck, Smartphone, Download, Zap,
  ChevronRight, Globe, RefreshCw, AlertTriangle
} from "lucide-react";
import VersionHistory from "./detail/VersionHistory";
import ScreenshotGallery from "./detail/ScreenshotGallery";
import DeveloperInfo from "./detail/DeveloperInfo";
import SimilarApps from "./detail/SimilarApps";
import ReviewsSection from "./detail/ReviewsSection";
import DataSafetySection from "./detail/DataSafetySection";
import { formatNumber } from "../utils/format";

interface AppDetailModalProps {
  appId: string;
  onClose: () => void;
  onSelectSimilar: (appId: string) => void;
  isTracked: (appId: string) => boolean;
  onTrack: (details: AppDetails) => void;
  onUntrack: (appId: string) => void;
}

interface MirrorSource {
  id: string;
  name: string;
  letter: string;
  description: string;
  url: string;
  color: string;
  bgColor: string;
  hoverBorderColor: string;
}

const CONTENT_RATING_MAP: Record<string, string> = {
  "Everyone": "适合所有人",
  "Everyone 10+": "10岁以上",
  "Teen": "青少年",
  "Mature 17+": "17岁以上",
  "Adults only 18+": "仅限成人",
  "Unrated": "未分级",
  "PEGI 3": "PEGI 3",
  "PEGI 7": "PEGI 7",
  "PEGI 12": "PEGI 12",
  "PEGI 16": "PEGI 16",
  "PEGI 18": "PEGI 18",
};

function translateContentRating(rating: string): string {
  return CONTENT_RATING_MAP[rating] || rating;
}

function getMirrors(appId: string): MirrorSource[] {
  return [
    {
      id: "apkmirror",
      name: "APKMirror",
      letter: "M",
      description: "每个 APK 均做安全签名验证，社区口碑最佳",
      url: `https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=${appId}`,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      hoverBorderColor: "hover:border-amber-300",
    },
    {
      id: "apkcombo",
      name: "APKCombo",
      letter: "C",
      description: "可按 CPU 架构（arm64/x86）精确筛选下载",
      url: `https://apkcombo.com/search/${appId}`,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      hoverBorderColor: "hover:border-indigo-300",
    },
  ];
}

function DetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-8">
      <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-slate-100">
        <div className="w-28 h-28 sm:w-32 sm:h-32 skeleton-shimmer rounded-3xl flex-shrink-0 self-center md:self-start" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 skeleton-shimmer rounded-full w-16" />
            <div className="h-5 skeleton-shimmer rounded-md w-32" />
          </div>
          <div className="h-8 skeleton-shimmer rounded-md w-2/3" />
          <div className="h-4 skeleton-shimmer rounded-md w-1/2" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 skeleton-shimmer rounded-2xl" />
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <div className="h-9 skeleton-shimmer rounded-xl w-28" />
            <div className="h-9 skeleton-shimmer rounded-xl w-32" />
            <div className="h-9 skeleton-shimmer rounded-xl w-24" />
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <div className="h-6 skeleton-shimmer rounded-md w-40" />
        <div className="h-32 skeleton-shimmer rounded-3xl" />
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-3">
          <div className="h-6 skeleton-shimmer rounded-md w-32" />
          <div className="h-16 skeleton-shimmer rounded-2xl" />
          <div className="h-16 skeleton-shimmer rounded-2xl" />
        </div>
        <div className="lg:col-span-5">
          <div className="h-40 skeleton-shimmer rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export default function AppDetailModal({
  appId,
  onClose,
  onSelectSimilar,
  isTracked,
  onTrack,
  onUntrack,
}: AppDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<AppDetails | null>(null);
  const [similarApps, setSimilarApps] = useState<AppListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadWarning, setDownloadWarning] = useState<{ message: string; url: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (downloadWarning) {
          setDownloadWarning(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, downloadWarning]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setDetails(null);
    setSimilarApps([]);

    let attempts = 0;
    const maxAttempts = 3;

    async function fetchWithRetry() {
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch(`/api/app?id=${encodeURIComponent(appId)}`, {
            signal: controller.signal,
          });
          if (!res.ok) {
            if (attempts < maxAttempts) {
              await new Promise((r) => setTimeout(r, 1000 * attempts));
              continue;
            }
            throw new Error("未能获取该应用的详细数据，可能该应用限制了区域或已被下架。");
          }
          const data = await res.json();
          if (controller.signal.aborted) return;
          setDetails(data);
          setLoading(false);

          try {
            const similarRes = await fetch(`/api/similar?id=${encodeURIComponent(appId)}`, {
              signal: controller.signal,
            });
            if (similarRes.ok) {
              const similarData = await similarRes.json();
              if (!controller.signal.aborted) setSimilarApps(similarData.slice(0, 5));
            }
          } catch {
            // similar apps fetch is optional
          }
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError" || controller.signal.aborted) return;
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1000 * attempts));
            continue;
          }
          setError((err as Error).message || "获取应用详情失败");
          setLoading(false);
        }
      }
    }

    fetchWithRetry();
    return () => controller.abort();
  }, [appId, retryCount]);

  const handleToggleTrack = () => {
    if (!details) return;
    if (isTracked(details.appId)) {
      onUntrack(details.appId);
    } else {
      onTrack(details);
    }
  };

  const handleDownload = async () => {
    if (!details || downloadLoading) return;
    setDownloadLoading(true);
    try {
      const res = await fetch(`/api/download-info?id=${encodeURIComponent(details.appId)}`);
      if (!res.ok) throw new Error("检测下载格式失败");
      const data = await res.json();
      if (data.warning) {
        setDownloadWarning({ message: data.warning, url: data.url });
      } else {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(`https://apkpure.com/${details.appId}`, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const tracked = details ? isTracked(details.appId) : false;
  const showError = !loading && (error || !details);

  const displaySize = (size: string | undefined) => {
    if (!size || size.toLowerCase().includes("varies")) return "因设备而异";
    return size;
  };

  const displayVersion = (version: string | undefined) => {
    if (!version || version.toLowerCase().includes("varies")) return "最新版";
    return `v${version}`;
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="应用详情"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col overflow-hidden relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full text-slate-500 hover:text-slate-800 z-10 shadow-xs"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <DetailSkeleton />
        ) : showError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
            <div className="p-3 bg-red-50 rounded-2xl text-red-500 mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">获取应用失败</h3>
            <p className="text-sm text-slate-500 mb-6">{error || "无法加载应用详细信息"}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重试</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
              >
                返回列表
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              {/* Header Info Panel */}
              <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-slate-100">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 shadow-md flex-shrink-0 self-center md:self-start">
                  <img
                    src={details!.icon}
                    alt={details!.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(details!.appId)}`;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                      {details!.genre}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{details!.appId}</span>
                  </div>

                  <h1 className="font-bold text-slate-900 text-2xl sm:text-3xl mt-2 tracking-tight leading-tight">
                    {details!.title}
                  </h1>

                  <p className="text-sm text-slate-500 mt-1">
                    开发者: <span className="text-blue-600 font-medium">{details!.developer}</span>
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">评分</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-bold text-slate-800 text-base">{(details!.score ?? 0).toFixed(1)}</span>
                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">
                        {details!.ratingsCount ? `${formatNumber(details!.ratingsCount)} 评价` : "暂无评分"}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">下载量</span>
                      <span className="font-bold text-slate-800 text-base mt-0.5">{details!.installs || "未知"}</span>
                      <span className="text-[10px] text-slate-400">Google Play 统计</span>
                    </div>

                    <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">大小 / 版本</span>
                      <span className="font-bold text-slate-800 text-base mt-0.5 truncate" title={details!.size}>
                        {displaySize(details!.size)}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{displayVersion(details!.version)}</span>
                    </div>

                    <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">内容分级</span>
                      <span className="font-bold text-slate-800 text-base mt-0.5 truncate">
                        {translateContentRating(details!.contentRating || "Everyone")}
                      </span>
                      <span className="text-[10px] text-slate-400">Google Play 评定</span>
                    </div>
                  </div>

                  {/* Action buttons row: 收藏 → Google Play → 下载 */}
                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <button
                      onClick={handleToggleTrack}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        tracked
                          ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {tracked ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>已收藏</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>收藏追踪更新</span>
                        </>
                      )}
                    </button>

                    <a
                      href={details!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors border border-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google Play 页面</span>
                    </a>

                    <button
                      onClick={handleDownload}
                      disabled={downloadLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-wait text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                    >
                      {downloadLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{downloadLoading ? "检测格式..." : "下载 APK"}</span>
                      {!downloadLoading && <Zap className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mirror Sites + QR Code */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <span>其他镜像站</span>
                  </h3>
                  <div className="space-y-2.5">
                    {getMirrors(details!.appId).map((mirror) => (
                      <a
                        key={mirror.id}
                        href={mirror.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full p-3.5 bg-white border border-slate-100 ${mirror.hoverBorderColor} hover:shadow-md rounded-2xl flex items-center justify-between group transition-all`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full ${mirror.bgColor} flex items-center justify-center ${mirror.color} font-bold text-sm`}>
                            {mirror.letter}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                              {mirror.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{mirror.description}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                      <Smartphone className="w-5 h-5 text-blue-600 animate-pulse-slow" />
                      <span className="font-bold text-slate-800 text-sm">扫码下载</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <div className="relative p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-shrink-0 w-24 h-24 flex items-center justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
                            `${window.location.origin}/api/download-apk?id=${details!.appId}`
                          )}`}
                          alt="扫码下载 APK"
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-1 min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800">手机扫码直接下载</h4>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          用手机相机或浏览器扫码，直接在手机端下载安装 APK。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* App Description */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">应用介绍</h3>
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/60 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {details!.description || details!.summary || "暂无应用详细介绍。"}
                </div>
              </div>

              <VersionHistory details={details!} />
              <ScreenshotGallery details={details!} />
              <DataSafetySection appId={details!.appId} />
              <ReviewsSection appId={details!.appId} />
              <DeveloperInfo details={details!} />
              <SimilarApps apps={similarApps} onSelect={onSelectSimilar} />
            </div>
          </div>
        )}

        {downloadWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setDownloadWarning(null)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-base mb-1">下载格式提示</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{downloadWarning.message}</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDownloadWarning(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    window.open(downloadWarning.url, "_blank", "noopener,noreferrer");
                    setDownloadWarning(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  继续下载
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
