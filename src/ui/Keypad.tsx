interface KeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * An on-screen number pad. The mobile keyboard covers half the screen and
 * hides the question, which is exactly the thing you are trying to hold in
 * your head, so the app brings its own.
 */
export function Keypad({ onDigit, onDelete, onSubmit, canSubmit }: KeypadProps) {
  return (
    <div className="keypad">
      {DIGITS.map((digit) => (
        <button key={digit} type="button" onClick={() => onDigit(digit)} aria-label={digit}>
          {digit}
        </button>
      ))}
      <button type="button" onClick={onDelete} aria-label="Delete last digit">
        ⌫
      </button>
      <button type="button" onClick={() => onDigit('0')} aria-label="0">
        0
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label="Submit answer"
      >
        ✓
      </button>
    </div>
  );
}
