"use client";

import React, { useState } from "react";
import { Info, X, ShieldAlert, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export const DemoModeBadge: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { isDemoMode } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isDemoMode) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-orange-950/60 border border-orange-500/40 text-orange-400 hover:bg-orange-900/60 hover:border-orange-400 font-mono text-[10px] uppercase tracking-widest font-semibold transition-all shadow-[0_0_8px_rgba(255,122,24,0.2)] ${className}`}
        title="Click to view Demo Environment Info"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
        <span>DEMO MODE</span>
      </button>

      {/* Demo Mode Explanation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-isie-panel border border-white/20 rounded-sm shadow-2xl p-5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-isie-primary" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Demo Environment Notice
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-isie-text-muted hover:text-white p-1 rounded-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
              This is a <strong className="text-white">non-operational demonstration environment</strong>. Example values are simulated exercise fixtures, not live observations or verified data.
            </p>

            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs space-y-2 font-mono text-[11px] mb-4 text-isie-text-dim">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>All frontend modules and tactical views unlocked</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No live telemetry or provider feeds are connected</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Demo submissions remain local to this browser</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 bg-isie-primary text-black font-mono text-xs font-semibold rounded-xs uppercase tracking-wider hover:bg-isie-primary-light"
              >
                CONTINUE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
