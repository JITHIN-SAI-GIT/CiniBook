import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LocationProvider } from './context/LocationContext';
import { DownloadProvider } from './context/DownloadContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LocationModal from './components/LocationModal';
import ChatWidget from './components/Chatbot/ChatWidget';
import { Loader2 } from 'lucide-react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const MoviesPage = lazy(() => import('./pages/MoviesPage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const RewardsPage = lazy(() => import('./pages/RewardsPage'));
const OttHomePage = lazy(() => import('./pages/OttHomePage'));
const OttMovieDetail = lazy(() => import('./pages/OttMovieDetail'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const TheatresPage = lazy(() => import('./pages/TheatresPage'));
const TheatreDetailPage = lazy(() => import('./pages/TheatreDetailPage'));
const WatchHistoryPage = lazy(() => import('./pages/WatchHistoryPage'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const GlobalLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-[#e63946] animate-spin" />
      <p className="text-gray-400 font-medium tracking-wide">
        Loading CineBook...
      </p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <DownloadProvider>
            <LocationProvider>
              <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
                <Navbar />
                {/* Global Location Modal — shown when location prompt is triggered */}
                <LocationModal />
                <ChatWidget />
                <main className="flex-1 flex flex-col">
                  <Suspense fallback={<GlobalLoader />}>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route
                        path="/verify-email"
                        element={<VerifyEmailPage />}
                      />
                      <Route
                        path="/forgot-password"
                        element={<ForgotPasswordPage />}
                      />
                      <Route path="/movies" element={<MoviesPage />} />
                      <Route path="/theatres" element={<TheatresPage />} />
                      <Route
                        path="/theatres/:id"
                        element={<TheatreDetailPage />}
                      />
                      <Route path="/ott" element={<OttHomePage />} />
                      <Route
                        path="/ott/movie/:id"
                        element={<OttMovieDetail />}
                      />
                      <Route
                        path="/ott/history"
                        element={<WatchHistoryPage />}
                      />
                      <Route path="/movie/:id" element={<MovieDetailPage />} />
                      <Route path="/booking/:id" element={<BookingPage />} />
                      <Route path="/checkout/:id" element={<CheckoutPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/rewards" element={<RewardsPage />} />
                      <Route path="/watchlist" element={<WatchlistPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/admin/login" element={<LoginPage />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </LocationProvider>
          </DownloadProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
