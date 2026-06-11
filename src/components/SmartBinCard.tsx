import { SmartBin } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils";

interface SmartBinCardProps {
  bin: SmartBin;
  onClick?: () => void;
}

export default function SmartBinCard({ bin, onClick }: SmartBinCardProps) {
  return (
    <div
      onClick={onClick}
      className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{bin.name}</h3>
          <p className="text-xs text-gray-400">ID: {bin.bin_id}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(bin.status)}`}>
          {getStatusLabel(bin.status)}
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Fill Level</span>
            <span className="font-medium text-gray-700">{bin.fill_level}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                bin.fill_level > 80 ? 'bg-red-500' :
                bin.fill_level > 40 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${bin.fill_level}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">Updated: {new Date(bin.last_updated).toLocaleString()}</p>
      </div>
    </div>
  );
}
