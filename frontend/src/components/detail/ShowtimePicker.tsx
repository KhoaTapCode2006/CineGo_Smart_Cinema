import React, { useMemo, useState } from 'react';
import { MapPin, Ticket } from 'lucide-react';
import { Movie } from '../../types/movie';
import { useCinemas, useShowtimes } from '../../hooks/useMovies';
import { formatCurrencyVND } from '../../utils/formatters';
import {
  ShowtimeOption,
  formatDayChip,
  formatDayHeading,
  getCinemaDate,
  groupShowtimesByDay,
} from '../../utils/showtimes';
import { cn } from '../../utils/cn';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import ScrollReveal from '../effects/ScrollReveal';

interface ShowtimePickerProps {
  movie: Movie;
}

function getOptionCaption({ showtime, state }: ShowtimeOption): string {
  if (state === 'started') return 'Started';
  if (state === 'sold_out') return 'Sold out';
  return `${showtime.hall_name} · ${showtime.available_seats} seats left`;
}

export const ShowtimePicker: React.FC<ShowtimePickerProps> = ({ movie }) => {
  const { data: showtimes, isLoading, isError, refetch } = useShowtimes(movie.id);
  const { data: cinemas = [] } = useCinemas();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null);
  const [showBookingNotice, setShowBookingNotice] = useState(false);

  const days = useMemo(() => groupShowtimesByDay(showtimes ?? []), [showtimes]);
  const activeDay = days.find((day) => day.date === selectedDate) ?? days[0];

  // Derived on every refetch, so a showtime that just sold out can't stay selected.
  const selection = activeDay?.cinemas
    .flatMap((cinema) => cinema.options.map((option) => ({ cinema, option })))
    .find(
      ({ option }) => option.showtime.id === selectedShowtimeId && option.state === 'available'
    );

  const today = getCinemaDate(new Date());

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedShowtimeId(null);
    setShowBookingNotice(false);
  };

  const handleSelectShowtime = (showtimeId: string) => {
    setSelectedShowtimeId(showtimeId === selectedShowtimeId ? null : showtimeId);
    setShowBookingNotice(false);
  };

  return (
    <section
      id="showtimes"
      className="scroll-mt-[var(--nav-h,4rem)] relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14"
    >
      {/* Section Header, matching the Discover section */}
      <ScrollReveal distance={16} duration={500}>
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-brand mb-1 block">
            CineGo Schedule
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)]">
            Showtimes
          </h2>
          {activeDay && (
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
              {formatDayHeading(activeDay.date)} · Tickets from{' '}
              <span className="font-semibold text-accent-gold">
                {formatCurrencyVND(activeDay.minPrice)}
              </span>
            </p>
          )}
        </div>
      </ScrollReveal>

      {isLoading ? (
        <div className="flex gap-2.5 animate-pulse" aria-label="Loading showtimes">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`day-${idx}`} className="h-[58px] w-[84px] rounded-xl bg-white/10" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load showtimes"
          message="Something went wrong while contacting the server. Please try again."
          retryText="Retry"
          onRetry={() => refetch()}
        />
      ) : !activeDay ? (
        <EmptyState
          type="now_showing"
          title="No showtimes yet"
          description={
            movie.status === 'coming_soon'
              ? 'Showtimes for this movie will be announced soon.'
              : 'There are no upcoming showtimes for this movie right now.'
          }
        />
      ) : (
        <>
          {/* Date Selector */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-4 border-b border-white/10">
            {days.map((day) => {
              const label = formatDayChip(day.date, today);
              const isSelected = day.date === activeDay.date;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleSelectDate(day.date)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex flex-col items-center shrink-0 min-w-[84px] px-4 py-2 rounded-xl border transition-all duration-200 cursor-pointer',
                    isSelected
                      ? 'bg-brand border-brand text-white shadow-lg shadow-brand/30'
                      : 'bg-white/5 border-white/10 backdrop-blur-sm text-slate-200 hover:bg-white/10 hover:border-white/20 hover:text-white'
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                    {label.weekday}
                  </span>
                  <span className="text-sm font-bold">{label.day}</span>
                </button>
              );
            })}
          </div>

          {/* One Card per Cinema */}
          <div className="mt-6 flex flex-col gap-4">
            {activeDay.cinemas.map((cinema) => {
              const address = cinemas.find((c) => c.id === cinema.cinemaId)?.address;

              return (
                <div
                  key={cinema.cinemaId}
                  className="rounded-card bg-cinema-card/70 border border-cinema-border/80 backdrop-blur-md p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-white">{cinema.cinemaName}</h3>
                      {address && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cinema-muted">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{address}</span>
                        </p>
                      )}
                    </div>
                    {cinema.languages.map((language) => (
                      <span
                        key={language}
                        className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-slate-300"
                      >
                        {language}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {cinema.options.map((option) => {
                      const isSelected = option.showtime.id === selection?.option.showtime.id;
                      const isAvailable = option.state === 'available';

                      return (
                        <div key={option.showtime.id} className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectShowtime(option.showtime.id)}
                            disabled={!isAvailable}
                            aria-pressed={isSelected}
                            className={cn(
                              'min-w-[96px] px-4 py-2.5 rounded-btn border text-sm font-bold transition-all duration-200',
                              isSelected
                                ? 'bg-brand border-brand text-white shadow-lg shadow-brand/30 cursor-pointer'
                                : 'bg-white/5 border-white/10 text-white',
                              !isSelected && isAvailable &&
                                'cursor-pointer hover:border-white/25 hover:bg-white/10',
                              !isAvailable &&
                                'opacity-40 cursor-not-allowed line-through decoration-white/40'
                            )}
                          >
                            {option.time}
                          </button>
                          <span className="w-min min-w-full text-[11px] leading-4 text-cinema-muted">
                            {getOptionCaption(option)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking Bar: follows the page once a showtime is picked */}
          <div className={cn('mt-6', selection && 'sticky bottom-4 z-20')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#070a1f]/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60">
              <div className="min-w-0 px-1">
                {selection ? (
                  <>
                    <p className="text-sm sm:text-base font-bold text-white truncate">
                      {selection.option.time} · {selection.cinema.cinemaName}
                    </p>
                    <p className="text-xs text-cinema-muted truncate">
                      {formatDayHeading(activeDay.date)} · {selection.option.showtime.hall_name} ·{' '}
                      {formatCurrencyVND(selection.option.showtime.base_price)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-300">Select a showtime to book your seats</p>
                )}
                {showBookingNotice && selection && (
                  <p role="status" className="mt-1 text-xs font-semibold text-brand-300">
                    Seat selection isn't available yet.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={!selection}
                onClick={() => setShowBookingNotice(true)}
                className="inline-flex items-center justify-center gap-2 shrink-0 px-6 py-3 min-h-[44px] rounded-full bg-brand text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-brand/30 transition-all duration-200 enabled:cursor-pointer enabled:hover:bg-brand-600 enabled:hover:shadow-brand/50 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Ticket className="w-4 h-4" />
                <span>Book Tickets</span>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ShowtimePicker;
