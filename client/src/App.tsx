import React from 'react';
import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Rolodex from './components/Gigness/Rolodex';

function Router() {
  return (
    <Switch>
      {/* Home now points to lowercase home.tsx */}
      <Route path="/" component={Home} />
      <Route path="/rolodex" component={Rolodex} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <header className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tighter text-gold">GIGZITO</h1>
          <nav className="space-x-4 text-sm font-medium">
            <a href="/" className="hover:text-gold transition-colors">Home</a>
            <a href="/rolodex" className="hover:text-gold transition-colors">Digital Deck</a>
          </nav>
        </header>

        <main>
          <Router />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

