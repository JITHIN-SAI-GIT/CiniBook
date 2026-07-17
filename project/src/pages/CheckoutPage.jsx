import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  CheckCircle,
  Ticket,
  Download,
  Shield,
} from 'lucide-react';
import { api, bookingsApi, showtimesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, formatDate, formatTime } from '../lib/utils';
import html2pdf from 'html2pdf.js';

function formatCardNumber(value) {
  return value
    .replace(/\s+/g, '')
    .replace(/[^0-9]/gi, '')
    .replace(/(\d{4})/g, '$1 ')
    .trim();
}

export default function CheckoutPage() {
  const { id: showtimeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const { toast } = useToast();

  const state = location.state;
  const [showtime, setShowtime] = useState(null);

  useEffect(() => {
    if (showtimeId) {
      showtimesApi
        .getById(Number(showtimeId))
        .then((res) => {
          setShowtime(res.data);
        })
        .catch(console.error);
    }
  }, [showtimeId]);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [card, setCard] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });

  if (!state || !state.seats || state.seats.length === 0) {
    return (
      <div className="pt-20 max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎫</div>
        <p className="text-gray-400 text-lg">No seats selected.</p>
        <Link to="/movies" className="btn-primary mt-4 inline-block">
          Browse Movies
        </Link>
      </div>
    );
  }

  const handlePay = async (e) => {
    e.preventDefault();
    if (!showtimeId || !isLoggedIn) return;
    setProcessing(true);

    // Instead of doing actual lock check here, ideally we call create order
    try {
      // Create backend razorpay order
      const res = await api.post('/payments/create-order', {
        amount: Math.round(state.total),
      });
      const orderData = res.data;

      if (orderData.id && orderData.id.startsWith('order_mock_')) {
        // Mock success
        const bookingRes = await bookingsApi.create(
          Number(showtimeId),
          state.seats,
          state.total
        );
        toast('Booking confirmed! 🎉', 'success');
        setSuccess({
          bookingRef: bookingRes.data.bookingRef || orderData.id,
          seats: bookingRes.data.seats,
          total: Number(bookingRes.data.totalAmount),
        });
        setProcessing(false);
        return;
      }

      // If actual razorpay keys are present, open Razorpay popup
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CineBook',
        description: `Booking for ${state.movieTitle}`,
        order_id: orderData.id,
        handler: async function (response) {
          // Verify on backend
          await fetch('http://localhost:8080/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          const bookingRes = await bookingsApi.create(
            Number(showtimeId),
            state.seats,
            state.total
          );
          toast('Booking confirmed! 🎉', 'success');
          setSuccess({
            bookingRef:
              bookingRes.data.bookingRef || response.razorpay_payment_id,
            seats: bookingRes.data.seats,
            total: Number(bookingRes.data.totalAmount),
          });
        },
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
        },
        theme: { color: '#e63946' },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err.message || 'Payment failed';
      toast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const [showQr, setShowQr] = useState(false);
  // Using a real, valid public UPI ID so PhonePe doesn't throw a "temporary issue" error.
  const upiId = 'pmcares@sbi';
  const name = 'Demo CineBook';
  const upiLink = `upi://pay?pa=${upiId}&pn=${name}&am=${state.total}&cu=INR`;

  const handleUpiPay = async () => {
    if (!showtimeId || !isLoggedIn) return;

    // On desktop, deep links often fail. We'll show a QR code too.
    setShowQr(true);

    // Try to open UPI app (this works on Mobile)
    window.location.href = upiLink;
  };

  const confirmUpiPayment = async () => {
    if (!showtimeId || !isLoggedIn) return;
    setProcessing(true);
    try {
      const bookingRes = await bookingsApi.create(
        Number(showtimeId),
        state.seats,
        state.total
      );
      toast('UPI Payment received! 🎉', 'success');
      setSuccess({
        bookingRef: bookingRes.data.bookingRef || 'UPI-' + Date.now(),
        seats: bookingRes.data.seats,
        total: Number(bookingRes.data.totalAmount),
      });
    } catch (err) {
      toast(
        err?.response?.data?.message || 'Failed to confirm booking',
        'error'
      );
    } finally {
      setProcessing(false);
    }
  };

  const downloadTicket = () => {
    const element = document.getElementById('ticket-container');
    if (!element) return;

    // Add temporary styling for PDF print
    const opt = {
      margin: 1,
      filename: `ticket-${success?.bookingRef}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="glass-strong rounded-3xl p-8 text-center space-y-6 animate-scale-in neon-border-gold">
            <div
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse-glow"
              style={{ boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}
            >
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Booking Confirmed! 🎉
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Your tickets have been booked successfully.
              </p>
            </div>

            {/* Ticket card */}
            <div
              id="ticket-container"
              className="bg-white rounded-2xl p-6 mx-auto shadow-2xl relative text-black overflow-hidden"
            >
              {/* Ticket Top */}
              <div className="text-center pb-4 border-b-2 border-dashed border-gray-300">
                <h2 className="text-xl font-bold uppercase tracking-widest">
                  {state.movieTitle}
                </h2>
                <p className="text-sm text-gray-500 font-mono mt-1">
                  CineBook Ticket
                </p>
              </div>

              {/* Ticket Middle Details */}
              <div className="py-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-left">
                    <p className="text-gray-500 text-xs uppercase">Date</p>
                    <p className="font-semibold">
                      {showtime ? formatDate(showtime.showDate) : '--'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs uppercase">Time</p>
                    <p className="font-semibold">
                      {showtime ? formatTime(showtime.showTime) : '--'}
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <p className="text-gray-500 text-xs uppercase">Seats</p>
                  <p className="font-bold text-lg font-mono">
                    {success.seats.sort().join(', ')}
                  </p>
                </div>
              </div>

              {/* Ticket Bottom QR / Barcode space */}
              <div className="pt-4 border-t-2 border-dashed border-gray-300 text-center bg-gray-50 rounded-b-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Booking Ref
                </p>
                <p className="text-xl font-bold font-mono tracking-widest">
                  {success.bookingRef}
                </p>
                <div className="h-12 mt-2 w-full bg-stripes-gray opacity-20"></div>{' '}
                {/* visual flair */}
              </div>

              {/* Circle cutouts */}
              <div className="absolute left-[-15px] top-[100px] w-8 h-8 bg-[#0a0a0f] rounded-full"></div>
              <div className="absolute right-[-15px] top-[100px] w-8 h-8 bg-[#0a0a0f] rounded-full"></div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={downloadTicket}
                className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <Link
                to="/dashboard"
                className="btn-primary flex-1 text-center text-sm"
              >
                My Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 page-enter">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={showtimeId ? `/booking/${showtimeId}` : '/movies'}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#ffd60a] mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Seat Selection
        </Link>

        <h1 className="text-2xl font-bold text-white mb-6">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order summary */}
          <div className="glass rounded-2xl p-6 space-y-4 border border-white/10">
            <h2 className="font-semibold text-white text-lg">Order Summary</h2>
            {state.movieTitle && (
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-lg bg-[#e63946]/20 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-[#e63946]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {state.movieTitle}
                  </p>
                  <p className="text-xs text-gray-500">
                    {state.seats.length} seat(s)
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Seats ({state.seats.length})
                </span>
                <span className="text-white font-mono text-xs">
                  {state.seats.sort().join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Price × {state.seats.length}
                </span>
                <span className="text-white">
                  {formatPrice(state.total / state.seats.length)} ×{' '}
                  {state.seats.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Convenience Fee</span>
                <span className="text-green-400 text-xs font-medium">FREE</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span className="text-[#ffd60a] text-lg">
                  {formatPrice(state.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-green-400" />
              <h2 className="font-semibold text-white">Secure Payment</h2>
            </div>

            <div className="flex bg-white/5 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${paymentMethod === 'card' ? 'bg-[#e63946] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Credit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${paymentMethod === 'upi' ? 'bg-[#e63946] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                UPI App
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <form onSubmit={handlePay} className="space-y-4 animate-fade-in">
                <p className="text-xs text-gray-500 mb-5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Simulated payment — no real
                  charge
                </p>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={card.number}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          number: formatCardNumber(e.target.value),
                        })
                      }
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="input-field pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="John Doe"
                    className="input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                      Expiry
                    </label>
                    <input
                      type="text"
                      value={card.expiry}
                      onChange={(e) =>
                        setCard({ ...card, expiry: e.target.value })
                      }
                      placeholder="MM/YY"
                      maxLength={5}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={card.cvv}
                      onChange={(e) =>
                        setCard({ ...card, cvv: e.target.value })
                      }
                      placeholder="123"
                      maxLength={4}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                {/* Quick fill */}
                <button
                  type="button"
                  onClick={() =>
                    setCard({
                      number: '4242 4242 4242 4242',
                      name: 'Test User',
                      expiry: '12/26',
                      cvv: '123',
                    })
                  }
                  className="text-xs text-[#ffd60a] hover:underline"
                >
                  Use test card →
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 text-base py-3"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Pay{' '}
                      {formatPrice(state.total)}
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6 animate-fade-in py-4">
                {showQr ? (
                  <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-4 mt-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`}
                      alt="UPI QR Code"
                      className="w-40 h-40"
                    />

                    <p className="text-black text-xs mt-2 font-medium">
                      Scan to Pay {formatPrice(state.total)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/10 p-4 rounded-xl inline-block mx-auto">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg"
                      alt="UPI"
                      className="h-10 mx-auto opacity-90"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-white font-medium mb-1">
                    {showQr ? 'Awaiting Payment...' : 'Pay directly via UPI'}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    {showQr
                      ? 'Scan the QR code with your phone, or if you are on mobile, the app should open automatically.'
                      : 'Click the button below to generate a QR code and open UPI apps.'}
                  </p>
                </div>

                {!showQr ? (
                  <button
                    type="button"
                    onClick={handleUpiPay}
                    disabled={processing}
                    className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 text-base py-3 shadow-[0_0_15px_rgba(230,57,70,0.3)]"
                  >
                    Generate QR & Pay {formatPrice(state.total)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={confirmUpiPayment}
                    disabled={processing}
                    className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 text-base py-3 bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)]"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{' '}
                        Verifying...
                      </>
                    ) : (
                      'Done, I have paid!'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
