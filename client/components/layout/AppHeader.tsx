import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/income", label: "Income" },
  { to: "/expenses", label: "Expenses" },
  { to: "/goals-reminders", label: "Goals & Reminders" },
  { to: "/itr", label: "ITR" },
  { to: "/gst", label: "GST" },
];

export function AppHeader() {
  const { pathname } = useLocation();
  const { user, configured, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/login"} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
          <span className="text-lg font-bold tracking-tight">FinTrack</span>
        </Link>
        {user && (
          <nav className="hidden md:flex items-center gap-6">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground/80",
                  pathname === n.to ? "text-foreground" : "text-foreground/60",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {!user ? (
            <Link to="/login">
              <Button size="sm">Login</Button>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => signOut()}>Sign out</Button>
          )}
        </div>
      </div>
    </header>
  );
}
