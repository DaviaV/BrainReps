import type { StudyPhase } from '../engine/types.ts';

interface StudyCardProps {
  study: StudyPhase;
  remainingMs: number;
  onReady: () => void;
}

/** The memorise-this phase: items visible, with the time draining away. */
export function StudyCard({ study, remainingMs, onReady }: StudyCardProps) {
  const fraction = study.durationMs > 0 ? remainingMs / study.durationMs : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="card stack">
      <div className="spread">
        <h2>{study.hint ?? 'Memorise these'}</h2>
        <span className="muted tabular" aria-hidden="true">
          {secondsLeft}s
        </span>
      </div>

      <div className="countdown" role="timer" aria-label={`${secondsLeft} seconds left to memorise`}>
        <span style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />
      </div>

      <div className={`study-items ${study.layout === 'list' ? 'list' : ''}`}>
        {study.items.map((item, index) => (
          // Items can legitimately repeat (two 7s in a digit span), so the
          // index is the only stable key here.
          <div className="chip" key={`${item}-${index}`}>
            {item}
          </div>
        ))}
      </div>

      <button type="button" onClick={onReady}>
        I’ve got it
      </button>
    </div>
  );
}
