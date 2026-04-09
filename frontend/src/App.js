import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthCallback from "./pages/AuthCallback";
import DiscoverPage from "./pages/DiscoverPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import DashboardPage from "./pages/DashboardPage";
import MessagesPage from "./pages/MessagesPage";
import LivePage from "./pages/LivePage";
import LiveStreamPage from "./pages/LiveStreamPage";
import StagePage from './pages/StagePage';
import VenueProfilePage from './pages/VenueProfilePage';
import FeedPage from './pages/FeedPage';
import PricingPage from './pages/PricingPage';
import CoinShopPage from './pages/CoinShopPage';
import CashoutPage from './pages/CashoutPage';
import AdminPage from './pages/AdminPage';
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();
  
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check URL fragment for access_token (Supabase Google OAuth callback)
  if (location.hash?.includes('access_token=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/stage" element={<StagePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/coins" element={<CoinShopPage />} />
      <Route path="/venue/:venueId" element={<VenueProfilePage />} />
      <Route path="/artist/:profileId" element={<ArtistProfilePage />} />
      <Route path="/live" element={<LivePage />} />
      <Route path="/live/:streamId" element={<LiveStreamPage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/messages" 
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/messages/:userId"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cashout"
        element={
          <ProtectedRoute>
            <CashoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
