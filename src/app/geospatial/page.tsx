"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { Map2DView } from "@/components/visuals/Map2DView";
import { MapModeSwitcher, MapDisplayMode } from "@/components/visuals/MapModeSwitcher";
import { BasemapQuickToggle, BasemapMode } from "@/components/visuals/BasemapQuickToggle";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { Layers, MapPin, Eye, EyeOff, Satellite, ShieldAlert, Sliders, Maximize2, RotateCcw } from "lucide-react";
import { DEFAULT_MAP_LAYERS } from "@/lib/constants/tacticalLayers";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent } from "@/lib/types/isie";

import { SafeGlobal3DView as Global3DView } from "@/components/visuals/SafeGlobal3DView";

export default function GeospatialIntelligencePage() {
  const { isDemoMode } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [mapMode, setMapMode] = useState<MapDisplayMode>("2D_MAP");
  const [basemap, setBasemap] = useState<BasemapMode>("street");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [incidentLoadError, setIncidentLoadError] = useState<string | null>(null);

  // Active layer visibility map
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEFAULT_MAP_LAYERS.forEach((l) => {
      initial[l.id] = l.enabled ?? true;
    });
    return initial;
  });

  // Dynamic layer opacities map (0.0 to 1.0)
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_MAP_LAYERS.forEach((l) => {
      initial[l.id] = l.opacity ?? 0.8;
    });
    return initial;
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setIncidentLoadError(null);
    const unsubscribe = incidentService.subscribeIncidents(isDemoMode, (data) => {
      setIncidents(data);
      setIncidentLoadError(null);
    }, (error) => {
      setIncidents([]);
      setIncidentLoadError(error.message || "Exercise records could not be loaded.");
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isDemoMode]);

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayerOpacities((prev) => ({
      ...prev,
      [layerId]: Math.max(0, Math.min(1, opacity)),
    }));
  };

  const resetAllOpacities = () => {
    const initial: Record<string, number> = {};
    DEFAULT_MAP_LAYERS.forEach((l) => {
      initial[l.id] = l.opacity ?? 0.8;
    });
    setLayerOpacities(initial);
  };

  return (
    <AppShell pageTitle="Geospatial Intelligence // Satellite, GIS & Terrain Fusion">
      <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Main Geospatial Viewport */}
        <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-0 h-[420px] sm:h-[480px] lg:h-full min-w-0 bg-isie-bg-deep relative">
          {/* Top View Mode Switcher Header */}
          <div className="h-12 px-3 sm:px-4 border-b border-white/10 bg-isie-panel/90 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <MapModeSwitcher mode={mapMode} onChange={setMapMode} />
              {(mapMode === "2D_MAP" || mapMode === "GOOGLE_MAPS" || mapMode === "SPLIT_VIEW") && (
                <BasemapQuickToggle basemap={basemap} onChange={setBasemap} />
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <TacticalBadge variant="cyan" size="sm">
                WGS-84
              </TacticalBadge>
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-isie-text-muted">
                <Satellite className="w-3.5 h-3.5 text-amber-400" />
                <span>REMOTE-SENSING PROVIDER: NOT CONNECTED</span>
              </div>
            </div>
          </div>

          {/* Interactive Map View */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {incidentLoadError && (
              <div role="alert" className="absolute top-3 left-3 right-3 z-20 border border-red-500/40 bg-red-950/80 p-3 font-mono text-xs text-red-200">
                EXERCISE INCIDENT DATA UNAVAILABLE // {incidentLoadError}
              </div>
            )}
            {!mounted ? (
              <div className="w-full h-full min-h-[360px] bg-isie-bg-deep flex flex-col items-center justify-center font-mono text-xs text-isie-cyan/70 gap-2.5">
                <div className="w-7 h-7 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
                <span className="tracking-widest uppercase animate-pulse">INITIALIZING SPATIAL ENGINE...</span>
              </div>
            ) : (
              <>
                {mapMode === "2D_MAP" && (
                  <Map2DView
                    incidents={incidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                    basemap={basemap}
                    onBasemapChange={setBasemap}
                    activeLayers={activeLayers}
                    layerOpacities={layerOpacities}
                  />
                )}
                {mapMode === "GOOGLE_MAPS" && (
                  <Map2DView
                    incidents={incidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                    defaultToGoogleMaps
                    basemap={basemap}
                    onBasemapChange={setBasemap}
                    activeLayers={activeLayers}
                    layerOpacities={layerOpacities}
                  />
                )}
                {mapMode === "3D_GLOBE" && (
                  <Global3DView
                    incidents={incidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                  />
                )}
                {mapMode === "SPLIT_VIEW" && (
                  <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                    <div className="relative h-full min-h-0">
                      <Global3DView
                        incidents={incidents}
                        showOverlay={false}
                        selectedIncidentId={selectedIncidentId}
                        onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                      />
                    </div>
                    <div className="relative h-full min-h-0">
                      <Map2DView
                        incidents={incidents}
                        selectedIncidentId={selectedIncidentId}
                        onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                        basemap={basemap}
                        onBasemapChange={setBasemap}
                        activeLayers={activeLayers}
                        layerOpacities={layerOpacities}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar: Tactical GIS Layer & Spatial Filter Manager */}
        <div className="w-full lg:w-84 2xl:w-88 h-auto lg:h-full min-h-[340px] lg:min-h-0 bg-isie-panel border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col shrink-0 min-w-0 select-none">
          <div className="p-3.5 border-b border-white/10 bg-isie-panel-light/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-isie-cyan" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                Spatial Layers & Telemetry
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={resetAllOpacities}
                className="px-1.5 py-0.5 rounded-2xs text-[10px] font-mono text-isie-text-muted hover:text-white hover:bg-white/10 border border-white/10 flex items-center gap-1 transition-colors"
                title="Reset layer opacities to defaults"
              >
                <RotateCcw className="w-2.5 h-2.5 text-isie-cyan" />
                <span>RESET</span>
              </button>
              <TacticalBadge variant="muted" size="sm">
                {DEFAULT_MAP_LAYERS.length} LAYERS
              </TacticalBadge>
            </div>
          </div>

          {/* Layer List with Opacity Sliders */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {DEFAULT_MAP_LAYERS.map((layer) => {
              const isEnabled = activeLayers[layer.id] ?? false;
              const currentOpacity = layerOpacities[layer.id] ?? layer.opacity ?? 0.8;
              const opacityPercent = Math.round(currentOpacity * 100);

              return (
                <div
                  key={layer.id}
                  className={`p-3 rounded-xs border transition-all ${
                    isEnabled
                      ? "bg-[#0b1323]/80 border-sky-500/40 text-white shadow-lg"
                      : "bg-white/[0.02] border-white/5 text-isie-text-muted hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Layer Header with Interactive Visibility Toggle */}
                  <div
                    onClick={() => toggleLayer(layer.id)}
                    className="flex items-center justify-between cursor-pointer group select-none"
                    title={`Click to ${isEnabled ? "hide" : "show"} ${layer.name}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                          isEnabled
                            ? "bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                            : "bg-white/20"
                        }`}
                      />
                      <span className="font-mono text-xs font-semibold tracking-wide truncate group-hover:text-cyan-300 transition-colors">
                        {layer.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayer(layer.id);
                      }}
                      className={`p-1 rounded-2xs transition-colors ${
                        isEnabled
                          ? "text-cyan-400 hover:text-white hover:bg-cyan-500/20"
                          : "text-white/30 hover:text-white hover:bg-white/10"
                      }`}
                      title={isEnabled ? "Disable Layer" : "Enable Layer"}
                    >
                      {isEnabled ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-isie-text-dim leading-relaxed my-1.5">
                    {layer.description}
                  </p>

                  <div className="flex items-center justify-between font-mono text-[9px] text-isie-text-muted pb-2 border-b border-white/10">
                    <span className="truncate pr-1">{layer.sourceProvider}</span>
                    <span className="text-isie-cyan shrink-0">{layer.latencySpec}</span>
                  </div>

                  {/* Opacity Adjustment Slider */}
                  <div
                    className="mt-2.5 space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Sliders className="w-3 h-3 text-cyan-400" />
                        <span className="uppercase tracking-wider font-semibold text-[9px]">Opacity</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-2xs ${
                            isEnabled
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "bg-white/5 text-white/40 border border-white/10"
                          }`}
                        >
                          {opacityPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Slider Track and Range Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-white/40 select-none">0%</span>
                      <div className="relative flex-1 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          disabled={!isEnabled}
                          value={opacityPercent}
                          onChange={(e) =>
                            handleOpacityChange(layer.id, parseInt(e.target.value, 10) / 100)
                          }
                          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all ${
                            isEnabled
                              ? "bg-slate-700 accent-cyan-400 hover:accent-cyan-300"
                              : "bg-slate-800 opacity-40 cursor-not-allowed accent-slate-600"
                          }`}
                          title={`Adjust opacity for ${layer.name}: ${opacityPercent}%`}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-white/40 select-none">100%</span>
                    </div>

                    {/* Quick Preset Buttons (25%, 50%, 75%, 100%) */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">
                        {isEnabled ? "PRESETS:" : "DISABLED"}
                      </span>
                      <div className="flex items-center gap-1">
                        {[25, 50, 75, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={!isEnabled}
                            onClick={() => handleOpacityChange(layer.id, preset / 100)}
                            className={`px-1.5 py-0.5 rounded-2xs text-[9px] font-mono transition-all ${
                              opacityPercent === preset && isEnabled
                                ? "bg-cyan-400 text-black font-bold shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                                : isEnabled
                                ? "bg-white/5 text-slate-300 hover:text-white hover:bg-white/15 border border-white/10"
                                : "text-white/20 bg-white/[0.02] border border-white/5 cursor-not-allowed"
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Satellite Telemetry Status */}
          <div className="p-3 border-t border-white/10 bg-isie-panel-light/20 text-[10px] font-mono text-isie-text-dim flex justify-between items-center">
            <span>MAP OVERLAYS: LOCAL UI CONTROLS ONLY // NO DATA PROVIDERS CONNECTED</span>
            <span className="text-cyan-400">
              ACTIVE: {Object.values(activeLayers).filter(Boolean).length}/{DEFAULT_MAP_LAYERS.length}
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
