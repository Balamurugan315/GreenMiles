const OCM_BASE_URL = "https://api.openchargemap.io/v3/poi/";
const OCM_API_KEY = "179cc779-3a67-47c8-89b0-5e29f2a049f5";
const DEFAULT_DISTANCE_KM = 8;
const MAX_DISTANCE_KM = 500;
const DEFAULT_MAX_RESULTS = 40;

export const OPEN_CHARGE_MAP_ATTRIBUTION =
  "Charging data © OpenChargeMap contributors (CC BY 4.0)";

export type NearbyStationsParams = {
  latitude: number;
  longitude: number;
  distanceKm?: number;
  maxResults?: number;
};

export type OcmConnection = {
  type: string;
  powerKw: number;
};

export type OcmStation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address: string;
  connections: OcmConnection[];
  maxPowerKw: number;
  isSolarPowered: boolean;
  energySource: "solar" | "grid" | "hybrid";
  operatorName?: string;
};

type OcmApiAddressInfo = {
  Title?: string;
  Latitude?: number;
  Longitude?: number;
  Distance?: number;
  AddressLine1?: string;
  Town?: string;
  StateOrProvince?: string;
  Postcode?: string;
  Country?: {
    Title?: string;
  };
};

type OcmApiConnection = {
  PowerKW?: number;
  ConnectionType?: {
    Title?: string;
  };
};

type OcmApiPoi = {
  ID?: number;
  AddressInfo?: OcmApiAddressInfo;
  Connections?: OcmApiConnection[];
  OperatorInfo?: {
    Title?: string;
  };
  GeneralComments?: string;
};

const SOLAR_KEYWORDS = ["solar", "renewable", "green", "clean energy", "sun"];
const HYBRID_KEYWORDS = ["hybrid", "mixed energy", "solar+grid", "solar + grid"];
const MANUAL_ENERGY_TAGS: Record<string, OcmStation["energySource"]> = {};

function inferEnergySource(poi: OcmApiPoi): OcmStation["energySource"] {
  if (poi.ID != null && MANUAL_ENERGY_TAGS[String(poi.ID)]) {
    return MANUAL_ENERGY_TAGS[String(poi.ID)];
  }

  const metadataText = `${poi.AddressInfo?.Title ?? ""} ${poi.OperatorInfo?.Title ?? ""} ${poi.GeneralComments ?? ""}`.toLowerCase();
  if (HYBRID_KEYWORDS.some((keyword) => metadataText.includes(keyword))) {
    return "hybrid";
  }
  if (SOLAR_KEYWORDS.some((keyword) => metadataText.includes(keyword))) {
    return "solar";
  }
  return "grid";
}

export class OpenChargeMapError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenChargeMapError";
    this.status = status;
  }
}

function clampDistanceKm(distanceKm: number | undefined): number {
  if (!Number.isFinite(distanceKm)) return DEFAULT_DISTANCE_KM;
  return Math.min(Math.max(1, Math.floor(distanceKm as number)), MAX_DISTANCE_KM);
}

function clampMaxResults(maxResults: number | undefined): number {
  if (!Number.isFinite(maxResults)) return DEFAULT_MAX_RESULTS;
  return Math.min(Math.max(1, Math.floor(maxResults as number)), 100);
}

function buildAddress(address: OcmApiAddressInfo): string {
  const fields = [
    address.AddressLine1,
    address.Town,
    address.StateOrProvince,
    address.Postcode,
    address.Country?.Title,
  ].filter(Boolean);

  if (fields.length === 0) return "Address unavailable";
  return fields.join(", ");
}

function normalizeStation(poi: OcmApiPoi): OcmStation | null {
  const info = poi.AddressInfo;
  const latitude = info?.Latitude;
  const longitude = info?.Longitude;
  const id = poi.ID;

  if (!info || latitude == null || longitude == null || id == null) {
    return null;
  }

  const connections: OcmConnection[] = (poi.Connections ?? []).map((connection) => ({
    type: connection.ConnectionType?.Title ?? "Unknown connector",
    powerKw: connection.PowerKW ?? 0,
  }));

  const maxPowerKw = connections.reduce((max, c) => Math.max(max, c.powerKw), 0);
  const energySource = inferEnergySource(poi);

  return {
    id: String(id),
    name: info.Title?.trim() || "Unnamed Charging Station",
    latitude,
    longitude,
    distanceKm: Number((info.Distance ?? 0).toFixed(2)),
    address: buildAddress(info),
    connections,
    maxPowerKw,
    isSolarPowered: energySource !== "grid",
    energySource,
    operatorName: poi.OperatorInfo?.Title?.trim() || undefined,
  };
}

export function buildOpenChargeMapUrl(params: NearbyStationsParams): string {
  const url = new URL(OCM_BASE_URL);
  const searchParams = new URLSearchParams({
    output: "json",
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    distance: String(clampDistanceKm(params.distanceKm)),
    distanceunit: "KM",
    maxresults: String(clampMaxResults(params.maxResults)),
    compact: "true",
    verbose: "false",
  });
  url.search = searchParams.toString();
  return url.toString();
}

export async function fetchNearbyChargingStations(
  params: NearbyStationsParams,
): Promise<OcmStation[]> {
  const url = buildOpenChargeMapUrl(params);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-API-Key": OCM_API_KEY,
        "User-Agent": "city-fuel-finder/1.0 (web)",
        "X-User-Agent": "city-fuel-finder/1.0 (web)",
      },
    });
  } catch (error) {
    try {
      response = await fetch(url, {
        headers: {
          "X-API-Key": OCM_API_KEY,
          "X-User-Agent": "city-fuel-finder/1.0 (web)",
        },
      });
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error ? fallbackError.message : "Network error";
      throw new OpenChargeMapError(`Open Charge Map request failed: ${message}`);
    }
  }

  if (!response.ok) {
    throw new OpenChargeMapError(
      `Open Charge Map request failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new OpenChargeMapError("Open Charge Map returned invalid JSON");
  }

  if (!Array.isArray(data)) {
    throw new OpenChargeMapError("Open Charge Map returned unexpected response format");
  }

  return data
    .map((item) => normalizeStation(item as OcmApiPoi))
    .filter((station): station is OcmStation => station !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
