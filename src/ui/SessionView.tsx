import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttemptResult, ExerciseInstance } from '../engine/types.ts';
import { Keypad } from './Keypad.tsx';
import { StudyCard } from './StudyCard.tsx';

interface SessionViewProps {
  instances: readonly ExerciseInstance[];
  /** Answers already given today, when resuming a reloaded session. */
  initialResults: readonly AttemptResult[];
  /** Called as each answer is banked, so progress survives a reload. */
  onProgress: (results: AttemptResult[]) => void;
  onFinish: (results: AttemptResult[]) => void;
  onQuit: () => void;
  title: string;
}

type Phase = 'study' | 'answer' | 'feedback';

/** A question is 'prose' if it reads as a sentence rather than a sum. */
function isProse(question: string): boolean {
  return question.length > 26 || /[a-z]{4}/.test(question);
}

export function SessionView({
  instances,
  initialResults,
  onProgress,
  onFinish,
  onQuit,
  title,
}: SessionViewProps) {
  const [results, setResults] = useState<AttemptResult[]>([...initialResults]);
  const index = results.length;
  const current = instances[index];

  const [phase, setPhase] = useState<Phase>(() =>
    instances[initialResults.length]?.study ? 'study' : 'answer',
  );
  const [input, setInput] = useState('');
  const [remainingMs, setRemainingMs] = useState(current?.study?.durationMs ?? 0);
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null);
  const answerStartedAt = useRef<number>(Date.now());

  const beginAnswer = useCallback(() => {
    answerStartedAt.current = Date.now();
    setPhase('answer');
  }, []);

  // Reset for each new question.
  useEffect(() => {
    if (!current) return;
    setInput('');
    setLastResult(null);
    if (current.study) {
      setRemainingMs(current.study.durationMs);
      setPhase('study');
    } else {
      beginAnswer();
    }
  }, [current, beginAnswer]);

  // Drain the study timer, then move on automatically.
  useEffect(() => {
    if (phase !== 'study' || !current?.study) return;
    const durationMs = current.study.durationMs;
    const deadline = Date.now() + durationMs;
    const tick = setInterval(() => setRemainingMs(Math.max(0, deadline - Date.now())), 100);
    const expiry = setTimeout(beginAnswer, durationMs);
    return () => {
      clearInterval(tick);
      clearTimeout(expiry);
    };
  }, [phase, current, beginAnswer]);

  const submit = useCallback(
    (raw?: string) => {
      const given = raw ?? input;
      if (!current || given.trim() === '') return;

      const result: AttemptResult = {
        kind: current.kind,
        family: current.family,
        level: current.level,
        question: current.question,
        expected: current.expected,
        given,
        correct: current.check(given),
        ms: Date.now() - answerStartedAt.current,
        targetMs: current.targetMs,
      };
      setLastResult(result);
      setPhase('feedback');
    },
    [current, input],
  );

  const next = useCallback(() => {
    if (!lastResult) return;
    const updated = [...results, lastResult];
    setResults(updated);
    if (updated.length >= instances.length) {
      onFinish(updated);
    } else {
      onProgress(updated);
    }
  }, [lastResult, results, instances.length, onFinish, onProgress]);

  // Enter submits, or advances past the feedback.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (phase === 'feedback') {
        event.preventDefault();
        next();
      } else if (phase === 'answer' && current?.answerKind !== 'text') {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, current, next, submit]);

  const dots = useMemo(
    () =>
      instances.map((_, slot) => {
        const result = results[slot];
        if (result) return result.correct ? 'correct' : 'wrong';
        return slot === index ? 'active' : '';
      }),
    [instances, results, index],
  );

  if (!current) return null;

  const usesKeypad = current.answerKind === 'number' || current.answerKind === 'sequence';

  return (
    <div className="stack">
      <div className="topbar">
        <button type="button" className="btn-ghost" onClick={onQuit}>
          ← Back
        </button>
        <span className="muted">
          {title} · {index + 1} of {instances.length}
        </span>
      </div>

      <div className="dots" aria-label={`Question ${index + 1} of ${instances.length}`}>
        {dots.map((state, slot) => (
          <span key={slot} className={`dot ${state}`} />
        ))}
      </div>

      {phase === 'study' && current.study ? (
        <StudyCard study={current.study} remainingMs={remainingMs} onReady={beginAnswer} />
      ) : (
        <div className="card stack">
          <p className={`question ${isProse(current.question) ? 'prose' : ''}`}>
            {current.question}
          </p>

          {phase === 'answer' && (
            <>
              {usesKeypad && (
                <>
                  <div className={`answer-display ${input === '' ? 'placeholder' : ''}`}>
                    {input === '' ? 'Tap the numbers below' : input}
                  </div>
                  <Keypad
                    onDigit={(digit) => setInput((value) => `${value}${digit}`.slice(0, 12))}
                    onDelete={() => setInput((value) => value.slice(0, -1))}
                    onSubmit={() => submit()}
                    canSubmit={input !== ''}
                  />
                </>
              )}

              {current.answerKind === 'text' && (
                <>
                  <textarea
                    rows={3}
                    value={input}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Separate words with spaces"
                    aria-label="Your answer"
                    onChange={(event) => setInput(event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary btn-big"
                    onClick={() => submit()}
                    disabled={input.trim() === ''}
                  >
                    Check
                  </button>
                </>
              )}

              {current.answerKind === 'choice' && (
                <div className="choices">
                  {(current.options ?? []).map((option) => (
                    <button key={option} type="button" onClick={() => submit(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {phase === 'feedback' && lastResult && (
            <>
              <div className={`feedback ${lastResult.correct ? 'correct' : 'wrong'}`}>
                <div className="feedback-title">
                  {lastResult.correct ? 'Correct' : 'Not quite'}
                </div>
                {!lastResult.correct && (
                  <div className="feedback-detail">
                    You said <strong>{lastResult.given}</strong>. The answer is{' '}
                    <strong>{current.expected}</strong>.
                    {current.explain ? ` ${current.explain}` : ''}
                  </div>
                )}
                {lastResult.correct && current.explain && current.family === 'memory' && (
                  <div className="feedback-detail">{current.explain}</div>
                )}
              </div>
              <button type="button" className="btn-primary btn-big" onClick={next} autoFocus>
                {index + 1 >= instances.length ? 'See results' : 'Next question'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
