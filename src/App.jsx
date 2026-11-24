import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PaymentReturn from './pages/PaymentReturn';
import ResetPassword from './pages/ResetPassword';
import AdminLayout from '@/components/admin/AdminLayout';
import StateScreen from '@/components/states/StateScreen';

// Every screen except the first and the sign-in flow is split into its own
// chunk, so the phone only downloads what it is about to show.
const Tournaments = lazy(() => import('./pages/Tournaments'));
const MyMatches = lazy(() => import('./pages/MyMatches'));
const MatchDetail = lazy(() => import('./pages/MatchDetail'));
const WalletPage = lazy(() => import('./pages/Wallet'));
const Profile = lazy(() => import('./pages/Profile'));
const MatchResults = lazy(() => import('./pages/MatchResults'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTournaments = lazy(() => import('./pages/admin/AdminTournaments'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));

const RouteFallback = () => (
  <div className="glass flex items-center justify-center rounded-[26px] px-6 py-12">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (Supabase flow doesn't emit
  // user_not_registered). Never render nothing here — a silent redirect used
  // to leave a blank screen; show the failure with a way out instead.
  if (authError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <StateScreen
          variant="error"
          title="Couldn't load your account"
          hint="Check your connection and try again."
          showRetry
          onRetry={() => window.location.reload()}
          actionLabel="Log in"
          actionTo="/login"
        />
      </div>
    );
  }

  // Render the main app
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/payment-return" element={<PaymentReturn />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/tournaments" replace />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/my-matches" element={<MyMatches />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tournaments" element={<AdminTournaments />} />
          <Route path="/admin/requests" element={<AdminRequests />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/results" element={<MatchResults />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App