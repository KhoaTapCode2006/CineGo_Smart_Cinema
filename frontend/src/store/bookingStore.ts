import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookingShowtime {
  id: string;
  movieTitle: string;
  cinemaName: string;
  hallName: string;
  startAt: string;
  basePrice?: number;
}

export interface SelectedSeat {
  id: string;
  label: string;
  price: number;
  seat_type: string;
}

export interface BookingState {
  showtime: BookingShowtime | null;
  selectedSeats: SelectedSeat[];
  holdIds: string[];
  expiresAt: string | null;

  setShowtime: (showtime: BookingShowtime | null) => void;
  setSelectedSeats: (seats: SelectedSeat[]) => void;
  toggleSeat: (seat: SelectedSeat) => void;
  setHolds: (holdIds: string[], expiresAt: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      showtime: null,
      selectedSeats: [],
      holdIds: [],
      expiresAt: null,

      setShowtime: (showtime) => {
        set({ showtime, selectedSeats: [], holdIds: [], expiresAt: null });
      },

      setSelectedSeats: (selectedSeats) => {
        set({ selectedSeats });
      },

      toggleSeat: (seat) => {
        set((state) => {
          const exists = state.selectedSeats.some((s) => s.id === seat.id);
          if (exists) {
            return {
              selectedSeats: state.selectedSeats.filter((s) => s.id !== seat.id),
            };
          }
          if (state.selectedSeats.length >= 8) {
            return state;
          }
          return {
            selectedSeats: [...state.selectedSeats, seat],
          };
        });
      },

      setHolds: (holdIds, expiresAt) => {
        set({ holdIds, expiresAt });
      },

      reset: () => {
        set({
          showtime: null,
          selectedSeats: [],
          holdIds: [],
          expiresAt: null,
        });
      },
    }),
    {
      name: 'cinego_booking',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export const bookingStore = useBookingStore;
export default useBookingStore;
