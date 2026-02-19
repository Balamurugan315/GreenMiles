import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Battery, ChevronRight, Clock, MapPin, Navigation, Sun, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evModels } from "@/data/stations";
import TripMap from "@/components/TripMap";
import {
  TripPlannerError,
  planEvTrip,
  type RoutePlanResult,
} from "@/services/tripPlannerService";

const TripPlanner = () => {
  const [startLocation, setStartLocation] = useState("Jaipur");
  const [destination, setDestination] = useState("Ajmer");
  const [selectedModel, setSelectedModel] = useState(evModels[0].name);
  const [customRange, setCustomRange] = useState(300);
  const [batteryPercent, setBatteryPercent] = useState(80);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoutePlanResult | null>(null);
  const [communityRescueEnabled, setCommunityRescueEnabled] = useState(true);

  const currentRange = useMemo(() => {
    const model = evModels.find((m) => m.name === selectedModel);
    return model?.range === 0 ? customRange : model?.range || 300;
  }, [selectedModel, customRange]);

  const handlePlanTrip = async () => {
    setError(null);
    setResult(null);

    if (!startLocation.trim() || !destination.trim()) {
      setError("Please enter both start location and destination.");
      return;
    }

    if (currentRange <= 0 || batteryPercent <= 0) {
      setError("Please choose a valid EV range and battery percentage.");
      return;
    }

    try {
      setIsLoading(true);

      const planned = await planEvTrip({
        startLocation,
        destination,
        evMaxRangeKm: currentRange,
        currentBatteryPercent: batteryPercent,
        enableCommunityRescue: communityRescueEnabled,
      });

      setResult(planned);
    } catch (err) {
      if (err instanceof TripPlannerError) {
        setError(err.message);
      } else {
        setError("Trip planning failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">GreenMiles</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/stations">Stations</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/emergency">Emergency</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Navigation className="h-3.5 w-3.5" /> Real Route-Based Planning
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold text-foreground md:text-4xl">
              EV Trip Planner
            </h1>
            <p className="mt-2 text-muted-foreground">
              Uses OpenRouteService for route distance and Open Charge Map for charging stops.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="text-foreground">Start Location</Label>
                <Input
                  className="mt-1.5"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="e.g. Jaipur"
                />
              </div>
              <div>
                <Label className="text-foreground">Destination</Label>
                <Input
                  className="mt-1.5"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Ajmer"
                />
              </div>
              <div>
                <Label className="text-foreground">EV Model</Label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {evModels.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} {model.range > 0 ? `(${model.range} km)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {evModels.find((m) => m.name === selectedModel)?.range === 0 && (
                <div>
                  <Label className="text-foreground">Custom Range (km)</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    min={1}
                    value={customRange}
                    onChange={(e) => setCustomRange(Number(e.target.value))}
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <Label className="text-foreground">Current Battery: {batteryPercent}%</Label>
                <div className="mt-3 flex items-center gap-3">
                  <Battery className="h-5 w-5 text-primary" />
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={batteryPercent}
                    onChange={(e) => setBatteryPercent(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  />
                  <span className="min-w-[3ch] text-sm font-semibold text-foreground">{batteryPercent}%</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={communityRescueEnabled}
                    onChange={(e) => setCommunityRescueEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Enable EV Community Rescue (reverse charging fallback)
                </label>
              </div>
            </div>

            <Button
              variant="hero"
              size="lg"
              className="mt-6 w-full"
              onClick={handlePlanTrip}
              disabled={isLoading}
            >
              <Navigation className="h-5 w-5" />
              {isLoading ? "Planning Trip..." : "Plan My Trip"}
              <ChevronRight className="h-4 w-4" />
            </Button>

            <p className="mt-3 text-xs text-muted-foreground">
              Requires `VITE_ORS_KEY` in your environment.
            </p>
          </div>

          {error && (
            <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              {error}
            </div>
          )}

          {result && (
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <MapPin className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <div className="font-display text-xl font-bold text-foreground">
                    {result.totalDistanceKm} km
                  </div>
                  <div className="text-xs text-muted-foreground">Total Distance</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <Battery className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <div className="font-display text-xl font-bold text-foreground">
                    {result.usableRangeKm} km
                  </div>
                  <div className="text-xs text-muted-foreground">Usable Range</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <Zap className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <div className="font-display text-xl font-bold text-foreground">
                    {result.chargingStopsRequired}
                  </div>
                  <div className="text-xs text-muted-foreground">Charging Stops</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <Clock className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <div className="font-display text-xl font-bold text-foreground">
                    {result.planningLegRangeKm} km
                  </div>
                  <div className="text-xs text-muted-foreground">Per-Leg Planning Range</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-foreground shadow-card">
                {result.message}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="text-xs font-semibold text-primary">ESTIMATED CHARGING COST</p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">
                    Rs.{result.estimatedCost.estimatedTotal}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{result.estimatedCost.note}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="text-xs font-semibold text-primary">SUSTAINABILITY INDICATOR</p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">
                    {result.sustainability.score}/100
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Approx CO2 savings: {result.sustainability.co2SavingsKg} kg
                  </p>
                </div>
              </div>

              {result.communityRescue && (
                <div
                  className={`mt-4 rounded-xl border p-4 shadow-card ${
                    result.communityRescue.rescueFound
                      ? "border-station-available/30 bg-station-available/5"
                      : "border-border bg-card"
                  }`}
                >
                  <p className="text-xs font-semibold text-primary">EV COMMUNITY RESCUE</p>
                  <p className="mt-1 text-sm text-foreground">
                    {result.communityRescue.enabled ? "Community Rescue Available" : "Community Rescue Disabled"}
                  </p>
                  {result.communityRescue.triggered ? (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>
                        Rescue EV: {result.communityRescue.rescueFound ? "Found" : "Not found"}
                        {result.communityRescue.donorVehicleId
                          ? ` (${result.communityRescue.donorVehicleId})`
                          : ""}
                      </p>
                      <p>Emergency range gained: {result.communityRescue.emergencyRangeGainedKm} km</p>
                      <p>Energy transferred: {result.communityRescue.transferredEnergyKwh} kWh</p>
                      <p>
                        Nearest charger reachable after rescue:{" "}
                        {result.communityRescue.nearestChargerReachable
                          ? result.communityRescue.nearestReachableChargerName ?? "Yes"
                          : "No"}
                      </p>
                      <p>{result.communityRescue.reason}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{result.communityRescue.reason}</p>
                  )}
                </div>
              )}

              <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
                <h3 className="font-display text-lg font-semibold text-foreground">Ordered Trip Plan</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                    Start: {result.start}
                  </span>
                  {result.chargingStops.map((stop, index) => (
                  <span key={stop.id} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                      Stop {index + 1}: {stop.name}
                  </span>
                ))}
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                    Destination: {result.destination}
                  </span>
                </div>
              </div>

              {result.chargingStops.length > 0 && (
                <div className="mt-6 space-y-4">
                  {result.chargingStops.map((stop, index) => (
                    <div key={stop.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-primary">STOP {index + 1}</p>
                          <h4 className="font-display text-base font-semibold text-foreground">{stop.name}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">{stop.address}</p>
                        </div>
                        <div className="flex gap-2">
                          {stop.isFastCharger && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                              Fast (50+ kW)
                            </span>
                          )}
                          {stop.isSolarPreferred && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-station-available/10 px-2.5 py-1 text-xs font-semibold text-station-available">
                              <Sun className="h-3 w-3" /> ☀️ Solar Powered - Cheaper Charging
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">Power</div>
                          <div className="font-display text-sm font-bold text-foreground">{stop.powerKw} kW</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">From Route</div>
                          <div className="font-display text-sm font-bold text-foreground">
                            {stop.distanceFromRouteKm} km
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">From Start</div>
                          <div className="font-display text-sm font-bold text-foreground">
                            {stop.distanceFromStartKm} km
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">Energy Source</div>
                          <div className="font-display text-sm font-bold text-foreground">
                            {stop.energySource}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">Estimated Cost</div>
                          <div className="font-display text-sm font-bold text-foreground">
                            Rs.{stop.estimatedChargingCostInr}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">Tariff</div>
                          <div className="font-display text-sm font-bold text-foreground">
                            Rs.{stop.estimatedUnitPriceInr}/kWh
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.requiresCharging && result.chargingStops.length === 0 && (
                <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Route requires charging, but no suitable chargers were found on the route.
                </div>
              )}

              {result.routeGeometry.length > 1 && (
                <TripMap
                  start={{
                    lat: result.startCoordinate.lat,
                    lon: result.startCoordinate.lng,
                  }}
                  destination={{
                    lat: result.destinationCoordinate.lat,
                    lon: result.destinationCoordinate.lng,
                  }}
                  routeCoords={result.routeGeometry.map(
                    (coord) => [coord.lng, coord.lat] as [number, number],
                  )}
                  chargingStops={result.chargingStops.map((stop) => ({
                    name: stop.name,
                    lat: stop.latitude,
                    lon: stop.longitude,
                    powerKW: stop.powerKw,
                    operator: undefined,
                  }))}
                />
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TripPlanner;
