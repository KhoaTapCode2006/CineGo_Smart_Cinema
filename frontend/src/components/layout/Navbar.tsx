import React, { useState } from 'react';
import { Film, User, Menu, X, Sparkles } from 'lucide-react';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-cinema-dark/95 backdrop-blur-md border-b border-cinema-border/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
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

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#discovery"
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

          {/* Right Action: Sign In Button */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs font-semibold rounded-btn bg-cinema-surface hover:bg-cinema-hover text-cinema-text border border-cinema-border hover:border-cinema-muted/50 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-cinema-muted" />
              <span>Sign In</span>
            </a>
            <a
              href="#discovery"
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold uppercase tracking-wider rounded-btn bg-brand hover:bg-brand-600 text-white shadow-md shadow-brand/20 transition-all hover:shadow-brand/40"
            >
              <span>Book Tickets</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-btn text-cinema-muted hover:text-white hover:bg-cinema-surface focus:outline-none focus:ring-2 focus:ring-brand"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-cinema-border bg-cinema-dark/98 px-4 pt-3 pb-6 space-y-3">
          <a
            href="#discovery"
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
              href="#discovery"
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
