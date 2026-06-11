import { AIAnalysis } from "@/types";

interface AIAnalysisResultProps {
  analysis: AIAnalysis;
}

const riskStyles: Record<string, string> = {
  'Low Risk': 'bg-green-100 text-green-800 border-green-200',
  'Medium Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'High Risk': 'bg-red-100 text-red-800 border-red-200',
};

const riskIcons: Record<string, string> = {
  'Low Risk': '🟢',
  'Medium Risk': '🟡',
  'High Risk': '🔴',
};

export default function AIAnalysisResult({ analysis }: AIAnalysisResultProps) {
  const confidencePercent = Math.round(analysis.confidence * 100);

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4 border-l-4 border-l-green-500">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
        <h3 className="font-semibold text-gray-900">AI Environmental Analysis</h3>
        <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium ${
          confidencePercent >= 90 ? 'bg-green-100 text-green-800' :
          confidencePercent >= 80 ? 'bg-yellow-100 text-yellow-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {confidencePercent}% confidence
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 text-center">
          <p className="text-xs text-gray-500 mb-1">Waste Type</p>
          <p className="font-semibold text-green-900">{analysis.wasteType}</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-center">
          <p className="text-xs text-gray-500 mb-1">Severity</p>
          <p className="font-semibold text-blue-900">{analysis.severity}</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 text-center">
          <p className="text-xs text-gray-500 mb-1">Priority</p>
          <p className="font-semibold text-amber-900">{analysis.priority}</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 text-center">
          <p className="text-xs text-gray-500 mb-1">Est. Quantity</p>
          <p className="font-semibold text-purple-900 text-sm">{analysis.estimatedQuantity}</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 text-center">
          <p className="text-xs text-gray-500 mb-1">Environmental Risk</p>
          <p className={`font-semibold ${riskStyles[analysis.environmentalRisk]?.split(' ')[1] || 'text-gray-900'}`}>
            {riskIcons[analysis.environmentalRisk] || '⚪'} {analysis.environmentalRisk}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100 text-center">
          <p className="text-xs text-gray-500 mb-1">Confidence</p>
          <p className="font-semibold text-cyan-900">{confidencePercent}%</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📋</span>
          <p className="text-sm font-semibold text-blue-900">Recommended Action</p>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed">{analysis.recommendedAction}</p>
      </div>
    </div>
  );
}
