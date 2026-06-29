import { useState, useEffect, useRef, useCallback } from "react";
import { AppListItem, CollectionType, PLAY_STORE_CATEGORIES, AppDetails } from "./types";
import SearchBox from "./components/SearchBox";
import AppCard from "./components/AppCard";
import AppDetailModal from "./components/AppDetailModal";
import {
  Download, Sparkles, Trophy, DollarSign,
  HelpCircle, RefreshCw, Bookmark,
  Bell, X, ExternalLink, Search, Loader2
} from "lucide-react";
import { useTrackedApps } from "./hooks/useTrackedApps";

export default function App() {
  const [apps, setApps] = useState<AppListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<CollectionType>("TOP_FREE");

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const [showTrackedPanel, setShowTrackedPanel] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { trackedApps, trackApp, untrackApp, isTracked, updateTrackedVersion } = useTrackedApps();

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    pageRef.current = 1;

    async function fetchFirstPage() {
      setLoading(true);
      setError(null);
      setHasMore(false);
      try {
        let url = "";
        if (searchQuery) {
          url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
        } else {
          url = `/api/list?collection=${selectedCollection}&category=${selectedCategory}&page=1`;
        }

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error("连接服务器获取应用列表失败，请重试。");
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (searchQuery) {
          setApps(data);
          setHasMore(false);
        } else {
          setApps(data.apps || []);
          setHasMore(Boolean(data.hasMore));
        }
      } catch (err) {
        if ((err as Error).name === "AbortError" || controller.signal.aborted) return;
        setError((err as Error).message || "获取应用列表失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchFirstPage();
    return () => controller.abort();
  }, [searchQuery, selectedCollection, selectedCategory, fetchKey]);

  const fetchNextPage = useCallback(async (controller: AbortController) => {
    if (loadingMore || !hasMore || searchQuery) return;
    const nextPage = pageRef.current + 1;
    const reqCollection = selectedCollection;
    const reqCategory = selectedCategory;
    setLoadingMore(true);
    try {
      const url = `/api/list?collection=${reqCollection}&category=${reqCategory}&page=${nextPage}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("加载更多失败");
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (reqCollection !== selectedCollection || reqCategory !== selectedCategory) return;
      const newApps = data.apps || [];
      setApps((prev) => [...prev, ...newApps]);
      setHasMore(Boolean(data.hasMore));
      pageRef.current = nextPage;
    } catch {
      // 静默失败，保留现有列表
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [loadingMore, hasMore, searchQuery, selectedCollection, selectedCategory]);

  useEffect(() => {
    if (!hasMore || searchQuery) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage(controller);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [hasMore, searchQuery, fetchNextPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory("");
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery("");
  };

  const handleCollectionSelect = (col: CollectionType) => {
    setSelectedCollection(col);
    setSearchQuery("");
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedCollection("TOP_FREE");
  };

  const handleRefresh = () => {
    setFetchKey((k) => k + 1);
  };

  const trackedAppsRef = useRef(trackedApps);
  useEffect(() => {
    trackedAppsRef.current = trackedApps;
  }, [trackedApps]);

  const checkForUpdates = useCallback(async () => {
    const current = trackedAppsRef.current;
    if (current.length === 0) return;

    for (const tracked of current) {
      try {
        const res = await fetch(`/api/app?id=${encodeURIComponent(tracked.appId)}`);
        if (res.ok) {
          const details: AppDetails = await res.json();
          if (details.version && details.version !== tracked.version) {
            updateTrackedVersion(tracked.appId, details.version);
          }
        }
      } catch {
        // skip
      }
    }
  }, [updateTrackedVersion]);

  useEffect(() => {
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 selection:bg-blue-100 selection:text-blue-900 font-sans transition-colors">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleClearFilters}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-black/15 isolation-isolate border border-slate-200"
              style={{ background: "linear-gradient(45deg, #000 50%, #fff 50%)" }}
            >
              <Download className="w-5 h-5 text-white mix-blend-difference" />
            </div>
            <h1 className="font-display font-bold text-slate-900 text-lg sm:text-xl tracking-tight leading-tight">
              Google Play Downloader
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTrackedPanel(!showTrackedPanel)}
              className="relative flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">收藏</span>
              {trackedApps.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {trackedApps.length}
                </span>
              )}
            </button>

          </div>
        </div>
      </header>

      {/* Tracked Apps Slide Panel */}
      {showTrackedPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowTrackedPanel(false)} />
          <div className="relative w-full max-w-sm bg-white shadow-2xl h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-800">收藏的应用</h2>
              </div>
              <button onClick={() => setShowTrackedPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {trackedApps.length === 0 ? (
              <div className="p-8 text-center">
                <Bookmark className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">还没有收藏任何应用</p>
                <p className="text-xs text-slate-300 mt-1">在应用详情页点击"收藏并追踪更新"</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {trackedApps.map((app) => (
                  <div
                    key={app.appId}
                    className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors group"
                    onClick={() => {
                      setSelectedAppId(app.appId);
                      setShowTrackedPanel(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      <img
                        src={app.icon}
                        alt={app.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(app.appId)}`;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {app.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">{app.developer}</p>
                      <p className="text-[10px] text-slate-300 font-mono">v{app.version}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        untrackApp(app.appId);
                      }}
                      className="p-1 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Search */}
      <section className="bg-white border-b border-slate-100/80 py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-slate-900 tracking-tight leading-tight mb-6">
            搜索 Google Play 应用
          </h2>

          <SearchBox onSearch={handleSearch} initialValue={searchQuery} />
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">应用类别</h3>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory("")} className="text-xs text-blue-600 hover:underline">
                清除分类筛选
              </button>
            )}
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {PLAY_STORE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap border ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Collection Tabs / Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          {searchQuery ? (
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                搜索结果: <span className="text-blue-600">"{searchQuery}"</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">找到 {apps.length} 个应用</p>
            </div>
          ) : (
            <div className="flex gap-2 border-b sm:border-b-0 border-slate-200 sm:pb-0 overflow-x-auto pb-1">
              <button
                onClick={() => handleCollectionSelect("TOP_FREE")}
                className={`py-2 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCollection === "TOP_FREE"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>热门免费榜</span>
              </button>

              <button
                onClick={() => handleCollectionSelect("GROSSING")}
                className={`py-2 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCollection === "GROSSING"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>畅销精选</span>
              </button>

              <button
                onClick={() => handleCollectionSelect("TOP_PAID")}
                className={`py-2 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCollection === "TOP_PAID"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>热门付费榜</span>
              </button>
            </div>
          )}

          {!searchQuery && (
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span>当前过滤:</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                {PLAY_STORE_CATEGORIES.find((c) => c.id === selectedCategory)?.name || "全部分类"}
              </span>
              <button
                onClick={handleRefresh}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                title="刷新数据"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(9)].map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs space-y-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 skeleton-shimmer rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-4 skeleton-shimmer rounded-md w-3/4" />
                    <div className="h-3 skeleton-shimmer rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-10 skeleton-shimmer rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50/75 border border-red-100 rounded-3xl p-8 max-w-xl mx-auto text-center my-8">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">获取应用列表出错</h3>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
            >
              重置筛选并重试
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">没有找到匹配的应用</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              未能在此分类或关键词下找到应用。你可以尝试其他关键词，或直接到第三方镜像站搜索下载：
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <a
                href={`https://apkpure.com/search?q=${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>在 APKPure 搜索</span>
              </a>
              <a
                href={`https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>在 APKMirror 搜索</span>
              </a>
            </div>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              返回首页排行榜
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {apps.map((app) => (
                <AppCard key={app.appId} app={app} onSelect={(id) => setSelectedAppId(id)} />
              ))}
            </div>

            {/* 无限滚动 sentinel */}
            {hasMore && !searchQuery && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>加载更多...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => fetchNextPage(new AbortController())}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                  >
                    加载更多
                  </button>
                )}
              </div>
            )}

            {!hasMore && !searchQuery && apps.length > 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                已加载全部 {apps.length} 个应用
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 mt-16 py-12 text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left space-y-1">
            <div className="font-bold text-slate-700 text-sm">Google Play Downloader</div>
            <p>
              © {new Date().getFullYear()} 免责声明：本平台数据来源于 Google Play 公开页面。APK 下载链接由第三方镜像站提供，本站不直接上传或缓存任何应用。
            </p>
          </div>
          <div className="flex gap-4 text-slate-400 text-xs shrink-0 font-semibold">
            <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
              Play Store
            </a>
            <span>·</span>
            <a href="https://apkpure.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
              APKPure
            </a>
            <span>·</span>
            <a href="https://www.apkmirror.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
              APKMirror
            </a>
          </div>
        </div>
      </footer>

      {/* App Detail Modal */}
      {selectedAppId && (
        <AppDetailModal
          appId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onSelectSimilar={(id) => setSelectedAppId(id)}
          isTracked={isTracked}
          onTrack={trackApp}
          onUntrack={untrackApp}
        />
      )}
    </div>
  );
}
