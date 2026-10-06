"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Cpu,
  Play,
  Sliders,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Layers,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Users,
  Droplets,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { DEFAULT_SIMULATION_PARAMETERS } from "@/lib/services/scenarioService";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

type ScenarioType = "SCEN_A" | "SCEN_B" | "SCEN_C";
type HorizonType = "12H" | "24H" | "48H" | "72H";
type ChartViewMode = "COMPARISON_BAR" | "TRAJECTORY_AREA";

interface ScenarioBaseline {
  popAtRisk: number;
  hazardArea: number;
  roadCutoffs: number;
  shelterLoad: number;
  relocationIndex: number;
}

const SCENARIO_BASELINES: Record<ScenarioType, ScenarioBaseline> = {
  SCEN_A: {
    popAtRisk: 12,
    hazardArea: 1.2,
    roadCutoffs: 2,
    shelterLoad: 30,
    relocationIndex: 5,
  },
  SCEN_B: {
    popAtRisk: 8,
    hazardArea: 0.8,
    roadCutoffs: 1,
    shelterLoad: 25,
    relocationIndex: 4,
  },
  SCEN_C: {
    popAtRisk: 24,
    hazardArea: 2.4,
    roadCutoffs: 3,
    shelterLoad: 40,
    relocationIndex: 6,
  },
};

export default function ScenarioAnalysisPage() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("SCEN_A");
  const [params, setParams] = useState(DEFAULT_SIMULATION_PARAMETERS);
  const [horizon, setHorizon] = useState<HorizonType>("24H");
  const [isSimulated, setIsSimulated] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [chartView, setChartView] = useState<ChartViewMode>("COMPARISON_BAR");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleParamChange = (id: string, value: number) => {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, currentValue: value } : p))
    );
  };

  const handleResetParams = () => {
    setParams(DEFAULT_SIMULATION_PARAMETERS);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulated(true);
      setIsSimulating(false);
    }, 450);
  };

  // Derive parameters
  const precipVal = params.find((p) => p.id === "param-rainfall")?.currentValue ?? 50;
  const damVal = params.find((p) => p.id === "param-dam-discharge")?.currentValue ?? 5000;
  const roadVal = params.find((p) => p.id === "param-road-breach")?.currentValue ?? 35;
  const shelterVal = params.find((p) => p.id === "param-shelter-deficit")?.currentValue ?? 20;

  const horizonMultiplier = useMemo(() => {
    switch (horizon) {
      case "12H":
        return 0.82;
      case "24H":
        return 1.0;
      case "48H":
        return 1.28;
      case "72H":
        return 1.55;
      default:
        return 1.0;
    }
  }, [horizon]);

  const baseline = SCENARIO_BASELINES[selectedScenario];

  // What-If Computed Projections
  const whatIf = useMemo(() => {
    const damFactor = (damVal / 5000) * 28;
    const precipFactor = (precipVal / 50) * 32;
    const roadFactor = (roadVal / 35) * 22;

    const popAtRisk = Math.round(
      baseline.popAtRisk * (1 + (precipFactor + damFactor) / 100) * horizonMultiplier
    );

    const hazardArea = Number(
      (
        baseline.hazardArea *
        (1 + (precipFactor * 1.2 + damFactor * 0.9) / 100) *
        (horizonMultiplier * 0.92)
      ).toFixed(1)
    );

    const roadCutoffs = Math.max(
      1,
      Math.min(
        14,
        Math.round(baseline.roadCutoffs * (1 + roadFactor / 100) * (horizonMultiplier * 0.88))
      )
    );

    const shelterLoad = Math.min(
      100,
      Math.round(
        baseline.shelterLoad *
          (1 + (precipFactor * 0.4) / 100) *
          (1 + (100 - shelterVal) * 0.003) *
          (horizonMultiplier * 0.95)
      )
    );

    const relocationIndex = Math.min(
      99,
      Math.round(
        baseline.relocationIndex +
          (precipFactor * 0.18 + damFactor * 0.12 + roadFactor * 0.22) *
            (horizonMultiplier * 0.9)
      )
    );

    return {
      popAtRisk,
      hazardArea,
      roadCutoffs,
      shelterLoad,
      relocationIndex,
    };
  }, [baseline, precipVal, damVal, roadVal, shelterVal, horizonMultiplier]);

  // Recharts Comparison Bar Data
  const comparisonData = useMemo(() => {
    return [
      {
        metric: "Exercise Input A",
        unit: "toy units",
        Baseline: baseline.popAtRisk,
        WhatIf: whatIf.popAtRisk,
        rawBaseline: baseline.popAtRisk,
        rawWhatIf: whatIf.popAtRisk,
        delta: whatIf.popAtRisk - baseline.popAtRisk,
        deltaPct: Math.round(((whatIf.popAtRisk - baseline.popAtRisk) / baseline.popAtRisk) * 100),
      },
      {
        metric: "Hazard Area",
        unit: "toy area units",
        Baseline: baseline.hazardArea,
        WhatIf: whatIf.hazardArea,
        rawBaseline: baseline.hazardArea,
        rawWhatIf: whatIf.hazardArea,
        delta: Number((whatIf.hazardArea - baseline.hazardArea).toFixed(1)),
        deltaPct: Math.round(((whatIf.hazardArea - baseline.hazardArea) / baseline.hazardArea) * 100),
      },
      {
        metric: "Cutoff Routes",
        unit: "toy units",
        Baseline: baseline.roadCutoffs,
        WhatIf: whatIf.roadCutoffs,
        rawBaseline: baseline.roadCutoffs,
        rawWhatIf: whatIf.roadCutoffs,
        delta: whatIf.roadCutoffs - baseline.roadCutoffs,
        deltaPct: Math.round(((whatIf.roadCutoffs - baseline.roadCutoffs) / baseline.roadCutoffs) * 100),
      },
      {
        metric: "Shelter Load",
        unit: "illustrative points",
        Baseline: baseline.shelterLoad,
        WhatIf: whatIf.shelterLoad,
        rawBaseline: baseline.shelterLoad,
        rawWhatIf: whatIf.shelterLoad,
        delta: whatIf.shelterLoad - baseline.shelterLoad,
        deltaPct: Math.round(((whatIf.shelterLoad - baseline.shelterLoad) / baseline.shelterLoad) * 100),
      },
      {
        metric: "Reloc. Index",
        unit: "toy score",
        Baseline: baseline.relocationIndex,
        WhatIf: whatIf.relocationIndex,
        rawBaseline: baseline.relocationIndex,
        rawWhatIf: whatIf.relocationIndex,
        delta: whatIf.relocationIndex - baseline.relocationIndex,
        deltaPct: Math.round(((whatIf.relocationIndex - baseline.relocationIndex) / baseline.relocationIndex) * 100),
      },
    ];
  }, [baseline, whatIf]);

  // Recharts Trajectory Curve Data
  const trajectoryData = useMemo(() => {
    return [
      {
        time: "T+6H",
        Baseline: Math.round(baseline.popAtRisk * 0.72),
        WhatIf: Math.round(whatIf.popAtRisk * 0.68),
      },
      {
        time: "T+12H",
        Baseline: Math.round(baseline.popAtRisk * 0.85),
        WhatIf: Math.round(whatIf.popAtRisk * 0.84),
      },
      {
        time: "T+24H",
        Baseline: baseline.popAtRisk,
        WhatIf: whatIf.popAtRisk,
      },
      {
        time: "T+48H",
        Baseline: Math.round(baseline.popAtRisk * 1.15),
        WhatIf: Math.round(whatIf.popAtRisk * 1.34),
      },
      {
        time: "T+72H",
        Baseline: Math.round(baseline.popAtRisk * 1.25),
        WhatIf: Math.round(whatIf.popAtRisk * 1.62),
      },
    ];
  }, [baseline, whatIf]);

  return (
    <AppShell pageTitle="Scenario Simulator // Stress Testing & What-If Permutations">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                What-If Stress Testing & Simulation Engine (Module 04)
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Synthetic tabletop controls and toy arithmetic only. Not a forecast, validated model, impact estimate, or operational recommendation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm" pulse>
              SIMULATION ONLY // NO CONFIDENCE ASSESSED
            </TacticalBadge>
          </div>
        </div>

        {/* Scenario Selection Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            onClick={() => setSelectedScenario("SCEN_A")}
            className={`p-4 rounded-sm border cursor-pointer transition-all ${
              selectedScenario === "SCEN_A"
                ? "bg-sky-950/20 border-isie-cyan text-white shadow-lg"
                : "bg-isie-panel border-white/10 text-isie-text-muted hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold tracking-wider uppercase text-isie-cyan">
                Scenario A
              </span>
              <TacticalBadge variant="cyan" size="sm">
                HYPOTHETICAL
              </TacticalBadge>
            </div>
            <h3 className="font-mono text-sm font-semibold text-white mb-1">
              Hypothetical rainfall input
            </h3>
            <p className="text-[11px] text-isie-text-dim">
              Fictional slider values; no real catchment or dam data is loaded.
            </p>
          </div>

          <div
            onClick={() => setSelectedScenario("SCEN_B")}
            className={`p-4 rounded-sm border cursor-pointer transition-all ${
              selectedScenario === "SCEN_B"
                ? "bg-orange-950/20 border-isie-primary text-white shadow-lg"
                : "bg-isie-panel border-white/10 text-isie-text-muted hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold tracking-wider uppercase text-isie-primary">
                Scenario B
              </span>
              <TacticalBadge variant="orange" size="sm">
                HYPOTHETICAL
              </TacticalBadge>
            </div>
            <h3 className="font-mono text-sm font-semibold text-white mb-1">
              Hypothetical route disruption input
            </h3>
            <p className="text-[11px] text-isie-text-dim">
              Fictional slider values; no routes or exposed communities are loaded.
            </p>
          </div>

          <div
            onClick={() => setSelectedScenario("SCEN_C")}
            className={`p-4 rounded-sm border cursor-pointer transition-all ${
              selectedScenario === "SCEN_C"
                ? "bg-purple-950/20 border-purple-400 text-white shadow-lg"
                : "bg-isie-panel border-white/10 text-isie-text-muted hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold tracking-wider uppercase text-purple-400">
                Scenario C
              </span>
              <TacticalBadge variant="muted" size="sm">
                HYPOTHETICAL
              </TacticalBadge>
            </div>
            <h3 className="font-mono text-sm font-semibold text-white mb-1">
              Hypothetical surge input
            </h3>
            <p className="text-[11px] text-isie-text-dim">
              Fictional slider values; no coastal or shelter observations are loaded.
            </p>
          </div>
        </div>

        {/* Simulation Parameter Controls & Execution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
          {/* Left: Parameter Configurator */}
          <div className="lg:col-span-4 min-w-0 p-4 sm:p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                  Permutation Variables
                </span>
                <Sliders className="w-4 h-4 text-isie-text-muted" />
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                {params.map((param) => (
                  <div key={param.id} className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between items-center text-isie-text-secondary">
                      <span>{param.name}</span>
                      <span className="text-isie-cyan font-bold">
                        {param.currentValue} {param.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={param.currentValue}
                      onChange={(e) =>
                        handleParamChange(param.id, parseFloat(e.target.value))
                      }
                      className="w-full accent-isie-primary h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-isie-text-dim">
                      <span>
                        {param.min} {param.unit}
                      </span>
                      <span>
                        {param.max} {param.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Horizon Selector */}
              <div className="pt-2 border-t border-white/10">
                <span className="font-mono text-[10px] text-isie-text-dim uppercase mb-2 block">
                  SIMULATION HORIZON:
                </span>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                  {(["12H", "24H", "48H", "72H"] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      className={`py-1 rounded-xs border text-center transition-colors ${
                        horizon === h
                          ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                          : "bg-white/[0.02] border-white/10 text-isie-text-muted hover:text-white"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <TacticalButton
                variant="primary"
                size="md"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full"
                icon={<Play className="w-3.5 h-3.5 fill-current" />}
              >
                {isSimulating ? "COMPUTING WHAT-IF DELTA..." : "RUN STRESS TEST"}
              </TacticalButton>

              <button
                onClick={handleResetParams}
                className="w-full py-1.5 font-mono text-[11px] text-isie-text-muted hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>RESET TO BASELINE PARAMETERS</span>
              </button>
            </div>
          </div>

          {/* Right: Simulation Output & Comparison Matrix (Recharts Integration) */}
          <div className="lg:col-span-8 min-w-0 p-4 sm:p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Output Header with Visual Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-white/10 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                      Simulation Outcome & Impact Variance Analysis
                    </span>
                    <TacticalBadge variant="critical" size="sm" pulse>
                      ILLUSTRATIVE ARITHMETIC // NOT PREDICTIVE
                    </TacticalBadge>
                  </div>
                  <p className="text-[11px] text-isie-text-dim mt-0.5 font-mono">
                    Toy Baseline vs. &apos;What-If&apos; Calculation ({horizon} Exercise Horizon)
                  </p>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <button
                    onClick={() => setChartView("COMPARISON_BAR")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xs border transition-colors ${
                      chartView === "COMPARISON_BAR"
                        ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                        : "bg-white/[0.02] border-white/10 text-isie-text-muted hover:text-white"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>IMPACT BAR</span>
                  </button>

                  <button
                    onClick={() => setChartView("TRAJECTORY_AREA")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xs border transition-colors ${
                      chartView === "TRAJECTORY_AREA"
                        ? "bg-isie-cyan/20 text-isie-cyan border-isie-cyan/50 font-semibold"
                        : "bg-white/[0.02] border-white/10 text-isie-text-muted hover:text-white"
                    }`}
                  >
                    <LineChartIcon className="w-3.5 h-3.5" />
                    <span>TIMELINE SURGE</span>
                  </button>
                </div>
              </div>

              {/* Metric Impact Delta Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5 font-mono">
                {comparisonData.map((d) => (
                  <div
                    key={d.metric}
                    className="p-2.5 bg-white/[0.02] border border-white/10 rounded-xs space-y-1.5 hover:border-white/25 transition-colors"
                  >
                    <div className="text-[10px] text-isie-text-dim uppercase tracking-wider truncate">
                      {d.metric}
                    </div>

                    <div className="flex items-baseline justify-between gap-1">
                      <div className="text-base font-bold text-white leading-tight">
                        {d.WhatIf}
                        <span className="text-[10px] font-normal text-isie-text-dim ml-0.5">
                          {d.unit === "illustrative points" ? " pts" : ""}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold shrink-0">
                        +{d.deltaPct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 text-isie-text-secondary">
                      <span className="text-sky-300">BASE: {d.Baseline}</span>
                      <span className="text-red-400 font-bold">
                        Δ +{d.delta > 0 ? d.delta : 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Recharts Visualization Area */}
              <div className="w-full h-[280px] sm:h-[300px] bg-black/40 border border-white/10 rounded-xs p-2 relative">
                {!isMounted ? (
                  <div className="w-full h-full flex flex-col items-center justify-center font-mono text-xs text-isie-cyan/70 gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
                    <span>INITIALIZING RECHARTS METRICS ENGINE...</span>
                  </div>
                ) : chartView === "COMPARISON_BAR" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData}
                      margin={{ top: 16, right: 16, left: -10, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="metric"
                        stroke="#64748b"
                        fontSize={11}
                        fontFamily="ui-monospace, monospace"
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        fontFamily="ui-monospace, monospace"
                        tickLine={false}
                      />
                      <Tooltip
                        content={<CustomTacticalTooltip />}
                        cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        wrapperStyle={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "11px",
                          letterSpacing: "0.05em",
                        }}
                      />
                      <Bar
                        dataKey="Baseline"
                        name="Baseline Operations"
                        fill="#0284c7"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={38}
                      />
                      <Bar
                        dataKey="WhatIf"
                        name="What-If Projected Surge"
                        fill="#ff7a18"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={38}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trajectoryData}
                      margin={{ top: 16, right: 16, left: -10, bottom: 6 }}
                    >
                      <defs>
                        <linearGradient id="colorWhatIf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff7a18" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ff7a18" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={11}
                        fontFamily="ui-monospace, monospace"
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        fontFamily="ui-monospace, monospace"
                        tickLine={false}
                        unit="k"
                      />
                      <Tooltip
                        content={<TrajectoryTooltip />}
                        cursor={{ stroke: "rgba(255,122,24,0.4)", strokeWidth: 1 }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        wrapperStyle={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "11px",
                          letterSpacing: "0.05em",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Baseline"
                        name="Baseline Toy Exercise Input"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBaseline)"
                      />
                      <Area
                        type="monotone"
                        dataKey="WhatIf"
                        name="What-If Toy Calculation"
                        stroke="#ff7a18"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorWhatIf)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bottom Summary Tactical Status Banner */}
            <div className="pt-4 mt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-isie-text-secondary">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-white font-semibold uppercase">
                  DIFFERENTIAL IMPACT:
                </span>
                <span className="text-red-400">
                  +{(whatIf.popAtRisk - baseline.popAtRisk).toLocaleString()} TOY UNITS
                </span>
                <span className="text-white/20">|</span>
                <span className="text-amber-400">
                  +{(whatIf.hazardArea - baseline.hazardArea).toFixed(1)} ILLUSTRATIVE AREA UNITS
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-isie-text-dim">
                <span>CONFIDENCE: NOT ASSESSED // MODEL NOT VALIDATED</span>
                <TacticalBadge variant="warning" size="sm">
                  HIGH SEVERITY DELTA
                </TacticalBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// Tactical Tooltip for Recharts Bar Chart
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTacticalTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-[#05070b]/95 border border-white/20 rounded-xs shadow-2xl font-mono text-xs space-y-1.5 backdrop-blur-md min-w-[200px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-1">
          <span className="font-bold text-white uppercase">{label}</span>
          <span className="text-[10px] text-isie-text-dim">{data.unit}</span>
        </div>

        <div className="flex items-center justify-between text-sky-300">
          <span>Baseline:</span>
          <span className="font-bold">{data.Baseline}</span>
        </div>

        <div className="flex items-center justify-between text-amber-400">
          <span>What-If:</span>
          <span className="font-bold">{data.WhatIf}</span>
        </div>

        <div className="pt-1 border-t border-white/10 flex items-center justify-between text-red-400 font-bold">
          <span>Difference (Δ):</span>
          <span>
            +{data.delta} (+{data.deltaPct}%)
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Tactical Tooltip for Trajectory Area Chart
const TrajectoryTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const baselineVal = payload.find((p) => p.dataKey === "Baseline")?.value;
    const whatIfVal = payload.find((p) => p.dataKey === "WhatIf")?.value;
    const diff = Number(whatIfVal) - Number(baselineVal);

    return (
      <div className="p-3 bg-[#05070b]/95 border border-white/20 rounded-xs shadow-2xl font-mono text-xs space-y-1.5 backdrop-blur-md min-w-[190px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-1">
          <span className="font-bold text-white uppercase">{label} TOY CALCULATION</span>
          <span className="text-[10px] text-isie-text-dim">TOY EXERCISE UNITS</span>
        </div>

        <div className="flex items-center justify-between text-sky-300">
          <span>Baseline:</span>
          <span className="font-bold">{baselineVal}</span>
        </div>

        <div className="flex items-center justify-between text-amber-400">
          <span>What-If:</span>
          <span className="font-bold">{whatIfVal}</span>
        </div>

        <div className="pt-1 border-t border-white/10 flex items-center justify-between text-red-400 font-bold">
          <span>Illustrative difference:</span>
          <span>+{diff > 0 ? diff : 0} toy units</span>
        </div>
      </div>
    );
  }
  return null;
};
