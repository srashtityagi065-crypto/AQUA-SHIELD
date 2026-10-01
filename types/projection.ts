import type { LocationPrediction } from "./prediction";

export type ProjectionPeriod = "current" | "2030" | "2050" | "2080";
export type ClimateScenario = "ssp245" | "ssp585";

export type ProjectionResult = {
  period: ProjectionPeriod;
  scenario: ClimateScenario;
  prediction: LocationPrediction;
};
