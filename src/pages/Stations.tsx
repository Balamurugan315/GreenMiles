import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, Filter, Navigation, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OPEN_CHARGE_MAP_ATTRIBUTION,
  fetchNearbyChargingStations,
  type OcmStation,
} from "@/services/openChargeMapService";
import { type ConnectorType, type Station, type StationStatus, type StationType } from "@/data/stations";

const DEFAULT_LOCATION = { lat: 26.9124, lng: 75.7873 };
const SEARCH_SCOPE_KM = 500;
const TOP_STATIONS_LIMIT = 10;
const FAST_CHARGER_MIN_KW = 50;

const statusColors: Record<StationStatus, string> = {
  available: "#2cb867",
  busy: "#e6a817",
  offline: "#dc3545",
};

const createIcon = (station: Station) => {
  const color = statusColors[station.status];
  const symbol = station.type === "ev" ? "EV" : "CNG";

  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">${symbol}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
};

const MiniNearestMap = ({ station }: { station: Station }) => {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={[station.lat, station.lng]}
        zoom={15}
        className="h-40 w-full"
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[station.lat, station.lng]} />
      </MapContainer>
    </div>
  );
};

const getCurrentPosition = (): Promise<{
  latitude: number;
  longitude: number;
  usedFallback: boolean;
}> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: DEFAULT_LOCATION.lat,
        longitude: DEFAULT_LOCATION.lng,
        usedFallback: true,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          usedFallback: false,
        });
      },
      () => {
        resolve({
          latitude: DEFAULT_LOCATION.lat,
          longitude: DEFAULT_LOCATION.lng,
          usedFallback: true,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
};

const toConnectorType = (value: string): ConnectorType => {
  const normalized = value.toLowerCase();

  if (normalized.includes("ccs")) return "CCS2";
  if (normalized.includes("chademo")) return "CHAdeMO";
  if (normalized.includes("gbt")) return "GBT";

  return "Type2";
};

const toAppStation = (station: OcmStation, index: number): Station => {
  const type: StationType = "ev";
  const safeId = station.id.replace(/[^a-zA-Z0-9_-]/g, "-");

  return {
    id: `${type}-${safeId}-${index}`,
    name: station.name,
    type,
    status: "available",
    lat: station.latitude,
    lng: station.longitude,
    address: station.address,
    distance: Number(station.distanceKm.toFixed(1)),
    travelTime: Math.max(1, Math.round(station.distanceKm * 3)),
    waitTime: 0,
    connectors:
      station.connections.length > 0
        ? station.connections.map((connection) => ({
            type: toConnectorType(connection.type),
            power: `${connection.powerKw || 0} kW`,
            available: true,
          }))
        : [{ type: "Type2", power: "Unknown", available: true }],
    cngAvailable: undefined,
    lastUpdated: "Live Open Charge Map data",
    reportCount: 0,
    rating: 4,
    energySource: station.energySource,
    pricePerKwh:
      station.energySource === "solar" ? 8 : station.energySource === "hybrid" ? 10 : 12,
    gridPricePerKwh: 12,
  };
};

const StatusBadge = ({ status }: { status: StationStatus }) => {
  const classes: Record<StationStatus, string> = {
    available: "bg-station-available text-primary-foreground",
    busy: "bg-station-busy text-primary-foreground",
    offline: "bg-station-offline text-primary-foreground",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const StationCard = ({ station }: { station: Station }) => {
  const maxPower = Math.max(
    ...(station.connectors?.map((connector) => {
      const parsed = Number.parseFloat(connector.power.replace("kW", "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }) ?? [0]),
  );

  return (
    <Link
      to={`/station/${station.id}`}
      className="group flex gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Zap className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-sm font-semibold text-foreground">{station.name}</h3>
          <StatusBadge status={station.status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{station.address}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Navigation className="h-3 w-3" /> {station.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {station.travelTime} min
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" /> {maxPower} kW
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-station-busy" /> {station.rating}
          </span>
        </div>
      </div>
      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
};

const Stations = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [typeFilter, setTypeFilter] = useState<StationType | "all">("all");
  const [fastOnly, setFastOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastFetchKeyRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    const loadLocation = async () => {
      const position = await getCurrentPosition();
      if (cancelled) return;

      setLocation({ latitude: position.latitude, longitude: position.longitude });
      setMapCenter([position.latitude, position.longitude]);
      setLocationNotice(
        position.usedFallback
          ? "Location access unavailable. Showing chargers near default location."
          : null,
      );
    };

    loadLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStations = async () => {
      if (!location) return;

      const fetchKey = `${location.latitude.toFixed(4)}:${location.longitude.toFixed(4)}:${SEARCH_SCOPE_KM}`;
      if (lastFetchKeyRef.current === fetchKey) return;
      lastFetchKeyRef.current = fetchKey;

      try {
        setLoading(true);
        setError(null);

        const apiStations = await fetchNearbyChargingStations({
          latitude: location.latitude,
          longitude: location.longitude,
          distanceKm: SEARCH_SCOPE_KM,
          maxResults: 100,
        });
        if (cancelled) return;

        const mapped = apiStations
          .map((station, index) => toAppStation(station, index))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, TOP_STATIONS_LIMIT);

        setStations(mapped);

        if (mapped.length > 0) {
          sessionStorage.setItem("liveStations", JSON.stringify(mapped));
        } else {
          sessionStorage.removeItem("liveStations");
        }
      } catch (loadError) {
        if (cancelled) return;

        setStations([]);
        setError("Unable to load nearby EV charging stations right now. Please try again.");
        sessionStorage.removeItem("liveStations");
        console.error("Open Charge Map load failed:", loadError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStations();

    return () => {
      cancelled = true;
    };
  }, [location]);

  const filtered = useMemo(() => {
    return stations
      .filter((station) => typeFilter === "all" || station.type === typeFilter)
      .filter((station) => {
        if (!fastOnly) return true;

        const maxPowerKw = Math.max(
          ...(station.connectors?.map((connector) => {
            const parsed = Number.parseFloat(connector.power.replace("kW", "").trim());
            return Number.isFinite(parsed) ? parsed : 0;
          }) ?? [0]),
        );

        return maxPowerKw >= FAST_CHARGER_MIN_KW;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [stations, typeFilter, fastOnly]);

  const nearest = filtered.find((station) => station.status === "available");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="sticky top-0 z-[1000] border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">GreenMiles</span>
          </Link>
          <Button variant="hero" size="sm" asChild>
            <Link to="/emergency">Emergency</Link>
          </Button>
        </div>
      </nav>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex w-full flex-col border-r border-border lg:w-96">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4" /> Filters
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "ev"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    typeFilter === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {type === "all" ? "All" : "EV"}
                </button>
              ))}

              <button
                onClick={() => setFastOnly((value) => !value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  fastOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Fast (50+ kW)
              </button>
            </div>
          </div>

          {nearest && (
            <div className="border-b border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary">
                NEAREST AVAILABLE - {nearest.travelTime} min away
              </p>
              <p className="mt-1 font-display text-sm font-bold text-foreground">{nearest.name}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="hero" size="sm" asChild>
                  <Link to={`/station/${nearest.id}`}>
                    Details <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Navigate
                  </a>
                </Button>
              </div>
              <MiniNearestMap station={nearest} />
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading && (
              <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                Loading nearby EV charging stations from Open Charge Map...
              </div>
            )}

            {locationNotice && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {locationNotice}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {error}
              </div>
            )}

            {!loading && filtered.map((station) => <StationCard key={station.id} station={station} />)}

            {!loading && filtered.length === 0 && !error && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No charging stations found near your location.
              </div>
            )}

            <p className="pt-2 text-xs text-muted-foreground">{OPEN_CHARGE_MAP_ATTRIBUTION}</p>
          </div>
        </div>

        <div className="relative flex-1" style={{ minHeight: "400px" }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-full w-full"
            style={{ minHeight: "400px", height: "100%" }}
            zoomControl={false}
          >
            <RecenterMap center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((station) => (
              <Marker key={station.id} position={[station.lat, station.lng]} icon={createIcon(station)}>
                <Popup>
                  <div className="min-w-[200px]">
                    <p className="font-bold">{station.name}</p>
                    <p className="text-sm text-muted-foreground">{station.address}</p>
                    <p className="mt-1 text-sm">
                      Distance: <strong>{station.distance} km</strong>
                    </p>
                    <p className="text-sm">Travel: {station.travelTime} min</p>
                    <Link
                      to={`/station/${station.id}`}
                      className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      View Details -&gt;
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default Stations;
