import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import type { Diary } from './diary'
import { InMemoryDiaryRepository } from './storage'

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
const workoutCards = () =>
  screen.getAllByRole('listitem').map((li) => within(li).getAllByText(/^(Push|Pull)$/)[0].textContent)

describe('home screen', () => {
  it('lists workouts newest first and filters by training day', async () => {
    const { user } = await renderApp()
    expect(workoutCards()).toEqual(['Pull', 'Push'])
    expect(screen.getByText('2 × 10 @ 60 kg')).toBeInTheDocument()

    const filters = screen.getByRole('group', { name: 'Show training days' })
    await user.click(within(filters).getByRole('button', { name: 'Push' }))
    expect(workoutCards()).toEqual(['Push'])
    await user.click(within(filters).getByRole('button', { name: 'Pull' }))
    expect(workoutCards()).toEqual(['Pull', 'Push'])
    await user.click(within(filters).getByRole('button', { name: 'All' }))
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a workout and deletes it', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByText('Barbell row'))
    expect(screen.getByRole('heading', { name: /Pull/ })).toBeInTheDocument()
    expect(screen.getByText('50 kg × 10')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('group', { name: 'Delete this workout?' })).getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Workout deleted.')).toBeInTheDocument()
    expect((await repo.load()).workouts.map((w) => w.id)).toEqual(['w-push'])
  })
})

describe('logging a workout', () => {
  it('steps through the exercises, replaces and adds one, and saves', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Start workout' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Push/ }))

    // Bench press, pre-filled from last time.
    expect(screen.getByRole('heading', { name: 'Bench press' })).toBeInTheDocument()
    expect(screen.getByText('Last time (Tue 20 Oct): 2 × 10 @ 60 kg')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Finish workout' }))

    expect(screen.getByText('Saved Push workout.')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Start workout' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Pull/ }))
    await user.click(screen.getByRole('button', { name: 'Leave workout' }))

    expect(await repo.loadActive()).toMatchObject({ workout: { dayName: 'Pull' } })
    await user.click(screen.getByRole('button', { name: 'Resume workout: Pull' }))
    await user.click(screen.getByRole('button', { name: 'Discard workout' }))
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByRole('button', { name: 'Start workout' })).toBeInTheDocument()
    expect(await repo.loadActive()).toBeNull()
    expect((await repo.load()).workouts).toHaveLength(2)
  })

  it('edits a saved workout in place', async () => {
    const { user, repo } = await renderApp()
    await user.click(screen.getByText('Barbell row'))
    await user.click(screen.getByRole('button', { name: 'Edit workout' }))
    const reps = screen.getByLabelText('Set 1 reps')
    await user.clear(reps)
    await user.type(reps, '12')
    await user.click(screen.getByRole('button', { name: 'Save workout' }))
    expect(screen.getByText('50 kg × 12')).toBeInTheDocument()
    const workouts = (await repo.load()).workouts
    expect(workouts).toHaveLength(2)
    expect(workouts.find((w) => w.id === 'w-pull')!.entries[0].sets).toEqual([{ weight: 50, reps: 12 }])
  })
})

describe('exercises tab', () => {
  it('adds, shows progress, renames and deletes', async () => {
    const { user, repo } = await renderApp()
    await user.click(within(nav()).getByRole('button', { name: /Exercises/ }))

    await user.type(screen.getByLabelText('New exercise name'), 'bench press')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('"Bench press" already exists.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('New exercise name'))
    await user.type(screen.getByLabelText('New exercise name'), 'Squat{Enter}')
    expect(screen.getByText('Squat')).toBeInTheDocument()

    await user.click(screen.getByText('Bench press'))
    expect(screen.getByText('In training days: Push')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Top weight over time, 1 workouts' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Est. 1RM' }))
    expect(screen.getByText('Best est. 1rm: 80 kg (Tue 20 Oct)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await user.clear(screen.getByLabelText('Exercise name'))
    await user.type(screen.getByLabelText('Exercise name'), 'Flat bench{Enter}')
    expect(screen.getByRole('heading', { name: 'Flat bench' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete exercise' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const stored = await repo.load()
    expect(stored.exercises.map((e) => e.name)).not.toContain('Flat bench')
    expect(stored.days[0].exerciseIds).toEqual(['incline'])
    expect(stored.workouts).toHaveLength(2) // history kept
  })
})

describe('training days tab', () => {
  it('creates a training day from scratch, ordering its exercises', async () => {
    const { user, repo } = await renderApp({ exercises: [], days: [], workouts: [] })
    expect(screen.getByText(/Create a training day/)).toBeInTheDocument()
    await user.click(within(nav()).getByRole('button', { name: /Training days/ }))
    await user.click(screen.getByRole('button', { name: '+ New' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByText('Add at least one exercise.')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('e.g. Push'), 'Legs')
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

  it('removes an exercise from a day and cancels without saving', async () => {
    const { user, repo } = await renderApp()
    await user.click(within(nav()).getByRole('button', { name: /Training days/ }))
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
