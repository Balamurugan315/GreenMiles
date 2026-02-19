import { useEffect, useState } from "react";
import { Zap, Fuel, MapPin, Clock, ChevronRight, Battery, Shield, TrendingDown, Users, AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const stats = [
  { value: "3 min", label: "Avg. station discovery", icon: Clock },
  { value: "40%", label: "Less waiting time", icon: TrendingDown },
  { value: "500+", label: "Stations mapped", icon: MapPin },
  { value: "10K+", label: "Active community", icon: Users },
];

const problems = [
  { icon: AlertTriangle, title: "Incompatible Chargers", desc: "30% of EV trips end at wrong charger type" },
  { icon: Clock, title: "Long Queue Times", desc: "Average 25-min wait during peak hours" },
  { icon: Fuel, title: "CNG Shortages", desc: "No real-time gas availability info" },
  { icon: Battery, title: "Range Anxiety", desc: "No emergency charging support nearby" },
];

const sdgs = [
  { number: 7, title: "Affordable & Clean Energy", desc: "Optimizing EV & CNG distribution to reduce energy waste" },
  { number: 11, title: "Sustainable Cities", desc: "Enabling smarter urban mobility for Indian cities" },
];

const heroSlides = ["/images1.jpeg", "/images2.jpeg", "/images3.jpeg", "/images4.jpeg"];

const Index = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">GreenMiles</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/stations" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Find Stations</Link>
            <Link to="/trip-planner" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Trip Planner</Link>
            <Link to="/emergency" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Emergency</Link>
            <Link to="/franchise" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Franchise</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="hero" size="lg" asChild>
              <Link to="/stations">
                <MapPin className="h-4 w-4" /> Find Station
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-14 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,197,94,0.14),transparent_45%),radial-gradient(circle_at_88%_18%,rgba(59,130,246,0.12),transparent_38%),linear-gradient(to_bottom,rgba(15,23,42,0.02),transparent)]" />
        <div className="container relative mx-auto px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Zap className="h-3.5 w-3.5" /> Smart Energy - Indian Cities
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
                Drive Farther With <span className="text-gradient-hero">Live EV Intelligence</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Real-time EV charging and CNG availability with route-aware planning so you avoid queues,
                incompatible ports, and range anxiety.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="hero" size="lg" className="h-14 px-8 text-base" asChild>
                  <Link to="/stations">
                    <MapPin className="h-5 w-5" /> Find Nearest Station
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="emergency" size="lg" className="h-14 px-8 text-base" asChild>
                  <Link to="/emergency">
                    <Battery className="h-5 w-5" /> Battery Empty? Get Help
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -left-6 -top-6 h-24 w-24 rounded-2xl bg-primary/15 blur-2xl" />
              <div className="absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-secondary/20 blur-3xl" />
              <div className="relative rounded-3xl border border-border/80 bg-card/90 p-4 shadow-card-hover backdrop-blur">
                <div className="relative">
                  <img
                    src={heroSlides[activeSlide]}
                    alt={`EV slide ${activeSlide + 1}`}
                    className="h-[320px] w-full rounded-2xl object-cover md:h-[420px]"
                  />
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                    {heroSlides.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          activeSlide === index ? "w-6 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/70 p-3">
                    <p className="text-xs text-muted-foreground">Avg. Discovery</p>
                    <p className="font-display text-xl font-bold text-foreground">3 min</p>
                  </div>
                  <div className="rounded-xl bg-muted/70 p-3">
                    <p className="text-xs text-muted-foreground">Mapped Stations</p>
                    <p className="font-display text-xl font-bold text-foreground">500+</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4"
            initial="hidden"
            animate="visible"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={i + 2}
                className="rounded-xl border border-border bg-card p-5 text-center shadow-card"
              >
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              The Urban Fuel Crisis
            </h2>
            <p className="mt-4 text-muted-foreground">
              Indian cities face massive inefficiencies in EV and CNG infrastructure.
              Drivers waste time, fuel, and patience every day.
            </p>
          </motion.div>
          <motion.div
            className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {problems.map((p, i) => (
              <motion.div
                key={p.title}
                variants={fadeUp}
                custom={i + 1}
                className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10">
                  <p.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Aligned with UN Sustainable Development Goals
            </h2>
          </motion.div>
          <motion.div
            className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {sdgs.map((sdg, i) => (
              <motion.div
                key={sdg.number}
                variants={fadeUp}
                custom={i + 1}
                className="flex items-start gap-5 rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-hero font-display text-xl font-bold text-primary-foreground">
                  {sdg.number}
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{sdg.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{sdg.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-hero p-10 text-center md:p-16">
            <Shield className="mx-auto mb-4 h-10 w-10 text-primary-foreground/80" />
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              Ready to Charge Smarter?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Join thousands of drivers across Indian cities who save time and avoid frustration every day.
            </p>
            <Button variant="outline" size="lg" className="mt-8 h-14 border-primary-foreground/30 bg-primary-foreground/10 px-8 text-base text-primary-foreground hover:bg-primary-foreground/20" asChild>
              <Link to="/stations">
                <MapPin className="h-5 w-5" /> Find Nearest Station Now
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">GreenMiles</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/stations" className="transition-colors hover:text-foreground">Stations</Link>
              <Link to="/trip-planner" className="transition-colors hover:text-foreground">Trip Planner</Link>
              <Link to="/emergency" className="transition-colors hover:text-foreground">Emergency</Link>
              <Link to="/franchise" className="transition-colors hover:text-foreground">Franchise</Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> Helpline: 1800-1900-2000
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-muted-foreground">
            (c) 2026 GreenMiles. Unified Urban Mobility Energy Intelligence Platform.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
