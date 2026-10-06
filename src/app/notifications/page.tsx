"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Bell, Radio, Check, Trash2, Filter, CheckCircle2, ArrowRight } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { notificationService } from "@/lib/services/notificationService";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotificationItem } from "@/lib/types/isie";

export default function NotificationsPage() {
  const { isDemoMode } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    setLoadError(null);
    if (isDemoMode) {
      return notificationService.subscribeDemoNotifications((items) => {
        setNotifications(items);
        setLoadError(null);
      }, (error) => {
        setNotifications([]);
        setLoadError(error instanceof Error ? error.message : "Local demo notifications could not be loaded.");
      });
    }
    notificationService.getNotifications(isDemoMode)
      .then(setNotifications)
      .catch(() => {
        setNotifications([]);
        setLoadError("Notification records could not be loaded. This is not an empty verified-notification assessment.");
      });
  }, [isDemoMode]);

  const handleCreateDemoNote = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const item = await notificationService.createDemoNote(draftTitle, draftMessage, isDemoMode);
      if (!item) throw new Error("Local notes are available only in demo mode.");
      setDraftTitle("");
      setDraftMessage("");
      setShowCreate(false);
      setMutationNotice("Saved locally as a simulated note. It was not broadcast or sent to a recipient.");
    } catch (error) {
      setMutationNotice(error instanceof Error ? error.message : "Unable to save local note.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const results = await Promise.all(notifications.map((n) => notificationService.markAsRead(n.id, isDemoMode)));
      if (results.every(Boolean)) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      else setMutationNotice("Notification updates are disabled until the audited backend is configured.");
    } catch (error) {
      setMutationNotice(error instanceof Error ? error.message : "Unable to save notification changes.");
    }
  };

  const handleClear = async () => {
    try {
      if (await notificationService.clearAll(isDemoMode)) setNotifications([]);
      else setMutationNotice("Notification clearing is unavailable outside local demo mode.");
    } catch (error) {
      setMutationNotice(error instanceof Error ? error.message : "Unable to clear local notifications.");
    }
  };

  const handleMarkSingle = async (id: string) => {
    try {
      if (!(await notificationService.markAsRead(id, isDemoMode))) {
        setMutationNotice("Notification updates are disabled until the audited backend is configured.");
        return;
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      setMutationNotice(error instanceof Error ? error.message : "Unable to save the local notification update.");
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "CRITICAL") return n.category === "CRITICAL_ALERT";
    if (filter === "INTEL") return n.category === "INTEL_UPDATE";
    if (filter === "SYSTEM") return n.category === "SYSTEM";
    return true;
  });

  return (
    <AppShell pageTitle="Notifications // Platform Dispatch & Feed Broadcasts">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                {isDemoMode ? "Local Demo Notes & Notifications" : "Operational Notifications"}
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              {isDemoMode ? "All entries are local simulation records; nothing is broadcast or dispatched." : "No operational telemetry or notification provider is configured."}
            </p>
          </div>

          {mutationNotice && (
            <div role="status" className="border border-amber-500/40 bg-amber-950/30 p-3 font-mono text-xs text-amber-200">
              {mutationNotice}
            </div>
          )}
          {loadError && (
            <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-200">
              {loadError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {notifications.filter((n) => !n.read).length} {isDemoMode ? "UNREAD DEMO NOTES" : "UNREAD NOTIFICATIONS"}
            </TacticalBadge>
            {isDemoMode && <TacticalButton variant="secondary" size="sm" onClick={() => setShowCreate((open) => !open)}>{showCreate ? "CANCEL NOTE" : "ADD LOCAL NOTE"}</TacticalButton>}
          </div>
        </div>

        {showCreate && isDemoMode && (
          <form onSubmit={handleCreateDemoNote} className="grid gap-3 p-4 bg-isie-panel border border-sky-500/30 rounded-sm">
            <input required minLength={3} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Local exercise note title" className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs" />
            <textarea required minLength={3} value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} placeholder="User-provided demo note (not broadcast)" className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs" rows={3} />
            <TacticalButton variant="primary" size="sm" type="submit">SAVE BROWSER-LOCAL NOTE</TacticalButton>
          </form>
        )}

        {/* Filter Controls & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {["ALL", "CRITICAL", "INTEL", "SYSTEM"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                  filter === f
                    ? "bg-sky-950/40 text-sky-200 border-sky-500/40 font-semibold"
                    : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <TacticalButton
              variant="secondary"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleMarkAllRead}
            >
              MARK ALL READ
            </TacticalButton>
            <TacticalButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleClear}
            >
              CLEAR LOG
            </TacticalButton>
          </div>
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {loadError ? (
            <div role="alert" className="p-8 bg-isie-panel border border-red-500/30 rounded-sm text-center font-mono text-xs text-red-200">
              NOTIFICATION DATA UNAVAILABLE // {loadError}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 bg-isie-panel border border-white/10 rounded-sm text-center font-mono text-xs text-isie-text-muted">
              NO NOTIFICATIONS IN SELECTED CATEGORY
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkSingle(item.id)}
                className={`p-4 rounded-sm border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.read
                    ? "bg-isie-panel/60 border-white/5 text-isie-text-muted"
                    : "bg-isie-panel border-sky-500/40 text-white shadow-[0_0_12px_rgba(56,189,248,0.1)]"
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <TacticalBadge
                      variant={
                        item.category === "CRITICAL_ALERT"
                          ? "critical"
                          : item.category === "INTEL_UPDATE"
                          ? "cyan"
                          : "muted"
                      }
                      size="sm"
                    >
                      {item.category.replace("_", " ")}
                    </TacticalBadge>
                    <span className="text-[11px] text-isie-text-dim">{item.timestamp}</span>
                  </div>

                  <h3 className="font-mono text-sm font-semibold text-white break-words">
                    {item.title}
                  </h3>
                  <p className="text-xs text-isie-text-secondary break-words">
                    {item.message}
                  </p>
                </div>

                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    className="shrink-0 flex items-center gap-1 text-xs font-mono text-isie-primary hover:underline font-semibold"
                  >
                    <span>OPEN MODULE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
