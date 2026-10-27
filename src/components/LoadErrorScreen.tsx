import { DiaryLoadError } from '../storage'
import { downloadText } from '../ui/download'
import { errorText } from '../ui/format'

interface LoadErrorScreenProps {
  error: unknown
  today: string
}

/**
 * Shown instead of the app when the stored diary can't be read. Nothing is
 * saved while it shows, so the stored data stays as it is; the user can
 * download it to keep it safe.
 */
export function LoadErrorScreen({ error, today }: LoadErrorScreenProps) {
  const raw = error instanceof DiaryLoadError ? error.raw : null
  return (
    <div className="app">
      <main className="screen load-error">
        <h1>Your diary couldn’t be loaded</h1>
        <p className="error">{errorText(error)}</p>
        <p>
          Nothing has been changed or deleted. Reloading the app often fixes this after an update.
          You can also download the stored data to keep it safe.
        </p>
        <div className="actions">
          <button type="button" className="primary" onClick={() => location.reload()}>
            Reload
          </button>
          {raw !== null && (
            <button type="button" onClick={() => downloadText(`training-diary-stored-${today}.json`, raw)}>
              Download stored data
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
