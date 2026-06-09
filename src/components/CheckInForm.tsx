'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Minus } from 'lucide-react';
import { clampNumber } from '@/lib/validation';

interface StepperInputProps {
  id?: string;
  value: number | string | null;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
}

const StepperInput = ({ id, value, onChange, min = 0, max, step = 1 }: StepperInputProps) => {
  const handleMinus = () => {
    const current = value === null || value === '' ? min : Number(value);
    const next = Math.max(min, current - step);
    const fixedNext = Number(next.toFixed(2));
    onChange(fixedNext.toString());
  };
  
  const handlePlus = () => {
    const current = value === null || value === '' ? min : Number(value);
    const next = max !== undefined ? Math.min(max, current + step) : current + step;
    const fixedNext = Number(next.toFixed(2));
    onChange(fixedNext.toString());
  };

  return (
    <div className="flex items-center h-[56px] w-full bg-bg-input border border-border rounded-xl overflow-hidden focus-within:border-border-focus">
      <button 
        type="button" 
        onClick={handleMinus}
        className="px-5 h-full text-text-secondary hover:text-text-primary bg-bg-card active:bg-bg-card-hover active:scale-95 touch-manipulation transition-all"
      >
        <Minus size={20} />
      </button>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value !== null && value !== undefined ? value : ''}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onBlur={(e) => {
          const val = e.target.value;
          if (val !== '') {
            const num = Number(val);
            if (!isNaN(num)) {
              onChange(String(clampNumber(num, min, max)));
            } else {
              onChange(String(min ?? 0));
            }
          }
        }}
        className="flex-1 min-w-[40px] w-full text-center bg-transparent text-text-primary font-mono text-xl font-bold outline-none placeholder:text-text-tertiary"
        placeholder="0"
      />
      <button 
        type="button" 
        onClick={handlePlus}
        className="px-5 h-full text-text-secondary hover:text-text-primary bg-bg-card active:bg-bg-card-hover active:scale-95 touch-manipulation transition-all"
      >
        <Plus size={20} />
      </button>
    </div>
  );
};

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
  dateStr: string;
}

export function CheckInForm({ initialData, sittingBreaksTarget, dateStr }: CheckInFormProps) {
  const router = useRouter();
  const [pain, setPain] = useState<string>(String(initialData?.pain ?? 5));
  const [reflux, setReflux] = useState<string>(String(initialData?.reflux ?? 5));
  const [walkedToday, setWalkedToday] = useState<boolean>(initialData?.walkedToday ?? false);
  const [strengthToday, setStrengthToday] = useState<boolean>(initialData?.strengthToday ?? false);
  const [sleepHours, setSleepHours] = useState<string>(initialData?.sleepHours !== undefined ? String(initialData.sleepHours) : '8');
  const [sittingBreaksActual, setSittingBreaksActual] = useState<string>(initialData?.sittingBreaksActual !== undefined ? String(initialData.sittingBreaksActual) : '0');
  const [notes, setNotes] = useState<string>(initialData?.notes ?? '');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const initialized = useRef(false);

  // Sync state if initialData changes
  useEffect(() => {
    if (!initialized.current && initialData) {
      setPain(String(initialData.pain));
      setReflux(String(initialData.reflux));
      setWalkedToday(initialData.walkedToday);
      setStrengthToday(initialData.strengthToday);
      setSleepHours(String(initialData.sleepHours));
      setSittingBreaksActual(String(initialData.sittingBreaksActual));
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
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateStr,
          pain: Number(pain) || 0,
          reflux: Number(reflux) || 0,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Pain Level */}
        <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col justify-between h-[120px]">
          <label htmlFor="pain-input" className="block text-[15px] font-medium text-text-secondary mb-2">
            Pain (0-10)
          </label>
          <StepperInput
            id="pain-input"
            min={0}
            max={10}
            step={1}
            value={pain}
            onChange={(v) => setPain(v)}
          />
        </div>

        {/* Reflux Level */}
        <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col justify-between h-[120px]">
          <label htmlFor="reflux-input" className="block text-[15px] font-medium text-text-secondary mb-2">
            Reflux (0-10)
          </label>
          <StepperInput
            id="reflux-input"
            min={0}
            max={10}
            step={1}
            value={reflux}
            onChange={(v) => setReflux(v)}
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
        <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col justify-between h-[120px]">
          <label htmlFor="sleep-input" className="block text-[15px] font-medium text-text-secondary mb-2">
            Sleep (h)
          </label>
          <StepperInput
            id="sleep-input"
            min={0}
            max={24}
            step={0.5}
            value={sleepHours}
            onChange={(v) => setSleepHours(v)}
          />
        </div>

        <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col justify-between h-[120px]">
          <label htmlFor="breaks-input" className="block text-[15px] font-medium text-text-secondary mb-2">
            Breaks / {sittingBreaksTarget}
          </label>
          <StepperInput
            id="breaks-input"
            min={0}
            step={1}
            value={sittingBreaksActual}
            onChange={(v) => setSittingBreaksActual(v)}
          />
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

