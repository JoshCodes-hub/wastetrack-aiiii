"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const MIN_DISTANCE_METERS = 50;
const THROTTLE_MS = 10000;

interface UseCleanerLocationOptions {
  cleanerId: string;
  enabled?: boolean;
}

interface CleanerPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useCleanerLocation({ cleanerId, enabled = true }: UseCleanerLocationOptions) {
  const [position, setPosition] = useState<CleanerPosition | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const mounted = useRef(true);

  const sendPosition = useCallback(async (lat: number, lng: number) => {
    try {
      await supabase
        .from("cleaners")
        .update({
          latitude: lat,
          longitude: lng,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cleanerId);
    } catch {
      // silent fail — location will retry on next tick
    }
  }, [cleanerId]);

  useEffect(() => {
    if (!enabled || !cleanerId) return;
    mounted.current = true;

    if (!navigator.geolocation) {
      setError("GPS not available");
      return;
    }

    setTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mounted.current) return;
        const { latitude, longitude, accuracy } = pos.coords;
        const now = Date.now();

        setPosition({ latitude, longitude, accuracy, timestamp: now });

        const shouldSend =
          !lastSent.current ||
          now - lastSent.current.time >= THROTTLE_MS ||
          haversineMeters(lastSent.current.lat, lastSent.current.lng, latitude, longitude) >= MIN_DISTANCE_METERS;

        if (shouldSend) {
          lastSent.current = { lat: latitude, lng: longitude, time: now };
          sendPosition(latitude, longitude);
        }
      },
      (err) => {
        if (!mounted.current) return;
        setError(`GPS error: ${err.message}`);
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      mounted.current = false;
      setTracking(false);
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      supabase
        .from("cleaners")
        .update({ is_active: false })
        .eq("id", cleanerId)
        .then(() => {});
    };
  }, [cleanerId, enabled, sendPosition]);

  return { position, tracking, error };
}
