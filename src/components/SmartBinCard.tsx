"use client";

import { SmartBin } from "@/types";
import { getStatusLabel } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SmartBinCardProps {
  bin: SmartBin;
  hasData: boolean;
  onClick?: () => void;
}

function getSecondsAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
}

export default function SmartBinCard({ bin, hasData, onClick }: SmartBinCardProps) {
  const [secondsAgo, setSecondsAgo] = useState(() => getSecondsAgo(bin.last_updated));
  const hasGps = bin.latitude != null && bin.longitude != null;
  const isOnline = secondsAgo <= 120;

  useEffect(() => {
    setSecondsAgo(getSecondsAgo(bin.last_updated));
    const interval = setInterval(() => {
      setSecondsAgo(getSecondsAgo(bin.last_updated));
    }, 1000);
    return () => clearInterval(interval);
  }, [bin.last_updated]);

  const barColor = bin.fill_level > 80 ? "bg-red-500" : bin.fill_level > 40 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>{bin.name}</h3>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>ID: {bin.bin_id}</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline && <span className="w-2 h-2 rounded-full bg-green-500" title="Online" />}
          <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
            bin.status === "full" ? "bg-red-500" : bin.status === "half_full" ? "bg-yellow-500" : "bg-green-500"
          }`}>
            {getStatusLabel(bin.status)}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>📍 GPS:</span>
          {hasGps ? (
            <span className="font-mono">{bin.latitude!.toFixed(4)}, {bin.longitude!.toFixed(4)}</span>
          ) : (
            <span className="italic text-yellow-600 dark:text-yellow-400 animate-pulse">Acquiring GPS...</span>
          )}
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span style={{ color: "var(--text-secondary)" }}>Fill Level</span>
            {hasData ? (
              <span className="font-medium" style={{ color: "var(--foreground)" }}>{bin.fill_level}%</span>
            ) : (
              <span className="italic text-yellow-600 dark:text-yellow-400 animate-pulse">Reading...</span>
            )}
          </div>
          <div className="w-full h-3 rounded-full" style={{ background: "var(--card-border)" }}>
            {hasData ? (
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                style={{ width: `${bin.fill_level}%` }}
              />
            ) : (
              <div className="h-full rounded-full bg-gray-300 dark:bg-gray-600" style={{ width: "3%" }} />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
          <span>
            {secondsAgo < 60
              ? `${secondsAgo}s ago`
              : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`}
          </span>
          {!isOnline && <span className="text-red-500 font-medium">Offline</span>}
        </div>
      </div>
    </div>
  );
}
