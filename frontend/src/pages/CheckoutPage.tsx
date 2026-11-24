import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Utensils,
  Plus,
  Minus,
  Tag,
  CreditCard,
  Wallet,
  Banknote,
  Lock,
  Loader2,
  Sparkles,
  ShieldAlert,
  Info,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import EmptyState from '../components/ui/EmptyState';
import { useBookingStore } from '../store/bookingStore';
import { releaseHold } from '../api/booking';
import {
  listFood,
  createOrder,
  cancelOrder,
  payOrder,
  FoodItem,
  OrderResponse,
} from '../api/orders';
import { formatCurrencyVND, formatDate, formatTime } from '../utils/formatters';

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'idem-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showtime, selectedSeats, holdIds, expiresAt, reset } = useBookingStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expiredShowtimeId, setExpiredShowtimeId] = useState<string | null>(null);

  // Concession quantities: food_item_id -> quantity (0..20)
  const [foodQuantities, setFoodQuantities] = useState<Record<string, number>>({});

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Order creation state
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createOrderError, setCreateOrderError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResponse | null>(null);

  // Payment method & simulation state
  const [paymentMethod, setPaymentMethod] = useState<'mock_card' | 'mock_wallet' | 'mock_cash'>('mock_card');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Compute countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && !expiredShowtimeId && showtime) {
        setExpiredShowtimeId(showtime.id);
        reset();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, expiredShowtimeId, showtime, reset]);

  const isExpired = timeLeft !== null && timeLeft <= 0;

  // 2. Redirect to home if there are no holdIds in store and it wasn't due to expiration
  useEffect(() => {
    if (!expiredShowtimeId && (!holdIds || holdIds.length === 0)) {
      navigate('/', { replace: true });
    }
  }, [holdIds, expiredShowtimeId, navigate]);

  // 3. Fetch available food items
  const {
    data: foodItems = [],
    isLoading: isFoodLoading,
    isError: isFoodError,
    refetch: refetchFood,
  } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: listFood,
    staleTime: 5 * 60 * 1000,
  });

  // Group food items by category (e.g. "Bắp", "Nước", "Combo")
  const foodByCategory = useMemo(() => {
    const map: Record<string, FoodItem[]> = {};
    foodItems.forEach((item) => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  }, [foodItems]);

  // Quantity change handler (locked once order is confirmed)
  const handleQuantityChange = (id: string, delta: number) => {
    if (confirmedOrder) return;
    setFoodQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(20, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  // 4. Confirm Order (POST /orders)
  const handleConfirmOrder = async () => {
    if (!showtime || selectedSeats.length === 0) return;
    setIsCreatingOrder(true);
    setVoucherError(null);
    setCreateOrderError(null);

    const foodList = Object.entries(foodQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([food_item_id, quantity]) => ({ food_item_id, quantity }));

    try {
      const order = await createOrder({
        showtime_id: showtime.id,
        seat_ids: selectedSeats.map((s) => s.id),
        food_items: foodList,
        voucher_code: voucherCode.trim() ? voucherCode.trim().toUpperCase() : undefined,
      });

      setConfirmedOrder(order);
      // Fresh idempotency key for this newly confirmed order
      idempotencyKeyRef.current = generateIdempotencyKey();
      setToastMessage('Xác nhận đơn hàng thành công! Vui lòng chọn phương thức thanh toán.');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 422) {
        const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail || '');
        if (detailStr.includes('Voucher is invalid or not applicable') || detailStr.includes('Voucher')) {
          setVoucherError(
            'Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng (hết hạn, hết lượt dùng hoặc đơn hàng chưa đạt giá trị tối thiểu).'
          );
        } else {
          setVoucherError('Thông tin mã giảm giá không hợp lệ. Vui lòng kiểm tra lại.');
        }
      } else if (status === 409) {
        const detailStr = typeof detail === 'string' ? detail : '';
        if (detailStr.includes('no longer held') || detailStr.includes('expired')) {
          setCreateOrderError('Thời gian giữ ghế đã hết hạn hoặc ghế không còn khả dụng. Vui lòng chọn lại ghế.');
        } else {
          setCreateOrderError(detailStr || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại.');
        }
      } else {
        setCreateOrderError(
          err?.response?.data?.detail || err?.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.'
        );
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // 5. Payment Handler (POST /orders/:id/payments)
  const handlePay = async () => {
    if (!confirmedOrder) return;
    setIsPaying(true);
    setPaymentError(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
    const currentKey = idempotencyKeyRef.current;

    try {
      const res = await payOrder(confirmedOrder.id, {
        idempotency_key: currentKey,
        payment_method: paymentMethod,
        simulated_result: simulateFailure ? 'failed' : 'succeeded',
      });

      if (res.status === 'succeeded') {
        reset();
        const ticketCodesParam = res.ticket_codes?.length
          ? `?new=${encodeURIComponent(res.ticket_codes.join(','))}`
          : '';
        navigate(`/tickets${ticketCodesParam}`, { replace: true });
      } else {
        // Backend simulated failure response
        idempotencyKeyRef.current = generateIdempotencyKey();
        setPaymentError(
          'Giao dịch thanh toán không thành công (mô phỏng thất bại). Vui lòng thử lại hoặc chọn phương thức khác.'
        );
      }
    } catch (err: any) {
      if (err?.response) {
        // Server replied with an error: prepare a new idempotency key for the next attempt
        idempotencyKeyRef.current = generateIdempotencyKey();
        setPaymentError(err.response.data?.detail || 'Thanh toán không thành công. Vui lòng thử lại.');
      } else {
        // Network timeout / connection error: keep the exact same idempotency key for safe retry
        setPaymentError('Lỗi kết nối mạng khi gửi yêu cầu thanh toán. Vui lòng bấm "Thanh toán" để thử gửi lại.');
      }
    } finally {
      setIsPaying(false);
    }
  };

  // 6. Cancel Booking Handler
  const handleCancelBooking = async () => {
    setIsCancelling(true);
    const targetShowtimeId = showtime?.id || expiredShowtimeId;

    try {
      if (confirmedOrder) {
        await cancelOrder(confirmedOrder.id);
      } else if (holdIds.length > 0) {
        await Promise.allSettled(holdIds.map((id) => releaseHold(id)));
      }
    } catch (err) {
      console.warn('Lỗi khi hủy trên server:', err);
    } finally {
      reset();
      setIsCancelling(false);
      if (targetShowtimeId) {
        navigate(`/showtimes/${targetShowtimeId}/seats`);
      } else {
        navigate('/');
      }
    }
  };

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Provisional pricing for display before order is confirmed
  const provisionalSeatsTotal = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.price, 0),
    [selectedSeats]
  );

  const provisionalFoodTotal = useMemo(() => {
    return Object.entries(foodQuantities).reduce((sum, [id, qty]) => {
      const item = foodItems.find((f) => f.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [foodQuantities, foodItems]);

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      <AmbientEffects
        galaxy={{ nebulaOpacity: 0.9, starOpacity: 0.8 }}
        shootingStars={{ count: 4, angle: 32 }}
        cursorGlow={{ redOpacity: 0.08, indigoOpacity: 0.07, size: 500, easing: 0.08 }}
      />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb / Top Row */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => {
              if (showtime) {
                navigate(`/showtimes/${showtime.id}/seats`);
              } else {
                navigate('/');
              }
            }}
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

        {/* Expired Alert */}
        {isExpired && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-card bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-start gap-3 animate-fade-in"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Đã hết thời gian giữ ghế!</p>
              <p className="text-xs text-red-300 mt-0.5">
                Ghế của bạn đã tự động được giải phóng để nhường cho khách hàng khác. Vui lòng chọn lại ghế.
              </p>
              <Link
                to={expiredShowtimeId ? `/showtimes/${expiredShowtimeId}/seats` : '/'}
                className="mt-2 inline-block text-xs font-bold uppercase tracking-wider text-white underline hover:text-red-200 transition-colors"
              >
                Quay lại chọn ghế
              </Link>
            </div>
          </div>
        )}

        {!showtime && !expiredShowtimeId ? (
          <EmptyState
            type="now_showing"
            title="Chưa có thông tin đặt vé"
            description="Bạn chưa chọn suất chiếu hoặc ghế ngồi nào để thanh toán."
            actionText="Khám phá phim"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand block mb-1">
                Order Review · Checkout
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Xác nhận đơn đặt vé & Thanh toán
              </h1>
              <p className="text-xs sm:text-sm text-cinema-muted mt-1">
                Kiểm tra thông tin suất chiếu, thêm bắp nước, áp dụng mã voucher và hoàn tất thanh toán giả lập.
              </p>
            </div>

            {/* Main Order Card */}
            <div className="rounded-card bg-cinema-card/85 border border-cinema-border/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* SECTION 1: Movie & Showtime Details */}
              {showtime && (
                <div className="border-b border-white/10 pb-5">
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
              )}

              {/* SECTION 2: Seats Breakdown */}
              <div className="border-b border-white/10 pb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-brand" />
                  <span>Danh sách ghế đã giữ ({selectedSeats.length} ghế)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          <p className="text-[11px] text-cinema-muted capitalize">Loại: {seat.seat_type}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-200">{formatCurrencyVND(seat.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Concessions (Food & Drinks) */}
              <div className="border-b border-white/10 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-brand" />
                    <span>Chọn bắp nước & combo (Tùy chọn)</span>
                  </h3>
                  {confirmedOrder && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      <Lock className="w-3 h-3" />
                      Đã khóa
                    </span>
                  )}
                </div>

                {isFoodLoading ? (
                  <div className="flex items-center justify-center py-8 text-cinema-muted gap-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                    <span>Đang tải danh sách bắp nước...</span>
                  </div>
                ) : isFoodError ? (
                  <div className="p-3 rounded-btn bg-white/5 border border-white/10 text-xs text-cinema-muted flex items-center justify-between">
                    <span>Không thể tải danh mục bắp nước.</span>
                    <button
                      type="button"
                      onClick={() => refetchFood()}
                      className="text-brand font-bold underline cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : Object.keys(foodByCategory).length === 0 ? (
                  <p className="text-xs text-cinema-muted py-2">Hiện chưa có món bắp nước nào khả dụng.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(foodByCategory).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cinema-muted block">
                          {category}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {items.map((item) => {
                            const qty = foodQuantities[item.id] || 0;
                            return (
                              <div
                                key={item.id}
                                className={`p-3 rounded-btn border transition-all flex items-center justify-between gap-3 ${
                                  qty > 0
                                    ? 'bg-brand/10 border-brand/40 shadow-sm'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white text-xs sm:text-sm truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs font-bold text-accent-gold mt-0.5">
                                    {formatCurrencyVND(item.price)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    disabled={qty === 0 || Boolean(confirmedOrder)}
                                    onClick={() => handleQuantityChange(item.id, -1)}
                                    className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-white font-mono">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={qty >= 20 || Boolean(confirmedOrder)}
                                    onClick={() => handleQuantityChange(item.id, 1)}
                                    className="w-7 h-7 rounded bg-brand hover:bg-brand-600 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: Voucher Code */}
              <div className="border-b border-white/10 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-brand" />
                    <span>Mã giảm giá (Voucher)</span>
                  </h3>
                  {confirmedOrder && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      <Lock className="w-3 h-3" />
                      Đã áp dụng
                    </span>
                  )}
                </div>

                <div className="max-w-md space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={Boolean(confirmedOrder)}
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value.toUpperCase());
                        setVoucherError(null);
                      }}
                      placeholder="VD: CINEGO10, GIAM20K..."
                      className="flex-1 px-3.5 py-2.5 rounded-btn bg-white/5 border border-white/15 text-white text-xs sm:text-sm font-mono placeholder:text-cinema-muted/60 focus:outline-none focus:border-brand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    {voucherCode && !confirmedOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherCode('');
                          setVoucherError(null);
                        }}
                        className="text-xs text-cinema-muted hover:text-white px-2 py-1 cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  {voucherError && (
                    <div className="p-3 rounded-btn bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p>{voucherError}</p>
                    </div>
                  )}

                  <p className="text-[11px] text-cinema-muted">
                    Nhập mã giảm giá và nhấn &ldquo;Xác nhận đơn hàng&rdquo; bên dưới để hệ thống tính toán chiết khấu.
                  </p>
                </div>
              </div>

              {/* SECTION 5: Order Pricing & Confirmation State */}
              <div className="space-y-4">
                {createOrderError && (
                  <div className="p-3.5 rounded-btn bg-red-500/15 border border-red-500/30 text-xs sm:text-sm text-red-200 flex items-start gap-2.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="flex-1">{createOrderError}</p>
                  </div>
                )}

                {/* Lock banner if confirmed */}
                {confirmedOrder && (
                  <div className="p-4 rounded-btn bg-blue-500/10 border border-blue-500/30 text-xs sm:text-sm text-blue-200 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">
                        Đã xác nhận đơn hàng: <span className="font-mono text-accent-gold">{confirmedOrder.order_code}</span>
                      </p>
                      <p className="text-xs text-blue-300/80 mt-1">
                        Thông tin vé, bắp nước và mã giảm giá đã được chốt và khóa trên máy chủ. Vui lòng chọn phương thức thanh toán bên dưới để hoàn tất vé.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pricing Summary Table */}
                <div className="p-5 rounded-btn bg-black/30 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-cinema-muted">
                    <span>
                      {confirmedOrder ? 'Tạm tính (Subtotal)' : 'Tạm tính tiền ghế'}
                    </span>
                    <span className="text-slate-200 font-semibold">
                      {confirmedOrder
                        ? formatCurrencyVND(confirmedOrder.subtotal)
                        : formatCurrencyVND(provisionalSeatsTotal + provisionalFoodTotal)}
                    </span>
                  </div>

                  {confirmedOrder && confirmedOrder.discount > 0 && (
                    <div className="flex items-center justify-between text-xs sm:text-sm text-green-400">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Giảm giá voucher (Discount)
                      </span>
                      <span className="font-semibold">
                        -{formatCurrencyVND(confirmedOrder.discount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block">
                        Tổng thanh toán (Total)
                      </span>
                      {!confirmedOrder && (
                        <span className="text-[11px] text-cinema-muted">
                          (Giá chính xác do máy chủ xác nhận)
                        </span>
                      )}
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-accent-gold">
                      {confirmedOrder
                        ? formatCurrencyVND(confirmedOrder.total)
                        : formatCurrencyVND(provisionalSeatsTotal + provisionalFoodTotal)}
                    </span>
                  </div>
                </div>

                {/* Confirm Order Button (Only before confirmation) */}
                {!confirmedOrder && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isExpired || isCreatingOrder}
                      onClick={handleConfirmOrder}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-btn bg-brand hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCreatingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang xác nhận đơn...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Xác nhận đơn hàng</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 6: Payment Methods & Simulation (Only unlocked after order is confirmed) */}
              {confirmedOrder && (
                <div className="border-t border-white/10 pt-6 space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand" />
                    <span>Chọn phương thức thanh toán</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Mock Card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mock_card')}
                      className={`p-3.5 rounded-btn border text-left transition-all cursor-pointer ${
                        paymentMethod === 'mock_card'
                          ? 'bg-brand/15 border-brand text-white shadow-md shadow-brand/20'
                          : 'bg-white/5 border-white/10 text-cinema-muted hover:border-white/20'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-brand mb-2" />
                      <p className="font-semibold text-xs text-white">Thẻ ATM / Quốc tế</p>
                      <p className="text-[11px] text-cinema-muted mt-0.5">Mock Card (Visa/Mastercard)</p>
                    </button>

                    {/* Mock Wallet */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mock_wallet')}
                      className={`p-3.5 rounded-btn border text-left transition-all cursor-pointer ${
                        paymentMethod === 'mock_wallet'
                          ? 'bg-brand/15 border-brand text-white shadow-md shadow-brand/20'
                          : 'bg-white/5 border-white/10 text-cinema-muted hover:border-white/20'
                      }`}
                    >
                      <Wallet className="w-5 h-5 text-accent-gold mb-2" />
                      <p className="font-semibold text-xs text-white">Ví điện tử</p>
                      <p className="text-[11px] text-cinema-muted mt-0.5">Momo / ZaloPay / ShopeePay</p>
                    </button>

                    {/* Mock Cash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mock_cash')}
                      className={`p-3.5 rounded-btn border text-left transition-all cursor-pointer ${
                        paymentMethod === 'mock_cash'
                          ? 'bg-brand/15 border-brand text-white shadow-md shadow-brand/20'
                          : 'bg-white/5 border-white/10 text-cinema-muted hover:border-white/20'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-emerald-400 mb-2" />
                      <p className="font-semibold text-xs text-white">Tiền mặt tại quầy</p>
                      <p className="text-[11px] text-cinema-muted mt-0.5">Mock Cash / Quầy vé</p>
                    </button>
                  </div>

                  {/* Simulation Toggle */}
                  <div className="p-3.5 rounded-btn bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-amber-300 block">
                          Mô phỏng thanh toán thất bại
                        </span>
                        <span className="text-[11px] text-amber-200/70">
                          Gửi kết quả simulated_result: &ldquo;failed&rdquo; để kiểm thử xử lý lỗi giao dịch.
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={simulateFailure}
                        onChange={(e) => setSimulateFailure(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>

                  {/* Payment Error */}
                  {paymentError && (
                    <div className="p-3.5 rounded-btn bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="flex-1">{paymentError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 7: Action Buttons */}
              <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancelBooking}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-btn bg-white/5 hover:bg-white/10 text-cinema-muted hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isCancelling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Hủy đặt vé</span>
                </button>

                {confirmedOrder && (
                  <button
                    type="button"
                    disabled={isExpired || isPaying}
                    onClick={handlePay}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-btn bg-brand hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý thanh toán...</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Thanh toán {formatCurrencyVND(confirmedOrder.total)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-cinema-card/95 border border-cinema-border text-white shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
