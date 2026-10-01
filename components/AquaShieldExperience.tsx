"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Droplet, Info, ShieldCheck } from "lucide-react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { LocationSearch } from "@/components/location/LocationSearch";
import { MapView } from "@/components/map/MapView";
import { ExplainabilityPanel, LocationAnalysis, ProjectionPanel } from "@/components/prediction/ResearchPanels";
import { searchLocations } from "@/lib/api/locations";
import { ApiUnavailableError } from "@/lib/api/client";
import { getLocationPrediction, getPredictionExplanation } from "@/lib/api/predictions";
import { getMapLayers } from "@/lib/api/maps";
import { getProjection } from "@/lib/api/projections";
import type { AssistantAction } from "@/types/assistant";
import type { MapLayerId, MapLayerMetadata } from "@/types/groundwater";
import type { LocationPoint } from "@/types/location";
import type { LocationPrediction, PredictionExplanation } from "@/types/prediction";
import type { ClimateScenario, ProjectionPeriod, ProjectionResult } from "@/types/projection";

export default function AquaShieldExperience() {
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [layer, setLayer] = useState<MapLayerId>("groundwater-level");
  const [layers, setLayers] = useState<MapLayerMetadata[]>([]);
  const [period, setPeriod] = useState<ProjectionPeriod>("current");
  const [scenario, setScenario] = useState<ClimateScenario>("ssp245");
  const [predictionRequest, setPredictionRequest] = useState<{ key: string; value: LocationPrediction | null; error: string | null } | null>(null);
  const [projectionRequest, setProjectionRequest] = useState<{ key: string; value: ProjectionResult | null; error: string | null } | null>(null);
  const [explanation, setExplanation] = useState<PredictionExplanation | null>(null);
  const [explanationMessage, setExplanationMessage] = useState("Select a place and load its model explanation.");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const explanationController = useRef<AbortController | null>(null);

  const locationKey = location ? `${location.latitude}:${location.longitude}` : null;
  const activePredictionRequest = locationKey && predictionRequest?.key === locationKey ? predictionRequest : null;
  const prediction = activePredictionRequest?.value ?? null;
  const predictionError = activePredictionRequest?.error ?? "";
  const predictionLoading = Boolean(locationKey && !activePredictionRequest);
  const projectionKey = locationKey && period !== "current" ? `${locationKey}:${period}:${scenario}` : null;
  const activeProjectionRequest = projectionKey && projectionRequest?.key === projectionKey ? projectionRequest : null;
  const projection = activeProjectionRequest?.value ?? null;
  const projectionMessage = period === "current"
    ? "Current period selected. The location analysis card shows current data when available."
    : !location
      ? "Select a place to request a future projection."
      : !activeProjectionRequest
        ? "Loading projection…"
        : activeProjectionRequest.error ?? "";

  useEffect(() => {
    const controller = new AbortController();
    void getMapLayers(controller.signal).then(setLayers).catch(() => { if (!controller.signal.aborted) setLayers([]); });
    return () => controller.abort();
  }, []);

  const selectLocation = useCallback((selected: LocationPoint) => {
    explanationController.current?.abort();
    setExplanationLoading(false);
    setLocation(selected);
    setExplanation(null);
    setPeriod("current");
  }, []);

  const changeLayer = useCallback((selectedLayer: MapLayerId) => {
    setLayer(selectedLayer);
    const futurePeriod = selectedLayer.match(/^future-(2030|2050|2080)$/)?.[1] as Exclude<ProjectionPeriod, "current"> | undefined;
    if (futurePeriod) setPeriod(futurePeriod);
    else if (selectedLayer === "current-salinity") setPeriod("current");
  }, []);

  const changePeriod = useCallback((selectedPeriod: ProjectionPeriod) => {
    setPeriod(selectedPeriod);
    setLayer(selectedPeriod === "current" ? "current-salinity" : `future-${selectedPeriod}` as MapLayerId);
  }, []);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    void getLocationPrediction(location, controller.signal)
      .then((value) => setPredictionRequest({ key: `${location.latitude}:${location.longitude}`, value, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPredictionRequest({
          key: `${location.latitude}:${location.longitude}`,
          value: null,
          error: error instanceof ApiUnavailableError ? "Prediction API is not configured yet." : "No prediction is available for this location.",
        });
      })
      ;
    return () => controller.abort();
  }, [location]);

  useEffect(() => {
    if (!location || period === "current") return;
    const controller = new AbortController();
    void getProjection(location, period, scenario, controller.signal)
      .then((value) => setProjectionRequest({ key: `${location.latitude}:${location.longitude}:${period}:${scenario}`, value, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setProjectionRequest({
          key: `${location.latitude}:${location.longitude}:${period}:${scenario}`,
          value: null,
          error: error instanceof ApiUnavailableError ? "Projection API is not configured yet." : "No projection is available for this location and scenario.",
        });
      });
    return () => controller.abort();
  }, [location, period, scenario]);

  async function loadExplanation() {
    if (!location) { setExplanationMessage("Select a place first."); return; }
    explanationController.current?.abort();
    const controller = new AbortController();
    explanationController.current = controller;
    setExplanationLoading(true);
    setExplanation(null);
    setExplanationMessage("");
    try {
      const result = await getPredictionExplanation(location, controller.signal);
      setExplanation(result);
      if (!result.features.length) setExplanationMessage("No feature contributions were returned for this location.");
    }
    catch (error) {
      if (controller.signal.aborted) return;
      setExplanationMessage(error instanceof ApiUnavailableError ? "Explainability API is not configured yet." : "No model explanation is available for this location.");
    }
    finally { if (!controller.signal.aborted) setExplanationLoading(false); }
  }

  async function runAssistantAction(action: AssistantAction) {
    if (action.type === "select_layer" && ["groundwater-level", "salinity-risk", "current-salinity", "future-2030", "future-2050", "future-2080"].includes(action.value)) changeLayer(action.value as MapLayerId);
    if (action.type === "select_period" && ["current", "2030", "2050", "2080"].includes(action.value)) changePeriod(action.value as ProjectionPeriod);
    if (action.type === "locate") {
      try { const result = (await searchLocations(action.value))[0]; if (result) selectLocation(result); }
      catch { /* Keep the assistant response and current selection if geocoding is unavailable. */ }
    }
  }

  const projectedPrediction = projection?.prediction;
  const projectionSummary = projectedPrediction
    ? `Salinity ${projectedPrediction.salinityEcUsCm?.toLocaleString() ?? "not available"} µS/cm · Risk ${projectedPrediction.salinityRisk ?? "not available"}`
    : projectionMessage;
  const hasAvailableResearchLayer = layers.some((item) => item.available);

  return (
    <main className="aquashield-app">
      <header className="app-header">
        <a className="brand" href="#top" aria-label="AquaShield home"><span className="brand-mark"><Droplet size={21} fill="currentColor" /></span><span>AQUA<span className="brand-light">SHIELD</span></span></a>
        <div className="header-tagline">GROUNDWATER INTELLIGENCE · INDIA</div>
        <a className="method-link" href="#methodology">Methodology <ArrowUpRight size={15} /></a>
      </header>

      <section className="map-workspace-intro" id="top">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> MAP-FIRST RESEARCH EXPLORER</div><h1>Explore groundwater <span>across India.</span></h1><p>Find a place, inspect its location context, and explore validated groundwater outputs as they become available.</p></div>
        <div className="research-status-banner"><ShieldCheck size={17} /><span><strong>{hasAvailableResearchLayer ? "Research layer available" : "Research preview"}</strong> · {hasAvailableResearchLayer ? "Layer status and legend come from backend metadata." : "Groundwater layers and model outputs are not connected yet."}</span></div>
      </section>

      <div className="global-search"><LocationSearch onSelect={selectLocation} /></div>

      <div className="research-workspace">
        <MapView location={location} onSelectLocation={selectLocation} layer={layer} onLayerChange={changeLayer} layers={layers} period={period} scenario={scenario} />
        <div className="research-sidebar">
          <LocationAnalysis location={location} prediction={prediction} predictionError={predictionError} loading={predictionLoading} />
          <AssistantPanel location={location} layer={layer} period={period} scenario={scenario} onAction={runAssistantAction} />
          <ProjectionPanel current={prediction} projection={projection} period={period} onPeriodChange={changePeriod} scenario={scenario} onScenarioChange={setScenario} projectionMessage={projectionSummary} />
          <ExplainabilityPanel message={explanationMessage} onLoad={() => void loadExplanation()} features={explanation?.features ?? null} status={explanation?.status} loading={explanationLoading} />
        </div>
      </div>

      <section className="methodology-note" id="methodology"><Info size={16} /><div><strong>Interpret results with care.</strong><p>Every prediction should include its units, data year, applicability, and uncertainty definition. Feature contributions explain model associations; they do not prove causation.</p></div></section>
      <footer className="app-footer"><span>© AquaShield · Groundwater salinization mapping for India</span><span>Basemap © OpenStreetMap contributors · CARTO</span></footer>
    </main>
  );
}
