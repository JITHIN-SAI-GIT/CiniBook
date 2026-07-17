import { useState } from 'react';
import {
  Link,
  useNavigate,
  useLocation as useRouterLocation,
} from 'react-router-dom';
import {
  Film,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
  Ticket,
  MapPin,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocation } from '../context/LocationContext';
import { motion, useReducedMotion } from 'framer-motion';

export default function Navbar() {
  const { profile, isLoggedIn, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const { selectedCity, setShowLocationModal } = useLocation();
  const navigate = useNavigate();
  const location = useRouterLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSignOut = () => {
    signOut();
    toast('Signed out. See you soon! 👋', 'info');
    navigate('/');
    setMobileOpen(false);
  };

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/movies', label: 'Movies' },
    { path: '/theatres', label: 'Theatres' },
    { path: '/ott', label: 'OTT', special: true },
  ];

  if (isLoggedIn) {
    navItems.push(
      { path: '/rewards', label: 'Rewards' },
      { path: '/watchlist', label: 'My List' },
      { path: '/ott/history', label: 'History' }
    );
  }

  const glassStyle = {
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 8px 24px rgba(0, 0, 0, 0.12)',
    borderBottom: 'none'
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      style={glassStyle}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Cine<span className="text-[#ffd60a]">Book</span>
            </span>
          </Link>

          {/* Location Pill (desktop) */}
          <button
            onClick={() => setShowLocationModal(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-[#ffd60a]/40 transition-all text-xs text-gray-300 hover:text-[#ffd60a] shrink-0 bg-white/5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#e63946]" />
            <span className="max-w-[120px] truncate">
              {selectedCity || 'Set Location'}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 relative">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className="relative px-3 py-2 text-sm font-medium rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.18)] rounded-lg shadow-[0_4px_20px_rgba(255,255,255,0.08),inset_0_0_10px_rgba(255,255,255,0.02)]"
                      initial={false}
                      transition={
                        shouldReduceMotion 
                          ? { duration: 0.2, ease: 'easeInOut' }
                          : { type: "spring", stiffness: 300, damping: 26, mass: 1 }
                      }
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={`relative z-10 block transition-colors ${
                      active ? 'text-white' : item.special ? 'text-[#ffd60a] hover:text-[#ffd60a]/80' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </motion.div>
                </Link>
              );
            })}

            {isAdmin && (
              <Link to="/admin" className="relative px-3 py-2 text-sm font-medium rounded-lg hover:bg-white/5 transition-colors ml-2 focus:outline-none">
                {isActive('/admin') && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-[#e63946] rounded-lg shadow-lg shadow-red-500/20"
                    initial={false}
                    transition={
                      shouldReduceMotion 
                        ? { duration: 0.2, ease: 'easeInOut' }
                        : { type: "spring", stiffness: 300, damping: 26, mass: 1 }
                    }
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                    isActive('/admin') ? 'text-white' : 'text-[#e63946]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Admin
                </motion.div>
              </Link>
            )}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <Ticket className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e63946] to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm border border-white/10">
                    {profile?.fullName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm text-white font-medium drop-shadow-sm">
                    {profile?.fullName?.split(' ')[0]}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="btn-ghost flex items-center gap-1.5 text-sm !px-3 !py-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm !px-4">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary text-sm !px-4">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors focus:outline-none"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div 
          className="md:hidden animate-slide-up border-t border-white/10"
          style={glassStyle}
        >
          <div className="px-4 py-4 space-y-1">
            {/* Location */}
            <button
              onClick={() => {
                setShowLocationModal(true);
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all w-full"
            >
              <MapPin className="w-4 h-4 text-[#e63946]" />
              {selectedCity ? `📍 ${selectedCity}` : '📍 Set My Location'}
            </button>

            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              🏠 Home
            </Link>
            <Link
              to="/movies"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/movies') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              🎬 Movies
            </Link>
            <Link
              to="/theatres"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/theatres') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              <Building2 className="w-4 h-4" /> Theatres
            </Link>
            <Link
              to="/ott"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/ott') ? 'bg-white/10 text-white border border-white/20' : 'text-[#ffd60a] hover:bg-white/5'}`}
            >
              📺 OTT Movies
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  to="/rewards"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/rewards') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  🎁 Rewards
                </Link>
                <Link
                  to="/watchlist"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/watchlist') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  ➕ My List
                </Link>
                <Link
                  to="/ott/history"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/ott/history') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  ⏳ Watch History
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/dashboard') ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> My Bookings
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all ${isActive('/admin') ? 'bg-[#e63946] text-white shadow-lg' : 'text-[#e63946] hover:bg-[#e63946]/10'}`}
              >
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </Link>
            )}
            <div className="border-t border-white/10 pt-3 mt-3">
              {isLoggedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e63946] to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {profile?.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">
                        {profile?.fullName}
                      </p>
                      <p className="text-xs text-gray-500">{profile?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn-ghost flex-1 text-center text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="btn-primary flex-1 text-center text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
