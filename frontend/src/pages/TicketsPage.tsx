import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket, Calendar, MapPin, QrCode, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { getMyTickets, getTicketDetail, TicketItem } from '../api/tickets';
import { formatVietnamDateTime } from '../utils/formatters';
import { cn } from '../utils/cn';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'issued':
      return {
        label: 'Đã phát hành',
        className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        icon: Ticket,
      };
    case 'checked_in':
      return {
        label: 'Đã check-in',
        className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        icon: CheckCircle2,
      };
    case 'expired':
      return {
        label: 'Hết hạn',
        className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
        icon: AlertCircle,
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        className: 'bg-red-500/20 text-red-300 border border-red-500/30',
        icon: X,
      };
    default:
      return {
        label: status,
        className: 'bg-white/10 text-slate-300 border border-white/20',
        icon: AlertCircle,
      };
  }
};

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTicketCode, setSelectedTicketCode] = useState<string | null>(null);

  const newParam = searchParams.get('new') || '';
  const newTicketCodes = useMemo(() => {
    if (!newParam) return new Set<string>();
    return new Set(
      newParam
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean)
    );
  }, [newParam]);

  const {
    data: tickets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<TicketItem[]>({
    queryKey: ['my-tickets'],
    queryFn: () => getMyTickets(1, 50),
    staleTime: 30 * 1000,
  });

  // Modal detail query: GET /tickets/{ticket_code}
  const {
    data: detailTicket,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useQuery<TicketItem>({
    queryKey: ['ticket-detail', selectedTicketCode],
    queryFn: () => getTicketDetail(selectedTicketCode!),
    enabled: !!selectedTicketCode,
  });

  const activeTicket =
    detailTicket || tickets.find((t) => t.ticket_code === selectedTicketCode) || null;

  // Sắp xếp vé: vé sắp chiếu lên trước (ưu tiên vé tương lai theo thời gian tăng dần)
  const sortedTickets = useMemo(() => {
    const now = Date.now();
    return [...tickets].sort((a, b) => {
      const isUpcoming = (t: TicketItem) => {
        if (t.status === 'cancelled' || t.status === 'expired') return false;
        return new Date(t.start_at).getTime() >= now;
      };

      const upA = isUpcoming(a);
      const upB = isUpcoming(b);

      if (upA && !upB) return -1;
      if (!upA && upB) return 1;

      const timeA = new Date(a.start_at).getTime();
      const timeB = new Date(b.start_at).getTime();

      if (upA && upB) {
        return timeA - timeB; // Sắp chiếu nhất lên đầu
      }
      return timeB - timeA; // Quá khứ: gần đây nhất lên đầu
    });
  }, [tickets]);

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      <AmbientEffects
        galaxy={{ nebulaOpacity: 1, starOpacity: 1 }}
        shootingStars={{ count: 6, angle: 32 }}
        cursorGlow={{ redOpacity: 0.08, indigoOpacity: 0.07, size: 520, easing: 0.08 }}
      />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-brand mb-1 block">
            CineGo Customer
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Vé của tôi (My Tickets)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-cinema-muted">
            Quản lý các vé xem phim đã thanh toán và xuất trình mã QR tại cổng soát vé.
          </p>
        </div>

        {/* Thông báo nếu có vé mới vừa thanh toán */}
        {newTicketCodes.size > 0 && tickets.some((t) => newTicketCodes.has(t.ticket_code)) && (
          <div className="mb-6 p-4 rounded-card bg-brand/15 border border-brand/30 flex items-center justify-between gap-3 text-sm text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <div>
                <p className="font-bold">Đặt vé thành công!</p>
                <p className="text-xs text-cinema-muted">
                  Các vé mới thanh toán của bạn đã được làm nổi bật bên dưới.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-48 rounded-card bg-cinema-card/60 border border-cinema-border/50"
              />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải danh sách vé"
            message="Đã có lỗi xảy ra khi kết nối tới máy chủ. Vui lòng thử lại."
            retryText="Thử lại"
            onRetry={() => refetch()}
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            type="now_showing"
            title="Chưa có vé nào"
            description="Bạn chưa có vé xem phim nào. Khám phá các bộ phim hấp dẫn và đặt vé ngay nhé!"
            actionText="Khám phá phim"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedTickets.map((ticket) => {
              const isNew = newTicketCodes.has(ticket.ticket_code);
              const badge = getStatusBadge(ticket.status);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={ticket.ticket_code}
                  className={cn(
                    'rounded-card bg-cinema-card/80 border backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-200 shadow-xl',
                    isNew
                      ? 'border-brand ring-2 ring-brand/40 shadow-brand/20 bg-brand/5'
                      : 'border-cinema-border/90 hover:border-cinema-muted/50'
                  )}
                >
                  <div>
                    {/* Header: Code, New badge & Vietnamese Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                          {ticket.ticket_code}
                        </span>
                        {isNew && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/50 animate-pulse flex items-center gap-0.5">
                            ✨ Mới
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 shrink-0',
                          badge.className
                        )}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>

                    {/* Movie Title */}
                    <h2 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-snug mb-2">
                      {ticket.movie_title}
                    </h2>

                    {/* Cinema, Hall, Showtime & Checked-in info */}
                    <div className="space-y-1.5 text-xs text-cinema-muted mb-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cinema-muted shrink-0" />
                        <span className="truncate">
                          {ticket.cinema_name} · {ticket.hall_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cinema-muted shrink-0" />
                        <span>{formatVietnamDateTime(ticket.start_at)}</span>
                      </div>
                      {ticket.checked_in_at && (
                        <div className="flex items-center gap-1.5 text-blue-300/90">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Đã check-in: {formatVietnamDateTime(ticket.checked_in_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seat & QR Action Button */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-cinema-muted block">
                        Ghế
                      </span>
                      <span className="text-lg font-black text-brand tracking-wide">
                        {ticket.seat_label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTicketCode(ticket.ticket_code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/15 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Xem QR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal chi tiết vé & QR lớn */}
        {selectedTicketCode && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          >
            <div className="relative w-full max-w-sm rounded-card bg-[#070a1f] border border-white/20 p-6 text-center shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedTicketCode(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full text-cinema-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Đóng Modal QR"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="text-xs font-bold uppercase tracking-wider text-brand block mb-1">
                Chi tiết vé điện tử
              </span>

              {isDetailLoading && !activeTicket ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-cinema-muted">Đang tải thông tin vé...</p>
                </div>
              ) : isDetailError && !activeTicket ? (
                <div className="py-8">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white mb-2">Không thể tải thông tin vé</p>
                  <button
                    type="button"
                    onClick={() => refetchDetail()}
                    className="px-3 py-1.5 bg-brand text-black rounded text-xs font-bold"
                  >
                    Thử lại
                  </button>
                </div>
              ) : activeTicket ? (
                (() => {
                  const badge = getStatusBadge(activeTicket.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <>
                      <h3
                        className="text-lg font-bold text-white mb-1 truncate"
                        title={activeTicket.movie_title}
                      >
                        {activeTicket.movie_title}
                      </h3>

                      <div className="flex justify-center my-1.5">
                        <span
                          className={cn(
                            'text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1',
                            badge.className
                          )}
                        >
                          <BadgeIcon className="w-3 h-3" /> {badge.label}
                        </span>
                      </div>

                      <div className="text-xs text-cinema-muted space-y-1 mb-3">
                        <p>
                          {activeTicket.cinema_name} ·{' '}
                          <span className="text-slate-300 font-medium">{activeTicket.hall_name}</span>
                        </p>
                        <p>
                          Suất chiếu:{' '}
                          <span className="text-white font-medium">
                            {formatVietnamDateTime(activeTicket.start_at)}
                          </span>
                        </p>
                        <p>
                          Ghế:{' '}
                          <span className="font-bold text-brand text-sm">{activeTicket.seat_label}</span>
                        </p>
                        <p>
                          Thời gian check-in:{' '}
                          <span className="text-slate-200 font-medium">
                            {activeTicket.checked_in_at
                              ? formatVietnamDateTime(activeTicket.checked_in_at)
                              : 'Chưa check-in'}
                          </span>
                        </p>
                      </div>

                      {/* QR Code Container với qrcode.react */}
                      <div className="bg-white p-4 rounded-xl inline-block shadow-lg mb-2">
                        <QRCodeSVG
                          value={activeTicket.qr_token}
                          size={220}
                          level="H"
                          includeMargin={true}
                        />
                      </div>

                      <p className="font-mono text-sm font-bold text-slate-200 tracking-wider">
                        {activeTicket.ticket_code}
                      </p>

                      <div className="mt-2 text-left">
                        <span className="text-[10px] uppercase font-bold text-cinema-muted block mb-0.5">
                          QR Token:
                        </span>
                        <p className="font-mono text-[10px] text-slate-400 break-all bg-black/40 p-2 rounded border border-white/10 select-all max-h-16 overflow-y-auto">
                          {activeTicket.qr_token}
                        </p>
                      </div>

                      <p className="text-[11px] text-cinema-muted mt-2">
                        Xuất trình mã QR này tại cổng soát vé rạp phim.
                      </p>
                    </>
                  );
                })()
              ) : null}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TicketsPage;
