/**
 * Read-only Firestore incident access. Operational writes remain disabled until
 * a trusted backend can validate provenance and produce append-only audit events.
 */

import { collection, doc, getDocs, getDoc, query, onSnapshot } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";
import { IntelligenceEvent } from "@/lib/types/isie";
import { DEMO_INCIDENTS } from "@/data/demo/incidents";
import { AuthUser } from "@/lib/auth/AuthContext";
import { hasPermission } from "@/lib/auth/roles";
import { hasFreshVerifiedProvenance } from "@/lib/utils/dataQuality";
import { createDemoCollection, createDemoId } from "@/lib/prototype/demoWorkspace.mjs";

const demoIncidents = createDemoCollection("isie-prototype-demo-incidents", DEMO_INCIDENTS);

export interface CreateIncidentInput {
  title: string;
  incidentType?: string;
  category: IntelligenceEvent["category"];
  severity: IntelligenceEvent["severity"];
  status?: IntelligenceEvent["status"];
  summary: string;
  locationName: string;
  country?: string;
  affectedState?: string;
  affectedDistrict?: string;
  region?: string;
  coordinates: { lat: number; lng: number; elevationMeters?: number };
  populationAtRisk?: number;
  affectedAreaKm2?: number;
  infrastructureImpact?: string;
  criticalFacilitiesAffected?: number;
  source: string;
  sourceAgencies?: string[];
  confidence?: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  confidenceScore?: number;
  detectionTime?: string;
  additionalNotes?: string;
  relocationScore?: number;
  hazardZoneLevel?: IntelligenceEvent["hazardZoneLevel"];
  carryingCapacityStatus?: IntelligenceEvent["carryingCapacityStatus"];
  escalationRisk?: IntelligenceEvent["escalationRisk"];
}

export class IncidentService {
  async getIncidents(isDemoMode = false): Promise<IntelligenceEvent[]> {
    if (isDemoMode) return demoIncidents.getAll();
    if (!auth.currentUser) return [];

    try {
      const snapshot = await getDocs(query(collection(db, "incidents")));
      return snapshot.docs
        .filter((docSnap) => hasFreshVerifiedProvenance(docSnap.data()))
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<IntelligenceEvent, "id">),
        }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "incidents");
      return [];
    }
  }

  async getIncidentById(id: string, isDemoMode = false): Promise<IntelligenceEvent | null> {
    if (isDemoMode) return demoIncidents.getAll().find((incident) => incident.id === id) || null;
    if (!auth.currentUser) return null;

    try {
      const snapshot = await getDoc(doc(db, "incidents", id));
      if (!snapshot.exists() || !hasFreshVerifiedProvenance(snapshot.data())) return null;
      return { id: snapshot.id, ...(snapshot.data() as Omit<IntelligenceEvent, "id">) };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `incidents/${id}`);
      return null;
    }
  }

  subscribeIncidents(
    arg1: boolean | ((incidents: IntelligenceEvent[]) => void),
    arg2?: boolean | ((incidents: IntelligenceEvent[]) => void),
    onError?: (error: Error) => void
  ): () => void {
    const callback = typeof arg1 === "function"
      ? arg1
      : typeof arg2 === "function" ? arg2 : () => {};
    const isDemoMode = typeof arg1 === "boolean"
      ? arg1
      : typeof arg2 === "boolean" ? arg2 : false;

    if (isDemoMode) {
      callback(demoIncidents.getAll());
      return demoIncidents.subscribe(callback);
    }
    if (!auth.currentUser) {
      callback([]);
      return () => {};
    }

    try {
      return onSnapshot(
        collection(db, "incidents"),
        (snapshot) => callback(snapshot.docs
          .filter((docSnap) => hasFreshVerifiedProvenance(docSnap.data()))
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<IntelligenceEvent, "id">),
          }))),
        (error) => {
          handleFirestoreError(error, OperationType.LIST, "incidents");
          onError?.(error);
          callback([]);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "incidents");
      onError?.(error instanceof Error ? error : new Error(String(error)));
      callback([]);
      return () => {};
    }
  }

  subscribeToIncidents = this.subscribeIncidents;

  async createIncident(
    _input: CreateIncidentInput,
    creator: AuthUser
  ): Promise<{ success: boolean; incidentId?: string; error?: string }> {
    if (creator?.isDemo) {
      const title = _input.title.trim();
      if (title.length < 3 || !_input.summary.trim() || !_input.source.trim()) {
        return { success: false, error: "Provide a title, report details, and identify the user-provided source." };
      }
      if (
        !_input.coordinates ||
        !Number.isFinite(_input.coordinates.lat) ||
        _input.coordinates.lat < -90 ||
        _input.coordinates.lat > 90 ||
        !Number.isFinite(_input.coordinates.lng) ||
        _input.coordinates.lng < -180 ||
        _input.coordinates.lng > 180
      ) {
        return { success: false, error: "Coordinates must be valid latitude and longitude values." };
      }
      const id = createDemoId("DEMO-USER-CASE");
      const timestamp = new Date().toISOString();
      demoIncidents.add({
        id,
        eventCode: id,
        title,
        category: _input.category,
        severity: _input.severity,
        status: "REPORTED",
        timestamp,
        locationName: _input.locationName.trim() || "User-provided location",
        region: _input.region || "User-provided",
        coordinates: _input.coordinates,
        confidenceScore: 0,
        sourceCount: 1,
        sourceAgencies: [`USER-PROVIDED: ${_input.source.trim()}`],
        verificationStatus: "UNVERIFIED",
        summary: _input.summary.trim(),
        affectedHabitationsCount: 0,
        populationAtRisk: 0,
        userProvidedPopulationAtRisk: _input.populationAtRisk,
        hazardZoneLevel: undefined,
        carryingCapacityStatus: undefined,
        relocationScore: undefined,
        escalationRisk: "UNASSESSED",
        evidenceIds: [],
        source: `USER_PROVIDED_UNVERIFIED: ${_input.source.trim()}`,
        confidence: "LOW",
        createdAt: timestamp,
        updatedAt: timestamp,
        additionalNotes: _input.additionalNotes?.trim(),
      });
      return { success: true, incidentId: id };
    }
    if (!creator || !auth.currentUser || creator.id !== auth.currentUser.uid) {
      return { success: false, error: "A signed-in user is required." };
    }
    if (!hasPermission(creator.role, "canCreateIncident")) {
      return { success: false, error: `Role '${creator.role}' cannot create incidents.` };
    }
    return {
      success: false,
      error: "Incident writes are disabled until a trusted backend with provenance validation and audit logging is configured.",
    };
  }

  async updateIncident(
    _id: string,
    _updates: Partial<IntelligenceEvent>,
    _actor?: AuthUser
  ): Promise<boolean> {
    if (_actor?.isDemo) {
      return demoIncidents.update(_id, (incident) => ({ ...incident, ..._updates, updatedAt: new Date().toISOString() }));
    }
    return false;
  }

  async updateIncidentStatus(
    _id: string,
    _newStatus: IntelligenceEvent["status"],
    _notes: string,
    _actor: AuthUser
  ): Promise<{ success: boolean; error: string }> {
    if (_actor.isDemo) {
      const updated = demoIncidents.update(_id, (incident) => ({
        ...incident,
        status: _newStatus,
        updatedAt: new Date().toISOString(),
        additionalNotes: [incident.additionalNotes, `LOCAL DEMO NOTE: ${_notes}`].filter(Boolean).join("\n"),
      }));
      return updated
        ? { success: true, error: "" }
        : { success: false, error: "Demo case was not found." };
    }
    return {
      success: false,
      error: "Incident updates are disabled until a trusted backend with audit logging is configured.",
    };
  }
}

export const incidentService = new IncidentService();
