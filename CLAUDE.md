# training-diary

Gym training diary PWA for personal use. The user creates exercises and training days (an ordered list of exercises, e.g. Push / Pull / Legs), then logs workouts: start a training day on the home screen and enter weight and reps per set for each exercise in order. During a workout an exercise can be replaced or added for that workout only (machine taken, broken, …). The home screen lists recorded workouts newest first, filterable by training day; the Exercises tab shows progress per exercise.

## Stack (same as hempllll/spot-alert)
- TypeScript PWA, built with Vite + **React**, Vitest + Testing Library for tests, oxlint for linting
- Hosted on **GitHub Pages** at https://hempllll.github.io/training-diary/, auto-deployed from `main` by `.github/workflows/deploy.yml`; `.github/workflows/ci.yml` runs lint/test/build on PRs. Vite `base` is `/training-diary/`.
- PWA via vite-plugin-pwa (Workbox precache, works offline). Icons in `public/` are rendered from `public/favicon.svg`.
- Storage: localStorage behind an async `DiaryRepository` interface, plus JSON export/import as a backup. No backend.

## Layout
- `src/diary/`: data model (`types.ts`) and **pure** operations: diary CRUD, workout logging, progress. No UI, storage or network.
- `src/storage/`: repository (localStorage / in-memory) and the validated backup file format.
- `src/components/`: one component per screen or dialog; `src/App.tsx` holds navigation state (no router).

## Key rules
- Data stays plain JSON. Workouts store name snapshots (`dayName`, `exerciseName`) so history survives renames and deletes; deleting an exercise removes it from training days but never from past workouts.
- Changes made during a workout never modify the training day.
- The workout in progress is persisted separately (`training-diary.active`), so closing the app mid-workout loses nothing.
- Units: kg; dates are local `YYYY-MM-DD` strings. Number inputs accept a decimal comma.

## About the user
- Strong in Python, knows basics of other mainstream languages, new to TypeScript, web tooling and mobile development. Briefly explain web/TypeScript-specific concepts when they first come up.
- Develops on Linux Mint, tests on an iPhone via Add to Home Screen.
