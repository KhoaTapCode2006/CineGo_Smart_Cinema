import React from 'react';
import { Link } from 'react-router-dom';

export const DetailFooter: React.FC = () => {
  return (
    <>
      <footer className="w-full border-t border-cinema-outline flex items-start justify-between p-4 md:px-16 text-xs text-cinema-soft">
        <p className="flex-1">CineGo · Academic MVP · Dữ liệu minh họa</p>
        <p className="hidden md:block flex-1 text-right">
          Không giao dịch thật · Hỗ trợ&nbsp;&nbsp;/&nbsp;&nbsp;Điều khoản
        </p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-start gap-4 h-16 p-4 rounded-btn bg-cinema-raised text-sm font-medium text-cinema-text whitespace-nowrap">
        <Link to="/">⌂ Trang chủ</Link>
        <a href="/tickets">▣ Vé của tôi</a>
        <a href="/login">○ Tài khoản</a>
      </nav>
    </>
  );
};

export default DetailFooter;
