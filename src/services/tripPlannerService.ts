import { fetchNearbyChargingStations, type OcmStation } from "@/services/openChargeMapService";
import {
  calculateChargingCost,
  detectOutOfChargeScenario,
  detectSolarStations,
  findNearbyRescueVehicles,
  simulateReverseCharging,
  type CommunityRescueVehicle,
} from "@/services/communityEnergyService";

const ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";
const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const ORS_API_KEY = import.meta.env.VITE_ORS_KEY as string | undefined;

const MIN_FAST_CHARGER_KW = 50;
const CHARGER_SEARCH_RADIUS_KM = 20;
const CHARGER_SEARCH_LIMIT = 40;
const RANGE_BUFFER_FACTOR = 0.9;
const MIN_SOLAR_DETOUR_WINDOW_KM = 2;
const DEFAULT_RECEIVER_BATTERY_KWH = 60;
const DEFAULT_EFFICIENCY_KM_PER_KWH = 4.5;
const BASE_GRID_TARIFF_INR_PER_KWH = 12;

export type Coordinate = {
  lat: number;
  lng: number;
};

export type PlannedChargingStop = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  powerKw: number;
  distanceFromRouteKm: number;
  distanceFromStartKm: number;
  isFastCharger: boolean;
  isSolarPreferred: boolean;
  energySource: "solar" | "grid" | "hybrid";
  estimatedChargingCostInr: number;
  estimatedUnitPriceInr: number;
  discountPercent: number;
};

export type RoutePlanResult = {
  start: string;
  destination: string;
  startCoordinate: Coordinate;
  destinationCoordinate: Coordinate;
  totalDistanceKm: number;
  usableRangeKm: number;
  planningLegRangeKm: number;
  requiresCharging: boolean;
  chargingStopsRequired: number;
  chargingStops: PlannedChargingStop[];
  message: string;
  routeGeometry: Coordinate[];
  communityRescue?: {
    enabled: boolean;
    triggered: boolean;
    rescueFound: boolean;
    donorVehicleId?: string;
    transferredEnergyKwh: number;
    emergencyRangeGainedKm: number;
    nearestChargerReachable: boolean;
    nearestReachableChargerName?: string;
    reason: string;
  };
  // Bonus-ready structures:
  estimatedCost: {
    currency: "INR";
    estimatedTotal: number;
    note: string;
  };
  batteryModel: {
    consumptionPerKm: number;
    note: string;
  };
  mapData: {
    route: Coordinate[];
    stops: Coordinate[];
  };
  sustainability: {
    score: number;
    co2SavingsKg: number;
    note: string;
  };
};

export class TripPlannerError extends Error {
  code:
    | "MISSING_ORS_KEY"
    | "INVALID_LOCATION"
    | "ROUTE_NOT_FOUND"
    | "NO_CHARGERS_FOUND"
    | "NETWORK_ERROR"
    | "UNKNOWN";

  constructor(
    code: TripPlannerError["code"],
    message: string,
  ) {
    super(message);
    this.name = "TripPlannerError";
    this.code = code;
  }
}

type OrsGeocodeFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
};

type OrsGeocodeResponse = {
  features?: OrsGeocodeFeature[];
};

type OrsDirectionsFeature = {
  geometry?: {
    coordinates?: [number, number][];
  };
  properties?: {
    summary?: {
      distance?: number;
    };
    segments?: Array<{
      distance?: number;
    }>;
  };
};

type OrsDirectionsResponse = {
  features?: OrsDirectionsFeature[];
};

const geocodeCache = new Map<string, Coordinate>();
const routeCache = new Map<string, { distanceKm: number; geometry: Coordinate[] }>();
const chargerCache = new Map<string, OcmStation[]>();

function haversineKm(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toCoordinate(value: [number, number]): Coordinate {
  return { lat: value[1], lng: value[0] };
}

function maxPowerKw(station: OcmStation): number {
  return station.maxPowerKw || 0;
}

function parseOrThrowResponseError(response: Response): never {
  throw new TripPlannerError(
    "NETWORK_ERROR",
    `Routing provider request failed (${response.status} ${response.statusText}).`,
  );
}

async function geocodeCity(cityName: string): Promise<Coordinate> {
  const normalized = cityName.trim().toLowerCase();
  if (!normalized) {
    throw new TripPlannerError("INVALID_LOCATION", "Please enter both start and destination locations.");
  }

  const cached = geocodeCache.get(normalized);
  if (cached) return cached;

  if (!ORS_API_KEY) {
    throw new TripPlannerError(
      "MISSING_ORS_KEY",
      "OpenRouteService API key is missing. Add VITE_ORS_KEY to your environment.",
    );
  }

  const url = new URL(ORS_GEOCODE_URL);
  url.searchParams.set("api_key", ORS_API_KEY);
  url.searchParams.set("text", cityName.trim());
  url.searchParams.set("size", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) parseOrThrowResponseError(response);

  const payload = (await response.json()) as OrsGeocodeResponse;
  const coordinate = payload.features?.[0]?.geometry?.coordinates;

  if (!coordinate || coordinate.length < 2) {
    throw new TripPlannerError(
      "INVALID_LOCATION",
      `Could not find coordinates for "${cityName}". Try a more specific city name.`,
    );
  }

  const result = toCoordinate(coordinate);
  geocodeCache.set(normalized, result);
  return result;
}

async function fetchRoute(
  start: Coordinate,
  destination: Coordinate,
): Promise<{ distanceKm: number; geometry: Coordinate[] }> {
  const cacheKey = `${start.lat.toFixed(5)},${start.lng.toFixed(5)}->${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  if (!ORS_API_KEY) {
    throw new TripPlannerError(
      "MISSING_ORS_KEY",
      "OpenRouteService API key is missing. Add VITE_ORS_KEY to your environment.",
    );
  }

  const { distanceKm, geometry } = await getRouteDistance(
    [start.lat, start.lng],
    [destination.lat, destination.lng],
  );

  const result = {
    distanceKm,
    geometry,
  };
  routeCache.set(cacheKey, result);
  return result;
}

export async function getRouteDistance(
  start: [number, number],
  end: [number, number],
): Promise<{ distanceKm: number; geometry: Coordinate[] }> {
  if (!ORS_API_KEY) {
    throw new TripPlannerError(
      "MISSING_ORS_KEY",
      "OpenRouteService API key is missing. Add VITE_ORS_KEY to your environment.",
    );
  }

  // ORS expects [longitude, latitude]. Sending [latitude, longitude] can trigger
  // request validation errors (including 406/400 depending on payload negotiation).
  const body = {
    coordinates: [
      [start[1], start[0]],
      [end[1], end[0]],
    ],
  };

  console.log("[ORS] Directions request payload:", body);

  const response = await fetch(ORS_DIRECTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error("[ORS] Directions error response:", response.status, raw);
    throw new TripPlannerError(
      "NETWORK_ERROR",
      `OpenRouteService directions failed (${response.status} ${response.statusText}).`,
    );
  }

  const data = (await response.json()) as OrsDirectionsResponse;
  console.log("[ORS] Directions success response:", data);

  const feature = data.features?.[0];
  const rawGeometry = feature?.geometry?.coordinates;
  const distanceMeters = feature?.properties?.segments?.[0]?.distance;

  // For this endpoint, distance is read from features[0].properties.segments[0].distance.
  // Value is in meters, so convert to kilometers.
  if (!rawGeometry || rawGeometry.length < 2 || !distanceMeters) {
    throw new TripPlannerError(
      "ROUTE_NOT_FOUND",
      "OpenRouteService returned an invalid route payload.",
    );
  }

  return {
    distanceKm: Number((distanceMeters / 1000).toFixed(2)),
    geometry: rawGeometry.map(toCoordinate),
  };
}

function pointAtDistanceAlongRoute(route: Coordinate[], targetDistanceKm: number): Coordinate {
  if (route.length === 0) return { lat: 0, lng: 0 };
  if (targetDistanceKm <= 0) return route[0];

  let covered = 0;
  for (let i = 1; i < route.length; i += 1) {
    const segStart = route[i - 1];
    const segEnd = route[i];
    const segDistance = haversineKm(segStart, segEnd);

    if (covered + segDistance >= targetDistanceKm) {
      const ratio = segDistance === 0 ? 0 : (targetDistanceKm - covered) / segDistance;
      return {
        lat: segStart.lat + (segEnd.lat - segStart.lat) * ratio,
        lng: segStart.lng + (segEnd.lng - segStart.lng) * ratio,
      };
    }

    covered += segDistance;
  }

  return route[route.length - 1];
}

function minDistanceToRouteKm(point: Coordinate, route: Coordinate[]): number {
  if (route.length === 0) return 0;
  const sampleStep = Math.max(1, Math.floor(route.length / 120));
  let min = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length; i += sampleStep) {
    min = Math.min(min, haversineKm(point, route[i]));
  }

  return Number(min.toFixed(2));
}

async function fetchChargersNearPoint(point: Coordinate): Promise<OcmStation[]> {
  const cacheKey = `${point.lat.toFixed(3)}:${point.lng.toFixed(3)}:${CHARGER_SEARCH_RADIUS_KM}:${CHARGER_SEARCH_LIMIT}`;
  const cached = chargerCache.get(cacheKey);
  if (cached) return cached;

  const stations = await fetchNearbyChargingStations({
    latitude: point.lat,
    longitude: point.lng,
    distanceKm: CHARGER_SEARCH_RADIUS_KM,
    maxResults: CHARGER_SEARCH_LIMIT,
  });

  const solarAwareStations = detectSolarStations(stations);
  chargerCache.set(cacheKey, solarAwareStations);
  return solarAwareStations;
}

async function chooseBestStop(
  point: Coordinate,
  route: Coordinate[],
  distanceFromStartKm: number,
  energyRequiredKwh: number,
  selectedIds: Set<string>,
): Promise<PlannedChargingStop | null> {
  const nearby = await fetchChargersNearPoint(point);
  if (nearby.length === 0) return null;

  const available = nearby
    .filter((station) => !selectedIds.has(station.id))
    .map((station) => {
      const power = maxPowerKw(station);
      const solar = station.isSolarPowered;
      const distanceFromRouteKm = minDistanceToRouteKm(
        { lat: station.latitude, lng: station.longitude },
        route,
      );

      return {
        station,
        power,
        solar,
        distanceFromRouteKm,
      };
    });

  if (available.length === 0) return null;

  const fastCandidates = available.filter((candidate) => candidate.power >= MIN_FAST_CHARGER_KW);
  const pool = fastCandidates.length > 0 ? fastCandidates : available;
  const minDistanceInPool = Math.min(...pool.map((candidate) => candidate.distanceFromRouteKm));

  const ranked = pool
    .map((candidate) => {
      const solarWithMinimalDetour =
        candidate.solar &&
        candidate.distanceFromRouteKm <= minDistanceInPool + MIN_SOLAR_DETOUR_WINDOW_KM;
      return {
        ...candidate,
        solarWithMinimalDetour,
      };
    })
    .sort((a, b) => {
      if (a.solarWithMinimalDetour !== b.solarWithMinimalDetour) {
        return a.solarWithMinimalDetour ? -1 : 1;
      }
      if (a.distanceFromRouteKm !== b.distanceFromRouteKm) {
        return a.distanceFromRouteKm - b.distanceFromRouteKm;
      }
      return b.power - a.power;
    });

  const picked = ranked[0];
  if (!picked) return null;

  const chargingCost = calculateChargingCost(energyRequiredKwh, picked.station);
  selectedIds.add(picked.station.id);
  return {
    id: picked.station.id,
    name: picked.station.name,
    address: picked.station.address,
    latitude: picked.station.latitude,
    longitude: picked.station.longitude,
    powerKw: picked.power,
    distanceFromRouteKm: picked.distanceFromRouteKm,
    distanceFromStartKm: Number(distanceFromStartKm.toFixed(1)),
    isFastCharger: picked.power >= MIN_FAST_CHARGER_KW,
    isSolarPreferred: picked.solarWithMinimalDetour,
    energySource: picked.station.energySource,
    estimatedChargingCostInr: chargingCost.totalCost,
    estimatedUnitPriceInr: chargingCost.effectivePricePerKwh,
    discountPercent: chargingCost.discountAppliedPercent,
  };
}

function createSimulatedCommunityVehicles(routePoint: Coordinate): CommunityRescueVehicle[] {
  return [
    {
      vehicleId: "EV-COMM-101",
      currentLocation: { lat: routePoint.lat + 0.018, lng: routePoint.lng - 0.012 },
      routeDirection: "same corridor outbound",
      availableBatteryPercent: 62,
      supportsReverseCharging: true,
    },
    {
      vehicleId: "EV-COMM-202",
      currentLocation: { lat: routePoint.lat - 0.026, lng: routePoint.lng + 0.01 },
      routeDirection: "nearby local route",
      availableBatteryPercent: 48,
      supportsReverseCharging: true,
    },
    {
      vehicleId: "EV-COMM-303",
      currentLocation: { lat: routePoint.lat + 0.08, lng: routePoint.lng + 0.05 },
      routeDirection: "different route",
      availableBatteryPercent: 72,
      supportsReverseCharging: false,
    },
  ];
}

export function calculateUsableRangeKm(
  evMaxRangeKm: number,
  currentBatteryPercent: number,
): number {
  const safeBattery = Math.min(Math.max(currentBatteryPercent, 0), 100);
  const safeRange = Math.max(evMaxRangeKm, 0);
  return Number(((safeBattery / 100) * safeRange).toFixed(2));
}

export async function planEvTrip(params: {
  startLocation: string;
  destination: string;
  evMaxRangeKm: number;
  currentBatteryPercent: number;
  enableCommunityRescue?: boolean;
  communityVehicles?: CommunityRescueVehicle[];
}): Promise<RoutePlanResult> {
  try {
    const start = await geocodeCity(params.startLocation);
    const destination = await geocodeCity(params.destination);

    const route = await fetchRoute(start, destination);
    const usableRangeKm = calculateUsableRangeKm(
      params.evMaxRangeKm,
      params.currentBatteryPercent,
    );
    const planningLegRangeKm = Number((usableRangeKm * RANGE_BUFFER_FACTOR).toFixed(2));
    const estimatedConsumptionKwhPerKm = Number((1 / DEFAULT_EFFICIENCY_KM_PER_KWH).toFixed(3));

    if (route.distanceKm <= usableRangeKm) {
      return {
        start: params.startLocation,
        destination: params.destination,
        startCoordinate: start,
        destinationCoordinate: destination,
        totalDistanceKm: route.distanceKm,
        usableRangeKm,
        planningLegRangeKm,
        requiresCharging: false,
        chargingStopsRequired: 0,
        chargingStops: [],
        message: "You can reach your destination without charging.",
        routeGeometry: route.geometry,
        communityRescue: {
          enabled: params.enableCommunityRescue !== false,
          triggered: false,
          rescueFound: false,
          transferredEnergyKwh: 0,
          emergencyRangeGainedKm: 0,
          nearestChargerReachable: false,
          reason: "Trip can be completed without rescue support.",
        },
        estimatedCost: {
          currency: "INR",
          estimatedTotal: 0,
          note: "No charging stop required for this trip.",
        },
        batteryModel: {
          consumptionPerKm: Number((1 / Math.max(params.evMaxRangeKm, 1)).toFixed(4)),
          note: "Default normalized consumption model (battery fraction per km).",
        },
        mapData: {
          route: route.geometry,
          stops: [],
        },
        sustainability: {
          score: 100,
          co2SavingsKg: 0,
          note: "No charging stop required for this route.",
        },
      };
    }

    if (planningLegRangeKm <= 0) {
      throw new TripPlannerError(
        "ROUTE_NOT_FOUND",
        "Battery percentage is too low to generate a safe charging plan.",
      );
    }

    // Route segmentation logic:
    // We step through the route at each safe leg boundary and select one best charger
    // near that boundary point. This yields an ordered trip: Start -> Stop1 -> ... -> Destination.
    const stopsNeeded = Math.ceil(route.distanceKm / planningLegRangeKm) - 1;
    const chargingStops: PlannedChargingStop[] = [];
    const selectedIds = new Set<string>();
    let rescueDetails: RoutePlanResult["communityRescue"] = {
      enabled: params.enableCommunityRescue !== false,
      triggered: false,
      rescueFound: false,
      transferredEnergyKwh: 0,
      emergencyRangeGainedKm: 0,
      nearestChargerReachable: false,
      reason: "Rescue mode not required.",
    };

    for (let i = 1; i <= stopsNeeded; i += 1) {
      const distanceFromStartKm = planningLegRangeKm * i;
      const routePoint = pointAtDistanceAlongRoute(route.geometry, distanceFromStartKm);
      const energyRequiredForLegKwh = Number(
        (planningLegRangeKm * estimatedConsumptionKwhPerKm).toFixed(2),
      );
      const stop = await chooseBestStop(
        routePoint,
        route.geometry,
        distanceFromStartKm,
        energyRequiredForLegKwh,
        selectedIds,
      );

      if (!stop) {
        const scenario = detectOutOfChargeScenario({
          batteryPercent: params.currentBatteryPercent,
          criticalThresholdPercent: 5,
          nearbyStationsCount: 0,
          stationRadiusKm: CHARGER_SEARCH_RADIUS_KM,
        });

        if (scenario.shouldTriggerRescue && params.enableCommunityRescue !== false) {
          const fallbackVehicles = params.communityVehicles ?? createSimulatedCommunityVehicles(routePoint);
          const matchedRescueVehicles = findNearbyRescueVehicles({
            receiverLocation: routePoint,
            receiverRouteDirection: `${params.startLocation}-${params.destination}`,
            vehicles: fallbackVehicles,
            maxDistanceKm: 10,
            minimumDonorBatteryPercent: 40,
          });

          const localStations = await fetchChargersNearPoint(routePoint);
          const rescueSimulation = simulateReverseCharging({
            receiverCurrentBatteryPercent: params.currentBatteryPercent,
            receiverBatteryCapacityKwh: DEFAULT_RECEIVER_BATTERY_KWH,
            receiverLocation: routePoint,
            rescueCandidates: matchedRescueVehicles,
            chargingStations: localStations,
            donorBatteryCapacityKwh: 70,
            transferKwhRange: { min: 5, max: 10 },
            donorSafeBatteryFloorPercent: 25,
            receiverKmPerKwh: DEFAULT_EFFICIENCY_KM_PER_KWH,
            oneRescuePerTrip: true,
            alreadyRescuedOnTrip: false,
          });

          rescueDetails = {
            enabled: true,
            triggered: true,
            rescueFound: rescueSimulation.rescueFound,
            donorVehicleId: rescueSimulation.donorVehicleId,
            transferredEnergyKwh: rescueSimulation.transferredEnergyKwh,
            emergencyRangeGainedKm: rescueSimulation.emergencyRangeGainedKm,
            nearestChargerReachable: rescueSimulation.nearestChargerReachable,
            nearestReachableChargerName: rescueSimulation.nearestReachableChargerName,
            reason: rescueSimulation.reason,
          };

          if (rescueSimulation.rescueFound) {
            break;
          }
        }

        throw new TripPlannerError(
          "NO_CHARGERS_FOUND",
          `No charging station found near segment ${i}. ${rescueDetails?.triggered ? `Community rescue status: ${rescueDetails.reason}` : "Try a different start/destination or higher battery level."}`,
        );
      }

      chargingStops.push(stop);
    }

    const estimatedTotalCost = Number(
      chargingStops.reduce((sum, stop) => sum + stop.estimatedChargingCostInr, 0).toFixed(2),
    );
    const solarStopCount = chargingStops.filter((stop) => stop.energySource !== "grid").length;
    const solarRatio = chargingStops.length > 0 ? solarStopCount / chargingStops.length : 0;
    const sustainabilityScore = Number(Math.min(100, 50 + solarRatio * 50).toFixed(1));
    const estimatedCo2SavingsKg = Number((solarStopCount * 1.4).toFixed(2));

    return {
      start: params.startLocation,
      destination: params.destination,
      startCoordinate: start,
      destinationCoordinate: destination,
      totalDistanceKm: route.distanceKm,
      usableRangeKm,
      planningLegRangeKm,
      requiresCharging: true,
      chargingStopsRequired: chargingStops.length,
      chargingStops,
      message: "Charging stops planned successfully.",
      routeGeometry: route.geometry,
      communityRescue: rescueDetails,
      estimatedCost: {
        currency: "INR",
        estimatedTotal: estimatedTotalCost,
        note: `Estimated using base tariff Rs.${BASE_GRID_TARIFF_INR_PER_KWH}/kWh with solar/hybrid discounts when available.`,
      },
      batteryModel: {
        consumptionPerKm: Number((1 / Math.max(params.evMaxRangeKm, 1)).toFixed(4)),
        note: "Default normalized consumption model (battery fraction per km).",
      },
      mapData: {
        route: route.geometry,
        stops: chargingStops.map((stop) => ({
          lat: stop.latitude,
          lng: stop.longitude,
        })),
      },
      sustainability: {
        score: sustainabilityScore,
        co2SavingsKg: estimatedCo2SavingsKg,
        note: "Estimated from number of solar/hybrid charging stops (illustrative metric).",
      },
    };
  } catch (error) {
    if (error instanceof TripPlannerError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new TripPlannerError("NETWORK_ERROR", error.message);
    }

    throw new TripPlannerError(
      "UNKNOWN",
      "Trip planning failed due to an unknown error.",
    );
  }
}
