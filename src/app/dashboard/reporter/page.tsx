"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Report } from "@/types";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";
import ReportCard from "@/components/ReportCard";

export default function ReporterDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

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

      const { data: userReports } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (userReports) {
        setReports(userReports);
        setStats({
          total: userReports.length,
          pending: userReports.filter((r: Report) => r.status === "pending").length,
          completed: userReports.filter((r: Report) => r.status === "completed").length,
        });
      }
    };

    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="reporter" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-900">Reporter Dashboard</h1>
            <p className="text-gray-500">Track your waste reports</p>
          </div>
          <Link
            href="/reports/new"
            className="px-6 py-3 text-white font-medium gradient-primary rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <span>+</span> New Report
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard title="Total Reports" value={stats.total} icon="📋" color="green" />
          <DashboardCard title="Pending" value={stats.pending} icon="⏳" color="yellow" />
          <DashboardCard title="Completed" value={stats.completed} icon="✅" color="blue" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Reports</h2>
          {reports.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl">
              <div className="text-5xl mb-4">📸</div>
              <p className="text-gray-500 mb-4">No reports yet. Start by reporting waste!</p>
              <Link
                href="/reports/new"
                className="inline-block px-6 py-3 text-white font-medium gradient-primary rounded-xl hover:opacity-90 transition-all"
              >
                Submit Your First Report
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => router.push(`/reports/${report.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
