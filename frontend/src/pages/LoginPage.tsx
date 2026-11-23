import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, LogIn } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import { login as apiLogin } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import CineGoLogo from '../components/CineGoLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storeLogin = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Safe redirect path calculation
  const rawRedirect = searchParams.get('redirect');
  const redirectTarget =
    rawRedirect &&
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/login') &&
    !rawRedirect.startsWith('/register')
      ? rawRedirect
      : '/';

  // If already logged in, navigate away
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length > 128) {
      errors.password = 'Password cannot exceed 128 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiLogin({
        email: email.trim(),
        password,
      });

      storeLogin(response);
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      const message: string = err?.message || 'Login failed. Please try again.';

      // Map backend error messages to friendly UI messages
      if (message.includes('Invalid email or password')) {
        setServerError('Incorrect email or password. Please verify your credentials.');
      } else if (message.includes('Too many failed attempts')) {
        setServerError('Account locked: 5 consecutive failed attempts. Please wait 15 minutes before trying again.');
      } else {
        setServerError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      <AmbientEffects
        galaxy={{ nebulaOpacity: 1, starOpacity: 1 }}
        shootingStars={{ count: 6, angle: 32 }}
        cursorGlow={{ redOpacity: 0.08, indigoOpacity: 0.07, size: 520, easing: 0.08 }}
      />

      <Navbar />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md rounded-card bg-cinema-card/85 border border-cinema-border/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-btn">
              <CineGoLogo className="h-10 w-auto mx-auto" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-cinema-muted mt-1">
              Sign in to manage your bookings and movie tickets.
            </p>
          </div>

          {/* Registration success notice if arrived from register */}
          {searchParams.get('registered') === '1' && (
            <div className="mb-5 p-3.5 rounded-btn bg-green-500/10 border border-green-500/30 text-green-300 text-xs sm:text-sm">
              Account created successfully! Please sign in with your credentials.
            </div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-btn bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{serverError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="your.email@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-btn bg-[#070a1f]/70 border text-sm text-white placeholder-cinema-muted/50 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email
                      ? 'border-red-500/80 focus:ring-red-500 focus:border-red-500'
                      : 'border-cinema-border focus:ring-brand focus:border-brand'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-btn bg-[#070a1f]/70 border text-sm text-white placeholder-cinema-muted/50 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? 'border-red-500/80 focus:ring-red-500 focus:border-red-500'
                      : 'border-cinema-border focus:ring-brand focus:border-brand'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-cinema-muted hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 min-h-[44px] rounded-btn bg-brand hover:bg-brand-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-brand/30 hover:shadow-brand/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Register */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-cinema-muted">
            Don't have an account?{' '}
            <Link
              to={`/register${location.search}`}
              className="text-brand hover:text-brand-300 font-semibold underline underline-offset-2 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage;
