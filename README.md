# training-diary

Gym training diary PWA. Create exercises and training days (e.g. Push, Pull, Legs),
log each workout set by set, and follow your progress per exercise. Works offline
and installs to the iPhone home screen. See [CLAUDE.md](CLAUDE.md).

## Features

- **Training days** (home): tracked training days newest first, filterable by plan.
  Track a training day from a plan and log weight and reps per set for each exercise
  in order, pre-filled with last time's numbers, plus your body weight and a
  description of the day.
  Replace or add an exercise for that day only, leave and resume later, or edit a
  tracked day.
- **Exercises**: add, edit (name and description, e.g. machine settings) and delete
  exercises; see a progress chart (top weight, estimated 1RM, volume) and the full
  history of each. The description shows while tracking.
- **Plans**: create plans (e.g. Push, Pull, Legs, or a rest day without exercises),
  rename them, add/remove exercises and change their order.
- **Backup** (settings gear, top left): export the whole diary as JSON and restore it from a file.

## Stack

- Vite + React + TypeScript, vite-plugin-pwa
- Vitest + Testing Library for tests, oxlint for linting
- Deployed to GitHub Pages at https://hempllll.github.io/training-diary/

## Development

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173/training-diary/)
npm test         # run the test suite once
npm run test:watch  # run tests in watch mode
npm run lint     # lint with oxlint
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

Stored data must stay compatible with every released version: see "Key rules" in
[CLAUDE.md](CLAUDE.md) and `src/storage/__tests__/compatibility.test.ts`.

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in
[.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds the app and
publishes `dist/` to GitHub Pages (repository Settings → Pages → Source: GitHub Actions).

## License

[MIT](LICENSE)
