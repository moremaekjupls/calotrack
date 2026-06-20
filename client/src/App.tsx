import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BottomNav } from "./components/BottomNav";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Privacy from "./pages/Privacy";

// Fixed, full-viewport photo background — sits behind every route so the
// liquid-glass cards have something to blur/refract. A dark scrim keeps
// average luminance predictable site-wide regardless of which patch of the
// (fairly dark, dappled) photo happens to be behind a given screen.
function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <img
        src="/images/hero-uzbek-spread.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/12" />
      <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklch,var(--primary)_14%,transparent)] via-transparent to-black/20" />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  // Reachable whether or not you're logged in — linked from the
  // registration consent checkbox before an account even exists yet.
  if (location === "/privacy") {
    return <Privacy />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <AppBackground />
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
