import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import { register as apiRegister, login as apiLogin } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import CineGoLogo from '../components/CineGoLogo';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storeLogin = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    passwordConfirmation?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rawRedirect = searchParams.get('redirect');
  const redirectTarget =
    rawRedirect &&
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/login') &&
    !rawRedirect.startsWith('/register')
      ? rawRedirect
      : '/';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    const cleanName = fullName.trim();
    if (!cleanName) {
      errors.fullName = 'Full name cannot be blank.';
    } else if (cleanName.length > 120) {
      errors.fullName = 'Full name cannot exceed 120 characters.';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    const cleanPhone = phone.trim();
    if (cleanPhone && cleanPhone.length > 32) {
      errors.phone = 'Phone number cannot exceed 32 characters.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (password.length > 128) {
      errors.password = 'Password cannot exceed 128 characters.';
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = 'Please confirm your password.';
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = 'Passwords do not match.';
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
      await apiRegister({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password,
        password_confirmation: passwordConfirmation,
      });

      // Automatically log the user in after registration
      try {
        const tokenRes = await apiLogin({
          email: email.trim(),
          password,
        });
        storeLogin(tokenRes);
        navigate(redirectTarget, { replace: true });
      } catch {
        // Fallback: navigate to login page with registered query param
        const target = `/login?registered=1${rawRedirect ? `&redirect=${encodeURIComponent(rawRedirect)}` : ''}`;
        navigate(target, { replace: true });
      }
    } catch (err: any) {
      const message: string = err?.message || 'Registration failed. Please try again.';

      if (message.includes('Email already in use')) {
        setServerError('This email is already in use. Please sign in or use a different email.');
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
              Create an Account
            </h1>
            <p className="text-xs sm:text-sm text-cinema-muted mt-1">
              Join CineGo to reserve seats, order snacks, and view tickets.
            </p>
          </div>

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
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  disabled={isLoading}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder="Nguyen Van A"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-btn bg-[#070a1f]/70 border text-sm text-white placeholder-cinema-muted/50 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.fullName
                      ? 'border-red-500/80 focus:ring-red-500 focus:border-red-500'
                      : 'border-cinema-border focus:ring-brand focus:border-brand'
                  }`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
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

            {/* Phone Number (Optional) */}
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number <span className="text-cinema-muted font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  disabled={isLoading}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="0901234567"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-btn bg-[#070a1f]/70 border text-sm text-white placeholder-cinema-muted/50 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.phone
                      ? 'border-red-500/80 focus:ring-red-500 focus:border-red-500'
                      : 'border-cinema-border focus:ring-brand focus:border-brand'
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password <span className="text-brand">*</span> <span className="text-cinema-muted font-normal lowercase">(min 8 characters)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="At least 8 characters"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirm Password <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cinema-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={isLoading}
                  value={passwordConfirmation}
                  onChange={(e) => {
                    setPasswordConfirmation(e.target.value);
                    if (fieldErrors.passwordConfirmation)
                      setFieldErrors((prev) => ({ ...prev, passwordConfirmation: undefined }));
                  }}
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-btn bg-[#070a1f]/70 border text-sm text-white placeholder-cinema-muted/50 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.passwordConfirmation
                      ? 'border-red-500/80 focus:ring-red-500 focus:border-red-500'
                      : 'border-cinema-border focus:ring-brand focus:border-brand'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-cinema-muted hover:text-white transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.passwordConfirmation && (
                <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.passwordConfirmation}</p>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Login */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-cinema-muted">
            Already have an account?{' '}
            <Link
              to={`/login${location.search}`}
              className="text-brand hover:text-brand-300 font-semibold underline underline-offset-2 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPage;
