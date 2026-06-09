'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock, Target, BarChart3, Calendar, Dumbbell, Pencil, Trash2, Plus, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { parseBoundedInt } from '@/lib/validation';

interface Exercise {
  id: number;
  name: string;
  category: 'LOWER' | 'UPPER';
  sortOrder: number;
  active: boolean;
}

interface ScoreWeights {
  pain: number;
  reflux: number;
  walking: number;
  compliance: number;
  strength: number;
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
  workoutSchedule?: WorkoutSchedule;
  active: boolean;
}

export function SettingsContent({
  initialSettings,
  initialProtocol,
  initialLock,
  initialExercises
}: {
  initialSettings: Record<string, string>;
  initialProtocol: ProtocolState;
  initialLock: { version: string; lockedUntil: string; description: string } | null;
  initialExercises: Exercise[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [protocol, setProtocol] = useState<ProtocolState | null>(initialProtocol);
  const [lock, setLock] = useState<{ version: string; lockedUntil: string; description: string } | null>(initialLock);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');

  // Exercises Form state
  const [newExerciseName, setNewExerciseName] = useState<string>('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<'LOWER' | 'UPPER'>('LOWER');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState<string>('');
  const [editingExerciseCategory, setEditingExerciseCategory] = useState<'LOWER' | 'UPPER'>('LOWER');

  // Protocol Lock form state
  const [lockVersion, setLockVersion] = useState<string>(initialLock?.version || 'v1.0');
  const [lockDate, setLockDate] = useState<string>(
    initialLock 
      ? format(new Date(initialLock.lockedUntil), 'yyyy-MM-dd') 
      : (initialSettings['protocol_locked_until'] || format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
  );
  const [lockDescription, setLockDescription] = useState<string>(initialLock?.description || 'Execute one protocol consistently.');

  // Protocol Change state
  const [changeReason, setChangeReason] = useState<string>('');
  const [changeNotes, setChangeNotes] = useState<string>('');

  useEffect(() => {
    setExercises(initialExercises);
    setSettings(initialSettings);
    setProtocol(initialProtocol);
    setLock(initialLock);
    setLockVersion(initialLock?.version || 'v1.0');
    setLockDate(
      initialLock 
        ? format(new Date(initialLock.lockedUntil), 'yyyy-MM-dd') 
        : (initialSettings['protocol_locked_until'] || format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
    );
    setLockDescription(initialLock?.description || 'Execute one protocol consistently.');
  }, [initialExercises, initialSettings, initialProtocol, initialLock]);

  // Parse state helper
  const getWeights = (): ScoreWeights => {
    if (protocol && protocol.recoveryWeights) {
      return protocol.recoveryWeights;
    }
    return { pain: 25, reflux: 15, walking: 25, compliance: 15, strength: 20 };
  };

  const getSchedule = (): WorkoutSchedule => {
    if (protocol && protocol.workoutSchedule) {
      return protocol.workoutSchedule;
    }
    return { mon: 'REST', tue: 'REST', wed: 'REST', thu: 'REST', fri: 'REST', sat: 'REST', sun: 'REST' };
  };

  const isProtocolLocked = () => {
    if (!lock) return false;
    return new Date(lock.lockedUntil) > new Date();
  };

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
    setProtocol((prev: ProtocolState | null) => prev ? ({
      ...prev,
      workoutSchedule: currentSchedule
    }) : prev);
  };

  const handleSaveSettings = async () => {
    // Validate weights sum to 100
    const w = getWeights();
    const sum = w.pain + w.reflux + w.walking + w.compliance + w.strength;
    if (sum !== 100) {
      setSaveStatus('error');
      setSaveErrorMessage(`Recovery Score weights must sum to exactly 100%. Currently: ${sum}%`);
      return;
    }

    setSaveStatus('saving');
    setSaveErrorMessage('');
    try {
      const payloadProtocol = protocol ? { ...protocol, changeReason, changeNotes } : undefined;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, protocol: payloadProtocol }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? 'Failed to save settings');
      }

      setSaveStatus('saved');
      setChangeReason('');
      setChangeNotes('');
      setTimeout(() => setSaveStatus('idle'), 3000);
      router.refresh();
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deactivating exercise');
    }
  };

  const w = getWeights();
  const sch = getSchedule();
  const locked = isProtocolLocked();
  const weightsSum = w.pain + w.reflux + w.walking + w.compliance + w.strength;

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
                      min={lock ? format(new Date(lock.lockedUntil), 'yyyy-MM-dd') : undefined}
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

          {/* Change Rationale */}
          {!locked && (
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-bg-card-hover/30">
                <Pencil className="w-5 h-5 text-text-primary" />
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Change Rationale (Optional)
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-text-secondary leading-relaxed">
                  If saving any protocol changes below (targets, weights, or schedule), document why you are making the change. This provides context when reviewing historical protocol impacts.
                </p>
                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm text-text-primary focus:border-border-focus outline-none transition-colors"
                    placeholder="e.g. Pain plateaued, reducing sitting target."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider">
                    Detailed Notes
                  </label>
                  <textarea
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-xl p-4 min-h-[80px] text-sm text-text-primary focus:border-border-focus outline-none transition-colors resize-y"
                    placeholder="e.g. Adding an extra REST day because recovery score has been consistently below 50. Focusing on walking instead."
                  />
                </div>
              </div>
            </div>
          )}

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
                  min="1"
                  value={settings.protocol_duration_days ?? '84'}
                  disabled={locked}
                  onChange={(e) => {
                    handleUpdateSetting('protocol_duration_days', e.target.value);
                  }}
                  onBlur={(e) => {
                    let val = e.target.value;
                    if (val !== '') {
                      val = String(parseBoundedInt(val, 1, 365, 84) ?? 84);
                    }
                    handleUpdateSetting('protocol_duration_days', val);
                  }}
                  className="bg-bg-input border border-border rounded-xl px-4 min-h-[44px] text-sm font-mono text-text-primary focus:border-border-focus outline-none disabled:opacity-50 w-full sm:w-32 transition-colors"
                />
              </div>

              <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm text-text-primary font-medium">Sitting Breaks Target</label>
                <input
                  type="number"
                  min="0"
                  value={protocol?.sittingTarget ?? '10'}
                  onChange={(e) => {
                    setProtocol((prev: ProtocolState | null) => prev ? ({...prev, sittingTarget: e.target.value === '' ? 0 : Number(e.target.value)}) : prev)
                  }}
                  onBlur={(e) => {
                    const num = parseBoundedInt(e.target.value, 0, 100, 0) ?? 0;
                    setProtocol((prev: ProtocolState | null) => prev ? ({...prev, sittingTarget: num}) : prev)
                  }}
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
                { key: 'pain', label: 'Pain' },
                { key: 'reflux', label: 'Reflux' },
                { key: 'walking', label: 'Walking compliance' },
                { key: 'compliance', label: 'Sitting breaks compliance' },
                { key: 'strength', label: 'Strength workout compliance' },
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
                        onChange={(e) => {
                          handleUpdateWeight(k, e.target.value === '' ? 0 : Number(e.target.value));
                        }}
                        onBlur={(e) => {
                          const num = parseBoundedInt(e.target.value, 0, 100, 0) ?? 0;
                          handleUpdateWeight(k, num);
                        }}
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
