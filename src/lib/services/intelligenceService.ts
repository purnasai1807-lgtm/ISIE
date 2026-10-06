/**
 * ISIE - Integrated Situation Intelligence Engine
 * Intelligence & Crisis Telemetry Service
 */

import { EvidenceItem, IntelligenceEvent, VerificationStatus } from "../types/isie";
import { DEMO_INCIDENTS } from "@/data/demo/incidents";
import { DEMO_EVIDENCE } from "@/data/demo/intelligence";
import { createDemoCollection, createDemoId, runDemoWrite } from "@/lib/prototype/demoWorkspace.mjs";
import { incidentService } from "./incidentService";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase/client";
import { hasFreshVerifiedProvenance } from "@/lib/utils/dataQuality";

const demoEvidence = createDemoCollection("isie-prototype-demo-evidence", DEMO_EVIDENCE);

export interface IIntelligenceService {
  getActiveEvents(scopeOrDemo?: string | boolean, isDemoMode?: boolean): Promise<IntelligenceEvent[]>;
  getEventById(id: string, isDemoMode?: boolean): Promise<IntelligenceEvent | null>;
  getEvidenceForEvent(eventId: string, isDemoMode?: boolean): Promise<EvidenceItem[]>;
  getAllAuthoritativeEvidence(isDemoMode?: boolean): Promise<EvidenceItem[]>;
  verifyEvidence(evidenceId: string): Promise<{ success: boolean; status: VerificationStatus }>;
}

export class IntelligenceService implements IIntelligenceService {
  /**
   * Fetch active crisis events.
   * Seamlessly routes to Firestore in Real User Mode or DEMO_INCIDENTS in Demo Mode.
   */
  async getActiveEvents(scopeOrDemo?: string | boolean, isDemoMode?: boolean): Promise<IntelligenceEvent[]> {
    const isDemo = typeof scopeOrDemo === "boolean" ? scopeOrDemo : (isDemoMode ?? false);
    return incidentService.getIncidents(isDemo);
  }

  async getEventById(id: string, isDemoMode: boolean = false): Promise<IntelligenceEvent | null> {
    return incidentService.getIncidentById(id, isDemoMode);
  }

  async getEvidenceForEvent(eventId: string, isDemoMode: boolean = false): Promise<EvidenceItem[]> {
    const all = await this.getAllAuthoritativeEvidence(isDemoMode);
    return all.filter((e) => e.relatedEventIds.includes(eventId));
  }

  async getAllAuthoritativeEvidence(isDemoMode: boolean = false): Promise<EvidenceItem[]> {
    if (isDemoMode) {
      return demoEvidence.getAll();
    }

    try {
      const evidenceCol = collection(db, "evidence");
      const snapshot = await getDocs(query(evidenceCol));
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs
        .filter((d) => hasFreshVerifiedProvenance(d.data()))
        .map((d) => ({ id: d.id, ...(d.data() as Omit<EvidenceItem, "id">) }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "evidence");
      throw err;
    }
  }

  async createUserProvidedNote(
    title: string,
    summary: string,
    isDemoMode: boolean
  ): Promise<EvidenceItem | null> {
    return runDemoWrite(isDemoMode, () => {
      const cleanTitle = title.trim();
      const cleanSummary = summary.trim();
      if (cleanTitle.length < 3 || cleanSummary.length < 3) {
        throw new Error("Enter a title and user-provided note (at least 3 characters each).");
      }
      const item: EvidenceItem = {
        id: createDemoId("USER-NOTE"),
        title: cleanTitle,
        sourceName: "User-provided (unverified)",
        sourceType: "USER_PROVIDED_REPORT",
        timestamp: new Date().toISOString(),
        verificationStatus: "UNVERIFIED",
        confidenceScore: 0,
        technicalMetadata: {
          sensor: "Not applicable — user-entered note",
          resolution: "Not measured",
          revisitInterval: "Not applicable",
        },
        summary: cleanSummary,
        relatedEventIds: [],
      };
      demoEvidence.add(item);
      return item;
    }, null);
  }

  subscribeDemoEvidence(callback: (items: EvidenceItem[]) => void, onError?: (error: unknown) => void): () => void {
    let items: EvidenceItem[];
    try {
      items = demoEvidence.getAll();
    } catch (error) {
      if (!onError) throw error;
      onError(error);
      return () => {};
    }
    callback(items);
    return demoEvidence.subscribe(callback, onError);
  }

  async verifyEvidence(evidenceId: string): Promise<{ success: boolean; status: VerificationStatus }> {
    return { success: false, status: "UNVERIFIED" };
  }
}

export const intelligenceService = new IntelligenceService();
