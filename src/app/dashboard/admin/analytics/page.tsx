"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Report, SmartBin, Cleaner } from "@/types";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#a855f7", "#f97316", "#06b6d4", "#ec4899"];

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
      const { data: profile } = await supabase.from("users").select("name").eq("id", user.id).single();
      if (profile) setUserName(profile.name);

      const [r, b, c] = await Promise.all([
        supabase.from("reports").select("*"),
        supabase.from("smart_bins").select("*"),
        supabase.from("cleaners").select("*"),
      ]);
      if (r.data) setReports(r.data);
      if (b.data) setBins(b.data);
      if (c.data) setCleaners(c.data);
    };
    init();
  }, [router]);

  const wasteDist = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.waste_type] = (acc[r.waste_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  const statusDist = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  const dayMap: Record<string, number> = {};
  reports.forEach(r => {
    const d = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayMap[d] = (dayMap[d] || 0) + 1;
  });
  const dailyTrend = Object.entries(dayMap).map(([date, reports]) => ({ date, reports }));

  const severityDist = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const avgFill = bins.length > 0 ? Math.round(bins.reduce((s, b) => s + b.fill_level, 0) / bins.length) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Analytics Dashboard</h1>
          <p style={{ color: "var(--text-secondary)" }}>Environmental insights powered by your data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <DashboardCard title="Total Reports" value={reports.length} icon="📋" color="green" />
          <DashboardCard title="Total Bins" value={bins.length} icon="🗑️" color="blue" />
          <DashboardCard title="Cleaners" value={cleaners.length} icon="🧹" color="purple" />
          <DashboardCard title="Avg Fill Level" value={`${avgFill}%`} icon="📊" color="yellow" />
          <DashboardCard title="Resolution Rate" value={reports.length > 0 ? `${Math.round((reports.filter(r => r.status === "completed").length / reports.length) * 100)}%` : "0%"} icon="🎯" color="red" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>Daily Report Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)" }} />
                <Line type="monotone" dataKey="reports" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>Waste Type Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={wasteDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {wasteDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {statusDist.map((_, i) => <Cell key={i} fill={[ "#eab308", "#3b82f6", "#22c55e" ][i] || "#16a34a"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>Severity Levels</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={severityDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {severityDist.map((_, i) => <Cell key={i} fill={["#22c55e", "#eab308", "#f97316", "#ef4444"][i] || "#16a34a"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-xl" style={{ background: "rgba(22,163,74,0.1)" }}>
              <div className="text-3xl font-bold text-green-600">{reports.filter(r => r.status === "completed").length}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Resolved</div>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ background: "rgba(234,179,8,0.1)" }}>
              <div className="text-3xl font-bold text-yellow-600">{reports.filter(r => r.status === "pending").length}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Pending</div>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.1)" }}>
              <div className="text-3xl font-bold text-red-600">{bins.filter(b => b.status === "full").length}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Full Bins</div>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ background: "rgba(59,130,246,0.1)" }}>
              <div className="text-3xl font-bold text-blue-600">{cleaners.filter(c => c.is_active).length}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Active Cleaners</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
