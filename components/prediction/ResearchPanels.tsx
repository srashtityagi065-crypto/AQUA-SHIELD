import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Info, MapPin } from "lucide-react";
import type { GroundwaterSummary } from "@/types/groundwater";
import type { LocationPoint } from "@/types/location";
import type { ClimateScenario, ProjectionPeriod, ProjectionResult } from "@/types/projection";

type Props = {
  location: LocationPoint | null;
  prediction: GroundwaterSummary | null;
  predictionError: string;
  loading: boolean;
  period: ProjectionPeriod;
  onPeriodChange: (period: ProjectionPeriod) => void;
  scenario: ClimateScenario;
  onScenarioChange: (scenario: ClimateScenario) => void;
  projectionMessage: string;
  projection: ProjectionResult | null;
};

const value = (input: number | undefined, suffix = "") => input === undefined ? "Not available" : `${input.toLocaleString()}${suffix}`;

export function LocationAnalysis({ location, prediction, predictionError, loading }: Pick<Props, "location" | "prediction" | "predictionError" | "loading">) {
  const uncertaintyValue = prediction?.uncertainty
    ? `${prediction.uncertainty.value.toLocaleString()} ${prediction.uncertainty.unit}${prediction.uncertainty.method ? ` · ${prediction.uncertainty.method}` : ""}`
    : "Not available";
  return (
    <section className="research-card analysis-card" aria-labelledby="analysis-title">
      <header className="research-card-heading"><span className="panel-icon"><MapPin size={17} /></span><div><h2 id="analysis-title">Location analysis</h2><p>{location ? "Selected point" : "Choose a place on the map"}</p></div></header>
      {location ? <>
        <div className="location-summary"><strong>{location.label}</strong><span>{location.latitude.toFixed(4)}° N · {location.longitude.toFixed(4)}° E</span><small>Selected by {location.source === "device" ? "device location" : location.source === "map" ? "map click" : "place search"}</small></div>
        <div className="prediction-status"><span className={`status-chip ${prediction?.status === "observed" ? "status-observed" : prediction?.status === "model_output" ? "status-model" : "status-pending"}`}>{prediction?.status === "observed" ? "OBSERVED DATA" : prediction?.status === "model_output" ? "MODEL OUTPUT" : prediction?.status === "demo" ? "DEMO / PREVIEW" : "DATA PENDING"}</span>{loading && <span className="subtle-loading">Loading…</span>}</div>
        {predictionError && <p className="inline-status"><AlertCircle size={14} />{predictionError}</p>}
        <div className="metric-list"><Metric label="Groundwater level" value={value(prediction?.levelM, " m")} /><Metric label="Salinity" value={value(prediction?.salinityEcUsCm, " µS/cm")} /><Metric label="Salinity risk" value={prediction?.salinityRisk ?? "Not available"} /><Metric label="Salinity probability" value={value(prediction?.salinityProbability, "%")} /></div>
        <div className="metric-list secondary-metrics"><Metric label="Uncertainty" value={uncertaintyValue} /><Metric label="Applicability" value={value(prediction?.applicabilityScore, "%")} /><Metric label="Data year" value={prediction?.dataYear?.toString() ?? "Not available"} /></div>
        {prediction?.modelVersion && <p className="model-version">Model {prediction.modelVersion}</p>}
      </> : <div className="empty-research-state"><MapPin size={22} /><p>Search for a place or click on the map to select a location.</p></div>}
      <p className="research-disclaimer"><Info size={13} />{prediction ? "Values and source status are supplied by the connected data service." : "No groundwater values are shown until an observed dataset or model output is connected."}</p>
    </section>
  );
}

export function ProjectionPanel({ current, period, onPeriodChange, scenario, onScenarioChange, projectionMessage, projection }: Pick<Props, "period" | "onPeriodChange" | "scenario" | "onScenarioChange" | "projectionMessage" | "projection"> & { current: GroundwaterSummary | null }) {
  return (
    <section className="research-card compact-research-card" aria-labelledby="projection-title">
      <header className="research-card-heading"><span className="panel-icon"><Activity size={17} /></span><div><h2 id="projection-title">Future projection</h2><p>Scenario and time controls</p></div></header>
      <label className="field-label" htmlFor="projection-period">Projection</label><select className="research-select" id="projection-period" value={period} onChange={(event) => onPeriodChange(event.target.value as ProjectionPeriod)}><option value="current">Current</option><option value="2030">2030</option><option value="2050">2050</option><option value="2080">2080</option></select>
      <label className="field-label" htmlFor="climate-scenario">Climate scenario</label><select className="research-select" id="climate-scenario" value={scenario} onChange={(event) => onScenarioChange(event.target.value as ClimateScenario)}><option value="ssp245">SSP2-4.5</option><option value="ssp585">SSP5-8.5</option></select>
      {period !== "current" && projection && <div className="comparison-scroll"><table className="comparison-table"><caption>Current compared with {period} · {scenario === "ssp245" ? "SSP2-4.5" : "SSP5-8.5"}</caption><thead><tr><th scope="col">Measure</th><th scope="col">Current</th><th scope="col">{period}</th></tr></thead><tbody><tr><th scope="row">Salinity</th><td>{value(current?.salinityEcUsCm, " µS/cm")}</td><td>{value(projection.prediction.salinityEcUsCm, " µS/cm")}</td></tr><tr><th scope="row">Risk</th><td>{current?.salinityRisk ?? "Not available"}</td><td>{projection.prediction.salinityRisk ?? "Not available"}</td></tr></tbody></table></div>}
      <p className="projection-empty"><Info size={14} />{projectionMessage}</p>
    </section>
  );
}

export function ExplainabilityPanel({ message, onLoad, features, status, loading }: { message: string; onLoad: () => void; features: Array<{ name: string; contribution: number; direction: string }> | null; status?: "observed" | "model_output" | "demo" | "unavailable"; loading: boolean }) {
  const max = features?.length ? Math.max(1, ...features.map((feature) => Math.abs(feature.contribution))) : 1;
  return (
    <section className="research-card compact-research-card" aria-labelledby="explain-title">
      <header className="research-card-heading"><span className="panel-icon"><Activity size={17} /></span><div><h2 id="explain-title">Why this location?</h2><p>Model explanation</p></div></header>
      {features?.length ? <><span className={`status-chip ${status === "observed" ? "status-observed" : status === "model_output" ? "status-model" : "status-pending"}`}>{status === "demo" ? "DEMO / PREVIEW" : status === "observed" ? "OBSERVED DATA" : status === "model_output" ? "MODEL OUTPUT" : "SOURCE UNAVAILABLE"}</span><div className="feature-list">{features.map((feature) => <div className="feature-row" key={feature.name}><div><span>{feature.name}</span><span className="feature-direction">{feature.direction === "increases" ? <><ArrowUpRight size={12} /><span className="visually-hidden">increases prediction</span></> : feature.direction === "decreases" ? <><ArrowDownRight size={12} /><span className="visually-hidden">decreases prediction</span></> : null}<span>{feature.contribution.toLocaleString()}</span></span></div><progress max={max} value={Math.abs(feature.contribution)} aria-label={`${feature.name} contribution`} /></div>)}</div></> : <><p className="projection-empty">{loading ? "Loading explanation…" : message}</p><button className="secondary-action" onClick={onLoad} disabled={loading}>{loading ? "Loading…" : "Load explanation"}</button></>}
      <p className="research-disclaimer"><Info size={13} />Feature contributions describe model associations, not proven causes.</p>
    </section>
  );
}

function Metric({ label, value: display }: { label: string; value: string }) {
  return <div className="metric-row"><span>{label}</span><strong>{display}</strong></div>;
}
