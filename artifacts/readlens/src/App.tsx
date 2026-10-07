import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import Upload from '@/pages/Upload';
import Reader from '@/pages/Reader';
import Notes from '@/pages/Notes';
import Search from '@/pages/Search';
import Settings from '@/pages/Settings';
import { LibraryShell } from '@/components/LibraryShell';
import { useEffect } from 'react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <LibraryShell>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/upload" component={Upload} />
          <Route path="/reader/:documentId" component={Reader} />
          <Route path="/notes" component={Notes} />
          <Route path="/search" component={Search} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </LibraryShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  useEffect(() => {
    const theme = localStorage.getItem('readlens-theme');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
