"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, MapPin, Search } from "lucide-react";
import { searchLocations } from "@/lib/api/locations";
import type { GeocodingResult, LocationPoint } from "@/types/location";

type Props = { onSelect: (place: LocationPoint) => void };

export function LocationSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError("");
    try {
      const matches = await searchLocations(query.trim(), controller.signal);
      setResults(matches);
      if (!matches.length) setError("No places found. Try a nearby city, district, or state.");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("Location search is unavailable. Check your connection and try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function choose(place: GeocodingResult) {
    onSelect(place);
    setQuery(place.label);
    setResults([]);
    setError("");
  }

  return (
    <div className="location-search">
      <form className="location-search-form" onSubmit={submit} role="search">
        <Search size={19} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search for a place in India" placeholder="Search a place — e.g. Vastu Khand, Lucknow" autoComplete="off" />
        <button type="submit" disabled={busy || !query.trim()} aria-label="Search location">{busy ? <LoaderCircle className="spin-icon" size={18} /> : <ArrowRight size={18} />}</button>
      </form>
      <div className="location-search-feedback" aria-live="polite">
        {error && <p className="inline-status">{error}</p>}
        {results.length > 0 && <ul className="location-results" aria-label="Matching places">{results.map((place) => <li key={place.id}><button type="button" onClick={() => choose(place)}><MapPin size={15} /><span>{place.label}</span><small>{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</small></button></li>)}</ul>}
      </div>
    </div>
  );
}
