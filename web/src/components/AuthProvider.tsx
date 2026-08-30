"use client";

// Client-side auth context. Note: the role exposed here drives UI rendering
// ONLY (e.g. showing the Admin nav link). Authorization is always re-checked
// server-side from the verified ID token on every API call.

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

interface AuthState {
  user: User | null;
  role: "admin" | "user" | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true });

  useEffect(() => {
    return onIdTokenChanged(clientAuth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, loading: false });
        return;
      }
      const result = await user.getIdTokenResult();
      const role = result.claims.role === "admin" ? "admin" : "user";
      setState({ user, role, loading: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** Fetch wrapper that attaches the Firebase ID token. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = clientAuth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}
