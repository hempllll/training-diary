import { useState } from 'react'
import { lastEntry, nameError, sortedExercises, type Diary } from '../diary'
import { formatDate, summarizeSets } from '../ui/format'

interface ExercisesScreenProps {
  diary: Diary
  onAdd: (name: string) => void
  onOpen: (id: string) => void
}

/** All exercises with what was done last time; tap one for its progress. */
export function ExercisesScreen({ diary, onAdd, onOpen }: ExercisesScreenProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const problem = nameError(name, diary.exercises)
    setError(problem)
    if (problem) return
    onAdd(name.trim())
    setName('')
  }

  return (
    <section className="screen">
      <h2 className="screen-title">Exercises</h2>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          className="text-input"
          type="text"
          value={name}
          placeholder="New exercise, e.g. Bench press"
          aria-label="New exercise name"
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
        />
        <button type="submit" className="primary">
          Add
        </button>
      </form>
      {error && <p className="notice error">{error}</p>}

      {diary.exercises.length === 0 ? (
        <p className="notice">No exercises yet. Add the ones you train.</p>
      ) : (
        <ul className="list">
          {sortedExercises(diary.exercises).map((e) => {
            const last = lastEntry(diary.workouts, e.id)
            return (
              <li key={e.id}>
                <button type="button" className="row" onClick={() => onOpen(e.id)}>
                  <span className="row-main">
                    <span className="row-title">{e.name}</span>
                    <span className="row-sub">
                      {last
                        ? `${formatDate(last.workout.date)}: ${summarizeSets(last.entry.sets)}`
                        : 'Not done yet'}
                    </span>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
