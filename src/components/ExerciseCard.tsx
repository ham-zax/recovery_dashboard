'use client';

import { Plus, Trash2 } from 'lucide-react';

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
    <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
      <h3 className="text-[15px] font-semibold text-text-primary mb-3 font-sans tracking-tight">
        {exercise.name}
      </h3>
      
      <div className="w-full mb-4">
        {/* Header row */}
        <div className="grid grid-cols-[30px_1fr_1fr_1fr_30px] gap-2 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          <div>Set</div>
          <div className="text-center">kg</div>
          <div className="text-center">Reps</div>
          <div className="text-center">RPE</div>
          <div></div>
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {sets.map((set, idx) => {
            const lastSet = lastSession?.[idx];
            return (
              <div key={idx} className="grid grid-cols-[30px_1fr_1fr_1fr_30px] gap-2 items-center px-2 py-1.5 hover:bg-bg-card-hover rounded-lg group transition-colors">
                <div className="text-[13px] font-mono text-text-secondary">{idx + 1}</div>
                
                <input 
                  id={`weight-input-${exercise.id}-${idx}`}
                  type="number"
                  step="2.5"
                  min="0"
                  value={set.weight !== null ? set.weight : ''}
                  onChange={(e) => handleWeightChange(idx, e.target.value)}
                  placeholder={lastSet?.weight != null ? String(lastSet.weight) : '--'}
                  className="w-full bg-bg-input border border-border rounded-md px-2 py-1.5 text-center font-mono text-[13px] text-text-primary outline-none focus:border-border-focus placeholder:text-text-tertiary/40"
                />

                <input 
                  id={`reps-input-${exercise.id}-${idx}`}
                  type="number"
                  step="1"
                  min="0"
                  value={set.reps === 0 && set.weight === null ? '' : set.reps}
                  onChange={(e) => handleRepsChange(idx, e.target.value)}
                  placeholder={lastSet?.reps != null ? String(lastSet.reps) : '0'}
                  className="w-full bg-bg-input border border-border rounded-md px-2 py-1.5 text-center font-mono text-[13px] text-text-primary outline-none focus:border-border-focus placeholder:text-text-tertiary/40"
                />

                <input 
                  id={`rpe-input-${exercise.id}-${idx}`}
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={set.rpe !== null ? set.rpe : ''}
                  onChange={(e) => handleRpeChange(idx, e.target.value)}
                  placeholder={lastSet?.rpe != null ? String(lastSet.rpe) : '--'}
                  className="w-full bg-bg-input border border-border rounded-md px-2 py-1.5 text-center font-mono text-[13px] text-text-primary outline-none focus:border-border-focus placeholder:text-text-tertiary/40"
                />

                <div className="flex justify-end">
                  {sets.length > 1 && (
                    <button 
                      id={`remove-set-btn-${exercise.id}-${idx}`}
                      type="button" 
                      onClick={() => removeSet(idx)} 
                      className="text-text-tertiary hover:text-accent-red opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                      title="Remove set"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/40">
        <span className="text-[11px] text-text-tertiary font-mono">
          Last session: {formatLastSession(lastSession)}
        </span>
        <button
          id={`add-set-btn-${exercise.id}`}
          type="button"
          onClick={addSet}
          className="flex items-center justify-center sm:w-auto w-full text-xs font-mono font-medium text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 px-3 py-1.5 rounded-md transition-colors cursor-pointer touch-manipulation"
        >
          <Plus size={14} className="mr-1" /> Add Set
        </button>
      </div>
    </div>
  );
}
