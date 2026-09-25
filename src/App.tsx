import { useCallback, useState } from 'react';
import { today as realToday } from './engine/date.ts';
import type { DateString } from './engine/date.ts';
import type { LevelDecision } from './engine/leveling.ts';
import { buildDailySession } from './engine/session.ts';
import type {
  AttemptResult,
  ExerciseInstance,
  Family,
  SessionRecord,
} from './engine/types.ts';
import { useProgress } from './hooks/useProgress.ts';
import { completeSession, effectiveStreak, sessionFor } from './storage/progress.ts';
import { Home } from './ui/Home.tsx';
import { SessionView } from './ui/SessionView.tsx';
import { Settings } from './ui/Settings.tsx';
import { Stats } from './ui/Stats.tsx';
import { Summary } from './ui/Summary.tsx';

type View =
  | { name: 'home' }
  | { name: 'stats' }
  | { name: 'settings' }
  | {
      name: 'session';
      scored: boolean;
      date: DateString;
      levelsAtStart: Record<Family, number>;
      instances: ExerciseInstance[];
      initialResults: AttemptResult[];
    }
  | {
      name: 'summary';
      results: AttemptResult[];
      decisions: Record<Family, LevelDecision> | null;
      streak: number;
    };

export function App() {
  const { progress, update, reset } = useProgress();
  const [view, setView] = useState<View>({ name: 'home' });
  // Developer aid only, and deliberately not persisted.
  const [dateOverride, setDateOverride] = useState<DateString | null>(null);

  const date = dateOverride ?? realToday();
  const doneToday = sessionFor(progress, date);
  const inFlight = progress.inFlight?.date === date ? progress.inFlight : null;

  const startDaily = useCallback(() => {
    const levelsAtStart = inFlight?.levelsAtStart ?? progress.levels;
    const instances = buildDailySession(date, levelsAtStart);
    setView({
      name: 'session',
      scored: true,
      date,
      levelsAtStart,
      instances,
      // Guard against a saved session longer than today's (e.g. after an
      // upgrade changed the question count).
      initialResults: (inFlight?.results ?? []).slice(0, instances.length),
    });
  }, [date, inFlight, progress.levels]);

  const startPractice = useCallback(() => {
    // Same builder, seeded from the clock instead of the date, so practice
    // questions are fresh every time and never the scored five.
    setView({
      name: 'session',
      scored: false,
      date,
      levelsAtStart: progress.levels,
      instances: buildDailySession(`practice-${Date.now()}`, progress.levels),
      initialResults: [],
    });
  }, [date, progress.levels]);

  const handleProgress = useCallback(
    (results: AttemptResult[]) => {
      if (view.name !== 'session' || !view.scored) return;
      const partial: SessionRecord = {
        date: view.date,
        levelsAtStart: view.levelsAtStart,
        results,
        completed: false,
      };
      update({ ...progress, inFlight: partial });
    },
    [view, progress, update],
  );

  const handleFinish = useCallback(
    (results: AttemptResult[]) => {
      if (view.name !== 'session') return;

      if (!view.scored) {
        setView({
          name: 'summary',
          results,
          decisions: null,
          streak: effectiveStreak(progress.streak, date),
        });
        return;
      }

      const finished: SessionRecord = {
        date: view.date,
        levelsAtStart: view.levelsAtStart,
        results,
        completed: true,
      };
      const { progress: next, decisions } = completeSession(progress, finished);
      update(next);
      setView({ name: 'summary', results, decisions, streak: next.streak.current });
    },
    [view, progress, update, date],
  );

  const goHome = useCallback(() => setView({ name: 'home' }), []);

  switch (view.name) {
    case 'session':
      return (
        <SessionView
          instances={view.instances}
          initialResults={view.initialResults}
          onProgress={handleProgress}
          onFinish={handleFinish}
          onQuit={goHome}
          title={view.scored ? 'Today' : 'Practice'}
        />
      );

    case 'summary':
      return (
        <Summary
          results={view.results}
          decisions={view.decisions}
          streak={view.streak}
          onHome={goHome}
        />
      );

    case 'stats':
      return <Stats progress={progress} today={date} onBack={goHome} />;

    case 'settings':
      return (
        <Settings
          progress={progress}
          today={date}
          dateOverride={dateOverride}
          onDateOverride={setDateOverride}
          onReset={reset}
          onBack={goHome}
        />
      );

    case 'home':
      return (
        <Home
          streak={effectiveStreak(progress.streak, date)}
          best={progress.streak.best}
          levels={progress.levels}
          doneToday={doneToday}
          resumable={(inFlight?.results.length ?? 0) > 0}
          onStart={startDaily}
          onPractice={startPractice}
          onStats={() => setView({ name: 'stats' })}
          onSettings={() => setView({ name: 'settings' })}
        />
      );
  }
}
