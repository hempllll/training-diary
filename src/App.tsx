import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { BackupDialog } from './components/BackupDialog'
import { DayEditor } from './components/DayEditor'
import { DaysScreen } from './components/DaysScreen'
import { ExercisesScreen } from './components/ExercisesScreen'
import { ExerciseView } from './components/ExerciseView'
import { HomeScreen } from './components/HomeScreen'
import { LoadErrorScreen } from './components/LoadErrorScreen'
import { NavBar, type Tab } from './components/NavBar'
import { PlanChooser } from './components/PlanChooser'
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
import { useSwipe } from './hooks/useSwipe'
import { exportDiary, LocalStorageDiaryRepository, type DiaryRepository } from './storage'
import { downloadText } from './ui/download'
import { formatDate } from './ui/format'

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

// --- page transitions ------------------------------------------------------

/** How a page change animates; see `.page[data-motion]` in App.css. */
type Motion = 'forward' | 'back' | 'next-tab' | 'prev-tab' | 'fade'

/** 0 = a tab's main screen, 1 = a screen opened from it. */
const DEPTH: Record<View['name'], number> = {
  home: 0,
  exercises: 0,
  days: 0,
  workout: 1,
  run: 1,
  exercise: 1,
  day: 1,
}
const TAB_ORDER: Tab[] = ['home', 'exercises', 'days']

/** Opening a screen slides in from the right, going back from the left, and
 * switching tabs slides towards the tab's side of the bar. */
function motionBetween(from: View, to: View): Motion {
  const deeper = DEPTH[to.name] - DEPTH[from.name]
  if (deeper !== 0) return deeper > 0 ? 'forward' : 'back'
  const step = TAB_ORDER.indexOf(TAB_OF[to.name]) - TAB_ORDER.indexOf(TAB_OF[from.name])
  return step > 0 ? 'next-tab' : step < 0 ? 'prev-tab' : 'fade'
}

/** How long a notification shows before it fades away (ms). */
export const TOAST_MS = 3000

/** Identifies a screen for remembering its scroll position. */
const scrollKey = (v: View) => ('id' in v && v.id ? `${v.name}:${v.id}` : v.name)

function App({ repo: repoProp, now = () => new Date() }: AppProps) {
  const [repo] = useState<DiaryRepository>(() => repoProp ?? new LocalStorageDiaryRepository())
  const { diary, active, loadError, update, setActive } = useDiary(repo)
  // `seq` changes on every navigation and keys the page, so its entry
  // animation plays again.
  const [nav, setNav] = useState<{ view: View; motion: Motion; seq: number }>({
    view: { name: 'home' },
    motion: 'fade',
    seq: 0,
  })
  const view = nav.view
  const scrollPositions = useRef(new Map<string, number>())
  const [filter, setFilter] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [backupOpen, setBackupOpen] = useState(false)
  const [choosing, setChoosing] = useState(false)
  // A short notification ("Saved Push"); `seq` restarts it when a new one
  // replaces one still showing.
  const [toast, setToast] = useState<{ text: string; seq: number } | null>(null)

  // Opened screens start at the top; going back or switching tabs returns to
  // where that screen was left.
  useLayoutEffect(() => {
    const y = nav.motion === 'forward' ? 0 : (scrollPositions.current.get(scrollKey(nav.view)) ?? 0)
    window.scrollTo(0, y)
  }, [nav])

  function navigate(next: View) {
    scrollPositions.current.set(scrollKey(view), window.scrollY)
    setNav((cur) => ({ view: next, motion: motionBetween(cur.view, next), seq: cur.seq + 1 }))
  }

  function selectTab(tab: Tab) {
    navigate(TAB_VIEW[tab])
  }

  function notify(text: string) {
    setToast((cur) => ({ text, seq: (cur?.seq ?? 0) + 1 }))
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // On a tab's main screen, swiping across it moves to the neighbouring tab.
  const swipe = useSwipe((step) => {
    const next = TAB_ORDER[TAB_ORDER.indexOf(TAB_OF[view.name]) + step]
    if (next) selectTab(next)
  })

  if (loadError) return <LoadErrorScreen error={loadError} today={localDate(now())} />
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
    setChoosing(false)
    void setActive(startWorkout(day, diary, now()))
    navigate({ name: 'run' })
  }

  // The header's + tracks a training day: it resumes the one in progress, or
  // asks for a plan first when there is none yet.
  const add = active
    ? { label: 'Resume training day', run: () => navigate({ name: 'run' }) }
    : diary.days.length === 0
      ? { label: 'New plan', run: () => navigate({ name: 'day', id: null, back: view }) }
      : { label: 'Track a training day', run: () => setChoosing(true) }

  function handleFinish() {
    if (!active) return
    const workout = finishWorkout(active)
    void update((d) => saveWorkout(d, workout))
    void setActive(null)
    notify(`Saved ${workout.dayName} (${formatDate(workout.date)}).`)
    // Show what was just saved.
    setExpanded((cur) => new Set(cur).add(workout.id))
    navigate(active.editing ? { name: 'workout', id: workout.id } : { name: 'home' })
  }

  function handleDiscard() {
    if (!active) return
    void setActive(null)
    navigate(active.editing ? { name: 'workout', id: active.workout.id } : { name: 'home' })
  }

  // --- training days -------------------------------------------------------

  function handleSaveDay(day: TrainingDay, back: View) {
    void update((d) => saveDay(d, day))
    notify(`Saved ${day.name}.`)
    navigate(back)
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
          onLeave={() => navigate({ name: 'home' })}
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
            onBack={() => navigate({ name: 'home' })}
            onEdit={() => {
              void setActive(editWorkout(workout))
              navigate({ name: 'run' })
            }}
            onDelete={() => {
              void update((x) => deleteWorkout(x, workout.id))
              notify('Training day deleted.')
              navigate({ name: 'home' })
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
            onBack={() => navigate({ name: 'exercises' })}
            onSave={(changes) => void update((x) => saveExercise(x, { ...exercise, ...changes }))}
            onDelete={() => {
              void update((x) => deleteExercise(x, exercise.id))
              notify(`Deleted ${exercise.name}.`)
              navigate({ name: 'exercises' })
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
          onOpen={(id) => navigate({ name: 'exercise', id })}
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
                  notify(`Deleted ${day.name}.`)
                  navigate({ name: 'days' })
                }
              : undefined
          }
          onCancel={() => navigate(view.back)}
          createExercise={createExercise}
        />
      )
    }
    if (view.name === 'days') {
      return (
        <DaysScreen
          diary={d}
          onAdd={() => navigate({ name: 'day', id: null, back: view })}
          onEdit={(id) => navigate({ name: 'day', id, back: view })}
        />
      )
    }
    return (
      <HomeScreen
        diary={d}
        active={active}
        filter={filter}
        onFilterChange={setFilter}
        expanded={expanded}
        onExpandedChange={setExpanded}
        onResume={() => navigate({ name: 'run' })}
        onOpenWorkout={(id) => navigate({ name: 'workout', id })}
        onCreateDay={() => navigate({ name: 'day', id: null, back: { name: 'home' } })}
      />
    )
  }

  // Full-screen flows hide the tab bar so a stray tap can't leave them.
  const focused = (view.name === 'run' && active !== null) || view.name === 'day'

  return (
    <div className={focused ? 'app' : 'app has-tab-bar'}>
      <div className="status-cap" aria-hidden="true" />
      {!focused && <AppHeader addLabel={add.label} onAdd={add.run} onBackup={() => setBackupOpen(true)} />}

      {/* Floats over the top right and fades out; a tap dismisses it early. */}
      {toast && (
        <p
          key={toast.seq}
          className="toast"
          role="status"
          style={{ '--toast-ms': `${TOAST_MS}ms` } as CSSProperties}
          onClick={() => setToast(null)}
        >
          {toast.text}
        </p>
      )}

      <main {...(DEPTH[view.name] === 0 ? swipe : {})}>
        <div key={nav.seq} className="page" data-motion={nav.motion}>
          {renderScreen(diary)}
        </div>
      </main>

      {!focused && (
        <NavBar tab={TAB_OF[view.name]} onSelect={selectTab} />
      )}

      {choosing && <PlanChooser days={diary.days} onChoose={handleStart} onClose={() => setChoosing(false)} />}

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
            notify('Backup restored.')
          }}
          onClose={() => setBackupOpen(false)}
        />
      )}
    </div>
  )
}

export default App
