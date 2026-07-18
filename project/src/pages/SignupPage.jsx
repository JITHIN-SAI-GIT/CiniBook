import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cinebookLogo from '../assets/image.png';
import { Film, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, googleSignIn } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!fullName) e.name = 'Name is required';
    else if (fullName.length < 2) e.name = 'Name must be at least 2 characters';
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6)
      e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Account created! Please verify your email.', 'success');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-[#e63946]/10 rounded-full blur-3xl" />
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
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">
            Join CineBook and start booking today
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-strong rounded-2xl p-6 space-y-4 animate-slide-up border border-white/10"
        >
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block font-medium">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className={`input-field pl-10 ${errors.name ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1.5 block font-medium">
              Email
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
            <label className="text-sm text-gray-300 mb-1.5 block font-medium">
              Password
            </label>
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
                className={`input-field pl-10 ${errors.confirm ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.confirm && (
              <p className="text-xs text-red-400 mt-1">{errors.confirm}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 py-3 text-base mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
              </>
            ) : (
              'Create Account'
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
              text="signup_with"
            />
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#ffd60a] hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
