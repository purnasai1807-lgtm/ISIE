"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopCommandBar } from "./TopCommandBar";
import { CommandPalette } from "../command/CommandPalette";
import { useAuth } from "@/lib/auth/AuthContext";
import { resetDemoWorkspace } from "@/lib/prototype/demoWorkspace.mjs";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  scopeBadge?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  pageTitle,
  scopeBadge,
}) => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const { isDemoMode } = useAuth();

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener("gmp-quota-exceeded", handleQuota);
    return () => window.removeEventListener("gmp-quota-exceeded", handleQuota);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full bg-isie-bg-deep text-isie-text-primary overflow-hidden">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Right Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm shrink-0 flex items-center justify-center gap-2">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{" "}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{" "}
              for instructions to update your account.
            </span>
            <button
              onClick={() => setQuotaExceeded(false)}
              className="text-amber-800 hover:text-amber-950 font-bold text-xs ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Command Bar */}
        <TopCommandBar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          title={pageTitle}
          scopeBadge={scopeBadge}
        />

        {isDemoMode && (
          <div role="note" className="shrink-0 bg-amber-950 border-y border-amber-400/60 px-3 py-2 text-center text-[10px] sm:text-xs font-mono font-bold tracking-wide text-amber-100">
            NON-OPERATIONAL DEMO / SIMULATION — SAMPLE VALUES ARE NOT LIVE; USER ENTRIES ARE UNVERIFIED. NO LIVE FEEDS, ALERT DISPATCH OR EVACUATION ORDERS. BACKEND productionReady=false.
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset only this browser's ISIE prototype demo edits?")) {
                  try {
                    resetDemoWorkspace();
                  } catch (error) {
                    window.alert(error instanceof Error ? error.message : "Unable to reset prototype demo data.");
                  }
                }
              }}
              className="ml-3 underline underline-offset-2 hover:text-white"
            >
              RESET DEMO EDITS
            </button>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto scrollbar-thin relative flex flex-col min-h-0">
          {children}
        </main>
      </div>

      {/* Interactive Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};
