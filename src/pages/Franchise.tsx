import { Link } from "react-router-dom";
import { ArrowLeft, TrendingDown, Building, Users, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const comparison = [
  { feature: "Setup Cost", centralized: "₹50–80 Lakhs", distributed: "₹8–15 Lakhs" },
  { feature: "Per kWh Cost to User", centralized: "₹18–22", distributed: "₹12–14" },
  { feature: "Coverage Density", centralized: "1 per 5 km²", distributed: "1 per 1.5 km²" },
  { feature: "Avg. Wait Time", centralized: "20–30 min", distributed: "5–8 min" },
  { feature: "Utilization Rate", centralized: "Peak-only (30%)", distributed: "Spread (65%)" },
  { feature: "Scalability", centralized: "Slow (permits, land)", distributed: "Fast (plug-n-play)" },
];

const benefits = [
  { icon: TrendingDown, title: "30–40% Lower Costs", desc: "Distributed model reduces per-unit charging cost significantly" },
  { icon: Building, title: "Franchise Opportunities", desc: "Local businesses can host charging stations with low investment" },
  { icon: Users, title: "Community Powered", desc: "Shops, malls, and parking lots become charging hubs" },
  { icon: Zap, title: "Better Grid Utilization", desc: "Spread demand across the city, reducing grid strain" },
];

const Franchise = () => (
  <div className="min-h-screen bg-background">
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </Button>
        <span className="font-display text-sm font-semibold text-foreground">Franchise & Cost Model</span>
      </div>
    </nav>

    <div className="container mx-auto max-w-5xl px-4 py-12">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="text-center">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Distributed Franchise Model
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          How a decentralized network of micro-charging stations can reduce costs by 30–40% 
          and eliminate infrastructure bottlenecks in Indian cities.
        </p>
      </motion.div>

      {/* Benefits */}
      <motion.div
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
      >
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            variants={fadeUp}
            custom={i + 1}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <b.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">{b.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Comparison Table */}
      <motion.div
        className="mt-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={0}
      >
        <h2 className="mb-6 text-center font-display text-2xl font-bold text-foreground">
          Centralized vs Distributed Pricing
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Feature</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Centralized</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-primary">Distributed (Ours)</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                  <td className="px-6 py-3.5 text-sm font-medium text-foreground">{row.feature}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{row.centralized}</td>
                  <td className="px-6 py-3.5 text-sm font-medium text-primary">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> {row.distributed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl bg-gradient-hero p-10 text-center">
        <h2 className="font-display text-2xl font-bold text-primary-foreground">
          Interested in Hosting a Charging Station?
        </h2>
        <p className="mt-3 text-primary-foreground/80">
          Start with as low as ₹8 Lakhs. We handle tech, maintenance, and customer acquisition.
        </p>
        <Button variant="outline" size="lg" className="mt-6 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
          Contact Our Franchise Team
        </Button>
      </div>
    </div>
  </div>
);

export default Franchise;
