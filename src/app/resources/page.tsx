"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Truck, ShieldCheck, Users, HeartPulse, Droplets, Building, Search, Filter } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { resourceService } from "@/lib/services/resourceService";
import { ResponseResource } from "@/data/demo/resources";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ResourcesPage() {
  const { isDemoMode } = useAuth();
  const [resources, setResources] = useState<ResponseResource[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    if (isDemoMode) {
      return resourceService.subscribeDemoResources((items) => {
        setResources(categoryFilter === "ALL" ? items : items.filter((item) => item.category === categoryFilter));
        setLoadError(null);
      }, (error) => {
        setResources([]);
        setLoadError(error instanceof Error ? error.message : "Local demo inventory could not be loaded.");
      });
    }
    resourceService.getResources(categoryFilter, false)
      .then(setResources)
      .catch((error) => {
        setResources([]);
        setLoadError(error instanceof Error ? error.message : "Resource inventory could not be loaded.");
      });
  }, [categoryFilter, isDemoMode]);

  const changeSimulatedAllocation = async (id: string, delta: number) => {
    try {
      const changed = await resourceService.simulateAllocation(id, delta, isDemoMode);
      setNotice(changed
        ? "Exercise allocation changed in this browser only. No resource was reserved, contacted, or dispatched."
        : "Local simulation update was unavailable.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save the local allocation change.");
    }
  };

  const categories = [
    { id: "ALL", label: "All Assets" },
    { id: "DISASTER_BATTALION", label: "Rescue team fixtures" },
    { id: "RELIEF_SHELTER", label: "Shelter fixtures" },
    { id: "HEALTHCARE_UNIT", label: "Medical fixtures" },
    { id: "WATER_LOGISTICS", label: "Water fixtures" },
  ];

  return (
    <AppShell pageTitle="Resources // Disaster Battalions, Safe Havens & Logistics">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-5 h-5 text-isie-primary" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Disaster Response & Shelter Logistics
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              {isDemoMode
                ? "SIMULATED EXERCISE INVENTORY ONLY. Values are fictional and do not indicate real availability."
                : "Resource availability requires a configured, verified source feed; no inventory is currently connected."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant={isDemoMode ? "cyan" : "muted"} size="sm">
              {isDemoMode ? "SIMULATED RESOURCE FIXTURES" : "RESOURCE INVENTORY UNAVAILABLE"}: {resources.length}
            </TacticalBadge>
          </div>
        </div>

        {isDemoMode && notice && (
          <div role="status" className="border border-amber-500/30 bg-amber-950/20 p-3 font-mono text-xs text-amber-100">{notice}</div>
        )}
        {loadError && (
          <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-200">
            RESOURCE DATA UNAVAILABLE // {loadError}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                categoryFilter === c.id
                  ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                  : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Resource Cards Grid */}
        {loadError ? (
          <EmptyState
            icon="database"
            title="Resource Data Unavailable"
            description={loadError}
            statusText="LOAD ERROR"
          />
        ) : resources.length === 0 ? (
          <EmptyState
            icon="database"
            title="No Verified Resource Inventory"
            description="Shelter, responder, medical, and logistics availability is unavailable until an authorized source is integrated. No operational resource values are being shown."
            statusText="DATA UNAVAILABLE"
          />
        ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {resources.map((res) => (
            <div
              key={res.id}
              className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-4 min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-isie-cyan font-semibold">
                    SIMULATED // {res.id}
                  </span>
                  <TacticalBadge
                    variant={
                      res.status === "DEPLOYED"
                        ? "orange"
                        : res.status === "EN_ROUTE"
                        ? "warning"
                        : "safe"
                    }
                    size="sm"
                  >
                    SIMULATED {res.status}
                  </TacticalBadge>
                </div>

                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-1">
                  {res.name}
                </h3>
                <div className="text-xs text-isie-text-secondary flex items-center gap-1.5 mb-3">
                  <span>{res.location}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-isie-text-dim">{res.sector}</span>
                </div>

                {/* Progress of Allocation */}
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-isie-text-dim">
                    <span>ILLUSTRATIVE CAPACITY (NO REAL INVENTORY)</span>
                    <span className="text-white font-semibold">
                      {res.currentAllocated.toLocaleString()} / {res.totalCapacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-isie-primary rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (res.currentAllocated / res.totalCapacity) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                <span>EXERCISE LABEL: {res.contactCallsign}</span>
                <span>READINESS: NOT ASSESSED</span>
              </div>
              {isDemoMode && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/20 font-mono text-[10px]">
                  <span className="text-amber-200">SIMULATED LOCAL ALLOCATION // NO DEPLOYMENT</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => changeSimulatedAllocation(res.id, -1)} className="px-2 py-1 border border-white/20 rounded text-white hover:bg-white/10" aria-label={`Decrease simulated allocation for ${res.name}`}>-1</button>
                    <button type="button" onClick={() => changeSimulatedAllocation(res.id, 1)} className="px-2 py-1 border border-white/20 rounded text-white hover:bg-white/10" aria-label={`Increase simulated allocation for ${res.name}`}>+1</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>}
      </div>
    </AppShell>
  );
}
