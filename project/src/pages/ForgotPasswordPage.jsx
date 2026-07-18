import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cinebookLogo from '../assets/image.png';
import {
  Film,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  EyeOff,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { authApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast('Please enter your email', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setStep(2);
      toast('OTP sent to your email', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to request OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // OTP Handlers
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2 & 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      toast('Please enter the complete 6-digit OTP', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, otpString, newPassword);
      setStep(3); // Success Screen
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast(
        err?.response?.data?.message || 'Failed to reset password',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
        <div className="text-center animate-fade-in space-y-4">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce-slow">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Password Reset!</h2>
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative">
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="
              relative flex items-center justify-center shrink-0
              w-12 h-12 rounded-[14px]
              bg-[rgba(255,255,255,0.03)] backdrop-blur-xl
              border-2 border-[#cc2335]/50
              shadow-[0_0_20px_rgba(204,35,53,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]
              transition-all duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)]
              group-hover:scale-[1.08] group-hover:-translate-y-[2px]
              group-hover:bg-[rgba(255,255,255,0.08)] group-hover:border-[#cc2335]/80
              group-hover:shadow-[0_0_35px_rgba(204,35,53,0.7),inset_0_1px_0_rgba(255,255,255,0.2)]
              overflow-hidden
            ">
              <img
                src={cinebookLogo}
                alt="CineBook"
                className="w-[112%] h-[112%] max-w-none object-cover"
              />
            </div>
            <span className="text-3xl font-bold text-white font-outfit tracking-tight">
              Cine<span className="text-[#e63946]">Book</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === 1
              ? 'Enter your email to receive a reset code'
              : 'Enter the code and your new password'}
          </p>
        </div>

        {step === 1 ? (
          <form
            onSubmit={handleRequestOtp}
            className="glass-strong rounded-2xl p-6 space-y-5 animate-slide-up border border-white/10"
          >
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 py-3 text-base"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Send Reset Code
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1"
              >
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleResetPassword}
            className="glass-strong rounded-2xl p-6 space-y-5 animate-slide-up border border-white/10"
          >
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block font-medium text-center">
                6-Digit Code
              </label>
              <div className="flex justify-between gap-2 sm:gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="flex-1 min-w-0 w-full h-12 sm:h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl focus:border-[#ffd60a] focus:ring-1 focus:ring-[#ffd60a] text-white transition-all outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm text-gray-300 mb-1.5 block font-medium">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1.5 block font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                otp.join('').length < 6 ||
                !newPassword ||
                !confirmPassword
              }
              className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 py-3 text-base mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save New Password'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowRight className="w-3 h-3 rotate-180" /> Change Email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
