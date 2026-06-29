import { Globe, Mail, MapPin } from "lucide-react";
import { AppDetails } from "../../types";

interface DeveloperInfoProps {
  details: AppDetails;
}

export default function DeveloperInfo({ details }: DeveloperInfoProps) {
  const hasAnyInfo = details.developerWebsite || details.developerEmail || details.developerAddress;
  if (!hasAnyInfo) return null;

  return (
    <div className="pt-8 border-t border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">开发者信息</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {details.developerWebsite && (
          <a
            href={details.developerWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border border-slate-100"
          >
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">官方网站</div>
              <div className="text-xs text-slate-700 truncate">{details.developerWebsite}</div>
            </div>
          </a>
        )}

        {details.developerEmail && (
          <a
            href={`mailto:${details.developerEmail}`}
            className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border border-slate-100"
          >
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">开发者邮箱</div>
              <div className="text-xs text-slate-700 truncate">{details.developerEmail}</div>
            </div>
          </a>
        )}

        {details.developerAddress && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">开发者地址</div>
              <div className="text-xs text-slate-700 truncate" title={details.developerAddress}>
                {details.developerAddress}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
