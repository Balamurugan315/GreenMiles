import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

export type TripMapProps = {
  start: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  // OpenRouteService returns [longitude, latitude]
  routeCoords: Array<[number, number]>;
  chargingStops: Array<{
    name: string;
    lat: number;
    lon: number;
    powerKW: number;
    operator?: string;
  }>;
};

const startIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const chargerIcon = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)">⚡</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const fastChargerIcon = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:50%;background:#f59e0b;color:#111827;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)">⚡</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const FitBounds = ({ bounds }: { bounds: LatLngBoundsExpression }) => {
  const map = useMap();

  useEffect(() => {
    // Re-fit whenever route/stops/start/destination changes.
    map.fitBounds(bounds, {
      padding: [30, 30],
      animate: true,
      duration: 0.7,
    });
  }, [bounds, map]);

  return null;
};

const TripMap = ({ start, destination, routeCoords, chargingStops }: TripMapProps) => {
  // Convert ORS [lon, lat] -> Leaflet [lat, lon] for polyline rendering.
  const routeLatLng = useMemo<LatLngExpression[]>(
    () =>
      routeCoords
        .filter((coord) => Array.isArray(coord) && coord.length === 2)
        .map(([lon, lat]) => [lat, lon]),
    [routeCoords],
  );

  const startPos = useMemo<LatLngExpression>(() => [start.lat, start.lon], [start]);
  const destinationPos = useMemo<LatLngExpression>(
    () => [destination.lat, destination.lon],
    [destination],
  );

  const stopPositions = useMemo<LatLngExpression[]>(
    () => chargingStops.map((stop) => [stop.lat, stop.lon]),
    [chargingStops],
  );

  const bounds = useMemo<LatLngBoundsExpression>(() => {
    const points: LatLngExpression[] = [startPos, destinationPos, ...stopPositions];
    if (routeLatLng.length > 1) {
      points.push(...routeLatLng);
    }
    return points;
  }, [startPos, destinationPos, stopPositions, routeLatLng]);

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={startPos}
        zoom={8}
        style={{ height: 420, width: "100%" }}
        scrollWheelZoom
      >
        <FitBounds bounds={bounds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={startPos} icon={startIcon}>
          <Popup>Start Location</Popup>
        </Marker>

        <Marker position={destinationPos} icon={destinationIcon}>
          <Popup>Destination</Popup>
        </Marker>

        {routeLatLng.length > 1 && (
          <Polyline positions={routeLatLng} pathOptions={{ color: "#2563eb", weight: 4 }} />
        )}

        {chargingStops.map((stop, index) => (
          <Marker
            key={`${stop.name}-${stop.lat}-${stop.lon}-${index}`}
            position={[stop.lat, stop.lon]}
            icon={stop.powerKW >= 50 ? fastChargerIcon : chargerIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold">{stop.name}</p>
                <p className="text-sm text-muted-foreground">{stop.powerKW} kW</p>
                <p className="text-sm text-muted-foreground">
                  {stop.operator?.trim() || "Operator unavailable"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default TripMap;
