'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExerciseCard, SetData } from './ExerciseCard';
import { SegmentedControl } from './ui/SegmentedControl';

interface Exercise {
  id: number;
  name: string;
  category: string;
  sortOrder: number;
  active: boolean;
}

interface WorkoutFormProps {
  exercises: Exercise[];
  lastSessions: Record<number, { date: string; sets: SetData[] } | null>;
}

export function WorkoutForm({ exercises, lastSessions }: WorkoutFormProps) {
  const router = useRouter();
  const [workoutType, setWorkoutType] = useState<'LOWER' | 'UPPER'>('LOWER');
  
  // Start with empty string for deterministic SSR/hydration.
  // This ensures that the server-rendered HTML and first client paint match.
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    // We intentionally update the date state on mount to match the user's local timezone.
    // This is safe because hydration has completed, and it correctly resolves timezone differences
    // between the server and the client without causing hydration warnings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(new Date().toLocaleDateString('en-CA'));
  }, []);

  const [notes, setNotes] = useState<string>('');
  
  // Keep state for all exercise sets
  const [workoutSets, setWorkoutSets] = useState<Record<number, SetData[]>>(() => {
    const initial: Record<number, SetData[]> = {};
    exercises.forEach((ex) => {
      initial[ex.id] = [
        { weight: null, reps: null, rpe: null },
        { weight: null, reps: null, rpe: null },
        { weight: null, reps: null, rpe: null },
      ];
    });
    return initial;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter exercises for active category
  const activeCategoryExercises = exercises
    .filter((ex) => ex.category === workoutType)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSetChange = (exerciseId: number, sets: SetData[]) => {
    setWorkoutSets((prev) => ({
      ...prev,
      [exerciseId]: sets,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare payload: only send exercises from the selected category that have logged sets
      const exercisesPayload = activeCategoryExercises
        .map((ex) => {
          const sets = workoutSets[ex.id] || [];
          // A set is valid if it has positive reps.
          // Weight can be null, RPE can be null, but reps is required and must be > 0.
          const validSets = sets.filter((s) => s.reps !== null && s.reps > 0);
          return {
            exerciseId: ex.id,
            sets: validSets.map((s) => ({
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
            })),
          };
        })
        .filter((ex) => ex.sets.length > 0);

      if (exercisesPayload.length === 0) {
        throw new Error('Please log at least one set with reps > 0.');
      }

      const response = await fetch('/api/workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          type: workoutType,
          notes: notes.trim() || null,
          exercises: exercisesPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save workout session.');
      }

      toast.success('Workout logged');
      setNotes('');
      
      // Reset sets to default
      setWorkoutSets((prev) => {
        const reset: Record<number, SetData[]> = { ...prev };
        exercises.forEach((ex) => {
          reset[ex.id] = [
            { weight: null, reps: null, rpe: null },
            { weight: null, reps: null, rpe: null },
            { weight: null, reps: null, rpe: null },
          ];
        });
        return reset;
      });

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Date & Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="workout-date" className="block text-sm font-medium text-text-secondary mb-2">
            Workout Date
          </label>
          <input
            id="workout-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg-input border border-border text-text-primary rounded-lg px-3 py-2 font-mono focus:border-border-focus outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Workout Type
          </label>
          <SegmentedControl
            options={[
              { label: 'Lower Body', value: 'LOWER' },
              { label: 'Upper Body', value: 'UPPER' },
            ]}
            value={workoutType}
            onChange={(val) => setWorkoutType(val as 'LOWER' | 'UPPER')}
          />
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-mono uppercase tracking-wider text-text-secondary">
            {workoutType} Exercises
          </h2>
          <span className="text-xs text-text-tertiary font-mono">
            {activeCategoryExercises.length} Active
          </span>
        </div>
        
        {activeCategoryExercises.length === 0 ? (
          <div className="text-center py-8 bg-bg-card border border-border border-dashed rounded-xl">
            <p className="text-text-tertiary text-sm font-mono">No active exercises found for this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeCategoryExercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                sets={workoutSets[ex.id] || []}
                lastSession={lastSessions[ex.id]}
                onChange={(sets) => handleSetChange(ex.id, sets)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Session Notes */}
      <div className="pt-4 border-t border-border">
        <label htmlFor="workout-notes" className="block text-sm font-medium text-text-secondary mb-2">
          Session Notes (Optional)
        </label>
        <textarea
          id="workout-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did the workout feel? Any specific symptoms, energy levels, or adjustment notes?"
          className="w-full bg-bg-input border border-border text-text-primary rounded-lg px-3 py-2 h-20 focus:border-border-focus outline-none resize-none text-sm placeholder-text-tertiary"
        />
      </div>

      <div className="pt-6 border-t border-border mt-8 flex flex-col items-center">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full max-w-sm h-14 rounded-full font-bold text-[17px] text-bg-primary transition-all flex items-center justify-center gap-2 shadow-lg ${
            isLoading 
              ? 'bg-accent-purple opacity-50 cursor-not-allowed' 
              : 'bg-accent-purple hover:bg-opacity-90 active:scale-[0.98]'
          }`}
        >
          {isLoading ? 'Saving Session...' : 'Log Workout'}
        </button>
      </div>
    </form>
  );
}
