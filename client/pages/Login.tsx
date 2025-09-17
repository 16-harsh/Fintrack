import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

export default function Login() {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const nav = useNavigate();
  const location = useLocation() as any;
  const redirectTo = (location?.state?.from?.pathname as string) || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    if (!configured) { nav(redirectTo, { replace: true }); return; }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setError(null);
    if (!configured) { nav(redirectTo, { replace: true }); return; }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, email, password);
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!configured) { nav(redirectTo, { replace: true }); return; }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  }

  function enterDemo() {
    nav(redirectTo, { replace: true });
  }

  return (
    <Layout>
      <div className="container py-10">
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
          <p className="mt-1 text-sm text-foreground/70">Access your FinTrack dashboard.</p>

          {!configured && (
            <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-3 text-sm text-foreground/80">
              Firebase is not configured. You can still explore the site in demo mode.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <div className="grid gap-1">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button onClick={handleSignIn} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
              <Button variant="secondary" onClick={handleSignUp} disabled={loading}>Sign Up</Button>
            </div>
            <div className="mt-2">
              <Button variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">Continue with Google</Button>
            </div>
            {!configured && (
              <div className="mt-2">
                <Button onClick={enterDemo} className="w-full">Enter Demo</Button>
              </div>
            )}
            <p className="text-xs text-foreground/60 mt-2">
              By continuing you agree to our Terms and acknowledge our Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
