"use client";

import React from "react";

export type BasemapMode = "street" | "satellite";

interface BasemapQuickToggleProps {
  basemap: BasemapMode;
  onChange: (mode: BasemapMode) => void;
  className?: string;
  size?: "sm" | "md";
}

export const BasemapQuickToggle: React.FC<BasemapQuickToggleProps> = ({
  className = "",
  size = "sm",
}) => {
  return (
    <div
      className={`inline-flex items-center bg-black/60 border border-amber-400/50 rounded-xs backdrop-blur-md shadow-md font-mono uppercase font-bold tracking-wider text-amber-200 ${size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} ${className}`}
    >
      OFFLINE PROTOTYPE MAP // NO TILE PROVIDER
    </div>
  );
};

export default BasemapQuickToggle;
