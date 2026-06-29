import { AppListItem } from "../../types";

interface SimilarAppsProps {
  apps: AppListItem[];
  onSelect: (appId: string) => void;
}

export default function SimilarApps({ apps, onSelect }: SimilarAppsProps) {
  if (!apps || apps.length === 0) return null;

  return (
    <div className="pt-8 border-t border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">相关推荐应用</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {apps.map((app) => (
          <div
            key={app.appId}
            onClick={() => onSelect(app.appId)}
            className="bg-white border border-slate-100 rounded-2xl p-3 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-xs group-hover:scale-105 transition-transform duration-300">
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
            <h4 className="text-xs font-bold text-slate-800 line-clamp-1 w-full group-hover:text-blue-600 transition-colors">
              {app.title}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 w-full">{app.developer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
