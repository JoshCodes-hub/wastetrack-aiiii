import { useMemo } from "react";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Point {
  id: string;
  latitude: number;
  longitude: number;
}

export function useCleanerRouting<T extends Point>(
  points: T[],
  originLat: number,
  originLng: number
): T[] {
  return useMemo(() => {
    if (!points.length || !originLat || !originLng) return points;
    const remaining = [...points];
    const sorted: T[] = [];
    let curLat = originLat;
    let curLng = originLng;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversine(curLat, curLng, remaining[i].latitude, remaining[i].longitude);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const nearest = remaining.splice(nearestIdx, 1)[0];
      sorted.push(nearest);
      curLat = nearest.latitude;
      curLng = nearest.longitude;
    }

    return sorted;
  }, [points, originLat, originLng]);
}
