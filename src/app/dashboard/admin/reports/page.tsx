"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Report } from "@/types";
import Navbar from "@/components/Navbar";
import ReportCard from "@/components/ReportCard";
import { getStatusLabel } from "@/lib/utils";

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [userName, setUserName] = useState("");

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

      const { data: allReports } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (allReports) setReports(allReports);
    };

    init();
  }, [router]);

  const filteredReports = filter === "all" ? reports : reports.filter(r => r.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-900">All Reports</h1>
            <p className="text-gray-500">{reports.length} total reports</p>
          </div>
          <div className="flex gap-2">
            {["all", "pending", "in_progress", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  filter === s
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
                }`}
              >
                {s === "all" ? "All" : getStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => router.push(`/reports/${report.id}`)}
            />
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-16 glass-card rounded-2xl">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500">No {filter !== "all" ? filter.replace(/_/g, " ") : ""} reports found</p>
          </div>
        )}
      </main>
    </div>
  );
}
