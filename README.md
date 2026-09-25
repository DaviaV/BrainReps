# BrainReps

Five questions a day, about two minutes: three mental-math and two memory
exercises that get harder as you get better.

It runs in the browser, installs to a phone home screen, and keeps everything
in local storage — no account, no server, nothing leaves your device.

## How it works

**Every day gives you five questions** — three mental math, two memory,
interleaved so you never do both memory tasks back to back. The questions are
seeded from the date, so today's five are the same all day: reloading the page
resumes where you left off instead of rerolling a question you found hard.

**Difficulty adapts, separately for each skill.** Being quick at multiplication
says nothing about your digit span, so mental math and memory each carry their
own level from 1 to 10:

- two accurate (≥ 80%) *and* quick sessions in a row → up a level
- one session under 50% → down a level
- at most one step per day, in either direction

Within a session the five questions ramp from one level below your current
level to one above, so there is always a gentle start and a stretch at the end.

**Streaks** count consecutive days. Miss a day and the counter resets, but your
best is kept.

### The exercises

| Skill | Exercise | What it asks |
| --- | --- | --- |
| Math | Arithmetic | `+ − × ÷` and squares, from `23 + 8` up to `384 × 27`; division is always exact |
| Math | Percentages | `15% of 240`, "38 is what % of 200", tips, discounts, two discounts in a row |
| Math | Number sequences | Find the next term: arithmetic, geometric, quadratic, interleaved, Fibonacci-like |
| Memory | Digit span | Memorise 4–10 digits, type them back — in reverse from level 6 |
| Memory | Word lists | Memorise 5–10 words, then spot the intruder or recall as many as you can |
| Memory | Name & number pairs | Memorise 3–7 name/number pairs, then answer in either direction |

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```sh
npm test           # unit tests (Vitest)
npm run typecheck  # tsc
npm run lint       # ESLint
npm run build      # production build into dist/
npm run preview    # serve the built site
```

## Deploying

Pushing to `main` builds the site and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. Enable it once under **Settings → Pages →
Build and deployment → Source: GitHub Actions**.

GitHub Pages serves a project site from `/<repo-name>/`, so `vite.config.ts`
sets `base` to `/BrainReps/`. **If you rename the repository, change that
constant to match** or the built site will load a blank page.

Once it is live, open it on your phone and use *Add to Home Screen* — the
manifest and service worker make it launch full-screen and work offline.

## How the code is laid out

```
src/
  engine/        all the game logic — pure, no React, no browser APIs
    types.ts       the Exercise contract every exercise type implements
    rng.ts         seeded PRNG (mulberry32) so a day's questions are stable
    session.ts     assembles the daily five
    leveling.ts    the adaptive difficulty rules
    date.ts        calendar-day helpers ('YYYY-MM-DD', local time)
    exercises/     one file per exercise type
  storage/       schema-versioned localStorage, validates everything it reads
  ui/            React components — props in, callbacks out
  hooks/         useProgress: load once, persist on change
```

Two things are deliberate:

**The engine never reads the clock or storage.** Dates arrive as
`'YYYY-MM-DD'` strings and randomness arrives as a seeded `Rng`, which is what
makes streaks, level changes and every generator testable by handing them a
history — no mocking, no fake timers.

**Storage distrusts what it reads.** `migrate()` validates every field and
drops anything unrecognised, so a corrupt or half-written record can never
break a render. A `schema` version is stored alongside for future format
changes.

### Adding a new exercise

1. Write `src/engine/exercises/yourExercise.ts` exporting an `Exercise`.
2. Add it to the list in `src/engine/registry.ts`.

That is all — the shared tests in `exercises.test.ts` pick it up automatically
and hold it to the contract (answers its own questions, scales with level,
deterministic for a seed, study phase iff it is a memory exercise).

## Tests

135 unit tests cover the RNG, date arithmetic, session assembly, the level
rules, storage validation, and every generator. The arithmetic tests re-derive
each answer from the printed question rather than trusting the generator —
that caught a sequence rule that could emit `3, 3, 3, 3, 3`.

## Not included

**Daily reminder notifications.** Web push from an installed PWA is unreliable
on iOS and requires the app to have been opened recently, so it would not
actually be the thing that reminds you. The streak on the home screen is the
nudge; a phone alarm works better than anything the browser can offer here.
