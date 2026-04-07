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
import GigJackNewPage from "@/pages/gigjack-new";
import ProviderPublicPage from "@/pages/provider-public";
import LiveNowPage from "@/pages/live-now";
import GoLivePage from "@/pages/go-live";
import LiveViewPage from "@/pages/live-view";
import AllEyesOnMePage from "@/pages/all-eyes-on-me";
import ZitoTVPage from "@/pages/zito-tv";
import GigCardDirectoryPage from "@/pages/gigcard-directory";
import LeaderboardPage from "@/pages/leaderboard";
import VerifyEmailPage from "@/pages/verify-email";
import LogoutPage from "@/pages/logout";
import AdvertisePage from "@/pages/advertise";
import GeezeesPage from "@/pages/geezees";
import CardEditorPage from "@/pages/card-editor";
import PricingPage from "@/pages/pricing";
import KeepingItGeezeePage from "@/pages/keeping-it-geezee";
import WhatIsGigJackPage from "@/pages/what-is-gigjack";
import PreemptiveMarketingPage from "@/pages/preemptive-marketing";
import GeeZeeProfilePage from "@/pages/geezee-profile";
import GzBusinessPage from "@/pages/gz-business";
import OfferCenterPage from "@/pages/offer-center";
import InviteLandingPage from "@/pages/invite-landing";
import ActivityPage from "@/pages/activity";
import GZMusicPage from "@/pages/gz-music";
import GZMusicUploadPage from "@/pages/gz-music-upload";
import MostLovedPage from "@/pages/most-loved";
import GroupsPage from "@/pages/groups";
import GroupDetailPage from "@/pages/group-detail";
import JoinGroupPage from "@/pages/join-group";

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
      <Route path="/live" component={LiveNowPage} />
      <Route path="/live/go" component={GoLivePage} />
      <Route path="/live/:id" component={LiveViewPage} />
      <Route path="/buy-live" component={AllEyesOnMePage} />
      <Route path="/all-eyes-on-me" component={AllEyesOnMePage} />
      <Route path="/zito-tv" component={ZitoTVPage} />
      <Route path="/gigjack/new" component={GigJackNewPage} />
      <Route path="/gigcard-directory" component={GigCardDirectoryPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/logout" component={LogoutPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/advertise" component={AdvertisePage} />
      <Route path="/geezees" component={GeezeesPage} />
      <Route path="/card-editor" component={CardEditorPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/keeping-it-geezee" component={KeepingItGeezeePage} />
      <Route path="/what-is-gigjack" component={WhatIsGigJackPage} />
      <Route path="/preemptive-marketing" component={PreemptiveMarketingPage} />
      <Route path="/geezee/:userId" component={GeeZeeProfilePage} />
      <Route path="/gz-business" component={GzBusinessPage} />
      <Route path="/offer-center" component={OfferCenterPage} />
      <Route path="/gz-invite" component={InviteLandingPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/gz-music" component={GZMusicPage} />
      <Route path="/gz-music/upload" component={GZMusicUploadPage} />
      <Route path="/most-loved" component={MostLovedPage} />
      <Route path="/groups" component={GroupsPage} />
      <Route path="/groups/:id" component={GroupDetailPage} />
      <Route path="/join-group/:token" component={JoinGroupPage} />
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
