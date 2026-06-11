interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
}

export default function DashboardCard({ title, value, icon, color = "green", subtitle }: DashboardCardProps) {
  const colorClasses: Record<string, string> = {
    green: "from-green-500 to-emerald-600",
    blue: "from-blue-500 to-indigo-600",
    yellow: "from-yellow-500 to-orange-500",
    purple: "from-purple-500 to-pink-500",
    red: "from-red-500 to-rose-600",
  };

  return (
    <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
