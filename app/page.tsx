"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Activity, ArrowDown, ArrowUpRight, Compass, Droplet, Layers2, MapPin, Menu, Mic, Search, Send, ShieldCheck, Sparkles, Waves, X } from "lucide-react";

type Place = { name: string; lat: number; lon: number };

export default function Home() {
  const mapHost = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const searchController = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [message, setMessage] = useState("Ask about a location or select a place on the map.");
  const [busy, setBusy] = useState(false);
  const [basemap, setBasemap] = useState("Light");
  const [listening, setListening] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Leaflet is loaded only in the browser so the map never runs during SSR.
  useEffect(() => {
    let map: any;
    let alive = true;
    void import("leaflet").then((L) => {
      if (!alive || !mapHost.current) return;
      map = L.map(mapHost.current, { scrollWheelZoom: true, zoomControl: false }).setView([22.8, 79.2], 4.7);
      mapRef.current = map;
      setMapReady(true);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (event: any) => {
        const place = { name: `${event.latlng.lat.toFixed(3)}° N, ${event.latlng.lng.toFixed(3)}° E`, lat: event.latlng.lat, lon: event.latlng.lng };
        setSelected(place);
        setMessage("Location selected. Connect the prediction API to load its groundwater analysis.");
      });
    });
    return () => {
      alive = false;
      searchController.current?.abort();
      if (map) map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
    };
  }, []);

  // Change the actual background tiles; salinity overlays can be added with team data.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    let active = true;
    const tileUrl = basemap === "Streets"
      ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      : basemap === "Dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    void import("leaflet").then((L) => {
      if (!active || !mapRef.current) return;
      baseLayerRef.current?.remove();
      baseLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: basemap === "Streets" ? undefined : "abcd", maxZoom: 19,
      }).addTo(mapRef.current);
    });
    return () => { active = false; };
  }, [basemap, mapReady]);

  // Keep the marker in sync whether a place came from search or a map click.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selected) return;
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !mapRef.current) return;
      markerRef.current?.remove();
      markerRef.current = L.circleMarker([selected.lat, selected.lon], {
        radius: 8, color: "#023859", weight: 3, fillColor: "#54ACBF", fillOpacity: 1,
      }).addTo(mapRef.current);
    });
    return () => { active = false; };
  }, [mapReady, selected]);

  async function locate(placeName: string) {
    if (!placeName.trim()) return;
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setBusy(true);
    try {
      // OpenStreetMap Nominatim provides a basic place search; use a backend proxy in production.
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(placeName)}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Search service unavailable");
      const results = await response.json();
      if (!results.length) { setMessage("No matching place found. Try a city, district, or state in India."); return; }
      const place = { name: results[0].display_name.split(",").slice(0, 3).join(","), lat: Number(results[0].lat), lon: Number(results[0].lon) };
      setSelected(place);
      setMessage("Place found. Connect the prediction API to show its groundwater analysis.");
      mapRef.current?.flyTo([place.lat, place.lon], 11, { duration: 0.8 });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Location search could not connect. Check your internet connection and try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function submitSearch(event: FormEvent) { event.preventDefault(); void locate(query); }
  function ask(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    setMessage(`“${chatInput.trim()}” — connect your team’s AI endpoint to answer questions and control map layers.`);
    const locationMatch = chatInput.match(/(?:in|near|at|show)\s+(.+)/i);
    if (locationMatch?.[1]) { setQuery(locationMatch[1].replace(/[?.!]+$/, "")); void locate(locationMatch[1].replace(/[?.!]+$/, "")); }
    setChatInput("");
  }
  function speak() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setMessage("Voice input is not supported in this browser. You can type your question instead."); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "en-IN"; recognition.interimResults = false;
    recognition.onstart = () => setListening(true); recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setMessage("Could not hear that. Please try again or type your question."); };
    recognition.onresult = (event: any) => { const text = event.results[0][0].transcript; setChatInput(text); };
    recognition.start();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="AquaShield home"><span className="brand-mark"><Droplet size={21} fill="currentColor" /></span><span>AQUA<span className="brand-light">SHIELD</span></span></a>
        <nav className={mobileMenu ? "nav-links nav-open" : "nav-links"} aria-label="Main navigation"><a href="#explore" onClick={() => setMobileMenu(false)}>Explore</a><a href="#about" onClick={() => setMobileMenu(false)}>About the project</a><a href="#method" onClick={() => setMobileMenu(false)}>Methodology</a></nav>
        <a className="top-cta" href="#explore">Open explorer <ArrowUpRight size={16} /></a>
        <button className="menu-button" aria-label="Toggle navigation" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> GROUNDWATER INTELLIGENCE FOR INDIA</div>
          <h1>See beneath<br />the <span>surface.</span></h1>
          <p className="hero-lede">Understand where groundwater salinity is emerging — and what it could mean for communities across India.</p>
          <form className="search-box" onSubmit={submitSearch}><Search size={20} /><input aria-label="Search a place in India" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a city, district or region…" /><button type="submit" disabled={busy} aria-label="Search">{busy ? <span className="spinner" /> : <ArrowUpRight size={19} />}</button></form>
          <p className="search-hint">Try <button onClick={() => { setQuery("Lucknow"); void locate("Lucknow"); }}>Lucknow</button>, <button onClick={() => { setQuery("Kutch"); void locate("Kutch"); }}>Kutch</button>, or <button onClick={() => { setQuery("Chennai"); void locate("Chennai"); }}>Chennai</button></p>
          <div className="hero-actions"><a className="primary-button" href="#explore"><Compass size={17} /> Explore the map <ArrowDown size={15} /></a><span className="action-divider" /><span className="voice-prompt">Or ask AquaShield <Sparkles size={15} /></span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-glow" /><div className="art-contour contour-one" /><div className="art-contour contour-two" /><div className="art-contour contour-three" /><div className="art-pin"><Droplet size={28} fill="currentColor" /></div><div className="art-label label-top"><span className="label-pulse" /> LIVE MAP EXPLORATION</div><div className="art-label label-bottom"><span>INDIA</span><span>20.5937° N&nbsp; 78.9629° E</span></div><div className="art-spark spark-a" /><div className="art-spark spark-b" /></div>
      </section>

      <section className="explorer-section" id="explore"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR GROUNDWATER EXPLORER</div><h2>Start with a place.<br /><span>Discover the picture.</span></h2></div><p>Search for a location or click anywhere on the map. Your team’s prediction data can plug into this view as it becomes available.</p></div>
        <div className="workspace"><div className="map-panel"><div className="map-toolbar"><div className="map-title"><span className="map-live-dot" /><div><strong>India</strong><small>Interactive groundwater map</small></div></div><div className="map-tools"><label className="layer-select"><Layers2 size={16} /><select value={basemap} onChange={(e) => setBasemap(e.target.value)} aria-label="Basemap style"><option>Light</option><option>Streets</option><option>Dark</option></select></label><button className="icon-button" title="Center on India" onClick={() => mapRef.current?.flyTo([22.8,79.2],4.7)}><Compass size={17} /></button></div></div>
          <div className="map-wrap"><div className="leaflet-map" ref={mapHost} />{!mapReady && <div className="map-loading" role="status"><span className="spinner" /> Loading interactive map…</div>}<div className="map-caption"><span><span className="legend-dot" /> Basemap · {basemap}</span><span>Click map to select a location</span></div></div>
          <div className="map-footer"><span><ShieldCheck size={15} /> Research preview</span><span>Map tiles © OpenStreetMap contributors</span></div>
        </div>
        <aside className="assistant-panel"><div className="assistant-head"><div className="assistant-avatar"><Sparkles size={18} /></div><div><strong>AquaShield AI</strong><small><span className="online-dot" /> Ready to explore</small></div><button className="more-button" aria-label="Assistant information">···</button></div>
          <div className="chat-content"><div className="date-divider"><span /> YOUR MAP COPILOT <span /></div><div className="assistant-message"><div className="assistant-mini"><Sparkles size={13} /></div><p>Ask a question about groundwater salinity, or search a place to get started.</p></div>{selected && <div className="selected-place"><MapPin size={15} /><span>{selected.name}</span><small>Selected</small></div>}<div className="assistant-message response"><div className="assistant-mini"><Waves size={13} /></div><p>{message}</p></div><div className="suggestions"><span>TRY ASKING</span><button onClick={() => setChatInput("What is the salinity here?")}>What is the salinity here?</button><button onClick={() => setChatInput("Show groundwater salinity in Lucknow")}>Show salinity in Lucknow</button></div></div>
          <form className="chat-compose" onSubmit={ask}><button type="button" className={listening ? "mic-button listening" : "mic-button"} onClick={speak} aria-label="Use voice input"><Mic size={17} /></button><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about a location…" aria-label="Ask AquaShield a question" /><button className="send-button" type="submit" aria-label="Send question"><Send size={16} /></button></form><div className="assistant-note">AI answers connect when the backend is ready.</div>
        </aside></div>
      </section>

      <section className="questions-section" id="about"><div className="questions-title"><span className="eyebrow">A NEW WAY TO SEE GROUNDWATER</span><h2>Big questions.<br /><span>Grounded answers.</span></h2><a href="#method">How it works <ArrowUpRight size={16} /></a></div><div className="question-cards"><article><span className="card-index">01</span><div className="question-icon teal"><Activity size={19} /></div><h3>What is happening here?</h3><p>Explore salinity probability and groundwater context for a location that matters to you.</p></article><article><span className="card-index">02</span><div className="question-icon lime"><Waves size={19} /></div><h3>How could it change?</h3><p>Explore future outlooks as climate scenarios and model projections become available.</p></article><article><span className="card-index">03</span><div className="question-icon sand"><Sparkles size={19} /></div><h3>Why this place?</h3><p>Understand the environmental drivers behind a prediction with clear, explainable insights.</p></article></div></section>
      <footer id="method"><a className="brand footer-brand" href="#home"><span className="brand-mark"><Droplet size={18} fill="currentColor" /></span><span>AQUA<span className="brand-light">SHIELD</span></span></a><span>Mapping groundwater salinization across India.</span><span className="footer-status"><span className="online-dot" /> Research prototype</span></footer>
    </main>
  );
}
