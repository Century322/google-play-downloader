import { AppDetails } from "../../types";

interface ScreenshotGalleryProps {
  details: AppDetails;
}

export default function ScreenshotGallery({ details }: ScreenshotGalleryProps) {
  if (!details.screenshots || details.screenshots.length === 0) return null;

  return (
    <div className="pt-8 border-t border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">应用截图</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
        {details.screenshots.map((screen, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-44 sm:w-56 h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-100/80 bg-slate-50 shadow-xs"
          >
            <img
              src={screen}
              alt={`${details.title} 截图 ${index + 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
