import { addDays, formatShort } from '../engine/date.ts';
import type { DateString } from '../engine/date.ts';
import { summarize } from '../engine/leveling.ts';
import { labelFor } from '../engine/registry.ts';
import { QUESTIONS_PER_SESSION } from '../engine/types.ts';
import type { Family } from '../engine/types.ts';
import type { Progress } from '../storage/progress.ts';

interface StatsProps {
  progress: Progress;
  today: DateString;
  onBack: () => void;
}

const DAYS_SHOWN = 30;
const FAMILY_LABEL: Record<Family, string> = { math: 'Mental math', memory: 'Memory' };

export function Stats({ progress, today, onBack }: StatsProps) {
  const byDate = new Map(progress.sessions.map((session) => [session.date, session]));
  const window = Array.from({ length: DAYS_SHOWN }, (_, i) =>
    addDays(today, -(DAYS_SHOWN - 1 - i)),
  );

  const allResults = progress.sessions.flatMap((session) => session.results);
  const answered = allResults.length;
  const correct = allResults.filter((result) => result.correct).length;

  const kinds = [...new Set(allResults.map((result) => result.kind))].map((kind) => {
    const forKind = allResults.filter((result) => result.kind === kind);
    const right = forKind.filter((result) => result.correct).length;
    return {
      kind,
      answered: forKind.length,
      accuracy: Math.round((right / forKind.length) * 100),
    };
  });
  kinds.sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="stack">
      <div className="topbar">
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h2>Stats</h2>
      </div>

      {answered === 0 ? (
        <div className="card">
          <p className="empty-state" style={{ margin: 0 }}>
            No sessions yet. Finish today’s five and your history shows up here.
          </p>
        </div>
      ) : (
        <>
          <div className="card stack">
            <h2>Last {DAYS_SHOWN} days</h2>
            <div className="history" aria-hidden="true">
              {window.map((date) => {
                const session = byDate.get(date);
                const score = session?.results.filter((r) => r.correct).length ?? 0;
                const height = (score / QUESTIONS_PER_SESSION) * 100;
                return (
                  <div
                    key={date}
                    className={`history-bar ${session ? '' : 'empty'}`}
                    style={{ height: `${session ? Math.max(8, height) : 4}%` }}
                    title={`${formatShort(date)}: ${session ? `${score}/${session.results.length}` : 'missed'}`}
                  />
                );
              })}
            </div>
            <div className="spread muted">
              <span>{formatShort(window[0] ?? today)}</span>
              <span>Today</span>
            </div>
          </div>

          <div className="card stack">
            <div className="spread">
              <span>Sessions completed</span>
              <strong className="tabular">{progress.sessions.length}</strong>
            </div>
            <div className="spread">
              <span>Questions answered</span>
              <strong className="tabular">{answered}</strong>
            </div>
            <div className="spread">
              <span>Overall accuracy</span>
              <strong className="tabular">{Math.round((correct / answered) * 100)}%</strong>
            </div>
            <div className="spread">
              <span>Best streak</span>
              <strong className="tabular">
                {progress.streak.best} day{progress.streak.best === 1 ? '' : 's'}
              </strong>
            </div>
          </div>

          <div className="card stack">
            <h2>By skill</h2>
            {(['math', 'memory'] as const).map((family) => {
              const outcome = summarize(allResults, family);
              return (
                <div key={family} className="spread">
                  <span>{FAMILY_LABEL[family]}</span>
                  <span className="muted tabular">
                    level {progress.levels[family]} ·{' '}
                    {outcome ? `${Math.round(outcome.accuracy * 100)}% correct` : 'no data'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 8 }}>By exercise</h2>
            {kinds.map((entry) => (
              <div className="kind-row" key={entry.kind}>
                <span>{labelFor(entry.kind)}</span>
                <span className="muted tabular">
                  {entry.accuracy}% of {entry.answered}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
