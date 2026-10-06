import { Scenario, ScenarioParameter, SimulationResult } from "../types/isie";

export const DEFAULT_SIMULATION_PARAMETERS: ScenarioParameter[] = [
  {
    id: "param-rainfall",
    key: "rainfall_intensity",
    name: "Precipitation Surge Factor",
    category: "METEOROLOGICAL",
    unit: "%",
    min: 0,
    max: 200,
    step: 5,
    defaultValue: 50,
    currentValue: 50,
    description: "Multiplication coefficient above normal monsoon 24-hr threshold",
  },
  {
    id: "param-dam-discharge",
    key: "dam_discharge_cumecs",
    name: "Upstream Dam Outflow Surge",
    category: "HYDROLOGICAL",
    unit: "cumecs",
    min: 1000,
    max: 25000,
    step: 500,
    defaultValue: 5000,
    currentValue: 5000,
    description: "Peak volume discharge rate into downstream river channels",
  },
  {
    id: "param-road-breach",
    key: "road_cutoff_prob",
    name: "Arterial Road Cutoff Probability",
    category: "INFRASTRUCTURE",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 35,
    currentValue: 35,
    description: "Likelihood of bridges or low-lying road segments becoming impassable",
  },
  {
    id: "param-shelter-deficit",
    key: "shelter_capacity_buffer",
    name: "Safe Shelter Capacity Buffer",
    category: "CAPACITY",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 20,
    currentValue: 20,
    description: "Reserve space buffer in designated relief shelters prior to saturation",
  },
];

export interface IScenarioService {
  getAvailableScenarios(): Promise<Scenario[]>;
  runSimulation(scenarioId: string, parameters: ScenarioParameter[], mode?: "DEMO" | "LIVE"): Promise<{
    connected: boolean;
    statusMessage: string;
    result?: SimulationResult;
  }>;
}

export class ScenarioService implements IScenarioService {
  async getAvailableScenarios(): Promise<Scenario[]> {
    return [
      {
        id: "scen-monsoon-surge",
        name: "Scenario A: Flash Flood & Upstream Reservoir Surcharge",
        targetRegion: "Northern Sector & Glacial Basin",
        description: "Simulates severe precipitation combined with sudden spillway release on vulnerable habitations.",
        horizonHours: 24,
        parameters: DEFAULT_SIMULATION_PARAMETERS,
        status: "READY",
      },
      {
        id: "scen-landslide-cascade",
        name: "Scenario B: Slope Failure & Transport Corridor Severance",
        targetRegion: "Himalayan Belt",
        description: "Evaluates habitation isolation when arterial highway cutoffs exceed critical thresholds.",
        horizonHours: 48,
        parameters: DEFAULT_SIMULATION_PARAMETERS,
        status: "READY",
      },
      {
        id: "scen-cyclone-surge",
        name: "Scenario C: Coastal Storm Surge & Saline Inundation",
        targetRegion: "Coastal & Cyclone Surge Corridor",
        description: "Calculates carrying capacity collapse and urgent relocation priority for low-lying coastal habitations.",
        horizonHours: 72,
        parameters: DEFAULT_SIMULATION_PARAMETERS,
        status: "READY",
      },
    ];
  }

  async runSimulation(
    scenarioId: string,
    parameters: ScenarioParameter[],
    mode: "DEMO" | "LIVE" = "DEMO"
  ): Promise<{ connected: boolean; statusMessage: string; result?: SimulationResult }> {
    if (mode === "LIVE") {
      return {
        connected: false,
        statusMessage: "Live simulation is not connected. No operational model, forecast, or decision output is generated.",
      };
    }

    const scenario = (await this.getAvailableScenarios()).find((item) => item.id === scenarioId);
    if (!scenario) {
      return { connected: false, statusMessage: "Unknown simulation scenario." };
    }

    const value = (key: string, fallback: number) =>
      parameters.find((parameter) => parameter.key === key)?.currentValue ?? fallback;

    // Deterministic tabletop arithmetic only. These coefficients are deliberately
    // illustrative and must never be interpreted as forecasts or validated risk estimates.
    const rainfall = value("rainfall_intensity", 50);
    const discharge = value("dam_discharge_cumecs", 5000);
    const roadCutoff = value("road_cutoff_prob", 35);
    const shelterBuffer = value("shelter_capacity_buffer", 20);
    const stress = Math.max(0, Math.min(3,
      rainfall / 100 + discharge / 20000 + roadCutoff / 100 + (100 - shelterBuffer) / 100
    ));
    const horizonFactor = scenario.horizonHours / 24;
    const redZone = Number((stress * 1.8 * horizonFactor).toFixed(1));
    const habitations = Math.round(stress * 3 * horizonFactor);
    const shelterHours = Number(Math.max(1, 18 / Math.max(0.5, stress * horizonFactor)).toFixed(1));
    const waterHours = Number(Math.max(1, 24 / Math.max(0.5, stress * horizonFactor)).toFixed(1));
    const severedRoutes = Math.max(0, Math.min(12, Math.round(stress * 2)));
    const relocationDelta = Number(Math.min(100, stress * 18 * horizonFactor).toFixed(1));
    const risk = Math.min(99, Math.round(35 + stress * 20));

    return {
      connected: true,
      statusMessage: "Local tabletop simulation completed. Output is hypothetical, deterministic, and not decision-grade.",
      result: {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        computedAt: new Date().toISOString(),
        hazardZoneShift: { additionalRedZoneSqKm: redZone, newlyVulnerableHabitations: habitations },
        carryingCapacityBreach: {
          shelterExhaustionHours: shelterHours,
          waterReserveExhaustionHours: waterHours,
          severedRoutesCount: severedRoutes,
        },
        relocationLoadDeltaPercentage: relocationDelta,
        confidenceInterval: { minRisk: Math.max(0, risk - 10), maxRisk: Math.min(100, risk + 10) },
      },
    };
  }
}

export const scenarioService = new ScenarioService();
