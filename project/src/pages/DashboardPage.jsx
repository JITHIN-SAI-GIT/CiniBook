import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  X,
  Loader2,
  Film,
} from 'lucide-react';
import { bookingsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import { formatPrice, formatDate, formatTime } from '../lib/utils';

export default function DashboardPage() {
  const { profile, isLoggedIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate('/login');
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      setLoading(true);
      try {
        const res = await bookingsApi.getMyBookings();
        setBookings(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this booking? This action cannot be undone.')) return;
    setCancellingId(bookingId);
    try {
      await bookingsApi.cancel(bookingId);
      toast('Booking cancelled successfully', 'success');
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' } : b
        )
      );
    } catch {
      toast('Failed to cancel booking', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#e63946] mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="min-h-screen pt-20 page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Bookings</h1>
            <p className="text-gray-400 text-sm mt-1">
              Welcome back,{' '}
              <span className="text-[#ffd60a]">
                {profile?.fullName || 'Movie Lover'}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <div className="glass rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-bold text-green-400">
                {confirmed.length}
              </p>
              <p className="text-xs text-gray-500">Confirmed</p>
            </div>
            <div className="glass rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-bold text-gray-500">
                {cancelled.length}
              </p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </div>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-white/10">
            <Ticket className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-xl font-semibold">
              No bookings yet
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Start exploring movies and book your first ticket!
            </p>
            <Link
              to="/movies"
              className="btn-primary mt-6 inline-flex items-center gap-2"
            >
              <Film className="w-4 h-4" /> Browse Movies
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const st = booking.showtime;
              const movie = st?.movie;
              const theatre = st?.theatre;
              const isCancelled = booking.status === 'cancelled';

              return (
                <div
                  key={booking.id}
                  className={`glass rounded-2xl p-5 flex flex-col md:flex-row gap-5 transition-all border border-white/10 hover:border-white/20 ${isCancelled ? 'opacity-50' : ''}`}
                >
                  {/* Poster */}
                  {movie && (
                    <Link to={`/movie/${movie.id}`} className="shrink-0">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full md:w-20 h-32 md:h-28 rounded-xl object-cover shadow-lg hover:scale-105 transition-transform"
                      />
                    </Link>
                  )}

                  {/* Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {movie?.title || 'Unknown Movie'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Booking ID:{' '}
                          <span className="text-[#ffd60a] font-mono font-bold">
                            {booking.bookingRef}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`badge ${isCancelled ? 'badge-red' : 'badge-green'} shrink-0`}
                      >
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      {theatre && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#ffd60a]" />{' '}
                          {theatre.name}
                        </span>
                      )}
                      {st && (
                        <>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />{' '}
                            {formatDate(st.showDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{' '}
                            {formatTime(st.showTime)}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-gray-500">Seats:</span>
                      {booking.seats.sort().map((seat) => (
                        <span
                          key={seat}
                          className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs text-white font-mono"
                        >
                          {seat}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[#ffd60a] font-bold text-lg">
                        {formatPrice(Number(booking.totalAmount))}
                      </span>
                      {!isCancelled && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancellingId === booking.id}
                          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
