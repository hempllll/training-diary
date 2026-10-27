import { useState, type ReactNode } from 'react'
import './App.css'
import { BackupDialog } from './components/BackupDialog'
import { DayEditor } from './components/DayEditor'
import { DaysScreen } from './components/DaysScreen'
import { ExercisesScreen } from './components/ExercisesScreen'
import { ExerciseView } from './components/ExerciseView'
import { HomeScreen } from './components/HomeScreen'
import { NavBar, type Tab } from './components/NavBar'
import { WorkoutRunner } from './components/WorkoutRunner'
import { WorkoutView } from './components/WorkoutView'
import {
  deleteDay,
  deleteExercise,
  deleteWorkout,
  editWorkout,
  finishWorkout,
  localDate,
  newId,
  saveDay,
  saveExercise,
  saveWorkout,
  startWorkout,
  type Exercise,
  type TrainingDay,
} from './diary'
import { useDiary } from './hooks/useDiary'
import { exportDiary, LocalStorageDiaryRepository, type DiaryRepository } from './storage'
import { downloadText } from './ui/download'

/** Everything external is injectable so tests can run the real UI in memory. */
export interface AppProps {
  repo?: DiaryRepository
  now?: () => Date
}

type View =
  | { name: 'home' }
  | { name: 'workout'; id: string }
  | { name: 'run' }
  | { name: 'exercises' }
  | { name: 'exercise'; id: string }
  | { name: 'days' }
  /** `back` is where Save and Cancel return to. */
  | { name: 'day'; id: string | null; back: View }

const TAB_OF: Record<View['name'], Tab> = {
  home: 'home',
  workout: 'home',
  run: 'home',
  exercises: 'exercises',
  exercise: 'exercises',
  days: 'days',
  day: 'days',
}

const TAB_VIEW: Record<Tab, View> = {
  home: { name: 'home' },
  exercises: { name: 'exercises' },
  days: { name: 'days' },
}

function App({ repo: repoProp, now = () => new Date() }: AppProps) {
  const [repo] = useState<DiaryRepository>(() => repoProp ?? new LocalStorageDiaryRepository())
  const { diary, active, update, setActive } = useDiary(repo)
  const [view, setView] = useState<View>({ name: 'home' })
  const [filter, setFilter] = useState<Set<string>>(new Set())
  const [backupOpen, setBackupOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!diary) return <p className="notice loading">Loading…</p>

  /** Create and store a new exercise (from a picker), returning it right away. */
  function createExercise(name: string): Exercise {
    const exercise = { id: newId(), name: name.trim() }
    void update((d) => saveExercise(d, exercise))
    return exercise
  }

  // --- workouts ------------------------------------------------------------

  function handleStart(dayId: string) {
    const day = diary?.days.find((d) => d.id === dayId)
    if (!day || !diary) return
    void setActive(startWorkout(day, diary, now()))
    setView({ name: 'run' })
  }

  function handleFinish() {
    if (!active) return
    const workout = finishWorkout(active)
    void update((d) => saveWorkout(d, workout))
    void setActive(null)
    setMessage(`Saved ${workout.dayName} workout.`)
    setView(active.editing ? { name: 'workout', id: workout.id } : { name: 'home' })
  }

  function handleDiscard() {
    if (!active) return
    void setActive(null)
    setView(active.editing ? { name: 'workout', id: active.workout.id } : { name: 'home' })
  }

  // --- training days -------------------------------------------------------

  function handleSaveDay(day: TrainingDay, back: View) {
    void update((d) => saveDay(d, day))
    setMessage(`Saved ${day.name}.`)
    setView(back)
  }

  // --- screens -------------------------------------------------------------

  function renderScreen(d: NonNullable<typeof diary>): ReactNode {
    if (view.name === 'run' && active) {
      return (
        <WorkoutRunner
          active={active}
          diary={d}
          onChange={(next) => void setActive(next)}
          onFinish={handleFinish}
          onLeave={() => setView({ name: 'home' })}
          onDiscard={handleDiscard}
          createExercise={createExercise}
        />
      )
    }
    if (view.name === 'workout') {
      const workout = d.workouts.find((w) => w.id === view.id)
      if (workout) {
        return (
          <WorkoutView
            workout={workout}
            diary={d}
            canEdit={!active}
            onBack={() => setView({ name: 'home' })}
            onEdit={() => {
              void setActive(editWorkout(workout))
              setView({ name: 'run' })
            }}
            onDelete={() => {
              void update((x) => deleteWorkout(x, workout.id))
              setMessage('Workout deleted.')
              setView({ name: 'home' })
            }}
          />
        )
      }
    }
    if (view.name === 'exercise') {
      const exercise = d.exercises.find((e) => e.id === view.id)
      if (exercise) {
        return (
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            diary={d}
            onBack={() => setView({ name: 'exercises' })}
            onRename={(name) => void update((x) => saveExercise(x, { ...exercise, name }))}
            onDelete={() => {
              void update((x) => deleteExercise(x, exercise.id))
              setMessage(`Deleted ${exercise.name}.`)
              setView({ name: 'exercises' })
            }}
          />
        )
      }
    }
    if (view.name === 'exercises' || view.name === 'exercise') {
      return (
        <ExercisesScreen
          diary={d}
          onAdd={(name) => void update((x) => saveExercise(x, { id: newId(), name }))}
          onOpen={(id) => setView({ name: 'exercise', id })}
        />
      )
    }
    if (view.name === 'day') {
      const day = view.id ? (d.days.find((x) => x.id === view.id) ?? null) : null
      return (
        <DayEditor
          key={view.id ?? 'new'}
          day={day}
          diary={d}
          onSave={(saved) => handleSaveDay(saved, view.back)}
          onDelete={
            day
              ? () => {
                  void update((x) => deleteDay(x, day.id))
                  setMessage(`Deleted ${day.name}.`)
                  setView({ name: 'days' })
                }
              : undefined
          }
          onCancel={() => setView(view.back)}
          createExercise={createExercise}
        />
      )
    }
    if (view.name === 'days') {
      return (
        <DaysScreen
          diary={d}
          onAdd={() => setView({ name: 'day', id: null, back: view })}
          onEdit={(id) => setView({ name: 'day', id, back: view })}
        />
      )
    }
    return (
      <HomeScreen
        diary={d}
        active={active}
        filter={filter}
        onFilterChange={setFilter}
        onStart={handleStart}
        onResume={() => setView({ name: 'run' })}
        onOpenWorkout={(id) => setView({ name: 'workout', id })}
        onCreateDay={() => setView({ name: 'day', id: null, back: { name: 'home' } })}
      />
    )
  }

  // Full-screen flows hide the tab bar so a stray tap can't leave them.
  const focused = (view.name === 'run' && active !== null) || view.name === 'day'

  return (
    <div className="app">
      {!focused && (
        <header className="app-header">
          <h1>Training Diary</h1>
          <button type="button" onClick={() => setBackupOpen(true)}>
            Backup
          </button>
        </header>
      )}

      {message && (
        <p className="toast" role="status">
          {message}
          <button type="button" className="icon" aria-label="Dismiss" onClick={() => setMessage(null)}>
            ✕
          </button>
        </p>
      )}

      <main>{renderScreen(diary)}</main>

      {!focused && (
        <NavBar
          tab={TAB_OF[view.name]}
          onSelect={(tab) => {
            setMessage(null)
            setView(TAB_VIEW[tab])
          }}
        />
      )}

      {backupOpen && (
        <BackupDialog
          diary={diary}
          onExport={() =>
            downloadText(`training-diary-${localDate(now())}.json`, exportDiary(diary))
          }
          onRestore={(restored) => {
            void update(() => restored)
            setBackupOpen(false)
            setFilter(new Set())
            setMessage('Backup restored.')
          }}
          onClose={() => setBackupOpen(false)}
        />
      )}
    </div>
  )
}

export default App
