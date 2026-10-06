"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FileCheck2, Database, ShieldCheck, ExternalLink, Search, Filter, AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { AUTHORITATIVE_SOURCES } from "@/lib/constants/tacticalLayers";
import { intelligenceService } from "@/lib/services/intelligenceService";
import { EvidenceItem } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";

export default function IntelligenceEvidencePage() {
  const { isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<"SOURCES" | "EVIDENCE_FEED">("EVIDENCE_FEED");
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    if (isDemoMode) {
      return intelligenceService.subscribeDemoEvidence((items) => {
        setEvidenceList(items);
        setLoadError(null);
      }, (error) => {
        setEvidenceList([]);
        setLoadError(error instanceof Error ? error.message : "Local demo evidence could not be loaded.");
      });
    }
    intelligenceService.getAllAuthoritativeEvidence(false)
      .then(setEvidenceList)
      .catch((error) => {
        setEvidenceList([]);
        setLoadError(error instanceof Error ? error.message : "Evidence data could not be loaded.");
      });
  }, [isDemoMode]);

  const handleAddNote = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const item = await intelligenceService.createUserProvidedNote(draftTitle, draftSummary, isDemoMode);
      if (!item) throw new Error("User notes are available only in local demo mode.");
      setDraftTitle("");
      setDraftSummary("");
      setNotice("Saved in this browser as an unverified user note. No verification claim or alert was created.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save the local note.");
    }
  };

  return (
    <AppShell pageTitle="Evidence & Sources // Unverified Notes & Unconnected References">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Evidence Notes & Provider Reference Catalog
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              No external provider is connected. Demo records are synthetic fixtures or user-provided notes; verification is unavailable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {isDemoMode ? "SIMULATED / USER NOTES" : "VERIFICATION UNAVAILABLE"}: {isDemoMode ? evidenceList.length : "NO FEED"}
            </TacticalBadge>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab("EVIDENCE_FEED")}
            className={`px-4 py-2 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "EVIDENCE_FEED"
                ? "border-isie-cyan text-isie-cyan font-semibold"
                : "border-transparent text-isie-text-muted hover:text-white"
            }`}
          >
            Demo & User Notes ({evidenceList.length})
          </button>
          <button
            onClick={() => setActiveTab("SOURCES")}
            className={`px-4 py-2 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "SOURCES"
                ? "border-isie-primary text-isie-primary font-semibold"
                : "border-transparent text-isie-text-muted hover:text-white"
            }`}
          >
            Provider References (not connected)
          </button>
        </div>

        {isDemoMode && (
          <form onSubmit={handleAddNote} className="grid gap-3 p-4 bg-isie-panel border border-amber-500/30 rounded-sm">
            <div className="font-mono text-xs font-bold text-amber-100">ADD LOCAL USER-PROVIDED NOTE // NOT VERIFIED OR BROADCAST</div>
            <input required minLength={3} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Note title" className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs" />
            <textarea required minLength={3} value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} placeholder="User-provided text; do not enter sensitive operational data" rows={3} className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs" />
            <button type="submit" className="justify-self-start px-3 py-2 bg-amber-700/30 border border-amber-500/40 text-amber-100 font-mono text-xs">SAVE LOCAL NOTE</button>
            {notice && <div role="status" className="font-mono text-xs text-amber-100">{notice}</div>}
          </form>
        )}
        {loadError && <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-200">EVIDENCE DATA UNAVAILABLE // {loadError}</div>}

        {/* Content Tabs */}
        {activeTab === "EVIDENCE_FEED" && (
          <div className="space-y-4">
            {loadError && <div role="alert" className="p-4 border border-red-500/30 text-red-200 font-mono text-xs">{loadError}</div>}
            {evidenceList.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="text-white font-bold">{item.id}</span>
                    <TacticalBadge variant="safe" size="sm">
                      {item.sourceType === "SYNTHETIC_FIXTURE" ? "SIMULATED FIXTURE" : "USER-PROVIDED UNVERIFIED"}
                    </TacticalBadge>
                    <span className="text-isie-cyan font-semibold">
                      ORIGIN: {item.sourceName}
                    </span>
                    <span className="text-isie-text-dim">{item.timestamp}</span>
                  </div>

                  <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">
                    {item.title}
                  </h3>

                  <p className="text-xs text-isie-text-secondary leading-relaxed bg-white/[0.02] p-3 rounded-xs border border-white/5">
                    {item.summary}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-mono text-[10px] text-isie-text-dim">
                    <div>SENSOR: {item.technicalMetadata.sensor || "NOT PROVIDED"}</div>
                    <div>RESOLUTION: {item.technicalMetadata.resolution}</div>
                    <div>LATENCY: {item.technicalMetadata.dataLatencyMinutes ?? "NOT MEASURED"}</div>
                    <div>CHECKSUM: {item.technicalMetadata.qcChecksum || "NOT AVAILABLE"}</div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2 font-mono text-xs">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs text-center">
                    <div className="text-[10px] text-isie-text-dim">VALIDATION</div>
                    <div className="text-amber-300 font-bold text-base mt-0.5">
                      NOT PERFORMED
                    </div>
                  </div>
                  {item.authoritativeUrl && (
                    <a
                      href={item.authoritativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-isie-text-primary rounded-xs flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                    >
                      <span>PUBLIC REFERENCE</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "SOURCES" && (
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
                    <TacticalBadge variant="safe" size="sm">
                      NOT CONNECTED
                    </TacticalBadge>
                  </div>
                  <div className="font-mono text-[10px] text-isie-cyan mb-2">
                    {source.endpointCategory} // {source.code}
                  </div>
                  <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                    {source.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                  <span className="text-amber-300">ADAPTER: NOT CONFIGURED</span>
                  {source.referenceUrl ? <a
                    href={source.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-isie-primary hover:underline"
                  >
                    <span>PUBLIC DOCS ONLY</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  : <span className="text-isie-text-dim">NO REFERENCE LINK</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
