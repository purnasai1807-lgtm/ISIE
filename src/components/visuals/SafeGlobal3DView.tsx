"use client";

import React, { Component, ErrorInfo, ReactNode, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw, AlertTriangle, Globe } from "lucide-react";
import { IntelligenceEvent } from "@/lib/types/isie";

export interface Global3DViewProps {
  className?: string;
  showOverlay?: boolean;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IntelligenceEvent | null) => void;
  incidents?: IntelligenceEvent[];
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ThreeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("3D View encountered an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full h-full min-h-[360px] bg-isie-bg-deep flex flex-col items-center justify-center p-6 text-center font-mono text-xs select-none">
          <div className="max-w-md p-5 bg-isie-panel border border-amber-500/40 rounded-sm shadow-2xl space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="font-bold tracking-wider uppercase text-sm">
                3D Spatial Canvas Suspended
              </span>
            </div>
            <p className="text-[11px] text-isie-text-secondary leading-relaxed">
              WebGL context or graphics hardware temporarily unavailable. All incident intelligence records remain accessible via the 2D Tactical Map.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={this.reset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold uppercase rounded-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESTORE 3D ENGINE</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Resilient dynamic loader for Three.js Satellite Earth fallback
const DynamicThreeGlobeView = dynamic(
  () =>
    import("@/components/visuals/Global3DView")
      .then((mod) => mod.Global3DView)
      .catch(async (err) => {
        console.warn("Chunk load error in Global3DView, retrying in 600ms...", err);
        await new Promise((r) => setTimeout(r, 600));
        return import("@/components/visuals/Global3DView")
          .then((mod) => mod.Global3DView)
          .catch((retryErr) => {
            console.error("Failed to load 3D spatial chunk after retry:", retryErr);
            const Fallback: React.FC<Global3DViewProps> = () => (
              <div className="w-full h-full min-h-[360px] bg-isie-bg-deep flex flex-col items-center justify-center p-6 text-center font-mono text-xs select-none">
                <div className="max-w-md p-5 bg-isie-panel border border-amber-500/40 rounded-sm shadow-2xl space-y-3">
                  <div className="flex items-center justify-center gap-2 text-amber-400">
                    <Globe className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="font-bold tracking-wider uppercase text-sm">
                      3D Spatial Engine Deferred
                    </span>
                  </div>
                  <p className="text-[11px] text-isie-text-secondary leading-relaxed">
                    The 3D planetary engine chunk could not be loaded. You can reload the view or switch to the 2D Tactical Map.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold uppercase rounded-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RELOAD APPLICATION</span>
                  </button>
                </div>
              </div>
            );
            return Fallback;
          });
      }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[360px] bg-isie-bg-deep flex flex-col items-center justify-center font-mono text-xs text-isie-cyan/70 gap-2.5 select-none">
        <div className="w-7 h-7 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
        <span className="tracking-widest uppercase animate-pulse">INITIALIZING 3D SPATIAL ENGINE...</span>
      </div>
    ),
  }
);

export const SafeGlobal3DView: React.FC<Global3DViewProps> = (props) => {
  const [remountKey, setRemountKey] = useState(0);

  return (
    <ThreeErrorBoundary key={remountKey} onReset={() => setRemountKey((k) => k + 1)}>
      <DynamicThreeGlobeView {...props} />
    </ThreeErrorBoundary>
  );
};

export default SafeGlobal3DView;
