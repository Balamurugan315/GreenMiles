import { useParams, Link } from "react-router-dom";
import { Zap, Fuel, MapPin, Clock, Star, ArrowLeft, Users, AlertTriangle, CheckCircle, XCircle, ThumbsUp, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockStations, type Station, type StationStatus } from "@/data/stations";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const StatusBadge = ({ status }: { status: StationStatus }) => {
  const classes: Record<StationStatus, string> = {
    available: "bg-station-available text-primary-foreground",
    busy: "bg-station-busy text-primary-foreground",
    offline: "bg-station-offline text-primary-foreground",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${classes[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const communityReports = [
  { user: "Rahul M.", time: "2 min ago", report: "All chargers working, no queue!", type: "positive" as const },
  { user: "Priya S.", time: "15 min ago", report: "CCS2 charger is a bit slow today", type: "neutral" as const },
  { user: "Amit K.", time: "1 hour ago", report: "Quick charge, in and out in 20 min", type: "positive" as const },
];

const StationDetail = () => {
  const { id } = useParams();
  const [reported, setReported] = useState(false);

  const station = useMemo(() => {
    const liveStationsRaw = sessionStorage.getItem("liveStations");

    let liveStations: Station[] = [];
    if (liveStationsRaw) {
      try {
        liveStations = JSON.parse(liveStationsRaw) as Station[];
      } catch {
        liveStations = [];
      }
    }

    return [...liveStations, ...mockStations].find((s) => s.id === id);
  }, [id]);

  if (!station) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Station not found</h1>
          <Button variant="hero" className="mt-4" asChild>
            <Link to="/stations">Back to Stations</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/stations"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <span className="font-display text-sm font-semibold text-foreground">{station.name}</span>
        </div>
      </nav>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${station.type === "ev" ? "bg-primary/10" : "bg-secondary/10"}`}>
                {station.type === "ev" ? <Zap className="h-8 w-8 text-primary" /> : <Fuel className="h-8 w-8 text-secondary" />}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{station.name}</h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {station.address}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <StatusBadge status={station.status} />
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-station-busy" /> {station.rating}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {station.reportCount} reports
                  </span>
                </div>
              </div>
            </div>
          </div>

          {station.energySource && station.type === "ev" && (
            <div className={`mt-6 flex items-center gap-3 rounded-xl p-4 ${
              station.energySource === "solar"
                ? "border border-station-available/30 bg-station-available/5"
                : station.energySource === "hybrid"
                ? "border border-accent/30 bg-accent/5"
                : "border border-border bg-muted/50"
            }`}>
              <Sun className={`h-6 w-6 ${station.energySource === "solar" ? "text-station-available" : station.energySource === "hybrid" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className={`font-display text-sm font-bold ${station.energySource === "solar" ? "text-station-available" : station.energySource === "hybrid" ? "text-accent" : "text-muted-foreground"}`}>
                  {station.energySource === "solar" ? "Solar-powered station" : station.energySource === "hybrid" ? "Hybrid (solar + grid)" : "Grid-powered"}
                </p>
                {station.energySource === "solar" && station.pricePerKwh && station.gridPricePerKwh && (
                  <p className="text-xs text-muted-foreground">
                    This station uses solar energy. Charging here costs {Math.round(((station.gridPricePerKwh - station.pricePerKwh) / station.gridPricePerKwh) * 100)}% less - Rs.{station.pricePerKwh}/kWh vs Rs.{station.gridPricePerKwh}/kWh grid price.
                  </p>
                )}
                {station.energySource === "hybrid" && station.pricePerKwh && station.gridPricePerKwh && (
                  <p className="text-xs text-muted-foreground">
                    Partially solar-powered. Rs.{station.pricePerKwh}/kWh - Save Rs.{station.gridPricePerKwh - station.pricePerKwh}/kWh vs grid.
                  </p>
                )}
              </div>
              {station.pricePerKwh && (
                <div className="text-right">
                  <div className="font-display text-lg font-bold text-foreground">Rs.{station.pricePerKwh}</div>
                  <div className="text-xs text-muted-foreground">per kWh</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: "Distance", value: `${station.distance} km`, icon: MapPin },
              { label: "Travel Time", value: `${station.travelTime} min`, icon: Clock },
              { label: "Wait Time", value: `${station.waitTime} min`, icon: Clock },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                <s.icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                <div className="font-display text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {station.connectors && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-foreground">Charger Compatibility</h2>
              <div className="mt-4 space-y-3">
                {station.connectors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{c.type}</p>
                        <p className="text-xs text-muted-foreground">{c.power}</p>
                      </div>
                    </div>
                    {c.available ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-station-available">
                        <CheckCircle className="h-4 w-4" /> Available
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium text-station-offline">
                        <XCircle className="h-4 w-4" /> In Use
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {station.type === "cng" && (
            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">CNG Availability</h2>
              <div className="mt-3 flex items-center gap-2">
                {station.cngAvailable ? (
                  <span className="flex items-center gap-2 text-lg font-medium text-station-available">
                    <CheckCircle className="h-5 w-5" /> Gas Available
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-lg font-medium text-station-offline">
                    <XCircle className="h-5 w-5" /> Gas Not Available
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Last updated: {station.lastUpdated}</p>
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Community Updates</h2>
              <span className="text-xs text-muted-foreground">Last updated: {station.lastUpdated}</span>
            </div>
            <div className="mt-4 space-y-3">
              {communityReports.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
                    {r.user[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{r.user}</span>
                      <span className="text-xs text-muted-foreground">{r.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.report}</p>
                  </div>
                  <ThumbsUp className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-primary" />
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {!reported ? (
                <>
                  <Button variant="default" size="sm" onClick={() => setReported(true)}>
                    <CheckCircle className="h-4 w-4" /> Mark Working
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setReported(true)}>
                    <AlertTriangle className="h-4 w-4" /> Report Issue
                  </Button>
                  <Button variant="cng" size="sm" onClick={() => setReported(true)}>
                    <Clock className="h-4 w-4" /> Report Long Queue
                  </Button>
                </>
              ) : (
                <p className="text-sm font-medium text-primary">Thank you for your report. Your feedback helps the community.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StationDetail;
