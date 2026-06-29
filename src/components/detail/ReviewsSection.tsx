import { useEffect, useState } from "react";
import { MessageSquare, Star, ThumbsUp, ExternalLink } from "lucide-react";

interface ReviewsSectionProps {
  appId: string;
}

interface Review {
  id: string;
  userName: string;
  userImage?: string;
  date: string;
  score: number;
  scoreText?: string;
  title?: string;
  text: string;
  thumbsUp?: number;
  version?: string;
}

type SortMode = "newest" | "rating" | "helpfulness";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "newest", label: "最新" },
  { id: "rating", label: "评分" },
  { id: "helpfulness", label: "最有帮助" },
];

function formatDate(ts: string | number): string {
  const t = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(t)) return "";
  const d = new Date(t);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReviewsSection({ appId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortMode>("newest");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setReviews([]);

    async function fetchReviews() {
      try {
        const res = await fetch(
          `/api/reviews?id=${encodeURIComponent(appId)}&sort=${sort}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (controller.signal.aborted) return;
        setReviews(Array.isArray(data) ? data : []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchReviews();
    return () => controller.abort();
  }, [appId, sort]);

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <span>用户评论</span>
        </h3>
        <div className="flex gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                sort === opt.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 skeleton-shimmer rounded-full" />
                <div className="h-3 skeleton-shimmer rounded-md w-24" />
              </div>
              <div className="h-3 skeleton-shimmer rounded-md w-full" />
              <div className="h-3 skeleton-shimmer rounded-md w-3/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          无法加载评论，可能在当前区域不可用。
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400">
          暂无评论数据
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 10).map((review, idx) => (
            <div
              key={review.id || idx}
              className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-[11px] font-bold text-blue-600 flex-shrink-0">
                  {(review.userName || "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">
                  {review.userName || "匿名用户"}
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= (review.score || 0)
                          ? "text-amber-400 fill-current"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
                {review.date && (
                  <span className="text-[10px] text-slate-400 ml-auto font-mono">
                    {formatDate(review.date)}
                  </span>
                )}
              </div>
              {review.title && (
                <p className="text-xs font-bold text-slate-800 mb-1">{review.title}</p>
              )}
              {review.text && (
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                  {review.text}
                </p>
              )}
              {typeof review.thumbsUp === "number" && review.thumbsUp > 0 && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{review.thumbsUp}</span>
                </div>
              )}
            </div>
          ))}
          <a
            href={`https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&showAllReviews=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold mt-2"
          >
            <span>在 Google Play 查看全部评论</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
