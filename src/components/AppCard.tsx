import { AppListItem } from "../types";
import { Star, Download } from "lucide-react";

interface AppCardProps {
  app: AppListItem;
  onSelect: (appId: string) => void;
}

export default function AppCard({ app, onSelect }: AppCardProps) {
  const { title, appId, icon, developer, scoreText, score, priceText, free = true } = app;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(appId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(appId);
        }
      }}
      className="group bg-white rounded-2xl border border-slate-100 p-4 shadow-xs hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-pointer flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex gap-4 items-start mb-3">
        <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/60 shadow-xs group-hover:scale-105 transition-transform duration-300">
          <img
            src={icon}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(appId)}`;
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-[15px] leading-tight truncate group-hover:text-blue-600 transition-colors" title={title}>
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 truncate">{developer}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {(score !== undefined || scoreText) && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md text-[11px] font-medium">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{scoreText || score?.toFixed(1) || "0.0"}</span>
              </div>
            )}

            <span
              className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                free
                  ? "bg-green-50 text-green-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {free ? "免费" : priceText || "收费"}
            </span>
          </div>
        </div>
      </div>

      {app.summary && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-grow leading-relaxed">{app.summary}</p>
      )}

      <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between text-xs font-medium text-slate-400">
        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={appId}>
          {appId}
        </span>
        <div className="flex items-center gap-1 text-blue-600 bg-blue-50/50 group-hover:bg-blue-600 group-hover:text-white px-3 py-1.5 rounded-xl transition-all duration-300">
          <Download className="w-3.5 h-3.5" />
          <span>下载 APK</span>
        </div>
      </div>
    </div>
  );
}
