"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Layers3, LocateFixed, Map as MapIcon, Minimize, RotateCcw } from "lucide-react";
import type { LocationPoint } from "@/types/location";
import type { MapLayerId, MapLayerMetadata } from "@/types/groundwater";
import type { ClimateScenario, ProjectionPeriod } from "@/types/projection";
import { mapPoint } from "@/lib/api/locations";

const INDIA_CENTER: [number, number] = [22.8, 79.2];
const LAYER_CHOICES: Array<{ id: MapLayerId; label: string }> = [
  { id: "groundwater-level", label: "Groundwater level" },
  { id: "salinity-risk", label: "Salinity risk" },
  { id: "current-salinity", label: "Current salinity" },
  { id: "future-2030", label: "Future · 2030" },
  { id: "future-2050", label: "Future · 2050" },
  { id: "future-2080", label: "Future · 2080" },
];

type Props = {
  location: LocationPoint | null;
  onSelectLocation: (location: LocationPoint) => void;
  layer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
  layers: MapLayerMetadata[];
  period: ProjectionPeriod;
  scenario: ClimateScenario;
};

type LeafletMapEvent = { latlng: { lat: number; lng: number } };
type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  remove(): void;
  on(eventName: "click", callback: (event: LeafletMapEvent) => void): LeafletMap;
  flyTo(center: [number, number], zoom: number, options?: { duration: number }): LeafletMap;
  getZoom(): number;
  invalidateSize(options?: { pan?: boolean }): LeafletMap;
};
type LeafletLayer = {
  remove(): LeafletLayer;
  addTo(map: LeafletMap): LeafletLayer;
};
type LeafletModule = {
  map(container: HTMLElement, options: { zoomControl: boolean; scrollWheelZoom: boolean; minZoom: number; maxZoom: number }): LeafletMap;
  control: { zoom(options: { position: "bottomright" }): { addTo(map: LeafletMap): unknown } };
  tileLayer(url: string, options: { attribution: string; subdomains?: string; maxZoom: number; opacity?: number }): LeafletLayer;
  circleMarker(center: [number, number], options: { radius: number; color: string; weight: number; fillColor: string; fillOpacity: number }): LeafletLayer;
};

export function MapView({ location, onSelectLocation, layer, onLayerChange, layers, period, scenario }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletLayer | null>(null);
  const baseLayerRef = useRef<LeafletLayer | null>(null);
  const researchLayerRef = useRef<LeafletLayer | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [baseStyle, setBaseStyle] = useState("Light");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let alive = true;
    let map: LeafletMap | null = null;
    void import("leaflet").then((leafletModule) => {
      if (!alive || !hostRef.current) return;
      const L = leafletModule as unknown as LeafletModule;
      map = L.map(hostRef.current, { zoomControl: false, scrollWheelZoom: true, minZoom: 3, maxZoom: 18 }).setView(INDIA_CENTER, 4.7);
      mapRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (event) => onSelectLocation(mapPoint(event.latlng.lat, event.latlng.lng)));
      setReady(true);
    }).catch(() => { if (alive) setMapError("The map could not load. Check your connection and refresh the page."); });
    return () => { alive = false; if (map) map.remove(); mapRef.current = null; baseLayerRef.current = null; researchLayerRef.current = null; };
  }, [onSelectLocation]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const tileUrl = baseStyle === "Streets"
      ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      : baseStyle === "Dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    let alive = true;
    void import("leaflet").then((leafletModule) => {
      if (!alive || !mapRef.current) return;
      const L = leafletModule as unknown as LeafletModule;
      baseLayerRef.current?.remove();
      baseLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: baseStyle === "Streets" ? undefined : "abcd", maxZoom: 19,
      }).addTo(mapRef.current);
    });
    return () => { alive = false; };
  }, [baseStyle, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let alive = true;
    void import("leaflet").then((leafletModule) => {
      if (!alive || !mapRef.current) return;
      const L = leafletModule as unknown as LeafletModule;
      researchLayerRef.current?.remove();
      const metadata = layers.find((item) => item.id === layer && item.available && item.tileUrl);
      if (metadata?.tileUrl) {
        const tileUrl = metadata.tileUrl.replace(/\{period\}/g, period).replace(/\{scenario\}/g, scenario);
        researchLayerRef.current = L.tileLayer(tileUrl, { attribution: metadata.attribution ?? "", opacity: 0.82, maxZoom: 19 }).addTo(mapRef.current);
      }
    });
    return () => { alive = false; };
  }, [layer, layers, period, ready, scenario]);

  useEffect(() => {
    if (!ready || !mapRef.current || !location) return;
    let alive = true;
    void import("leaflet").then((leafletModule) => {
      if (!alive || !mapRef.current) return;
      const L = leafletModule as unknown as LeafletModule;
      markerRef.current?.remove();
      markerRef.current = L.circleMarker([location.latitude, location.longitude], {
        radius: 8, color: "#023859", weight: 3, fillColor: "#54ACBF", fillOpacity: 1,
      }).addTo(mapRef.current);
      mapRef.current.flyTo([location.latitude, location.longitude], Math.max(10, mapRef.current.getZoom()), { duration: 0.75 });
    });
    return () => { alive = false; };
  }, [location, ready]);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === hostRef.current?.parentElement);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    if (!ready || !hostRef.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mapRef.current?.invalidateSize({ pan: false }));
    });
    observer.observe(hostRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [ready]);

  function requestCurrentLocation() {
    if (!navigator.geolocation) { setMapError("This browser does not support device location."); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onSelectLocation({ ...mapPoint(coords.latitude, coords.longitude), source: "device" }),
      () => setMapError("Location permission was unavailable. Search for a place or choose one on the map."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  async function toggleFullscreen() {
    const target = hostRef.current?.parentElement;
    if (!target) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch { setMapError("Fullscreen is unavailable in this browser."); }
  }

  const activeResearchLayer = layers.find((item) => item.id === layer && item.available && item.status !== "unavailable");
  const layerStatusClass = activeResearchLayer?.status === "observed" ? "status-observed" : activeResearchLayer?.status === "model_output" ? "status-model" : activeResearchLayer?.status === "demo" ? "status-demo" : "status-pending";
  const layerStatusLabel = activeResearchLayer?.status === "observed" ? "OBSERVED DATA" : activeResearchLayer?.status === "model_output" ? "MODEL OUTPUT" : activeResearchLayer?.status === "demo" ? "DEMO / PREVIEW" : "LAYER DATA PENDING";

  return (
    <section className="map-card" aria-labelledby="map-heading">
      <div className="map-card-toolbar">
        <div className="map-card-heading"><span className="map-live-dot" /><div><h2 id="map-heading">Explore India</h2><p>Pan, zoom, or select a point on the map</p></div></div>
        <label className="map-style-select"><MapIcon size={15} /><span className="visually-hidden">Map style</span><select value={baseStyle} onChange={(event) => setBaseStyle(event.target.value)}><option>Light</option><option>Streets</option><option>Dark</option></select></label>
      </div>
      <div className="map-viewport">
        <div className="leaflet-map" ref={hostRef} role="application" aria-label="Interactive map of India. Use arrow keys to move the map, plus and minus to zoom, or click a point to select it." />
        {!ready && !mapError && <div className="map-loading" role="status"><span className="spinner" /> Loading map…</div>}
        {mapError && <div className="map-error" role="alert">{mapError}<button onClick={() => setMapError("")}>Dismiss</button></div>}
        <div className="map-actions" aria-label="Map actions">
          <button onClick={() => mapRef.current?.flyTo(INDIA_CENTER, 4.7, { duration: 0.7 })} title="Reset map to India" aria-label="Reset map to India"><RotateCcw size={16} /></button>
          <button onClick={requestCurrentLocation} title="Use my current location" aria-label="Use my current location"><LocateFixed size={16} /></button>
          <button onClick={() => void toggleFullscreen()} title={fullscreen ? "Exit full screen" : "View full screen"} aria-label={fullscreen ? "Exit map full screen" : "View map full screen"}>{fullscreen ? <Minimize size={16} /> : <Expand size={16} />}</button>
        </div>
        <div className="map-layer-picker"><Layers3 size={15} /><label htmlFor="research-layer">Research layer</label><select id="research-layer" value={layer} onChange={(event) => onLayerChange(event.target.value as MapLayerId)}>{LAYER_CHOICES.map((choice) => { const available = layers.some((item) => item.id === choice.id && item.available); return <option key={choice.id} value={choice.id}>{choice.label}{available ? "" : " · no data"}</option>; })}</select><span className="layer-pending">{layers.some((item) => item.id === layer && item.available) ? "LIVE DATA" : "DATA PENDING"}</span></div>
        <div className="map-legend" aria-live="polite"><strong>{activeResearchLayer?.label.toUpperCase() ?? LAYER_CHOICES.find((choice) => choice.id === layer)?.label.toUpperCase()}</strong>{activeResearchLayer?.legend?.length ? <ul>{activeResearchLayer.legend.map((item) => <li key={item.label}><span style={{ backgroundColor: item.color }} />{item.label}{item.min !== undefined || item.max !== undefined ? ` · ${item.min ?? ""}–${item.max ?? ""} ${activeResearchLayer.unit ?? ""}` : ""}</li>)}</ul> : <p>Legend will appear with validated layer metadata.</p>}</div>
      </div>
      <div className="map-data-note"><span className={`status-chip ${layerStatusClass}`}>{layerStatusLabel}</span><span>Map base tiles: OpenStreetMap / CARTO</span></div>
    </section>
  );
}
