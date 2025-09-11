import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const cfg = useMemo(() => isFirebaseConfigured, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!cfg || !configured) {
      setError("Authentication is not configured.");
      return;
    }
    try {
      setLoading(true);
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard", { replace: true });
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
              Secure Login
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome to FinTrack
            </h1>
            <p className="mt-4 text-foreground/70 text-lg max-w-prose">
              Sign in to access your dashboard, manage income and expenses, set reminders, and export ITR/GST reports.
            </p>
            {!configured && (
              <p className="mt-4 text-sm text-destructive">
                Authentication not configured. Add VITE_FIREBASE_* settings to enable login.
              </p>
            )}
          </div>
          <div className="lg:justify-self-end">
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold">Login</h2>
              <form onSubmit={onLogin} className="mt-6 grid gap-3">
                <div className="grid gap-1">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <input id="email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="grid gap-1">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <input id="password" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Button type="submit" disabled={loading || !configured} className="flex-1">
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
                <p className="text-xs text-foreground/60 mt-2">Forgot password? Implement reset flow via Firebase if desired.</p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
