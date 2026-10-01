export type LocationPoint = {
  label: string;
  latitude: number;
  longitude: number;
  source: "search" | "map" | "device";
};

export type GeocodingResult = LocationPoint & { id: string };
