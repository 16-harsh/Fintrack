export function AppFooter() {
  return (
    <footer className="border-t bg-background/80">
      <div className="container py-8 text-center text-sm text-foreground/60">
        <p>
          © {new Date().getFullYear()} FinTrack · Manage income, expenses, taxes and
          savings with clarity.
        </p>
      </div>
    </footer>
  );
}
