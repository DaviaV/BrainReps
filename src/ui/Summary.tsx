import type { LevelDecision } from '../engine/leveling.ts';
import { labelFor } from '../engine/registry.ts';
import type { AttemptResult, Family } from '../engine/types.ts';

interface SummaryProps {
  results: readonly AttemptResult[];
  /** Absent for unscored practice runs. */
  decisions: Record<Family, LevelDecision> | null;
  streak: number;
  onHome: () => void;
}

const FAMILY_LABEL: Record<Family, string> = { math: 'Mental math', memory: 'Memory' };

const ARROW: Record<LevelDecision['direction'], string> = { up: '↑', down: '↓', hold: '=' };

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function Summary({ results, decisions, streak, onHome }: SummaryProps) {
  const correct = results.filter((result) => result.correct).length;
  const totalMs = results.reduce((sum, result) => sum + result.ms, 0);

  return (
    <div className="stack">
      <div className="topbar">
        <h1>{decisions ? 'Today’s five' : 'Practice'}</h1>
      </div>

      <div className="card stack">
        <div className="spread">
          <div>
            <div className="score tabular">
              {correct}
              <span className="muted" style={{ fontSize: '1.4rem' }}>
                /{results.length}
              </span>
            </div>
            <div className="muted">in {seconds(totalMs)} total</div>
          </div>
          {decisions && streak > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div className="score tabular" style={{ fontSize: '2rem' }}>
                {streak}
              </div>
              <div className="muted">day streak</div>
            </div>
          )}
        </div>
      </div>

      {decisions && (
        <div className="card stack">
          <h2>Where tomorrow starts</h2>
          {(['math', 'memory'] as const).map((family) => {
            const decision = decisions[family];
            return (
              <div key={family} className="spread">
                <div>
                  <div style={{ fontWeight: 600 }}>{FAMILY_LABEL[family]}</div>
                  <div className="muted">{decision.reason}</div>
                </div>
                <span className={`badge ${decision.direction}`}>
                  {ARROW[decision.direction]} Level {decision.level}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Question by question</h2>
        {results.map((result, index) => (
          <div className="result-row" key={index}>
            <span className={`result-mark ${result.correct ? 'correct' : 'wrong'}`}>
              {result.correct ? '✓' : '✗'}
            </span>
            <div className="grow">
              <div className="result-question">{result.question}</div>
              <div className="muted">
                {labelFor(result.kind)} · level {result.level} · {seconds(result.ms)}
                {result.correct ? '' : ` · answer: ${result.expected}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn-primary btn-big" onClick={onHome}>
        Done
      </button>
    </div>
  );
}
