import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/next"

// Configure React Router future flags to suppress warnings
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import History from "./pages/History";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import Repositories from "./pages/Repositories";
import NotFound from "./pages/NotFound";
import { DocumentationView } from "./components/documentation/DocumentationView";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminChangePassword from "./pages/admin/AdminChangePassword";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminModels from "./pages/admin/AdminModels";
import AdminContent from "./pages/admin/AdminContent";
import AdminSystem from "./pages/admin/AdminSystem";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminPricing from "./pages/admin/AdminPricing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <AdminAuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter {...routerConfig}>
              <Routes>
              <Route
                path="/"
                element={
                  <PublicOnlyRoute>
                    <Index />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/pricing" element={<Pricing />} />
              <Route
                path="/about"
                element={
                  <PublicOnlyRoute>
                    <About />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <Register />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support" element={<Support />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route
                path="/scan"
                element={
                  <ProtectedRoute>
                    <Scan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/repositories"
                element={
                  <ProtectedRoute>
                    <Repositories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documentation/:repositoryId"
                element={
                  <ProtectedRoute>
                    <DocumentationView />
                  </ProtectedRoute>
                }
              />
              <Route path="/chat" element={<Chat />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/change-password"
                element={
                  <ProtectedAdminRoute>
                    <AdminChangePassword />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedAdminRoute>
                    <AdminUsers />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <ProtectedAdminRoute>
                    <AdminSubscriptions />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedAdminRoute>
                    <AdminAnalytics />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/models"
                element={
                  <ProtectedAdminRoute>
                    <AdminModels />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/content"
                element={
                  <ProtectedAdminRoute>
                    <AdminContent />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/system"
                element={
                  <ProtectedAdminRoute>
                    <AdminSystem />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedAdminRoute>
                    <AdminSettings />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/pricing"
                element={
                  <ProtectedAdminRoute>
                    <AdminPricing />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedAdminRoute>
                    <AdminReports />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedAdminRoute>
                    <AdminLogs />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <ProtectedAdminRoute>
                    <AdminProfile />
                  </ProtectedAdminRoute>
                }
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
