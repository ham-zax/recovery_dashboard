'use client';

import React, { useState, useEffect } from 'react';

interface Exercise {
  id: number;
  name: string;
  category: 'LOWER' | 'UPPER';
  sortOrder: number;
  active: boolean;
}

interface ScoreWeights {
  walking: number;
  strength: number;
  sleep: number;
  sitting: number;
  checkins: number;
}

interface WorkoutSchedule {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

export function SettingsContent() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [lock, setLock] = useState<{ version: string; lockedUntil: string; description: string } | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');

  // Exercises Form state
  const [newExerciseName, setNewExerciseName] = useState<string>('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<'LOWER' | 'UPPER'>('LOWER');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState<string>('');
  const [editingExerciseCategory, setEditingExerciseCategory] = useState<'LOWER' | 'UPPER'>('LOWER');

  // Protocol Lock form state
  const [lockVersion, setLockVersion] = useState<string>('v1.0');
  const [lockDate, setLockDate] = useState<string>('');
  const [lockDescription, setLockDescription] = useState<string>('Execute one protocol consistently.');

  // Parse state helper
  const getWeights = (): ScoreWeights => {
    try {
      if (settings.recovery_score_weights) {
        return JSON.parse(settings.recovery_score_weights);
      }
    } catch {
      // fallback
    }
    return { walking: 30, strength: 25, sleep: 20, sitting: 15, checkins: 10 };
  };

  const getSchedule = (): WorkoutSchedule => {
    try {
      if (settings.workout_schedule) {
        return JSON.parse(settings.workout_schedule);
      }
    } catch {
      // fallback
    }
    return { mon: 'REST', tue: 'REST', wed: 'REST', thu: 'REST', fri: 'REST', sat: 'REST', sun: 'REST' };
  };

  const isProtocolLocked = () => {
    if (!lock) return false;
    return new Date(lock.lockedUntil) > new Date();
  };

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetches
      const [settingsRes, exercisesRes] = await Promise.all([
        fetch('/recovery/api/settings'),
        fetch('/recovery/api/exercises'),
      ]);

      if (!settingsRes.ok || !exercisesRes.ok) {
        throw new Error('Failed to load settings or exercises');
      }

      const settingsData = await settingsRes.json();
      const exercisesData = await exercisesRes.json();

      setSettings(settingsData.settings);
      setLock(settingsData.protocolLock);
      setExercises(exercisesData);

      if (settingsData.protocolLock) {
        setLockVersion(settingsData.protocolLock.version);
        setLockDate(settingsData.protocolLock.lockedUntil.split('T')[0]);
        setLockDescription(settingsData.protocolLock.description ?? '');
      } else {
        // default lock date: 6 weeks from today
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 42);
        setLockDate(defaultDate.toISOString().split('T')[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (active) {
      const timer = setTimeout(() => {
        loadAll();
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [loadAll]);

  const handleUpdateSetting = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUpdateWeight = (key: keyof ScoreWeights, value: number) => {
    const currentWeights = getWeights();
    currentWeights[key] = value;
    handleUpdateSetting('recovery_score_weights', JSON.stringify(currentWeights));
  };

  const handleUpdateSchedule = (day: keyof WorkoutSchedule, value: string) => {
    const currentSchedule = getSchedule();
    currentSchedule[day] = value;
    handleUpdateSetting('workout_schedule', JSON.stringify(currentSchedule));
  };

  const handleSaveSettings = async () => {
    // Validate weights sum to 100
    const w = getWeights();
    const sum = w.walking + w.strength + w.sleep + w.sitting + w.checkins;
    if (sum !== 100) {
      setSaveStatus('error');
      setSaveErrorMessage(`Recovery Score weights must sum to exactly 100%. Currently: ${sum}%`);
      return;
    }

    setSaveStatus('saving');
    setSaveErrorMessage('');
    try {
      const res = await fetch('/recovery/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? 'Failed to save settings');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      loadAll();
    } catch (err) {
      setSaveStatus('error');
      setSaveErrorMessage(err instanceof Error ? err.message : 'Error saving settings');
    }
  };

  const handleSaveLock = async () => {
    if (!lockDate) {
      alert('Please specify a lock date.');
      return;
    }
    setSaveStatus('saving');
    setSaveErrorMessage('');
    try {
      const res = await fetch('/recovery/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolLock: {
            version: lockVersion,
            lockedUntil: new Date(lockDate).toISOString(),
            description: lockDescription,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? 'Failed to lock protocol');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      loadAll();
    } catch (err) {
      setSaveStatus('error');
      setSaveErrorMessage(err instanceof Error ? err.message : 'Error locking protocol');
    }
  };

  // Exercises CRUD
  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) return;

    try {
      const res = await fetch('/recovery/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExerciseName.trim(),
          category: newExerciseCategory,
        }),
      });

      if (!res.ok) throw new Error('Failed to add exercise');

      setNewExerciseName('');
      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding exercise');
    }
  };

  const handleStartEditExercise = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setEditingExerciseName(ex.name);
    setEditingExerciseCategory(ex.category);
  };

  const handleSaveEditExercise = async (id: number) => {
    if (!editingExerciseName.trim()) return;
    try {
      const res = await fetch(`/recovery/api/exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingExerciseName.trim(),
          category: editingExerciseCategory,
        }),
      });

      if (!res.ok) throw new Error('Failed to update exercise');

      setEditingExerciseId(null);
      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving exercise');
    }
  };

  const handleDeactivateExercise = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this exercise? It will no longer show up in workout logs.')) return;
    try {
      const res = await fetch(`/recovery/api/exercises/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to deactivate exercise');

      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deactivating exercise');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-bg-card animate-pulse rounded-lg border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[300px] bg-bg-card animate-pulse rounded-xl border border-border" />
          <div className="h-[300px] bg-bg-card animate-pulse rounded-xl border border-border" />
          <div className="h-[400px] bg-bg-card animate-pulse rounded-xl border border-border col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-xl max-w-2xl mx-auto text-center mt-12">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-lg font-semibold text-text-primary mt-4">Failed to Load Settings</h3>
        <p className="text-sm text-text-secondary mt-2">{error}</p>
        <button
          onClick={loadAll}
          className="mt-6 px-4 py-2 bg-accent-purple text-bg-primary font-bold rounded-lg text-sm cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const w = getWeights();
  const sch = getSchedule();
  const locked = isProtocolLocked();
  const weightsSum = w.walking + w.strength + w.sleep + w.sitting + w.checkins;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
          <p className="text-xs text-text-secondary mt-1">Configure your recovery guidelines, schedules, and targets.</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-mono font-semibold select-none flex items-center gap-1.5 ${
          locked ? 'bg-accent-red/10 border border-accent-red/25 text-accent-red' : 'bg-accent-green/10 border border-accent-green/25 text-accent-green'
        }`}>
          <span>{locked ? '🚫 Protocol Locked' : '🔓 Protocol Changeable'}</span>
        </div>
      </div>

      {saveErrorMessage && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-lg text-sm font-mono">
          ⚠️ {saveErrorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Protocol Configuration & Lock Controls */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
              🔒 Protocol Lock Controls
            </h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Once locked, you cannot change the protocol start date, duration, score weights, or workout schedule until the lock expires.
            </p>

            <div className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                    Protocol Version
                  </label>
                  <input
                    type="text"
                    value={lockVersion}
                    onChange={(e) => setLockVersion(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-border-focus outline-none"
                    placeholder="e.g. v1.0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                    Lock Until Date
                  </label>
                  <input
                    type="date"
                    value={lockDate}
                    onChange={(e) => setLockDate(e.target.value)}
                    min={lock ? lock.lockedUntil.split('T')[0] : undefined}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-border-focus outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                  Lock Description / Focus
                </label>
                <input
                  type="text"
                  value={lockDescription}
                  onChange={(e) => setLockDescription(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-border-focus outline-none"
                  placeholder="e.g. Execute one protocol consistently for 12 weeks."
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleSaveLock}
                  disabled={saveStatus === 'saving'}
                  className="px-4 py-2 bg-accent-purple hover:bg-opacity-95 text-bg-primary font-bold rounded-lg text-xs transition-all cursor-pointer font-mono"
                >
                  {locked ? 'Extend Protocol Lock' : 'Lock Protocol Now'}
                </button>
                {lock && (
                  <span className="text-[10px] text-text-tertiary font-mono">
                    Current Lock: {new Date(lock.lockedUntil).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Daily Logging Targets */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
              🎯 Daily Log Targets
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                    Protocol Start Date
                  </label>
                  <input
                    type="date"
                    value={settings.protocol_start_date ?? ''}
                    disabled={locked}
                    onChange={(e) => handleUpdateSetting('protocol_start_date', e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-border-focus outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.protocol_duration_days ?? '84'}
                    disabled={locked}
                    onChange={(e) => handleUpdateSetting('protocol_duration_days', e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-border-focus outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                    Sitting Breaks Target
                  </label>
                  <input
                    type="number"
                    value={settings.sitting_breaks_target ?? '10'}
                    onChange={(e) => handleUpdateSetting('sitting_breaks_target', e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-border-focus outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1">
                    Weekly Review Day
                  </label>
                  <select
                    value={settings.weekly_review_day ?? 'sunday'}
                    onChange={(e) => handleUpdateSetting('weekly_review_day', e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-border-focus outline-none font-mono"
                  >
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
              </div>

              {!locked && (
                <div className="pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 bg-accent-blue hover:bg-opacity-95 text-bg-primary font-bold rounded-lg text-xs transition-all cursor-pointer font-mono"
                  >
                    Save Target Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recovery Score Weights */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                📊 Recovery Score Weights
              </h3>
              <span className={`text-xs font-mono font-bold ${weightsSum === 100 ? 'text-accent-green' : 'text-accent-red'}`}>
                Total: {weightsSum}% {weightsSum === 100 ? '✓' : '⚠️'}
              </span>
            </div>
            <div className="space-y-3 font-mono">
              {[
                { key: 'walking', label: 'Walking compliance weight' },
                { key: 'strength', label: 'Strength workout compliance weight' },
                { key: 'sleep', label: 'Sleep hours (8h target) weight' },
                { key: 'sitting', label: 'Sitting break compliance weight' },
                { key: 'checkins', label: 'Check-in completion rate weight' },
              ].map((item) => {
                const k = item.key as keyof ScoreWeights;
                return (
                  <div key={k} className="flex justify-between items-center gap-4">
                    <span className="text-xs text-text-secondary">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={w[k]}
                        disabled={locked}
                        onChange={(e) => handleUpdateWeight(k, parseInt(e.target.value) || 0)}
                        className="bg-bg-input border border-border rounded-lg px-2 py-1 w-16 text-center text-xs text-text-primary focus:border-border-focus outline-none disabled:opacity-50"
                      />
                      <span className="text-xs text-text-tertiary">%</span>
                    </div>
                  </div>
                );
              })}

              {!locked && (
                <div className="pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saveStatus === 'saving' || weightsSum !== 100}
                    className="px-4 py-2 bg-accent-blue hover:bg-opacity-95 disabled:opacity-40 text-bg-primary font-bold rounded-lg text-xs transition-all cursor-pointer font-mono"
                  >
                    Save Weight Formula
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Workout Schedule */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
              📅 Workout Schedule
            </h3>
            <div className="space-y-3 font-mono">
              {[
                { key: 'mon', label: 'Monday' },
                { key: 'tue', label: 'Tuesday' },
                { key: 'wed', label: 'Wednesday' },
                { key: 'thu', label: 'Thursday' },
                { key: 'fri', label: 'Friday' },
                { key: 'sat', label: 'Saturday' },
                { key: 'sun', label: 'Sunday' },
              ].map((day) => {
                const k = day.key as keyof WorkoutSchedule;
                return (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-xs text-text-secondary">{day.label}</span>
                    <select
                      value={sch[k]}
                      disabled={locked}
                      onChange={(e) => handleUpdateSchedule(k, e.target.value)}
                      className="bg-bg-input border border-border rounded-lg px-3 py-1 text-xs text-text-primary focus:border-border-focus outline-none disabled:opacity-50"
                    >
                      <option value="REST">REST Day</option>
                      <option value="LOWER">LOWER Body</option>
                      <option value="UPPER">UPPER Body</option>
                    </select>
                  </div>
                );
              })}

              {!locked && (
                <div className="pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 bg-accent-blue hover:bg-opacity-95 text-bg-primary font-bold rounded-lg text-xs transition-all cursor-pointer font-mono"
                  >
                    Save Schedule
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Exercise Management (CRUD) */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
              💪 Exercise Management
            </h3>

            {/* List active exercises */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {['LOWER', 'UPPER'].map((cat) => {
                const catExs = exercises.filter(e => e.category === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <span className="text-[10px] text-accent-purple font-semibold uppercase tracking-wider block">
                      {cat} Day Exercises ({catExs.length})
                    </span>
                    <div className="space-y-1">
                      {catExs.map((ex) => (
                        <div
                          key={ex.id}
                          className="flex justify-between items-center bg-bg-input border border-border p-2 rounded-lg hover:border-border-focus transition-colors"
                        >
                          {editingExerciseId === ex.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={editingExerciseName}
                                onChange={(e) => setEditingExerciseName(e.target.value)}
                                className="flex-1 bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary outline-none"
                              />
                              <select
                                value={editingExerciseCategory}
                                onChange={(e) => setEditingExerciseCategory(e.target.value as 'LOWER' | 'UPPER')}
                                className="bg-bg-card border border-border rounded px-1.5 text-xs text-text-primary outline-none"
                              >
                                <option value="LOWER">LOWER</option>
                                <option value="UPPER">UPPER</option>
                              </select>
                              <button
                                onClick={() => handleSaveEditExercise(ex.id)}
                                className="px-2 py-1 bg-accent-green text-bg-primary font-bold text-xs rounded hover:bg-opacity-90 cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingExerciseId(null)}
                                className="px-2 py-1 bg-border text-text-secondary text-xs rounded hover:text-text-primary cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs text-text-primary font-medium">{ex.name}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStartEditExercise(ex)}
                                  className="text-text-secondary hover:text-text-primary text-xs cursor-pointer p-0.5"
                                  title="Edit exercise"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeactivateExercise(ex.id)}
                                  className="text-text-secondary hover:text-accent-red text-xs cursor-pointer p-0.5"
                                  title="Delete exercise"
                                >
                                  🗑️
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Exercise Form */}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider block">
                + Add New Exercise
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="e.g. Face Pulls..."
                  className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-border-focus outline-none"
                />
                <select
                  value={newExerciseCategory}
                  onChange={(e) => setNewExerciseCategory(e.target.value as 'LOWER' | 'UPPER')}
                  className="bg-bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:border-border-focus outline-none font-mono"
                >
                  <option value="LOWER">LOWER</option>
                  <option value="UPPER">UPPER</option>
                </select>
                <button
                  onClick={handleAddExercise}
                  className="px-3 py-1.5 bg-accent-purple hover:bg-opacity-90 text-bg-primary font-bold rounded-lg text-xs cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Data Export Card */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
              💾 Data Export & Portability
            </h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed font-sans">
              Download your complete recovery logs and workout session histories. Always open. Always yours.
            </p>
            <div className="flex gap-3">
              <a
                href="/recovery/api/export?format=json"
                download
                className="flex-1 px-4 py-2 border border-border hover:bg-bg-card-hover text-text-primary font-semibold rounded-lg text-xs text-center transition-all font-mono"
              >
                Export JSON (All Data)
              </a>
              <a
                href="/recovery/api/export?format=csv"
                download
                className="flex-1 px-4 py-2 border border-border hover:bg-bg-card-hover text-text-primary font-semibold rounded-lg text-xs text-center transition-all font-mono"
              >
                Export CSV (Daily Logs)
              </a>
            </div>
          </div>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className="fixed bottom-6 right-6 px-4 py-2 bg-accent-green text-bg-primary font-bold text-sm rounded-lg shadow-lg animate-bounce z-50">
          ✓ Changes Saved Successfully
        </div>
      )}
    </div>
  );
}
