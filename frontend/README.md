# CineGo Smart Cinema — Frontend

The web client for CineGo Smart Cinema. It reads its data from the backend API (see `../docs/API.md`).

This is a clean scaffold. The UI is being rebuilt from the team's Figma design, so there are no pages yet.

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Vite + React 18** | Build tool and component framework |
| **TypeScript** | Type checking |
| **Tailwind CSS** | Styling |
| **React Router v6** | Client-side routing |
| **TanStack Query (v5)** | Server state and data fetching |
| **Axios** | HTTP client |
| **Zustand** | Client state |
| **React Hook Form + Zod** | Forms and validation |
| **Lucide Icons** | Icons |

The full list of pinned versions is in `package.json` (also listed in `requirement.txt`).

---

## 📂 Project Structure

```text
src/
├── app/
│   └── App.tsx        # Root component
├── index.css          # Tailwind directives
├── main.tsx           # Entry point
└── vite-env.d.ts      # Vite and env variable types
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v9 or higher

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

`VITE_API_URL` is the base URL of the backend API.

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Preview
```bash
# Type-check and build the production bundle
npm run build

# Preview the production build locally
npm run preview
```
