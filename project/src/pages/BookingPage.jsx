import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Lock,
  Loader2,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react';
import { showtimesApi, seatLocksApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import {
  formatPrice,
  formatDate,
  formatTime,
  formatDuration,
  getRowLabel,
} from '../lib/utils';
import SeatMap from '../components/SeatMap';
import { SeatMapSkeleton } from '../components/Skeletons';

const LOCK_DURATION_MINUTES = 5;
const MAX_SEATS = 8;

export function getSeatPrice(label, st) {
  const rowIdx = label.charCodeAt(0) - 65;
  if (rowIdx < 3) return Number(st.priceSilver);
  if (rowIdx >= st.rowsCount - 2) return Number(st.pricePlatinum);
  return Number(st.priceGold);
}

export default function BookingPage() {
  const { id: showtimeId } = useParams();
  const navigate = useNavigate();
  const { profile, isLoggedIn } = useAuth();
  const { toast } = useToast();

  const [showtime, setShowtime] = useState(null);
  const [bookedSeats, setBookedSeats] = useState(new Set());
  const [lockedByOthers, setLockedByOthers] = useState(new Set());
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proceeding, setProceeding] = useState(false);
  const lockIntervalRef = useRef(null);
  const isProceedingRef = useRef(false);

  useEffect(() => {
    if (!showtimeId) return;
    (async () => {
      setLoading(true);
      try {
        const [stRes, bookedRes] = await Promise.all([
          showtimesApi.getById(Number(showtimeId)),
          showtimesApi.getBookedSeats(Number(showtimeId)),
        ]);
        setShowtime(stRes.data);
        setBookedSeats(new Set(bookedRes.data || []));
      } finally {
        setLoading(false);
      }
    })();
  }, [showtimeId]);

  const refreshLocks = useCallback(async () => {
    if (!showtimeId) return;
    try {
      const res = await showtimesApi.getLockedSeats(Number(showtimeId));
      const { lockedByOthers: others } = res.data;
      setLockedByOthers(new Set(others || []));
    } catch {
      /* ignore */
    }
  }, [showtimeId]);

  useEffect(() => {
    refreshLocks();
    lockIntervalRef.current = setInterval(refreshLocks, 3000);
    return () => {
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    };
  }, [refreshLocks]);

  // Cleanup locks on unmount (only if not proceeding to checkout)
  useEffect(() => {
    return () => {
      if (showtimeId && isLoggedIn && !isProceedingRef.current) {
        seatLocksApi.unlockAll(Number(showtimeId)).catch(() => {});
      }
    };
  }, [showtimeId, isLoggedIn]);

  // Auto-refresh locks before expiry
  useEffect(() => {
    if (selectedSeats.length === 0 || !showtimeId || !isLoggedIn) return;
    const id = setInterval(() => {
      seatLocksApi.refresh(Number(showtimeId)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [selectedSeats, showtimeId, isLoggedIn]);

  const handleToggleSeat = async (label) => {
    if (!isLoggedIn) {
      toast('Please log in to select seats', 'info');
      navigate('/login');
      return;
    }
    if (!showtimeId) return;
    if (bookedSeats.has(label) || lockedByOthers.has(label)) return;

    if (selectedSeats.includes(label)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== label));
      try {
        await seatLocksApi.unlock(Number(showtimeId), label);
      } catch {
        /* ignore */
      }
    } else {
      if (selectedSeats.length >= MAX_SEATS) {
        toast(`Max ${MAX_SEATS} seats per booking`, 'error');
        return;
      }
      try {
        await seatLocksApi.lock(Number(showtimeId), label);
        setSelectedSeats((prev) => [...prev, label]);
      } catch (err) {
        const msg = err?.response?.data?.message;
        toast(msg || 'Seat just taken by another user', 'error');
        refreshLocks();
      }
    }
  };

  const handleProceed = async () => {
    if (!showtime || !showtimeId) return;
    setProceeding(true);
    try {
      const res = await showtimesApi.getLockedSeats(Number(showtimeId));
      const myLocks = res.data.myLocks || [];
      const myLockedSet = new Set(myLocks);
      const allValid = selectedSeats.every((s) => myLockedSet.has(s));
      if (!allValid) {
        toast('Some seats are no longer locked. Please reselect.', 'error');
        refreshLocks();
        return;
      }
      const total = selectedSeats.reduce(
        (sum, s) => sum + getSeatPrice(s, showtime),
        0
      );
      isProceedingRef.current = true;
      navigate(`/checkout/${showtimeId}`, {
        state: {
          seats: selectedSeats,
          total,
          movieTitle: showtime.movie?.title,
        },
      });
    } finally {
      setProceeding(false);
    }
  };

  const seats = [];
  if (showtime) {
    for (let r = 0; r < showtime.rowsCount; r++) {
      for (let c = 0; c < showtime.colsCount; c++) {
        const label = `${getRowLabel(r)}${c + 1}`;
        let status = 'available';
        if (bookedSeats.has(label)) status = 'booked';
        else if (lockedByOthers.has(label)) status = 'locked';
        else if (selectedSeats.includes(label)) status = 'selected';
        seats.push({ label, row: getRowLabel(r), col: c + 1, status });
      }
    }
  }

  const total = showtime
    ? selectedSeats.reduce((sum, s) => sum + getSeatPrice(s, showtime), 0)
    : 0;

  if (loading) {
    return (
      <div className="pt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SeatMapSkeleton />
      </div>
    );
  }

  if (!showtime) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Showtime not found.</p>
        <Link to="/movies" className="btn-primary mt-4 inline-block">
          Browse Movies
        </Link>
      </div>
    );
  }

  const movie = showtime.movie;
  const theatre = showtime.theatre;

  return (
    <div className="min-h-screen pt-20 page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={`/movie/${movie?.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#ffd60a] mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to {movie?.title}
        </Link>

        {/* Showtime info card */}
        <div className="glass rounded-2xl p-5 mb-8 neon-border-red">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4 items-start">
              <img
                src={movie?.posterUrl}
                alt={movie?.title}
                className="w-16 h-24 rounded-xl object-cover shadow-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-white">{movie?.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {theatre?.name}
                  </span>
                  <span className="text-[#ffd60a]">{showtime.screenName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{' '}
                    {formatDate(showtime.showDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />{' '}
                    {formatTime(showtime.showTime)}
                  </span>
                  {movie && <span>{formatDuration(movie.duration)}</span>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">Starting from</p>
              <p className="text-2xl font-bold text-[#ffd60a]">
                {formatPrice(Number(showtime.priceSilver))}
              </p>
            </div>
          </div>
        </div>

        {/* Seat map */}
        <div className="glass rounded-2xl border border-white/10 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-[#ffd60a]" />
            <h2 className="text-lg font-semibold text-white">
              Select Your Seats
            </h2>
            <span className="text-sm text-gray-500 ml-auto">
              Max {MAX_SEATS} seats
            </span>
          </div>
          <SeatMap
            showtime={showtime}
            seats={seats}
            onToggleSeat={handleToggleSeat}
            maxSeats={MAX_SEATS}
          />
        </div>

        {/* Booking summary */}
        <div className="glass rounded-2xl p-6 space-y-4 neon-border-gold">
          <h3 className="font-semibold text-white text-lg">Booking Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Selected Seats</span>
              <span className="text-white font-medium">
                {selectedSeats.length > 0 ? (
                  selectedSeats.sort().map((s) => (
                    <span
                      key={s}
                      className="inline-block bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30 rounded px-1.5 py-0.5 text-xs font-mono ml-1"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">None selected</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Number of Seats</span>
              <span className="text-white font-medium">
                {selectedSeats.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Categories</span>
              <span className="text-white font-medium text-xs text-right">
                Silver: {formatPrice(Number(showtime.priceSilver))} | Gold:{' '}
                {formatPrice(Number(showtime.priceGold))} | Plat:{' '}
                {formatPrice(Number(showtime.pricePlatinum))}
              </span>
            </div>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-white">
              Total Amount
            </span>
            <span className="text-2xl font-bold text-[#ffd60a]">
              {formatPrice(total)}
            </span>
          </div>
          <button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0 || proceeding}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base py-3"
          >
            {proceeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              `Proceed to Checkout — ${formatPrice(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
