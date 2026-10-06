"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
  syncUserProfile,
  getTrustedUserRole,
  verifyFirestoreConnection,
  FirestoreUserProfile,
} from "@/lib/firebase/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  clearance: string;
  callsign: string;
  isDemo: boolean;
  avatarUrl?: string;
  provider?: string;
}

export const DEMO_CREDENTIALS = {
  email: "demo@isie.ai",
  password: "ISIE-DEMO-2026",
};

export const DEFAULT_DEMO_USER: AuthUser = {
  id: "usr-demo-01",
  name: "Operations Director (Trident Actual)",
  email: "demo@isie.ai",
  role: "DEMO_USER",
  organization: "National Crisis Command / CredForge",
  clearance: "Strategic Command Level 4",
  callsign: "DIR-OP",
  isDemo: true,
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; isDemo?: boolean }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  loginDemo: () => Promise<void>;
  signup: (data: { name: string; email: string; password: string; role?: string; organization?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "isie_auth_session";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    // Try local session first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed?.isDemo === true && parsed.role === "DEMO_USER") {
          setUser(DEFAULT_DEMO_USER);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Listen to Firebase Auth state for real users
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const synced = await syncUserProfile(fbUser);
        const trustedRole = await getTrustedUserRole(fbUser);
        const mappedUser: AuthUser = {
          id: fbUser.uid,
          name: fbUser.displayName || synced?.displayName || "Tactical Operator",
          email: fbUser.email || "",
          role: trustedRole,
          organization: synced?.organization || "UNSPECIFIED",
          clearance: synced?.clearance || "UNASSIGNED",
          callsign: synced?.callsign || "UNASSIGNED",
          isDemo: false,
          avatarUrl: fbUser.photoURL || undefined,
          provider: fbUser.providerData?.[0]?.providerId || "firebase",
        };
        setUser(mappedUser);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        } catch {}
      } else {
        // If not authenticated via Firebase, check if user was on demo mode
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.isDemo === true && parsed.role === "DEMO_USER") {
              setUser(DEFAULT_DEMO_USER);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            setUser(null);
          }
        } catch {}
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const synced = await syncUserProfile(result.user);
        const trustedRole = await getTrustedUserRole(result.user);
        const authedUser: AuthUser = {
          id: result.user.uid,
          name: result.user.displayName || synced?.displayName || "Operator",
          email: result.user.email || "",
          role: trustedRole,
          organization: synced?.organization || "National Crisis Center",
          clearance: synced?.clearance || "Strategic Level 4",
          callsign: synced?.callsign || "DIR-GOOGLE",
          isDemo: false,
          avatarUrl: result.user.photoURL || undefined,
          provider: "google",
        };
        setUser(authedUser);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
        } catch {}
        return { success: true };
      }
      return { success: false, error: "Google authentication failed" };
    } catch (err: any) {
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";

      // Benign user action: user closed the Google sign-in popup or cancelled the operation
      if (
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/cancelled-popup-request" ||
        errorMsg.includes("popup-closed-by-user") ||
        errorMsg.includes("cancelled-popup-request")
      ) {
        // User closed popup or cancelled: do not emit console.error
        return {
          success: false,
          cancelled: true,
          error: "Sign-in was cancelled.",
        };
      }

      if (errorCode === "auth/popup-blocked" || errorMsg.includes("popup-blocked")) {
        return {
          success: false,
          error: "Popup window was blocked by your browser. Please allow popups for this site.",
        };
      }

      console.error("Google sign in error:", err);
      return { success: false, error: err?.message || "Failed to sign in with Google." };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string; isDemo?: boolean }> => {
    // Mode A: Demo Credentials
    if (email.toLowerCase().trim() === DEMO_CREDENTIALS.email.toLowerCase() && pass === DEMO_CREDENTIALS.password) {
      setUser(DEFAULT_DEMO_USER);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_USER));
        } catch {}
      }
      return { success: true, isDemo: true };
    }

    // Mode B: Real User Firebase Authentication
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const synced = await syncUserProfile(credential.user);
      const trustedRole = await getTrustedUserRole(credential.user);
      const authedUser: AuthUser = {
        id: credential.user.uid,
        name: credential.user.displayName || synced?.displayName || email.split("@")[0].toUpperCase(),
        email: credential.user.email || email,
        role: trustedRole,
        organization: synced?.organization || "UNSPECIFIED",
        clearance: synced?.clearance || "UNASSIGNED",
        callsign: synced?.callsign || "UNASSIGNED",
        isDemo: false,
        provider: "password",
      };
      setUser(authedUser);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
        } catch {}
      }
      return { success: true, isDemo: false };
    } catch (err: any) {
      const msg = err?.message || "Authentication failed.";
      return { success: false, error: msg };
    }
  };

  const loginDemo = async () => {
    setUser(DEFAULT_DEMO_USER);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_USER));
      } catch {}
      window.location.href = "/dashboard";
    }
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organization?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      if (cred.user) {
        if (data.name) {
          try {
            await updateProfile(cred.user, { displayName: data.name });
          } catch {}
        }
        const synced = await syncUserProfile(cred.user, {
          displayName: data.name,
          role: "VIEWER",
          organization: data.organization || "UNSPECIFIED",
          clearance: "UNASSIGNED",
          callsign: "UNASSIGNED",
        });

        const authedUser: AuthUser = {
          id: cred.user.uid,
          name: data.name || synced?.displayName || "Operator",
          email: cred.user.email || data.email,
          role: await getTrustedUserRole(cred.user),
          organization: synced?.organization || data.organization || "UNSPECIFIED",
          clearance: synced?.clearance || "UNASSIGNED",
          callsign: synced?.callsign || "UNASSIGNED",
          isDemo: false,
          provider: "password",
        };
        setUser(authedUser);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
          } catch {}
        }
        return { success: true };
      }
      return { success: false, error: "Account creation failed." };
    } catch (err: any) {
      console.error("Signup error:", err);
      return { success: false, error: err?.message || "Failed to create account." };
    }
  };

  const logout = () => {
    fbSignOut(auth).catch(() => {});
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      window.location.href = "/signin";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemoMode: user?.isDemo ?? false,
        login,
        loginWithGoogle,
        loginDemo,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
