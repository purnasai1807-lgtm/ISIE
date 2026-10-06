"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Database } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { AUTHORITATIVE_SOURCES } from "@/lib/constants/tacticalLayers";

export default function SourcesPage() {
  return (
    <AppShell pageTitle="Data Sources // Unconfigured Provider Categories">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Provider Integration Status
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Candidate source categories only. No provider access, endpoint, data rights, license, or suitability has been verified.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              NO PROVIDERS CONFIGURED
            </TacticalBadge>
          </div>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AUTHORITATIVE_SOURCES.map((source) => (
            <div
              key={source.id}
              className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    {source.name}
                  </span>
                  <TacticalBadge variant="muted" size="sm">
                  NOT CONNECTED
                  </TacticalBadge>
                </div>
                <div className="font-mono text-[10px] text-isie-cyan mb-2">
                  {source.type} // {source.code}
                </div>
                <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                  {source.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                <span>INGESTION STATUS: NOT IMPLEMENTED</span>
                {source.referenceUrl ? <a
                  href={source.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-isie-primary hover:underline"
                >
                  <span>REFERENCE ONLY</span>
                </a> : <span>NO REFERENCE LINK</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
