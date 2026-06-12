"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SmartBin } from "@/types";
import Navbar from "@/components/Navbar";
import SmartBinCard from "@/components/SmartBinCard";
import MapViewWrapper from "@/components/MapViewWrapper";
import { showToast } from "@/components/NotificationToast";
import { findNearestCleaner } from "@/lib/utils";

export default function AdminBinsPage() {
  const router = useRouter();
  const [bins, setBins] = useState<SmartBin[]>([]);
  const [userName, setUserName] = useState("");
  const binsRef = useRef(bins);
  binsRef.current = bins;

  const cleanersRef = useRef<{ id: string; latitude?: number; longitude?: number }[]>([]);
  const alreadyFull = useRef<Set<string>>(new Set());

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

      const { data: allBins } = await supabase.from("smart_bins").select("*");
      if (allBins) setBins(allBins);

      const { data: cleaners } = await supabase.from("cleaners").select("id, latitude, longitude");
      if (cleaners) cleanersRef.current = cleaners;
    };
    init();
  }, [router]);

  const handleBinUpsert = useCallback((payload: { eventType: string; new: SmartBin }) => {
    const newBin = payload.new as SmartBin;

    setBins(prev => {
      const idx = prev.findIndex(b => b.bin_id === newBin.bin_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newBin;
        return updated;
      }
      return [newBin, ...prev];
    });

    const isFull = newBin.status === "full" || newBin.status === "FULL";
    if (isFull && !alreadyFull.current.has(newBin.bin_id)) {
      alreadyFull.current.add(newBin.bin_id);
      showToast({
        title: "Bin Full!",
        message: `${newBin.name} (${newBin.bin_id}) is full — creating cleanup report`,
        type: "warning",
      });
      handleFullBin(newBin);
    }
    if (newBin.status !== "full") {
      alreadyFull.current.delete(newBin.bin_id);
    }
  }, []);

  const handleFullBin = useCallback(async (bin: SmartBin) => {
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = await supabase.auth.getUser();

    const { error: reportError } = await supabase.from("reports").insert({
      id: reportId,
      user_id: user.data.user?.id,
      image_url: "/placeholder-bin.svg",
      description: `Auto-generated: Smart bin ${bin.name} (${bin.bin_id}) is full at ${bin.latitude?.toFixed(4)},${bin.longitude?.toFixed(4)}`,
      latitude: bin.latitude || 0,
      longitude: bin.longitude || 0,
      waste_type: "mixed_waste",
      severity: "high",
      priority: "high",
      status: "pending",
      created_at: now,
      updated_at: now,
    });

    if (reportError) {
      showToast({ title: "Failed to create report", message: reportError.message, type: "error" });
      return;
    }

    const cleaners = cleanersRef.current;
    const nearestId = findNearestCleaner(bin.latitude || 0, bin.longitude || 0, cleaners);
    if (nearestId) {
      const { error: assignError } = await supabase.from("assignments").insert({
        report_id: reportId,
        cleaner_id: nearestId,
        status: "assigned",
        assigned_at: now,
        distance_km: 0,
      });
      if (assignError) {
        showToast({ title: "Failed to assign cleaner", message: assignError.message, type: "error" });
      } else {
        showToast({ title: "Cleaner Assigned", message: "Nearest cleaner notified", type: "success" });
      }
    } else {
      showToast({ title: "No Cleaners Available", message: "No active cleaners to assign", type: "info" });
    }
  }, []);

  useEffect(() => {
    const binsSub = supabase
      .channel("admin-bins-upsert")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "smart_bins" }, (payload) => {
        handleBinUpsert({ eventType: "INSERT", new: payload.new as SmartBin });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "smart_bins" }, (payload) => {
        handleBinUpsert({ eventType: "UPDATE", new: payload.new as SmartBin });
      })
      .subscribe();

    return () => { supabase.removeChannel(binsSub); };
  }, [handleBinUpsert]);

  const fullBins = bins.filter(b => b.status === "full" || b.status === "FULL" || b.status === "HIGH");
  const halfBins = bins.filter(b => b.status === "half_full" || b.status === "MEDIUM");
  const emptyBins = bins.filter(b => b.status === "empty" || b.status === "LOW");
  const liveBin = bins.find(b => b.bin_id === "BIN_001" && b.latitude != null && b.longitude != null);
  const mapCenter: [number, number] | undefined = liveBin ? [liveBin.latitude!, liveBin.longitude!] : undefined;

  return (
    <div className="min-h-screen transition-colors" style={{ background: "var(--background)" }}>
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Smart Bin Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {bins.length} bins monitored · live readings from ESP32
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 border-l-4 border-red-500" style={{ background: "var(--card-bg)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Full</p>
            <p className="text-3xl font-bold text-red-600">{fullBins.length}</p>
          </div>
          <div className="rounded-2xl p-6 border-l-4 border-yellow-500" style={{ background: "var(--card-bg)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Half Full</p>
            <p className="text-3xl font-bold text-yellow-600">{halfBins.length}</p>
          </div>
          <div className="rounded-2xl p-6 border-l-4 border-green-500" style={{ background: "var(--card-bg)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Empty</p>
            <p className="text-3xl font-bold text-green-600">{emptyBins.length}</p>
          </div>
        </div>

        <MapViewWrapper bins={bins} height="400px" liveBinId="BIN_001" center={mapCenter} zoom={16} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bins.length === 0 ? (
            <div className="col-span-full text-center py-20 rounded-2xl" style={{ background: "var(--card-bg)" }}>
              <div className="text-6xl mb-4">🗑️</div>
              <p className="text-xl font-medium" style={{ color: "var(--foreground)" }}>Waiting for IoT data...</p>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                Flash your ESP32 firmware and bins will appear here
              </p>
            </div>
          ) : bins.map((bin) => (
            <SmartBinCard key={bin.bin_id} bin={bin} hasData={bin.fill_level != null} />
          ))}
        </div>
      </main>
    </div>
  );
}
