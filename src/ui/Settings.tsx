import { useState } from 'react';
import type { DateString } from '../engine/date.ts';
import type { Progress } from '../storage/progress.ts';

interface SettingsProps {
  progress: Progress;
  /** The day the app is treating as today, override included. */
  today: DateString;
  /** null means "use the real date". */
  dateOverride: DateString | null;
  onDateOverride: (date: DateString | null) => void;
  onReset: () => void;
  onBack: () => void;
}

export function Settings({
  progress,
  today,
  dateOverride,
  onDateOverride,
  onReset,
  onBack,
}: SettingsProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="stack">
      <div className="topbar">
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h2>Settings</h2>
      </div>

      <div className="card stack">
        <h2>Your data</h2>
        <p className="muted" style={{ margin: 0 }}>
          Everything is stored in this browser only — {progress.sessions.length} session
          {progress.sessions.length === 1 ? '' : 's'} so far. Nothing is sent anywhere, and
          clearing your browser data clears your history too.
        </p>
      </div>

      <div className="card stack">
        <h2>Start over</h2>
        <p className="muted" style={{ margin: 0 }}>
          Resets levels to 1 and deletes your streak and history. This cannot be undone.
        </p>
        {confirming ? (
          <div className="row">
            <button
              type="button"
              className="btn-danger grow"
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              Yes, delete everything
            </button>
            <button type="button" className="grow" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
            Reset progress
          </button>
        )}
      </div>

      <details className="card">
        <summary className="muted" style={{ cursor: 'pointer' }}>
          Developer tools
        </summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: 0 }}>
            Pretend it is another day, to preview a different set of questions or check the
            streak logic. Finishing a session while this is set records it under the
            pretended date, so reset it when you are done. Cleared on reload.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={dateOverride ?? ''}
            placeholder={today}
            aria-label="Pretend today is (YYYY-MM-DD)"
            onChange={(event) => {
              const value = event.target.value.trim();
              onDateOverride(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
            }}
          />
          {dateOverride && (
            <div className="row">
              <span className="badge down">Pretending it is {dateOverride}</span>
              <button type="button" className="btn-ghost" onClick={() => onDateOverride(null)}>
                Clear
              </button>
            </div>
          )}
        </div>
      </details>

      <p className="muted" style={{ textAlign: 'center' }}>
        BrainReps · five questions a day
      </p>
    </div>
  );
}
