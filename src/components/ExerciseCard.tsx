'use client';

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
    <div className="bg-bg-card border border-border rounded-xl p-5 hover:border-border-focus transition-colors">
      <h3 className="text-base font-semibold text-text-primary mb-4 font-sans tracking-tight">
        {exercise.name}
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse mb-4">
          <thead>
            <tr className="border-b border-border text-[11px] font-mono uppercase tracking-wider text-text-tertiary">
              <th className="py-2 w-16 text-center">Set</th>
              <th className="py-2 px-3">Weight (kg)</th>
              <th className="py-2 px-3">Reps</th>
              <th className="py-2 px-3">RPE</th>
              <th className="py-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sets.map((set, idx) => (
              <tr key={idx} className="group">
                <td className="py-3 text-center font-mono text-text-secondary">
                  {idx + 1}
                </td>
                <td className="py-2 px-3">
                  <input
                    id={`weight-input-${exercise.id}-${idx}`}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="--"
                    value={set.weight !== null ? set.weight : ''}
                    onChange={(e) => handleWeightChange(idx, e.target.value)}
                    className="w-full bg-bg-input border border-border focus:border-border-focus text-text-primary font-mono text-sm rounded px-2.5 py-1.5 outline-none"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    id={`reps-input-${exercise.id}-${idx}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={set.reps === 0 && set.weight === null ? '' : set.reps}
                    onChange={(e) => handleRepsChange(idx, e.target.value)}
                    className="w-full bg-bg-input border border-border focus:border-border-focus text-text-primary font-mono text-sm rounded px-2.5 py-1.5 outline-none"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    id={`rpe-input-${exercise.id}-${idx}`}
                    type="number"
                    min="1"
                    max="10"
                    placeholder="--"
                    value={set.rpe !== null ? set.rpe : ''}
                    onChange={(e) => handleRpeChange(idx, e.target.value)}
                    className="w-full bg-bg-input border border-border focus:border-border-focus text-text-primary font-mono text-sm rounded px-2.5 py-1.5 outline-none"
                  />
                </td>
                <td className="py-2 text-center">
                  {sets.length > 1 && (
                    <button
                      id={`remove-set-btn-${exercise.id}-${idx}`}
                      type="button"
                      onClick={() => removeSet(idx)}
                      className="text-text-tertiary hover:text-accent-red transition-colors text-xs font-mono p-1 rounded hover:bg-bg-card-hover cursor-pointer"
                      title="Remove set"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/40">
        <span className="text-xs text-text-tertiary font-mono">
          Last session: {formatLastSession(lastSession)}
        </span>
        <button
          id={`add-set-btn-${exercise.id}`}
          type="button"
          onClick={addSet}
          className="self-start sm:self-auto text-xs font-mono font-medium text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 px-2.5 py-1 rounded transition-colors cursor-pointer"
        >
          + Add Set
        </button>
      </div>
    </div>
  );
}
