/**
 * ISIE - Integrated Situation Intelligence Engine
 * Tactical Notification Service
 */

import { NotificationItem } from "../types/isie";
import { DEMO_NOTIFICATIONS } from "@/data/demo/notifications";
import { collection, getDocs, query } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";
import { hasFreshVerifiedProvenance } from "@/lib/utils/dataQuality";
import { createDemoCollection, createDemoId, runDemoWrite } from "@/lib/prototype/demoWorkspace.mjs";

const demoNotifications = createDemoCollection("isie-prototype-demo-notifications", DEMO_NOTIFICATIONS);

export interface INotificationService {
  getNotifications(isDemoMode?: boolean): Promise<NotificationItem[]>;
  createDemoNote(title: string, message: string, isDemoMode: boolean): Promise<NotificationItem | null>;
  markAsRead(notificationId: string, isDemoMode?: boolean): Promise<boolean>;
  clearAll(isDemoMode?: boolean): Promise<boolean>;
}

export class NotificationService implements INotificationService {
  async getNotifications(isDemoMode: boolean = false): Promise<NotificationItem[]> {
    if (isDemoMode) {
      return demoNotifications.getAll();
    }
    if (!auth.currentUser) return [];

    try {
      const col = collection(db, "notifications");
      const snapshot = await getDocs(query(col));
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs
        .filter((d) => hasFreshVerifiedProvenance(d.data()))
        .map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, "id">) }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "notifications");
      throw err;
    }
  }

  async createDemoNote(title: string, message: string, isDemoMode: boolean): Promise<NotificationItem | null> {
    return runDemoWrite(isDemoMode, () => {
      const cleanTitle = title.trim();
      const cleanMessage = message.trim();
      if (cleanTitle.length < 3 || cleanMessage.length < 3) {
        throw new Error("Enter a note title and message (at least 3 characters each).");
      }
      const item: NotificationItem = {
        id: createDemoId("DEMO-USER-NOTE"),
        title: `SIMULATED DEMO NOTE: ${cleanTitle}`,
        message: cleanMessage,
        category: "SCENARIO",
        timestamp: new Date().toISOString(),
        read: false,
        priority: "NORMAL",
      };
      demoNotifications.add(item);
      return item;
    }, null);
  }

  async markAsRead(notificationId: string, isDemoMode: boolean = false): Promise<boolean> {
    return runDemoWrite(isDemoMode, () => demoNotifications.update(notificationId, (n) => ({ ...n, read: true })));
  }

  async clearAll(isDemoMode: boolean = false): Promise<boolean> {
    return runDemoWrite(isDemoMode, () => {
      demoNotifications.replace([]);
      return true;
    });
  }

  subscribeDemoNotifications(callback: (items: NotificationItem[]) => void, onError?: (error: unknown) => void): () => void {
    let items: NotificationItem[];
    try {
      items = demoNotifications.getAll();
    } catch (error) {
      if (!onError) throw error;
      onError(error);
      return () => {};
    }
    callback(items);
    return demoNotifications.subscribe(callback, onError);
  }
}

export const notificationService = new NotificationService();
