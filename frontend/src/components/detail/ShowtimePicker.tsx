import React, { useMemo, useState } from 'react';
import { Movie } from '../../types/movie';
import { useCinemas, useShowtimes } from '../../hooks/useMovies';
import { formatPriceVND } from '../../utils/formatters';
import {
  ShowtimeOption,
  formatDayChip,
  formatDayHeading,
  getCinemaDate,
  groupShowtimesByDay,
  shortCinemaName,
} from '../../utils/showtimes';
import ErrorState from '../ui/ErrorState';
import ChoiceChip from './ChoiceChip';
import DetailPanel from './DetailPanel';

interface ShowtimePickerProps {
  movie: Movie;
}

function getOptionCaption({ showtime, state }: ShowtimeOption): string {
  if (state === 'started') return 'Đã bắt đầu';
  if (state === 'sold_out') return 'Hết ghế';
  return `${showtime.hall_name} · ${showtime.available_seats} ghế trống`;
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
    <>
      <div className="flex flex-col gap-2 w-full">
        <h2 className="text-2xl font-bold text-cinema-text">Chọn suất chiếu</h2>
        {activeDay && (
          <p className="text-base text-cinema-soft">
            {formatDayHeading(activeDay.date)} · Giá vé từ {formatPriceVND(activeDay.minPrice)}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2 animate-pulse" aria-label="Đang tải lịch chiếu">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`day-${idx}`} className="h-11 w-[120px] rounded-btn bg-cinema-raised" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Không tải được lịch chiếu"
          message="Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại."
          retryText="Thử lại"
          onRetry={() => refetch()}
          className="w-full my-0"
        />
      ) : !activeDay ? (
        <DetailPanel>
          <p className="text-xl font-semibold text-cinema-text">Chưa có suất chiếu</p>
          <p className="text-sm font-medium text-cinema-soft">
            {movie.status === 'coming_soon'
              ? 'Lịch chiếu của phim sẽ được cập nhật sớm.'
              : 'Hiện chưa có suất chiếu nào cho phim này.'}
          </p>
        </DetailPanel>
      ) : (
        <>
          {/* Date Selector */}
          <div className="flex flex-wrap items-start gap-2 w-full">
            {days.map((day) => (
              <ChoiceChip
                key={day.date}
                label={formatDayChip(day.date, today)}
                isSelected={day.date === activeDay.date}
                onClick={() => handleSelectDate(day.date)}
              />
            ))}
          </div>

          {/* One Panel per Cinema */}
          {activeDay.cinemas.map((cinema) => {
            const address = cinemas.find((c) => c.id === cinema.cinemaId)?.address;

            return (
              <DetailPanel key={cinema.cinemaId}>
                <h3 className="text-xl font-semibold text-cinema-text">{cinema.cinemaName}</h3>
                <p className="text-xs text-cinema-soft">
                  {[address, ...cinema.languages].filter(Boolean).join(' · ')}
                </p>

                <div className="grid grid-cols-[repeat(2,max-content)] md:flex md:flex-wrap items-start gap-3">
                  {cinema.options.map((option) => {
                    const isSelected = option.showtime.id === selection?.option.showtime.id;

                    return (
                      <div key={option.showtime.id} className="flex flex-col gap-2">
                        <ChoiceChip
                          label={isSelected ? `${option.time} ✓` : option.time}
                          isSelected={isSelected}
                          disabled={option.state !== 'available'}
                          onClick={() => handleSelectShowtime(option.showtime.id)}
                        />
                        <p className="w-min min-w-full text-xs text-cinema-soft">
                          {getOptionCaption(option)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </DetailPanel>
            );
          })}

          {/* Booking Button */}
          <div className="flex flex-col items-start gap-2 w-full">
            <button
              type="button"
              disabled={!selection}
              onClick={() => setShowBookingNotice(true)}
              className="h-12 w-full md:w-auto px-4 py-3 rounded-btn bg-brand text-sm font-medium text-white transition-all duration-200 enabled:cursor-pointer enabled:hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selection
                ? `Đặt vé · ${selection.option.time} · ${shortCinemaName(selection.cinema.cinemaName)} →`
                : 'Chọn suất chiếu để đặt vé'}
            </button>
            {showBookingNotice && selection && (
              <p role="status" className="text-xs text-cinema-soft">
                Màn hình chọn ghế chưa được triển khai.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default ShowtimePicker;
