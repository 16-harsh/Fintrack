import { FormEvent, useEffect, useMemo, useState } from "react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Index() {
  const navigate = useNavigate();
  const configured = useMemo(() => isFirebaseConfigured, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) { setError("Authentication not configured."); return; }
    try {
      setLoading(true);
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
        <div className="container grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-foreground/70">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Personal Finance Platform
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Track income, expenses, taxes and savings in one place
            </h1>
            <p className="mt-4 text-foreground/70 text-lg max-w-prose">
              FinTrack lets you upload invoices and receipts, categorize spending,
              visualize insights with pie and bar charts, set bill reminders, and export
              ITR/GST-ready Excel reports.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate("/dashboard")}>
                Explore Dashboard
              </Button>
              <a href="#login" className="text-sm font-medium text-foreground/70 hover:text-foreground">
                Secure Login below
              </a>
            </div>
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <li className="rounded-lg border bg-card p-4">
                <p className="font-semibold">Visual Analytics</p>
                <p className="text-sm text-foreground/70">Pie by category · Bar: income vs. expenses</p>
              </li>
              <li className="rounded-lg border bg-card p-4">
                <p className="font-semibold">Documents</p>
                <p className="text-sm text-foreground/70">Attach invoices and receipts to entries</p>
              </li>
              <li className="rounded-lg border bg-card p-4">
                <p className="font-semibold">Reminders & Savings</p>
                <p className="text-sm text-foreground/70">Plan savings and set bill due reminders</p>
              </li>
              <li className="rounded-lg border bg-card p-4">
                <p className="font-semibold">ITR/GST Exports</p>
                <p className="text-sm text-foreground/70">One-click Excel tailored for ITR or GST</p>
              </li>
            </ul>
          </div>
          <div id="login" className="lg:justify-self-end">
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold">Login</h2>
              {!configured && (
                <p className="mt-2 text-sm text-foreground/70">
                  Firebase is not connected yet. Set
                  VITE_FIREBASE_* variables in project settings to enable authentication.
                </p>
              )}
              <form onSubmit={onLogin} className="mt-6 grid gap-3">
                <div className="grid gap-1">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <input
                    id="email"
                    type="email"
                    required={configured}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-1">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <input
                    id="password"
                    type="password"
                    required={configured}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="••••���•••"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Button type="submit" disabled={loading || !configured} className="flex-1">
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
                <p className="text-xs text-foreground/60 mt-2">
                  By continuing you agree to our Terms and acknowledge our Privacy Policy.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
