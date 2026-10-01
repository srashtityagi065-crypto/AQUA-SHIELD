import type { GeocodingResult, LocationPoint } from "@/types/location";

type NominatimResult = { place_id: number; display_name: string; lat: string; lon: string };

export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({ format: "jsonv2", limit: "5", countrycodes: "in", q: query });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Location search is temporarily unavailable.");
  const results = await response.json() as NominatimResult[];
  return results.map((result) => ({
    id: String(result.place_id),
    label: result.display_name,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    source: "search" as const,
  }));
}

export function mapPoint(latitude: number, longitude: number): LocationPoint {
  return { label: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`, latitude, longitude, source: "map" };
}
