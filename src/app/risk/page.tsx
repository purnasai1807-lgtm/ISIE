"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Activity,
  ShieldAlert,
  Users,
  TrendingUp,
  AlertTriangle,
  Building,
  Droplets,
  HeartPulse,
  Navigation,
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { riskService } from "@/lib/services/riskService";
import { incidentService } from "@/lib/services/incidentService";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  HazardRedZone,
  CarryingCapacityMetrics,
  RelocationIntelligence,
  IntelligenceEvent,
} from "@/lib/types/isie";

export default function RiskImpactAnalysisPage() {
  const { isDemoMode } = useAuth();
  const [redZones, setRedZones] = useState<HazardRedZone[]>([]);
  const [capacity, setCapacity] = useState<CarryingCapacityMetrics | null>(null);
  const [relocations, setRelocations] = useState<RelocationIntelligence[]>([]);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [incidentLoadError, setIncidentLoadError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<"ALL" | "CAPACITY" | "RELOCATION">("ALL");

  useEffect(() => {
    riskService.getHazardRedZones(undefined, isDemoMode).then(setRedZones);
    riskService.getCarryingCapacityAssessment(undefined, isDemoMode).then(setCapacity);
    riskService.getRelocationPriorities(undefined, isDemoMode).then(setRelocations);
  }, [isDemoMode]);

  useEffect(() => {
    setIncidentLoadError(null);
    const unsubscribe = incidentService.subscribeIncidents(
      isDemoMode,
      (items) => {
        setIncidents(items);
        setIncidentLoadError(null);
      },
      (error) => {
        setIncidents([]);
        setIncidentLoadError(error.message || "Exercise records could not be loaded.");
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isDemoMode]);

  const assessedZones = redZones.filter((zone) => zone.classification === "RED_ZONE");
  const totalHabitationsInRedZones = incidents
    .filter((incident) => incident.hazardZoneLevel === "RED_ZONE")
    .reduce((total, incident) => total + (incident.affectedHabitationsCount ?? 0), 0);

  if (!isDemoMode) {
    return (
      <AppShell pageTitle="Risk & Impact Analysis // Data Unavailable">
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
          <EmptyState
            icon="database"
            title="No Verified Risk Assessment Available"
            description="Risk, capacity, and relocation figures are withheld until fresh source measurements, verification provenance, and an integrated validated analysis backend are available. Missing: verified hazard observations, population exposure, shelter capacity, and current route status."
            statusText="INSUFFICIENT VERIFIED DATA"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Risk & Impact Analysis // Carrying Capacity & Vulnerability Assessment">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
      {incidentLoadError && (
        <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-200">
          EXERCISE INPUT DATA UNAVAILABLE // {incidentLoadError}
        </div>
      )}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Multi-Hazard Risk & Carrying Capacity Assessment
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Illustrative exercise fixtures only; no observed, verified, or decision-grade measures are available.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              DEMO SIMULATION // NOT OPERATIONAL
            </TacticalBadge>
            <TacticalBadge variant="orange" size="sm">
              {redZones.length} FICTIONAL EXERCISE ZONES
            </TacticalBadge>
          </div>
        </div>

        {/* Analytic Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">EXERCISE EXPOSURE INPUT</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {assessedZones.length === 0 ? "NOT ASSESSED" : totalHabitationsInRedZones}
            </div>
            <div className="text-[10px] text-red-400 font-semibold">
              SYNTHETIC INPUT ONLY // NOT DECISION-GRADE
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">EXPOSED POPULATION</span>
              <Users className="w-4 h-4 text-isie-cyan" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mb-1">
              NOT ASSESSED
            </div>
            <div className="text-[10px] text-isie-text-dim">
              NO POPULATION SOURCE CONNECTED
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">SHELTER DEFICIT INDEX</span>
              <Building className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mb-1">
              {capacity && capacity.populationExposure.capacityDeficitPercentage > 0
                ? `${capacity.populationExposure.capacityDeficitPercentage}% (ILLUSTRATIVE)`
                : "NOT ASSESSED"}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold">
              SIMULATED FIXTURE VALUE // UNVALIDATED
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">RELOCATION URGENCY</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-isie-primary mb-1">
              NOT ASSESSED
            </div>
            <div className="text-[10px] text-red-400 font-semibold">
              NO VALIDATED INDEX // NO ORDERING
            </div>
          </div>
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {[
            { id: "ALL" as const, label: "All Modules (02 & 03)" },
            { id: "CAPACITY" as const, label: "Module 02: Carrying Capacity Stress" },
            { id: "RELOCATION" as const, label: "Module 03: Relocation Priority Triage" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDomain(tab.id)}
              className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                selectedDomain === tab.id
                  ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                  : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Detailed Module 02 & Module 03 Analytics Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          {/* Module 02: Carrying Capacity Analytics */}
          {(selectedDomain === "ALL" || selectedDomain === "CAPACITY") && (
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-4 min-h-[420px] min-w-0">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div>
                    <div className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                      Module 02 // Illustrative Capacity Inputs
                    </div>
                    <div className="text-[11px] text-isie-text-dim">
                      Fictional exercise inputs only; none represent measured capacity or service status.
                    </div>
                  </div>
                  <TacticalBadge variant="critical" size="sm">
                    NOT ASSESSED
                  </TacticalBadge>
                </div>

                {/* Progress bars */}
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>DISTRICT HOSPITAL BED OCCUPANCY</span>
                      <span className="text-isie-text-dim font-bold">NOT ASSESSED</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>CRITICAL ARTERIAL ROAD NETWORK</span>
                      <span className="text-isie-text-dim font-bold">NOT ASSESSED</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>EMERGENCY RELIEF SHELTER LOAD</span>
                      <span className="text-isie-text-dim font-bold">NOT ASSESSED</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>POTABLE WATER BUFFER HORIZON</span>
                      <span className="text-sky-300 font-bold">
                        NOT ASSESSED
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 font-mono text-[10px] text-isie-text-dim flex justify-between items-center">
                <span>RATIONS: NOT ASSESSED</span>
                <Link href="/resources" className="text-isie-cyan hover:underline flex items-center gap-1 font-semibold">
                  <span>VIEW SIMULATED RESOURCES</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Module 03: Relocation Priority Triage */}
          {(selectedDomain === "ALL" || selectedDomain === "RELOCATION") && (
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-4 min-h-[420px] min-w-0">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div>
                    <div className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                      Module 03 // Relocation Priority Scoring
                    </div>
                    <div className="text-[11px] text-isie-text-dim">
                      No ranking computed: required hazard, population, shelter, and route measurements are unavailable.
                    </div>
                  </div>
                  <TacticalBadge variant="orange" size="sm">
                    NOT ASSESSED
                  </TacticalBadge>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {relocations.map((reloc) => (
                    <div
                      key={reloc.zoneId}
                      className="p-3 bg-white/[0.02] border border-white/10 rounded-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-isie-primary/20 text-isie-primary border border-isie-primary/40 font-bold rounded-xs shrink-0">
                            NOT RANKED
                          </span>
                          <span className="font-bold text-white truncate">{reloc.zoneName}</span>
                        </div>
                        <span className="text-red-400 font-bold text-sm shrink-0">
                          INDEX: NOT ASSESSED
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-isie-text-dim gap-1">
                        <span>TRANSIT: NOT ASSESSED</span>
                        <span className="text-isie-cyan">HAVEN: {reloc.designatedShelters[0]?.name}</span>
                      </div>

                      <div className="text-[10px] text-amber-300">
                        ROUTE: NOT ASSESSED — DO NOT USE FOR NAVIGATION
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 font-mono text-[10px] text-isie-text-dim flex justify-between items-center">
                <span>EXERCISE FIXTURE ONLY // NO ROUTING</span>
                <Link href="/geospatial" className="text-isie-primary hover:underline flex items-center gap-1 font-semibold">
                  <span>VIEW FICTIONAL MAP (NO ROUTING)</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
