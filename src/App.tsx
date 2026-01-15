import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SignIn } from '@/pages/SignIn';
import { Projects } from '@/pages/Projects';
import VoiceForge from '@/pages/VoiceForge';
import VideoForge from '@/pages/VideoForge';
import NotFound from '@/pages/NotFound';
import { Header } from '@/components/Header';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      {user && <Header />}
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voiceforge"
          element={
            <ProtectedRoute>
              <VoiceForge />
            </ProtectedRoute>
          }
        />
        <Route
          path="/videoforge"
          element={
            <ProtectedRoute>
              <VideoForge />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
