import { useRef, useState } from 'react'
import type { Diary } from '../diary'
import { parseDiary } from '../storage'
import { errorText, plural } from '../ui/format'
import { Dialog } from './Dialog'

interface BackupDialogProps {
  diary: Diary
  onExport: () => void
  onRestore: (diary: Diary) => void
  onClose: () => void
}

const counts = (d: Diary) =>
  `${plural(d.exercises.length, 'exercise')}, ${plural(d.days.length, 'plan')}, ${plural(d.workouts.length, 'tracked training day')}`

/**
 * Export the diary to a JSON file, or restore one. The installed iPhone app
 * keeps its data apart from Safari, so a backup file is the safe way to move
 * or keep it.
 */
export function BackupDialog({ diary, onExport, onRestore, onClose }: BackupDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Diary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function read(file: File) {
    try {
      setPending(parseDiary(await file.text()))
      setError(null)
    } catch (err) {
      setError(`Import failed: ${errorText(err)}`)
    }
  }

  return (
    <Dialog title="Backup" onClose={onClose}>
      <p>Your diary: {counts(diary)}.</p>
      {pending ? (
        <>
          <p>
            Replace it with the file’s {counts(pending)}? Everything currently stored is overwritten.
          </p>
          <div className="dialog-actions">
            <button type="button" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={() => onRestore(pending)}>
              Replace
            </button>
          </div>
        </>
      ) : (
        <div className="dialog-actions">
          <button type="button" onClick={() => fileInput.current?.click()}>
            Import file…
          </button>
          <button type="button" className="primary" onClick={onExport}>
            Export
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Import backup file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void read(file)
          e.target.value = '' // allow picking the same file again
        }}
      />
    </Dialog>
  )
}
