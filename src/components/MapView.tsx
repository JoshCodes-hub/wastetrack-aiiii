"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { Report, Cleaner, SmartBin, Assignment } from "@/types";
import { getStatusLabel, formatDate, calculateDistance } from "@/lib/utils";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";

function BinPopupContent({ bin, liveBinId }: { bin: SmartBin; liveBinId?: string }) {
  const locationName = useReverseGeocode(bin.latitude, bin.longitude);
  return (
    <div className="text-sm space-y-1 min-w-[140px]">
      <p className="font-bold" style={{ color: "var(--foreground)" }}>{liveBinId && bin.bin_id === liveBinId ? "📡 " : "🗑️ "}{bin.name}</p>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>ID: {bin.bin_id}</p>
      {locationName && <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>📍 {locationName}</p>}
      <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{bin.latitude?.toFixed(4)}, {bin.longitude?.toFixed(4)}</p>
      <div className="flex items-center gap-2">
        <div className="w-full rounded-full h-2" style={{ background: "var(--card-border)" }}>
          <div className={`h-2 rounded-full ${
            bin.fill_level > 80 || bin.status === "FULL" || bin.status === "full" || bin.status === "HIGH" ? 'bg-red-500' :
            bin.fill_level > 40 ? 'bg-yellow-500' : 'bg-green-500'
          }`} style={{ width: `${Math.max(bin.fill_level, 3)}%` }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{bin.fill_level}%</span>
      </div>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Status: {getStatusLabel(bin.status)}</p>
    </div>
  );
}

const reportIcon = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 8px rgba(239,68,68,0.5);border:2px solid white;">🗑️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const cleanerIcon = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 8px rgba(59,130,246,0.5);border:2px solid white;">🧹</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const binIcon = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 8px rgba(34,197,94,0.5);border:2px solid white;">🗑️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const liveBinIcon = L.divIcon({
  className: "",
  html: `<div style="width:40px;height:40px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;box-shadow:0 0 20px rgba(245,158,11,0.8),0 0 40px rgba(245,158,11,0.4);border:3px solid white;animation:pulse 2s infinite;">📡</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const routeColor = "#3b82f6";

interface MapViewProps {
  reports?: Report[];
  cleaners?: Cleaner[];
  bins?: SmartBin[];
  assignments?: Assignment[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  liveBinId?: string;
}

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1 });
  }, [center, map]);
  return null;
}

export default function MapView({
  reports = [],
  cleaners = [],
  bins = [],
  assignments = [],
  center,
  zoom = 15,
  height = "500px",
  liveBinId,
}: MapViewProps) {
  const reportMap = new Map(reports.map(r => [r.id, r]));
  const cleanerMap = new Map(cleaners.map(c => [c.id, c]));

  const binsWithGps = bins.filter(b => b.latitude != null && b.longitude != null);
  const anyGps = binsWithGps.length > 0;
  const dynamicCenter = center || (anyGps ? [binsWithGps[0].latitude!, binsWithGps[0].longitude!] : [6.5244, 3.3792]);

  const routes: { from: [number, number]; to: [number, number]; label: string }[] = [];

  for (const a of assignments) {
    const cleaner = cleanerMap.get(a.cleaner_id);
    const report = reportMap.get(a.report_id);
    if (cleaner?.latitude && cleaner?.longitude && report) {
      const dist = a.distance_km ?? Math.round(
        calculateDistance(cleaner.latitude, cleaner.longitude, report.latitude, report.longitude) * 100
      ) / 100;
      routes.push({
        from: [cleaner.latitude, cleaner.longitude],
        to: [report.latitude, report.longitude],
        label: `${dist} km`,
      });
    }
  }

  return (
    <div style={{ height, width: "100%", border: "1px solid var(--card-border)" }} className="rounded-2xl overflow-hidden shadow-lg">
      {!anyGps && bins.length > 0 ? (
        <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ background: "var(--card-bg)" }}>
          <div className="text-center">
            <div className="text-5xl mb-4">🛰️</div>
            <p className="text-lg font-medium animate-pulse" style={{ color: "var(--text-secondary)" }}>Acquiring GPS...</p>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>Waiting for first sensor data from bins</p>
          </div>
        </div>
      ) : (
      <MapContainer center={dynamicCenter} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater center={dynamicCenter} />

        {routes.map((r, i) => (
          <Polyline
            key={`route-${i}`}
            positions={[r.from, r.to]}
            pathOptions={{ color: routeColor, weight: 2, dashArray: "8 6", opacity: 0.7 }}
          >
            <Popup>
              <div className="text-sm font-medium text-blue-700">
                📏 {r.label}
              </div>
            </Popup>
          </Polyline>
        ))}

        {reports.map((report) => (
          <Marker
            key={`report-${report.id}`}
            position={[report.latitude, report.longitude]}
            icon={reportIcon}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-[160px]">
                <p className="font-bold" style={{ color: "var(--foreground)" }}>{getStatusLabel(report.waste_type)}</p>
                <p style={{ color: "var(--text-secondary)" }} className="text-xs">{report.description?.slice(0, 120)}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                    report.status === "completed" ? "bg-green-500" :
                    report.status === "in_progress" ? "bg-blue-500" : "bg-yellow-500"
                  }`}>{getStatusLabel(report.status)}</span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatDate(report.created_at)}</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {cleaners.filter(c => c.latitude && c.longitude).map((cleaner) => (
          <Marker
            key={`cleaner-${cleaner.id}`}
            position={[cleaner.latitude!, cleaner.longitude!]}
            icon={cleanerIcon}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-bold" style={{ color: "var(--foreground)" }}>{cleaner.name}</p>
                <p className={cleaner.is_active ? "text-green-600 text-xs" : "text-gray-400 text-xs"}>
                  {cleaner.is_active ? "🟢 Active" : "🔴 Offline"}
                </p>
                {cleaner.latitude && cleaner.longitude && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    📍 {cleaner.latitude.toFixed(4)}, {cleaner.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {bins.filter(b => b.latitude != null && b.longitude != null).map((bin) => (
          <Marker
            key={`bin-${bin.id}`}
            position={[bin.latitude!, bin.longitude!]}
            icon={liveBinId && bin.bin_id === liveBinId ? liveBinIcon : binIcon}
          >
            <Popup>
              <BinPopupContent bin={bin} liveBinId={liveBinId} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      )}
    </div>
  );
}
