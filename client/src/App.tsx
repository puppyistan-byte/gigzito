import { Component, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e?.message ?? "Unknown error" }; }
  componentDidCatch(e: Error) { console.error("[ErrorBoundary]", e); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: "#0f0f0f", color: "#fff", fontFamily: "sans-serif" }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 24, wordBreak: "break-word" }}>{this.state.error}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
              style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Navbar } from "@/components/navbar";
import { useSocket } from "@/hooks/use-socket";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ListingDetailPage from "@/pages/listing-detail";
import AuthPage from "@/pages/auth";
import ProviderDashboard from "@/pages/provider-dashboard";
import ProviderProfilePage from "@/pages/provider-profile";
import NewListingPage from "@/pages/new-listing";
import AdminPage from "@/pages/admin";
import ProviderPublicPage from "@/pages/provider-public";
import GigCardDirectoryPage from "@/pages/gigcard-directory";
import VerifyEmailPage from "@/pages/verify-email";
import LogoutPage from "@/pages/logout";
import ResetPasswordPage from "@/pages/reset-password";
import GeezeesPage from "@/pages/geezees";
import CardEditorPage from "@/pages/card-editor";
import PricingPage from "@/pages/pricing";
import GeeZeeProfilePage from "@/pages/geezee-profile";
import QrRedirectPage from "@/pages/qr-redirect";
import GzBusinessPage from "@/pages/gz-business";
import OfferCenterPage from "@/pages/offer-center";
import InviteLandingPage from "@/pages/invite-landing";
import ActivityPage from "@/pages/activity";
import GzBusinessDirectoryPage from "@/pages/gz-business-directory";
import BusinessStorefrontPage from "@/pages/business-storefront";
import BusinessProfileSetupPage from "@/pages/business-profile-setup";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/listing/:id" component={ListingDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/provider/me" component={ProviderDashboard} />
      <Route path="/provider/profile" component={ProviderProfilePage} />
      <Route path="/provider/new" component={NewListingPage} />
      <Route path="/provider/:id" component={ProviderPublicPage} />
      <Route path="/gigcard-directory" component={GigCardDirectoryPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/logout" component={LogoutPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/geezees" component={GeezeesPage} />
      <Route path="/card-editor" component={CardEditorPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/geezee/:userId" component={GeeZeeProfilePage} />
      <Route path="/gz-business" component={GzBusinessDirectoryPage} />
      <Route path="/gz-business/manage" component={GzBusinessPage} />
      <Route path="/gz-business-directory" component={GzBusinessDirectoryPage} />
      <Route path="/offer-center" component={OfferCenterPage} />
      <Route path="/gz-invite" component={InviteLandingPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/qr/:uuid" component={QrRedirectPage} />
      <Route path="/business-profile/setup" component={BusinessProfileSetupPage} />
      <Route path="/business-profile/settings" component={BusinessProfileSetupPage} />
      <Route path="/business/:id" component={BusinessStorefrontPage} />
      <Route path="/storefront/:username" component={BusinessStorefrontPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SocketInitializer() {
  const { user } = useAuth();
  useSocket(user?.user?.id);
  return null;
}

function AppShell() {
  const [location] = useLocation();
  const hideNavbarRoutes = ["/offer-center", "/gz-invite"];
  const showNavbar = !hideNavbarRoutes.includes(location) && !location.startsWith("/join-group");
  return (
    <>
      <SocketInitializer />
      <Toaster />
      {showNavbar && <Navbar />}
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppShell />
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
