# training-diary

Gym training diary PWA for personal use. The user creates exercises (with an optional description, e.g. machine settings) and plans (an ordered list of exercises, e.g. Push / Pull / Legs; a plan without exercises is a rest day), then tracks training days: pick a plan on the home screen and enter weight and reps per set for each exercise in order, plus their body weight and a description of the day (both optional). While tracking, an exercise can be replaced or added for that day only (machine taken, broken, …). The home screen lists tracked training days newest first, filterable by plan; the Library tab holds exercises and plans; the Stats tab shows progress per exercise (weight for a rep range), how often each plan is done, and body weight with its 7-day average.

**Naming:** the UI says "plan" for what the code calls `TrainingDay`, and "training day" for a tracked `Workout`. The code keeps its original names.

## Stack (same as hempllll/spot-alert)
- TypeScript PWA, built with Vite + **React**, Vitest + Testing Library for tests, oxlint for linting
- Hosted on **GitHub Pages** at https://hempllll.github.io/training-diary/, auto-deployed from `main` by `.github/workflows/deploy.yml`; `.github/workflows/ci.yml` runs lint/test/build on PRs. Vite `base` is `/training-diary/`.
- PWA via vite-plugin-pwa (Workbox precache, works offline). Icons in `public/` are rendered from `public/favicon.svg`.
- Storage: localStorage behind an async `DiaryRepository` interface, plus JSON export/import as a backup. No backend.

## Layout
- `src/diary/`: data model (`types.ts`) and **pure** operations: diary CRUD, workout logging, stats (`stats.ts`). No UI, storage or network.
- `src/storage/`: repository (localStorage / in-memory) and the validated backup file format.
- `src/components/`: one component per screen or dialog; `src/App.tsx` holds navigation state (no router).

## Key rules
- **The user has real data stored on their phone. Every change must keep it loading unchanged.** New fields are optional (or converted from older versions in `readDiary`, `src/storage/diaryIO.ts`). A format change bumps `FORMAT_VERSION` and adds fixtures `v<N>-stored-diary.json`, `v<N>-stored-active.json`, `v<N>-export.json` in `src/storage/__tests__/fixtures`, written by the real code of that version (not by hand). Never edit existing fixtures. `compatibility.test.ts` loads every version's fixtures, and CI runs it on every PR.
- Stored data that can't be read is never replaced with an empty diary: the app shows an error screen and saves nothing. Unknown fields are kept when saving. The first time data from an older version is loaded, the original is copied to `training-diary.backup.v<N>`.
- Data stays plain JSON. Workouts store name snapshots (`dayName`, `exerciseName`) so history survives renames and deletes; deleting an exercise removes it from training days but never from past workouts.
- Changes made during a workout never modify the training day.
- The workout in progress is persisted separately (`training-diary.active`), so closing the app mid-workout loses nothing.
- Units: kg; dates are local `YYYY-MM-DD` strings. Number inputs accept a decimal comma.
- Motion is CSS only (page entry animation keyed per navigation in `App.tsx`, tab bar in `NavBar.tsx`/`App.css`) and switched off under `prefers-reduced-motion`.
- Tabs: Training days, Library (Exercises / Plans) and Stats (Exercises / Plans / Body weight). A tab with several pages shows a glass menu at the top (`PageTabs.tsx`); tapping the tab opens its first page, holding it pops up all its pages (`NavBar.tsx`). The order lives in `PAGES` in `App.tsx`.
- Gestures: swiping across a main screen steps to the neighbouring page, then tab (`hooks/useSwipe.ts`), and dragging along the tab bar moves its highlight (`NavBar.tsx`). Both skip fields, dialogs and sideways scrollers.

## About the user
- Strong in Python, knows basics of other mainstream languages, new to TypeScript, web tooling and mobile development. Briefly explain web/TypeScript-specific concepts when they first come up.
- Develops on Linux Mint, tests on an iPhone via Add to Home Screen.
