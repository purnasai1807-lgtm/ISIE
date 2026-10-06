"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Clock, Play, Pause, MapPin } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { timelineService } from "@/lib/services/timelineService";
import { TimelineEvent } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";

export default function TimelinePage() {
  const { isDemoMode } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedPhase, setSelectedPhase] = useState("ALL");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadError, setLoadError] = useState<string | null>(null);

  const filtered = events.filter((event) =>
    selectedPhase === "ALL" ? true : event.phase === selectedPhase
  );

  useEffect(() => {
    setLoadError(null);
    timelineService.getTimelineEvents(undefined, isDemoMode)
      .then(setEvents)
      .catch((error) => {
        setEvents([]);
        setLoadError(error instanceof Error ? error.message : "Timeline data could not be loaded.");
      });
  }, [isDemoMode]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = current + 1;
        if (next >= filtered.length) {
          setIsPlaying(false);
          return -1;
        }
        return next;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [filtered.length, isPlaying]);

  return (
    <AppShell pageTitle="Timeline Analysis // Temporal Event Evolution & Projection">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Simulated Exercise Timeline
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Static exercise sequence for practicing timeline controls. No sensor triggers, real observations, or forecasts are included.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {events.length} SIMULATED EXERCISE ITEMS
            </TacticalBadge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border border-amber-500/30 bg-amber-950/20 p-3 font-mono text-xs text-amber-100">
          <button type="button" onClick={() => { setActiveIndex(-1); setIsPlaying((playing) => !playing); }} className="inline-flex items-center gap-2 px-3 py-1.5 border border-amber-400/40 rounded">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? "PAUSE EXERCISE SEQUENCE" : "PLAY EXERCISE SEQUENCE"}
          </button>
          <span>SIMULATED STEP {activeIndex >= 0 ? `${activeIndex + 1} / ${filtered.length}` : "NOT PLAYING"} // NO LIVE TIME SYNC</span>
        </div>

        {/* Phase Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-isie-panel border border-white/10 rounded-sm font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "EXERCISE_STEP"].map((ph) => (
              <button
                key={ph}
                onClick={() => setSelectedPhase(ph)}
                className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                  selectedPhase === ph
                    ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                    : "bg-white/[0.02] border-white/10 text-isie-text-muted hover:text-white"
                }`}
              >
                {ph === "EXERCISE_STEP" ? "SIMULATED EXERCISE STEP" : ph}
              </button>
            ))}
          </div>

          <span className="text-isie-text-dim text-[11px]">
            {isDemoMode
              ? "STATIC SIMULATED EXERCISE SEQUENCE"
              : "NO VERIFIED OPERATIONAL TIMELINE DATA"}
          </span>
        </div>

        {/* Timeline Event Cards Flow */}
        <div className="space-y-4">
          {loadError ? (
            <EmptyState icon="database" title="Timeline Data Unavailable" description={loadError} statusText="LOAD ERROR" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="radio"
              title="No Timeline Anchors Logged"
              description={
                isDemoMode
                  ? "No timeline milestones match the selected temporal phase."
                  : "No operational timeline milestones logged yet. When incidents are created or updated, milestones appear here automatically."
              }
              statusText="STANDBY"
            />
          ) : (
            filtered.map((item, idx) => (
            <div
              key={item.id}
              className={`p-5 bg-isie-panel border ${activeIndex === idx ? "border-amber-300" : "border-white/10"} rounded-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4`}
            >
              {/* Left Accent indicator */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  item.phase === "EXERCISE_STEP"
                    ? "bg-cyan-400"
                    : "bg-slate-600"
                }`}
              />

              <div className="space-y-1.5 pl-2">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-white font-bold">{item.timestamp}</span>
                  <TacticalBadge
                    variant={
                      item.severity === "CRITICAL"
                        ? "critical"
                        : item.severity === "HIGH"
                        ? "orange"
                        : "cyan"
                    }
                    size="sm"
                    pulse={item.severity === "CRITICAL"}
                  >
                    {item.severity}
                  </TacticalBadge>
                  <TacticalBadge variant="muted" size="sm">
                    {item.phase === "EXERCISE_STEP" ? "SIMULATED EXERCISE STEP" : item.phase.replace("_", " ")}
                  </TacticalBadge>
                </div>

                <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">
                  {item.title}
                </h3>

                <p className="text-xs text-isie-text-secondary max-w-3xl leading-relaxed">
                  {item.summary}
                </p>
              </div>

              {item.coordinates && (
                <div className="shrink-0 p-3 bg-white/[0.02] border border-white/5 rounded-xs font-mono text-xs text-right">
                  <div className="text-[10px] text-isie-text-dim">COORDINATES</div>
                  <div className="text-isie-cyan font-bold mt-0.5">
                    {item.coordinates.lat}°N / {item.coordinates.lng}°E
                  </div>
                </div>
              )}
            </div>
          )))}
        </div>
      </div>
    </AppShell>
  );
}
