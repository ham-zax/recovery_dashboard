'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface CheckInInitialData {
  pain: number;
  reflux: number;
  walkedToday: boolean;
  strengthToday: boolean;
  sleepHours: number;
  sittingBreaksActual: number;
  notes: string | null;
}

interface CheckInFormProps {
  initialData?: CheckInInitialData | null;
  sittingBreaksTarget: number;
}

export function CheckInForm({ initialData, sittingBreaksTarget }: CheckInFormProps) {
  const router = useRouter();
  const [pain, setPain] = useState<number>(initialData?.pain ?? 5);
  const [reflux, setReflux] = useState<number>(initialData?.reflux ?? 5);
  const [walkedToday, setWalkedToday] = useState<boolean>(initialData?.walkedToday ?? false);
  const [strengthToday, setStrengthToday] = useState<boolean>(initialData?.strengthToday ?? false);
  const [sleepHours, setSleepHours] = useState<number>(initialData?.sleepHours ?? 8.0);
  const [sittingBreaksActual, setSittingBreaksActual] = useState<number>(initialData?.sittingBreaksActual ?? 0);
  const [notes, setNotes] = useState<string>(initialData?.notes ?? '');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/recovery/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pain,
          reflux,
          walkedToday,
          strengthToday,
          sleepHours,
          sittingBreaksActual,
          sittingBreaksTarget,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save check-in');
      }

      setSuccess(true);
      router.refresh();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pain Level Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="pain-range" className="text-sm font-medium text-text-secondary">
            Pain Level
          </label>
          <span className="text-sm font-mono text-accent-purple">{pain} / 10</span>
        </div>
        <input
          id="pain-range"
          type="range"
          min="0"
          max="10"
          value={pain}
          onChange={(e) => setPain(parseInt(e.target.value, 10))}
          className="w-full cursor-pointer accent-accent-purple"
        />
        <div className="flex justify-between text-[10px] text-text-tertiary font-mono mt-1">
          <span>No Pain (0)</span>
          <span>Moderate (5)</span>
          <span>Severe (10)</span>
        </div>
      </div>

      {/* Reflux Severity Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="reflux-range" className="text-sm font-medium text-text-secondary">
            Reflux Severity
          </label>
          <span className="text-sm font-mono text-accent-purple">{reflux} / 10</span>
        </div>
        <input
          id="reflux-range"
          type="range"
          min="0"
          max="10"
          value={reflux}
          onChange={(e) => setReflux(parseInt(e.target.value, 10))}
          className="w-full cursor-pointer accent-accent-purple"
        />
        <div className="flex justify-between text-[10px] text-text-tertiary font-mono mt-1">
          <span>None (0)</span>
          <span>Moderate (5)</span>
          <span>Severe (10)</span>
        </div>
      </div>

      {/* Walk completed toggle */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Daily Walk Completed?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            id="walk-yes-btn"
            type="button"
            onClick={() => setWalkedToday(true)}
            className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
              walkedToday
                ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                : 'bg-bg-input text-text-secondary border-border hover:border-border-focus'
            }`}
          >
            Yes
          </button>
          <button
            id="walk-no-btn"
            type="button"
            onClick={() => setWalkedToday(false)}
            className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
              !walkedToday
                ? 'bg-accent-red/10 text-accent-red border-accent-red/30'
                : 'bg-bg-input text-text-secondary border-border hover:border-border-focus'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Strength completed toggle */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Strength Workout Completed?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            id="strength-yes-btn"
            type="button"
            onClick={() => setStrengthToday(true)}
            className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
              strengthToday
                ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                : 'bg-bg-input text-text-secondary border-border hover:border-border-focus'
            }`}
          >
            Yes
          </button>
          <button
            id="strength-no-btn"
            type="button"
            onClick={() => setStrengthToday(false)}
            className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
              !strengthToday
                ? 'bg-accent-red/10 text-accent-red border-accent-red/30'
                : 'bg-bg-input text-text-secondary border-border hover:border-border-focus'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Sleep hours and Sitting breaks */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sleep-input" className="block text-sm font-medium text-text-secondary mb-2">
            Sleep (Hours)
          </label>
          <input
            id="sleep-input"
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
            className="w-full bg-bg-input border border-border text-text-primary rounded-lg px-3 py-2 font-mono focus:border-border-focus outline-none"
          />
        </div>
        <div>
          <label htmlFor="breaks-input" className="block text-sm font-medium text-text-secondary mb-2">
            Sitting Breaks
          </label>
          <div className="flex items-center gap-2">
            <input
              id="breaks-input"
              type="number"
              min="0"
              value={sittingBreaksActual}
              onChange={(e) => setSittingBreaksActual(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-bg-input border border-border text-text-primary rounded-lg px-3 py-2 font-mono focus:border-border-focus outline-none"
            />
            <span className="text-text-secondary font-mono shrink-0">/ {sittingBreaksTarget}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes-input" className="block text-sm font-medium text-text-secondary mb-2">
          Notes (Optional)
        </label>
        <textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did you feel today? Any specific symptoms?"
          className="w-full bg-bg-input border border-border text-text-primary rounded-lg px-3 py-2 h-24 focus:border-border-focus outline-none resize-none text-sm placeholder-text-tertiary"
        />
      </div>

      {/* Feedback State */}
      {error && (
        <div id="checkin-error" className="text-accent-red text-sm font-mono bg-accent-red/10 border border-accent-red/20 rounded-lg p-3">
          {error}
        </div>
      )}
      {success && (
        <div id="checkin-success" className="text-accent-green text-sm font-mono bg-accent-green/10 border border-accent-green/20 rounded-lg p-3">
          ✓ Daily check-in saved successfully.
        </div>
      )}

      {/* Submit Button */}
      <button
        id="checkin-save-btn"
        type="submit"
        disabled={isLoading}
        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-bg-primary bg-accent-purple hover:opacity-90 active:opacity-80 transition-all font-mono cursor-pointer ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? 'Saving...' : 'Save Check-In'}
      </button>
    </form>
  );
}
