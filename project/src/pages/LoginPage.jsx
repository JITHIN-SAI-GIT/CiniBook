import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, googleSignIn } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Invalid email format';

    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error === 'EMAIL_NOT_VERIFIED') {
      toast('Please verify your email before logging in.', 'error');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } else if (error) {
      toast(error, 'error');
    } else {
      toast('Welcome back! 🎬', 'success');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#e63946]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
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
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 text-sm mt-1">
            Sign in to continue your cinema experience
          </p>
        </div>

        <form
          onSubmit={handleLogin}
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
                className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm text-gray-300 block font-medium">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#ffd60a] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 mt-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <div className="w-full flex justify-center mt-2">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  setLoading(true);
                  googleSignIn(credentialResponse.credential).then(
                    ({ error }) => {
                      setLoading(false);
                      if (error) {
                        toast(error, 'error');
                      } else {
                        toast('Successfully signed in with Google!', 'success');
                        navigate('/');
                      }
                    }
                  );
                }
              }}
              onError={() => {
                toast('Google Sign-In failed or was cancelled', 'error');
              }}
              theme="outline"
              size="large"
              shape="rectangular"
              text="signin_with"
            />
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[#ffd60a] hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
