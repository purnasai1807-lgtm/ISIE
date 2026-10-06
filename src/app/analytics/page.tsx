"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Activity, TrendingUp, ShieldAlert, BarChart3, PieChart, Users, HeartPulse, Droplets, Truck } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { riskService } from "@/lib/services/riskService";
import { CarryingCapacityMetrics, HazardRedZone, RelocationIntelligence } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AnalyticsPage() {
  const { isDemoMode } = useAuth();
  const [redZones, setRedZones] = useState<HazardRedZone[]>([]);
  const [capacity, setCapacity] = useState<CarryingCapacityMetrics | null>(null);
  const [relocations, setRelocations] = useState<RelocationIntelligence[]>([]);

  useEffect(() => {
    riskService.getHazardRedZones(undefined, isDemoMode).then(setRedZones);
    riskService.getCarryingCapacityAssessment(undefined, isDemoMode).then(setCapacity);
    riskService.getRelocationPriorities(undefined, isDemoMode).then(setRelocations);
  }, [isDemoMode]);

  if (!isDemoMode) {
    return (
      <AppShell pageTitle="Analytics // Data Unavailable">
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
          <EmptyState
            icon="database"
            title="No Verified Analytics Available"
            description="Capacity, infrastructure, water, and relocation analytics are withheld until source data with verification provenance and a validated analysis backend are connected. No operational estimates are being inferred."
            statusText="INSUFFICIENT VERIFIED DATA"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Analytics // Insufficient Verified Inputs">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Strategic Analytics & Decision Intelligence
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
            Fictional exercise fixtures only. No verified measurements are available; prototype calculations are not validated or decision-grade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="muted" size="sm">
              SIMULATION FIXTURES // NOT ASSESSED
            </TacticalBadge>
          </div>
        </div>

        {/* High-Level Analytical KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">POPULATION EXPOSURE</span>
              <Users className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {redZones.some((zone) => zone.classification === "RED_ZONE") ? "ILLUSTRATIVE ONLY" : "NOT ASSESSED"}
            </div>
            <div className="text-[10px] text-isie-text-dim">NO VERIFIED POPULATION SOURCE</div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">SHELTER CAPACITY DEFICIT</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mb-1">
              {capacity && capacity.populationExposure.capacityDeficitPercentage > 0
                ? `${capacity.populationExposure.capacityDeficitPercentage}% (ILLUSTRATIVE)`
                : "NOT ASSESSED"}
            </div>
            <div className="text-[10px] text-isie-text-dim">NOT DECISION-GRADE</div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">POTABLE WATER BUFFER</span>
              <Droplets className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-300 mb-1">
              {capacity && capacity.resourceReserves.potableWaterHoursRemaining > 0
                ? `${capacity.resourceReserves.potableWaterHoursRemaining} (ILLUSTRATIVE)`
                : "NOT ASSESSED"}
            </div>
            <div className="text-[10px] text-isie-text-dim">NO VERIFIED SUPPLY SOURCE</div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">MAX RELOCATION PRIORITY</span>
              <TrendingUp className="w-4 h-4 text-isie-primary" />
            </div>
            <div className="text-2xl font-bold text-isie-primary mb-1">
              {relocations.some((item) => item.relocationPriorityScore > 0) ? "ILLUSTRATIVE ONLY" : "NOT ASSESSED"}
            </div>
            <div className="text-[10px] text-isie-text-dim">NO VALIDATED INDEX OR ORDER</div>
          </div>
        </div>

        {/* Carrying Capacity (Module 02) & Relocation (Module 03) Deep Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          {/* Module 02: Infrastructure & Carrying Capacity Stress */}
          <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4 min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Module 02 // Carrying Capacity Assessment Matrix
                </h3>
                <p className="text-[11px] text-isie-text-dim">
                  Required capacity source measurements unavailable; no assessment computed.
                </p>
              </div>
              <TacticalBadge variant="critical" size="sm">
                NOT ASSESSED
              </TacticalBadge>
            </div>

            {/* Stress Progress Bars */}
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between text-isie-text-secondary mb-1">
                  <span>HOSPITAL BED OCCUPANCY</span>
                  <span className="text-isie-text-dim font-bold">NOT ASSESSED</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/20 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-isie-text-secondary mb-1">
                  <span>ROAD NETWORK ARTERIAL CLEARANCE</span>
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
                  <span>TELECOMMUNICATIONS CELL INTEGRITY</span>
                  <span className="text-isie-text-dim font-bold">NOT ASSESSED</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/20 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Module 03: Relocation Priority Triage Table */}
          <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4 min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Module 03 // Relocation Priority Scoring
                </h3>
                <p className="text-[11px] text-isie-text-dim">
                  Ranking unavailable without verified hazard, population, shelter, and route inputs.
                </p>
              </div>
              <TacticalBadge variant="orange" size="sm">
                NOT ASSESSED
              </TacticalBadge>
            </div>

            <div className="space-y-3">
              {relocations.map((reloc) => (
                <div
                  key={reloc.zoneId}
                  className="p-3 bg-white/[0.02] border border-white/10 rounded-xs space-y-2 font-mono text-xs min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="px-1.5 py-0.5 bg-isie-primary/20 text-isie-primary border border-isie-primary/40 font-bold rounded-xs shrink-0">
                        NOT RANKED
                      </span>
                      <span className="font-bold text-white truncate">{reloc.zoneName}</span>
                    </div>
                    <span className="text-red-400 font-bold text-sm shrink-0">
                      INDEX: NOT ASSESSED
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-isie-text-dim gap-1">
                    <span>TRANSIT: NOT ASSESSED</span>
                    <span className="truncate">SHELTER: {reloc.designatedShelters[0]?.name}</span>
                  </div>

                  <div className="text-[10px] text-amber-400 truncate">
                    ROUTE: NOT ASSESSED — DO NOT USE FOR NAVIGATION
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
