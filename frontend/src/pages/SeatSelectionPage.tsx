import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Sparkles,
  Ticket,
  AlertCircle,
  Loader2,
  Users,
  Info,
  Check,
  Radio,
  RefreshCw,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import ErrorState from '../components/ui/ErrorState';
import {
  getSeatMap,
  createSocketTicket,
  smartSeat,
  holdSeats,
  SeatItem,
  SmartSeatResponse,
} from '../api/booking';
import { useBookingStore, SelectedSeat } from '../store/bookingStore';
import { formatCurrencyVND, formatDate, formatTime } from '../utils/formatters';
import { cn } from '../utils/cn';

function getWebSocketUrl(showtimeId: string, ticket: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const url = new URL(apiUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = url.pathname.replace(/\/+$/, '');
  return `${protocol}//${url.host}${basePath}/showtimes/${showtimeId}/live-seats?ticket=${encodeURIComponent(ticket)}`;
}

export const SeatSelectionPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    showtime,
    selectedSeats,
    toggleSeat,
    setSelectedSeats,
    setHolds,
  } = useBookingStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Smart seat dialog state
  const [isSmartSeatOpen, setIsSmartSeatOpen] = useState(false);
  const [smartCount, setSmartCount] = useState(2);
  const [smartTogether, setSmartTogether] = useState(true);
  const [smartZone, setSmartZone] = useState<'front' | 'middle' | 'back' | null>('middle');
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartResult, setSmartResult] = useState<SmartSeatResponse | null>(null);
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0);

  // WebSocket state
  const [socketConnected, setSocketConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(1000);
  const isUnmountedRef = useRef<boolean>(false);

  // 1. Fetch seat map via TanStack Query
  const {
    data: seatMapData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['seat-map', showtimeId],
    queryFn: () => {
      if (!showtimeId) throw new Error('Showtime ID is required');
      return getSeatMap(showtimeId);
    },
    enabled: Boolean(showtimeId),
    staleTime: 10 * 1000,
  });

  // Group and sort seats by row_label and seat_number
  const seatGrid = useMemo(() => {
    if (!seatMapData?.seats) return [];
    const rowsMap = new Map<string, SeatItem[]>();

    seatMapData.seats.forEach((seat) => {
      const list = rowsMap.get(seat.row_label) || [];
      list.push(seat);
      rowsMap.set(seat.row_label, list);
    });

    // Sort rows alphabetically (A, B, C, ...)
    const sortedRowLabels = Array.from(rowsMap.keys()).sort((a, b) => a.localeCompare(b));

    return sortedRowLabels.map((rowLabel) => {
      const seats = rowsMap.get(rowLabel)!;
      // Sort seats by seat_number
      seats.sort((a, b) => a.seat_number - b.seat_number);
      return {
        rowLabel,
        seats,
      };
    });
  }, [seatMapData?.seats]);

  // Lookup map for fast access
  const seatById = useMemo(() => {
    const map = new Map<string, SeatItem>();
    seatMapData?.seats?.forEach((s) => map.set(s.id, s));
    return map;
  }, [seatMapData?.seats]);

  // Total price of currently selected seats
  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  // Helper to trigger toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 2. Setup WebSocket for live seat updates
  useEffect(() => {
    if (!showtimeId) return;
    isUnmountedRef.current = false;

    const connectWebSocket = async () => {
      if (isUnmountedRef.current) return;

      try {
        // Step 1: Request one-use socket ticket (valid for 30s)
        const { ticket } = await createSocketTicket();
        if (isUnmountedRef.current) return;

        const wsUrl = getWebSocketUrl(showtimeId, ticket);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmountedRef.current) {
            ws.close();
            return;
          }
          setSocketConnected(true);
          backoffRef.current = 1000; // Reset backoff on success
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'seat_status_changed' && Array.isArray(data.seat_ids)) {
              // Invalidate seat map query to fetch latest statuses
              queryClient.invalidateQueries({ queryKey: ['seat-map', showtimeId] });

              // Check if any currently selected seats were claimed
              const changedSeatIds: string[] = data.seat_ids;
              const currentSelected = useBookingStore.getState().selectedSeats;
              const removedLabels: string[] = [];
              const stillValidSeats = currentSelected.filter((s) => {
                if (changedSeatIds.includes(s.id)) {
                  removedLabels.push(s.label);
                  return false;
                }
                return true;
              });

              if (removedLabels.length > 0) {
                useBookingStore.getState().setSelectedSeats(stillValidSeats);
                showToast(
                  `Ghế ${removedLabels.join(', ')} vừa được người khác giữ hoặc mua và đã được gỡ khỏi danh sách của bạn.`
                );
              }
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          setSocketConnected(false);
          wsRef.current = null;
          if (!isUnmountedRef.current) {
            // Reconnect with exponential backoff (max 10s)
            const delay = backoffRef.current;
            backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        if (!isUnmountedRef.current) {
          const delay = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        }
      }
    };

    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [showtimeId, queryClient, showToast]);

  // Check if any selected seat became sold/held on seatMapData change
  useEffect(() => {
    if (!seatMapData?.seats || selectedSeats.length === 0) return;
    const unavailable: string[] = [];
    const valid: SelectedSeat[] = [];

    selectedSeats.forEach((seat) => {
      const current = seatById.get(seat.id);
      if (!current || current.status !== 'available') {
        unavailable.push(seat.label);
      } else {
        valid.push(seat);
      }
    });

    if (unavailable.length > 0) {
      setSelectedSeats(valid);
      showToast(`Ghế ${unavailable.join(', ')} không còn trống và đã được tự động bỏ chọn.`);
    }
  }, [seatMapData, seatById, selectedSeats, setSelectedSeats, showToast]);

  // Handle seat click
  const handleSeatClick = (seat: SeatItem) => {
    if (seat.status !== 'available') return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);
    if (!isSelected && selectedSeats.length >= 8) {
      showToast('Bạn chỉ có thể chọn tối đa 8 ghế cho mỗi đơn đặt.');
      return;
    }

    setHoldError(null);
    toggleSeat({
      id: seat.id,
      label: `${seat.row_label}${seat.seat_number}`,
      price: seat.price,
      seat_type: seat.seat_type,
    });
  };

  // Handle Smart Seat request
  const handleRequestSmartSeat = async () => {
    if (!showtimeId) return;
    setSmartLoading(true);
    setSmartResult(null);

    try {
      const res = await smartSeat(showtimeId, {
        count: smartCount,
        together: smartTogether,
        preferred_zone: smartZone,
      });

      setSmartResult(res);
      setActiveRecommendationIndex(0);

      if (res.recommendations.length > 0) {
        applyRecommendation(res.recommendations[0]);
      } else {
        showToast('Không tìm thấy nhóm ghế phù hợp với yêu cầu của bạn.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Không thể lấy gợi ý ghế lúc này.');
    } finally {
      setSmartLoading(false);
    }
  };

  const applyRecommendation = (seatIds: string[]) => {
    const newSeats: SelectedSeat[] = [];
    for (const id of seatIds) {
      const seat = seatById.get(id);
      if (seat && seat.status === 'available') {
        newSeats.push({
          id: seat.id,
          label: `${seat.row_label}${seat.seat_number}`,
          price: seat.price,
          seat_type: seat.seat_type,
        });
      }
    }
    setSelectedSeats(newSeats);
  };

  // Handle Proceed / Hold Seats
  const handleProceed = async () => {
    if (!showtimeId || selectedSeats.length === 0) return;
    setIsHolding(true);
    setHoldError(null);

    try {
      const seatIds = selectedSeats.map((s) => s.id);
      const res = await holdSeats(showtimeId, seatIds);

      setHolds(res.hold_ids, res.expires_at);
      navigate('/checkout');
    } catch (err: any) {
      const msg =
        err?.message?.includes('already held') || err?.message?.includes('already been sold')
          ? 'Một hoặc nhiều ghế đã bị người khác giữ hoặc mua trước. Vui lòng chọn ghế khác.'
          : err?.message || 'Không thể giữ ghế. Vui lòng thử lại.';

      setHoldError(msg);
      refetch();
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      <AmbientEffects
        galaxy={{ nebulaOpacity: 0.9, starOpacity: 0.8 }}
        shootingStars={{ count: 4, angle: 32 }}
        cursorGlow={{ redOpacity: 0.07, indigoOpacity: 0.06, size: 480, easing: 0.08 }}
      />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col">
        {/* Back and Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-cinema-muted hover:text-white border border-white/10 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand block">
                Seat Selection
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                {showtime?.movieTitle || 'Chọn ghế xem phim'}
              </h1>
            </div>
          </div>

          {/* Showtime info badge */}
          {showtime && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-cinema-muted bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
              <span className="flex items-center gap-1 text-slate-200 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-brand" />
                {showtime.cinemaName} · {showtime.hallName}
              </span>
              <span className="text-white/30">|</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cinema-muted" />
                {formatDate(showtime.startAt)}
              </span>
              <span className="text-white/30">|</span>
              <span className="flex items-center gap-1 font-bold text-accent-gold">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(showtime.startAt)}
              </span>
            </div>
          )}
        </div>

        {/* Live WebSocket status indicator & Toast notification */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-cinema-muted">
            <span
              className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                socketConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500'
              )}
            />
            <span>{socketConnected ? 'Đồng bộ ghế trực tiếp (Live)' : 'Đang kết nối lại...'}</span>
          </div>

          {/* Smart Seat trigger button */}
          <button
            type="button"
            onClick={() => setIsSmartSeatOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
            <span>Gợi ý ghế</span>
          </button>
        </div>

        {/* Toast Warning */}
        {toastMessage && (
          <div
            role="status"
            className="mb-4 p-3 rounded-btn bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{toastMessage}</div>
          </div>
        )}

        {/* Hold error message */}
        {holdError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-btn bg-red-500/15 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{holdError}</div>
          </div>
        )}

        {/* Main Seat Map Area */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] gap-3">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
            <p className="text-sm text-cinema-muted">Đang tải sơ đồ ghế...</p>
          </div>
        ) : isError ? (
          <div className="flex-1 flex items-center justify-center min-h-[360px]">
            <ErrorState
              title="Không thể tải sơ đồ ghế"
              message="Đã có lỗi xảy ra khi kết nối tới máy chủ. Vui lòng thử lại."
              retryText="Tải lại"
              onRetry={() => refetch()}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center">
            {/* Screen Banner (Curved Top) */}
            <div className="w-full max-w-2xl mx-auto my-6 flex flex-col items-center">
              <div
                className="w-full h-8 rounded-t-[100px] border-t-4 border-brand/60 bg-gradient-to-b from-brand/20 to-transparent shadow-[0_-12px_24px_rgba(229,9,20,0.2)]"
                aria-hidden="true"
              />
              <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-[0.3em] text-cinema-muted/70 mt-1">
                Màn hình chiếu / Cinema Screen
              </span>
            </div>

            {/* Scrollable Seat Grid Container */}
            <div className="w-full overflow-x-auto no-scrollbar pb-6 flex justify-center">
              <div className="min-w-fit px-4 flex flex-col gap-2.5 sm:gap-3">
                {seatGrid.map(({ rowLabel, seats }) => (
                  <div key={rowLabel} className="flex items-center gap-2 sm:gap-3">
                    {/* Left row label */}
                    <span className="w-6 text-center text-xs font-bold text-cinema-muted select-none">
                      {rowLabel}
                    </span>

                    {/* Seats in row */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {seats.map((seat) => {
                        const isSelected = selectedSeats.some((s) => s.id === seat.id);
                        const isAvailable = seat.status === 'available';
                        const isHeld = seat.status === 'held';
                        const isSold = seat.status === 'sold';
                        const isCouple = seat.seat_type === 'couple';
                        const isVip = seat.seat_type === 'vip';

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleSeatClick(seat)}
                            title={`${seat.row_label}${seat.seat_number} - ${seat.seat_type.toUpperCase()} (${formatCurrencyVND(
                              seat.price
                            )}) - ${seat.status}`}
                            className={cn(
                              'relative flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-150 rounded-t-md rounded-b-[2px] cursor-pointer select-none',
                              isCouple ? 'w-14 sm:w-16 h-7 sm:h-8' : 'w-7 sm:w-8 h-7 sm:h-8',
                              // Selected State (Client)
                              isSelected &&
                                'bg-green-500 border-2 border-green-300 text-white shadow-[0_0_12px_rgba(34,197,94,0.7)] scale-105 z-10',
                              // Available State (by Type)
                              !isSelected &&
                                isAvailable &&
                                (isVip
                                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/40 hover:scale-105'
                                  : isCouple
                                  ? 'bg-pink-500/20 border border-pink-500/50 text-pink-300 hover:bg-pink-500/40 hover:scale-105'
                                  : 'bg-white/10 border border-white/25 text-slate-200 hover:bg-white/20 hover:scale-105'),
                              // Held State (Server)
                              !isSelected &&
                                isHeld &&
                                'bg-orange-500/20 border border-orange-500/40 text-orange-400 opacity-60 cursor-not-allowed',
                              // Sold State (Server)
                              !isSelected &&
                                isSold &&
                                'bg-slate-800/80 border border-slate-700/60 text-slate-600 cursor-not-allowed opacity-40 line-through'
                            )}
                            aria-label={`Seat ${seat.row_label}${seat.seat_number}, ${seat.seat_type}, ${
                              isSelected ? 'selected' : seat.status
                            }`}
                          >
                            {seat.seat_number}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right row label */}
                    <span className="w-6 text-center text-xs font-bold text-cinema-muted select-none">
                      {rowLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend / Chú thích màu */}
            <div className="w-full max-w-3xl mx-auto mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-cinema-muted">
              {/* Available standard */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-t-sm bg-white/10 border border-white/25" />
                <span>Thường ({formatCurrencyVND(showtime?.basePrice || 0)})</span>
              </div>
              {/* VIP */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-t-sm bg-amber-500/20 border border-amber-500/50" />
                <span>VIP</span>
              </div>
              {/* Couple */}
              <div className="flex items-center gap-2">
                <span className="w-6 h-4 rounded-t-sm bg-pink-500/20 border border-pink-500/50" />
                <span>Ghế đôi</span>
              </div>
              {/* Selected */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-t-sm bg-green-500 border border-green-300 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="font-semibold text-green-300">Đang chọn</span>
              </div>
              {/* Held */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-t-sm bg-orange-500/20 border border-orange-500/40" />
                <span>Đang giữ</span>
              </div>
              {/* Sold */}
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-t-sm bg-slate-800 border border-slate-700 opacity-60" />
                <span>Đã bán</span>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Booking Summary Bar */}
        <div className="sticky bottom-4 z-20 mt-8 w-full max-w-4xl mx-auto">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#070a1f]/90 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Selected seats info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-cinema-muted">Ghế đã chọn:</span>
                {selectedSeats.length > 0 ? (
                  <span className="text-sm font-black text-brand tracking-wide">
                    {selectedSeats.map((s) => s.label).join(', ')} ({selectedSeats.length}/8)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Vui lòng chọn ghế trên sơ đồ</span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xs text-cinema-muted">Tạm tính:</span>
                <span className="text-lg sm:text-xl font-extrabold text-accent-gold">
                  {formatCurrencyVND(totalPrice)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={selectedSeats.length === 0 || isHolding}
                onClick={handleProceed}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 min-h-[46px] rounded-full bg-brand hover:bg-brand-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-brand/30 hover:shadow-brand/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isHolding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang giữ ghế...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Tiếp tục (Đặt {selectedSeats.length} vé)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Smart Seat Modal */}
        {isSmartSeatOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          >
            <div className="relative w-full max-w-md rounded-card bg-[#070a1f] border border-white/20 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-gold" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Gợi ý vị trí ghế tối ưu (Smart Seat)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSmartSeatOpen(false)}
                  className="p-1 rounded-full text-cinema-muted hover:text-white hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Seat Count Picker (1-8) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cinema-muted mb-2">
                    Số lượng ghế ({smartCount})
                  </label>
                  <div className="grid grid-cols-8 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSmartCount(count)}
                        className={cn(
                          'py-2 rounded-btn font-bold text-xs transition-colors cursor-pointer',
                          smartCount === count
                            ? 'bg-brand text-white shadow-md shadow-brand/40'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sit Together Toggle */}
                <div className="flex items-center justify-between p-3 rounded-btn bg-white/5 border border-white/10">
                  <div>
                    <p className="font-semibold text-white">Ngồi liền kề nhau</p>
                    <p className="text-[11px] text-cinema-muted">Ưu tiên cụm ghế liền nhau trong 1 hàng</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={smartTogether}
                    onChange={(e) => setSmartTogether(e.target.checked)}
                    className="w-4 h-4 accent-brand cursor-pointer"
                  />
                </div>

                {/* Preferred Zone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cinema-muted mb-2">
                    Khu vực ưu tiên
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: null, label: 'Tùy chọn' },
                      { id: 'front', label: 'Gần' },
                      { id: 'middle', label: 'Trung tâm' },
                      { id: 'back', label: 'Phía sau' },
                    ].map((zone) => (
                      <button
                        key={zone.label}
                        type="button"
                        onClick={() => setSmartZone(zone.id as any)}
                        className={cn(
                          'py-2 px-1 text-center rounded-btn font-semibold text-xs transition-colors cursor-pointer',
                          smartZone === zone.id
                            ? 'bg-brand text-white'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        )}
                      >
                        {zone.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  disabled={smartLoading}
                  onClick={handleRequestSmartSeat}
                  className="w-full py-3 rounded-btn bg-brand hover:bg-brand-600 text-white font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand/30"
                >
                  {smartLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tìm ghế...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Tìm cụm ghế tốt nhất</span>
                    </>
                  )}
                </button>

                {/* Recommendations Switcher if multiple plans found */}
                {smartResult && smartResult.recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    <p className="text-xs font-bold text-green-300">
                      ✓ Đã tìm thấy {smartResult.recommendations.length} phương án:
                    </p>
                    <div className="flex gap-2">
                      {smartResult.recommendations.map((plan, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveRecommendationIndex(idx);
                            applyRecommendation(plan);
                          }}
                          className={cn(
                            'flex-1 py-1.5 px-2 rounded-btn text-xs font-semibold transition-colors cursor-pointer',
                            activeRecommendationIndex === idx
                              ? 'bg-green-500/20 border border-green-500 text-green-300'
                              : 'bg-white/5 border border-white/10 text-cinema-muted hover:text-white'
                          )}
                        >
                          Phương án {idx + 1}
                        </button>
                      ))}
                    </div>
                    {!smartResult.seats_together && (
                      <p className="text-[11px] text-amber-300">
                        * Không còn đủ ghế liền kề nhau, hệ thống đã gợi ý các ghế gần nhau nhất.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SeatSelectionPage;
