import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Battery, MapPin, Phone, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Emergency = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", location: "", vehicle: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Home</Link>
          </Button>
          <span className="font-display text-sm font-semibold text-foreground">Emergency Portable Charging</span>
        </div>
      </nav>

      <div className="container mx-auto max-w-2xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <Battery className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Battery Empty?</h1>
            <p className="mt-2 text-muted-foreground">
              Request a portable EV charger to your location. Our nearest service partner will reach you within 15–30 minutes.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
              {[
                { label: "Your Name", key: "name", placeholder: "Enter your full name", type: "text" },
                { label: "Phone Number", key: "phone", placeholder: "+91 XXXXX XXXXX", type: "tel" },
                { label: "Current Location", key: "location", placeholder: "Landmark or GPS link", type: "text" },
                { label: "Vehicle Model", key: "vehicle", placeholder: "e.g., Tata Nexon EV", type: "text" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{field.label}</label>
                  <input
                    type={field.type}
                    required
                    placeholder={field.placeholder}
                    value={formData[field.key as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              ))}
              <Button variant="emergency" size="lg" className="w-full" type="submit">
                <Phone className="h-5 w-5" /> Request Portable Charger
              </Button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center"
            >
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Help is on the way!</h2>
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-lg bg-card p-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Estimated Arrival</p>
                    <p className="text-lg font-bold text-primary">18 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-card p-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Service Partner</p>
                    <p className="text-sm text-muted-foreground">QuickCharge India - Unit #JR-42</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-card p-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Contact</p>
                    <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                  </div>
                </div>
              </div>
              <Button variant="hero" className="mt-6" asChild>
                <Link to="/stations">Browse Nearby Stations</Link>
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Emergency;
