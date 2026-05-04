# Personal Health System

A full-stack personal health tracking web application — futuristic dark UI in Russian.

## Architecture

- **Frontend**: React + Vite (artifact: `health-tracker`, path `/`)
- **Backend**: Express 5 API server (artifact: `api-server`, path `/api`)
- **Database**: PostgreSQL via Drizzle ORM (lib: `@workspace/db`)
- **API Contract**: OpenAPI spec → generated React Query hooks + Zod schemas (Orval)

## Stack

- React, Wouter router, TanStack Query, shadcn/ui, Tailwind CSS, Recharts, Framer Motion
- Three.js + @react-three/fiber + @react-three/drei (3D body model)
- Express 5, Drizzle ORM, pino logger
- Orval codegen (OpenAPI → React Query + Zod)

## UI Design

- **Theme**: Ultra-dark 2026 futuristic — `#020209` background, cyan (#6ee7f7) + purple (#a855f7) palette
- **Effects**: Glassmorphism cards, aurora gradients, scanline animation, grid background
- **Layout**: No sidebar — bottom navigation bar (7 items) with motion.div active indicator
- **Onboarding**: Jarvis-style typewriter onboarding (JarvisOnboarding.tsx) — cinematic, collects profile data step-by-step
- **Home Page**: Full-screen 3D interactive body model (BodyScene.tsx) with floating metric cards
- **AppShell**: Glass bottom-nav shell for inner pages with back button + page title
- All UI text and server-generated text is in **Russian**

## Key Files

- `src/App.tsx` — onboarding gate (checks `localStorage.jarvis_profile`), routing
- `src/components/onboarding/JarvisOnboarding.tsx` — cinematic 8-step onboarding
- `src/components/body3d/BodyScene.tsx` — React Three Fiber 3D parametric human body
- `src/pages/home.tsx` — main page: 3D body + floating metric cards + bottom nav
- `src/components/layout/AppShell.tsx` — shell for inner pages (log, nutrients, labs, etc.)
- `src/index.css` — full dark theme CSS (glass, aurora, glow utilities)

## Profile Storage

- Collected during Jarvis onboarding and stored in `localStorage` as `jarvis_profile` (JSON)
- Profile is also synced to the server via `PUT /api/profile` on first load
- Reset: delete `jarvis_profile` and `jarvis_profile_saved` from localStorage

## Features

1. **Home / 3D Body** (`/`) — interactive 3D parametric body that scales to user's actual height/weight/body fat; floating metric cards (water, sleep, calories, body fat)
2. **Daily Log** (`/log/:date`) — food entry with food search, water tracking, activity logging, sleep + wellbeing sliders
3. **Nutrient Analysis** (`/nutrients`) — 26 nutrients vs. RDA targets across 1d/7d/28d/90d periods
4. **Lab Results** (`/labs`) — add/delete biomarkers (23 common + custom), auto-status
5. **Body Measurements** (`/measurements`) — weight, body fat %, muscle, waist/hip trend chart
6. **Recommendations** (`/recommendations`) — AI-style prioritized recommendations (all in Russian)
7. **Weekly Report** (`/weekly`) — weekly averages, comparison to prev week, bar chart
8. **History** (`/history`) — last 30 log days summary
9. **Profile** (`/profile`) — demographics, activity level, goals, medical context

## API Routes

- `GET/PUT /api/profile`
- `GET /api/logs`, `GET/PATCH /api/logs/:date`
- `POST /api/logs/:date/food`, `DELETE /api/logs/:date/food/:entryId`
- `POST /api/logs/:date/activity`, `DELETE /api/logs/:date/activity/:entryId`
- `GET /api/foods/search?q=...`
- `GET/POST /api/labs`, `DELETE /api/labs/:id`
- `GET/POST /api/measurements`
- `GET /api/analysis/nutrients?period=7d`
- `GET /api/analysis/recommendations`
- `GET /api/analysis/weekly-report`
- `GET /api/dashboard`

## Database Schema (lib/db)

- `user_profile` — demographics, activity, goals, medical context
- `daily_log` — per-date: water, sleep (JSONB), wellbeing (JSONB)
- `food_entry` — per-date food entries with full nutrient JSONB
- `activity_entry` — per-date activity logs
- `lab_result` — biomarker results with ref ranges and auto-status
- `measurement` — body measurements history

## Important Notes

- **Do NOT re-run Orval codegen** — would overwrite `lib/api-zod/src/index.ts`
- Mutations use object format: `mutateAsync({ date, data: body })` — NOT arrays
- 3D body uses lazy import in home.tsx (Suspense) for bundle size
- Server text (recommendations, dashboard, weekly report) all generated in Russian
