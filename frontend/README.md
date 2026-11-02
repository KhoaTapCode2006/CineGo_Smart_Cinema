# CineGo Smart Cinema — Frontend

The web client for CineGo Smart Cinema. It reads its data from the FastAPI backend API (`/api/v1`) and provides a modern, responsive, and cinematic movie booking experience.

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Vite + React 18** | Build tool and component framework |
| **TypeScript** | Strict type safety |
| **Tailwind CSS** | Styling with custom cinematic dark design tokens |
| **React Router v6** | Client-side routing and URL state sync |
| **TanStack Query (v5)** | Server state management, caching, and auto-refetching |
| **Axios** | HTTP client with automatic Bearer token and FastAPI error normalization |
| **Lucide Icons** | Consistent iconography |

---

## 🎨 Design System & Theme Tokens

The UI follows the CineGo Smart Cinema dark theme:
- **Background**: `#0F1220` (`bg-cinema-bg`)
- **Surface / Card**: `#181C2E` (`bg-cinema-card`, `bg-cinema-surface`)
- **Card Hover**: `#222942` (`bg-cinema-hover`)
- **Borders**: `#262D4A` (`border-cinema-border`)
- **Text Primary**: `#F4F5F7` (`text-cinema-text`)
- **Text Muted**: `#9BA3B8` (`text-cinema-muted`)
- **Primary Action (Brand Red)**: `#E50914` (`bg-brand`, `text-brand`)
- **Accent (Gold)**: `#F5B301` (`bg-accent-gold`, `text-accent-gold`)
- **Border Radius**: Cards = `12px` (`rounded-card`), Buttons & Inputs = `8px` (`rounded-btn`)
- **Typography**: Inter (system-ui fallback)
- **Transitions**: 200–300ms smooth cubic bezier

---

## 📂 Project Structure

```text
frontend/src/
├── api/
│   ├── client.ts          # Axios client with auth interceptor & FastAPI error normalizer
│   └── catalog.ts         # Endpoints for movies, showtimes, cinemas + offline fallback
├── app/
│   └── App.tsx            # QueryClientProvider & Root app wrapper
├── components/
│   ├── discovery/
│   │   ├── MovieCard.tsx  # 2:3 portrait card with hover actions & age badge
│   │   └── MovieDiscovery.tsx # Sticky filter toolbar, genre chips, responsive grid, pagination
│   ├── hero/
│   │   ├── Ring3D.tsx     # 3D rotating stage with perspective & continuous rotation
│   │   ├── HeroInfoPanel.tsx # Active movie metadata, chips (flex-wrap) & action buttons
│   │   ├── HeroControls.tsx # Prev/Next arrows + 5 dots with autoplay progress bar
│   │   ├── HeroSlider.tsx # Fixed-height container, state management, keyboard & swipe
│   │   ├── useRingGeometry.ts # Computes card width W, radius R & perspective dynamically
│   │   └── useAutoplay.ts # 4.5s autoplay timer, pauses on hover/focus/tab hidden
│   ├── layout/
│   │   ├── Navbar.tsx     # Sticky glassmorphism header
│   │   └── Footer.tsx     # Footer branding and information
│   └── ui/
│       ├── AgeRatingBadge.tsx # Standardized rating chips (P, K, T13, T16, T18)
│       ├── EmptyState.tsx # Themed empty states with clear filters action
│       ├── ErrorState.tsx # Connection error with retry trigger
│       ├── GenreChip.tsx  # Reusable filter chip (44px touch target)
│       ├── Pagination.tsx # Accessible numbered pagination
│       ├── SearchInput.tsx # Debounced search input with clear button
│       ├── Skeletons.tsx  # Pulsing loading placeholders
│       ├── StatusBadge.tsx # "Now Showing" / "Coming Soon" live indicator
│       ├── Tabs.tsx       # Animated underline tab list
│       └── TrailerModal.tsx # Accessible 16:9 YouTube video player modal
├── data/
│   └── mockMovies.ts      # 12 fictional movies for offline testing & edge-case mockups
├── hooks/
│   └── useMovies.ts       # TanStack Query hooks (useMovies, useFeaturedMovies, useGenres)
├── pages/
│   └── HomePage.tsx       # Home page composing Hero Slider and Movie Discovery
├── types/
│   └── movie.ts           # Backend raw types (MovieOut) & Frontend models + mappers
├── utils/
│   ├── cn.ts              # clsx + twMerge utility
│   └── formatters.ts      # Currency (VND), date, and time formatters
├── index.css              # Tailwind base, dark mode, focus rings & scrollbar styles
└── main.tsx               # Entry point
```

---

## ⚙️ Environment Variables

Create or edit `.env` in the `frontend` root:

```env
# Base URL for the FastAPI backend (all routes are prefixed with /api/v1)
VITE_API_URL=http://localhost:8000/api/v1

# Real-time WebSocket server URL
VITE_SOCKET_URL=http://localhost:8000

# Set to true to force local mock dataset fallback during UI design & testing
VITE_USE_MOCK=false
```

---

## 🚀 Running Front-End and Back-End Together

### 1. Start the Back-End (FastAPI)
In a terminal at repository root or `backend/`:
```bash
# Using Python virtual environment
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger UI will be available at: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health/live`

### 2. Start the Front-End (Vite + React)
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
- Web Application will be live at: `http://localhost:3000`
- The front-end connects directly to `http://localhost:8000/api/v1`.
- If the backend is not yet populated or offline, the front-end automatically falls back to the rich 12-movie design dataset so you can test all UI states immediately!

### 3. Build & Typecheck
```bash
cd frontend
npm run build
```
