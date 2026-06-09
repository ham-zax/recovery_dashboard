'use client';

import { Plus, Minus, Trash2 } from 'lucide-react';

export interface SetData {
  weight: number | null;
  reps: number;
  rpe: number | null;
}

interface ExerciseCardProps {
  exercise: { id: number; name: string };
  sets: SetData[];
  lastSession?: SetData[] | null;
  onChange: (sets: SetData[]) => void;
}

interface StepperInputProps {
  id?: string;
  value: number | string | null;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

const StepperInput = ({ id, value, onChange, min = 0, max, step = 1, placeholder }: StepperInputProps) => {
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
    <div className="flex items-center h-[44px] bg-bg-input border border-border rounded-lg overflow-hidden focus-within:border-border-focus">
      <button 
        type="button" 
        onClick={handleMinus}
        className="px-3 h-full text-text-secondary hover:text-text-primary bg-bg-card border-r border-border active:bg-bg-card-hover touch-manipulation"
      >
        <Minus size={14} />
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value !== null && value !== undefined ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full text-center bg-transparent text-text-primary font-mono text-sm outline-none placeholder:text-text-tertiary/50"
      />
      <button 
        type="button" 
        onClick={handlePlus}
        className="px-3 h-full text-text-secondary hover:text-text-primary bg-bg-card border-l border-border active:bg-bg-card-hover touch-manipulation"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export function ExerciseCard({ exercise, sets, lastSession, onChange }: ExerciseCardProps) {
  
  const handleWeightChange = (index: number, val: string) => {
    const newSets = [...sets];
    newSets[index].weight = val === '' ? null : parseFloat(val);
    onChange(newSets);
  };

  const handleRepsChange = (index: number, val: string) => {
    const newSets = [...sets];
    newSets[index].reps = val === '' ? 0 : parseInt(val, 10);
    onChange(newSets);
  };

  const handleRpeChange = (index: number, val: string) => {
    const newSets = [...sets];
    newSets[index].rpe = val === '' ? null : parseInt(val, 10);
    onChange(newSets);
  };

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSet: SetData = lastSet 
      ? { weight: lastSet.weight, reps: lastSet.reps, rpe: lastSet.rpe } 
      : { weight: null, reps: 10, rpe: null };
    onChange([...sets, newSet]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    const newSets = sets.filter((_, idx) => idx !== index);
    onChange(newSets);
  };

  // Helper to format last session's sets
  const formatLastSession = (prevSets: SetData[] | null | undefined): string => {
    if (!prevSets || prevSets.length === 0) return 'No previous data';
    
    const weights = prevSets.map(s => s.weight);
    const allWeightsSame = weights.every(w => w === weights[0]);
    const rpes = prevSets.map(s => s.rpe).filter((r): r is number => r !== null);
    
    if (allWeightsSame && weights[0] !== null) {
      const repsStr = prevSets.map(s => s.reps).join(', ');
      const rpeStr = rpes.length > 0 ? ` @ RPE ${rpes.join(', ')}` : '';
      return `${weights[0]}kg × ${repsStr}${rpeStr}`;
    } else {
      return prevSets.map((s, idx) => {
        const wStr = s.weight !== null ? `${s.weight}kg` : '--';
        const rpeStr = s.rpe !== null ? `@RPE ${s.rpe}` : '';
        return `S${idx + 1}: ${wStr}×${s.reps}${rpeStr ? ' ' + rpeStr : ''}`;
      }).join(', ');
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-text-primary mb-4 font-sans tracking-tight">
        {exercise.name}
      </h3>
      
      <div className="space-y-4 mb-4">
        {sets.map((set, idx) => {
          const lastSet = lastSession?.[idx];
          return (
            <div key={idx} className="bg-bg-primary p-3 rounded-lg border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-text-secondary">Set {idx + 1}</span>
                {sets.length > 1 && (
                  <button
                    id={`remove-set-btn-${exercise.id}-${idx}`}
                    type="button"
                    onClick={() => removeSet(idx)}
                    className="text-text-tertiary hover:text-accent-red p-1 rounded transition-colors"
                    title="Remove set"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Weight */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Weight (kg)</label>
                  <StepperInput
                    id={`weight-input-${exercise.id}-${idx}`}
                    value={set.weight}
                    onChange={(v) => handleWeightChange(idx, v)}
                    placeholder={lastSet?.weight !== null && lastSet?.weight !== undefined ? String(lastSet.weight) : '--'}
                    min={0}
                    step={2.5}
                  />
                </div>
                {/* Reps */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Reps</label>
                  <StepperInput
                    id={`reps-input-${exercise.id}-${idx}`}
                    value={set.reps === 0 && set.weight === null ? '' : set.reps}
                    onChange={(v) => handleRepsChange(idx, v)}
                    placeholder={lastSet?.reps !== null && lastSet?.reps !== undefined ? String(lastSet.reps) : '0'}
                    min={0}
                    step={1}
                  />
                </div>
                {/* RPE */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1">RPE</label>
                  <StepperInput
                    id={`rpe-input-${exercise.id}-${idx}`}
                    value={set.rpe}
                    onChange={(v) => handleRpeChange(idx, v)}
                    placeholder={lastSet?.rpe !== null && lastSet?.rpe !== undefined ? String(lastSet.rpe) : '--'}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
        <span className="text-xs text-text-tertiary font-mono">
          Last session: {formatLastSession(lastSession)}
        </span>
        <button
          id={`add-set-btn-${exercise.id}`}
          type="button"
          onClick={addSet}
          className="flex items-center justify-center sm:w-auto w-full text-xs font-mono font-medium text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 px-3 py-2 rounded-lg transition-colors cursor-pointer touch-manipulation"
        >
          <Plus size={14} className="mr-1" /> Add Set
        </button>
      </div>
    </div>
  );
}
