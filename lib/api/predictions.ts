import { apiGet } from "@/lib/api/client";
import type { LocationPoint } from "@/types/location";
import type { LocationPrediction, PredictionExplanation } from "@/types/prediction";

function coordinates(location: LocationPoint) {
  const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude) });
  return params.toString();
}

export function getLocationPrediction(location: LocationPoint, signal?: AbortSignal) {
  return apiGet<LocationPrediction>(`/predictions/location?${coordinates(location)}`, signal);
}

export function getPredictionExplanation(location: LocationPoint, signal?: AbortSignal) {
  return apiGet<PredictionExplanation>(`/predictions/explanation?${coordinates(location)}`, signal);
}
