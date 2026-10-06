/**
 * ISIE - Integrated Situation Intelligence Engine
 * Tactical Warning & Alert Dispatch Service
 */

import { Alert } from "../types/isie";
import { DEMO_ALERTS } from "@/data/demo/alerts";
import { collection, getDocs, query } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";
import { hasFreshVerifiedProvenance } from "@/lib/utils/dataQuality";
import { createDemoCollection, createDemoId, runDemoWrite } from "@/lib/prototype/demoWorkspace.mjs";

const demoAlerts = createDemoCollection("isie-prototype-demo-alerts", DEMO_ALERTS);

export interface IAlertService {
  getActiveAlerts(scopeOrDemo?: string | boolean, isDemoMode?: boolean): Promise<Alert[]>;
  createDemoAlert(input: { title: string; location: string }, isDemoMode: boolean): Promise<Alert | null>;
  acknowledgeAlert(alertId: string, isDemoMode?: boolean): Promise<boolean>;
  dismissAlert(alertId: string, isDemoMode?: boolean): Promise<boolean>;
  muteAlert(alertId: string, isDemoMode?: boolean): Promise<boolean>;
}

export class AlertService implements IAlertService {
  async getActiveAlerts(scopeOrDemo?: string | boolean, isDemoMode?: boolean): Promise<Alert[]> {
    const isDemo = typeof scopeOrDemo === "boolean" ? scopeOrDemo : (isDemoMode ?? false);
    if (isDemo) {
      return demoAlerts.getAll();
    }
    if (!auth.currentUser) return [];

    try {
      const alertsCol = collection(db, "alerts");
      const snapshot = await getDocs(query(alertsCol));
      if (snapshot.empty) {
        return [];
      }
      const alerts = snapshot.docs
        .filter((d) => hasFreshVerifiedProvenance(d.data()))
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Alert, "id">) }));
      const uniqueAlerts = new Map<string, Alert>();
      for (const alert of alerts) {
        const dedupeKey = [
          alert.relatedEventId || alert.location,
          alert.alertType,
          alert.alertCode,
        ].join(":");
        if (!uniqueAlerts.has(dedupeKey)) uniqueAlerts.set(dedupeKey, alert);
      }
      return [...uniqueAlerts.values()];
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "alerts");
      throw err;
    }
  }

  async createDemoAlert(
    input: { title: string; location: string },
    isDemoMode: boolean
  ): Promise<Alert | null> {
    return runDemoWrite(isDemoMode, () => {
      const title = input.title.trim();
      const location = input.location.trim();
      if (title.length < 3 || location.length < 2) {
        throw new Error("Enter a short exercise note title and a user-provided exercise location.");
      }
      const id = createDemoId("DEMO-USER-ALERT");
      const alert: Alert = {
        id,
        alertCode: id,
        title: `SIMULATED EXERCISE NOTE: ${title}`,
        severity: "LOW",
        alertType: "SYSTEM_DIAGNOSTIC",
        location,
        timestamp: new Date().toISOString(),
        sourceAgency: "USER-PROVIDED (UNVERIFIED)",
        confidenceScore: 0,
        status: "ACKNOWLEDGED",
        recommendedAction: "Tabletop discussion only. No real-world action, broadcast, or dispatch is authorized.",
      };
      demoAlerts.add(alert);
      return alert;
    }, null);
  }

  subscribeDemoAlerts(callback: (items: Alert[]) => void, onError?: (error: unknown) => void): () => void {
    let items: Alert[];
    try {
      items = demoAlerts.getAll();
    } catch (error) {
      if (!onError) throw error;
      onError(error);
      return () => {};
    }
    callback(items);
    return demoAlerts.subscribe(callback, onError);
  }

  async acknowledgeAlert(alertId: string, isDemoMode: boolean = false): Promise<boolean> {
    return runDemoWrite(isDemoMode, () => demoAlerts.update(alertId, (a) => ({ ...a, status: "ACKNOWLEDGED" as const })));
  }

  async dismissAlert(alertId: string, isDemoMode: boolean = false): Promise<boolean> {
    return runDemoWrite(isDemoMode, () => demoAlerts.update(alertId, (a) => ({ ...a, status: "DISMISSED" as const })));
  }

  async muteAlert(alertId: string, isDemoMode: boolean = false): Promise<boolean> {
    return runDemoWrite(isDemoMode, () => demoAlerts.update(alertId, (a) => ({ ...a, status: "MUTED" as const })));
  }
}

export const alertService = new AlertService();
