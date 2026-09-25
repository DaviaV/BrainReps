import { MAX_LEVEL } from '../engine/types.ts';
import type { Family, SessionRecord } from '../engine/types.ts';

interface HomeProps {
  streak: number;
  best: number;
  levels: Record<Family, number>;
  /** Today's session, if it is already finished. */
  doneToday: SessionRecord | undefined;
  /** True when today's session was started but not finished. */
  resumable: boolean;
  onStart: () => void;
  onPractice: () => void;
  onStats: () => void;
  onSettings: () => void;
}

const FAMILY_LABEL: Record<Family, string> = { math: 'Mental math', memory: 'Memory' };

function LevelTile({ family, level }: { family: Family; level: number }) {
  return (
    <div className="level-tile">
      <div className="muted">{FAMILY_LABEL[family]}</div>
      <div className="level-value tabular">
        Level {level}
        <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
          {' '}
          / {MAX_LEVEL}
        </span>
      </div>
      <div className="level-bar">
        <span style={{ width: `${(level / MAX_LEVEL) * 100}%` }} />
      </div>
    </div>
  );
}

export function Home({
  streak,
  best,
  levels,
  doneToday,
  resumable,
  onStart,
  onPractice,
  onStats,
  onSettings,
}: HomeProps) {
  const correctToday = doneToday?.results.filter((result) => result.correct).length ?? 0;
  const totalToday = doneToday?.results.length ?? 0;

  return (
    <div className="stack">
      <div className="topbar">
        <h1>BrainReps</h1>
        <div className="row">
          <button type="button" className="btn-ghost" onClick={onStats}>
            Stats
          </button>
          <button type="button" className="btn-ghost" onClick={onSettings}>
            Settings
          </button>
        </div>
      </div>

      <div className="card stack">
        <div className="streak">
          <span className="streak-count tabular">{streak}</span>
          <span className="muted">
            day{streak === 1 ? '' : 's'} in a row
            {best > streak ? ` · best ${best}` : ''}
          </span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {streak === 0
            ? 'Five questions, about two minutes. Start a streak today.'
            : 'Keep it going — five questions, about two minutes.'}
        </p>
      </div>

      <div className="levels">
        <LevelTile family="math" level={levels.math} />
        <LevelTile family="memory" level={levels.memory} />
      </div>

      {doneToday ? (
        <div className="card stack">
          <h2>Done for today ✓</h2>
          <p className="muted" style={{ margin: 0 }}>
            You scored <strong className="tabular">{correctToday}</strong> out of {totalToday}.
            Tomorrow brings five new questions.
          </p>
          <button type="button" onClick={onPractice}>
            Extra practice (unscored)
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="btn-primary btn-big" onClick={onStart}>
            {resumable ? 'Resume today’s 5' : 'Start today’s 5'}
          </button>
          <button type="button" onClick={onPractice}>
            Extra practice (unscored)
          </button>
        </>
      )}
    </div>
  );
}
