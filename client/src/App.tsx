import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ListingDetailPage from "@/pages/listing-detail";
import AuthPage from "@/pages/auth";
import ProviderDashboard from "@/pages/provider-dashboard";
import ProviderProfilePage from "@/pages/provider-profile";
import NewListingPage from "@/pages/new-listing";
import AdminPage from "@/pages/admin";
import GigJackNewPage from "@/pages/gigjack-new";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/listing/:id" component={ListingDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/provider/me" component={ProviderDashboard} />
      <Route path="/provider/profile" component={ProviderProfilePage} />
      <Route path="/provider/new" component={NewListingPage} />
      <Route path="/gigjack/new" component={GigJackNewPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
