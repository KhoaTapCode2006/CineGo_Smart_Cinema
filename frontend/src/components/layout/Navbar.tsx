import React, { useState, useEffect } from 'react';
import { Film, User, Menu, X, Sparkles, Search } from 'lucide-react';
import NavbarSearch from './NavbarSearch';
import NavbarGenreDropdown from './NavbarGenreDropdown';
import { cn } from '../../utils/cn';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Brand Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-btn"
            >
              <div className="w-9 h-9 rounded-btn bg-brand flex items-center justify-center shadow-lg shadow-brand/30 group-hover:scale-105 transition-transform duration-200">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-wider text-white uppercase flex items-center gap-1">
                  Cine<span className="text-brand">Go</span>
                </span>
                <span className="text-[10px] font-semibold text-cinema-muted tracking-widest uppercase -mt-1">
                  Smart Cinema
                </span>
              </div>
            </a>
          </div>

          {/* 2. Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 flex-shrink-0">
            <a
              href="#discover"
              className="text-sm font-semibold text-cinema-text hover:text-brand transition-colors"
            >
              Movies
            </a>
            <a
              href="/cinemas"
              className="text-sm font-medium text-cinema-muted hover:text-cinema-text transition-colors"
            >
              Cinemas
            </a>
            <a
              href="/promotions"
              className="text-sm font-medium text-cinema-muted hover:text-cinema-text transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
              <span>Offers</span>
            </a>
          </nav>

          {/* 3. Center Section: Search Bar & Genre Dropdown */}
          <div className="hidden md:flex items-center gap-2.5 flex-1 justify-center max-w-xl mx-2">
            <NavbarSearch />
            <NavbarGenreDropdown />
          </div>

          {/* 4. Right Action: Sign In & Book Tickets Button */}
          <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-btn bg-white/5 hover:bg-white/10 text-cinema-text border border-white/10 hover:border-white/20 backdrop-blur-md transition-colors"
            >
              <User className="w-3.5 h-3.5 text-cinema-muted" />
              <span>Sign In</span>
            </a>
            <a
              href="#discover"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 min-h-[38px] text-xs font-bold uppercase tracking-wider rounded-btn bg-brand hover:bg-brand-600 text-white shadow-md shadow-brand/20 transition-all hover:shadow-brand/40"
            >
              <span>Book Tickets</span>
            </a>
          </div>

          {/* 5. Mobile Controls: Search Toggle + Menu Toggle (<768px) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Mobile Search Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen);
                if (mobileMenuOpen) setMobileMenuOpen(false);
              }}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-btn text-cinema-muted hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand"
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (mobileSearchOpen) setMobileSearchOpen(false);
              }}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-btn text-cinema-muted hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand"
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

      {/* 7. Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070a1f]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 z-60 animate-fade-in">
          <a
            href="#discover"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-btn text-base font-semibold text-white hover:bg-cinema-surface"
          >
            Movies
          </a>
          <a
            href="/cinemas"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-btn text-base font-medium text-cinema-muted hover:text-white hover:bg-cinema-surface"
          >
            Cinemas
          </a>
          <a
            href="/promotions"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-btn text-base font-medium text-cinema-muted hover:text-white hover:bg-cinema-surface"
          >
            Offers & Deals
          </a>
          <div className="pt-2 border-t border-cinema-border/60 flex flex-col gap-2">
            <a
              href="/login"
              className="w-full py-2.5 text-center text-sm font-semibold rounded-btn bg-cinema-surface text-cinema-text border border-cinema-border"
            >
              Sign In
            </a>
            <a
              href="#discover"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center text-sm font-bold uppercase tracking-wider rounded-btn bg-brand text-white shadow-md shadow-brand/30"
            >
              Book Tickets
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
