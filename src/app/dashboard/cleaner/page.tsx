"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Report, Assignment, Cleaner } from "@/types";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";
import ReportCard from "@/components/ReportCard";
import MapViewWrapper from "@/components/MapViewWrapper";
import { calculateDistance, formatDate } from "@/lib/utils";

export default function CleanerDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [cleanerProfile, setCleanerProfile] = useState<Cleaner | null>(null);
  const [userName, setUserName] = useState("");
  const [cleanerId, setCleanerId] = useState<string | null>(null);

  const loadAssignments = useCallback(async (cId: string) => {
    const { data: myAssignments } = await supabase
      .from("assignments")
      .select("*")
      .eq("cleaner_id", cId)
      .order("assigned_at", { ascending: false });

    if (myAssignments) {
      setAssignments(myAssignments);
      const reportIds = myAssignments.map((a: Assignment) => a.report_id);
      if (reportIds.length > 0) {
        const { data: assignedReports } = await supabase
          .from("reports")
          .select("*")
          .in("id", reportIds)
          .order("created_at", { ascending: false });
        if (assignedReports) setReports(assignedReports);
      } else {
        setReports([]);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: cleaner } = await supabase
        .from("cleaners")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (cleaner) {
        setCleanerId(cleaner.id);
        setCleanerProfile(cleaner);
        setUserName(cleaner.name);
        await loadAssignments(cleaner.id);
      }
    };

    init();
  }, [router, loadAssignments]);

  useEffect(() => {
    if (!cleanerId) return;

    const channel = supabase
      .channel(`cleaner-${cleanerId}-assignments`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assignments",
          filter: `cleaner_id=eq.${cleanerId}`,
        },
        async (payload) => {
          const newAssignment = payload.new as Assignment;
          setAssignments(prev => [newAssignment, ...prev]);

          const { data: reportData } = await supabase
            .from("reports")
            .select("*")
            .eq("id", newAssignment.report_id)
            .single();

          if (reportData) {
            setReports(prev => [reportData, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assignments",
          filter: `cleaner_id=eq.${cleanerId}`,
        },
        (payload) => {
          const updated = payload.new as Assignment;
          setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cleanerId]);

  const updateStatus = async (reportId: string, newStatus: string, assignmentId?: string) => {
    await supabase
      .from("reports")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", reportId);

    if (assignmentId) {
      const assignmentStatus = newStatus === "completed" ? "completed" : "in_progress";
      const updateData: any = { status: assignmentStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      await supabase.from("assignments").update(updateData).eq("id", assignmentId);
    }

    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: newStatus as Report['status'] } : r))
    );
  };

  const nowAssigned = assignments.filter(a => a.status === "assigned");
  const inProgress = assignments.filter(a => a.status === "in_progress");
  const completed = assignments.filter(a => a.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="cleaner" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-green-900">Cleaner Dashboard</h1>
          <p className="text-gray-500">Manage your assigned waste reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <DashboardCard title="Assigned Reports" value={reports.length} icon="📋" color="blue" />
          <DashboardCard title="New Assignments" value={nowAssigned.length} icon="🆕" color="yellow" />
          <DashboardCard title="In Progress" value={inProgress.length} icon="🔧" color="purple" />
          <DashboardCard title="Completed" value={completed.length} icon="✅" color="green" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Reports Map
            {cleanerProfile?.latitude && cleanerProfile?.longitude && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (your location: {cleanerProfile.latitude.toFixed(4)}, {cleanerProfile.longitude.toFixed(4)})
              </span>
            )}
          </h2>
          <MapViewWrapper
            reports={reports}
            cleaners={cleanerProfile ? [cleanerProfile] : []}
            assignments={assignments}
            height="400px"
          />
        </div>

        {nowAssigned.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse-soft"></span>
              New Assignments — Accept to start
            </h2>
            <div className="space-y-3">
              {nowAssigned.map((a) => {
                const report = reports.find(r => r.id === a.report_id);
                if (!report) return null;
                return (
                  <div key={a.id} className="glass-card rounded-2xl p-5 border-l-4 border-l-amber-400">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <ReportCard report={report} onClick={() => router.push(`/reports/${report.id}`)} />
                        {a.distance_km && (
                          <p className="text-xs text-gray-400 mt-1 ml-1">
                            📏 {a.distance_km} km from your location
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => updateStatus(report.id, "in_progress", a.id)}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-all shadow-md whitespace-nowrap"
                      >
                        Accept →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Assigned Reports</h2>
          {reports.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl">
              <div className="text-5xl mb-4">🧹</div>
              <p className="text-gray-500">No reports assigned yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const assignment = assignments.find(a => a.report_id === report.id);
                return (
                  <div key={report.id} className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <ReportCard report={report} onClick={() => router.push(`/reports/${report.id}`)} />
                        {assignment?.distance_km && (
                          <p className="text-xs text-gray-400 mt-1 ml-1">📏 {assignment.distance_km} km away</p>
                        )}
                        {assignment?.assigned_at && (
                          <p className="text-xs text-gray-400 ml-1">🕐 Assigned {formatDate(assignment.assigned_at)}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {report.status === "pending" && (
                          <button
                            onClick={() => updateStatus(report.id, "in_progress", assignment?.id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-all"
                          >
                            Start
                          </button>
                        )}
                        {report.status === "in_progress" && (
                          <button
                            onClick={() => updateStatus(report.id, "completed", assignment?.id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-xl hover:bg-green-600 transition-all"
                          >
                            Complete
                          </button>
                        )}
                        {report.status === "completed" && (
                          <span className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-xl">
                            Done ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
