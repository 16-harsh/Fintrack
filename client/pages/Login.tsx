import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";

export default function Login() {
  const { user, configured, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from: string = location.state?.from?.pathname ?? "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const canSubmit = useMemo(() => email.length > 3 && password.length >= 6, [email, password]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-sm text-foreground/70">Loading…</p>
        </div>
      </Layout>
    );
  }

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!configured || !isFirebaseConfigured) throw new Error("Authentication is not configured.");
      const auth = getFirebaseAuth();
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Failed to authenticate");
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!configured || !isFirebaseConfigured) throw new Error("Authentication is not configured.");
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Failed to authenticate with Google");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container max-w-md py-10">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign in to FinTrack" : "Create your FinTrack account"}</CardTitle>
            <CardDescription>
              {configured ? "Use your email and password or continue with Google." : "Authentication is not configured. Add VITE_FIREBASE_* env vars to enable sign-in."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Authentication error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={!configured || !canSubmit || submitting}>
                {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <div className="mt-4">
              <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={!configured || submitting}>
                Continue with Google
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-foreground/70">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button className="text-primary underline underline-offset-2" onClick={() => setMode("signup")}>Sign up</button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button className="text-primary underline underline-offset-2" onClick={() => setMode("signin")}>Sign in</button>
                </>
              )}
            </p>
            <p className="text-xs text-foreground/60">By continuing, you agree to the Terms and acknowledge the Privacy Policy.</p>
          </CardFooter>
        </Card>
        {!configured && (
          <p className="mt-6 text-center text-sm text-foreground/70">
            Tip: You can still browse public pages, but protected pages require configuring Firebase. Add VITE_FIREBASE_* in project settings and refresh.
          </p>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-primary underline underline-offset-2">Back to home</Link>
        </p>
      </div>
    </Layout>
  );
}
