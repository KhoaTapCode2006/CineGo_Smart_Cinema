import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { User, Menu, X, Sparkles, Search, ChevronDown, Ticket, LogOut } from 'lucide-react';
import CineGoLogo from '../CineGoLogo';
import NavbarSearch from './NavbarSearch';
import NavbarGenreDropdown from './NavbarGenreDropdown';
import { useAuthStore } from '../../store/authStore';
import { logout as apiLogout } from '../../api/auth';
import { cn } from '../../utils/cn';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout: storeLogout } = useAuthStore();

  // On other pages the Discover section lives on Home.
  const discoverHref = useLocation().pathname === '/' ? '#discover' : '/#discover';
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    try {
      await apiLogout();
    } catch {
      // safe fallback
    } finally {
      storeLogout();
      navigate('/');
    }
  };

  const showGlassBackground = isScrolled || mobileMenuOpen || mobileSearchOpen;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300 motion-reduce:transition-none border-b',
        showGlassBackground
          ? 'bg-[#070a1f]/75 backdrop-blur-lg border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent backdrop-blur-none border-transparent'
      )}
      style={{ minHeight: 'var(--nav-h, 4rem)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 lg:gap-6">
          {/* 1. Brand Logo & Primary Navigation */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <a
              href="/"
              className="flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-btn"
            >
              <CineGoLogo className="h-9 sm:h-10 w-auto transition-transform duration-200 group-hover:scale-105" />
            </a>

            {/* Desktop Navigation Links (shown on >= 1024px; hidden into menu at 768-1023px) */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6 shrink-0">
              <a
                href={discoverHref}
                className="text-sm font-semibold text-cinema-text hover:text-brand transition-colors"
              >
                Movies
              </a>
              <a
                href={discoverHref}
                className="text-sm font-medium text-cinema-muted hover:text-white transition-colors"
              >
                Cinemas
              </a>
              <a
                href={discoverHref}
                className="text-sm font-medium text-cinema-muted hover:text-white transition-colors"
              >
                Offers
              </a>
            </nav>
          </div>

          {/* 2. Center Section: Search Bar & Genre Dropdown */}
          <div className="hidden md:flex items-center justify-center gap-2.5 flex-1 max-w-[500px] mx-2">
            <NavbarSearch className="flex-1 min-w-[200px] max-w-[360px]" />
            <NavbarGenreDropdown />
          </div>

          {/* 3. Right Action: User Menu / Sign In + Book Tickets + Responsive Menu Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Account / User Button (sm:flex) */}
            <div className="hidden sm:flex items-center">
              {isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3 h-10 text-xs font-semibold rounded-btn bg-white/5 hover:bg-white/10 text-cinema-text border border-white/10 hover:border-white/20 backdrop-blur-md transition-all cursor-pointer"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <span className="w-5 h-5 rounded-full bg-brand/20 border border-brand/40 text-brand font-bold text-[10px] flex items-center justify-center">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">{user.full_name}</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-cinema-muted transition-transform duration-200',
                        userMenuOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-card bg-[#070a1f]/95 border border-white/15 backdrop-blur-2xl shadow-2xl py-1.5 z-50 animate-fade-in">
                      <div className="px-3.5 py-2 border-b border-white/10">
                        <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-[11px] text-cinema-muted truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/tickets"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Ticket className="w-3.5 h-3.5 text-brand" />
                          <span>Vé của tôi</span>
                        </Link>
                      </div>

                      <div className="border-t border-white/10 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-3.5 h-10 text-xs font-semibold rounded-btn bg-white/5 hover:bg-white/10 text-cinema-text border border-white/10 hover:border-white/20 backdrop-blur-md transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-cinema-muted" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Book Tickets CTA (sm:inline-flex) */}
            <a
              href={discoverHref}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 h-10 text-xs font-bold uppercase tracking-wider rounded-btn bg-brand hover:bg-brand-600 text-white shadow-md shadow-brand/20 transition-all hover:shadow-brand/40"
            >
              <span>Book Tickets</span>
            </a>

            {/* Mobile Search Toggle Button (<768px) */}
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen);
                if (mobileMenuOpen) setMobileMenuOpen(false);
              }}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-btn text-cinema-muted hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand"
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Tablet & Mobile Menu Toggle Button (<1024px) */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (mobileSearchOpen) setMobileSearchOpen(false);
              }}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-btn text-cinema-muted hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* 6. Mobile Collapsible Search Bar (Slides down below navbar) */}
      {mobileSearchOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070a1f]/95 backdrop-blur-2xl px-4 py-3 space-y-3 z-60 animate-fade-in shadow-xl">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <NavbarSearch
                isMobileOpen={mobileSearchOpen}
                onCloseMobile={() => setMobileSearchOpen(false)}
              />
            </div>
            <NavbarGenreDropdown
              isMobileSheet={true}
              onCloseMobile={() => setMobileSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 7. Mobile & Tablet Navigation Dropdown Menu (<1024px) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/10 bg-[#070a1f]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 z-60 animate-fade-in">
          <a
            href={discoverHref}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-btn text-base font-semibold text-white hover:bg-cinema-surface"
          >
            Movies
          </a>
          <a
            href={discoverHref}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-btn text-base font-medium text-cinema-muted hover:text-white hover:bg-cinema-surface"
          >
            Cinemas
          </a>
          <a
            href={discoverHref}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-btn text-base font-medium text-cinema-muted hover:text-white hover:bg-cinema-surface"
          >
            Offers & Deals
          </a>
          <div className="pt-2 border-t border-cinema-border/60 flex flex-col gap-2">
            {isAuthenticated && user ? (
              <>
                <div className="px-3 py-2 rounded-btn bg-white/5 border border-white/10">
                  <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-cinema-muted truncate">{user.email}</p>
                </div>
                <Link
                  to="/tickets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-btn bg-cinema-surface text-cinema-text border border-cinema-border hover:bg-cinema-hover"
                >
                  <Ticket className="w-4 h-4 text-brand" />
                  <span>Vé của tôi</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-btn text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:hidden gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-semibold rounded-btn bg-cinema-surface text-cinema-text border border-cinema-border"
                >
                  Sign In
                </Link>
                <a
                  href={discoverHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-bold uppercase tracking-wider rounded-btn bg-brand text-white shadow-md shadow-brand/30"
                >
                  Book Tickets
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
