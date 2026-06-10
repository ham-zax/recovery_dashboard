'use client';

import { Plus, Trash2 } from 'lucide-react';
import { parseBoundedInt, parseBoundedFloat } from '@/lib/validation';

export interface SetData {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

interface ExerciseCardProps {
  exercise: { id: number; name: string };
  sets: SetData[];
  lastSession?: { date: string; sets: SetData[] } | null;
  onChange: (sets: SetData[]) => void;
}

export function ExerciseCard({ exercise, sets, lastSession, onChange }: ExerciseCardProps) {
  
  const handleWeightChange = (index: number, val: string) => {
    const num = val === '' ? null : parseBoundedFloat(val, 0, undefined, 0);
    const newSets = [...sets];
    newSets[index].weight = num;
    onChange(newSets);
  };

  const handleRepsChange = (index: number, val: string) => {
    const num = val === '' ? null : parseBoundedInt(val, 0, undefined, 0);
    const newSets = [...sets];
    newSets[index].reps = num;
    onChange(newSets);
  };

  const handleRpeChange = (index: number, val: string) => {
    const num = val === '' ? null : parseBoundedInt(val, 1, 10, 5);
    const newSets = [...sets];
    newSets[index].rpe = num;
    onChange(newSets);
  };

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSet: SetData = lastSet 
      ? { weight: lastSet.weight, reps: lastSet.reps, rpe: lastSet.rpe } 
      : { weight: null, reps: null, rpe: null };
    onChange([...sets, newSet]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    const newSets = sets.filter((_, idx) => idx !== index);
    onChange(newSets);
  };

  // Helper to format last session's sets
  const formatLastSessionSets = (prevSets: SetData[]): string => {
    if (!prevSets || prevSets.length === 0) return 'No previous data';
    
    const weights = prevSets.map(s => s.weight);
    const allWeightsSame = weights.every(w => w === weights[0]);
    const rpes = prevSets.map(s => s.rpe).filter((r): r is number => r !== null);
    
    if (allWeightsSame && weights[0] !== null) {
      const repsStr = prevSets.map(s => s.reps).join(', ');
      const rpeStr = rpes.length > 0 ? ` @ ${rpes[0]}` : ''; // Just show first RPE if all same weight
      return `${weights[0]}kg × ${repsStr}${rpeStr}`;
    } else {
      return prevSets.map((s, idx) => {
        const wStr = s.weight !== null ? `${s.weight}kg` : '--';
        const rpeStr = s.rpe !== null ? `@${s.rpe}` : '';
        return `S${idx + 1}: ${wStr}×${s.reps}${rpeStr ? ' ' + rpeStr : ''}`;
      }).join(', ');
    }
  };

  const handleCopyLast = () => {
    if (lastSession && lastSession.sets.length > 0) {
      onChange([...lastSession.sets.map(s => ({ ...s }))]);
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
            const lastSet = lastSession?.sets[idx];
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
                  className="w-full bg-bg-input border border-border rounded-md px-2 py-2 min-h-[40px] text-center font-mono text-[16px] md:text-[13px] text-text-primary outline-none focus:border-border-focus placeholder:text-text-tertiary/40 transition-colors"
                />

                <input 
                  id={`reps-input-${exercise.id}-${idx}`}
                  type="number"
                  step="1"
                  min="0"
                  value={set.reps !== null ? set.reps : ''}
                  onChange={(e) => handleRepsChange(idx, e.target.value)}
                  placeholder={lastSet?.reps != null ? String(lastSet.reps) : '--'}
                  className="w-full bg-bg-input border border-border rounded-md px-2 py-2 min-h-[40px] text-center font-mono text-[16px] md:text-[13px] text-text-primary outline-none focus:border-border-focus placeholder:text-text-tertiary/40 transition-colors"
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
                  className="w-full bg-bg-input border border-border rounded-md px-2 py-2 min-h-[40px] text-center font-mono text-[16px] md:text-[13px] text-text-primary outline-none focus:border-border-focus placeholder:text-text-tertiary/40 transition-colors"
                />

                <div className="flex justify-end">
                  {sets.length > 1 && (
                    <button 
                      id={`remove-set-btn-${exercise.id}-${idx}`}
                      type="button" 
                      onClick={() => removeSet(idx)} 
                      className="text-text-tertiary hover:text-accent-red opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center h-11 w-11 cursor-pointer rounded-md hover:bg-accent-red/10"
                      title="Remove set"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/40">
        <div className="flex-1 flex flex-col gap-1">
          {lastSession && lastSession.sets.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-text-tertiary">Last Session</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-text-secondary font-mono">
                  {formatLastSessionSets(lastSession.sets)}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  ({new Date(lastSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                </span>
                <button
                  type="button"
                  onClick={handleCopyLast}
                  className="ml-2 text-[10px] sm:text-[11px] uppercase tracking-wide font-bold text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 px-3 min-h-[36px] sm:min-h-[28px] rounded-md cursor-pointer transition-colors flex items-center justify-center"
                >
                  Copy Last
                </button>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-text-tertiary font-mono">No previous data</span>
          )}
        </div>
        <button
          id={`add-set-btn-${exercise.id}`}
          type="button"
          onClick={addSet}
          className="flex items-center justify-center sm:w-auto w-full text-sm sm:text-xs font-mono font-medium text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 px-4 min-h-[44px] sm:min-h-[32px] rounded-md transition-colors cursor-pointer touch-manipulation"
        >
          <Plus size={16} className="mr-1 sm:w-3.5 sm:h-3.5" /> Add Set
        </button>
      </div>
    </div>
  );
}
