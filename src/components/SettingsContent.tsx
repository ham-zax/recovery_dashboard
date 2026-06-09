'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock, Target, BarChart3, Calendar, Dumbbell, Pencil, Trash2, Plus, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

interface ProtocolState {
  id: number;
  version: string;
  walkingTarget: number;
  sittingTarget: number;
  recoveryWeights?: ScoreWeights;
  active: boolean;
}

export function SettingsContent() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [protocol, setProtocol] = useState<ProtocolState | null>(null);
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
    if (protocol && protocol.recoveryWeights) {
      return protocol.recoveryWeights;
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
        fetch('/api/settings'),
        fetch('/api/exercises'),
      ]);

      if (!settingsRes.ok || !exercisesRes.ok) {
        throw new Error('Failed to load settings or exercises');
      }

      const settingsData = await settingsRes.json();
      const exercisesData = await exercisesRes.json();

      setSettings(settingsData.settings);
      setProtocol(settingsData.protocol);
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
    setProtocol((prev: ProtocolState | null) => prev ? ({
      ...prev,
      recoveryWeights: currentWeights
    }) : prev);
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
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, protocol }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? 'Failed to save settings');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      router.refresh();
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
      const res = await fetch('/api/settings', {
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
      router.refresh();
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
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExerciseName.trim(),
          category: newExerciseCategory,
        }),
      });

      if (!res.ok) throw new Error('Failed to add exercise');

      setNewExerciseName('');
      router.refresh();
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
      const res = await fetch(`/api/exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingExerciseName.trim(),
          category: editingExerciseCategory,
        }),
      });

      if (!res.ok) throw new Error('Failed to update exercise');

      setEditingExerciseId(null);
      router.refresh();
      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving exercise');
    }
  };

  const handleDeactivateExercise = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this exercise? It will no longer show up in workout logs.')) return;
    try {
      const res = await fetch(`/api/exercises/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to deactivate exercise');

      router.refresh();
      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deactivating exercise');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-24">
        <div className="h-8 w-48 bg-bg-card animate-pulse rounded-lg border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[300px] bg-bg-card animate-pulse rounded-2xl border border-border" />
          <div className="h-[300px] bg-bg-card animate-pulse rounded-2xl border border-border" />
          <div className="h-[400px] bg-bg-card animate-pulse rounded-2xl border border-border col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-2xl max-w-2xl mx-auto text-center mt-12">
        <AlertTriangle className="w-12 h-12 text-accent-red mx-auto" />
        <h3 className="text-lg font-semibold text-text-primary mt-4">Failed to Load Settings</h3>
        <p className="text-sm text-text-secondary mt-2">{error}</p>
        <button
          onClick={loadAll}
          className="mt-6 px-6 min-h-[44px] bg-accent-purple text-bg-primary font-bold rounded-xl text-sm cursor-pointer"
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
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
          <p className="text-sm text-text-secondary mt-1">Configure your recovery guidelines, schedules, and targets.</p>
        </div>
        <div className={`px-4 min-h-[32px] inline-flex items-center justify-center rounded-full text-xs font-mono font-semibold select-none gap-2 ${
          locked ? 'bg-accent-red/10 border border-accent-red/25 text-accent-red' : 'bg-accent-green/10 border border-accent-green/25 text-accent-green'
        }`}>
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>{locked ? 'Protocol Locked' : 'Protocol Changeable'}</span>
        </div>
      </div>

      {saveErrorMessage && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-xl text-sm font-mono flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{saveErrorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Protocol Lock Controls */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-accent-purple/5 px-5 py-4 border-b border-border flex items-center gap-3">
              <Lock className="w-5 h-5 text-accent-purple" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Protocol Lock Controls
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-sm text-text-secondary leading-relaxed">
                Once locked, you cannot change the protocol start date, duration, score weights, or workout schedule until the lock expires.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider">
                      Version
                    </label>
                    <input
                      type="text"
                      value={lockVersion}
                      onChange={(e) => setLockVersion(e.target.value)}
                      className="w-full bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm font-mono text-text-primary focus:border-border-focus outline-none transition-colors"
                      placeholder="v1.0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider">
                      Lock Until
                    </label>
                    <input
                      type="date"
                      value={lockDate}
                      onChange={(e) => setLockDate(e.target.value)}
                      min={lock ? lock.lockedUntil.split('T')[0] : undefined}
                      className="w-full bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm font-mono text-text-primary focus:border-border-focus outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider">
                    Description / Focus
                  </label>
                  <input
                    type="text"
                    value={lockDescription}
                    onChange={(e) => setLockDescription(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm text-text-primary focus:border-border-focus outline-none transition-colors"
                    placeholder="e.g. Execute one protocol consistently for 12 weeks."
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    onClick={handleSaveLock}
                    disabled={saveStatus === 'saving'}
                    className="px-5 min-h-[44px] bg-accent-purple hover:bg-opacity-90 text-bg-primary font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Lock className="w-4 h-4" />
                    {locked ? 'Extend Protocol Lock' : 'Lock Protocol Now'}
                  </button>
                  {lock && (
                    <span className="text-xs text-text-tertiary font-mono text-center sm:text-right">
                      Current Lock: {new Date(lock.lockedUntil).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Log Targets */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-bg-card-hover/30">
              <Target className="w-5 h-5 text-text-primary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Daily Log Targets
              </h3>
            </div>
            
            <div className="flex flex-col divide-y divide-border">
              <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm text-text-primary font-medium">Protocol Start Date</label>
                <input
                  type="date"
                  value={settings.protocol_start_date ?? ''}
                  disabled={locked}
                  onChange={(e) => handleUpdateSetting('protocol_start_date', e.target.value)}
                  className="bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm font-mono text-text-primary focus:border-border-focus outline-none disabled:opacity-50 w-full sm:w-auto transition-colors"
                />
              </div>
              
              <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm text-text-primary font-medium">Duration (Days)</label>
                <input
                  type="number"
                  value={settings.protocol_duration_days ?? '84'}
                  disabled={locked}
                  onChange={(e) => handleUpdateSetting('protocol_duration_days', e.target.value)}
                  className="bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm font-mono text-text-primary focus:border-border-focus outline-none disabled:opacity-50 w-full sm:w-32 transition-colors"
                />
              </div>

              <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm text-text-primary font-medium">Sitting Breaks Target</label>
                <input
                  type="number"
                  value={protocol?.sittingTarget ?? '10'}
                  onChange={(e) => setProtocol((prev: ProtocolState | null) => prev ? ({...prev, sittingTarget: e.target.value === '' ? 0 : Number(e.target.value)}) : prev)}
                  className="bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm font-mono text-text-primary focus:border-border-focus outline-none w-full sm:w-32 transition-colors"
                />
              </div>

              <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm text-text-primary font-medium">Weekly Review Day</label>
                <select
                  value={settings.weekly_review_day ?? 'sunday'}
                  onChange={(e) => handleUpdateSetting('weekly_review_day', e.target.value)}
                  className="bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm text-text-primary focus:border-border-focus outline-none w-full sm:w-48 transition-colors"
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

              {!locked && (
                <div className="px-5 py-4 bg-bg-card-hover/20">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saveStatus === 'saving'}
                    className="px-5 min-h-[44px] bg-accent-blue hover:bg-opacity-90 text-bg-primary font-bold rounded-xl text-sm transition-all cursor-pointer w-full"
                  >
                    Save Target Changes
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Recovery Score Weights */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg-card-hover/30">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-text-primary" />
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Recovery Score Weights
                </h3>
              </div>
              <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${weightsSum === 100 ? 'text-accent-green' : 'text-accent-red'}`}>
                Total: {weightsSum}% 
                {weightsSum === 100 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </span>
            </div>
            
            <div className="flex flex-col divide-y divide-border">
              {[
                { key: 'walking', label: 'Walking compliance' },
                { key: 'strength', label: 'Strength workout compliance' },
                { key: 'sleep', label: 'Sleep hours (8h target)' },
                { key: 'sitting', label: 'Sitting breaks' },
                { key: 'checkins', label: 'Check-in completion rate' },
              ].map((item) => {
                const k = item.key as keyof ScoreWeights;
                return (
                  <div key={k} className="px-5 py-3 flex justify-between items-center gap-4">
                    <span className="text-sm text-text-primary font-medium">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={w[k]}
                        disabled={locked}
                        onChange={(e) => handleUpdateWeight(k, e.target.value === '' ? 0 : Number(e.target.value))}
                        className="bg-bg-input border border-border rounded-xl px-3 min-h-[44px] w-20 text-center text-sm font-mono text-text-primary focus:border-border-focus outline-none disabled:opacity-50 transition-colors"
                      />
                      <span className="text-sm text-text-tertiary font-mono">%</span>
                    </div>
                  </div>
                );
              })}

              {!locked && (
                <div className="px-5 py-4 bg-bg-card-hover/20">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saveStatus === 'saving' || weightsSum !== 100}
                    className="px-5 min-h-[44px] bg-accent-blue hover:bg-opacity-90 disabled:opacity-40 text-bg-primary font-bold rounded-xl text-sm transition-all cursor-pointer w-full"
                  >
                    Save Weight Formula
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Workout Schedule */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-bg-card-hover/30">
              <Calendar className="w-5 h-5 text-text-primary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Workout Schedule
              </h3>
            </div>
            <div className="flex flex-col divide-y divide-border">
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
                  <div key={k} className="px-5 py-3 flex justify-between items-center">
                    <span className="text-sm text-text-primary font-medium">{day.label}</span>
                    <select
                      value={sch[k]}
                      disabled={locked}
                      onChange={(e) => handleUpdateSchedule(k, e.target.value)}
                      className="bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm text-text-primary focus:border-border-focus outline-none disabled:opacity-50 transition-colors w-36"
                    >
                      <option value="REST">REST Day</option>
                      <option value="LOWER">LOWER Body</option>
                      <option value="UPPER">UPPER Body</option>
                    </select>
                  </div>
                );
              })}

              {!locked && (
                <div className="px-5 py-4 bg-bg-card-hover/20">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saveStatus === 'saving'}
                    className="px-5 min-h-[44px] bg-accent-blue hover:bg-opacity-90 text-bg-primary font-bold rounded-xl text-sm transition-all cursor-pointer w-full"
                  >
                    Save Schedule
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Core Principles (Mobile Surface) */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm md:hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-bg-card-hover/30">
              <Target className="w-5 h-5 text-text-primary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Core Principles
              </h3>
            </div>
            <div className="p-5">
              <ul className="text-[15px] text-text-primary space-y-3 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-accent-purple font-bold font-mono">→</span> Execution <span className="text-text-tertiary font-mono px-1">&gt;</span> Explanation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-purple font-bold font-mono">→</span> Movement <span className="text-text-tertiary font-mono px-1">&gt;</span> Static Load
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-purple font-bold font-mono">→</span> Capacity <span className="text-text-tertiary font-mono px-1">&gt;</span> Correction
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-purple font-bold font-mono">→</span> Consistency <span className="text-text-tertiary font-mono px-1">&gt;</span> Intensity
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-purple font-bold font-mono">→</span> Months <span className="text-text-tertiary font-mono px-1">&gt;</span> Days
                </li>
              </ul>
            </div>
          </div>

          {/* Exercise Management */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-bg-card-hover/30">
              <Dumbbell className="w-5 h-5 text-text-primary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Exercise Management
              </h3>
            </div>
            
            <div className="p-5 space-y-6">
              {['LOWER', 'UPPER'].map((cat) => {
                const catExs = exercises.filter(e => e.category === cat);
                return (
                  <div key={cat} className="space-y-3">
                    <span className="text-xs text-accent-purple font-bold uppercase tracking-wider">
                      {cat} Day ({catExs.length})
                    </span>
                    <div className="space-y-2">
                      {catExs.map((ex) => (
                        <div
                          key={ex.id}
                          className="flex justify-between items-center bg-bg-input border border-border p-3 rounded-xl hover:border-border-focus transition-colors"
                        >
                          {editingExerciseId === ex.id ? (
                            <div className="flex-1 flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={editingExerciseName}
                                onChange={(e) => setEditingExerciseName(e.target.value)}
                                className="flex-1 bg-bg-card border border-border rounded-lg px-3 min-h-[44px] text-sm text-text-primary outline-none focus:border-border-focus transition-colors"
                              />
                              <select
                                value={editingExerciseCategory}
                                onChange={(e) => setEditingExerciseCategory(e.target.value as 'LOWER' | 'UPPER')}
                                className="bg-bg-card border border-border rounded-lg px-3 min-h-[44px] text-sm text-text-primary outline-none focus:border-border-focus transition-colors"
                              >
                                <option value="LOWER">LOWER</option>
                                <option value="UPPER">UPPER</option>
                              </select>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEditExercise(ex.id)}
                                  className="flex-1 sm:flex-none px-4 min-h-[44px] bg-accent-green text-bg-primary font-bold text-sm rounded-lg hover:bg-opacity-90 cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingExerciseId(null)}
                                  className="flex-1 sm:flex-none px-4 min-h-[44px] bg-bg-card border border-border text-text-primary text-sm rounded-lg hover:bg-bg-card-hover cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm text-text-primary font-medium">{ex.name}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleStartEditExercise(ex)}
                                  disabled={locked}
                                  className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent w-11 h-11 flex items-center justify-center rounded-lg hover:bg-bg-card cursor-pointer transition-colors"
                                  title="Edit exercise"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeactivateExercise(ex.id)}
                                  disabled={locked}
                                  className="text-text-secondary hover:text-accent-red disabled:opacity-30 disabled:hover:bg-transparent w-11 h-11 flex items-center justify-center rounded-lg hover:bg-bg-card cursor-pointer transition-colors"
                                  title="Delete exercise"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            <div className="p-5 bg-bg-card-hover/20 border-t border-border space-y-3">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add New Exercise {locked && "(Locked)"}
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  disabled={locked}
                  placeholder={locked ? "Protocol is locked" : "e.g. Face Pulls..."}
                  className="flex-1 bg-bg-input border border-border disabled:opacity-50 rounded-xl px-4 min-h-[44px] text-sm text-text-primary focus:border-border-focus outline-none transition-colors"
                />
                <select
                  value={newExerciseCategory}
                  onChange={(e) => setNewExerciseCategory(e.target.value as 'LOWER' | 'UPPER')}
                  disabled={locked}
                  className="bg-bg-input border border-border disabled:opacity-50 rounded-xl px-4 min-h-[44px] text-sm text-text-primary focus:border-border-focus outline-none transition-colors w-full sm:w-32"
                >
                  <option value="LOWER">LOWER</option>
                  <option value="UPPER">UPPER</option>
                </select>
                <button
                  onClick={handleAddExercise}
                  disabled={locked}
                  className="px-5 min-h-[44px] bg-accent-purple disabled:opacity-40 disabled:hover:bg-accent-purple hover:bg-opacity-90 text-bg-primary font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Data Export Card */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-bg-card-hover/30">
              <Download className="w-5 h-5 text-text-primary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Data Export
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Download your complete recovery logs and workout session histories. Always open. Always yours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/api/export?format=json"
                  download
                  className="flex-1 min-h-[44px] flex items-center justify-center border border-border hover:bg-bg-card-hover text-text-primary font-medium rounded-xl text-sm transition-colors"
                >
                  Export JSON
                </a>
                <a
                  href="/api/export?format=csv"
                  download
                  className="flex-1 min-h-[44px] flex items-center justify-center border border-border hover:bg-bg-card-hover text-text-primary font-medium rounded-xl text-sm transition-colors"
                >
                  Export CSV
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className="fixed bottom-24 right-6 px-5 py-3 bg-accent-green text-bg-primary font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 animate-bounce z-50">
          <CheckCircle2 className="w-5 h-5" />
          Changes Saved
        </div>
      )}
    </div>
  );
}
