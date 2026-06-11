"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Report, SmartBin, Cleaner } from "@/types";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [bins, setBins] = useState<SmartBin[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      if (profile) setUserName(profile.name);

      const [reportsRes, binsRes, cleanersRes] = await Promise.all([
        supabase.from("reports").select("*"),
        supabase.from("smart_bins").select("*"),
        supabase.from("cleaners").select("*"),
      ]);

      if (reportsRes.data) setReports(reportsRes.data);
      if (binsRes.data) setBins(binsRes.data);
      if (cleanersRes.data) setCleaners(cleanersRes.data);
    };

    init();
  }, [router]);

  const wasteTypeCount: Record<string, number> = {};
  reports.forEach(r => {
    wasteTypeCount[r.waste_type] = (wasteTypeCount[r.waste_type] || 0) + 1;
  });

  const reportsByDay: Record<string, number> = {};
  reports.forEach(r => {
    const day = new Date(r.created_at).toLocaleDateString();
    reportsByDay[day] = (reportsByDay[day] || 0) + 1;
  });

  const maxWasteType = Object.entries(wasteTypeCount).sort((a, b) => b[1] - a[1]);
  const maxDay = Object.entries(reportsByDay).sort((a, b) => b[1] - a[1]);

  const avgFillLevel = bins.length > 0
    ? Math.round(bins.reduce((sum, b) => sum + b.fill_level, 0) / bins.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-green-900">Analytics</h1>
          <p className="text-gray-500">Environmental insights and trends</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <DashboardCard title="Total Reports" value={reports.length} icon="📋" color="green" />
          <DashboardCard title="Total Bins" value={bins.length} icon="🗑️" color="blue" />
          <DashboardCard title="Cleaners" value={cleaners.length} icon="🧹" color="purple" />
          <DashboardCard title="Avg Fill Level" value={`${avgFillLevel}%`} icon="📊" color="yellow" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Waste Type Distribution</h3>
            {maxWasteType.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {maxWasteType.map(([type, count]) => {
                  const total = reports.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{type.replace(/_/g, " ")}</span>
                        <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reports by Day</h3>
            {maxDay.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {maxDay.slice(0, 10).map(([day, count]) => {
                  const total = reports.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={day}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{day}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {reports.filter(r => r.status === "completed").length}
              </div>
              <div className="text-sm text-gray-500">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {reports.filter(r => r.status === "pending").length}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {bins.filter(b => b.status === "full").length}
              </div>
              <div className="text-sm text-gray-500">Full Bins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {cleaners.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-gray-500">Active Cleaners</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
