import { useEffect, useState } from "react";
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface DataSafetySectionProps {
  appId: string;
}

interface DataEntry {
  data: string;
  optional: boolean;
  purpose?: string;
  type?: string;
}

interface SecurityPractice {
  practice?: string;
  description?: string;
}

interface DataSafetyData {
  sharedData: DataEntry[];
  collectedData: DataEntry[];
  securityPractices: SecurityPractice[];
  privacyPolicyUrl?: string | null;
  permissions: string[];
}

const PURPOSE_MAP: Record<string, string> = {
  "App functionality": "应用功能",
  "Analytics": "分析",
  "Developer communications": "开发者通讯",
  "Fraud prevention, security, and compliance": "防欺诈、安全和合规",
  "Advertising or marketing": "广告或营销",
  "Personalization": "个性化",
  "Account management": "账户管理",
};

function translatePurpose(p?: string): string {
  if (!p) return "未说明";
  return PURPOSE_MAP[p] || p;
}

export default function DataSafetySection({ appId }: DataSafetySectionProps) {
  const [data, setData] = useState<DataSafetyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);

    async function fetchData() {
      try {
        const res = await fetch(`/api/data-safety?id=${encodeURIComponent(appId)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (controller.signal.aborted) return;
        setData(json);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [appId]);

  if (loading) {
    return (
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>数据安全与权限</span>
        </h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>数据安全与权限</span>
        </h3>
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          无法加载数据安全信息，该应用可能未提供此数据。
        </div>
      </div>
    );
  }

  const sharedData = Array.isArray(data.sharedData) ? data.sharedData : [];
  const collectedData = Array.isArray(data.collectedData) ? data.collectedData : [];
  const securityPractices = Array.isArray(data.securityPractices) ? data.securityPractices : [];
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

  const hasAny =
    sharedData.length > 0 ||
    collectedData.length > 0 ||
    securityPractices.length > 0 ||
    permissions.length > 0;

  if (!hasAny) {
    return (
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>数据安全与权限</span>
        </h3>
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400">
          该应用未提供数据安全信息
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
        <span>数据安全与权限</span>
      </h3>

      <div className="space-y-4">
        {/* Security Practices */}
        {securityPractices.length > 0 && (
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>安全实践</span>
            </h4>
            <ul className="space-y-1.5">
              {securityPractices.slice(0, 8).map((p, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>
                    <span className="font-semibold text-slate-700">{p.practice || "未命名"}</span>
                    {p.description && (
                      <span className="text-slate-500"> — {p.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Data Collected */}
        {collectedData.length > 0 && (
          <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>收集的数据 ({collectedData.length})</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {collectedData.slice(0, 12).map((d, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-white border border-blue-100 text-slate-600 px-2 py-1 rounded-md"
                  title={`用途: ${translatePurpose(d.purpose)}${d.optional ? "（可选）" : ""}`}
                >
                  {d.data}
                  {d.optional && <span className="text-slate-400 ml-1">·可选</span>}
                </span>
              ))}
              {collectedData.length > 12 && (
                <span className="text-[10px] text-slate-400 px-2 py-1">
                  +{collectedData.length - 12}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Data Shared */}
        {sharedData.length > 0 && (
          <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>共享的数据 ({sharedData.length})</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {sharedData.slice(0, 12).map((d, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-white border border-amber-100 text-slate-600 px-2 py-1 rounded-md"
                  title={`用途: ${translatePurpose(d.purpose)}`}
                >
                  {d.data}
                </span>
              ))}
              {sharedData.length > 12 && (
                <span className="text-[10px] text-slate-400 px-2 py-1">
                  +{sharedData.length - 12}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Permissions */}
        {permissions.length > 0 && (
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-2">
              所需权限 ({permissions.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {permissions.slice(0, 15).map((p, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-white border border-slate-100 text-slate-500 px-2 py-1 rounded-md font-mono"
                >
                  {p}
                </span>
              ))}
              {permissions.length > 15 && (
                <span className="text-[10px] text-slate-400 px-2 py-1">
                  +{permissions.length - 15}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Privacy Policy */}
        {data.privacyPolicyUrl && (
          <a
            href={data.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>查看隐私政策</span>
          </a>
        )}
      </div>
    </div>
  );
}
