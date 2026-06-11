import { Report } from "@/types";
import { getStatusColor, getStatusLabel, getWasteTypeIcon, formatDate } from "@/lib/utils";

interface ReportCardProps {
  report: Report;
  onClick?: () => void;
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  return (
    <div
      onClick={onClick}
      className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          {report.image_url ? (
            <img src={report.image_url} alt="Waste" className="w-full h-full object-cover" />
          ) : (
            getWasteTypeIcon(report.waste_type)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(report.status)}`}>
              {getStatusLabel(report.status)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
              {getStatusLabel(report.waste_type)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
              report.priority === 'urgent' ? 'bg-red-500' :
              report.priority === 'high' ? 'bg-orange-500' :
              'bg-gray-400'
            }`}>
              {getStatusLabel(report.priority)}
            </span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2 mb-1">{report.description}</p>
          <p className="text-xs text-gray-400">{formatDate(report.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
