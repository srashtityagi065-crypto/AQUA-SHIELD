import type { PredictionUncertainty } from "./uncertainty";

export type GroundwaterSummary = {
  levelM?: number;
  salinityEcUsCm?: number;
  salinityProbability?: number;
  salinityRisk?: string;
  applicabilityScore?: number;
  uncertainty?: PredictionUncertainty;
  dataYear?: number;
  modelVersion?: string;
  status: "observed" | "model_output" | "demo";
};

export type MapLayerId = "groundwater-level" | "salinity-risk" | "current-salinity" | "future-2030" | "future-2050" | "future-2080";

export type MapLayerMetadata = {
  id: MapLayerId;
  label: string;
  available: boolean;
  tileUrl?: string;
  attribution?: string;
  legend?: Array<{ label: string; color: string; min?: number; max?: number }>;
  status: "observed" | "model_output" | "demo" | "unavailable";
  unit?: string;
};
