"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Report, Cleaner, SmartBin, Assignment } from "@/types";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";
import MapViewWrapper from "@/components/MapViewWrapper";

export default function AdminDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    total_reports: 0,
    pending_reports: 0,
    in_progress_reports: 0,
    completed_reports: 0,
    active_cleaners: 0,
    smart_bins: 0,
    pending_assignments: 0,
  });
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [bins, setBins] = useState<SmartBin[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const reportsRef = useRef(reports);
  const cleanersRef = useRef(cleaners);
  const binsRef = useRef(bins);
  const assignmentsRef = useRef(assignments);
  reportsRef.current = reports;
  cleanersRef.current = cleaners;
  binsRef.current = bins;
  assignmentsRef.current = assignments;

  const recalcStats = useRef((rpts: Report[], clrs: Cleaner[], bns: SmartBin[], asgns: Assignment[]) => {
    setStats({
      total_reports: rpts.length,
      pending_reports: rpts.filter(r => r.status === "pending").length,
      in_progress_reports: rpts.filter(r => r.status === "in_progress").length,
      completed_reports: rpts.filter(r => r.status === "completed").length,
      active_cleaners: clrs.filter(c => c.is_active).length,
      smart_bins: bns.length,
      pending_assignments: asgns.filter(a => a.status === "assigned").length,
    });
  }).current;

  useEffect(() => {
    recalcStats(reports, cleaners, bins, assignments);
  }, [reports, cleaners, bins, assignments]);

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

      const [reportsRes, cleanersRes, binsRes, assignmentsRes] = await Promise.all([
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("cleaners").select("*"),
        supabase.from("smart_bins").select("*"),
        supabase.from("assignments").select("*").order("assigned_at", { ascending: false }),
      ]);

      if (reportsRes.data) {
        setReports(reportsRes.data);
        setRecentReports(reportsRes.data.slice(0, 5));
      }
      if (cleanersRes.data) setCleaners(cleanersRes.data);
      if (binsRes.data) setBins(binsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    };

    init();

    const reportsSub = supabase
      .channel("admin-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        const current = reportsRef.current;
        if (payload.eventType === "INSERT") {
          setReports(prev => [payload.new as Report, ...prev]);
          setRecentReports(prev => [payload.new as Report, ...prev.slice(0, 4)]);
        } else if (payload.eventType === "DELETE") {
          setReports(prev => prev.filter(r => r.id !== payload.old.id));
        } else {
          setReports(prev => prev.map(r => r.id === payload.new.id ? payload.new as Report : r));
          const updated = payload.new as Report;
          if (current.find(r => r.id === updated.id)) {
            setRecentReports(prev => prev.map(r => r.id === updated.id ? updated : r));
          }
        }
      })
      .subscribe();

    const cleanersSub = supabase
      .channel("admin-cleaners")
      .on("postgres_changes", { event: "*", schema: "public", table: "cleaners" }, (payload) => {
        if (payload.eventType === "INSERT") setCleaners(prev => [...prev, payload.new as Cleaner]);
        else if (payload.eventType === "DELETE") setCleaners(prev => prev.filter(c => c.id !== payload.old.id));
        else setCleaners(prev => prev.map(c => c.id === payload.new.id ? payload.new as Cleaner : c));
      })
      .subscribe();

    const binsSub = supabase
      .channel("admin-bins")
      .on("postgres_changes", { event: "*", schema: "public", table: "smart_bins" }, (payload) => {
        if (payload.eventType === "INSERT") setBins(prev => [...prev, payload.new as SmartBin]);
        else if (payload.eventType === "DELETE") setBins(prev => prev.filter(b => b.id !== payload.old.id));
        else setBins(prev => prev.map(b => b.id === payload.new.id ? payload.new as SmartBin : b));
      })
      .subscribe();

    const assignmentsSub = supabase
      .channel("admin-assignments")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, (payload) => {
        if (payload.eventType === "INSERT") setAssignments(prev => [payload.new as Assignment, ...prev]);
        else if (payload.eventType === "DELETE") setAssignments(prev => prev.filter(a => a.id !== payload.old.id));
        else setAssignments(prev => prev.map(a => a.id === payload.new.id ? payload.new as Assignment : a));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsSub);
      supabase.removeChannel(cleanersSub);
      supabase.removeChannel(binsSub);
      supabase.removeChannel(assignmentsSub);
    };
  }, [router, recalcStats]);

  const quickLinks = [
    { href: "/dashboard/admin/reports", label: "All Reports", icon: "📋", desc: "View and manage all waste reports", color: "from-green-500 to-emerald-600" },
    { href: "/dashboard/admin/cleaners", label: "Cleaners", icon: "🧹", desc: "Monitor cleaner activities", color: "from-blue-500 to-indigo-600" },
    { href: "/dashboard/admin/bins", label: "Smart Bins", icon: "🗑️", desc: "Manage smart waste bins", color: "from-purple-500 to-pink-500" },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: "📊", desc: "View environmental insights", color: "from-yellow-500 to-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-green-900">Admin Dashboard</h1>
          <p className="text-gray-500">WasteTrack AI Command Center</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <DashboardCard title="Total Reports" value={stats.total_reports} icon="📋" color="green" />
          <DashboardCard title="Pending" value={stats.pending_reports} icon="⏳" color="yellow" />
          <DashboardCard title="In Progress" value={stats.in_progress_reports} icon="🔧" color="purple" />
          <DashboardCard title="Completed" value={stats.completed_reports} icon="✅" color="blue" />
          <DashboardCard title="Active Cleaners" value={stats.active_cleaners} icon="🧹" color="emerald" />
          <DashboardCard title="Smart Bins" value={stats.smart_bins} icon="🗑️" color="red" />
          <DashboardCard title="Assignments" value={stats.pending_assignments} icon="📎" color="orange" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Geographic Map</h2>
            <MapViewWrapper
              reports={reports}
              cleaners={cleaners}
              bins={bins}
              assignments={assignments}
              height="420px"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-lg mb-3`}>
                    {link.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{link.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-green-100 bg-green-50/50">
                  <th className="text-left p-4 font-medium text-gray-600">Type</th>
                  <th className="text-left p-4 font-medium text-gray-600">Description</th>
                  <th className="text-left p-4 font-medium text-gray-600">Location</th>
                  <th className="text-left p-4 font-medium text-gray-600">Status</th>
                  <th className="text-left p-4 font-medium text-gray-600">Priority</th>
                  <th className="text-left p-4 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className="border-b border-green-50 hover:bg-green-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 capitalize">{report.waste_type.replace(/_/g, " ")}</td>
                    <td className="p-4 text-gray-600 max-w-[180px] truncate">{report.description}</td>
                    <td className="p-4 text-xs text-gray-400">
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                        report.status === "completed" ? "bg-green-500" :
                        report.status === "in_progress" ? "bg-blue-500" : "bg-yellow-500"
                      }`}>
                        {report.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 capitalize">{report.priority}</td>
                    <td className="p-4 text-gray-500 text-xs">{new Date(report.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">No reports yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
