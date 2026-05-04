# Personal Health System

A full-stack personal health tracking web application.

## Architecture

- **Frontend**: React + Vite (artifact: `health-tracker`, path `/`)
- **Backend**: Express 5 API server (artifact: `api-server`, path `/api`)
- **Database**: PostgreSQL via Drizzle ORM (lib: `@workspace/db`)
- **API Contract**: OpenAPI spec → generated React Query hooks + Zod schemas

## Stack

- React, Wouter router, TanStack Query, shadcn/ui, Tailwind CSS, Recharts
- Express 5, Drizzle ORM, pino logger
- Orval codegen (OpenAPI → React Query + Zod)

## Features

1. **Dashboard** — daily summary (calories, water, sleep, log streak), top risks & strengths, lab alerts, nutrient highlights
2. **Daily Log** (`/log/:date`) — food entry with food database search, water tracking, activity logging, sleep and wellbeing sliders
3. **Nutrient Analysis** (`/nutrients`) — 26 nutrients vs. RDA targets across 1d/7d/28d/90d periods with confidence levels
4. **Lab Results** (`/labs`) — add/delete biomarkers (23 common markers + custom), auto-status (normal/low/high/critical), history per marker
5. **Body Measurements** (`/measurements`) — weight, body fat %, muscle mass, waist/hip; trend chart (Recharts)
6. **Recommendations** (`/recommendations`) — AI-style prioritized recommendations (safety → deficiency → stabilization → optimization), confidence levels, action steps
7. **Weekly Report** (`/weekly`) — weekly averages, comparison to previous week, bar chart, strengths/issues
8. **History** (`/history`) — last 30 log days summary
9. **Profile** (`/profile`) — demographics, activity level, goals (tag input), medical context (conditions, meds, allergies, restrictions)

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

- `user_profile` — demographics, activity level, goals, medical context
- `daily_log` — per-date: water, sleep (JSONB), wellbeing (JSONB)
- `food_entry` — per-date food entries with full nutrient JSONB
- `activity_entry` — per-date activity logs
- `lab_result` — biomarker results with ref ranges and auto-status
- `body_measurement` — body composition measurements over time

## Food Database

20 built-in foods (per 100g) with 25+ nutrients each. Search by name/category.

## Development

- API server: `pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/health-tracker run dev`
- Push DB schema: `pnpm --filter @workspace/db run push`
- Regenerate API hooks: `pnpm --filter @workspace/api-spec run codegen`
