import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { TOAST_MS } from './App'
import type { Diary } from './diary'
import v1Active from './storage/__tests__/fixtures/v1-stored-active.json?raw'
import v1Diary from './storage/__tests__/fixtures/v1-stored-diary.json?raw'
import {
  ACTIVE_KEY,
  backupKey,
  DIARY_KEY,
  FORMAT_VERSION,
  InMemoryDiaryRepository,
  LocalStorageDiaryRepository,
  readDiary,
} from './storage'
import { fakeStorage } from './test/fakeStorage'

const NOW = new Date(2026, 9, 27, 18, 0) // Tue 27 Oct 2026

const seeded: Diary = {
  exercises: [
    { id: 'bench', name: 'Bench press' },
    { id: 'incline', name: 'Incline press' },
    { id: 'row', name: 'Barbell row' },
  ],
  days: [
    { id: 'push', name: 'Push', exerciseIds: ['bench', 'incline'] },
    { id: 'pull', name: 'Pull', exerciseIds: ['row'] },
  ],
  workouts: [
    {
      id: 'w-push',
      dayId: 'push',
      dayName: 'Push',
      date: '2026-10-20',
      startedAt: '2026-10-20T17:00:00.000Z',
      entries: [
        { exerciseId: 'bench', exerciseName: 'Bench press', sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }] },
      ],
    },
    {
      id: 'w-pull',
      dayId: 'pull',
      dayName: 'Pull',
      date: '2026-10-22',
      startedAt: '2026-10-22T17:00:00.000Z',
      entries: [{ exerciseId: 'row', exerciseName: 'Barbell row', sets: [{ weight: 50, reps: 10 }] }],
    },
  ],
}

async function renderApp(diary: Diary = seeded) {
  const repo = new InMemoryDiaryRepository(diary)
  render(<App repo={repo} now={() => NOW} />)
  await screen.findByRole('heading', { name: 'Training Diary' })
  return { repo, user: userEvent.setup() }
}

const nav = () => screen.getByRole('navigation', { name: 'Main' })
/** Open a page of a tab via its glass menu at the top, e.g. ('Library', 'Plans'). */
async function openPage(user: ReturnType<typeof userEvent.setup>, tab: 'Library' | 'Stats', page: string) {
  await user.click(within(nav()).getByRole('button', { name: new RegExp(tab) }))
  const menu = screen.getByRole('navigation', { name: tab })
  if (within(menu).getByRole('button', { current: 'page' }).textContent !== page) {
    await user.click(within(menu).getByRole('button', { name: page }))
  }
}
/** The plan names on the home screen's cards, top to bottom. */
const workoutCards = () => [...document.querySelectorAll('.card-toggle .row-title')].map((t) => t.textContent)
/** Open a home card by its plan name, e.g. /^Pull/. */
const expandCard = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(screen.getByRole('button', { name, expanded: false }))

describe('home screen', () => {
  it('lists workouts newest first and filters by training day', async () => {
    const { user } = await renderApp()
    expect(workoutCards()).toEqual(['Pull', 'Push'])
    // Cards show plan and date; the exercises appear when one is opened.
    expect(screen.queryByText('Bench press')).not.toBeInTheDocument()
    await expandCard(user, /^Push/)
    expect(screen.getByText('Bench press')).toBeInTheDocument()
    expect(screen.getByText('10 · 10 @ 60 kg')).toBeInTheDocument()
    await expandCard(user, /^Pull/) // several can be open at once
    expect(screen.getByText('Bench press')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Push/, expanded: true }))
    expect(screen.queryByText('Bench press')).not.toBeInTheDocument()
    expect(screen.getByText('Barbell row')).toBeInTheDocument()

    const filters = screen.getByRole('group', { name: 'Show plans' })
    await user.click(within(filters).getByRole('button', { name: 'Push' }))
    expect(workoutCards()).toEqual(['Push'])
    await user.click(within(filters).getByRole('button', { name: 'Pull' }))
    expect(workoutCards()).toEqual(['Pull', 'Push'])
    await user.click(within(filters).getByRole('button', { name: 'All' }))
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a workout and deletes it', async () => {
    const { user, repo } = await renderApp()
    await expandCard(user, /^Pull/)
    await user.click(screen.getByRole('button', { name: 'Details ›' }))
    expect(screen.getByRole('heading', { name: /Pull/ })).toBeInTheDocument()
    expect(screen.getByText('10 @ 50 kg')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('group', { name: 'Delete this training day?' })).getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Training day deleted.')).toBeInTheDocument()
    expect((await repo.load()).workouts.map((w) => w.id)).toEqual(['w-push'])
  })
})

describe('header', () => {
  it('opens the backup from the settings menu', async () => {
    const { user } = await renderApp()
    const gear = screen.getByRole('button', { name: 'Settings' })
    expect(gear).toHaveAttribute('aria-expanded', 'false')
    await user.click(gear)
    expect(gear).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(gear)
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Backup' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Backup' })).toBeInTheDocument()
  })

  it('has + track a training day from any tab, or resume the one in progress', async () => {
    const { user } = await renderApp()
    await user.click(within(nav()).getByRole('button', { name: /Library/ }))
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Pull/ }))
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    await user.click(screen.getByRole('button', { name: 'Resume training day' }))
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
  })

  it('has + create the first plan when there is none', async () => {
    const { user } = await renderApp({ exercises: [], days: [], workouts: [] })
    await user.click(screen.getByRole('button', { name: 'New plan' }))
    expect(screen.getByPlaceholderText('e.g. Push, or Rest day')).toBeInTheDocument()
  })
})

describe('tracking a training day', () => {
  it('steps through the exercises, replaces and adds one, and saves', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Push/ }))

    // Bench press, pre-filled from last time.
    expect(screen.getByRole('heading', { name: 'Bench press' })).toBeInTheDocument()
    expect(screen.getByText('Last time (Tue 20 Oct): 10 · 10 @ 60 kg')).toBeInTheDocument()
    expect(nav).toThrow() // tab bar hidden while logging
    const weight1 = screen.getByLabelText('Set 1 weight (kg)')
    expect(weight1).toHaveValue('60')
    await user.clear(weight1)
    await user.type(weight1, '62,5')
    await user.click(screen.getByRole('button', { name: '+ Add set' }))
    expect(screen.getByLabelText('Set 3 weight (kg)')).toHaveValue('60')
    await user.clear(screen.getByLabelText('Set 3 reps'))
    await user.type(screen.getByLabelText('Set 3 reps'), '8')
    await user.click(screen.getByRole('button', { name: 'Next ›' }))

    // Incline press is taken: replace it with a brand-new exercise.
    expect(screen.getByRole('heading', { name: 'Incline press' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '⇄ Replace' }))
    await user.type(screen.getByLabelText('Search or type a new exercise'), 'Dumbbell press')
    await user.click(screen.getByRole('button', { name: '+ Create “Dumbbell press”' }))
    expect(screen.getByRole('heading', { name: 'Dumbbell press' })).toBeInTheDocument()
    expect(screen.getByText('instead of Incline press')).toBeInTheDocument()

    // Add an extra existing exercise after it.
    await user.click(screen.getByRole('button', { name: '+ Add exercise' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Barbell row' }))
    expect(screen.getByText('Exercise 3 of 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Set 1 weight (kg)')).toHaveValue('50') // from Pull day
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(screen.getByText('Saved Push (Tue 27 Oct).')).toBeInTheDocument()
    const stored = await repo.load()
    const saved = stored.workouts.find((w) => w.date === '2026-10-27')!
    expect(saved.entries.map((e) => [e.exerciseName, e.sets])).toEqual([
      ['Bench press', [{ weight: 62.5, reps: 10 }, { weight: 60, reps: 10 }, { weight: 60, reps: 8 }]],
      ['Dumbbell press', [{ weight: 0, reps: 10 }, { weight: 0, reps: 10 }, { weight: 0, reps: 10 }]],
      ['Barbell row', [{ weight: 50, reps: 10 }]],
    ])
    expect(saved.entries[1].replaces?.exerciseName).toBe('Incline press')
    expect(saved.entries[2].extra).toBe(true)
    // The training day itself is unchanged; the new exercise exists.
    expect(stored.days[0].exerciseIds).toEqual(['bench', 'incline'])
    expect(stored.exercises.map((e) => e.name)).toContain('Dumbbell press')
    expect(await repo.loadActive()).toBeNull()
    expect(workoutCards()).toEqual(['Push', 'Pull', 'Push'])
  })

  it('keeps an unfinished workout to resume later', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Pull/ }))
    await user.click(screen.getByRole('button', { name: 'Leave' }))

    expect(await repo.loadActive()).toMatchObject({ workout: { dayName: 'Pull' } })
    await user.click(screen.getByRole('button', { name: 'Resume: Pull' }))
    await user.click(screen.getByRole('button', { name: 'Discard training day' }))
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByRole('button', { name: 'Track a training day' })).toBeInTheDocument()
    expect(await repo.loadActive()).toBeNull()
    expect((await repo.load()).workouts).toHaveLength(2)
  })

  it('edits a saved workout in place', async () => {
    const { user, repo } = await renderApp()
    await expandCard(user, /^Pull/)
    await user.click(screen.getByRole('button', { name: 'Details ›' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const reps = screen.getByLabelText('Set 1 reps')
    await user.clear(reps)
    await user.type(reps, '12')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('12 @ 50 kg')).toBeInTheDocument()
    const workouts = (await repo.load()).workouts
    expect(workouts).toHaveLength(2)
    expect(workouts.find((w) => w.id === 'w-pull')!.entries[0].sets).toEqual([{ weight: 50, reps: 12 }])
  })
})

describe('library: exercises', () => {
  it('adds, shows last time, renames and deletes', async () => {
    const { user, repo } = await renderApp()
    await user.click(within(nav()).getByRole('button', { name: /Library/ }))

    await user.type(screen.getByLabelText('New exercise name'), 'bench press')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('"Bench press" already exists.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('New exercise name'))
    await user.type(screen.getByLabelText('New exercise name'), 'Squat{Enter}')
    expect(screen.getByText('Squat')).toBeInTheDocument()

    await user.click(screen.getByText('Bench press'))
    expect(screen.getByText('In plans: Push')).toBeInTheDocument()
    expect(screen.getByText('Last time (Tue 20 Oct): 10 · 10 @ 60 kg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Flat bench')
    await user.type(screen.getByLabelText('Description'), 'Bench height 3{Enter}Rack pins at 5')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('heading', { name: 'Flat bench' })).toBeInTheDocument()
    expect(screen.getByText(/Bench height 3\s+Rack pins at 5/)).toBeInTheDocument()
    expect((await repo.load()).exercises.find((e) => e.id === 'bench')).toEqual({
      id: 'bench',
      name: 'Flat bench',
      description: 'Bench height 3\nRack pins at 5',
    })

    await user.click(screen.getByRole('button', { name: 'Delete exercise' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const stored = await repo.load()
    expect(stored.exercises.map((e) => e.name)).not.toContain('Flat bench')
    expect(stored.days[0].exerciseIds).toEqual(['incline'])
    expect(stored.workouts).toHaveLength(2) // history kept
  })
})

describe('library: plans', () => {
  it('creates a plan from scratch, ordering its exercises', async () => {
    const { user, repo } = await renderApp({ exercises: [], days: [], workouts: [] })
    expect(screen.getByText(/Create a plan/)).toBeInTheDocument()
    await openPage(user, 'Library', 'Plans')
    await user.click(screen.getByRole('button', { name: '+ New plan' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('e.g. Push, or Rest day'), 'Legs')
    for (const name of ['Squat', 'Leg curl']) {
      await user.click(screen.getByRole('button', { name: '+ Add exercise' }))
      await user.type(screen.getByLabelText('Search or type a new exercise'), name)
      await user.click(screen.getByRole('button', { name: `+ Create “${name}”` }))
    }
    await user.click(screen.getByRole('button', { name: 'Move Leg curl up' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Saved Legs.')).toBeInTheDocument()
    const stored = await repo.load()
    const byId = new Map(stored.exercises.map((e) => [e.id, e.name]))
    expect(stored.days).toHaveLength(1)
    expect(stored.days[0].exerciseIds.map((id) => byId.get(id))).toEqual(['Leg curl', 'Squat'])
  })

  it('removes an exercise from a plan and cancels without saving', async () => {
    const { user, repo } = await renderApp()
    await openPage(user, 'Library', 'Plans')
    await user.click(screen.getByText('Push'))
    await user.click(screen.getByRole('button', { name: 'Remove Bench press' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect((await repo.load()).days[0].exerciseIds).toEqual(['bench', 'incline'])

    await user.click(screen.getByText('Push'))
    await user.click(screen.getByRole('button', { name: 'Remove Bench press' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect((await repo.load()).days[0].exerciseIds).toEqual(['incline'])
  })
})

describe('body weight', () => {
  it('is entered while tracking, hinted from last time, and shown afterwards', async () => {
    const diary = structuredClone(seeded)
    diary.workouts[0].bodyWeight = 82.5
    const { user, repo } = await renderApp(diary)
    expect(screen.getByText('Body weight 82.5 kg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Pull/ }))
    const field = screen.getByLabelText('Body weight (kg)')
    expect(field).toHaveValue('')
    expect(field).toHaveAttribute('placeholder', '82.5')
    await user.type(field, '81,9')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    const saved = (await repo.load()).workouts.find((w) => w.date === '2026-10-27')!
    expect(saved.bodyWeight).toBe(81.9)
    expect(screen.getByText('Body weight 81.9 kg')).toBeInTheDocument()
  })

  it('is optional', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Pull/ }))
    await user.type(screen.getByLabelText('Body weight (kg)'), '80')
    await user.clear(screen.getByLabelText('Body weight (kg)'))
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    const saved = (await repo.load()).workouts.find((w) => w.date === '2026-10-27')!
    expect(saved).not.toHaveProperty('bodyWeight')
  })
})

describe('exercise descriptions', () => {
  it('are shown while tracking', async () => {
    const diary = structuredClone(seeded)
    diary.exercises[0].description = 'Bench height 3'
    const { user } = await renderApp(diary)
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Push/ }))
    expect(screen.getByText('Bench height 3')).toBeInTheDocument()
  })
})

describe('data stored by an earlier version', () => {
  async function renderWithStorage(storage: Storage) {
    render(<App repo={new LocalStorageDiaryRepository(storage)} now={() => NOW} />)
    return userEvent.setup()
  }

  it('opens v1 data, keeps it, and upgrades it on the first change', async () => {
    const storage = fakeStorage()
    storage.setItem(DIARY_KEY, v1Diary)
    storage.setItem(ACTIVE_KEY, v1Active)
    const user = await renderWithStorage(storage)

    await screen.findByRole('heading', { name: 'Training Diary' })
    expect(screen.getByRole('button', { name: 'Resume: Push' })).toBeInTheDocument()
    expect(screen.getAllByText(/^(Push|Pull|Legs)$/).map((e) => e.textContent)).toEqual([
      'Push', 'Pull', 'Legs', // filter chips
      'Pull', 'Legs', 'Push', // tracked training days, newest first
    ])

    await user.click(within(nav()).getByRole('button', { name: /Library/ }))
    await user.click(screen.getByText('Dips'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Description'), 'Use the belt')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const { diary, version } = readDiary(storage.getItem(DIARY_KEY)!)
    expect(version).toBe(FORMAT_VERSION)
    const before = JSON.parse(v1Diary) as Diary
    expect(diary.workouts).toEqual(before.workouts)
    expect(diary.days).toEqual(before.days)
    expect(diary.exercises.find((e) => e.id === 'dips')?.description).toBe('Use the belt')
    expect(storage.getItem(backupKey(1))).toBe(v1Diary)
  })

  it('shows an error and changes nothing when stored data can’t be read', async () => {
    const storage = fakeStorage()
    storage.setItem(DIARY_KEY, '{"exercises": [')
    await renderWithStorage(storage)
    expect(await screen.findByRole('heading', { name: 'Your diary couldn’t be loaded' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download stored data' })).toBeInTheDocument()
    expect(storage.getItem(DIARY_KEY)).toBe('{"exercises": [')
  })
})

describe('rest days', () => {
  it('are plans without exercises, tracked with body weight and a description', async () => {
    const { user, repo } = await renderApp()
    await openPage(user, 'Library', 'Plans')
    await user.click(screen.getByRole('button', { name: '+ New plan' }))
    await user.type(screen.getByPlaceholderText('e.g. Push, or Rest day'), 'Rest day')
    expect(screen.getByText('No exercises: tracking this plan records a rest day.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Saved Rest day.')).toBeInTheDocument()

    await user.click(within(nav()).getByRole('button', { name: /Training days/ }))
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Rest day/ }))
    expect(screen.getByText(/^Rest day: no exercises/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Body weight (kg)'), '82')
    await user.type(screen.getByLabelText('Description'), '  Long walk ')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    const saved = (await repo.load()).workouts.find((w) => w.date === '2026-10-27')!
    expect(saved).toMatchObject({ dayName: 'Rest day', entries: [], bodyWeight: 82, description: 'Long walk' })
    expect(screen.getByText('Long walk')).toBeInTheDocument() // on the home card
  })
})

describe('training day descriptions', () => {
  it('are entered while tracking and shown in the detail view', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Track a training day' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Pull/ }))
    await user.type(screen.getByLabelText('Description'), 'Gym was packed')
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    // The card of the day just saved is open, showing the description.
    expect(screen.getByText('Gym was packed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Details ›' }))
    expect(screen.getByRole('heading', { name: /Pull · Tue 27 Oct/ })).toBeInTheDocument()
    expect(screen.getByText('Gym was packed')).toBeInTheDocument()

    // Clearing it while editing removes it.
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Description'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    const saved = (await repo.load()).workouts.find((w) => w.date === '2026-10-27')!
    expect(saved).not.toHaveProperty('description')
  })
})

describe('page transitions', () => {
  it('slide according to where the navigation goes', async () => {
    const { user } = await renderApp()
    const motion = () => document.querySelector('.page')?.getAttribute('data-motion')
    expect(motion()).toBe('fade')
    await openPage(user, 'Library', 'Plans')
    expect(motion()).toBe('next-tab')
    await user.click(within(screen.getByRole('navigation', { name: 'Library' })).getByRole('button', { name: 'Exercises' }))
    expect(motion()).toBe('prev-tab')
    await user.click(screen.getByText('Bench press'))
    expect(motion()).toBe('forward')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(motion()).toBe('back')
    await user.click(screen.getByText('Bench press'))
    await user.click(screen.getByRole('button', { name: 'Stats ›' })) // on to the next tab
    expect(motion()).toBe('next-tab')
  })
})

describe('swiping between tabs', () => {
  const current = () => within(nav()).getByRole('button', { current: 'page' }).textContent
  /** The page shown in the glass menu at the top, if the tab has one. */
  const page = () => document.querySelector('.page-tabs [aria-current="page"]')?.textContent
  const swipe = (el: Element, from: number, to: number, dy = 0) => {
    fireEvent.touchStart(el, { touches: [{ clientX: from, clientY: 300 }] })
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: to, clientY: 300 + dy }] })
  }

  it('moves to the neighbouring tab across the screen', async () => {
    const { user } = await renderApp()
    const main = () => screen.getByRole('main')
    // Through every page of every tab, in order.
    const seen = [[current(), page()]]
    for (let i = 0; i < 6; i++) {
      swipe(main(), 300, 100)
      seen.push([current(), page()])
    }
    expect(seen).toEqual([
      ['Training days', undefined],
      ['Library', 'Exercises'],
      ['Library', 'Plans'],
      ['Stats', 'Exercises'],
      ['Stats', 'Plans'],
      ['Stats', 'Body weight'],
      ['Stats', 'Body weight'], // nothing after it
    ])
    for (let i = 0; i < 4; i++) swipe(main(), 100, 300)
    expect([current(), page()]).toEqual(['Library', 'Exercises'])

    swipe(main(), 300, 250) // too short
    swipe(main(), 300, 100, 200) // mostly scrolling
    swipe(screen.getByRole('textbox', { name: 'New exercise name' }), 300, 100) // in a field
    expect(page()).toBe('Exercises')

    // Opened screens don't switch tabs.
    await user.click(screen.getByText('Bench press'))
    swipe(main(), 300, 100)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('drags the highlight along the tab bar', async () => {
    await renderApp()
    const bar = nav()
    bar.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect
    fireEvent.pointerDown(bar, { clientX: 50, pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: 150, pointerId: 1 })
    expect(bar).toHaveClass('dragging')
    expect(bar.style.getPropertyValue('--tab')).toBe('1')
    fireEvent.pointerMove(bar, { clientX: 260, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 260, pointerId: 1 })
    expect(current()).toBe('Stats')
    expect(bar).not.toHaveClass('dragging')
  })
})

describe('notifications', () => {
  afterEach(() => vi.useRealTimers())

  it('fade away on their own, or when tapped', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await renderApp()
    const saveRestDay = async (name: string) => {
      await openPage(user, 'Library', 'Plans')
      await user.click(screen.getByRole('button', { name: '+ New plan' }))
      await user.type(screen.getByPlaceholderText('e.g. Push, or Rest day'), name)
      await user.click(screen.getByRole('button', { name: 'Save' }))
    }

    await saveRestDay('Rest')
    expect(screen.getByRole('status')).toHaveTextContent('Saved Rest.')
    act(() => vi.advanceTimersByTime(TOAST_MS - 500))
    // A new one replaces it and gets the full time again.
    await saveRestDay('Walk')
    act(() => vi.advanceTimersByTime(TOAST_MS - 500))
    expect(screen.getByRole('status')).toHaveTextContent('Saved Walk.')
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await saveRestDay('Stretch')
    await user.click(screen.getByRole('status'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('tabs with several pages', () => {
  afterEach(() => vi.useRealTimers())

  it('open their first page on a tap and switch pages in the glass menu', async () => {
    const { user } = await renderApp()
    await user.click(within(nav()).getByRole('button', { name: /Library/ }))
    const menu = screen.getByRole('navigation', { name: 'Library' })
    expect(within(menu).getByRole('button', { current: 'page' })).toHaveTextContent('Exercises')
    await user.click(within(menu).getByRole('button', { name: 'Plans' }))
    expect(screen.getByRole('button', { name: '+ New plan' })).toBeInTheDocument()
    // Tapping the tab again goes back to its first page.
    await user.click(within(nav()).getByRole('button', { name: /Library/ }))
    expect(screen.getByLabelText('New exercise name')).toBeInTheDocument()
    // Opened screens have a back button instead of the menu.
    await user.click(screen.getByText('Bench press'))
    expect(screen.queryByRole('navigation', { name: 'Library' })).not.toBeInTheDocument()
  })

  it('offer their pages when the tab is held', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await renderApp()
    const stats = within(nav()).getByRole('button', { name: /Stats/ })
    fireEvent.pointerDown(stats, { clientX: 250, pointerId: 1 })
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument() // not held long enough yet
    act(() => vi.advanceTimersByTime(300))
    fireEvent.pointerUp(stats, { clientX: 250, pointerId: 1 })
    fireEvent.click(stats) // the click that ends the hold doesn't open the tab
    expect(within(nav()).getByRole('button', { current: 'page' })).toHaveTextContent('Training days')
    const menu = screen.getByRole('menu', { name: 'Stats' })
    expect(within(menu).getAllByRole('menuitem').map((b) => b.textContent)).toEqual(['Exercises', 'Plans', 'Body weight'])
    // Lifting the finger can land a click on the backdrop; that keeps it open.
    fireEvent.click(document.querySelector('.menu-backdrop')!)
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Body weight' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    const pages = screen.getByRole('navigation', { name: 'Stats' })
    expect(within(pages).getByRole('button', { current: 'page' })).toHaveTextContent('Body weight')

    // A right click (or a long press the browser reports) opens it too; a
    // tap elsewhere closes it, and the tab without pages has none.
    fireEvent.contextMenu(within(nav()).getByRole('button', { name: /Library/ }))
    expect(within(screen.getByRole('menu', { name: 'Library' })).getAllByRole('menuitem')).toHaveLength(2)
    await user.click(document.querySelector('.menu-backdrop')!)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.contextMenu(within(nav()).getByRole('button', { name: /Training days/ }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('stats', () => {
  const diary = structuredClone(seeded)
  diary.workouts[0].bodyWeight = 82
  diary.workouts.push({
    id: 'w-push-2',
    dayId: 'push',
    dayName: 'Push',
    date: '2026-10-26',
    startedAt: '2026-10-26T17:00:00.000Z',
    bodyWeight: 81,
    entries: [
      { exerciseId: 'bench', exerciseName: 'Bench press', sets: [{ weight: 70, reps: 5 }, { weight: 62.5, reps: 9 }] },
      { exerciseId: 'dips', exerciseName: 'Dips', sets: [{ weight: 0, reps: 12 }], extra: true },
    ],
  })
  /** A stat tile's value (and second line) by its label. */
  const tile = (label: string, inside: HTMLElement = document.body) =>
    within(inside).getByText(label, { selector: 'dt' }).nextElementSibling

  it('show an exercise’s weight for a rep range, totals and history', async () => {
    const { user } = await renderApp(diary)
    await user.click(within(nav()).getByRole('button', { name: /Stats/ }))
    // Starts with the exercise done most recently.
    const exercise = screen.getByRole('combobox', { name: 'Exercise' })
    expect(exercise).toHaveDisplayValue('Bench press')
    // One point per training day: its best set with 8–12 reps.
    expect(screen.getByRole('img', { name: 'Weight trend, 8–12 reps over time, 2 values' })).toBeInTheDocument()
    expect(screen.getByText('62.5 kg')).toBeInTheDocument() // the newest is selected
    expect(screen.getByText('+2.5 kg since Tue 20 Oct (60 → 62.5 kg).')).toBeInTheDocument()
    expect(tile('Heaviest set')).toHaveTextContent('5 @ 70 kgMon 26 Oct')
    expect(tile('Done')).toHaveTextContent('2×')
    expect(screen.getByText('5 @ 70 kg, 9 @ 62.5 kg')).toBeInTheDocument() // history

    await user.clear(screen.getByLabelText('Fewest reps'))
    await user.type(screen.getByLabelText('Fewest reps'), '1')
    await user.clear(screen.getByLabelText('Most reps'))
    await user.type(screen.getByLabelText('Most reps'), '5')
    expect(screen.getByRole('img', { name: 'Weight trend, 1–5 reps over time, 1 values' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '1M' }))
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true')

    // Deleted exercises stay in the list; without weight, reps are charted.
    await user.selectOptions(exercise, 'Dips (deleted)')
    expect(screen.getByRole('img', { name: 'Most reps over time, 1 values' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Fewest reps')).not.toBeInTheDocument()

    // The choices stay when coming back.
    await user.click(within(nav()).getByRole('button', { name: /Training days/ }))
    await user.click(within(nav()).getByRole('button', { name: /Stats/ }))
    expect(screen.getByRole('combobox', { name: 'Exercise' })).toHaveDisplayValue('Dips (deleted)')
  })

  it('open from an exercise in the library', async () => {
    const { user } = await renderApp(diary)
    await user.click(within(nav()).getByRole('button', { name: /Library/ }))
    await user.click(screen.getByText('Barbell row'))
    await user.click(screen.getByRole('button', { name: 'Stats ›' }))
    expect(screen.getByRole('combobox', { name: 'Exercise' })).toHaveDisplayValue('Barbell row')
    expect(screen.getByText('10 @ 50 kg', { selector: '.row-sub' })).toBeInTheDocument() // history
  })

  it('show how often each plan is done', async () => {
    const { user } = await renderApp(diary)
    await openPage(user, 'Stats', 'Plans')
    expect(tile('Training days')).toHaveTextContent('3tracked')
    expect(tile('This week')).toHaveTextContent('1since Monday')
    expect(tile('Per week', document.querySelector<HTMLElement>('.stat-grid')!)).toHaveTextContent('1.5×in 2 weeks')
    const push = screen.getByRole('heading', { name: 'Push' }).closest('li')!
    expect(tile('Done', push)).toHaveTextContent('2×since Tue 20 Oct')
    expect(tile('Every', push)).toHaveTextContent('6 days')
    expect(tile('Swaps', push)).toHaveTextContent('1')
  })

  it('chart body weight with its 7-day average', async () => {
    const { user } = await renderApp(diary)
    await openPage(user, 'Stats', 'Body weight')
    expect(screen.getByRole('img', { name: 'Body weight over time, 2 values' })).toBeInTheDocument()
    // 20 Oct is seven days before today (27 Oct), so outside the average.
    expect(tile('Last 7 days')).toHaveTextContent('81 kgaverage')
    expect(tile('Change')).toHaveTextContent('−1 kg')
    expect(document.querySelector('.chart-legend')).toHaveTextContent('Body weight 7-day average')
    await user.click(screen.getByRole('button', { name: '7-day average' }))
    expect(document.querySelector('.chart-legend')).not.toBeInTheDocument()
  })

  it('explain what is missing on an empty diary', async () => {
    const { user } = await renderApp({ exercises: [], days: [], workouts: [] })
    await user.click(within(nav()).getByRole('button', { name: /Stats/ }))
    expect(screen.getByText(/No exercises yet/)).toBeInTheDocument()
    await openPage(user, 'Stats', 'Plans')
    expect(screen.getByText(/No training days tracked yet/)).toBeInTheDocument()
    await openPage(user, 'Stats', 'Body weight')
    expect(screen.getByText(/No body weight yet/)).toBeInTheDocument()
  })
})
