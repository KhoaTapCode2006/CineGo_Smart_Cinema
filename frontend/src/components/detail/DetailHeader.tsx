import React from 'react';
import { Link } from 'react-router-dom';
import { CircleUserRound, Search } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Lịch chiếu', href: '/#discover' },
  { label: 'Rạp phim', href: '/cinemas' },
  { label: 'Ưu đãi', href: '/promotions' },
  { label: 'Vé của tôi', href: '/tickets' },
  { label: 'Đăng nhập', href: '/login' },
];

export const DetailHeader: React.FC = () => {
  return (
    <header className="w-full">
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between h-[88px] px-16 border-b border-cinema-outline text-sm font-medium">
        <nav className="flex items-start gap-6 lg:gap-12 h-[60px] p-4 rounded-btn bg-cinema-raised whitespace-nowrap">
          <Link to="/" className="text-cinema-coral">
            CINEGO
          </Link>
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="text-cinema-text hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
        <span className="text-cinema-soft">VI</span>
      </div>

      {/* Mobile Header */}
      <div className="flex md:hidden items-center justify-between h-16 px-4 border-b border-cinema-outline">
        <Link to="/" className="text-[22px] font-extrabold text-cinema-text">
          CINEGO
        </Link>
        <div className="flex items-start gap-4 text-cinema-text">
          <Link to="/" aria-label="Tìm phim">
            <Search className="w-5 h-5" />
          </Link>
          <a href="/login" aria-label="Tài khoản">
            <CircleUserRound className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
};

export default DetailHeader;
