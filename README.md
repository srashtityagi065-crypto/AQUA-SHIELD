# AquaShield frontend

AquaShield is a map-first research interface for exploring groundwater salinization in India. It is designed to display observed data and model outputs from the team’s data and backend services. It does not generate or invent scientific values in the browser.

## What is implemented

- Responsive India map with pan, zoom, click-to-select, reset-to-India, device location, fullscreen, and Light / Streets / Dark basemaps.
- Search for Indian places through Nominatim. Search results include alternatives so the user can choose between ambiguous locations.
- Location analysis, future scenario controls, and a model explanation panel. Each displays an explicit unavailable state until the relevant API output exists.
- Text and browser voice input use the same assistant request contract. The selected latitude, longitude, location label, research layer, period, and scenario are sent with the question. Spoken answers are optional.
- Research layer tile overlays and legends render from backend metadata. No placeholder risk raster or fabricated prediction values are included.

## Architecture

```text
app/page.tsx
  └── components/AquaShieldExperience.tsx  shared location, layer, and scenario state
      ├── components/map/MapView.tsx       Leaflet map, basemaps, controls, tile overlays
      ├── components/location/LocationSearch.tsx
      ├── components/prediction/ResearchPanels.tsx
      └── components/assistant/AssistantPanel.tsx

lib/api/                                   API client and endpoint functions
types/                                      frontend/backend response contracts
```

## Tech stack

- Next.js App Router, React, TypeScript
- Leaflet for the interactive map (the current repository uses Leaflet; a MapLibre migration would be a separate change)
- CSS and Tailwind CSS v4
- Lucide icons
- OpenStreetMap Nominatim for place search; CARTO / OpenStreetMap for basemap tiles

## Run locally

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. Device location requires browser permission and a secure context (localhost works for development).

## Environment variables

Create `.env.local` in the project root when the FastAPI service is ready:

```env
NEXT_PUBLIC_AQUASHIELD_API_URL=http://localhost:8000
```

The variable is optional while working on the UI. Without it, data panels show that the API is not configured. Do not put private API keys in a `NEXT_PUBLIC_` variable; values with that prefix are sent to the browser.

The backend must allow browser requests from the frontend origin through CORS. Production place search should be proxied or rate-limited by the backend rather than relying on direct browser calls to the public geocoder.

## Provisional API integration contract

The endpoint paths below are frontend assumptions to agree on with the backend team. The exact response fields, units, coordinate reference system, probability scale, risk thresholds, period names, and scenario IDs must be confirmed by the model/data owners before production integration.

| Endpoint | Purpose | Expected frontend shape |
| --- | --- | --- |
| `GET /maps/layers` | Available raster/tile layers and legends | `MapLayerMetadata[]` |
| `GET /predictions/location?latitude=…&longitude=…` | Selected location summary | `LocationPrediction` |
| `GET /projections/location?latitude=…&longitude=…&period=…&scenario=…` | Selected future projection | `ProjectionResult` |
| `GET /predictions/explanation?latitude=…&longitude=…` | Explainability/feature contributions | `PredictionExplanation` |
| `POST /assistant/query` | Text or transcribed voice question | `AssistantReply` |

The assistant request body is typed in `types/assistant.ts` and includes `message`, optional location context, selected layer, period, and scenario. A response may include map actions (`locate`, `select_layer`, or `select_period`). Map layer metadata includes the tile URL, attribution, status (`observed`, `model_output`, `demo`, or `unavailable`), units, and a server-defined legend. Tile URL templates may use `{period}` and `{scenario}` placeholders; the map replaces them with the selected values. Keep these types synchronized with the agreed FastAPI/OpenAPI schema.

## Map and data status

The map base tiles are geographic context only; they are not groundwater data. The research layer menu remains marked `DATA PENDING` until a layer is returned by `GET /maps/layers`. If a demo layer is added later, its metadata must say `demo` and the UI must visibly label it `DEMO / PREVIEW`.

Location predictions distinguish observed data, model output, and demo status. Uncertainty is displayed with the backend-provided method and unit. Applicability is not relabeled as confidence. Explainability text identifies feature contributions as model associations, not proven causes.

No synthetic scientific mock data is included. There is no `mock/` directory until the team chooses to add clearly labelled fixtures.

## Team integration checklist

1. Confirm the endpoint paths and response schemas with the API developer.
2. Confirm units, thresholds, probability scale, data year, scenario IDs, uncertainty meaning, and applicability range with the model/data owners.
3. Have the backend return map tile URLs and matching legends in metadata; avoid sending nationwide rasters as large JSON arrays.
4. Set `NEXT_PUBLIC_AQUASHIELD_API_URL`, configure CORS, and test the loading, missing-data, and error states with real API responses.
