export type StationStatus = "available" | "busy" | "offline";
export type StationType = "ev" | "cng";
export type ConnectorType = "CCS2" | "CHAdeMO" | "Type2" | "GBT";
export type EnergySource = "solar" | "grid" | "hybrid";

export interface Station {
  id: string;
  name: string;
  type: StationType;
  status: StationStatus;
  lat: number;
  lng: number;
  address: string;
  distance: number; // km
  travelTime: number; // minutes
  waitTime: number; // minutes
  connectors?: { type: ConnectorType; power: string; available: boolean }[];
  cngAvailable?: boolean;
  lastUpdated: string;
  reportCount: number;
  rating: number;
  energySource?: EnergySource;
  pricePerKwh?: number; // ₹ per kWh
  gridPricePerKwh?: number; // ₹ per kWh for comparison
}

export const evModels = [
  { name: "Tata Nexon EV", range: 312 },
  { name: "Tata Tiago EV", range: 315 },
  { name: "MG ZS EV", range: 461 },
  { name: "Hyundai Ioniq 5", range: 631 },
  { name: "Mahindra XUV400", range: 456 },
  { name: "BYD Atto 3", range: 521 },
  { name: "Citroen eC3", range: 320 },
  { name: "Custom (enter range)", range: 0 },
];

export const mockStations: Station[] = [
  {
    id: "ev-001",
    name: "GreenCharge Hub - MG Road",
    type: "ev",
    status: "available",
    lat: 26.9124,
    lng: 75.7873,
    address: "MG Road, Near City Mall, Jaipur",
    distance: 0.8,
    travelTime: 2,
    waitTime: 0,
    connectors: [
      { type: "CCS2", power: "50 kW", available: true },
      { type: "Type2", power: "22 kW", available: true },
      { type: "CHAdeMO", power: "50 kW", available: false },
    ],
    lastUpdated: "2 min ago",
    reportCount: 142,
    rating: 4.5,
    energySource: "solar",
    pricePerKwh: 8,
    gridPricePerKwh: 14,
  },
  {
    id: "ev-002",
    name: "TataPower EZ Charge - Vaishali Nagar",
    type: "ev",
    status: "busy",
    lat: 26.9225,
    lng: 75.7400,
    address: "Vaishali Nagar, Near D-Block, Jaipur",
    distance: 1.5,
    travelTime: 4,
    waitTime: 12,
    connectors: [
      { type: "CCS2", power: "60 kW", available: false },
      { type: "Type2", power: "22 kW", available: false },
    ],
    lastUpdated: "5 min ago",
    reportCount: 89,
    rating: 3.8,
    energySource: "grid",
    pricePerKwh: 14,
    gridPricePerKwh: 14,
  },
  {
    id: "cng-001",
    name: "IndianOil CNG - Tonk Road",
    type: "cng",
    status: "available",
    lat: 26.8800,
    lng: 75.7900,
    address: "Tonk Road, Near Durgapura, Jaipur",
    distance: 1.2,
    travelTime: 3,
    waitTime: 5,
    cngAvailable: true,
    lastUpdated: "1 min ago",
    reportCount: 256,
    rating: 4.2,
  },
  {
    id: "cng-002",
    name: "Adani CNG Station - Mansarovar",
    type: "cng",
    status: "offline",
    lat: 26.8650,
    lng: 75.7600,
    address: "Mansarovar, Near Metro Station, Jaipur",
    distance: 2.8,
    travelTime: 7,
    waitTime: 0,
    cngAvailable: false,
    lastUpdated: "30 min ago",
    reportCount: 67,
    rating: 3.2,
  },
  {
    id: "ev-003",
    name: "Ather Grid - C-Scheme",
    type: "ev",
    status: "available",
    lat: 26.9050,
    lng: 75.8000,
    address: "C-Scheme, Near Raj Mandir, Jaipur",
    distance: 0.5,
    travelTime: 1,
    waitTime: 0,
    connectors: [
      { type: "Type2", power: "7.4 kW", available: true },
      { type: "GBT", power: "30 kW", available: true },
    ],
    lastUpdated: "Just now",
    reportCount: 198,
    rating: 4.7,
    energySource: "hybrid",
    pricePerKwh: 10,
    gridPricePerKwh: 14,
  },
  {
    id: "cng-003",
    name: "BPCL CNG - Ajmer Road",
    type: "cng",
    status: "busy",
    lat: 26.9300,
    lng: 75.7500,
    address: "Ajmer Road, Near Bus Stand, Jaipur",
    distance: 2.1,
    travelTime: 5,
    waitTime: 18,
    cngAvailable: true,
    lastUpdated: "8 min ago",
    reportCount: 134,
    rating: 3.5,
  },
  {
    id: "ev-004",
    name: "ChargeZone - Malviya Nagar",
    type: "ev",
    status: "available",
    lat: 26.8550,
    lng: 75.8100,
    address: "Malviya Nagar, Main Road, Jaipur",
    distance: 1.8,
    travelTime: 4,
    waitTime: 0,
    connectors: [
      { type: "CCS2", power: "120 kW", available: true },
      { type: "CHAdeMO", power: "50 kW", available: true },
      { type: "Type2", power: "22 kW", available: true },
    ],
    lastUpdated: "3 min ago",
    reportCount: 210,
    rating: 4.6,
    energySource: "solar",
    pricePerKwh: 7.5,
    gridPricePerKwh: 14,
  },
  {
    id: "ev-005",
    name: "Statiq Charge Point - Sodala",
    type: "ev",
    status: "busy",
    lat: 26.9200,
    lng: 75.7700,
    address: "Sodala, Near Flyover, Jaipur",
    distance: 1.0,
    travelTime: 3,
    waitTime: 8,
    connectors: [
      { type: "CCS2", power: "50 kW", available: false },
      { type: "Type2", power: "22 kW", available: true },
    ],
    lastUpdated: "6 min ago",
    reportCount: 95,
    rating: 4.0,
    energySource: "hybrid",
    pricePerKwh: 11,
    gridPricePerKwh: 14,
  },
  {
    id: "ev-006",
    name: "SolarGrid Station - Jagatpura",
    type: "ev",
    status: "available",
    lat: 26.8450,
    lng: 75.8300,
    address: "Jagatpura, Near IT Park, Jaipur",
    distance: 3.5,
    travelTime: 8,
    waitTime: 0,
    connectors: [
      { type: "CCS2", power: "150 kW", available: true },
      { type: "Type2", power: "22 kW", available: true },
      { type: "CHAdeMO", power: "50 kW", available: true },
    ],
    lastUpdated: "1 min ago",
    reportCount: 78,
    rating: 4.8,
    energySource: "solar",
    pricePerKwh: 7,
    gridPricePerKwh: 14,
  },
  {
    id: "ev-007",
    name: "PowerGrid Fast Charge - Sitapura",
    type: "ev",
    status: "available",
    lat: 26.8200,
    lng: 75.8400,
    address: "Sitapura Industrial Area, Jaipur",
    distance: 5.2,
    travelTime: 12,
    waitTime: 0,
    connectors: [
      { type: "CCS2", power: "60 kW", available: true },
      { type: "GBT", power: "30 kW", available: true },
    ],
    lastUpdated: "4 min ago",
    reportCount: 45,
    rating: 4.1,
    energySource: "grid",
    pricePerKwh: 13,
    gridPricePerKwh: 14,
  },
];
