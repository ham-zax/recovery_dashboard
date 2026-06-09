'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

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
  const [sleepHours, setSleepHours] = useState<number | ''>(initialData?.sleepHours ?? 8.0);
  const [sittingBreaksActual, setSittingBreaksActual] = useState<number | ''>(initialData?.sittingBreaksActual ?? 0);
  const [notes, setNotes] = useState<string>(initialData?.notes ?? '');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const initialized = useRef(false);

  // Sync state if initialData changes
  useEffect(() => {
    if (!initialized.current && initialData) {
      setPain(initialData.pain);
      setReflux(initialData.reflux);
      setWalkedToday(initialData.walkedToday);
      setStrengthToday(initialData.strengthToday);
      setSleepHours(initialData.sleepHours);
      setSittingBreaksActual(initialData.sittingBreaksActual);
      setNotes(initialData.notes ?? '');
      initialized.current = true;
    }
  }, [initialData]);

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
          sleepHours: Number(sleepHours) || 0,
          sittingBreaksActual: Number(sittingBreaksActual) || 0,
          sittingBreaksTarget,
          notes: notes.trim() === '' ? null : notes,
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Pain Level Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label htmlFor="pain-range" className="text-[17px] font-semibold text-text-primary">
            Pain
          </label>
          <span className="text-xl font-mono font-bold text-text-primary">{pain}/10</span>
        </div>
        <div className="relative pt-2 pb-2">
          <input
            id="pain-range"
            type="range"
            min="0"
            max="10"
            value={pain}
            onChange={(e) => setPain(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-full cursor-pointer appearance-none bg-bg-input accent-accent-purple"
            style={{
              background: `linear-gradient(to right, var(--color-accent-purple) ${(pain / 10) * 100}%, var(--color-bg-input) ${(pain / 10) * 100}%)`
            }}
          />
          <style jsx>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              height: 24px;
              width: 24px;
              border-radius: 50%;
              background: white;
              cursor: pointer;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
          `}</style>
        </div>
      </div>

      {/* Reflux Severity Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label htmlFor="reflux-range" className="text-[17px] font-semibold text-text-primary">
            Reflux
          </label>
          <span className="text-xl font-mono font-bold text-text-primary">{reflux}/10</span>
        </div>
        <div className="relative pt-2 pb-2">
          <input
            id="reflux-range"
            type="range"
            min="0"
            max="10"
            value={reflux}
            onChange={(e) => setReflux(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-full cursor-pointer appearance-none bg-bg-input accent-accent-purple"
            style={{
              background: `linear-gradient(to right, var(--color-accent-purple) ${(reflux / 10) * 100}%, var(--color-bg-input) ${(reflux / 10) * 100}%)`
            }}
          />
        </div>
      </div>

      {/* Activities Toggle Pills */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <button
          id="walk-yes-btn"
          type="button"
          onClick={() => setWalkedToday(!walkedToday)}
          className={`flex items-center justify-center gap-2 h-[56px] rounded-full border text-[15px] font-medium transition-all ${
            walkedToday
              ? 'bg-text-primary text-bg-primary border-text-primary'
              : 'bg-bg-input text-text-secondary border-border hover:border-border-focus'
          }`}
        >
          {walkedToday && <Check size={18} strokeWidth={3} />} Walked
        </button>
        <button
          id="strength-yes-btn"
          type="button"
          onClick={() => setStrengthToday(!strengthToday)}
          className={`flex items-center justify-center gap-2 h-[56px] rounded-full border text-[15px] font-medium transition-all ${
            strengthToday
              ? 'bg-text-primary text-bg-primary border-text-primary'
              : 'bg-bg-input text-text-secondary border-border hover:border-border-focus'
          }`}
        >
          {strengthToday && <Check size={18} strokeWidth={3} />} Lifted
        </button>
      </div>

      {/* Sleep and Sitting Breaks Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col justify-between h-[100px]">
          <label htmlFor="sleep-input" className="block text-[15px] font-medium text-text-secondary">
            Sleep
          </label>
          <div className="flex items-center gap-2 mt-auto">
            <input
              id="sleep-input"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="bg-transparent border-none text-2xl font-mono font-bold text-text-primary w-20 outline-none p-0 focus:ring-0"
            />
            <span className="text-text-secondary text-lg">h</span>
          </div>
        </div>

        <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col justify-between h-[100px]">
          <label htmlFor="breaks-input" className="block text-[15px] font-medium text-text-secondary">
            Sitting Breaks
          </label>
          <div className="flex items-center gap-1 mt-auto">
            <input
              id="breaks-input"
              type="number"
              min="0"
              value={sittingBreaksActual}
              onChange={(e) => setSittingBreaksActual(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="bg-transparent border-none text-2xl font-mono font-bold text-text-primary w-14 outline-none p-0 focus:ring-0 text-right"
            />
            <span className="text-text-secondary text-lg font-mono">/ {sittingBreaksTarget}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        <label htmlFor="notes-input" className="block text-[15px] font-medium text-text-secondary p-4 pb-2">
          Notes
        </label>
        <textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did you feel today?"
          className="w-full bg-transparent border-none text-text-primary outline-none resize-none text-[15px] p-4 pt-0 focus:ring-0 min-h-[80px]"
        />
      </div>

      {/* Feedback State */}
      {error && (
        <div id="checkin-error" className="text-accent-red text-sm font-mono bg-accent-red/10 border border-accent-red/20 rounded-xl p-4">
          {error}
        </div>
      )}
      {success && (
        <div id="checkin-success" className="text-accent-green text-sm font-mono bg-accent-green/10 border border-accent-green/20 rounded-xl p-4">
          ✓ Daily check-in saved successfully.
        </div>
      )}

      {/* Submit Button */}
      <button
        id="checkin-save-btn"
        type="submit"
        disabled={isLoading}
        className={`w-full h-[56px] rounded-full font-semibold text-[17px] text-bg-primary bg-accent-purple hover:opacity-90 active:opacity-80 transition-all cursor-pointer ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? 'Saving...' : 'Save Check-In'}
      </button>
    </form>
  );
}

