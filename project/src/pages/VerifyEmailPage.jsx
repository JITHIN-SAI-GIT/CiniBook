import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Film, Mail, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      // Focus last filled input
      const lastIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      toast('Please enter the complete 6-digit OTP', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp({ email, otp: otpString });
      localStorage.setItem('cb_token', data.token);
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/'; // Reload to fetch profile in AuthContext
      }, 1500);
    } catch (err) {
      toast(err?.response?.data?.message || 'Invalid OTP', 'error');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    setResendLoading(true);
    try {
      await authApi.resendOtp({ email });
      toast('A new OTP has been sent to your email', 'success');
      setTimeLeft(60);
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to resend OTP', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-fade-in space-y-4">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce-slow">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
          <p className="text-gray-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative">
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-xl flex items-center justify-center shadow-lg">
              <Film className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white font-outfit">
              Cine<span className="text-[#ffd60a]">Book</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> We sent a code to{' '}
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="glass-strong rounded-2xl p-8 space-y-6 animate-slide-up border border-white/10"
        >
          <div className="flex justify-between gap-2 sm:gap-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={6} // allow pasting
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="flex-1 min-w-0 w-full h-14 sm:h-16 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl focus:border-[#ffd60a] focus:ring-1 focus:ring-[#ffd60a] text-white transition-all outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <div className="flex flex-col items-center justify-center gap-2 pt-4 border-t border-white/5 text-sm">
            <p className="text-gray-400">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={timeLeft > 0 || resendLoading}
              className={`font-medium transition-colors ${
                timeLeft > 0
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-[#ffd60a] hover:text-white'
              }`}
            >
              {resendLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                </span>
              ) : timeLeft > 0 ? (
                `Resend code in ${timeLeft}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-3 h-3 rotate-180" /> Change Email Address
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
