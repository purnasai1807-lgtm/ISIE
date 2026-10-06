export interface ResponseResource {
  id: string;
  name: string;
  category: "DISASTER_BATTALION" | "RELIEF_SHELTER" | "HEALTHCARE_UNIT" | "WATER_LOGISTICS" | "ENGINEERING";
  location: string;
  sector: string;
  totalCapacity: number;
  currentAllocated: number;
  status: "DEPLOYED" | "STANDBY" | "EN_ROUTE" | "SATURATED";
  contactCallsign: string;
  readinessPercentage: number;
  lastUpdated: string;
}

export const DEMO_RESOURCES: ResponseResource[] = [
  {
    id: "EXERCISE-RES-A",
    name: "Simulated rescue team A",
    category: "DISASTER_BATTALION",
    location: "Example site A (fictional)",
    sector: "Demo County (fictional)",
    totalCapacity: 10,
    currentAllocated: 0,
    status: "STANDBY",
    contactCallsign: "NONE — NOT CONNECTED",
    readinessPercentage: 0,
    lastUpdated: "SIMULATED EXERCISE TIME — NOT OBSERVED",
  },
  {
    id: "EXERCISE-RES-B",
    name: "Simulated rescue team B",
    category: "DISASTER_BATTALION",
    location: "Example site B (fictional)",
    sector: "Demo County (fictional)",
    totalCapacity: 8,
    currentAllocated: 0,
    status: "STANDBY",
    contactCallsign: "NONE — NOT CONNECTED",
    readinessPercentage: 0,
    lastUpdated: "SIMULATED EXERCISE TIME — NOT OBSERVED",
  },
  {
    id: "EXERCISE-SHELTER-A",
    name: "Example shelter A (fictional)",
    category: "RELIEF_SHELTER",
    location: "Example site C (fictional)",
    sector: "Demo County (fictional)",
    totalCapacity: 100,
    currentAllocated: 0,
    status: "STANDBY",
    contactCallsign: "NONE — NOT CONNECTED",
    readinessPercentage: 0,
    lastUpdated: "SIMULATED EXERCISE TIME — NOT OBSERVED",
  },
  {
    id: "EXERCISE-SHELTER-B",
    name: "Example shelter B (fictional)",
    category: "RELIEF_SHELTER",
    location: "Example site D (fictional)",
    sector: "Demo County (fictional)",
    totalCapacity: 80,
    currentAllocated: 0,
    status: "STANDBY",
    contactCallsign: "NONE — NOT CONNECTED",
    readinessPercentage: 0,
    lastUpdated: "SIMULATED EXERCISE TIME — NOT OBSERVED",
  },
  {
    id: "EXERCISE-MED-A",
    name: "Example medical unit A (fictional)",
    category: "HEALTHCARE_UNIT",
    location: "Example site E (fictional)",
    sector: "Demo County (fictional)",
    totalCapacity: 5,
    currentAllocated: 0,
    status: "STANDBY",
    contactCallsign: "NONE — NOT CONNECTED",
    readinessPercentage: 0,
    lastUpdated: "SIMULATED EXERCISE TIME — NOT OBSERVED",
  },
  {
    id: "EXERCISE-WATER-A",
    name: "Example water unit A (fictional)",
    category: "WATER_LOGISTICS",
    location: "Example site F (fictional)",
    sector: "Demo County (fictional)",
    totalCapacity: 20,
    currentAllocated: 0,
    status: "STANDBY",
    contactCallsign: "NONE — NOT CONNECTED",
    readinessPercentage: 0,
    lastUpdated: "SIMULATED EXERCISE TIME — NOT OBSERVED",
  },
];
