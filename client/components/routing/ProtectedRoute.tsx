import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-sm text-foreground/70">Checking authentication…</p>
        </div>
      </Layout>
    );
  }

  if (!configured) {
    return (
      <Layout>
        <div className="container py-24 max-w-lg text-center">
          <h1 className="text-2xl font-bold">Authentication not configured</h1>
          <p className="mt-2 text-foreground/70">
            To access FinTrack, connect Firebase Auth in project settings by adding VITE_FIREBASE_* variables, then refresh.
          </p>
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <>{children}</>;
}
