import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import Index from "@/pages/Index";
import Stations from "@/pages/Stations";
import StationDetail from "@/pages/StationDetail";
import Emergency from "@/pages/Emergency";
import Franchise from "@/pages/Franchise";
import TripPlanner from "@/pages/TripPlanner";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter
          future={{
            // Opt in to v7 behavior early to remove future flag warnings.
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Toaster />
          <Sonner />

          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/station/:id" element={<StationDetail />} />
            <Route path="/trip-planner" element={<TripPlanner />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/franchise" element={<Franchise />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
