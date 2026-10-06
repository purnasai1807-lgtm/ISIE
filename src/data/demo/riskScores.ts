import { CarryingCapacityMetrics, HazardRedZone, RelocationIntelligence } from "@/lib/types/isie";

const NOT_ASSESSED = "SIMULATED EXERCISE TIME — NOT ASSESSED";
const NO_PROVIDER = ["Synthetic exercise fixture — no provider connected"];

export const DEMO_RED_ZONES: HazardRedZone[] = [
  {
    id: "EXERCISE-ZONE-A",
    zoneCode: "DEMO-ZONE-A",
    name: "Example exercise zone A (fictional)",
    classification: "SAFE_ZONE",
    hazardType: "FLOOD",
    district: "Demo County",
    state: "Exercise Region",
    coordinates: { lat: 0, lng: 0 },
    populationExposed: 0,
    carryingCapacityStatus: "SAFE",
    relocationPriorityScore: 0,
    lastAssessmentTimestamp: NOT_ASSESSED,
    sourceAgencies: NO_PROVIDER,
  },
  {
    id: "EXERCISE-ZONE-B",
    zoneCode: "DEMO-ZONE-B",
    name: "Example exercise zone B (fictional)",
    classification: "SAFE_ZONE",
    hazardType: "LANDSLIDE",
    district: "Demo County",
    state: "Exercise Region",
    coordinates: { lat: 0, lng: 0 },
    populationExposed: 0,
    carryingCapacityStatus: "SAFE",
    relocationPriorityScore: 0,
    lastAssessmentTimestamp: NOT_ASSESSED,
    sourceAgencies: NO_PROVIDER,
  },
  {
    id: "EXERCISE-ZONE-C",
    zoneCode: "DEMO-ZONE-C",
    name: "Example exercise zone C (fictional)",
    classification: "SAFE_ZONE",
    hazardType: "CYCLONE",
    district: "Demo County",
    state: "Exercise Region",
    coordinates: { lat: 0, lng: 0 },
    populationExposed: 0,
    carryingCapacityStatus: "SAFE",
    relocationPriorityScore: 0,
    lastAssessmentTimestamp: NOT_ASSESSED,
    sourceAgencies: NO_PROVIDER,
  },
];

export const DEMO_CARRYING_CAPACITY: CarryingCapacityMetrics = {
  zoneId: "EXERCISE-ZONE-A",
  populationExposure: {
    totalHabitationPopulation: 0,
    vulnerablePopulation: 0,
    currentShelterCapacity: 0,
    capacityDeficitPercentage: 0,
  },
  infrastructureIntegrity: {
    criticalRoadsOperational: 0,
    bridgesAtRiskCount: 0,
    substationRiskStatus: "SAFE",
    telecomTowersOperational: 0,
  },
  healthcareAvailability: {
    districtHospitalBedOccupancy: 0,
    mobileMedicalUnitsActive: 0,
    criticalMedicineSupplyDays: 0,
  },
  resourceReserves: {
    potableWaterHoursRemaining: 0,
    emergencyRationPacks: 0,
  },
  overallStatus: "SAFE",
};

export const DEMO_RELOCATION_PRIORITIES: RelocationIntelligence[] = [
  {
    zoneId: "EXERCISE-ZONE-A",
    zoneName: "Example exercise zone A (fictional)",
    priorityRank: 0,
    relocationPriorityScore: 0,
    estimatedTransitTimeHours: 0,
    evacuationRoutesIdentified: [
      {
        routeId: "EXERCISE-ROUTE-A",
        corridorName: "Example route A (fictional; not assessed)",
        status: "NOT_ASSESSED",
        clearanceBottlenecks: [],
      },
    ],
    designatedShelters: [
      {
        shelterId: "EXERCISE-SHELTER-A",
        name: "Example shelter A (fictional; not assessed)",
        maxCapacity: 0,
        currentLoad: 0,
        distanceKm: 0,
      },
    ],
  },
];
