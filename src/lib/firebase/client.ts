"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDocFromServer,
  setLogLevel,
} from "firebase/firestore";
const configuredFirebase = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "",
};

export const isFirebaseConfigured = Boolean(
  configuredFirebase.apiKey &&
    configuredFirebase.authDomain &&
    configuredFirebase.projectId &&
    configuredFirebase.appId
);

const firebaseConfig = isFirebaseConfigured
  ? configuredFirebase
  : {
      ...configuredFirebase,
      apiKey: "isie-prototype-auth-disabled",
      projectId: "isie-prototype-unconfigured",
      appId: "1:000000000000:web:isie-prototype-disabled",
    };

// Configure Firestore log level and filter benign offline notices in browser
try {
  setLogLevel("silent");
} catch {}

if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    for (const arg of args) {
      const msg = typeof arg === "string" ? arg : (arg?.message || "");
      const code = arg?.code || "";
      if (
        msg.includes("Could not reach Cloud Firestore backend") ||
        msg.includes("Backend didn't respond within 10 seconds") ||
        (msg.includes("@firebase/firestore") && msg.includes("offline mode")) ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        msg.includes("auth/popup-closed-by-user") ||
        msg.includes("auth/cancelled-popup-request") ||
        msg.includes("popup-closed-by-user")
      ) {
        return;
      }
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const code = reason?.code || "";
    const msg = reason?.message || (typeof reason === "string" ? reason : "");
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      msg.includes("auth/popup-closed-by-user") ||
      msg.includes("auth/cancelled-popup-request") ||
      msg.includes("popup-closed-by-user")
    ) {
      event.preventDefault();
    }
  });
}

// Initialize Firebase App instance using initializeApp
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth instance using getAuth
export const auth: Auth = getAuth(app);

// Initialize Firestore instance with forced long polling.
// In browser iframe/proxy environments, WebSockets can stall or buffer, causing the
// 10-second "Could not reach Cloud Firestore backend" warning.
// experimentalForceLongPolling immediately uses HTTP WebChannel long-polling without the 10-second wait.
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const firestore: Firestore = firestoreInstance;

// Export db alias for firestore
export const db: Firestore = firestore;

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function verifyFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    await getDocFromServer(doc(firestore, "users", auth.currentUser.uid));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
    return false;
  }
}

// User Profile persistence model
export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  organization: string;
  clearance: string;
  callsign: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt: string;
  preferences?: {
    defaultMapMode?: string;
    theme?: string;
    reducedMotion?: boolean;
    highContrast?: boolean;
  };
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Could not reach Cloud Firestore") || errMsg.includes("offline")) {
    console.warn(`Firestore request failed while offline for ${operationType} on ${path || "root"}; no fallback data is used.`);
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.warn("Firestore Operation Notice:", JSON.stringify(errInfo));
}

export async function syncUserProfile(
  user: FirebaseUser,
  extraData?: Partial<FirestoreUserProfile>
): Promise<FirestoreUserProfile | null> {
  if (!user.uid) return null;
  const userRef = doc(firestore, "users", user.uid);
  try {
    const existing = await getDoc(userRef);
    const now = new Date().toISOString();
    const profile: FirestoreUserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || extraData?.displayName || "Signed-in user",
      photoURL: user.photoURL || undefined,
      role: existing.exists() ? existing.data()?.role : "VIEWER",
      organization: existing.exists() ? existing.data()?.organization : (extraData?.organization || "UNSPECIFIED"),
      clearance: existing.exists() ? existing.data()?.clearance : (extraData?.clearance || "UNASSIGNED"),
      callsign: existing.exists() ? existing.data()?.callsign : (extraData?.callsign || "UNASSIGNED"),
      createdAt: existing.exists() ? existing.data()?.createdAt : now,
      updatedAt: now,
      lastLoginAt: now,
      preferences: existing.exists() ? existing.data()?.preferences : {
        defaultMapMode: "3D_GLOBE",
        theme: "DARK_TACTICAL",
        reducedMotion: false,
      },
    };
    await setDoc(userRef, profile, { merge: true });
    return profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    return null;
  }
}

export async function getTrustedUserRole(user: FirebaseUser): Promise<"ADMIN" | "OPERATOR" | "ANALYST" | "VIEWER"> {
  try {
    const claims = (await user.getIdTokenResult()).claims;
    const role = claims.role;
    if (role === "ADMIN" || role === "OPERATOR" || role === "ANALYST") {
      return role;
    }
  } catch (error) {
    console.warn("Unable to read trusted role claims; using VIEWER permissions.", error);
  }
  return "VIEWER";
}

// Tactical Logs & Transcriptions persistence
export interface TacticalLogItem {
  id?: string;
  userId: string;
  title: string;
  content: string;
  source: "VOICE_TRANSCRIPTION" | "MAPS_GROUNDING" | "FIELD_NOTE" | "INCIDENT_UPDATE";
  sector?: string;
  coordinates?: { lat: number; lng: number };
  groundingData?: any;
  createdAt: string;
}

export async function addTacticalLog(
  userId: string,
  log: Omit<TacticalLogItem, "userId" | "createdAt">
): Promise<string | null> {
  try {
    const logsRef = collection(firestore, "users", userId, "tactical_logs");
    const docRef = await addDoc(logsRef, {
      ...log,
      userId,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/tactical_logs`);
    return null;
  }
}

export function subscribeTacticalLogs(
  userId: string,
  callback: (logs: TacticalLogItem[]) => void
) {
  const logsRef = collection(firestore, "users", userId, "tactical_logs");
  const q = query(logsRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: TacticalLogItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TacticalLogItem, "id">),
      }));
      callback(logs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/tactical_logs`);
    }
  );
}

// Export Auth & Firestore Primitives
export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
};

export default { app, auth, firestore, db };
