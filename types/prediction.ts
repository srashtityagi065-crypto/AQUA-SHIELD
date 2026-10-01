import type { GroundwaterSummary } from "./groundwater";

export type LocationPrediction = GroundwaterSummary & {
  latitude: number;
  longitude: number;
  locationId?: string;
};

export type ExplanationFeature = {
  name: string;
  contribution: number;
  direction: "increases" | "decreases" | "unknown";
};

export type PredictionExplanation = {
  features: ExplanationFeature[];
  modelVersion?: string;
  status: "observed" | "model_output" | "demo" | "unavailable";
};
