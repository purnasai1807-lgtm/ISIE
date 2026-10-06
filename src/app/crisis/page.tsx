"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Flame, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent } from "@/lib/types/isie";

export default function CrisisIntelligencePage() {
  const { isDemoMode } = useAuth();
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IntelligenceEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIncidents([]);
    setSelectedIncident(null);
    setLoadError(null);
    if (!isDemoMode) return;

    try {
      return incidentService.subscribeIncidents(true, (items) => {
        setIncidents(items);
        setSelectedIncident((selected) => items.find((item) => item.id === selected?.id) || items[0] || null);
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Local exercise records could not be loaded.");
    }
  }, [isDemoMode]);

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return incidents.filter((incident) =>
      !query ||
      incident.title.toLowerCase().includes(query) ||
      incident.eventCode.toLowerCase().includes(query) ||
      incident.locationName.toLowerCase().includes(query)
    );
  }, [incidents, searchQuery]);

  return (
    <AppShell pageTitle="Crisis Exercise // Simulated Incident Records">
      <main className="flex-1 flex flex-col p-4 md:p-6 gap-5 max-w-7xl mx-auto w-full">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <h1 className="font-mono text-xl font-bold uppercase text-white">Crisis exercise records</h1>
              <p className="text-xs text-isie-text-secondary mt-1">
                Local simulated fixtures only. No real-time hazard triage, escalation, or operational verification is available.
              </p>
            </div>
          </div>
          <DemoModeBadge />
        </header>

        <div role="note" className="p-3 border border-amber-500/40 bg-amber-950/20 rounded-xs text-xs text-amber-100 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Population exposure, hazard status, shelter capacity, relocation priority, road access, satellite evidence, and response decisions are NOT ASSESSED. Missing: verified current observations, provenance, population, capacity, route, and domain-validated analysis inputs.
          </span>
        </div>

        {isDemoMode && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 flex-1 min-w-[240px] max-w-lg bg-isie-panel border border-white/10 px-3 py-2 rounded-sm font-mono text-xs">
                <Search className="w-4 h-4 text-isie-text-muted" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter simulated exercise records"
                  className="bg-transparent w-full text-white placeholder-isie-text-dim outline-none"
                />
              </label>
              <TacticalBadge variant="cyan" size="sm">{incidents.length} SIMULATED FIXTURES</TacticalBadge>
            </div>

            {loadError ? (
              <div role="alert" className="p-4 border border-red-500/40 bg-red-950/20 text-red-200 font-mono text-xs">
                Exercise records unavailable: {loadError}. No fixture fallback was substituted.
              </div>
            ) : filteredIncidents.length === 0 ? (
              <EmptyState
                icon="shield"
                title="No Local Exercise Records"
                description={searchQuery ? "No local fixtures match this filter." : "No simulated records are stored in this browser."}
                statusText="SIMULATION DATA UNAVAILABLE"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {filteredIncidents.map((incident) => (
                    <button
                      type="button"
                      key={incident.id}
                      onClick={() => setSelectedIncident(incident)}
                      className={`block w-full text-left p-4 border rounded-sm ${selectedIncident?.id === incident.id ? "border-amber-400/60 bg-isie-panel-elevated" : "border-white/10 bg-isie-panel hover:border-white/25"}`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-white">{incident.eventCode}</span>
                        <TacticalBadge variant="muted" size="sm">SIMULATED FIXTURE</TacticalBadge>
                      </div>
                      <div className="font-mono text-sm text-white mt-2">{incident.title}</div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-isie-text-secondary">
                        <MapPin className="w-3 h-3" /> {incident.locationName} // fictional exercise context
                      </div>
                    </button>
                  ))}
                </div>
                <section className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-3">
                  {selectedIncident ? (
                    <>
                      <TacticalBadge variant="orange" size="sm">SIMULATED // NOT VERIFIED</TacticalBadge>
                      <h2 className="font-mono text-lg font-bold text-white">{selectedIncident.title}</h2>
                      <p className="text-xs text-isie-text-secondary">{selectedIncident.summary}</p>
                      <div className="border-t border-white/10 pt-3 text-xs text-isie-text-dim space-y-1">
                        <p>Source: fictional fixture, not a source observation.</p>
                        <p>Current severity, population, habitations, risk, capacity, and relocation: NOT ASSESSED.</p>
                        <p>No satellite or sensor evidence is connected. No evacuation or response action is generated.</p>
                      </div>
                      <Link href="/incidents" className="inline-block text-xs text-isie-cyan hover:underline">
                        Open local incident exercise workspace
                      </Link>
                    </>
                  ) : (
                    <EmptyState icon="radio" title="Select a simulated record" description="No live incident details are available." statusText="EXERCISE ONLY" />
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {!isDemoMode && (
          <EmptyState
            icon="database"
            title="Operational crisis data unavailable"
            description="No verified provider feed or validated decision model is connected. No operational records are loaded or inferred."
            statusText="INSUFFICIENT VERIFIED DATA"
            actionText="VIEW PROTOTYPE MODULES"
            actionHref="/dashboard"
          />
        )}
      </main>
    </AppShell>
  );
}
