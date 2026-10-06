"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { TacticalButton } from "../ui/TacticalButton";

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
}

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-grounding-title"
        className="w-full max-w-xl bg-isie-panel border border-amber-500/40 rounded-sm shadow-2xl text-slate-100"
      >
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 id="search-grounding-title" className="font-mono text-sm font-bold uppercase text-white">
            External search unavailable
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-isie-text-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="p-5 space-y-3 font-mono text-xs">
          <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xs flex gap-2 text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>Search grounding is not configured in this non-operational prototype. No search request was made.</p>
          </div>
          <p className="text-isie-text-secondary">
            No live web verification, source citations, or tactical log persistence is available here. This surface does not provide operational information.
          </p>
        </div>
        <footer className="p-3 border-t border-white/10 flex justify-end">
          <TacticalButton variant="ghost" size="sm" onClick={onClose}>CLOSE</TacticalButton>
        </footer>
      </section>
    </div>
  );
};

export default SearchGroundingModal;
