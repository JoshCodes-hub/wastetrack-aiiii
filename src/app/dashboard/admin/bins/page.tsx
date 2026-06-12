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

const LIVE_BIN_ID = "BIN_001";

function randomFill(): number {
  return Math.floor(Math.random() * 100);
}

function randomStatus(fill: number): string {
  if (fill > 80) return "full";
  if (fill > 30) return "half_full";
  return "empty";
}

function randomNearby(lat: number, spread = 0.002): number {
  return lat + (Math.random() - 0.5) * spread;
}

export default function AdminBinsPage() {
  const router = useRouter();
  const [bins, setBins] = useState<SmartBin[]>([]);
  const [userName, setUserName] = useState("");
  const [simulating, setSimulating] = useState(false);
  const binsRef = useRef(bins);
  binsRef.current = bins;

  const cleanersRef = useRef<{ id: string; latitude?: number; longitude?: number }[]>([]);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [router]);

  const handleBinUpsert = useCallback((payload: { eventType: string; new: SmartBin }) => {
    const newBin = payload.new as SmartBin;
    const binId = newBin.bin_id;

    setBins(prev => {
      const idx = prev.findIndex(b => b.bin_id === binId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newBin;
        return updated;
      }
      return [newBin, ...prev];
    });

    if (newBin.status === "full" && !alreadyFull.current.has(binId)) {
      alreadyFull.current.add(binId);
      showToast({
        title: "Bin Full!",
        message: `${newBin.name} (${binId}) is full — creating cleanup report`,
        type: "warning",
      });
      handleFullBin(newBin);
    }
    if (newBin.status !== "full") {
      alreadyFull.current.delete(binId);
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

  const toggleSimulation = async () => {
    if (simulating) {
      if (simRef.current) clearInterval(simRef.current);
      simRef.current = null;
      setSimulating(false);
      showToast({ title: "Demo Stopped", message: "Live simulation turned off", type: "info" });
      return;
    }

    setSimulating(true);
    showToast({ title: "Demo Mode", message: "Simulating ESP32 data every 15s", type: "info" });

    const tick = async () => {
      const now = new Date().toISOString();
      const fill = randomFill();
      const status = randomStatus(fill);

      const { error } = await supabase.from("smart_bins").upsert({
        bin_id: LIVE_BIN_ID,
        name: "Live Demo Bin",
        latitude: randomNearby(6.5244),
        longitude: randomNearby(3.3792),
        fill_level: fill,
        status,
        last_updated: now,
      }, { onConflict: "bin_id" });

      if (error) {
        showToast({ title: "Demo Error", message: error.message, type: "error" });
        if (simRef.current) clearInterval(simRef.current);
        simRef.current = null;
        setSimulating(false);
      }
    };

    await tick();
    simRef.current = setInterval(tick, 15000);
  };

  const fullBins = bins.filter(b => b.status === "full");
  const halfBins = bins.filter(b => b.status === "half_full");
  const emptyBins = bins.filter(b => b.status === "empty");
  const liveBin = bins.find(b => b.bin_id === LIVE_BIN_ID);
  const anyGps = bins.some(b => b.latitude != null && b.longitude != null);

  return (
    <div className="min-h-screen transition-colors" style={{ background: "var(--background)" }}>
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Smart Bin Management</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {bins.length} bins monitored · {simulating ? "Demo mode — live data every 15s" : "Waiting for IoT data"}
            </p>
          </div>
          <button
            onClick={toggleSimulation}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              simulating
                ? "bg-red-500 text-white shadow-md hover:bg-red-600"
                : "bg-green-500 text-white shadow-md hover:bg-green-600"
            }`}
          >
            {simulating ? "⏹ Stop Demo" : "▶ Simulate Live Data"}
          </button>
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

        {simulating && liveBin && (
          <div className="rounded-2xl p-4 border border-green-500/30 flex items-center gap-3" style={{ background: "rgba(22,163,74,0.1)" }}>
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Live Bin updating — fill: {liveBin.fill_level}% · location: {liveBin.latitude?.toFixed(4)}, {liveBin.longitude?.toFixed(4)}
            </span>
          </div>
        )}

        {!anyGps && bins.length > 0 && (
          <div className="rounded-2xl p-4 border border-yellow-500/30 flex items-center gap-3" style={{ background: "rgba(234,179,8,0.1)" }}>
            <span className="text-yellow-600 dark:text-yellow-400 text-lg">🛰️</span>
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400 animate-pulse">
              Acquiring GPS from bins...
            </span>
          </div>
        )}

        <MapViewWrapper bins={bins} height="400px" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bins.length === 0 ? (
            <div className="col-span-full text-center py-20 rounded-2xl" style={{ background: "var(--card-bg)" }}>
              <div className="text-6xl mb-4">🗑️</div>
              <p className="text-xl font-medium" style={{ color: "var(--foreground)" }}>Waiting for IoT data...</p>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                Click "Simulate Live Data" or connect your ESP32
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
