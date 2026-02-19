import type { OcmStation } from "@/services/openChargeMapService";

export type EnergySource = "solar" | "grid" | "hybrid";

export type SolarAwareStation = OcmStation & {
  isSolarPowered?: boolean;
  energySource?: EnergySource;
  operatorName?: string;
};

export type CommunityRescueVehicle = {
  vehicleId: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  routeDirection: string;
  availableBatteryPercent: number;
  supportsReverseCharging: boolean;
};

export type OutOfChargeDetectionInput = {
  batteryPercent: number;
  criticalThresholdPercent?: number;
  nearbyStationsCount: number;
  stationRadiusKm: number;
};

export type OutOfChargeDetectionResult = {
  isCriticalBattery: boolean;
  hasNoNearbyStations: boolean;
  shouldTriggerRescue: boolean;
  reason: string;
};

export type ChargingCostBreakdown = {
  basePricePerKwh: number;
  effectivePricePerKwh: number;
  discountAppliedPercent: number;
  totalCost: number;
  note: string;
};

export type RescueMatchInput = {
  receiverLocation: {
    lat: number;
    lng: number;
  };
  receiverRouteDirection: string;
  vehicles: CommunityRescueVehicle[];
  maxDistanceKm?: number;
  minimumDonorBatteryPercent?: number;
};

export type RescueSimulationInput = {
  receiverCurrentBatteryPercent: number;
  receiverBatteryCapacityKwh: number;
  receiverLocation: {
    lat: number;
    lng: number;
  };
  rescueCandidates: CommunityRescueVehicle[];
  chargingStations: Array<Pick<OcmStation, "id" | "name" | "latitude" | "longitude">>;
  donorBatteryCapacityKwh?: number;
  transferKwhRange?: {
    min: number;
    max: number;
  };
  donorSafeBatteryFloorPercent?: number;
  receiverKmPerKwh?: number;
  oneRescuePerTrip?: boolean;
  alreadyRescuedOnTrip?: boolean;
};

export type RescueSimulationResult = {
  rescueFound: boolean;
  donorVehicleId?: string;
  transferredEnergyKwh: number;
  emergencyRangeGainedKm: number;
  receiverBatteryAfterPercent?: number;
  donorBatteryAfterPercent?: number;
  nearestChargerReachable: boolean;
  nearestReachableChargerId?: string;
  nearestReachableChargerName?: string;
  reason: string;
};

const SOLAR_KEYWORDS = [
  "solar",
  "renewable",
  "green energy",
  "clean energy",
  "sun powered",
];

const HYBRID_KEYWORDS = [
  "hybrid",
  "mixed energy",
  "solar+grid",
];

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function inferEnergySourceFromText(text: string): EnergySource {
  const haystack = text.toLowerCase();
  if (HYBRID_KEYWORDS.some((k) => haystack.includes(k))) return "hybrid";
  if (SOLAR_KEYWORDS.some((k) => haystack.includes(k))) return "solar";
  return "grid";
}

function routeSimilarityScore(routeA: string, routeB: string): number {
  const a = routeA.trim().toLowerCase();
  const b = routeB.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.75;

  const aTokens = new Set(a.split(/[^a-z0-9]+/g).filter(Boolean));
  const bTokens = new Set(b.split(/[^a-z0-9]+/g).filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

export function detectSolarStations(
  stations: SolarAwareStation[],
  manualTags: Record<string, EnergySource> = {},
): SolarAwareStation[] {
  return stations.map((station) => {
    const manualEnergySource = manualTags[station.id];
    const inferred = inferEnergySourceFromText(
      `${station.name} ${station.address} ${station.operatorName ?? ""}`,
    );
    const energySource = manualEnergySource ?? station.energySource ?? inferred;
    const isSolarPowered = energySource === "solar" || energySource === "hybrid";

    return {
      ...station,
      energySource,
      isSolarPowered,
    };
  });
}

export function calculateSolarDiscountedCost(
  energyRequiredKwh: number,
  station: SolarAwareStation,
  options?: {
    basePricePerKwh?: number;
    solarDiscountPercent?: number;
    hybridDiscountPercent?: number;
  },
): ChargingCostBreakdown {
  const units = Math.max(0, Number.isFinite(energyRequiredKwh) ? energyRequiredKwh : 0);
  const basePricePerKwh = options?.basePricePerKwh ?? 12;
  const solarDiscount = options?.solarDiscountPercent ?? 35;
  const hybridDiscount = options?.hybridDiscountPercent ?? 20;
  const source = station.energySource ?? "grid";

  const discountAppliedPercent =
    source === "solar" ? solarDiscount : source === "hybrid" ? hybridDiscount : 0;
  const effectivePricePerKwh = Number(
    (basePricePerKwh * (1 - discountAppliedPercent / 100)).toFixed(2),
  );
  const totalCost = Number((units * effectivePricePerKwh).toFixed(2));

  return {
    basePricePerKwh,
    effectivePricePerKwh,
    discountAppliedPercent,
    totalCost,
    note:
      discountAppliedPercent > 0
        ? `${source} station discount applied`
        : "Standard grid tariff",
  };
}

export function calculateChargingCost(
  energyRequiredKwh: number,
  station: SolarAwareStation,
): ChargingCostBreakdown {
  return calculateSolarDiscountedCost(energyRequiredKwh, station);
}

export function detectOutOfChargeScenario(
  input: OutOfChargeDetectionInput,
): OutOfChargeDetectionResult {
  const criticalThresholdPercent = input.criticalThresholdPercent ?? 5;
  const isCriticalBattery = input.batteryPercent <= criticalThresholdPercent;
  const hasNoNearbyStations = input.nearbyStationsCount <= 0;
  const shouldTriggerRescue = isCriticalBattery && hasNoNearbyStations;

  let reason = "No rescue needed";
  if (shouldTriggerRescue) {
    reason = `Battery is critical (<=${criticalThresholdPercent}%) and no stations found within ${input.stationRadiusKm} km`;
  } else if (!isCriticalBattery) {
    reason = `Battery above critical threshold (${criticalThresholdPercent}%)`;
  } else {
    reason = "Stations available nearby";
  }

  return {
    isCriticalBattery,
    hasNoNearbyStations,
    shouldTriggerRescue,
    reason,
  };
}

/*
Pseudocode:
1) Filter donor EVs that support reverse charging and have sufficient battery.
2) Compute distance to receiver and route similarity.
3) Keep only donors within allowed radius and route similarity threshold.
4) Rank by nearest distance and highest available battery.
*/
export function findNearbyRescueVehicles(
  input: RescueMatchInput,
): CommunityRescueVehicle[] {
  const maxDistanceKm = input.maxDistanceKm ?? 8;
  const minimumDonorBatteryPercent = input.minimumDonorBatteryPercent ?? 40;

  return input.vehicles
    .filter((vehicle) => vehicle.supportsReverseCharging)
    .filter((vehicle) => vehicle.availableBatteryPercent >= minimumDonorBatteryPercent)
    .map((vehicle) => {
      const distanceKm = haversineKm(input.receiverLocation, vehicle.currentLocation);
      const similarity = routeSimilarityScore(
        input.receiverRouteDirection,
        vehicle.routeDirection,
      );
      return {
        vehicle,
        distanceKm,
        similarity,
      };
    })
    .filter((candidate) => candidate.distanceKm <= maxDistanceKm)
    .filter((candidate) => candidate.similarity >= 0.35)
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.vehicle.availableBatteryPercent - a.vehicle.availableBatteryPercent;
    })
    .map((candidate) => candidate.vehicle);
}

/*
Pseudocode:
1) Pick the best matched donor.
2) Compute donor transferable kWh without crossing donor safe floor.
3) Clamp transfer to emergency window (5-10 kWh by default).
4) Estimate receiver emergency range and reachable nearest charger.
*/
export function simulateReverseCharging(
  input: RescueSimulationInput,
): RescueSimulationResult {
  if (input.oneRescuePerTrip && input.alreadyRescuedOnTrip) {
    return {
      rescueFound: false,
      transferredEnergyKwh: 0,
      emergencyRangeGainedKm: 0,
      nearestChargerReachable: false,
      reason: "One rescue per trip limit reached",
    };
  }

  const donor = input.rescueCandidates[0];
  if (!donor) {
    return {
      rescueFound: false,
      transferredEnergyKwh: 0,
      emergencyRangeGainedKm: 0,
      nearestChargerReachable: false,
      reason: "No rescue vehicle available",
    };
  }

  const donorBatteryCapacityKwh = input.donorBatteryCapacityKwh ?? 70;
  const donorSafeBatteryFloorPercent = input.donorSafeBatteryFloorPercent ?? 25;
  const transferRange = input.transferKwhRange ?? { min: 5, max: 10 };
  const receiverKmPerKwh = input.receiverKmPerKwh ?? 4.5;

  const donorCurrentEnergyKwh = (donor.availableBatteryPercent / 100) * donorBatteryCapacityKwh;
  const donorMinimumEnergyKwh = (donorSafeBatteryFloorPercent / 100) * donorBatteryCapacityKwh;
  const donorTransferableKwh = Math.max(0, donorCurrentEnergyKwh - donorMinimumEnergyKwh);

  const transferCandidateKwh = Math.min(transferRange.max, donorTransferableKwh);
  const transferredEnergyKwh =
    transferCandidateKwh >= transferRange.min ? transferCandidateKwh : 0;

  if (transferredEnergyKwh <= 0) {
    return {
      rescueFound: false,
      transferredEnergyKwh: 0,
      emergencyRangeGainedKm: 0,
      nearestChargerReachable: false,
      reason: "Donor battery is below safe transfer reserve",
    };
  }

  const emergencyRangeGainedKm = Number((transferredEnergyKwh * receiverKmPerKwh).toFixed(1));
  const receiverAddedPercent =
    (transferredEnergyKwh / Math.max(1, input.receiverBatteryCapacityKwh)) * 100;
  const receiverBatteryAfterPercent = Number(
    Math.min(100, input.receiverCurrentBatteryPercent + receiverAddedPercent).toFixed(1),
  );
  const donorBatteryAfterPercent = Number(
    (((donorCurrentEnergyKwh - transferredEnergyKwh) / donorBatteryCapacityKwh) * 100).toFixed(1),
  );

  const nearest = input.chargingStations
    .map((station) => {
      const distanceKm = haversineKm(input.receiverLocation, {
        lat: station.latitude,
        lng: station.longitude,
      });
      return {
        station,
        distanceKm,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  const nearestChargerReachable = Boolean(nearest && nearest.distanceKm <= emergencyRangeGainedKm);

  return {
    rescueFound: true,
    donorVehicleId: donor.vehicleId,
    transferredEnergyKwh: Number(transferredEnergyKwh.toFixed(2)),
    emergencyRangeGainedKm,
    receiverBatteryAfterPercent,
    donorBatteryAfterPercent,
    nearestChargerReachable,
    nearestReachableChargerId: nearestChargerReachable ? nearest?.station.id : undefined,
    nearestReachableChargerName: nearestChargerReachable ? nearest?.station.name : undefined,
    reason: nearestChargerReachable
      ? "Rescue successful and a charger is reachable"
      : "Rescue provided emergency range, but nearest charger is still out of range",
  };
}
