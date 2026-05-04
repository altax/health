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
- **Home Page**: Full-screen 3D interactive body model (BodyScene.tsx) with floating metric cards + Section 20 daily status strip
- **AppShell**: Glass bottom-nav shell for inner pages with back button + page title
- All UI text and server-generated text is in **Russian**

## Key Files

- `src/App.tsx` — onboarding gate (checks `localStorage.jarvis_profile`), routing
- `src/components/onboarding/JarvisOnboarding.tsx` — cinematic 8-step onboarding
- `src/components/body3d/BodyScene.tsx` — React Three Fiber 3D parametric human body
- `src/pages/home.tsx` — main page: 3D body + floating metric cards + bottom nav + daily status panel
- `src/pages/log.tsx` — full daily log: food/water/activity/sleep/wellbeing/supplements tabs
- `src/pages/cognitive.tsx` — cognitive/vitality analysis page
- `src/pages/profile.tsx` — profile with biometrics + lifestyle context
- `src/components/layout/AppShell.tsx` — shell for inner pages (log, nutrients, labs, etc.)
- `src/index.css` — full dark theme CSS (glass, aurora, glow utilities)

## Profile Storage

- Collected during Jarvis onboarding and stored in `localStorage` as `jarvis_profile` (JSON)
- Profile is also synced to the server via `PUT /api/profile` on first load
- Reset: delete `jarvis_profile` and `jarvis_profile_saved` from localStorage

## Features

1. **Home / 3D Body** (`/`) — full interactive 3D human body with daily status strip (Section 20: risks, strengths, actions), 3 view modes, 10 clickable organ hotspots
2. **Daily Log** (`/log/:date`) — 6 tabs: Питание, Вода, Активность, Сон (+ wake-ups/daytime sleepiness/morning feeling), Самочувствие (+ hunger/motivation/clarity/cravings/GI/muscle soreness/skin/swelling/symptoms), Добавки (supplements with quick-picks)
3. **Nutrient Analysis** (`/nutrients`) — 30+ nutrients vs. personalized targets across 1d/7d/28d/90d periods
4. **Lab Results** (`/labs`) — 30+ predefined biomarkers (incl. transferrin, transferrin_saturation, eGFR, uric_acid, homocysteine, cortisol, insulin, T3) + custom, auto-status with ref ranges
5. **Body Measurements** (`/measurements`) — weight, body fat %, muscle, waist/hip trend chart
6. **Cognitive/Vitality Analysis** (`/cognitive`) — score ring, 6 factor bars (sleep/nutrition/hydration/activity/stress/micronutrients), key findings, 7-day trend, recommendations
7. **Weekly Report** (`/weekly`) — weekly averages, comparison to prev week, bar chart
8. **Profile** (`/profile`) — demographics + lifestyle context (caffeine/alcohol/smoking/sweating/stress/screen time/training) + medical context

## 3D Body System (BodyScene.tsx)

- **Geometry**: LatheGeometry torso (48 segments, organic profile curve), CapsuleGeometry limbs, custom SphereGeometry head with vertex manipulation for realistic skull shape
- **View Modes**: Surface (skin layer) / X-Ray (skeleton + rib cage + femur bones) / Muscle (pecs, abs, obliques, biceps, quads, calves)
- **Hotspots**: 10 anatomical regions — brain, heart, lungs, liver, gut, kidneys, muscles, bones, skin, hormones — each with glowing pulse animation and scientific info panel
- **Physics**: Scan ring sweeps the body, ambient/directional/point lighting with shadows, OrbitControls

## Analysis Engine (analysis.ts — 1050+ lines)

- Personalized TDEE via Mifflin-St Jeor BMR × PAL (IOM 2024 activity multipliers)
- Protein target: 1.6–2.2 g/kg based on activity level (Morton et al. BJSM 2018)
- Water range: min (30 mL/kg), target (35 mL/kg + activity + sweating + caffeine offset), upper (45 mL/kg)
- 30 tracked nutrients with evidence sources cited inline
- Cognitive score: composite of sleep/nutrition/hydration/activity/stress/micronutrients
- Daily status (Section 20): top3Risks, top3Strengths, actionsToday, toMeasureNext, nutritionGaps, confidence %

## API Routes

- `GET/PUT /api/profile` — now includes lifestyle JSONB and blood pressure
- `GET /api/logs`, `GET/PATCH /api/logs/:date`
- `POST /api/logs/:date/food`, `DELETE /api/logs/:date/food/:entryId`
- `POST /api/logs/:date/activity`, `DELETE /api/logs/:date/activity/:entryId`
- `GET/POST/DELETE /api/logs/:date/supplements` — supplement entries with nutrient contribution
- `GET /api/foods/search?q=...`
- `GET/POST /api/labs`, `DELETE /api/labs/:id`
- `GET/POST /api/measurements`
- `GET /api/analysis/nutrients?period=7d`
- `GET /api/analysis/recommendations`
- `GET /api/analysis/weekly-report`
- `GET /api/analysis/cognitive` — cognitive/vitality score + factor breakdown
- `GET /api/analysis/daily-status` — Section 20 daily status report
- `GET /api/dashboard` — now returns waterRange (min/target/upper)

## Database Schema (lib/db)

- `user_profile` — demographics, activity, goals, medical context, lifestyle JSONB, blood pressure
- `daily_log` — per-date: water, sleep (JSONB with wakeUps/daytimeSleepiness/morningFeeling), wellbeing (JSONB with motivationScore/clarityScore/cravings/giState/muscleSoreness/skinState/swelling/symptoms)
- `food_entry` — per-date food entries with full nutrient JSONB
- `activity_entry` — per-date activity logs
- `supplement_entry` — per-date supplement/BAD entries with nutrient contribution JSONB
- `lab_result` — biomarker results with ref ranges and auto-status
- `measurement` — body measurements history

## Important Notes

- **Do NOT re-run Orval codegen** — would overwrite `lib/api-zod/src/index.ts`
- For new endpoints (supplements, cognitive, daily-status), use direct fetch + useQuery/useMutation — NOT Orval-generated hooks
- Mutations use object format: `mutateAsync({ date, data: body })` — NOT arrays
- 3D body uses lazy import in home.tsx (Suspense) for bundle size
- Server text (recommendations, dashboard, weekly report, analysis) all generated in Russian
- lifestyle JSONB in user_profile accepted via `PUT /api/profile` as `body.lifestyle`
