import { apiGet } from "@/lib/api/client";
import type { MapLayerMetadata } from "@/types/groundwater";

export function getMapLayers(signal?: AbortSignal) {
  return apiGet<MapLayerMetadata[]>("/maps/layers", signal);
}
