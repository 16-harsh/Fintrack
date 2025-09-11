import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setUser(null);
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [configured]);

  return (
    <AuthContext.Provider
      value={{ user, loading, configured, signOut: async () => configured ? signOut(getFirebaseAuth()) : Promise.resolve() }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
