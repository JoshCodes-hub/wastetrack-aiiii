"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Report, Cleaner, SmartBin, Assignment } from "@/types";
import Navbar from "@/components/Navbar";
import MapViewWrapper from "@/components/MapViewWrapper";
import DashboardCard from "@/components/DashboardCard";

export default function MapPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [bins, setBins] = useState<SmartBin[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [userRole, setUserRole] = useState<string>("reporter");
  const [userName, setUserName] = useState("");
  const [mapMode, setMapMode] = useState<"all" | "reports" | "cleaners" | "bins">("all");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserRole(profile.role);
        setUserName(profile.name);
      }

      const [reportsRes, cleanersRes, binsRes, assignmentsRes] = await Promise.all([
        supabase.from("reports").select("*"),
        supabase.from("cleaners").select("*"),
        supabase.from("smart_bins").select("*"),
        supabase.from("assignments").select("*"),
      ]);

      if (reportsRes.data) setReports(reportsRes.data);
      if (cleanersRes.data) setCleaners(cleanersRes.data);
      if (binsRes.data) setBins(binsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    };

    init();
  }, [router]);

  const visibleReports = mapMode === "all" || mapMode === "reports" ? reports : [];
  const visibleCleaners = mapMode === "all" || mapMode === "cleaners" ? cleaners : [];
  const visibleBins = mapMode === "all" || mapMode === "bins" ? bins : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role={userRole as any} userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-green-900">Map View</h1>
            <p className="text-gray-500">Geographic intelligence overview</p>
          </div>
          <div className="flex gap-2">
            {(["all", "reports", "cleaners", "bins"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setMapMode(mode)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all capitalize ${
                  mapMode === mode
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
                }`}
              >
                {mode === "all" ? "All" : mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardCard title="Reports on Map" value={reports.length} icon="🗑️" color="red" />
          <DashboardCard title="Active Cleaners" value={cleaners.filter(c => c.is_active).length} icon="🧹" color="blue" />
          <DashboardCard title="Smart Bins" value={bins.length} icon="📦" color="green" />
        </div>

        <MapViewWrapper
          reports={visibleReports}
          cleaners={visibleCleaners}
          bins={visibleBins}
          assignments={assignments}
          height="600px"
        />

        <div className="flex items-center gap-6 text-sm text-gray-500 glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500 inline-block"></span>
            <span>Waste Reports ({reports.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500 inline-block"></span>
            <span>Cleaners ({cleaners.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-green-500 inline-block"></span>
            <span>Smart Bins ({bins.length})</span>
          </div>
        </div>
      </main>
    </div>
  );
}
