"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Server, Activity, ShieldAlert, Cpu, Radio, CheckCircle, AlertTriangle } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";

export default function SystemStatusPage() {
  const [backendState, setBackendState] = useState<"CHECKING" | "UNCONFIGURED" | "UNREACHABLE" | "LIMITED">("CHECKING");
  const [backendDetail, setBackendDetail] = useState("Checking configured backend; this does not verify operational readiness.");

  useEffect(() => {
    let active = true;
    fetch("/api/backend-health", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 503) {
          setBackendState("UNCONFIGURED");
          setBackendDetail("ISIE_BACKEND_URL is not configured; backend state is unavailable.");
          return;
        }
        const result = await response.json();
        if (!response.ok || result.status !== "limited") {
          setBackendState("UNREACHABLE");
          setBackendDetail("Configured backend could not be reached; its state is unavailable.");
          return;
        }
        setBackendState("LIMITED");
        setBackendDetail(
          `Auth: ${result.authenticationConfigured ? "configured" : "unavailable"}; persistence: ${result.persistenceHealthy ? "healthy" : "unavailable"}; audit chain: ${result.auditIntegrity}; measurement adapter: ${result.providersConfigured ? "configured, not independently checked" : "not configured"}. Not operationally ready.`
        );
      })
      .catch(() => {
        if (active) {
          setBackendState("UNREACHABLE");
          setBackendDetail("Configured backend could not be reached; its state is unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const nodes = [
    {
      name: "Spatial GIS Projection Core",
      protocol: "WebGL presentation",
      status: "PRESENTATION_ONLY",
      detail: "Static map illustration; no verified operational spatial feed is connected.",
      variant: "muted" as const,
    },
    {
      name: "Telemetry Ingestion Gateway",
      protocol: "Not configured",
      status: "UNAVAILABLE",
      detail: "No sensor or provider adapter is configured.",
      variant: "warning" as const,
    },
    {
      name: "Python Backend API",
      protocol: "Server-side health probe",
      status: backendState,
      detail: backendDetail,
      variant: backendState === "LIMITED" ? "warning" as const : "muted" as const,
    },
    {
      name: "Stochastic What-If Simulation Engine",
      protocol: "Python prototype",
      status: "PROTOTYPE_NOT_OPERATIONAL",
      detail: "A hypothetical-only API exists but is not wired to the frontend and is not validated for decisions.",
      variant: "warning" as const,
    },
    {
      name: "Alert Broadcast & Siren Dispatch",
      protocol: "Not configured",
      status: "NO DISPATCH",
      detail: "No automated alert generation, notification, or external dispatch is configured.",
      variant: "muted" as const,
    },
  ];

  return (
    <AppShell pageTitle="System Status // Node Diagnostics & Sensor Telemetry Pipeline">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Cluster Architecture Diagnostics
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Backend liveness is probed when configured; other component states below are static declarations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm" pulse>
              FRONTEND PREVIEW ACTIVE
            </TacticalBadge>
          </div>
        </div>

        {/* Global System Health Summary Banner */}
        <div className="p-4 bg-isie-panel border border-white/10 rounded-sm font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <div>
              <div className="text-white font-semibold uppercase tracking-wider">
                System Mode: Frontend Preview // Non-Operational Standby
              </div>
              <div className="text-[11px] text-isie-text-dim mt-0.5">
                Prototype only: no verified source feeds, validated models, dispatch, or production approval.
              </div>
            </div>
          </div>
          <TacticalBadge variant="muted" size="sm">
            MONITORING: NOT CONFIGURED
          </TacticalBadge>
        </div>

        {/* Node Health List */}
        <div className="space-y-3 font-mono text-xs">
          {nodes.map((node, i) => (
            <div
              key={i}
              className="p-4 bg-isie-panel border border-white/10 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold tracking-wider">
                    {node.name}
                  </span>
                  <span className="text-[10px] text-isie-text-dim">[{node.protocol}]</span>
                </div>
                <div className="text-[11px] text-isie-text-secondary mt-1">
                  {node.detail}
                </div>
              </div>

              <TacticalBadge variant={node.variant} size="sm">
                {node.status}
              </TacticalBadge>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
