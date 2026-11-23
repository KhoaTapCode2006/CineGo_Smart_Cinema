import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, MapPin, Clock, QrCode, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { getMyTickets, TicketItem } from '../api/tickets';
import { formatDate, formatTime } from '../utils/formatters';

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

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
            Manage your paid cinema tickets and present the QR code at the check-in gate.
          </p>
        </div>

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
            title="Could not load your tickets"
            message="Something went wrong while contacting the server. Please try again."
            retryText="Retry"
            onRetry={() => refetch()}
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            type="now_showing"
            title="No tickets yet"
            description="You haven't purchased any tickets yet. Explore movies and book your favorite seats!"
            actionText="Browse Movies"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tickets.map((ticket) => {
              const isCheckedIn = ticket.status === 'checked_in';
              const isExpired = ticket.status === 'expired' || ticket.status === 'cancelled';

              return (
                <div
                  key={ticket.ticket_code}
                  className="rounded-card bg-cinema-card/80 border border-cinema-border/90 backdrop-blur-md p-5 flex flex-col justify-between hover:border-cinema-muted/50 transition-all duration-200 shadow-xl"
                >
                  <div>
                    {/* Header: Code & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                        {ticket.ticket_code}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                          isCheckedIn
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : isExpired
                            ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}
                      >
                        {isCheckedIn ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Checked In
                          </>
                        ) : isExpired ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> {ticket.status}
                          </>
                        ) : (
                          'Active'
                        )}
                      </span>
                    </div>

                    {/* Movie Title */}
                    <h2 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-snug mb-2">
                      {ticket.movie_title}
                    </h2>

                    {/* Cinema & Hall */}
                    <div className="space-y-1 text-xs text-cinema-muted mb-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cinema-muted shrink-0" />
                        <span className="truncate">
                          {ticket.cinema_name} · {ticket.hall_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cinema-muted shrink-0" />
                        <span>{formatDate(ticket.start_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cinema-muted shrink-0" />
                        <span>{formatTime(ticket.start_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seat & QR Action Button */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-cinema-muted block">
                        Seat
                      </span>
                      <span className="text-lg font-black text-brand tracking-wide">
                        {ticket.seat_label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/15 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View QR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal QR Code */}
        {selectedTicket && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          >
            <div className="relative w-full max-w-sm rounded-card bg-[#070a1f] border border-white/20 p-6 text-center shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full text-cinema-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close QR Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="text-xs font-bold uppercase tracking-wider text-brand block mb-1">
                E-Ticket QR Code
              </span>
              <h3 className="text-lg font-bold text-white mb-1 truncate">
                {selectedTicket.movie_title}
              </h3>
              <p className="text-xs text-cinema-muted mb-4">
                {selectedTicket.cinema_name} · Seat{' '}
                <span className="font-bold text-brand">{selectedTicket.seat_label}</span>
              </p>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl inline-block shadow-lg mb-3">
                <QRCodeSVG
                  value={selectedTicket.qr_token}
                  size={190}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="font-mono text-xs font-bold text-slate-300 tracking-wider">
                {selectedTicket.ticket_code}
              </p>
              <p className="text-[11px] text-cinema-muted mt-2">
                Present this signed QR code to cinema staff at check-in gate.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TicketsPage;
