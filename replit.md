# 3D Body Model — Personal Health Analyzer

## Overview
A realistic human body visualization app built with React + Vite. The body silhouette is rendered as an SVG using real anthropometric proportions, dynamically shaped by height, weight, and body measurements. A scientific health analysis panel is shown alongside.

## Architecture

- **Frontend only** — React + Vite, no backend needed
- **Body model** — `artifacts/body-model/src/components/HumanBody3D.tsx`  
  SVG-based procedural human body. Uses Bezier curves for torso, tapered paths for arms/legs, face features, gradients, and real anthropometric scaling.
- **Body metrics** — `artifacts/body-model/src/lib/bodyMetrics.ts`  
  Calculates proportions (shoulder/chest/waist/hip/limb widths) from height, weight, and optional measurements. Also computes BMI (WHO), BMR (Mifflin–St Jeor), body fat % (Deurenberg), TDEE, waist-to-height ratio, waist-to-hip ratio, cardiovascular risk score, and health recommendations.
- **Profile panel** — `artifacts/body-model/src/components/ProfilePanel.tsx`  
  Left collapsible panel with sliders for age, height, weight, and 7 optional body measurements.
- **Analysis panel** — `artifacts/body-model/src/components/AnalysisPanel.tsx`  
  Right collapsible panel showing health metrics, risk factors, and recommendations.

## Key Features
- Body silhouette updates in real time as you drag sliders
- Scientific formulas: Mifflin–St Jeor (BMR), Deurenberg (body fat %), WHO (BMI categories)
- Male / Female body proportions differ using population averages
- BMI, body fat %, waist/hip ratio, cardiovascular risk scoring
- Light background, minimal UI — body model is the focus
- Height ruler on the right side of the model

## Packages
- `react`, `react-dom` — UI framework
- `tailwindcss` — styling
- `vite`, `@vitejs/plugin-react` — build tooling

## Artifact Info
- Slug: `body-model`
- Preview path: `/`
- Port: 23361 (assigned by system)
