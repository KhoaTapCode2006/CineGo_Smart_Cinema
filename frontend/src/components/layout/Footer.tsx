import React from 'react';
import { Heart } from 'lucide-react';
import CineGoLogo from '../CineGoLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#070913]/60 backdrop-blur-lg py-12 text-cinema-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <CineGoLogo className="h-8 w-auto" />

          <p className="text-xs text-cinema-muted max-w-md">
            Next-generation intelligent cinema booking platform. Experience high-definition projection, Dolby Atmos sound, and seamless real-time seat reservation.
          </p>

          <div className="text-xs text-cinema-subtle flex items-center justify-center gap-1">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-brand fill-brand" />
            <span>for CineGo Cinema</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-cinema-border/40 text-center text-[11px] text-cinema-subtle">
          © {new Date().getFullYear()} CineGo Smart Cinema. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
