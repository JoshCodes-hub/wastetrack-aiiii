"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Report, Assignment, Cleaner } from "@/types";
import Navbar from "@/components/Navbar";
import MapViewWrapper from "@/components/MapViewWrapper";
import { getStatusLabel, getStatusColor, getWasteTypeIcon, formatDate } from "@/lib/utils";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState("");

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

      const { data: reportData } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportData) {
        setReport(reportData);

        const { data: assignData } = await supabase
          .from("assignments")
          .select("*")
          .eq("report_id", id)
          .single();

        if (assignData) {
          setAssignment(assignData);
          const { data: cleanerData } = await supabase
            .from("cleaners")
            .select("*")
            .eq("id", assignData.cleaner_id)
            .single();
          if (cleanerData) setCleaner(cleanerData);
        }
      }
    };

    init();
  }, [id, router]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role={userRole as any} userName={userName} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← Back</button>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="h-64 md:h-auto bg-gray-100 flex items-center justify-center text-6xl">
              {report.image_url ? (
                <img src={report.image_url} alt="Waste" className="w-full h-full object-cover" />
              ) : (
                getWasteTypeIcon(report.waste_type)
              )}
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(report.status)}`}>
                  {getStatusLabel(report.status)}
                </span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  {getStatusLabel(report.waste_type)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                  report.priority === 'urgent' ? 'bg-red-500' :
                  report.priority === 'high' ? 'bg-orange-500' :
                  'bg-gray-400'
                }`}>
                  {getStatusLabel(report.priority)}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                <p className="text-gray-600">{report.description || "No description provided"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Severity</p>
                  <p className="font-medium capitalize text-gray-900">{report.severity}</p>
                </div>
                <div>
                  <p className="text-gray-500">Reported</p>
                  <p className="font-medium text-gray-900">{formatDate(report.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
                </div>
                {report.address && (
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">{report.address}</p>
                  </div>
                )}
              </div>

              {assignment && cleaner && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-sm font-medium text-blue-900">Assigned to: {cleaner.name}</p>
                  <p className="text-xs text-blue-600">Since {formatDate(assignment.assigned_at)}</p>
                  {cleaner.latitude && cleaner.longitude && (
                    <p className="text-xs text-blue-500 mt-1">
                      📍 Cleaner at {cleaner.latitude.toFixed(4)}, {cleaner.longitude.toFixed(4)}
                    </p>
                  )}
                  {assignment.distance_km && (
                    <p className="text-xs text-blue-500">📏 {assignment.distance_km} km from waste</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Location Map</h3>
          <MapViewWrapper
            reports={[report]}
            cleaners={cleaner ? [cleaner] : []}
            assignments={assignment ? [assignment] : []}
            center={[report.latitude, report.longitude]}
            zoom={15}
            height="300px"
          />
        </div>
      </main>
    </div>
  );
}
