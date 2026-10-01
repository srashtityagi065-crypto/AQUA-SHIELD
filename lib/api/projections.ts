import { apiGet } from "@/lib/api/client";
import type { LocationPoint } from "@/types/location";
import type { ClimateScenario, ProjectionPeriod, ProjectionResult } from "@/types/projection";

export function getProjection(location: LocationPoint, period: ProjectionPeriod, scenario: ClimateScenario, signal?: AbortSignal) {
  const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), period, scenario });
  return apiGet<ProjectionResult>(`/projections/location?${params}`, signal);
}
