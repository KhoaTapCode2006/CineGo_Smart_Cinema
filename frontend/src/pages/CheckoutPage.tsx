import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Film,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import EmptyState from '../components/ui/EmptyState';
import { useBookingStore } from '../store/bookingStore';
import { formatCurrencyVND, formatDate, formatTime } from '../utils/formatters';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showtime, selectedSeats, holdIds, expiresAt, reset } = useBookingStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Compute countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const target = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeft !== null && timeLeft <= 0;

  const handleCancel = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      <AmbientEffects
        galaxy={{ nebulaOpacity: 0.9, starOpacity: 0.8 }}
        shootingStars={{ count: 4, angle: 32 }}
        cursorGlow={{ redOpacity: 0.08, indigoOpacity: 0.07, size: 500, easing: 0.08 }}
      />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb / Back */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cinema-muted hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại sơ đồ ghế</span>
          </button>

          {/* Hold Countdown Badge */}
          {timeLeft !== null && !isExpired && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
              <Clock className="w-4 h-4" />
              <span>Thời gian giữ ghế còn: {formatCountdown(timeLeft)}</span>
            </div>
          )}
        </div>

        {!showtime || selectedSeats.length === 0 ? (
          <EmptyState
            type="now_showing"
            title="Chưa có thông tin đặt vé"
            description="Bạn chưa chọn suất chiếu hoặc ghế ngồi nào để thanh toán."
            actionText="Khám phá phim"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="space-y-6">
            {/* Expired Alert */}
            {isExpired && (
              <div
                role="alert"
                className="p-4 rounded-card bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-start gap-3 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Đã hết thời gian giữ ghế!</p>
                  <p className="text-xs text-red-300 mt-0.5">
                    Ghế của bạn đã tự động được giải phóng để nhường cho khách hàng khác. Vui lòng chọn lại ghế.
                  </p>
                  <Link
                    to={`/showtimes/${showtime.id}/seats`}
                    className="mt-2 inline-block text-xs font-bold uppercase tracking-wider text-white underline"
                  >
                    Quay lại chọn ghế
                  </Link>
                </div>
              </div>
            )}

            {/* Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand block mb-1">
                Order Review · Placeholder
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Xác nhận đơn đặt vé (Checkout)
              </h1>
              <p className="text-xs sm:text-sm text-cinema-muted mt-1">
                Kiểm tra thông tin chi tiết suất chiếu và ghế ngồi trước khi tiến hành thanh toán giả lập.
              </p>
            </div>

            {/* Order Card */}
            <div className="rounded-card bg-cinema-card/85 border border-cinema-border/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Movie & Showtime Details */}
              <div className="border-b border-white/10 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <Film className="w-5 h-5 text-brand shrink-0" />
                      <span>{showtime.movieTitle}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-cinema-muted">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-brand" />
                        {showtime.cinemaName} · {showtime.hallName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(showtime.startAt)}
                      </span>
                      <span className="flex items-center gap-1.5 text-accent-gold font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(showtime.startAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seats breakdown */}
              <div className="border-b border-white/10 pb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Danh sách ghế đã giữ ({selectedSeats.length} ghế)
                </h3>
                <div className="space-y-2">
                  {selectedSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between text-xs sm:text-sm p-2.5 rounded-btn bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded bg-brand/20 border border-brand/40 text-brand font-black text-xs flex items-center justify-center">
                          {seat.label}
                        </span>
                        <div>
                          <p className="font-semibold text-white">Ghế {seat.label}</p>
                          <p className="text-[11px] text-cinema-muted capitalize">
                            Loại ghế: {seat.seat_type}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-200">{formatCurrencyVND(seat.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holds Reference & Total */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                  <p className="text-xs text-cinema-muted">
                    Mã giữ chỗ nguyên tử (Hold IDs):
                  </p>
                  <p className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                    {holdIds.join(', ') || 'N/A'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-cinema-muted block">
                    Tổng cộng
                  </span>
                  <span className="text-2xl font-black text-accent-gold">
                    {formatCurrencyVND(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Placeholder Notice */}
              <div className="p-4 rounded-btn bg-brand/10 border border-brand/30 text-xs sm:text-sm text-slate-300 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    Ghế đã được hệ thống giữ thành công trong 5 phút!
                  </p>
                  <p className="text-xs text-cinema-muted mt-1 leading-relaxed">
                    Trang thanh toán giả lập và áp dụng mã giảm giá (voucher), combo bắp nước sẽ được kết nối hoàn thiện ở giai đoạn tiếp theo.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-btn bg-white/5 hover:bg-white/10 text-cinema-muted hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Hủy đặt vé</span>
                </button>

                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => alert('Thanh toán giả lập sẽ được hỗ trợ ở bước kế tiếp!')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-btn bg-brand hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Xác nhận & Thanh toán (Sắp ra mắt)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
